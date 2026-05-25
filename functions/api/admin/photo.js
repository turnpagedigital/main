import { jsonResponse, isAuthed } from "./_utils.js";

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
  const imgResult = await commitBinary(env, photoPath, content, imgSha, "Admin: update profile photo");
  if (!imgResult.ok) return jsonResponse({ ok: false, error: imgResult.error }, 502);

  // 2 — Update bio.json photo_url
  const bioResult = await updateBioPhotoUrl(env, photoUrl);
  if (!bioResult.ok) return jsonResponse({ ok: false, error: `Image uploaded but bio.json update failed: ${bioResult.error}` }, 502);

  return jsonResponse({ ok: true, photo_url: photoUrl });
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */

async function getFileSha(env, path) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return null; // file doesn't exist yet — omit sha on create
  const j = await r.json();
  return j.sha || null;
}

async function commitBinary(env, path, base64Content, sha, message) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
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

async function updateBioPhotoUrl(env, photoUrl) {
  const branch = env.GITHUB_BRANCH || "dev";

  // Fetch current bio.json
  const getUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${BIO_PATH}?ref=${encodeURIComponent(branch)}`;
  const getR = await fetch(getUrl, { headers: githubHeaders(env) });
  if (!getR.ok) return { ok: false, error: `GitHub GET bio ${getR.status}` };
  const meta = await getR.json();

  let current;
  try {
    const raw = atob(meta.content.replace(/\n/g, ""));
    current = JSON.parse(decodeURIComponent(escape(raw)));
  } catch (e) {
    return { ok: false, error: `Parse bio.json: ${e.message}` };
  }

  const updated = { ...current, photo_url: photoUrl };
  const newContent = JSON.stringify(updated, null, 2) + "\n";
  const utf8 = unescape(encodeURIComponent(newContent));

  const putR = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${BIO_PATH}`, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Admin: update bio photo_url",
      content: btoa(utf8),
      sha: meta.sha,
      branch,
    }),
  });
  if (!putR.ok) {
    const text = (await putR.text()).slice(0, 400);
    return { ok: false, error: `GitHub PUT bio ${putR.status}: ${text}` };
  }
  return { ok: true };
}

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "tpdm-admin",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
