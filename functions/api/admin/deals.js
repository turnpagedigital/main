import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const DEALS_PATH = "src/data/deals.json";
const DEAL_STRING_FIELDS = ["amt", "who", "type", "form", "when", "summary", "case_study"];

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

  const deals = body.deals;
  if (!Array.isArray(deals)) {
    return jsonResponse({ ok: false, error: "Payload must include 'deals' array" }, 400);
  }
  const validation = validateList(deals, "deals");
  if (validation) return jsonResponse({ ok: false, error: validation }, 400);

  // Always re-fetch the latest SHA to enforce single-source-of-truth.
  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const merged = {
    _comment: current.data && current.data._comment ? current.data._comment : undefined,
    deals: deals.map(normalizeDeal),
  };
  Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFileToGitHub(env, DEALS_PATH, newContent, current.sha, "Admin: update deals.json");
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

function validateList(list, name) {
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    if (!d || typeof d !== "object") return `${name}[${i}] is not an object`;
    for (const f of DEAL_STRING_FIELDS) {
      if (typeof d[f] !== "string") return `${name}[${i}].${f} must be a string`;
    }
    if (!Array.isArray(d.pages)) return `${name}[${i}].pages must be an array`;
    if (typeof d.preTurnpage !== "boolean") return `${name}[${i}].preTurnpage must be a boolean`;
    // logos is optional; if present must be an array of strings (max 3)
    if (d.logos !== undefined && !Array.isArray(d.logos)) return `${name}[${i}].logos must be an array`;
    if (Array.isArray(d.logos) && d.logos.length > 3) return `${name}[${i}].logos may have at most 3 entries`;
    if (Array.isArray(d.logos)) {
      for (let j = 0; j < d.logos.length; j++) {
        if (typeof d.logos[j] !== "string") return `${name}[${i}].logos[${j}] must be a string`;
      }
    }
  }
  return null;
}

function normalizeDeal(d) {
  const out = {};
  for (const f of DEAL_STRING_FIELDS) out[f] = String(d[f] ?? "");
  out.pages = Array.isArray(d.pages) ? d.pages.filter(p => typeof p === "string") : [];
  out.preTurnpage = Boolean(d.preTurnpage);
  // Keep only non-empty logo URLs, max 3
  out.logos = Array.isArray(d.logos)
    ? d.logos.slice(0, 3).map(l => String(l ?? "")).filter(l => l.trim())
    : [];
  return out;
}

async function fetchFile(env) {
  return getFileFromGitHub(env, DEALS_PATH);
}
