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

export async function onRequestPost(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const { env } = context;
    const resendKey = env.RESEND_API_KEY;
    const notifyEmail = env.NOTIFY_EMAIL || "info@turnpagedigital.com";
    const fromEmail = env.FROM_EMAIL || "Turnpage Digital Markets <noreply@turnpagedigital.com>";

    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await context.request.json();
    const { firstName, lastName, email, phone, telegram, whatsapp, subject, message } = body;

    if (!firstName || !lastName || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Subject labels
    const subjectLabels = {
      quote: "Request a Quote",
      claims: "Claims Inquiry",
      partnership: "Partnership",
      other: "Other",
    };

    const subjectLine = `New inquiry from ${firstName} ${lastName} — ${subjectLabels[subject] || subject}`;

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
              <td style="padding: 8px 0; font-weight: 600;">${firstName} ${lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #1a1a1a;">${email}</a></td>
            </tr>
            ${phone ? `<tr><td style="padding: 8px 0; color: #666;">Phone</td><td style="padding: 8px 0;">${phone}</td></tr>` : ""}
            ${telegram ? `<tr><td style="padding: 8px 0; color: #666;">Telegram</td><td style="padding: 8px 0;">${telegram}</td></tr>` : ""}
            ${whatsapp ? `<tr><td style="padding: 8px 0; color: #666;">WhatsApp</td><td style="padding: 8px 0;">${whatsapp}</td></tr>` : ""}
            <tr>
              <td style="padding: 8px 0; color: #666;">Subject</td>
              <td style="padding: 8px 0;">${subjectLabels[subject] || subject}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          <div style="font-size: 14px; line-height: 1.6; color: #333;">
            <strong style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Message</strong>
            <p style="margin: 8px 0 0; white-space: pre-wrap;">${message}</p>
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
          subject: subjectLabels[subject] || subject, message,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => console.error("Google Sheet error:", err.message));
    }

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
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
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}
