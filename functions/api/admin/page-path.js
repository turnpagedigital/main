import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";
import { detectRouteReferences, applyRouteReferences } from "./_routes.js";

/* PUT /api/admin/page-path — change a page's URL path and cascade the change.

   Updates, in order:
     1. src/data/routes.json            — the route's path
     2. src/data/nav.json               — nav items, dropdown links/CTAs, microsites
     3. src/data/footer.json            — footer column links
     4. src/data/page-compositions.json — the page's own path field + any href
                                          in section content pointing at the old path

   Body: { pageKey, oldPath, newPath }
   Idempotent: re-running after a partial failure finishes the cascade.
*/

const ROUTES_PATH       = "src/data/routes.json";
const NAV_PATH          = "src/data/nav.json";
const FOOTER_PATH       = "src/data/footer.json";
const COMPOSITIONS_PATH = "src/data/page-compositions.json";

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

  // ── Commit sequentially; on failure report exactly how far we got ────────
  const commits = [
    [ROUTES_PATH,       routesData, routes.sha],
    [NAV_PATH,          navData,    nav.sha],
    [FOOTER_PATH,       footerData, footer.sha],
    [COMPOSITIONS_PATH, compData,   comp.sha],
  ];
  const committed = [];
  for (const [path, data, sha] of commits) {
    const name = path.split("/").pop();
    const result = await commitFileToGitHub(
      env, path,
      JSON.stringify(data, null, 2) + "\n",
      sha,
      `Page path: ${oldPath} → ${newPath} (${name})`,
    );
    if (!result.ok) {
      const progress = committed.length
        ? ` Already updated: ${committed.join(", ")}. Re-running the same change will finish the rest.`
        : "";
      return jsonResponse({ ok: false, error: `Failed updating ${name}: ${result.error}${progress}` }, 502);
    }
    committed.push(name);
  }

  return jsonResponse({
    ok: true,
    message: `Path updated: ${oldPath} → ${newPath}`,
    pages: compData.pages,
  });
}
