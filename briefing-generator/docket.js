(function () {
  "use strict";

  // ── Entry-type classifier ──────────────────────────────────────────────────
  function classifyEntry(desc) {
    var d = (desc || "").toLowerCase();
    // Housekeeping filings first — these contain "motion"/"order" wording but are
    // not substantive: PHV admissions (and orders granting them), transcript
    // order forms, and Rule 3001(e) claim-transfer notices.
    if (/pro hac vice/.test(d)) return "appearance";
    if (/transcript order form|\bao 435\b/.test(d)) return "transcript";
    if (/rule 3001|3001\s*\(e\)|transfer of claim|transfer\/assignment of claim|assignment of claim/.test(d)) return "transfer";
    if (/notice of (electronic )?appearance|notice of appearance/.test(d)) return "appearance";
    if (/certificate of service/.test(d)) return "service";
    if (/notice of (transfer|removal|reassignment)/.test(d)) return "transfer";
    if (/\border\b/.test(d)) return "order";
    if (/\bmotion\b/.test(d)) return "motion";
    if (/\bobjection\b|\bopposition\b/.test(d)) return "objection";
    if (/\bresponse\b|\breply\b/.test(d)) return "response";
    if (/\bapplication\b/.test(d)) return "application";
    if (/\bcomplaint\b|\badversary proceeding\b/.test(d)) return "complaint";
    if (/\bdeclaration\b|\baffidavit\b/.test(d)) return "declaration";
    if (/\bstipulation\b/.test(d)) return "stipulation";
    if (/\bnotice\b/.test(d)) return "notice";
    return "other";
  }

  var SUBSTANTIVE = {
    motion: 1, objection: 1, response: 1, application: 1,
    complaint: 1, declaration: 1, stipulation: 1, order: 1,
  };

  // ── Filing party extractor ─────────────────────────────────────────────────
  function extractParty(desc) {
    if (!desc) return "";
    var d = desc.trim();
    if (/^(ORDER|JUDGMENT|REPORT|MINUTE|SCHEDULING|TRANSCRIPT)\b/i.test(d)) return "Court";
    if (/Signed by Judge|COURT STAFF|Court Staff/i.test(d)) return "Court";
    var m = d.match(/\bfiled\s+by\s*([A-Z][^()\n]{1,60}?)(?:\s*[.(,]|$)/i);
    if (m) { var p = m[1].replace(/\s+/g, " ").trim(); if (p.length > 1) return p; }
    m = d.match(/\bsubmitted\s+by\s+([A-Z][^()\n]{1,40}?)(?:\s*[.(,]|$)/i);
    if (m) return m[1].replace(/\s+/g, " ").trim();
    return "";
  }

  // ── Preset palette — pastel bg + darker same-hue text ────────────────────
  var PRESETS = [
    {bg:"#ECFCCB", fg:"#3f6212"},
    {bg:"#DBEAFE", fg:"#1e40af"},
    {bg:"#FFEDD5", fg:"#9a3412"},
    {bg:"#F3E8FF", fg:"#6b21a8"},
    {bg:"#D1FAE5", fg:"#065f46"},
    {bg:"#FEE2E2", fg:"#991b1b"},
    {bg:"#FEF3C7", fg:"#92400e"},
    {bg:"#CCFBF1", fg:"#134e4a"},
    {bg:"#FCE7F3", fg:"#9d174d"},
    {bg:"#E0E7FF", fg:"#3730a3"},
    {bg:"#FAE8FF", fg:"#86198f"},
    {bg:"#E0F2FE", fg:"#075985"},
  ];

  // ── Color helpers ──────────────────────────────────────────────────────────
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
  var ALL = [];
  var activeCases = {};
  var entryFilter = "all";
  var newOnly = false;
  var rowKind = "both";  // both | filings | articles
  var bmOnly = false;
  var noteOnly = false;
  var NOTES = {};
  var sortDir = "desc";
  var searchText = "";
  var dateFrom = "";
  var dateTo = "";
  var activeGearSlug = null;
  var _savedState = null;

  // ── Filter-state persistence (localStorage) ────────────────────────────────
  var FILTER_KEY = "ud-filter-state";

  function loadFilterState() {
    try {
      var s = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
      if (s.entryFilter)   entryFilter   = s.entryFilter;
      if (typeof s.newOnly === "boolean") newOnly = s.newOnly;
      if (s.rowKind === "both" || s.rowKind === "filings" || s.rowKind === "articles") rowKind = s.rowKind;
      else if (s.showArticles === false) rowKind = "filings";  // migrate the retired checkbox
      if (typeof s.bmOnly === "boolean") bmOnly = s.bmOnly;
      if (typeof s.noteOnly === "boolean") noteOnly = s.noteOnly;
      // migrate the retired select-based filter
      if (s.markedFilter === "bookmarked" || s.markedFilter === "either") bmOnly = true;
      if (s.markedFilter === "noted") noteOnly = true;
      if (s.sortDir === "asc" || s.sortDir === "desc") sortDir = s.sortDir;
      _savedState = s;
    } catch (e) {}
  }

  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({
        entryFilter:    entryFilter,
        newOnly:        newOnly,
        rowKind:        rowKind,
        bmOnly:         bmOnly,
        noteOnly:       noteOnly,
        sortDir:        sortDir,
        activeCases:    activeCases,
      }));
    } catch (e) {}
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function isNewEntry(dateFiled) {
    if (!dateFiled) return false;
    var cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    return dateFiled >= cutoff;
  }

  // ── Build flat entry list from loaded cases ────────────────────────────────
  var MONTH_NAMES = ["january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"];

  function articleISO(raw) {
    raw = (raw || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    var m = raw.toLowerCase().match(/^([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m) {
      for (var i = 0; i < MONTH_NAMES.length; i++) {
        if (MONTH_NAMES[i].indexOf(m[1]) === 0) {
          var mm = i + 1, dd = Number(m[2]);
          return m[3] + "-" + (mm < 10 ? "0" : "") + mm + "-" + (dd < 10 ? "0" : "") + dd;
        }
      }
    }
    return "";
  }

  function fmtDisplayDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
  }

  function buildAllEntries() {
    ALL = [];
    CASES.forEach(function (c) {
      (c.articles || []).forEach(function (a) {
        if (!a.url || !a.headline) return;
        var iso = articleISO(a.date);
        ALL.push({
          slug:          c.slug,
          name:          c.display_name,
          short:         c.short_name,
          default_color: c.default_color,
          docket_url:    "",
          category:      c.category || "other",
          entry_number:  null,
          date_filed:    iso,
          date_display:  iso ? fmtDisplayDate(iso) : (a.date || ""),
          description:   a.headline + (a.summary ? " \u2014 " + a.summary : ""),
          is_new:        isNewEntry(iso),
          doc_url:       a.url,
          landmark:      "",
          type:          "article",
          party:         a.source || "",
          is_article:    true,
        });
      });
      (c.entries || []).forEach(function (e) {
        ALL.push({
          claims_url:    c.claims_url || "",
          claims_name:   c.claims_name || "",
          slug:          c.slug,
          name:          c.display_name,
          short:         c.short_name,
          default_color: c.default_color,
          docket_url:    c.docket_url || "",
          category:      c.category || "other",
          entry_number:  e.entry_number,
          date_filed:    e.date_filed || "",
          date_display:  e.date_display || e.date_filed || "",
          description:   (e.description || "").trim(),
          is_new:        isNewEntry(e.date_filed),
          doc_url:       e.doc_url || "",
          landmark:      e.landmark || "",
          type:          classifyEntry(e.description),
          party:         extractParty(e.description || ""),
        });
      });
    });
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  function filtered() {
    var sq = searchText.toLowerCase().trim();
    var list = ALL.filter(function (e) {
      if (!activeCases[e.slug]) return false;
      if (!e.description && e.entry_number == null && !e.doc_url) return false;
      if (rowKind === "filings" && e.is_article) return false;
      if (rowKind === "articles" && !e.is_article) return false;
      if (bmOnly || noteOnly) {
        var mrec = NOTES[entryNoteKey(e)];
        if (bmOnly && !(mrec && mrec.bookmarked)) return false;
        if (noteOnly && !(mrec && (mrec.note || "").trim())) return false;
      }
      if (newOnly && !e.is_new) return false;
      // Entry-type filters only apply to docket entries — the Articles
      // checkbox is the sole gate for news rows.
      if (!e.is_article) {
        if (entryFilter === "substantive" && !SUBSTANTIVE[e.type]) return false;
        if (entryFilter === "orders" && e.type !== "order") return false;
        if (entryFilter === "transfers" && e.type !== "transfer") return false;
      }
      if (dateFrom && e.date_filed && e.date_filed < dateFrom) return false;
      if (dateTo && e.date_filed && e.date_filed > dateTo) return false;
      if (sq) {
        var haystack = [
          e.date_filed, e.date_display,
          e.name, e.short,
          e.party,
          e.description,
        ].join(" ").toLowerCase();
        if (haystack.indexOf(sq) === -1) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      if (!a.date_filed !== !b.date_filed) return a.date_filed ? -1 : 1;
      var cmp = a.date_filed < b.date_filed ? -1 : a.date_filed > b.date_filed ? 1 : 0;
      if (cmp === 0 && a.slug === b.slug) {
        // Same day, same case → docket number decides (filing order within the day)
        var an = a.entry_number == null ? -Infinity : Number(a.entry_number);
        var bn = b.entry_number == null ? -Infinity : Number(b.entry_number);
        if (isNaN(an)) an = -Infinity;
        if (isNaN(bn)) bn = -Infinity;
        cmp = an < bn ? -1 : an > bn ? 1 : 0;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }

  // ── Case filter dropdown + custom groups ───────────────────────────────────────
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

  // ── Color popover ──────────────────────────────────────────────────────────
  function renderSwatches(activeBg) {
    var container = document.getElementById("ud-pop-swatches");
    if (!container) return;
    container.innerHTML = PRESETS.map(function (preset) {
      var isActive = preset.bg.toLowerCase() === (activeBg || "").toLowerCase();
      return (
        '<button class="ud-pop-swatch' + (isActive ? " ud-swatch-active" : "") + '" ' +
          'data-bg="' + preset.bg + '" data-fg="' + preset.fg + '" ' +
          'style="background:' + preset.bg + '" ' +
          'title="' + preset.bg + '"></button>'
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
    var top = rect.bottom + window.scrollY + 6;
    var left = Math.min(rect.left + window.scrollX, window.innerWidth - 240);
    pop.style.top = top + "px";
    pop.style.left = Math.max(4, left) + "px";
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
    var bg = bgEl ? bgEl.value : null;
    var fg = fgEl ? fgEl.value : null;
    if (!savedColors[activeGearSlug]) savedColors[activeGearSlug] = {};
    if (bg) savedColors[activeGearSlug].bg = bg;
    if (fg) savedColors[activeGearSlug].fg = fg;
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
      var defaultFg = autoFg(defaultBg);
      var bgEl = document.getElementById("ud-pop-bg");
      var fgEl = document.getElementById("ud-pop-fg");
      if (bgEl) bgEl.value = defaultBg;
      if (fgEl) fgEl.value = defaultFg;
      renderSwatches(defaultBg);
    }
    renderCaseFilter();
    render();
  }

  // Raw administrator names are clunky ("Omniagentsolutions", "Epiq11") —
  // show the familiar short brand as the link text.
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

  function joinLinks(linkHtml, agent) {
    // "Dkt. 546 | Verita" — and when there is no docket link, just the agent.
    var hasDocketLink = linkHtml.indexOf("<a ") !== -1;
    if (!agent) return linkHtml;
    if (!hasDocketLink) return agent;
    return linkHtml + '<span class="ud-sep">|</span>' + agent;
  }

  function agentLink(e) {
    if (!e.claims_url) return "";
    return '<a class="ud-link ud-link-agent" href="' + esc(e.claims_url) +
      '" target="_blank" rel="noopener" title="Claims agent docket (' + esc(e.claims_name || "agent") + ')">' +
      esc(agentLabel(e.claims_name)) + "</a>";
  }

  function markCells(e) {
    var nk = entryNoteKey(e);
    var rec = NOTES[nk];
    var bm = !!(rec && rec.bookmarked);
    var hasNote = !!(rec && (rec.note || "").trim());
    return (
      '<td class="ud-mark-cell"><button type="button" class="ud-bm-btn' + (bm ? " ud-bm-on" : "") + '" ' +
        'data-nk="' + esc(nk) + '" title="' + (bm ? "Remove bookmark" : "Bookmark") + '">' + (bm ? "\u2605" : "\u2606") + "</button></td>" +
      '<td class="ud-mark-cell"><button type="button" class="ud-note-btn' + (hasNote ? " ud-note-on" : "") + '" ' +
        'data-nk="' + esc(nk) + '" title="' + (hasNote ? "Edit note" : "Add note") + '">\ud83d\udcdd</button></td>'
    );
  }

  // ── Render table ───────────────────────────────────────────────────────────
  function render() {
    var entries = filtered();
    var tbody = document.getElementById("ud-tbody");
    var countEl = document.getElementById("ud-count");
    if (countEl) {
      countEl.textContent = entries.length + " entr" + (entries.length === 1 ? "y" : "ies");
    }
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="ud-empty">No entries match the current filters.</td></tr>';
      return;
    }
    tbody.innerHTML = entries.map(function (e) {
      var bg = getBg(e.slug, e.default_color);
      var fg = getFg(e.slug, bg);
      var pill = '<span class="ud-pill" style="background:' + bg + ";color:" + fg + '">' +
        esc(e.short) + "</span>";
      var badges = "";
      if (e.is_article) {
        badges += '<span class="ud-news-tag">News</span> ';
      }
      if (e.landmark) {
        badges += '<span class="ud-landmark">' + esc(e.landmark) + "</span> ";
      }
      var newPill = e.is_new ? ' <span class="ud-new-pill">NEW</span>' : "";
      var descHtml = e.description
        ? badges + '<span class="ud-desc">' + esc(e.description) + "</span>" + newPill
        : badges + '<span class="ud-desc ud-desc-empty">—</span>' + newPill;
      var partyHtml = e.party
        ? esc(e.party)
        : '<span class="ud-party-empty">—</span>';
      if (e.is_article) {
        return (
          '<tr class="ud-row-article' + (e.is_new ? " ud-row-new" : "") + '">' +
            '<td class="ud-date">' + esc(e.date_display) + "</td>" +
            '<td class="ud-case">' + pill + "</td>" +
            '<td class="ud-party">' + (e.party ? esc(e.party) : '<span class="ud-party-empty">\u2014</span>') + "</td>" +
            '<td class="ud-entry">' + descHtml + "</td>" +
            '<td class="ud-doc"><a class="ud-link" href="' + esc(e.doc_url) + '" target="_blank" rel="noopener">Read</a></td>' +
            markCells(e) +
          "</tr>"
        );
      }
      var entryNum = e.entry_number != null ? String(e.entry_number) : null;
      var dktLabel = "Dkt. " + entryNum;
      var linkHtml;
      if (entryNum && e.docket_url && e.docket_url.indexOf("courtlistener.com") !== -1) {
        var entryUrl = e.docket_url.replace(/\/+$/, "") +
          "/?filed_after=&filed_before=&entry_gte=" + entryNum +
          "&entry_lte=" + entryNum + "&order_by=asc";
        linkHtml = '<a class="ud-link" href="' + esc(entryUrl) + '" target="_blank" rel="noopener">' +
          esc(dktLabel) + "</a>";
      } else if (entryNum && e.doc_url) {
        linkHtml = '<a class="ud-link" href="' + esc(e.doc_url) + '" target="_blank" rel="noopener">' +
          esc(dktLabel) + "</a>";
      } else if (entryNum && e.docket_url) {
        linkHtml = '<a class="ud-link ud-link-docket" href="' + esc(e.docket_url) + '" target="_blank" rel="noopener">' +
          esc(dktLabel) + "</a>";
      } else if (entryNum) {
        linkHtml = '<span class="ud-link-empty">' + esc(dktLabel) + "</span>";
      } else {
        linkHtml = '<span class="ud-link-empty">—</span>';
      }
      var rowCls = e.is_new ? ' class="ud-row-new"' : "";
      return (
        "<tr" + rowCls + ">" +
          '<td class="ud-date">' + esc(e.date_display) + "</td>" +
          '<td class="ud-case">' + pill + "</td>" +
          '<td class="ud-party">' + partyHtml + "</td>" +
          '<td class="ud-entry">' + descHtml + "</td>" +
          '<td class="ud-doc">' + joinLinks(linkHtml, agentLink(e)) + "</td>" +
          markCells(e) +
        "</tr>"
      );
    }).join("");
  }

  // ── Dynamic data loading ───────────────────────────────────────────────────
  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.json();
    });
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
            category:      m.category || "other",
            entries:       (caseData.docket && caseData.docket.entries) || [],
            articles:      caseData.coverage || [],
            claims_url:    (caseData.claims_administrator && caseData.claims_administrator.url) || "",
            claims_name:   (caseData.claims_administrator && caseData.claims_administrator.name) || "",
          };
        }).catch(function () {
          return {
            slug:          m.slug,
            display_name:  m.display_name,
            short_name:    m.short_name,
            docket_url:    m.docket_url || "",
            default_color: m.default_color || "#888888",
            category:      m.category || "other",
            entries:       [],
            articles:      [],
            claims_url:    "",
            claims_name:   "",
          };
        });
      }));
    }).then(function (cases) {
      CASES = cases;
      var savedAC = _savedState && _savedState.activeCases;
      CASES.forEach(function (c) {
        activeCases[c.slug] = savedAC ? !!savedAC[c.slug] : true;
      });
      buildAllEntries();

      var meta = document.getElementById("ud-meta");
      if (meta) {
        var total = ALL.length;
        meta.textContent =
          CASES.length + " tracked case" + (CASES.length === 1 ? "" : "s") +
          " · " + total + " total entr" + (total === 1 ? "y" : "ies");
      }

      renderCaseFilter();
      render();
      startLiveSync();
      loadServerPrefs();
      loadNotes();
    }).catch(function (err) {
      var tbody = document.getElementById("ud-tbody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="ud-empty">Failed to load docket data: ' + esc(String(err)) + "</td></tr>";
      }
      var meta = document.getElementById("ud-meta");
      if (meta) meta.textContent = "Failed to load";
    });
  }

  // ── Bookmarks + notes (stored in the repo via /intel/api/notes) ────────────
  var activeNoteKey = null;

  function entryNoteKey(e) {
    return e.slug + "|" + liveEntryKey(e);
  }

  function findEntryByKey(nk) {
    for (var i = 0; i < ALL.length; i++) {
      if (entryNoteKey(ALL[i]) === nk) return ALL[i];
    }
    return null;
  }

  function loadNotes() {
    fetchJson("api/notes").then(function (p) {
      if (p && p.ok && p.entries) {
        NOTES = p.entries;
        render();
      }
    }).catch(function () {});
  }

  // Single-flight save queue: one PUT at a time, latest state per key wins,
  // failures retry with backoff. The sync bots commit to the repo constantly,
  // so individual writes can lose a race — the queue absorbs that.
  var noteQueue = {};        // key → true (dirty)
  var notePushing = false;
  var noteToastTimer = null;

  function noteToast(text, isError) {
    var el = document.getElementById("ud-sync");
    if (!el) return;
    clearTimeout(noteToastTimer);
    var prevText = el.textContent;
    var prevCls = el.className;
    el.textContent = text;
    el.className = isError ? "ud-sync-static" : "ud-sync-live";
    noteToastTimer = setTimeout(function () {
      el.textContent = prevText;
      el.className = prevCls;
    }, isError ? 6000 : 2000);
  }

  function queueNotePush(nk) {
    noteQueue[nk] = true;
    drainNoteQueue();
  }

  function drainNoteQueue() {
    if (notePushing) return;
    var keys = Object.keys(noteQueue);
    if (!keys.length) return;
    var nk = keys[0];
    delete noteQueue[nk];
    notePushing = true;

    var rec = NOTES[nk] || {};
    var entry = findEntryByKey(nk);
    var body = JSON.stringify({
      key: nk,
      bookmarked: !!rec.bookmarked,
      note: rec.note || "",
      context: entry ? {
        case_slug: entry.slug,
        case_name: entry.name,
        entry_number: entry.entry_number,
        date_filed: entry.date_filed,
        snippet: (entry.description || "").slice(0, 200),
      } : {},
    });

    function attempt(n) {
      fetch("api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: body,
      }).then(function (r) { return r.json(); }).then(function (p) {
        if (p && p.ok) {
          noteToast("Saved", false);
          finish();
        } else {
          retry(n);
        }
      }).catch(function () { retry(n); });
    }

    function retry(n) {
      if (n >= 3) {
        noteToast("Save failed \u2014 check connection and try again", true);
        finish();
        return;
      }
      noteToast("Saving\u2026 (retry " + (n + 1) + ")", false);
      setTimeout(function () { attempt(n + 1); }, 1500 * (n + 1));
    }

    function finish() {
      notePushing = false;
      drainNoteQueue();
    }

    noteToast("Saving\u2026", false);
    attempt(0);
  }

  function pushNote(nk) {
    queueNotePush(nk);
  }

  function toggleBookmark(nk) {
    var rec = NOTES[nk] || {};
    rec.bookmarked = !rec.bookmarked;
    if (!rec.bookmarked && !(rec.note || "").trim()) delete NOTES[nk];
    else NOTES[nk] = rec;
    pushNote(nk);
    render();
  }

  function openNoteModal(nk) {
    var e = findEntryByKey(nk);
    if (!e) return;
    activeNoteKey = nk;
    var rec = NOTES[nk] || {};
    var title = document.getElementById("ud-note-title");
    var meta = document.getElementById("ud-note-meta");
    var text = document.getElementById("ud-note-text");
    var status = document.getElementById("ud-note-status");
    if (title) {
      title.textContent = e.short + " \u2014 " +
        (e.entry_number != null ? "Dkt. " + e.entry_number : (e.is_article ? "Article" : "Entry"));
    }
    if (meta) {
      meta.textContent = (e.date_display || e.date_filed || "") + " \u00b7 " +
        (e.description || "").slice(0, 180);
    }
    if (text) text.value = rec.note || "";
    if (status) status.textContent = "";
    var overlay = document.getElementById("ud-note-overlay");
    if (overlay) overlay.style.display = "flex";
    if (text) text.focus();
  }

  function closeNoteModal() {
    activeNoteKey = null;
    var overlay = document.getElementById("ud-note-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function saveNoteFromModal(deleteNote) {
    if (!activeNoteKey) return;
    var nk = activeNoteKey;
    var text = document.getElementById("ud-note-text");
    var val = deleteNote ? "" : (text ? text.value : "");
    var rec = NOTES[nk] || {};
    rec.note = val;
    if (!(val || "").trim() && !rec.bookmarked) delete NOTES[nk];
    else NOTES[nk] = rec;
    pushNote(nk);
    closeNoteModal();
    render();
  }

  // ── In-page case editor — talks to the same /api/admin/cases the admin uses
  // (the intel session IS the admin session, so the cookie just works) ──────
  var editingSlug = null;   // null = creating
  var adminTopics = [];
  var adminCases = null;

  function slugify(name) {
    return (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  function cfEl(id) { return document.getElementById(id); }

  function cfStatus(text, isError) {
    var el = cfEl("cf-status");
    if (el) {
      el.textContent = text;
      el.style.color = isError ? "#C84141" : "";
    }
  }

  function loadAdminCases() {
    return fetchJson("/api/admin/cases").then(function (p) {
      adminTopics = (p && p.topics) || [];
      adminCases = (p && p.cases) || [];
      return p;
    });
  }

  function renderTopicChecks(selected) {
    var box = cfEl("cf-topics");
    if (!box) return;
    var sel = {};
    (selected || []).forEach(function (t) { sel[t] = true; });
    box.innerHTML = adminTopics.map(function (t) {
      var slug = typeof t === "string" ? t : t.slug;
      var label = typeof t === "string" ? t : (t.display || t.slug);
      return '<label><input type="checkbox" value="' + esc(slug) + '"' +
        (sel[slug] ? " checked" : "") + ">" + esc(label) + "</label>";
    }).join("");
  }

  function openCaseEditor(slug) {
    editingSlug = slug || null;
    var overlay = cfEl("ud-case-overlay");
    var title = cfEl("ud-case-title");
    if (title) title.textContent = slug ? "Edit case details" : "Add a case";
    cfStatus(slug ? "Loading case\u2026" : "");
    ["cf-name", "cf-docket-id", "cf-parties", "cf-court", "cf-number", "cf-judge", "cf-claims", "cf-guidance"]
      .forEach(function (id) { if (cfEl(id)) cfEl(id).value = ""; });
    if (overlay) overlay.style.display = "flex";
    loadAdminCases().then(function () {
      if (!editingSlug) { renderTopicChecks([]); cfStatus(""); return; }
      var c = null;
      for (var i = 0; i < adminCases.length; i++) {
        if (adminCases[i].slug === editingSlug) { c = adminCases[i]; break; }
      }
      if (!c) { cfStatus("Could not load this case from admin", true); renderTopicChecks([]); return; }
      cfEl("cf-name").value = c.display_name || "";
      cfEl("cf-docket-id").value = (c.docket_source && c.docket_source.docket_id) || "";
      cfEl("cf-parties").value = (c.case && c.case.parties) || "";
      cfEl("cf-court").value = (c.case && c.case.court) || "";
      cfEl("cf-number").value = (c.case && c.case.case_number) || "";
      cfEl("cf-judge").value = (c.case && c.case.judge) || "";
      cfEl("cf-claims").value = (c.claims_administrator && c.claims_administrator.url) || "";
      cfEl("cf-guidance").value = c.scan_guidance || "";
      renderTopicChecks(c.topics || []);
      cfStatus("");
    }).catch(function () {
      cfStatus("Admin API unreachable \u2014 are you signed in?", true);
      renderTopicChecks([]);
    });
  }

  function closeCaseEditor() {
    editingSlug = null;
    var overlay = cfEl("ud-case-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function caseLookup() {
    var id = (cfEl("cf-docket-id").value || "").trim();
    if (!/^\d+$/.test(id)) { cfStatus("Enter a numeric docket ID first", true); return; }
    cfStatus("Looking up docket " + id + "\u2026");
    fetchJson("/api/admin/courtlistener-lookup?docket_id=" + id).then(function (p) {
      if (!p || !p.ok) { cfStatus((p && p.error) || "Lookup failed", true); return; }
      if (p.case_name && !cfEl("cf-parties").value) cfEl("cf-parties").value = p.case_name;
      if (p.case_name && !cfEl("cf-name").value) cfEl("cf-name").value = p.case_name.split(" v.")[0].slice(0, 60);
      if (p.court) cfEl("cf-court").value = p.court;
      if (p.docket_number) cfEl("cf-number").value = p.docket_number;
      if (p.judge) cfEl("cf-judge").value = p.judge;
      cfStatus("Found \u2014 review the fields and save");
    }).catch(function () { cfStatus("Lookup failed \u2014 network error", true); });
  }

  function saveCase() {
    var name = (cfEl("cf-name").value || "").trim();
    var slug = editingSlug || slugify(name);
    var topics = [];
    document.querySelectorAll("#cf-topics input:checked").forEach(function (cb) {
      topics.push(cb.value);
    });
    var claimsUrl = (cfEl("cf-claims").value || "").trim();
    var body = {
      slug: slug,
      display_name: name,
      status: "active",
      topics: topics,
      case: {
        parties: (cfEl("cf-parties").value || "").trim(),
        court: (cfEl("cf-court").value || "").trim(),
        case_number: (cfEl("cf-number").value || "").trim(),
        judge: (cfEl("cf-judge").value || "").trim(),
      },
      docket_source: {
        type: "courtlistener",
        docket_id: (cfEl("cf-docket-id").value || "").trim() || null,
        url: "",
        awaiting_sync: false,
      },
      claims_administrator: claimsUrl ? { url: claimsUrl } : null,
      scan_guidance: (cfEl("cf-guidance").value || "").trim(),
    };
    cfStatus("Saving\u2026");
    fetch("/api/admin/cases", {
      method: editingSlug ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); }).then(function (p) {
      if (!p || !p.ok) { cfStatus((p && p.error) || "Save failed", true); return; }
      closeCaseEditor();
      noteToast("Case saved \u2014 it appears everywhere after the next build (\u22482 min)", false);
      // Optimistic chip so the dropdown reflects it immediately
      if (!editingSlug) {
        var exists = CASES.some(function (c) { return c.slug === slug; });
        if (!exists) {
          CASES.push({
            slug: slug, display_name: name, short_name: name.split(/\s+/).slice(0, 2).join(" "),
            docket_url: "", default_color: "#888888", category: "other",
            entries: [], articles: [], claims_url: claimsUrl, claims_name: "",
          });
          activeCases[slug] = true;
          renderCaseFilter();
        }
      }
    }).catch(function () { cfStatus("Save failed \u2014 network error", true); });
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

  // ── Live sync (CourtListener via /intel/api/dockets) ───────────────────────
  // Refreshes entries every minute while the tab is visible. The endpoint
  // edge-caches upstream calls, so extra tabs cost nothing. Any failure just
  // leaves the build-time static data in place.
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
    buildAllEntries();
    var meta = document.getElementById("ud-meta");
    if (meta) {
      meta.textContent =
        CASES.length + " tracked case" + (CASES.length === 1 ? "" : "s") +
        " · " + ALL.length + " total entr" + (ALL.length === 1 ? "y" : "ies");
    }
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
    // Restore saved filter state before wiring controls
    loadFilterState();

    // Popover color pickers
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

    // Close popover on outside click
    document.addEventListener("click", function (ev) {
      var pop = document.getElementById("ud-color-pop");
      if (pop && pop.style.display !== "none" && !pop.contains(ev.target)) {
        closePopover();
      }
    });

    // Case editor
    var caseAdd = document.getElementById("ud-case-add");
    if (caseAdd) caseAdd.addEventListener("click", function () { openCaseEditor(null); });
    var popEdit = document.getElementById("ud-pop-edit");
    if (popEdit) {
      popEdit.addEventListener("click", function () {
        if (!activeGearSlug) return;
        var s = activeGearSlug;
        closePopover();
        openCaseEditor(s);
      });
    }
    var cfSave = document.getElementById("cf-save");
    var cfCancel = document.getElementById("cf-cancel");
    var cfLookupBtn = document.getElementById("cf-lookup");
    var cfOverlay = document.getElementById("ud-case-overlay");
    if (cfSave) cfSave.addEventListener("click", saveCase);
    if (cfCancel) cfCancel.addEventListener("click", closeCaseEditor);
    if (cfLookupBtn) cfLookupBtn.addEventListener("click", caseLookup);
    if (cfOverlay) {
      cfOverlay.addEventListener("click", function (ev) {
        if (ev.target === cfOverlay) closeCaseEditor();
      });
    }

    // Case dropdown open/close
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

    // Column-header filters
    var ENTRY_LABELS = { all: "Entry", substantive: "Entry \u00b7 Substantive",
      orders: "Entry \u00b7 Orders", transfers: "Entry \u00b7 Transfers" };
    var thEntry = document.getElementById("ud-th-entry");
    var thMenu = document.getElementById("ud-th-menu");

    function syncHeaderStates() {
      if (thEntry) {
        var lbl = thEntry.querySelector(".ud-th-label");
        if (lbl) lbl.textContent = ENTRY_LABELS[entryFilter] || "Entry";
        thEntry.classList.toggle("ud-th-on", entryFilter !== "all");
      }
      var thBm = document.getElementById("ud-th-bm");
      var thNote = document.getElementById("ud-th-note");
      if (thBm) thBm.classList.toggle("ud-th-on", bmOnly);
      if (thNote) thNote.classList.toggle("ud-th-on", noteOnly);
      if (thMenu) {
        thMenu.querySelectorAll(".ud-th-menu-item").forEach(function (b) {
          b.classList.toggle("ud-th-menu-on", b.getAttribute("data-val") === entryFilter);
        });
      }
    }

    if (thEntry && thMenu) {
      thEntry.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var open = thMenu.style.display !== "none";
        if (open) { thMenu.style.display = "none"; return; }
        var rect = thEntry.getBoundingClientRect();
        thMenu.style.display = "block";
        thMenu.style.top = (rect.bottom + window.scrollY + 4) + "px";
        thMenu.style.left = (rect.left + window.scrollX) + "px";
        syncHeaderStates();
      });
      thMenu.querySelectorAll(".ud-th-menu-item").forEach(function (b) {
        b.addEventListener("click", function () {
          entryFilter = b.getAttribute("data-val");
          thMenu.style.display = "none";
          saveFilterState();
          syncHeaderStates();
          render();
        });
      });
      document.addEventListener("click", function (ev) {
        if (thMenu.style.display !== "none" && !thMenu.contains(ev.target)) {
          thMenu.style.display = "none";
        }
      });
    }
    var thBmEl = document.getElementById("ud-th-bm");
    if (thBmEl) {
      thBmEl.addEventListener("click", function () {
        bmOnly = !bmOnly;
        saveFilterState();
        syncHeaderStates();
        render();
      });
    }
    var thNoteEl = document.getElementById("ud-th-note");
    if (thNoteEl) {
      thNoteEl.addEventListener("click", function () {
        noteOnly = !noteOnly;
        saveFilterState();
        syncHeaderStates();
        render();
      });
    }
    syncHeaderStates();

    // Bookmark / note clicks (delegated — rows re-render constantly)
    var tbodyEl = document.getElementById("ud-tbody");
    if (tbodyEl) {
      tbodyEl.addEventListener("click", function (ev) {
        var bm = ev.target.closest(".ud-bm-btn");
        if (bm) { toggleBookmark(bm.getAttribute("data-nk")); return; }
        var nb = ev.target.closest(".ud-note-btn");
        if (nb) { openNoteModal(nb.getAttribute("data-nk")); }
      });
    }

    // Note modal buttons
    var noteSave = document.getElementById("ud-note-save");
    var noteCancel = document.getElementById("ud-note-cancel");
    var noteDelete = document.getElementById("ud-note-delete");
    var noteOverlay = document.getElementById("ud-note-overlay");
    if (noteSave) noteSave.addEventListener("click", function () { saveNoteFromModal(false); });
    if (noteCancel) noteCancel.addEventListener("click", closeNoteModal);
    if (noteDelete) noteDelete.addEventListener("click", function () { saveNoteFromModal(true); });
    if (noteOverlay) {
      noteOverlay.addEventListener("click", function (ev) {
        if (ev.target === noteOverlay) closeNoteModal();
      });
    }
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && activeNoteKey) closeNoteModal();
    });

    // Row-kind view: filings, articles, or both
    var rowKindSel = document.getElementById("ud-rowkind");
    if (rowKindSel) {
      rowKindSel.value = rowKind;
      rowKindSel.addEventListener("change", function () {
        rowKind = rowKindSel.value;
        saveFilterState();
        render();
      });
    }

    // New-only checkbox
    var newCb = document.getElementById("ud-new-only");
    if (newCb) {
      newCb.checked = newOnly;
      newCb.addEventListener("change", function () {
        newOnly = newCb.checked;
        saveFilterState();
        render();
      });
    }

    // Search input (not persisted — too transient)
    var searchInput = document.getElementById("ud-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchText = searchInput.value;
        render();
      });
    }

    // Date range (not persisted)
    var dateFromEl = document.getElementById("ud-date-from");
    var dateToEl = document.getElementById("ud-date-to");
    if (dateFromEl) {
      dateFromEl.addEventListener("change", function () {
        dateFrom = dateFromEl.value;
        render();
      });
    }
    if (dateToEl) {
      dateToEl.addEventListener("change", function () {
        dateTo = dateToEl.value;
        render();
      });
    }

    // Clear button
    var clearBtn = document.getElementById("ud-clear-search");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        searchText = "";
        dateFrom = "";
        dateTo = "";
        if (searchInput) searchInput.value = "";
        if (dateFromEl) dateFromEl.value = "";
        if (dateToEl) dateToEl.value = "";
        render();
      });
    }

    // Sort button — restore saved direction
    var sortBtn = document.getElementById("ud-sort-btn");
    if (sortBtn) {
      sortBtn.textContent = sortDir === "desc" ? "Date ↓" : "Date ↑";
      sortBtn.addEventListener("click", function () {
        sortDir = sortDir === "desc" ? "asc" : "desc";
        sortBtn.textContent = sortDir === "desc" ? "Date ↓" : "Date ↑";
        saveFilterState();
        render();
      });
    }

    init();
  });
})();
