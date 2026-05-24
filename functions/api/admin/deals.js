import { jsonResponse, isAuthed } from "./_utils.js";

const DEALS_PATH = "src/data/deals.json";
const DEAL_FIELDS = ["amt", "who", "type", "form", "when", "summary"];

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

  const home = body.home;
  const crypto = body.crypto;
  if (!Array.isArray(home) || !Array.isArray(crypto)) {
    return jsonResponse({ ok: false, error: "Payload must include 'home' and 'crypto' arrays" }, 400);
  }
  const validation = validateList(home, "home") || validateList(crypto, "crypto");
  if (validation) return jsonResponse({ ok: false, error: validation }, 400);

  // Always re-fetch the latest SHA to enforce single-source-of-truth: if a
  // chat-side commit landed in the meantime, we'll have the new SHA and the
  // PUT to GitHub will succeed against the latest state.
  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  // Preserve the _comment metadata that lives in the JSON so chat-only docs aren't lost.
  const merged = {
    _comment: current.data && current.data._comment ? current.data._comment : undefined,
    home: home.map(normalizeDeal),
    crypto: crypto.map(normalizeDeal),
  };
  // Strip undefined keys so they don't render as "undefined" in JSON.
  Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFile(env, newContent, current.sha);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

function validateList(list, name) {
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    if (!d || typeof d !== "object") return `${name}[${i}] is not an object`;
    for (const f of DEAL_FIELDS) {
      if (typeof d[f] !== "string") return `${name}[${i}].${f} must be a string`;
    }
  }
  return null;
}

function normalizeDeal(d) {
  const out = {};
  for (const f of DEAL_FIELDS) out[f] = String(d[f] ?? "");
  return out;
}

async function fetchFile(env) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${DEALS_PATH}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, {
    headers: githubHeaders(env),
  });
  if (!r.ok) return { ok: false, error: `GitHub GET ${r.status}: ${(await r.text()).slice(0, 300)}` };
  const meta = await r.json();
  let decoded;
  try {
    const raw = atob(meta.content.replace(/\n/g, ""));
    // UTF-8 safe decode (atob produces bytes; we need to interpret them as UTF-8 text).
    decoded = JSON.parse(decodeURIComponent(escape(raw)));
  } catch (e) {
    return { ok: false, error: `Failed to parse deals.json: ${e.message}` };
  }
  return { ok: true, data: decoded, sha: meta.sha };
}

async function commitFile(env, newContent, currentSha) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${DEALS_PATH}`;
  // UTF-8 safe base64 encode
  const utf8 = unescape(encodeURIComponent(newContent));
  const body = JSON.stringify({
    message: "Admin: update deals.json",
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
