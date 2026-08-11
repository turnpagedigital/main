/* Manual Sync endpoint — POST { slug } dispatches the manual-case-sync
   workflow for exactly one case, regardless of its sync mode: fresh docket
   entries, fresh news, and a fresh briefing if the last one is more than
   12 hours old. Fire-and-forget, same pattern as sync-case.js — results
   land on the site in a few minutes once the workflow finishes.

   Requires the fine-grained GITHUB_TOKEN to have "Actions: Read and write"
   on the repo — the error message says so when it doesn't. */

import { isAuthed, jsonResponse } from "./_utils.js";

const WORKFLOW = "manual-case-sync.yml";

export async function onRequestPost({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  let slug = "";
  try { slug = String((await request.json()).slug || "").trim(); } catch { /* fall through */ }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return jsonResponse({ ok: false, error: "Invalid slug" }, 400);
  }

  const repo = env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main";
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "tpdm-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { case: slug } }),
    }
  );

  if (res.status === 204) {
    return jsonResponse({
      ok: true,
      note: "Sync started — docket, news, and (if due) a fresh briefing. Takes a few minutes.",
    });
  }
  const body = await res.text();
  if (res.status === 403 || res.status === 404) {
    return jsonResponse({
      ok: false,
      error: "GitHub refused the dispatch — the fine-grained PAT needs \"Actions: Read and write\" " +
        "permission on the repo (GitHub → Settings → Developer settings → Fine-grained tokens).",
      detail: body.slice(0, 200),
    }, 502);
  }
  return jsonResponse({ ok: false, error: `GitHub dispatch failed (${res.status})`, detail: body.slice(0, 200) }, 502);
}
