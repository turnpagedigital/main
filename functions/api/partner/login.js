/* POST /api/partner/login — body {token}: redeem an emailed magic-link
   token for a 12h session cookie. Tokens are HMAC-signed, expire after
   15 minutes, and only redeem while the email remains on the partner's
   allowlist. */

import {
  jsonResponse, redeemLoginToken,
  createPartnerSession, buildPartnerCookie, PARTNER_SESSION_TTL,
} from "./_auth.js";

const FAIL_DELAY_MS = 300;

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_SECRET) {
    return jsonResponse({ ok: false, error: "Portal is not configured" }, 500);
  }
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const redeemed = await redeemLoginToken(env, String((body && body.token) || ""));
  if (!redeemed) {
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return jsonResponse({ ok: false, error: "This sign-in link is invalid or has expired — request a new one." }, 401);
  }

  const { partner, email } = redeemed;
  const cookieValue = await createPartnerSession(env, partner, email);
  return jsonResponse(
    { ok: true, partner: { code: partner.code, name: partner.name } },
    200,
    { "Set-Cookie": buildPartnerCookie(cookieValue, PARTNER_SESSION_TTL) },
  );
}
