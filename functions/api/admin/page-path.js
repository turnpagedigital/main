import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, commitFilesToGitHub } from "./_github.js";
import { detectRouteReferences, applyRouteReferences, buildRedirects } from "./_routes.js";

// Re-exported for callers (and tests) that already reach for it here.
export { buildRedirects };

/* PUT /api/admin/page-path — change a page's URL path and cascade the change.

   Updates, in ONE atomic commit:
     1. src/data/routes.json            — the route's path
     2. src/data/nav.json               — nav items, dropdown links/CTAs, microsites
     3. src/data/footer.json            — footer column links
     4. src/data/page-compositions.json — the page's own path field + any href
                                          in section content pointing at the old path
     5. public/_redirects               — Cloudflare Pages redirect rule
                                          "oldPath newPath 301" (live on next deploy)

   Body: { pageKey, oldPath, newPath }
*/

const ROUTES_PATH       = "src/data/routes.json";
const NAV_PATH          = "src/data/nav.json";
const FOOTER_PATH       = "src/data/footer.json";
const COMPOSITIONS_PATH = "src/data/page-compositions.json";
const REDIRECTS_PATH    = "public/_redirects";

// Lowercase letters, numbers, dashes, slashes. No dots — also rules out traversal.
const PATH_RE = /^\/[a-z0-9\-/]*$/;

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

  const pageKey = typeof body?.pageKey === "string" ? body.pageKey.trim() : "";
  const oldPath = typeof body?.oldPath === "string" ? body.oldPath.trim() : "";
  const newPath = typeof body?.newPath === "string" ? body.newPath.trim() : "";

  if (!pageKey || !oldPath || !newPath) {
    return jsonResponse({ ok: false, error: "Missing pageKey, oldPath, or newPath" }, 400);
  }
  if (!PATH_RE.test(newPath)) {
    return jsonResponse({ ok: false, error: "Path must start with / and use only lowercase letters, numbers, and dashes" }, 400);
  }
  if (oldPath === newPath) {
    return jsonResponse({ ok: false, error: "New path is the same as the current path" }, 400);
  }

  // ── Load all four data files up front ────────────────────────────────────
  const [routes, nav, footer, comp] = await Promise.all([
    getFileFromGitHub(env, ROUTES_PATH),
    getFileFromGitHub(env, NAV_PATH),
    getFileFromGitHub(env, FOOTER_PATH),
    getFileFromGitHub(env, COMPOSITIONS_PATH),
  ]);
  const loads = [["routes.json", routes], ["nav.json", nav], ["footer.json", footer], ["page-compositions.json", comp]];
  for (const [label, r] of loads) {
    if (!r.ok || !r.data) {
      return jsonResponse({ ok: false, error: `Failed to load ${label}: ${r.error || "empty file"}` }, 502);
    }
  }

  // ── 1. routes.json — change the route's path ─────────────────────────────
  const routesData = JSON.parse(JSON.stringify(routes.data));
  const route = (routesData.routes || []).find(r => r.key === pageKey);
  if (!route) {
    return jsonResponse({ ok: false, error: `Page key "${pageKey}" not found in routes.json` }, 404);
  }
  if ((routesData.routes || []).some(r => r.key !== pageKey && r.path === newPath)) {
    return jsonResponse({ ok: false, error: `Another page already uses the path ${newPath}` }, 400);
  }
  route.path = newPath;

  // ── 2. nav.json — shared cascade helpers (items, dropdowns, microsites) ──
  const navChanges = detectRouteReferences(oldPath, newPath, nav.data);
  const navData = applyRouteReferences(nav.data, navChanges);

  // ── 3. footer.json — column links ─────────────────────────────────────────
  const footerData = JSON.parse(JSON.stringify(footer.data));
  (footerData.columns || []).forEach(col => {
    (col.links || []).forEach(link => {
      if (link.href === oldPath) link.href = newPath;
    });
  });

  // ── 4. page-compositions.json — own path + hrefs in section content ──────
  const compData = JSON.parse(JSON.stringify(comp.data));
  const page = (compData.pages || []).find(p => p.pageKey === pageKey);
  if (page) page.path = newPath;
  const updateHrefs = (node) => {
    if (Array.isArray(node)) { node.forEach(updateHrefs); return; }
    if (node && typeof node === "object") {
      if (node.href === oldPath) node.href = newPath;
      Object.values(node).forEach(updateHrefs);
    }
  };
  (compData.pages || []).forEach(p => (p.sections || []).forEach(s => updateHrefs(s.content)));

  // ── 5. public/_redirects — permanent redirect from the old path ──────────
  //    (missing file is fine: it's created in the same commit)
  const redirects = await getFileFromGitHub(env, REDIRECTS_PATH);
  const redirectsContent = buildRedirects(redirects.ok ? redirects.text : "", oldPath, newPath);

  // ── Commit all five files in ONE atomic commit — applied together or not
  //    at all, so the route/nav/footer/compositions can never drift apart. ──
  const saved = await commitFilesToGitHub(env, [
    { path: ROUTES_PATH,       content: JSON.stringify(routesData, null, 2) + "\n", sha: routes.sha },
    { path: NAV_PATH,          content: JSON.stringify(navData, null, 2) + "\n",    sha: nav.sha },
    { path: FOOTER_PATH,       content: JSON.stringify(footerData, null, 2) + "\n", sha: footer.sha },
    { path: COMPOSITIONS_PATH, content: JSON.stringify(compData, null, 2) + "\n",   sha: comp.sha },
    { path: REDIRECTS_PATH,    content: redirectsContent, sha: redirects.ok ? redirects.sha : undefined },
  ], `Page path: ${oldPath} → ${newPath}`);
  if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 502);

  return jsonResponse({
    ok: true,
    message: `Path updated: ${oldPath} → ${newPath}. A 301 redirect goes live on the next deploy.`,
    pages: compData.pages,
  });
}
