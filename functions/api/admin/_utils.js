/* Shared helpers for the admin API.
   - HMAC-signed session cookies (no DB needed).
   - Constant-time password comparison.
   - Cookie parsing / Set-Cookie building.

   Required Cloudflare env vars (set in Pages → Settings → Environment variables):
     ADMIN_PASSWORD   — the single password for admin login
     ADMIN_SECRET     — random 32+ char string used to sign session cookies
     GITHUB_TOKEN     — fine-grained PAT scoped to this repo with "Contents: Read and write"
     GITHUB_REPO      — owner/name, e.g. "turnpagedigital/main"
     GITHUB_BRANCH    — branch to commit to, e.g. "dev" or "main"
*/

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24h
export const COOKIE_NAME = "tpdm_admin";

export function jsonResponse(body, status = 200, extraHeaders) {
  const headers = new Headers({ "Content-Type": "application/json", ...(extraHeaders || {}) });
  return new Response(JSON.stringify(body), { status, headers });
}

export function constantTimeEqual(a, b) {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // Pad both buffers to the same length so we always compare the same number
  // of bytes regardless of input length — prevents a length-oracle timing attack.
  const len = Math.max(bufA.length, bufB.length);
  const paddedA = new Uint8Array(len);
  const paddedB = new Uint8Array(len);
  paddedA.set(bufA);
  paddedB.set(bufB);
  // timingSafeEqual does a constant-time byte comparison.
  // We still require identical lengths before returning true so that
  // "abc\0" does not compare equal to "abc".
  return bufA.length === bufB.length && crypto.subtle.timingSafeEqual(paddedA, paddedB);
}

function bufToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuf(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const str = atob(s);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out.buffer;
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmacSign(message, secret) {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bufToBase64Url(sig);
}

async function hmacVerify(message, signature, secret) {
  const key = await importHmacKey(secret);
  return crypto.subtle.verify("HMAC", key, base64UrlToBuf(signature), new TextEncoder().encode(message));
}

export async function createSessionCookieValue(secret) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const message = `exp=${expiresAt}`;
  const sig = await hmacSign(message, secret);
  return `${message}.${sig}`;
}

export async function verifySessionCookieValue(cookieValue, secret) {
  if (!cookieValue || typeof cookieValue !== "string") return false;
  const lastDot = cookieValue.lastIndexOf(".");
  if (lastDot === -1) return false;
  const message = cookieValue.slice(0, lastDot);
  const sig = cookieValue.slice(lastDot + 1);
  try {
    const ok = await hmacVerify(message, sig, secret);
    if (!ok) return false;
  } catch {
    return false;
  }
  const m = message.match(/^exp=(\d+)$/);
  if (!m) return false;
  const expiresAt = Number(m[1]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const out = {};
  for (const pair of header.split(/;\s*/)) {
    const i = pair.indexOf("=");
    if (i === -1) continue;
    const name = pair.slice(0, i);
    const value = pair.slice(i + 1);
    try { out[name] = decodeURIComponent(value); } catch { out[name] = value; }
  }
  return out;
}

export function buildSetCookieHeader(value, maxAgeSeconds) {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ];
  return attrs.join("; ");
}

export async function isAuthed(request, env) {
  if (!env.ADMIN_SECRET) return false;
  const cookies = parseCookies(request);
  return verifySessionCookieValue(cookies[COOKIE_NAME], env.ADMIN_SECRET);
}

export { SESSION_TTL_SECONDS };
