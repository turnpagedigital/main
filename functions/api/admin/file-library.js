import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

/* Read/write src/data/file-library.json — the centralised library of images
   and logos shown in the admin Files tab, plus the per-environment favicon
   mapping.

   GET  /api/admin/file-library  → { ok, data, sha }
   PUT  /api/admin/file-library  → { ok, commitSha }
   Body for PUT: { files: [...], favicons: { production, preview, admin } }

   Mirrors the deals.js pattern: GET fetches from GitHub, PUT re-fetches the
   latest SHA before commit to enforce single-source-of-truth.
*/

const FILE_LIBRARY_PATH = "src/data/file-library.json";

const FAVICON_KEYS = ["production", "preview", "admin"];
const VALID_SOURCES = ["upload", "url"];

const MAX_NAME_LEN     = 120;
const MAX_URL_LEN      = 2048;
const MAX_TYPE_LEN     = 80;
const MAX_COMPANY_LEN  = 80;
const MAX_COMPANIES    = 20;
const MAX_FILES        = 2000;

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

  const files    = Array.isArray(body.files) ? body.files : null;
  const favicons = (body.favicons && typeof body.favicons === "object") ? body.favicons : null;

  if (!files)    return jsonResponse({ ok: false, error: "Payload must include 'files' array" }, 400);
  if (!favicons) return jsonResponse({ ok: false, error: "Payload must include 'favicons' object" }, 400);

  if (files.length > MAX_FILES) {
    return jsonResponse({ ok: false, error: `Too many files (max ${MAX_FILES})` }, 400);
  }

  const validationError = validateFiles(files);
  if (validationError) return jsonResponse({ ok: false, error: validationError }, 400);

  // Always re-fetch the latest SHA to enforce single-source-of-truth.
  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const merged = {
    _comment: (current.data && current.data._comment) || undefined,
    files:    files.map(normalizeFile),
    favicons: normalizeFavicons(favicons),
  };
  Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFileToGitHub(env, FILE_LIBRARY_PATH, newContent, current.sha, "Admin: update file-library.json");
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

/* ── Validation / normalisation ───────────────────────────────────────────── */

function validateFiles(files) {
  const seenIds = new Set();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f || typeof f !== "object") return `files[${i}] is not an object`;
    if (typeof f.id   !== "string" || !f.id.trim())   return `files[${i}].id is required`;
    if (typeof f.name !== "string" || !f.name.trim()) return `files[${i}].name is required`;
    if (typeof f.url  !== "string" || !f.url.trim())  return `files[${i}].url is required`;
    if (seenIds.has(f.id)) return `files[${i}].id is duplicated`;
    seenIds.add(f.id);
    if (f.companies !== undefined && !Array.isArray(f.companies)) {
      return `files[${i}].companies must be an array`;
    }
    if (Array.isArray(f.companies)) {
      for (let j = 0; j < f.companies.length; j++) {
        if (typeof f.companies[j] !== "string") return `files[${i}].companies[${j}] must be a string`;
      }
    }
    if (f.source !== undefined && !VALID_SOURCES.includes(f.source)) {
      return `files[${i}].source must be one of: ${VALID_SOURCES.join(", ")}`;
    }
  }
  return null;
}

function normalizeFile(f) {
  // Dedupe + trim + cap companies array
  const companies = Array.isArray(f.companies)
    ? Array.from(new Set(
        f.companies
          .map(c => String(c ?? "").trim().slice(0, MAX_COMPANY_LEN))
          .filter(Boolean),
      )).slice(0, MAX_COMPANIES)
    : [];

  return {
    id:        String(f.id).trim().slice(0, 80),
    name:      String(f.name).trim().slice(0, MAX_NAME_LEN),
    url:       String(f.url).trim().slice(0, MAX_URL_LEN),
    type:      String(f.type ?? "").trim().slice(0, MAX_TYPE_LEN),
    companies,
    source:    VALID_SOURCES.includes(f.source) ? f.source : "url",
    addedAt:   typeof f.addedAt === "string" && f.addedAt
                 ? f.addedAt.slice(0, 40)
                 : new Date().toISOString(),
  };
}

function normalizeFavicons(fav) {
  const out = {};
  for (const k of FAVICON_KEYS) {
    out[k] = typeof fav[k] === "string" ? fav[k].trim().slice(0, MAX_URL_LEN) : "";
  }
  return out;
}

async function fetchFile(env) {
  return getFileFromGitHub(env, FILE_LIBRARY_PATH);
}
