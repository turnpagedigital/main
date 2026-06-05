/* Deploy API — triggers a Cloudflare Pages build without changing data.

   POST body: { target: "dev" | "production" }

   dev:
     Creates an empty "trigger" commit on GITHUB_BRANCH (e.g. "dev") without
     [skip ci] — Cloudflare Pages sees the push and kicks off a build.

   production:
     Uses the GitHub Merge API to merge GITHUB_BRANCH into "main".
     Cloudflare Pages watches "main" and auto-builds production.
     Returns 409 (conflict) or "already up to date" messages as user-friendly errors.
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { githubHeaders } from "./_github.js";

const PROD_BRANCH = "main";

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  if (request.method.toUpperCase() !== "POST") {
    return jsonResponse({ ok: false, error: "POST required" }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.target) {
    return jsonResponse({ ok: false, error: "target ('dev' or 'production') is required" }, 400);
  }

  const repo    = env.GITHUB_REPO;                         // e.g. "turnpagedigital/main"
  const devBranch = env.GITHUB_BRANCH || "dev";            // branch admin writes to
  const headers = { ...githubHeaders(env), "Content-Type": "application/json" };
  const apiBase = `https://api.github.com/repos/${repo}`;

  /* ── Deploy to Dev ────────────────────────────────────────────────────── */
  if (body.target === "dev") {
    // Strategy: create an empty commit on devBranch with a "Deploy" message
    // and NO [skip ci] — Cloudflare Pages sees the push and builds.

    // 1. Get current HEAD of devBranch
    const refRes = await fetch(`${apiBase}/git/ref/heads/${devBranch}`, { headers });
    if (!refRes.ok) {
      const t = await refRes.text();
      return jsonResponse({ ok: false, error: `Could not read branch: ${refRes.status} ${t.slice(0,100)}` }, 500);
    }
    const ref = await refRes.json();
    const headSha = ref.object.sha;

    // 2. Get the tree SHA from the HEAD commit
    const commitRes = await fetch(`${apiBase}/git/commits/${headSha}`, { headers });
    if (!commitRes.ok) {
      return jsonResponse({ ok: false, error: `Could not read HEAD commit: ${commitRes.status}` }, 500);
    }
    const headCommit = await commitRes.json();
    const treeSha = headCommit.tree.sha;

    // 3. Create a new commit with same tree (no file changes) but deploy message
    const ts = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
    const newCommitRes = await fetch(`${apiBase}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: `Deploy to dev [${ts}]`,
        tree: treeSha,
        parents: [headSha],
      }),
    });
    if (!newCommitRes.ok) {
      const t = await newCommitRes.text();
      return jsonResponse({ ok: false, error: `Could not create commit: ${t.slice(0,200)}` }, 500);
    }
    const newCommit = await newCommitRes.json();

    // 4. Update the branch ref to the new commit
    const updateRes = await fetch(`${apiBase}/git/refs/heads/${devBranch}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ sha: newCommit.sha, force: false }),
    });
    if (!updateRes.ok) {
      const t = await updateRes.text();
      return jsonResponse({ ok: false, error: `Could not update branch: ${t.slice(0,200)}` }, 500);
    }

    return jsonResponse({ ok: true, message: `Deploy to dev triggered. Cloudflare will build in ~1–2 minutes.` });
  }

  /* ── Deploy to Production ─────────────────────────────────────────────── */
  if (body.target === "production") {
    // Merge devBranch into main using the GitHub Merge API.
    // Cloudflare watches "main" and will build production.
    const ts = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

    const mergeRes = await fetch(`${apiBase}/merges`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        base: PROD_BRANCH,
        head: devBranch,
        commit_message: `Deploy to production [${ts}]`,
      }),
    });

    // 204 = already up to date (no new commits since last merge)
    if (mergeRes.status === 204) {
      return jsonResponse({ ok: true, message: "Production is already up to date with dev." });
    }

    // 201 = merge successful
    if (mergeRes.status === 201) {
      return jsonResponse({ ok: true, message: `Deployed to production. Cloudflare will build in ~1–2 minutes.` });
    }

    // 409 = merge conflict
    if (mergeRes.status === 409) {
      return jsonResponse({ ok: false, error: "Merge conflict between dev and main. Resolve manually via git before deploying to production." }, 409);
    }

    const t = await mergeRes.text();
    return jsonResponse({ ok: false, error: `GitHub merge failed (${mergeRes.status}): ${t.slice(0,200)}` }, 500);
  }

  return jsonResponse({ ok: false, error: `Unknown target "${body.target}". Use "dev" or "production".` }, 400);
}
