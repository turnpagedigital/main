import { jsonResponse, isAuthed } from "./_utils.js";
import {
  getFileSha,
  deleteFileFromGitHub,
  findUrlReferences,
  getFileFromGitHub,
  commitFileToGitHub,
} from "./_github.js";

/* Permanently delete a file from the repo (the actual binary in
   public/library/...). Used by the Assets tab when the user picks "Delete
   permanently" instead of just "Remove from library."

   POST /api/admin/file-delete
   Body: {
     url:      string,   // the library entry's public URL — for reference scanning
     repoPath: string,   // path inside the repo — required for the delete
     dryRun?:  boolean,  // if true, only check references and report; don't delete
     cascade?: boolean,  // if true, scrub references from data files before deleting
   }

   Response shapes:
     200 { ok: true }                                          — deleted (or dryRun-safe)
     200 { ok: true, alreadyMissing: true }                    — file was not in the repo
     200 { ok: true, references: [...] }                       — dryRun result
     200 { ok: true, cascadedFiles: [...] }                    — cascade delete succeeded
     409 { ok: false, references: [...] }                      — refuse to delete: in use (non-cascade)
     400 { ok: false, error }                                  — bad request
     401 { ok: false, error }                                  — not authed

   Cascade mode:
     When cascade=true and references exist, the endpoint walks every
     admin-managed JSON data file, scrubs all occurrences of the URL
     (string fields → "", array entries → removed), then proceeds with
     the GitHub file delete. The same CASCADE_FILES list as file-rename.js.

   Any file under public/ that appears in the asset library (file-library.json)
   can be permanently deleted. Path traversal is blocked by the ".." check.
*/

const REPO_PREFIX = "public/";

// Files whose contents we scan + rewrite for the cascade. Must stay in sync
// with CASCADE_FILES in file-rename.js.
const CASCADE_FILES = [
  "src/data/bio.json",
  "src/data/deals.json",
  "src/data/press.json",
  "src/data/alerts.json",
  "src/data/faqs.json",
  "src/data/posts.json",
  "public/briefings/index.json",
];

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
  const dryRun   = body?.dryRun   === true;
  const cascade  = body?.cascade  === true;

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

  // If the file has references and the caller didn't set cascade=true, block
  // the delete exactly as before so the non-cascade path is unaffected.
  if (scan.references.length > 0 && !cascade) {
    return jsonResponse({
      ok: false,
      error: "File is still referenced — permanent delete blocked.",
      references: scan.references,
    }, 409);
  }

  // ── Cascade: scrub the URL from every data file that references it ────────
  // Sequential, not parallel — each commit needs the latest SHA of its file.
  const cascadedFiles = [];
  if (cascade && scan.references.length > 0) {
    for (const dataPath of CASCADE_FILES) {
      const fileRes = await getFileFromGitHub(env, dataPath);
      if (!fileRes.ok) {
        // 404 means the file doesn't exist yet — skip it gracefully.
        if (/GitHub GET 404/.test(fileRes.error || "")) continue;
        return jsonResponse({
          ok: false,
          error: `Cascade halted — couldn't read ${dataPath}: ${fileRes.error}`,
          partial: { cascadedFiles },
        }, 502);
      }

      const text = fileRes.text || "";
      if (!text.includes(url)) continue;

      // Parse → scrub → re-serialize so the mutation is JSON-aware.
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return jsonResponse({
          ok: false,
          error: `Cascade halted — couldn't parse ${dataPath}: ${e.message}`,
          partial: { cascadedFiles },
        }, 502);
      }

      scrubUrl(data, url);
      const newText = JSON.stringify(data, null, 2) + "\n";

      // Skip if nothing actually changed (defensive — text.includes check
      // above should have caught this, but the JSON round-trip normalises
      // whitespace so the strings won't be byte-identical).
      const commitResult = await commitFileToGitHub(
        env,
        dataPath,
        newText,
        fileRes.sha,
        `Admin: cascade delete — clear ${url} from ${dataPath.split("/").pop()}`,
      );
      if (!commitResult.ok) {
        return jsonResponse({
          ok: false,
          error: `Cascade halted — couldn't write ${dataPath}: ${commitResult.error}`,
          partial: { cascadedFiles },
        }, 502);
      }
      cascadedFiles.push(dataPath);
    }
  }

  // ── Delete the actual file from GitHub ────────────────────────────────────
  // Get the current SHA so we can DELETE it. If the file isn't in the repo
  // (already gone, or the user passed a path that doesn't exist), treat that
  // as success — the goal of "permanent delete" has been met.
  const sha = await getFileSha(env, repoPath);
  if (!sha) {
    return jsonResponse({ ok: true, alreadyMissing: true, cascadedFiles });
  }

  const result = await deleteFileFromGitHub(env, repoPath, sha, `Admin: delete ${repoPath}`);
  if (!result.ok) {
    return jsonResponse({ ok: false, error: "GitHub delete failed" }, 502);
  }

  return jsonResponse({ ok: true, cascadedFiles });
}

/* Recursively walk a parsed JSON value and scrub every occurrence of `url`:
   - In an object: string fields equal to `url` are replaced with ""
   - In an array:  string entries equal to `url` are removed (filtered out)
   - Recurse into nested objects and arrays

   The mutation is in-place. */
function scrubUrl(node, url) {
  if (Array.isArray(node)) {
    // Remove matching string entries; recurse into object/array entries.
    for (let i = node.length - 1; i >= 0; i--) {
      const v = node[i];
      if (typeof v === "string" && v === url) {
        node.splice(i, 1);
      } else if (v && typeof v === "object") {
        scrubUrl(v, url);
      }
    }
  } else if (node && typeof node === "object") {
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (typeof v === "string" && v === url) {
        node[key] = "";
      } else if (v && typeof v === "object") {
        scrubUrl(v, url);
      }
    }
  }
}
