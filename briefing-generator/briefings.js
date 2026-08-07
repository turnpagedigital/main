(function () {
  "use strict";

  /* Briefings — one row per TRACKED CASE (cases-not-themes model).
     Data: case-briefings.json, written daily by generate_case_briefings.py.
     Rows expand in place to the full briefing body; #case=<slug> deep-links
     from the dashboard cards. Theme tags are labels/filters only — themes no
     longer have briefings of their own. */

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  // ── Theme labels (tags on rows + filter) ──────────────────────────────────
  var THEMES = {};
  var THEME_COLORS = {
    "rewind-tariffs":               { bg: "#ECFCCB", fg: "#3f6212" },
    "llm-class-action":             { bg: "#DBEAFE", fg: "#1e40af" },
    "crypto-insolvency":            { bg: "#FFEDD5", fg: "#9a3412" },
    "fraud-recovery":               { bg: "#F3E8FF", fg: "#6b21a8" },
    "billion-dollar-class-actions": { bg: "#D1FAE5", fg: "#065f46" },
    "bankruptcy-creditor-rights":   { bg: "#FEE2E2", fg: "#991b1b" },
  };
  function themeOf(slug) {
    var t = THEMES[slug];
    if (t) return t;
    var c = THEME_COLORS[slug] || { bg: "#E0E7FF", fg: "#3730a3" };
    return { name: slug, emoji: "📰", bg: c.bg, fg: c.fg };
  }
  // Monochrome outline tag — white bg / black outline+text, inverted in dark.
  function themeTag(slug) {
    var t = themeOf(slug);
    return '<span class="ub-tag" title="' + esc(t.name) + '">' + t.emoji + " " + esc(t.name) + "</span>";
  }

  // ── Case pill colors (shared store: ud-case-colors + intel-prefs) ─────────
  var savedColors = {};
  try { savedColors = JSON.parse(localStorage.getItem("ud-case-colors") || "{}"); } catch (e) {}

  function autoFg(bg) {
    var r = parseInt(String(bg).slice(1, 3), 16) || 136;
    var g = parseInt(String(bg).slice(3, 5), 16) || 136;
    var b = parseInt(String(bg).slice(5, 7), 16) || 136;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0A0A0A" : "#FFFFFF";
  }

  var MANIFEST = [];
  function manifestOf(slug) {
    for (var i = 0; i < MANIFEST.length; i++) {
      if (MANIFEST[i].slug === slug) return MANIFEST[i];
    }
    return null;
  }

  function casePill(slug, name) {
    var m = manifestOf(slug);
    var bg = (savedColors[slug] && savedColors[slug].bg) || (m && m.default_color) || "#888888";
    var fg = (savedColors[slug] && savedColors[slug].fg) || autoFg(bg);
    return '<span class="ud-pill" style="background:' + bg + ";color:" + fg + '">' + esc(name) + "</span>";
  }

  // ── Minimal markdown → HTML for our own generated briefing bodies ─────────
  function mdToHtml(md) {
    var out = [];
    String(md || "").split(/\n\n+/).forEach(function (para) {
      var p = para.trim();
      if (!p) return;
      var h = /^(#{2,4})\s+(.*)$/.exec(p.split("\n")[0]);
      if (h && p.indexOf("\n") === -1) {
        out.push("<h4>" + inline(h[2]) + "</h4>");
        return;
      }
      var lines = p.split("\n");
      var isList = lines.every(function (l) { return /^\s*-\s+/.test(l); });
      if (isList) {
        out.push("<ul>" + lines.map(function (l) {
          return "<li>" + inline(l.replace(/^\s*-\s+/, "")) + "</li>";
        }).join("") + "</ul>");
        return;
      }
      out.push("<p>" + inline(p) + "</p>");
    });
    return out.join("");

    function inline(text) {
      var t = esc(text);
      t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
      t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/__((?:(?!__).)+)__/g, "<strong>$1</strong>");
      t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
      return t;
    }
  }

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
  }

  // ── State ─────────────────────────────────────────────────────────────────
  var ITEMS = [];
  var activeCases = {};
  var expanded = {};
  var _savedState = null;
  var ADMIN = {};        // slug -> full editable case (/api/admin/cases)
  var THEME_LIST = [];   // [{slug,display_name,emoji}] for the editor
  var FILTER_KEY = "ub-case-filter-state";

  function loadFilterState() {
    try { _savedState = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}"); } catch (e) {}
  }
  function saveFilterState() {
    try { localStorage.setItem(FILTER_KEY, JSON.stringify({ activeCases: activeCases })); } catch (e) {}
  }

  function filterLabel() {
    var total = ITEMS.length;
    if (!total) return "Cases";
    var on = ITEMS.filter(function (i) { return !!activeCases[i.slug]; }).length;
    if (on === total) return "Cases: All (" + total + ")";
    if (!on) return "Cases: None";
    return "Cases: " + on + " of " + total;
  }

  function renderCaseFilter() {
    var btn = document.getElementById("ud-case-dd-btn");
    var panel = document.getElementById("ud-case-dd-panel");
    if (!btn || !panel) return;
    btn.innerHTML = esc(filterLabel()) + ' <span class="ud-dd-caret">▾</span>';
    var head =
      '<div class="ud-dd-head">' +
        '<button type="button" class="ud-dd-quick" data-act="all">Select all</button>' +
        '<button type="button" class="ud-dd-quick" data-act="none">Deselect all</button>' +
      "</div>";
    var rows = ITEMS.map(function (i) {
      return (
        '<label class="ud-dd-row" title="' + esc(i.case_name) + '">' +
          '<input type="checkbox" data-slug="' + esc(i.slug) + '"' + (activeCases[i.slug] ? " checked" : "") + ">" +
          casePill(i.slug, i.short_name || i.case_name) +
        "</label>"
      );
    }).join("");
    panel.innerHTML = head + rows;
    panel.querySelectorAll(".ud-dd-quick").forEach(function (q) {
      q.addEventListener("click", function () {
        var on = q.getAttribute("data-act") === "all";
        ITEMS.forEach(function (i) { activeCases[i.slug] = on; });
        saveFilterState();
        renderCaseFilter();
        render();
      });
    });
    panel.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeCases[cb.getAttribute("data-slug")] = cb.checked;
        saveFilterState();
        renderCaseFilter();
        render();
      });
    });
  }

  function statusCell(i) {
    if (i.moved) return '<span class="ub-chip ub-chip-moved">Moved</span>';
    if (i.no_change_since) {
      return '<span class="ub-chip">No change since ' + esc(fmtDate(i.no_change_since)) + "</span>";
    }
    return '<span class="ub-chip">Quiet</span>';
  }

  function render() {
    var tbody = document.getElementById("ub-tbody");
    var countEl = document.getElementById("ud-count");
    var list = ITEMS.filter(function (i) { return !!activeCases[i.slug]; });
    if (countEl) countEl.textContent = list.length + " case" + (list.length === 1 ? "" : "s");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="ud-empty">No cases selected.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (i) {
      var tags = (i.themes || []).map(themeTag).join(" ");
      var lede = (i.lede || "").trim();
      var hasBody = !!(i.body_md || "").trim();
      var open = !!expanded[i.slug];
      var main =
        "<tr" + (i.moved ? ' class="ub-row-moved"' : "") + ">" +
          '<td class="ud-date">' + esc(fmtDate(i.date) || "—") + "</td>" +
          '<td class="ub-case-cell">' + casePill(i.slug, i.short_name || i.case_name) +
            '<div class="ub-tags">' + tags + "</div>" +
            '<div class="ub-court">' + esc(i.court || "") + "</div>" +
          "</td>" +
          '<td class="ud-entry">' + statusCell(i) + " " +
            (lede ? '<span class="ud-desc">' + esc(lede) + "</span>"
                  : '<span class="ud-desc" style="color:var(--ink-40)">No briefing yet — it generates the first time this case moves.</span>') +
          "</td>" +
          '<td class="ub-open-cell">' +
            (hasBody
              ? '<button type="button" class="pr-btn" data-toggle="' + esc(i.slug) + '">' + (open ? "Close" : "Read") + "</button> "
              : "") +
            '<a class="ud-link" href="docket.html#case=' + encodeURIComponent(i.slug) + '">Docket</a>' +
            '<div class="ub-actions" style="margin-top:6px;">' +
              '<button type="button" class="ub-mini" data-edit="' + esc(i.slug) + '">Edit</button>' +
              ((i.sync || "active") !== "archived"
                ? '<button type="button" class="ub-mini" data-syncnow="' + esc(i.slug) + '">Sync</button>' : "") +
              '<button type="button" class="ub-mini" data-export="' + esc(i.slug) + '">Export</button>' +
            "</div>" +
          "</td>" +
        "</tr>";
      var detail = "";
      if (open && hasBody) {
        detail =
          '<tr class="ub-detail-row" id="ub-detail-' + esc(i.slug) + '"><td colspan="4">' +
            '<div class="ub-body">' +
              '<div class="ub-body-head">' + esc(i.emoji || "⚖️") + " " + esc(i.case_name) +
                ' <span class="ub-body-date">' + esc(fmtDate(i.date)) + "</span>" +
                '<button type="button" class="pr-btn ub-send-btn" data-send="' + esc(i.slug) + '" title="Queue this briefing as an unpublished draft post in Admin → Posts &amp; Briefings">Send to site queue</button>' +
              "</div>" +
              mdToHtml(i.body_md) +
            "</div>" +
          "</td></tr>";
      }
      return main + detail;
    }).join("");
    tbody.querySelectorAll("[data-send]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-send");
        b.disabled = true;
        b.textContent = "Sending…";
        fetch("api/send-to-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: slug }),
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || "send failed");
          b.textContent = j.updated ? "Draft refreshed ✓" : "Queued as draft ✓";
          b.title = "Review it in Admin → Content → Posts & Briefings (Queue)";
        }).catch(function (e) {
          b.disabled = false;
          b.textContent = "Send to site queue";
          alert("Could not queue: " + e.message);
        });
      });
    });
    tbody.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-toggle");
        expanded[slug] = !expanded[slug];
        render();
      });
    });
    tbody.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openEditor(b.getAttribute("data-edit")); });
    });
    tbody.querySelectorAll("[data-syncnow]").forEach(function (b) {
      b.addEventListener("click", function () { syncNow(b.getAttribute("data-syncnow"), b); });
    });
    tbody.querySelectorAll("[data-export]").forEach(function (b) {
      b.addEventListener("click", function () { exportCase(b.getAttribute("data-export")); });
    });
  }

  function applyHash() {
    var m = /case=([a-z0-9-]+)/.exec(location.hash || "");
    if (!m) return;
    var slug = m[1];
    if (!ITEMS.some(function (i) { return i.slug === slug; })) return;
    activeCases[slug] = true;
    expanded[slug] = true;
    render();
    var row = document.getElementById("ub-detail-" + slug);
    if (row) row.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  var BRIEFS = [];
  function rebuildItems() {
    var byBrief = {};
    BRIEFS.forEach(function (b) { byBrief[b.slug] = b; });
    var slugs = Object.keys(ADMIN);
    BRIEFS.forEach(function (b) { if (slugs.indexOf(b.slug) < 0) slugs.push(b.slug); });
    ITEMS = slugs.map(function (slug) {
      var a = ADMIN[slug] || {};
      var b = byBrief[slug] || {};
      var m = manifestOf(slug) || {};
      return {
        slug: slug,
        case_name: a.display_name || b.case_name || slug,
        short_name: m.short_name || b.short_name || a.display_name || slug,
        court: (a.case && a.case.court) || b.court || "",
        themes: (a.topics && a.topics.length ? a.topics : b.themes) || [],
        sync: a.sync || "active",
        emoji: b.emoji || "⚖️",
        date: b.date || "", updated: b.updated || "",
        lede: b.lede || "", body_md: b.body_md || "",
        moved: !!b.moved, no_change_since: b.no_change_since || "",
      };
    });
    ITEMS.sort(function (x, y) {
      if (x.moved !== y.moved) return x.moved ? -1 : 1;
      return (y.date || "") < (x.date || "") ? -1 : (y.date || "") > (x.date || "") ? 1
        : x.case_name.localeCompare(y.case_name);
    });
    var saved = _savedState && _savedState.activeCases;
    ITEMS.forEach(function (i) {
      if (!(i.slug in activeCases)) activeCases[i.slug] = saved && (i.slug in saved) ? !!saved[i.slug] : true;
    });
  }

  function loadAdminCases() {
    return fetch("/api/admin/cases", { credentials: "include" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && d.cases) {
          ADMIN = {};
          d.cases.forEach(function (c) { ADMIN[c.slug] = c; });
          if (d.topics || d.themes) THEME_LIST = d.themes || d.topics || THEME_LIST;
        }
      }).catch(function () {});
  }

  function init() {
    Promise.all([
      loadAdminCases(),
      fetchJson("case-briefings.json").then(function (d) { BRIEFS = (d && d.items) || []; }).catch(function () { BRIEFS = []; }),
    ]).then(function () {
      rebuildItems();
      var meta = document.getElementById("ud-meta");
      if (meta) {
        var latest = ITEMS.reduce(function (acc, i) { return (i.updated || "") > acc ? i.updated : acc; }, "");
        var movedN = ITEMS.filter(function (i) { return i.moved; }).length;
        meta.textContent = ITEMS.length + " tracked cases · " + movedN + " moved in the last cycle" +
          (latest ? " · updated " + fmtDate(latest) : "");
      }
      renderCaseFilter();
      render();
      applyHash();
    });
  }


  // ── Case editor / wizard (writes via /api/admin/cases; same admin session) ──
  var editingSlug = null;
  var editingClaims = null;

  function slugify(x) { return (x || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function ceEl(id) { return document.getElementById(id); }
  function ceErr(msg) { var e = ceEl("ce-err"); if (!e) return; e.textContent = msg || ""; e.style.display = msg ? "block" : "none"; }
  function ceFootMsg(msg) { var e = ceEl("ce-foot-msg"); if (e) e.textContent = msg || ""; }

  function themesForEditor() {
    if (THEME_LIST && THEME_LIST.length) return THEME_LIST;
    return Object.keys(THEMES).map(function (slug) { return { slug: slug, display_name: THEMES[slug].name, emoji: THEMES[slug].emoji }; });
  }
  function renderThemeChecks(selected) {
    var box = ceEl("ce-themes"); if (!box) return;
    var sel = selected || [], list = themesForEditor();
    if (!list.length) { box.innerHTML = '<span class="ce-hint">No themes loaded.</span>'; return; }
    box.innerHTML = list.map(function (t) {
      var on = sel.indexOf(t.slug) !== -1;
      return '<label class="ce-theme"><input type="checkbox" value="' + esc(t.slug) + '"' + (on ? " checked" : "") + ">" +
        (t.emoji ? esc(t.emoji) + " " : "") + esc(t.display_name || t.slug) + "</label>";
    }).join("");
  }
  function checkedThemes() {
    return Array.prototype.slice.call(document.querySelectorAll("#ce-themes input:checked")).map(function (c) { return c.value; });
  }
  function syncTypeVisibility() {
    var t = ceEl("ce-srctype").value;
    ceEl("ce-cl-fields").style.display = t === "courtlistener" ? "" : "none";
    ceEl("ce-agent-fields").style.display = t === "claims_agent" ? "" : "none";
    var wn = ceEl("ce-watch-note"); if (wn) wn.style.display = t === "watch" ? "" : "none";
    var pl = document.querySelector('label[for-parties]');
    var pe = ceEl("ce-parties");
    if (pe) pe.placeholder = t === "watch" ? "Company or matter name (e.g. Acme Corp — distress watch)" : "e.g. Bartz, et al. v. Anthropic PBC";
  }

  function openEditor(slug) {
    var a = slug ? (ADMIN[slug] || {}) : {};
    editingSlug = slug || null;
    editingClaims = a.claims_administrator || null;
    ceErr(""); ceFootMsg("");
    ceEl("ce-title").textContent = slug ? ("Edit: " + (a.display_name || slug)) : "New case";
    ceEl("ce-name").value = a.display_name || "";
    ceEl("ce-slug").value = a.slug || "";
    ceEl("ce-slug").disabled = !!slug;
    ceEl("ce-slug-note").textContent = slug ? "(fixed)" : "(auto from name if blank)";
    ceEl("ce-status").value = a.status || "";
    ceEl("ce-sync").value = a.sync || "active";
    renderThemeChecks(a.topics || []);
    var ds = a.docket_source || { type: "courtlistener" };
    ceEl("ce-srctype").value = ds.type === "claims_agent" ? "claims_agent" : "courtlistener";
    ceEl("ce-docketid").value = ds.docket_id || "";
    ceEl("ce-docketurl").value = ds.url || "";
    var ca = a.claims_administrator || {};
    ceEl("ce-claimsurl").value = (ds.type === "claims_agent" && ca.url) || "";
    ceEl("ce-keydates").value = (ds.type === "claims_agent" && ca.key_dates_url) || "";
    var cc = a.case || {};
    ceEl("ce-parties").value = cc.parties || "";
    ceEl("ce-court").value = cc.court || "";
    ceEl("ce-casenum").value = cc.case_number || "";
    ceEl("ce-judge").value = cc.judge || "";
    ceEl("ce-guidance").value = a.scan_guidance || "";
    ceEl("ce-lookup-msg").textContent = "Enter the CourtListener docket ID and click Look up to auto-fill parties, court, case number, and judge.";
    syncTypeVisibility();
    ceEl("ce-save").textContent = slug ? "Save changes" : "Create case";
    ceEl("ce-del").style.display = slug ? "" : "none";
    ceEl("ce-overlay").style.display = "flex";
    ceEl("ce-name").focus();
  }
  function closeEditor() { ceEl("ce-overlay").style.display = "none"; editingSlug = null; }

  function doLookup() {
    var id = (ceEl("ce-docketid").value || "").trim();
    if (!id) { ceEl("ce-lookup-msg").textContent = "Enter a docket ID first."; return; }
    ceEl("ce-lookup-msg").textContent = "Looking up…";
    fetch("/api/admin/courtlistener-lookup?docket_id=" + encodeURIComponent(id), { credentials: "include" })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) { ceEl("ce-lookup-msg").textContent = (d && d.error) || "Lookup failed"; return; }
        if (d.case_name) ceEl("ce-parties").value = d.case_name;
        if (d.court) ceEl("ce-court").value = d.court;
        if (d.docket_number) ceEl("ce-casenum").value = d.docket_number;
        if (d.judge) ceEl("ce-judge").value = d.judge;
        if (d.docket_url) ceEl("ce-docketurl").value = d.docket_url;
        ceEl("ce-lookup-msg").textContent = "Filled from CourtListener ✓";
      }).catch(function () { ceEl("ce-lookup-msg").textContent = "Lookup failed — network error"; });
  }

  function saveCase() {
    var name = (ceEl("ce-name").value || "").trim();
    var slug = editingSlug || slugify(ceEl("ce-slug").value || name);
    var srctype = ceEl("ce-srctype").value;
    var themes = checkedThemes();
    if (!name) { ceErr("Display name is required"); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { ceErr("Slug must be kebab-case"); return; }
    if (!editingSlug && ADMIN[slug]) { ceErr("A case with that slug already exists"); return; }
    if (!themes.length) { ceErr("Tag at least one theme"); return; }
    if (srctype !== "watch" && !(ceEl("ce-parties").value || "").trim()) { ceErr("Parties are required"); return; }
    if (srctype === "courtlistener" && !(ceEl("ce-docketid").value || "").trim()) { ceErr("Docket ID is required for a CourtListener docket"); return; }
    if (srctype === "claims_agent" && !(ceEl("ce-claimsurl").value || "").trim()) { ceErr("A claims-agent URL is required"); return; }
    var claims = srctype === "claims_agent"
      ? { name: "", url: (ceEl("ce-claimsurl").value || "").trim(), key_dates_url: (ceEl("ce-keydates").value || "").trim() }
      : srctype === "watch" ? null : editingClaims;
    var payload = {
      slug: slug, display_name: name, type: "case",
      status: (ceEl("ce-status").value || "").trim() || "active",
      sync: ceEl("ce-sync").value, topics: themes,
      case: { parties: (ceEl("ce-parties").value || "").trim(), court: (ceEl("ce-court").value || "").trim(),
              case_number: (ceEl("ce-casenum").value || "").trim(), judge: (ceEl("ce-judge").value || "").trim() },
      docket_source: srctype === "courtlistener"
        ? { type: "courtlistener", docket_id: (ceEl("ce-docketid").value || "").trim() || null, url: (ceEl("ce-docketurl").value || "").trim(), awaiting_sync: false }
        : srctype === "watch"
        ? { type: "watch", docket_id: null, url: "", awaiting_sync: true }
        : { type: "claims_agent", docket_id: null, url: "", awaiting_sync: false },
      claims_administrator: claims || null,
      scan_guidance: ceEl("ce-guidance").value || "",
    };
    ceErr(""); ceFootMsg("Saving…"); ceEl("ce-save").disabled = true;
    fetch("/api/admin/cases", { method: editingSlug ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); }).then(function (d) {
        ceEl("ce-save").disabled = false;
        if (!d || !d.ok) { ceErr((d && d.error) || "Failed to save"); ceFootMsg(""); return; }
        closeEditor(); reloadCases();
      }).catch(function () { ceEl("ce-save").disabled = false; ceErr("Save failed — network error"); ceFootMsg(""); });
  }

  function deleteCase() {
    if (!editingSlug) return;
    if (!window.confirm("Delete case \"" + editingSlug + "\"? This removes its config, data, page, and uploads and can't be undone. Consider Export first.")) return;
    ceFootMsg("Deleting…");
    fetch("/api/admin/cases?slug=" + encodeURIComponent(editingSlug), { method: "DELETE", credentials: "include" })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) { ceErr((d && d.error) || "Failed to delete"); ceFootMsg(""); return; }
        closeEditor(); reloadCases();
      }).catch(function () { ceErr("Delete failed — network error"); ceFootMsg(""); });
  }

  function syncNow(slug, btn) {
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    fetch("/api/admin/sync-case", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ slug: slug }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (btn) { btn.disabled = false; btn.textContent = "Sync"; }
        var meta = document.getElementById("ud-meta");
        if (meta) meta.textContent = (d && d.ok) ? (d.note || "Sync started for " + slug) : ("Sync failed: " + ((d && d.error) || "error"));
      }).catch(function () { if (btn) { btn.disabled = false; btn.textContent = "Sync"; } });
  }

  function exportCase(slug) {
    fetch("/api/admin/case-export?slug=" + encodeURIComponent(slug), { credentials: "include" })
      .then(function (r) {
        if (!r.ok) throw new Error("export failed");
        var cd = r.headers.get("Content-Disposition") || "", m = /filename="([^"]+)"/.exec(cd);
        return r.blob().then(function (blob) {
          var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
          a.download = m ? m[1] : ("case-" + slug + ".zip");
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
        });
      }).catch(function () { var meta = document.getElementById("ud-meta"); if (meta) meta.textContent = "Export failed for " + slug; });
  }

  function reloadCases() {
    Promise.all([
      loadAdminCases(),
      fetchJson("case-briefings.json").then(function (d) { BRIEFS = (d && d.items) || []; }).catch(function () {}),
      fetchJson("cases/data/_manifest.json").then(function (man) { MANIFEST = man || []; }).catch(function () {}),
    ]).then(function () { rebuildItems(); renderCaseFilter(); render(); });
  }

  function wireEditor() {
    var nb = ceEl("ce-new"); if (nb) nb.addEventListener("click", function () { openEditor(null); });
    var x = ceEl("ce-close"); if (x) x.addEventListener("click", closeEditor);
    var c = ceEl("ce-cancel"); if (c) c.addEventListener("click", closeEditor);
    var sv = ceEl("ce-save"); if (sv) sv.addEventListener("click", saveCase);
    var dl = ceEl("ce-del"); if (dl) dl.addEventListener("click", deleteCase);
    var lk = ceEl("ce-lookup"); if (lk) lk.addEventListener("click", doLookup);
    var st = ceEl("ce-srctype"); if (st) st.addEventListener("change", syncTypeVisibility);
    var ov = ceEl("ce-overlay");
    if (ov) ov.addEventListener("mousedown", function (ev) { if (ev.target === ov) closeEditor(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && ceEl("ce-overlay") && ceEl("ce-overlay").style.display !== "none") closeEditor(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadFilterState();
    var ddBtn = document.getElementById("ud-case-dd-btn");
    var ddPanel = document.getElementById("ud-case-dd-panel");
    if (ddBtn && ddPanel) {
      ddBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        ddPanel.style.display = ddPanel.style.display === "none" ? "block" : "none";
      });
      document.addEventListener("click", function (ev) {
        if (ddPanel.style.display === "none") return;
        if (ev.target && !ev.target.isConnected) return;
        if (ddPanel.contains(ev.target) || ddBtn.contains(ev.target)) return;
        ddPanel.style.display = "none";
      });
    }
    window.addEventListener("hashchange", applyHash);

    // Display names for theme tags follow /admin/intelligence renames.
    fetchJson("themes.json").then(function (d) {
      var list = (d && d.themes) || [];
      THEME_LIST = list.filter(function (t) { return t && t.slug; })
        .map(function (t) { return { slug: t.slug, display_name: t.display_name || t.slug, emoji: t.emoji || "📰" }; });
      list.forEach(function (t) {
        if (!t || !t.slug) return;
        var c = THEME_COLORS[t.slug] || { bg: "#E0E7FF", fg: "#3730a3" };
        THEMES[t.slug] = { name: t.display_name || t.slug, emoji: t.emoji || "📰", bg: c.bg, fg: c.fg };
      });
      render();
    }).catch(function () {});
    wireEditor();

    // Case pill colors + manifest defaults roam with the shared prefs store.
    fetchJson("cases/data/_manifest.json").then(function (man) {
      MANIFEST = man || [];
      renderCaseFilter();
      render();
    }).catch(function () {});
    fetchJson("api/prefs").then(function (p) {
      if (p && p.ok && p.colors) {
        Object.keys(p.colors).forEach(function (k) { savedColors[k] = p.colors[k]; });
        try { localStorage.setItem("ud-case-colors", JSON.stringify(savedColors)); } catch (e) {}
        renderCaseFilter();
        render();
      }
    }).catch(function () {});

    init();
  });
})();
