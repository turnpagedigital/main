/* Page compositions API — manages the section layout of every page.

   Storage:
   - src/data/page-compositions.json — ordered section lists per page
   - src/data/routes.json            — route registrations (also updated on POST/DELETE)

   GET  → { ok, pages, sectionTypes }
   PUT  → update one page's sections (reorder, toggle visibility, edit content)
          body: { pageKey, sections: [...] }
   POST → create a new custom page
          body: { pageKey, title, path }  (sections starts empty)
   DELETE ?pageKey=X → remove a custom page (builtIn pages are protected)
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const COMPOSITIONS_PATH = "src/data/page-compositions.json";
const ROUTES_PATH        = "src/data/routes.json";
const SECTION_TYPES_PATH = "src/data/section-types.json";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function isValidPageKey(k) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(k) && k.length > 0 && k.length <= 80;
}

function isValidPath(p) {
  return /^\/[a-z0-9/-]*$/.test(p) && p.length > 1 && p.length <= 120;
}

function normalizeSection(s) {
  if (!s || typeof s !== "object") return null;
  if (typeof s.type !== "string" || !s.type.trim()) return null;
  return {
    id:      typeof s.id === "string" && s.id.trim() ? s.id.trim() : `sec-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    type:    s.type.trim(),
    visible: s.visible !== false,
    // Only persist content if it's a non-empty object
    ...(s.content && typeof s.content === "object" && Object.keys(s.content).length > 0
      ? { content: s.content }
      : {}),
  };
}

async function loadFile(env, path, label) {
  const r = await getFileFromGitHub(env, path, label);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, data: r.data || {}, sha: r.sha };
}

async function saveFile(env, path, data, sha, message) {
  const content = JSON.stringify(data, null, 2) + "\n";
  return commitFileToGitHub(env, path, content, sha, message);
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const method = request.method.toUpperCase();
  const url    = new URL(request.url);

  /* ── GET ──────────────────────────────────────────────────────────────── */
  if (method === "GET") {
    const [comp, types] = await Promise.all([
      loadFile(env, COMPOSITIONS_PATH, "page-compositions.json"),
      loadFile(env, SECTION_TYPES_PATH, "section-types.json"),
    ]);
    if (!comp.ok) return jsonResponse({ ok: false, error: comp.error }, 500);
    return jsonResponse({
      ok: true,
      pages:        (comp.data.pages || []),
      sectionTypes: (types.ok ? (types.data.sectionTypes || []) : []),
    });
  }

  /* ── PUT ─ update one page's sections ────────────────────────────────── */
  if (method === "PUT") {
    const body = await request.json().catch(() => null);
    if (!body || !body.pageKey) {
      return jsonResponse({ ok: false, error: "pageKey is required" }, 400);
    }

    const sections = Array.isArray(body.sections)
      ? body.sections.map(normalizeSection).filter(Boolean)
      : null;

    if (sections === null) {
      return jsonResponse({ ok: false, error: "sections must be an array" }, 400);
    }

    const comp = await loadFile(env, COMPOSITIONS_PATH, "page-compositions.json");
    if (!comp.ok) return jsonResponse({ ok: false, error: comp.error }, 500);

    const pages = comp.data.pages || [];
    const idx   = pages.findIndex(p => p.pageKey === body.pageKey);
    if (idx === -1) {
      return jsonResponse({ ok: false, error: `Page "${body.pageKey}" not found` }, 404);
    }

    // Optionally update title / path
    const updated = { ...pages[idx], sections };
    if (typeof body.title === "string" && body.title.trim() && !updated.builtIn) {
      updated.title = body.title.trim();
    }

    const next = [...pages];
    next[idx] = updated;

    const comment = comp.data._comment;
    const payload = {};
    if (comment) payload._comment = comment;
    payload.pages = next;

    const saved = await saveFile(env, COMPOSITIONS_PATH, payload, comp.sha, `Update page layout: ${body.pageKey}`);
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
    return jsonResponse({ ok: true });
  }

  /* ── POST ─ create a new custom page ─────────────────────────────────── */
  if (method === "POST") {
    const body = await request.json().catch(() => null);
    if (!body) return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);

    const pageKey = (body.pageKey || "").trim();
    const title   = (body.title   || "").trim();
    const path    = (body.path    || "").trim();

    if (!pageKey)              return jsonResponse({ ok: false, error: "pageKey is required" }, 400);
    if (!isValidPageKey(pageKey)) return jsonResponse({ ok: false, error: "pageKey must be kebab-case" }, 400);
    if (!title)                return jsonResponse({ ok: false, error: "title is required" }, 400);
    if (!path)                 return jsonResponse({ ok: false, error: "path is required" }, 400);
    if (!isValidPath(path))    return jsonResponse({ ok: false, error: "path must start with / and contain only a-z, 0-9, hyphens, slashes" }, 400);

    const [comp, routes] = await Promise.all([
      loadFile(env, COMPOSITIONS_PATH, "page-compositions.json"),
      loadFile(env, ROUTES_PATH,       "routes.json"),
    ]);
    if (!comp.ok)   return jsonResponse({ ok: false, error: comp.error },   500);
    if (!routes.ok) return jsonResponse({ ok: false, error: routes.error }, 500);

    const pages      = comp.data.pages      || [];
    const routesList = routes.data.routes   || [];

    // Check uniqueness
    if (pages.some(p => p.pageKey === pageKey)) {
      return jsonResponse({ ok: false, error: `A page with key "${pageKey}" already exists` }, 400);
    }
    if (routesList.some(r => r.path === path)) {
      return jsonResponse({ ok: false, error: `A route at path "${path}" already exists` }, 400);
    }

    // Add to compositions
    const newPage = { pageKey, title, path, builtIn: false, sections: [] };
    const nextPages = [...pages, newPage];
    const compPayload = {};
    if (comp.data._comment) compPayload._comment = comp.data._comment;
    compPayload.pages = nextPages;

    // Add to routes
    const newRoute = { path, key: pageKey, component: "DynamicPage", dynamic: false, title };
    const nextRoutes = [...routesList, newRoute];
    const routesPayload = {};
    if (routes.data._comment) routesPayload._comment = routes.data._comment;
    routesPayload.routes = nextRoutes;

    // Commit both files
    const [s1, s2] = await Promise.all([
      saveFile(env, COMPOSITIONS_PATH, compPayload,   comp.sha,   `Create page: ${title} (${path})`),
      saveFile(env, ROUTES_PATH,       routesPayload, routes.sha, `Register route: ${path} → ${pageKey}`),
    ]);
    if (!s1.ok) return jsonResponse({ ok: false, error: `Failed to save compositions: ${s1.error}` }, 500);
    if (!s2.ok) return jsonResponse({ ok: false, error: `Failed to save routes: ${s2.error}` },       500);

    return jsonResponse({ ok: true, pageKey });
  }

  /* ── DELETE ─ remove a custom page ──────────────────────────────────── */
  if (method === "DELETE") {
    const pageKey = url.searchParams.get("pageKey");
    if (!pageKey || !isValidPageKey(pageKey)) {
      return jsonResponse({ ok: false, error: "Invalid pageKey parameter" }, 400);
    }

    const [comp, routes] = await Promise.all([
      loadFile(env, COMPOSITIONS_PATH, "page-compositions.json"),
      loadFile(env, ROUTES_PATH,       "routes.json"),
    ]);
    if (!comp.ok)   return jsonResponse({ ok: false, error: comp.error },   500);
    if (!routes.ok) return jsonResponse({ ok: false, error: routes.error }, 500);

    const pages      = comp.data.pages      || [];
    const routesList = routes.data.routes   || [];

    const page = pages.find(p => p.pageKey === pageKey);
    if (!page) return jsonResponse({ ok: false, error: `Page "${pageKey}" not found` }, 404);
    if (page.builtIn) {
      return jsonResponse({ ok: false, error: "Built-in pages cannot be deleted" }, 403);
    }

    const nextPages  = pages.filter(p => p.pageKey !== pageKey);
    const nextRoutes = routesList.filter(r => r.key  !== pageKey);

    const compPayload   = {};
    const routesPayload = {};
    if (comp.data._comment)   compPayload._comment   = comp.data._comment;
    if (routes.data._comment) routesPayload._comment = routes.data._comment;
    compPayload.pages    = nextPages;
    routesPayload.routes = nextRoutes;

    const [s1, s2] = await Promise.all([
      saveFile(env, COMPOSITIONS_PATH, compPayload,   comp.sha,   `Delete page: ${pageKey}`),
      saveFile(env, ROUTES_PATH,       routesPayload, routes.sha, `Remove route: ${pageKey}`),
    ]);
    if (!s1.ok) return jsonResponse({ ok: false, error: `Failed to remove from compositions: ${s1.error}` }, 500);
    if (!s2.ok) return jsonResponse({ ok: false, error: `Failed to remove from routes: ${s2.error}` },       500);

    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
