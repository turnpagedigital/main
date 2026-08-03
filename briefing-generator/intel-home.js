(function () {
  "use strict";

  /* Intel dashboard (landing) — four side-by-side columns previewing the top 7
     from Briefings, Docket, Calendar, and Notes. Row clicks land on the full
     section pages. Calendar parsing mirrors calendar.js (trimmed copy). */

  // Served at /intel/ in production and in local previews of dist; when the
  // generator repo is previewed standalone the pages sit at the root.
  var BASE = location.pathname.indexOf("/intel") === 0 ? "/intel/" : "/";

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

  // Case pill colors — shared with the docket page: user overrides in
  // localStorage (ud-case-colors), manifest default_color as the fallback.
  var savedColors = {};
  try { savedColors = JSON.parse(localStorage.getItem("ud-case-colors") || "{}"); } catch (e) {}

  function autoFg(bg) {
    var r = parseInt(String(bg).slice(1, 3), 16) || 136;
    var g = parseInt(String(bg).slice(3, 5), 16) || 136;
    var b = parseInt(String(bg).slice(5, 7), 16) || 136;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0A0A0A" : "#FFFFFF";
  }

  function pill(slug, name, defaultColor) {
    var bg = (savedColors[slug] && savedColors[slug].bg) || defaultColor || "#888888";
    var fg = (savedColors[slug] && savedColors[slug].fg) || autoFg(bg);
    return '<span class="ih-pill" style="background:' + bg + ";color:" + fg + '">' + esc(name) + "</span>";
  }

  var MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    return MONTH_ABBR[Number(m[2]) - 1] + " " + Number(m[3]);
  }

  function fill(id, html) {
    var n = document.getElementById(id);
    if (n) n.innerHTML = html || '<div class="ih-empty">Nothing here yet.</div>';
  }

  function row(href, meta, text, pillHtml) {
    return (
      '<a class="ih-row" href="' + href + '">' +
        '<div class="ih-date">' + (pillHtml || "") + (meta ? "<span>" + esc(meta) + "</span>" : "") + "</div>" +
        '<div class="ih-text">' + esc(text) + "</div>" +
      "</a>"
    );
  }

  // ── Briefings ──────────────────────────────────────────────────────────────
  var THEMES = {
    "rewind-tariffs":               { name: "Tariffs / Trade",               emoji: "⚖️", bg: "#ECFCCB", fg: "#3f6212" },
    "llm-class-action":             { name: "LLM / Copyright",               emoji: "🤖", bg: "#DBEAFE", fg: "#1e40af" },
    "crypto-insolvency":            { name: "Crypto Insolvency",             emoji: "🪙", bg: "#FFEDD5", fg: "#9a3412" },
    "fraud-recovery":               { name: "Ponzi / Fraud Recovery",        emoji: "🕵️", bg: "#F3E8FF", fg: "#6b21a8" },
    "billion-dollar-class-actions": { name: "$1B+ Class Actions",            emoji: "💰", bg: "#D1FAE5", fg: "#065f46" },
    "bankruptcy-creditor-rights":   { name: "Bankruptcy Creditor Rights",    emoji: "📜", bg: "#FEE2E2", fg: "#991b1b" },
  };

  fetchJson(BASE + "briefings.json").then(function (d) {
    var items = ((d && d.items) || []).slice()
      .sort(function (a, b) { return (b.updated || "").localeCompare(a.updated || ""); })
      .slice(0, 7);
    fill("ih-briefings", items.map(function (i) {
      var t = THEMES[i.slug] || { name: i.slug, emoji: "📰", bg: "#E0E7FF", fg: "#3730a3" };
      var lede = (i.body || i.stat || "").trim();
      var p = '<span class="ih-pill" style="background:' + t.bg + ";color:" + t.fg + '">' + t.emoji + " " + esc(t.name) + "</span>";
      return row(BASE + "briefings.html", fmtDate(i.updated), lede.slice(0, 120), p);
    }).join(""));
  }).catch(function () { fill("ih-briefings", ""); });

  // ── Calendar extraction (trimmed copy of calendar.js) ──────────────────────
  var MONTHS = ["january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"];
  var DATE_RE = new RegExp(
    "(\\d{1,2}/\\d{1,2}/\\d{2,4})|((?:" + MONTHS.join("|") + ")\\s+\\d{1,2},?\\s+\\d{4})", "gi");
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

  function extractEvents(entry, short) {
    var desc = entry.description || "";
    if (!desc) return [];
    var out = [];
    var m;
    DATE_RE.lastIndex = 0;
    while ((m = DATE_RE.exec(desc)) !== null) {
      var iso = toISO(m[0]);
      if (!iso) continue;
      var kind = classifyWindow(desc.slice(Math.max(0, m.index - 90), m.index));
      if (!kind) continue;
      out.push({ date: iso, kind: kind, title: desc.slice(0, 110), short: short });
    }
    return out;
  }

  // ── Docket + Calendar (shared case fetch) ──────────────────────────────────
  var MANIFEST = [];
  fetchJson(BASE + "cases/data/_manifest.json").then(function (man) {
    MANIFEST = man || [];
    return Promise.all((man || []).map(function (m) {
      return fetchJson(BASE + "cases/data/" + m.slug + ".json")
        .then(function (c) { return { m: m, c: c }; })
        .catch(function () { return null; });
    }));
  }).then(function (cases) {
    cases = cases.filter(Boolean);

    var entries = [];
    cases.forEach(function (x) {
      var short = x.m.short_name || x.m.display_name || x.m.slug;
      ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
        if (!e.date_filed || !(e.description || "").trim()) return;
        entries.push({ date: e.date_filed, num: e.entry_number, desc: e.description, short: short,
                       slug: x.m.slug, color: x.m.default_color });
      });
    });
    entries.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.num || 0) - (a.num || 0);
    });
    fill("ih-docket", entries.slice(0, 7).map(function (e) {
      return row(BASE + "docket.html",
        fmtDate(e.date) + (e.num != null ? " · Dkt. " + e.num : ""),
        e.desc.slice(0, 130),
        pill(e.slug, e.short, e.color));
    }).join(""));

    var today = new Date();
    today = today.getFullYear() + "-" + pad2(today.getMonth() + 1) + "-" + pad2(today.getDate());
    var events = [];
    cases.forEach(function (x) {
      var short = x.m.short_name || x.m.display_name || x.m.slug;
      ((x.c && x.c.events) || []).forEach(function (ev) {
        if (ev.date && ev.date >= today) {
          events.push({ date: ev.date, kind: ev.kind || "Event", title: ev.title || "", short: short,
                        slug: x.m.slug, color: x.m.default_color });
        }
      });
      ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
        extractEvents(e, short).forEach(function (ev) {
          if (ev.date >= today) {
            ev.slug = x.m.slug;
            ev.color = x.m.default_color;
            events.push(ev);
          }
        });
      });
    });
    var seen = {};
    events = events.filter(function (ev) {
      var k = ev.date + "|" + ev.short + "|" + ev.kind;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    events.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    fill("ih-calendar", events.slice(0, 7).map(function (ev) {
      return row(BASE + "calendar.html",
        fmtDate(ev.date) + " · " + ev.kind,
        ev.title,
        pill(ev.slug, ev.short, ev.color));
    }).join(""));
  }).catch(function () {
    fill("ih-docket", "");
    fill("ih-calendar", "");
  });

  // ── Notes ──────────────────────────────────────────────────────────────────
  fetchJson(BASE + "api/notes")
    .then(function (p) { return (p && p.ok && p.entries) || {}; })
    .catch(function () {
      return fetchJson(BASE + "intel-notes.json")
        .then(function (f) { return (f && f.entries) || {}; })
        .catch(function () { return {}; });
    })
    .then(function (en) {
      var list = Object.keys(en).map(function (k) { return en[k]; })
        .filter(function (n) { return !n.deleted_at && ((n.note || "").trim() || n.bookmarked); })
        .sort(function (a, b) { return (b.updated_at || "").localeCompare(a.updated_at || ""); })
        .slice(0, 7);
      fill("ih-notes", list.map(function (n) {
        var body = (n.note || "").trim() || n.snippet || "(bookmark)";
        var m = null;
        for (var i = 0; i < MANIFEST.length; i++) {
          if (MANIFEST[i].slug === n.case_slug) { m = MANIFEST[i]; break; }
        }
        var p = m ? pill(m.slug, m.short_name || m.display_name || m.slug, m.default_color)
                  : '<span class="ih-pill" style="background:transparent;color:var(--ink-60);border:1px dashed var(--ink-60)">' + esc(n.case_name || "Uncategorized") + "</span>";
        return row(BASE + "notes.html",
          (n.entry_number != null ? "Dkt. " + n.entry_number : "") + (n.bookmarked ? " \u2605" : ""),
          body.slice(0, 120), p);
      }).join(""));
    });
})();
