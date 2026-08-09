/* Intelligence global settings endpoint.

   Storage: src/data/intelligence-settings.json in the MAIN repo.
   voice.default = the HOUSE voice (briefings), edited in Admin → Intelligence
   → Defaults. voice.andrew = the PERSONAL "drafting as Andrew" voice (social
   posts), edited on the intel site (Manage → Settings). Both editors PUT here;
   fields are merged so neither overwrites the other. voice.external / internal
   remain reserved (kept as null).

   GET  → { ok, settings }
   PUT  → save { voice:{ default, andrew, external, internal } } (partial ok)
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const SETTINGS_PATH = "src/data/intelligence-settings.json";

function cleanStringList(v) {
  if (!Array.isArray(v)) return [];
  return v.map(s => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
}

function normalizeSettings(raw, prev) {
  const r = raw || {};
  const v = r.voice || {};
  const prevVoice = (prev && prev.voice) || {};
  const s = r.sources || {};
  const prevSources = (prev && prev.sources) || {};
  return {
    voice: {
      default: typeof v.default === "string" ? v.default : (prevVoice.default || ""),
      // "drafting as Andrew" — the personal/social voice, edited on the intel
      // site (Manage → Settings). Merged field-by-field so an Admin save of
      // voice.default doesn't wipe it, and an intel save of voice.andrew
      // doesn't wipe voice.default.
      andrew: typeof v.andrew === "string" ? v.andrew : (prevVoice.andrew ?? ""),
      // external/internal are reserved — accept a string if provided, else preserve/keep null
      external: typeof v.external === "string" ? v.external : (prevVoice.external ?? null),
      internal: typeof v.internal === "string" ? v.internal : (prevVoice.internal ?? null),
    },
    sources: {
      whitelist: r.sources ? cleanStringList(s.whitelist) : cleanStringList(prevSources.whitelist),
      blacklist: r.sources ? cleanStringList(s.blacklist) : cleanStringList(prevSources.blacklist),
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
    body.sources = next.sources;

    const content = JSON.stringify(body, null, 2) + "\n";
    const saved = await commitFileToGitHub(
      env, SETTINGS_PATH, content, current.sha, "Update Intelligence defaults"
    );
    if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
