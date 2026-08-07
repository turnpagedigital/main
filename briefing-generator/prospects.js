(function () {
  "use strict";

  /* Prospects — triage list for candidate cases surfaced by scan_prospects.py.

     Data: api/prospects (live GitHub state; static prospects.json fallback).
     Track opens a modal prefilled from the prospect and creates the case via
     the EXISTING /api/admin/cases endpoint (same admin session cookie the
     intel middleware already validated), then marks the prospect tracked via
     PUT api/prospects. Dismiss/Restore are one-click status flips.

     External file on purpose — the stacked CSPs on /intel/* silently kill
     inline scripts in production. */

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

  var THEMES = {};   // slug → {name, emoji, bg, fg} (hydrated from themes.json)
  var FALLBACK_THEME = { name: "", emoji: "📰", bg: "#E0E7FF", fg: "#3730a3" };
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
    var c = THEME_COLORS[slug] || FALLBACK_THEME;
    return { name: slug || "untagged", emoji: FALLBACK_THEME.emoji, bg: c.bg, fg: c.fg };
  }

  function themePill(slug) {
    var t = themeOf(slug);
    return '<span class="ud-pill ud-pill-sq" style="background:' + t.bg + ";color:" + t.fg + '">' + t.emoji + " " + esc(t.name) + "</span>";
  }

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[Number(m[2]) - 1] + " " + Number(m[3]);
  }

  var ITEMS = [];
  var TAB = "new";
  var activeThemes = {};   // theme slug → bool (default all on)

  function themeOn(slug) { return activeThemes[slug] !== false; }

  function themeSlugs() {
    var set = {};
    ITEMS.forEach(function (i) { if (i.theme) set[i.theme] = true; });
    Object.keys(THEMES).forEach(function (s) { set[s] = true; });
    return Object.keys(set);
  }

  function visible() {
    return ITEMS.filter(function (i) {
      if (!i || !i.id) return false;
      if (TAB !== "all" && (i.status || "new") !== TAB) return false;
      return !i.theme || themeOn(i.theme);
    });
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  function actionCell(i) {
    var status = i.status || "new";
    if (status === "new") {
      return '<button type="button" class="pr-btn pr-btn-track" data-track="' + esc(i.id) + '">Track</button>' +
        '<button type="button" class="pr-btn" data-status="dismissed" data-id="' + esc(i.id) + '">Dismiss</button>';
    }
    if (status === "dismissed") {
      return '<span class="pr-status-chip">Dismissed</span> ' +
        '<button type="button" class="pr-btn" data-status="new" data-id="' + esc(i.id) + '">Restore</button>';
    }
    var chip = '<span class="pr-status-chip tracked">Tracked</span>';
    if (i.tracked_slug) {
      chip += ' <a class="pr-btn" href="cases/' + esc(i.tracked_slug) + '.html">Open case</a>';
    }
    return chip;
  }

  function render() {
    var tbody = document.getElementById("pr-tbody");
    var countEl = document.getElementById("ud-count");
    var list = visible();
    if (countEl) {
      var newCount = ITEMS.filter(function (i) { return (i.status || "new") === "new"; }).length;
      countEl.textContent = list.length + " prospect" + (list.length === 1 ? "" : "s") +
        (TAB === "all" ? "" : " · " + TAB) + " — " + newCount + " awaiting triage";
    }
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="ud-empty">' +
        (TAB === "new" ? "Nothing to triage — the daily theme scans surface candidate cases here." : "Nothing here.") +
        "</td></tr>";
      return;
    }
    tbody.innerHTML = list.map(function (i) {
      var meta = [i.parties && i.parties !== i.case_name ? i.parties : "", i.court, i.case_number]
        .filter(Boolean).join(" · ");
      var src = i.source_url
        ? '<div class="pr-src"><a href="' + esc(i.source_url) + '" target="_blank" rel="noopener">' +
          esc(i.source_name || "source") + (i.date ? " · " + esc(fmtDate(i.date)) : "") + " ↗</a></div>"
        : "";
      return (
        '<tr id="pr-' + esc(i.id) + '">' +
          '<td class="ud-date">' + esc(fmtDate(i.first_seen)) + "</td>" +
          "<td>" + themePill(i.theme) + "</td>" +
          "<td>" +
            '<div class="pr-name">' + esc(i.case_name) + "</div>" +
            (meta ? '<div class="pr-meta">' + esc(meta) + "</div>" : "") +
            (i.why ? '<div class="pr-why">' + esc(i.why) + "</div>" : "") +
            src +
          "</td>" +
          '<td class="pr-actions">' + actionCell(i) + "</td>" +
        "</tr>"
      );
    }).join("");

    tbody.querySelectorAll("[data-status]").forEach(function (b) {
      b.addEventListener("click", function () {
        setStatus(b.getAttribute("data-id"), b.getAttribute("data-status"), b);
      });
    });
    tbody.querySelectorAll("[data-track]").forEach(function (b) {
      b.addEventListener("click", function () {
        openTrackModal(b.getAttribute("data-track"));
      });
    });
  }

  function setStatus(id, status, btn, extra) {
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    var body = { id: id, status: status };
    if (extra && extra.tracked_slug) body.tracked_slug = extra.tracked_slug;
    return fetch("api/prospects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "save failed");
      ITEMS.forEach(function (p) {
        if (p.id === id) {
          p.status = status;
          if (body.tracked_slug) p.tracked_slug = body.tracked_slug;
        }
      });
      render();
      return true;
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = status === "dismissed" ? "Dismiss" : "Restore"; }
      alert("Could not save: " + e.message);
      return false;
    });
  }

  // ── Theme filter dropdown ─────────────────────────────────────────────────
  function renderThemePanel() {
    var btn = document.getElementById("pr-theme-btn");
    var panel = document.getElementById("pr-theme-panel");
    if (!btn || !panel) return;
    var slugs = themeSlugs();
    var on = slugs.filter(themeOn).length;
    btn.innerHTML = (on === slugs.length ? "Themes: All" : "Themes: " + on + "/" + slugs.length) +
      ' <span class="ud-dd-caret">▾</span>';
    panel.innerHTML =
      '<div class="ud-dd-head">' +
        '<button type="button" class="ud-dd-quick" data-act="all">Select all</button>' +
        '<button type="button" class="ud-dd-quick" data-act="none">Deselect all</button>' +
      "</div>" +
      slugs.map(function (s) {
        return '<label class="ud-dd-row"><input type="checkbox" data-slug="' + esc(s) + '"' +
          (themeOn(s) ? " checked" : "") + ">" + themePill(s) + "</label>";
      }).join("");
    panel.querySelectorAll(".ud-dd-quick").forEach(function (q) {
      q.addEventListener("click", function () {
        var val = q.getAttribute("data-act") === "all";
        slugs.forEach(function (s) { activeThemes[s] = val; });
        renderThemePanel();
        render();
      });
    });
    panel.querySelectorAll("[data-slug]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeThemes[cb.getAttribute("data-slug")] = cb.checked;
        renderThemePanel();
        render();
      });
    });
  }

  // ── Track modal — promotes via the existing /api/admin/cases endpoint ─────
  var modalEl = null;

  function closeModal() {
    if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    modalEl = null;
  }

  function slugify(name) {
    return String(name || "").toLowerCase()
      .replace(/['’.]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  function docketIdFrom(url) {
    var m = /courtlistener\.com\/docket\/(\d+)/.exec(url || "");
    return m ? m[1] : (/^\d{4,}$/.test((url || "").trim()) ? (url || "").trim() : "");
  }

  function field(label, id, value, opts) {
    opts = opts || {};
    return '<label' + (opts.wide ? ' class="pr-wide"' : "") + '>' + label +
      (opts.hint ? ' <span class="pr-hint">' + opts.hint + "</span>" : "") +
      '<input type="text" id="' + id + '" value="' + esc(value || "") + '"' +
      (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") + "></label>";
  }

  function openTrackModal(id) {
    var p = null;
    ITEMS.forEach(function (i) { if (i.id === id) p = i; });
    if (!p) return;
    closeModal();

    var themeChecks = themeSlugs().map(function (s) {
      var t = themeOf(s);
      return '<label><input type="checkbox" data-topic="' + esc(s) + '"' +
        (s === p.theme ? " checked" : "") + "> " + t.emoji + " " + esc(t.name) + "</label>";
    }).join("");

    var wrap = document.createElement("div");
    wrap.className = "pr-overlay";
    wrap.innerHTML =
      '<div class="pr-box">' +
        "<h2>Track this case</h2>" +
        '<div class="sub">Creates a tracked case (same as Admin → Intelligence → Cases): the docket syncs on the next hourly run, the case joins the unified docket/calendar, and it gets its own daily briefing when it moves. A CourtListener docket is required for live syncing — paste the docket URL if you have it, or switch to a claims-agent source.</div>' +
        '<div class="pr-grid">' +
          field("Display name", "tk-name", p.case_name, { wide: true }) +
          field("Slug", "tk-slug", slugify(p.case_name), { hint: "(kebab-case id)" }) +
          '<label>Docket source' +
            '<select id="tk-type"><option value="courtlistener">CourtListener docket</option><option value="claims_agent">Claims agent / no docket</option></select>' +
          "</label>" +
          field("Parties", "tk-parties", p.parties || p.case_name, { wide: true }) +
          field("CourtListener docket URL or ID", "tk-docket", p.docket_url, { wide: true, placeholder: "https://www.courtlistener.com/docket/12345678/…" }) +
          field("Court", "tk-court", p.court) +
          field("Case number", "tk-number", p.case_number) +
          field("Judge", "tk-judge", "") +
          field("Claims-agent URL", "tk-claims", "", { placeholder: "only for claims-agent source" }) +
          '<label class="pr-wide">Themes<div class="pr-topics">' + themeChecks + "</div></label>" +
          '<label class="pr-wide">Scan guidance <span class="pr-hint">(steers the news scan for this case)</span>' +
            '<textarea id="tk-guidance" rows="2">' + esc(p.why || "") + "</textarea></label>" +
        "</div>" +
        '<div class="pr-modal-actions">' +
          '<div class="pr-modal-status" id="tk-status"></div>' +
          '<button type="button" class="pr-btn" id="tk-cancel">Cancel</button>' +
          '<button type="button" class="pr-btn pr-btn-track" id="tk-create">Create &amp; track</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap);
    modalEl = wrap;

    var $ = function (fid) { return wrap.querySelector("#" + fid); };
    $("tk-name").addEventListener("input", function () {
      $("tk-slug").value = slugify($("tk-name").value);
    });
    $("tk-cancel").addEventListener("click", closeModal);
    wrap.addEventListener("click", function (ev) {
      if (ev.target === wrap) closeModal();
    });

    $("tk-create").addEventListener("click", function () {
      var status = $("tk-status");
      var type = $("tk-type").value;
      var topics = [];
      wrap.querySelectorAll("[data-topic]").forEach(function (cb) {
        if (cb.checked) topics.push(cb.getAttribute("data-topic"));
      });
      var docketUrlRaw = $("tk-docket").value.trim();
      var docketId = docketIdFrom(docketUrlRaw);
      var payload = {
        slug: slugify($("tk-slug").value),
        display_name: $("tk-name").value.trim(),
        type: "case",
        status: "active",
        sync: "active",
        topics: topics,
        case: {
          parties: $("tk-parties").value.trim(),
          court: $("tk-court").value.trim(),
          case_number: $("tk-number").value.trim(),
          judge: $("tk-judge").value.trim(),
        },
        docket_source: {
          type: type,
          docket_id: docketId || null,
          url: docketId ? (docketUrlRaw.indexOf("http") === 0 ? docketUrlRaw : "https://www.courtlistener.com/docket/" + docketId + "/-/") : "",
        },
        claims_administrator: $("tk-claims").value.trim()
          ? { name: "", url: $("tk-claims").value.trim(), key_dates_url: "" }
          : null,
        scan_guidance: $("tk-guidance").value.trim(),
      };

      // Mirror /api/admin/cases validation so failures are instant + local.
      var err = null;
      if (!payload.slug) err = "A slug is required.";
      else if (!payload.display_name) err = "A display name is required.";
      else if (!topics.length) err = "Tag at least one theme.";
      else if (!payload.case.parties) err = "Parties are required.";
      else if (type === "courtlistener" && !docketId) err = "Paste the CourtListener docket URL (or ID) — or switch to the claims-agent source.";
      else if (type === "courtlistener" && (!payload.case.court || !payload.case.case_number || !payload.case.judge)) err = "Court, case number, and judge are required for a CourtListener docket.";
      else if (type === "claims_agent" && !payload.claims_administrator) err = "A claims-agent URL is required for that source type.";
      if (err) {
        status.className = "pr-modal-status err";
        status.textContent = err;
        return;
      }

      var btn = $("tk-create");
      btn.disabled = true;
      status.className = "pr-modal-status";
      status.textContent = "Creating case…";
      fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "case create failed");
        status.textContent = "Case created — marking prospect tracked…";
        return setStatus(p.id, "tracked", null, { tracked_slug: payload.slug }).then(function () {
          status.className = "pr-modal-status okk";
          status.innerHTML = "Tracked. The docket syncs on the next hourly run — " +
            '<a href="cases/' + esc(payload.slug) + '.html">open the case page</a>.';
          btn.style.display = "none";
          $("tk-cancel").textContent = "Done";
        });
      }).catch(function (e) {
        btn.disabled = false;
        status.className = "pr-modal-status err";
        status.textContent = e.message;
      });
    });
  }

  // ── Tabs + boot ───────────────────────────────────────────────────────────
  function wireTabs() {
    var tabs = document.querySelectorAll("#pr-tabs .pr-tab");
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        TAB = t.getAttribute("data-tab");
        tabs.forEach(function (x) { x.classList.toggle("on", x === t); });
        render();
      });
    });
  }

  function wireDropdown() {
    var btn = document.getElementById("pr-theme-btn");
    var panel = document.getElementById("pr-theme-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      if (panel.style.display === "block") renderThemePanel();
    });
    document.addEventListener("click", function (ev) {
      if (panel.style.display === "none") return;
      if (ev.target && !ev.target.isConnected) return;
      if (panel.contains(ev.target) || btn.contains(ev.target)) return;
      panel.style.display = "none";
    });
  }

  function applyHash() {
    var m = /track=([a-f0-9]{10})/.exec(location.hash || "");
    if (m) openTrackModal(m[1]);
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireTabs();
    wireDropdown();
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeModal();
    });

    fetchJson("themes.json").then(function (d) {
      ((d && d.themes) || []).forEach(function (t) {
        if (!t || !t.slug) return;
        var c = THEME_COLORS[t.slug] || FALLBACK_THEME;
        THEMES[t.slug] = { name: t.display_name || t.slug, emoji: t.emoji || FALLBACK_THEME.emoji, bg: c.bg, fg: c.fg };
      });
      render();
    }).catch(function () {});

    fetchJson("api/prospects")
      .then(function (p) {
        if (!p || !p.ok) throw new Error("api unavailable");
        return p.items || [];
      })
      .catch(function () {
        return fetchJson("prospects.json")
          .then(function (f) { return (f && f.items) || []; })
          .catch(function () { return []; });
      })
      .then(function (items) {
        ITEMS = items;
        var meta = document.getElementById("ud-meta");
        if (meta && ITEMS.length) {
          var newCount = ITEMS.filter(function (i) { return (i.status || "new") === "new"; }).length;
          meta.textContent = newCount + " candidate case" + (newCount === 1 ? "" : "s") +
            " awaiting triage. Track one to start following its docket; Dismiss buries it for good.";
        }
        render();
        renderThemePanel();
        applyHash();
      });
  });
})();
