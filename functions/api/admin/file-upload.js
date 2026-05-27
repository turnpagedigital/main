import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileSha, commitBinaryToGitHub } from "./_github.js";

/* Upload a binary image / icon / video to the repo.

   Two modes:

   1. DEFAULT — new file under public/library/
      POST body: { filename, contentBase64, contentType }
      Stores at public/library/<slug>.<ext>, dedupes by name (appends a short
      hash on collision), and returns { ok, url, filename, path }.

   2. REPLACE — overwrite an existing file at a specific path
      POST body: { filename, contentBase64, contentType, targetPath }
      Uses targetPath verbatim (must start with "public/" and pass strict
      validation). Overwrites the existing file in place so every reference
      to its URL across the site picks up the new content with no other
      changes required.

   Returns: { ok: true, url, filename, path }
*/

const MAX_B64 = 30 * 1024 * 1024;   // ~22 MB raw — videos can be larger than logos

const ALLOWED_EXT = {
  "image/png":     "png",
  "image/jpeg":    "jpg",
  "image/jpg":     "jpg",
  "image/webp":    "webp",
  "image/gif":     "gif",
  "image/svg+xml": "svg",
  "image/avif":    "avif",
  "image/x-icon":  "ico",
  "image/vnd.microsoft.icon": "ico",
  "video/mp4":     "mp4",
  "video/webm":    "webm",
  "video/quicktime": "mov",
};

// Extensions we'll allow to overwrite an existing in-repo file. Mirrors the
// /api/admin/file-index allow-list so a Replace can only swap a known media
// kind. (We deliberately *don't* mirror ALLOWED_EXT exactly — `jpeg` is normal
// for indexed files even though the upload contentType maps to "jpg".)
const REPLACE_EXTS = new Set([
  "png", "jpg", "jpeg", "webp", "gif", "svg", "avif", "ico",
  "mp4", "webm", "mov",
]);

const PUBLIC_PREFIX = "public/";

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

  const { filename, contentBase64, contentType, targetPath } = body || {};

  if (typeof contentBase64 !== "string" || !contentBase64) {
    return jsonResponse({ ok: false, error: "Missing contentBase64" }, 400);
  }
  if (contentBase64.length > MAX_B64) {
    return jsonResponse({ ok: false, error: "File too large" }, 400);
  }

  const ext = ALLOWED_EXT[contentType];
  if (!ext) {
    return jsonResponse({
      ok: false,
      error: `Unsupported type: ${contentType}. Use PNG, JPEG, WebP, GIF, SVG, AVIF, ICO, MP4, WebM, or MOV.`,
    }, 400);
  }

  // ── REPLACE mode ────────────────────────────────────────────────────────
  // If the client passed a targetPath, we ignore the slugify path and write
  // straight to that location. The path MUST live under public/ and the file
  // extension MUST match the existing file's extension — otherwise references
  // around the site (e.g. <img src="/foo.png">) would silently break.
  if (typeof targetPath === "string" && targetPath.length > 0) {
    const validation = validateTargetPath(targetPath, ext);
    if (!validation.ok) {
      return jsonResponse({ ok: false, error: validation.error }, 400);
    }

    // We require the file to already exist — Replace overwrites, not creates.
    // (For a brand-new file, the caller should omit targetPath and let us
    // store it under public/library/.)
    const existingSha = await getFileSha(env, targetPath);
    if (!existingSha) {
      return jsonResponse({ ok: false, error: `Target file does not exist: ${targetPath}` }, 404);
    }

    const result = await commitBinaryToGitHub(
      env, targetPath, contentBase64, existingSha,
      `Admin: replace ${targetPath}`,
    );
    if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

    const publicUrl = "/" + targetPath.slice(PUBLIC_PREFIX.length);
    const storedName = targetPath.slice(targetPath.lastIndexOf("/") + 1);
    return jsonResponse({ ok: true, url: publicUrl, filename: storedName, path: targetPath });
  }

  // ── DEFAULT mode — new file under public/library/ ───────────────────────
  // Slugify the base name (without extension)
  const slug = slugify(filename || "image");
  let storedName = `${slug}.${ext}`;
  let repoPath   = `public/library/${storedName}`;

  // Collision handling — if a file by that name already exists, append a 6-char hash suffix
  const existingSha = await getFileSha(env, repoPath);
  if (existingSha) {
    const suffix = await shortHash(`${storedName}-${Date.now()}`);
    storedName = `${slug}-${suffix}.${ext}`;
    repoPath   = `public/library/${storedName}`;
  }

  const publicUrl = `/library/${storedName}`;
  const result = await commitBinaryToGitHub(env, repoPath, contentBase64, null, `Admin: upload library file ${storedName}`);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, url: publicUrl, filename: storedName, path: repoPath });
}

