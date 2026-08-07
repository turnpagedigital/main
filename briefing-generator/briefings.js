(function () {
  "use strict";

  /* Briefings — one row per TRACKED CASE (cases-not-themes model).
     Data: case-briefings.json, written daily by generate_case_briefings.py.
     Rows expand in place to the full briefing body; #case=<slug> deep-links
     from the dashboard cards. Theme tags are labels/filters only — themes no
     longer have briefings of their own. */

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

  // ── Theme labels (tags on rows + filter) ──────────────────────────────────
  var THEMES = {};
  var THEME_COLORS = {
    "rewind-tariffs":               { bg: "#ECFCCB", fg: "#3f6212" },
    "llm-class-action":             { bg: "#DBEAFE", fg: "#1e40af" },
    "crypto-insolvency":            { bg: "#FFEDD5", fg: "#9a3412" },
    "fraud-recovery":               { bg: "#F3E8FF", fg: "#6b21a8" },
    "billion-dollar-class-actions": { bg: "#D1FAE5", fg: "#065f46" },
    "bankruptcy-creditor-rights":   { bg: "#FEE2E2", fg: "#991b1b" },
  };
  function themeOf(slug) {
    var t = THEMES[slug];
    if (t) return t;
    var c = THEME_COLORS[slug] || { bg: "#E0E7FF", fg: "#3730a3" };
    return { name: slug, emoji: "📰", bg: c.bg, fg: c.fg };
  }
  function themeTag(slug) {
    var t = themeOf(slug);
    return '<span class="ub-tag" style="background:' + t.bg + ";color:" + t.fg + '" title="' + esc(t.name) + '">' + t.emoji + " " + esc(t.name) + "</span>";
  }

  // ── Case pill colors (shared store: ud-case-colors + intel-prefs) ─────────
  var savedColors = {};
  try { savedColors = JSON.parse(localStorage.getItem("ud-case-colors") || "{}"); } catch (e) {}

  function autoFg(bg) {
    var r = parseInt(String(bg).slice(1, 3), 16) || 136;
    var g = parseInt(String(bg).slice(3, 5), 16) || 136;
    var b = parseInt(String(bg).slice(5, 7), 16) || 136;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0A0A0A" : "#FFFFFF";
  }

  var MANIFEST = [];
  function manifestOf(slug) {
    for (var i = 0; i < MANIFEST.length; i++) {
      if (MANIFEST[i].slug === slug) return MANIFEST[i];
    }
    return null;
  }

  function casePill(slug, name) {
    var m = manifestOf(slug);
    var bg = (savedColors[slug] && savedColors[slug].bg) || (m && m.default_color) || "#888888";
    var fg = (savedColors[slug] && savedColors[slug].fg) || autoFg(bg);
    return '<span class="ud-pill" style="background:' + bg + ";color:" + fg + '">' + esc(name) + "</span>";
  }

  // ── Minimal markdown → HTML for our own generated briefing bodies ─────────
  function mdToHtml(md) {
    var out = [];
    String(md || "").split(/\n\n+/).forEach(function (para) {
      var p = para.trim();
      if (!p) return;
      var h = /^(#{2,4})\s+(.*)$/.exec(p.split("\n")[0]);
      if (h && p.indexOf("\n") === -1) {
        out.push("<h4>" + inline(h[2]) + "</h4>");
        return;
      }
      var lines = p.split("\n");
      var isList = lines.every(function (l) { return /^\s*-\s+/.test(l); });
      if (isList) {
        out.push("<ul>" + lines.map(function (l) {
          return "<li>" + inline(l.replace(/^\s*-\s+/, "")) + "</li>";
        }).join("") + "</ul>");
        return;
      }
      out.push("<p>" + inline(p) + "</p>");
    });
    return out.join("");

    function inline(text) {
      var t = esc(text);
      t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
      t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/__((?:(?!__).)+)__/g, "<strong>$1</strong>");
      t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
      return t;
    }
  }

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
  }

  // ── State ─────────────────────────────────────────────────────────────────
  var ITEMS = [];
  var activeCases = {};
  var expanded = {};
  var _savedState = null;
  var FILTER_KEY = "ub-case-filter-state";

  function loadFilterState() {
    try { _savedState = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}"); } catch (e) {}
  }
  function saveFilterState() {
    try { localStorage.setItem(FILTER_KEY, JSON.stringify({ activeCases: activeCases })); } catch (e) {}
  }

  function filterLabel() {
    var total = ITEMS.length;
    if (!total) return "Cases";
    var on = ITEMS.filter(function (i) { return !!activeCases[i.slug]; }).length;
    if (on === total) return "Cases: All (" + total + ")";
    if (!on) return "Cases: None";
    return "Cases: " + on + " of " + total;
  }

  function renderCaseFilter() {
    var btn = document.getElementById("ud-case-dd-btn");
    var panel = document.getElementById("ud-case-dd-panel");
    if (!btn || !panel) return;
    btn.innerHTML = esc(filterLabel()) + ' <span class="ud-dd-caret">▾</span>';
    var head =
      '<div class="ud-dd-head">' +
        '<button type="button" class="ud-dd-quick" data-act="all">Select all</button>' +
        '<button type="button" class="ud-dd-quick" data-act="none">Deselect all</button>' +
      "</div>";
    var rows = ITEMS.map(function (i) {
      return (
        '<label class="ud-dd-row" title="' + esc(i.case_name) + '">' +
          '<input type="checkbox" data-slug="' + esc(i.slug) + '"' + (activeCases[i.slug] ? " checked" : "") + ">" +
          casePill(i.slug, i.short_name || i.case_name) +
        "</label>"
      );
    }).join("");
    panel.innerHTML = head + rows;
    panel.querySelectorAll(".ud-dd-quick").forEach(function (q) {
      q.addEventListener("click", function () {
        var on = q.getAttribute("data-act") === "all";
        ITEMS.forEach(function (i) { activeCases[i.slug] = on; });
        saveFilterState();
        renderCaseFilter();
        render();
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
  }

  function statusCell(i) {
    if (i.moved) return '<span class="ub-chip ub-chip-moved">Moved</span>';
    if (i.no_change_since) {
      return '<span class="ub-chip">No change since ' + esc(fmtDate(i.no_change_since)) + "</span>";
    }
    return '<span class="ub-chip">Quiet</span>';
  }

  function render() {
    var tbody = document.getElementById("ub-tbody");
    var countEl = document.getElementById("ud-count");
    var list = ITEMS.filter(function (i) { return !!activeCases[i.slug]; });
    if (countEl) countEl.textContent = list.length + " case" + (list.length === 1 ? "" : "s");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="ud-empty">No cases selected.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (i) {
      var tags = (i.themes || []).map(themeTag).join(" ");
      var lede = (i.lede || "").trim();
      var hasBody = !!(i.body_md || "").trim();
      var open = !!expanded[i.slug];
      var main =
        "<tr" + (i.moved ? ' class="ub-row-moved"' : "") + ">" +
          '<td class="ud-date">' + esc(fmtDate(i.date) || "—") + "</td>" +
          '<td class="ub-case-cell">' + casePill(i.slug, i.short_name || i.case_name) +
            '<div class="ub-tags">' + tags + "</div>" +
            '<div class="ub-court">' + esc(i.court || "") + "</div>" +
          "</td>" +
          '<td class="ud-entry">' + statusCell(i) + " " +
            (lede ? '<span class="ud-desc">' + esc(lede) + "</span>"
                  : '<span class="ud-desc" style="color:var(--ink-40)">No briefing yet — it generates the first time this case moves.</span>') +
          "</td>" +
          '<td class="ub-open-cell">' +
            (hasBody
              ? '<button type="button" class="pr-btn" data-toggle="' + esc(i.slug) + '">' + (open ? "Close" : "Read") + "</button>"
              : "") +
            ' <a class="ud-link" href="docket.html#case=' + encodeURIComponent(i.slug) + '">Docket</a>' +
          "</td>" +
        "</tr>";
      var detail = "";
      if (open && hasBody) {
        detail =
          '<tr class="ub-detail-row" id="ub-detail-' + esc(i.slug) + '"><td colspan="4">' +
            '<div class="ub-body">' +
              '<div class="ub-body-head">' + esc(i.emoji || "⚖️") + " " + esc(i.case_name) +
                ' <span class="ub-body-date">' + esc(fmtDate(i.date)) + "</span></div>" +
              mdToHtml(i.body_md) +
            "</div>" +
          "</td></tr>";
      }
      return main + detail;
    }).join("");
    tbody.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var slug = b.getAttribute("data-toggle");
        expanded[slug] = !expanded[slug];
        render();
      });
    });
  }

  function applyHash() {
    var m = /case=([a-z0-9-]+)/.exec(location.hash || "");
    if (!m) return;
    var slug = m[1];
    if (!ITEMS.some(function (i) { return i.slug === slug; })) return;
    activeCases[slug] = true;
    expanded[slug] = true;
    render();
    var row = document.getElementById("ub-detail-" + slug);
    if (row) row.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function init() {
    fetchJson("case-briefings.json").then(function (d) {
      ITEMS = (d && d.items) || [];
      var saved = _savedState && _savedState.activeCases;
      ITEMS.forEach(function (i) {
        activeCases[i.slug] = saved && (i.slug in saved) ? !!saved[i.slug] : true;
      });
      var meta = document.getElementById("ud-meta");
      if (meta) {
        var latest = ITEMS.reduce(function (acc, i) { return (i.updated || "") > acc ? i.updated : acc; }, "");
        var movedN = ITEMS.filter(function (i) { return i.moved; }).length;
        meta.textContent = ITEMS.length + " tracked cases · " + movedN + " moved in the last cycle" +
          (latest ? " · updated " + fmtDate(latest) : "");
      }
      renderCaseFilter();
      render();
      applyHash();
    }).catch(function () {
      var tbody = document.getElementById("ub-tbody");
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="ud-empty">No case briefings yet — they generate on the next daily run.</td></tr>';
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadFilterState();
    var ddBtn = document.getElementById("ud-case-dd-btn");
    var ddPanel = document.getElementById("ud-case-dd-panel");
    if (ddBtn && ddPanel) {
      ddBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        ddPanel.style.display = ddPanel.style.display === "none" ? "block" : "none";
      });
      document.addEventListener("click", function (ev) {
        if (ddPanel.style.display === "none") return;
        if (ev.target && !ev.target.isConnected) return;
        if (ddPanel.contains(ev.target) || ddBtn.contains(ev.target)) return;
        ddPanel.style.display = "none";
      });
    }
    window.addEventListener("hashchange", applyHash);

    // Display names for theme tags follow /admin/intelligence renames.
    fetchJson("themes.json").then(function (d) {
      ((d && d.themes) || []).forEach(function (t) {
        if (!t || !t.slug) return;
        var c = THEME_COLORS[t.slug] || { bg: "#E0E7FF", fg: "#3730a3" };
        THEMES[t.slug] = { name: t.display_name || t.slug, emoji: t.emoji || "📰", bg: c.bg, fg: c.fg };
      });
      render();
    }).catch(function () {});

    // Case pill colors + manifest defaults roam with the shared prefs store.
    fetchJson("cases/data/_manifest.json").then(function (man) {
      MANIFEST = man || [];
      renderCaseFilter();
      render();
    }).catch(function () {});
    fetchJson("api/prefs").then(function (p) {
      if (p && p.ok && p.colors) {
        Object.keys(p.colors).forEach(function (k) { savedColors[k] = p.colors[k]; });
        try { localStorage.setItem("ud-case-colors", JSON.stringify(savedColors)); } catch (e) {}
        renderCaseFilter();
        render();
      }
    }).catch(function () {});

    init();
  });
})();
