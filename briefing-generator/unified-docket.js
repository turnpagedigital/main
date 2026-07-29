(function () {
  "use strict";

  // ── Entry-type classifier ──────────────────────────────────────────────────
  function classifyEntry(desc) {
    var d = (desc || "").toLowerCase();
    if (/notice of (electronic )?appearance|notice of appearance/.test(d)) return "appearance";
    if (/certificate of service/.test(d)) return "service";
    if (/notice of (transfer|removal|reassignment)/.test(d)) return "transfer";
    if (/\bpending order\b/.test(d)) return "order";
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

  // ── Load embedded data ─────────────────────────────────────────────────────
  var raw = document.getElementById("docket-data");
  if (!raw) return;
  var CASES;
  try { CASES = JSON.parse(raw.textContent); } catch (e) { return; }

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
      });
    });
  });

  // ── State ──────────────────────────────────────────────────────────────────
  var activeCases = {};
  CASES.forEach(function (c) { activeCases[c.slug] = true; });
  var entryFilter = "all";   // all | substantive | hide-admin | orders | transfers
  var newOnly = false;
  var sortDir = "desc";      // desc | asc

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

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    var entries = filtered();
    var tbody = document.getElementById("ud-tbody");
    var countEl = document.getElementById("ud-count");
    if (countEl) countEl.textContent = entries.length + " entr" + (entries.length === 1 ? "y" : "ies");

    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="ud-empty">No entries match the current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = entries.map(function (e) {
      var dkt = e.entry_number != null ? String(e.entry_number) : "—";
      var pill = '<span class="ud-pill ud-pill-' + esc(e.slug) + '">' +
                 esc(e.short) + " #" + esc(dkt) + "</span>";
      var badges = "";
      if (e.is_new) badges += '<span class="ud-new">NEW</span>';
      if (e.landmark) badges += '<span class="ud-landmark">' + esc(e.landmark) + "</span>";
      var descHtml = e.description
        ? '<span class="ud-desc">' + esc(e.description) + "</span>"
        : '<span class="ud-desc ud-desc-empty">—</span>';
      var link = "";
      if (e.doc_url) {
        link = ' <a class="ud-link" href="' + esc(e.doc_url) + '" target="_blank" rel="noopener">PDF ↗</a>';
      } else if (e.docket_url) {
        link = ' <a class="ud-link ud-link-docket" href="' + esc(e.docket_url) + '" target="_blank" rel="noopener">Docket ↗</a>';
      }
      var rowCls = e.is_new ? ' class="ud-row-new"' : "";
      return "<tr" + rowCls + ">" +
        '<td class="ud-date">' + esc(e.date_display) + "</td>" +
        '<td class="ud-case">' + pill + "</td>" +
        '<td class="ud-entry">' + badges + descHtml + link + "</td>" +
        "</tr>";
    }).join("");
  }

  // ── Wire controls ──────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    // Case checkboxes
    document.querySelectorAll(".ud-case-cb").forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeCases[cb.value] = cb.checked;
        render();
      });
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
