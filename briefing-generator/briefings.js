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

  // Theme colors share the case-color store (localStorage + intel-prefs
  // roaming) — theme slugs and case slugs never collide.
  var COLOR_KEY = "ud-case-colors";
  var savedColors = {};
  try { savedColors = JSON.parse(localStorage.getItem(COLOR_KEY) || "{}"); } catch (e) {}

  function persistColors() {
    try { localStorage.setItem(COLOR_KEY, JSON.stringify(savedColors)); } catch (e) {}
  }

  var DEFAULT_SWATCHES = [
    { bg: "#D4FF00", fg: "#0A0A0A" }, { bg: "#E9F98A", fg: "#4A5500" },
    { bg: "#1B3A4B", fg: "#FFFFFF" }, { bg: "#94C6F8", fg: "#123A66" },
    { bg: "#3B78D8", fg: "#FFFFFF" }, { bg: "#B3A8F0", fg: "#2A1E6E" },
    { bg: "#4A3DE0", fg: "#FFFFFF" }, { bg: "#7EF4C2", fg: "#0B4A32" },
    { bg: "#3FA07A", fg: "#FFFFFF" }, { bg: "#F2AAEC", fg: "#6E1466" },
    { bg: "#CC33CC", fg: "#FFFFFF" }, { bg: "#3A3A3A", fg: "#FFFFFF" },
  ];

  function themeOf(slug) {
    var base = THEMES[slug] || {
      name: slug.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
      emoji: "\ud83d\udcf0", bg: "#E0E7FF", fg: "#3730a3",
    };
    var ov = savedColors[slug];
    if (!ov) return base;
    return { name: base.name, emoji: base.emoji, bg: ov.bg || base.bg, fg: ov.fg || base.fg };
  }

  // Roaming: pull the shared prefs store once so a fresh browser sees the
  // same theme colors; pushes merge on the server copy so case groups and
  // palette presets are never clobbered from this page.
  function hydrateColors() {
    fetchJson("api/prefs").then(function (p) {
      if (p && p.ok && p.colors) {
        Object.keys(p.colors).forEach(function (k) { savedColors[k] = p.colors[k]; });
        persistColors();
        renderThemeFilter();
        render();
      }
    }).catch(function () {});
  }

  function pushThemeColor() {
    fetchJson("api/prefs").then(function (p) {
      var colors = (p && p.ok && p.colors) || {};
      Object.keys(savedColors).forEach(function (k) { colors[k] = savedColors[k]; });
      Object.keys(colors).forEach(function (k) { if (savedColors[k] === undefined && THEMES[k]) delete colors[k]; });
      return fetch("api/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colors: colors,
          groups: (p && p.groups) || [],
          presets: (p && p.presets) || [],
        }),
      });
    }).catch(function () {});
  }

  var popEl = null;
  function closePop() {
    if (popEl && popEl.parentNode) popEl.parentNode.removeChild(popEl);
    popEl = null;
  }

  function openThemePopover(slug, anchor) {
    closePop();
    var t = themeOf(slug);
    var pop = document.createElement("div");
    pop.className = "ud-color-pop";
    pop.innerHTML =
      '<div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-60);margin-bottom:10px;">' + esc(t.name) + " colors</div>" +
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:12px;">' +
      DEFAULT_SWATCHES.map(function (s, i) {
        return '<button type="button" data-sw="' + i + '" title="' + s.bg + '" style="width:26px;height:26px;border:1px solid var(--line-strong);cursor:pointer;background:' + s.bg + ';"></button>';
      }).join("") +
      "</div>" +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;font-size:11.5px;color:var(--ink-60);">' +
        '<label style="display:flex;gap:4px;align-items:center;">Bg <input type="color" id="ub-cust-bg" value="' + (t.bg || "#E0E7FF") + '" style="width:30px;height:24px;padding:0;border:1px solid var(--line-strong);background:none;cursor:pointer;"></label>' +
        '<label style="display:flex;gap:4px;align-items:center;">Text <input type="color" id="ub-cust-fg" value="' + (t.fg || "#3730a3") + '" style="width:30px;height:24px;padding:0;border:1px solid var(--line-strong);background:none;cursor:pointer;"></label>' +
        '<button type="button" id="ub-cust-apply" class="ud-dd-save-btn" style="margin-left:auto;">Apply</button>' +
      "</div>" +
      '<button type="button" id="ub-color-reset" class="ud-dd-quick">Reset to default</button>';
    document.body.appendChild(pop);
    var rect = anchor.getBoundingClientRect();
    pop.style.top = (rect.bottom + window.scrollY + 6) + "px";
    pop.style.left = Math.max(8, Math.min(rect.left + window.scrollX - 90, window.innerWidth - 250)) + "px";
    popEl = pop;

    function setColor(bg, fg) {
      savedColors[slug] = { bg: bg, fg: fg };
      persistColors();
      pushThemeColor();
      renderThemeFilter();
      render();
      closePop();
    }
    pop.querySelectorAll("[data-sw]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = DEFAULT_SWATCHES[Number(b.getAttribute("data-sw"))];
        setColor(s.bg, s.fg);
      });
    });
    pop.querySelector("#ub-cust-apply").addEventListener("click", function () {
      setColor(pop.querySelector("#ub-cust-bg").value, pop.querySelector("#ub-cust-fg").value);
    });
    pop.querySelector("#ub-color-reset").addEventListener("click", function () {
      delete savedColors[slug];
      persistColors();
      pushThemeColor();
      renderThemeFilter();
      render();
      closePop();
    });
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
          '<span class="ud-pill ud-pill-sq" style="background:' + t.bg + ";color:" + t.fg + '">' + t.emoji + " " + esc(t.name) + "</span>" +
          '<span class="ud-dd-spacer"></span>' +
          '<button type="button" class="ud-gear-btn" data-gear="' + esc(i.slug) + '" title="Colors for ' + esc(t.name) + '">\u2699</button>' +
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
    panel.querySelectorAll(".ud-gear-btn").forEach(function (g) {
      g.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openThemePopover(g.getAttribute("data-gear"), g);
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
      var pill = '<span class="ud-pill ud-pill-sq" style="background:' + t.bg + ";color:" + t.fg + '">' +
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
    document.addEventListener("click", function (ev) {
      if (popEl && !popEl.contains(ev.target) && !ev.target.closest(".ud-gear-btn")) closePop();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closePop();
    });
    hydrateColors();
    init();
  });
})();
