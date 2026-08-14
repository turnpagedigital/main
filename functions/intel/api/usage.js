/* functions/intel/api/usage.js — API usage history for Manage → Usage.

   Reads briefing-generator/usage-log.json, which scripts/usage_log.py appends
   to on every scan run (one row per task per run). Nothing recorded usage
   before that shipped, so the history starts there and cannot be backfilled —
   neither the repo nor the Actions logs carry per-call counts.

   GET → { ok, runs: [...], budget: { courtlistener_daily } }
   Gated by the intel middleware (admin session). */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub } from "../../api/admin/_github.js";

const PATH = "briefing-generator/usage-log.json";

// CourtListener's own 429 message quotes 600 requests / rolling 24h for this
// token. Shown as a reference line so a day's bar reads against the ceiling.
const CL_DAILY_BUDGET = 600;

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || env.GITHUB_BRANCH || "dev"; }

export async function onRequestGet(context) {
  const res = await getFileFromGitHub(
    context.env, PATH, null, briefingRepo(context.env), briefingBranch(context.env));

  let runs = [];
  if (res.ok && res.data) {
    const raw = Array.isArray(res.data) ? res.data : res.data.runs;
    if (Array.isArray(raw)) {
      runs = raw
        .filter((r) => r && typeof r === "object" && r.date)
        .map((r) => ({
          date: String(r.date).slice(0, 10),
          ts: String(r.ts || "").slice(0, 20),
          task: String(r.task || "unknown").slice(0, 60),
          provider: String(r.provider || "unknown").slice(0, 24),
          requests: Number(r.requests) || 0,
          tokens_in: Number(r.tokens_in) || 0,
          tokens_out: Number(r.tokens_out) || 0,
          model: r.model ? String(r.model).slice(0, 40) : undefined,
          ok: r.ok !== false,
        }))
        .slice(-4000);
    }
  }
  return jsonResponse({
    ok: true,
    runs,
    budget: { courtlistener_daily: CL_DAILY_BUDGET },
  });
}
