(function () {
  "use strict";

  /* Intel dashboard (landing) — cases-not-themes model.

     - The briefing grid renders one card PER TRACKED CASE (case-briefings.json,
       written by scripts/generate_case_briefings.py): moved cases lead with a
       fresh lede, quiet cases show "no change since <date>".
     - Themes are prospecting lenses + tags: the Themes dropdown filters cases
       by their topic tags and filters the Prospects tile; theme pills are
       SQUARE to distinguish them from case pills.
     - The Prospects tile lists candidate new cases from scan_prospects.py
       (api/prospects, fallback prospects.json) — Dismiss inline, Track on
       prospects.html.
     - Case pills use the shared color store (ud-case-colors + intel-prefs).
     - The Cases and Themes dropdowns choose what appears here; selections
       persist in localStorage (ih-filter-state) as this browser's default.
     - Calendar parsing mirrors calendar.js (trimmed copy). */

  var BASE = location.pathname.indexOf("/intel") === 0 ? "/intel/" : "/";

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

  var MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    return MONTH_ABBR[Number(m[2]) - 1] + " " + Number(m[3]);
  }

  // ── Shared pill colors ─────────────────────────────────────────────────────
  var savedColors = {};
  try { savedColors = JSON.parse(localStorage.getItem("ud-case-colors") || "{}"); } catch (e) {}

  function autoFg(bg) {
    var r = parseInt(String(bg).slice(1, 3), 16) || 136;
    var g = parseInt(String(bg).slice(3, 5), 16) || 136;
    var b = parseInt(String(bg).slice(5, 7), 16) || 136;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0A0A0A" : "#FFFFFF";
  }

  function casePill(slug, name, defaultColor) {
    var bg = (savedColors[slug] && savedColors[slug].bg) || defaultColor || "#888888";
    var fg = (savedColors[slug] && savedColors[slug].fg) || autoFg(bg);
    return '<span class="ih-pill" style="--pb:' + bg + ";--pf:" + fg + '">' + esc(name) + "</span>";
  }

  // The case's pill background color, and a translucent tint of it.
  function caseColor(slug, defaultColor) {
    return (savedColors[slug] && savedColors[slug].bg) || defaultColor || "#888888";
  }
  function tint(hex, alpha) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!m) return "rgba(136,136,136," + alpha + ")";
    var n = parseInt(m[1], 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  var SHOW_THEME_EMOJIS = true;  // admin toggle (themes.json show_emojis)
  var THEMES = {
    "rewind-tariffs":               { name: "Tariffs / Trade",            emoji: "⚖️", bg: "#ECFCCB", fg: "#3f6212" },
    "llm-class-action":             { name: "LLM / Copyright",            emoji: "🤖", bg: "#DBEAFE", fg: "#1e40af" },
    "crypto-insolvency":            { name: "Crypto Insolvency",          emoji: "🪙", bg: "#FFEDD5", fg: "#9a3412" },
    "fraud-recovery":               { name: "Ponzi / Fraud Recovery",     emoji: "🕵️", bg: "#F3E8FF", fg: "#6b21a8" },
    "billion-dollar-class-actions": { name: "$1B+ Class Actions",         emoji: "💰", bg: "#D1FAE5", fg: "#065f46" },
    "bankruptcy-creditor-rights":   { name: "Bankruptcy Creditor Rights", emoji: "📜", bg: "#FEE2E2", fg: "#991b1b" },
  };
  // First paint used to flash the fallback table above (old names, emojis on)
  // for a beat until themes.json arrived — hydrate from the previous fetch so
  // reloads paint with the admin-managed names + emoji toggle immediately.
  try {
    var _tc = JSON.parse(localStorage.getItem("ih-themes-cache") || "null");
    if (_tc) {
      SHOW_THEME_EMOJIS = _tc.show_emojis !== false;
      (_tc.themes || []).forEach(function (t) {
        if (!t || !t.slug) return;
        var cur = THEMES[t.slug] || { bg: "#E0E7FF", fg: "#3730a3" };
        cur.name = t.display_name || cur.name || t.slug;
        cur.emoji = t.emoji || cur.emoji || "";
        THEMES[t.slug] = cur;
      });
    }
  } catch (e) {}

  // Order themes lead with the most active practice areas (used by the
  // "Theme" card arrangement below).
  var THEME_ORDER = ["llm-class-action", "crypto-insolvency", "bankruptcy-creditor-rights",
                     "fraud-recovery", "billion-dollar-class-actions", "rewind-tariffs"];

  // Card arrangement — persisted per-device; high-priority flags roam across
  // devices via api/prefs (alongside the shared pill colors).
  var VALID_SORTS = { activity: 1, az: 1, priority: 1, theme: 1, date: 1 };
  var sortMode = "activity";
  // Clicking the active A–Z / date button flips its direction.
  var azDir = "asc";     // asc = A–Z, desc = Z–A
  var dateDir = "desc";  // desc = newest first, asc = oldest first
  try { if (localStorage.getItem("ih-sort-az-dir") === "desc") azDir = "desc"; } catch (e) {}
  try { if (localStorage.getItem("ih-sort-date-dir") === "asc") dateDir = "asc"; } catch (e) {}
  try { var _sm = localStorage.getItem("ud-case-sort"); if (VALID_SORTS[_sm]) sortMode = _sm; } catch (e) {}

  // Briefing view: cards (default) or a compact one-row-per-case list.
  var briefView = "cards";
  try { if (localStorage.getItem("ih-brief-view") === "list") briefView = "list"; } catch (e) {}
  var savedPriorities = {};
  try { savedPriorities = JSON.parse(localStorage.getItem("ud-case-priorities") || "{}") || {}; } catch (e) { savedPriorities = {}; }
  function isPriority(slug) { return !!savedPriorities[slug]; }
  function persistPriorities() { try { localStorage.setItem("ud-case-priorities", JSON.stringify(savedPriorities)); } catch (e) {} }

  function themeOf(slug) {
    var base = THEMES[slug] || { name: slug, emoji: "📰", bg: "#E0E7FF", fg: "#3730a3" };
    var ov = savedColors[slug];
    return { name: base.name, emoji: base.emoji,
             bg: (ov && ov.bg) || base.bg, fg: (ov && ov.fg) || base.fg,
             border: (ov && ov.border) || "" };
  }

  // Monochrome outline pill — white bg / black outline+text, inverted in dark.
  function themePill(slug) {
    var t = themeOf(slug);
    return '<span class="ih-pill ih-pill-theme">' + (SHOW_THEME_EMOJIS && t.emoji ? t.emoji + " " : "") + esc(t.name) + "</span>";
  }

  function groupPill(name) {
    return '<span class="ih-pill ih-pill-theme">' + esc(name) + "</span>";
  }

  // Factory palette = Andrew's Aug 2026 light/dark pairings (was the neon set).
  var FALLBACK_SWATCHES = [
    { bg: "#e6e6e6", fg: "#000000" }, { bg: "#696969", fg: "#ffffff" },
    { bg: "#ffebb3", fg: "#a66407" }, { bg: "#a66407", fg: "#ffffff" },
    { bg: "#b2f5d9", fg: "#0e5338" }, { bg: "#e8d3fd", fg: "#5c2097" },
    { bg: "#dbe0ff", fg: "#2d42e1" }, { bg: "#ffd6d1", fg: "#a00e0e" },
    { bg: "#146747", fg: "#ffffff" }, { bg: "#8a56bd", fg: "#ffffff" },
    { bg: "#2d42e1", fg: "#FFFFFF" }, { bg: "#b14135", fg: "#ffffff" },
  ];

  function currentSwatches() {
    try {
      var p = JSON.parse(localStorage.getItem("ud-theme-presets") || "null");
      if (Array.isArray(p) && p.length === 12) return p;
    } catch (e) {}
    return FALLBACK_SWATCHES;
  }

  function persistColors() {
    try { localStorage.setItem("ud-case-colors", JSON.stringify(savedColors)); } catch (e) {}
  }

  function pushPrefs() {
    fetchJson(BASE + "api/prefs").then(function (p) {
      var colors = (p && p.ok && p.colors) || {};
      Object.keys(savedColors).forEach(function (k) { colors[k] = savedColors[k]; });
      Object.keys(colors).forEach(function (k) { if (savedColors[k] === undefined && THEMES[k]) delete colors[k]; });
      var themePresets = (p && p.theme_presets) || [];
      try {
        var lp = JSON.parse(localStorage.getItem("ud-theme-presets") || "null");
        if (Array.isArray(lp) && lp.length === 12) themePresets = lp;
      } catch (e) {}
      return fetch(BASE + "api/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: colors, groups: (p && p.groups) || [], presets: (p && p.presets) || [], theme_presets: themePresets, priorities: savedPriorities }),
      });
    }).catch(function () {});
  }

  var popEl = null;
  var popSlug = null;
  var popBase = null;   // {name, bg, fg} the popover was opened with
  var popEditingPalette = false;
  function closePop() {
    if (popEl && popEl.parentNode) popEl.parentNode.removeChild(popEl);
    popEl = null;
    popSlug = null;
    popBase = null;
    popEditingPalette = false;
  }
  function rebuildCasesPanelIfOpen() {
    var p = document.getElementById("ih-cases-panel");
    if (p && p.style.display !== "none") buildCasesPanel(p);
  }

  function popApply() {
    if (!popEl || !popSlug) return;
    var bg = popEl.querySelector("[data-in-bg]").value;
    var fg = popEl.querySelector("[data-in-fg]").value;
    var useBorder = popEl.querySelector("[data-in-border-on]").checked;
    var border = popEl.querySelector("[data-in-border]").value;
    var entry = { bg: bg, fg: fg };
    if (useBorder) entry.border = border;
    savedColors[popSlug] = entry;
    persistColors();
    pushPrefs();
    renderAll();
    rebuildCasesPanelIfOpen();
  }

  function popRenderSwatches() {
    var box = popEl.querySelector("[data-role-swatches]");
    var cur = (savedColors[popSlug] && savedColors[popSlug].bg) || (popBase ? popBase.bg : themeOf(popSlug).bg);
    box.className = "ud-pop-swatches";
    box.innerHTML = currentSwatches().map(function (s, i) {
      var on = s.bg.toLowerCase() === (cur || "").toLowerCase();
      return '<button type="button" class="ud-pop-swatch' + (on ? " ud-swatch-active" : "") + '" data-sw="' + i + '" style="background:' + s.bg + '" title="' + s.bg + '"></button>';
    }).join("");
    box.querySelectorAll("[data-sw]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = currentSwatches()[Number(b.getAttribute("data-sw"))];
        popEl.querySelector("[data-in-bg]").value = s.bg;
        popEl.querySelector("[data-in-fg]").value = s.fg || "#0A0A0A";
        popApply();
        popRenderSwatches();
      });
    });
  }

  function popRenderPaletteEditor() {
    var box = popEl.querySelector("[data-role-swatches]");
    var presets = currentSwatches().map(function (x) { return { bg: x.bg, fg: x.fg }; });
    box.className = "ud-pop-swatches ud-sw-editing";
    box.innerHTML = presets.map(function (p, i) {
      return (
        '<div class="ud-sw-row" data-row="' + i + '">' +
          '<span class="ud-sw-preview" style="background:' + p.bg + ";color:" + (p.fg || "#0A0A0A") + '">Aa</span>' +
          '<label>Bg <input type="color" class="ud-sw-bg" data-idx="' + i + '" value="' + p.bg + '"></label>' +
          '<label>Text <input type="color" class="ud-sw-fg" data-idx="' + i + '" value="' + (p.fg || "#0A0A0A") + '"></label>' +
        "</div>"
      );
    }).join("");
    function commit(i) {
      var rowEl = box.querySelector('[data-row="' + i + '"]');
      presets[i] = { bg: rowEl.querySelector(".ud-sw-bg").value, fg: rowEl.querySelector(".ud-sw-fg").value };
      var prev = rowEl.querySelector(".ud-sw-preview");
      prev.style.background = presets[i].bg;
      prev.style.color = presets[i].fg;
      try { localStorage.setItem("ud-theme-presets", JSON.stringify(presets)); } catch (e) {}
      pushPrefs();
    }
    box.querySelectorAll(".ud-sw-bg, .ud-sw-fg").forEach(function (inp) {
      inp.addEventListener("input", function () { commit(Number(inp.getAttribute("data-idx"))); });
    });
  }

  // Case gears pass the case's color base.
  function openCasePopover(slug, anchor) {
    var m = null;
    for (var i = 0; i < MANIFEST.length; i++) { if (MANIFEST[i].slug === slug) { m = MANIFEST[i]; break; } }
    var bg = caseColor(slug, m && m.default_color);
    var fg = (savedColors[slug] && savedColors[slug].fg) || autoFg(bg);
    openColorPopover(slug, anchor, { name: (m && (m.short_name || m.display_name)) || slug, bg: bg, fg: fg });
  }

  function openColorPopover(slug, anchor, base) {
    closePop();
    popSlug = slug;
    popBase = base;
    var t = base;
    var hasBorder = !!(savedColors[slug] && savedColors[slug].border);
    var pop = document.createElement("div");
    pop.className = "ih-color-pop";
    pop.style.display = "block";
    pop.innerHTML =
      '<div class="ud-pop-title">' + esc(t.name) + "</div>" +
      '<div data-role-swatches></div>' +
      '<div class="ud-sw-row" style="margin-bottom:6px;"><label>Bg <input type="color" data-in-bg value="' + t.bg + '"></label>' +
        '<label>Text <input type="color" data-in-fg value="' + t.fg + '"></label></div>' +
      '<div class="ud-sw-row" style="margin-bottom:10px;"><label><input type="checkbox" data-in-border-on' + (hasBorder ? " checked" : "") + "> Border</label>" +
        '<label><input type="color" data-in-border value="' + ((savedColors[slug] && savedColors[slug].border) || t.fg) + '"></label></div>' +
      '<div style="display:flex;gap:10px;align-items:center;">' +
        '<button type="button" class="ud-dd-quick" data-reset style="margin-left:auto;">Reset to default</button>' +
      "</div>";
    document.body.appendChild(pop);
    var rect = anchor.getBoundingClientRect();
    pop.style.position = "absolute";
    pop.style.top = (rect.bottom + window.scrollY + 6) + "px";
    pop.style.left = Math.max(8, Math.min(rect.left + window.scrollX - 90, window.innerWidth - 260)) + "px";
    popEl = pop;
    popRenderSwatches();

    pop.querySelectorAll("[data-in-bg], [data-in-fg], [data-in-border]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        if (inp.hasAttribute("data-in-border")) pop.querySelector("[data-in-border-on]").checked = true;
        popApply();
      });
    });
    pop.querySelector("[data-in-border-on]").addEventListener("change", popApply);
    // Default-palette editing moved to Manage → Settings (manage.html).
    pop.querySelector("[data-reset]").addEventListener("click", function () {
      delete savedColors[slug];
      persistColors();
      pushPrefs();
      renderAll();
      rebuildCasesPanelIfOpen();
      closePop();
    });
  }


  document.addEventListener("click", function (ev) {
    if (popEl && !popEl.contains(ev.target) && !ev.target.closest("[data-gear],[data-case-gear]")) closePop();
    if (snoozeMenuEl && !snoozeMenuEl.contains(ev.target) && !ev.target.closest("[data-snooze]")) closeSnoozeMenu();
  });

  // ── Show/hide preferences (persisted as this browser's default) ───────────
  var FILTER_KEY = "ih-filter-state";
  var activeCases = {};
  var activeThemes = {};
  // Theme filter model: single-click a pill to FOCUS just that theme (others
  // deselect); double-click to PIN it (stays selected alongside others). The
  // visible set is derived = pinned ∪ {focus}; empty = All.
  var stickyThemes = {};   // slug -> true (pinned via double-click)
  var focusTheme = null;   // the single-clicked theme (replaced on the next single-click)
  try {
    var st = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
    activeCases = st.activeCases || {};
    activeThemes = st.activeThemes || {};
    stickyThemes = st.stickyThemes || {};
    focusTheme = st.focusTheme || null;
  } catch (e) {}

  function saveFilters() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({
        activeCases: activeCases, activeThemes: activeThemes,
        stickyThemes: stickyThemes, focusTheme: focusTheme,
      }));
    } catch (e) {}
  }

  // Unknown (new) cases and themes default to visible
  function caseOn(slug) { return activeCases[slug] !== false; }
  function themeOn(slug) { return activeThemes[slug] !== false; }

  function loadGroups() {
    try { return JSON.parse(localStorage.getItem("ud-case-groups") || "[]"); } catch (e) { return []; }
  }

  // ── Data stores + render-on-demand ────────────────────────────────────────
  var MANIFEST = [];
  var CASE_DATA = [];       // [{m, c}]
  var BRIEFING_ITEMS = [];   // per-case briefings (case-briefings.json items)
  var PROSPECT_ITEMS = [];   // candidate cases (api/prospects → prospects.json)
  var snoozeMenuEl = null;   // floating menu for the dashboard prospect tile's Snooze button
  var BRIEFING_GROUPS = [];  // [{id, name, members}] — consolidated briefing units

  function groupOfCase(slug) {
    for (var i = 0; i < BRIEFING_GROUPS.length; i++) {
      if ((BRIEFING_GROUPS[i].members || []).indexOf(slug) !== -1) return BRIEFING_GROUPS[i];
    }
    return null;
  }

  // Display units for the briefing grid: each group renders as ONE card/row
  // (group name on the pill), everything else stays a single case.
  function displayUnits() {
    var bySlug = {};
    MANIFEST.forEach(function (m) { bySlug[m.slug] = m; });
    var used = {};
    var units = [];
    BRIEFING_GROUPS.forEach(function (g) {
      var members = (g.members || []).map(function (s) { return bySlug[s]; }).filter(Boolean);
      if (members.length < 2) return;
      members.forEach(function (m) { used[m.slug] = 1; });
      var topics = [];
      var added = "";
      members.forEach(function (m) {
        (m.topics || []).forEach(function (t) { if (topics.indexOf(t) === -1) topics.push(t); });
        if (m.added && (!added || m.added < added)) added = m.added;
      });
      units.push({
        slug: g.id,
        display_name: g.name,
        short_name: g.name,
        default_color: (g.color || members[0].default_color),
        topics: topics,
        added: added,
        group: g,
        members: members,
      });
    });
    MANIFEST.forEach(function (m) { if (!used[m.slug]) units.push(m); });
    return units;
  }
  var NOTES_LIST = [];
  var ARCHIVED_SLUGS = {};  // archived cases: notes stay case-labeled but hidden while archived
  var FEED_ITEMS = [];
  var NOTE_STACK = [];   // current filtered notes shown in the dashboard tile
  var noteFront = 0;     // index into NOTE_STACK of the note currently shown
  // The note card is the same very-light neon-green paper in light mode;
  // dark mode swaps in a warm dark gray — brighter and warmer than the
  // site's own near-black surface, so the card still reads as distinct
  // paper rather than blending into the canvas.
  var NOTE_TINTS = [
    { bg: "#EEFFA3", bgd: "#2B2723" },
  ];

  function fill(id, html) {
    var n = document.getElementById(id);
    if (n) n.innerHTML = html || '<div class="ih-empty">Nothing here yet.</div>';
  }

  function row(href, meta, text, pillHtml) {
    return (
      '<a class="ih-row" href="' + href + '">' +
        '<div class="ih-date">' + (pillHtml || "") + (meta ? "<span>" + esc(meta) + "</span>" : "") + "</div>" +
        '<div class="ih-text">' + esc(text) + "</div>" +
      "</a>"
    );
  }

  // Calendar extraction (trimmed copy of calendar.js)
  var MONTHS = ["january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"];
  var DATE_RE = new RegExp(
    "(\\d{1,2}/\\d{1,2}/\\d{2,4})|((?:" + MONTHS.join("|") + ")\\s+\\d{1,2},?\\s+\\d{4})", "gi");
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function toISO(raw) {
    var m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      var y = m[3].length === 2 ? "20" + m[3] : m[3];
      return y + "-" + pad2(Number(m[1])) + "-" + pad2(Number(m[2]));
    }
    m = raw.toLowerCase().match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m) {
      var idx = MONTHS.indexOf(m[1]);
      if (idx >= 0) return m[3] + "-" + pad2(idx + 1) + "-" + pad2(Number(m[2]));
    }
    return null;
  }
  var NOISE_RE = /entered:|filed on|filed by|signed on|signed by|receipt|transcript of|period (?:from|of)|through|dated|as of/i;
  function classifyWindow(w) {
    var d = w.toLowerCase();
    if (NOISE_RE.test(d.slice(-30))) return null;
    if (/transcript/.test(d)) return null;
    if (/auction/.test(d)) return "Auction";
    if (/hearing/.test(d)) return "Hearing";
    if (/conference/.test(d)) return "Conference";
    if (/\btrial\b/.test(d)) return "Trial";
    if (/objection/.test(d) && /due|deadline|by/.test(d)) return "Objections due";
    if (/\breply|replies\b/.test(d) && /due/.test(d)) return "Reply due";
    if (/\bresponse|responses\b/.test(d) && /due/.test(d)) return "Response due";
    if (/\bbrief/.test(d) && /due/.test(d)) return "Brief due";
    if (/deadline/.test(d)) return "Deadline";
    if (/claims? bar date|bar date/.test(d)) return "Bar date";
    if (/\bdue\b/.test(d)) return "Due date";
    return null;
  }
  function extractEvents(entry, short) {
    var desc = entry.description || "";
    if (!desc) return [];
    var out = [];
    var m;
    DATE_RE.lastIndex = 0;
    while ((m = DATE_RE.exec(desc)) !== null) {
      var iso = toISO(m[0]);
      if (!iso) continue;
      var kind = classifyWindow(desc.slice(Math.max(0, m.index - 90), m.index));
      if (!kind) continue;
      out.push({ date: iso, kind: kind, title: desc.slice(0, 110), short: short });
    }
    return out;
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function hoursAgoIso(h) {
    return new Date(Date.now() - h * 3600 * 1000).toISOString();
  }

  function caseThemes(slug) {
    for (var i = 0; i < MANIFEST.length; i++) {
      if (MANIFEST[i].slug === slug) return MANIFEST[i].topics || [];
    }
    return [];
  }

  function todayIso() {
    var t = new Date();
    return t.getFullYear() + "-" + pad2(t.getMonth() + 1) + "-" + pad2(t.getDate());
  }

  // ── Per-case joins: filings, news, and the next date for ONE case ─────────
  function caseFilings(x, sinceIso) {
    var short = x.m.short_name || x.m.display_name || x.m.slug;
    var out = [];
    ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
      if (!e.date_filed || !(e.description || "").trim()) return;
      if (e.date_filed < sinceIso.slice(0, 10)) return;
      out.push({ kind: "filing", date: e.date_filed, num: e.entry_number,
                 text: e.description, caseSlug: x.m.slug, caseShort: short,
                 color: x.m.default_color });
    });
    out.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.num || 0) - (a.num || 0);
    });
    return out;
  }

  function caseNews(slug, sinceIso) {
    var out = [];
    FEED_ITEMS.forEach(function (b) {
      if (!b.url || !b.title) return;
      if (b.case_slug !== slug) return;
      var when = b.published_at || (b.date ? b.date + "T00:00:00Z" : "");
      if (!when || when < sinceIso) return;
      out.push({ kind: "news", date: b.date || "", text: b.title,
                 source: b.source || "", bkind: (b.kind || "news"), url: b.url,
                 caseSlug: slug });
    });
    return out;
  }

  // A case is visible when its own toggle is on AND at least one of its theme
  // tags is on (untagged cases always pass the theme filter).
  function caseVisible(m) {
    // A group unit is visible when ANY member passes the case/theme filters.
    if (m.members) return m.members.some(caseVisible);
    if (!caseOn(m.slug)) return false;
    var topics = m.topics || [];
    if (!topics.length) return true;
    for (var i = 0; i < topics.length; i++) {
      if (themeOn(topics[i])) return true;
    }
    return false;
  }
  // Same rule, looked up by slug — for feed/note items that only carry a
  // case_slug, not a full manifest-shaped unit. Unknown slugs (e.g. a
  // briefing-group id) default to visible rather than disappearing silently.
  function caseVisibleBySlug(slug) {
    var m = MANIFEST.find(function (x) { return x.slug === slug; });
    return m ? caseVisible(m) : true;
  }

  function caseNextDate(x) {
    var today = todayIso();
    var short = x.m.short_name || x.m.display_name || x.m.slug;
    var best = null;
    ((x.c && x.c.events) || []).forEach(function (ev) {
      if (!ev.date || ev.date < today) return;
      if (!best || ev.date < best.date) {
        best = { kind: "date", date: ev.date, text: (ev.kind ? ev.kind + ": " : "") + (ev.title || ""), caseShort: short, caseSlug: x.m.slug, color: x.m.default_color };
      }
    });
    ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
      extractEvents(e, short).forEach(function (ev) {
        if (ev.date < today) return;
        if (!best || ev.date < best.date) {
          best = { kind: "date", date: ev.date, text: ev.kind + " \u2014 " + ev.title.slice(0, 80), caseShort: short, caseSlug: x.m.slug, color: x.m.default_color };
        }
      });
    });
    return best;
  }

  function daysUntil(iso) {
    var d = Math.round((new Date(iso + "T12:00:00Z") - Date.now()) / 86400000);
    if (d <= 0) return "today";
    return "in " + d + "d";
  }

  function filingNoteKey(item) {
    return item.caseSlug + "|" + (item.num != null
      ? "n" + item.num
      : "d" + (item.date || "") + "|" + (item.text || "").slice(0, 60));
  }

  // Rows live INSIDE a case card whose header already carries the case pill —
  // no per-row pill or case name. Group cards pass withCase=true so rows from
  // different member cases identify themselves.
  function codedRow(item, withCase) {
    var who = withCase && item.caseShort
      ? "<strong>" + esc(item.caseShort) + "</strong> \u00b7 "
      : "";
    if (item.kind === "filing") {
      return '<a class="ih-row-coded ih-code-filing" href="' + BASE + 'docket.html#case=' + encodeURIComponent(item.caseSlug) + '&e=' + encodeURIComponent(filingNoteKey(item)) + '"><span class="ih-code-ico">\u2696\ufe0f</span> ' + who +
        "Dkt. " + (item.num != null ? item.num : "\u2014") + " \u00b7 " + esc(item.text.slice(0, 95)) + "</a>";
    }
    if (item.kind === "news") {
      return '<a class="ih-row-coded ih-code-news" href="' + BASE + 'news.html#case=' + encodeURIComponent(item.caseSlug) + '&u=' + encodeURIComponent(item.url || "") + '"><span class="ih-code-ico">\ud83d\udce1</span> ' + who +
        esc(item.source) + " \u2014 " + esc(item.text.slice(0, 95)) + "</a>";
    }
    // Calendar event: colored left border + a lighter tint of the case color.
    var cbg = caseColor(item.caseSlug, item.color);
    return '<a class="ih-row-coded ih-code-date" style="border-left-color:' + cbg + ';background:' + tint(cbg, 0.14) + '" href="' + BASE + 'calendar.html#case=' + encodeURIComponent(item.caseSlug) + '&ev=' + encodeURIComponent((item.date || "") + "|" + (item.caseShort || "")) + '"><span class="ih-code-ico">\ud83d\udcc5</span> ' + who +
      esc(fmtDate(item.date)) + " \u00b7 " + esc(item.text.slice(0, 70)) +
      ' <span style="color:var(--ink-40)">\u00b7 ' + daysUntil(item.date) + "</span></a>";
  }

  function briefingOf(slug) {
    for (var i = 0; i < BRIEFING_ITEMS.length; i++) {
      if (BRIEFING_ITEMS[i].slug === slug) return BRIEFING_ITEMS[i];
    }
    return null;
  }

  function renderCaseGrid() {
    var grid = document.getElementById("ih-theme-grid");
    if (!grid) return;
    if (!MANIFEST.length) {
      grid.innerHTML = '<div class="ih-empty">Loading cases\u2026</div>';
      return;
    }
    var allUnits = displayUnits();
    var visible = allUnits.filter(caseVisible);
    if (!visible.length) {
      grid.innerHTML = '<div class="ih-empty">No cases selected.</div>';
      return;
    }
    var since = hoursAgoIso(26);
    var dataBySlug = {};
    CASE_DATA.forEach(function (x) { dataBySlug[x.m.slug] = x; });

    var cards = visible.map(function (m) {
      var isGroup = !!m.members;
      var brief = briefingOf(m.slug);
      var filings = [], news = [], nextDate = null;
      if (isGroup) {
        m.members.forEach(function (mm) {
          var mx = dataBySlug[mm.slug] || { m: mm, c: null };
          filings = filings.concat(caseFilings(mx, since));
          news = news.concat(caseNews(mm.slug, since));
          var nd = caseNextDate(mx);
          if (nd && (!nextDate || nd.date < nextDate.date)) nextDate = nd;
        });
        filings.sort(function (a, b) {
          if (a.date !== b.date) return a.date < b.date ? 1 : -1;
          return (b.num || 0) - (a.num || 0);
        });
      } else {
        var x = dataBySlug[m.slug] || { m: m, c: null };
        filings = caseFilings(x, since);
        news = caseNews(m.slug, since);
        nextDate = caseNextDate(x);
      }
      var devCount = filings.length + news.length;

      // Inside a group card the rows come from different cases — name them.
      var rows = [];
      filings.slice(0, 4).forEach(function (f) { rows.push(codedRow(f, isGroup)); });
      news.slice(0, 3).forEach(function (n) { rows.push(codedRow(n, isGroup)); });
      rows = rows.slice(0, 5);
      if (nextDate) rows.push(codedRow(nextDate, isGroup));
      var hidden = devCount - Math.min(devCount, 5);
      var docketTarget = isGroup
        ? m.members.map(function (mm) { return mm.slug; }).join(",")
        : m.slug;

      var moved = !!(brief && brief.moved);
      var count;
      if (devCount > 0) count = devCount + " today";
      else if (brief && brief.no_change_since) count = "no change since " + fmtDate(brief.no_change_since);
      else count = "quiet";

      var lede = brief ? (brief.lede || "").trim() : "";
      var readHref = BASE + "briefings.html#case=" + encodeURIComponent(m.slug);
      var ledeHtml;
      if (lede) {
        ledeHtml = '<div class="ih-tc-lede' + (moved ? "" : " ih-quiet") + '">' +
          (brief.date ? '<span class="ih-tc-date">' + esc(fmtDate(brief.date)) + " \u00b7 </span>" : "") +
          esc(lede.slice(0, 700)) + (lede.length > 700 ? "\u2026" : "") +
          ' <a href="' + readHref + '">Read \u2192</a></div>';
      } else {
        ledeHtml = '<div class="ih-tc-lede ih-quiet">No briefing yet for this ' + (isGroup ? "group" : "case") + '. ' +
          '<a href="' + BASE + 'docket.html#case=' + docketTarget + '">Docket \u2192</a></div>';
      }

      var pri = isPriority(m.slug);
      var star = '<button type="button" class="ih-star' + (pri ? " on" : "") +
        '" data-star="' + esc(m.slug) + '" aria-label="' + (pri ? "Remove high priority" : "Mark high priority") +
        '" title="' + (pri ? "High priority — click to remove" : "Mark as high priority") + '">' +
        (pri ? "★" : "☆") + "</button>";
      var head =
        '<div class="ih-tc-head">' +
          '<a href="' + BASE + 'docket.html#case=' + docketTarget + '" style="text-decoration:none">' +
            (isGroup ? '<span class="ih-pill ih-pill-theme">' + esc(m.short_name || m.display_name || m.slug) + "</span>"
                     : casePill(m.slug, m.short_name || m.display_name || m.slug, m.default_color)) + "</a>" +
          '<span class="ih-tc-right"><span class="ih-tc-count">' + esc(count) + "</span>" +
            (isGroup
              ? '<span class="ih-run-status" data-run-status="' + esc(m.slug) + '"></span>' +
                '<button type="button" class="ih-act" data-act-brief="' + esc(m.slug) + '" title="Brief now — force-regenerate this group\u2019s briefing">' + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' + "</button>"
              :
              '<span class="ih-run-status" data-run-status="' + esc(m.slug) + '"></span>' +
              '<button type="button" class="ih-act" data-act-sync="' + esc(m.slug) + '" title="Sync now — fresh docket entries + a news search; briefing refreshes if older than 12h">' + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>' + "</button>" +
              '<button type="button" class="ih-act" data-act-brief="' + esc(m.slug) + '" title="Brief now — force-regenerate this case’s briefing">' + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' + "</button>") +
            star + "</span>" +
        "</div>";

      var html =
        '<section class="ih-theme-card' + (moved ? " ih-card-moved" : "") + '">' +
          head + ledeHtml + rows.join("") +
          (hidden > 0 ? '<div class="ih-more-rows">+' + hidden + ' more \u00b7 <a href="' + BASE + 'docket.html#case=' + docketTarget + '">docket</a> / <a href="' + BASE + 'news.html">news</a></div>' : "") +
        "</section>";

      // Compact list-view row for the same case — same data, one line.
      var listHtml =
        '<a class="ih-case-listrow' + (moved ? " ih-lr-moved" : "") + '" href="' + readHref + '">' +
          (isGroup ? '<span class="ih-pill ih-pill-theme">' + esc(m.short_name || m.display_name || m.slug) + "</span>"
                   : casePill(m.slug, m.short_name || m.display_name || m.slug, m.default_color)) +
          '<span class="ih-lr-count">' + esc(count) + "</span>" +
          '<span class="ih-lr-lede' + (moved ? "" : " ih-quiet") + '">' +
            (lede ? esc(lede) : "No briefing yet — generates when the case moves.") + "</span>" +
          '<span class="ih-run-status" data-run-status="' + esc(m.slug) + '"></span>' +
          '<button type="button" class="ih-act" data-act-sync="' + esc(m.slug) + '" title="Sync now — fresh docket entries + a news search; briefing refreshes if older than 12h">' + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>' + "</button>" +
          '<button type="button" class="ih-act" data-act-brief="' + esc(m.slug) + '" title="Brief now — force-regenerate this case’s briefing">' + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' + "</button>" +
          star +
          '<span class="ih-lr-read">Read →</span>' +
        "</a>";

      var latest = (brief && brief.activity && brief.activity.latest) || "";
      return { html: html, listHtml: listHtml, moved: moved, dev: devCount, latest: latest,
               slug: m.slug, name: (m.short_name || m.display_name || m.slug),
               added: m.added || "",
               theme: (m.topics && m.topics[0]) || "" };
    });

    function byName(a, b) { return a.name.localeCompare(b.name); }
    function grpHead(label, n) {
      return '<div class="ih-grp-head">' + esc(label) + ' <span>' + n + "</span></div>";
    }
    var asList = briefView === "list";
    grid.classList.toggle("ih-list-mode", asList);
    function join(list) { return list.map(function (c) { return asList ? c.listHtml : c.html; }).join(""); }

    var htmlOut;
    if (sortMode === "az") {
      var azSorted = cards.slice().sort(byName);
      if (azDir === "desc") azSorted.reverse();
      htmlOut = join(azSorted);
    } else if (sortMode === "date") {
      // By tracking-start date; cases with no recorded date go last either way.
      htmlOut = join(cards.slice().sort(function (a, b) {
        var av = a.added || (dateDir === "desc" ? "0000" : "9999");
        var bv = b.added || (dateDir === "desc" ? "0000" : "9999");
        var cmp = av.localeCompare(bv);
        return dateDir === "desc" ? -cmp : cmp;
      }));
    } else if (sortMode === "priority") {
      var hi = cards.filter(function (c) { return isPriority(c.slug); }).sort(byName);
      var lo = cards.filter(function (c) { return !isPriority(c.slug); }).sort(byName);
      htmlOut = grpHead("★ High priority", hi.length) +
        (hi.length ? join(hi)
          : '<div class="ih-grp-hint">No high-priority cases yet — click the ☆ on any card to pin it here.</div>') +
        grpHead("Other cases", lo.length) + join(lo);
    } else if (sortMode === "theme") {
      htmlOut = "";
      var seen = {};
      THEME_ORDER.forEach(function (tk) {
        var g = cards.filter(function (c) { return c.theme === tk; }).sort(byName);
        if (!g.length) return;
        g.forEach(function (c) { seen[c.slug] = 1; });
        var t = THEMES[tk] || { emoji: "📰", name: tk };
        htmlOut += grpHead((SHOW_THEME_EMOJIS && t.emoji ? t.emoji + " " : "") + t.name, g.length) + join(g);
      });
      var rest = cards.filter(function (c) { return !seen[c.slug]; }).sort(byName);
      if (rest.length) htmlOut += grpHead("📰 Other", rest.length) + join(rest);
    } else {
      // Activity (default): recency buckets — 24h / 72h / last week / earlier —
      // each bucket ordered moved-first, freshest first.
      function dayAgo(n) {
        var d = new Date();
        d.setDate(d.getDate() - n);
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
      }
      var c24 = dayAgo(1), c72 = dayAgo(3), cWk = dayAgo(7);
      var buckets = [
        { label: "Last 24 hours", test: function (c) { return (c.latest || "") >= c24; }, list: [] },
        { label: "Last 72 hours", test: function (c) { return (c.latest || "") >= c72; }, list: [] },
        { label: "Last week", test: function (c) { return (c.latest || "") >= cWk; }, list: [] },
        { label: "Earlier", test: function () { return true; }, list: [] },
      ];
      cards.slice().sort(function (a, b) {
        if (a.moved !== b.moved) return a.moved ? -1 : 1;
        if ((a.dev > 0) !== (b.dev > 0)) return a.dev > 0 ? -1 : 1;
        return (b.latest || "").localeCompare(a.latest || "");
      }).forEach(function (c) {
        for (var bi = 0; bi < buckets.length; bi++) {
          if (buckets[bi].test(c)) { buckets[bi].list.push(c); break; }
        }
      });
      htmlOut = "";
      buckets.forEach(function (bk) {
        if (!bk.list.length) return;
        htmlOut += grpHead(bk.label, bk.list.length) + join(bk.list);
      });
    }
    // Filters can quietly hide cases — say so, with a one-click way back.
    var hiddenN = allUnits.length - visible.length;
    if (hiddenN > 0) {
      htmlOut += '<div class="ih-filter-note">' + hiddenN + " case" + (hiddenN === 1 ? "" : "s") +
        ' hidden by your Cases/Themes filters · <button type="button" data-show-all-cases>Show all</button></div>';
    }
    grid.innerHTML = htmlOut;
    var showAll = grid.querySelector("[data-show-all-cases]");
    if (showAll) {
      showAll.addEventListener("click", function () {
        MANIFEST.forEach(function (m) { activeCases[m.slug] = true; });
        Object.keys(THEMES).forEach(function (s) { activeThemes[s] = true; });
        activeCases.__unassigned__ = true;
        saveFilters();
        renderAll();
      });
    }

    grid.querySelectorAll("[data-act-sync]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        runCaseAction("sync", b.getAttribute("data-act-sync"));
      });
    });
    grid.querySelectorAll("[data-act-brief]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        runCaseAction("brief", b.getAttribute("data-act-brief"));
      });
    });
    paintRunBadges();

    grid.querySelectorAll("[data-star]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var slug = b.getAttribute("data-star");
        if (savedPriorities[slug]) delete savedPriorities[slug];
        else savedPriorities[slug] = true;
        persistPriorities();
        pushPrefs();
        renderCaseGrid();
      });
    });
    _carouselSync();
  }

  // ── Top band: unassigned news, date strip, latest notes ───────────────────
  // ── Top band: one authoritative pixel height, three self-filling tiles ────
  // The grip drags ONE number, bandH, which becomes the exact height of the
  // news list / calendar / notes boxes. Everything else derives from it:
  //   · news renders the most rows whose NATURAL height still fits; the
  //     remainder (always less than one row) is absorbed by flex-grow, so the
  //     visible rows breathe open as you drag and snap back to natural size
  //     the moment the next row earns its place.
  //   · the calendar's week count is a closed form in bandH, and its week rows
  //     are 1fr, so they share the height instead of leaving a blank strip.
  //   · the note card shrink-wraps text whose line-clamp tracks bandH, so it
  //     grows a line at a time instead of becoming a sheet of empty paper.
  // bandLevel survives only as the persisted form of bandH — same key, same
  // 0..1 range, so values saved by the old build still load.
  var BAND_ROWS_KEY = "ih-band-rows";
  var BAND_MIN_H = 300, BAND_MAX_H = 900;
  var NEWS_MIN_ROWS = 4, NEWS_MAX_ROWS = 14;
  var CAL_MIN_WEEKS = 1, CAL_MAX_WEEKS = 4;
  var CAL_WEEK_PITCH = 215;   // one week row: day header + ~2 events + gap
  var CAL_HEAD_H = 42;        // .ih-mm-head above the grid
  var LIST_BORDER = 2;        // .ih-list border top + bottom

  var bandLevel = 0.3;
  try {
    // Number(null) is 0, and 0 passed the old `>= 0 && <= 1` test, so an unset
    // key silently pinned every first-time visitor to the smallest band and
    // made the 0.3 default dead code.
    var _bl = localStorage.getItem(BAND_ROWS_KEY), _bn = Number(_bl);
    if (_bl !== null && _bl !== "" && isFinite(_bn) && _bn >= 0 && _bn <= 1) bandLevel = _bn;
  } catch (e) {}
  var bandH = BAND_MIN_H + bandLevel * (BAND_MAX_H - BAND_MIN_H);

  // Under 1100px the band stacks to one column; a fixed height per box would
  // stretch the page, so the whole mechanic switches off there.
  function bandStacked() { return window.matchMedia("(max-width: 1100px)").matches; }

  // What is rendered now, plus the bandH window that render stays valid over.
  // Only measureBand()/refreshWindows() touch these — never the drag loop.
  var newsRows = NEWS_MIN_ROWS, newsAvailable = NEWS_MAX_ROWS;
  var newsNatH = 0, newsRowMax = 78;
  var calWeeks = 1;
  var noteChromeH = 150, noteLineH = 20;
  var newsLo = 0, newsHi = Infinity;

  function newsMaxRows() { return Math.min(NEWS_MAX_ROWS, newsAvailable || NEWS_MAX_ROWS); }
  // Closed form, and deliberately NOT measured from the columns: the column
  // height depends on how many events we draw, which depends on the week
  // count — measuring it would close a feedback loop. A fixed pitch keeps
  // grow and shrink exactly symmetric.
  function calWeeksForH(h) {
    return Math.max(CAL_MIN_WEEKS,
      Math.min(CAL_MAX_WEEKS, Math.round((h - CAL_HEAD_H) / CAL_WEEK_PITCH) || 1));
  }

  // The per-frame write: two setProperty calls, no layout reads.
  function applyBandH() {
    var band = document.querySelector(".ih-band");
    if (!band) return;
    if (bandStacked()) {
      band.style.removeProperty("--band-h");
      band.style.removeProperty("--note-lines");
      return;
    }
    band.style.setProperty("--band-h", Math.round(bandH) + "px");
    // The note absorbs slack as text, not blank paper. Pure arithmetic off two
    // measured constants; the -1 is a line of headroom so the clamp can never
    // overshoot the card and corrupt the next chrome measurement.
    band.style.setProperty("--note-lines",
      String(Math.max(3, Math.floor((bandH - noteChromeH) / noteLineH) - 1)));
  }

  // The only function that reads layout. `.ih-measuring` drops the list to
  // height:auto so scrollHeight is the TRUE natural height of what is
  // rendered (while stretched, scrollHeight can never fall below clientHeight
  // and every comparison would be a tautology). Both class writes happen in
  // one task, so the collapsed state is never painted.
  function measureBand() {
    var list = document.getElementById("ih-unassigned");
    if (list && list.children.length) {
      list.classList.add("ih-measuring");
      newsNatH = list.scrollHeight;
      var mx = 0;
      for (var i = 0; i < list.children.length; i++) {
        var rh = list.children[i].getBoundingClientRect().height;
        if (rh > mx) mx = rh;
      }
      if (mx > 0) newsRowMax = mx;
      newsRows = list.children.length;   // feed shorter than asked → resync
      list.classList.remove("ih-measuring");
    }
    var card = document.querySelector(".ih-note-card");
    var body = card && card.querySelector(".body");
    if (card && body) {
      var ch = card.getBoundingClientRect().height - body.getBoundingClientRect().height;
      if (ch > 40 && ch < 400) noteChromeH = ch;
      var lh = parseFloat(getComputedStyle(body).lineHeight);
      if (lh > 8) noteLineH = lh;
    }
  }

  // Cache the bandH window the current render is valid over, so a drag frame
  // is a numeric comparison and touches no layout at all.
  function refreshWindows() {
    newsLo = (newsRows <= NEWS_MIN_ROWS) ? 0 : newsNatH + LIST_BORDER;
    newsHi = (newsRows >= newsMaxRows()) ? Infinity : newsNatH + newsRowMax + LIST_BORDER;
  }
  function bandNeedsSettle() {
    return bandH >= newsHi || bandH < newsLo || calWeeksForH(bandH) !== calWeeks;
  }

  // Converge on the counts whose NATURAL height fits bandH. One step per tile
  // per pass. The two news branches are mutually exclusive by construction —
  // after an add, natH' <= natH + rowMax <= avail, so remove cannot fire next
  // pass — which is exact hysteresis rather than a tuned pixel deadband.
  function settleBand() {
    if (bandStacked()) return;
    applyBandH();
    for (var pass = 0; pass < 4; pass++) {
      measureBand();
      var changed = false;
      var avail = bandH - LIST_BORDER;
      var list = document.getElementById("ih-unassigned");
      if (list && newsRows < newsMaxRows() && avail - newsNatH >= newsRowMax) {
        newsRows++; renderUnassigned(); changed = true;
      } else if (list && newsRows > NEWS_MIN_ROWS && newsNatH > avail) {
        newsRows--; renderUnassigned(); changed = true;
      }
      var wantWeeks = calWeeksForH(bandH);
      if (wantWeeks !== calWeeks) { calWeeks = wantWeeks; renderDates(); changed = true; }
      if (!changed) break;
    }
    measureBand();
    refreshWindows();
    // When the feed can't supply another row, stop stretching the ones we have
    // — otherwise a two-item feed turns each row into a 200px slab. The tile
    // then simply ends early, which reads far better than a ballooned row.
    var l2 = document.getElementById("ih-unassigned");
    if (l2) l2.classList.toggle("ih-news-full", newsRows >= newsMaxRows());
  }
  function newsRowCount() { return newsRows; }
  // Kept under the old name: renderAll, the resize debounce and the drag's
  // mouseup all mean "settle the band now". settleBand picks the row count by
  // measurement, a superset of the old top-up loop, and it shrinks as well as
  // grows.
  function fillNewsToHeight() { settleBand(); }

  function renderUnassigned() {
    // Only case- or theme-related news makes the dashboard; the full feed
    // lives on the News page under "All news".
    var items = FEED_ITEMS.filter(function (b) {
      if (!b.url || !b.title || !(b.case_slug || b.group_name || b.theme_slug)) return false;
      if (b.case_slug) return caseVisibleBySlug(b.case_slug);
      if (b.theme_slug) return themeOn(b.theme_slug);
      return true; // group_name-only items carry no theme info to filter on
    });
    var countEl = document.getElementById("ih-unassigned-count");
    if (countEl) countEl.textContent = "View all \u2192";
    fill("ih-unassigned", items.slice(0, newsRowCount()).map(function (b) {
      var pill = "";
      var mc = b.case_slug && MANIFEST.find(function (m) { return m.slug === b.case_slug; });
      if (mc) {
        pill = casePill(mc.slug, mc.short_name || mc.display_name || mc.slug, mc.default_color);
      } else if (b.theme_slug && THEMES[b.theme_slug]) {
        pill = themePill(b.theme_slug);
      } else if (b.group_name) {
        pill = groupPill(b.group_name);
      }
      return row(BASE + "news.html#u=" + encodeURIComponent(b.url),
        fmtDate(b.date) + " \u00b7 " + (b.source || "") + " \u00b7 " + (b.kind || "news"),
        b.title, pill);
    }).join(""));
  }

  var weekOffset = 0;
  var CAL_DAYS_KEY = "ih-cal-days";
  var calDays = 7;   // 7 = next 7 days · 5 = next 5 business days
  try { if (Number(localStorage.getItem(CAL_DAYS_KEY)) === 5) calDays = 5; } catch (e) {}
  function renderDates() {
    var box = document.getElementById("ih-dates");
    if (!box) return;
    var today = todayIso();
    var events = [];
    CASE_DATA.forEach(function (x) {
      if (!caseVisible(x.m)) return;
      var short = x.m.short_name || x.m.display_name || x.m.slug;
      ((x.c && x.c.events) || []).forEach(function (ev) {
        if (ev.date) events.push({ date: ev.date, time: (ev.time || "").trim(), short: short, kind: ev.kind || "", title: ev.title || "", slug: x.m.slug, default_color: x.m.default_color });
      });
      ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
        extractEvents(e, short).forEach(function (ev) {
          events.push({ date: ev.date, short: short, kind: ev.kind, title: ev.title || "", slug: x.m.slug, default_color: x.m.default_color });
        });
      });
    });
    var seen = {};
    events = events.filter(function (ev) {
      var k = ev.date + "|" + ev.short;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    var byDay = {};
    events.forEach(function (ev) { (byDay[ev.date] = byDay[ev.date] || []).push(ev); });

    // Rolling view — the NEXT 7 days from today (+ weekOffset windows), or
    // the next 5 BUSINESS days when the weekday toggle is on. Grid columns stay
    // fixed at calDays; an expanded render just adds more days, which wrap to
    // a 2nd row for free under CSS grid's default row-first flow.
    function isoOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
    var MFULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var DOWL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    function buildDays(totalDays) {
      var start = new Date();
      start.setHours(12, 0, 0, 0);
      start.setDate(start.getDate() + weekOffset * 7);
      var out = [];
      var cur = new Date(start);
      while (out.length < totalDays) {
        if (calDays === 7 || (cur.getDay() !== 0 && cur.getDay() !== 6)) out.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      return out;
    }

    function buildHtml(weeks) {
      var days = buildDays(calDays * Math.max(1, weeks));
      var a = days[0], b = days[days.length - 1];
      // Just the month name(s) — the per-day dates are shown in the grid below.
      var range = a.getMonth() === b.getMonth()
        ? MFULL[a.getMonth()]
        : MFULL[a.getMonth()] + " – " + MFULL[b.getMonth()];

      var h = '<div class="ih-mm-head">' +
        '<button type="button" class="ih-mm-nav" data-wk="-1">‹</button>' +
        '<span class="ih-mm-label">' + range + (weeks > 1 ? ' <span class="ih-wk-2wk">' + weeks + ' weeks</span>' : "") + '</span>' +
        '<span class="ih-wk-tgl">' +
          '<button type="button" data-days="7" class="' + (calDays === 7 ? "on" : "") + '" title="Next 7 days">7d</button>' +
          '<button type="button" data-days="5" class="' + (calDays === 5 ? "on" : "") + '" title="Next 5 business days">5d</button>' +
        '</span>' +
        '<button type="button" class="ih-mm-nav" data-wk="1">›</button></div>';
      h += '<div class="ih-wk-grid' + (weeks > 1 ? " ih-wk-grid-2wk" : "") + '" style="grid-template-columns:repeat(' + calDays + ',1fr)">';
      days.forEach(function (d, di) {
        var iso = isoOf(d);
        var evs = byDay[iso] || [];
        var isToday = iso === today;
        var isWknd = d.getDay() === 0 || d.getDay() === 6;
        // First column of each row carries no divider (calDays per row, so this
        // holds for 5d/7d and for the 2-week layout's second row).
        var rowStart = (di % calDays) === 0;
        var col = '<div class="ih-wk-col' + (isToday ? " today" : "") + (isWknd ? " weekend" : "") +
          (rowStart ? " wk-rowstart" : "") + '">' +
          '<div class="ih-wk-dayhd"><span class="ih-wk-dow">' + DOWL[d.getDay()] + '</span>' +
            '<span class="ih-wk-num">' + d.getDate() + '</span></div>';
        col += evs.slice(0, 4).map(function (ev) {
          var cbg = caseColor(ev.slug, ev.default_color);
          var t = ev.time || "";
          var snippet = ev.title && ev.title !== ev.kind ? ev.title.slice(0, 110) : "";
          var label = (t ? t + " · " : "") + ev.short + (ev.kind ? " — " + ev.kind : "") + (snippet ? ": " + snippet : "");
          return '<a class="ih-wk-ev" style="border-left-color:' + cbg + ';background:' + tint(cbg, 0.14) + '" ' +
            'href="' + BASE + 'calendar.html#case=' + encodeURIComponent(ev.slug) + '&d=' + iso + '" title="' + esc(label) + '">' +
            '<div class="ih-wk-ev-top"><strong>' + esc(ev.short) + '</strong>' +
            (ev.kind ? ' <span class="ih-wk-kind">' + esc(ev.kind) + '</span>' : "") +
            (t ? ' <span class="ih-wk-time">' + esc(t) + '</span>' : "") + '</div>' +
            (snippet ? '<div class="ih-wk-ev-snip">' + esc(snippet) + '</div>' : "") +
            '</a>';
        }).join("");
        if (evs.length > 4) col += '<span class="ih-wk-more">+' + (evs.length - 4) + " more</span>";
        col += "</div>";
        h += col;
      });
      h += "</div>";
      return h;
    }

    function wireControls() {
      box.querySelectorAll(".ih-mm-nav").forEach(function (bn) {
        bn.addEventListener("click", function () {
          weekOffset += Number(bn.getAttribute("data-wk"));
          renderDates();
        });
      });
      box.querySelectorAll(".ih-wk-tgl button").forEach(function (bn) {
        bn.addEventListener("click", function () {
          calDays = Number(bn.getAttribute("data-days")) === 5 ? 5 : 7;
          try { localStorage.setItem(CAL_DAYS_KEY, String(calDays)); } catch (e) {}
          renderDates();
        });
      });
    }

    // Week count is owned by settleBand — the most weeks whose height fits the
    // band. A sparse week now stretches its columns to fill rather than being
    // padded out with a second week of empty days.
    box.innerHTML = buildHtml(calWeeks);
    wireControls();
  }


  function manifestOf(slug) {
    for (var i = 0; i < MANIFEST.length; i++) if (MANIFEST[i].slug === slug) return MANIFEST[i];
    return null;
  }

  function deriveTitle(note) {
    return (note || "").trim().split(/\s+/).slice(0, 3).join(" ");
  }

  var NOTE_ARTIFACT_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

  function renderNotes() {
    var list = NOTES_LIST.filter(function (n) {
      // Older records may lack case_slug — the note key is "slug|entry…" either way.
      var s = n.case_slug || ((n._key || "").split("|")[0] || "");
      if (ARCHIVED_SLUGS[s]) return false;  // hidden while archived, back on un-archive
      if (!n.case_slug) return caseOn("__unassigned__");
      var known = MANIFEST.some(function (m) { return m.slug === n.case_slug; });
      return known ? caseVisibleBySlug(n.case_slug) : true;
    });
    var box = document.getElementById("ih-notes");
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="ih-empty">No notes yet.</div>';
      NOTE_STACK = [];
      return;
    }
    NOTE_STACK = list.slice(0, 20);
    if (noteFront >= NOTE_STACK.length) noteFront = 0;
    box.innerHTML = '<div class="ih-notes-wrap" id="ih-notes-wrap"></div>';
    renderNoteCard();
  }

  function stepNote(dir) {
    if (!NOTE_STACK.length) return;
    noteFront = (noteFront + dir + NOTE_STACK.length) % NOTE_STACK.length;
    renderNoteCard();
  }

  function renderNoteCard() {
    var wrap = document.getElementById("ih-notes-wrap");
    if (!wrap || !NOTE_STACK.length) return;
    var n = NOTE_STACK[noteFront];
    var body = (n.note || "").trim() || n.snippet || "(bookmark)";
    var noteTitle = (n.title && n.title.trim()) || deriveTitle(body);
    var m = manifestOf(n.case_slug);
    var cc = caseColor(n.case_slug, m ? m.default_color : null);
    var tint = NOTE_TINTS[0];
    var artifact = n.entry_number != null ? "Docket No. " + n.entry_number : (n.url ? "News article" : "");
    var when = fmtDate(n.updated_at);
    var caseName = n.case_name || (m && (m.display_name || m.short_name)) || "";
    var canPage = NOTE_STACK.length > 1;
    wrap.innerHTML =
      '<div class="ih-note-card" style="--nc:' + tint.bg + ";--ncd:" + tint.bgd + ";--cc:" + cc + '">' +
        '<a class="ih-note-link" href="' + BASE + 'notes.html#e=' + encodeURIComponent(n._key || "") + '">' +
          '<span class="title">' + esc(noteTitle) + "</span>" +
          (artifact ? '<span class="artifact">' + NOTE_ARTIFACT_ICON + esc(artifact) + "</span>" : "") +
          '<span class="body">' + (when ? "<strong>" + esc(when) + "</strong> \u2014 " : "") + esc(body.slice(0, 1200)) +
          (n.bookmarked ? " \u2605" : "") + "</span>" +
        "</a>" +
        '<div class="ih-note-foot">' +
          '<button type="button" class="ih-note-nav" data-dir="-1"' + (canPage ? "" : " disabled") + ' aria-label="Previous note">\u2190</button>' +
          '<span class="ih-note-counter">' + (noteFront + 1) + " of " + NOTE_STACK.length +
            (caseName ? ' <span class="case">| ' + esc(caseName) + "</span>" : "") + "</span>" +
          '<button type="button" class="ih-note-nav" data-dir="1"' + (canPage ? "" : " disabled") + ' aria-label="Next note">\u2192</button>' +
        "</div>" +
      "</div>";
    wrap.querySelectorAll(".ih-note-nav").forEach(function (btn) {
      btn.addEventListener("click", function () { stepNote(Number(btn.getAttribute("data-dir"))); });
    });
  }

  function renderAll() {
    renderCaseGrid();
    renderProspects();
    renderUnassigned();
    renderDates();
    renderNotes();
    updateFilterButtons();
    // After the siblings have laid out, top the News list up to the tile
    // height so it never renders short with dead space beneath it.
    requestAnimationFrame(function () { fillNewsToHeight(0); });
  }

  // ── Prospects tile — candidate cases from the theme scans ─────────────────
  function prospectSnoozeOptions() {
    var now = new Date();
    function at(d, h) { var x = new Date(d); x.setHours(h, 0, 0, 0); return x; }
    return [
      { label: "Tomorrow morning (9 AM)", when: at(new Date(now.getTime() + 86400e3), 9) },
      { label: "In 3 days (9 AM)", when: at(new Date(now.getTime() + 3 * 86400e3), 9) },
      { label: "Next week (9 AM)", when: at(new Date(now.getTime() + 7 * 86400e3), 9) },
      { label: "In 2 weeks (9 AM)", when: at(new Date(now.getTime() + 14 * 86400e3), 9) },
    ];
  }
  function closeSnoozeMenu() {
    if (snoozeMenuEl && snoozeMenuEl.parentNode) snoozeMenuEl.parentNode.removeChild(snoozeMenuEl);
    snoozeMenuEl = null;
  }
  function saveProspectSnooze(id, iso) {
    return fetch(BASE + "api/prospects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, snooze_until: iso }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "failed");
      PROSPECT_ITEMS.forEach(function (p) { if (p.id === id) { if (iso) p.snooze_until = iso; else delete p.snooze_until; } });
      renderProspects();
    });
  }
  function openSnoozeMenu(id, anchor) {
    closeSnoozeMenu();
    // Rows in this tile are always unsnoozed (the `fresh` filter below hides
    // snoozed ones), so there's no "wake now" case to offer here — that lives
    // on the full triage page (prospects.html) alongside the Snoozed tab.
    var menu = document.createElement("div");
    menu.className = "ud-th-menu";
    prospectSnoozeOptions().forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ud-th-menu-item";
      b.textContent = o.label;
      b.addEventListener("click", function () {
        closeSnoozeMenu();
        saveProspectSnooze(id, o.when.toISOString()).catch(function (e) { alert("Snooze failed: " + e.message); });
      });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 4) + "px";
    menu.style.left = Math.max(8, Math.min(r.left + window.scrollX - 80, window.innerWidth - 210)) + "px";
    snoozeMenuEl = menu;
  }
  function renderProspects() {
    var box = document.getElementById("ih-prospects");
    if (!box) return;
    var nowIso = new Date().toISOString();
    var fresh = PROSPECT_ITEMS.filter(function (p) {
      if (!p || p.status !== "new" || (p.theme && !themeOn(p.theme))) return false;
      if (p.hidden) return false;
      if (p.snooze_until && p.snooze_until > nowIso) return false;
      return true;
    });
    var countEl = document.getElementById("ih-prospects-count");
    if (countEl) countEl.textContent = fresh.length ? fresh.length + " to triage →" : "Triage →";
    if (!fresh.length) {
      box.innerHTML = '<div class="ih-empty">No new prospects — the theme scans surface candidate cases here.</div>';
      return;
    }
    box.innerHTML = fresh.slice(0, 6).map(function (p) {
      var themePillHtml = themePill(p.theme);
      var meta = [p.court, p.case_number].filter(Boolean).join(" · ");
      return (
        '<div class="ih-prospect-row" data-prospect="' + esc(p.id) + '">' +
          '<div class="ih-prospect-main">' +
            '<div class="ih-date">' + themePillHtml + "<span>" + esc(fmtDate(p.date || p.first_seen)) + (meta ? " · " + esc(meta) : "") + "</span></div>" +
            '<div class="ih-text"><strong>' + esc(p.case_name) + "</strong> — " + esc(p.why || "") +
              (p.source_url ? ' <a href="' + esc(p.source_url) + '" target="_blank" rel="noopener">' + esc(p.source_name || "source") + " ↗</a>" : "") +
            "</div>" +
          "</div>" +
          '<div class="ih-prospect-actions">' +
            '<a class="ih-pr-btn ih-pr-track" href="' + BASE + 'prospects.html#track=' + encodeURIComponent(p.id) + '">Track</a>' +
            '<button type="button" class="ih-pr-btn ih-pr-snooze" data-snooze="' + esc(p.id) + '" title="Snooze — resurface later">Snooze</button>' +
            '<button type="button" class="ih-pr-btn ih-pr-dismiss" data-dismiss="' + esc(p.id) + '">Dismiss</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");
    box.querySelectorAll("[data-snooze]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        openSnoozeMenu(b.getAttribute("data-snooze"), b);
      });
    });
    box.querySelectorAll("[data-dismiss]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-dismiss");
        b.disabled = true;
        b.textContent = "…";
        fetch(BASE + "api/prospects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: id, status: "dismissed" }),
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || "failed");
          PROSPECT_ITEMS.forEach(function (p) { if (p.id === id) p.status = "dismissed"; });
          renderProspects();
        }).catch(function () {
          b.disabled = false;
          b.textContent = "Dismiss";
        });
      });
    });
  }

  // ── Filter dropdowns ──────────────────────────────────────────────────────
  function updateFilterButtons() {
    var cb = document.getElementById("ih-cases-btn");
    if (cb && MANIFEST.length) {
      var on = MANIFEST.filter(function (m) { return caseOn(m.slug); }).length;
      cb.textContent = on === MANIFEST.length ? "Cases: All" : "Cases: " + on + "/" + MANIFEST.length;
      cb.classList.toggle("filtered", on !== MANIFEST.length);
    }
    var tb = document.getElementById("ih-themes-btn");
    if (tb) {
      var tslugs = themePillOrder();
      var ton = tslugs.filter(themeOn).length;
      var tall = !tslugs.length || ton === tslugs.length;
      tb.textContent = tall ? "Themes: All" : "Themes: " + ton + "/" + tslugs.length;
      tb.classList.toggle("filtered", !tall);
    }
    paintThemePills();
    reflowThemeFilter();
  }

  // Theme filter shows the pills inline while they fit on one row; the moment
  // they'd wrap, collapse them into the "Themes" dropdown. Measured (not a fixed
  // breakpoint) so it adapts to however many themes are configured.
  function reflowThemeFilter() {
    var controls = document.querySelector(".ih-controls");
    var pills = document.getElementById("ih-theme-pills");
    var wrap = document.getElementById("ih-themes-wrap");
    var panel = document.getElementById("ih-themes-panel");
    var btn = document.getElementById("ih-themes-btn");
    if (!controls || !pills || !wrap || !panel) return;
    if (btn && btn.classList.contains("open")) return;  // don't reshuffle while the menu is open
    // Measure with the pills inline.
    if (pills.parentNode !== controls) controls.insertBefore(pills, controls.firstChild);
    wrap.style.display = "none";
    var prev = pills.style.flexWrap;
    pills.style.flexWrap = "nowrap";
    var need = pills.scrollWidth;
    pills.style.flexWrap = prev;
    var gap = parseFloat(getComputedStyle(controls).columnGap) || 10;
    [].forEach.call(controls.children, function (c) {
      if (c === pills || c === wrap) return;
      if (getComputedStyle(c).display === "none") return;
      need += c.getBoundingClientRect().width + gap;
    });
    if (need > controls.clientWidth + 1) {   // wouldn't fit on one line → collapse
      panel.appendChild(pills);
      wrap.style.display = "";
    }
  }

  // ── Inline theme pills (press-page style: black = on, outline = off) ──────
  function themePillOrder() {
    var seen = {};
    var order = [];
    THEME_ORDER.forEach(function (s) { if (THEMES[s]) { order.push(s); seen[s] = 1; } });
    Object.keys(THEMES).forEach(function (s) { if (!seen[s]) order.push(s); });
    return order;
  }

  function themeHasSelection() {
    if (focusTheme) return true;
    for (var k in stickyThemes) if (stickyThemes[k]) return true;
    return false;
  }
  // Rebuild activeThemes from the pinned set + the focused theme. No selection
  // at all = show everything (the "All" state).
  function applyThemeState() {
    themePillOrder().forEach(function (s) {
      activeThemes[s] = !themeHasSelection() || !!stickyThemes[s] || s === focusTheme;
    });
    saveFilters();
    renderAll();
  }
  function themePillSingle(key) {
    if (key === "__all__") { stickyThemes = {}; focusTheme = null; }
    else if (stickyThemes[key]) { delete stickyThemes[key]; }   // single-click a pin unpins it
    else { focusTheme = key; }                                   // isolate to this theme (+ any pins)
    applyThemeState();
  }
  function themePillDouble(key) {
    if (key === "__all__") { stickyThemes = {}; focusTheme = null; }
    else if (stickyThemes[key]) { delete stickyThemes[key]; }    // unpin
    else { stickyThemes[key] = true; if (focusTheme === key) focusTheme = null; }  // pin (additive)
    applyThemeState();
  }

  function paintThemePills() {
    var box = document.getElementById("ih-theme-pills");
    if (!box) return;
    var slugs = themePillOrder();
    var allOn = slugs.every(themeOn);
    var html = '<button type="button" class="ih-tp-btn' + (allOn ? " on" : "") + '" data-tp="__all__" title="Show all themes">All</button>';
    slugs.forEach(function (s) {
      var t = themeOf(s);
      var pin = !!stickyThemes[s];
      html += '<button type="button" class="ih-tp-btn' + (!allOn && themeOn(s) ? " on" : "") + (pin ? " pin" : "") + '" data-tp="' + esc(s) + '"' +
        ' title="' + (pin ? "Pinned — stays selected. Click to unpin." : "Click to focus this theme · double-click to pin (multi-select)") + '">' +
        (SHOW_THEME_EMOJIS && t.emoji ? t.emoji + " " : "") + esc(t.name) + "</button>";
    });
    box.innerHTML = html;
    // Single vs. double click: delay the single-click action briefly so a
    // double-click can cancel it (a double fires two clicks + a dblclick).
    var pillTimer = null;
    box.querySelectorAll("[data-tp]").forEach(function (b) {
      var key = b.getAttribute("data-tp");
      b.addEventListener("click", function () {
        if (pillTimer) clearTimeout(pillTimer);
        pillTimer = setTimeout(function () { pillTimer = null; themePillSingle(key); }, 200);
      });
      b.addEventListener("dblclick", function () {
        if (pillTimer) { clearTimeout(pillTimer); pillTimer = null; }
        themePillDouble(key);
      });
    });
  }

  function buildCasesPanel(panel) {
    var groups = loadGroups();
    var html =
      '<div class="ih-dd-quick-row">' +
        '<button type="button" data-all="1">Select all</button>' +
        '<button type="button" data-none="1">Deselect all</button>' +
      "</div>";
    if (groups.length) {
      html += '<div class="ih-dd-title">Groups</div>';
      groups.forEach(function (g, i) {
        html += '<button type="button" class="ih-dd-group" data-grp="' + i + '">' + esc(g.name) + " only</button>";
      });
    }
    html += '<div class="ih-dd-title">Cases</div>';
    MANIFEST.forEach(function (m) {
      html +=
        '<label class="ih-dd-row">' +
          '<input type="checkbox" data-case="' + esc(m.slug) + '"' + (caseOn(m.slug) ? " checked" : "") + ">" +
          casePill(m.slug, m.short_name || m.display_name || m.slug, m.default_color) +
          '<span style="flex:1"></span>' +
          '<button type="button" class="ih-sync-case" data-sync-slug="' + esc(m.slug) + '" title="Sync now — fresh docket entries + a news search; the briefing refreshes if it’s older than 12 hours"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg></button>' +
        "</label>";
    });
    html +=
      '<label class="ih-dd-row">' +
        '<input type="checkbox" data-case="__unassigned__"' + (caseOn("__unassigned__") ? " checked" : "") + ">" +
        '<span class="ih-pill" style="background:transparent;color:var(--ink-60);border:1px dashed var(--ink-60)">Uncategorized notes</span>' +
      "</label>";
    panel.innerHTML = html;

    panel.querySelector("[data-all]").addEventListener("click", function () {
      MANIFEST.forEach(function (m) { activeCases[m.slug] = true; });
      activeCases.__unassigned__ = true;
      saveFilters(); buildCasesPanel(panel); renderAll();
    });
    panel.querySelector("[data-none]").addEventListener("click", function () {
      MANIFEST.forEach(function (m) { activeCases[m.slug] = false; });
      activeCases.__unassigned__ = false;
      saveFilters(); buildCasesPanel(panel); renderAll();
    });
    panel.querySelectorAll("[data-grp]").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = loadGroups()[Number(b.getAttribute("data-grp"))];
        if (!g) return;
        var members = {};
        (g.slugs || []).forEach(function (s) { members[s] = true; });
        MANIFEST.forEach(function (m) { activeCases[m.slug] = !!members[m.slug]; });
        activeCases.__unassigned__ = false;
        saveFilters(); buildCasesPanel(panel); renderAll();
      });
    });
    panel.querySelectorAll("[data-case]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeCases[cb.getAttribute("data-case")] = cb.checked;
        saveFilters(); renderAll();
      });
    });
    panel.querySelectorAll("[data-case-gear]").forEach(function (g) {
      g.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openCasePopover(g.getAttribute("data-case-gear"), g);
      });
    });
    panel.querySelectorAll("[data-sync-slug]").forEach(function (s) {
      s.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        runManualSync(s.getAttribute("data-sync-slug"), s);
      });
    });
  }

  function wireDropdown(btnId, panelId, builder) {
    var btn = document.getElementById(btnId);
    var panel = document.getElementById(panelId);
    if (!btn || !panel) return;
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var open = panel.style.display !== "none";
      document.querySelectorAll(".ih-dd-panel").forEach(function (p) { p.style.display = "none"; });
      document.querySelectorAll(".ih-dd-btn").forEach(function (b) { b.classList.remove("open"); });
      if (!open) {
        builder(panel);
        panel.style.display = "block";
        btn.classList.add("open");
      }
    });
    document.addEventListener("click", function (ev) {
      if (panel.style.display === "none") return;
      if (ev.target && !ev.target.isConnected) return;
      if (panel.contains(ev.target) || btn.contains(ev.target)) return;
      panel.style.display = "none";
      btn.classList.remove("open");
    });
  }

  // Re-pull the briefings and repaint the grid — called on load and again
  // when a watched Sync/Brief run finishes, so the fresh briefing appears
  // without a manual reload (cache-busted: the runs land minutes apart).
  function reloadBriefings() {
    return fetchJson(BASE + "case-briefings.json?ts=" + Date.now()).then(function (d) {
      BRIEFING_ITEMS = ((d && d.items) || []).slice();
      renderCaseGrid();
      updateFilterButtons();
    }).catch(function () { renderCaseGrid(); });
  }

  // ── Loads ─────────────────────────────────────────────────────────────────
  reloadBriefings();

  // Briefing groups: live API first, static build copy as fallback.
  fetchJson(BASE + "api/briefing-groups")
    .then(function (p) { return (p && p.ok && p.groups) || []; })
    .catch(function () {
      return fetchJson(BASE + "briefing-groups.json")
        .then(function (f) { return (f && f.groups) || []; })
        .catch(function () { return []; });
    })
    .then(function (groups) {
      BRIEFING_GROUPS = groups;
      renderCaseGrid();
    });

  // Admin-managed theme names/emojis + the global emoji toggle (slim
  // projection written by /api/admin/themes).
  fetchJson(BASE + "themes.json").then(function (d) {
    try { localStorage.setItem("ih-themes-cache", JSON.stringify(d || {})); } catch (e) {}
    SHOW_THEME_EMOJIS = !d || d.show_emojis !== false;
    ((d && d.themes) || []).forEach(function (t) {
      if (!t || !t.slug) return;
      var cur = THEMES[t.slug] || { bg: "#E0E7FF", fg: "#3730a3" };
      cur.name = t.display_name || cur.name || t.slug;
      cur.emoji = t.emoji || cur.emoji || "";
      THEMES[t.slug] = cur;
    });
    renderCaseGrid();
    if (typeof renderUnassigned === "function") renderUnassigned();
  }).catch(function () {});

  // Prospects: live API first (fresh triage state), static file as fallback.
  fetchJson(BASE + "api/prospects")
    .then(function (p) { return (p && p.ok && p.items) || []; })
    .catch(function () {
      return fetchJson(BASE + "prospects.json")
        .then(function (f) { return (f && f.items) || []; })
        .catch(function () { return []; });
    })
    .then(function (items) {
      PROSPECT_ITEMS = items;
      renderProspects();
    });

  fetchJson(BASE + "cases/data/_manifest.json").then(function (man) {
    // Archived cases are hidden from every reader-facing view (Settings still lists them).
    (man || []).forEach(function (m) { if ((m.sync || "active") === "archived") ARCHIVED_SLUGS[m.slug] = true; });
    MANIFEST = (man || []).filter(function (m) { return (m.sync || "active") !== "archived"; });
    renderCaseGrid();
    // One compact ~90-day summary instead of a 23-file/~5.5 MB fan-out — the
    // dashboard only ever renders recent filings + upcoming events anyway.
    return fetchJson(BASE + "cases/data/_summary.json");
  }).then(function (summaries) {
    var bySlug = {};
    (summaries || []).forEach(function (c) { bySlug[c.slug] = c; });
    CASE_DATA = MANIFEST.map(function (m) {
      return { m: m, c: bySlug[m.slug] || {} };
    });
    COVERAGE_ITEMS = coverageFeedItems();
    rebuildFeed();
    renderCaseGrid();
    renderDates();
    renderNotes();
    updateFilterButtons();
  }).catch(function () {
    fill("ih-docket", "");
    fill("ih-calendar", "");
  });

  // The tile is "latest news", so it merges BOTH sources the news page uses:
  // the bondoro feed and each case's own coverage (which is where case-tagged
  // reporting lands — it used to be missing here entirely).
  var BONDORO_ITEMS = [];
  var COVERAGE_ITEMS = [];
  function rebuildFeed() {
    var seen = {};
    FEED_ITEMS = BONDORO_ITEMS.concat(COVERAGE_ITEMS).filter(function (b) {
      var u = b && b.url;
      if (!u || seen[u]) return false;
      seen[u] = 1;
      return true;
    }).sort(function (a, b) {
      return (b.published_at || b.date || "").localeCompare(a.published_at || a.date || "");
    });
    renderCaseGrid();
    renderUnassigned();
  }
  function coverageFeedItems() {
    var out = [];
    (CASE_DATA || []).forEach(function (cd) {
      var slug = cd && cd.m && cd.m.slug;
      var cov = (cd && cd.c && cd.c.coverage) || [];
      if (!slug) return;
      cov.forEach(function (a) {
        var dt = String((a && a.date) || "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)) return;  // seeded pretty dates don't sort
        if (!a.url || !(a.headline || a.title)) return;
        out.push({
          title: a.headline || a.title,
          url: a.url,
          source: a.source || "",
          kind: "news",
          date: dt,
          published_at: dt,
          case_slug: slug,
        });
      });
    });
    return out;
  }

  fetchJson(BASE + "bondoro.json").then(function (d) {
    BONDORO_ITEMS = ((d && d.items) || []).slice();
    rebuildFeed();
  }).catch(function () { rebuildFeed(); });

  fetchJson(BASE + "api/notes")
    .then(function (p) { return (p && p.ok && p.entries) || {}; })
    .catch(function () {
      return fetchJson(BASE + "intel-notes.json")
        .then(function (f) { return (f && f.entries) || {}; })
        .catch(function () { return {}; });
    })
    .then(function (en) {
      NOTES_LIST = Object.keys(en).map(function (k) { var v = en[k]; v._key = k; return v; })
        .filter(function (n) { return !n.deleted_at && ((n.note || "").trim() || n.bookmarked); })
        .sort(function (a, b) { return (b.updated_at || "").localeCompare(a.updated_at || ""); });
      renderNotes();
    });

  // Admin theme names — display follows /admin/intelligence renames
  fetchJson(BASE + "themes.json").then(function (d) {
    ((d && d.themes) || []).forEach(function (t) {
      if (!t || !t.slug) return;
      var cur = THEMES[t.slug] || { bg: "#E0E7FF", fg: "#3730a3", emoji: "\ud83d\udcf0", name: t.slug };
      if (t.display_name) cur.name = t.display_name;
      if (t.emoji) cur.emoji = t.emoji;
      THEMES[t.slug] = cur;
    });
    renderAll();
  }).catch(function () {});

  // Roaming colors: hydrate the shared store so pills match other devices
  fetchJson(BASE + "api/prefs").then(function (p) {
    if (p && p.ok && p.colors) {
      Object.keys(p.colors).forEach(function (k) { savedColors[k] = p.colors[k]; });
      try { localStorage.setItem("ud-case-colors", JSON.stringify(savedColors)); } catch (e) {}
    }
    if (p && p.ok && Array.isArray(p.presets) && p.presets.length === 12) {
      try { localStorage.setItem("ud-swatch-presets", JSON.stringify(p.presets)); } catch (e) {}
    }
    if (p && p.ok && Array.isArray(p.theme_presets) && p.theme_presets.length === 12) {
      try { localStorage.setItem("ud-theme-presets", JSON.stringify(p.theme_presets)); } catch (e) {}
    }
    if (p && p.ok && Array.isArray(p.groups)) {
      try { localStorage.setItem("ud-case-groups", JSON.stringify(p.groups)); } catch (e) {}
    }
    if (p && p.ok && p.priorities && typeof p.priorities === "object") {
      savedPriorities = {};
      Object.keys(p.priorities).forEach(function (k) { if (p.priorities[k]) savedPriorities[k] = true; });
      persistPriorities();
    }
    if (p && p.ok) renderAll();
  }).catch(function () {});

  // Briefings carousel — 3 cards visible, arrows scroll one page (≈3 cards).
  function wireCarousel() {
    var track = document.getElementById("ih-theme-grid");
    var prev = document.getElementById("ih-carousel-prev");
    var next = document.getElementById("ih-carousel-next");
    if (!track || !prev || !next) return;
    function step() { return Math.max(track.clientWidth, 240); }
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
    function sync() {
      var overflow = track.scrollWidth - track.clientWidth > 4;
      prev.style.display = next.style.display = overflow ? "" : "none";
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    }
    track.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    // Re-check after each theme render (cards populate asynchronously).
    _carouselSync = sync;
    sync();
  }
  var _carouselSync = function () {};

  // Card-arrangement control (Activity / A–Z / Priority / Theme / date).
  // Clicking the active A–Z or Newest/Oldest button again flips its direction.
  function wireSortBar() {
    var bar = document.getElementById("ih-sort");
    if (!bar) return;
    function paint() {
      bar.querySelectorAll("[data-sort]").forEach(function (b) {
        var mode = b.getAttribute("data-sort");
        b.classList.toggle("on", mode === sortMode);
        if (mode === "az") {
          b.textContent = azDir === "asc" ? "A–Z" : "Z–A";
          b.title = "Alphabetical by case name — click again to flip to " + (azDir === "asc" ? "Z–A" : "A–Z");
        }
        if (mode === "date") {
          b.textContent = dateDir === "desc" ? "Newest" : "Oldest";
          b.title = "By when the case was added — click again to flip to " + (dateDir === "desc" ? "oldest first" : "newest first");
        }
      });
    }
    bar.querySelectorAll("[data-sort]").forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-sort");
        if (mode === sortMode && mode === "az") {
          azDir = azDir === "asc" ? "desc" : "asc";
          try { localStorage.setItem("ih-sort-az-dir", azDir); } catch (e) {}
        } else if (mode === sortMode && mode === "date") {
          dateDir = dateDir === "desc" ? "asc" : "desc";
          try { localStorage.setItem("ih-sort-date-dir", dateDir); } catch (e) {}
        }
        sortMode = mode;
        try { localStorage.setItem("ud-case-sort", sortMode); } catch (e) {}
        paint();
        renderCaseGrid();
      });
    });
    paint();
  }

  // ── ⌘K case palette + S-then-A show-all (same behavior as the docket) ─────
  var palEl = null;
  var palIdx = 0;
  var palEntries = [];

  function paletteApply(slug) {
    closePalette();
    MANIFEST.forEach(function (m) { activeCases[m.slug] = slug === null ? true : m.slug === slug; });
    activeCases.__unassigned__ = slug === null;
    // Solo-filtering must always SHOW the pick — open every theme lens too.
    Object.keys(THEMES).forEach(function (s) { activeThemes[s] = true; });
    saveFilters();
    renderAll();
  }

  function closePalette() {
    if (palEl && palEl.parentNode) palEl.parentNode.removeChild(palEl);
    palEl = null;
    palEntries = [];
    palIdx = 0;
  }

  function paletteMatches(q) {
    q = (q || "").toLowerCase().trim();
    var out = [];
    MANIFEST.forEach(function (m) {
      var label = m.short_name || m.display_name || m.slug;
      if (!q ||
          (m.display_name || "").toLowerCase().indexOf(q) !== -1 ||
          label.toLowerCase().indexOf(q) !== -1 ||
          (m.slug || "").toLowerCase().indexOf(q) !== -1) {
        out.push({ slug: m.slug, label: m.display_name || label, note: m.slug });
      }
    });
    return out.slice(0, 14);
  }

  function paletteRender(q) {
    var ul = palEl.querySelector(".ud-pal-list");
    palEntries = paletteMatches(q);
    if (palIdx >= palEntries.length) palIdx = Math.max(0, palEntries.length - 1);
    ul.innerHTML = palEntries.length
      ? palEntries.map(function (e, i) {
          return '<li class="ud-pal-item' + (i === palIdx ? " ud-pal-cur" : "") + '" data-idx="' + i + '">' +
            esc(e.label) + ' <span class="ud-pal-slug">' + esc(e.note) + "</span></li>";
        }).join("")
      : '<li class="ud-pal-empty">No case matches.</li>';
    ul.querySelectorAll("[data-idx]").forEach(function (li) {
      li.addEventListener("click", function () {
        paletteApply(palEntries[Number(li.getAttribute("data-idx"))].slug);
      });
    });
  }

  function openPalette() {
    if (palEl || !MANIFEST.length) return;
    var wrap = document.createElement("div");
    wrap.className = "ud-pal-overlay";
    wrap.innerHTML =
      '<div class="ud-pal-box">' +
        '<input type="text" class="ud-pal-input" placeholder="Filter the dashboard to a case…" aria-label="Filter to a case">' +
        '<ul class="ud-pal-list"></ul>' +
        '<div class="ud-pal-hint">↑↓ choose · Enter filters to that case · Esc closes · S then A shows all</div>' +
      "</div>";
    document.body.appendChild(wrap);
    palEl = wrap;
    var input = wrap.querySelector(".ud-pal-input");
    paletteRender("");
    input.focus();
    input.addEventListener("input", function () { palIdx = 0; paletteRender(input.value); });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); palIdx = Math.min(palEntries.length - 1, palIdx + 1); paletteRender(input.value); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); palIdx = Math.max(0, palIdx - 1); paletteRender(input.value); }
      else if (ev.key === "Enter") { ev.preventDefault(); if (palEntries[palIdx]) paletteApply(palEntries[palIdx].slug); }
      else if (ev.key === "Escape") { closePalette(); }
    });
    wrap.addEventListener("mousedown", function (ev) { if (ev.target === wrap) closePalette(); });
  }

  function wireShortcuts() {
    var sAt = 0;
    document.addEventListener("keydown", function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && (ev.key === "k" || ev.key === "K")) {
        ev.preventDefault();
        openPalette();
        return;
      }
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var t = ev.target || {}, tag = (t.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable) return;
      var k = (ev.key || "").toLowerCase();
      var now = Date.now();
      if (k === "s") { sAt = now; return; }
      if (k === "a" && sAt && now - sAt < 900) {
        ev.preventDefault();
        sAt = 0;
        paletteApply(null);   // show all cases + all themes
        return;
      }
      sAt = 0;
    });
  }

  // ── Briefing-groups editor — consolidate cases into one briefing unit ─────
  var grpEl = null;

  function closeGroupEditor() {
    if (grpEl && grpEl.parentNode) grpEl.parentNode.removeChild(grpEl);
    grpEl = null;
  }

  function slugifyGroup(name) {
    return String(name || "").toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  }

  function saveGroupsList(groups, status) {
    status.textContent = "Saving…";
    return fetch(BASE + "api/briefing-groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: groups }),
    }).then(function (r) {
      if (r.status === 429) throw new Error("Cloudflare rate limit hit — wait a minute and retry (the WAF rule needs loosening for /intel/api).");
      return r.json().catch(function () {
        throw new Error("Unexpected non-JSON response (" + r.status + ") — likely the WAF rate-limit page. Wait a minute and retry.");
      });
    }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "save failed");
      BRIEFING_GROUPS = j.groups;
      renderAll();
      return true;
    });
  }

  function openGroupEditor() {
    closeGroupEditor();
    var grouped = {};
    BRIEFING_GROUPS.forEach(function (g) {
      (g.members || []).forEach(function (m) { grouped[m] = g.name; });
    });
    var existing = BRIEFING_GROUPS.length
      ? BRIEFING_GROUPS.map(function (g, gi) {
          var names = (g.members || []).map(function (s) {
            var m = MANIFEST.find(function (x) { return x.slug === s; });
            return m ? (m.short_name || m.display_name) : s;
          }).join(", ");
          return '<div class="ih-grp-row"><strong>' + esc(g.name) + "</strong> — " + esc(names) +
            ' <button type="button" class="ih-grp-del" data-del="' + gi + '" title="Ungroup — members go back to their own briefings">×</button></div>';
        }).join("")
      : '<div class="ih-grp-none">No groups yet.</div>';
    var checks = MANIFEST.map(function (m) {
      var taken = grouped[m.slug];
      return '<label class="ih-grp-check' + (taken ? " taken" : "") + '">' +
        '<input type="checkbox" value="' + esc(m.slug) + '"' + (taken ? " disabled" : "") + "> " +
        esc(m.short_name || m.display_name || m.slug) +
        (taken ? ' <span class="ih-grp-taken">(' + esc(taken) + ")</span>" : "") +
      "</label>";
    }).join("");

    var wrap = document.createElement("div");
    wrap.className = "ih-grp-overlay";
    wrap.innerHTML =
      '<div class="ih-grp-box">' +
        "<h2>Briefing groups</h2>" +
        '<p class="ih-grp-sub">Grouped cases are briefed TOGETHER — one card, one briefing, generated from whichever members are actually moving. Groups don\'t affect themes or the sort groupings.</p>' +
        '<div class="ih-grp-list">' + existing + "</div>" +
        '<div class="ih-grp-newhead">New group</div>' +
        '<input type="text" class="ih-grp-name" placeholder="Group name (e.g. Hachette Suits) — becomes the pill label">' +
        '<div class="ih-grp-checks">' + checks + "</div>" +
        '<div class="ih-grp-actions">' +
          '<span class="ih-grp-status"></span>' +
          '<button type="button" class="pr-btn" data-grp-cancel>Close</button>' +
          '<button type="button" class="pr-btn pr-btn-track" data-grp-create>Create group</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap);
    grpEl = wrap;
    var status = wrap.querySelector(".ih-grp-status");

    wrap.addEventListener("mousedown", function (ev) { if (ev.target === wrap) closeGroupEditor(); });
    wrap.querySelector("[data-grp-cancel]").addEventListener("click", closeGroupEditor);
    wrap.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var next = BRIEFING_GROUPS.filter(function (_, i) { return i !== Number(b.getAttribute("data-del")); });
        saveGroupsList(next, status).then(function () { openGroupEditor(); })
          .catch(function (e) { status.textContent = e.message; });
      });
    });
    wrap.querySelector("[data-grp-create]").addEventListener("click", function () {
      var name = wrap.querySelector(".ih-grp-name").value.trim();
      var members = Array.prototype.slice.call(wrap.querySelectorAll(".ih-grp-checks input:checked"))
        .map(function (c) { return c.value; });
      if (!name) { status.textContent = "Give the group a name."; return; }
      if (members.length < 2) { status.textContent = "Pick at least 2 cases."; return; }
      var id = slugifyGroup(name);
      if (!id) { status.textContent = "Name needs some letters or numbers."; return; }
      if (MANIFEST.some(function (m) { return m.slug === id; }) ||
          BRIEFING_GROUPS.some(function (g) { return g.id === id; })) {
        status.textContent = "That name collides with an existing case or group.";
        return;
      }
      var next = BRIEFING_GROUPS.concat([{ id: id, name: name, members: members }]);
      saveGroupsList(next, status).then(function () {
        status.textContent = "Group created — its consolidated briefing generates on the next run.";
        setTimeout(closeGroupEditor, 1400);
      }).catch(function (e) { status.textContent = e.message; });
    });
  }

  // Cards ⇄ List view toggle for the briefing grid.
  function wireViewToggle() {
    var tgl = document.getElementById("ih-view-tgl");
    if (!tgl) return;
    function paint() {
      tgl.querySelectorAll("[data-view]").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-view") === briefView);
      });
    }
    tgl.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        briefView = b.getAttribute("data-view") === "list" ? "list" : "cards";
        try { localStorage.setItem("ih-brief-view", briefView); } catch (e) {}
        paint();
        renderCaseGrid();
      });
    });
    paint();
  }

  // Drag the boundaries between the News / Calendar / Notes tiles to resize
  // them. Persists the column fractions; only active in the wide 3-column
  // layout (the narrow layout stacks and hides the grips).
  function wireBandResize() {
    var band = document.querySelector(".ih-band");
    if (!band) return;
    var tiles = Array.prototype.filter.call(band.children, function (el) {
      return el.classList && el.classList.contains("ih-tile") && !el.classList.contains("ih-tile-full");
    });
    if (tiles.length < 2) return;
    var fr;
    try {
      var saved = JSON.parse(localStorage.getItem("ih-band-cols") || "null");
      if (Array.isArray(saved) && saved.length === tiles.length &&
          saved.every(function (n) { return typeof n === "number" && n > 0; })) fr = saved.slice();
    } catch (e) {}
    if (!fr) fr = tiles.map(function (_, i) { return i === 1 ? 2 : 1; });   // News 1 · Calendar 2 · Notes 1
    function applyCols() {
      band.style.setProperty("--band-cols", fr.map(function (f) { return f.toFixed(3) + "fr"; }).join(" "));
    }
    applyCols();
    tiles.forEach(function (tile, i) {
      if (i >= tiles.length - 1) return;                  // no grip after the last tile
      if (tile.querySelector(".ih-band-grip")) return;
      var grip = document.createElement("div");
      grip.className = "ih-band-grip";
      grip.title = "Drag to resize";
      tile.appendChild(grip);
      grip.addEventListener("mousedown", function (e) {
        if (window.matchMedia("(max-width: 1100px)").matches) return;   // stacked layout
        e.preventDefault();
        grip.classList.add("on");
        document.body.style.cursor = "col-resize";
        var startX = e.clientX;
        var bandW = band.getBoundingClientRect().width || 1;
        var total = fr.reduce(function (a, b) { return a + b; }, 0);
        var pairSum = fr[i] + fr[i + 1];
        var f0 = fr[i];
        function mv(ev) {
          var dFr = (ev.clientX - startX) / bandW * total;
          var nf0 = Math.max(0.4, Math.min(pairSum - 0.4, f0 + dFr));   // keep the adjacent pair's total fixed
          fr[i] = nf0;
          fr[i + 1] = pairSum - nf0;
          applyCols();
        }
        function up() {
          document.removeEventListener("mousemove", mv);
          document.removeEventListener("mouseup", up);
          grip.classList.remove("on");
          document.body.style.cursor = "";
          try { localStorage.setItem("ih-band-cols", JSON.stringify(fr)); } catch (e2) {}
        }
        document.addEventListener("mousemove", mv);
        document.addEventListener("mouseup", up);
      });
    });
  }

  // Drag vertically to resize the News/Calendar/Notes band. The grip sets one
  // pixel height (bandH); the tiles absorb the slack and add a row/week only
  // when a whole one fits — see applyBandH/settleBand above. Same interaction
  // shape as wireBandResize, committed to localStorage on release.
  function wireBandRowResize() {
    var grip = document.getElementById("ih-band-vgrip");
    if (!grip) return;
    grip.addEventListener("mousedown", function (e) {
      if (bandStacked()) return;          // stacked layout: nothing to resize
      e.preventDefault();
      grip.classList.add("on");
      document.body.style.cursor = "row-resize";
      // 1:1 with the cursor. The old sweep mapped 260px of travel onto the
      // whole range, so the band moved ~2.7x faster than the mouse — half of
      // why it felt jumpy.
      var startY = e.clientY, startH = bandH, pendingH = bandH, rafId = 0;
      function frame() {
        rafId = 0;
        if (pendingH === bandH) return;
        bandH = pendingH;
        applyBandH();                     // continuous: rows breathe open
        if (bandNeedsSettle()) settleBand();   // discrete: a row/week lands
      }
      function mv(ev) {
        pendingH = Math.max(BAND_MIN_H, Math.min(BAND_MAX_H, startH + (ev.clientY - startY)));
        if (!rafId) rafId = requestAnimationFrame(frame);   // 1 write per frame
      }
      function up() {
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        bandH = pendingH;
        grip.classList.remove("on");
        document.body.style.cursor = "";
        bandLevel = Math.max(0, Math.min(1, (bandH - BAND_MIN_H) / (BAND_MAX_H - BAND_MIN_H)));
        try { localStorage.setItem(BAND_ROWS_KEY, String(bandLevel)); } catch (e2) {}
        settleBand();                     // final exact fit on release
      }
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
    });
  }

  // ── Manual sync: pull fresh docket + news for one case, refresh its
  // briefing if the last one is more than 12h old (manual-case-sync.yml). ──
  function buildSyncPanel(panel) {
    var sorted = MANIFEST.slice().sort(function (a, b) {
      return (a.short_name || a.display_name || "").localeCompare(b.short_name || b.display_name || "");
    });
    var html = '<div class="ih-dd-title">Sync a case</div>';
    html += sorted.map(function (m) {
      return '<button type="button" class="ih-dd-row" data-sync-slug="' + esc(m.slug) + '" style="width:100%;background:none;border:none;font-family:inherit">' +
        casePill(m.slug, m.short_name || m.display_name || m.slug, m.default_color) +
      "</button>";
    }).join("");
    panel.innerHTML = html || '<div class="ih-empty">No cases tracked yet.</div>';
    panel.querySelectorAll("[data-sync-slug]").forEach(function (row) {
      row.addEventListener("click", function () {
        panel.style.display = "none";
        runManualSync(row.getAttribute("data-sync-slug"));
      });
    });
  }
  // Live run state per case — drives the ⟳ / ✓ / ⚠ badge next to each
  // card's action buttons. Failures persist (with the failing step in the
  // tooltip, click-through to the Actions log) until a newer run clears them.
  var RUN_STATES = {};

  function paintRunBadge(slug) {
    var st = RUN_STATES[slug];
    document.querySelectorAll('[data-run-status="' + slug + '"]').forEach(function (el) {
      if (!st) { el.innerHTML = ""; el.removeAttribute("title"); el.onclick = null; return; }
      var url = st.run && st.run.html_url;
      if (st.state === "queued" || st.state === "running") {
        el.innerHTML = '<span class="run-spin">⟳</span>';
        el.setAttribute("title", window.IntelSync ? IntelSync.describe(st) : "Running…");
        el.onclick = null;
      } else if (st.state === "success") {
        el.innerHTML = '<span class="run-ok">✓</span>';
        el.setAttribute("title", (window.IntelSync ? IntelSync.label(st.run) : "Run") + " finished — fresh data lands on the page shortly.");
        el.onclick = null;
      } else {
        el.innerHTML = '<span class="run-err">⚠</span>';
        el.setAttribute("title", st.msg || (window.IntelSync ? IntelSync.describe(st) : "Failed"));
        el.onclick = url ? function (ev) { ev.preventDefault(); ev.stopPropagation(); window.open(url, "_blank"); } : null;
      }
    });
  }
  function paintRunBadges() {
    Object.keys(RUN_STATES).forEach(paintRunBadge);
  }

  function runCaseAction(kind, slug) {
    if (!window.IntelSync) return;
    var call = kind === "brief" ? IntelSync.briefCase : IntelSync.syncCase;
    RUN_STATES[slug] = { state: "queued" };
    paintRunBadge(slug);
    call(slug).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        RUN_STATES[slug] = { state: "failure", msg: "Session expired — reload the page and sign in again" };
        paintRunBadge(slug);
      } else if (!(res.body && res.body.ok)) {
        RUN_STATES[slug] = { state: "failure", msg: (res.body && res.body.error) || "Dispatch failed" };
        paintRunBadge(slug);
      } else {
        IntelSync.watch(slug, kind === "brief" ? ["briefing"] : ["manual-sync", "docket-sync"], function (st) {
          RUN_STATES[slug] = st;
          paintRunBadge(slug);
          if (st.state === "success") {
            // The run pushed fresh case-briefings.json — pull it in (twice:
            // once now, once after the 60s edge-cache window) so the new
            // briefing shows up without a manual reload.
            setTimeout(reloadBriefings, 4000);
            setTimeout(reloadBriefings, 70000);
            setTimeout(function () {
              if (RUN_STATES[slug] && RUN_STATES[slug].state === "success") {
                delete RUN_STATES[slug];
                paintRunBadge(slug);
              }
            }, 30000);
          }
        });
      }
    }).catch(function () {
      RUN_STATES[slug] = { state: "failure", msg: "Network error — sync not dispatched" };
      paintRunBadge(slug);
    });
  }

  function runManualSync(slug) {
    runCaseAction("sync", slug);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Live timestamp — the value baked into the HTML is the build machine's UTC
    // clock mislabeled "ET"; recompute the real Eastern time in the browser.
    function updateStamp() {
      var s = document.querySelector(".page-title .stamp") || document.querySelector(".stamp");
      if (!s) return;
      var d = new Date();
      var opt = { timeZone: "America/New_York" };
      var t = d.toLocaleString("en-US", Object.assign({ hour: "numeric", minute: "2-digit", hour12: true }, opt));
      var dt = d.toLocaleString("en-US", Object.assign({ weekday: "long", month: "long", day: "numeric", year: "numeric" }, opt));
      s.textContent = t + " ET · " + dt.toUpperCase();
    }
    updateStamp();
    setInterval(updateStamp, 30000);
    // Surface any failed case run from the last 24h as a persistent ⚠
    // (so an overnight sync failure is visible without opening GitHub).
    if (window.IntelSync) {
      IntelSync.recentFailures().then(function (fails) {
        Object.keys(fails).forEach(function (slug) {
          if (!RUN_STATES[slug]) RUN_STATES[slug] = { state: "failure", run: fails[slug] };
        });
        paintRunBadges();
      });
    }
    wireDropdown("ih-themes-btn", "ih-themes-panel", function () { paintThemePills(); });
    wireDropdown("ih-cases-btn", "ih-cases-panel", buildCasesPanel);
    updateFilterButtons();
    var _reflowTimer;
    window.addEventListener("resize", function () {
      clearTimeout(_reflowTimer);
      _reflowTimer = setTimeout(function () {
        reflowThemeFilter();
                fillNewsToHeight(0);
      }, 150);
    });
    // Re-measure once the web font has loaded and the page has fully settled —
    // the first pass can run before Archivo is ready and under-measure the pills.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reflowThemeFilter);
    window.addEventListener("load", reflowThemeFilter);
    setTimeout(reflowThemeFilter, 400);
    wireCarousel();
    wireSortBar();
    wireBandResize();
    wireBandRowResize();
    // Give the boxes their height on first paint. renderAll's rAF also
    // settles, but it can run before the band is wired, so do it here too —
    // settleBand is idempotent.
    settleBand();
    wireViewToggle();
    wireShortcuts();
    // Briefing-groups editing moved to Settings → Briefings (manage.html#briefing).
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeGroupEditor();
    });
  });

  // ── View slider (SELF-BUILDING) ────────────────────────────────────────────
  // index.html keeps getting regenerated, so the slider's track, knob, and
  // styles are all created here at runtime from the two data-view buttons.
  // Labels flank a small track; no outline, no neon (Andrew, Aug 2026).
  (function () {
    var CSS =
      "#ih-view-tgl{gap:8px;border:none;align-items:center;}" +
      "#ih-view-tgl .ih-sort-btn{border:none;background:none;padding:0 2px;color:var(--ink-40);}" +
      "#ih-view-tgl .ih-sort-btn:hover{background:none;color:var(--ink-60);}" +
      "#ih-view-tgl .ih-sort-btn.on{background:none;color:var(--ink);}" +
      ".ih-vt-track{width:34px;height:18px;border-radius:99px;background:var(--ink-20);position:relative;flex:0 0 auto;cursor:pointer;pointer-events:auto !important;}" +
      ".ih-vt-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,0.3);transition:left 0.15s ease;cursor:pointer;}";
    function sync() {
      var tgl = document.getElementById("ih-view-tgl");
      if (!tgl) return;
      var listOn = !!tgl.querySelector('[data-view="list"].on');
      var knob = tgl.querySelector(".ih-vt-knob");
      if (knob) knob.style.left = listOn ? "18px" : "2px";
    }
    function build() {
      var tgl = document.getElementById("ih-view-tgl");
      if (!tgl) return;
      if (!document.getElementById("ih-vt-style")) {
        var st = document.createElement("style");
        st.id = "ih-vt-style";
        st.textContent = CSS;
        document.head.appendChild(st);
      }
      // Always tear down and rebuild fresh — do NOT gate on "a .ih-vt-track
      // already exists". A stale static copy (no click handlers) sat in
      // index.html's own markup for hours; that guard silently skipped
      // ever attaching a listener because the element "already existed."
      var existing = tgl.querySelector(".ih-vt-track");
      if (existing) existing.parentNode.removeChild(existing);
      var track = document.createElement("span");
      track.className = "ih-vt-track";
      track.setAttribute("role", "switch");
      track.setAttribute("title", "Switch view");
      track.innerHTML = '<span class="ih-vt-knob"></span>';
      var listBtn = tgl.querySelector('[data-view="list"]');
      if (listBtn) tgl.insertBefore(track, listBtn);
      // Clicking anywhere on the switch — track or the knob itself —
      // flips to whichever view is inactive.
      function flip(e) {
        e.stopPropagation();
        var t = document.getElementById("ih-view-tgl");
        if (!t) return;
        var other = t.querySelector('[data-view="list"].on')
          ? t.querySelector('[data-view="cards"]')
          : t.querySelector('[data-view="list"]');
        if (other) other.click();
        setTimeout(sync, 0);
      }
      track.addEventListener("click", flip);
      track.querySelector(".ih-vt-knob").addEventListener("click", flip);
      sync();
    }
    document.addEventListener("DOMContentLoaded", function () {
      build();
      var tgl = document.getElementById("ih-view-tgl");
      if (tgl) tgl.addEventListener("click", function () { setTimeout(sync, 0); });
    });
  })();

  // ── List view: status column auto-aligns; pills stay content-sized ────────
  // Pills keep their natural width (Andrew: width follows the label). The
  // status column is pinned to the widest label each render so it stays a
  // clean column. Injects its own CSS to survive index.html regeneration.
  (function () {
    var CSS =
      ".ih-list-mode .ih-lr-count{flex:0 0 var(--lrw-count,auto);overflow:hidden;text-overflow:ellipsis;}";
    function ensureCss() {
      if (document.getElementById("ih-lrw-style")) return;
      var st = document.createElement("style");
      st.id = "ih-lrw-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    function autoSize() {
      var grid = document.getElementById("ih-theme-grid");
      if (!grid || !grid.classList.contains("ih-list-mode")) return;
      ensureCss();
      grid.style.setProperty("--lrw-pill", "auto"); // neutralize any older pinned width
      grid.style.setProperty("--lrw-count", "auto");
      var maxC = 0;
      grid.querySelectorAll(".ih-lr-count").forEach(function (c) {
        maxC = Math.max(maxC, c.getBoundingClientRect().width);
      });
      if (maxC) grid.style.setProperty("--lrw-count", Math.min(Math.ceil(maxC) + 2, 220) + "px");
    }
    document.addEventListener("DOMContentLoaded", function () {
      var grid = document.getElementById("ih-theme-grid");
      if (!grid) return;
      // Old drag-resize widths no longer apply.
      try { localStorage.removeItem("ih-list-colw"); } catch (e) {}
      autoSize();
      new MutationObserver(function (muts) {
        if (muts.some(function (m) { return m.addedNodes.length || m.removedNodes.length; })) autoSize();
      }).observe(grid, { childList: true });
    });
  })();
})();
