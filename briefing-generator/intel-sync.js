/* intel-sync.js — shared client for case sync / briefing dispatch + live
   run status. Loaded by the dashboard (index.html), the docket page, and
   Manage; each page renders its own buttons and calls into this.

   What a "sync" is (manual-case-sync.yml): fresh docket entries, a news
   web-search for the case, and a briefing refresh when the last one is
   over 12h old. "Brief now" (daily-briefing.yml via repository_dispatch)
   force-regenerates just the briefing.

   All endpoints are ABSOLUTE (/api/admin/…) — the old relative
   "api/admin/…" calls resolved to /intel/api/admin/… where no function
   exists, which is why the sync buttons silently dead-ended for weeks. */
(function () {
  "use strict";

  var POLL_MS = 12000;             // status poll cadence while a run is live
  var MAX_WATCH_MS = 18 * 60 * 1000;  // manual sync ≈ 3-8 min; briefing ≈ 5
  var watchers = {};               // slug → pending timeout id

  function post(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body || {}),
    }).then(function (r) {
      return r.json().catch(function () { return {}; })
        .then(function (j) { return { status: r.status, body: j }; });
    });
  }

  function syncCase(slug) { return post("/api/admin/manual-sync", { slug: slug }); }
  function briefCase(slug) { return post("/api/admin/generate-briefing", { case: slug, force: true }); }

  function status(slug) {
    var q = slug ? "?slug=" + encodeURIComponent(slug) : "";
    return fetch("/api/admin/sync-status" + q, { credentials: "include" })
      .then(function (r) { return r.json(); });
  }

  /* Watch the run a dispatch just started: polls sync-status until the
     newest matching run completes. cb fires on every state change with
     { state: "queued"|"running"|"success"|"failure"|"timeout"|"lost", run }.
     `kinds` optionally restricts which workflows count (e.g. ["briefing"]). */
  function watch(slug, kinds, cb) {
    if (typeof kinds === "function") { cb = kinds; kinds = null; }
    var started = Date.now();
    if (watchers[slug]) clearTimeout(watchers[slug]);

    function tick() {
      status(slug).then(function (p) {
        var runs = (p && p.ok && p.runs) || [];
        var run = null;
        for (var i = 0; i < runs.length; i++) {
          if (kinds && kinds.indexOf(runs[i].workflow) === -1) continue;
          // Runs are newest-first; accept anything created just before the
          // dispatch too (clock skew), then stop at the first match.
          if (Date.parse(runs[i].created_at || 0) >= started - 120000) { run = runs[i]; break; }
        }
        if (!run) {
          if (Date.now() - started > 120000) { cb({ state: "lost" }); return; }
          watchers[slug] = setTimeout(tick, 6000);
          cb({ state: "queued" });
          return;
        }
        if (run.status !== "completed") {
          if (Date.now() - started > MAX_WATCH_MS) { cb({ state: "timeout", run: run }); return; }
          watchers[slug] = setTimeout(tick, POLL_MS);
          cb({ state: "running", run: run });
          return;
        }
        cb({ state: run.conclusion === "success" ? "success" : "failure", run: run });
      }).catch(function () {
        if (Date.now() - started > MAX_WATCH_MS) { cb({ state: "lost" }); return; }
        watchers[slug] = setTimeout(tick, POLL_MS);
      });
    }
    watchers[slug] = setTimeout(tick, 8000);  // give the dispatch a beat to register
  }

  /* Passive check on page load: newest completed run per case in the last
     24h that FAILED → { slug: run }. Lets the ⚠ badge survive a reload. */
  function recentFailures() {
    return status(null).then(function (p) {
      var newest = {};
      ((p && p.ok && p.runs) || []).forEach(function (r) {
        if (r.slug && !newest[r.slug]) newest[r.slug] = r;  // runs are newest-first
      });
      var out = {};
      Object.keys(newest).forEach(function (s) {
        var r = newest[s];
        if (r.status === "completed" && r.conclusion && r.conclusion !== "success") out[s] = r;
      });
      return out;
    }).catch(function () { return {}; });
  }

  function label(run) {
    if (!run) return "";
    return run.workflow === "manual-sync" ? "Sync (docket + news + briefing)"
      : run.workflow === "docket-sync" ? "Docket sync"
      : run.workflow === "briefing" ? "Briefing"
      : "Run";
  }

  /* One-line human description for tooltips/toasts. */
  function describe(st) {
    if (!st) return "";
    var run = st.run;
    switch (st.state) {
      case "queued": return "Dispatched — waiting for the runner to pick it up…";
      case "running": return label(run) + " running…";
      case "success": return label(run) + " finished — fresh data lands on the page shortly.";
      case "failure":
        return label(run) + " FAILED" +
          (run && run.failed_step ? " at step “" + run.failed_step + "”" : "") +
          (run && run.html_url ? " — click to open the log" : "");
      case "timeout": return label(run) + " is still running after 18 minutes — check the Actions log.";
      case "lost": return "Couldn’t confirm the run started — check the Actions page.";
    }
    return "";
  }

  window.IntelSync = {
    syncCase: syncCase,
    briefCase: briefCase,
    status: status,
    watch: watch,
    recentFailures: recentFailures,
    describe: describe,
    label: label,
  };
})();
