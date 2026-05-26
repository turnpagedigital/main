import { jsonResponse, isAuthed } from "./_utils.js";

const ALERTS_PATH = "src/data/alerts.json";

const VALID_PAGES = ["home", "ai-copyright", "crypto", "press", "briefings", "contact"];

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

  const { alerts } = body;
  if (!Array.isArray(alerts)) {
    return jsonResponse({ ok: false, error: "Payload must include 'alerts' array" }, 400);
  }

  const err = validateAlerts(alerts);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const merged = {
    _comment: (current.data && current.data._comment) || undefined,
    alerts: alerts.map(normalizeAlert),
  };
  Object.keys(merged).forEach(k => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFile(env, newContent, current.sha);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

function validateAlerts(alerts) {
  for (let i = 0; i < alerts.length; i++) {
    const a = alerts[i];
    if (!a || typeof a !== "object") return `alerts[${i}] is not an object`;
    if (typeof a.active   !== "boolean") return `alerts[${i}].active must be a boolean`;
    if (typeof a.pill     !== "string")  return `alerts[${i}].pill must be a string`;
    if (typeof a.text     !== "string")  return `alerts[${i}].text must be a string`;
    if (typeof a.linkText !== "string")  return `alerts[${i}].linkText must be a string`;
    if (typeof a.href     !== "string")  return `alerts[${i}].href must be a string`;
    if (!Array.isArray(a.pages))         return `alerts[${i}].pages must be an array`;
  }
  return null;
}

function normalizeAlert(a) {
  return {
    active:   Boolean(a.active),
    pill:     String(a.pill     ?? "Latest"),
    text:     String(a.text     ?? ""),
    linkText: String(a.linkText ?? ""),
    href:     String(a.href     ?? ""),
    pages:    Array.isArray(a.pages)
      ? a.pages.filter(p => VALID_PAGES.includes(p))
      : [],
  };
}

async function fetchFile(env) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${ALERTS_PATH}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return { ok: false, error: `GitHub GET ${r.status}: ${(await r.text()).slice(0, 300)}` };
  const meta = await r.json();
  let decoded;
  try {
    const raw = atob(meta.content.replace(/\n/g, ""));
    decoded = JSON.parse(decodeURIComponent(escape(raw)));
  } catch (e) {
    return { ok: false, error: `Failed to parse alerts.json: ${e.message}` };
  }
  return { ok: true, data: decoded, sha: meta.sha };
}

async function commitFile(env, newContent, currentSha) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${ALERTS_PATH}`;
  const utf8 = unescape(encodeURIComponent(newContent));
  const r = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Admin: update alerts.json",
      content: btoa(utf8),
      sha: currentSha,
      branch,
    }),
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
