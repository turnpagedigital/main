/* POST /api/partner/login — body {key}. The access key alone identifies the
   partner (each key's SHA-256 must match exactly one registry entry).
   Same best-effort per-IP brute-force damping as the admin login. */

import {
  jsonResponse, activePartners, sha256Hex,
  createPartnerSession, buildPartnerCookie, PARTNER_SESSION_TTL,
} from "./_auth.js";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const FAIL_DELAY_MS = 500;
const MAX_TRACKED_IPS = 5000;
const failures = new Map();

function recentFailures(ip, now) {
  const list = (failures.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  failures.set(ip, list);
  return list;
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_SECRET) {
    return jsonResponse({ ok: false, error: "Portal is not configured" }, 500);
  }
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  if (recentFailures(ip, now).length >= MAX_FAILURES) {
    return jsonResponse({ ok: false, error: "Too many failed attempts. Wait 15 minutes and try again." }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }
  const key = String((body && body.key) || "").trim();
  if (!key || key.length > 200) return jsonResponse({ ok: false, error: "Access key required" }, 400);

  const hash = await sha256Hex(key);
  const partner = activePartners().find((p) => p.portalKeyHash === hash);

  if (!partner) {
    const list = recentFailures(ip, now);
    list.push(now);
    failures.set(ip, list);
    if (failures.size > MAX_TRACKED_IPS) failures.clear();
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return jsonResponse({ ok: false, error: "Invalid access key" }, 401);
  }

  failures.delete(ip);
  const cookieValue = await createPartnerSession(env, partner);
  return jsonResponse(
    { ok: true, partner: { code: partner.code, name: partner.name } },
    200,
    { "Set-Cookie": buildPartnerCookie(cookieValue, PARTNER_SESSION_TTL) },
  );
}
