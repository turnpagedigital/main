// Rewind Tariffs branding (existing site)
// Default fallback when redirect_to does not match a known intel pattern.
// Approximates the existing rewindtariffs.com email template.

interface TemplateArgs {
  actionUrl: string;
  actionType: string;
  email: string;
}

export function rewindTemplate({ actionUrl, actionType }: TemplateArgs): {
  subject: string;
  html: string;
} {
  const isSignup = actionType === "signup" || actionType === "invite";
  const subject = isSignup
    ? "Verify your email — Rewind Tariffs"
    : "Sign in to Rewind Tariffs";

  const headline = isSignup ? "Verify Your Email" : "Sign in to your account";
  const subline = isSignup
    ? "Click the button below to complete your sign-up and continue with your free tariff refund assessment."
    : "Click the button below to sign in.";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#FFFFFF;max-width:560px;">
          <tr>
            <td style="background:#1F2937;padding:24px 32px;text-align:center;">
              <div style="display:inline-block;background:#EF4444;color:#FFFFFF;padding:6px 10px;font-size:14px;font-weight:700;border-radius:4px;margin-right:8px;">R</div>
              <span style="color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:0.02em;">Rewind Tariffs</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;color:#0A0A0A;text-align:center;">
              <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:700;color:#0A0A0A;">
                ${headline}
              </h1>
              <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#6B7280;">
                ${subline}
              </p>

              <a href="${actionUrl}"
                 style="display:inline-block;background:#EF4444;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:6px;">
                ${isSignup ? "Verify & continue →" : "Sign in →"}
              </a>

              <p style="margin:40px 0 0 0;font-size:12px;color:#9CA3AF;line-height:1.5;">
                This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#F9FAFB;padding:20px 32px;text-align:center;font-size:12px;color:#9CA3AF;">
              rewindtariffs.com &nbsp;·&nbsp; © 2026 Rewind Tariffs
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
