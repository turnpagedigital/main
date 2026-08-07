/* functions/intel/api/prospects.js — the case-prospect triage store.

   scripts/scan_prospects.py surfaces candidate NEW cases per theme into
   briefing-generator/prospects.json (committed to the briefing branch by the
   news-scan workflow). This endpoint serves that list fresh and records
   Andrew's triage decisions:

   GET → { ok, updated, items: [{id, case_name, parties, court, case_number,
           docket_url, why, theme, source_url, source_name, date, first_seen,
           status, tracked_slug?}] }
   PUT → { id, status: "dismissed" | "new" | "tracked", tracked_slug? }
         Flips ONE prospect's status. "tracked" is set by the Track flow AFTER
         the case was created via /api/admin/cases (the promotion itself goes
         through that endpoint — this file never creates cases).

   Dismissed/tracked entries stay in the file as tombstones so the next scan
   never resurfaces them (scan_prospects.py prunes them after 120 days).
   Gated by functions/intel/_middleware.js (admin session). */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFilesToGitHub } from "../../api/admin/_github.js";

const JSON_PATH = "briefing-generator/prospects.json";
const STATUSES = ["new", "dismissed", "tracked"];

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

async function loadStore(env) {
  const res = await getFileFromGitHub(env, JSON_PATH, null, briefingRepo(env), briefingBranch(env));
  if (res.ok && res.data && Array.isArray(res.data.items)) {
    return { updated: res.data.updated || "", items: res.data.items };
  }
  return { updated: "", items: [] };
}

export async function onRequestGet(context) {
  const store = await loadStore(context.env);
  return jsonResponse({ ok: true, updated: store.updated, items: store.items });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const id = String(body.id || "");
  const status = String(body.status || "");
  if (!/^[a-f0-9]{10}$/.test(id)) {
    return jsonResponse({ ok: false, error: "a prospect id is required" }, 400);
  }
  if (!STATUSES.includes(status)) {
    return jsonResponse({ ok: false, error: "status must be new, dismissed, or tracked" }, 400);
  }

  const store = await loadStore(env);
  const item = store.items.find((i) => i && i.id === id);
  if (!item) return jsonResponse({ ok: false, error: "prospect not found" }, 404);

  item.status = status;
  item.triaged_at = new Date().toISOString();
  if (status === "tracked" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(body.tracked_slug || ""))) {
    item.tracked_slug = String(body.tracked_slug);
  } else if (status !== "tracked") {
    delete item.tracked_slug;
  }

  // The scan bot commits to this branch too — retry so a ref race never
  // silently swallows a triage decision.
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await commitFilesToGitHub(
      env,
      [{ path: JSON_PATH, content: JSON.stringify({ updated: store.updated, items: store.items }, null, 2) + "\n" }],
      `Prospects: ${status} ${item.case_name || id}`,
      briefingRepo(env),
      briefingBranch(env)
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res.ok) return jsonResponse({ ok: false, error: res.error || "commit failed" }, 502);
  return jsonResponse({ ok: true, items: store.items });
}
