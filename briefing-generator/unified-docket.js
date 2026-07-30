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

  var SUBSTANTIVE = { motion: 1, objection: 1, response: 1, application: 1,
                      complaint: 1, declaration: 1, stipulation: 1, order: 1 };
  var ADMINISTRATIVE = { appearance: 1, service: 1, notice: 1, other: 1 };

  // ── Filing party extractor ─────────────────────────────────────────────────
  function extractParty(desc) {
    if (!desc) return "";
    var d = desc.trim();
    // Court-authored entries
    if (/^(ORDER|JUDGMENT|REPORT|MINUTE|SCHEDULING|TRANSCRIPT)\b/i.test(d)) return "Court";
    if (/Signed by Judge|COURT STAFF|Court Staff/i.test(d)) return "Court";
    // "filed by [Party]" — sometimes PACER omits the space: "filed byAnthropic"
    var m = d.match(/\bfiled\s+by\s*([A-Z][^()\n]{1,60}?)(?:\s*[.(,]|$)/i);
    if (m) { var p = m[1].replace(/\s+/g, " ").trim(); if (p.length > 1) return p; }
    // "submitted by [Party]"
    m = d.match(/\bsubmitted\s+by\s+([A-Z][^()\n]{1,40}?)(?:\s*[.(,]|$)/i);
    if (m) return m[1].replace(/\s+/g, " ").trim();
    return "";
  }

  // ── Color management ───────────────────────────────────────────────────────
  var COLOR_KEY = "ud-case-colors";

  function loadColors() {
    try { return JSON.parse(localStorage.getItem(COLOR_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function saveColors(map) {
    try { localStorage.setItem(COLOR_KEY, JSON.stringify(map)); } catch (e) {}
  }

  // ── Load embedded data ─────────────────────────────────────────────────────
  var raw = document.getElementById("docket-data");
  if (!raw) return;
  var CASES;
  try { CASES = JSON.parse(raw.textContent); } catch (e) { return; }

  // Build default color map from embedded data (set by Python from _PILL_PALETTE)
  var DEFAULT_BG = {};
  CASES.forEach(function (c) { DEFAULT_BG[c.slug] = c.default_color || "#888888"; });

  var savedColors = loadColors();

  function getBg(slug) {
    return (savedColors[slug] && savedColors[slug].bg) || DEFAULT_BG[slug] || "#888888";
  }

  function autoFg(bg) {
    var r = parseInt(bg.slice(1, 3), 16) || 136;
    var g = parseInt(bg.slice(3, 5), 16) || 136;
    var b = parseInt(bg.slice(5, 7), 16) || 136;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0A0A0A" : "#FFFFFF";
  }

  function getFg(slug, bg) {
    var stored = savedColors[slug] && savedColors[slug].fg;
    if (stored === "white") return "#FFFFFF";
    if (stored === "black") return "#0A0A0A";
    return autoFg(bg);
  }

  // ── Flatten all entries ────────────────────────────────────────────────────
  var ALL = [];
  CASES.forEach(function (c) {
    (c.entries || []).forEach(function (e) {
      ALL.push({
        slug:         c.slug,
        name:         c.display_name,
        short:        c.short_name,
        docket_url:   c.docket_url || "",
        entry_number: e.entry_number,
        date_filed:   e.date_filed || "",
        date_display: e.date_display || e.date_filed || "",
        description:  (e.description || "").trim(),
        is_new:       !!e.is_new,
        doc_url:      e.doc_url || "",
        landmark:     e.landmark || "",
        type:         classifyEntry(e.description),
        party:        extractParty(e.description || ""),
      });
    });
  });

  // ── State ──────────────────────────────────────────────────────────────────
  var activeCases = {};
  CASES.forEach(function (c) { activeCases[c.slug] = true; });
  var entryFilter = "all";
  var newOnly = false;
  var sortDir = "desc";

  // ── Escape helper ──────────────────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  function filtered() {
    var list = ALL.filter(function (e) {
      if (!activeCases[e.slug]) return false;
      if (newOnly && !e.is_new) return false;
      if (entryFilter === "substantive" && !SUBSTANTIVE[e.type]) return false;
      if (entryFilter === "hide-admin"  &&  ADMINISTRATIVE[e.type]) return false;
      if (entryFilter === "orders"      && e.type !== "order") return false;
      if (entryFilter === "transfers"   && e.type !== "transfer") return false;
      return true;
    });
    list.sort(function (a, b) {
      var cmp = a.date_filed < b.date_filed ? -1 : a.date_filed > b.date_filed ? 1 : 0;
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }

  // FG_STATES: undefined = auto, "white", "black"
  var FG_CYCLE = [undefined, "white", "black"];
  var FG_LABEL = { undefined: "·", white: "W", black: "B" };

  function cycleFg(slug) {
    var cur = savedColors[slug] && savedColors[slug].fg;
    var idx = FG_CYCLE.indexOf(cur);
    var next = FG_CYCLE[(idx + 1) % FG_CYCLE.length];
    if (!savedColors[slug]) savedColors[slug] = {};
    if (next === undefined) { delete savedColors[slug].fg; }
    else { savedColors[slug].fg = next; }
    saveColors(savedColors);
  }

  // ── Apply pill colors (inline style wins over static CSS) ──────────────────
  function applyPillColors() {
    CASES.forEach(function (c) {
      var bg = getBg(c.slug);
      var fg = getFg(c.slug, bg);
      document.querySelectorAll(".ud-pill-" + c.slug).forEach(function (el) {
        el.style.background = bg;
        el.style.color = fg;
      });
      var picker = document.getElementById("ud-color-" + c.slug);
      if (picker) picker.value = bg;
      var fgBtn = document.getElementById("ud-fg-" + c.slug);
      if (fgBtn) {
        var state = savedColors[c.slug] && savedColors[c.slug].fg;
        fgBtn.textContent = state === "white" ? "W" : state === "black" ? "B" : "·";
        fgBtn.style.background = fg;
        fgBtn.style.color = bg;
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    var entries = filtered();
    var tbody = document.getElementById("ud-tbody");
    var countEl = document.getElementById("ud-count");
    if (countEl) countEl.textContent = entries.length + " entr" + (entries.length === 1 ? "y" : "ies");

    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="ud-empty">No entries match the current filters.</td></tr>';
      applyPillColors();
      return;
    }

    tbody.innerHTML = entries.map(function (e) {
      var dkt = e.entry_number != null ? String(e.entry_number) : "—";
      var bg = getBg(e.slug);
      var fg = getFg(e.slug, bg);
      var pill = '<span class="ud-pill ud-pill-' + esc(e.slug) + '" style="background:' + bg + ';color:' + fg + '">' +
                 esc(e.short) + " · " + esc(dkt) + "</span>";
      var badges = "";
      if (e.is_new) badges += '<span class="ud-new">NEW</span> ';
      if (e.landmark) badges += '<span class="ud-landmark">' + esc(e.landmark) + "</span> ";
      var descHtml = e.description
        ? badges + '<span class="ud-desc">' + esc(e.description) + "</span>"
        : badges + '<span class="ud-desc ud-desc-empty">—</span>';
      var partyHtml = e.party
        ? esc(e.party)
        : '<span class="ud-party-empty">—</span>';
      var linkHtml;
      if (e.doc_url) {
        linkHtml = '<a class="ud-link" href="' + esc(e.doc_url) + '" target="_blank" rel="noopener">PDF ↗</a>';
      } else if (e.docket_url) {
        linkHtml = '<a class="ud-link ud-link-docket" href="' + esc(e.docket_url) + '" target="_blank" rel="noopener">Docket ↗</a>';
      } else {
        linkHtml = '<span class="ud-link-empty">—</span>';
      }
      var rowCls = e.is_new ? ' class="ud-row-new"' : "";
      return "<tr" + rowCls + ">" +
        '<td class="ud-date">' + esc(e.date_display) + "</td>" +
        '<td class="ud-case">' + pill + "</td>" +
        '<td class="ud-party">' + partyHtml + "</td>" +
        '<td class="ud-entry">' + descHtml + "</td>" +
        '<td class="ud-doc">' + linkHtml + "</td>" +
        "</tr>";
    }).join("");

    applyPillColors();
  }

  // ── Wire controls ──────────────────────────────────────────────────────────
  function syncToggleAllBtn() {
    var btn = document.getElementById("ud-toggle-all");
    if (!btn) return;
    var allOn = CASES.every(function (c) { return activeCases[c.slug]; });
    btn.textContent = allOn ? "Deselect all" : "Select all";
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Select / deselect all
    var toggleAllBtn = document.getElementById("ud-toggle-all");
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener("click", function () {
        var allOn = CASES.every(function (c) { return activeCases[c.slug]; });
        CASES.forEach(function (c) { activeCases[c.slug] = !allOn; });
        document.querySelectorAll(".ud-case-cb").forEach(function (cb) {
          cb.checked = !allOn;
        });
        syncToggleAllBtn();
        render();
      });
    }

    // Case checkboxes
    document.querySelectorAll(".ud-case-cb").forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeCases[cb.value] = cb.checked;
        syncToggleAllBtn();
        render();
      });
    });

    // Color pickers + fg toggles
    CASES.forEach(function (c) {
      var picker = document.getElementById("ud-color-" + c.slug);
      if (picker) {
        picker.addEventListener("input", function () {
          if (!savedColors[c.slug]) savedColors[c.slug] = {};
          savedColors[c.slug].bg = picker.value;
          saveColors(savedColors);
          render();
        });
      }
      var fgBtn = document.getElementById("ud-fg-" + c.slug);
      if (fgBtn) {
        fgBtn.addEventListener("click", function () {
          cycleFg(c.slug);
          render();
        });
      }
    });

    // Entry-type radios
    document.querySelectorAll(".ud-type-radio").forEach(function (r) {
      r.addEventListener("change", function () {
        if (r.checked) { entryFilter = r.value; render(); }
      });
    });

    // New-only checkbox
    var newCb = document.getElementById("ud-new-only");
    if (newCb) newCb.addEventListener("change", function () { newOnly = newCb.checked; render(); });

    // Sort toggle
    var sortBtn = document.getElementById("ud-sort-btn");
    if (sortBtn) sortBtn.addEventListener("click", function () {
      sortDir = sortDir === "desc" ? "asc" : "desc";
      sortBtn.textContent = sortDir === "desc" ? "Date ↓" : "Date ↑";
      render();
    });

    render();
  });
})();
