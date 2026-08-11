/* functions/intel/api/rename-entry.js — rename a docket entry in place.

   PUT { slug, entry_number, title }
     → sets the entry's description in cases/data/<slug>.json and flags it
       titled_from_upload, which fetch_dockets.py treats as authoritative —
       the hourly CourtListener sync never overwrites a manual title.

   Only numbered entries can be renamed: unnumbered rows derive their
   identity (notes, uploads, votes) from their text, so renaming one would
   orphan everything attached to it.

   Gated by functions/intel/_middleware.js (admin session). */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "../../api/admin/_github.js";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || env.GITHUB_BRANCH || "dev"; }

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const slug = String(body.slug || "").trim();
  const entryNumber = Number(body.entry_number);
  const title = String(body.title || "").replace(/\s+/g, " ").trim();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return jsonResponse({ ok: false, error: "invalid case" }, 400);
  if (!Number.isFinite(entryNumber)) return jsonResponse({ ok: false, error: "entry number required" }, 400);
  if (title.length < 3 || title.length > 300) return jsonResponse({ ok: false, error: "title must be 3–300 characters" }, 400);

  const path = `briefing-generator/cases/data/${slug}.json`;
  const repo = briefingRepo(env);
  const branch = briefingBranch(env);

  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getFileFromGitHub(env, path, null, repo, branch);
    if (!cur.ok || !cur.data) return jsonResponse({ ok: false, error: "case data unavailable" }, 502);
    const entries = ((cur.data.docket || {}).entries) || [];
    const entry = entries.find((e) => e.entry_number === entryNumber);
    if (!entry) return jsonResponse({ ok: false, error: `Dkt. ${entryNumber} not found` }, 404);
    if (entry.description === title && entry.titled_from_upload) {
      return jsonResponse({ ok: true, unchanged: true });
    }
    entry.description = title;
    entry.titled_from_upload = true;  // fetch_dockets.py: manual titles win
    res = await commitFileToGitHub(
      env, path, JSON.stringify(cur.data, null, 2) + "\n", cur.sha,
      `Rename Dkt. ${entryNumber} (${slug}): ${title.slice(0, 50)}`,
      repo, branch
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res || !res.ok) return jsonResponse({ ok: false, error: (res && res.error) || "commit failed" }, 502);
  return jsonResponse({ ok: true });
}
