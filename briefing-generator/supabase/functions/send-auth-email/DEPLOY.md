# Send Email Hook — Deploy Steps

This Edge Function intercepts every Supabase Auth email send and routes to the
correct brand template based on `redirect_to`:

- `intel.turnpagedigital.com` → Turnpage Intel template (dark + neon)
- everything else → existing Rewind Tariffs template

Sender: Resend (existing account; rewindtariffs.com already verified).

## One-time setup

### 1. Verify `turnpagedigital.com` in Resend

Log in to Resend → Domains → Add Domain → enter `turnpagedigital.com`. Resend
will display 3 DNS records (SPF TXT, DKIM CNAME × 2, optional DMARC TXT). Add
them as records on `turnpagedigital.com` in Cloudflare DNS. Wait 2–10 minutes
for verification.

Once verified, you can send from `noreply@turnpagedigital.com`.

### 2. Install Supabase CLI + login

```bash
brew install supabase/tap/supabase
supabase login                # opens browser
cd "/Users/waquoitcapital/.../daily-briefing-site"
supabase link --project-ref eorvwzbvsgxillflanae
```

### 3. Set function secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxx...
supabase secrets set SEND_EMAIL_HOOK_SECRET=v1,whsec_xxx...
```

The `SEND_EMAIL_HOOK_SECRET` is the value Supabase generates when you create
the hook in Step 5 below. So set RESEND_API_KEY first, deploy, then come back
and set the hook secret after Step 5.

### 4. Deploy the function

```bash
supabase functions deploy send-auth-email
```

The CLI prints the function URL:
`https://eorvwzbvsgxillflanae.functions.supabase.co/send-auth-email`

### 5. Configure the Auth Hook

Supabase Dashboard → Authentication → Hooks → Send Email Hook → Enable:

- **URL**: `https://eorvwzbvsgxillflanae.functions.supabase.co/send-auth-email`
- **Method**: Webhook (HTTPS)
- Supabase generates a webhook secret. Copy it.

Run `supabase secrets set SEND_EMAIL_HOOK_SECRET=v1,whsec_xxx...` with the
generated secret, then redeploy: `supabase functions deploy send-auth-email`.

### 6. Test

Trigger a sign-in from intel.turnpagedigital.com. The email you receive should
now have:

- Sender: `Turnpage Intel <noreply@turnpagedigital.com>`
- Subject: "Sign in to Turnpage Intel"
- Body: Black header strip with "Turnpage Digital Markets" eyebrow + "Daily
  Briefing — Intel" headline, neon-accent body, square-corner CTA.

Trigger a sign-in from rewindtariffs.com (or any other domain): you should get
the existing red Rewind Tariffs template.

## Troubleshooting

- **401 Unauthorized in function logs** — the `SEND_EMAIL_HOOK_SECRET` doesn't
  match the secret Supabase generated. Re-copy from Hooks panel, re-run
  `supabase secrets set`, redeploy.
- **Resend send failed (status 422)** — the sender domain isn't verified.
  Check Resend → Domains.
- **No email received** — check function logs in Supabase dashboard
  (Edge Functions → send-auth-email → Logs). Also check Resend → Activity
  → recent sends for delivery status / bounces.
