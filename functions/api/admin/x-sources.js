/* /api/admin/x-sources — followed X (Twitter) accounts that feed the briefings.

   x-sources.json: { accounts: [{ handle, themes: [slug], exclude_replies,
   exclude_retweets, active, note }] }

   The daily briefing pipeline (scripts/scan_x.py) pulls each active handle's
   last-24h posts via the X API (X_BEARER_TOKEN secret) and hands them to the
   briefing writer for the mapped themes. */

import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const PATH = "src/data/x-sources.json";

function sanitize(accounts) {
  const out = [];
  const seen = new Set();
  for (const a of (Array.isArray(accounts) ? accounts : []).slice(0, 50)) {
    if (!a || typeof a !== "object") continue;
    const handle = String(a.handle || "").trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle) || seen.has(handle.toLowerCase())) continue;
    seen.add(handle.toLowerCase());
    out.push({
      handle,
      themes: (Array.isArray(a.themes) ? a.themes : [])
        .filter((s) => typeof s === "string" && /^[a-z0-9-]{1,60}$/.test(s)).slice(0, 12),
      exclude_replies: a.exclude_replies !== false,
      exclude_retweets: a.exclude_retweets !== false,
      active: a.active !== false,
      note: String(a.note || "").slice(0, 140),
    });
  }
  return out;
}

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  const res = await getFileFromGitHub(env, PATH);
  const accounts = res.ok && res.data ? sanitize(res.data.accounts) : [];
  return jsonResponse({ ok: true, data: { accounts } });
}

export async function onRequestPut({ request, env }) {
  if (!(await isAuthed(request, env))) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }
  const accounts = sanitize(body && body.accounts);
  const cur = await getFileFromGitHub(env, PATH);
  const res = await commitFileToGitHub(
    env, PATH, JSON.stringify({ accounts }, null, 2) + "\n",
    cur.ok ? cur.sha : null, "Admin: update X accounts"
  );
  if (!res.ok) return jsonResponse({ ok: false, error: res.error || "commit failed" }, 502);
  return jsonResponse({ ok: true, data: { accounts } });
}
