import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";
import routesData from "../../../src/data/routes.json";

const FILE_PATH = "src/data/referral-partners.json";

/* Vanity codes/aliases redirect from /<token> — they must never shadow a
   real page path (functions/_middleware.js would ignore them, silently
   breaking the partner's link). */
const RESERVED = new Set(
  routesData.routes
    .filter((r) => !r.dynamic && !r.path.includes(":"))
    .map((r) => r.path.replace(/^\//, ""))
    .filter(Boolean),
);

const CODE_RE = /^[a-z0-9][a-z0-9-]{1,59}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validatePartners(partners) {
  const seen = new Set();
  const seenEmails = new Map();
  for (const [i, p] of partners.entries()) {
    const label = p && p.name ? `"${p.name}"` : `#${i + 1}`;
    if (!p || typeof p !== "object") return `Partner ${label} is invalid`;
    if (!CODE_RE.test(p.code || "")) return `Partner ${label}: code must be lowercase letters, numbers and hyphens (2–60 chars)`;
    if (typeof p.name !== "string" || !p.name.trim()) return `Partner ${label}: name is required`;
    const aliases = Array.isArray(p.aliases) ? p.aliases : [];
    for (const a of aliases) {
      if (!CODE_RE.test(a || "")) return `Partner ${label}: alias "${a}" must be lowercase letters, numbers and hyphens`;
    }
    for (const token of [p.code, ...aliases]) {
      if (RESERVED.has(token)) return `Partner ${label}: "${token}" clashes with an existing page path`;
      if (seen.has(token)) return `Duplicate code/alias "${token}" — codes and aliases must be unique across all partners`;
      seen.add(token);
    }
    const emails = Array.isArray(p.authorizedEmails) ? p.authorizedEmails : [];
    for (const e of emails) {
      if (!EMAIL_RE.test(e || "")) return `Partner ${label}: "${e}" is not a valid email`;
      const norm = e.trim().toLowerCase();
      if (seenEmails.has(norm) && seenEmails.get(norm) !== i) {
        return `"${norm}" is authorized for two partners — an email can only belong to one (sign-in binds to whichever comes first)`;
      }
      seenEmails.set(norm, i);
    }
    if (!p.attio || p.attio.object !== "companies" && p.attio.object !== "people") {
      return `Partner ${label}: Attio record type must be "companies" or "people"`;
    }
    if (!UUID_RE.test(p.attio.record_id || "")) return `Partner ${label}: Attio record id must be a UUID`;
  }
  return null;
}

function normalizePartner(p) {
  return {
    code: p.code.trim(),
    name: p.name.trim(),
    attio: { object: p.attio.object, record_id: p.attio.record_id.trim().toLowerCase() },
    authorizedEmails: Array.isArray(p.authorizedEmails)
      ? [...new Set(p.authorizedEmails.map((e) => e.trim().toLowerCase()))]
      : [],
    active: p.active !== false,
    ...(Array.isArray(p.aliases) && p.aliases.length ? { aliases: p.aliases } : {}),
  };
}

async function fetchFile(env) {
  const res = await getFileFromGitHub(env, FILE_PATH);
  if (!res.ok) return { ok: false, error: res.error || "Could not load referral-partners.json" };
  return { ok: true, data: res.data, sha: res.sha };
}

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  const result = await fetchFile(env);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);
  return jsonResponse({ ok: true, data: result.data, sha: result.sha });
}

export async function onRequestPut({ request, env }) {
  if (!(await isAuthed(request, env))) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const { partners } = body || {};
  if (!Array.isArray(partners)) return jsonResponse({ ok: false, error: "Payload must include 'partners' array" }, 400);

  const err = validatePartners(partners);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const merged = {
    _comment: (current.data && current.data._comment) || undefined,
    partners: partners.map(normalizePartner),
  };
  Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFileToGitHub(env, FILE_PATH, newContent, current.sha, "Admin: update referral-partners.json");
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);
  return jsonResponse({ ok: true, commitSha: result.sha });
}
