/* Partner-portal sessions. Same HMAC-cookie design as the admin
   (functions/api/admin/_utils.js) but per-partner: the signing secret binds
   ADMIN_SECRET to the partner's portalKeyHash, so rotating a partner's
   access key (or deactivating the partner) invalidates only that partner's
   sessions. No server-side session storage. */

import partnersData from "../../../src/data/referral-partners.json";

export const PARTNER_COOKIE = "tpdm_partner";
export const PARTNER_SESSION_TTL = 12 * 60 * 60; // 12h

export function jsonResponse(body, status = 200, extraHeaders) {
  const headers = new Headers({ "Content-Type": "application/json", ...(extraHeaders || {}) });
  return new Response(JSON.stringify(body), { status, headers });
}

export function activePartners() {
  return (partnersData.partners || []).filter((p) => p.active !== false && p.portalKeyHash);
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function partnerSecret(env, partner) {
  return `${env.ADMIN_SECRET}|partner:${partner.code}|kh:${partner.portalKeyHash}`;
}

async function hmacSignB64Url(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
  let str = "";
  for (const b of sig) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createPartnerSession(env, partner) {
  const message = `exp=${Date.now() + PARTNER_SESSION_TTL * 1000}&code=${partner.code}`;
  const sig = await hmacSignB64Url(message, partnerSecret(env, partner));
  return `${message}.${sig}`;
}

export function buildPartnerCookie(value, maxAgeSeconds) {
  return [
    `${PARTNER_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/api/partner",
    "HttpOnly", "Secure", "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const out = {};
  for (const pair of header.split(/;\s*/)) {
    const i = pair.indexOf("=");
    if (i === -1) continue;
    try { out[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1)); } catch { out[pair.slice(0, i)] = pair.slice(i + 1); }
  }
  return out;
}

/* Returns the authenticated partner registry entry, or null. */
export async function authedPartner(request, env) {
  if (!env.ADMIN_SECRET) return null;
  const value = parseCookies(request)[PARTNER_COOKIE];
  if (!value) return null;
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) return null;
  const message = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  const m = message.match(/^exp=(\d+)&code=([a-z0-9-]+)$/);
  if (!m) return null;
  if (Number(m[1]) < Date.now()) return null;
  const partner = activePartners().find((p) => p.code === m[2]);
  if (!partner) return null;
  const expected = await hmacSignB64Url(message, partnerSecret(env, partner));
  // Constant-time-ish compare via HMAC re-sign; lengths always equal here
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? partner : null;
}
