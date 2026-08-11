/* functions/intel/api/votes.js — up/down votes on news items.

   Votes are TOPIC feedback (more/less coverage like this) — they say nothing
   about the outlet. scan_news.py feeds the voted headlines to the daily
   article hunt as steer-toward / steer-away topic lists.

   GET → { ok, votes: {url: {v: 1|-1, source, title, case_slug, at}} }
   PUT → { url, vote: 1|-1|0, source, title, case_slug }   (0 clears the vote)

   Storage: briefing-generator/intel-votes.json. Gated by the intel middleware. */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "../../api/admin/_github.js";

const PATH = "briefing-generator/intel-votes.json";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || env.GITHUB_BRANCH || "dev"; }

function cleanVotes(raw) {
  const out = {};
  const votes = raw && typeof raw.votes === "object" && raw.votes ? raw.votes : {};
  for (const [url, v] of Object.entries(votes).slice(0, 2000)) {
    if (!/^https?:\/\//.test(url) || url.length > 300 || !v) continue;
    const val = Number(v.v);
    if (val !== 1 && val !== -1) continue;
    out[url] = {
      v: val,
      source: String(v.source || "").slice(0, 60),
      title: String(v.title || "").slice(0, 140),
      case_slug: String(v.case_slug || "").slice(0, 60),
      at: String(v.at || "").slice(0, 30),
    };
  }
  return out;
}

export async function onRequestGet(context) {
  const res = await getFileFromGitHub(context.env, PATH, null, briefingRepo(context.env), briefingBranch(context.env));
  return jsonResponse({ ok: true, votes: res.ok && res.data ? cleanVotes(res.data) : {} });
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
  const vote = Number(body.vote);
  if (!/^https?:\/\//.test(url)) return jsonResponse({ ok: false, error: "item url required" }, 400);
  if (vote !== 1 && vote !== -1 && vote !== 0) return jsonResponse({ ok: false, error: "vote must be 1, -1 or 0" }, 400);

  const repo = briefingRepo(env);
  const branch = briefingBranch(env);
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getFileFromGitHub(env, PATH, null, repo, branch);
    const votes = cur.ok && cur.data ? cleanVotes(cur.data) : {};
    if (vote === 0) delete votes[url];
    else votes[url] = {
      v: vote,
      source: String(body.source || "").slice(0, 60),
      title: String(body.title || "").slice(0, 140),
      case_slug: String(body.case_slug || "").slice(0, 60),
      at: new Date().toISOString(),
    };
    res = await commitFileToGitHub(
      env, PATH, JSON.stringify({ votes }, null, 2) + "\n", cur.ok ? cur.sha : null,
      `Vote: ${vote === 0 ? "clear" : vote > 0 ? "up" : "down"} ${url.split("/").filter(Boolean).pop()}`.slice(0, 72),
      repo, branch
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res || !res.ok) return jsonResponse({ ok: false, error: (res && res.error) || "commit failed" }, 502);
  return jsonResponse({ ok: true });
}
