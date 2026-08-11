(function () {
  "use strict";

  /* Unified Calendar — parses hearing/deadline dates out of docket entry text
     across every tracked case and lists them chronologically.

     Shares localStorage with the unified docket page:
       ud-case-colors  — per-case pill colors (same gear popover)
       ud-case-groups  — saved case groups (created on either page, work on both)
     Its own filter state lives under uc-filter-state so case selections here
     don't disturb the docket view. */

  // ── Event extraction ───────────────────────────────────────────────────────
  var MONTHS = ["january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"];
  var DATE_RE = new RegExp(
    "(\\d{1,2}/\\d{1,2}/\\d{2,4})|((?:" + MONTHS.join("|") + ")\\s+\\d{1,2},?\\s+\\d{4})", "gi");
  var TIME_RE = /^\s*(?:at\s+)?(\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?)/i;

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

  // Words that mean the date is bookkeeping, not a scheduled event
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

  function extractEvents(entry, caseInfo) {
    var desc = entry.description || "";
    if (!desc) return [];
    var events = [];
    var m;
    DATE_RE.lastIndex = 0;
    while ((m = DATE_RE.exec(desc)) !== null) {
      var raw = m[0];
      var iso = toISO(raw);
      if (!iso) continue;
      var windowStart = Math.max(0, m.index - 90);
      var before = desc.slice(windowStart, m.index);
      var kind = classifyWindow(before);
      if (!kind) continue;
      var after = desc.slice(m.index + raw.length, m.index + raw.length + 40);
      var tm = after.match(TIME_RE);
      events.push({
        key: caseInfo.slug + "|" + iso + "|" + kind + "|e" + (entry.entry_number != null ? entry.entry_number : "x"),
        slug: caseInfo.slug,
        short: caseInfo.short_name,
        name: caseInfo.display_name,
        default_color: caseInfo.default_color,
        court: caseInfo.court || "",
        docket_url: caseInfo.docket_url || "",
        claims_url: caseInfo.claims_url || "",
        claims_name: caseInfo.claims_name || "",
        date: iso,
        time: tm ? tm[1].replace(/\s+/g, " ").toUpperCase().replace(/\./g, "") : "",
        kind: kind,
        entry_number: entry.entry_number,
        doc_url: entry.doc_url || "",
        snippet: desc.length > 170 ? desc.slice(0, 167) + "…" : desc,
      });
    }
    return events;
  }

  // ── Shared helpers (same behavior as unified-docket.js) ────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var DEFAULT_PRESETS = [
    {bg:"#fff5c7", fg:"#92410e"}, {bg:"#fde864", fg:"#5f3306"},
    {bg:"#cafb67", fg:"#415819"}, {bg:"#8df7e0", fg:"#124f51"},
    {bg:"#ffca9e", fg:"#683608"}, {bg:"#ffc2c8", fg:"#74070c"},
    {bg:"#ffc2c9", fg:"#75070c"}, {bg:"#d7cdff", fg:"#380e77"},
    {bg:"#c2d7ff", fg:"#1c469c"}, {bg:"#a9e2ff", fg:"#04496c"},
    {bg:"#ffc2e7", fg:"#8b1387"}, {bg:"#e6e6e6", fg:"#0A0A0A"},
  ];
  var PRESETS_KEY = "ud-swatch-presets";
  function loadPresets() {
    try {
      var p = JSON.parse(localStorage.getItem(PRESETS_KEY) || "null");
      if (Array.isArray(p) && p.length === 12 && p.every(function (x) { return x && /^#[0-9a-fA-F]{6}$/.test(x.bg); })) {
        return p;
      }
    } catch (e) {}
    return DEFAULT_PRESETS.map(function (x) { return { bg: x.bg, fg: x.fg }; });
  }
  function savePresets() {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(PRESETS)); } catch (e) {}
  }
  var PRESETS = loadPresets();

  var COLOR_KEY = "ud-case-colors";
  function loadColors() {
    try { return JSON.parse(localStorage.getItem(COLOR_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveColors(map) {
    try { localStorage.setItem(COLOR_KEY, JSON.stringify(map)); } catch (e) {}
    schedulePrefsPush();
  }
  function autoFg(bg) {
    var r = parseInt(bg.slice(1, 3), 16) || 136;
    var g = parseInt(bg.slice(3, 5), 16) || 136;
    var b = parseInt(bg.slice(5, 7), 16) || 136;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0A0A0A" : "#FFFFFF";
  }
  var savedColors = loadColors();
  function getBg(slug, defaultColor) {
    return (savedColors[slug] && savedColors[slug].bg) || defaultColor || "#888888";
  }
  function getFg(slug, bg) {
    return (savedColors[slug] && savedColors[slug].fg) || autoFg(bg);
  }

  // ── State ──────────────────────────────────────────────────────────────────
  var CASES = [];
  var EVENTS = [];
  var activeCases = {};
  var scope = "upcoming";
  var sortDir = "asc";
  var searchText = "";
  var lookahead = "all";      // 7d | 30d | 90d | all | custom (docket-style Date-header menu)
  var dateFrom = "";
  var dateTo = "";
  var activeGearSlug = null;
  var dismissed = {};       // event key → true
  var mergedInto = {};      // event key → primary key
  var mergeGroups = [];     // [{keys, primary}]
  var selectedKeys = {};    // key → true (merge/dismiss selection)
  var _savedState = null;
  var calMode = "list";        // "list" | "month" | "week"
  var calAnchor = null;        // ISO date inside the shown month/week (set at boot)

  var FILTER_KEY = "uc-filter-state";
  function loadFilterState() {
    try {
      var s = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
      if (s.scope) scope = s.scope;
      if (s.sortDir === "asc" || s.sortDir === "desc") sortDir = s.sortDir;
      if (s.calMode === "month" || s.calMode === "week" || s.calMode === "list") calMode = s.calMode;
      if (["7d", "30d", "90d", "all", "custom"].indexOf(s.lookahead) !== -1) lookahead = s.lookahead;
      _savedState = s;
    } catch (e) {}
  }
  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({
        scope: scope, sortDir: sortDir, activeCases: activeCases, calMode: calMode,
        lookahead: lookahead,
      }));
    } catch (e) {}
  }

  function todayISO() {
    var t = new Date();
    return t.getFullYear() + "-" + pad2(t.getMonth() + 1) + "-" + pad2(t.getDate());
  }

  function rebuildEvents() {
    EVENTS = [];
    var seen = {};
    CASES.forEach(function (c) {
      // Scanned events (webinars, CLE, panels, deadline reminders) — already
      // deduped in the data by scan_news.py, so they go straight in.
      (c.events || []).forEach(function (evt) {
        if (!evt.date || !evt.title) return;
        EVENTS.push({
          key: c.slug + "|" + evt.date + "|" + (evt.kind || "Event") + "|u" + (evt.url || evt.title).slice(0, 80),
          slug: c.slug,
          short: c.short_name,
          name: c.display_name,
          default_color: c.default_color,
          court: c.court || "",
          docket_url: "",
          claims_url: c.claims_url || "",
          claims_name: c.claims_name || "",
          date: evt.date,
          time: (evt.time || "").toUpperCase(),
          kind: evt.kind || "Event",
          entry_number: null,
          doc_url: "",
          event_url: evt.url || "",
          snippet: evt.title + (evt.source ? " \u2014 " + evt.source : ""),
        });
      });
      (c.entries || []).forEach(function (e) {
        extractEvents(e, c).forEach(function (ev) {
          // Same case + date + kind → keep the mention from the latest filing
          var key = ev.slug + "|" + ev.date + "|" + ev.kind;
          var prev = seen[key];
          if (prev) {
            var pn = prev.entry_number == null ? -Infinity : Number(prev.entry_number);
            var en = ev.entry_number == null ? -Infinity : Number(ev.entry_number);
            if (en > pn) { EVENTS[EVENTS.indexOf(prev)] = ev; seen[key] = ev; }
          } else {
            EVENTS.push(ev);
            seen[key] = ev;
          }
        });
      });
    });
  }

  // ── Curation (dismiss/merge) — repo-backed via /intel/api/calendar-prefs ──
  var curTimer = null;

  function applyCuration(prefs) {
    dismissed = {};
    (prefs.dismissed || []).forEach(function (k) { dismissed[k] = true; });
    mergeGroups = prefs.merges || [];
    mergedInto = {};
    mergeGroups.forEach(function (g) {
      g.keys.forEach(function (k) {
        if (k !== g.primary) mergedInto[k] = g.primary;
      });
    });
  }

  function loadCuration() {
    fetchJson("api/calendar-prefs").then(function (p) {
      if (p && p.ok) { applyCuration(p); render(); updateCurationInfo(); }
    }).catch(function () {
      fetchJson("intel-calendar.json").then(function (f) {
        applyCuration(f || {}); render(); updateCurationInfo();
      }).catch(function () {});
    });
  }

  function pushCuration() {
    clearTimeout(curTimer);
    curTimer = setTimeout(function () {
      fetch("api/calendar-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dismissed: Object.keys(dismissed),
          merges: mergeGroups,
        }),
      }).catch(function () {});
    }, 1200);
  }

  function updateCurationInfo() {
    var el = document.getElementById("uc-curation-info");
    if (!el) return;
    var nD = Object.keys(dismissed).length;
    var nM = mergeGroups.length;
    if (!nD && !nM) { el.innerHTML = ""; return; }
    el.innerHTML = nD + " dismissed \u00b7 " + nM + " merge" + (nM === 1 ? "" : "s") +
      ' <button type="button" id="uc-curation-reset">Reset</button>';
    var btn = document.getElementById("uc-curation-reset");
    if (btn) {
      btn.addEventListener("click", function () {
        dismissed = {};
        mergeGroups = [];
        mergedInto = {};
        pushCuration();
        render();
        updateCurationInfo();
      });
    }
  }

  function syncSelAll(visible) {
    var head = document.getElementById("uc-sel-all");
    if (!head) return;
    var list = visible || filtered();
    var n = list.filter(function (ev) { return selectedKeys[ev.key]; }).length;
    head.checked = list.length > 0 && n === list.length;
    head.indeterminate = n > 0 && n < list.length;
  }

  function updateMergeBar() {
    var bar = document.getElementById("uc-merge-bar");
    var count = document.getElementById("uc-merge-count");
    if (!bar) return;
    var n = Object.keys(selectedKeys).length;
    bar.style.display = n >= 1 ? "flex" : "none";
    if (count) count.textContent = n + " selected";
    var mergeBtn = document.getElementById("uc-merge-btn");
    if (mergeBtn) mergeBtn.style.display = n >= 2 ? "" : "none";
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  function filtered(ignoreScope) {
    var sq = searchText.toLowerCase().trim();
    var today = todayISO();
    var mergedExtras = {};
    EVENTS.forEach(function (ev) {
      var prim = mergedInto[ev.key];
      if (prim) (mergedExtras[prim] = mergedExtras[prim] || []).push(ev);
    });
    var list = EVENTS.filter(function (ev) {
      if (dismissed[ev.key]) return false;
      if (mergedInto[ev.key]) return false;
      if (!activeCases[ev.slug]) return false;
      if (!ignoreScope && scope === "upcoming" && ev.date < today) return false;
      if (!ignoreScope && scope === "past" && ev.date >= today) return false;
      if (!ignoreScope && lookahead !== "all") {
        if (lookahead === "custom") {
          if (dateFrom && ev.date < dateFrom) return false;
          if (dateTo && ev.date > dateTo) return false;
        } else {
          var horizon = addDaysISO(today, lookahead === "7d" ? 7 : lookahead === "30d" ? 30 : 90);
          if (ev.date < today || ev.date > horizon) return false;
        }
      }
      if (sq) {
        var hay = [ev.date, ev.kind, ev.name, ev.short, ev.snippet].join(" ").toLowerCase();
        if (hay.indexOf(sq) === -1) return false;
      }
      return true;
    });
    list.forEach(function (ev) { ev.merged = mergedExtras[ev.key] || null; });
    list.sort(function (a, b) {
      var cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      if (cmp === 0 && a.slug === b.slug) {
        var an = a.entry_number == null ? -Infinity : Number(a.entry_number);
        var bn = b.entry_number == null ? -Infinity : Number(b.entry_number);
        cmp = an < bn ? -1 : an > bn ? 1 : 0;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }

  // ── Case filter dropdown + custom groups (shared keys with docket page) ────
  var GROUPS_KEY = "ud-case-groups";
  function loadGroups() {
    try {
      var g = JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]");
      return Array.isArray(g) ? g : [];
    } catch (e) { return []; }
  }
  function saveGroups(groups) {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); } catch (e) {}
    schedulePrefsPush();
  }
  function validGroupSlugs(group) {
    var known = {};
    CASES.forEach(function (c) { known[c.slug] = true; });
    return (group.slugs || []).filter(function (s) { return known[s]; });
  }
  function caseFilterLabel() {
    var total = CASES.length;
    if (!total) return "Cases";
    var on = CASES.filter(function (c) { return !!activeCases[c.slug]; }).length;
    if (on === total) return "Cases: All (" + total + ")";
    if (!on) return "Cases: None";
    return "Cases: " + on + " of " + total;
  }
  function setAllCases(on) {
    CASES.forEach(function (c) { activeCases[c.slug] = on; });
    if (!on) closePopover();
    saveFilterState();
    renderCaseFilter();
    render();
  }

  function renderCaseFilter() {
    var btn = document.getElementById("ud-case-dd-btn");
    var panel = document.getElementById("ud-case-dd-panel");
    if (!btn || !panel) return;
    btn.innerHTML = esc(caseFilterLabel()) + ' <span class="ud-dd-caret">▾</span>';
    if (!CASES.length) {
      panel.innerHTML = '<div class="ud-dd-empty">No cases loaded.</div>';
      return;
    }

    var head =
      '<div class="ud-dd-head">' +
        '<button type="button" class="ud-dd-quick" data-act="all">Select all</button>' +
        '<button type="button" class="ud-dd-quick" data-act="none">Deselect all</button>' +
      "</div>";

    var rows = CASES.map(function (c) {
      var bg = getBg(c.slug, c.default_color);
      var fg = getFg(c.slug, bg);
      var active = !!activeCases[c.slug];
      return (
        '<label class="ud-dd-row" title="' + esc(c.display_name) + '">' +
          '<input type="checkbox" data-slug="' + esc(c.slug) + '"' + (active ? " checked" : "") + ">" +
          '<span class="ud-pill" style="--pb:' + bg + ";--pf:" + fg + '">' + esc(c.short_name) + "</span>" +
          '<span class="ud-dd-spacer"></span>' +
          '<button type="button" class="ud-gear-btn" data-slug="' + esc(c.slug) + '" title="Color settings for ' + esc(c.display_name) + '">⚙</button>' +
        "</label>"
      );
    }).join("");

    var groups = loadGroups();
    var groupRows = groups.map(function (g, i) {
      var n = validGroupSlugs(g).length;
      return (
        '<div class="ud-dd-group-row">' +
          '<button type="button" class="ud-dd-group-name" data-idx="' + i + '" title="Show only these cases">' +
            esc(g.name) + '<span class="ud-dd-group-n">(' + n + ")</span>" +
          "</button>" +
          '<button type="button" class="ud-dd-group-act" data-act="show" data-idx="' + i + '" title="Show only these cases">Show</button>' +
          '<button type="button" class="ud-dd-group-act" data-act="hide" data-idx="' + i + '" title="Hide these cases">Hide</button>' +
          '<button type="button" class="ud-dd-group-del" data-idx="' + i + '" title="Delete group">×</button>' +
        "</div>"
      );
    }).join("");

    var groupsHtml =
      '<div class="ud-dd-groups">' +
        '<div class="ud-dd-groups-title">Groups</div>' +
        (groupRows || '<div class="ud-dd-empty">No groups yet — tick some cases, name the group below, hit Save.</div>') +
        '<div class="ud-dd-save-row">' +
          '<input type="text" id="ud-dd-group-input" class="ud-dd-save-input" placeholder="Name current selection…" maxlength="40">' +
          '<button type="button" id="ud-dd-group-save" class="ud-dd-save-btn">Save group</button>' +
        "</div>" +
      "</div>";

    panel.innerHTML = head + rows + groupsHtml + '<button type="button" class="ud-dd-save-btn ud-dd-saveview" data-close-panel>Save view</button>';

    var saveView = panel.querySelector("[data-close-panel]");
    if (saveView) {
      saveView.addEventListener("click", function () {
        panel.style.display = "none";
        if (typeof closePopover === "function") closePopover();
      });
    }
    panel.querySelectorAll(".ud-dd-quick").forEach(function (q) {
      q.addEventListener("click", function () {
        setAllCases(q.getAttribute("data-act") === "all");
      });
    });

    panel.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener("change", function () {
        var slug = cb.getAttribute("data-slug");
        activeCases[slug] = cb.checked;
        if (!cb.checked && activeGearSlug === slug) closePopover();
        saveFilterState();
        renderCaseFilter();
        render();
      });
    });

    panel.querySelectorAll(".ud-gear-btn").forEach(function (g) {
      g.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var slug = g.getAttribute("data-slug");
        if (activeGearSlug === slug) closePopover();
        else openPopover(slug, g);
      });
    });

    function applyGroup(idx, mode) {
      var g = loadGroups()[idx];
      if (!g) return;
      var slugs = {};
      validGroupSlugs(g).forEach(function (s) { slugs[s] = true; });
      CASES.forEach(function (c) {
        if (mode === "show") activeCases[c.slug] = !!slugs[c.slug];
        else if (slugs[c.slug]) activeCases[c.slug] = false;
      });
      if (activeGearSlug && !activeCases[activeGearSlug]) closePopover();
      saveFilterState();
      renderCaseFilter();
      render();
    }

    panel.querySelectorAll(".ud-dd-group-name").forEach(function (b) {
      b.addEventListener("click", function () {
        applyGroup(Number(b.getAttribute("data-idx")), "show");
      });
    });
    panel.querySelectorAll(".ud-dd-group-act").forEach(function (b) {
      b.addEventListener("click", function () {
        applyGroup(Number(b.getAttribute("data-idx")), b.getAttribute("data-act"));
      });
    });
    panel.querySelectorAll(".ud-dd-group-del").forEach(function (b) {
      b.addEventListener("click", function () {
        var groups2 = loadGroups();
        groups2.splice(Number(b.getAttribute("data-idx")), 1);
        saveGroups(groups2);
        renderCaseFilter();
      });
    });

    function saveCurrentAsGroup() {
      var input = document.getElementById("ud-dd-group-input");
      if (!input) return;
      var name = input.value.trim();
      var slugs = CASES.filter(function (c) { return !!activeCases[c.slug]; })
        .map(function (c) { return c.slug; });
      if (!name || !slugs.length) return;
      var groups2 = loadGroups();
      var existing = null;
      for (var i = 0; i < groups2.length; i++) {
        if (groups2[i].name.toLowerCase() === name.toLowerCase()) { existing = groups2[i]; break; }
      }
      if (existing) { existing.slugs = slugs; }
      else { groups2.push({ name: name, slugs: slugs }); }
      saveGroups(groups2);
      renderCaseFilter();
    }

    var saveBtn = document.getElementById("ud-dd-group-save");
    if (saveBtn) saveBtn.addEventListener("click", saveCurrentAsGroup);
    var nameInput = document.getElementById("ud-dd-group-input");
    if (nameInput) {
      nameInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); saveCurrentAsGroup(); }
      });
    }
  }

  // ── Color popover (same as docket page) ────────────────────────────────────
  function renderSwatches(activeBg) {
    var container = document.getElementById("ud-pop-swatches");
    if (!container) return;
    container.innerHTML = PRESETS.map(function (preset) {
      var isActive = preset.bg.toLowerCase() === (activeBg || "").toLowerCase();
      return (
        '<button class="ud-pop-swatch' + (isActive ? " ud-swatch-active" : "") + '" ' +
          'data-bg="' + preset.bg + '" data-fg="' + preset.fg + '" ' +
          'style="background:' + preset.bg + '" title="' + preset.bg + '"></button>'
      );
    }).join("");
    container.querySelectorAll(".ud-pop-swatch").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var bg = btn.getAttribute("data-bg");
        var fg = btn.getAttribute("data-fg");
        var bgEl = document.getElementById("ud-pop-bg");
        var fgEl = document.getElementById("ud-pop-fg");
        if (bgEl) bgEl.value = bg;
        if (fgEl) fgEl.value = fg;
        applyPopoverColors();
        container.querySelectorAll(".ud-pop-swatch").forEach(function (b) {
          b.classList.toggle("ud-swatch-active", b === btn);
        });
      });
    });
  }

  function openPopover(slug, anchor) {
    activeGearSlug = slug;
    var pop = document.getElementById("ud-color-pop");
    if (!pop) return;
    var c = null;
    for (var i = 0; i < CASES.length; i++) {
      if (CASES[i].slug === slug) { c = CASES[i]; break; }
    }
    var bg = getBg(slug, c ? c.default_color : "#888888");
    var fg = getFg(slug, bg);
    var titleEl = document.getElementById("ud-pop-slug");
    if (titleEl) titleEl.textContent = c ? c.display_name : slug;
    var bgEl = document.getElementById("ud-pop-bg");
    var fgEl = document.getElementById("ud-pop-fg");
    if (bgEl) bgEl.value = bg;
    if (fgEl) fgEl.value = fg;
    renderSwatches(bg);
    var rect = anchor.getBoundingClientRect();
    pop.style.display = "block";
    pop.style.top = (rect.bottom + window.scrollY + 6) + "px";
    pop.style.left = Math.max(4, Math.min(rect.left + window.scrollX, window.innerWidth - 240)) + "px";
  }

  function closePopover() {
    activeGearSlug = null;
    var pop = document.getElementById("ud-color-pop");
    if (pop) pop.style.display = "none";
  }

  function applyPopoverColors() {
    if (!activeGearSlug) return;
    var bgEl = document.getElementById("ud-pop-bg");
    var fgEl = document.getElementById("ud-pop-fg");
    if (!savedColors[activeGearSlug]) savedColors[activeGearSlug] = {};
    if (bgEl && bgEl.value) savedColors[activeGearSlug].bg = bgEl.value;
    if (fgEl && fgEl.value) savedColors[activeGearSlug].fg = fgEl.value;
    saveColors(savedColors);
    renderCaseFilter();
    render();
  }

  function resetColors(slug) {
    if (savedColors[slug]) { delete savedColors[slug]; saveColors(savedColors); }
    var c = null;
    for (var i = 0; i < CASES.length; i++) {
      if (CASES[i].slug === slug) { c = CASES[i]; break; }
    }
    if (c) {
      var defaultBg = c.default_color || "#888888";
      var bgEl = document.getElementById("ud-pop-bg");
      var fgEl = document.getElementById("ud-pop-fg");
      if (bgEl) bgEl.value = defaultBg;
      if (fgEl) fgEl.value = autoFg(defaultBg);
      renderSwatches(defaultBg);
    }
    renderCaseFilter();
    render();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function relLabel(iso) {
    var today = todayISO();
    var d1 = new Date(iso + "T00:00:00");
    var d0 = new Date(today + "T00:00:00");
    var days = Math.round((d1 - d0) / 86400000);
    if (days === 0) return "TODAY";
    if (days === 1) return "Tomorrow";
    if (days === -1) return "Yesterday";
    if (days > 1) return "in " + days + " days";
    return Math.abs(days) + " days ago";
  }

  function prettyDate(iso) {
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(iso + "T00:00:00").getDay()];
    return wd + ", " + names[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
  }

  function agentLabel(name) {
    var n = (name || "").toLowerCase();
    if (n.indexOf("verita") !== -1) return "Verita";
    if (n.indexOf("omni") !== -1) return "Omni";
    if (n.indexOf("epiq") !== -1) return "Epiq";
    if (n.indexOf("kroll") !== -1) return "Kroll";
    if (n.indexOf("kurtzman") !== -1 || n.indexOf("kcc") !== -1) return "KCC";
    if (n.indexOf("stretto") !== -1) return "Stretto";
    if (n.indexOf("prime clerk") !== -1) return "Prime Clerk";
    if (n.indexOf("donlin") !== -1) return "Donlin";
    var first = (name || "").trim().split(/\s+/)[0];
    return first ? first.slice(0, 12) : "Agent";
  }

  function agentLink(ev) {
    if (!ev.claims_url) return "";
    return '<a class="ud-link ud-link-agent" href="' + esc(ev.claims_url) +
      '" target="_blank" rel="noopener" title="Claims agent calendar (' + esc(ev.claims_name || "agent") + ')">' +
      esc(agentLabel(ev.claims_name)) + "</a>";
  }

  function joinCalLinks(a, b) {
    if (a && b) return a + ' <span class="ud-link-empty">|</span> ' + b;
    return a || b || '<span class="ud-link-empty">\u2014</span>';
  }

  function entryLink(ev) {
    var court = "";
    if (ev.event_url) {
      court = '<a class="ud-link" href="' + esc(ev.event_url) + '" target="_blank" rel="noopener">Details</a>';
    } else {
      var entryNum = ev.entry_number != null ? String(ev.entry_number) : null;
      var dktLabel = "Dkt. " + entryNum;
      if (entryNum && ev.docket_url && ev.docket_url.indexOf("courtlistener.com") !== -1) {
        var entryUrl = (function (u, n) { var m = /\/docket\/(\d+)(?:\/([^/?#]+))?/.exec(u); return m ? "https://www.courtlistener.com/docket/" + m[1] + "/" + (m[2] || "-") + "/?entry_gte=" + n + "#entry-" + n : u; })(ev.docket_url, entryNum);
        court = '<a class="ud-link" href="' + esc(entryUrl) + '" target="_blank" rel="noopener">' +
          esc(dktLabel) + "</a>";
      } else if (entryNum && ev.doc_url) {
        court = '<a class="ud-link" href="' + esc(ev.doc_url) + '" target="_blank" rel="noopener">' +
          esc(dktLabel) + "</a>";
      } else if (entryNum) {
        court = '<span class="ud-link-empty">' + esc(dktLabel) + "</span>";
      }
    }
    return joinCalLinks(court, agentLink(ev));
  }

  var jumpDone = false;
  function jumpToHash() {
    if (jumpDone) return;
    var row = null;
    var m = /[#&]ev=([^&]+)/.exec(location.hash || "");
    var mD = /[#&]d=(\d{4}-\d{2}-\d{2})/.exec(location.hash || "");
    if (m) {
      row = document.querySelector('tr[data-evkey="' + CSS.escape(decodeURIComponent(m[1])) + '"]');
    } else if (mD) {
      // Dashboard mini-month day click — land on the first event of that day
      row = document.querySelector('tr[data-evkey^="' + CSS.escape(mD[1]) + '|"]');
    } else { jumpDone = true; return; }
    if (!row) return;
    jumpDone = true;
    row.classList.add("ud-row-cursor");
    row.scrollIntoView({ block: "center" });
  }

  function jumpListToEvent(evkey) {
    calMode = "list";
    saveFilterState();
    render();
    var row = document.querySelector('tr[data-evkey="' + CSS.escape(evkey) + '"]');
    if (row) {
      row.classList.add("ud-row-cursor");
      row.scrollIntoView({ block: "center" });
    }
  }

  // Court → IANA time zone. Explicit zone tokens in the time string win.
  function courtTz(ev) {
    var t = (ev.time || "").toUpperCase();
    if (/\b(ET|EST|EDT)\b/.test(t)) return "America/New_York";
    if (/\b(CT|CST|CDT)\b/.test(t)) return "America/Chicago";
    if (/\b(MT|MST|MDT)\b/.test(t)) return "America/Denver";
    if (/\b(PT|PST|PDT)\b/.test(t)) return "America/Los_Angeles";
    var c = (ev.court || "").toLowerCase();
    if (!c) return null;
    if (/cal(ifornia)?\.?($|[^a-z])|c\.d\.|n\.d\. cal|9th/.test(c) || c.indexOf("cal") !== -1) return "America/Los_Angeles";
    if (/tex|tx/.test(c)) return "America/Chicago";
    if (/del|fla|york|n\.?y|jersey|penn|mass|conn|md|maryland|virginia|d\.c|georgia/.test(c)) return "America/New_York";
    if (/ill|minn|wis|mo|kan|la\.|miss|tenn/.test(c)) return "America/Chicago";
    if (/colo|ariz|utah|mont|n\.?m/.test(c)) return "America/Denver";
    if (/wash|ore|nev/.test(c)) return "America/Los_Angeles";
    return null;
  }

  function parseTime(t) {
    var m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t || "");
    if (!m) return null;
    var h = Number(m[1]) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return { h: h, m: Number(m[2]) };
  }

  // Pull attendance details (Zoom/Teams links, courtroom, dial-ins) from text
  function attendanceInfo(text) {
    var found = [];
    var m;
    var re = /(https?:\/\/)?(zoomgov\.com|zoom\.us|teams\.microsoft\.com)[^\s,)]*/gi;
    while ((m = re.exec(text)) !== null) found.push(m[0]);
    m = /courtroom\s*#?\s*[\w-]+/i.exec(text);
    if (m) found.push(m[0]);
    m = /at\s+(US|U\.S\.)\s+(Bankruptcy\s+)?Court[^.(]{0,80}/i.exec(text);
    if (m) found.push(m[0].trim());
    m = /(\(\d{3}\)\s*|\d{3}[-.])\d{3}[-.]\d{4}/.exec(text);
    if (m) found.push("Dial-in: " + m[0]);
    return found;
  }

  function pad2n(n) { return (n < 10 ? "0" : "") + n; }

  function gcalUrl(ev) {
    var d = (ev.date || "").replace(/-/g, "");
    if (d.length !== 8) return "";
    var title = ev.short + ": " + ev.kind + (ev.time ? " " + ev.time : "");
    var srcUrl = ev.event_url || "";
    if (!srcUrl && ev.entry_number != null && (ev.docket_url || "").indexOf("courtlistener.com") !== -1) {
      srcUrl = (function (u, n) { var m = /\/docket\/(\d+)(?:\/([^/?#]+))?/.exec(u); return m ? "https://www.courtlistener.com/docket/" + m[1] + "/" + (m[2] || "-") + "/?entry_gte=" + n + "#entry-" + n : u; })(ev.docket_url, ev.entry_number);
    }

    var allText = ev.snippet || "";
    (ev.merged || []).forEach(function (x) { allText += "\n" + (x.snippet || ""); });
    var attendance = attendanceInfo(allText);

    var details = ev.kind + (ev.time ? " at " + ev.time : "") +
      "\nCase: " + ev.name +
      (attendance.length ? "\n\nAttendance: " + attendance.join(" \u00b7 ") : "") +
      (ev.snippet ? "\n\n" + ev.snippet : "");
    (ev.merged || []).forEach(function (x) {
      details += "\n\nAlso: " + (x.snippet || x.kind);
    });
    details += (srcUrl ? "\n\nSource: " + srcUrl : "") +
      "\n\n(from Turnpage Calendar)";

    var dates;
    var tzParam = "";
    var tm = parseTime(ev.time);
    var tz = courtTz(ev);
    if (tm && tz) {
      // Real scheduled block in the court's time zone (1 hour)
      var start = d + "T" + pad2n(tm.h) + pad2n(tm.m) + "00";
      var endH = tm.h + 1;
      var end = d + "T" + pad2n(endH) + pad2n(tm.m) + "00";
      dates = start + "/" + end;
      tzParam = "&ctz=" + encodeURIComponent(tz);
    } else {
      var next = new Date(ev.date + "T00:00:00");
      next.setDate(next.getDate() + 1);
      var d2 = next.getFullYear() + pad2n(next.getMonth() + 1) + pad2n(next.getDate());
      dates = d + "/" + d2;
    }
    return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(title) +
      "&dates=" + dates + tzParam +
      "&details=" + encodeURIComponent(details);
  }


  // ── Cmd+K case palette: type to find a case, Enter filters the view to it ──
  var palEl = null, palEntries = [], palIdx = 0;

  function paletteEntries(q) {
    q = (q || "").trim().toLowerCase();
    var out = [{ slug: null, label: "Show all cases", note: "clear filter" }];
    CASES.forEach(function (c) {
      if (!q ||
          (c.display_name || "").toLowerCase().indexOf(q) !== -1 ||
          (c.short_name || "").toLowerCase().indexOf(q) !== -1 ||
          (c.slug || "").toLowerCase().indexOf(q) !== -1) {
        out.push({ slug: c.slug, label: c.display_name || c.slug, note: c.slug });
      }
    });
    return out.slice(0, 14);
  }

  function paletteApply(slug) {
    closePalette();
    CASES.forEach(function (c) {
      activeCases[c.slug] = (slug === null) ? true : (c.slug === slug);
    });
    saveFilterState();
    renderCaseFilter();
    render();
  }

  function renderPaletteList() {
    var ul = palEl.querySelector(".ud-pal-list");
    if (!palEntries.length) {
      ul.innerHTML = '<li class="ud-pal-empty">No case matches</li>';
      return;
    }
    ul.innerHTML = palEntries.map(function (en, i) {
      return '<li class="ud-pal-item' + (i === palIdx ? " ud-pal-cur" : "") +
        '" data-pal-i="' + i + '">' + esc(en.label) +
        '<span class="ud-pal-slug">' + esc(en.note || "") + "</span></li>";
    }).join("");
    var cur = ul.querySelector(".ud-pal-cur");
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
  }

  function closePalette() {
    if (palEl && palEl.parentNode) palEl.parentNode.removeChild(palEl);
    palEl = null;
  }

  function openPalette() {
    if (palEl) { palEl.querySelector(".ud-pal-input").focus(); return; }
    palEl = document.createElement("div");
    palEl.className = "ud-pal-overlay";
    palEl.innerHTML =
      '<div class="ud-pal-box">' +
        '<input class="ud-pal-input" type="text" placeholder="Filter to a case\u2026" autocomplete="off" spellcheck="false">' +
        '<ul class="ud-pal-list"></ul>' +
        '<div class="ud-pal-hint">\u2191\u2193 choose \u00b7 Enter filters the view \u00b7 Esc closes</div>' +
      "</div>";
    document.body.appendChild(palEl);
    var input = palEl.querySelector(".ud-pal-input");
    palEntries = paletteEntries("");
    palIdx = 0;
    renderPaletteList();
    input.addEventListener("input", function () {
      palEntries = paletteEntries(input.value);
      palIdx = palEntries.length ? Math.min(palIdx, palEntries.length - 1) : 0;
      if (input.value.trim() && palEntries.length > 1) palIdx = 1;
      renderPaletteList();
    });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        if (!palEntries.length) return;
        palIdx = (palIdx + (ev.key === "ArrowDown" ? 1 : -1) + palEntries.length) % palEntries.length;
        renderPaletteList();
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        if (palEntries[palIdx]) paletteApply(palEntries[palIdx].slug);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        closePalette();
      }
      ev.stopPropagation();
    });
    palEl.addEventListener("mousedown", function (ev) {
      if (ev.target === palEl) { closePalette(); return; }
      var it = ev.target.closest(".ud-pal-item");
      if (it) {
        ev.preventDefault();
        var en = palEntries[Number(it.getAttribute("data-pal-i"))];
        if (en) paletteApply(en.slug);
      }
    });
    input.focus();
  }

  // ── Month / Week grid views ────────────────────────────────────────────────
  function addDaysISO(iso, n) {
    var d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function weekStartOf(iso) {
    var d = new Date(iso + "T00:00:00");
    return addDaysISO(iso, -d.getDay());  // weeks start on Sunday
  }
  var MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function eventsByDate() {
    var map = {};
    filtered(true).forEach(function (ev) {
      (map[ev.date] = map[ev.date] || []).push(ev);
    });
    return map;
  }

  function gridContainer() {
    var g = document.getElementById("uc-grid");
    if (!g) {
      g = document.createElement("div");
      g.id = "uc-grid";
      var tbl = document.querySelector(".ud-table");
      tbl.parentNode.insertBefore(g, tbl);
      g.addEventListener("click", onGridClick);
    }
    return g;
  }

  function setListVisible(on) {
    var tbl = document.querySelector(".ud-table");
    if (tbl) tbl.style.display = on ? "" : "none";
    var sb = document.getElementById("ud-sort-btn");
    if (sb) sb.style.display = on ? "" : "none";
    var mb = document.getElementById("uc-merge-bar");
    if (mb && !on) mb.style.display = "none";
    var g = document.getElementById("uc-grid");
    if (g) g.style.display = on ? "none" : "";
  }

  function updateModeUI() {
    var seg = document.getElementById("uc-mode");
    if (!seg) return;
    seg.querySelectorAll("button[data-mode]").forEach(function (b) {
      b.className = b.getAttribute("data-mode") === calMode ? "uc-mode-on" : "";
    });
  }

  function chipHtml(ev) {
    var bg = getBg(ev.slug, ev.default_color);
    var fg = getFg(ev.slug, bg);
    return '<span class="uc-cal-chip" data-evkey="' + esc((ev.date || "") + "|" + (ev.short || "")) +
      '" style="--pb:' + bg + ";--pf:" + fg + '" title="' +
      esc(ev.short + " \u2014 " + ev.kind + (ev.time ? " " + ev.time : "") + "\n" + (ev.snippet || "")) + '">' +
      esc(ev.short + " \u00b7 " + ev.kind) + "</span>";
  }

  function gridHeader(label) {
    return '<div class="uc-cal-head">' +
      '<button type="button" class="uc-cal-nav" data-nav="-1">\u2039</button>' +
      '<span class="uc-cal-label">' + esc(label) + "</span>" +
      '<button type="button" class="uc-cal-nav" data-nav="1">\u203a</button>' +
      '<button type="button" class="uc-cal-nav uc-cal-today" data-nav="0">Today</button>' +
      '<span class="uc-cal-note">all dates \u00b7 case filter and search apply</span>' +
      "</div>";
  }

  function renderGrid() {
    setListVisible(false);
    var g = gridContainer();
    var byDate = eventsByDate();
    var today = todayISO();
    var countEl = document.getElementById("ud-count");
    var html = "";
    if (calMode === "month") {
      var ym = calAnchor.slice(0, 7);
      var first = ym + "-01";
      var mo = Number(calAnchor.slice(5, 7)) - 1;
      var yr = Number(calAnchor.slice(0, 4));
      var daysIn = new Date(yr, mo + 1, 0).getDate();
      var cur = weekStartOf(first);
      var last = ym + "-" + pad2(daysIn);
      var visible = 0;
      html += gridHeader(MONTH_NAMES[mo] + " " + yr);
      html += '<div class="uc-cal-grid uc-cal-dow">' + DOW.map(function (d) {
        return "<div>" + d + "</div>";
      }).join("") + "</div>";
      html += '<div class="uc-cal-grid">';
      while (cur <= last || (new Date(cur + "T00:00:00")).getDay() !== 0) {
        var inMonth = cur.slice(0, 7) === ym;
        var evs = inMonth ? (byDate[cur] || []) : [];
        visible += evs.length;
        html += '<div class="uc-cal-cell' + (inMonth ? "" : " uc-cal-out") +
          (cur === today ? " uc-cal-today-cell" : "") + '" data-d="' + cur + '">' +
          '<span class="uc-cal-daynum" data-d="' + cur + '">' + Number(cur.slice(8, 10)) + "</span>" +
          evs.slice(0, 3).map(chipHtml).join("") +
          (evs.length > 3 ? '<span class="uc-cal-more" data-d="' + cur + '">+' + (evs.length - 3) + " more</span>" : "") +
          "</div>";
        cur = addDaysISO(cur, 1);
        if (cur > last && (new Date(cur + "T00:00:00")).getDay() === 0) break;
      }
      html += "</div>";
      if (countEl) countEl.textContent = visible + " event" + (visible === 1 ? "" : "s") + " in " + MONTH_NAMES[mo];
    } else {
      var wk0 = weekStartOf(calAnchor);
      var wk6 = addDaysISO(wk0, 6);
      var wkCount = 0;
      html += gridHeader(prettyDate(wk0) + " \u2013 " + prettyDate(wk6));
      html += '<div class="uc-week-grid">';
      for (var i = 0; i < 7; i++) {
        var day = addDaysISO(wk0, i);
        var evs2 = byDate[day] || [];
        wkCount += evs2.length;
        html += '<div class="uc-week-col' + (day === today ? " uc-cal-today-cell" : "") + '">' +
          '<div class="uc-week-dow">' + DOW[i] + " " + Number(day.slice(8, 10)) + "</div>" +
          evs2.map(function (ev) {
            var bg = getBg(ev.slug, ev.default_color);
            var fg = getFg(ev.slug, bg);
            return '<div class="uc-week-card" data-evkey="' + esc((ev.date || "") + "|" + (ev.short || "")) +
              '" style="border-left-color:' + bg + '">' +
              '<span class="ud-pill" style="--pb:' + bg + ";--pf:" + fg + '">' + esc(ev.short) + "</span>" +
              '<div class="uc-week-kind">' + esc(ev.kind) + (ev.time ? " \u00b7 " + esc(ev.time) : "") + "</div>" +
              (ev.snippet ? '<div class="uc-week-snip">' + esc(ev.snippet) + "</div>" : "") +
              '<div class="uc-week-links">' + entryLink(ev) +
              (gcalUrl(ev) ? ' <a class="uc-gcal" href="' + esc(gcalUrl(ev)) + '" target="_blank" rel="noopener" title="Add to Google Calendar">\ud83d\udcc6</a>' : "") +
              "</div></div>";
          }).join("") +
          "</div>";
      }
      html += "</div>";
      if (countEl) countEl.textContent = wkCount + " event" + (wkCount === 1 ? "" : "s") + " this week";
    }
    g.innerHTML = html;
  }

  function onGridClick(ev) {
    if (ev.target.closest("a")) return;  // real links behave normally
    var nav = ev.target.closest(".uc-cal-nav");
    if (nav) {
      var dir = Number(nav.getAttribute("data-nav"));
      if (dir === 0) calAnchor = todayISO();
      else if (calMode === "month") {
        var d = new Date(calAnchor.slice(0, 7) + "-01T00:00:00");
        d.setMonth(d.getMonth() + dir);
        calAnchor = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-01";
      } else {
        calAnchor = addDaysISO(calAnchor, dir * 7);
      }
      render();
      return;
    }
    var chip = ev.target.closest(".uc-cal-chip, .uc-week-card");
    if (chip) { jumpListToEvent(chip.getAttribute("data-evkey")); return; }
    var day = ev.target.closest(".uc-cal-daynum, .uc-cal-more");
    if (day) {
      calAnchor = day.getAttribute("data-d");
      calMode = "week";
      saveFilterState();
      render();
    }
  }

  function render() {
    updateModeUI();
    if (calMode !== "list") { renderGrid(); return; }
    setListVisible(true);
    var list = filtered();
    var tbody = document.getElementById("uc-tbody");
    var countEl = document.getElementById("ud-count");
    if (countEl) {
      countEl.textContent = list.length + " event" + (list.length === 1 ? "" : "s") +
        (scope === "upcoming" ? " upcoming" : scope === "past" ? " in the past" : "");
    }
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="ud-empty">' +
        (scope === "upcoming"
          ? "No upcoming dates found in the tracked dockets yet. New filings that schedule hearings or deadlines will appear here automatically."
          : "No events match the current filters.") + "</td></tr>";
      return;
    }
    var today = todayISO();
    tbody.innerHTML = list.map(function (ev) {
      var bg = getBg(ev.slug, ev.default_color);
      var fg = getFg(ev.slug, bg);
      var pill = '<span class="ud-pill" style="--pb:' + bg + ";--pf:" + fg + '">' +
        esc(ev.short) + "</span>";
      var rel = relLabel(ev.date);
      var relHtml = ev.date === today
        ? '<span class="ud-new-pill">TODAY</span>'
        : '<span class="uc-rel">' + esc(rel) + "</span>";
      var kindHtml = '<span class="uc-kind">' + esc(ev.kind) + (ev.time ? " · " + esc(ev.time) : "") + "</span>" +
        (ev.merged && ev.merged.length
          ? '<span class="uc-merged-chip" title="' + esc(ev.merged.map(function (x) { return x.snippet; }).join("\n")) + '">+' + ev.merged.length + " merged</span>"
          : "");
      var rowCls = ev.date === today ? ' class="ud-row-new"' : "";
      return (
        "<tr" + rowCls + ' data-evkey="' + esc((ev.date || "") + "|" + (ev.short || "")) + '">' +
          '<td class="ud-date">' + esc(prettyDate(ev.date)) + "</td>" +
          '<td class="uc-rel-cell">' + relHtml + "</td>" +
          '<td class="ud-case">' + pill + "</td>" +
          '<td class="ud-entry">' + kindHtml + ' <span class="ud-desc uc-snippet">' + esc(ev.snippet) + "</span></td>" +
          '<td class="ud-doc">' + entryLink(ev) + "</td>" +
          '<td class="ud-mark-cell">' +
            (gcalUrl(ev)
              ? '<a class="uc-gcal" href="' + esc(gcalUrl(ev)) + '" target="_blank" rel="noopener" title="Add to Google Calendar">\ud83d\udcc6</a>'
              : "") +
          "</td>" +
          '<td class="uc-curate-cell">' +
            '<input type="checkbox" class="uc-sel" data-key="' + esc(ev.key) + '"' + (selectedKeys[ev.key] ? " checked" : "") + ' title="Select for merge/dismiss">' +
            '<button type="button" class="uc-x" data-key="' + esc(ev.key) + '" title="Dismiss this event">×</button>' +
          "</td>" +
        "</tr>"
      );
    }).join("");
    jumpToHash();
    syncSelAll(list);
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.json();
    });
  }

  function updateMeta() {
    var meta = document.getElementById("ud-meta");
    if (!meta) return;
    var today = todayISO();
    var up = EVENTS.filter(function (ev) { return ev.date >= today; }).length;
    meta.textContent =
      CASES.length + " tracked case" + (CASES.length === 1 ? "" : "s") +
      " · " + EVENTS.length + " dated event" + (EVENTS.length === 1 ? "" : "s") +
      " · " + up + " upcoming";
  }

  function init() {
    fetchJson("cases/data/_manifest.json").then(function (manifest) {
      return Promise.all(manifest.map(function (m) {
        return fetchJson("cases/data/" + m.slug + ".json").then(function (caseData) {
          return {
            slug:          m.slug,
            display_name:  m.display_name,
            short_name:    m.short_name,
            docket_url:    (caseData.docket && caseData.docket.docket_url) || m.docket_url || "",
            claims_url:    (caseData.claims_administrator && (caseData.claims_administrator.key_dates_url || caseData.claims_administrator.url)) || "",
            claims_name:   (caseData.claims_administrator && caseData.claims_administrator.name) || "",
            default_color: m.default_color || "#888888",
            court:         m.court || "",
            entries:       (caseData.docket && caseData.docket.entries) || [],
            events:        caseData.events || [],
          };
        }).catch(function () {
          return {
            slug: m.slug, display_name: m.display_name, short_name: m.short_name,
            docket_url: m.docket_url || "", claims_url: "", claims_name: "",
            default_color: m.default_color || "#888888",
            court: m.court || "", entries: [], events: [],
          };
        });
      }));
    }).then(function (cases) {
      CASES = cases;
      var savedAC = _savedState && _savedState.activeCases;
      CASES.forEach(function (c) {
        // Unknown slug = a case added since the state was saved → default ON
        activeCases[c.slug] = savedAC ? savedAC[c.slug] !== false : true;
      });
      // #case=<slug> deep link (dashboard cards/date strip) — solo-filter to
      // that case, same behavior as picking it in the ⌘K palette.
      var mCase = /[#&]case=([a-z0-9,-]+)/.exec(location.hash || "");
      if (mCase) {
        var wanted = mCase[1].split(",").filter(function (s) {
          return CASES.some(function (c) { return c.slug === s; });
        });
        if (wanted.length) {
          CASES.forEach(function (c) { activeCases[c.slug] = wanted.indexOf(c.slug) !== -1; });
          saveFilterState();
        }
      }
      rebuildEvents();
      updateMeta();
      renderCaseFilter();
      render();
      startLiveSync();
      loadServerPrefs();
      loadCuration();
    }).catch(function (err) {
      var tbody = document.getElementById("uc-tbody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="ud-empty">Failed to load docket data: ' + esc(String(err)) + "</td></tr>";
      }
      var meta = document.getElementById("ud-meta");
      if (meta) meta.textContent = "Failed to load";
    });
  }

  // ── Server-side prefs (colors + groups roam across devices) ────────────────
  var prefsAvailable = false;
  var prefsTimer = null;

  function schedulePrefsPush() {
    if (!prefsAvailable) return;
    clearTimeout(prefsTimer);
    prefsTimer = setTimeout(function () {
      fetch("api/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: savedColors, groups: loadGroups() }),
      }).catch(function () {});
    }, 2000);
  }

  function loadServerPrefs() {
    fetchJson("api/prefs").then(function (p) {
      if (!p || !p.ok) return;
      prefsAvailable = true;
      var changed = false;
      if (p.colors && Object.keys(p.colors).length) {
        savedColors = p.colors;
        try { localStorage.setItem(COLOR_KEY, JSON.stringify(savedColors)); } catch (e) {}
        changed = true;
      }
      if (Array.isArray(p.groups) && p.groups.length) {
        try { localStorage.setItem(GROUPS_KEY, JSON.stringify(p.groups)); } catch (e) {}
        changed = true;
      }
      if (Array.isArray(p.presets) && p.presets.length === 12) {
        PRESETS = p.presets.map(function (x) { return { bg: x.bg, fg: x.fg || autoFg(x.bg) }; });
        savePresets();
      }
      if (changed) { renderCaseFilter(); render(); }
    }).catch(function () {});
  }

  // ── Live sync (same endpoint as the docket page) ───────────────────────────
  var LIVE_SYNC_MS = 60000;

  function setSyncStatus(text, isLive) {
    var el = document.getElementById("ud-sync");
    if (!el) return;
    el.textContent = text;
    el.className = isLive ? "ud-sync-live" : "ud-sync-static";
  }

  function liveEntryKey(e) {
    return e.entry_number != null
      ? "n" + e.entry_number
      : "d" + (e.date_filed || "") + "|" + (e.description || "").slice(0, 60);
  }

  function mergeEntries(existing, fresh) {
    // The live endpoint only carries the newest page — union it with what we
    // already have (backfilled history) instead of replacing it.
    var map = {};
    (existing || []).forEach(function (e) { map[liveEntryKey(e)] = e; });
    (fresh || []).forEach(function (e) { map[liveEntryKey(e)] = e; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function applyLive(payload) {
    if (!payload || !payload.ok || !payload.cases || !payload.cases.length) return false;
    var bySlug = {};
    payload.cases.forEach(function (c) { bySlug[c.slug] = c; });
    var touched = false;
    CASES.forEach(function (c) {
      var live = bySlug[c.slug];
      if (!live || !live.entries) return;
      c.entries = mergeEntries(c.entries, live.entries);
      if (live.docket_url && live.docket_url.indexOf("courtlistener.com") !== -1) {
        c.docket_url = live.docket_url;
      }
      touched = true;
    });
    if (!touched) return false;
    rebuildEvents();
    updateMeta();
    render();
    return true;
  }

  function syncLive() {
    fetchJson("api/dockets").then(function (payload) {
      if (applyLive(payload)) {
        var t = new Date();
        setSyncStatus("Live · synced " +
          t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), true);
      } else {
        var reason = payload && payload.error ? payload.error : "live sync unavailable";
        setSyncStatus("Static data \u2014 " + reason, false);
      }
    }).catch(function () {
      setSyncStatus("Static data \u2014 endpoint unreachable", false);
    });
  }

  function startLiveSync() {
    syncLive();
    setInterval(function () {
      if (!document.hidden) syncLive();
    }, LIVE_SYNC_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) syncLive();
    });
  }

  // ── Wire DOM events ────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    loadFilterState();

    var popBg = document.getElementById("ud-pop-bg");
    var popFg = document.getElementById("ud-pop-fg");
    if (popBg) popBg.addEventListener("input", applyPopoverColors);
    if (popFg) popFg.addEventListener("input", applyPopoverColors);

    var resetBtn = document.getElementById("ud-pop-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (activeGearSlug) resetColors(activeGearSlug);
      });
    }

    document.addEventListener("click", function (ev) {
      var pop = document.getElementById("ud-color-pop");
      if (pop && pop.style.display !== "none" && !pop.contains(ev.target)) {
        closePopover();
      }
    });

    var ddBtn = document.getElementById("ud-case-dd-btn");
    var ddPanel = document.getElementById("ud-case-dd-panel");
    if (ddBtn && ddPanel) {
      ddBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var open = ddPanel.style.display !== "none";
        ddPanel.style.display = open ? "none" : "block";
        if (open) closePopover();
      });
      document.addEventListener("click", function (ev) {
        if (ddPanel.style.display === "none") return;
        if (ev.target && !ev.target.isConnected) return;  // click landed on re-rendered UI inside the panel
        if (ddPanel.contains(ev.target) || ddBtn.contains(ev.target)) return;
        var pop = document.getElementById("ud-color-pop");
        if (pop && pop.contains(ev.target)) return;
        ddPanel.style.display = "none";
        closePopover();
      });
    }

    // Select-all header checkbox
    var selAll = document.getElementById("uc-sel-all");
    if (selAll) {
      selAll.addEventListener("change", function () {
        if (selAll.checked) {
          filtered().forEach(function (ev) { selectedKeys[ev.key] = true; });
        } else {
          selectedKeys = {};
        }
        updateMergeBar();
        render();
      });
    }

    // Curation: select / dismiss / merge
    var ucTbody = document.getElementById("uc-tbody");
    if (ucTbody) {
      ucTbody.addEventListener("change", function (ev) {
        var cb = ev.target.closest(".uc-sel");
        if (!cb) return;
        var k = cb.getAttribute("data-key");
        if (cb.checked) selectedKeys[k] = true;
        else delete selectedKeys[k];
        updateMergeBar();
      });
      ucTbody.addEventListener("click", function (ev) {
        var x = ev.target.closest(".uc-x");
        if (!x) return;
        dismissed[x.getAttribute("data-key")] = true;
        pushCuration();
        render();
        updateCurationInfo();
      });
    }
    var mergeBtn = document.getElementById("uc-merge-btn");
    var dismissBtn = document.getElementById("uc-dismiss-btn");
    var clearSel = document.getElementById("uc-clear-sel");
    if (mergeBtn) {
      mergeBtn.addEventListener("click", function () {
        var keys = Object.keys(selectedKeys);
        if (keys.length < 2) return;
        // Primary = the selected event with the most information (time, then
        // link, then longest text) so the merged row keeps the best headline.
        var evs = EVENTS.filter(function (e) { return selectedKeys[e.key]; });
        evs.sort(function (a, b) {
          var sa = (a.time ? 4 : 0) + ((a.event_url || a.entry_number != null) ? 2 : 0) + Math.min(1, (a.snippet || "").length / 200);
          var sb = (b.time ? 4 : 0) + ((b.event_url || b.entry_number != null) ? 2 : 0) + Math.min(1, (b.snippet || "").length / 200);
          return sb - sa;
        });
        var primary = evs.length ? evs[0].key : keys[0];
        mergeGroups.push({ keys: keys, primary: primary });
        mergeGroups.forEach(function (g) {
          g.keys.forEach(function (k) { if (k !== g.primary) mergedInto[k] = g.primary; });
        });
        selectedKeys = {};
        pushCuration();
        updateMergeBar();
        render();
        updateCurationInfo();
      });
    }
    if (dismissBtn) {
      dismissBtn.addEventListener("click", function () {
        Object.keys(selectedKeys).forEach(function (k) { dismissed[k] = true; });
        selectedKeys = {};
        pushCuration();
        updateMergeBar();
        render();
        updateCurationInfo();
      });
    }
    if (clearSel) {
      clearSel.addEventListener("click", function () {
        selectedKeys = {};
        updateMergeBar();
        render();
      });
    }

    var scopeSelect = document.getElementById("uc-scope");
    if (scopeSelect) {
      scopeSelect.value = scope;
      scopeSelect.addEventListener("change", function () {
        scope = scopeSelect.value;
        saveFilterState();
        render();
      });
    }

    var searchInput = document.getElementById("ud-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchText = searchInput.value;
        render();
      });
    }

    // Docket-style date-window menu on the list view's Date header.
    var lbFromEl = document.getElementById("ud-date-from");
    var lbToEl = document.getElementById("ud-date-to");
    if (lbFromEl) lbFromEl.addEventListener("change", function () { dateFrom = lbFromEl.value; render(); });
    if (lbToEl) lbToEl.addEventListener("change", function () { dateTo = lbToEl.value; render(); });
    function applyCustomVisibility() {
      var dr = document.getElementById("ud-daterange");
      if (dr) dr.style.display = lookahead === "custom" ? "" : "none";
    }
    var LB_LABELS = { "7d": "Next 7 days", "30d": "Next 30 days", "90d": "Next 90 days", all: "All dates", custom: "Custom range" };
    function syncTimeHeader() {
      var th = document.getElementById("ud-th-time");
      if (th) th.classList.toggle("ud-th-on", lookahead !== "all");
      var lbl = document.getElementById("ud-lookback-label");
      if (lbl) lbl.textContent = LB_LABELS[lookahead] || "All dates";
      var menu = document.getElementById("ud-th-timemenu");
      if (menu) menu.querySelectorAll(".ud-th-menu-item").forEach(function (b) {
        b.classList.toggle("ud-th-menu-on", b.getAttribute("data-val") === lookahead);
      });
    }
    var thTimeEl = document.getElementById("ud-th-time");
    var thTimeMenuEl = document.getElementById("ud-th-timemenu");
    if (thTimeEl && thTimeMenuEl) {
      thTimeEl.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var open = thTimeMenuEl.style.display !== "none";
        if (open) { thTimeMenuEl.style.display = "none"; return; }
        var rect = thTimeEl.getBoundingClientRect();
        thTimeMenuEl.style.display = "block";
        thTimeMenuEl.style.top = (rect.bottom + window.scrollY + 4) + "px";
        thTimeMenuEl.style.left = Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 200)) + "px";
        syncTimeHeader();
      });
      thTimeMenuEl.querySelectorAll(".ud-th-menu-item").forEach(function (b) {
        b.addEventListener("click", function () {
          lookahead = b.getAttribute("data-val");
          if (lookahead !== "custom") {
            dateFrom = ""; dateTo = "";
            if (lbFromEl) lbFromEl.value = "";
            if (lbToEl) lbToEl.value = "";
          }
          thTimeMenuEl.style.display = "none";
          saveFilterState();
          syncTimeHeader();
          applyCustomVisibility();
          render();
          if (lookahead === "custom" && lbFromEl) lbFromEl.focus();
        });
      });
      document.addEventListener("click", function (ev) {
        if (thTimeMenuEl.style.display !== "none" && !thTimeMenuEl.contains(ev.target)) {
          thTimeMenuEl.style.display = "none";
        }
      });
    }
    applyCustomVisibility();
    syncTimeHeader();

    var clearBtn = document.getElementById("ud-clear-search");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        searchText = "";
        lookahead = "all";
        dateFrom = ""; dateTo = "";
        if (lbFromEl) lbFromEl.value = "";
        if (lbToEl) lbToEl.value = "";
        if (searchInput) searchInput.value = "";
        saveFilterState();
        syncTimeHeader();
        applyCustomVisibility();
        render();
      });
    }

    var sortBtn = document.getElementById("ud-sort-btn");
    if (sortBtn) {
      sortBtn.textContent = sortDir === "asc" ? "Date ↑" : "Date ↓";
      sortBtn.addEventListener("click", function () {
        sortDir = sortDir === "asc" ? "desc" : "asc";
        sortBtn.textContent = sortDir === "asc" ? "Date ↑" : "Date ↓";
        saveFilterState();
        render();
      });
    }

    calAnchor = todayISO();
    // Deep links (#ev= / #d=) land on list rows — force list for that visit.
    if (/[#&](ev|d)=/.test(location.hash || "")) calMode = "list";
    document.addEventListener("keydown", function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey &&
          (ev.key === "k" || ev.key === "K")) {
        ev.preventDefault();
        openPalette();
      }
    });
    // S then A (within 600ms) = show all cases — clears the case filter.
    var chordSAt = 0;
    document.addEventListener("keydown", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var t = ev.target || {};
      var tag = (t.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable) return;
      var k = (ev.key || "").toLowerCase();
      if (k === "s") { chordSAt = Date.now(); return; }
      if (k === "a" && chordSAt && Date.now() - chordSAt < 600) {
        ev.preventDefault();
        chordSAt = 0;
        paletteApply(null);
      } else {
        chordSAt = 0;
      }
    });


    // L / M / W switch the view (ignored while typing in any field)
    document.addEventListener("keydown", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var t = ev.target || {};
      var tag = (t.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable) return;
      var k = (ev.key || "").toLowerCase();
      if (k === "t") {
        ev.preventDefault();
        calAnchor = todayISO();
        if (calMode === "list") {
          render();
          var today = todayISO();
          var rows = document.querySelectorAll("#uc-tbody tr[data-evkey]");
          for (var ri = 0; ri < rows.length; ri++) {
            if ((rows[ri].getAttribute("data-evkey") || "").slice(0, 10) >= today) {
              rows[ri].classList.add("ud-row-cursor");
              rows[ri].scrollIntoView({ block: "center" });
              break;
            }
          }
        } else {
          render();
        }
        return;
      }
      if (k !== "l" && k !== "m" && k !== "w") return;
      ev.preventDefault();
      calMode = k === "l" ? "list" : k === "m" ? "month" : "week";
      calAnchor = todayISO();
      saveFilterState();
      render();
    });

    var fr = document.querySelector(".ud-filter-right");
    if (fr) {
      var seg = document.createElement("div");
      seg.id = "uc-mode";
      seg.className = "uc-mode";
      seg.innerHTML = '<button type="button" data-mode="list" title="List view (L)">List</button>' +
        '<button type="button" data-mode="month" title="Month view (M)">Month</button>' +
        '<button type="button" data-mode="week" title="Week view (W)">Week</button>';
      fr.insertBefore(seg, fr.firstChild);
      seg.addEventListener("click", function (ev) {
        var b = ev.target.closest("button[data-mode]");
        if (!b) return;
        calMode = b.getAttribute("data-mode");
        calAnchor = todayISO();
        saveFilterState();
        render();
      });
    }

    init();
  });
})();