/* ── Path validation for Replace mode ──────────────────────────────────────
   Strict by design — anything we let through here gets committed to the repo,
   so a permissive check would be a directory-traversal hole. Rules:
     - Must start with "public/"
     - No ".." anywhere (segment or substring)
     - No leading slash, no absolute paths, no backslashes
     - No empty segments (e.g. "public//foo.png")
     - Must end with one of REPLACE_EXTS
     - The provided upload's extension (from contentType) must match the path's
       extension class — i.e. you can't overwrite a `.png` with a `.mp4` payload
       even if both ext alone is in the allow-list, because that would break
       <img> tags pointing at the original. We match permissively across
       `jpg`/`jpeg` since they're interchangeable. */
function validateTargetPath(targetPath, uploadExt) {
  if (!targetPath.startsWith(PUBLIC_PREFIX)) {
    return { ok: false, error: "targetPath must start with 'public/'" };
  }
  if (targetPath.includes("..")) {
    return { ok: false, error: "targetPath must not contain '..'" };
  }
  if (targetPath.includes("\\")) {
    return { ok: false, error: "targetPath must not contain backslashes" };
  }
  if (targetPath.includes("//")) {
    return { ok: false, error: "targetPath must not contain empty segments" };
  }
  if (targetPath.startsWith("/")) {
    return { ok: false, error: "targetPath must not start with '/'" };
  }
  // Segment-level checks — disallow any segment that's "." or ".." or empty
  const segments = targetPath.split("/");
  for (const seg of segments) {
    if (seg === "" || seg === "." || seg === "..") {
      return { ok: false, error: "targetPath has an invalid segment" };
    }
  }
  // Disallow replacing files inside the library — those are managed via the
  // library section's own delete/add flow.
  if (targetPath.startsWith("public/library/")) {
    return { ok: false, error: "Use the library section to replace library files" };
  }

  const lastDot = targetPath.lastIndexOf(".");
  if (lastDot < 0 || lastDot < targetPath.lastIndexOf("/")) {
    return { ok: false, error: "targetPath must have a file extension" };
  }
  const pathExt = targetPath.slice(lastDot + 1).toLowerCase();
  if (!REPLACE_EXTS.has(pathExt)) {
    return { ok: false, error: `targetPath extension '${pathExt}' not allowed` };
  }

  // Extension class match — uploadExt comes from the contentType allow-list
  // (so it's already a known value). Treat jpg/jpeg as equivalent.
  if (!extensionsCompatible(pathExt, uploadExt)) {
    return {
      ok: false,
      error: `Upload extension '${uploadExt}' does not match target path extension '${pathExt}'. Use the same file type when replacing.`,
    };
  }

  return { ok: true };
}

function extensionsCompatible(a, b) {
  if (a === b) return true;
  const jpgs = new Set(["jpg", "jpeg"]);
  if (jpgs.has(a) && jpgs.has(b)) return true;
  return false;
}

/* Slugify a filename to be URL-safe — lowercase, hyphens for spaces, no
   special chars. Strips any extension so the caller controls the final ext. */
function slugify(name) {
  return name
    .replace(/\.[^.]+$/, "")               // drop original extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")           // non-alphanum → hyphen
    .replace(/-+/g, "-")                   // collapse repeated hyphens
    .replace(/^-|-$/g, "")                 // trim leading/trailing hyphens
    .slice(0, 60) || "image";
}

/* Short content-based hash (6 hex chars) for collision suffixes. */
async function shortHash(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < 3; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}
