import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const PRESS_PATH = "src/data/press.json";
// Type and author are freeform strings — no enum validation, just string check.
const PRESS_PAGE_VALUES   = ["copyright", "crypto", "litigation", "tariffs", "bankruptcy"];
const PRESS_STRING_FIELDS = ["type", "author", "date", "url", "logo_url", "excerpt", "publication_title", "piece_title", "media_url"];

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
  const result = await commitFileToGitHub(env, PRESS_PATH, newContent, current.sha, "Admin: update press.json");
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
  return getFileFromGitHub(env, PRESS_PATH);
}
