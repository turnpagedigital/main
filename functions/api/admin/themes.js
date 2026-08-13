/* Themes CRUD endpoint — manages the standing "beats" Andrew covers.

   Storage: a single JSON file in the MAIN repo (default GITHUB_REPO):
     src/data/themes.json  →  { "_comment": "...", "themes": [ {…}, … ] }

   Each request read-modify-writes the whole file with its current SHA
   (optimistic concurrency). Volume is tiny (handful of themes), so this is
   simple and safe.

   This is the INPUT layer only — nothing here triggers scraping/briefing yet.
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, commitFilesToGitHub } from "./_github.js";

const THEMES_PATH = "src/data/themes.json";
const PUBLIC_PATH = "briefing-generator/themes.json";  // slim projection the intel pages fetch
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
      // Theme-specific trusted sources only; the blocklist is global (Defaults).
      whitelist: cleanStringList(src.whitelist),
    },
    // Slugs of tracked cases this beat's daily briefing must cover
    // (set in the theme editor; read by generate.py).
    key_focus_cases: cleanStringList(t.key_focus_cases),
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
  const showEmojis = data.show_emojis !== false;
  return { ok: true, themes, comment, showEmojis, sha: r.sha };
}

async function saveThemesFile(env, themes, comment, showEmojis, message) {
  const body = {};
  if (comment) body._comment = comment;
  body.show_emojis = showEmojis !== false;
  body.themes = themes;
  // Slim public projection (no keywords/guidance) for the intel pages.
  const pub = {
    show_emojis: showEmojis !== false,
    themes: themes.map(t => ({
      slug: t.slug,
      display_name: t.display_name,
      emoji: t.emoji || "",
      active: t.active !== false,
    })),
  };
  return commitFilesToGitHub(env, [
    { path: THEMES_PATH, content: JSON.stringify(body, null, 2) + "\n" },
    { path: PUBLIC_PATH, content: JSON.stringify(pub, null, 2) + "\n" },
  ], message);
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
    return jsonResponse({ ok: true, themes: f.themes, show_emojis: f.showEmojis });
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
    const saved = await saveThemesFile(env, next, f.comment, f.showEmojis, `Add theme: ${theme.display_name}`);
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
    return jsonResponse({ ok: true, slug: theme.slug });
  }

  // PUT — update an existing theme (matched by slug)
  if (method === "PUT") {
    const f = await loadThemesFile(env);
    if (!f.ok) return jsonResponse({ ok: false, error: f.error }, 500);

    const raw = await request.json();
    // Flag-only update: { show_emojis: bool } with no slug toggles the
    // site-wide emoji display without touching any theme record.
    if (raw && typeof raw.show_emojis === "boolean" && !raw.slug) {
      const saved = await saveThemesFile(env, f.themes, f.comment, raw.show_emojis, `Theme emojis ${raw.show_emojis ? "on" : "off"}`);
      if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
      return jsonResponse({ ok: true, show_emojis: raw.show_emojis });
    }
    const theme = normalizeTheme(raw);
    const existingSlugs = f.themes.map(t => t.slug);
    const err = validateTheme(theme, false, existingSlugs);
    if (err) return jsonResponse({ ok: false, error: err }, 400);

    const next = f.themes.map(t => (t.slug === theme.slug ? theme : t));
    const saved = await saveThemesFile(env, next, f.comment, f.showEmojis, `Update theme: ${theme.display_name}`);
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
    const saved = await saveThemesFile(env, next, f.comment, f.showEmojis, `Remove theme: ${slug}`);
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
