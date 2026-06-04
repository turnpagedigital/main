/* Section types registry — read-only endpoint.
   Returns the list of available pre-built section types from
   src/data/section-types.json. Adding a new renderer requires a code deploy;
   this endpoint is read-only from the admin's perspective.

   GET → { ok, sectionTypes: [...] }
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub } from "./_github.js";

const TYPES_PATH = "src/data/section-types.json";

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  if (request.method.toUpperCase() !== "GET") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const r = await getFileFromGitHub(env, TYPES_PATH, "section-types.json");
  if (!r.ok) return jsonResponse({ ok: false, error: r.error }, 500);
  return jsonResponse({ ok: true, sectionTypes: (r.data && r.data.sectionTypes) || [] });
}
