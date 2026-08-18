/* POST /api/partner/message — a signed-in partner sends Andrew a message
   about one of their referred leads. Delivered by email ONLY to
   PARTNER_NOTIFY_EMAIL (default ag@turnpagedigital.com) via Resend, with
   up to 3 attachments. Light per-partner rate limit; every partner-supplied
   string is HTML-escaped before it touches the email body. */

import { jsonResponse, authedPartner } from "./_auth.js";

const MAX_FILES = 3;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf", "image/png", "image/jpeg", "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const LIMITS = { subject: 200, message: 5000, leadName: 200, leadEmail: 254 };

/* Best-effort in-memory rate limit: per partner code, sliding hour. */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const recent = new Map();

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function onRequestPost({ request, env }) {
  const partner = await authedPartner(request, env);
  if (!partner) return jsonResponse({ ok: false, error: "Not signed in" }, 401);
  if (!env.RESEND_API_KEY) return jsonResponse({ ok: false, error: "Messaging is not configured" }, 500);

  const now = Date.now();
  const stamps = (recent.get(partner.code) || []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_PER_WINDOW) {
    return jsonResponse({ ok: false, error: "Message limit reached — please try again later." }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  const lead = body.lead && typeof body.lead === "object" ? body.lead : {};
  const files = Array.isArray(body.files) ? body.files : [];

  if (!subject) return jsonResponse({ ok: false, error: "Subject is required" }, 400);
  if (!message) return jsonResponse({ ok: false, error: "Message is required" }, 400);
  if (subject.length > LIMITS.subject) return jsonResponse({ ok: false, error: "Subject is too long" }, 400);
  if (message.length > LIMITS.message) return jsonResponse({ ok: false, error: "Message is too long" }, 400);
  if (files.length > MAX_FILES) return jsonResponse({ ok: false, error: `At most ${MAX_FILES} attachments` }, 400);

  const attachments = [];
  for (const f of files) {
    const name = String((f && f.name) || "attachment").replace(/[^\w.\- ()]/g, "_").slice(0, 120);
    const type = String((f && f.type) || "");
    const data = String((f && f.dataBase64) || "");
    if (!ALLOWED_TYPES.has(type)) {
      return jsonResponse({ ok: false, error: `File type not allowed: ${name}` }, 400);
    }
    if (!data || data.length * 0.75 > MAX_FILE_BYTES) {
      return jsonResponse({ ok: false, error: `"${name}" is too large (8 MB max)` }, 400);
    }
    attachments.push({ filename: name, content: data });
  }

  const safe = {
    partnerName: escapeHtml(partner.name),
    partnerCode: escapeHtml(partner.code),
    subject: escapeHtml(subject),
    message: escapeHtml(message),
    leadName: escapeHtml(String(lead.name || "").slice(0, LIMITS.leadName)),
    leadEmail: escapeHtml(String(lead.email || "").slice(0, LIMITS.leadEmail)),
  };

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h2 style="color:#D4FF00;margin:0;font-size:18px;">Partner message — ${safe.partnerName}</h2>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#666;width:110px;">Partner</td><td style="padding:6px 0;font-weight:600;">${safe.partnerName} (${safe.partnerCode})</td></tr>
          ${safe.leadName || safe.leadEmail ? `<tr><td style="padding:6px 0;color:#666;">About lead</td><td style="padding:6px 0;font-weight:600;">${safe.leadName}${safe.leadEmail ? ` &lt;${safe.leadEmail}&gt;` : ""}</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#666;">Attachments</td><td style="padding:6px 0;">${attachments.length}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;" />
        <div style="font-size:14px;line-height:1.6;color:#333;">
          <p style="margin:0;white-space:pre-wrap;">${safe.message}</p>
        </div>
      </div>
      <p style="font-size:11px;color:#999;margin-top:16px;text-align:center;">Sent from the partner portal at turnpagedigital.com/partners</p>
    </div>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "Turnpage Digital Markets <noreply@turnpagedigital.com>",
      to: [env.PARTNER_NOTIFY_EMAIL || "ag@turnpagedigital.com"],
      subject: `[Partner: ${partner.name}] ${subject}`,
      html,
      ...(attachments.length ? { attachments } : {}),
    }),
  });
  if (!resendRes.ok) {
    console.error("partner message resend:", resendRes.status, (await resendRes.text()).slice(0, 200));
    return jsonResponse({ ok: false, error: "Could not send the message — please try again." }, 502);
  }

  stamps.push(now);
  recent.set(partner.code, stamps);
  return jsonResponse({ ok: true });
}
