(function () {
  "use strict";

  /* Intel dashboard (landing) — four side-by-side columns previewing the top 7
     from Briefings, Docket, Calendar, and Notes.

     - Case pills use the shared color store (ud-case-colors + intel-prefs).
     - Theme pills are SQUARE to distinguish themes from cases, and honor the
       same store (theme slugs never collide with case slugs).
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

  var THEMES = {
    "rewind-tariffs":               { name: "Tariffs / Trade",            emoji: "⚖️", bg: "#ECFCCB", fg: "#3f6212" },
    "llm-class-action":             { name: "LLM / Copyright",            emoji: "🤖", bg: "#DBEAFE", fg: "#1e40af" },
    "crypto-insolvency":            { name: "Crypto Insolvency",          emoji: "🪙", bg: "#FFEDD5", fg: "#9a3412" },
    "fraud-recovery":               { name: "Ponzi / Fraud Recovery",     emoji: "🕵️", bg: "#F3E8FF", fg: "#6b21a8" },
    "billion-dollar-class-actions": { name: "$1B+ Class Actions",         emoji: "💰", bg: "#D1FAE5", fg: "#065f46" },
    "bankruptcy-creditor-rights":   { name: "Bankruptcy Creditor Rights", emoji: "📜", bg: "#FEE2E2", fg: "#991b1b" },
  };

  function themeOf(slug) {
    var base = THEMES[slug] || { name: slug, emoji: "📰", bg: "#E0E7FF", fg: "#3730a3" };
    var ov = savedColors[slug];
    return { name: base.name, emoji: base.emoji,
             bg: (ov && ov.bg) || base.bg, fg: (ov && ov.fg) || base.fg,
             border: (ov && ov.border) || "" };
  }

  function themePill(slug) {
    var t = themeOf(slug);
    return '<span class="ih-pill ih-pill-sq" style="background:' + t.bg + ";color:" + t.fg + (t.border ? ";border:1.5px solid " + t.border : "") + '">' + t.emoji + " " + esc(t.name) + "</span>";
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
        body: JSON.stringify({ colors: colors, groups: (p && p.groups) || [], presets: (p && p.presets) || [], theme_presets: themePresets }),
      });
    }).catch(function () {});
  }

  var popEl = null;
  var popSlug = null;
  var popEditingPalette = false;
  function closePop() {
    if (popEl && popEl.parentNode) popEl.parentNode.removeChild(popEl);
    popEl = null;
    popSlug = null;
    popEditingPalette = false;
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
  }

  function popRenderSwatches() {
    var box = popEl.querySelector("[data-role-swatches]");
    var cur = (savedColors[popSlug] && savedColors[popSlug].bg) || themeOf(popSlug).bg;
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

  function openThemePopover(slug, anchor) {
    closePop();
    popSlug = slug;
    var t = themeOf(slug);
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
      closePop();
    });
  }

  function rebuildThemesPanelIfOpen() {
    var p = document.getElementById("ih-themes-panel");
    if (p && p.style.display !== "none") buildThemesPanel(p);
  }

  document.addEventListener("click", function (ev) {
    if (popEl && !popEl.contains(ev.target) && !ev.target.closest("[data-gear]")) closePop();
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
  var BRIEFING_ITEMS = [];
  var NOTES_LIST = [];

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

  function renderBriefings() {
    var items = BRIEFING_ITEMS.filter(function (i) { return themeOn(i.slug); });
    fill("ih-briefings", items.slice(0, 7).map(function (i) {
      var lede = (i.body || i.stat || "").trim();
      return row(BASE + "briefings.html", fmtDate(i.updated), lede.slice(0, 120), themePill(i.slug));
    }).join(""));
  }

  function renderDocket() {
    var entries = [];
    CASE_DATA.forEach(function (x) {
      if (!caseOn(x.m.slug)) return;
      var short = x.m.short_name || x.m.display_name || x.m.slug;
      ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
        if (!e.date_filed || !(e.description || "").trim()) return;
        entries.push({ date: e.date_filed, num: e.entry_number, desc: e.description,
                       short: short, slug: x.m.slug, color: x.m.default_color });
      });
    });
    entries.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.num || 0) - (a.num || 0);
    });
    fill("ih-docket", entries.slice(0, 7).map(function (e) {
      return row(BASE + "docket.html",
        fmtDate(e.date) + (e.num != null ? " · Dkt. " + e.num : ""),
        e.desc.slice(0, 130),
        casePill(e.slug, e.short, e.color));
    }).join(""));
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

  function renderCalendar() {
    var today = new Date();
    today = today.getFullYear() + "-" + pad2(today.getMonth() + 1) + "-" + pad2(today.getDate());
    var events = [];
    CASE_DATA.forEach(function (x) {
      if (!caseOn(x.m.slug)) return;
      var short = x.m.short_name || x.m.display_name || x.m.slug;
      ((x.c && x.c.events) || []).forEach(function (ev) {
        if (ev.date && ev.date >= today) {
          events.push({ date: ev.date, kind: ev.kind || "Event", title: ev.title || "",
                        short: short, slug: x.m.slug, color: x.m.default_color });
        }
      });
      ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
        extractEvents(e, short).forEach(function (ev) {
          if (ev.date >= today) {
            ev.slug = x.m.slug;
            ev.color = x.m.default_color;
            events.push(ev);
          }
        });
      });
    });
    var seen = {};
    events = events.filter(function (ev) {
      var k = ev.date + "|" + ev.short + "|" + ev.kind;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    events.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    fill("ih-calendar", events.slice(0, 7).map(function (ev) {
      return row(BASE + "calendar.html",
        fmtDate(ev.date) + " · " + ev.kind,
        ev.title,
        casePill(ev.slug, ev.short, ev.color));
    }).join(""));
  }

  function renderNotes() {
    var list = NOTES_LIST.filter(function (n) {
      if (!n.case_slug) return caseOn("__unassigned__");
      var known = MANIFEST.some(function (m) { return m.slug === n.case_slug; });
      return known ? caseOn(n.case_slug) : true;
    });
    fill("ih-notes", list.slice(0, 7).map(function (n) {
      var body = (n.note || "").trim() || n.snippet || "(bookmark)";
      var m = null;
      for (var i = 0; i < MANIFEST.length; i++) {
        if (MANIFEST[i].slug === n.case_slug) { m = MANIFEST[i]; break; }
      }
      var p = m ? casePill(m.slug, m.short_name || m.display_name || m.slug, m.default_color)
                : '<span class="ih-pill" style="background:transparent;color:var(--ink-60);border:1px dashed var(--ink-60)">' + esc(n.case_name || "Uncategorized") + "</span>";
      return row(BASE + "notes.html",
        (n.entry_number != null ? "Dkt. " + n.entry_number : "") + (n.bookmarked ? " ★" : ""),
        body.slice(0, 120), p);
    }).join(""));
  }

  function renderAll() {
    renderBriefings();
    renderDocket();
    renderCalendar();
    renderNotes();
    updateFilterButtons();
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
  fetchJson(BASE + "briefings.json").then(function (d) {
    BRIEFING_ITEMS = ((d && d.items) || []).slice()
      .sort(function (a, b) { return (b.updated || "").localeCompare(a.updated || ""); });
    renderBriefings();
    updateFilterButtons();
  }).catch(function () { fill("ih-briefings", ""); });

  fetchJson(BASE + "cases/data/_manifest.json").then(function (man) {
    MANIFEST = man || [];
    return Promise.all(MANIFEST.map(function (m) {
      return fetchJson(BASE + "cases/data/" + m.slug + ".json")
        .then(function (c) { return { m: m, c: c }; })
        .catch(function () { return null; });
    }));
  }).then(function (cases) {
    CASE_DATA = cases.filter(Boolean);
    renderDocket();
    renderCalendar();
    renderNotes();
    updateFilterButtons();
  }).catch(function () {
    fill("ih-docket", "");
    fill("ih-calendar", "");
  });

  fetchJson(BASE + "api/notes")
    .then(function (p) { return (p && p.ok && p.entries) || {}; })
    .catch(function () {
      return fetchJson(BASE + "intel-notes.json")
        .then(function (f) { return (f && f.entries) || {}; })
        .catch(function () { return {}; });
    })
    .then(function (en) {
      NOTES_LIST = Object.keys(en).map(function (k) { return en[k]; })
        .filter(function (n) { return !n.deleted_at && ((n.note || "").trim() || n.bookmarked); })
        .sort(function (a, b) { return (b.updated_at || "").localeCompare(a.updated_at || ""); });
      renderNotes();
    });

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
    if (p && p.ok) renderAll();
  }).catch(function () {});

  document.addEventListener("DOMContentLoaded", function () {
    wireDropdown("ih-cases-btn", "ih-cases-panel", buildCasesPanel);
    wireDropdown("ih-themes-btn", "ih-themes-panel", buildThemesPanel);
    updateFilterButtons();
  });
})();
