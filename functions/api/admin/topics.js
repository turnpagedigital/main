/* Topics endpoint — the PUBLIC site's topic taxonomy (src/data/topics.json).

   Topics tag press/posts items (their `pages` arrays) and drive the Press
   page's Topics filter. They are deliberately independent of the intel
   themes in briefing-generator (scan beats, managed at /intel/manage.html).

   GET  → { ok, data: { topics: [{key,label}] }, sha }
   PUT  { topics: [{key,label}] } → validates, rewrites the whole file.
*/

import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const TOPICS_PATH = "src/data/topics.json";
const MAX_TOPICS = 40;

function validateTopics(topics) {
  if (topics.length > MAX_TOPICS) return `Too many topics (max ${MAX_TOPICS})`;
  const seen = new Set();
  for (const t of topics) {
    if (!t || typeof t !== "object") return "Each topic must be an object";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.key || "")) {
      return `Topic key "${t.key || ""}" must be kebab-case (lowercase letters, digits, hyphens)`;
    }
    if (typeof t.label !== "string" || !t.label.trim()) return `Topic "${t.key}" needs a label`;
    if (t.label.length > 80) return `Topic "${t.key}" label is too long (max 80 chars)`;
    if (seen.has(t.key)) return `Duplicate topic key "${t.key}"`;
    seen.add(t.key);
  }
  return null;
}

async function fetchFile(env) {
  return getFileFromGitHub(env, TOPICS_PATH);
}

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const result = await fetchFile(env);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);
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
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const topics = body && body.topics;
  if (!Array.isArray(topics)) {
    return jsonResponse({ ok: false, error: "Payload must include 'topics' array" }, 400);
  }
  const clean = topics.map(t => ({
    key: String((t && t.key) || "").trim(),
    label: String((t && t.label) || "").trim(),
  }));
  const err = validateTopics(clean);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const merged = {
    ...(current.data && typeof current.data === "object" ? current.data : {}),
    topics: clean,
  };
  const commit = await commitFileToGitHub(
    env, TOPICS_PATH,
    JSON.stringify(merged, null, 2) + "\n",
    current.sha,
    "Admin: update topics.json",
  );
  if (!commit.ok) return jsonResponse({ ok: false, error: commit.error }, 502);
  return jsonResponse({ ok: true, data: merged });
}
