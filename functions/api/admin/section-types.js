/* Section types registry endpoint.
   GET  → { ok, sectionTypes: [...] } — the section-type library.
   PUT  → rename section types: body { names: { "<id>": "<displayName>" } }.
          Only the human-facing displayName is editable; the stable `id`
          (referenced by page-compositions.json and the code renderer registry)
          and every other field are preserved verbatim. Adding a NEW renderer
          still requires a code deploy.
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const TYPES_PATH = "src/data/section-types.json";
const MAX_NAME = 80;

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const method = request.method.toUpperCase();

  if (method === "GET") {
    const r = await getFileFromGitHub(env, TYPES_PATH, "section-types.json");
    if (!r.ok) return jsonResponse({ ok: false, error: r.error }, 500);
    return jsonResponse({ ok: true, sectionTypes: (r.data && r.data.sectionTypes) || [] });
  }

  if (method === "PUT") {
    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

    const names = body && body.names;
    if (!names || typeof names !== "object" || Array.isArray(names)) {
      return jsonResponse({ ok: false, error: "Payload must include a 'names' object keyed by id" }, 400);
    }
    // Validate every provided name up front.
    for (const [id, name] of Object.entries(names)) {
      if (typeof name !== "string" || !name.trim()) {
        return jsonResponse({ ok: false, error: `Name for "${id}" must be a non-empty string` }, 400);
      }
      if (name.trim().length > MAX_NAME) {
        return jsonResponse({ ok: false, error: `Name for "${id}" exceeds ${MAX_NAME} characters` }, 400);
      }
    }

    const r = await getFileFromGitHub(env, TYPES_PATH, "section-types.json");
    if (!r.ok) return jsonResponse({ ok: false, error: r.error }, 500);
    const data = r.data || {};
    const list = Array.isArray(data.sectionTypes) ? data.sectionTypes : [];

    // Apply displayName overrides by id; preserve all other fields verbatim.
    let changed = 0;
    const nextList = list.map(t => {
      if (t && Object.prototype.hasOwnProperty.call(names, t.id)) {
        const nextName = names[t.id].trim();
        if (nextName !== t.displayName) { changed++; return { ...t, displayName: nextName }; }
      }
      return t;
    });
    if (changed === 0) return jsonResponse({ ok: true, changed: 0 });

    const next = { ...data, sectionTypes: nextList };
    const content = JSON.stringify(next, null, 2) + "\n";
    const saved = await commitFileToGitHub(env, TYPES_PATH, content, r.sha, "Admin: rename section types");
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 502);
    return jsonResponse({ ok: true, changed, commitSha: saved.sha });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
