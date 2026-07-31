(function () {
  "use strict";

  /* Unified Notes — every bookmark + note across the tracked cases, sorted by
     last edit, filterable by case (same dropdown + shared groups as the docket
     and calendar), editable in place, exportable as Markdown or CSV.

     Data: /intel/api/notes (repo-backed; falls back to the build-time static
     copy intel-notes.json when the endpoint is unreachable). Case colors and
     groups share localStorage keys with the other two pages. */

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var DEFAULT_PRESETS = [
    {bg:"#D4FF00", fg:"#0A0A0A"}, {bg:"#E9F98A", fg:"#4A5500"},
    {bg:"#1B3A4B", fg:"#FFFFFF"}, {bg:"#94C6F8", fg:"#123A66"},
    {bg:"#3B78D8", fg:"#FFFFFF"}, {bg:"#B3A8F0", fg:"#2A1E6E"},
    {bg:"#4A3DE0", fg:"#FFFFFF"}, {bg:"#7EF4C2", fg:"#0B4A32"},
    {bg:"#3FA07A", fg:"#FFFFFF"}, {bg:"#F2AAEC", fg:"#6E1466"},
    {bg:"#CC33CC", fg:"#FFFFFF"}, {bg:"#3A3A3A", fg:"#FFFFFF"},
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
  var CASES = [];             // from manifest (pills, colors, docket links)
  var NOTES = {};             // key → record
  var activeCases = {};
  var sortDir = "desc";       // by last edit
  var searchText = "";
  var dateFrom = "";
  var dateTo = "";
  var activeGearSlug = null;
  var activeNoteKey = null;
  var _savedState = null;

  var FILTER_KEY = "un-filter-state";
  function loadFilterState() {
    try {
      var s = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
      if (s.sortDir === "asc" || s.sortDir === "desc") sortDir = s.sortDir;
      _savedState = s;
    } catch (e) {}
  }
  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({
        sortDir: sortDir, activeCases: activeCases,
      }));
    } catch (e) {}
  }

  function caseOf(slug) {
    for (var i = 0; i < CASES.length; i++) {
      if (CASES[i].slug === slug) return CASES[i];
    }
    return null;
  }

  // ── Case filter dropdown + shared groups (same keys as docket/calendar) ────
  var GROUPS_KEY = "ud-case-groups";
  function loadGroups() {
    try {
      var g = JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]");
      return Array.isArray(g) ? g : [];
    } catch (e) { return []; }
  }
  function saveGroups(groups) {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); } catch (e) {}
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
          '<button type="button" class="ud-dd-group-act" data-act="show" data-idx="' + i + '">Show</button>' +
          '<button type="button" class="ud-dd-group-act" data-act="hide" data-idx="' + i + '">Hide</button>' +
          '<button type="button" class="ud-dd-group-del" data-idx="' + i + '" title="Delete group">×</button>' +
        "</div>"
      );
    }).join("");
    panel.innerHTML = head + rows +
      '<div class="ud-dd-groups">' +
        '<div class="ud-dd-groups-title">Groups</div>' +
        (groupRows || '<div class="ud-dd-empty">No groups yet.</div>') +
      "</div>" +
      '<button type="button" class="ud-dd-save-btn ud-dd-saveview" data-close-panel>Save view</button>';

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
        activeCases[cb.getAttribute("data-slug")] = cb.checked;
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
      saveFilterState();
      renderCaseFilter();
      render();
    }
    panel.querySelectorAll(".ud-dd-group-name").forEach(function (b) {
      b.addEventListener("click", function () { applyGroup(Number(b.getAttribute("data-idx")), "show"); });
    });
    panel.querySelectorAll(".ud-dd-group-act").forEach(function (b) {
      b.addEventListener("click", function () { applyGroup(Number(b.getAttribute("data-idx")), b.getAttribute("data-act")); });
    });
    panel.querySelectorAll(".ud-dd-group-del").forEach(function (b) {
      b.addEventListener("click", function () {
        var g2 = loadGroups();
        g2.splice(Number(b.getAttribute("data-idx")), 1);
        saveGroups(g2);
        renderCaseFilter();
      });
    });
  }

  // ── Color popover ──────────────────────────────────────────────────────────
  function renderSwatches(activeBg) {
    var container = document.getElementById("ud-pop-swatches");
    if (!container) return;
    container.innerHTML = PRESETS.map(function (p) {
      var on = p.bg.toLowerCase() === (activeBg || "").toLowerCase();
      return '<button class="ud-pop-swatch' + (on ? " ud-swatch-active" : "") + '" data-bg="' + p.bg +
        '" data-fg="' + p.fg + '" style="background:' + p.bg + '"></button>';
    }).join("");
    container.querySelectorAll(".ud-pop-swatch").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var bgEl = document.getElementById("ud-pop-bg");
        var fgEl = document.getElementById("ud-pop-fg");
        if (bgEl) bgEl.value = btn.getAttribute("data-bg");
        if (fgEl) fgEl.value = btn.getAttribute("data-fg");
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
    var c = caseOf(slug);
    var bg = getBg(slug, c ? c.default_color : "#888888");
    var titleEl = document.getElementById("ud-pop-slug");
    if (titleEl) titleEl.textContent = c ? c.display_name : slug;
    var bgEl = document.getElementById("ud-pop-bg");
    var fgEl = document.getElementById("ud-pop-fg");
    if (bgEl) bgEl.value = bg;
    if (fgEl) fgEl.value = getFg(slug, bg);
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
    var c = caseOf(slug);
    if (c) {
      var bgEl = document.getElementById("ud-pop-bg");
      var fgEl = document.getElementById("ud-pop-fg");
      if (bgEl) bgEl.value = c.default_color || "#888888";
      if (fgEl) fgEl.value = autoFg(c.default_color || "#888888");
      renderSwatches(c.default_color || "#888888");
    }
    renderCaseFilter();
    render();
  }

  // ── Save queue (same reliability model as the docket page) ─────────────────
  var noteQueue = {};
  var notePushing = false;
  var noteToastTimer = null;

  function noteToast(text, isError) {
    var el = document.getElementById("ud-sync");
    if (!el) return;
    clearTimeout(noteToastTimer);
    el.textContent = text;
    el.className = isError ? "ud-sync-static" : "ud-sync-live";
    noteToastTimer = setTimeout(function () {
      el.textContent = "";
      el.className = "";
    }, isError ? 6000 : 2000);
  }

  function queuePush(nk) {
    noteQueue[nk] = true;
    drainQueue();
  }

  function drainQueue() {
    if (notePushing) return;
    var keys = Object.keys(noteQueue);
    if (!keys.length) return;
    var nk = keys[0];
    delete noteQueue[nk];
    notePushing = true;
    var rec = NOTES[nk] || {};
    var body = JSON.stringify({
      key: nk,
      bookmarked: !!rec.bookmarked,
      note: rec.note || "",
      context: {
        case_slug: rec.case_slug,
        case_name: rec.case_name,
        entry_number: rec.entry_number,
        date_filed: rec.date_filed,
        snippet: rec.snippet,
      },
    });
    function attempt(n) {
      fetch("api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: body,
      }).then(function (r) { return r.json(); }).then(function (p) {
        if (p && p.ok) { noteToast("Saved", false); finish(); }
        else retry(n);
      }).catch(function () { retry(n); });
    }
    function retry(n) {
      if (n >= 3) { noteToast("Save failed — check connection", true); finish(); return; }
      noteToast("Saving… (retry " + (n + 1) + ")", false);
      setTimeout(function () { attempt(n + 1); }, 1500 * (n + 1));
    }
    function finish() { notePushing = false; drainQueue(); }
    noteToast("Saving…", false);
    attempt(0);
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  function noteList() {
    return Object.keys(NOTES).map(function (k) {
      var r = NOTES[k];
      return {
        key: k,
        slug: r.case_slug || (k.split("|")[0] || ""),
        case_name: r.case_name || "",
        entry_number: r.entry_number != null ? r.entry_number : null,
        date_filed: r.date_filed || "",
        snippet: r.snippet || "",
        note: r.note || "",
        bookmarked: !!r.bookmarked,
        updated_at: r.updated_at || "",
      };
    });
  }

  function filtered() {
    var sq = searchText.toLowerCase().trim();
    var list = noteList().filter(function (n) {
      if (CASES.length && !activeCases[n.slug]) return false;
      var edited = (n.updated_at || "").slice(0, 10);
      if (dateFrom && edited && edited < dateFrom) return false;
      if (dateTo && edited && edited > dateTo) return false;
      if (sq) {
        var hay = [n.case_name, n.slug, n.note, n.snippet, n.date_filed,
          n.entry_number != null ? "dkt " + n.entry_number : ""].join(" ").toLowerCase();
        if (hay.indexOf(sq) === -1) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      var cmp = (a.updated_at || "") < (b.updated_at || "") ? -1
        : (a.updated_at || "") > (b.updated_at || "") ? 1 : 0;
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function fmtStamp(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return iso.slice(0, 10);
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() + " " +
      d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function entryLink(n) {
    var c = caseOf(n.slug);
    if (n.entry_number != null && c && (c.docket_url || "").indexOf("courtlistener.com") !== -1) {
      var url = c.docket_url.replace(/\/+$/, "") +
        "/?filed_after=&filed_before=&entry_gte=" + n.entry_number +
        "&entry_lte=" + n.entry_number + "&order_by=asc";
      return '<a class="ud-link" href="' + esc(url) + '" target="_blank" rel="noopener">Dkt. ' +
        esc(String(n.entry_number)) + "</a>";
    }
    if (n.entry_number != null) return '<span class="ud-link-empty">Dkt. ' + esc(String(n.entry_number)) + "</span>";
    return '<span class="ud-link-empty">—</span>';
  }

  function render() {
    var list = filtered();
    var tbody = document.getElementById("un-tbody");
    var countEl = document.getElementById("ud-count");
    if (countEl) {
      var total = Object.keys(NOTES).length;
      countEl.textContent = list.length + " of " + total + " note" + (total === 1 ? "" : "s");
    }
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="ud-empty">' +
        (Object.keys(NOTES).length
          ? "No notes match the current filters."
          : "No notes yet — star or annotate entries on the docket and they collect here.") +
        "</td></tr>";
      return;
    }
    tbody.innerHTML = list.map(function (n) {
      var c = caseOf(n.slug);
      var bg = getBg(n.slug, c ? c.default_color : "#888888");
      var fg = getFg(n.slug, bg);
      var pill = '<span class="ud-pill" style="background:' + bg + ";color:" + fg + '">' +
        esc(c ? c.short_name : n.slug) + "</span>";
      var entryMeta = (n.date_filed ? esc(n.date_filed) + " · " : "") +
        '<span class="uc-snippet">' + esc(n.snippet || "") + "</span>";
      var noteHtml = n.note
        ? '<div class="un-note-text">' + esc(n.note) + "</div>"
        : '<span class="ud-party-empty">(bookmark only)</span>';
      return (
        "<tr>" +
          '<td class="ud-date">' + esc(fmtStamp(n.updated_at)) + "</td>" +
          '<td class="ud-case">' + pill + "</td>" +
          '<td class="ud-entry">' + entryMeta + "</td>" +
          '<td class="un-note-cell">' + noteHtml + "</td>" +
          '<td class="ud-doc">' + entryLink(n) + "</td>" +
          '<td class="ud-mark-cell">' +
            '<button type="button" class="ud-bm-btn' + (n.bookmarked ? " ud-bm-on" : "") + '" data-nk="' + esc(n.key) + '" title="Toggle bookmark">' + (n.bookmarked ? "★" : "☆") + "</button>" +
            '<button type="button" class="ud-note-btn ud-note-on" data-nk="' + esc(n.key) + '" title="Edit note">📝</button>' +
          "</td>" +
        "</tr>"
      );
    }).join("");
  }

  // ── Modal (edit in place) ──────────────────────────────────────────────────
  function openNoteModal(nk) {
    var rec = NOTES[nk];
    if (!rec) return;
    activeNoteKey = nk;
    var c = caseOf(rec.case_slug);
    var title = document.getElementById("ud-note-title");
    var meta = document.getElementById("ud-note-meta");
    var text = document.getElementById("ud-note-text");
    if (title) {
      title.textContent = (c ? c.short_name : rec.case_slug) + " — " +
        (rec.entry_number != null ? "Dkt. " + rec.entry_number : "Entry");
    }
    if (meta) meta.textContent = (rec.date_filed || "") + " · " + (rec.snippet || "");
    if (text) text.value = rec.note || "";
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
    var rec = NOTES[nk];
    if (!rec) return;
    rec.note = val;
    rec.updated_at = new Date().toISOString();
    if (!(val || "").trim() && !rec.bookmarked) delete NOTES[nk];
    queuePush(nk);
    closeNoteModal();
    render();
  }
  function toggleBookmark(nk) {
    var rec = NOTES[nk];
    if (!rec) return;
    rec.bookmarked = !rec.bookmarked;
    rec.updated_at = new Date().toISOString();
    if (!rec.bookmarked && !(rec.note || "").trim()) delete NOTES[nk];
    queuePush(nk);
    render();
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function exportList() {
    // Respect the current filters — export what you see
    return filtered();
  }

  function toMarkdown(list) {
    var byCase = {};
    list.forEach(function (n) {
      var name = n.case_name || n.slug || "Unknown case";
      (byCase[name] = byCase[name] || []).push(n);
    });
    var lines = ["# Intel Docket Notes", "",
      "_Exported " + new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC_", ""];
    Object.keys(byCase).sort().forEach(function (name) {
      lines.push("## " + name, "");
      byCase[name].forEach(function (n) {
        var dkt = n.entry_number != null ? "Dkt. " + n.entry_number : "(no docket number)";
        lines.push("### " + dkt + " — " + (n.date_filed || "undated") + (n.bookmarked ? " ★" : ""), "");
        if (n.snippet) lines.push("> " + n.snippet, "");
        if ((n.note || "").trim()) lines.push(n.note.trim(), "");
        lines.push("_Last edited " + fmtStamp(n.updated_at) + "_", "");
      });
    });
    return lines.join("\n") + "\n";
  }

  function toCSV(list) {
    function cell(v) {
      v = String(v == null ? "" : v);
      return '"' + v.replace(/"/g, '""') + '"';
    }
    var rows = [["case", "docket_number", "entry_date", "last_edited", "bookmarked", "entry", "note"]];
    list.forEach(function (n) {
      rows.push([n.case_name || n.slug, n.entry_number != null ? n.entry_number : "",
        n.date_filed, n.updated_at, n.bookmarked ? "yes" : "no", n.snippet, n.note]);
    });
    return rows.map(function (r) { return r.map(cell).join(","); }).join("\r\n");
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.json();
    });
  }

  function init() {
    var manifestP = fetchJson("cases/data/_manifest.json").catch(function () { return []; });
    var notesP = fetchJson("api/notes")
      .then(function (p) { return (p && p.ok && p.entries) ? p.entries : {}; })
      .catch(function () {
        // Static build-time copy — stale but better than blank (preview mode)
        return fetchJson("intel-notes.json")
          .then(function (f) { return (f && f.entries) || {}; })
          .catch(function () { return {}; });
      });
    Promise.all([manifestP, notesP]).then(function (res) {
      CASES = res[0] || [];
      NOTES = res[1] || {};
      var savedAC = _savedState && _savedState.activeCases;
      CASES.forEach(function (c) {
        activeCases[c.slug] = savedAC ? !!savedAC[c.slug] : true;
      });
      var meta = document.getElementById("ud-meta");
      if (meta) {
        var total = Object.keys(NOTES).length;
        var bm = noteList().filter(function (n) { return n.bookmarked; }).length;
        meta.textContent = total + " note" + (total === 1 ? "" : "s") + " · " + bm + " bookmarked";
      }
      renderCaseFilter();
      render();
    });
  }

  // ── Wire DOM ───────────────────────────────────────────────────────────────
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
      if (pop && pop.style.display !== "none" && !pop.contains(ev.target)) closePopover();
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

    var tbody = document.getElementById("un-tbody");
    if (tbody) {
      tbody.addEventListener("click", function (ev) {
        var bm = ev.target.closest(".ud-bm-btn");
        if (bm) { toggleBookmark(bm.getAttribute("data-nk")); return; }
        var nb = ev.target.closest(".ud-note-btn");
        if (nb) openNoteModal(nb.getAttribute("data-nk"));
      });
    }

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

    var searchInput = document.getElementById("ud-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchText = searchInput.value;
        render();
      });
    }
    var fromEl = document.getElementById("ud-date-from");
    var toEl = document.getElementById("ud-date-to");
    if (fromEl) fromEl.addEventListener("change", function () { dateFrom = fromEl.value; render(); });
    if (toEl) toEl.addEventListener("change", function () { dateTo = toEl.value; render(); });
    var clearBtn = document.getElementById("ud-clear-search");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        searchText = ""; dateFrom = ""; dateTo = "";
        if (searchInput) searchInput.value = "";
        if (fromEl) fromEl.value = "";
        if (toEl) toEl.value = "";
        render();
      });
    }

    var sortBtn = document.getElementById("ud-sort-btn");
    if (sortBtn) {
      sortBtn.textContent = sortDir === "desc" ? "Edited ↓" : "Edited ↑";
      sortBtn.addEventListener("click", function () {
        sortDir = sortDir === "desc" ? "asc" : "desc";
        sortBtn.textContent = sortDir === "desc" ? "Edited ↓" : "Edited ↑";
        saveFilterState();
        render();
      });
    }

    var mdBtn = document.getElementById("un-export-md");
    var csvBtn = document.getElementById("un-export-csv");
    var copyBtn = document.getElementById("un-copy-md");
    var stamp = new Date().toISOString().slice(0, 10);
    if (mdBtn) {
      mdBtn.addEventListener("click", function () {
        download("intel-notes-" + stamp + ".md", toMarkdown(exportList()), "text/markdown");
      });
    }
    if (csvBtn) {
      csvBtn.addEventListener("click", function () {
        download("intel-notes-" + stamp + ".csv", toCSV(exportList()), "text/csv");
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        navigator.clipboard.writeText(toMarkdown(exportList())).then(function () {
          noteToast("Copied — paste into Google Docs", false);
        }).catch(function () {
          noteToast("Copy failed — use Download instead", true);
        });
      });
    }

    init();
  });
})();
