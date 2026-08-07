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
    return '<span class="ih-pill" style="background:' + bg + ";color:" + fg + '">' + esc(name) + "</span>";
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

  var THEMES = {
    "rewind-tariffs":               { name: "Tariffs / Trade",            emoji: "⚖️", bg: "#ECFCCB", fg: "#3f6212" },
    "llm-class-action":             { name: "LLM / Copyright",            emoji: "🤖", bg: "#DBEAFE", fg: "#1e40af" },
    "crypto-insolvency":            { name: "Crypto Insolvency",          emoji: "🪙", bg: "#FFEDD5", fg: "#9a3412" },
    "fraud-recovery":               { name: "Ponzi / Fraud Recovery",     emoji: "🕵️", bg: "#F3E8FF", fg: "#6b21a8" },
    "billion-dollar-class-actions": { name: "$1B+ Class Actions",         emoji: "💰", bg: "#D1FAE5", fg: "#065f46" },
    "bankruptcy-creditor-rights":   { name: "Bankruptcy Creditor Rights", emoji: "📜", bg: "#FEE2E2", fg: "#991b1b" },
  };

  // Order themes lead with the most active practice areas (used by the
  // "Theme" card arrangement below).
  var THEME_ORDER = ["llm-class-action", "crypto-insolvency", "bankruptcy-creditor-rights",
                     "fraud-recovery", "billion-dollar-class-actions", "rewind-tariffs"];

  // Card arrangement — persisted per-device; high-priority flags roam across
  // devices via api/prefs (alongside the shared pill colors).
  var VALID_SORTS = { activity: 1, az: 1, priority: 1, theme: 1 };
  var sortMode = "activity";
  try { var _sm = localStorage.getItem("ud-case-sort"); if (VALID_SORTS[_sm]) sortMode = _sm; } catch (e) {}
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
    return '<span class="ih-pill ih-pill-sq ih-pill-theme">' + t.emoji + " " + esc(t.name) + "</span>";
  }

  var FALLBACK_SWATCHES = [
    { bg: "#D4FF00", fg: "#0A0A0A" }, { bg: "#E9F98A", fg: "#4A5500" },
    { bg: "#1B3A4B", fg: "#FFFFFF" }, { bg: "#94C6F8", fg: "#123A66" },
    { bg: "#3B78D8", fg: "#FFFFFF" }, { bg: "#B3A8F0", fg: "#2A1E6E" },
    { bg: "#4A3DE0", fg: "#FFFFFF" }, { bg: "#7EF4C2", fg: "#0B4A32" },
    { bg: "#3FA07A", fg: "#FFFFFF" }, { bg: "#F2AAEC", fg: "#6E1466" },
    { bg: "#CC33CC", fg: "#FFFFFF" }, { bg: "#3A3A3A", fg: "#FFFFFF" },
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
    rebuildThemesPanelIfOpen();
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

  // Theme gears pass themeOf(slug); case gears pass the case's color base.
  function openThemePopover(slug, anchor) { openColorPopover(slug, anchor, themeOf(slug)); }
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
        '<button type="button" class="ud-dd-quick" data-palette>Edit palette…</button>' +
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
    pop.querySelector("[data-palette]").addEventListener("click", function () {
      popEditingPalette = !popEditingPalette;
      pop.querySelector("[data-palette]").textContent = popEditingPalette ? "Done editing palette" : "Edit palette…";
      if (popEditingPalette) popRenderPaletteEditor();
      else popRenderSwatches();
    });
    pop.querySelector("[data-reset]").addEventListener("click", function () {
      delete savedColors[slug];
      persistColors();
      pushPrefs();
      renderAll();
      rebuildThemesPanelIfOpen();
      rebuildCasesPanelIfOpen();
      closePop();
    });
  }

  function rebuildThemesPanelIfOpen() {
    var p = document.getElementById("ih-themes-panel");
    if (p && p.style.display !== "none") buildThemesPanel(p);
  }

  document.addEventListener("click", function (ev) {
    if (popEl && !popEl.contains(ev.target) && !ev.target.closest("[data-gear],[data-case-gear]")) closePop();
  });

  // ── Show/hide preferences (persisted as this browser's default) ───────────
  var FILTER_KEY = "ih-filter-state";
  var activeCases = {};
  var activeThemes = {};
  try {
    var st = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
    activeCases = st.activeCases || {};
    activeThemes = st.activeThemes || {};
  } catch (e) {}

  function saveFilters() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ activeCases: activeCases, activeThemes: activeThemes }));
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
  var NOTES_LIST = [];
  var FEED_ITEMS = [];

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
    if (!caseOn(m.slug)) return false;
    var topics = m.topics || [];
    if (!topics.length) return true;
    for (var i = 0; i < topics.length; i++) {
      if (themeOn(topics[i])) return true;
    }
    return false;
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

  // Rows live INSIDE a case card whose header already carries the case pill \u2014
  // no per-row pill or case name.
  function codedRow(item) {
    if (item.kind === "filing") {
      return '<a class="ih-row-coded ih-code-filing" href="' + BASE + 'docket.html#case=' + encodeURIComponent(item.caseSlug) + '&e=' + encodeURIComponent(filingNoteKey(item)) + '"><span class="ih-code-ico">\u2696\ufe0f</span> ' +
        "Dkt. " + (item.num != null ? item.num : "\u2014") + " \u00b7 " + esc(item.text.slice(0, 95)) + "</a>";
    }
    if (item.kind === "news") {
      return '<a class="ih-row-coded ih-code-news" href="' + BASE + 'news.html#case=' + encodeURIComponent(item.caseSlug) + '&u=' + encodeURIComponent(item.url || "") + '"><span class="ih-code-ico">\ud83d\udce1</span> ' +
        esc(item.source) + " \u2014 " + esc(item.text.slice(0, 95)) + "</a>";
    }
    // Calendar event: colored left border + a lighter tint of the case color.
    var cbg = caseColor(item.caseSlug, item.color);
    return '<a class="ih-row-coded ih-code-date" style="border-left-color:' + cbg + ';background:' + tint(cbg, 0.14) + '" href="' + BASE + 'calendar.html#case=' + encodeURIComponent(item.caseSlug) + '&ev=' + encodeURIComponent((item.date || "") + "|" + (item.caseShort || "")) + '"><span class="ih-code-ico">\ud83d\udcc5</span> ' +
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
    var visible = MANIFEST.filter(caseVisible);
    if (!visible.length) {
      grid.innerHTML = '<div class="ih-empty">No cases selected.</div>';
      return;
    }
    var since = hoursAgoIso(26);
    var dataBySlug = {};
    CASE_DATA.forEach(function (x) { dataBySlug[x.m.slug] = x; });

    var cards = visible.map(function (m) {
      var x = dataBySlug[m.slug] || { m: m, c: null };
      var brief = briefingOf(m.slug);
      var filings = caseFilings(x, since);
      var news = caseNews(m.slug, since);
      var nextDate = caseNextDate(x);
      var devCount = filings.length + news.length;

      var rows = [];
      filings.slice(0, 4).forEach(function (f) { rows.push(codedRow(f)); });
      news.slice(0, 3).forEach(function (n) { rows.push(codedRow(n)); });
      rows = rows.slice(0, 5);
      if (nextDate) rows.push(codedRow(nextDate));
      var hidden = devCount - Math.min(devCount, 5);

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
        ledeHtml = '<div class="ih-tc-lede ih-quiet">No briefing yet for this case. ' +
          '<a href="' + BASE + 'docket.html#case=' + encodeURIComponent(m.slug) + '">Docket \u2192</a></div>';
      }

      var pri = isPriority(m.slug);
      var star = '<button type="button" class="ih-star' + (pri ? " on" : "") +
        '" data-star="' + esc(m.slug) + '" aria-label="' + (pri ? "Remove high priority" : "Mark high priority") +
        '" title="' + (pri ? "High priority — click to remove" : "Mark as high priority") + '">' +
        (pri ? "★" : "☆") + "</button>";
      var head =
        '<div class="ih-tc-head">' +
          '<a href="' + BASE + 'docket.html#case=' + encodeURIComponent(m.slug) + '" style="text-decoration:none">' +
            casePill(m.slug, m.short_name || m.display_name || m.slug, m.default_color) + "</a>" +
          '<span class="ih-tc-right"><span class="ih-tc-count">' + esc(count) + "</span>" + star + "</span>" +
        "</div>";

      var html =
        '<section class="ih-theme-card' + (moved ? " ih-card-moved" : "") + '">' +
          head + ledeHtml + rows.join("") +
          (hidden > 0 ? '<div class="ih-more-rows">+' + hidden + ' more \u00b7 <a href="' + BASE + 'docket.html#case=' + encodeURIComponent(m.slug) + '">docket</a> / <a href="' + BASE + 'news.html">news</a></div>' : "") +
        "</section>";

      var latest = (brief && brief.activity && brief.activity.latest) || "";
      return { html: html, moved: moved, dev: devCount, latest: latest,
               slug: m.slug, name: (m.short_name || m.display_name || m.slug),
               theme: (m.topics && m.topics[0]) || "" };
    });

    function byName(a, b) { return a.name.localeCompare(b.name); }
    function grpHead(label, n) {
      return '<div class="ih-grp-head">' + esc(label) + ' <span>' + n + "</span></div>";
    }
    function join(list) { return list.map(function (c) { return c.html; }).join(""); }

    var htmlOut;
    if (sortMode === "az") {
      htmlOut = join(cards.slice().sort(byName));
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
        htmlOut += grpHead(t.emoji + " " + t.name, g.length) + join(g);
      });
      var rest = cards.filter(function (c) { return !seen[c.slug]; }).sort(byName);
      if (rest.length) htmlOut += grpHead("📰 Other", rest.length) + join(rest);
    } else {
      // Activity (default): moved briefings first, then fresh docket/news, freshest first.
      htmlOut = join(cards.slice().sort(function (a, b) {
        if (a.moved !== b.moved) return a.moved ? -1 : 1;
        if ((a.dev > 0) !== (b.dev > 0)) return a.dev > 0 ? -1 : 1;
        return (b.latest || "").localeCompare(a.latest || "");
      }));
    }
    grid.innerHTML = htmlOut;

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
  function renderUnassigned() {
    // Only case- or theme-related news makes the dashboard; the full feed
    // lives on the News page under "All news".
    var items = FEED_ITEMS.filter(function (b) {
      return b.url && b.title && (b.case_slug || b.group_name || b.theme_slug);
    });
    var countEl = document.getElementById("ih-unassigned-count");
    if (countEl) countEl.textContent = "View all \u2192";
    fill("ih-unassigned", items.slice(0, 7).map(function (b) {
      var pill = "";
      var mc = b.case_slug && MANIFEST.find(function (m) { return m.slug === b.case_slug; });
      if (mc) {
        pill = casePill(mc.slug, mc.short_name || mc.display_name || mc.slug, mc.default_color);
      } else if (b.theme_slug && THEMES[b.theme_slug]) {
        pill = themePill(b.theme_slug);
      } else if (b.group_name) {
        pill = '<span class="ih-pill" style="background:var(--paper-2);color:var(--ink-60)">' + esc(b.group_name) + "</span>";
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
      if (!caseOn(x.m.slug)) return;
      var short = x.m.short_name || x.m.display_name || x.m.slug;
      ((x.c && x.c.events) || []).forEach(function (ev) {
        if (ev.date) events.push({ date: ev.date, short: short, title: ev.title || ev.kind || "", slug: x.m.slug, default_color: x.m.default_color });
      });
      ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
        extractEvents(e, short).forEach(function (ev) {
          events.push({ date: ev.date, short: short, title: ev.kind, slug: x.m.slug, default_color: x.m.default_color });
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

    // Rolling view \u2014 the NEXT 7 days from today (+ weekOffset windows), or the
    // next 5 BUSINESS days when the weekday toggle is on. Each day lists its
    // events by NAME, color-coded by case (border + tint).
    var start = new Date();
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() + weekOffset * 7);
    function isoOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
    var MABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var DOWL = ["S", "M", "T", "W", "T", "F", "S"];
    var days = [];
    var cur = new Date(start);
    while (days.length < calDays) {
      if (calDays === 7 || (cur.getDay() !== 0 && cur.getDay() !== 6)) days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    var a = days[0], b = days[days.length - 1];
    var range = a.getMonth() === b.getMonth()
      ? MABBR[a.getMonth()] + " " + a.getDate() + " \u2013 " + b.getDate()
      : MABBR[a.getMonth()] + " " + a.getDate() + " \u2013 " + MABBR[b.getMonth()] + " " + b.getDate();

    var html = '<div class="ih-mm-head">' +
      '<button type="button" class="ih-mm-nav" data-wk="-1">\u2039</button>' +
      '<span>' + range + '</span>' +
      '<span class="ih-wk-tgl">' +
        '<button type="button" data-days="7" class="' + (calDays === 7 ? "on" : "") + '" title="Next 7 days">7d</button>' +
        '<button type="button" data-days="5" class="' + (calDays === 5 ? "on" : "") + '" title="Next 5 business days">5d</button>' +
      '</span>' +
      '<button type="button" class="ih-mm-nav" data-wk="1">\u203a</button></div>';
    html += '<div class="ih-wk-grid" style="grid-template-columns:repeat(' + calDays + ',1fr)">';
    days.forEach(function (d) {
      var iso = isoOf(d);
      var evs = byDay[iso] || [];
      var isToday = iso === today;
      var col = '<div class="ih-wk-col' + (isToday ? " today" : "") + '">' +
        '<div class="ih-wk-dayhd"><span class="ih-wk-dow">' + DOWL[d.getDay()] + '</span>' +
          '<span class="ih-wk-num">' + d.getDate() + '</span></div>';
      col += evs.slice(0, 5).map(function (ev) {
        var cbg = caseColor(ev.slug, ev.default_color);
        var label = ev.title ? ev.short + " \u2014 " + ev.title : ev.short;
        return '<a class="ih-wk-ev" style="border-left-color:' + cbg + ';background:' + tint(cbg, 0.14) + '" ' +
          'href="' + BASE + 'calendar.html#case=' + encodeURIComponent(ev.slug) + '&d=' + iso + '" title="' + esc(label) + '">' +
          "<strong>" + esc(ev.short) + "</strong>" + (ev.title ? " " + esc(ev.title.slice(0, 110)) : "") + "</a>";
      }).join("");
      if (evs.length > 5) col += '<span class="ih-wk-more">+' + (evs.length - 5) + " more</span>";
      col += "</div>";
      html += col;
    });
    html += "</div>";
    box.innerHTML = html;
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


  function renderNotes() {
    var list = NOTES_LIST.filter(function (n) {
      if (!n.case_slug) return caseOn("__unassigned__");
      var known = MANIFEST.some(function (m) { return m.slug === n.case_slug; });
      return known ? caseOn(n.case_slug) : true;
    });
    var box = document.getElementById("ih-notes");
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="ih-empty">No notes yet.</div>';
      return;
    }
    box.innerHTML = '<div style="height:8px"></div>' + list.slice(0, 4).map(function (n) {
      var body = (n.note || "").trim() || n.snippet || "(bookmark)";
      return '<a class="ih-note-sticky" href="' + BASE + 'notes.html#e=' + encodeURIComponent(n._key || "") + '">\u201c' + esc(body.slice(0, 90)) + '\u201d ' +
        '<span class="who">\u2014 ' + esc(n.case_name || n.case_slug || "Uncategorized") +
        (n.bookmarked ? " \u2605" : "") + "</span></a>";
    }).join("");
  }

  function renderAll() {
    renderCaseGrid();
    renderProspects();
    renderUnassigned();
    renderDates();
    renderNotes();
    updateFilterButtons();
  }

  // ── Prospects tile — candidate cases from the theme scans ─────────────────
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
            '<button type="button" class="ih-pr-btn ih-pr-dismiss" data-dismiss="' + esc(p.id) + '">Dismiss</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");
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
    }
    var tb = document.getElementById("ih-themes-btn");
    if (tb) {
      var slugs = Object.keys(THEMES);
      var tOn = slugs.filter(themeOn).length;
      tb.textContent = tOn === slugs.length ? "Themes: All" : "Themes: " + tOn + "/" + slugs.length;
    }
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
          '<button type="button" class="ih-gear" data-case-gear="' + esc(m.slug) + '" title="Colors">⚙</button>' +
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
  }

  function buildThemesPanel(panel) {
    var html =
      '<div class="ih-dd-quick-row">' +
        '<button type="button" data-all="1">Select all</button>' +
        '<button type="button" data-none="1">Deselect all</button>' +
      "</div>";
    Object.keys(THEMES).forEach(function (slug) {
      html +=
        '<label class="ih-dd-row">' +
          '<input type="checkbox" data-theme="' + slug + '"' + (themeOn(slug) ? " checked" : "") + ">" +
          themePill(slug) +
          '<button type="button" class="ih-gear" data-gear="' + slug + '" title="Colors">\u2699</button>' +
        "</label>";
    });
    panel.innerHTML = html;
    panel.querySelector("[data-all]").addEventListener("click", function () {
      Object.keys(THEMES).forEach(function (s) { activeThemes[s] = true; });
      saveFilters(); buildThemesPanel(panel); renderAll();
    });
    panel.querySelector("[data-none]").addEventListener("click", function () {
      Object.keys(THEMES).forEach(function (s) { activeThemes[s] = false; });
      saveFilters(); buildThemesPanel(panel); renderAll();
    });
    panel.querySelectorAll("[data-theme]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeThemes[cb.getAttribute("data-theme")] = cb.checked;
        saveFilters(); renderAll();
      });
    });
    panel.querySelectorAll("[data-gear]").forEach(function (g) {
      g.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openThemePopover(g.getAttribute("data-gear"), g);
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
      if (!open) {
        builder(panel);
        panel.style.display = "block";
      }
    });
    document.addEventListener("click", function (ev) {
      if (panel.style.display === "none") return;
      if (ev.target && !ev.target.isConnected) return;
      if (panel.contains(ev.target) || btn.contains(ev.target)) return;
      panel.style.display = "none";
    });
  }

  // ── Loads ─────────────────────────────────────────────────────────────────
  fetchJson(BASE + "case-briefings.json").then(function (d) {
    BRIEFING_ITEMS = ((d && d.items) || []).slice();
    renderCaseGrid();
    updateFilterButtons();
  }).catch(function () { renderCaseGrid(); });

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
    MANIFEST = man || [];
    renderCaseGrid();
    return Promise.all(MANIFEST.map(function (m) {
      return fetchJson(BASE + "cases/data/" + m.slug + ".json")
        .then(function (c) { return { m: m, c: c }; })
        .catch(function () { return null; });
    }));
  }).then(function (cases) {
    CASE_DATA = cases.filter(Boolean);
    renderCaseGrid();
    renderDates();
    renderNotes();
    updateFilterButtons();
  }).catch(function () {
    fill("ih-docket", "");
    fill("ih-calendar", "");
  });

  fetchJson(BASE + "bondoro.json").then(function (d) {
    FEED_ITEMS = ((d && d.items) || []).slice()
      .sort(function (a, b) { return (b.published_at || b.date || "").localeCompare(a.published_at || a.date || ""); });
    renderCaseGrid();
    renderUnassigned();
  }).catch(function () { fill("ih-unassigned", ""); });

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

  // Card-arrangement control (Activity / A–Z / Priority / Theme).
  function wireSortBar() {
    var bar = document.getElementById("ih-sort");
    if (!bar) return;
    function paint() {
      bar.querySelectorAll("[data-sort]").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-sort") === sortMode);
      });
    }
    bar.querySelectorAll("[data-sort]").forEach(function (b) {
      b.addEventListener("click", function () {
        sortMode = b.getAttribute("data-sort");
        try { localStorage.setItem("ud-case-sort", sortMode); } catch (e) {}
        paint();
        renderCaseGrid();
      });
    });
    paint();
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireDropdown("ih-cases-btn", "ih-cases-panel", buildCasesPanel);
    wireDropdown("ih-themes-btn", "ih-themes-panel", buildThemesPanel);
    updateFilterButtons();
    wireCarousel();
    wireSortBar();
  });
})();
