/* functions/intel/api/calendar-prefs.js — calendar event curation.

   Dismissed event keys and merge groups for the unified calendar, stored in
   the repo (briefing-generator/intel-calendar.json) like every other piece of
   site state. Event keys are deterministic (case|date|kind|source), so they
   survive data refreshes. Gated by functions/intel/_middleware.js.

   GET → { ok, dismissed: [key], merges: [{ keys: [key], primary: key }] }
   PUT → same shape in; sanitized and committed whole (small document). */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "../../api/admin/_github.js";

const PATH = "briefing-generator/intel-calendar.json";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

function sanitize(body) {
  const keyOk = (k) => typeof k === "string" && k.length > 0 && k.length <= 300;
  const dismissed = (Array.isArray(body && body.dismissed) ? body.dismissed : [])
    .filter(keyOk).slice(0, 500);
  const merges = (Array.isArray(body && body.merges) ? body.merges : [])
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const keys = (Array.isArray(m.keys) ? m.keys : []).filter(keyOk).slice(0, 20);
      const primary = keyOk(m.primary) && keys.indexOf(m.primary) !== -1 ? m.primary : keys[0];
      return keys.length >= 2 ? { keys, primary } : null;
    })
    .filter(Boolean).slice(0, 200);
  return { dismissed, merges };
}

export async function onRequestGet(context) {
  const res = await getFileFromGitHub(context.env, PATH, null, briefingRepo(context.env), briefingBranch(context.env));
  const clean = sanitize(res.ok ? res.data : {});
  return jsonResponse({ ok: true, dismissed: clean.dismissed, merges: clean.merges });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const clean = sanitize(body);
  const content = JSON.stringify(clean, null, 2) + "\n";
  const repo = briefingRepo(env);
  const branch = briefingBranch(env);
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getFileFromGitHub(env, PATH, null, repo, branch);
    if (cur.ok && cur.text === content) return jsonResponse({ ok: true, unchanged: true });
    res = await commitFileToGitHub(env, PATH, content, cur.ok ? cur.sha : null,
      "Intel calendar: update dismissed/merged events", repo, branch);
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res || !res.ok) return jsonResponse({ ok: false, error: (res && res.error) || "commit failed" }, 502);
  return jsonResponse({ ok: true });
}
