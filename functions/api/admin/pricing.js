/* Read/write the PRIVATE Bartz pricing inputs (functions/api/_pricing-config.json).
 * GET  → { ok, data: { selfRecovery, publisherRecovery, payoutRatePct,
 *          volumePremiumThreshold, volumePremiumPct }, sha }
 * PUT  → same fields in body; commits via GitHub.
 *
 * Both require an admin session, so the values are only ever sent to a logged-in
 * admin — they are never part of the public site bundle. The pricing functions
 * (/api/quote, /api/register) import the committed file at build time.
 *
 * Resilience: if the file doesn't exist yet on the branch this admin
 * environment reads (GITHUB_BRANCH), GET returns zeros instead of failing and
 * the first PUT creates the file there. Every handler is wrapped so ANY
 * unexpected failure returns JSON — never an HTML error page. */

import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const PRICING_PATH = "functions/api/_pricing-config.json";

const DEFAULTS = {
  selfRecovery: 0,
  publisherRecovery: 0,
  payoutRatePct: 0,
  volumePremiumThreshold: 0,
  volumePremiumPct: 0,
};

const FILE_COMMENT =
  "PRIVATE pricing inputs for the Bartz author offer. Edited only via /admin/registration/pricing (login required) and committed here by /api/admin/pricing. This file lives under functions/ and is imported ONLY by server functions (quote.js, register.js), so its values never ship to the browser. base = (payoutRatePct/100) × (selfRecovery × selfWorks + publisherRecovery × publisherWorks); offer = eligibleWorks > volumePremiumThreshold ? base × (1 + volumePremiumPct/100) : base.";

const isMissing = (error) => /not found/i.test(String(error || ""));

export async function onRequestGet({ request, env }) {
  try {
    if (!(await isAuthed(request, env))) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
    }
    const r = await getFileFromGitHub(env, PRICING_PATH);
    if (!r.ok) {
      // First run on a branch that doesn't have the file yet — start at zeros;
      // the first Save creates it.
      if (isMissing(r.error)) return jsonResponse({ ok: true, data: { ...DEFAULTS }, sha: null });
      return jsonResponse({ ok: false, error: r.error || "GitHub read failed" }, 502);
    }
    return jsonResponse({ ok: true, data: sanitize(r.data), sha: r.sha });
  } catch (err) {
    return jsonResponse({ ok: false, error: `Pricing load failed: ${err.message}` }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    if (!(await isAuthed(request, env))) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
    }

    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

    const err = validate(body);
    if (err) return jsonResponse({ ok: false, error: err }, 400);

    // Existing file → reuse its sha (update) and _comment. Missing → create.
    let sha, comment = FILE_COMMENT;
    const current = await getFileFromGitHub(env, PRICING_PATH);
    if (current.ok) {
      sha = current.sha;
      if (current.data && current.data._comment) comment = current.data._comment;
    } else if (!isMissing(current.error)) {
      return jsonResponse({ ok: false, error: current.error || "GitHub read failed" }, 502);
    }

    const merged = {
      _comment: comment,
      selfRecovery: round2(body.selfRecovery),
      publisherRecovery: round2(body.publisherRecovery),
      payoutRatePct: round2(body.payoutRatePct),
      volumePremiumThreshold: Math.max(0, Math.round(num(body.volumePremiumThreshold) || 0)),
      volumePremiumPct: round2(body.volumePremiumPct),
    };

    const newContent = JSON.stringify(merged, null, 2) + "\n";
    const result = await commitFileToGitHub(env, PRICING_PATH, newContent, sha, "Admin: update pricing");
    if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

    return jsonResponse({ ok: true, commitSha: result.sha });
  } catch (err) {
    return jsonResponse({ ok: false, error: `Pricing save failed: ${err.message}` }, 500);
  }
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : NaN; }
function round2(v) { return Math.round(num(v) * 100) / 100; }

function validate(b) {
  if (!b || typeof b !== "object") return "Invalid payload";
  for (const k of ["selfRecovery", "publisherRecovery"]) {
    const n = num(b[k]);
    if (!Number.isFinite(n) || n < 0) return `${k} must be a dollar amount of 0 or more`;
    if (n > 100000000) return `${k} is unreasonably large`;
  }
  const pct = num(b.payoutRatePct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return "payoutRatePct must be between 0 and 100";
  const thr = num(b.volumePremiumThreshold);
  if (!Number.isFinite(thr) || thr < 0) return "volumePremiumThreshold must be 0 or more";
  const prem = num(b.volumePremiumPct);
  if (!Number.isFinite(prem) || prem < 0 || prem > 500) return "volumePremiumPct must be between 0 and 500";
  return null;
}

function sanitize(d) {
  d = d && typeof d === "object" ? d : {};
  return {
    selfRecovery: round2(d.selfRecovery) || 0,
    publisherRecovery: round2(d.publisherRecovery) || 0,
    payoutRatePct: round2(d.payoutRatePct) || 0,
    volumePremiumThreshold: Math.max(0, Math.round(num(d.volumePremiumThreshold) || 0)),
    volumePremiumPct: round2(d.volumePremiumPct) || 0,
  };
}
