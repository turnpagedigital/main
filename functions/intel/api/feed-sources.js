/* functions/intel/api/feed-sources.js — manage general news feed sources.

   The docket page's Sources modal reads and writes feed-sources.json here;
   scripts/scan_feeds.py pulls every enabled source's RSS daily into the
   docket feed. Gated by the intel middleware.

   GET → { ok, sources: [{id, name, url, kind, mode, enabled}] }
   mode: "all" shows every feed item on the docket; "case-only" shows a
   feed's items only once tied to a tracked case (auto-match or manual).
   PUT → { sources: [...] } (whole list, sanitized) */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "../../api/admin/_github.js";

const PATH = "briefing-generator/feed-sources.json";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

function sanitize(body) {
  const out = [];
  const raw = Array.isArray(body && body.sources) ? body.sources : [];
  const seen = new Set();
  for (const s of raw.slice(0, 30)) {
    if (!s || typeof s !== "object") continue;
    const url = String(s.url || "").trim();
    if (!/^https?:\/\/[^\s]+$/.test(url) || url.length > 300 || seen.has(url)) continue;
    const name = String(s.name || "").trim().slice(0, 40);
    if (!name) continue;
    seen.add(url);
    out.push({
      id: String(s.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).slice(0, 60),
      name,
      url,
      kind: (String(s.kind || "News").trim() || "News").slice(0, 20),
      mode: s.mode === "case-only" ? "case-only" : "all",
      enabled: s.enabled !== false,
    });
  }
  return out;
}

export async function onRequestGet(context) {
  const res = await getFileFromGitHub(context.env, PATH, null, briefingRepo(context.env), briefingBranch(context.env));
  const sources = res.ok && res.data ? sanitize(res.data) : [];
  return jsonResponse({ ok: true, sources });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const sources = sanitize(body);
  const content = JSON.stringify({ sources }, null, 2) + "\n";
  const repo = briefingRepo(env);
  const branch = briefingBranch(env);
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getFileFromGitHub(env, PATH, null, repo, branch);
    if (cur.ok && cur.text === content) return jsonResponse({ ok: true, unchanged: true });
    res = await commitFileToGitHub(env, PATH, content, cur.ok ? cur.sha : null,
      "Feed sources: update", repo, branch);
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res || !res.ok) return jsonResponse({ ok: false, error: (res && res.error) || "commit failed" }, 502);
  return jsonResponse({ ok: true, sources });
}
