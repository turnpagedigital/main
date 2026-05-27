import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

/* Read/write src/data/home-content.json — home page situations and testimonials.

   GET  /api/admin/home-content  → { ok: true, data: { situations, testimonials }, sha }
   PUT  /api/admin/home-content  → { ok: true, commitSha }
   Body for PUT: { situations: [...], testimonials: [...] }

   Situation: { id, no, title, body, details }
   Testimonial: { id, quote, by }
*/

const HOME_CONTENT_PATH = "src/data/home-content.json";

const MAX_SITUATIONS   = 20;
const MAX_TESTIMONIALS = 20;
const MAX_ID_LEN       = 80;
const MAX_NO_LEN       = 10;
const MAX_TITLE_LEN    = 200;
const MAX_BODY_LEN     = 500;
const MAX_DETAILS_LEN  = 1000;
const MAX_QUOTE_LEN    = 800;
const MAX_BY_LEN       = 200;

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const result = await getFileFromGitHub(env, HOME_CONTENT_PATH);
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
  if (!Array.isArray(body.situations)) {
    return jsonResponse({ ok: false, error: "'situations' must be an array" }, 400);
  }
  if (!Array.isArray(body.testimonials)) {
    return jsonResponse({ ok: false, error: "'testimonials' must be an array" }, 400);
  }
  if (body.situations.length > MAX_SITUATIONS) {
    return jsonResponse({ ok: false, error: `Too many situations (max ${MAX_SITUATIONS})` }, 400);
  }
  if (body.testimonials.length > MAX_TESTIMONIALS) {
    return jsonResponse({ ok: false, error: `Too many testimonials (max ${MAX_TESTIMONIALS})` }, 400);
  }

  const sitError = validateSituations(body.situations);
  if (sitError) return jsonResponse({ ok: false, error: sitError }, 400);

  const testError = validateTestimonials(body.testimonials);
  if (testError) return jsonResponse({ ok: false, error: testError }, 400);

  // Re-fetch latest SHA before committing
  const current = await getFileFromGitHub(env, HOME_CONTENT_PATH);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const sanitized = {
    situations:   body.situations.map(normalizeSituation),
    testimonials: body.testimonials.map(normalizeTestimonial),
  };
  const newContent = JSON.stringify(sanitized, null, 2) + "\n";
  const result = await commitFileToGitHub(
    env, HOME_CONTENT_PATH, newContent, current.sha, "Admin: update home-content.json",
  );
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

/* ── Validation ───────────────────────────────────────────────────────────── */

function validateSituations(situations) {
  const seenIds = new Set();
  for (let i = 0; i < situations.length; i++) {
    const s = situations[i];
    if (!s || typeof s !== "object") return `situations[${i}] is not an object`;
    if (typeof s.id !== "string" || !s.id.trim())
      return `situations[${i}].id is required`;
    if (seenIds.has(s.id.trim()))
      return `situations[${i}].id "${s.id}" is duplicated`;
    seenIds.add(s.id.trim());
    if (typeof s.title !== "string" || !s.title.trim())
      return `situations[${i}].title is required`;
    if (typeof s.body !== "string" || !s.body.trim())
      return `situations[${i}].body is required`;
    if (s.details !== undefined && typeof s.details !== "string")
      return `situations[${i}].details must be a string`;
  }
  return null;
}

function validateTestimonials(testimonials) {
  const seenIds = new Set();
  for (let i = 0; i < testimonials.length; i++) {
    const t = testimonials[i];
    if (!t || typeof t !== "object") return `testimonials[${i}] is not an object`;
    if (typeof t.id !== "string" || !t.id.trim())
      return `testimonials[${i}].id is required`;
    if (seenIds.has(t.id.trim()))
      return `testimonials[${i}].id "${t.id}" is duplicated`;
    seenIds.add(t.id.trim());
    if (typeof t.quote !== "string" || !t.quote.trim())
      return `testimonials[${i}].quote is required`;
    if (typeof t.by !== "string" || !t.by.trim())
      return `testimonials[${i}].by is required`;
  }
  return null;
}

/* ── Normalisation ────────────────────────────────────────────────────────── */

function normalizeSituation(s) {
  const out = {
    id:    String(s.id).trim().slice(0, MAX_ID_LEN),
    no:    typeof s.no === "string" ? s.no.trim().slice(0, MAX_NO_LEN) : "",
    title: String(s.title).trim().slice(0, MAX_TITLE_LEN),
    body:  String(s.body).trim().slice(0, MAX_BODY_LEN),
  };
  if (typeof s.details === "string") {
    out.details = s.details.trim().slice(0, MAX_DETAILS_LEN);
  }
  return out;
}

function normalizeTestimonial(t) {
  return {
    id:    String(t.id).trim().slice(0, MAX_ID_LEN),
    quote: String(t.quote).trim().slice(0, MAX_QUOTE_LEN),
    by:    String(t.by).trim().slice(0, MAX_BY_LEN),
  };
}
