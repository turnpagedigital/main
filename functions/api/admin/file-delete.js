import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileSha, deleteFileFromGitHub, findUrlReferences } from "./_github.js";

/* Permanently delete a file from the repo (the actual binary in
   public/library/...). Used by the Files tab when the user picks "Delete
   permanently" instead of just "Remove from library."

   POST /api/admin/file-delete
   Body: {
     url:      string,   // the library entry's public URL — for reference scanning
     repoPath: string,   // path inside the repo — required for the delete
     dryRun?:  boolean,  // if true, only check references and report; don't delete
   }

   Response shapes:
     200 { ok: true }                                  — deleted (or dryRun-safe)
     200 { ok: true, alreadyMissing: true }            — file was not in the repo
     200 { ok: true, references: [...] }               — dryRun result
     409 { ok: false, references: [...] }              — refuse to delete: in use
     400 { ok: false, error }                          — bad request
     401 { ok: false, error }                          — not authed

   This endpoint ONLY allows deletion of files under public/library/* — system
   files in public/ (favicons, hero videos, etc. dropped in directly by the
   build) are off-limits to prevent accidental loss of assets that aren't
   actually catalog-managed.
*/

const REPO_PREFIX = "public/library/";

export async function onRequestPost({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const url      = typeof body?.url      === "string" ? body.url.trim()      : "";
  const repoPath = typeof body?.repoPath === "string" ? body.repoPath.trim() : "";
  const dryRun   = body?.dryRun === true;

  if (!url) {
    return jsonResponse({ ok: false, error: "Missing 'url'" }, 400);
  }

  // External URLs aren't in the repo — we can't delete them. The user should
  // just remove the library entry.
  if (/^https?:\/\//i.test(url)) {
    return jsonResponse({
      ok: false,
      error: "External URLs aren't stored in the repo. Remove the library entry instead.",
    }, 400);
  }

  // For dryRun we only need the URL — caller wants to know whether a
  // permanent delete would be safe before they commit to it. For a real
  // delete we ALSO need the repoPath because we're going to call DELETE
  // on it.
  if (!dryRun) {
    if (!repoPath) {
      return jsonResponse({ ok: false, error: "Missing 'repoPath'" }, 400);
    }
    if (!repoPath.startsWith(REPO_PREFIX)) {
      return jsonResponse({
        ok: false,
        error: `Only files under ${REPO_PREFIX} can be permanently deleted.`,
      }, 400);
    }
    // Defence in depth — no traversal
    if (repoPath.includes("..")) {
      return jsonResponse({ ok: false, error: "Invalid path" }, 400);
    }
  }

  // Reference scan — happens regardless of dryRun.
  const scan = await findUrlReferences(env, url);
  if (!scan.ok) {
    return jsonResponse({ ok: false, error: scan.error }, 502);
  }

  if (dryRun) {
    return jsonResponse({ ok: true, references: scan.references });
  }

  if (scan.references.length > 0) {
    return jsonResponse({
      ok: false,
      error: "File is still referenced — permanent delete blocked.",
      references: scan.references,
    }, 409);
  }

  // Get the current SHA so we can DELETE it. If the file isn't in the repo
  // (already gone, or the user passed a path that doesn't exist), treat that
  // as success — the goal of "permanent delete" has been met.
  const sha = await getFileSha(env, repoPath);
  if (!sha) {
    return jsonResponse({ ok: true, alreadyMissing: true });
  }

  const result = await deleteFileFromGitHub(env, repoPath, sha, `Admin: delete ${repoPath}`);
  if (!result.ok) {
    return jsonResponse({ ok: false, error: "GitHub delete failed" }, 502);
  }

  return jsonResponse({ ok: true });
}
