import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const BIO_PATH = "src/data/bio.json";

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const result = await fetchFile(env);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);
  return jsonResponse({ ok: true, data: result.data, sha: result.sha });
}

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

  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, error: "Invalid payload" }, 400);
  }

  const { bio } = body;
  if (!bio || typeof bio !== "object") {
    return jsonResponse({ ok: false, error: "Payload must include 'bio' object" }, 400);
  }

  const err = validateBio(bio);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  // Always re-fetch the latest SHA to enforce single-source-of-truth.
  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  // Preserve photo_url and avatar_url from the existing file (those go through /api/admin/photo and /api/admin/avatar)
  const existingPhotoUrl  = (current.data && typeof current.data.photo_url  === "string") ? current.data.photo_url  : undefined;
  const existingAvatarUrl = (current.data && typeof current.data.avatar_url === "string") ? current.data.avatar_url : undefined;

  const merged = {
    _comment:       (current.data && current.data._comment) || undefined,
    photo_url:      existingPhotoUrl,
    avatar_url:     existingAvatarUrl,
    tagline_before: String(bio.tagline_before ?? ""),
    tagline_accent: String(bio.tagline_accent ?? ""),
    tagline_after:  String(bio.tagline_after  ?? ""),
    paragraphs:     (bio.paragraphs || []).map(p => String(p)),
    media_logos:    Array.isArray(bio.media_logos)
      ? bio.media_logos.map(l => ({ name: String(l.name ?? ""), url: String(l.url ?? "") }))
      : [],
  };
  Object.keys(merged).forEach(k => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFileToGitHub(env, BIO_PATH, newContent, current.sha, "Admin: update bio.json");
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

function validateBio(bio) {
  if (typeof bio.tagline_before !== "string") return "tagline_before must be a string";
  if (typeof bio.tagline_accent !== "string") return "tagline_accent must be a string";
  if (typeof bio.tagline_after  !== "string") return "tagline_after must be a string";
  if (!Array.isArray(bio.paragraphs)) return "paragraphs must be an array";
  for (let i = 0; i < bio.paragraphs.length; i++) {
    if (typeof bio.paragraphs[i] !== "string") return `paragraphs[${i}] must be a string`;
  }
  if (bio.media_logos !== undefined) {
    if (!Array.isArray(bio.media_logos)) return "media_logos must be an array";
    for (let i = 0; i < bio.media_logos.length; i++) {
      const l = bio.media_logos[i];
      if (!l || typeof l !== "object") return `media_logos[${i}] must be an object`;
      if (typeof l.name !== "string") return `media_logos[${i}].name must be a string`;
      if (typeof l.url  !== "string") return `media_logos[${i}].url must be a string`;
    }
  }
  return null;
}

async function fetchFile(env) {
  return getFileFromGitHub(env, BIO_PATH);
}
