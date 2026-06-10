/* Rollback API — revert a branch to a previous commit.

   GET /api/admin/rollback?branch=dev|main&limit=N
     Returns last N commits on the branch with: hash, message, timestamp, author, sha

   POST /api/admin/rollback
     Body: { branch: "dev" | "main", commitSha: "abc123..." }
     Performs: git reset --hard <commitSha> && git push origin <branch> --force
     Logs the rollback action to rollback-log.json
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { githubHeaders, getFileFromGitHub, commitFileToGitHub, getFileSha } from "./_github.js";

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const branch = url.searchParams.get("branch") || "dev";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100); // max 100

  const repo = env.GITHUB_REPO; // "turnpagedigital/main"
  const headers = { ...githubHeaders(env), "Content-Type": "application/json" };
  const apiBase = `https://api.github.com/repos/${repo}`;

  // Validate branch
  if (!["dev", "main"].includes(branch)) {
    return jsonResponse({ ok: false, error: "branch must be 'dev' or 'main'" }, 400);
  }

  /* ── GET: Fetch commit history ────────────────────────────────────────── */
  if (method === "GET") {
    try {
      const histRes = await fetch(`${apiBase}/commits?sha=${branch}&per_page=${limit}`, { headers });
      if (!histRes.ok) {
        return jsonResponse({ ok: false, error: `GitHub error: ${histRes.status}` }, 500);
      }
      const commits = await histRes.json();

      // Format: { hash, message, timestamp, author, sha }
      const formatted = commits.map((c) => ({
        hash: c.sha.slice(0, 7),
        sha: c.sha,
        message: (c.commit.message || "").split("\n")[0], // first line only
        timestamp: c.commit.author.date,
        author: c.commit.author.name,
      }));

      return jsonResponse({ ok: true, commits: formatted });
    } catch (e) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  /* ── POST: Execute rollback ─────────────────────────────────────────── */
  if (method === "POST") {
    try {
      const body = await request.json().catch(() => null);
      if (!body || !body.commitSha) {
        return jsonResponse({ ok: false, error: "commitSha is required" }, 400);
      }

      const commitSha = body.commitSha.trim();

      // Validate the SHA exists
      const validateRes = await fetch(`${apiBase}/git/commits/${commitSha}`, { headers });
      if (!validateRes.ok) {
        return jsonResponse({
          ok: false,
          error: `Commit ${commitSha} not found or inaccessible`,
        }, 404);
      }

      // Update the branch ref to point to the target commit
      const updateRefRes = await fetch(`${apiBase}/git/refs/heads/${branch}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sha: commitSha, force: true }),
      });
      if (!updateRefRes.ok) {
        const errText = await updateRefRes.text();
        return jsonResponse({
          ok: false,
          error: `Could not update ref: ${updateRefRes.status} ${errText.slice(0, 100)}`,
        }, 500);
      }

      const updatedRef = await updateRefRes.json();
      const toSha = updatedRef.object.sha;

      // Fetch current commit info for the log
      const targetCommitRes = await fetch(`${apiBase}/git/commits/${toSha}`, { headers });
      const targetCommit = targetCommitRes.ok ? await targetCommitRes.json() : {};

      // Log the rollback action
      await logRollback(
        env,
        {
          timestamp: new Date().toISOString(),
          admin: request.headers.get("x-admin-email") || "unknown",
          branch,
          commitSha: toSha,
          commitMessage: (targetCommit.message || "").split("\n")[0] || "Unknown",
          success: true,
        }
      );

      return jsonResponse({
        ok: true,
        message: `Rolled back ${branch} to ${toSha.slice(0, 7)} — ${(targetCommit.message || "").split("\n")[0]}`,
        sha: toSha,
        branch,
      });
    } catch (e) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  return jsonResponse({ ok: false, error: "POST or GET required" }, 405);
}

/* ── Rollback logging ────────────────────────────────────────────────────── */
async function logRollback(env, entry) {
  try {
    const filePath = "rollback-log.json";
    const repo = env.GITHUB_REPO;

    let log = [];
    try {
      const existing = await getFileFromGitHub(env, filePath);
      if (existing) {
        log = JSON.parse(existing);
      }
    } catch {
      // File doesn't exist yet, start fresh
    }

    log.push(entry);

    // Keep only last 100 entries to avoid unbounded growth
    if (log.length > 100) {
      log = log.slice(-100);
    }

    await commitFileToGitHub(
      env,
      filePath,
      JSON.stringify(log, null, 2),
      `Admin: log rollback ${entry.branch} to ${entry.commitSha.slice(0, 7)}`
    );
  } catch (e) {
    // Log failure is non-blocking; don't fail the rollback if logging fails
    console.error("Rollback logging failed:", e.message);
  }
}
