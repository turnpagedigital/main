/* functions/intel/api/send-to-site.js — push an intel case briefing into the
   site's Posts & Briefings QUEUE as an unpublished draft.

   POST { slug: "<case slug>" }
   → reads that case's current briefing from case-briefings.json (briefing
     branch, where the daily pipeline commits), composes a site post, and
     upserts it into public/briefings/ on the SITE content branch
     (env.GITHUB_BRANCH — same branch the admin Posts tab edits):
       - public/briefings/<date>-<slug>-briefing.md
       - index.json entry { active:false } → lands in the admin Queue
   → { ok, slug, updated }   updated=true when the draft already existed
     (same briefing date) and its body was refreshed; an entry the admin
     already flipped live keeps its active state.

   This replaced the automatic Mon/Wed/Fri advisory queue (Aug 2026): drafts
   now only enter the queue when Andrew sends one from /intel/briefings.html.
   Gated by functions/intel/_middleware.js (admin session). */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFilesToGitHub } from "../../api/admin/_github.js";

const CASE_BRIEFINGS_PATH = "briefing-generator/case-briefings.json";
const INDEX_PATH = "public/briefings/index.json";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  const names = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  return `${names[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const slug = String(body.slug || "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return jsonResponse({ ok: false, error: "a case slug is required" }, 400);
  }

  // The briefing text lives on the briefing branch (daily pipeline commits).
  const cb = await getFileFromGitHub(env, CASE_BRIEFINGS_PATH, null, briefingRepo(env), briefingBranch(env));
  if (!cb.ok || !cb.data || !Array.isArray(cb.data.items)) {
    return jsonResponse({ ok: false, error: "case-briefings.json unavailable" }, 502);
  }
  const item = cb.data.items.find((i) => i && i.slug === slug);
  if (!item) return jsonResponse({ ok: false, error: "no briefing found for that case" }, 404);
  if (!(item.body_md || "").trim()) {
    return jsonResponse({ ok: false, error: "that case has no briefing text yet — it generates the first time the case moves" }, 400);
  }

  const date = item.date || new Date().toISOString().slice(0, 10);
  const postSlug = `${date}-${slug}-briefing`;
  const title = `${item.case_name || slug} Briefing — ${prettyDate(date)}`;
  const summary = String(item.lede || "").slice(0, 400);
  const md = `# ${title}\n\n${item.body_md.trim()}\n`;

  // Queue entry on the SITE content branch (env defaults, same as the admin
  // Posts tab). New entries land as drafts; a re-send refreshes the body and
  // summary but never flips a post the admin already published.
  const idx = await getFileFromGitHub(env, INDEX_PATH);
  if (!idx.ok || !idx.data) {
    return jsonResponse({ ok: false, error: "briefings index unavailable" }, 502);
  }
  const items = Array.isArray(idx.data.items) ? idx.data.items : [];
  const existing = items.find((i) => i && i.slug === postSlug);
  const entry = {
    slug: postSlug,
    date,
    type: "briefing",
    author: "Turnpage Intelligence",
    title,
    summary,
    tags: [item.short_name || item.case_name || slug, "Case Briefing"].filter(Boolean),
    active: existing ? !!existing.active : false,
  };
  if (existing) Object.assign(existing, entry);
  else items.unshift(entry);
  idx.data.items = items;

  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await commitFilesToGitHub(
      env,
      [
        { path: INDEX_PATH, content: JSON.stringify(idx.data, null, 2) + "\n" },
        { path: `public/briefings/${postSlug}.md`, content: md },
      ],
      `Queue case briefing draft: ${postSlug} (sent from intel)`
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res.ok) return jsonResponse({ ok: false, error: res.error || "commit failed" }, 502);
  return jsonResponse({ ok: true, slug: postSlug, updated: !!existing });
}
