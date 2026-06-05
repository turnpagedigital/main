import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";
import routesData from "../../src/data/routes.json";

const FAQS_PATH = "src/data/faqs.json";

// Derived from routes.json — add/rename pages there, not here
const VALID_PAGES = new Set(
  routesData.routes.filter(r => !r.dynamic && r.key !== "admin").map(r => r.key)
);

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

  const { faqs } = body;
  if (!Array.isArray(faqs)) {
    return jsonResponse({ ok: false, error: "Payload must include 'faqs' array" }, 400);
  }

  const err = validateFaqs(faqs);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const merged = {
    _comment: (current.data && current.data._comment) || undefined,
    faqs: faqs.map(normalizeFaq),
  };
  Object.keys(merged).forEach(k => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFileToGitHub(env, FAQS_PATH, newContent, current.sha, "Admin: update faqs.json");
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

function validateFaqs(faqs) {
  for (let i = 0; i < faqs.length; i++) {
    const f = faqs[i];
    if (!f || typeof f !== "object") return `faqs[${i}] is not an object`;
    if (typeof f.active !== "boolean") return `faqs[${i}].active must be a boolean`;
    if (typeof f.q !== "string") return `faqs[${i}].q must be a string`;
    if (typeof f.a !== "string" && !Array.isArray(f.a)) return `faqs[${i}].a must be a string or array`;
    if (!Array.isArray(f.pages)) return `faqs[${i}].pages must be an array`;
    if (f.featured !== undefined && typeof f.featured !== "boolean") return `faqs[${i}].featured must be a boolean`;
  }
  return null;
}

function normalizeFaq(f) {
  const result = {
    active: Boolean(f.active),
    q:      String(f.q ?? ""),
    a:      typeof f.a === "string" ? f.a : Array.isArray(f.a) ? f.a.map(String).join("\n\n") : "",
    pages:  Array.isArray(f.pages)
      ? f.pages.filter(p => VALID_PAGES.has(p))
      : [],
  };
  if (f.featured !== undefined) result.featured = Boolean(f.featured);
  return result;
}

async function fetchFile(env) {
  return getFileFromGitHub(env, FAQS_PATH);
}
