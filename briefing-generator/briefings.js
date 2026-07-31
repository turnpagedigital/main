(function () {
  "use strict";

  /* Briefings — the daily briefing lede for every theme, filterable by theme.
     Data: briefings.json, upserted by the daily pipeline (generate.py). */

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var THEMES = {
    "rewind-tariffs":               { name: "Tariffs / Trade",               emoji: "⚖️", bg: "#ECFCCB", fg: "#3f6212" },
    "llm-class-action":             { name: "LLM / Copyright",               emoji: "🤖", bg: "#DBEAFE", fg: "#1e40af" },
    "crypto-insolvency":            { name: "Crypto Insolvency",             emoji: "🪙", bg: "#FFEDD5", fg: "#9a3412" },
    "fraud-recovery":               { name: "Ponzi / Fraud Recovery",        emoji: "🕵️", bg: "#F3E8FF", fg: "#6b21a8" },
    "billion-dollar-class-actions": { name: "$1B+ Class Actions & Mass Arb", emoji: "💰", bg: "#D1FAE5", fg: "#065f46" },
    "bankruptcy-creditor-rights":   { name: "Bankruptcy Creditor Rights",    emoji: "📜", bg: "#FEE2E2", fg: "#991b1b" },
  };

  function themeOf(slug) {
    return THEMES[slug] || {
      name: slug.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
      emoji: "📰", bg: "#E0E7FF", fg: "#3730a3",
    };
  }

  var ITEMS = [];
  var activeThemes = {};
  var _savedState = null;

  var FILTER_KEY = "ub-filter-state";
  function loadFilterState() {
    try { _savedState = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}"); } catch (e) {}
  }
  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ activeThemes: activeThemes }));
    } catch (e) {}
  }

  function filterLabel() {
    var total = ITEMS.length;
    if (!total) return "Themes";
    var on = ITEMS.filter(function (i) { return !!activeThemes[i.slug]; }).length;
    if (on === total) return "Themes: All (" + total + ")";
    if (!on) return "Themes: None";
    return "Themes: " + on + " of " + total;
  }

  function renderThemeFilter() {
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
      var t = themeOf(i.slug);
      return (
        '<label class="ud-dd-row" title="' + esc(t.name) + '">' +
          '<input type="checkbox" data-slug="' + esc(i.slug) + '"' + (activeThemes[i.slug] ? " checked" : "") + ">" +
          '<span class="ud-pill" style="background:' + t.bg + ";color:" + t.fg + '">' + t.emoji + " " + esc(t.name) + "</span>" +
        "</label>"
      );
    }).join("");
    panel.innerHTML = head + rows + '<button type="button" class="ud-dd-save-btn ud-dd-saveview" data-close-panel>Save view</button>';

    var saveView = panel.querySelector("[data-close-panel]");
    if (saveView) {
      saveView.addEventListener("click", function () { panel.style.display = "none"; });
    }
    panel.querySelectorAll(".ud-dd-quick").forEach(function (q) {
      q.addEventListener("click", function () {
        var on = q.getAttribute("data-act") === "all";
        ITEMS.forEach(function (i) { activeThemes[i.slug] = on; });
        saveFilterState();
        renderThemeFilter();
        render();
      });
    });
    panel.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeThemes[cb.getAttribute("data-slug")] = cb.checked;
        saveFilterState();
        renderThemeFilter();
        render();
      });
    });
  }

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
  }

  function render() {
    var tbody = document.getElementById("ub-tbody");
    var countEl = document.getElementById("ud-count");
    var list = ITEMS.filter(function (i) { return !!activeThemes[i.slug]; });
    if (countEl) countEl.textContent = list.length + " briefing" + (list.length === 1 ? "" : "s");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="ud-empty">No themes selected.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (i) {
      var t = themeOf(i.slug);
      var pill = '<span class="ud-pill" style="background:' + t.bg + ";color:" + t.fg + '">' +
        t.emoji + " " + esc(t.name) + "</span>";
      var lede = (i.body || i.stat || "").trim();
      return (
        "<tr>" +
          '<td class="ud-date">' + esc(fmtDate(i.updated)) + "</td>" +
          '<td class="ud-case">' + pill + "</td>" +
          '<td class="ud-entry"><span class="ud-desc">' + esc(lede) + "</span></td>" +
          '<td class="ud-doc"><a class="ud-link" href="' + esc(i.slug) + '/dashboard.html">Read briefing</a></td>' +
        "</tr>"
      );
    }).join("");
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function init() {
    fetchJson("briefings.json").then(function (d) {
      ITEMS = (d && d.items) || [];
      ITEMS.sort(function (a, b) { return themeOf(a.slug).name.localeCompare(themeOf(b.slug).name); });
      var saved = _savedState && _savedState.activeThemes;
      ITEMS.forEach(function (i) {
        activeThemes[i.slug] = saved ? !!saved[i.slug] : true;
      });
      var meta = document.getElementById("ud-meta");
      if (meta) {
        var latest = ITEMS.reduce(function (acc, i) { return i.updated > acc ? i.updated : acc; }, "");
        meta.textContent = ITEMS.length + " themes · updated " + fmtDate(latest);
      }
      renderThemeFilter();
      render();
    }).catch(function () {
      var tbody = document.getElementById("ub-tbody");
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="ud-empty">Failed to load briefings.</td></tr>';
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
        if (ev.target && !ev.target.isConnected) return;  // click landed on re-rendered UI inside the panel
        if (ddPanel.contains(ev.target) || ddBtn.contains(ev.target)) return;
        ddPanel.style.display = "none";
      });
    }
    init();
  });
})();
