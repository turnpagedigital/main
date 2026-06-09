import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileSha, commitBinaryToGitHub } from "./_github.js";

/* Upload a binary image/icon to public/library/<slug>.<ext> and return the
   public URL. Used by the admin Files tab.

   POST /api/admin/file-upload
   Body: { filename: "Anthropic Logo.png", contentBase64: "<base64>", contentType: "image/png" }
   Returns: { ok: true, url: "/library/anthropic-logo.png", filename: "anthropic-logo.png" }

   Mirrors the press-media.js pattern: validates type/size, slugifies the
   filename, and commits via commitBinaryToGitHub(). Unlike press-media this
   endpoint deduplicates by name (appends a short hash on collision) so the
   user can predict the URL from the filename.
*/

const MAX_B64 = 100 * 1024 * 1024;   // ~75 MB raw — allows video uploads up to ~50 MB

const ALLOWED_EXT = {
  "image/png":     "png",
  "image/jpeg":    "jpg",
  "image/jpg":     "jpg",
  "image/webp":    "webp",
  "image/gif":     "gif",
  "image/svg+xml": "svg",
  "image/x-icon":  "ico",
  "image/vnd.microsoft.icon": "ico",
  "application/pdf": "pdf",
  "video/mp4":     "mp4",
  "video/mpeg":    "mp4",
  "video/x-msvideo": "mp4",
  "video/webm":    "webm",
  "video/quicktime": "mov",
  "video/x-quicktime": "mov",
};

// Extensions allowed for `Replace` operations on existing library files.
// (Used by the Files tab to swap one file for another of the same kind.)
// eslint-disable-next-line no-unused-vars
const REPLACE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg", "ico", "pdf", "mp4", "webm", "mov"];

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

  const { filename, contentBase64, contentType } = body || {};

  if (typeof contentBase64 !== "string" || !contentBase64) {
    return jsonResponse({ ok: false, error: "Missing contentBase64" }, 400);
  }
  if (contentBase64.length > MAX_B64) {
    return jsonResponse({ ok: false, error: "File too large (max ~50 MB)" }, 400);
  }

  const ext = ALLOWED_EXT[contentType];
  if (!ext) {
    return jsonResponse({
      ok: false,
      error: `Unsupported type: ${contentType}. Use PNG, JPEG, WebP, GIF, SVG, ICO, PDF, MP4, WebM, or MOV.`,
    }, 400);
  }

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

  return jsonResponse({ ok: true, url: publicUrl, filename: storedName });
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
