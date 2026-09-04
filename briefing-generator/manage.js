(function () {
  "use strict";

  /* Manage — intel-site management console (replaces admin → Intelligence →
     Cases/Themes, Aug 2026). Tabs:
       #cases    — tracked-case CRUD (same /api/admin/cases backing store)
       #themes   — theme CRUD (/api/admin/themes → src/data/themes.json)
       #groups   — FILTER groups (quick-select sets in the dashboard Cases
                   dropdown; localStorage ud-case-groups + api/prefs roaming).
                   Briefing groups (cases briefed as one unit) live in the
                   dashboard GROUPS menu, not here.
       #voice    — the "drafting as Andrew" personal/social voice
                   (/api/admin/intelligence-settings → voice.andrew). The
                   analytical house voice for briefings stays in Admin.
       #colors   — default 12-color pill palette (ud-theme-presets + prefs).
     Saves need the ADMIN session cookie (same origin); a login overlay
     appears on 401. External file — CSP kills inline JS on /intel/*. */

  var BASE = location.pathname.indexOf("/intel") === 0 ? "/intel/" : "/";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function $(id) { return document.getElementById(id); }
  function slugify(s) {
    return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function autoFg(bg) {
    var r = parseInt(String(bg).slice(1, 3), 16) || 136;
    var g = parseInt(String(bg).slice(3, 5), 16) || 136;
    var b = parseInt(String(bg).slice(5, 7), 16) || 136;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0A0A0A" : "#FFFFFF";
  }

  // ── Admin-session fetch with login overlay on 401 ─────────────────────────
  function apiFetch(path, opts) {
    opts = opts || {};
    opts.credentials = "include";
    return fetch(path, opts).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        return requireLogin().then(function () { return fetch(path, opts); });
      }
      return res;
    });
  }

  var _loginPending = null;
  function requireLogin() {
    if (_loginPending) return _loginPending;
    _loginPending = new Promise(function (resolve) {
      var ov = document.createElement("div");
      ov.className = "mg-login";
      ov.innerHTML =
        '<div class="mg-login-card">' +
          "<h2>Admin sign-in required</h2>" +
          "<p>Saving here uses the same admin session as /admin. Enter the admin password to continue.</p>" +
          '<div class="mg-field"><input type="password" id="mg-login-pw" placeholder="Admin password" autocomplete="current-password"></div>' +
          '<div id="mg-login-err" class="mg-banner err" style="display:none;"></div>' +
          '<div class="mg-actions"><button type="button" class="mg-btn mg-btn-primary" id="mg-login-go">Sign in</button></div>' +
        "</div>";
      document.body.appendChild(ov);
      var pw = ov.querySelector("#mg-login-pw");
      pw.focus();
      function go() {
        var err = ov.querySelector("#mg-login-err");
        err.style.display = "none";
        fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password: pw.value }),
        }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (j) {
          if (j && j.ok) {
            document.body.removeChild(ov);
            _loginPending = null;
            resolve();
            // A lite (manifest) roster can now upgrade to the full editable one.
            if (CASES_LITE) loadCases().then(function () { route(); });
          } else {
            err.textContent = (j && j.error) || "Wrong password.";
            err.style.display = "block";
          }
        }).catch(function () {
          err.textContent = "Login failed — network error.";
          err.style.display = "block";
        });
      }
      ov.querySelector("#mg-login-go").addEventListener("click", go);
      pw.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    });
    return _loginPending;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  var CASES = [];        // /api/admin/cases
  var CASES_ERR = "";    // load failure surfaced in the Cases tab (page still works)
  var CASES_LITE = false; // true = roster built from the static manifest (read-only editing)
  var PRIORITIES = {};   // slug -> true, roams via api/prefs (same ⭐ flag as the dashboard star)
  var THEMES_SHOW_EMOJIS = true;  // /api/admin/themes show_emojis flag
  var THEMES = [          // /api/admin/themes overwrites; fallback keeps editors usable
    { slug: "rewind-tariffs", display_name: "Tariffs / Trade", emoji: "⚖️" },
    { slug: "llm-class-action", display_name: "LLM / Copyright", emoji: "🤖" },
    { slug: "crypto-insolvency", display_name: "Crypto Insolvency", emoji: "🪙" },
    { slug: "fraud-recovery", display_name: "Ponzi / Fraud Recovery", emoji: "🕵️" },
    { slug: "billion-dollar-class-actions", display_name: "$1B+ Class Actions & Mass Arb", emoji: "💰" },
    { slug: "bankruptcy-creditor-rights", display_name: "Bankruptcy Creditor Rights", emoji: "📜" },
  ];
  var MANIFEST = [];     // cases/data/_manifest.json (colors)
  var savedColors = {};
  try { savedColors = JSON.parse(localStorage.getItem("ud-case-colors") || "{}") || {}; } catch (e) {}

  // Factory palette = Andrew's Aug 2026 light/dark pairings (was the neon set).
  var FALLBACK_SWATCHES = [
    { bg: "#cccccc", fg: "#000000" }, { bg: "#88ee63", fg: "#000000" },
    { bg: "#ffef42", fg: "#000000" }, { bg: "#ffa552", fg: "#000000" },
    { bg: "#fb8eb9", fg: "#000000" }, { bg: "#51ecd2", fg: "#000000" },
    { bg: "#5dd1ee", fg: "#000000" }, { bg: "#d5ff02", fg: "#000000" },
    { bg: "#75b8ff", fg: "#000000" }, { bg: "#cc99ff", fg: "#000000" },
    { bg: "#999cff", fg: "#000000" }, { bg: "#ff7c70", fg: "#000000" },
  ];

  function caseColor(slug) {
    if (savedColors[slug] && savedColors[slug].bg) return savedColors[slug].bg;
    for (var i = 0; i < MANIFEST.length; i++) {
      if (MANIFEST[i].slug === slug) return MANIFEST[i].default_color || "#888888";
    }
    return "#888888";
  }
  function casePill(slug, name) {
    var bg = caseColor(slug);
    var fg = (savedColors[slug] && savedColors[slug].fg) || autoFg(bg);
    return '<span class="mg-pill" style="--pb:' + bg + ";--pf:" + fg + '">' + esc(name) + "</span>";
  }
  function themeEmoji(slug) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].slug === slug) return THEMES[i].emoji || "🏷️";
    return "🏷️";
  }
  function themeName(slug) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].slug === slug) return THEMES[i].display_name || slug;
    return slug;
  }

  // ── Tiny view helpers ──────────────────────────────────────────────────────
  var root = $("mg-root");
  var _banner = { kind: "", text: "" };
  function setBanner(kind, text) { _banner = { kind: kind, text: text }; }
  function bannerHtml() {
    if (!_banner.text) return "";
    var h = '<div class="mg-banner ' + _banner.kind + '">' + esc(_banner.text) + "</div>";
    _banner = { kind: "", text: "" };
    return h;
  }
  function confirmModal(html, onYes, yesLabel) {
    var ov = document.createElement("div");
    ov.className = "mg-modal";
    ov.innerHTML =
      '<div class="mg-modal-card">' + html +
        '<div class="mg-actions">' +
          '<button type="button" class="mg-btn mg-btn-danger" data-yes>' + esc(yesLabel || "Delete") + "</button>" +
          '<button type="button" class="mg-btn" data-no>Cancel</button>' +
        "</div></div>";
    document.body.appendChild(ov);
    ov.querySelector("[data-yes]").addEventListener("click", function () { document.body.removeChild(ov); onYes(); });
    ov.querySelector("[data-no]").addEventListener("click", function () { document.body.removeChild(ov); });
  }

  // ── Tab router ─────────────────────────────────────────────────────────────
  var TABS = { cases: renderCases, themes: renderThemes, groups: renderGroups, sources: renderSources, voice: renderVoice, colors: renderColors, briefing: renderBriefingInputs, usage: renderUsage };
  function currentTab() {
    var m = /#(cases|themes|groups|sources|voice|colors|briefing|usage)/.exec(location.hash || "");
    return m ? m[1] : "cases";
  }
  function paintTabs() {
    var t = currentTab();
    var tabs = document.querySelectorAll("#mg-tabs .mg-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle("on", tabs[i].getAttribute("data-tab") === t);
    }
  }
  function route() {
    paintTabs();
    (TABS[currentTab()] || renderCases)();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* ══ CASES ═══════════════════════════════════════════════════════════════ */

  var SYNC_MODES = [
    { value: "active", label: "Active sync", hint: "Hourly + nightly syncing, live docket polling, daily news search." },
    { value: "manual", label: "Manual sync", hint: "Updates only when you press Sync now. No scheduled searching." },
    { value: "archived", label: "Archived", hint: "Docket entries are kept but the case is never searched again." },
  ];
  // ── Pill color popover (same store the dashboard gears use) ───────────────
  function persistColors() {
    try { localStorage.setItem("ud-case-colors", JSON.stringify(savedColors)); } catch (e) {}
  }
  function pushColorsToPrefs() {
    fetch(BASE + "api/prefs").then(function (r) { return r.json(); }).catch(function () { return {}; })
      .then(function (p) {
        var colors = (p && p.colors) || {};
        Object.keys(savedColors).forEach(function (k) { colors[k] = savedColors[k]; });
        CASES.forEach(function (c) { if (savedColors[c.slug] === undefined) delete colors[c.slug]; });
        return fetch(BASE + "api/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            colors: colors,
            groups: (p && p.groups) || [],
            presets: (p && p.presets) || [],
            theme_presets: (p && p.theme_presets) || [],
            priorities: (p && p.priorities) || {},
          }),
        });
      }).catch(function () {});
  }
  function loadPriorities() {
    return fetch(BASE + "api/prefs").then(function (r) { return r.json(); })
      .then(function (p) { PRIORITIES = (p && p.priorities) || {}; })
      .catch(function () {});
  }
  function pushPriorityToPrefs(slug, on) {
    return fetch(BASE + "api/prefs").then(function (r) { return r.json(); }).catch(function () { return {}; })
      .then(function (p) {
        var priorities = (p && p.priorities) || {};
        if (on) priorities[slug] = true; else delete priorities[slug];
        PRIORITIES = priorities;
        return fetch(BASE + "api/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            colors: (p && p.colors) || {},
            groups: (p && p.groups) || [],
            presets: (p && p.presets) || [],
            theme_presets: (p && p.theme_presets) || [],
            priorities: priorities,
          }),
        });
      }).catch(function () {});
  }
  function repaintPill(slug) {
    var c = CASES.filter(function (x) { return x.slug === slug; })[0];
    var span = root.querySelector('[data-pill="' + slug + '"]');
    if (c && span) span.innerHTML = casePill(slug, c.short_name || c.display_name);
  }

  var popEl = null;
  function closePop() { if (popEl && popEl.parentNode) popEl.parentNode.removeChild(popEl); popEl = null; }
  document.addEventListener("click", function (ev) {
    if (popEl && !popEl.contains(ev.target)) closePop();
  });

  function colorPopover(slug, anchor) {
    closePop();
    var c = CASES.filter(function (x) { return x.slug === slug; })[0] || {};
    var cur = savedColors[slug] || {};
    var bg = cur.bg || caseColor(slug);
    var fg = cur.fg || autoFg(bg);
    var hasBorder = !!cur.border;

    var pop = document.createElement("div");
    pop.className = "mg-pop";
    var sws = currentSwatches();
    pop.innerHTML =
      '<div class="mg-pop-title">' + esc(c.short_name || c.display_name || slug) + "</div>" +
      '<div class="mg-pop-sws">' +
        sws.map(function (s, i) {
          var on = String(s.bg).toLowerCase() === String(bg).toLowerCase();
          return '<button type="button" class="mg-pop-sw' + (on ? " on" : "") + '" data-sw="' + i + '" style="background:' + esc(s.bg) + '" title="' + esc(s.bg) + '"></button>';
        }).join("") +
      "</div>" +
      '<div class="mg-pop-row"><label>Bg <input type="color" data-bg value="' + esc(bg) + '"></label>' +
        '<label>Text <input type="color" data-fg value="' + esc(fg) + '"></label></div>' +
      '<div class="mg-pop-row"><label><input type="checkbox" data-border-on' + (hasBorder ? " checked" : "") + "> Border</label>" +
        '<input type="color" data-border value="' + esc(cur.border || fg) + '"></div>' +
      '<button type="button" class="mg-btn mg-pop-reset" data-reset>Reset to default</button>';

    document.body.appendChild(pop);
    var rect = anchor.getBoundingClientRect();
    pop.style.top = (rect.bottom + window.scrollY + 6) + "px";
    pop.style.left = Math.max(8, Math.min(rect.left + window.scrollX - 90, window.innerWidth - 280)) + "px";
    popEl = pop;

    function apply() {
      var entry = { bg: pop.querySelector("[data-bg]").value, fg: pop.querySelector("[data-fg]").value };
      if (pop.querySelector("[data-border-on]").checked) entry.border = pop.querySelector("[data-border]").value;
      savedColors[slug] = entry;
      persistColors();
      repaintPill(slug);
      pushColorsToPrefs();
    }
    pop.querySelectorAll("[data-sw]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = currentSwatches()[Number(b.getAttribute("data-sw"))];
        pop.querySelector("[data-bg]").value = s.bg;
        pop.querySelector("[data-fg]").value = s.fg || autoFg(s.bg);
        pop.querySelectorAll(".mg-pop-sw").forEach(function (x) { x.classList.toggle("on", x === b); });
        apply();
      });
    });
    pop.querySelectorAll("[data-bg], [data-fg], [data-border]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        if (inp.hasAttribute("data-border")) pop.querySelector("[data-border-on]").checked = true;
        apply();
      });
    });
    pop.querySelector("[data-border-on]").addEventListener("change", apply);
    pop.querySelector("[data-reset]").addEventListener("click", function () {
      delete savedColors[slug];
      persistColors();
      repaintPill(slug);
      pushColorsToPrefs();
      closePop();
    });
  }

  function defaultCase() {
    return {
      slug: "", display_name: "", short_name: "", type: "case", status: "active", sync: "active",
      docket_history: "full",
      topics: [],
      case: { parties: "", court: "", case_number: "", judge: "" },
      docket_source: { type: "courtlistener", docket_id: null, url: "", awaiting_sync: false },
      claims_administrator: null,
      scan_guidance: "",
    };
  }

  function renderCases() {
    var rows = CASES.map(function (c) {
      var sync = c.sync || "active";
      var dockUrl = (c.docket_source && c.docket_source.url) || (c.claims_administrator && c.claims_administrator.url) || "";
      return (
        "<tr" + (sync === "archived" ? ' style="opacity:0.55"' : "") + ">" +
          '<td><span data-pill="' + esc(c.slug) + '">' + casePill(c.slug, c.short_name || c.display_name) + "</span>" +
            '<button type="button" class="mg-gear" data-color="' + esc(c.slug) + '" title="Pill colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
            '<div class="mg-slug">' + esc(c.slug) + "</div></td>" +
          '<td><select class="mg-sync-select mg-sync ' + esc(sync) + '" data-sync-select="' + esc(c.slug) + '" title="Sync mode">' +
            SYNC_MODES.map(function (s) { return '<option value="' + s.value + '"' + (sync === s.value ? " selected" : "") + ">" + esc(s.label) + "</option>"; }).join("") +
            "</select>" +
            (c.status && c.status !== "active" ? '<div class="mg-slug">' + esc(c.status) + "</div>" : "") + "</td>" +
          '<td title="' + esc((c.topics || []).map(themeName).join(", ")) + '">' + (THEMES_SHOW_EMOJIS ? (c.topics || []).map(themeEmoji).join(" ") : esc((c.topics || []).map(themeName).join(", "))) + "</td>" +
          '<td class="mg-right">' +
            (dockUrl ? '<a class="mg-btn mg-btn-ghost" href="' + esc(dockUrl) + '" target="_blank" rel="noopener">Docket ↗</a> '
                     : (c.docket_source && c.docket_source.type === "watch")
                       ? '<span class="mg-slug" style="display:inline-block;margin-right:6px" title="Followed by the news scan only — no docket">Web search</span>'
                       : "") +
            (sync !== "archived" ? '<button type="button" class="mg-btn" data-sync="' + esc(c.slug) + '" title="Sync now — fresh docket entries + a news search; the briefing refreshes if it’s older than 12 hours">Sync now</button> ' : "") +
            '<button type="button" class="mg-btn" data-export="' + esc(c.slug) + '">Export</button> ' +
            (CASES_LITE ? "" :
              '<button type="button" class="mg-btn" data-edit="' + esc(c.slug) + '">Edit</button> ' +
              '<button type="button" class="mg-btn mg-btn-danger" data-del="' + esc(c.slug) + '">Delete</button>') +
          "</td>" +
        "</tr>"
      );
    }).join("");

    root.innerHTML =
      bannerHtml() +
      (CASES_ERR ? '<div class="mg-banner err">Cases failed to load: ' + esc(CASES_ERR) + "</div>" : "") +
      (CASES_LITE ? '<div class="mg-banner warn">Showing the pipeline manifest (roster + colors only) — the admin API isn’t reachable yet. Editing prompts for sign-in.</div>' : "") +
      '<div class="mg-head"><h2>Tracked cases</h2>' +
        '<button type="button" class="mg-btn mg-btn-primary" id="mg-new-case">＋ New case</button></div>' +
      '<p class="mg-hint">Every matter the pipeline follows. A case can span multiple themes and carries its own scan guidance. Colors are set from the pill <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> menu in this table — the only place pill colors can be changed; the default palette lives in Colors.</p>' +
      '<div class="mg-box"><table class="mg-table">' +
        "<thead><tr><th>Case</th><th>Sync</th><th>Themes</th><th class=\"mg-right\">Actions</th></tr></thead>" +
        "<tbody>" + (rows || '<tr><td colspan="4" class="mg-empty">No cases yet — create the first one.</td></tr>') + "</tbody>" +
      "</table></div>";

    $("mg-new-case").addEventListener("click", function () { renderCaseEditor(null); });
    // Deep link from a reader page's case dropdown ("Edit case details…"):
    // #cases=<slug> opens straight into that case's editor.
    var deepLink = /#cases=([a-z0-9-]+)/.exec(location.hash || "");
    if (deepLink) {
      var target = CASES.filter(function (x) { return x.slug === deepLink[1]; })[0];
      if (target) renderCaseEditor(target);
    }
    root.querySelectorAll("[data-color]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        colorPopover(b.getAttribute("data-color"), b);
      });
    });
    root.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = CASES.filter(function (x) { return x.slug === b.getAttribute("data-edit"); })[0];
        renderCaseEditor(JSON.parse(JSON.stringify(c)));
      });
    });
    root.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-del");
        confirmModal(
          "<p>Delete case <strong>" + esc(slug) + "</strong>? This removes its configuration, docket data, case page, and uploaded documents — and can’t be undone. Consider <strong>Export</strong> first.</p>",
          function () {
            apiFetch("/api/admin/cases?slug=" + encodeURIComponent(slug), { method: "DELETE" })
              .then(function (r) { return r.json(); })
              .then(function (j) {
                if (!j.ok) throw new Error(j.error || "Delete failed");
                setBanner("ok", "Case deleted.");
                return loadCases();
              })
              .then(renderCases)
              .catch(function (e) { setBanner("err", String(e.message || e)); renderCases(); });
          }
        );
      });
    });
    root.querySelectorAll("[data-sync-select]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var slug = sel.getAttribute("data-sync-select");
        var c = CASES.filter(function (x) { return x.slug === slug; })[0];
        if (!c) return;
        var next = sel.value;
        var payload = JSON.parse(JSON.stringify(c));
        payload.sync = next;
        sel.disabled = true;
        apiFetch("/api/admin/cases", {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (!j.ok) throw new Error(j.error || "Save failed");
          c.sync = next;
          setBanner("ok", "Sync mode updated for " + (c.short_name || c.display_name || slug) + ".");
          renderCases();
        }).catch(function (e) {
          setBanner("err", "Sync mode change failed for " + (c.short_name || c.display_name || slug) + ": " + String(e.message || e));
          renderCases();
        });
      });
    });
    root.querySelectorAll("[data-sync]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-sync");
        function reset() { b.disabled = false; b.textContent = "Sync now"; }
        b.disabled = true; b.textContent = "Dispatching…";
        if (!window.IntelSync) { setBanner("err", "Sync helper failed to load — hard-refresh the page."); reset(); return; }
        IntelSync.syncCase(slug).then(function (res) {
          if (res.status === 401 || res.status === 403) {
            setBanner("err", "Session expired — reload and sign in again."); reset();
          } else if (res.body && res.body.ok) {
            setBanner("ok", "Sync started for " + slug + " — fresh docket + news search, and a briefing if the last one is over 12h old. Watching the run…");
            b.textContent = "Running…";
            IntelSync.watch(slug, ["manual-sync", "docket-sync"], function (st) {
              if (st.state === "success") {
                setBanner("ok", "Sync finished for " + slug + "."); reset();
              } else if (st.state === "failure" || st.state === "timeout" || st.state === "lost") {
                setBanner("err", "Sync for " + slug + ": " + IntelSync.describe(st) +
                  (st.run && st.run.html_url ? " — " + st.run.html_url : ""));
                reset();
              }
            });
          } else {
            setBanner("err", (res.body && res.body.error) || "Sync dispatch failed"); reset();
          }
        }).catch(function (e) { setBanner("err", String((e && e.message) || e)); reset(); });
      });
    });
    root.querySelectorAll("[data-export]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-export");
        b.disabled = true; b.textContent = "…";
        apiFetch("/api/admin/case-export?slug=" + encodeURIComponent(slug))
          .then(function (res) {
            if (!res.ok) throw new Error("Export failed (" + res.status + ")");
            var cd = res.headers.get("Content-Disposition") || "";
            var m = /filename="([^"]+)"/.exec(cd);
            return res.blob().then(function (blob) {
              var a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = m ? m[1] : "case-" + slug + ".zip";
              document.body.appendChild(a); a.click(); a.remove();
              URL.revokeObjectURL(a.href);
              b.disabled = false; b.textContent = "Export";
            });
          })
          .catch(function (e) { setBanner("err", String(e.message || e)); renderCases(); });
      });
    });
  }

  function renderCaseEditor(c) {
    var isNew = !c;
    var form = c || defaultCase();
    if (!form.case) form.case = { parties: "", court: "", case_number: "", judge: "" };
    if (!form.docket_source) form.docket_source = { type: "courtlistener", docket_id: null, url: "", awaiting_sync: false };
    // Three tracking sources. "watch" has no docket at all: the case is followed
    // by the news scan alone, which is how you follow a situation that has no
    // filed docket yet (or one CourtListener doesn't carry).
    var srcType = form.docket_source.type === "claims_agent" ? "claims_agent"
                : form.docket_source.type === "watch" ? "watch" : "courtlistener";
    var isCL = srcType === "courtlistener";

    var themeChecks = THEMES.map(function (t) {
      var on = (form.topics || []).indexOf(t.slug) >= 0;
      return '<label class="mg-check' + (on ? " on" : "") + '"><input type="checkbox" data-topic="' + esc(t.slug) + '"' + (on ? " checked" : "") + "> " + esc(t.emoji) + " " + esc(t.display_name) + "</label>";
    }).join("");

    root.innerHTML =
      bannerHtml() +
      '<div class="mg-head"><h2>' + (isNew ? "New case" : "Edit: " + esc(form.display_name || form.slug)) + "</h2>" +
        '<button type="button" class="mg-btn" id="mg-back">← All cases</button></div>' +
      '<div class="mg-form" id="mg-case-form">' +
        "<h3>Basics</h3>" +
        '<div class="mg-field"><label>Display name *</label><input type="text" id="cf-name" value="' + esc(form.display_name) + '" placeholder="e.g. Bartz v. Anthropic"></div>' +
        '<div class="mg-grid3">' +
          '<div class="mg-field"><label>Slug ' + (isNew ? "(auto if blank)" : "(fixed)") + "</label><input type=\"text\" id=\"cf-slug\" value=\"" + esc(form.slug) + '"' + (isNew ? "" : " disabled") + "></div>" +
          '<div class="mg-field"><label>Short name (pill label)</label><input type="text" id="cf-short" value="' + esc(form.short_name || "") + '" placeholder="Bartz"></div>' +
          '<div class="mg-field"><label>Display status (badge)</label><input type="text" id="cf-status" value="' + esc(form.status || "") + '" placeholder="e.g. Settlement — final approval pending"></div>' +
        "</div>" +
        '<div class="mg-field" style="max-width:360px"><label>Sync mode</label><select id="cf-sync">' +
          SYNC_MODES.map(function (s) { return '<option value="' + s.value + '"' + ((form.sync || "active") === s.value ? " selected" : "") + ">" + s.label + "</option>"; }).join("") +
        '</select><div class="mg-note" id="cf-sync-hint"></div></div>' +
        '<label class="mg-check' + (PRIORITIES[form.slug] ? " on" : "") + '" style="max-width:420px"><input type="checkbox" id="cf-priority"' + (PRIORITIES[form.slug] ? " checked" : "") + "> ⭐ High priority</label>" +
        '<div class="mg-note">Auto-briefed on the weekday 10am ET schedule. Everything else needs a manual Run Now / Brief now.</div>' +

        (isNew ? "" :
          "<h3>Pill color</h3>" +
          '<div class="mg-field"><span data-pill="' + esc(form.slug) + '">' + casePill(form.slug, form.short_name || form.display_name || form.slug) + "</span>" +
            '<span class="mg-note" style="margin-left:10px">Saves instantly (this browser + roaming prefs) — separate from the case fields below.</span></div>' +
          '<div class="mg-pop-sws" id="cf-sws" style="max-width:300px"></div>' +
          '<div class="mg-pop-row"><label>Bg <input type="color" id="cf-col-bg"></label>' +
            '<label>Text <input type="color" id="cf-col-fg"></label>' +
            '<label><input type="checkbox" id="cf-col-border-on"> Border</label>' +
            '<input type="color" id="cf-col-border">' +
            '<button type="button" class="mg-btn" id="cf-col-reset" style="margin-left:8px">Reset to default</button></div>'
        ) +

        "<h3>Themes (tag one or more)</h3>" +
        '<div class="mg-grid2" id="cf-topics">' + themeChecks + "</div>" +

        "<h3>Tracking source</h3>" +
        '<div class="mg-field" style="max-width:360px"><label>Source type</label><select id="cf-srctype">' +
          '<option value="courtlistener"' + (srcType === "courtlistener" ? " selected" : "") + ">Court docket (CourtListener)</option>" +
          '<option value="claims_agent"' + (srcType === "claims_agent" ? " selected" : "") + ">Claims agent (administrator)</option>" +
          '<option value="watch"' + (srcType === "watch" ? " selected" : "") + ">Web search only (no docket)</option>" +
        "</select></div>" +
        '<div id="cf-src-cl" style="display:' + (srcType === "courtlistener" ? "block" : "none") + '">' +
          '<div class="mg-field"><label>Docket ID *</label>' +
            '<div style="display:flex;gap:8px"><input type="text" id="cf-docketid" value="' + esc(form.docket_source.docket_id || "") + '" placeholder="e.g. 69058235">' +
            '<button type="button" class="mg-btn" id="cf-lookup">Look up</button></div>' +
            '<div class="mg-note" id="cf-lookup-msg">Enter the CourtListener docket ID and click Look up to auto-fill parties, court, case number, and judge.</div></div>' +
          '<div class="mg-field"><label>Docket URL</label><input type="url" id="cf-docketurl" value="' + esc(form.docket_source.url || "") + '" placeholder="https://www.courtlistener.com/docket/…"></div>' +
          '<div class="mg-field" style="max-width:360px"><label>Docket history</label><select id="cf-history">' +
            '<option value="full"' + ((form.docket_history || "full") !== "prospective" ? " selected" : "") + ">Full — backfill older filings</option>" +
            '<option value="prospective"' + ((form.docket_history || "full") === "prospective" ? " selected" : "") + ">Prospective — new filings only</option>" +
          '</select><div class="mg-note">Full walks the entire docket history over time — thorough, but it spends CourtListener quota (heavy on monster dockets like FTX). Prospective only pulls filings from now on.</div></div>' +
          '<label class="mg-check" style="max-width:420px"><input type="checkbox" id="cf-awaiting"' + (form.docket_source.awaiting_sync ? " checked" : "") + "> Awaiting sync (dormant until docket refresh)</label>" +
        "</div>" +
        '<div id="cf-src-ca" style="display:' + (srcType === "claims_agent" ? "block" : "none") + '">' +
          '<div class="mg-field"><label>Claims-agent URL *</label><input type="url" id="cf-claimsurl" value="' + esc((form.claims_administrator && form.claims_administrator.url) || "") + '" placeholder="https://www.examplesettlement.com/"></div>' +
          '<div class="mg-field"><label>Key dates URL</label><input type="url" id="cf-keydates" value="' + esc((form.claims_administrator && form.claims_administrator.key_dates_url) || "") + '" placeholder="https://…/dates"></div>' +
        "</div>" +
        '<div id="cf-src-watch" style="display:' + (srcType === "watch" ? "block" : "none") + '">' +
          '<div class="mg-note">No docket is pulled. The twice-daily news scan follows this one on the web alone, ' +
          "and a briefing is written whenever new coverage lands \u2014 same as a docketed case, minus the filings. " +
          "It costs no CourtListener quota. Court, case number and judge are optional; " +
          "<strong>Scan guidance below is what the search actually runs on</strong>, so name the parties, " +
          "the venue, and the words coverage would use.</div>" +
        "</div>" +

        "<h3>Case details</h3>" +
        '<div class="mg-field"><label>Parties *</label><input type="text" id="cf-parties" value="' + esc(form.case.parties || "") + '" placeholder="e.g. Bartz, et al. v. Anthropic PBC"></div>' +
        '<div class="mg-grid3">' +
          '<div class="mg-field"><label>Court</label><input type="text" id="cf-court" value="' + esc(form.case.court || "") + '" placeholder="N.D. Cal."></div>' +
          '<div class="mg-field"><label>Case number</label><input type="text" id="cf-number" value="' + esc(form.case.case_number || "") + '" placeholder="3:24-cv-05417"></div>' +
          '<div class="mg-field"><label>Judge</label><input type="text" id="cf-judge" value="' + esc(form.case.judge || "") + '" placeholder="Hon. …"></div>' +
        "</div>" +

        "<h3>Scan guidance</h3>" +
        '<div class="mg-field"><textarea id="cf-guidance" placeholder="What to watch for on this specific case — and what to ignore.">' + esc(form.scan_guidance || "") + "</textarea></div>" +

        '<div class="mg-actions">' +
          '<button type="button" class="mg-btn mg-btn-primary" id="cf-save">' + (isNew ? "Create case" : "Save changes") + "</button>" +
          '<button type="button" class="mg-btn" id="cf-cancel">Cancel</button>' +
          '<span class="mg-note" id="cf-err" style="color:var(--danger);align-self:center"></span>' +
        "</div>" +
      "</div>";

    function syncHint() {
      var v = $("cf-sync").value;
      var m = SYNC_MODES.filter(function (s) { return s.value === v; })[0];
      $("cf-sync-hint").textContent = m ? m.hint : "";
    }
    syncHint();
    $("cf-sync").addEventListener("change", syncHint);
    $("mg-back").addEventListener("click", renderCases);
    $("cf-cancel").addEventListener("click", renderCases);
    $("cf-srctype").addEventListener("change", function () {
      var v = $("cf-srctype").value;
      var cl = v === "courtlistener";
      $("cf-src-cl").style.display = cl ? "block" : "none";
      $("cf-src-ca").style.display = v === "claims_agent" ? "block" : "none";
      $("cf-src-watch").style.display = v === "watch" ? "block" : "none";
    });
    root.querySelectorAll("#cf-topics .mg-check").forEach(function (l) {
      l.querySelector("input").addEventListener("change", function (e) {
        l.classList.toggle("on", e.target.checked);
      });
    });
    $("cf-priority").addEventListener("change", function (e) {
      $("cf-priority").closest(".mg-check").classList.toggle("on", e.target.checked);
    });

    // Pill color controls (existing cases only) — same store as the row gears.
    if (!isNew) {
      var initColor = function () {
        var cur = savedColors[form.slug] || {};
        var bg = cur.bg || caseColor(form.slug);
        $("cf-col-bg").value = bg;
        $("cf-col-fg").value = cur.fg || autoFg(bg);
        $("cf-col-border-on").checked = !!cur.border;
        $("cf-col-border").value = cur.border || cur.fg || autoFg(bg);
        paintEditorSwatches(bg);
      };
      var paintEditorSwatches = function (activeBg) {
        $("cf-sws").innerHTML = currentSwatches().map(function (s, i) {
          var on = String(s.bg).toLowerCase() === String(activeBg || "").toLowerCase();
          return '<button type="button" class="mg-pop-sw' + (on ? " on" : "") + '" data-sw="' + i + '" style="background:' + esc(s.bg) + '" title="' + esc(s.bg) + '"></button>';
        }).join("");
        $("cf-sws").querySelectorAll("[data-sw]").forEach(function (b) {
          b.addEventListener("click", function () {
            var s = currentSwatches()[Number(b.getAttribute("data-sw"))];
            $("cf-col-bg").value = s.bg;
            $("cf-col-fg").value = s.fg || autoFg(s.bg);
            applyEditorColor();
            paintEditorSwatches(s.bg);
          });
        });
      };
      var applyEditorColor = function () {
        var entry = { bg: $("cf-col-bg").value, fg: $("cf-col-fg").value };
        if ($("cf-col-border-on").checked) entry.border = $("cf-col-border").value;
        savedColors[form.slug] = entry;
        persistColors();
        repaintPill(form.slug);
        pushColorsToPrefs();
      };
      ["cf-col-bg", "cf-col-fg", "cf-col-border"].forEach(function (id) {
        $(id).addEventListener("input", function () {
          if (id === "cf-col-border") $("cf-col-border-on").checked = true;
          applyEditorColor();
          paintEditorSwatches($("cf-col-bg").value);
        });
      });
      $("cf-col-border-on").addEventListener("change", applyEditorColor);
      $("cf-col-reset").addEventListener("click", function () {
        delete savedColors[form.slug];
        persistColors();
        repaintPill(form.slug);
        pushColorsToPrefs();
        initColor();
      });
      initColor();
    }
    $("cf-lookup").addEventListener("click", function () {
      var id = $("cf-docketid").value.trim();
      var msg = $("cf-lookup-msg");
      if (!id) { msg.textContent = "Enter a docket ID first."; return; }
      msg.textContent = "Looking up…";
      apiFetch("/api/admin/courtlistener-lookup?docket_id=" + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) throw new Error(d.error || "Lookup failed");
          if (d.case_name) $("cf-parties").value = d.case_name;
          if (d.court) $("cf-court").value = d.court;
          if (d.docket_number) $("cf-number").value = d.docket_number;
          if (d.judge) $("cf-judge").value = d.judge;
          if (d.docket_url) $("cf-docketurl").value = d.docket_url;
          msg.textContent = "Filled from CourtListener ✓";
        })
        .catch(function (e) { msg.textContent = String(e.message || e); });
    });

    $("cf-save").addEventListener("click", function () {
      var srcNow = $("cf-srctype").value;
      var isCLNow = srcNow === "courtlistener";
      var isWatchNow = srcNow === "watch";
      var topics = [];
      root.querySelectorAll("#cf-topics input:checked").forEach(function (i) { topics.push(i.getAttribute("data-topic")); });
      var slug = isNew ? slugify($("cf-slug").value || $("cf-name").value) : form.slug;
      var payload = {
        slug: slug,
        display_name: $("cf-name").value.trim(),
        short_name: $("cf-short").value.trim(),
        type: form.type || "case",
        status: $("cf-status").value.trim() || "active",
        sync: $("cf-sync").value,
        docket_history: isCLNow ? $("cf-history").value : "full",
        topics: topics,
        case: {
          parties: $("cf-parties").value.trim(),
          court: $("cf-court").value.trim(),
          case_number: $("cf-number").value.trim(),
          judge: $("cf-judge").value.trim(),
        },
        docket_source: isCLNow
          ? { type: "courtlistener", docket_id: $("cf-docketid").value.trim() || null, url: $("cf-docketurl").value.trim(), awaiting_sync: $("cf-awaiting").checked }
          : isWatchNow
            ? { type: "watch", docket_id: null, url: "", awaiting_sync: false }
            : { type: "claims_agent", docket_id: null, url: "", awaiting_sync: false },
        // A watch case keeps any administrator link it already had, but never
        // requires one — there is nothing to administer yet.
        claims_administrator: isCLNow || isWatchNow
          ? form.claims_administrator || null
          : { name: "", url: $("cf-claimsurl").value.trim(), key_dates_url: $("cf-keydates").value.trim() },
        scan_guidance: $("cf-guidance").value,
      };

      var err = $("cf-err");
      err.textContent = "";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) { err.textContent = "Slug must be kebab-case."; return; }
      if (isNew && CASES.some(function (x) { return x.slug === payload.slug; })) { err.textContent = "That slug already exists."; return; }
      if (!payload.display_name) { err.textContent = "Display name is required."; return; }
      if (!payload.topics.length) { err.textContent = "Tag at least one theme."; return; }
      // A watch case may not have parties yet (a situation, not a filed case),
      // so the docket-shaped fields are all optional there. What it DOES need is
      // scan guidance, because that is the only thing steering the search.
      if (!isWatchNow && !payload.case.parties) { err.textContent = "Parties are required."; return; }
      if (isCLNow) {
        if (!payload.docket_source.docket_id) { err.textContent = "Docket ID is required for a CourtListener docket."; return; }
        if (!payload.case.court || !payload.case.case_number || !payload.case.judge) { err.textContent = "Court, case number, and judge are required."; return; }
      } else if (isWatchNow) {
        if (!payload.scan_guidance.trim()) { err.textContent = "Scan guidance is required for a web-search case — it is what the search runs on."; return; }
      } else if (!payload.claims_administrator.url) { err.textContent = "A claims-agent URL is required."; return; }

      var priorityOn = $("cf-priority").checked;
      var btn = $("cf-save");
      btn.disabled = true; btn.textContent = "Saving…";
      apiFetch("/api/admin/cases", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.error || "Save failed");
        setBanner("ok", "Case " + (isNew ? "created" : "updated") + ".");
        return pushPriorityToPrefs(slug, priorityOn);
      }).then(loadCases).then(renderCases).catch(function (e) {
        btn.disabled = false; btn.textContent = isNew ? "Create case" : "Save changes";
        err.textContent = String(e.message || e);
      });
    });
  }

  /* ══ THEMES ══════════════════════════════════════════════════════════════ */

  function renderThemes() {
    var rows = THEMES.map(function (t) {
      return (
        "<tr" + (t.active === false ? ' style="opacity:0.55"' : "") + ">" +
          "<td>" + esc(t.emoji || "🏷️") + " <strong>" + esc(t.display_name || t.slug) + "</strong>" +
            '<div class="mg-slug">' + esc(t.slug) + "</div></td>" +
          "<td>" + (t.active === false ? "Paused" : "Active") + "</td>" +
          "<td>" + esc(t.schedule || "daily") + "</td>" +
          "<td>" + (t.keywords || []).length + " keywords</td>" +
          '<td class="mg-right">' +
            '<button type="button" class="mg-btn" data-edit="' + esc(t.slug) + '">Edit</button> ' +
            '<button type="button" class="mg-btn mg-btn-danger" data-del="' + esc(t.slug) + '">Delete</button>' +
          "</td>" +
        "</tr>"
      );
    }).join("");

    root.innerHTML =
      bannerHtml() +
      '<div class="mg-head"><h2>Themes</h2>' +
        '<button type="button" class="mg-btn mg-btn-primary" id="mg-new-theme">＋ New theme</button></div>' +
      '<p class="mg-hint">The standing practice areas. Each theme drives its own scan (keywords + guidance) and appears as a filter pill on the dashboard.</p>' +
      '<label class="mg-check" style="display:inline-flex;align-items:center;gap:7px;margin:0 0 16px;"><input type="checkbox" id="mg-emoji-toggle"' + (THEMES_SHOW_EMOJIS ? " checked" : "") + '> Show theme emojis across the site</label>' +
      '<div class="mg-box"><table class="mg-table">' +
        "<thead><tr><th>Theme</th><th>Status</th><th>Schedule</th><th>Scan</th><th class=\"mg-right\">Actions</th></tr></thead>" +
        "<tbody>" + (rows || '<tr><td colspan="5" class="mg-empty">No themes.</td></tr>') + "</tbody>" +
      "</table></div>";

    $("mg-new-theme").addEventListener("click", function () { renderThemeEditor(null); });
    var emT = $("mg-emoji-toggle");
    if (emT) emT.addEventListener("change", function () {
      var want = emT.checked;
      apiFetch("/api/admin/themes", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_emojis: want }),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.error || "save failed");
        THEMES_SHOW_EMOJIS = want;
        setBanner("ok", "Theme emojis " + (want ? "shown" : "hidden") + " across the site.");
      }).catch(function (e) { emT.checked = !want; setBanner("err", String(e.message || e)); });
    });
    root.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = THEMES.filter(function (x) { return x.slug === b.getAttribute("data-edit"); })[0];
        renderThemeEditor(JSON.parse(JSON.stringify(t)));
      });
    });
    root.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-del");
        var used = CASES.filter(function (c) { return (c.topics || []).indexOf(slug) >= 0; }).length;
        confirmModal(
          "<p>Delete theme <strong>" + esc(slug) + "</strong>?" +
          (used ? " <strong>" + used + " case(s)</strong> are tagged with it — they keep the tag but it stops meaning anything." : "") + "</p>",
          function () {
            apiFetch("/api/admin/themes?slug=" + encodeURIComponent(slug), { method: "DELETE" })
              .then(function (r) { return r.json(); })
              .then(function (j) {
                if (!j.ok) throw new Error(j.error || "Delete failed");
                setBanner("ok", "Theme deleted.");
                return loadThemes();
              })
              .then(renderThemes)
              .catch(function (e) { setBanner("err", String(e.message || e)); renderThemes(); });
          }
        );
      });
    });
  }

  function chipEditor(containerId, items) {
    var list = items.slice();
    var box = $(containerId);
    function paint() {
      box.innerHTML =
        list.map(function (k, i) {
          return '<span class="mg-chip">' + esc(k) + ' <button type="button" data-x="' + i + '">✕</button></span>';
        }).join("") +
        '<input type="text" data-add placeholder="add + Enter" style="border:1px dashed var(--line-strong);background:transparent;font-family:inherit;font-size:12px;padding:3px 8px;color:var(--ink);outline:none;min-width:110px">';
      box.querySelectorAll("[data-x]").forEach(function (b) {
        b.addEventListener("click", function () { list.splice(Number(b.getAttribute("data-x")), 1); paint(); });
      });
      var inp = box.querySelector("[data-add]");
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && inp.value.trim()) {
          if (list.indexOf(inp.value.trim()) < 0) list.push(inp.value.trim());
          paint();
          box.querySelector("[data-add]").focus();
        }
      });
    }
    paint();
    return function () { return list.slice(); };
  }

  function renderThemeEditor(t) {
    var isNew = !t;
    var form = t || { slug: "", display_name: "", emoji: "⚖️", active: true, schedule: "daily", keywords: [], sources: { whitelist: [] }, key_focus_cases: [], guidance_prompt: "" };
    var focusChecks = CASES.map(function (c) {
      var on = (form.key_focus_cases || []).indexOf(c.slug) >= 0;
      return '<label class="mg-check' + (on ? " on" : "") + '"><input type="checkbox" data-focus="' + esc(c.slug) + '"' + (on ? " checked" : "") + "> " + esc(c.short_name || c.display_name) + "</label>";
    }).join("");

    root.innerHTML =
      bannerHtml() +
      '<div class="mg-head"><h2>' + (isNew ? "New theme" : "Edit: " + esc(form.display_name || form.slug)) + "</h2>" +
        '<button type="button" class="mg-btn" id="mg-back">← All themes</button></div>' +
      '<div class="mg-form">' +
        "<h3>Basics</h3>" +
        '<div class="mg-grid3">' +
          '<div class="mg-field"><label>Display name *</label><input type="text" id="tf-name" value="' + esc(form.display_name) + '"></div>' +
          '<div class="mg-field"><label>Emoji</label><input type="text" id="tf-emoji" value="' + esc(form.emoji || "") + '" maxlength="3"></div>' +
          '<div class="mg-field"><label>Slug ' + (isNew ? "(auto if blank)" : "(fixed)") + '</label><input type="text" id="tf-slug" value="' + esc(form.slug) + '"' + (isNew ? "" : " disabled") + "></div>" +
        "</div>" +
        '<div class="mg-grid2">' +
          '<label class="mg-check' + (form.active !== false ? " on" : "") + '"><input type="checkbox" id="tf-active"' + (form.active !== false ? " checked" : "") + "> Active (scanned on schedule)</label>" +
          '<div class="mg-field"><label>Schedule</label><select id="tf-schedule">' +
            ["daily", "weekly", "manual"].map(function (s) { return '<option value="' + s + '"' + ((form.schedule || "daily") === s ? " selected" : "") + ">" + s + "</option>"; }).join("") +
          "</select></div>" +
        "</div>" +
        "<h3>Scan keywords</h3>" +
        '<div class="mg-chips" id="tf-keywords"></div>' +
        "<h3>Trusted sources (whitelist)</h3>" +
        '<div class="mg-chips" id="tf-whitelist"></div>' +
        "<h3>Key focus cases</h3>" +
        '<p class="mg-hint" style="margin:0 0 10px">Adds the case to this theme’s coverage — its briefings prioritize these matters.</p>' +
        '<div class="mg-grid3" id="tf-focus">' + (focusChecks || '<span class="mg-note">No cases yet.</span>') + "</div>" +
        "<h3>Guidance prompt</h3>" +
        '<div class="mg-field"><textarea id="tf-guidance" placeholder="Standing instruction for this beat’s scan.">' + esc(form.guidance_prompt || "") + "</textarea></div>" +
        '<div class="mg-actions">' +
          '<button type="button" class="mg-btn mg-btn-primary" id="tf-save">' + (isNew ? "Create theme" : "Save changes") + "</button>" +
          '<button type="button" class="mg-btn" id="tf-cancel">Cancel</button>' +
          '<span class="mg-note" id="tf-err" style="color:var(--danger);align-self:center"></span>' +
        "</div>" +
      "</div>";

    var getKeywords = chipEditor("tf-keywords", form.keywords || []);
    var getWhitelist = chipEditor("tf-whitelist", (form.sources && form.sources.whitelist) || []);
    $("mg-back").addEventListener("click", renderThemes);
    $("tf-cancel").addEventListener("click", renderThemes);
    root.querySelectorAll("#tf-focus .mg-check input, #tf-active").forEach(function (i) {
      i.addEventListener("change", function () { i.closest(".mg-check").classList.toggle("on", i.checked); });
    });

    $("tf-save").addEventListener("click", function () {
      var focus = [];
      root.querySelectorAll("#tf-focus input:checked").forEach(function (i) { focus.push(i.getAttribute("data-focus")); });
      var payload = {
        slug: isNew ? slugify($("tf-slug").value || $("tf-name").value) : form.slug,
        display_name: $("tf-name").value.trim(),
        emoji: $("tf-emoji").value.trim() || "⚖️",
        active: $("tf-active").checked,
        page: form.page || null,
        schedule: $("tf-schedule").value,
        keywords: getKeywords(),
        sources: { whitelist: getWhitelist() },
        key_focus_cases: focus,
        guidance_prompt: $("tf-guidance").value,
      };
      var err = $("tf-err");
      err.textContent = "";
      if (!payload.display_name) { err.textContent = "Display name is required."; return; }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) { err.textContent = "Slug must be kebab-case."; return; }
      var btn = $("tf-save");
      btn.disabled = true; btn.textContent = "Saving…";
      apiFetch("/api/admin/themes", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.error || "Save failed");
        setBanner("ok", "Theme " + (isNew ? "created" : "updated") + ".");
        return loadThemes();
      }).then(renderThemes).catch(function (e) {
        btn.disabled = false; btn.textContent = isNew ? "Create theme" : "Save changes";
        err.textContent = String(e.message || e);
      });
    });
  }

  /* ══ GROUPS (filter groups) ══════════════════════════════════════════════ */

  function loadFilterGroups() {
    try { return JSON.parse(localStorage.getItem("ud-case-groups") || "[]") || []; } catch (e) { return []; }
  }
  function saveFilterGroups(groups) {
    try { localStorage.setItem("ud-case-groups", JSON.stringify(groups)); } catch (e) {}
    // Roam via api/prefs alongside colors/priorities (merge-write like the dashboard does).
    return fetch(BASE + "api/prefs").then(function (r) { return r.json(); }).catch(function () { return {}; })
      .then(function (p) {
        return fetch(BASE + "api/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            colors: (p && p.colors) || {},
            groups: groups,
            presets: (p && p.presets) || [],
            theme_presets: (p && p.theme_presets) || [],
            priorities: (p && p.priorities) || {},
          }),
        });
      }).catch(function () {});
  }

  function renderGroups() {
    var groups = loadFilterGroups();
    var blocks = groups.map(function (g, gi) {
      var members = CASES.map(function (c) {
        var on = (g.slugs || []).indexOf(c.slug) >= 0;
        return '<label class="mg-check' + (on ? " on" : "") + '"><input type="checkbox" data-g="' + gi + '" data-slug="' + esc(c.slug) + '"' + (on ? " checked" : "") + "> " + casePill(c.slug, c.short_name || c.display_name) + "</label>";
      }).join("");
      return (
        '<div class="mg-form" data-group="' + gi + '">' +
          '<div class="mg-head" style="margin-bottom:10px">' +
            '<input type="text" data-gname="' + gi + '" value="' + esc(g.name || "") + '" style="font-family:inherit;font-size:14px;font-weight:800;border:none;border-bottom:1px dashed var(--line-strong);background:transparent;color:var(--ink);padding:2px 0;outline:none;max-width:280px">' +
            '<span class="mg-note">' + (g.slugs || []).length + " cases</span>" +
            '<button type="button" class="mg-btn mg-btn-danger" data-delg="' + gi + '" style="margin-left:auto">Delete group</button>' +
          "</div>" +
          '<div class="mg-grid3">' + members + "</div>" +
        "</div>"
      );
    }).join("");

    root.innerHTML =
      bannerHtml() +
      '<div class="mg-head"><h2>Filter groups</h2>' +
        '<button type="button" class="mg-btn mg-btn-primary" id="mg-new-group">＋ New group</button>' +
        '<button type="button" class="mg-btn" id="mg-save-groups">Save groups</button></div>' +
      '<p class="mg-hint">One-click case selections for the dashboard’s Cases filter (e.g. “AI Copyright only”). These only affect filtering. Briefing groups — cases briefed together as one unit — are managed from the GROUPS menu on the dashboard toolbar.</p>' +
      (blocks || '<div class="mg-box"><div class="mg-empty">No filter groups yet — create one and tick its member cases.</div></div>');

    $("mg-new-group").addEventListener("click", function () {
      groups.push({ name: "New group", slugs: [] });
      saveFilterGroups(groups).then(function () { renderGroups(); });
    });
    $("mg-save-groups").addEventListener("click", function () {
      collect();
      saveFilterGroups(groups).then(function () { setBanner("ok", "Groups saved (this browser + roaming prefs)."); renderGroups(); });
    });
    function collect() {
      root.querySelectorAll("[data-gname]").forEach(function (i) {
        groups[Number(i.getAttribute("data-gname"))].name = i.value.trim() || "Untitled group";
      });
      groups.forEach(function (g) { g.slugs = []; });
      root.querySelectorAll("input[data-slug]:checked").forEach(function (i) {
        groups[Number(i.getAttribute("data-g"))].slugs.push(i.getAttribute("data-slug"));
      });
    }
    root.querySelectorAll("input[data-slug]").forEach(function (i) {
      i.addEventListener("change", function () { i.closest(".mg-check").classList.toggle("on", i.checked); });
    });
    root.querySelectorAll("[data-delg]").forEach(function (b) {
      b.addEventListener("click", function () {
        var gi = Number(b.getAttribute("data-delg"));
        confirmModal("<p>Delete filter group <strong>" + esc(groups[gi].name) + "</strong>?</p>", function () {
          collect();
          groups.splice(gi, 1);
          saveFilterGroups(groups).then(function () { setBanner("ok", "Group deleted."); renderGroups(); });
        });
      });
    });
  }

  /* ══ VOICE (drafting as Andrew) ════════════════════════════════════════ */

  function renderVoice() {
    root.innerHTML =
      bannerHtml() +
      '<div class="mg-head"><h2>Voice — drafting as Andrew</h2>' +
        '<button type="button" class="mg-btn mg-btn-primary" id="mg-voice-save" disabled>Save voice</button></div>' +
      '<p class="mg-hint">The personal voice used whenever content is written <strong>as Andrew</strong> — the nightly LinkedIn / X drafts and the Prospects &ldquo;Create social post&rdquo; button. The firm&rsquo;s analytical <em>house</em> voice for the briefings is separate and lives in Admin &rarr; Intelligence &rarr; Defaults.</p>' +
      '<div class="mg-box" style="padding:14px;">' +
        '<textarea id="mg-voice-text" style="width:100%;min-height:440px;box-sizing:border-box;font-family:inherit;font-size:13px;line-height:1.6;padding:12px;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;resize:vertical;" placeholder="Loading&hellip;" disabled></textarea>' +
      "</div>";

    var ta = $("mg-voice-text"), btn = $("mg-voice-save");
    var loaded = "";
    ta.addEventListener("input", function () { btn.disabled = ta.value === loaded; });

    apiFetch("/api/admin/intelligence-settings").then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || "load failed");
        loaded = ((((d.settings || {}).voice) || {}).andrew) || "";
        ta.value = loaded;
        ta.disabled = false;
        ta.placeholder = "Describe how Andrew sounds in social posts…";
      })
      .catch(function (e) { ta.disabled = false; ta.placeholder = "Couldn’t load the voice: " + String(e.message || e); });

    btn.addEventListener("click", function () {
      var val = ta.value;
      btn.disabled = true;
      apiFetch("/api/admin/intelligence-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: { andrew: val } }),
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || "save failed");
        loaded = val;
        setBanner("ok", "Andrew’s voice saved — applied on the next social draft.");
        renderVoice();
      }).catch(function (e) { setBanner("err", "Save failed: " + String(e.message || e)); btn.disabled = false; });
    });
  }

  /* ══ USAGE (CourtListener requests + Claude tokens) ═════════════════════ */
  // Charts are hand-drawn SVG on purpose: /intel/* ships a strict CSP with no
  // CDN allowance, so a charting library can't load here.
  var USAGE = null;
  var USAGE_BUDGET = 600;
  var USAGE_DAYS = 30;

  function usageDayKeys(n) {
    var out = [], d = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var x = new Date(d.getTime() - i * 86400000);
      out.push(x.toISOString().slice(0, 10));
    }
    return out;
  }

  // value accessor per provider so one chart routine serves both panels
  function usageSeries(rows, days, provider, metric) {
    var by = {};
    days.forEach(function (d) { by[d] = 0; });
    rows.forEach(function (r) {
      if (r.provider !== provider || !(r.date in by)) return;
      by[r.date] += metric === "requests" ? (r.requests || 0)
                                          : (r.tokens_in || 0) + (r.tokens_out || 0);
    });
    return days.map(function (d) { return by[d]; });
  }

  function fmtNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "k";
    return String(Math.round(n));
  }

  // Bar chart. Width is viewBox-relative so it scales to the container.
  function usageChart(days, vals, opts) {
    opts = opts || {};
    var W = 720, H = 150, PADL = 44, PADB = 18, PADT = 8;
    var max = Math.max.apply(null, vals.concat([1]));
    if (opts.budget) max = Math.max(max, opts.budget);
    var n = vals.length || 1;
    var bw = (W - PADL - 6) / n;
    var bars = vals.map(function (v, i) {
      var h = v <= 0 ? 0 : Math.max(1, (v / max) * (H - PADT - PADB));
      var x = PADL + i * bw, y = H - PADB - h;
      var over = opts.budget && v > opts.budget;
      return '<rect x="' + (x + 0.6).toFixed(1) + '" y="' + y.toFixed(1) +
        '" width="' + Math.max(1, bw - 1.6).toFixed(1) + '" height="' + h.toFixed(1) +
        '" fill="' + (over ? "#C84141" : "var(--neon-block, #D4FF00)") + '">' +
        "<title>" + esc(days[i]) + ": " + fmtNum(v) + (opts.unit ? " " + opts.unit : "") + "</title></rect>";
    }).join("");
    var budgetLine = "";
    if (opts.budget) {
      var by = H - PADB - (opts.budget / max) * (H - PADT - PADB);
      budgetLine =
        '<line x1="' + PADL + '" x2="' + W + '" y1="' + by.toFixed(1) + '" y2="' + by.toFixed(1) +
        '" stroke="#C84141" stroke-width="1" stroke-dasharray="4 3"/>' +
        '<text x="' + (PADL + 4) + '" y="' + (by - 3).toFixed(1) + '" font-size="9" fill="#C84141">' +
        "daily budget " + opts.budget + "</text>";
    }
    return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" ' +
      'style="width:100%;height:150px;display:block" role="img">' +
      '<line x1="' + PADL + '" x2="' + W + '" y1="' + (H - PADB) + '" y2="' + (H - PADB) +
        '" stroke="var(--line-strong)" stroke-width="1"/>' +
      '<text x="4" y="' + (PADT + 8) + '" font-size="10" fill="var(--ink-40)">' + fmtNum(max) + "</text>" +
      '<text x="4" y="' + (H - PADB - 2) + '" font-size="10" fill="var(--ink-40)">0</text>' +
      bars + budgetLine + "</svg>";
  }

  function usageAxis(days) {
    // First, middle and last day only — 30 labels would be unreadable.
    var pick = [0, Math.floor(days.length / 2), days.length - 1];
    return '<div class="mg-usage-axis">' + pick.map(function (i, k) {
      return '<span style="' + (k === 1 ? "flex:1;text-align:center" : k === 2 ? "flex:0" : "flex:1") + '">' +
        esc(days[i].slice(5)) + "</span>";
    }).join("") + "</div>";
  }

  function usageTaskTable(rows, days) {
    var since = days[0];
    var agg = {};
    rows.forEach(function (r) {
      if ((r.date || "") < since) return;
      var k = r.task + "|" + r.provider;
      if (!agg[k]) agg[k] = { task: r.task, provider: r.provider, runs: 0, requests: 0, tin: 0, tout: 0, fails: 0 };
      var a = agg[k];
      a.runs++; a.requests += r.requests || 0; a.tin += r.tokens_in || 0; a.tout += r.tokens_out || 0;
      if (r.ok === false) a.fails++;
    });
    var list = Object.keys(agg).map(function (k) { return agg[k]; });
    if (!list.length) return "";
    // Rank by whatever that provider actually spends.
    list.sort(function (a, b) {
      var av = a.provider === "courtlistener" ? a.requests : a.tin + a.tout;
      var bv = b.provider === "courtlistener" ? b.requests : b.tin + b.tout;
      return bv - av;
    });
    return '<table class="mg-usage-tbl"><thead><tr>' +
      "<th>Task</th><th>Provider</th><th>Runs</th><th>Requests</th><th>Tokens in</th><th>Tokens out</th><th>Failed</th>" +
      "</tr></thead><tbody>" +
      list.map(function (a) {
        return "<tr><td><strong>" + esc(a.task) + "</strong></td><td>" + esc(a.provider) + "</td>" +
          "<td>" + a.runs + "</td>" +
          "<td>" + (a.provider === "courtlistener" ? fmtNum(a.requests) : "\u2014") + "</td>" +
          "<td>" + (a.tin ? fmtNum(a.tin) : "\u2014") + "</td>" +
          "<td>" + (a.tout ? fmtNum(a.tout) : "\u2014") + "</td>" +
          "<td>" + (a.fails ? '<span style="color:#C84141">' + a.fails + "</span>" : "0") + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function renderUsage() {
    root.innerHTML = bannerHtml() +
      '<div class="mg-head"><h2>API usage</h2></div>' +
      '<p class="mg-hint">What the scans spend against <strong>CourtListener</strong> (request-capped) and ' +
      "<strong>Claude</strong> (token-billed). Recording started when this tab shipped — earlier runs can't be " +
      "backfilled, because nothing logged per-call counts before then. Rows are written by the scan scripts, " +
      "so the history grows as the scheduled jobs run.</p>" +
      '<div id="mg-usage-body"><div class="mg-empty">Loading usage…</div></div>';
    var body = $("mg-usage-body");
    apiFetch(BASE + "api/usage")
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (p) {
        if (!p || !p.ok) { body.innerHTML = '<div class="mg-empty">Usage unavailable — the API didn\'t respond.</div>'; return; }
        USAGE = p.runs || [];
        if (p.budget && p.budget.courtlistener_daily) USAGE_BUDGET = p.budget.courtlistener_daily;
        paintUsage();
      });
  }

  function paintUsage() {
    var body = $("mg-usage-body");
    if (!body) return;
    var rows = USAGE || [];
    if (!rows.length) {
      body.innerHTML = '<div class="mg-empty">No usage recorded yet — the next scheduled scan will write the first rows.</div>';
      return;
    }
    var days = usageDayKeys(USAGE_DAYS);
    var cl = usageSeries(rows, days, "courtlistener", "requests");
    var an = usageSeries(rows, days, "anthropic", "tokens");
    var clToday = cl[cl.length - 1], clPeak = Math.max.apply(null, cl.concat([0]));
    var anTotal = an.reduce(function (a, b) { return a + b; }, 0);
    var active = cl.filter(function (v) { return v > 0; }).length ||
                 an.filter(function (v) { return v > 0; }).length;
    var clAvg = active ? Math.round(cl.reduce(function (a, b) { return a + b; }, 0) / active) : 0;

    body.innerHTML =
      '<div class="mg-usage-cards">' +
        usageCard("CourtListener today", fmtNum(clToday), clToday > USAGE_BUDGET ? "over the daily budget" : "of " + USAGE_BUDGET + " budget") +
        usageCard("CL daily average", fmtNum(clAvg), "across days with activity") +
        usageCard("CL peak day", fmtNum(clPeak), clPeak > USAGE_BUDGET ? "exceeded the budget" : "highest in " + USAGE_DAYS + "d") +
        usageCard("Claude tokens", fmtNum(anTotal), "total in " + USAGE_DAYS + "d") +
      "</div>" +
      '<div class="mg-box" style="padding:14px;margin-top:14px;">' +
        '<div class="mg-usage-h">CourtListener requests per day</div>' +
        usageChart(days, cl, { budget: USAGE_BUDGET, unit: "requests" }) + usageAxis(days) +
      "</div>" +
      '<div class="mg-box" style="padding:14px;margin-top:14px;">' +
        '<div class="mg-usage-h">Claude tokens per day (in + out)</div>' +
        usageChart(days, an, { unit: "tokens" }) + usageAxis(days) +
      "</div>" +
      '<div class="mg-box" style="padding:14px;margin-top:14px;">' +
        '<div class="mg-usage-h">By task \u2014 last ' + USAGE_DAYS + " days, biggest spender first</div>" +
        (usageTaskTable(rows, days) || '<div class="mg-empty">No runs in this window.</div>') +
      "</div>";
  }

  function usageCard(label, value, sub) {
    return '<div class="mg-usage-card"><div class="mg-usage-lbl">' + esc(label) + "</div>" +
      '<div class="mg-usage-val">' + esc(value) + "</div>" +
      '<div class="mg-usage-sub">' + esc(sub) + "</div></div>";
  }

  /* ══ COLORS (default palette) ══════════════════════════════════════════ */

  function currentSwatches() {
    try {
      var p = JSON.parse(localStorage.getItem("ud-theme-presets") || "null");
      if (Array.isArray(p) && p.length === 12) return p;
    } catch (e) {}
    return FALLBACK_SWATCHES.map(function (s) { return { bg: s.bg, fg: s.fg }; });
  }

  function renderColors() {
    var presets = currentSwatches().map(function (s) { return { bg: s.bg, fg: s.fg || "#0A0A0A" }; });

    function swatchesHtml() {
      return presets.map(function (p, i) {
        return (
          '<div class="mg-sw" data-i="' + i + '">' +
            '<span class="mg-sw-preview" style="background:' + esc(p.bg) + ";color:" + esc(p.fg) + '">Aa</span>' +
            "<label>Bg <input type=\"color\" data-bg=\"" + i + '" value="' + esc(p.bg) + '"></label>' +
            "<label>Text <input type=\"color\" data-fg=\"" + i + '" value="' + esc(p.fg) + '"></label>' +
          "</div>"
        );
      }).join("");
    }

    root.innerHTML =
      bannerHtml() +
      '<div class="mg-head"><h2>Colors — default palette</h2>' +
        '<button type="button" class="mg-btn" id="mg-palette-reset">Reset to factory</button>' +
        '<button type="button" class="mg-btn mg-btn-primary" id="mg-palette-save">Save palette</button></div>' +
      '<p class="mg-hint">The 12 preset swatches offered in every pill color picker (case <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> menus on the dashboard and docket). This is the only place the default palette can be changed; the pickers themselves just choose from it.</p>' +
      '<div class="mg-swatches" id="mg-swatches">' + swatchesHtml() + "</div>";

    function wire() {
      root.querySelectorAll("[data-bg], [data-fg]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var i = Number(inp.getAttribute("data-bg") || inp.getAttribute("data-fg"));
          if (inp.hasAttribute("data-bg")) presets[i].bg = inp.value;
          else presets[i].fg = inp.value;
          var prev = root.querySelector('.mg-sw[data-i="' + i + '"] .mg-sw-preview');
          prev.style.background = presets[i].bg;
          prev.style.color = presets[i].fg;
        });
      });
    }
    wire();

    $("mg-palette-reset").addEventListener("click", function () {
      confirmModal("<p>Reset all 12 swatches to the factory palette?</p>", function () {
        presets = FALLBACK_SWATCHES.map(function (s) { return { bg: s.bg, fg: s.fg }; });
        $("mg-swatches").innerHTML = swatchesHtml();
        wire();
      }, "Reset");
    });

    $("mg-palette-save").addEventListener("click", function () {
      try { localStorage.setItem("ud-theme-presets", JSON.stringify(presets)); } catch (e) {}
      fetch(BASE + "api/prefs").then(function (r) { return r.json(); }).catch(function () { return {}; })
        .then(function (p) {
          return fetch(BASE + "api/prefs", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              colors: (p && p.colors) || {},
              groups: (p && p.groups) || [],
              presets: (p && p.presets) || [],
              theme_presets: presets,
              priorities: (p && p.priorities) || {},
            }),
          });
        })
        .then(function () { setBanner("ok", "Palette saved (this browser + roaming prefs)."); renderColors(); })
        .catch(function () { setBanner("err", "Saved locally; roaming prefs sync failed."); renderColors(); });
    });
  }

  /* ══ BRIEFING INPUTS ═══════════════════════════════════════════════════════
     Everything that shapes a case/group briefing prompt, gathered in one
     view: house voice, X accounts, briefing groups, and news feed sources
     (edited elsewhere — shown here with a preview + link so nothing is
     hidden), plus the one thing genuinely edited here: every actively-synced
     case's scan guidance, all at once instead of one popup at a time. */

  function biVoicePreview() {
    var el = $("mg-bi-voice-preview");
    if (!el) return;
    apiFetch("/api/admin/intelligence-settings").then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error();
        var text = ((((d.settings || {}).voice) || {}).default) || "";
        el.textContent = text || "(empty — set the house voice in Admin → Intelligence → Defaults)";
      })
      .catch(function () { el.textContent = "Couldn’t load."; });
  }

  function biXAccounts() {
    var el = $("mg-bi-x");
    if (!el) return;
    apiFetch("/api/admin/x-sources").then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error();
        var active = ((d.data && d.data.accounts) || []).filter(function (a) { return a.active !== false; });
        if (!active.length) { el.innerHTML = '<span class="mg-hint" style="margin:0;">No accounts followed yet.</span>'; return; }
        el.innerHTML = '<div class="mg-chips">' + active.map(function (a) {
          return '<span class="mg-chip">@' + esc(a.handle || "") + "</span>";
        }).join("") + "</div>" +
          '<p class="mg-hint" style="margin:10px 0 0;">Posts from these accounts mentioning a case by name feed that case’s briefing — not used for group briefings.</p>';
      })
      .catch(function () { el.textContent = "Couldn’t load."; });
  }

  function slugifyGroup(name) {
    return String(name || "").toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  }

  function biSaveGroups(groups, status) {
    if (status) status.textContent = "Saving…";
    apiFetch(BASE + "api/briefing-groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: groups }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "save failed");
      setBanner("ok", "Briefing groups saved.");
      biGroups();
    }).catch(function (e) {
      if (status) status.textContent = "Save failed: " + String(e.message || e);
    });
  }

  function biGroups() {
    var el = $("mg-bi-groups");
    if (!el) return;
    apiFetch(BASE + "api/briefing-groups").then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error();
        var groups = d.groups || [];
        var grouped = {};
        groups.forEach(function (g) { (g.members || []).forEach(function (m) { grouped[m] = g.name; }); });
        var existing = groups.length
          ? groups.map(function (g, gi) {
              var members = (g.members || []).map(function (slug) {
                var c = CASES.filter(function (x) { return x.slug === slug; })[0];
                return c ? casePill(c.slug, c.short_name || c.display_name) : esc(slug);
              }).join(" ");
              return '<div class="mg-bi-grp-row"><strong style="font-size:12.5px;">' + esc(g.name) + "</strong> — " + members +
                ' <button type="button" class="mg-bi-grp-del" data-del="' + gi + '" title="Ungroup — members go back to their own briefings">×</button></div>';
            }).join("")
          : '<div class="mg-hint" style="margin:0 0 10px;">No briefing groups yet — every case gets its own briefing.</div>';
        var checks = MANIFEST.map(function (m) {
          var taken = grouped[m.slug];
          return '<label class="mg-bi-grp-check' + (taken ? " taken" : "") + '"><input type="checkbox" value="' + esc(m.slug) + '"' +
            (taken ? " disabled" : "") + "> " + esc(m.short_name || m.display_name || m.slug) +
            (taken ? ' <span class="mg-hint" style="margin:0;">(' + esc(taken) + ")</span>" : "") + "</label>";
        }).join("");
        el.innerHTML =
          '<div class="mg-bi-grp-list">' + existing + "</div>" +
          '<div class="mg-bi-grp-new">' +
            '<input type="text" class="mg-input mg-bi-grp-name" placeholder="Group name (e.g. Hachette Suits) — becomes the pill label">' +
            '<div class="mg-bi-grp-checks">' + checks + "</div>" +
            '<div class="mg-bi-grp-foot"><span class="mg-hint mg-bi-grp-status" style="margin:0;"></span><span style="flex:1"></span>' +
            '<button type="button" class="mg-btn mg-btn-primary mg-bi-grp-create">Create group</button></div>' +
          "</div>";
        el.querySelectorAll(".mg-bi-grp-del").forEach(function (b) {
          b.addEventListener("click", function () {
            var i = Number(b.getAttribute("data-del"));
            biSaveGroups(groups.filter(function (_, j) { return j !== i; }), el.querySelector(".mg-bi-grp-status"));
          });
        });
        var createBtn = el.querySelector(".mg-bi-grp-create");
        if (createBtn) createBtn.addEventListener("click", function () {
          var status = el.querySelector(".mg-bi-grp-status");
          var name = (el.querySelector(".mg-bi-grp-name").value || "").trim();
          var members = [].map.call(el.querySelectorAll(".mg-bi-grp-checks input:checked"), function (c) { return c.value; });
          if (!name) { if (status) status.textContent = "Name the group first."; return; }
          if (members.length < 2) { if (status) status.textContent = "Pick at least two cases."; return; }
          var id = slugifyGroup(name);
          if (groups.some(function (g) { return g.id === id; })) { if (status) status.textContent = "A group with that name already exists."; return; }
          biSaveGroups(groups.concat([{ id: id, name: name, members: members }]), status);
        });
      })
      .catch(function () { el.textContent = "Couldn’t load."; });
  }

  /* ══ SOURCES — every outlet feeding the docket + news pages ═════════════
     One home for feed-sources.json (was: Briefings tab / docket toolbar).
     Each source: type "rss" (URL may be a plain page — the scanner
     autodiscovers the feed) or "search" (Claude + web_search sweeps the
     outlet each scan), and a `show` target (docket / news / both). ────────*/
  var SRC_LIST = [];
  var SRC_FAVS = [];        // ★ outlet names → their own row in the Author filter
  var SRC_BLOCKED = [];     // deleted outlets — hidden everywhere, restorable below
  var SRC_AUTHORS = [];     // every outlet the scans have cited (from _summary)
  var SRC_READONLY = false;
  var SRC_TYPES = [
    { value: "rss", label: "RSS feed" },
    { value: "search", label: "Web search" },
  ];
  var SRC_SHOWS = [
    { value: "both", label: "Docket + News" },
    { value: "docket", label: "Docket only" },
    { value: "news", label: "News only" },
  ];

  function srcStatus(text, isError) {
    var el = $("mg-src-status");
    if (el) { el.textContent = text; el.style.color = isError ? "var(--danger)" : ""; }
  }

  function srcSelect(cls, i, options, current, title) {
    return '<select class="' + cls + '" data-idx="' + i + '"' + (title ? ' title="' + esc(title) + '"' : "") + ">" +
      options.map(function (o) {
        return '<option value="' + o.value + '"' + (current === o.value ? " selected" : "") + ">" + esc(o.label) + "</option>";
      }).join("") + "</select>";
  }

  function renderSourceRows() {
    var list = $("mg-src-list");
    if (!list) return;
    if (!SRC_LIST.length) {
      list.innerHTML = '<div class="mg-empty">No sources yet — add the first one below.</div>';
      return;
    }
    list.innerHTML =
      '<table class="mg-table"><thead><tr><th title="Enabled">On</th><th>Source</th><th>URL / outlet</th><th>Type</th><th>Tag</th><th>Shows in</th><th>Untagged items</th><th></th></tr></thead><tbody>' +
      SRC_LIST.map(function (s, i) {
        return (
          "<tr" + (s.enabled === false ? ' style="opacity:0.55"' : "") + ">" +
            '<td><input type="checkbox" class="mg-src-on" data-idx="' + i + '"' + (s.enabled !== false ? " checked" : "") + ' title="Enabled — disabled sources are kept but never scanned"></td>' +
            '<td><input type="text" class="mg-src-name mg-input" data-idx="' + i + '" value="' + esc(s.name || "") + '" style="width:120px"></td>' +
            '<td><input type="text" class="mg-src-url mg-input" data-idx="' + i + '" value="' + esc(s.url || "") + '" style="width:100%;min-width:220px" title="' + esc(s.url || "") + '"></td>' +
            "<td>" + srcSelect("mg-src-type", i, SRC_TYPES, s.type === "search" ? "search" : "rss",
              "RSS feed: pulled directly (a page URL is fine — the scanner finds its feed). Web search: no feed — each scan sweeps the outlet with a web search.") + "</td>" +
            '<td><input type="text" class="mg-src-kind mg-input" data-idx="' + i + '" value="' + esc(s.kind || "News") + '" style="width:80px" title="Tag label shown on the item (Alert / Summary / News / …)"></td>' +
            "<td>" + srcSelect("mg-src-show", i, SRC_SHOWS, s.show === "docket" || s.show === "news" ? s.show : "both",
              "Where this source’s items surface.") + "</td>" +
            "<td>" + srcSelect("mg-src-mode", i,
              [{ value: "all", label: "Show all" }, { value: "case-only", label: "Case matches only" }],
              s.mode === "case-only" ? "case-only" : "all",
              "Show all: every item appears even before it’s tied to a case. Case matches only: items appear once tied to a tracked case.") + "</td>" +
            '<td class="mg-right"><button type="button" class="mg-btn mg-btn-danger mg-src-del" data-idx="' + i + '" title="Remove source">×</button></td>' +
          "</tr>"
        );
      }).join("") + "</tbody></table>";

    function wire(cls, fn) {
      list.querySelectorAll(cls).forEach(function (el) {
        el.addEventListener("change", function () { fn(SRC_LIST[Number(el.getAttribute("data-idx"))], el); });
      });
    }
    wire(".mg-src-on", function (s, el) { s.enabled = el.checked; renderSourceRows(); });
    wire(".mg-src-name", function (s, el) { s.name = el.value.trim(); });
    wire(".mg-src-url", function (s, el) { s.url = el.value.trim(); });
    wire(".mg-src-type", function (s, el) { s.type = el.value; });
    wire(".mg-src-kind", function (s, el) { s.kind = el.value.trim() || "News"; });
    wire(".mg-src-show", function (s, el) { s.show = el.value; });
    wire(".mg-src-mode", function (s, el) { s.mode = el.value; });
    list.querySelectorAll(".mg-src-del").forEach(function (b) {
      b.addEventListener("click", function () {
        SRC_LIST.splice(Number(b.getAttribute("data-idx")), 1);
        renderSourceRows();
      });
    });
  }

  function loadSourcesTab() {
    var list = $("mg-src-list");
    if (list) list.innerHTML = '<div class="mg-empty">Loading…</div>';
    apiFetch(BASE + "api/feed-sources").then(function (r) { return r.json(); })
      .then(function (p) {
        if (!(p && p.ok)) throw new Error((p && p.error) || "load failed");
        SRC_LIST = p.sources || [];
        SRC_FAVS = p.favorites || [];
        SRC_BLOCKED = p.blocked || [];
        SRC_READONLY = false;
        renderSourceRows();
        loadAuthors();
      })
      .catch(function () {
        // Degrade to the static file: list still renders, saving stays off.
        fetch(BASE + "feed-sources.json").then(function (r) { return r.json(); })
          .then(function (f) { SRC_LIST = (f && f.sources) || []; SRC_FAVS = (f && f.favorites) || []; })
          .catch(function () { SRC_LIST = []; })
          .then(function () {
            SRC_READONLY = true;
            renderSourceRows();
            loadAuthors();
            srcStatus("Read-only — the admin API isn’t reachable (sign in to edit).", true);
            var sv = $("mg-src-save");
            if (sv) sv.disabled = true;
          });
      });
  }

  function addSourceFromForm() {
    var name = ($("mg-src-add-name").value || "").trim();
    var url = ($("mg-src-add-url").value || "").trim();
    var type = $("mg-src-add-type").value === "search" ? "search" : "rss";
    var kind = ($("mg-src-add-kind").value || "").trim() || "News";
    var show = $("mg-src-add-show").value;
    if (!name || !/^https?:\/\//.test(url)) {
      srcStatus("Name and a valid URL (https://…) are required", true);
      return;
    }
    SRC_LIST.push({ name: name, url: url, kind: kind, type: type, show: show, mode: "all", enabled: true });
    $("mg-src-add-name").value = "";
    $("mg-src-add-url").value = "";
    $("mg-src-add-kind").value = "";
    srcStatus("Added — hit Save sources to make it live.");
    renderSourceRows();
  }

  function favKey(n) { return String(n || "").toLowerCase(); }
  function isFav(n) {
    var k = favKey(n);
    return SRC_FAVS.some(function (f) { return favKey(f) === k; });
  }
  function isBlocked(n) {
    var k = favKey(n);
    return SRC_BLOCKED.some(function (b) { return favKey(b) === k; });
  }

  function loadAuthors() {
    var el = $("mg-src-authors");
    if (el) el.innerHTML = '<div class="mg-empty">Loading…</div>';
    fetch(BASE + "cases/data/_summary.json")
      .then(function (r) { return r.json(); })
      .catch(function () { return []; })
      .then(function (cases) {
        var seen = {}, out = [];
        (cases || []).forEach(function (c) {
          (c.coverage || []).forEach(function (a) {
            var n = String((a && a.source) || "").trim();
            if (!n) return;
            var k = favKey(n);
            if (!seen[k]) { seen[k] = true; out.push(n); }
          });
        });
        var feedNames = {};
        SRC_LIST.forEach(function (s) { feedNames[favKey(s.name)] = true; });
        SRC_AUTHORS = out.filter(function (n) { return !feedNames[favKey(n)]; })
          .sort(function (a, b) { return a.localeCompare(b); });
        // Blocked names stay listed (in their own group) even once the scans
        // stop citing them — otherwise a delete would erase its own undo.
        SRC_BLOCKED.forEach(function (b) {
          if (!SRC_AUTHORS.some(function (n) { return favKey(n) === favKey(b); }) &&
              !feedNames[favKey(b)]) SRC_AUTHORS.push(b);
        });
        // ★ names that scans haven't cited lately still deserve a row
        SRC_FAVS.forEach(function (f) {
          if (!SRC_AUTHORS.some(function (n) { return favKey(n) === favKey(f); }) &&
              !feedNames[favKey(f)]) SRC_AUTHORS.push(f);
        });
        renderAuthors();
      });
  }

  function renderAuthors() {
    var el = $("mg-src-authors");
    if (!el) return;
    if (!SRC_AUTHORS.length) {
      el.innerHTML = '<div class="mg-empty">No outlets discovered yet — they appear as the news scans cite them.</div>';
      return;
    }
    var blocked = SRC_AUTHORS.filter(isBlocked);
    var live = SRC_AUTHORS.filter(function (n) { return !isBlocked(n); });
    var favs = live.filter(isFav), rest = live.filter(function (n) { return !isFav(n); });
    function row(n) {
      var on = isFav(n);
      return '<span class="mg-src-au">' +
        '<button type="button" class="mg-src-star' + (on ? " on" : "") + '" data-fav="' + esc(n) + '" ' +
          'title="' + (on ? "Remove from favorites — rolls back into the \u2018All other sources\u2019 toggle" :
                            "Make a favorite — gets its own row in the Author filter") + '">' +
          (on ? "\u2605" : "\u2606") + " " + esc(n) + "</button>" +
        '<button type="button" class="mg-src-del" data-del-au="' + esc(n) + '" ' +
          'title="Delete this outlet — hides it from the Author filter and from the docket and news pages, and the scans skip it">\u00d7</button>' +
      "</span>";
    }
    function blockedRow(n) {
      return '<span class="mg-src-au mg-src-au-off">' +
        '<button type="button" class="mg-src-star" data-restore-au="' + esc(n) + '" ' +
          'title="Restore this outlet">\u21ba ' + esc(n) + "</button></span>";
    }
    el.innerHTML =
      (favs.length ? '<div class="mg-src-augrp">Favorites — own row in the Author filter</div>' +
        '<div class="mg-src-aulist">' + favs.map(row).join("") + "</div>" : "") +
      '<div class="mg-src-augrp">Other — covered by one \u201cAll other sources\u201d toggle</div>' +
      '<div class="mg-src-aulist">' + rest.map(row).join("") + "</div>" +
      (blocked.length ? '<div class="mg-src-augrp">Deleted — hidden from the Author filter, the docket and news pages, and skipped by the scans</div>' +
        '<div class="mg-src-aulist">' + blocked.map(blockedRow).join("") + "</div>" : "");
    el.querySelectorAll("[data-fav]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = b.getAttribute("data-fav");
        if (isFav(n)) SRC_FAVS = SRC_FAVS.filter(function (f) { return favKey(f) !== favKey(n); });
        else SRC_FAVS.push(n);
        renderAuthors();
        srcStatus("Favorites changed — hit Save sources to make it live.");
      });
    });
    el.querySelectorAll("[data-del-au]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = b.getAttribute("data-del-au");
        // Stored coverage is left alone: the outlet is hidden, not erased, so
        // this is reversible from the Deleted group below.
        SRC_BLOCKED.push(n);
        SRC_FAVS = SRC_FAVS.filter(function (f) { return favKey(f) !== favKey(n); });
        renderAuthors();
        srcStatus("Deleted " + n + " — hit Save sources to make it live.");
      });
    });
    el.querySelectorAll("[data-restore-au]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = b.getAttribute("data-restore-au");
        SRC_BLOCKED = SRC_BLOCKED.filter(function (x) { return favKey(x) !== favKey(n); });
        renderAuthors();
        srcStatus("Restored " + n + " — hit Save sources to make it live.");
      });
    });
  }

  function saveSources() {
    srcStatus("Saving…");
    apiFetch(BASE + "api/feed-sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources: SRC_LIST, favorites: SRC_FAVS, blocked: SRC_BLOCKED }),
    }).then(function (r) { return r.json(); }).then(function (p) {
      if (p && p.ok) {
        SRC_LIST = p.sources || SRC_LIST;
        if (p.favorites) SRC_FAVS = p.favorites;
        if (p.blocked) SRC_BLOCKED = p.blocked;
        renderAuthors();
        renderSourceRows();
        srcStatus("Saved — sources pull on the next news scan (runs twice a day).");
      } else srcStatus((p && p.error) || "Save failed", true);
    }).catch(function () { srcStatus("Save failed — network error", true); });
  }

  function renderSources() {
    root.innerHTML =
      bannerHtml() +
      '<div class="mg-head"><h2>News sources</h2></div>' +
      '<p class="mg-hint">One place for every outlet feeding the <a href="docket.html">docket</a> and <a href="news.html">news</a> pages. ' +
      "<strong>RSS feed</strong> sources are forgiving — paste the site or section page and the scanner autodiscovers the real feed. " +
      "<strong>Web search</strong> sources have no feed: each scan sweeps the outlet with a web search for fresh items. " +
      "Scans run twice a day (8:40 AM &amp; 4:40 PM ET); “Shows in” controls whether a source’s items surface on the docket, the news page, or both.</p>" +
      '<div class="mg-box" style="padding:14px;">' +
        '<div id="mg-src-list">Loading…</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--line);">' +
          '<input type="text" id="mg-src-add-name" class="mg-input" placeholder="Name (e.g. PETITION)" style="flex:0 0 150px;">' +
          '<input type="text" id="mg-src-add-url" class="mg-input" placeholder="Site, page, or feed URL (https://…)" style="flex:1;min-width:220px;">' +
          '<select id="mg-src-add-type" class="mg-input" style="flex:0 0 auto;">' +
            SRC_TYPES.map(function (o) { return '<option value="' + o.value + '">' + esc(o.label) + "</option>"; }).join("") +
          "</select>" +
          '<input type="text" id="mg-src-add-kind" class="mg-input" placeholder="Tag (News)" style="flex:0 0 90px;">' +
          '<select id="mg-src-add-show" class="mg-input" style="flex:0 0 auto;">' +
            SRC_SHOWS.map(function (o) { return '<option value="' + o.value + '">' + esc(o.label) + "</option>"; }).join("") +
          "</select>" +
          '<button type="button" class="mg-btn" id="mg-src-add-btn">Add</button>' +
        "</div>" +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:12px;">' +
          '<span id="mg-src-status" class="mg-hint" style="margin:0;"></span>' +
          '<span style="flex:1"></span>' +
          '<button type="button" class="mg-btn mg-btn-primary" id="mg-src-save">Save sources</button>' +
        "</div>" +
      "</div>" +

      '<div class="mg-head" style="margin-top:30px;"><h2>Authors</h2></div>' +
      '<p class="mg-hint">Every outlet the news scans have cited, collected automatically. ' +
      "\u2605 favorites get their own row in the docket/news <strong>Author</strong> filter; " +
      "everything else is covered there by a single \u201cAll other sources\u201d toggle. " +
      "Changes save with the <em>Save sources</em> button above.</p>" +
      '<div class="mg-box" style="padding:14px;"><div id="mg-src-authors">Loading…</div></div>';
    loadSourcesTab();
    $("mg-src-add-btn").addEventListener("click", addSourceFromForm);
    $("mg-src-save").addEventListener("click", saveSources);
  }

  function renderBriefingInputs() {
    var rows = CASES.filter(function (c) { return (c.sync || "active") === "active"; })
      .sort(function (a, b) {
        return (a.short_name || a.display_name || "").localeCompare(b.short_name || b.display_name || "");
      });
    var rowsHtml = rows.length
      ? rows.map(function (c) {
          return (
            '<div class="mg-bi-row">' +
              '<div class="mg-bi-case">' + casePill(c.slug, c.short_name || c.display_name) + "</div>" +
              '<textarea class="mg-bi-guidance" data-slug="' + esc(c.slug) + '" placeholder="What to watch for on this case — and what to ignore.">' + esc(c.scan_guidance || "") + "</textarea>" +
              '<button type="button" class="mg-btn mg-bi-save" disabled>Save</button>' +
            "</div>"
          );
        }).join("")
      : '<div class="mg-empty">No actively-synced cases yet.</div>';

    root.innerHTML =
      bannerHtml() +
      '<div class="mg-head"><h2>Briefings</h2></div>' +
      '<p class="mg-hint">Everything that shapes what the model writes for a case or group briefing, gathered in one place — the house voice and every case’s scan guidance are read together on every run.</p>' +

      '<div class="mg-bi-section"><div class="mg-bi-section-head"><h3>House voice</h3><a class="mg-btn mg-btn-ghost" href="/admin/intelligence/defaults" target="_blank" rel="noopener">Edit in Admin ↗</a></div>' +
        '<div class="mg-box mg-bi-voice-preview" id="mg-bi-voice-preview">Loading…</div>' +
      "</div>" +

      '<div class="mg-bi-section"><div class="mg-bi-section-head"><h3>Global sources</h3></div>' +
        '<p class="mg-hint" style="margin:0;">Trusted / blocked outlet lists, in Admin → Intelligence → Defaults. Not currently read by case briefings — only the retired theme-based generator consults them.</p>' +
      "</div>" +

      '<div class="mg-bi-section"><div class="mg-bi-section-head"><h3>X accounts</h3><a class="mg-btn mg-btn-ghost" href="/admin/intelligence/x" target="_blank" rel="noopener">Edit in Admin ↗</a></div>' +
        '<div class="mg-box" style="padding:14px;" id="mg-bi-x">Loading…</div>' +
      "</div>" +

      '<div class="mg-bi-section"><div class="mg-bi-section-head"><h3>Briefing groups</h3><span class="mg-hint" style="margin:0 0 0 auto;">Cases briefed together as one unit</span></div>' +
        '<div class="mg-box" style="padding:14px;" id="mg-bi-groups">Loading…</div>' +
      "</div>" +

      '<div class="mg-bi-section"><div class="mg-bi-section-head"><h3>News feed sources</h3><a class="mg-btn mg-btn-ghost" href="#sources">Moved to the Sources tab →</a></div>' +
        '<p class="mg-hint" style="margin:0;">Every outlet feeding the docket and news pages now lives in one place: <a href="#sources">Manage → Sources</a>.</p>' +
      "</div>" +

      '<div class="mg-bi-section"><div class="mg-bi-section-head"><h3>Scan guidance — per case</h3></div>' +
        '<p class="mg-hint" style="margin:-4px 0 10px;">Free-text steer read alongside the house voice for every briefing (and news scan) on that case. Every actively-synced case, in one place instead of one popup at a time.</p>' +
        '<div class="mg-bi-rows">' + rowsHtml + "</div>" +
      "</div>";

    // Wrap the section loaders + feed-source wiring so a null element or a
    // failed load can't abort before the per-case guidance Save buttons below
    // get wired (that abort is what left them stuck disabled / "not clickable").
    try {
      biVoicePreview();
      biXAccounts();
      biGroups();
    } catch (e) { /* keep going — the per-case guidance wiring below must still run */ }

    root.querySelectorAll(".mg-bi-row").forEach(function (row) {
      var ta = row.querySelector(".mg-bi-guidance");
      var btn = row.querySelector(".mg-bi-save");
      var loaded = ta.value;
      ta.addEventListener("input", function () { btn.disabled = ta.value === loaded; });
      btn.addEventListener("click", function () {
        var slug = ta.getAttribute("data-slug");
        var c = CASES.filter(function (x) { return x.slug === slug; })[0];
        if (!c) return;
        var payload = JSON.parse(JSON.stringify(c));
        payload.scan_guidance = ta.value;
        btn.disabled = true;
        btn.textContent = "Saving…";
        apiFetch("/api/admin/cases", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (!j.ok) throw new Error(j.error || "Save failed");
          c.scan_guidance = ta.value;
          loaded = ta.value;
          btn.textContent = "Saved";
          setTimeout(function () { btn.textContent = "Save"; }, 1200);
        }).catch(function (e) {
          btn.disabled = false;
          btn.textContent = "Save";
          setBanner("err", "Save failed for " + (c.short_name || c.display_name || slug) + ": " + String(e.message || e));
          renderBriefingInputs();
        });
      });
    });
  }

  /* ══ Loads + boot ════════════════════════════════════════════════════════ */

  function loadCases() {
    return apiFetch("/api/admin/cases").then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || "Failed to load cases");
      CASES = j.cases || [];
      CASES_ERR = "";
      CASES_LITE = false;
    }).catch(function (e) {
      // Degrade to the pipeline manifest: roster + colors still work; editing
      // stays disabled because a save from this partial data would wipe fields.
      if (MANIFEST.length) {
        CASES = MANIFEST.map(function (m) {
          return {
            slug: m.slug, display_name: m.display_name, short_name: m.short_name,
            sync: m.sync || "active", topics: m.topics || [],
            case: { court: m.court || "" }, docket_source: { url: m.docket_url || "" },
          };
        });
        CASES_LITE = true;
        CASES_ERR = "";
      } else {
        CASES_ERR = String(e.message || e);
      }
    });
  }
  function loadThemes() {
    return apiFetch("/api/admin/themes").then(function (r) { return r.json(); }).then(function (j) {
      if (j.ok && Array.isArray(j.themes) && j.themes.length) THEMES = j.themes;
      if (j.ok) THEMES_SHOW_EMOJIS = j.show_emojis !== false;
    }).catch(function () { /* keep fallback list */ });
  }
  function loadManifest() {
    return fetch(BASE + "cases/data/_manifest.json").then(function (r) { return r.json(); })
      .then(function (m) { MANIFEST = Array.isArray(m) ? m : []; }).catch(function () {});
  }

  // Roaming filter groups: /api/prefs is the source of truth, but nothing
  // previously pulled its `groups` field back into localStorage on load —
  // a group created on one browser/device never showed up on any other,
  // even though saving correctly pushed it to the server. Mirrors the same
  // fetch-and-hydrate pattern the dashboard uses for colors/presets.
  function hydrateFilterGroups() {
    fetch(BASE + "api/prefs").then(function (r) { return r.json(); }).catch(function () { return {}; })
      .then(function (p) {
        if (p && p.ok && Array.isArray(p.groups)) {
          try { localStorage.setItem("ud-case-groups", JSON.stringify(p.groups)); } catch (e) {}
          if (currentTab() === "groups") renderGroups();
        }
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Each loader degrades on its own — the page always routes.
    Promise.all([loadManifest(), loadThemes(), loadCases(), loadPriorities()]).then(route);
    hydrateFilterGroups();
  });
})();
