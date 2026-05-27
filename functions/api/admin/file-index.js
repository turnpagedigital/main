import { jsonResponse, isAuthed } from "./_utils.js";
import { listRepoTree } from "./_github.js";

/* Index of every media file currently living in the repo's public/ directory.
   Returns one entry per file with its repo path, public URL, size, and type
   (image / video / icon). The admin Files tab uses this to show a "Site
   assets" section listing files the user hasn't explicitly added to the
   library — so any image or video already in the repo can be replaced
   in-place via the Replace button (which posts back to /api/admin/file-upload
   with a targetPath that matches the original file).

   GET /api/admin/file-index
   Returns: { ok: true, files: [{ path, url, size, type, ext }], truncated }

   Why this and not the Contents API?
   - One Git Trees API call returns the entire repo tree. Walking the Contents
     API directory by directory would be N+M requests for N folders + M files,
     and Pages Functions have a tight request budget.
   - We filter aggressively on the server so the client only sees media files
     and the payload stays small.

   Excluded:
   - Anything outside public/
   - The public/library/ directory (those files are already in the Library
     section above — duplicating them here would be confusing).
   - .DS_Store and other macOS metadata
   - Directory entries (we only want blobs)
*/

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov"]);
const ICON_EXTS  = new Set(["ico"]);
const ALLOWED_EXTS = new Set([...IMAGE_EXTS, ...VIDEO_EXTS, ...ICON_EXTS]);

const PUBLIC_PREFIX = "public/";
const SKIP_PREFIXES = ["public/library/"]; // already shown in the library section
const SKIP_BASENAMES = new Set([".DS_Store", "Thumbs.db", ".gitkeep"]);

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const result = await listRepoTree(env);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  const files = [];
  for (const entry of result.tree) {
    if (entry.type !== "blob") continue;
    const path = entry.path || "";
    if (!path.startsWith(PUBLIC_PREFIX)) continue;
    if (SKIP_PREFIXES.some(p => path.startsWith(p))) continue;

    const basename = path.slice(path.lastIndexOf("/") + 1);
    if (SKIP_BASENAMES.has(basename)) continue;
    if (basename.startsWith(".")) continue;

    const dotIdx = basename.lastIndexOf(".");
    if (dotIdx < 1) continue;                       // no extension or hidden file
    const ext = basename.slice(dotIdx + 1).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) continue;

    files.push({
      path,
      url:  "/" + path.slice(PUBLIC_PREFIX.length), // strip "public/" → site-relative URL
      size: typeof entry.size === "number" ? entry.size : 0,
      ext,
      type: typeForExt(ext),
    });
  }

  // Stable alphabetical sort by path so the UI ordering is predictable.
  files.sort((a, b) => a.path.localeCompare(b.path));

  return jsonResponse({ ok: true, files, truncated: result.truncated });
}

function typeForExt(ext) {
  if (VIDEO_EXTS.has(ext)) return "video";
  if (ICON_EXTS.has(ext))  return "icon";
  return "image";
}
