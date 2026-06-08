/**
 * Cloudflare Pages Function: /api/contact
 *
 * Receives form submissions and sends an email notification
 * to info@turnpagedigital.com via Resend API.
 *
 * Environment variables (set in Cloudflare Pages dashboard → Settings → Environment variables):
 *   RESEND_API_KEY  — your Resend API key
 *   NOTIFY_EMAIL    — recipient (default: info@turnpagedigital.com)
 *   FROM_EMAIL      — sender (default: Turnpage Digital Markets <noreply@turnpagedigital.com>)
 *   GOOGLE_SHEET_URL — your Google Apps Script web app URL
 */

/* ── CORS allowlist ─────────────────────────────────────────────────────────
   Echo the request Origin back only if it matches an approved value.
   Anything else gets the canonical production URL, which causes the browser
   to block the response on the requester's side. */
const ALLOWED_ORIGINS = [
  "https://turnpagedigital.com",
  "https://www.turnpagedigital.com",
];
function corsHeadersFor(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.turnpagedigital\.pages\.dev$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://turnpagedigital.com",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/* ── HTML escape ────────────────────────────────────────────────────────────
   Every user-supplied value rendered into the notification email must pass
   through this. Without it, a name like `<script>...` would render as
   executing HTML in the inbox client. */
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── Field length limits ────────────────────────────────────────────────────
   Reject submissions where any field exceeds a reasonable cap.
   Stops 1 MB pastes and basic resource-exhaustion abuse. */
const FIELD_LIMITS = {
  firstName: 100, lastName: 100, email: 254,
  phone: 40, telegram: 80, whatsapp: 40,
  subject: 80, message: 5000, source: 80,
};

/* Helper to wrap fetch with a timeout */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = corsHeadersFor(request);

  try {
    const resendKey = env.RESEND_API_KEY;
    const notifyEmail = env.NOTIFY_EMAIL || "info@turnpagedigital.com";
    const fromEmail = env.FROM_EMAIL || "Turnpage Digital Markets <noreply@turnpagedigital.com>";

    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, telegram, whatsapp, subject, message, source } = body;

    if (!firstName || !lastName || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Length check — reject if any field exceeds its cap
    for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
      const v = body[key];
      if (typeof v === "string" && v.length > limit) {
        return new Response(
          JSON.stringify({ error: `Field "${key}" exceeds maximum length` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Subject labels
    const subjectLabels = {
      "ai-copyright": "AI Copyright Inquiry",
      "crypto": "Crypto Claims Inquiry",
      quote: "Request a Quote",
      claims: "General Claims Inquiry",
      partnership: "Partnership",
      other: "Other",
    };

    // Friendly source labels
    const sourceLabels = {
      "ai-copyright": "AI Copyright page",
      "crypto": "Crypto Claims page",
      "briefings": "Briefings",
    };
    const sourceLabel = source ? (sourceLabels[source] || source) : "";
    const subjectFriendly = subjectLabels[subject] || subject;

    const subjectLine = `New inquiry from ${firstName} ${lastName} — ${subjectFriendly}`;

    // Pre-escape every value before interpolation
    const safe = {
      firstName: escapeHtml(firstName),
      lastName:  escapeHtml(lastName),
      email:     escapeHtml(email),
      phone:     escapeHtml(phone),
      telegram:  escapeHtml(telegram),
      whatsapp:  escapeHtml(whatsapp),
      message:   escapeHtml(message),
      subject:   escapeHtml(subjectFriendly),
      source:    escapeHtml(sourceLabel),
    };
    // Email address used inside an href="mailto:…" attribute — URL-encode
    const emailHref = encodeURIComponent(email);

    // Build notification email HTML
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a1a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #D4FF00; margin: 0; font-size: 18px;">New Contact Form Submission</h2>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 100px;">Name</td>
              <td style="padding: 8px 0; font-weight: 600;">${safe.firstName} ${safe.lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${emailHref}" style="color: #1a1a1a;">${safe.email}</a></td>
            </tr>
            ${phone    ? `<tr><td style="padding: 8px 0; color: #666;">Phone</td><td style="padding: 8px 0;">${safe.phone}</td></tr>` : ""}
            ${telegram ? `<tr><td style="padding: 8px 0; color: #666;">Telegram</td><td style="padding: 8px 0;">${safe.telegram}</td></tr>` : ""}
            ${whatsapp ? `<tr><td style="padding: 8px 0; color: #666;">WhatsApp</td><td style="padding: 8px 0;">${safe.whatsapp}</td></tr>` : ""}
            <tr>
              <td style="padding: 8px 0; color: #666;">Subject</td>
              <td style="padding: 8px 0;">${safe.subject}</td>
            </tr>
            ${sourceLabel ? `<tr><td style="padding: 8px 0; color: #666;">Source</td><td style="padding: 8px 0;">${safe.source}</td></tr>` : ""}
          </table>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          <div style="font-size: 14px; line-height: 1.6; color: #333;">
            <strong style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Message</strong>
            <p style="margin: 8px 0 0; white-space: pre-wrap;">${safe.message}</p>
          </div>
        </div>
        <p style="font-size: 11px; color: #999; margin-top: 16px; text-align: center;">
          Sent via turnpagedigital.com contact form
        </p>
      </div>
    `;

    // Send to Google Sheet (fire and forget — don't block on it)
    const sheetUrl = env.GOOGLE_SHEET_URL;
    if (sheetUrl) {
      fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone, telegram, whatsapp,
          subject: subjectFriendly, message,
          source: sourceLabel,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => console.error("Google Sheet error:", err.message));
    }

    // Send via Resend (with 8-second timeout)
    const resendRes = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notifyEmail],
        reply_to: email,
        subject: subjectLine,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      throw new Error("Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Contact API error:", err.message);
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please email us directly at info@turnpagedigital.com." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, { headers: corsHeadersFor(context.request) });
}
