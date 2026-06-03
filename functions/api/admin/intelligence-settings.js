/* Intelligence global settings endpoint.

   Storage: src/data/intelligence-settings.json in the MAIN repo.
   v1 manages only voice.default; voice.external / voice.internal are reserved
   (kept as null) for a future public-vs-internal voice split.

   GET  → { ok, settings }
   PUT  → save { voice:{ default, external, internal } }
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const SETTINGS_PATH = "src/data/intelligence-settings.json";

function normalizeSettings(raw, prev) {
  const r = raw || {};
  const v = r.voice || {};
  const prevVoice = (prev && prev.voice) || {};
  return {
    voice: {
      default: typeof v.default === "string" ? v.default : (prevVoice.default || ""),
      // external/internal are reserved — accept a string if provided, else preserve/keep null
      external: typeof v.external === "string" ? v.external : (prevVoice.external ?? null),
      internal: typeof v.internal === "string" ? v.internal : (prevVoice.internal ?? null),
    },
  };
}

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const method = request.method.toUpperCase();

  if (method === "GET") {
    const r = await getFileFromGitHub(env, SETTINGS_PATH, "intelligence-settings.json");
    if (!r.ok) return jsonResponse({ ok: false, error: r.error }, 500);
    return jsonResponse({ ok: true, settings: r.data || {} });
  }

  if (method === "PUT") {
    const current = await getFileFromGitHub(env, SETTINGS_PATH, "intelligence-settings.json");
    if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 500);

    const prev = current.data || {};
    const next = normalizeSettings(await request.json(), prev);
    // preserve the file's _comment
    const body = {};
    if (prev._comment) body._comment = prev._comment;
    body.voice = next.voice;

    const content = JSON.stringify(body, null, 2) + "\n";
    const saved = await commitFileToGitHub(
      env, SETTINGS_PATH, content, current.sha, "Update Intelligence voice default"
    );
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
