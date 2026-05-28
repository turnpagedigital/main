import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const FILE_PATH = "src/data/testimonials.json";

/* Valid tag values must match page keys used in routes.json / marketing pages. */
const VALID_TAGS = ["home", "ai-copyright", "crypto", "litigation-finance"];

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

  const { testimonials } = body;
  if (!Array.isArray(testimonials)) {
    return jsonResponse({ ok: false, error: "Payload must include 'testimonials' array" }, 400);
  }

  const err = validateTestimonials(testimonials);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const merged = {
    _comment: (current.data && current.data._comment) || undefined,
    testimonials: testimonials.map(normalizeTestimonial),
  };
  Object.keys(merged).forEach(k => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFileToGitHub(
    env, FILE_PATH, newContent, current.sha, "Admin: update testimonials.json"
  );
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

function validateTestimonials(testimonials) {
  for (let i = 0; i < testimonials.length; i++) {
    const t = testimonials[i];
    if (!t || typeof t !== "object") return `testimonials[${i}] is not an object`;
    if (typeof t.quote !== "string") return `testimonials[${i}].quote must be a string`;
    if (typeof t.by    !== "string") return `testimonials[${i}].by must be a string`;
    if (!Array.isArray(t.tags))      return `testimonials[${i}].tags must be an array`;
  }
  return null;
}

function normalizeTestimonial(t) {
  return {
    id:     typeof t.id === "string" && t.id.trim() ? t.id.trim() : `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    quote:  String(t.quote ?? "").trim(),
    by:     String(t.by    ?? "").trim(),
    tags:   Array.isArray(t.tags) ? t.tags.filter(tag => VALID_TAGS.includes(tag)) : [],
    active: t.active !== false,
  };
}

async function fetchFile(env) {
  return getFileFromGitHub(env, FILE_PATH);
}
