(function () {
  "use strict";

  // ── Entry-type classifier ──────────────────────────────────────────────────
  function classifyEntry(desc) {
    var d = (desc || "").toLowerCase();
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
  var categoryFilter = "all";
  var newOnly = false;
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
      if (s.categoryFilter) categoryFilter = s.categoryFilter;
      if (typeof s.newOnly === "boolean") newOnly = s.newOnly;
      if (s.sortDir === "asc" || s.sortDir === "desc") sortDir = s.sortDir;
      _savedState = s;
    } catch (e) {}
  }

  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({
        entryFilter:    entryFilter,
        categoryFilter: categoryFilter,
        newOnly:        newOnly,
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
  function buildAllEntries() {
    ALL = [];
    CASES.forEach(function (c) {
      (c.entries || []).forEach(function (e) {
        ALL.push({
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
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (newOnly && !e.is_new) return false;
      if (entryFilter === "substantive" && !SUBSTANTIVE[e.type]) return false;
      if (entryFilter === "orders" && e.type !== "order") return false;
      if (entryFilter === "transfers" && e.type !== "transfer") return false;
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
      var cmp = a.date_filed < b.date_filed ? -1 : a.date_filed > b.date_filed ? 1 : 0;
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }

  // ── Case chip bar ──────────────────────────────────────────────────────────
  function renderCaseChips() {
    var container = document.getElementById("ud-case-chips");
    if (!container) return;
    if (!CASES.length) {
      container.innerHTML = '<span style="font-size:13px;color:var(--ink-40)">No cases loaded.</span>';
      return;
    }
    container.innerHTML = CASES.map(function (c) {
      var bg = getBg(c.slug, c.default_color);
      var fg = getFg(c.slug, bg);
      var active = !!activeCases[c.slug];
      var chipStyle = active
        ? "background:" + bg + ";color:" + fg + ";border-color:" + bg + ";"
        : "background:var(--paper-2);color:var(--ink-40);border-color:var(--line);";
      return (
        '<span class="ud-chip-wrap">' +
          '<button class="ud-case-chip' + (active ? " ud-chip-active" : "") + '" ' +
            'data-slug="' + esc(c.slug) + '" ' +
            'style="' + chipStyle + '">' +
            esc(c.short_name) +
          '</button>' +
          (active
            ? '<button class="ud-gear-btn" data-slug="' + esc(c.slug) + '" title="Color settings for ' + esc(c.display_name) + '">⚙</button>'
            : "") +
        "</span>"
      );
    }).join("");

    container.querySelectorAll(".ud-case-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var slug = btn.getAttribute("data-slug");
        activeCases[slug] = !activeCases[slug];
        if (!activeCases[slug] && activeGearSlug === slug) closePopover();
        saveFilterState();
        renderCaseChips();
        render();
      });
    });

    container.querySelectorAll(".ud-gear-btn").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var slug = btn.getAttribute("data-slug");
        if (activeGearSlug === slug) {
          closePopover();
        } else {
          openPopover(slug, btn);
        }
      });
    });
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
    renderCaseChips();
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
    renderCaseChips();
    render();
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
      tbody.innerHTML = '<tr><td colspan="5" class="ud-empty">No entries match the current filters.</td></tr>';
      return;
    }
    tbody.innerHTML = entries.map(function (e) {
      var bg = getBg(e.slug, e.default_color);
      var fg = getFg(e.slug, bg);
      var pill = '<span class="ud-pill" style="background:' + bg + ";color:" + fg + '">' +
        esc(e.short) + "</span>";
      var badges = "";
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
      var entryNum = e.entry_number != null ? String(e.entry_number) : null;
      var dktLabel = "Dkt. " + entryNum;
      var linkHtml;
      if (entryNum && e.docket_url && e.docket_url.indexOf("courtlistener.com") !== -1) {
        var entryUrl = e.docket_url.replace(/\/+$/, "") +
          "/?filed_after=&filed_before=&entry_gte=" + entryNum +
          "&entry_lte=" + entryNum + "&order_by=asc";
        linkHtml = '<a class="ud-link" href="' + esc(entryUrl) + '" target="_blank" rel="noopener">' +
          esc(dktLabel) + " ↗</a>";
      } else if (entryNum && e.doc_url) {
        linkHtml = '<a class="ud-link" href="' + esc(e.doc_url) + '" target="_blank" rel="noopener">' +
          esc(dktLabel) + " ↗</a>";
      } else if (entryNum && e.docket_url) {
        linkHtml = '<a class="ud-link ud-link-docket" href="' + esc(e.docket_url) + '" target="_blank" rel="noopener">' +
          esc(dktLabel) + " ↗</a>";
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
          '<td class="ud-doc">' + linkHtml + "</td>" +
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

      renderCaseChips();
      render();
    }).catch(function (err) {
      var tbody = document.getElementById("ud-tbody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="ud-empty">Failed to load docket data: ' + esc(String(err)) + "</td></tr>";
      }
      var meta = document.getElementById("ud-meta");
      if (meta) meta.textContent = "Failed to load";
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

    // Category filter
    var catSelect = document.getElementById("ud-category");
    if (catSelect) {
      catSelect.value = categoryFilter;
      catSelect.addEventListener("change", function () {
        categoryFilter = catSelect.value;
        saveFilterState();
        render();
      });
    }

    // Entry type filter
    var typeSelect = document.getElementById("ud-entry-type");
    if (typeSelect) {
      typeSelect.value = entryFilter;
      typeSelect.addEventListener("change", function () {
        entryFilter = typeSelect.value;
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
