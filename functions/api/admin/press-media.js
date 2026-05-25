import { jsonResponse, isAuthed } from "./_utils.js";

/* Accepts base64-encoded image or video, commits it to public/uploads/press/
   in the GitHub repo, and returns the public URL.

   POST /api/admin/press-media
   Body: { content: "<base64>", mime_type: "image/jpeg", filename: "my-photo.jpg" }
   Returns: { ok: true, url: "/uploads/press/1234567890-my-photo.jpg" }
*/

const MAX_B64 = 15 * 1024 * 1024; // ~11 MB raw — enough for thumbnails and short clips

const ALLOWED_EXT = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
  "video/mp4":  "mp4",
  "video/webm": "webm",
};

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

  const { content, mime_type, filename } = body;

  if (typeof content !== "string" || !content) {
    return jsonResponse({ ok: false, error: "Missing content" }, 400);
  }
  if (content.length > MAX_B64) {
    return jsonResponse({ ok: false, error: "File too large (max ~11 MB)" }, 400);
  }

  const ext = ALLOWED_EXT[mime_type];
  if (!ext) {
    return jsonResponse({ ok: false, error: `Unsupported type: ${mime_type}. Use JPEG, PNG, WebP, GIF, MP4, or WebM.` }, 400);
  }

  // Build a safe, unique filename
  const slug = (filename || "media")
    .replace(/\.[^.]+$/, "")               // strip original extension
    .replace(/[^a-zA-Z0-9_-]/g, "-")       // sanitise
    .replace(/-+/g, "-")
    .slice(0, 50)
    .toLowerCase();
  const storedName = `${Date.now()}-${slug}.${ext}`;
  const repoPath   = `public/uploads/press/${storedName}`;
  const publicUrl  = `/uploads/press/${storedName}`;

  // File is new — no need to look up existing SHA (timestamp guarantees uniqueness)
  const result = await commitBinary(env, repoPath, content, null, `Admin: upload press media ${storedName}`);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, url: publicUrl });
}

async function commitBinary(env, path, base64Content, sha, message) {
  const branch  = env.GITHUB_BRANCH || "dev";
  const url     = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const bodyObj = { message, content: base64Content, branch };
  if (sha) bodyObj.sha = sha;

  const r = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  });
  if (!r.ok) {
    const text = (await r.text()).slice(0, 400);
    return { ok: false, error: `GitHub PUT ${r.status}: ${text}` };
  }
  const j = await r.json();
  return { ok: true, sha: (j.commit && j.commit.sha) || "" };
}

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "tpdm-admin",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
