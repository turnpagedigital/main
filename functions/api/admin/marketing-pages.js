import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

/* Read/write the three marketing page content JSON files.

   GET  /api/admin/marketing-pages
     → { ok: true, data: { crypto, aiCopyright, litigationFinance } }

   PUT  /api/admin/marketing-pages
     Body: { crypto?, aiCopyright?, litigationFinance? }
     Each key present in the body triggers a separate commit for that file.
     → { ok: true, commits: { crypto?, aiCopyright?, litigationFinance? } }

   Auth required (session cookie).
*/

const PATHS = {
  crypto:            "src/data/crypto-content.json",
  aiCopyright:       "src/data/ai-copyright-content.json",
  litigationFinance: "src/data/litigation-finance-content.json",
};

/* ── Field length limits ─────────────────────────────────────────────────── */
const MAX_ITEMS   = 30;
const MAX_STR     = 1200;
const MAX_ID      = 80;

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
    case "crypto":
      return validateCrypto(payload);
    case "aiCopyright":
      return validateAICopyright(payload);
    case "litigationFinance":
      return validateLitFin(payload);
    default:
      return `Unknown key: ${key}`;
  }
}

function validateCrypto(p) {
  if (!Array.isArray(p.audienceCards)) return "crypto.audienceCards must be an array";
  if (!Array.isArray(p.serviceCards)) return "crypto.serviceCards must be an array";
  if (p.audienceCards.length > MAX_ITEMS) return `Too many audienceCards (max ${MAX_ITEMS})`;
  if (p.serviceCards.length > MAX_ITEMS) return `Too many serviceCards (max ${MAX_ITEMS})`;
  const a = validateAudienceCards(p.audienceCards, "crypto.audienceCards");
  if (a) return a;
  const s = validateServiceCards(p.serviceCards, "crypto.serviceCards");
  if (s) return s;
  if (p.comparison) {
    const c = validateComparison(p.comparison, "crypto.comparison");
    if (c) return c;
  }
  return null;
}

function validateAICopyright(p) {
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

function validateLitFin(p) {
  if (!Array.isArray(p.audienceCards)) return "litigationFinance.audienceCards must be an array";
  if (!Array.isArray(p.serviceCards)) return "litigationFinance.serviceCards must be an array";
  if (!Array.isArray(p.howItWorks)) return "litigationFinance.howItWorks must be an array";
  if (!Array.isArray(p.faqs)) return "litigationFinance.faqs must be an array";
  if (p.audienceCards.length > MAX_ITEMS) return `Too many audienceCards (max ${MAX_ITEMS})`;
  if (p.serviceCards.length > MAX_ITEMS) return `Too many serviceCards (max ${MAX_ITEMS})`;
  if (p.howItWorks.length > MAX_ITEMS) return `Too many howItWorks steps (max ${MAX_ITEMS})`;
  if (p.faqs.length > MAX_ITEMS) return `Too many faqs (max ${MAX_ITEMS})`;
  const a = validateAudienceCards(p.audienceCards, "litigationFinance.audienceCards");
  if (a) return a;
  const s = validateServiceCards(p.serviceCards, "litigationFinance.serviceCards");
  if (s) return s;
  const h = validateHowItWorks(p.howItWorks);
  if (h) return h;
  const f = validateFAQs(p.faqs);
  if (f) return f;
  if (p.comparison) {
    const c = validateComparison(p.comparison, "litigationFinance.comparison");
    if (c) return c;
  }
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

function validateHowItWorks(steps) {
  const seen = new Set();
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s || typeof s !== "object") return `howItWorks[${i}] is not an object`;
    if (typeof s.id !== "string" || !s.id.trim()) return `howItWorks[${i}].id is required`;
    if (seen.has(s.id.trim())) return `howItWorks[${i}].id "${s.id}" is duplicated`;
    seen.add(s.id.trim());
    if (typeof s.title !== "string" || !s.title.trim()) return `howItWorks[${i}].title is required`;
    if (typeof s.body !== "string" || !s.body.trim()) return `howItWorks[${i}].body is required`;
  }
  return null;
}

function validateFAQs(faqs) {
  const seen = new Set();
  for (let i = 0; i < faqs.length; i++) {
    const f = faqs[i];
    if (!f || typeof f !== "object") return `faqs[${i}] is not an object`;
    if (typeof f.id !== "string" || !f.id.trim()) return `faqs[${i}].id is required`;
    if (seen.has(f.id.trim())) return `faqs[${i}].id "${f.id}" is duplicated`;
    seen.add(f.id.trim());
    if (typeof f.q !== "string" || !f.q.trim()) return `faqs[${i}].q is required`;
    if (typeof f.a !== "string" || !f.a.trim()) return `faqs[${i}].a is required`;
  }
  return null;
}

function validateComparison(cmp, label) {
  if (!cmp || typeof cmp !== "object") return `${label} must be an object`;
  if (!cmp.oldWay || !cmp.newWay) return `${label} must have oldWay and newWay`;
  if (typeof cmp.oldWay.title !== "string") return `${label}.oldWay.title must be a string`;
  if (!Array.isArray(cmp.oldWay.items)) return `${label}.oldWay.items must be an array`;
  if (typeof cmp.newWay.title !== "string") return `${label}.newWay.title must be a string`;
  if (!Array.isArray(cmp.newWay.items)) return `${label}.newWay.items must be an array`;
  return null;
}

/* ── Sanitisation ────────────────────────────────────────────────────────── */

function sanitizePayload(key, payload) {
  switch (key) {
    case "crypto":       return sanitizeCrypto(payload);
    case "aiCopyright":  return sanitizeAICopyright(payload);
    case "litigationFinance": return sanitizeLitFin(payload);
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

function sanitizeComparison(cmp) {
  return {
    oldWay: {
      title: s(cmp.oldWay.title),
      items: Array.isArray(cmp.oldWay.items) ? cmp.oldWay.items.map(i => s(i)) : [],
    },
    newWay: {
      title: s(cmp.newWay.title),
      items: Array.isArray(cmp.newWay.items) ? cmp.newWay.items.map(i => s(i)) : [],
    },
  };
}

function sanitizeCrypto(p) {
  const out = {
    audienceCards: p.audienceCards.map(sanitizeAudienceCard),
    serviceCards:  p.serviceCards.map(sanitizeServiceCard),
  };
  if (p.comparison) out.comparison = sanitizeComparison(p.comparison);
  return out;
}

function sanitizeAICopyright(p) {
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

function sanitizeLitFin(p) {
  const out = {
    audienceCards: p.audienceCards.map(sanitizeAudienceCard),
    serviceCards:  p.serviceCards.map(sanitizeServiceCard),
    howItWorks: p.howItWorks.map(step => ({
      id:    sid(step.id),
      n:     s(step.n),
      title: s(step.title),
      body:  s(step.body),
    })),
    faqs: p.faqs.map(f => ({
      id: sid(f.id),
      q:  s(f.q),
      a:  s(f.a),
    })),
  };
  if (p.comparison) out.comparison = sanitizeComparison(p.comparison);
  return out;
}
