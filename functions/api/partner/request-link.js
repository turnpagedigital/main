/* POST /api/partner/request-link — body {email}. If the address is on a
   partner's allowlist, email it a 15-minute sign-in link. The response is
   identical either way — same body, same status, and same timing: the send
   happens via waitUntil AFTER the response, so neither latency nor error
   paths reveal allowlist membership. Rate-limited per IP and per address. */

import { jsonResponse, findPartnerByEmail, mintLoginToken } from "./_auth.js";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const recent = new Map(); // key -> [timestamps]

function limited(key, now) {
  const list = (recent.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.set(key, list);
  if (list.length >= MAX_PER_WINDOW) return true;
  list.push(now);
  // Prune stale keys instead of clearing (a clear would reset live counters)
  if (recent.size > 5000) {
    for (const [k, times] of recent) {
      if (times.every((t) => now - t >= WINDOW_MS)) recent.delete(k);
      if (recent.size <= 5000) break;
    }
  }
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ADMIN_SECRET || !env.RESEND_API_KEY) {
    return jsonResponse({ ok: false, error: "Portal sign-in is not configured" }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }
  const email = String((body && body.email) || "").trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: "A valid email is required" }, 400);
  }

  const now = Date.now();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (limited(`ip:${ip}`, now) || limited(`em:${email}`, now)) {
    return jsonResponse({ ok: false, error: "Too many requests — try again in a few minutes." }, 429);
  }

  const partner = findPartnerByEmail(email);
  if (partner) {
    /* Sent AFTER the response via waitUntil — an authorized address must
       not answer slower (or with a different error) than an unknown one. */
    context.waitUntil((async () => {
      try {
        const token = await mintLoginToken(env, partner, email);
        const link = `https://turnpagedigital.com/partners#t=${token}`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: env.FROM_EMAIL || "Turnpage Digital Markets <noreply@turnpagedigital.com>",
            to: [email],
            subject: "Your partner portal sign-in link",
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;">
                <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
                  <h2 style="color:#D4FF00;margin:0;font-size:18px;">Turnpage Partner Portal</h2>
                </div>
                <div style="background:#fff;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;font-size:14px;line-height:1.6;color:#333;">
                  <p style="margin:0 0 16px;">Use the button below to sign in to the ${partner.name} partner portal. The link works for <b>15 minutes</b>.</p>
                  <p style="margin:0 0 16px;"><a href="${link}" style="display:inline-block;background:#D4FF00;color:#0A0A0A;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;">Sign in</a></p>
                  <p style="margin:0;color:#888;font-size:12px;">Didn't request this? You can ignore it — nothing happens without the link.</p>
                </div>
              </div>`,
          }),
        });
        if (!res.ok) console.error("request-link resend:", res.status, (await res.text()).slice(0, 200));
      } catch (err) {
        console.error("request-link send error:", err.message);
      }
    })());
  }

    /* Same response whether or not the address was on a list. */
  return jsonResponse({ ok: true });
}
