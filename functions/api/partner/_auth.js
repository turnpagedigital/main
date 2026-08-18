/* Partner-portal auth — email-gated magic links, no database.

   Model: each partner lists authorizedEmails in the registry. Anyone may
   REQUEST a sign-in link for any address, but the link is only ever EMAILED
   to an address on a partner's list (possession of the inbox = identity).
   Links carry a 15-minute HMAC token; redeeming one sets a 12h session
   cookie bound to partner code + email. Both token and session verify that
   the email is STILL authorized, so removing an address in the registry
   revokes access on the next production deploy — no server-side state. */

import partnersData from "../../../src/data/referral-partners.json";

export const PARTNER_COOKIE = "tpdm_partner";
export const PARTNER_SESSION_TTL = 12 * 60 * 60; // 12h
export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min

export function jsonResponse(body, status = 200, extraHeaders) {
  const headers = new Headers({ "Content-Type": "application/json", ...(extraHeaders || {}) });
  return new Response(JSON.stringify(body), { status, headers });
}

export function activePartners() {
  return (partnersData.partners || []).filter((p) => p.active !== false);
}

function emailAuthorized(partner, email) {
  return (partner.authorizedEmails || []).some((e) => String(e).toLowerCase() === email);
}

/* The partner whose allowlist contains this (lowercased) email, or null. */
export function findPartnerByEmail(email) {
  return activePartners().find((p) => emailAuthorized(p, email)) || null;
}

function b64url(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s) {
  try {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return decodeURIComponent(escape(atob(s)));
  } catch { return ""; }
}

function partnerSecret(env, code) {
  return `${env.ADMIN_SECRET}|partner:${code}`;
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

function constantTimeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ── Login tokens (the emailed magic link) ─────────────────────────── */

export async function mintLoginToken(env, partner, email) {
  const message = `ml.${Date.now() + LOGIN_TOKEN_TTL_MS}.${partner.code}.${b64url(email)}`;
  const sig = await hmacSignB64Url(message, partnerSecret(env, partner.code));
  return `${message}.${sig}`;
}

/* Returns { partner, email } or null. */
export async function redeemLoginToken(env, token) {
  if (!env.ADMIN_SECRET || typeof token !== "string" || token.length > 500) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "ml") return null;
  const [, expStr, code, emailB64, sig] = parts;
  const message = `ml.${expStr}.${code}.${emailB64}`;
  if (!/^[a-z0-9-]+$/.test(code)) return null;
  const expected = await hmacSignB64Url(message, partnerSecret(env, code));
  if (!constantTimeEqualStr(expected, sig)) return null;
  if (!(Number(expStr) > Date.now())) return null;
  const email = fromB64url(emailB64).toLowerCase();
  const partner = activePartners().find((p) => p.code === code);
  if (!partner || !email || !emailAuthorized(partner, email)) return null;
  return { partner, email };
}

/* ── Sessions ──────────────────────────────────────────────────────── */

export async function createPartnerSession(env, partner, email) {
  const message = `exp=${Date.now() + PARTNER_SESSION_TTL * 1000}&code=${partner.code}&em=${b64url(email)}`;
  const sig = await hmacSignB64Url(message, partnerSecret(env, partner.code));
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

/* Returns the authenticated partner registry entry (with .sessionEmail), or null. */
export async function authedPartner(request, env) {
  if (!env.ADMIN_SECRET) return null;
  const value = parseCookies(request)[PARTNER_COOKIE];
  if (!value) return null;
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) return null;
  const message = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  const m = message.match(/^exp=(\d+)&code=([a-z0-9-]+)&em=([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  if (Number(m[1]) < Date.now()) return null;
  const partner = activePartners().find((p) => p.code === m[2]);
  if (!partner) return null;
  const expected = await hmacSignB64Url(message, partnerSecret(env, partner.code));
  if (!constantTimeEqualStr(expected, sig)) return null;
  const email = fromB64url(m[3]).toLowerCase();
  if (!email || !emailAuthorized(partner, email)) return null;
  return { ...partner, sessionEmail: email };
}
