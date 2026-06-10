import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";
import { detectRouteReferences, applyRouteReferences } from "./_routes.js";

/* Routes admin API — read/write src/data/routes.json + cascade changes to nav.json.

   GET  /api/admin/routes                         → list routes
   PUT  /api/admin/routes?oldPath=X&newPath=Y      → preview cascade changes (no commit)
   POST /api/admin/routes                          → apply route rename + cascade
*/

const ROUTES_PATH = "src/data/routes.json";
const NAV_PATH    = "src/data/nav.json";

/**
 * GET /api/admin/routes — return the current routes.json
 */
export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const result = await getFileFromGitHub(env, ROUTES_PATH);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);
  return jsonResponse({ ok: true, routes: result.data?.routes || [] });
}

/**
 * PUT /api/admin/routes?oldPath=X&newPath=Y
 * Detects cascade changes WITHOUT committing them.
 * Returns the list of nav.json references that would be updated.
 */
export async function onRequestPut({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const url = new URL(request.url);
  const oldPath = url.searchParams.get("oldPath");
  const newPath = url.searchParams.get("newPath");

  if (!oldPath || !newPath) {
    return jsonResponse({ ok: false, error: "Missing oldPath or newPath query params" }, 400);
  }
  if (!oldPath.startsWith("/") || !newPath.startsWith("/")) {
    return jsonResponse({ ok: false, error: "Paths must start with /" }, 400);
  }

  // Fetch current nav.json to detect references
  const navResult = await getFileFromGitHub(env, NAV_PATH);
  if (!navResult.ok) return jsonResponse({ ok: false, error: navResult.error }, 502);

  const changes = detectRouteReferences(oldPath, newPath, navResult.data);
  return jsonResponse({ ok: true, changes });
}

/**
 * POST /api/admin/routes
 * Applies the route change:
 *   1. Validates and commits updated routes.json
 *   2. Applies cascade changes to nav.json if provided
 */
export async function onRequestPost({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const { routes, oldPath, newPath, applyChanges } = body || {};

  if (!routes || !oldPath || !newPath) {
    return jsonResponse({ ok: false, error: "Missing routes, oldPath, or newPath in body" }, 400);
  }
  if (!Array.isArray(routes)) {
    return jsonResponse({ ok: false, error: "Routes must be an array" }, 400);
  }

  // Check for duplicate paths
  const paths = routes.map(r => r.path);
  if (new Set(paths).size !== paths.length) {
    return jsonResponse({ ok: false, error: "Duplicate route paths found" }, 400);
  }

  // Check for duplicate keys
  const keys = routes.map(r => r.key);
  if (new Set(keys).size !== keys.length) {
    return jsonResponse({ ok: false, error: "Duplicate route keys found" }, 400);
  }

  // Commit routes.json
  const routesResult = await getFileFromGitHub(env, ROUTES_PATH);
  if (!routesResult.ok) return jsonResponse({ ok: false, error: routesResult.error }, 502);
  if (!routesResult.data) return jsonResponse({ ok: false, error: "Failed to parse routes.json" }, 502);

  const routesPayload = JSON.stringify(
    {
      _comment: "Route definitions — path (URL slug) → component mapping. Managed via /admin/routes. All paths must be unique. Dynamic routes use :slug pattern exactly once.",
      routes,
    },
    null,
    2
  ) + "\n";

  const routesCommit = await commitFileToGitHub(
    env,
    ROUTES_PATH,
    routesPayload,
    routesResult.sha,
    `Routes: rename ${oldPath} → ${newPath}`,
  );
  if (!routesCommit.ok) return jsonResponse({ ok: false, error: routesCommit.error }, 502);

  // Commit nav.json if cascade changes were approved
  if (applyChanges && applyChanges.length > 0) {
    const navResult = await getFileFromGitHub(env, NAV_PATH);
    if (!navResult.ok) return jsonResponse({ ok: false, error: navResult.error }, 502);
    if (!navResult.data) return jsonResponse({ ok: false, error: "Failed to parse nav.json" }, 502);

    const updatedNavData = applyRouteReferences(navResult.data, applyChanges);
    const navPayload = JSON.stringify(updatedNavData, null, 2) + "\n";
    const navCommit = await commitFileToGitHub(
      env,
      NAV_PATH,
      navPayload,
      navResult.sha,
      `Nav: update refs for route rename ${oldPath} → ${newPath}`,
    );
    if (!navCommit.ok) return jsonResponse({ ok: false, error: navCommit.error }, 502);
  }

  return jsonResponse({
    ok: true,
    message: `Route renamed from ${oldPath} to ${newPath}`,
  });
}
