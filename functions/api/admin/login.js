import {
  jsonResponse,
  constantTimeEqual,
  createSessionCookieValue,
  buildSetCookieHeader,
  sessionSecret,
  SESSION_TTL_SECONDS,
  hashUserPassword,
} from "./_utils.js";
import { getFileFromGitHub } from "./_github.js";

/* POST /api/admin/login — verify password, set the session cookie.

   Two auth paths:
   1. No email provided → compare against master ADMIN_PASSWORD (backward-compatible).
   2. Email provided → look up user in src/data/admin-users.json, verify their
      HMAC-SHA256 password hash.

   Brute-force protection (best-effort, in-memory):
   - Per-IP sliding window: after MAX_FAILURES failed attempts within
     WINDOW_MS, further attempts get 429 until the window drains.
   - Every failed attempt also waits FAIL_DELAY_MS before responding,
     so even a single isolate can't be hammered quickly.
   The attempt map lives in module scope, which persists per Workers
   isolate. It resets when the isolate recycles and is per-datacenter —
   not a hard guarantee, but it turns "unlimited free guesses" into
   "a handful per window". */

const MAX_FAILURES  = 5;
const WINDOW_MS     = 15 * 60 * 1000; // 15 minutes
const FAIL_DELAY_MS = 500;
const MAX_TRACKED_IPS = 5000; // hard cap so the map can't grow unbounded

const failures = new Map(); // ip -> [timestamps of recent failures]

function recentFailures(ip, now) {
  const list = (failures.get(ip) || []).filter(t => now - t < WINDOW_MS);
  failures.set(ip, list);
  return list;
}

function recordFailure(ip, now) {
  const list = recentFailures(ip, now);
  list.push(now);
  failures.set(ip, list);
  // Opportunistic cleanup so the map stays bounded
  if (failures.size > MAX_TRACKED_IPS) {
    for (const [key, times] of failures) {
      if (times.every(t => now - t >= WINDOW_MS)) failures.delete(key);
      if (failures.size <= MAX_TRACKED_IPS) break;
    }
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SECRET) {
    return jsonResponse({ ok: false, error: "Admin is not configured (missing env vars)" }, 500);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();

  if (recentFailures(ip, now).length >= MAX_FAILURES) {
    return jsonResponse({
      ok: false,
      error: "Too many failed attempts. Wait 15 minutes and try again.",
    }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Bad request" }, 400);
  }

  const provided = String((body && body.password) || "");
  const email    = String((body && body.email)    || "").trim().toLowerCase();

  if (!provided) {
    return jsonResponse({ ok: false, error: "Password required" }, 400);
  }

  let authed = false;

  if (!email) {
    // No email → check master ADMIN_PASSWORD (backward-compatible)
    authed = constantTimeEqual(provided, env.ADMIN_PASSWORD);
  } else {
    // Email → look up user in admin-users.json and verify their password
    const usersResult = await getFileFromGitHub(env, "src/data/admin-users.json");
    if (usersResult.ok && usersResult.data) {
      const users = Array.isArray(usersResult.data.users) ? usersResult.data.users : [];
      const user = users.find(u => u.email && u.email.toLowerCase() === email);
      if (user && user.passwordHash && user.salt) {
        const hash = await hashUserPassword(provided, user.salt, env.ADMIN_SECRET);
        authed = constantTimeEqual(hash, user.passwordHash);
      }
    }
  }

  if (!authed) {
    recordFailure(ip, now);
    await new Promise(r => setTimeout(r, FAIL_DELAY_MS));
    return jsonResponse({ ok: false, error: "Invalid email or password" }, 401);
  }

  failures.delete(ip);
  const cookieValue = await createSessionCookieValue(sessionSecret(env));
  return jsonResponse({ ok: true }, 200, {
    "Set-Cookie": buildSetCookieHeader(cookieValue, SESSION_TTL_SECONDS),
  });
}
