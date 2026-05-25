import { jsonResponse, isAuthed } from "./_utils.js";

const PRESS_PATH = "src/data/press.json";
const PRESS_TYPE_VALUES   = ["publication", "podcast", "article", "social post", "blog post"];
const PRESS_AUTHOR_VALUES = ["Andrew", "Other", ""];
const PRESS_PAGE_VALUES   = ["ai-copyright", "crypto", "litigation-finance", "bankruptcy"];
const PRESS_STRING_FIELDS = ["type", "author", "date", "url", "excerpt", "publication_title", "piece_title"];

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

  const items = body.items;
  if (!Array.isArray(items)) {
    return jsonResponse({ ok: false, error: "Payload must include 'items' array" }, 400);
  }
  const validation = validateList(items);
  if (validation) return jsonResponse({ ok: false, error: validation }, 400);

  // Always re-fetch the latest SHA.
  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const merged = {
    _comment: current.data && current.data._comment ? current.data._comment : undefined,
    items: items.map(normalizeItem),
  };
  Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFile(env, newContent, current.sha);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

function validateList(list) {
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    if (!d || typeof d !== "object") return `items[${i}] is not an object`;
    for (const f of PRESS_STRING_FIELDS) {
      if (typeof d[f] !== "string") return `items[${i}].${f} must be a string`;
    }
    if (!PRESS_TYPE_VALUES.includes(d.type)) {
      return `items[${i}].type must be one of: ${PRESS_TYPE_VALUES.join(", ")}`;
    }
    if (!PRESS_AUTHOR_VALUES.includes(d.author)) {
      return `items[${i}].author must be "Andrew", "Other", or ""`;
    }
    // Accept missing pages (old schema had page string) — treat as empty array
    const itemPages = Array.isArray(d.pages) ? d.pages : [];
    for (const p of itemPages) {
      if (!PRESS_PAGE_VALUES.includes(p)) {
        return `items[${i}].pages contains invalid value "${p}"; must be one of: ${PRESS_PAGE_VALUES.join(", ")}`;
      }
    }
  }
  return null;
}

function normalizeItem(d) {
  const out = {};
  for (const f of PRESS_STRING_FIELDS) out[f] = String(d[f] ?? "");
  out.pages = Array.isArray(d.pages) ? d.pages.filter(p => PRESS_PAGE_VALUES.includes(p)) : [];
  return out;
}

async function fetchFile(env) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${PRESS_PATH}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return { ok: false, error: `GitHub GET ${r.status}: ${(await r.text()).slice(0, 300)}` };
  const meta = await r.json();
  let decoded;
  try {
    const raw = atob(meta.content.replace(/\n/g, ""));
    decoded = JSON.parse(decodeURIComponent(escape(raw)));
  } catch (e) {
    return { ok: false, error: `Failed to parse press.json: ${e.message}` };
  }
  return { ok: true, data: decoded, sha: meta.sha };
}

async function commitFile(env, newContent, currentSha) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${PRESS_PATH}`;
  const utf8 = unescape(encodeURIComponent(newContent));
  const body = JSON.stringify({
    message: "Admin: update press.json",
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
