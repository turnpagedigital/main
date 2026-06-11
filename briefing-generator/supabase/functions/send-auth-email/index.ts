// Supabase Edge Function: Send Email Hook
//
// Called by Supabase Auth instead of sending emails via built-in SMTP.
// Detects the redirect_to domain and routes to the matching brand template.
// Sends via Resend.
//
// Required env vars (set via `supabase secrets set ...`):
//   RESEND_API_KEY         — Resend API key (re_...)
//   SEND_EMAIL_HOOK_SECRET — Supabase Auth Hook shared secret (v1,whsec_...)
//                            Configure both in Supabase Auth → Hooks.
//
// Sender domains (must be verified in Resend):
//   intel.turnpagedigital.com  emails → noreply@turnpagedigital.com
//   rewindtariffs.com          emails → noreply@rewindtariffs.com (existing)
//
// Deploy:
//   supabase functions deploy send-auth-email
// Then in Supabase Auth → Hooks → Send Email Hook, set URL to this function's
// public endpoint and paste the SEND_EMAIL_HOOK_SECRET.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { intelTemplate } from "./templates/intel.ts";
import { rewindTemplate } from "./templates/rewind.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET")!.replace("v1,whsec_", "");

interface SendEmailPayload {
  user: {
    id: string;
    email: string;
    [key: string]: unknown;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "magiclink"
      | "recovery"
      | "invite"
      | "email_change_current"
      | "email_change_new"
      | "reauthentication";
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

interface BrandConfig {
  from: string;
  templateFn: (args: {
    actionUrl: string;
    actionType: string;
    email: string;
  }) => { subject: string; html: string };
}

function pickBrand(redirectTo: string): BrandConfig {
  const url = redirectTo.toLowerCase();
  // Intel briefing — both the legacy subdomain (intel.turnpagedigital.com)
  // and the consolidated path mount (turnpagedigital.com/intel/...). Matching
  // on the bare apex is safe: the main marketing site doesn't use this auth
  // hook, only the /intel dashboards do.
  if (url.includes("turnpagedigital.com")) {
    return {
      from: "Turnpage Intel <noreply@turnpagedigital.com>",
      templateFn: intelTemplate,
    };
  }
  // Default — Rewind Tariffs (existing site)
  return {
    from: "Rewind Tariffs <noreply@rewindtariffs.com>",
    templateFn: rewindTemplate,
  };
}

function buildActionUrl(siteUrl: string, tokenHash: string, actionType: string, redirectTo: string): string {
  // Supabase verify endpoint pattern. The link is what Supabase normally constructs.
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo,
  });
  return `${siteUrl}/auth/v1/verify?${params.toString()}`;
}

async function sendViaResend(args: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 1. Verify Supabase signature
  const headers = Object.fromEntries(req.headers);
  const rawBody = await req.text();
  let payload: SendEmailPayload;
  try {
    const wh = new Webhook(HOOK_SECRET);
    payload = wh.verify(rawBody, headers) as SendEmailPayload;
  } catch (err) {
    console.error("Signature verification failed:", err);
    return new Response("Unauthorized", { status: 401 });
  }

  const { user, email_data } = payload;
  const { token_hash, redirect_to, email_action_type, site_url } = email_data;

  // 2. Pick brand + template based on redirect_to
  const brand = pickBrand(redirect_to);
  const actionUrl = buildActionUrl(site_url, token_hash, email_action_type, redirect_to);
  const { subject, html } = brand.templateFn({
    actionUrl,
    actionType: email_action_type,
    email: user.email,
  });

  // 3. Send via Resend
  const send = await sendViaResend({
    from: brand.from,
    to: user.email,
    subject,
    html,
  });

  if (!send.ok) {
    console.error("Resend send failed:", send.status, send.body);
    return new Response(
      JSON.stringify({ error: "Email send failed", status: send.status, detail: send.body }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`Sent ${email_action_type} email to ${user.email} via ${brand.from}`);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
