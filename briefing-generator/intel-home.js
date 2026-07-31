(function () {
  "use strict";

  /* Intel dashboard (landing) — four side-by-side columns previewing the top 7
     from Briefings, Docket, Calendar, and Notes. Row clicks land on the full
     section pages. Calendar parsing mirrors calendar.js (trimmed copy). */

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

  function row(href, meta, text) {
    return (
      '<a class="ih-row" href="' + href + '">' +
        (meta ? '<div class="ih-date">' + esc(meta) + "</div>" : "") +
        '<div class="ih-text">' + esc(text) + "</div>" +
      "</a>"
    );
  }

  // ── Briefings ──────────────────────────────────────────────────────────────
  var THEMES = {
    "rewind-tariffs":               { name: "Tariffs / Trade",               emoji: "⚖️" },
    "llm-class-action":             { name: "LLM / Copyright",               emoji: "🤖" },
    "crypto-insolvency":            { name: "Crypto Insolvency",             emoji: "🪙" },
    "fraud-recovery":               { name: "Ponzi / Fraud Recovery",        emoji: "🕵️" },
    "billion-dollar-class-actions": { name: "$1B+ Class Actions",            emoji: "💰" },
    "bankruptcy-creditor-rights":   { name: "Bankruptcy Creditor Rights",    emoji: "📜" },
  };

  fetchJson("briefings.json").then(function (d) {
    var items = ((d && d.items) || []).slice()
      .sort(function (a, b) { return (b.updated || "").localeCompare(a.updated || ""); })
      .slice(0, 7);
    fill("ih-briefings", items.map(function (i) {
      var t = THEMES[i.slug] || { name: i.slug, emoji: "📰" };
      var lede = (i.body || i.stat || "").trim();
      return row("briefings.html", fmtDate(i.updated) + " · " + t.emoji + " " + t.name, lede.slice(0, 120));
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
  fetchJson("cases/data/_manifest.json").then(function (man) {
    return Promise.all((man || []).map(function (m) {
      return fetchJson("cases/data/" + m.slug + ".json")
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
        entries.push({ date: e.date_filed, num: e.entry_number, desc: e.description, short: short });
      });
    });
    entries.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.num || 0) - (a.num || 0);
    });
    fill("ih-docket", entries.slice(0, 7).map(function (e) {
      return row("docket.html",
        fmtDate(e.date) + " · " + e.short + (e.num != null ? " · Dkt. " + e.num : ""),
        e.desc.slice(0, 130));
    }).join(""));

    var today = new Date();
    today = today.getFullYear() + "-" + pad2(today.getMonth() + 1) + "-" + pad2(today.getDate());
    var events = [];
    cases.forEach(function (x) {
      var short = x.m.short_name || x.m.display_name || x.m.slug;
      ((x.c && x.c.events) || []).forEach(function (ev) {
        if (ev.date && ev.date >= today) {
          events.push({ date: ev.date, kind: ev.kind || "Event", title: ev.title || "", short: short });
        }
      });
      ((x.c && x.c.docket && x.c.docket.entries) || []).forEach(function (e) {
        extractEvents(e, short).forEach(function (ev) {
          if (ev.date >= today) events.push(ev);
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
      return row("calendar.html",
        fmtDate(ev.date) + " · " + ev.short + " · " + ev.kind,
        ev.title);
    }).join(""));
  }).catch(function () {
    fill("ih-docket", "");
    fill("ih-calendar", "");
  });

  // ── Notes ──────────────────────────────────────────────────────────────────
  fetchJson("api/notes")
    .then(function (p) { return (p && p.ok && p.entries) || {}; })
    .catch(function () {
      return fetchJson("intel-notes.json")
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
        return row("notes.html",
          (n.case_name || n.case_slug || "Uncategorized") +
            (n.entry_number != null ? " · Dkt. " + n.entry_number : "") +
            (n.bookmarked ? " ★" : ""),
          body.slice(0, 120));
      }).join(""));
    });
})();
