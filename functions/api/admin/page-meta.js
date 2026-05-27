import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

/* Read/write src/data/page-meta.json — site-level metadata + per-page OG/SEO.

   GET  /api/admin/page-meta  → { ok: true, data: <page-meta.json>, sha }
   PUT  /api/admin/page-meta  → { ok: true, commitSha }
   Body for PUT: { site: { name, defaultTitle, defaultDescription }, pages: [...] }

   Each page entry: { path, title, description, og }
   - path:        exact pathname, must start with "/"
   - title:       page <title> and og:title
   - description: meta description and og:description
   - og:          slug for the dynamic OG image (home|crypto|ai-copyright|litigation-finance)
*/

const META_PATH = "src/data/page-meta.json";

const VALID_OG_SLUGS = new Set(["home", "crypto", "ai-copyright", "litigation-finance"]);

const MAX_PAGES       = 50;
const MAX_STR_SHORT   = 200;
const MAX_STR_LONG    = 600;
const MAX_PATH_LEN    = 300;

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const result = await getFileFromGitHub(env, META_PATH, "page-meta.json");
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

  // Validate site object
  const siteErr = validateSite(body.site);
  if (siteErr) return jsonResponse({ ok: false, error: siteErr }, 400);

  // Validate pages array
  if (!Array.isArray(body.pages)) {
    return jsonResponse({ ok: false, error: "'pages' must be an array" }, 400);
  }
  if (body.pages.length > MAX_PAGES) {
    return jsonResponse({ ok: false, error: `Too many pages (max ${MAX_PAGES})` }, 400);
  }
  const pagesErr = validatePages(body.pages);
  if (pagesErr) return jsonResponse({ ok: false, error: pagesErr }, 400);

  // Re-fetch latest SHA before committing
  const current = await getFileFromGitHub(env, META_PATH, "page-meta.json");
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  // Preserve the _comment field from the existing file
  const existingComment = (current.data && current.data._comment) || undefined;

  const sanitized = {
    ...(existingComment ? { _comment: existingComment } : {}),
    site:  normalizeSite(body.site),
    pages: body.pages.map(normalizePage),
  };

  const newContent = JSON.stringify(sanitized, null, 2) + "\n";
  const result = await commitFileToGitHub(
    env, META_PATH, newContent, current.sha,
    "Admin: update page-meta.json",
  );
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

/* ── Validation ──────────────────────────────────────────────────────────── */

function validateSite(site) {
  if (!site || typeof site !== "object") return "'site' must be an object";
  if (typeof site.name !== "string" || !site.name.trim()) return "site.name is required";
  if (typeof site.defaultTitle !== "string" || !site.defaultTitle.trim()) return "site.defaultTitle is required";
  if (typeof site.defaultDescription !== "string" || !site.defaultDescription.trim()) return "site.defaultDescription is required";
  return null;
}

function validatePages(pages) {
  const seenPaths = new Set();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (!p || typeof p !== "object") return `pages[${i}] is not an object`;
    if (typeof p.path !== "string" || !p.path.trim()) return `pages[${i}].path is required`;
    if (!p.path.trim().startsWith("/")) return `pages[${i}].path must start with "/"`;
    if (typeof p.title !== "string" || !p.title.trim()) return `pages[${i}].title is required`;
    if (typeof p.description !== "string" || !p.description.trim()) return `pages[${i}].description is required`;
    if (typeof p.og !== "string" || !VALID_OG_SLUGS.has(p.og.trim())) {
      return `pages[${i}].og must be one of: ${[...VALID_OG_SLUGS].join(", ")}`;
    }
    const path = p.path.trim();
    if (seenPaths.has(path)) return `pages[${i}].path "${path}" is duplicated`;
    seenPaths.add(path);
  }
  return null;
}

/* ── Normalisation ───────────────────────────────────────────────────────── */

function normalizeSite(site) {
  return {
    name:               String(site.name).trim().slice(0, MAX_STR_SHORT),
    defaultTitle:       String(site.defaultTitle).trim().slice(0, MAX_STR_SHORT),
    defaultDescription: String(site.defaultDescription).trim().slice(0, MAX_STR_LONG),
  };
}

function normalizePage(p) {
  return {
    path:        String(p.path).trim().slice(0, MAX_PATH_LEN),
    title:       String(p.title).trim().slice(0, MAX_STR_SHORT),
    description: String(p.description).trim().slice(0, MAX_STR_LONG),
    og:          String(p.og).trim(),
  };
}
