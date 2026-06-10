import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

/* Read/write src/data/ai-copyright-content.json — the AI Copyright page's
   content store. DamagesSection renders damagesData from it (the Active
   Docket chart); edited via MarketingPagesTab inside the Page Builder's
   "damages" section editor.

   GET  /api/admin/marketing-pages
     → { ok: true, data: { aiCopyright } }

   PUT  /api/admin/marketing-pages
     Body: { aiCopyright }
     → { ok: true, commits: { aiCopyright } }

   Historical note: this endpoint once also managed crypto-content.json and
   litigation-finance-content.json, but those pages render entirely from
   page-compositions.json — the files were written and never read, so they
   were removed (June 2026). The PUT validator also dispatched on the key
   "copyright" while the payload key was "aiCopyright", so AI Copyright
   saves were rejected with "Unknown key" — fixed in the same change.

   Auth required (session cookie).
*/

const PATHS = {
  aiCopyright: "src/data/ai-copyright-content.json",
};

/* ── Field length limits ─────────────────────────────────────────────────── */
const MAX_ITEMS = 30;
const MAX_STR   = 1200;
const MAX_ID    = 80;

/* ── GET ─────────────────────────────────────────────────────────────────── */

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const results = {};
  for (const [key, path] of Object.entries(PATHS)) {
    const r = await getFileFromGitHub(env, path);
    if (!r.ok) return jsonResponse({ ok: false, error: `Failed to load ${path}: ${r.error}` }, 502);
    results[key] = r.data;
  }

  return jsonResponse({ ok: true, data: results });
}

/* ── PUT ─────────────────────────────────────────────────────────────────── */

export async function onRequestPut({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: "Bad request body" }, 400); }

  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, error: "Invalid payload" }, 400);
  }

  const commits = {};

  for (const [key, path] of Object.entries(PATHS)) {
    if (!(key in body)) continue; // skip keys not present — partial update

    const payload = body[key];
    const err = validatePayload(key, payload);
    if (err) return jsonResponse({ ok: false, error: err }, 400);

    // Re-fetch current SHA before committing
    const current = await getFileFromGitHub(env, path);
    if (!current.ok) return jsonResponse({ ok: false, error: `Failed to fetch ${path}: ${current.error}` }, 502);

    const sanitized = sanitizePayload(key, payload);
    const newContent = JSON.stringify(sanitized, null, 2) + "\n";
    const result = await commitFileToGitHub(
      env, path, newContent, current.sha,
      `Admin: update ${path.split("/").pop()}`,
    );
    if (!result.ok) return jsonResponse({ ok: false, error: `Failed to save ${path}: ${result.error}` }, 502);
    commits[key] = result.sha;
  }

  return jsonResponse({ ok: true, commits });
}

/* ── Validation ──────────────────────────────────────────────────────────── */

function validatePayload(key, payload) {
  if (!payload || typeof payload !== "object") return `${key} must be an object`;

  switch (key) {
    case "aiCopyright":
      return validateCopyright(payload);
    default:
      return `Unknown key: ${key}`;
  }
}

function validateCopyright(p) {
  if (!Array.isArray(p.audienceCards)) return "aiCopyright.audienceCards must be an array";
  if (!Array.isArray(p.serviceCards)) return "aiCopyright.serviceCards must be an array";
  if (!Array.isArray(p.damagesData)) return "aiCopyright.damagesData must be an array";
  if (p.audienceCards.length > MAX_ITEMS) return `Too many audienceCards (max ${MAX_ITEMS})`;
  if (p.serviceCards.length > MAX_ITEMS) return `Too many serviceCards (max ${MAX_ITEMS})`;
  if (p.damagesData.length > MAX_ITEMS) return `Too many damagesData entries (max ${MAX_ITEMS})`;
  const a = validateAudienceCards(p.audienceCards, "aiCopyright.audienceCards");
  if (a) return a;
  const s = validateServiceCards(p.serviceCards, "aiCopyright.serviceCards");
  if (s) return s;
  const d = validateDamagesData(p.damagesData);
  if (d) return d;
  return null;
}

function validateAudienceCards(cards, label) {
  const seen = new Set();
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!c || typeof c !== "object") return `${label}[${i}] is not an object`;
    if (typeof c.id !== "string" || !c.id.trim()) return `${label}[${i}].id is required`;
    if (seen.has(c.id.trim())) return `${label}[${i}].id "${c.id}" is duplicated`;
    seen.add(c.id.trim());
    if (typeof c.title !== "string" || !c.title.trim()) return `${label}[${i}].title is required`;
    if (typeof c.body !== "string" || !c.body.trim()) return `${label}[${i}].body is required`;
  }
  return null;
}

function validateServiceCards(cards, label) {
  const seen = new Set();
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!c || typeof c !== "object") return `${label}[${i}] is not an object`;
    if (typeof c.id !== "string" || !c.id.trim()) return `${label}[${i}].id is required`;
    if (seen.has(c.id.trim())) return `${label}[${i}].id "${c.id}" is duplicated`;
    seen.add(c.id.trim());
    if (typeof c.title !== "string" || !c.title.trim()) return `${label}[${i}].title is required`;
    if (typeof c.body !== "string" || !c.body.trim()) return `${label}[${i}].body is required`;
  }
  return null;
}

function validateDamagesData(items) {
  const seen = new Set();
  for (let i = 0; i < items.length; i++) {
    const d = items[i];
    if (!d || typeof d !== "object") return `damagesData[${i}] is not an object`;
    if (typeof d.id !== "string" || !d.id.trim()) return `damagesData[${i}].id is required`;
    if (seen.has(d.id.trim())) return `damagesData[${i}].id "${d.id}" is duplicated`;
    seen.add(d.id.trim());
    if (typeof d.name !== "string" || !d.name.trim()) return `damagesData[${i}].name is required`;
    if (typeof d.amountB !== "number" || isNaN(d.amountB)) return `damagesData[${i}].amountB must be a number`;
    if (typeof d.label !== "string" || !d.label.trim()) return `damagesData[${i}].label is required`;
    if (typeof d.type !== "string" || !d.type.trim()) return `damagesData[${i}].type is required`;
    if (typeof d.badge !== "string" || !d.badge.trim()) return `damagesData[${i}].badge is required`;
  }
  return null;
}

/* ── Sanitisation ────────────────────────────────────────────────────────── */

function sanitizePayload(key, payload) {
  switch (key) {
    case "aiCopyright": return sanitizeCopyright(payload);
    default: return payload;
  }
}

const s = (v) => typeof v === "string" ? v.trim().slice(0, MAX_STR) : "";
const sid = (v) => typeof v === "string" ? v.trim().slice(0, MAX_ID) : "";
const bool = (v) => Boolean(v);

function sanitizeAudienceCard(c) {
  const out = { id: sid(c.id), title: s(c.title), body: s(c.body), priority: bool(c.priority) };
  return out;
}

function sanitizeServiceCard(c) {
  return { id: sid(c.id), title: s(c.title), body: s(c.body) };
}

function sanitizeCopyright(p) {
  return {
    audienceCards: p.audienceCards.map(sanitizeAudienceCard),
    serviceCards:  p.serviceCards.map(sanitizeServiceCard),
    damagesData:   p.damagesData.map(d => ({
      id:      sid(d.id),
      name:    s(d.name),
      amountB: Number(d.amountB),
      label:   s(d.label),
      type:    s(d.type),
      badge:   s(d.badge),
      basis:   s(d.basis),
      source:  s(d.source),
    })),
  };
}
