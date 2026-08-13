/* Sync-status endpoint — the read side of the sync/brief buttons.

   GET /api/admin/sync-status[?slug=<case>]
   → { ok, runs: [{ workflow, id, slug, title, status, conclusion,
                    created_at, html_url, event, failed_step?, job? }] }

   Lists the last 24h of runs across the three case-facing workflows
   (manual-case-sync, docket-sync single-case dispatches, daily-briefing) and
   matches them to cases via each workflow's run-name suffix ("… — <slug>").
   For fresh failures it also pulls the run's jobs and names the first failed
   step, so the UI's ⚠ tooltip can say WHAT broke, not just that it broke.

   Auth: admin session cookie. Needs the fine-grained GITHUB_TOKEN to have
   "Actions: Read" on the repo (the same token the dispatch endpoints use). */

import { isAuthed, jsonResponse } from "./_utils.js";

const WORKFLOWS = [
  { file: "manual-case-sync.yml", key: "manual-sync" },
  { file: "docket-sync.yml", key: "docket-sync" },
  { file: "daily-briefing.yml", key: "briefing" },
];

async function ghJson(env, repo, path) {
  const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "tpdm-admin",
    },
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  return r.json();
}

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const repo = env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main";
  const slug = (new URL(request.url).searchParams.get("slug") || "").trim();
  const cutoff = Date.now() - 24 * 3600 * 1000;

  const runs = [];
  await Promise.all(WORKFLOWS.map(async (wf) => {
    try {
      const data = await ghJson(env, repo, `/actions/workflows/${wf.file}/runs?per_page=12`);
      for (const r of data.workflow_runs || []) {
        if (Date.parse(r.created_at) < cutoff) continue;
        // Run-name suffix "… — <slug>" (em dash) identifies single-case runs;
        // scheduled runs keep their default titles and carry no slug.
        const m = /—\s*([a-z0-9][a-z0-9-]*)\s*$/.exec(r.display_title || "");
        const runSlug = m ? m[1] : "";
        if (slug && runSlug !== slug) continue;
        runs.push({
          workflow: wf.key,
          id: r.id,
          slug: runSlug,
          title: r.display_title || "",
          status: r.status,               // queued | in_progress | completed
          conclusion: r.conclusion,       // success | failure | cancelled | …
          created_at: r.created_at,
          html_url: r.html_url,
          event: r.event,
        });
      }
    } catch { /* one workflow's listing failing shouldn't blank the rest */ }
  }));

  runs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  // Name the failing step for the newest few failures (one jobs call each).
  const failures = runs
    .filter((r) => r.status === "completed" && r.conclusion && r.conclusion !== "success")
    .slice(0, 3);
  await Promise.all(failures.map(async (r) => {
    try {
      const jobs = await ghJson(env, repo, `/actions/runs/${r.id}/jobs?per_page=5`);
      for (const j of jobs.jobs || []) {
        const st = (j.steps || []).find((s) => s.conclusion === "failure");
        if (st) { r.failed_step = st.name; r.job = j.name; break; }
      }
      if (!r.failed_step && r.conclusion === "cancelled") {
        r.failed_step = "run cancelled (timeout or manual stop)";
      }
    } catch { /* detail is best-effort */ }
  }));

  return jsonResponse({ ok: true, runs: runs.slice(0, 30) });
}
