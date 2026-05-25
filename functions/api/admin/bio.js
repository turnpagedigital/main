import { jsonResponse, isAuthed } from "./_utils.js";

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

  // Preserve photo_url from the existing file (photo uploads go through /api/admin/photo)
  const existingPhotoUrl = (current.data && typeof current.data.photo_url === "string")
    ? current.data.photo_url : undefined;

  const merged = {
    _comment:       (current.data && current.data._comment) || undefined,
    photo_url:      existingPhotoUrl,
    tagline_before: String(bio.tagline_before ?? ""),
    tagline_accent: String(bio.tagline_accent ?? ""),
    tagline_after:  String(bio.tagline_after  ?? ""),
    paragraphs:     (bio.paragraphs || []).map(p => String(p)),
  };
  Object.keys(merged).forEach(k => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFile(env, newContent, current.sha);
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
  return null;
}

async function fetchFile(env) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${BIO_PATH}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return { ok: false, error: `GitHub GET ${r.status}: ${(await r.text()).slice(0, 300)}` };
  const meta = await r.json();
  let decoded;
  try {
    const raw = atob(meta.content.replace(/\n/g, ""));
    decoded = JSON.parse(decodeURIComponent(escape(raw)));
  } catch (e) {
    return { ok: false, error: `Failed to parse bio.json: ${e.message}` };
  }
  return { ok: true, data: decoded, sha: meta.sha };
}

async function commitFile(env, newContent, currentSha) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${BIO_PATH}`;
  const utf8 = unescape(encodeURIComponent(newContent));
  const body = JSON.stringify({
    message: "Admin: update bio.json",
    content: btoa(utf8),
    sha: currentSha,
    branch,
  });
  const r = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body,
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
