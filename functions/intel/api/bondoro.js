/* functions/intel/api/bondoro.js — Bondoro alerts/summaries + case assignment.

   The daily scraper (scripts/scan_bondoro.py) refreshes bondoro.json from
   Bondoro's RSS feeds; this endpoint serves it fresh from the repo and lets
   the docket page assign an item to a tracked case (case_slug), which the
   scraper preserves on every re-scrape. Gated by the intel middleware.

   GET → { ok, items: [...] }
   PUT → { url, case_slug|null } — updates one item's assignment. */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "../../api/admin/_github.js";

const PATH = "briefing-generator/bondoro.json";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

export async function onRequestGet(context) {
  const res = await getFileFromGitHub(context.env, PATH, null, briefingRepo(context.env), briefingBranch(context.env));
  const items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
  return jsonResponse({ ok: true, items });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const caseSlug = body.case_slug == null ? null : String(body.case_slug).trim();
  if (!/^https?:\/\/[^\s]+$/.test(url)) {
    return jsonResponse({ ok: false, error: "a feed item url is required" }, 400);
  }
  if (caseSlug !== null && !/^[a-z0-9-]{1,60}$/.test(caseSlug)) {
    return jsonResponse({ ok: false, error: "invalid case slug" }, 400);
  }

  const repo = briefingRepo(env);
  const branch = briefingBranch(env);
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getFileFromGitHub(env, PATH, null, repo, branch);
    if (!cur.ok || !cur.data || !Array.isArray(cur.data.items)) {
      return jsonResponse({ ok: false, error: "bondoro.json unavailable" }, 502);
    }
    const item = cur.data.items.find((i) => i.url === url);
    if (!item) return jsonResponse({ ok: false, error: "item not found" }, 404);
    if ((item.case_slug || null) === caseSlug) return jsonResponse({ ok: true, unchanged: true });
    item.case_slug = caseSlug;
    res = await commitFileToGitHub(
      env, PATH, JSON.stringify(cur.data, null, 2) + "\n", cur.sha,
      `Bondoro: ${caseSlug ? "assign " + url.split("/").filter(Boolean).pop() + " → " + caseSlug : "unassign " + url.split("/").filter(Boolean).pop()}`,
      repo, branch
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res || !res.ok) return jsonResponse({ ok: false, error: (res && res.error) || "commit failed" }, 502);
  return jsonResponse({ ok: true });
}
