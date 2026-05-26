import { jsonResponse, isAuthed } from "./_utils.js";
import {
  getFileFromGitHub,
  getFileSha,
  commitFileToGitHub,
  commitBinaryToGitHub,
} from "./_github.js";

/* Saves a cropped avatar image to public/andrew-avatar.png and updates
   bio.json avatar_url.  Identical flow to photo.js.

   PUT /api/admin/avatar
   Body: { content: "<base64 PNG>", mime_type: "image/png" }
   Returns: { ok: true, avatar_url: "/andrew-avatar.png" }
*/

const BIO_PATH    = "src/data/bio.json";
const AVATAR_PATH = "public/andrew-avatar.png";
const AVATAR_URL  = "/andrew-avatar.png";
const MAX_B64     = 8 * 1024 * 1024; // ~6 MB raw

export async function onRequestPut({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const { content, mime_type } = body;
  if (typeof content !== "string" || !content) {
    return jsonResponse({ ok: false, error: "Missing content" }, 400);
  }
  if (content.length > MAX_B64) {
    return jsonResponse({ ok: false, error: "Image too large (max ~6 MB)" }, 400);
  }
  if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mime_type)) {
    return jsonResponse({ ok: false, error: "Unsupported type — use PNG, JPEG, or WebP" }, 400);
  }

  // 1 — Commit the avatar image
  const existingSha = await getFileSha(env, AVATAR_PATH);
  const imgResult   = await commitBinaryToGitHub(env, AVATAR_PATH, content, existingSha, "Admin: update avatar");
  if (!imgResult.ok) return jsonResponse({ ok: false, error: imgResult.error }, 502);

  // 2 — Update bio.json avatar_url
  const bioResult = await updateBioAvatarUrl(env, AVATAR_URL);
  if (!bioResult.ok) {
    return jsonResponse({ ok: false, error: `Avatar uploaded but bio.json update failed: ${bioResult.error}` }, 502);
  }

  return jsonResponse({ ok: true, avatar_url: AVATAR_URL });
}

async function updateBioAvatarUrl(env, avatarUrl) {
  const current = await getFileFromGitHub(env, BIO_PATH);
  if (!current.ok) return { ok: false, error: current.error };

  const updated = { ...current.data, avatar_url: avatarUrl };
  const newContent = JSON.stringify(updated, null, 2) + "\n";

  const result = await commitFileToGitHub(env, BIO_PATH, newContent, current.sha, "Admin: update bio avatar_url");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
