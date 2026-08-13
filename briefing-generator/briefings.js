(function () {
  "use strict";

  /* Briefing — STANDALONE reader for ONE case's current briefing.
     The dashboard is the overview (cards or list); "Read" lands here at
     #case=<slug> with every action in one place: send to the site queue,
     edit/sync/export the case, and filtered Docket/Calendar/News jumps.
     Without a #case= the page bounces straight back to the dashboard.
     Data: case-briefings.json (daily pipeline) + /api/admin/cases for the
     in-page case editor. External file — CSP kills inline JS on /intel/*. */

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

  // ── Theme labels (tags in the meta line) ──────────────────────────────────
  var SHOW_THEME_EMOJIS = true;
  var THEMES = {};
  function themeOf(slug) {
    return THEMES[slug] || { name: slug, emoji: "📰" };
  }
  // Monochrome outline tag — white bg / black outline+text, inverted in dark.
  function themeTag(slug) {
    var t = themeOf(slug);
    return '<span class="ub-tag" title="' + esc(t.name) + '">' + (SHOW_THEME_EMOJIS && t.emoji ? t.emoji + " " : "") + esc(t.name) + "</span>";
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

  function casePill(slug, name, fallbackSlug) {
    var m = manifestOf(slug) || (fallbackSlug ? manifestOf(fallbackSlug) : null);
    var bg = (savedColors[slug] && savedColors[slug].bg) || (m && m.default_color) || "#888888";
    var fg = (savedColors[slug] && savedColors[slug].fg) || autoFg(bg);
    return '<span class="ud-pill" style="--pb:' + bg + ";--pf:" + fg + ';font-size:13px;padding:3px 14px">' + esc(name) + "</span>";
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
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
  }

  // ── State ─────────────────────────────────────────────────────────────────
  var BRIEFS = [];
  var ADMIN = {};        // slug -> full editable case (/api/admin/cases)
  var THEME_LIST = [];   // [{slug,display_name,emoji}] for the editor
  var CURRENT = null;    // case slug being read
  var HISTORY = [];      // past briefings for CURRENT (case-briefings/<slug>.json)
  var VIEW_DATE = null;  // null = latest; else a date from HISTORY

  function currentSlug() {
    var m = /[#&]case=([a-z0-9-]+)/.exec(location.hash || "");
    return m ? m[1] : null;
  }
  function currentDate() {
    var m = /[#&]date=(\d{4}-\d{2}-\d{2})/.exec(location.hash || "");
    return m ? m[1] : null;
  }

  function briefOf(slug) {
    for (var i = 0; i < BRIEFS.length; i++) if (BRIEFS[i].slug === slug) return BRIEFS[i];
    return null;
  }

  // History list = archive file + the latest edition (in case the archive
  // hasn't caught up to today's run yet). Newest first.
  function historyList() {
    var list = HISTORY.slice();
    var b = briefOf(CURRENT);
    if (b && (b.body_md || "").trim() && b.date &&
        !list.some(function (e) { return e.date === b.date; })) {
      list.unshift({ date: b.date, updated: b.updated, lede: b.lede, body_md: b.body_md, sources: b.sources });
      list.sort(function (a, x) { return (x.date || "").localeCompare(a.date || ""); });
    }
    return list;
  }

  function loadHistory(slug) {
    HISTORY = [];
    return fetchJson("case-briefings/" + encodeURIComponent(slug) + ".json")
      .then(function (d) { HISTORY = (d && d.items) || []; })
      .catch(function () { HISTORY = []; });
  }

  // ── Standalone render ─────────────────────────────────────────────────────
  function statusChip(b) {
    if (!b) return '<span class="bf-chip">No briefing yet</span>';
    if (b.moved) return '<span class="bf-chip moved">Moved</span>';
    if (b.no_change_since) return '<span class="bf-chip">No change since ' + esc(fmtDate(b.no_change_since)) + "</span>";
    return '<span class="bf-chip">Quiet</span>';
  }

  function render() {
    var slug = CURRENT;
    var b = briefOf(slug);
    var m = manifestOf(slug);
    var a = ADMIN[slug];
    var isGroup = !!(b && b.is_group);
    var filterTarget = isGroup && (b.members || []).length ? b.members.join(",") : slug;
    var name = (b && b.case_name) || (m && m.display_name) || (a && a.display_name) || slug;
    var short = (b && b.short_name) || (m && m.short_name) || name;
    var court = (b && b.court) || (m && m.court) || "";
    var themes = (b && b.themes) || (m && m.topics) || [];
    var emoji = (b && b.emoji) || "⚖️";

    document.title = name + " — Briefing | Turnpage Intelligence";
    var h1 = document.querySelector(".page-title h1");
    if (h1) h1.innerHTML = esc(emoji) + " " + casePill(slug, name, isGroup ? (b.members || [])[0] : null);
    var meta = document.getElementById("ud-meta");
    if (meta) {
      meta.innerHTML = statusChip(b) +
        (b && b.date ? ' <span>Briefed ' + esc(fmtDate(b.date)) + "</span>" : "") +
        (court ? " <span>" + esc(court) + "</span>" : "") +
        ' <span style="display:inline-flex;gap:4px;vertical-align:middle">' + themes.map(themeTag).join("") + "</span>";
    }

    var history = historyList();
    var viewing = null;
    if (VIEW_DATE) {
      for (var hi = 0; hi < history.length; hi++) if (history[hi].date === VIEW_DATE) viewing = history[hi];
    }
    var isLatestView = !viewing;

    var actions = document.getElementById("bf-actions");
    if (actions) {
      actions.innerHTML =
        '<a class="pr-btn" href="index.html">← Dashboard</a>' +
        '<span class="spacer"></span>' +
        (isLatestView && b && (b.body_md || "").trim()
          ? '<button type="button" class="pr-btn pr-btn-track" data-send="' + esc(slug) + '">Send to site queue</button>'
          : "") +
        (isGroup ? "" :
          '<button type="button" class="pr-btn" data-edit="' + esc(slug) + '">Edit case</button>' +
          '<button type="button" class="pr-btn" data-syncnow="' + esc(slug) + '">Sync</button>' +
          '<button type="button" class="pr-btn" data-export="' + esc(slug) + '">Export</button>') +
        '<a class="pr-btn" href="docket.html#case=' + filterTarget + '">Docket</a>' +
        '<a class="pr-btn" href="calendar.html#case=' + filterTarget + '">Calendar</a>' +
        '<a class="pr-btn" href="news.html#case=' + filterTarget + '">News</a>' +
        '<button type="button" class="pr-btn" id="ce-new" title="Create a new tracked case">＋ New case</button>';

      var send = actions.querySelector("[data-send]");
      if (send) {
        send.addEventListener("click", function () {
          send.disabled = true;
          send.textContent = "Sending…";
          fetch("api/send-to-site", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: slug }),
          }).then(function (r) { return r.json(); }).then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.error) || "send failed");
            send.textContent = j.updated ? "Draft refreshed ✓" : "Queued as draft ✓";
            send.title = "Review it in Admin → Content → Posts & Briefings (Queue)";
          }).catch(function (e) {
            send.disabled = false;
            send.textContent = "Send to site queue";
            alert("Could not queue: " + e.message);
          });
        });
      }
      var ed = actions.querySelector("[data-edit]");
      if (ed) ed.addEventListener("click", function () { openEditor(slug); });
      var sn = actions.querySelector("[data-syncnow]");
      if (sn) sn.addEventListener("click", function () { syncNow(slug, sn); });
      var ex = actions.querySelector("[data-export]");
      if (ex) ex.addEventListener("click", function () { exportCase(slug); });
      var nb = actions.querySelector("#ce-new");
      if (nb) nb.addEventListener("click", function () { openEditor(null); });
    }

    // Past-briefings strip — one date pill per archived edition.
    var hist = document.getElementById("bf-history");
    if (hist) {
      if (history.length > 1 || (history.length === 1 && viewing)) {
        hist.style.display = "";
        hist.innerHTML = '<span class="bf-hist-label">Briefings:</span>' +
          history.map(function (e, idx) {
            var on = viewing ? e.date === VIEW_DATE : idx === 0;
            return '<button type="button" class="bf-date-btn' + (on ? " on" : "") + '" data-date="' +
              esc(e.date) + '">' + esc(fmtDate(e.date)) + (idx === 0 ? " · latest" : "") + "</button>";
          }).join("");
        hist.querySelectorAll("[data-date]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var d = btn.getAttribute("data-date");
            var latest = history[0] && history[0].date === d;
            location.hash = "case=" + slug + (latest ? "" : "&date=" + d);
          });
        });
      } else {
        hist.style.display = "none";
        hist.innerHTML = "";
      }
    }

    var shown = viewing || b;
    var body = document.getElementById("bf-body");
    if (body) {
      if (shown && (shown.body_md || "").trim()) {
        body.innerHTML =
          (viewing
            ? '<div class="bf-old-note">Viewing the ' + esc(fmtDate(viewing.date)) +
              ' briefing — <a href="#case=' + encodeURIComponent(slug) + '">show latest</a></div>'
            : "") +
          '<div class="ub-body-head">' + esc(emoji) + " " + esc(name) +
            ' <span class="ub-body-date">' + esc(fmtDate(shown.date)) + "</span></div>" +
          mdToHtml(shown.body_md) +
          (isLatestView && b && b.checked ? '<p style="font-size:11px;color:var(--ink-40)">Checked ' + esc(String(b.checked).slice(0, 16).replace("T", " ")) + " UTC · regenerates when the case moves</p>" : "");
      } else if (b || m || a) {
        body.innerHTML = '<div class="ud-empty">No briefing yet for ' + esc(name) +
          " — it generates the first time the case moves (new docket entries or coverage). " +
          'Meanwhile the <a href="docket.html#case=' + encodeURIComponent(slug) + '">docket</a> is live.</div>';
      } else {
        body.innerHTML = '<div class="ud-empty">Unknown case. <a href="index.html">Back to the dashboard →</a></div>';
      }
    }
  }

  function loadAdminCases() {
    return fetch("/api/admin/cases", { credentials: "include" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && Array.isArray(d.cases)) {
          ADMIN = {};
          d.cases.forEach(function (c) { ADMIN[c.slug] = c; });
        }
      }).catch(function () {});
  }

  function reloadCases() {
    Promise.all([
      loadAdminCases(),
      fetchJson("case-briefings.json").then(function (d) { BRIEFS = (d && d.items) || []; }).catch(function () {}),
      fetchJson("cases/data/_manifest.json").then(function (man) {
        MANIFEST = (man || []).filter(function (m) { return (m.sync || "active") !== "archived"; });
      }).catch(function () {}),
    ]).then(render);
  }

  /* ── In-page case editor (create / edit / delete / sync / export) ───────── */
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
        (SHOW_THEME_EMOJIS && t.emoji ? esc(t.emoji) + " " : "") + esc(t.display_name || t.slug) + "</label>";
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
    ceEl("ce-shortname").value = a.short_name || "";
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
      slug: slug, display_name: name, short_name: (ceEl("ce-shortname").value || "").trim(), type: "case",
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
        closeEditor();
        if (!editingSlug && slug !== CURRENT) { location.hash = "case=" + slug; }
        reloadCases();
      }).catch(function () { ceEl("ce-save").disabled = false; ceErr("Save failed — network error"); ceFootMsg(""); });
  }

  function deleteCase() {
    if (!editingSlug) return;
    if (!window.confirm("Delete case \"" + editingSlug + "\"? This removes its config, data, page, and uploads and can't be undone. Consider Export first.")) return;
    ceFootMsg("Deleting…");
    fetch("/api/admin/cases?slug=" + encodeURIComponent(editingSlug), { method: "DELETE", credentials: "include" })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) { ceErr((d && d.error) || "Failed to delete"); ceFootMsg(""); return; }
        closeEditor();
        location.href = "index.html";
      }).catch(function () { ceErr("Delete failed — network error"); ceFootMsg(""); });
  }

  function syncNow(slug, btn) {
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    fetch("/api/admin/sync-case", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ slug: slug }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (btn) { btn.disabled = false; btn.textContent = "Sync"; }
        var meta = document.getElementById("ud-meta");
        if (meta && d && !d.ok) meta.textContent = "Sync failed: " + (d.error || "error");
        else if (meta && d && d.note) meta.textContent = d.note;
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

  function wireEditor() {
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

  // ── Boot ──────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    CURRENT = currentSlug();
    VIEW_DATE = currentDate();
    if (!CURRENT) {
      // The dashboard IS the briefing overview — this page only reads one.
      location.replace("index.html");
      return;
    }
    wireEditor();
    loadHistory(CURRENT).then(render);
    window.addEventListener("hashchange", function () {
      var next = currentSlug();
      if (!next) { location.replace("index.html"); return; }
      VIEW_DATE = currentDate();
      if (next !== CURRENT) {
        CURRENT = next;
        loadHistory(CURRENT).then(render);
      } else {
        render();
      }
    });

    // Display names for theme tags follow /admin/intelligence renames.
    fetchJson("themes.json").then(function (d) {
      SHOW_THEME_EMOJIS = !d || d.show_emojis !== false;
      var list = (d && d.themes) || [];
      THEME_LIST = list.filter(function (t) { return t && t.slug; })
        .map(function (t) { return { slug: t.slug, display_name: t.display_name || t.slug, emoji: t.emoji || "📰" }; });
      list.forEach(function (t) {
        if (!t || !t.slug) return;
        THEMES[t.slug] = { name: t.display_name || t.slug, emoji: t.emoji || "📰" };
      });
      render();
    }).catch(function () {});

    // Case pill colors roam with the shared prefs store.
    fetchJson("api/prefs").then(function (p) {
      if (p && p.ok && p.colors) {
        Object.keys(p.colors).forEach(function (k) { savedColors[k] = p.colors[k]; });
        try { localStorage.setItem("ud-case-colors", JSON.stringify(savedColors)); } catch (e) {}
        render();
      }
    }).catch(function () {});

    reloadCases();
  });
})();
