/**
 * Admin endpoint for updating section color palettes
 * GET: Fetch all section palettes
 * PUT: Update a palette scheme (token assignments)
 */

import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const PALETTES_PATH = "src/data/section-palettes.json";

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const result = await getFileFromGitHub(env, PALETTES_PATH);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  // .json files arrive pre-parsed in result.data (the helper 502s on bad JSON)
  return jsonResponse({ ok: true, data: result.data, sha: result.sha });
}

export async function onRequestPut({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Bad request" }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, error: "Invalid payload" }, 400);
  }

  const { sectionType, schemeId, tokens } = body;
  if (typeof sectionType !== "string" || !sectionType) {
    return jsonResponse({ ok: false, error: "sectionType must be a non-empty string" }, 400);
  }
  if (typeof schemeId !== "string" || !schemeId) {
    return jsonResponse({ ok: false, error: "schemeId must be a non-empty string" }, 400);
  }
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) {
    return jsonResponse({ ok: false, error: "tokens must be an object" }, 400);
  }
  for (const [slot, value] of Object.entries(tokens)) {
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(slot)) {
      return jsonResponse({ ok: false, error: `Invalid slot name "${slot}"` }, 400);
    }
    if (typeof value !== "string" || value.length === 0 || value.length > 120) {
      return jsonResponse({ ok: false, error: `Slot "${slot}" must be a non-empty string (max 120 chars)` }, 400);
    }
  }

  // Fetch current file — .json arrives pre-parsed in current.data
  const current = await getFileFromGitHub(env, PALETTES_PATH);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const palettes = current.data;
  if (!palettes || typeof palettes !== "object") {
    return jsonResponse({ ok: false, error: "Could not parse section-palettes.json" }, 500);
  }

  // Validate structure and update
  if (!palettes[sectionType]) {
    return jsonResponse(
      { ok: false, error: `Section type "${sectionType}" not found` },
      400
    );
  }

  if (!palettes[sectionType].schemes || !palettes[sectionType].schemes[schemeId]) {
    return jsonResponse(
      { ok: false, error: `Scheme "${schemeId}" not found for section "${sectionType}"` },
      400
    );
  }

  // Update the specific scheme's tokens
  palettes[sectionType].schemes[schemeId].tokens = tokens;

  // Commit back to GitHub
  const newContent = JSON.stringify(palettes, null, 2) + "\n";
  const result = await commitFileToGitHub(
    env,
    PALETTES_PATH,
    newContent,
    current.sha,
    `Admin: update palette ${sectionType}.${schemeId}`
  );
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}
