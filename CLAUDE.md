# Turnpage Digital Markets — Project Reference

## Architecture
- **Stack**: Vite + React SPA, Cloudflare Pages hosting
- **Pattern**: Same as rewind-tariffs site
- **Deploy**: Push to GitHub → Cloudflare Pages auto-builds and deploys (NO wrangler)
- **Repo**: https://github.com/turnpagedigital/main.git
- **Branch**: main

## Local Paths (Mac)
- **turnpagedigital.com**: `/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/turnpagedigital.com`
- **rewind-tariffs**: `/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/rewind-tariffs`
- **turnpage-crypto**: separate folder, static HTML site for crypto claims

## Deploy Command
```bash
cd "/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/turnpagedigital.com" && git add -A && git commit -m "description here" && git push
```
Note: After push, changes take ~1-2 min. User may need Cmd+Shift+R to clear cache.

## Key Files
- `src/App.jsx` — Full site (hero + contact form), inline styles
- `functions/api/contact.js` — Cloudflare Pages Function, sends email via Resend + logs to Google Sheet
- `index.html` — Vite entry point, has OG/meta tags, favicon is `/favicon.png`
- `public/` — All images (bg-paper.jpg, logos, etc.)

## Contact Form
- Fields: First Name, Last Name (required), Email (required), Phone, Telegram, WhatsApp (optional), Subject (required), Message (required)
- Submits to `/api/contact` which:
  1. Sends formatted HTML email to info@turnpagedigital.com via Resend API
  2. Logs row to Google Sheet via Apps Script

## Cloudflare Environment Variables
- `RESEND_API_KEY` — Resend API key
- `NOTIFY_EMAIL` — recipient (default: info@turnpagedigital.com)
- `FROM_EMAIL` — sender (default: Turnpage Digital Markets <noreply@turnpagedigital.com>)
- `GOOGLE_SHEET_URL` — Google Apps Script web app URL

## Design Tokens
- Neon green: #D4FF00
- Background: #000
- Font: Archivo

## User Preferences
- TALK TO ME LIKE I DON'T UNDERSTAND ANYTHING — simple, step-by-step instructions
- Deploys via GitHub push (NOT wrangler)
- No Supabase, no auth, no magic links
- Owner: Andrew (andrewglantz@gmail.com)

## Other Projects
- **rewind-tariffs**: IEEPA tariff refund site with CIT case tracker (`public/cit-cases.json`), Vite+React, Cloudflare Pages
- **turnpage-crypto**: Static HTML crypto claims site, separate repo
