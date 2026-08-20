import { jsonResponse, isAuthed } from "./_utils.js";
import {
  getFileSha,
  getFileBase64FromGitHub,
  getFileFromGitHub,
  commitFilesToGitHub,
} from "./_github.js";

/* Rename a library-hosted file in place AND cascade the URL change across
   every admin-managed data file that references the old URL.

   POST /api/admin/file-rename
   Body: { oldUrl: "/library/foo.png", newName: "Bloomberg News" }

   Successful response: { ok: true, newUrl, changed, cascadedFiles: [paths] }
     - changed=false → newName slugified to the same path as oldUrl; nothing
       was moved or rewritten (but the caller should still persist the new
       display name via the regular file-library PUT)
     - cascadedFiles → list of data files we rewrote during the cascade

   Failure modes (all return JSON, never throw):
     400 — bad payload, external URL, non-library URL, empty newName
     401 — not authed
     500 — env vars missing
     502 — any GitHub I/O step failed

   The move (write new path + delete old path) and every cascaded data-file
   rewrite land in ONE atomic commit via commitFilesToGitHub — either the
   whole rename applies or none of it does. No partial states.
*/

const LIBRARY_PREFIX_URL  = "/library/";
const LIBRARY_PREFIX_REPO = "public/library/";

// Files whose contents we scan + rewrite for the URL cascade. The list is
// intentionally narrow — only admin-managed JSON. Compiled JSX hardcodes (e.g.
// <img src="/library/foo.png">) are NOT scanned. Document that gap to the user.
const CASCADE_FILES = [
  "src/data/bio.json",
  "src/data/deals.json",
  "src/data/press.json",
  "src/data/alerts.json",
  "src/data/faqs.json",
  "src/data/posts.json",        // may not exist yet — handled gracefully
  "src/data/page-compositions.json",
  "public/briefings/index.json",
  // NOTE: file-library.json itself is deliberately NOT cascaded here — the
  // Assets tab's save() already rewrites the renamed entry's url in its own
  // follow-up PUT to /api/admin/file-library moments later. Cascading it here
  // too would race that PUT for no benefit.
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

  const oldUrl  = typeof body?.oldUrl  === "string" ? body.oldUrl.trim()  : "";
  const newName = typeof body?.newName === "string" ? body.newName.trim() : "";

  if (!oldUrl) {
    return jsonResponse({ ok: false, error: "Missing 'oldUrl'" }, 400);
  }
  if (!newName) {
    return jsonResponse({ ok: false, error: "New name can't be empty" }, 400);
  }
  if (/^https?:\/\//i.test(oldUrl)) {
    return jsonResponse({
      ok: false,
      error: "External URLs can't be renamed via the rename API",
    }, 400);
  }
  if (!oldUrl.startsWith(LIBRARY_PREFIX_URL)) {
    return jsonResponse({
      ok: false,
      error: "Only library-hosted files can be renamed",
    }, 400);
  }
  if (oldUrl.includes("..")) {
    return jsonResponse({ ok: false, error: "Invalid path" }, 400);
  }

  // Strip any query/hash before mapping URL → repo path
  const cleanUrl = oldUrl.split("?")[0].split("#")[0];
  const oldRepoPath = "public" + cleanUrl;

  // Pull the extension from the old filename so the new filename keeps it.
  // If there's no extension we proceed without one (rare for library files).
  const oldBasename = cleanUrl.slice(LIBRARY_PREFIX_URL.length); // e.g. "bio/foo.png"
  const extMatch    = oldBasename.match(/\.([a-z0-9]+)$/i);
  const ext         = extMatch ? extMatch[1].toLowerCase() : "";

  // Slug the new name (same algorithm as file-upload.js)
  const slug = slugify(newName);
  let newBasename = ext ? `${slug}.${ext}` : slug;
  let newRepoPath = `${LIBRARY_PREFIX_REPO}${newBasename}`;
  let newUrl      = `${LIBRARY_PREFIX_URL}${newBasename}`;

  // No-op short-circuit: if slug + ext lands on exactly the same path, we
  // don't need to move anything. The caller will still persist the new
  // display name via the regular file-library PUT after this returns.
  if (newRepoPath === oldRepoPath) {
    return jsonResponse({ ok: true, newUrl: oldUrl, changed: false, cascadedFiles: [] });
  }

  // Collision check: if the target path already exists, append a short hash
  // to the slug. Mirrors file-upload's collision strategy so URLs stay
  // predictable from the display name.
  const collisionSha = await getFileSha(env, newRepoPath);
  if (collisionSha) {
    const suffix = await shortHash(`${newBasename}-${Date.now()}`);
    newBasename = ext ? `${slug}-${suffix}.${ext}` : `${slug}-${suffix}`;
    newRepoPath = `${LIBRARY_PREFIX_REPO}${newBasename}`;
    newUrl      = `${LIBRARY_PREFIX_URL}${newBasename}`;
  }

  // ── Read the binary ──────────────────────────────────────────────────────
  const fetched = await getFileBase64FromGitHub(env, oldRepoPath);
  if (!fetched.ok) {
    return jsonResponse({
      ok: false,
      error: `Couldn't read old file: ${fetched.error}`,
    }, 502);
  }

  // ── Read cascade files and prepare rewrites ──────────────────────────────
  // Global string replace. We rely on the URL being distinctive enough that
  // we won't accidentally match unrelated text — /library/foo.png includes
  // the extension, so it's never a substring of another library URL.
  const cascadedFiles = [];
  const commitList = [
    { path: newRepoPath, contentBase64: fetched.contentBase64 },        // write new path
    { path: oldRepoPath, content: null, sha: fetched.sha },             // delete old path
  ];
  for (const dataPath of CASCADE_FILES) {
    const fileRes = await getFileFromGitHub(env, dataPath);
    if (!fileRes.ok) {
      // Missing files (404) are fine — they may not exist in this repo yet
      // (e.g. posts.json hasn't been created). Anything else halts BEFORE
      // committing, so nothing has been applied.
      if (/not found/i.test(fileRes.error || "")) continue;
      return jsonResponse({
        ok: false,
        error: `Rename aborted (nothing changed) — couldn't read ${dataPath}: ${fileRes.error}`,
      }, 502);
    }
    const text = fileRes.text || "";
    if (!text.includes(oldUrl)) continue;
    commitList.push({
      path: dataPath,
      content: text.split(oldUrl).join(newUrl),
      sha: fileRes.sha,
    });
    cascadedFiles.push(dataPath);
  }

  // ── One atomic commit: move + every cascaded rewrite together ────────────
  const saved = await commitFilesToGitHub(
    env,
    commitList,
    `Admin: rename library file ${oldBasename} → ${newBasename}${cascadedFiles.length ? ` (+${cascadedFiles.length} reference file${cascadedFiles.length > 1 ? "s" : ""})` : ""}`,
  );
  if (!saved.ok) {
    return jsonResponse({
      ok: false,
      error: `Rename failed (nothing changed): ${saved.error}`,
    }, 502);
  }

  return jsonResponse({
    ok: true,
    newUrl,
    changed: true,
    cascadedFiles,
  });
}

/* Same slugify rules as file-upload.js so display-name → URL stays predictable
   and consistent across upload + rename. */
function slugify(name) {
  return name
    .replace(/\.[^.]+$/, "")               // drop any trailing .ext
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")           // non-alphanum → hyphen
    .replace(/-+/g, "-")                   // collapse repeated hyphens
    .replace(/^-|-$/g, "")                 // trim leading/trailing hyphens
    .slice(0, 60) || "image";
}

/* 6-char hex hash — same as file-upload.js for collision-suffix parity. */
async function shortHash(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < 3; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}
