import { jsonResponse, isAuthed } from "./_utils.js";
import {
  getFileFromGitHub,
  getFileSha,
  commitFileToGitHub,
  commitBinaryToGitHub,
} from "./_github.js";

const BIO_PATH   = "src/data/bio.json";
const MAX_B64    = 6 * 1024 * 1024; // ~4.5MB raw image

const MIME_TO_PATH = {
  "image/jpeg": "public/andrew.jpg",
  "image/jpg":  "public/andrew.jpg",
  "image/png":  "public/andrew.png",
  "image/webp": "public/andrew.webp",
};
const MIME_TO_URL = {
  "image/jpeg": "/andrew.jpg",
  "image/jpg":  "/andrew.jpg",
  "image/png":  "/andrew.png",
  "image/webp": "/andrew.webp",
};

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
    return jsonResponse({ ok: false, error: "Image too large (max ~4MB)" }, 400);
  }

  const photoPath = MIME_TO_PATH[mime_type];
  const photoUrl  = MIME_TO_URL[mime_type];
  if (!photoPath) {
    return jsonResponse({ ok: false, error: `Unsupported image type: ${mime_type}. Use JPEG, PNG, or WebP.` }, 400);
  }

  // 1 — Commit the image file (get current SHA first, or omit sha if file is new)
  const imgSha = await getFileSha(env, photoPath);
  const imgResult = await commitBinaryToGitHub(env, photoPath, content, imgSha, "Admin: update profile photo");
  if (!imgResult.ok) return jsonResponse({ ok: false, error: imgResult.error }, 502);

  // 2 — Update bio.json photo_url
  const bioResult = await updateBioPhotoUrl(env, photoUrl);
  if (!bioResult.ok) return jsonResponse({ ok: false, error: `Image uploaded but bio.json update failed: ${bioResult.error}` }, 502);

  return jsonResponse({ ok: true, photo_url: photoUrl });
}

async function updateBioPhotoUrl(env, photoUrl) {
  const current = await getFileFromGitHub(env, BIO_PATH);
  if (!current.ok) return { ok: false, error: current.error };

  const updated = { ...current.data, photo_url: photoUrl };
  const newContent = JSON.stringify(updated, null, 2) + "\n";

  const result = await commitFileToGitHub(env, BIO_PATH, newContent, current.sha, "Admin: update bio photo_url");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
