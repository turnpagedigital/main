/* Themes CRUD endpoint — manages the standing "beats" Andrew covers.

   Storage: a single JSON file in the MAIN repo (default GITHUB_REPO):
     src/data/themes.json  →  { "_comment": "...", "themes": [ {…}, … ] }

   Each request read-modify-writes the whole file with its current SHA
   (optimistic concurrency). Volume is tiny (handful of themes), so this is
   simple and safe.

   This is the INPUT layer only — nothing here triggers scraping/briefing yet.
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const THEMES_PATH = "src/data/themes.json";
const SCHEDULES = ["daily", "weekly", "manual"];

/* ── Validation & normalization ─────────────────────────────────────────── */

function isValidSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length > 0;
}

function cleanStringList(v) {
  if (!Array.isArray(v)) return [];
  return v.map(s => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
}

function normalizeTheme(raw) {
  const t = raw || {};
  const src = t.sources || {};
  return {
    slug: (t.slug || "").trim(),
    display_name: (t.display_name || "").trim(),
    emoji: (t.emoji || "⚖️").trim() || "⚖️",
    active: t.active !== false,
    page: t.page ? String(t.page).trim() : null,
    schedule: SCHEDULES.includes(t.schedule) ? t.schedule : "daily",
    keywords: cleanStringList(t.keywords),
    sources: {
      whitelist: cleanStringList(src.whitelist),
      blacklist: cleanStringList(src.blacklist),
    },
    guidance_prompt: typeof t.guidance_prompt === "string" ? t.guidance_prompt : "",
  };
}

function validateTheme(theme, isCreate, existingSlugs) {
  if (!theme.slug) return "slug is required";
  if (!isValidSlug(theme.slug)) {
    return "slug must be kebab-case (lowercase, hyphens, alphanumerics only)";
  }
  if (isCreate && existingSlugs.includes(theme.slug)) return "slug already exists";
  if (!isCreate && !existingSlugs.includes(theme.slug)) return "theme not found";
  if (!theme.display_name) return "display_name is required";
  return null;
}

/* ── File helpers ───────────────────────────────────────────────────────── */

async function loadThemesFile(env) {
  const r = await getFileFromGitHub(env, THEMES_PATH, "themes.json");
  if (!r.ok) return { ok: false, error: r.error };
  const data = r.data || {};
  const themes = Array.isArray(data.themes) ? data.themes : [];
  // preserve the file's _comment if present
  const comment = data._comment || null;
  return { ok: true, themes, comment, sha: r.sha };
}

async function saveThemesFile(env, themes, comment, sha, message) {
  const body = {};
  if (comment) body._comment = comment;
  body.themes = themes;
  const content = JSON.stringify(body, null, 2) + "\n";
  return commitFileToGitHub(env, THEMES_PATH, content, sha, message);
}

/* ── Handler ────────────────────────────────────────────────────────────── */

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const method = request.method.toUpperCase();

  // GET — list all themes
  if (method === "GET") {
    const f = await loadThemesFile(env);
    if (!f.ok) return jsonResponse({ ok: false, error: f.error }, 500);
    return jsonResponse({ ok: true, themes: f.themes });
  }

  // POST — create a new theme
  if (method === "POST") {
    const f = await loadThemesFile(env);
    if (!f.ok) return jsonResponse({ ok: false, error: f.error }, 500);

    const theme = normalizeTheme(await request.json());
    const existingSlugs = f.themes.map(t => t.slug);
    const err = validateTheme(theme, true, existingSlugs);
    if (err) return jsonResponse({ ok: false, error: err }, 400);

    const next = [...f.themes, theme];
    const saved = await saveThemesFile(env, next, f.comment, f.sha, `Add theme: ${theme.display_name}`);
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
    return jsonResponse({ ok: true, slug: theme.slug });
  }

  // PUT — update an existing theme (matched by slug)
  if (method === "PUT") {
    const f = await loadThemesFile(env);
    if (!f.ok) return jsonResponse({ ok: false, error: f.error }, 500);

    const theme = normalizeTheme(await request.json());
    const existingSlugs = f.themes.map(t => t.slug);
    const err = validateTheme(theme, false, existingSlugs);
    if (err) return jsonResponse({ ok: false, error: err }, 400);

    const next = f.themes.map(t => (t.slug === theme.slug ? theme : t));
    const saved = await saveThemesFile(env, next, f.comment, f.sha, `Update theme: ${theme.display_name}`);
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
    return jsonResponse({ ok: true, slug: theme.slug });
  }

  // DELETE — remove a theme by ?slug=
  if (method === "DELETE") {
    const slug = new URL(request.url).searchParams.get("slug");
    if (!slug || !isValidSlug(slug)) {
      return jsonResponse({ ok: false, error: "Invalid slug parameter" }, 400);
    }
    const f = await loadThemesFile(env);
    if (!f.ok) return jsonResponse({ ok: false, error: f.error }, 500);
    if (!f.themes.some(t => t.slug === slug)) {
      return jsonResponse({ ok: false, error: "theme not found" }, 404);
    }
    const next = f.themes.filter(t => t.slug !== slug);
    const saved = await saveThemesFile(env, next, f.comment, f.sha, `Remove theme: ${slug}`);
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
