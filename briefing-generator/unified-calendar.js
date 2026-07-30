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
        slug: caseInfo.slug,
        short: caseInfo.short_name,
        name: caseInfo.display_name,
        default_color: caseInfo.default_color,
        docket_url: caseInfo.docket_url || "",
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

  var PRESETS = [
    {bg:"#ECFCCB", fg:"#3f6212"}, {bg:"#DBEAFE", fg:"#1e40af"},
    {bg:"#FFEDD5", fg:"#9a3412"}, {bg:"#F3E8FF", fg:"#6b21a8"},
    {bg:"#D1FAE5", fg:"#065f46"}, {bg:"#FEE2E2", fg:"#991b1b"},
    {bg:"#FEF3C7", fg:"#92400e"}, {bg:"#CCFBF1", fg:"#134e4a"},
    {bg:"#FCE7F3", fg:"#9d174d"}, {bg:"#E0E7FF", fg:"#3730a3"},
    {bg:"#FAE8FF", fg:"#86198f"}, {bg:"#E0F2FE", fg:"#075985"},
  ];

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
  var activeGearSlug = null;
  var _savedState = null;

  var FILTER_KEY = "uc-filter-state";
  function loadFilterState() {
    try {
      var s = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
      if (s.scope) scope = s.scope;
      if (s.sortDir === "asc" || s.sortDir === "desc") sortDir = s.sortDir;
      _savedState = s;
    } catch (e) {}
  }
  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({
        scope: scope, sortDir: sortDir, activeCases: activeCases,
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
          slug: c.slug,
          short: c.short_name,
          name: c.display_name,
          default_color: c.default_color,
          docket_url: "",
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

  // ── Filter + sort ──────────────────────────────────────────────────────────
  function filtered() {
    var sq = searchText.toLowerCase().trim();
    var today = todayISO();
    var list = EVENTS.filter(function (ev) {
      if (!activeCases[ev.slug]) return false;
      if (scope === "upcoming" && ev.date < today) return false;
      if (scope === "past" && ev.date >= today) return false;
      if (sq) {
        var hay = [ev.date, ev.kind, ev.name, ev.short, ev.snippet].join(" ").toLowerCase();
        if (hay.indexOf(sq) === -1) return false;
      }
      return true;
    });
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
          '<span class="ud-pill" style="background:' + bg + ";color:" + fg + '">' + esc(c.short_name) + "</span>" +
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

    panel.innerHTML = head + rows + groupsHtml;

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

  function entryLink(ev) {
    if (ev.event_url) {
      return '<a class="ud-link" href="' + esc(ev.event_url) + '" target="_blank" rel="noopener">Details \u2197</a>';
    }
    var entryNum = ev.entry_number != null ? String(ev.entry_number) : null;
    var dktLabel = "Dkt. " + entryNum;
    if (entryNum && ev.docket_url && ev.docket_url.indexOf("courtlistener.com") !== -1) {
      var entryUrl = ev.docket_url.replace(/\/+$/, "") +
        "/?filed_after=&filed_before=&entry_gte=" + entryNum +
        "&entry_lte=" + entryNum + "&order_by=asc";
      return '<a class="ud-link" href="' + esc(entryUrl) + '" target="_blank" rel="noopener">' +
        esc(dktLabel) + " ↗</a>";
    }
    if (entryNum && ev.doc_url) {
      return '<a class="ud-link" href="' + esc(ev.doc_url) + '" target="_blank" rel="noopener">' +
        esc(dktLabel) + " ↗</a>";
    }
    if (entryNum) return '<span class="ud-link-empty">' + esc(dktLabel) + "</span>";
    return '<span class="ud-link-empty">—</span>';
  }

  function render() {
    var list = filtered();
    var tbody = document.getElementById("uc-tbody");
    var countEl = document.getElementById("ud-count");
    if (countEl) {
      countEl.textContent = list.length + " event" + (list.length === 1 ? "" : "s") +
        (scope === "upcoming" ? " upcoming" : scope === "past" ? " in the past" : "");
    }
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="ud-empty">' +
        (scope === "upcoming"
          ? "No upcoming dates found in the tracked dockets yet. New filings that schedule hearings or deadlines will appear here automatically."
          : "No events match the current filters.") + "</td></tr>";
      return;
    }
    var today = todayISO();
    tbody.innerHTML = list.map(function (ev) {
      var bg = getBg(ev.slug, ev.default_color);
      var fg = getFg(ev.slug, bg);
      var pill = '<span class="ud-pill" style="background:' + bg + ";color:" + fg + '">' +
        esc(ev.short) + "</span>";
      var rel = relLabel(ev.date);
      var relHtml = ev.date === today
        ? '<span class="ud-new-pill">TODAY</span>'
        : '<span class="uc-rel">' + esc(rel) + "</span>";
      var kindHtml = '<span class="uc-kind">' + esc(ev.kind) + (ev.time ? " · " + esc(ev.time) : "") + "</span>";
      var rowCls = ev.date === today ? ' class="ud-row-new"' : "";
      return (
        "<tr" + rowCls + ">" +
          '<td class="ud-date">' + esc(prettyDate(ev.date)) + "</td>" +
          '<td class="uc-rel-cell">' + relHtml + "</td>" +
          '<td class="ud-case">' + pill + "</td>" +
          '<td class="ud-entry">' + kindHtml + ' <span class="ud-desc uc-snippet">' + esc(ev.snippet) + "</span></td>" +
          '<td class="ud-doc">' + entryLink(ev) + "</td>" +
        "</tr>"
      );
    }).join("");
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
            default_color: m.default_color || "#888888",
            entries:       (caseData.docket && caseData.docket.entries) || [],
            events:        caseData.events || [],
          };
        }).catch(function () {
          return {
            slug: m.slug, display_name: m.display_name, short_name: m.short_name,
            docket_url: m.docket_url || "", default_color: m.default_color || "#888888",
            entries: [], events: [],
          };
        });
      }));
    }).then(function (cases) {
      CASES = cases;
      var savedAC = _savedState && _savedState.activeCases;
      CASES.forEach(function (c) {
        activeCases[c.slug] = savedAC ? !!savedAC[c.slug] : true;
      });
      rebuildEvents();
      updateMeta();
      renderCaseFilter();
      render();
      startLiveSync();
      loadServerPrefs();
    }).catch(function (err) {
      var tbody = document.getElementById("uc-tbody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="ud-empty">Failed to load docket data: ' + esc(String(err)) + "</td></tr>";
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
        if (ddPanel.contains(ev.target) || ddBtn.contains(ev.target)) return;
        var pop = document.getElementById("ud-color-pop");
        if (pop && pop.contains(ev.target)) return;
        ddPanel.style.display = "none";
        closePopover();
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

    var clearBtn = document.getElementById("ud-clear-search");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        searchText = "";
        if (searchInput) searchInput.value = "";
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

    init();
  });
})();
