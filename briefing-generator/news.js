(function () {
  "use strict";

  /* News — every article and feed item in one view (the docket keeps court
     filings plus case-tagged articles). Same machinery as docket.js: filters,
     votes, notes, snooze, hide/delete, uploads, keyboard nav. */

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
  var rowKind = "articles";  // pinned — this page is the news side of the split
  var bmOnly = false;
  var noteOnly = false;
  var NOTES = {};
  var BONDORO = [];
  var VOTES = {};
  var UPLOADS = {};
  var UNASSIGNED_KEY = "__unassigned__";
  var THEME_INFO = {};  // slug → {name, emoji} from themes.json (admin-managed)
  var SHOW_THEME_EMOJIS = true;

  function loadThemeInfo() {
    fetchJson("themes.json").then(function (d) {
      SHOW_THEME_EMOJIS = !d || d.show_emojis !== false;
      ((d && d.themes) || []).forEach(function (t) {
        if (t && t.slug) THEME_INFO[t.slug] = { name: t.display_name || t.slug, emoji: t.emoji || "" };
      });
      render();
    }).catch(function () {});
  }

  // Theme pills are monochrome outline: white bg / black outline+text,
  // inverted in dark mode (both come from the page's --surface/--ink vars).
  function themePillHtml(slug) {
    var info = THEME_INFO[slug] || { name: slug, emoji: "" };
    return '<span class="ud-pill ud-pill-theme">' +
      (SHOW_THEME_EMOJIS && info.emoji ? info.emoji + " " : "") + esc(info.name) + "</span>";
  }
  var RENDERED = [];
  var RENAMED = {};  // "slug|nNN" → manual title (case JSON is canonical)
  var PROTECTED_TITLES = {};  // from case JSON entries flagged titled_from_upload
  var cursorIdx = -1;
  var sortDir = "desc";
  var searchText = "";
  var dateFrom = "";
  var dateTo = "";
  var lookback = "all";       // 24h | 7d | 30d | 90d | all | custom (docket-style header menu)
  var activeGearSlug = null;
  var activeSources = {};
  var _savedState = null;

  // ── Filter-state persistence (localStorage) ────────────────────────────────
  // Unrelated articles (no case, group, or theme) stay OUT of the feed by
  // default — stored and searchable, never clutter. relV:2 migrates browsers
  // that saved the old show-everything default.
  var relatedOnly = true;
  var FILTER_KEY = "un-news-filter-state";

  function loadFilterState() {
    try {
      var s = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
      if (s.entryFilter)   entryFilter   = s.entryFilter;
      if (typeof s.relatedOnly === "boolean" && s.relV === 2) relatedOnly = s.relatedOnly;
      rowKind = "articles";
      if (typeof s.bmOnly === "boolean") bmOnly = s.bmOnly;
      if (typeof s.noteOnly === "boolean") noteOnly = s.noteOnly;
      // migrate the retired select-based filter
      if (s.markedFilter === "bookmarked" || s.markedFilter === "either") bmOnly = true;
      if (s.markedFilter === "noted") noteOnly = true;
      if (s.sortDir === "asc" || s.sortDir === "desc") sortDir = s.sortDir;
      if (["24h", "7d", "30d", "90d", "all", "custom"].indexOf(s.lookback) !== -1) lookback = s.lookback;
      _savedState = s;
    } catch (e) {}
  }

  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({
        relV:           2,
        relatedOnly:    relatedOnly,
        entryFilter:    entryFilter,
        rowKind:        rowKind,
        bmOnly:         bmOnly,
        noteOnly:       noteOnly,
        sortDir:        sortDir,
        lookback:       lookback,
        activeCases:    activeCases,
        activeSources:  activeSources,
      }));
    } catch (e) {}
  }

  function lookbackCutoffIso() {
    var days = lookback === "24h" ? 1 : lookback === "7d" ? 7
      : lookback === "30d" ? 30 : lookback === "90d" ? 90 : 0;
    if (!days) return "";
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function clampMenuLeft(el, left) {
    var w = el.offsetWidth || 200;
    return Math.max(4, Math.min(left, window.innerWidth - w - 8));
  }

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

  // Mobile cards drop the day dividers, so each row carries its own date
  // (calendar-list style: "Tue, Aug 11, 2026"). Desktop ignores it.
  function rowDayLabel(e) {
    var d = (e.date_filed || (e.published_at || "").slice(0, 10) || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return e.date_display || "";
    var dt = new Date(d + "T00:00:00");
    if (isNaN(dt)) return e.date_display || d;
    // Mobile-only label: month + day is enough context in a dated list.
    return dt.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function fmtTime(e) {
    // Docket entries: court-local time_filed "HH:MM:SS". Feed items: ISO
    // published_at rendered in the viewer's local time.
    if (e.published_at) {
      var d = new Date(e.published_at);
      if (!isNaN(d)) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    var m = /^(\d{2}):(\d{2})/.exec(e.time_filed || "");
    if (m) {
      var h = Number(m[1]);
      var ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return h + ":" + m[2] + " " + ampm;
    }
    return "";
  }

  // Sortable moment string — full ISO for feed items (published_at already
  // carries a time), date+time_filed for docket entries that have a court
  // time, otherwise just the bare date so undated-time entries still land in
  // the right day but sort after their same-day, time-stamped neighbors.
  function entryMoment(e) {
    if (e.published_at) return e.published_at;
    if (e.date_filed && e.time_filed) return e.date_filed + "T" + e.time_filed;
    return e.date_filed || "";
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
          social_title:  a.headline,
          social_excerpt: a.summary || "",
          is_article:    true,
        });
      });
      (rowKind === "__never__" ? c.entries || [] : []).forEach(function (e) {
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
          time_filed:    e.time_filed || "",
          date_display:  e.date_display || e.date_filed || "",
          description:   (RENAMED[c.slug + "|n" + e.entry_number] || PROTECTED_TITLES[c.slug + "|n" + e.entry_number] || e.description || "").trim(),
          is_new:        isNewEntry(e.date_filed),
          doc_url:       e.doc_url || "",
          landmark:      e.landmark || "",
          type:          classifyEntry(e.description),
          party:         extractParty(e.description || ""),
        });
      });
    });
    bondoroEntries().forEach(function (e) { ALL.push(e); });
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  function filtered() {
    var sq = searchText.toLowerCase().trim();
    var list = ALL.filter(function (e) {
      if (e.is_bondoro && e.unassigned) {
        if (!activeCases[UNASSIGNED_KEY]) return false;
      } else if (e.is_bondoro && e.group_name) {
        var grpF = findGroup(e.group_name);
        var members = grpF ? validGroupSlugs(grpF) : [];
        var anyOn = false;
        for (var mi = 0; mi < members.length; mi++) {
          if (activeCases[members[mi]]) { anyOn = true; break; }
        }
        if (members.length && !anyOn) return false;
        if (!members.length && !activeCases[UNASSIGNED_KEY]) return false;
      } else if (!activeCases[e.slug]) return false;
      if (!e.description && e.entry_number == null && !e.doc_url) return false;
      if (rowKind === "filings" && e.is_article) return false;
      if (rowKind === "articles" && !e.is_article) return false;
      var hrec = NOTES[entryNoteKey(e)];
      if (hrec && hrec.deleted_at) return false;
      if (hrec && hrec.hidden && !searchText.trim()) return false;
      // Archived (>30 days, un-acted-on) stays out of the default view but
      // returns when searching — the "retain for search" half of retention.
      if (e.archived && !searchText.trim()) return false;
      if (e.is_article && !sourceOn(e.party)) return false;
      if (bmOnly || noteOnly) {
        var mrec = NOTES[entryNoteKey(e)];
        if (bmOnly && !(mrec && mrec.bookmarked)) return false;
        if (noteOnly && !(mrec && (mrec.note || "").trim())) return false;
      }
      // Searching reaches the whole store (same rule as archived items).
      if (relatedOnly && !searchText.trim() && e.is_article && !e.slug && !e.group_name && !e.theme_slug) return false;
      // Entry-type filters only apply to docket entries — the Articles
      // checkbox is the sole gate for news rows.
      if (entryFilter !== "all") {
        var kind = (e.bondoro_kind || "News").toLowerCase();
        if (entryFilter === "alerts" && kind !== "alert") return false;
        if (entryFilter === "summaries" && kind !== "summary") return false;
        if (entryFilter === "news" && kind !== "news") return false;
        if (entryFilter === "sales" && kind !== "asset sale") return false;
      }
      var lbCut = lookbackCutoffIso();
      if (lbCut && e.date_filed && e.date_filed < lbCut) return false;
      if (dateFrom && e.date_filed && e.date_filed < dateFrom) return false;
      if (dateTo && e.date_filed && e.date_filed > dateTo) return false;
      if (sq) {
        var docText = docsFor(entryNoteKey(e)).map(function (d) {
          return (d.name || "") + " " + (d.text || "");
        }).join(" ");
        var haystack = [
          docText, e.date_filed, e.date_display, fmtTime(e),
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
      var am = entryMoment(a), bm = entryMoment(b);
      var cmp = am < bm ? -1 : am > bm ? 1 : 0;
      if (cmp === 0 && a.slug === b.slug) {
        // Same moment (or same day with neither timestamped), same case →
        // docket number decides (filing order within the day)
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
    activeCases[UNASSIGNED_KEY] = on;
    if (!on) closePopover();
    saveFilterState();
    renderCaseFilter();
    render();
  }

  // ── Source show/hide (news outlets + feeds, like the case filter) ─────────
  function sourceKey(name) {
    return String(name || "Unknown").toLowerCase();
  }

  function isFeedName(name) {
    var k = sourceKey(name);
    for (var i = 0; i < FEED_SOURCES.length; i++) {
      if (sourceKey(FEED_SOURCES[i].name) === k) return true;
    }
    return false;
  }

  // Outlets that aren't ★ favorites (Manage → Sources) share ONE filter
  // toggle — "All other sources" — instead of a row each.
  function isOtherSource(name) {
    return !isFeedName(name) && !SRC_FAVORITES[sourceKey(name)];
  }

  function sourceOn(name) {
    // Deleted in Manage → Sources: the outlet's rows never show, whatever the
    // filter says. Stored coverage is untouched — restoring the outlet there
    // brings its rows straight back.
    if (SRC_BLOCKED[sourceKey(name)]) return false;
    var k = isOtherSource(name) ? OTHER_SRC_KEY : sourceKey(name);
    if (!(k in activeSources)) {
      var sv = _savedState && _savedState.activeSources;
      // Unknown source = one that appeared since the view was saved → default ON
      activeSources[k] = sv ? sv[k] !== false : true;
    }
    return activeSources[k];
  }

  function allSources() {
    var seen = {};
    var out = [];
    ALL.forEach(function (e) {
      if (!e.is_article) return;
      var name = e.party || "Unknown";
      var k = sourceKey(name);
      if (seen[k] || SRC_BLOCKED[k]) return;   // deleted outlets leave the filter too
      seen[k] = true;
      out.push({ key: k, name: name, feed: !!e.is_bondoro });
    });
    out.sort(function (a, b) {
      if (a.feed !== b.feed) return a.feed ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return out;
  }

  function renderSourceFilter() {
    var th = document.getElementById("ud-th-source");
    var panel = document.getElementById("ud-source-dd-panel");
    if (!th || !panel) return;
    var list = allSources();
    var on = list.filter(function (s) { return sourceOn(s.name); }).length;
    var lbl = th.querySelector(".ud-th-label");
    if (lbl) lbl.textContent = list.length && on < list.length ? "Author \u00b7 " + on + "/" + list.length : "Author";
    th.classList.toggle("ud-th-on", list.length > 0 && on < list.length);
    if (panel.style.display === "none" && panel.childNodes.length) return;  // rebuild only when open
    if (!list.length) {
      panel.innerHTML = '<div class="ud-dd-empty">No news rows loaded yet.</div>';
      return;
    }

    function section(title, grp, items) {
      if (!items.length) return "";
      return (
        '<div class="ud-dd-groups-title">' + title +
          ' <button type="button" class="ud-dd-quick" data-gact="all" data-grp="' + grp + '">All</button>' +
          '<button type="button" class="ud-dd-quick" data-gact="none" data-grp="' + grp + '">None</button>' +
        "</div>" +
        items.map(function (s) {
          return (
            '<label class="ud-dd-row" title="' + esc(s.name) + '">' +
              '<input type="checkbox" data-src="' + esc(s.key) + '"' + (sourceOn(s.name) ? " checked" : "") + ">" +
              "<span>" + esc(s.name) + "</span>" +
            "</label>"
          );
        }).join("")
      );
    }

    var feeds = list.filter(function (s) { return s.feed; });
    var pressAll = list.filter(function (s) { return !s.feed; });
    var press = pressAll.filter(function (s) { return SRC_FAVORITES[s.key]; });
    var others = pressAll.filter(function (s) { return !SRC_FAVORITES[s.key]; });
    var othersRow = "";
    if (others.length) {
      var names = others.slice(0, 14).map(function (s) { return s.name; }).join(", ") +
        (others.length > 14 ? ", …" : "");
      othersRow =
        '<div class="ud-dd-groups-title">Other sources</div>' +
        '<label class="ud-dd-row" title="' + esc(names) + '">' +
          '<input type="checkbox" data-src="' + OTHER_SRC_KEY + '"' +
            (sourceOn(others[0].name) ? " checked" : "") + ">" +
          "<span>All other sources (" + others.length + ")</span>" +
        "</label>";
    }
    panel.innerHTML =
      '<div class="ud-dd-head">' +
        '<button type="button" class="ud-dd-quick" data-act="all">Select all</button>' +
        '<button type="button" class="ud-dd-quick" data-act="none">Deselect all</button>' +
      "</div>" +
      section("Feeds", "feed", feeds) +
      section("Favorites", "press", press) +
      othersRow +
      '<a href="manage.html#sources" style="display:block;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:0.02em;text-decoration:none;color:var(--ink-60,inherit);border-top:1px solid rgba(128,128,128,0.25);">\u2699 Manage sources</a>' +
      '<button type="button" class="ud-dd-save-btn ud-dd-saveview" data-close-panel>Save view</button>';

    var saveView = panel.querySelector("[data-close-panel]");
    if (saveView) {
      saveView.addEventListener("click", function () { panel.style.display = "none"; });
    }
    panel.querySelectorAll(".ud-dd-quick").forEach(function (q) {
      q.addEventListener("click", function () {
        var grp = q.getAttribute("data-grp");
        var onAll = (q.getAttribute("data-act") || q.getAttribute("data-gact")) === "all";
        list.forEach(function (s) {
          if (!grp || (grp === "feed") === s.feed) activeSources[s.key] = onAll;
        });
        if (grp !== "feed") activeSources[OTHER_SRC_KEY] = onAll;
        saveFilterState();
        renderSourceFilter();
        render();
      });
    });
    panel.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeSources[cb.getAttribute("data-src")] = cb.checked;
        saveFilterState();
        renderSourceFilter();
        render();
      });
    });
  }

  function renderCaseFilter() {
    var th = document.getElementById("ud-th-case");
    var panel = document.getElementById("ud-case-dd-panel");
    if (!panel) return;
    if (th) {
      var lbl = th.querySelector(".ud-th-label");
      var total = CASES.length;
      var on = CASES.filter(function (c) { return !!activeCases[c.slug]; }).length;
      if (lbl) lbl.textContent = total && on < total ? "Case \u00b7 " + on + "/" + total : "Case";
      th.classList.toggle("ud-th-on", total > 0 && on < total);
    }
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
          '<a class="ud-details-link" href="manage.html#cases=' + esc(c.slug) + '" title="Edit case details in Settings"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>' +
        "</label>"
      );
    }).join("");

    rows += (
      '<label class="ud-dd-row" title="Feed items not yet assigned to a case">' +
        '<input type="checkbox" data-slug="' + UNASSIGNED_KEY + '"' + (activeCases[UNASSIGNED_KEY] ? " checked" : "") + ">" +
        '<span class="ud-pill" style="background:transparent;color:var(--ink-60);border:1px dashed var(--ink-40)">Uncategorized</span>' +
        '<span class="ud-dd-spacer"></span>' +
      "</label>"
    );

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

    panel.innerHTML = groupsHtml + head + rows + '<button type="button" class="ud-dd-save-btn ud-dd-saveview" data-close-panel>Save view</button>';

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

    panel.querySelectorAll(".ud-details-link").forEach(function (a) {
      a.addEventListener("click", function (ev) { ev.stopPropagation(); });
    });
    if (false) panel.querySelectorAll(".ud-gear-btn-retired").forEach(function (g) {
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
      if (mode === "show") activeCases[UNASSIGNED_KEY] = false;
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

  var paletteEditing = false;

  function renderSwatchEditors() {
    var container = document.getElementById("ud-pop-swatches");
    if (!container) return;
    container.classList.add("ud-sw-editing");
    container.innerHTML = PRESETS.map(function (p, i) {
      return (
        '<div class="ud-sw-row" data-row="' + i + '">' +
          '<span class="ud-sw-preview" style="background:' + p.bg + ";color:" + p.fg + '">Aa</span>' +
          '<label>Bg <input type="color" class="ud-sw-bg" data-idx="' + i + '" value="' + p.bg + '"></label>' +
          '<label>Text <input type="color" class="ud-sw-fg" data-idx="' + i + '" value="' + p.fg + '"></label>' +
        "</div>"
      );
    }).join("");
    function commit(i) {
      var rowEl = container.querySelector('[data-row="' + i + '"]');
      var bg = rowEl.querySelector(".ud-sw-bg").value;
      var fg = rowEl.querySelector(".ud-sw-fg").value;
      PRESETS[i] = { bg: bg, fg: fg };
      var prev = rowEl.querySelector(".ud-sw-preview");
      prev.style.background = bg;
      prev.style.color = fg;
      savePresets();
      schedulePrefsPush();
    }
    container.querySelectorAll(".ud-sw-bg, .ud-sw-fg").forEach(function (inp) {
      inp.addEventListener("input", function () { commit(Number(inp.getAttribute("data-idx"))); });
    });
  }

  function setPaletteEditing(on) {
    paletteEditing = on;
    var btn = document.getElementById("ud-pop-palette");
    if (btn) btn.textContent = on ? "Done editing palette" : "Edit palette\u2026";
    if (on) renderSwatchEditors();
    else {
      var container = document.getElementById("ud-pop-swatches");
      if (container) container.classList.remove("ud-sw-editing");
      var bgEl = document.getElementById("ud-pop-bg");
      renderSwatches(bgEl ? bgEl.value : "");
    }
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

    paletteEditing = false;
    var palBtn = document.getElementById("ud-pop-palette");
    if (palBtn) palBtn.textContent = "Edit palette\u2026";
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
    var snz = rec && rec.snooze_until;
    var snzTitle = snz ? "Snoozed until " + new Date(snz).toLocaleString() + " \u2014 click to change" : "Snooze \u2014 remind me later";
    return (
      '<td class="ud-mark-cell"><button type="button" class="ud-bm-btn' + (bm ? " ud-bm-on" : "") + '" ' +
        'data-nk="' + esc(nk) + '" title="' + (bm ? "Remove bookmark" : "Bookmark") + '">' + (bm ? "\u2605" : "\u2606") + "</button></td>" +
      '<td class="ud-mark-cell"><button type="button" class="ud-snz-btn' + (snz ? " ud-snz-on" : "") + '" ' +
        'data-nk="' + esc(nk) + '" title="' + esc(snzTitle) + '"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" style=\"vertical-align:middle\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></svg></button></td>' +
      '<td class="ud-mark-cell"><button type="button" class="ud-hide-btn' + (rec && rec.hidden ? " ud-hide-on" : "") + '" ' +
        'data-nk="' + esc(nk) + '" title="' + (rec && rec.hidden ? "Unhide this row" : "Hide this row (H) \u2014 still appears in search") + '"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle\"><path d=\"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94\"/><path d=\"M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19\"/><path d=\"M14.12 14.12a3 3 0 1 1-4.24-4.24\"/><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"/></svg></button></td>' +
      '<td class="ud-mark-cell"><button type="button" class="ud-del-btn" ' +
        'data-nk="' + esc(nk) + '" title="Delete this row (X) \u2014 restorable for 30 days"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle\"><path d=\"M3 6h18\"/><path d=\"M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2\"/><path d=\"M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6\"/><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/></svg></button></td>' +
      '<td class="ud-mark-cell"><button type="button" class="ud-note-btn' + (hasNote ? " ud-note-on" : "") + '" ' +
        'data-nk="' + esc(nk) + '" title="' + (hasNote ? "Edit note" : "Add note") + '"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z\"/></svg></button></td>' +
      '<td class="ud-mark-cell"><button type="button" class="ud-soc-btn" ' +
        'data-nk="' + esc(nk) + '" title="Draft social post \u2014 one-time briefing + LinkedIn / X drafts, written as Andrew"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle\"><circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><line x1=\"8.59\" y1=\"13.51\" x2=\"15.42\" y2=\"17.49\"/><line x1=\"15.41\" y1=\"6.51\" x2=\"8.59\" y2=\"10.49\"/></svg></button></td>'
    );
  }


  // ── Social post drafting — same flow as the Prospects page button:
  // POST api/social-draft with the story's verified facts (plus the tagged
  // case's identifiers when there is one) → briefing + LinkedIn + X drafts
  // written as Andrew. Draft only: nothing is posted or saved. ─────────────
  // Social-modal styles live in intel-chrome.css (shared with Prospects).

  var activeSocialEntry = null;

  function ensureSocialModal() {
    if (document.getElementById("pr-social-overlay")) return;
    var ov = document.createElement("div");
    ov.id = "pr-social-overlay";
    ov.className = "pr-overlay";
    ov.style.display = "none";
    ov.innerHTML =
      '<div class="pr-box" style="width:min(720px,100%);">' +
        '<h2 id="pr-social-title">Draft social post</h2>' +
        '<div class="sub">A one-time briefing plus LinkedIn / X drafts, written as Andrew from this story’s facts. Draft only — nothing is posted or saved.</div>' +
        '<div id="pr-social-loading" class="pr-social-loading"><span class="pr-social-spin"></span> Drafting from the story’s facts…</div>' +
        '<div id="pr-social-content" style="display:none;">' +
          '<div class="pr-social-field">' +
            '<div class="pr-social-lbl"><span>Briefing</span><button type="button" class="pr-copy" data-copy="pr-social-briefing">Copy</button></div>' +
            '<textarea id="pr-social-briefing" class="pr-social-ta" rows="4"></textarea>' +
          '</div>' +
          '<div class="pr-social-field">' +
            '<div class="pr-social-lbl"><span>LinkedIn <span id="pr-social-li-count" class="pr-social-count"></span></span><button type="button" class="pr-copy" data-copy="pr-social-li">Copy</button></div>' +
            '<textarea id="pr-social-li" class="pr-social-ta" rows="11"></textarea>' +
          '</div>' +
          '<div class="pr-social-field">' +
            '<div class="pr-social-lbl"><span>X / Twitter <span id="pr-social-x-count" class="pr-social-count"></span></span><button type="button" class="pr-copy" data-copy="pr-social-x">Copy</button></div>' +
            '<textarea id="pr-social-x" class="pr-social-ta" rows="3"></textarea>' +
          '</div>' +
        '</div>' +
        '<div class="pr-modal-actions">' +
          '<span class="pr-modal-status" id="pr-social-status"></span>' +
          '<button type="button" class="ud-clear-btn" id="pr-social-regen" style="display:none;">Regenerate</button>' +
          '<button type="button" class="ud-clear-btn" id="pr-social-close">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (ev) { if (ev.target === ov) closeSocialModal(); });
    document.getElementById("pr-social-close").addEventListener("click", closeSocialModal);
    document.getElementById("pr-social-regen").addEventListener("click", function () {
      if (activeSocialEntry) generateSocial(activeSocialEntry);
    });
    ov.querySelectorAll(".pr-copy").forEach(function (cp) {
      cp.addEventListener("click", function () {
        var ta = document.getElementById(cp.getAttribute("data-copy"));
        if (ta) copyText(ta.value, cp);
      });
    });
    [["pr-social-li", "pr-social-li-count", 0], ["pr-social-x", "pr-social-x-count", 280]].forEach(function (spec) {
      var ta = document.getElementById(spec[0]);
      if (ta) ta.addEventListener("input", function () { updateSocialCount(spec[0], spec[1], spec[2]); });
    });
  }

  function openSocialModal(nk) {
    var e = findEntryByKey(nk);
    if (!e) return;
    ensureSocialModal();
    activeSocialEntry = e;
    var title = (e.social_title || (e.description || "").split(" — ")[0] || "").slice(0, 120);
    document.getElementById("pr-social-title").textContent = "Draft social post — " + title;
    document.getElementById("pr-social-overlay").style.display = "flex";
    generateSocial(e);
  }

  function closeSocialModal() {
    activeSocialEntry = null;
    var ov = document.getElementById("pr-social-overlay");
    if (ov) ov.style.display = "none";
  }

  function updateSocialCount(taId, countId, max) {
    var ta = document.getElementById(taId), c = document.getElementById(countId);
    if (!ta || !c) return;
    var n = ta.value.length;
    c.textContent = n + (max ? " / " + max : "") + " chars";
    c.classList.toggle("over", !!max && n > max);
  }

  function generateSocial(e) {
    var st = document.getElementById("pr-social-status");
    var loading = document.getElementById("pr-social-loading");
    var content = document.getElementById("pr-social-content");
    var regen = document.getElementById("pr-social-regen");
    if (loading) loading.style.display = "flex";
    if (content) content.style.display = "none";
    if (regen) regen.style.display = "none";
    if (st) { st.textContent = ""; st.className = "pr-modal-status"; }
    var c = e.slug ? caseBySlug(e.slug) : null;
    var excerpt = e.social_excerpt || "";
    var prospect = {
      case_name: e.social_title || (e.description || "").split(" — ")[0] || "News item",
      parties: (c && (c.case_name || c.display_name)) || "",
      court: (c && c.court) || "",
      case_number: (c && c.case_number) || "",
      why: excerpt + (c ? (excerpt ? " " : "") + "(Coverage relates to the tracked case " + (c.display_name || e.name || "") + ".)" : ""),
      source_name: e.party || "",
      source_url: e.doc_url || "",
      date: e.date_filed || "",
    };
    fetch("api/social-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospect: prospect }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "generation failed");
      document.getElementById("pr-social-briefing").value = j.briefing || "";
      document.getElementById("pr-social-li").value = j.linkedin || "";
      document.getElementById("pr-social-x").value = j.x || "";
      updateSocialCount("pr-social-li", "pr-social-li-count", 0);
      updateSocialCount("pr-social-x", "pr-social-x-count", 280);
      if (loading) loading.style.display = "none";
      if (content) content.style.display = "";
      if (regen) regen.style.display = "";
      if (st) { st.textContent = "Draft only — nothing is posted or saved."; st.className = "pr-modal-status"; }
    }).catch(function (err) {
      if (loading) loading.style.display = "none";
      if (regen) regen.style.display = "";
      if (st) { st.textContent = "Couldn’t draft: " + err.message; st.className = "pr-modal-status err"; }
    });
  }

  function copyText(text, btn) {
    function done() {
      if (!btn) return;
      var orig = btn.getAttribute("data-label") || btn.textContent;
      btn.setAttribute("data-label", orig);
      btn.textContent = "Copied";
      btn.classList.add("done");
      setTimeout(function () { btn.textContent = orig; btn.classList.remove("done"); }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e2) {}
  }

  // ── Render table ───────────────────────────────────────────────────────────
  function render() {
    renderSourceFilter();
    var entries = filtered();
    var tbody = document.getElementById("ud-tbody");
    var countEl = document.getElementById("ud-count");
    if (countEl) {
      // If the Sources filter is suppressing article rows, say so right where
      // the count is — an all-deselected saved view otherwise looks like a bug.
      var srcHidden = 0;
      if (rowKind !== "filings") {
        ALL.forEach(function (e) {
          if (e.is_article && !sourceOn(e.party)) srcHidden++;
        });
      }
      countEl.innerHTML = entries.length + " entr" + (entries.length === 1 ? "y" : "ies") +
        (srcHidden ? " · <button type=\"button\" id=\"ud-srcfilter-note\" style=\"background:none;border:none;padding:0;font:inherit;color:var(--ink-60);text-decoration:underline;cursor:pointer;\">" + srcHidden + " article" + (srcHidden === 1 ? "" : "s") + " hidden by the Author filter — show all</button>" : "");
      var srcNote = document.getElementById("ud-srcfilter-note");
      if (srcNote) {
        srcNote.addEventListener("click", function () {
          allSources().forEach(function (s) { activeSources[s.key] = true; });
          saveFilterState();
          renderSourceFilter();
          render();
        });
      }
    }
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="11" class="ud-empty">No entries match the current filters.</td></tr>';
      return;
    }
    var prevDay = null;
    function dayHeader(e) {
      var d = e.date_filed || "";
      if (d === prevDay) return "";
      prevDay = d;
      var label;
      if (!d) label = "Undated";
      else {
        var wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(d + "T00:00:00").getDay()];
        label = wd + " \u00b7 " + (e.date_display || d);
      }
      return '<tr class="ud-day-row"><td colspan="11">' + esc(label) + "</td></tr>";
    }
    RENDERED = entries;
    tbody.innerHTML = entries.map(function (e, ridx) {
      var header = dayHeader(e);
      var bg = getBg(e.slug, e.default_color);
      var fg = getFg(e.slug, bg);
      var pill;
      if (e.is_bondoro) {
        var pillStyle;
        if (e.unassigned) pillStyle = "background:transparent;color:var(--ink-60);border-color:var(--ink-40)";
        else if (e.group_name) pillStyle = "background:var(--paper-2);color:var(--ink);border-color:var(--ink-40)";
        else pillStyle = "--pb:" + bg + ";--pf:" + fg;
        pill = '<button type="button" class="ud-pill ud-pill-assign" data-bondoro="' + esc(e.bondoro_url) + '" ' +
          'style="' + pillStyle + '" title="Click to assign to a case">' +
          esc(e.short) + "</button>";
      } else {
        pill = '<span class="ud-pill" style="--pb:' + bg + ";--pf:" + fg + '">' +
          esc(e.short) + "</span>";
      }
      var badges = "";
      if (e.is_bondoro) {
        badges += '<span class="ud-news-tag">' + esc(e.bondoro_kind) + "</span> ";
      } else if (e.is_article) {
        badges += '<span class="ud-news-tag">News</span> ';
      }
      if (e.landmark) {
        badges += '<span class="ud-landmark">' + esc(e.landmark) + "</span> ";
      }
      var newPill = e.is_new ? ' <span class="ud-new-pill">NEW</span>' : "";
      var descFull = e.description || "";
      var descShown = descFull.length > 700 ? descFull.slice(0, 700).replace(/\s+\S*$/, "") + "\u2026" : descFull;
      var descHtml = e.description
        ? badges + '<span class="ud-desc">' + esc(descShown) + "</span>" + newPill
        : badges + '<span class="ud-desc ud-desc-empty">—</span>' + newPill;
      var partyHtml = e.party
        ? esc(e.party)
        : '<span class="ud-party-empty">—</span>';
      if (e.is_article) {
        var artRowCls = "ud-row-article" +
          (e.is_bondoro && e.unassigned ? " ud-row-bondoro" : "") +
          (e.is_new ? " ud-row-new" : "");
        return (
          header +
          '<tr class="' + artRowCls + '" data-ridx="' + ridx + '">' +
            '<td class="ud-date" data-day="' + esc(rowDayLabel(e)) + '">' + esc(fmtTime(e)) + "</td>" +
            '<td class="ud-case">' + (e.is_bondoro && e.unassigned && e.theme_slug ? themePillHtml(e.theme_slug).replace('class="ud-pill ud-pill-sq"', 'class="ud-pill ud-pill-sq ud-pill-assign" data-bondoro="' + esc(e.bondoro_url) + '" role="button" tabindex="0" title="Click to assign"') : pill) + "</td>" +
            '<td class="ud-party">' + (e.party ? esc(e.party) : '<span class="ud-party-empty">\u2014</span>') + "</td>" +
            '<td class="ud-entry">' + descHtml + "</td>" +
            '<td class="ud-doc">' + docCell(e, '<a class="ud-link" href="' + esc(e.doc_url) + '" target="_blank" rel="noopener">Read</a>', voteButtons(e)) + "</td>" +
            markCells(e) +
          "</tr>"
        );
      }
      var entryNum = e.entry_number != null ? String(e.entry_number) : null;
      var dktLabel = "Dkt. " + entryNum;
      var linkHtml;
      if (entryNum && e.docket_url && e.docket_url.indexOf("courtlistener.com") !== -1) {
        var entryUrl = entryViewUrl(e, entryNum);
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
        header +
        "<tr" + rowCls + ' data-ridx="' + ridx + '">' +
          '<td class="ud-date" data-day="' + esc(rowDayLabel(e)) + '">' + esc(fmtTime(e)) + "</td>" +
          '<td class="ud-case">' + pill + "</td>" +
          '<td class="ud-party">' + partyHtml + "</td>" +
          '<td class="ud-entry">' + descHtml + "</td>" +
          '<td class="ud-doc">' + docCell(e, joinLinks(linkHtml, agentLink(e))) + "</td>" +
          markCells(e) +
        "</tr>"
      );
    }).join("");
    applyCursor(false);
    jumpToHash();
  }

  // ── Keyboard navigation: arrows move a row cursor, letters act on it ──────
  function cursorRowEl() {
    return document.querySelector('#ud-tbody tr[data-ridx="' + cursorIdx + '"]');
  }

  function applyCursor(scroll) {
    document.querySelectorAll("#ud-tbody tr.ud-row-cursor").forEach(function (r) {
      r.classList.remove("ud-row-cursor");
    });
    if (cursorIdx < 0) return;
    if (cursorIdx >= RENDERED.length) cursorIdx = RENDERED.length - 1;
    var row = cursorRowEl();
    if (row) {
      row.classList.add("ud-row-cursor");
      if (scroll) row.scrollIntoView({ block: "nearest" });
    }
  }

  function moveCursor(delta) {
    if (!RENDERED.length) return;
    cursorIdx = cursorIdx < 0 ? (delta > 0 ? 0 : RENDERED.length - 1)
      : Math.max(0, Math.min(RENDERED.length - 1, cursorIdx + delta));
    applyCursor(true);
  }

  // ── Inline rename (double-click the entry text, or E on the cursor row) ──
  function startRename(ridx) {
    var e = RENDERED[ridx];
    if (!e || e.is_article || e.entry_number == null || !e.slug) {
      noteToast("Only numbered docket entries can be renamed", true);
      return;
    }
    var rowEl = document.querySelector('#ud-tbody tr[data-ridx="' + ridx + '"]');
    var cell = rowEl && rowEl.querySelector(".ud-entry");
    if (!cell) return;
    var old = e.description || "";
    cell.innerHTML = '<input type="text" class="ud-rename-input" maxlength="300">';
    var inp = cell.querySelector("input");
    inp.value = old;
    inp.focus();
    inp.select();
    var done = false;
    function finish(save) {
      if (done) return;
      done = true;
      var val = inp.value.replace(/\s+/g, " ").trim();
      if (!save || val === old || val.length < 3) {
        render();
        if (save && val.length < 3 && val !== old) noteToast("Title too short \u2014 not saved", true);
        return;
      }
      var key = e.slug + "|n" + e.entry_number;
      RENAMED[key] = val;
      for (var i = 0; i < CASES.length; i++) {
        if (CASES[i].slug !== e.slug) continue;
        (CASES[i].entries || []).forEach(function (en) {
          if (en.entry_number === e.entry_number) {
            en.description = val;
            en.titled_from_upload = true;
          }
        });
      }
      buildAllEntries();
      render();
      noteToast("Renaming\u2026", false);
      fetch("api/rename-entry", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: e.slug, entry_number: e.entry_number, title: val }),
      }).then(function (r) { return r.json(); }).then(function (p) {
        noteToast(p && p.ok
          ? "Renamed \u2014 the court sync will never overwrite it"
          : "Rename failed \u2014 " + ((p && p.error) || "try again"), !(p && p.ok));
      }).catch(function () { noteToast("Rename failed \u2014 network error", true); });
    }
    inp.addEventListener("keydown", function (ev) {
      ev.stopPropagation();
      if (ev.key === "Enter") finish(true);
      if (ev.key === "Escape") finish(false);
    });
    inp.addEventListener("blur", function () { finish(true); });
    inp.addEventListener("click", function (ev) { ev.stopPropagation(); });
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
    activeCases[UNASSIGNED_KEY] = (slug === null);
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
      // With a query, preselect the first real case (index 1) over "Show all"
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
      ev.stopPropagation();  // keep row shortcuts quiet while typing
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

  function handleShortcut(ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var t = ev.target || {};
    var tag = (t.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable) return;
    if (activeNoteKey) return;  // note modal open — let it have the keyboard
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      moveCursor(ev.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (cursorIdx < 0 || !RENDERED[cursorIdx]) return;
    var e = RENDERED[cursorIdx];
    var nk = entryNoteKey(e);
    var row = cursorRowEl();
    switch (ev.key.toLowerCase()) {
      case "x":
        setRowState(nk, { deleted_at: new Date().toISOString() }, "Deleted \u2014 restorable from the toolbar for 30 days");
        break;
      case "h":
        var hid = !!(NOTES[nk] && NOTES[nk].hidden);
        setRowState(nk, { hidden: !hid }, hid ? "Row unhidden" : "Hidden \u2014 still findable via search");
        break;
      case "r":
        var link = row && (row.querySelector(".ud-file-btn") || row.querySelector(".ud-doc a.ud-link"));
        if (link) link.click();
        else noteToast("No link on this row", true);
        break;
      case "n":
        openNoteModal(nk);
        break;
      case "e":
        startRename(cursorIdx);
        break;
      case "z":
        var sb = row && row.querySelector(".ud-snz-btn");
        if (sb) openSnoozeMenu(nk, sb);
        break;
      case "u":
        pendingUploadKey = nk;
        ensureUploadInput().click();
        break;
      case "d":
        var dl = row && row.querySelector(".ud-file-dl");
        if (dl) dl.click();
        else noteToast("No uploaded document on this row", true);
        break;
      default:
        return;
    }
    ev.preventDefault();
  }

  // ── Dynamic data loading ───────────────────────────────────────────────────
  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.json();
    });
  }

  function caseFromData(m, caseData) {
    var entries = (caseData && caseData.docket && caseData.docket.entries) || [];
    entries.forEach(function (en) {
      if (en.titled_from_upload && en.entry_number != null) {
        PROTECTED_TITLES[m.slug + "|n" + en.entry_number] = en.description || "";
      }
    });
    return {
      slug:          m.slug,
      display_name:  m.display_name,
      short_name:    m.short_name,
      docket_url:    (caseData && caseData.docket && caseData.docket.docket_url) || m.docket_url || "",
      default_color: m.default_color || "#888888",
      category:      m.category || "other",
      entries:       entries,
      articles:      (caseData && caseData.coverage) || [],
      claims_url:    (caseData && caseData.claims_administrator && caseData.claims_administrator.url) || "",
      claims_name:   (caseData && caseData.claims_administrator && caseData.claims_administrator.name) || "",
    };
  }

  function init() {
    // One compact ~90-day summary instead of a 23-file/~5.5 MB fan-out. News
    // never renders raw docket entries as rows (see buildAllEntries's
    // rowKind === "__never__" branch) — the field only feeds inline-rename
    // lookups and the live-sync merge, both of which only ever touch recent
    // (bondoro-surfaced) entries, so the windowed summary is equivalent here.
    // These don't depend on case data — fire them alongside the case fetch
    // instead of behind it (each safely re-renders once its own data lands).
    startLiveSync();
    loadServerPrefs();
    loadNotes();
    loadBondoro();
    loadVotes();
    loadUploads();
    loadFeedSourcesForRender();
    loadThemeInfo();

    Promise.all([
      fetchJson("cases/data/_manifest.json"),
      fetchJson("cases/data/_summary.json"),
    ]).then(function (res) {
      // Archived cases are hidden from every reader-facing view (Settings still lists them).
      var manifest = (res[0] || []).filter(function (m) { return (m.sync || "active") !== "archived"; });
      var summaries = res[1] || [];
      var bySlug = {};
      summaries.forEach(function (s) { bySlug[s.slug] = s; });
      return manifest.map(function (m) { return caseFromData(m, bySlug[m.slug]); });
    }).then(function (cases) {
      CASES = cases;
      var savedAC = _savedState && _savedState.activeCases;
      CASES.forEach(function (c) {
        // Unknown slug = a case added since the state was saved → default ON
        activeCases[c.slug] = savedAC ? savedAC[c.slug] !== false : true;
      });
      activeCases[UNASSIGNED_KEY] = savedAC ? savedAC[UNASSIGNED_KEY] !== false : true;
      // #case=<slug> deep link (dashboard cards) — solo-filter to that case,
      // same behavior as picking it in the ⌘K palette.
      var mCase = /[#&]case=([a-z0-9,-]+)/.exec(location.hash || "");
      if (mCase) {
        var wanted = mCase[1].split(",").filter(function (s) {
          return CASES.some(function (c) { return c.slug === s; });
        });
        if (wanted.length) {
          CASES.forEach(function (c) { activeCases[c.slug] = wanted.indexOf(c.slug) !== -1; });
          activeCases[UNASSIGNED_KEY] = false;
          saveFilterState();
        }
      }
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
    }).catch(function (err) {
      var tbody = document.getElementById("ud-tbody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="11" class="ud-empty">Failed to load docket data: ' + esc(String(err)) + "</td></tr>";
      }
      var meta = document.getElementById("ud-meta");
      if (meta) meta.textContent = "Failed to load";
    });
  }

  // ── Bondoro filing alerts & case summaries (bondoro.json, daily scrape) ────
  function loadBondoro() {
    // The sole initial bondoro load (live API first, static fallback).
    // startLiveSync() no longer re-fetches this on startup — see below.
    return fetchJson("api/bondoro")
      .then(function (p) { return (p && p.ok && p.items) || []; })
      .catch(function () {
        return fetchJson("bondoro.json")
          .then(function (f) { return (f && f.items) || []; })
          .catch(function () { return []; });
      })
      .then(function (items) {
        BONDORO = items;
        buildAllEntries();
        render();
        var t = new Date();
        setSyncStatus("Feeds · refreshed " +
          t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), true);
      });
  }

  function feedSourceMode(item) {
    if (!FEED_SOURCES.length) return "all";
    var matches = FEED_SOURCES.filter(function (s) {
      if (item.source_id && s.id) return s.id === item.source_id;
      return (s.name || "").toLowerCase() === (item.source || "").toLowerCase();
    });
    if (!matches.length) return "all";
    // Same-named feeds (the two Bondoro tags): case-only only if ALL agree
    return matches.every(function (s) { return s.mode === "case-only"; }) ? "case-only" : "all";
  }

  // Where a feed item is allowed to surface (Manage → Sources "Shows in").
  // Items scanned since Aug 2026 carry their own `show`; older ones fall
  // back to the current source list, defaulting to visible everywhere.
  function feedShowTarget(item) {
    if (item.show === "docket" || item.show === "news") return item.show;
    if (!FEED_SOURCES.length) return "both";
    var matches = FEED_SOURCES.filter(function (s) {
      if (item.source_id && s.id) return s.id === item.source_id;
      return (s.name || "").toLowerCase() === (item.source || "").toLowerCase();
    });
    if (!matches.length) return "both";
    var shows = matches.map(function (s) { return s.show === "docket" || s.show === "news" ? s.show : "both"; });
    return shows.every(function (v) { return v === shows[0]; }) ? shows[0] : "both";
  }

  function bondoroEntries() {
    var out = [];
    BONDORO.forEach(function (b) {
      if (!b.url || !b.title) return;
      if (feedShowTarget(b) === "docket") return;  // docket-only sources stay off the news rail
      var c = b.case_slug ? caseBySlug(b.case_slug) : null;
      var grp = !c && b.group_name ? findGroup(b.group_name) : null;
      var themeSlug = b.theme_slug || "";
      out.push({
        slug:          c ? c.slug : "",
        theme_slug:    themeSlug,
        name:          c ? c.display_name : (grp ? grp.name : (themeSlug && THEME_INFO[themeSlug] ? THEME_INFO[themeSlug].name : "Uncategorized")),
        short:         c ? c.short_name : (grp ? grp.name : (themeSlug && THEME_INFO[themeSlug] ? THEME_INFO[themeSlug].name : "Uncategorized")),
        default_color: c ? c.default_color : "#9CA3AF",
        group_name:    grp ? grp.name : "",
        docket_url:    "",
        category:      c ? (c.category || "other") : "other",
        entry_number:  null,
        date_filed:    b.date || "",
        published_at:  b.published_at || "",
        date_display:  b.date ? fmtDisplayDate(b.date) : "",
        description:   b.title + (b.excerpt ? " \u2014 " + b.excerpt : ""),
        is_new:        isNewEntry(b.date),
        doc_url:       b.url,
        landmark:      "",
        type:          "article",
        party:         b.source || "Bondoro",
        social_title:  b.title,
        social_excerpt: b.excerpt || "",
        is_article:    true,
        is_bondoro:    true,
        archived:      !!b.archived,
        bondoro_kind:  (b.kind || "news").charAt(0).toUpperCase() + (b.kind || "news").slice(1),
        bondoro_url:   b.url,
        unassigned:    !c && !grp,
      });
    });
    return out;
  }

  function findGroup(name) {
    if (!name) return null;
    var groups = loadGroups();
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].name.toLowerCase() === name.toLowerCase()) return groups[i];
    }
    return null;
  }

  function caseBySlug(slug) {
    for (var i = 0; i < CASES.length; i++) {
      if (CASES[i].slug === slug) return CASES[i];
    }
    return null;
  }

  var assignMenuEl = null;
  function openAssignMenu(url, anchor) {
    closeAssignMenu();
    var menu = document.createElement("div");
    menu.className = "ud-th-menu";
    menu.id = "ud-assign-menu";
    var options = [{ slug: null, group: null, label: "Uncategorized (no case)" }];
    CASES.forEach(function (c) {
      options.push({ slug: c.slug, group: null, label: c.display_name });
    });
    loadGroups().forEach(function (g) {
      options.push({ slug: null, group: g.name, label: "Group: " + g.name });
    });
    options.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ud-th-menu-item";
      b.textContent = o.label;
      b.addEventListener("click", function () {
        assignBondoro(url, o.slug, o.group);
        closeAssignMenu();
      });
      menu.appendChild(b);
    });
    // Theme tagging — independent of the case assignment; theme-tagged
    // articles feed that theme's daily briefing.
    var cur = null;
    for (var bi = 0; bi < BONDORO.length; bi++) {
      if (BONDORO[bi].url === url) { cur = BONDORO[bi]; break; }
    }
    var themeSlugs = Object.keys(THEME_INFO);
    if (themeSlugs.length) {
      var divider = document.createElement("div");
      divider.className = "ud-mi-sub";
      divider.style.cssText = "padding:6px 12px 2px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;font-size:9.5px;";
      divider.textContent = "Theme (feeds the daily briefing)";
      menu.appendChild(divider);
      themeSlugs.forEach(function (slug) {
        var info = THEME_INFO[slug];
        var tb = document.createElement("button");
        tb.type = "button";
        tb.className = "ud-th-menu-item";
        var on = cur && cur.theme_slug === slug;
        tb.textContent = (on ? "\u2713 " : "") + (SHOW_THEME_EMOJIS && info.emoji ? info.emoji + " " : "") + info.name;
        tb.addEventListener("click", function () {
          assignTheme(url, on ? null : slug);
          closeAssignMenu();
        });
        menu.appendChild(tb);
      });
    }
    document.body.appendChild(menu);
    var rect = anchor.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 4) + "px";
    menu.style.left = clampMenuLeft(menu, rect.left + window.scrollX) + "px";
    assignMenuEl = menu;
  }

  function closeAssignMenu() {
    if (assignMenuEl && assignMenuEl.parentNode) assignMenuEl.parentNode.removeChild(assignMenuEl);
    assignMenuEl = null;
  }

  function assignBondoro(url, slug, group) {
    for (var i = 0; i < BONDORO.length; i++) {
      if (BONDORO[i].url === url) {
        BONDORO[i].case_slug = slug;
        BONDORO[i].group_name = slug ? null : (group || null);
      }
    }
    buildAllEntries();
    render();
    noteToast("Saving assignment\u2026", false);
    fetch("api/bondoro", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url, case_slug: slug, group_name: slug ? null : (group || null) }),
    }).then(function (r) { return r.json(); }).then(function (p) {
      noteToast(p && p.ok ? "Assignment saved" : "Save failed \u2014 " + ((p && p.error) || "try again"), !(p && p.ok));
    }).catch(function () { noteToast("Save failed \u2014 network error", true); });
  }

  function assignTheme(url, themeSlug) {
    for (var i = 0; i < BONDORO.length; i++) {
      if (BONDORO[i].url === url) BONDORO[i].theme_slug = themeSlug;
    }
    buildAllEntries();
    render();
    noteToast("Saving theme tag\u2026", false);
    fetch("api/bondoro", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url, theme_slug: themeSlug }),
    }).then(function (r) { return r.json(); }).then(function (p) {
      noteToast(p && p.ok ? (themeSlug ? "Theme tagged \u2014 feeds that briefing" : "Theme cleared") : "Save failed \u2014 " + ((p && p.error) || "try again"), !(p && p.ok));
    }).catch(function () { noteToast("Save failed \u2014 network error", true); });
  }

  // ── One-click document acquisition ────────────────────────────────────────
  // Clicking a Dkt. link fetches the PDF into the row instead of opening
  // CourtListener: free when the document is already in RECAP, purchased
  // through CourtListener's PACER fetch otherwise. Cmd/Ctrl-click still
  // opens CourtListener normally.
  var FETCHING = {};  // noteKey → true while a fetch is in flight
  // noteKey → {kind:"spin"|"err", label, reason} — drives the row's inline
  // fetch status (spinner + step text, or a warning badge on failure). The
  // top #ud-sync line stays reserved for page-wide sync state.
  var FETCH_STATE = {};
  var FETCH_BYPASS = {};  // noteKey → true: a prior fetch failed, clicks go to the link

  function docketIdOf(e) {
    var m = /courtlistener\.com\/docket\/(\d+)/.exec(e.docket_url || "");
    return m ? m[1] : "";
  }

  // Deep link to the docket page anchored at one entry \u2014 filtered to it
  // (?entry_gte) and scrolled to it (#entry-N). Works with the real case
  // slug or the "-" placeholder.
  function entryViewUrl(e, entryNum) {
    var m = /\/docket\/(\d+)(?:\/([^/?#]+))?/.exec(e.docket_url || "");
    if (!m || entryNum == null) return "";
    return "https://www.courtlistener.com/docket/" + m[1] + "/" + (m[2] || "-") +
      "/?entry_gte=" + entryNum + "#entry-" + entryNum;
  }

  // Health-check a CourtListener page before sending the reader there — CL
  // error pages (500s, rate limiting, 404s) divert the click to the
  // claims-agent mirror when the row has one. Fail-open: an inconclusive
  // check just opens CourtListener.
  function openCLGuarded(e, url) {
    var nk = entryNoteKey(e);
    var prev = FETCH_STATE[nk] || null;
    var win = window.open("", "_blank");  // opened inside the click gesture so popups aren't blocked
    FETCH_STATE[nk] = { kind: "spin", label: "Checking CourtListener\u2026" };
    render();
    function settle(state, dest) {
      if (state) FETCH_STATE[nk] = state;
      else if (prev) FETCH_STATE[nk] = prev;
      else delete FETCH_STATE[nk];
      render();
      if (dest) {
        if (win) win.location.href = dest;
        else window.open(dest, "_blank", "noopener");
      } else if (win) {
        win.close();
      }
    }
    fetchJson("api/check-link?url=" + encodeURIComponent(url)).then(function (p) {
      if (!p || p.ok !== false) { settle(null, url); return; }
      var why = p.reason === "timeout" ? "CourtListener timed out"
        : p.reason === "rate-limited" ? "CourtListener is rate-limiting"
        : p.reason === "not-found" ? "page missing on CourtListener"
        : "CourtListener server error";
      if (e.claims_url) {
        settle({ kind: "err", label: "CL down \u2014 used agent",
          reason: why + " \u2014 opened the claims-agent copy instead" }, e.claims_url);
      } else {
        settle({ kind: "err", label: "CL unavailable",
          reason: why + " \u2014 no mirror on this row; try again in a few minutes" }, "");
      }
    }).catch(function () { settle(null, url); });
  }

  function startDocFetch(e) {
    var nk = entryNoteKey(e);
    if (FETCHING[nk]) return;
    var docketId = docketIdOf(e);
    if (!docketId || e.entry_number == null || !e.slug) return;
    FETCHING[nk] = true;
    FETCH_STATE[nk] = { kind: "spin", label: "Fetching Dkt. " + e.entry_number + "\u2026" };
    render();

    function done(ok, msg, path) {
      delete FETCHING[nk];
      if (ok) {
        delete FETCH_STATE[nk];
        (UPLOADS[nk] = UPLOADS[nk] || []).push({
          name: "Dkt-" + e.entry_number + ".pdf", path: path, size: 0,
          uploaded_at: new Date().toISOString(), text: "",
        });
      } else {
        FETCH_BYPASS[nk] = true;  // clicks now open the entry link (health-checked)
        var short = /rate.?limit|429/i.test(msg || "") ? "Rate limited"
          : /tim(ed)?\s?out/i.test(msg || "") ? "Timed out"
          : "Fetch failed";
        FETCH_STATE[nk] = { kind: "err", label: short,
          reason: (msg || short) + " \u2014 the row's links still open the entry" };
      }
      render();
    }

    fetch("api/fetch-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: e.slug, entry_number: e.entry_number, docket_id: docketId }),
    }).then(function (r) { return r.json(); }).then(function (p) {
      if (p.status === "ready") { done(true, "", p.path); return; }

      // Claims agent (free): a GitHub Action fetches and commits the PDF; poll
      // the uploads index until the document lands on this row.
      if (p.status === "agent_pending") {
        FETCH_STATE[nk] = { kind: "spin", label: "Dkt. " + e.entry_number + " \u2014 claims agent\u2026" };
        render();
        var atries = 0;
        var atimer = setInterval(function () {
          atries++;
          if (atries > 60) { clearInterval(atimer); done(false, "agent fetch timed out \u2014 try again shortly"); return; }
          fetchJson("api/upload").then(function (u) {
            var docs = (u && u.ok && u.docs && u.docs[p.key]) || [];
            if (docs.length) {
              clearInterval(atimer);
              delete FETCHING[nk];
              delete FETCH_STATE[nk];
              UPLOADS[nk] = docs;
              render();
            }
          }).catch(function () {});
        }, 4000);
        return;
      }

      if (p.status !== "pending") { done(false, p.error || "unknown error"); return; }
      FETCH_STATE[nk] = { kind: "spin", label: "Dkt. " + e.entry_number + " \u2014 buying from PACER\u2026" };
      render();
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        if (tries > 30) { clearInterval(timer); done(false, "timed out \u2014 check back in a minute"); return; }
        fetch("api/fetch-doc?fetch_id=" + p.fetch_id + "&rd_id=" + p.rd_id +
              "&slug=" + encodeURIComponent(e.slug) + "&entry_number=" + e.entry_number)
          .then(function (r) { return r.json(); })
          .then(function (s) {
            if (s.status === "ready") { clearInterval(timer); done(true, "", s.path); }
            else if (s.status === "failed") { clearInterval(timer); done(false, s.error || "PACER fetch failed"); }
          })
          .catch(function () {});
      }, 3000);
    }).catch(function () { done(false, "network error"); });
  }

  // ── Attached documents (uploads.json via /intel/api/upload) ───────────────
  function loadUploads() {
    fetchJson("api/upload")
      .then(function (p) { return (p && p.ok && p.docs) || {}; })
      .catch(function () {
        return fetchJson("uploads.json")
          .then(function (f) { return (f && f.docs) || {}; })
          .catch(function () { return {}; });
      })
      .then(function (d) {
        UPLOADS = d;
        render();
      });
  }

  function docsFor(nk) {
    return UPLOADS[nk] || [];
  }

  var SVG_UPLOAD = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>';
  var SVG_FILE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle"><path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z"/><path d="M14 2v6h6" fill="none" stroke="var(--surface)" stroke-width="1.6"/></svg>';
  var SVG_DOWNLOAD = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>';

  function uploadHref(d, download) {
    // Served through the API so a fresh upload opens immediately — the static
    // copy only exists after the next site build.
    return "api/file?path=" + encodeURIComponent(String(d.path || "")) + (download ? "&dl=1" : "");
  }

  // The Dkt. cell: links + an upload button normally; once a document is
  // uploaded, a black file icon (open / download / remove) replaces the links.
  function docCell(e, linksHtml, votesHtml) {
    var votes = votesHtml || "";
    var nk = entryNoteKey(e);
    var st = FETCH_STATE[nk];
    if (st && st.kind === "spin") {
      return '<span class="ud-fetch-wrap"><span class="ud-fetch-spin"></span>' +
        '<span class="ud-fetch-label">' + esc(st.label) + "</span></span>";
    }
    var docs = docsFor(nk);
    if (docs.length) {
      return docs.map(function (d, i) {
        return (
          '<span class="ud-file-group">' +
            '<a class="ud-file-btn" href="' + esc(uploadHref(d)) + '" target="_blank" rel="noopener" title="Open ' + esc(d.name) + '">' + SVG_FILE + "</a>" +
            '<a class="ud-file-dl" href="' + esc(uploadHref(d, true)) + '" title="Download ' + esc(d.name) + '">' + SVG_DOWNLOAD + "</a>" +
            '<button type="button" class="ud-file-del" data-updel-nk="' + esc(nk) + '" data-updel-i="' + i + '" title="Remove ' + esc(d.name) + '">\u00d7</button>' +
          "</span>"
        );
      }).join(" ") + votes;
    }
    var errBadge = (st && st.kind === "err")
      ? '<span class="ud-fetch-err" title="' + esc(st.reason) + '">\u26a0 ' + esc(st.label) + "</span> "
      : "";
    return errBadge + linksHtml + votes +
      ' <button type="button" class="ud-upload-btn" data-upload-nk="' + esc(nk) + '" title="Upload the document (PDF) \u2014 replaces these links">' + SVG_UPLOAD + "</button>";
  }

  function uploadFile(nk, file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) { noteToast("PDF files only", true); return; }
    if (file.size > 15 * 1024 * 1024) { noteToast("File too large (15MB max)", true); return; }
    noteToast("Uploading " + file.name + "\u2026", false);
    var reader = new FileReader();
    reader.onload = function () {
      var b64 = String(reader.result).split(",")[1] || "";
      fetch("api/upload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: nk, filename: file.name, content_base64: b64 }),
      }).then(function (r) { return r.json(); }).then(function (p) {
        if (p && p.ok) {
          (UPLOADS[nk] = UPLOADS[nk] || []).push({
            name: file.name, path: p.path, size: file.size,
            uploaded_at: new Date().toISOString(), text: "",
          });
          render();
          noteToast("Uploaded \u2014 searchable after the next hourly sync", false);
        } else {
          noteToast("Upload failed \u2014 " + ((p && p.error) || "try again"), true);
        }
      }).catch(function () { noteToast("Upload failed \u2014 network error", true); });
    };
    reader.readAsDataURL(file);
  }

  function removeUpload(nk, idx) {
    var d = docsFor(nk)[idx];
    if (!d) return;
    if (!window.confirm("Remove " + d.name + "? The row's links come back.")) return;
    noteToast("Removing document\u2026", false);
    fetch("api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: nk, path: d.path }),
    }).then(function (r) { return r.json(); }).then(function (p) {
      if (p && p.ok) {
        UPLOADS[nk] = docsFor(nk).filter(function (x) { return x.path !== d.path; });
        if (!UPLOADS[nk].length) delete UPLOADS[nk];
        render();
        noteToast("Document removed", false);
      } else {
        noteToast("Remove failed \u2014 " + ((p && p.error) || "try again"), true);
      }
    }).catch(function () { noteToast("Remove failed \u2014 network error", true); });
  }

  var pendingUploadKey = null;
  var uploadInputEl = null;
  function ensureUploadInput() {
    if (uploadInputEl) return uploadInputEl;
    uploadInputEl = document.createElement("input");
    uploadInputEl.type = "file";
    uploadInputEl.accept = "application/pdf";
    uploadInputEl.style.display = "none";
    uploadInputEl.addEventListener("change", function () {
      var f = uploadInputEl.files && uploadInputEl.files[0];
      if (f && pendingUploadKey) uploadFile(pendingUploadKey, f);
      uploadInputEl.value = "";
      pendingUploadKey = null;
    });
    document.body.appendChild(uploadInputEl);
    return uploadInputEl;
  }

  // ── Up/down votes on news items — teaches which sources to surface ────────
  function loadVotes() {
    fetchJson("api/votes")
      .then(function (p) { return (p && p.ok && p.votes) || {}; })
      .catch(function () {
        return fetchJson("intel-votes.json")
          .then(function (f) { return (f && f.votes) || {}; })
          .catch(function () { return {}; });
      })
      .then(function (v) {
        VOTES = v;
        render();
      });
  }

  function castVote(e, dir) {
    var cur = VOTES[e.doc_url];
    var next = cur && cur.v === dir ? 0 : dir;  // click again to clear
    // Votes are TOPIC feedback — the daily scan reads the voted headlines to
    // steer what it covers. They say nothing about the outlet.
    var title = (e.description || "").split(" \u2014 ")[0].slice(0, 140);
    if (next === 0) delete VOTES[e.doc_url];
    else VOTES[e.doc_url] = { v: next, source: e.party || "", title: title, case_slug: e.slug || e.group_name || "", at: new Date().toISOString() };
    render();
    noteToast(next === 0 ? "Vote cleared" : (next > 0 ? "Upvoted \u2014 more on this topic" : "Downvoted \u2014 less of this topic"), false);
    fetch("api/votes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: e.doc_url, vote: next, source: e.party || "", title: title, case_slug: e.slug || e.group_name || "" }),
    }).catch(function () {});
  }

  function voteButtons(e) {
    if (!e.is_article) return "";
    var v = VOTES[e.doc_url];
    var up = v && v.v === 1;
    var dn = v && v.v === -1;
    return (
      ' <button type="button" class="ud-vote' + (up ? " ud-vote-up-on" : "") + '" data-vote="1" data-url="' + esc(e.doc_url) + '" title="More about this topic"><svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle\"><path d=\"M7 10v12\"/><path d=\"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z\"/></svg></button>' +
      '<button type="button" class="ud-vote' + (dn ? " ud-vote-dn-on" : "") + '" data-vote="-1" data-url="' + esc(e.doc_url) + '" title="Less about this topic"><svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle\"><path d=\"M17 14V2\"/><path d=\"M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z\"/></svg></button>'
    );
  }

  // ── News feed sources (feed-sources.json via /intel/api/feed-sources) —
  // read-only here now; managing the list moved to Manage → Briefing Inputs.
  // FEED_SOURCES still drives feedSourceMode() below, which decides whether
  // an unassigned feed item shows on the docket at all.
  var FEED_SOURCES = [];
  var SRC_FAVORITES = {};          // lowercased outlet name → true (Manage → Sources ★)
  var SRC_BLOCKED = {};            // deleted in Manage → Sources: hidden from rows + filter
  var OTHER_SRC_KEY = "__othersrc__";  // one toggle for every non-favorite outlet

  function loadFeedSourcesForRender() {
    fetchJson("api/feed-sources")
      .then(function (p) { return (p && p.ok) ? p : null; })
      .catch(function () { return null; })
      .then(function (p) {
        if (p) return p;
        return fetchJson("feed-sources.json").catch(function () { return null; });
      })
      .then(function (p) {
        if (!p) return;
        SRC_FAVORITES = {};
        (p.favorites || []).forEach(function (n) { SRC_FAVORITES[sourceKey(n)] = true; });
        SRC_BLOCKED = {};
        (p.blocked || []).forEach(function (n) { SRC_BLOCKED[sourceKey(n)] = true; });
        if (p.sources && p.sources.length) FEED_SOURCES = p.sources;
        render();
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
        renderDue();
        updateHiddenInfo();
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
      title: rec.title || "",
      snooze_until: rec.snooze_until || "",
      hidden: !!rec.hidden,
      deleted_at: rec.deleted_at || "",
      context: entry ? {
        case_slug: entry.slug,
        case_name: entry.name,
        entry_number: entry.entry_number,
        date_filed: entry.date_filed,
        snippet: (entry.description || "").slice(0, 200),
        url: entry.is_article ? (entry.doc_url || "") : "",
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
    if (!rec.bookmarked && !(rec.note || "").trim() && !rec.snooze_until && !rec.hidden) delete NOTES[nk];
    else NOTES[nk] = rec;
    pushNote(nk);
    render();
  }

  function deriveTitle(note) {
    return (note || "").trim().split(/\s+/).slice(0, 3).join(" ");
  }

  function openNoteModal(nk) {
    var e = findEntryByKey(nk);
    if (!e) return;
    activeNoteKey = nk;
    var rec = NOTES[nk] || {};
    var title = document.getElementById("ud-note-title");
    var meta = document.getElementById("ud-note-meta");
    var titleField = document.getElementById("ud-note-titlefield");
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
    if (titleField) titleField.value = rec.title || "";
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
    var titleField = document.getElementById("ud-note-titlefield");
    var val = deleteNote ? "" : (text ? text.value : "");
    var titleVal = deleteNote ? "" : (titleField ? titleField.value.trim() : "");
    var rec = NOTES[nk] || {};
    rec.note = val;
    rec.title = titleVal || (val.trim() ? deriveTitle(val) : "");
    if (!(val || "").trim() && !rec.bookmarked && !rec.snooze_until) delete NOTES[nk];
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

  // ── Snooze reminders ───────────────────────────────────────────────────────
  var snoozeMenuEl = null;

  function snoozeOptions() {
    var now = new Date();
    function at(d, h) { var x = new Date(d); x.setHours(h, 0, 0, 0); return x; }
    var opts = [
      { label: "In 1 hour", when: new Date(now.getTime() + 3600e3) },
      { label: "In 3 hours", when: new Date(now.getTime() + 3 * 3600e3) },
    ];
    var evening = at(now, 18);
    if (evening > now) opts.push({ label: "This evening (6 PM)", when: evening });
    opts.push({ label: "Tomorrow morning (9 AM)", when: at(new Date(now.getTime() + 86400e3), 9) });
    opts.push({ label: "In 3 days (9 AM)", when: at(new Date(now.getTime() + 3 * 86400e3), 9) });
    opts.push({ label: "Next week (9 AM)", when: at(new Date(now.getTime() + 7 * 86400e3), 9) });
    return opts;
  }

  function openSnoozeMenu(nk, anchor) {
    closeSnoozeMenu();
    var menu = document.createElement("div");
    menu.className = "ud-th-menu";
    menu.id = "ud-snooze-menu";
    var rec = NOTES[nk] || {};
    snoozeOptions().forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ud-th-menu-item";
      b.textContent = o.label;
      b.addEventListener("click", function () {
        setSnooze(nk, o.when.toISOString());
        closeSnoozeMenu();
      });
      menu.appendChild(b);
    });
    if (rec.snooze_until) {
      var clear = document.createElement("button");
      clear.type = "button";
      clear.className = "ud-th-menu-item";
      clear.textContent = "Clear snooze";
      clear.addEventListener("click", function () {
        setSnooze(nk, "");
        closeSnoozeMenu();
      });
      menu.appendChild(clear);
    }
    document.body.appendChild(menu);
    var rect = anchor.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 4) + "px";
    menu.style.left = clampMenuLeft(menu, rect.left + window.scrollX - 120) + "px";
    snoozeMenuEl = menu;
  }

  function closeSnoozeMenu() {
    if (snoozeMenuEl && snoozeMenuEl.parentNode) snoozeMenuEl.parentNode.removeChild(snoozeMenuEl);
    snoozeMenuEl = null;
  }

  function setSnooze(nk, iso) {
    var rec = NOTES[nk] || {};
    rec.snooze_until = iso || "";
    if (!rec.snooze_until && !rec.bookmarked && !(rec.note || "").trim()) delete NOTES[nk];
    else NOTES[nk] = rec;
    pushNote(nk);
    render();
    renderDue();
  }


  // ── ⌘Z undo — every hide/delete/snooze/restore flows through setRowState,
  // so undo is: snapshot the touched keys' prior values, restore on pop. ──
  var UNDO_STACK = [];
  window.__intelUndo = function () {
    var u = UNDO_STACK.pop();
    if (!u) { noteToast("Nothing to undo", true); return; }
    var rec = NOTES[u.nk] || {};
    Object.keys(u.prior).forEach(function (k) {
      if (u.prior[k] === undefined) delete rec[k];
      else rec[k] = u.prior[k];
    });
    if (!rec.bookmarked && !(rec.note || "").trim() && !rec.snooze_until && !rec.hidden && !rec.deleted_at) {
      delete NOTES[u.nk];
    } else {
      NOTES[u.nk] = rec;
    }
    pushNote(u.nk);
    render();
    updateHiddenInfo();
    noteToast("Undone: " + (u.label || "last action"), false);
  };
  function setRowState(nk, changes, toast) {
    var prior = {}, cur = NOTES[nk] || {};
    Object.keys(changes).forEach(function (k) { prior[k] = cur[k]; });
    UNDO_STACK.push({ nk: nk, prior: prior, label: toast ? String(toast).split("\u2014")[0].trim().toLowerCase() : "" });
    if (UNDO_STACK.length > 20) UNDO_STACK.shift();
    var rec = NOTES[nk] || {};
    Object.keys(changes).forEach(function (k) { rec[k] = changes[k]; });
    if (!rec.bookmarked && !(rec.note || "").trim() && !rec.snooze_until && !rec.hidden && !rec.deleted_at) {
      delete NOTES[nk];
    } else {
      NOTES[nk] = rec;
    }
    pushNote(nk);
    render();
    updateHiddenInfo();
    if (toast) noteToast(toast, false);
  }

  function updateHiddenInfo() {
    var el = document.getElementById("ud-hidden-info");
    if (!el) return;
    var cutoff = new Date(Date.now() - 30 * 86400e3).toISOString();
    var hidden = [], restorable = [];
    Object.keys(NOTES).forEach(function (nk) {
      var rec = NOTES[nk];
      if (!rec) return;
      if (rec.hidden) hidden.push(nk);
      if (rec.deleted_at && rec.deleted_at >= cutoff) restorable.push(nk);
    });
    if (!hidden.length && !restorable.length) { el.innerHTML = ""; return; }
    var parts = [];
    if (hidden.length) parts.push(hidden.length + " hidden");
    if (restorable.length) parts.push(restorable.length + " deleted");
    el.innerHTML = parts.join(" \u00b7 ") + ' <button type="button" id="ud-hidden-restore">Restore all</button>';
    var btn = document.getElementById("ud-hidden-restore");
    if (btn) {
      btn.addEventListener("click", function () {
        hidden.concat(restorable).forEach(function (nk) {
          setRowState(nk, { hidden: false, deleted_at: "" });
        });
        noteToast("All hidden and deleted rows restored", false);
      });
    }
  }

  var DUE_ARTIFACT_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  // Identical markup to .ud-snz-btn / .ud-del-btn in the table's mark cells \u2014
  // same icons everywhere "snooze" or "delete" appears as an action.
  var DUE_SNOOZE_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var DUE_DELETE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  var DUE_PAGE_SIZE = 4;
  var duePage = 0;

  function renderDue() {
    var box = document.getElementById("ud-due");
    if (!box) return;
    var now = new Date().toISOString();
    var due = [];
    Object.keys(NOTES).forEach(function (nk) {
      var rec = NOTES[nk];
      // Notes are a shared store across docket.html and news.html — only
      // surface article reminders here; docket.js mirrors this for filings.
      if (rec && rec.snooze_until && rec.snooze_until <= now && rec.entry_number == null) due.push({ nk: nk, rec: rec });
    });
    if (!due.length) { box.style.display = "none"; box.innerHTML = ""; duePage = 0; return; }

    var totalPages = Math.ceil(due.length / DUE_PAGE_SIZE);
    if (duePage >= totalPages) duePage = 0;
    var pageItems = due.slice(duePage * DUE_PAGE_SIZE, duePage * DUE_PAGE_SIZE + DUE_PAGE_SIZE);

    var pagerHtml = totalPages > 1
      ? '<div class="ud-due-pager">' +
          '<button type="button" class="ud-due-pg-btn" data-dir="-1" aria-label="Previous reminders">\u2190</button>' +
          '<span class="ud-due-pg-count">' + (duePage + 1) + " / " + totalPages + "</span>" +
          '<button type="button" class="ud-due-pg-btn" data-dir="1" aria-label="Next reminders">\u2192</button>' +
        "</div>"
      : "";

    // Styled to match the dashboard Notes card (same paper color, title +
    // artifact + date-prefixed body) so a snoozed reminder reads as the same
    // kind of object as a note, not a separate visual language. Up to
    // DUE_PAGE_SIZE cards show at once, arranged horizontally; the pager
    // above only appears once there are more than that.
    var html =
      '<div class="ud-due-head">' +
        '<span class="ud-due-head-label"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Snoozed reminders \u2014 ' + due.length + " due</span>" +
        pagerHtml +
      "</div>" +
      '<div class="ud-due-cards">';
    pageItems.forEach(function (d) {
      var e = findEntryByKey(d.nk);
      var title = e ? e.short : (d.rec.case_name || d.rec.case_slug || "Entry");
      var desc = e ? (e.description || "").slice(0, 180) : (d.rec.snippet || "");
      var artifact = d.rec.entry_number != null ? "Docket No. " + d.rec.entry_number : (d.rec.url ? "News article" : "");
      var readUrl = (e && e.doc_url) || d.rec.url || "";
      var cc = e ? getBg(e.slug, e.default_color) : (d.rec.case_slug ? getBg(d.rec.case_slug, null) : "");
      html +=
        '<div class="ud-due-card" style="--cc:' + esc(cc) + '">' +
          '<div class="ud-due-title">' + esc(title) + "</div>" +
          (artifact ? '<div class="ud-due-artifact">' + DUE_ARTIFACT_ICON + esc(artifact) + "</div>" : "") +
          '<div class="ud-due-body"><strong>Due ' + esc(new Date(d.rec.snooze_until).toLocaleString()) + "</strong> \u2014 " + esc(desc) +
            (readUrl ? ' <a class="ud-link" href="' + esc(readUrl) + '" target="_blank" rel="noopener">Read</a>' : "") +
          "</div>" +
          '<div class="ud-due-foot">' +
            '<button type="button" class="ud-due-resnooze" data-nk="' + esc(d.nk) + '" title="Snooze again">' + DUE_SNOOZE_ICON + "</button>" +
            '<button type="button" class="ud-due-dismiss" data-nk="' + esc(d.nk) + '" title="Dismiss">' + DUE_DELETE_ICON + "</button>" +
          "</div>" +
        "</div>";
    });
    html += "</div>";

    box.innerHTML = html;
    box.style.display = "flex";
    box.querySelectorAll(".ud-due-dismiss").forEach(function (b) {
      b.addEventListener("click", function () { setSnooze(b.getAttribute("data-nk"), ""); });
    });
    box.querySelectorAll(".ud-due-resnooze").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        openSnoozeMenu(b.getAttribute("data-nk"), b);
      });
    });
    box.querySelectorAll(".ud-due-pg-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        duePage = (duePage + Number(b.getAttribute("data-dir")) + totalPages) % totalPages;
        renderDue();
      });
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
        body: JSON.stringify({ colors: savedColors, groups: loadGroups(), presets: PRESETS }),
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

  // ── Live refresh (feed store) ───────────────────────
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

  var bondoroEtag = null;
  function syncLive() {
    // Articles refresh from the repo-backed feed store — no CourtListener
    // quota is spent from this page (the docket page owns that). Conditional
    // GET: an unchanged 211 KB file comes back as a 304 with no body instead
    // of a full re-download + re-parse every poll. Falls back to a plain GET
    // if the server ever doesn't honor If-None-Match — no regression either way.
    var opts = bondoroEtag ? { headers: { "If-None-Match": bondoroEtag } } : {};
    fetch("bondoro.json", opts).then(function (r) {
      if (r.status === 304) return null;
      if (!r.ok) throw new Error("HTTP " + r.status);
      bondoroEtag = r.headers.get("ETag") || bondoroEtag;
      return r.json();
    }).then(function (d) {
      if (d && d.items) {
        BONDORO = d.items;
        buildAllEntries();
        render();
        var t = new Date();
        setSyncStatus("Feeds \u00b7 refreshed " +
          t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), true);
      }
    }).catch(function () {
      setSyncStatus("Feeds \u2014 refresh unavailable", false);
    });
  }

  function startLiveSync() {
    // loadBondoro() (fired alongside this from init()) already does the
    // initial fetch and sets the status — this only arms subsequent polls.
    setInterval(function () {
      if (!document.hidden) syncLive();
    }, LIVE_SYNC_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) syncLive();
    });
  }

  // ── Deep links: #e=<noteKey> or #u=<itemUrl> lands on that row ────────────
  var jumpDone = false;
  var jumpAt = 0;
  var jumpKeySel = "";
  function jumpToHash() {
    // Later data loads reflow the table — keep re-centering the target row
    // for a few seconds after the first hit.
    if (jumpDone) {
      if (jumpKeySel && Date.now() - jumpAt < 6000) {
        var again = document.querySelector(jumpKeySel);
        var r = again && again.closest("tr");
        if (r) {
          r.classList.add("ud-row-cursor");
          r.scrollIntoView({ block: "center" });
        }
      }
      return;
    }
    var h = location.hash || "";
    var row = null;
    var mE = /[#&]e=([^&]+)/.exec(h);
    var mU = /[#&]u=([^&]+)/.exec(h);
    if (mE) {
      jumpKeySel = '#ud-tbody [data-nk="' + CSS.escape(decodeURIComponent(mE[1])) + '"]';
      var el = document.querySelector(jumpKeySel);
      row = el && el.closest("tr");
    } else if (mU) {
      jumpKeySel = '#ud-tbody .ud-vote[data-url="' + CSS.escape(decodeURIComponent(mU[1])) + '"]';
      var vt = document.querySelector(jumpKeySel);
      row = vt && vt.closest("tr");
    } else {
      jumpDone = true;
      return;
    }
    if (!row) return;  // data still loading — retried on the next render
    jumpDone = true;
    jumpAt = Date.now();
    // Async sections above the table keep landing for a few seconds and shove
    // the layout around — re-center on a timer until things settle.
    var anchorTimer = setInterval(function () {
      if (Date.now() - jumpAt > 5000) { clearInterval(anchorTimer); return; }
      var el2 = document.querySelector(jumpKeySel);
      var r2 = el2 && el2.closest("tr");
      if (r2) {
        r2.classList.add("ud-row-cursor");
        r2.scrollIntoView({ block: "center" });
      }
    }, 400);
    var ridx = row.getAttribute("data-ridx");
    if (ridx != null) cursorIdx = Number(ridx);
    row.classList.add("ud-row-cursor");
    row.scrollIntoView({ block: "center" });
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

    var palToggle = document.getElementById("ud-pop-palette");
    if (palToggle) {
      palToggle.addEventListener("click", function () { setPaletteEditing(!paletteEditing); });
    }

    var defaultBtn = document.getElementById("ud-pop-default");
    if (defaultBtn) {
      defaultBtn.addEventListener("click", function () {
        if (!activeGearSlug) return;
        var slug = activeGearSlug;
        var bgEl = document.getElementById("ud-pop-bg");
        var bg = bgEl ? bgEl.value : null;
        if (!bg) return;
        noteToast("Saving default color\u2026", false);
        fetch("api/case-color", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: slug, bg: bg }),
        }).then(function (r) { return r.json(); }).then(function (p) {
          if (!p || !p.ok) {
            noteToast("Default color save failed \u2014 " + ((p && p.error) || "try again"), true);
            return;
          }
          var c = caseBySlug(slug);
          if (c) c.default_color = bg;
          // The default IS the choice now — drop the per-view override
          if (savedColors[slug]) { delete savedColors[slug]; saveColors(savedColors); }
          renderCaseFilter();
          render();
          noteToast("Default color saved for every view", false);
        }).catch(function () { noteToast("Default color save failed \u2014 network error", true); });
      });
    }

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

    // Case dropdown — anchored to the Case column header
    var thCase = document.getElementById("ud-th-case");
    var ddPanel = document.getElementById("ud-case-dd-panel");
    if (thCase && ddPanel) {
      document.body.appendChild(ddPanel);  // page-level positioning
      thCase.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var open = ddPanel.style.display !== "none";
        if (open) {
          ddPanel.style.display = "none";
          closePopover();
          return;
        }
        var rect = thCase.getBoundingClientRect();
        ddPanel.style.position = "absolute";
        ddPanel.style.top = (rect.bottom + window.scrollY + 4) + "px";
        ddPanel.style.left = clampMenuLeft(ddPanel, rect.left + window.scrollX) + "px";
        ddPanel.style.display = "block";
      });
      document.addEventListener("click", function (ev) {
        if (ddPanel.style.display === "none") return;
        if (ev.target && !ev.target.isConnected) return;  // click landed on re-rendered UI inside the panel
        if (ddPanel.contains(ev.target) || thCase.contains(ev.target)) return;
        var pop = document.getElementById("ud-color-pop");
        if (pop && pop.contains(ev.target)) return;
        ddPanel.style.display = "none";
        closePopover();
      });
    }

    // Sources dropdown — anchored to the Author column header
    var thSource = document.getElementById("ud-th-source");
    if (thSource) {
      var srcPanel = document.createElement("div");
      srcPanel.id = "ud-source-dd-panel";
      srcPanel.className = "ud-case-dd-panel";
      srcPanel.style.display = "none";
      document.body.appendChild(srcPanel);
      thSource.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var open = srcPanel.style.display !== "none";
        if (open) { srcPanel.style.display = "none"; return; }
        var rect = thSource.getBoundingClientRect();
        srcPanel.style.position = "absolute";
        srcPanel.style.top = (rect.bottom + window.scrollY + 4) + "px";
        srcPanel.style.left = clampMenuLeft(srcPanel, rect.left + window.scrollX) + "px";
        srcPanel.style.display = "block";
        renderSourceFilter();
      });
      document.addEventListener("click", function (ev) {
        if (srcPanel.style.display === "none") return;
        if (ev.target && !ev.target.isConnected) return;  // click landed on re-rendered UI inside the panel
        if (srcPanel.contains(ev.target) || thSource.contains(ev.target)) return;
        srcPanel.style.display = "none";
      });
    }

    // Column-header filters
    var ENTRY_LABELS = { all: "Story", alerts: "Story \u00b7 Alerts",
      summaries: "Story \u00b7 Summaries", news: "Story \u00b7 News", sales: "Story \u00b7 Asset Sales" };
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
        thMenu.style.left = clampMenuLeft(thMenu, rect.left + window.scrollX) + "px";
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
      tbodyEl.addEventListener("dblclick", function (ev) {
        var cell = ev.target.closest(".ud-entry");
        var tr = ev.target.closest("tr[data-ridx]");
        if (!cell || !tr || ev.target.tagName === "INPUT") return;
        ev.preventDefault();
        startRename(Number(tr.getAttribute("data-ridx")));
      });
      tbodyEl.addEventListener("click", function (ev) {
        // Any click inside a row moves the keyboard cursor there, so arrows
        // and row shortcuts continue from the clicked row.
        var selRow = ev.target.closest("tr[data-ridx]");
        if (selRow) {
          var selIdx = Number(selRow.getAttribute("data-ridx"));
          if (!isNaN(selIdx) && selIdx !== cursorIdx) { cursorIdx = selIdx; applyCursor(false); }
        }
        var ap = ev.target.closest(".ud-pill-assign");
        if (ap) {
          ev.stopPropagation();
          openAssignMenu(ap.getAttribute("data-bondoro"), ap);
          return;
        }
        var bm = ev.target.closest(".ud-bm-btn");
        if (bm) { toggleBookmark(bm.getAttribute("data-nk")); return; }
        var sz = ev.target.closest(".ud-snz-btn");
        if (sz) { ev.stopPropagation(); openSnoozeMenu(sz.getAttribute("data-nk"), sz); return; }
        var vt = ev.target.closest(".ud-vote");
        if (vt) {
          var vurl = vt.getAttribute("data-url");
          var ventry = null;
          for (var vi = 0; vi < ALL.length; vi++) {
            if (ALL[vi].is_article && ALL[vi].doc_url === vurl) { ventry = ALL[vi]; break; }
          }
          if (ventry) castVote(ventry, Number(vt.getAttribute("data-vote")));
          return;
        }
        var cl = ev.target.closest(".ud-doc a.ud-link:not(.ud-link-agent):not(.ud-file-btn):not(.ud-file-dl)");
        if (cl && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey &&
            (cl.getAttribute("href") || "").indexOf("courtlistener.com") !== -1) {
          var ctr = ev.target.closest("tr[data-ridx]");
          var ce = ctr ? RENDERED[Number(ctr.getAttribute("data-ridx"))] : null;
          if (ce && !ce.is_article && ce.entry_number != null && docketIdOf(ce)) {
            ev.preventDefault();
            if (FETCH_BYPASS[entryNoteKey(ce)]) openCLGuarded(ce, cl.getAttribute("href"));
            else startDocFetch(ce);
            return;
          }
        }
        var up = ev.target.closest(".ud-upload-btn");
        if (up) {
          ev.stopPropagation();
          pendingUploadKey = up.getAttribute("data-upload-nk");
          ensureUploadInput().click();
          return;
        }
        var ud = ev.target.closest(".ud-file-del");
        if (ud) {
          ev.stopPropagation();
          removeUpload(ud.getAttribute("data-updel-nk"), Number(ud.getAttribute("data-updel-i")));
          return;
        }
        var hd = ev.target.closest(".ud-hide-btn");
        if (hd) {
          var hnk = hd.getAttribute("data-nk");
          var hidNow = !!(NOTES[hnk] && NOTES[hnk].hidden);
          setRowState(hnk, { hidden: !hidNow }, hidNow ? "Row unhidden" : "Hidden \u2014 still findable via search");
          return;
        }
        var del = ev.target.closest(".ud-del-btn");
        if (del) {
          setRowState(del.getAttribute("data-nk"), { deleted_at: new Date().toISOString() },
            "Deleted \u2014 restorable from the toolbar for 30 days");
          return;
        }
        var sb = ev.target.closest(".ud-soc-btn");
        if (sb) { openSocialModal(sb.getAttribute("data-nk")); return; }
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
    document.addEventListener("keydown", handleShortcut);
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
      if (k === "t") {
        ev.preventDefault();
        var dT = new Date();
        var tIso = dT.getFullYear() + "-" + ("0" + (dT.getMonth() + 1)).slice(-2) + "-" + ("0" + dT.getDate()).slice(-2);
        var onT = (dateFrom === tIso && dateTo === tIso);
        dateFrom = onT ? "" : tIso;
        dateTo = onT ? "" : tIso;
        var fEl2 = document.getElementById("ud-date-from");
        var tEl2 = document.getElementById("ud-date-to");
        if (fEl2) fEl2.value = dateFrom;
        if (tEl2) tEl2.value = dateTo;
        render();
        return;
      }
      if (k === "s") { chordSAt = Date.now(); return; }
      if (k === "a" && chordSAt && Date.now() - chordSAt < 600) {
        ev.preventDefault();
        chordSAt = 0;
        paletteApply(null);
      } else {
        chordSAt = 0;
      }
    });


    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && activeNoteKey) closeNoteModal();
      if (ev.key === "Escape") { closeAssignMenu(); closeSnoozeMenu(); }
    });
    document.addEventListener("click", function (ev) {
      if (assignMenuEl && !assignMenuEl.contains(ev.target)) closeAssignMenu();
      if (snoozeMenuEl && !snoozeMenuEl.contains(ev.target)) closeSnoozeMenu();
    });
    setInterval(renderDue, 60000);

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

    // Docket-style lookback menu on the Time header.
    function applyCustomVisibility() {
      var dr = document.getElementById("ud-date-range");
      if (dr) dr.style.display = lookback === "custom" ? "" : "none";
    }
    var LB_LABELS = { "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "All time", custom: "Custom range" };
    function syncTimeHeader() {
      var th = document.getElementById("ud-th-time");
      if (th) th.classList.toggle("ud-th-on", lookback !== "all");
      var lbl = document.getElementById("ud-lookback-label");
      if (lbl) lbl.textContent = LB_LABELS[lookback] || "All time";
      var menu = document.getElementById("ud-th-timemenu");
      if (menu) menu.querySelectorAll(".ud-th-menu-item").forEach(function (b) {
        b.classList.toggle("ud-th-menu-on", b.hasAttribute("data-sort")
          ? b.getAttribute("data-sort") === sortDir
          : b.getAttribute("data-val") === lookback);
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
          var srt = b.getAttribute("data-sort");
          if (srt) {  // "Sort — newest/oldest first" lives in this menu too
            sortDir = srt;
            thTimeMenuEl.style.display = "none";
            saveFilterState();
            render();
            return;
          }
          lookback = b.getAttribute("data-val");
          if (lookback !== "custom") {
            dateFrom = ""; dateTo = "";
            if (dateFromEl) dateFromEl.value = "";
            if (dateToEl) dateToEl.value = "";
          }
          thTimeMenuEl.style.display = "none";
          saveFilterState();
          syncTimeHeader();
          applyCustomVisibility();
          render();
          if (lookback === "custom" && dateFromEl) dateFromEl.focus();
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

    // Clear button
    var clearBtn = document.getElementById("ud-clear-search");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        searchText = "";
        dateFrom = "";
        dateTo = "";
        lookback = "all";
        saveFilterState();
        syncTimeHeader();
        applyCustomVisibility();
        if (searchInput) searchInput.value = "";
        if (dateFromEl) dateFromEl.value = "";
        if (dateToEl) dateToEl.value = "";
        render();
      });
    }

    // Sort button — restore saved direction
    var relSel = document.getElementById("ud-related");
    if (relSel) {
      relSel.value = relatedOnly ? "related" : "all";
      relSel.addEventListener("change", function () {
        relatedOnly = relSel.value === "related";
        saveFilterState();
        render();
      });
    }

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
