// Intel branding (Turnpage Digital Markets / intel.turnpagedigital.com)
// Used when redirect_to includes intel.turnpagedigital.com.

interface TemplateArgs {
  actionUrl: string;
  actionType: string;
  email: string;
}

export function intelTemplate({ actionUrl, actionType }: TemplateArgs): {
  subject: string;
  html: string;
} {
  const isSignup = actionType === "signup" || actionType === "invite";
  const subject = isSignup
    ? "Activate your Turnpage Intel briefing"
    : "Sign in to Turnpage Intel";

  const headline = isSignup ? "Activate your Intel access" : "Sign in to Intel";
  const subline = isSignup
    ? "Click below to confirm your email and open today's briefing."
    : "Click below to read today's briefing.";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4F5F7;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#FFFFFF;max-width:560px;">
          <!-- Header strip -->
          <tr>
            <td style="background:#0A0A0A;padding:24px 32px;color:#FFFFFF;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#D4FF00;margin-bottom:6px;">
                Turnpage Digital Markets
              </div>
              <div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;">
                Daily Briefing — Intel
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;color:#0A0A0A;">
              <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">
                ${headline}
              </h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:rgba(10,10,10,0.7);">
                ${subline}
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:#0A0A0A;">
                    <a href="${actionUrl}"
                       style="display:inline-block;padding:14px 28px;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.04em;">
                      ${isSignup ? "Activate & continue →" : "Sign in →"}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0 0;font-size:12px;color:rgba(10,10,10,0.45);line-height:1.5;">
                Link expires in 1 hour. If you didn't request this, ignore the email — no further action needed.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(10,10,10,0.08);padding:20px 32px;font-size:11px;color:rgba(10,10,10,0.5);letter-spacing:0.04em;">
              intel.turnpagedigital.com &nbsp;·&nbsp; Daily briefings on tariffs, AI copyright, crypto insolvency, fraud recovery, $1B+ class actions &amp; mass arbitration, bankruptcy creditor rights
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
