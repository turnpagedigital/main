import { jsonResponse, isAuthed } from "./_utils.js";

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
  const imgResult   = await commitBinary(env, AVATAR_PATH, content, existingSha, "Admin: update avatar");
  if (!imgResult.ok) return jsonResponse({ ok: false, error: imgResult.error }, 502);

  // 2 — Update bio.json avatar_url
  const bioResult = await updateBioAvatarUrl(env, AVATAR_URL);
  if (!bioResult.ok) {
    return jsonResponse({ ok: false, error: `Avatar uploaded but bio.json update failed: ${bioResult.error}` }, 502);
  }

  return jsonResponse({ ok: true, avatar_url: AVATAR_URL });
}

async function getFileSha(env, path) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url    = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  const r      = await fetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return null;
  const j = await r.json();
  return j.sha || null;
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

async function updateBioAvatarUrl(env, avatarUrl) {
  const branch = env.GITHUB_BRANCH || "dev";
  const getUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${BIO_PATH}?ref=${encodeURIComponent(branch)}`;
  const getR   = await fetch(getUrl, { headers: githubHeaders(env) });
  if (!getR.ok) return { ok: false, error: `GitHub GET bio ${getR.status}` };
  const meta   = await getR.json();

  let current;
  try {
    const raw = atob(meta.content.replace(/\n/g, ""));
    current   = JSON.parse(decodeURIComponent(escape(raw)));
  } catch (e) {
    return { ok: false, error: `Parse bio.json: ${e.message}` };
  }

  const updated    = { ...current, avatar_url: avatarUrl };
  const newContent = JSON.stringify(updated, null, 2) + "\n";
  const utf8       = unescape(encodeURIComponent(newContent));

  const putR = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${BIO_PATH}`, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Admin: update bio avatar_url", content: btoa(utf8), sha: meta.sha, branch }),
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
