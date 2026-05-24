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

## Site Structure (rebuilt April 2026)

The site is a multi-page Vite/React SPA with hash-based in-app routing (no React Router). Positioning is **TPDM as the OTC desk for rights holders**, with sub-brands per claim type. AI Copyright is the headline sub-brand; Crypto is live; Bankruptcy is "Coming Soon."

### Routes (hash-based)
- `#/` → Home (rights-holder positioning, sub-brand cards, $1B+ track record)
- `#/ai-copyright` → AI Copyright sub-brand (deep page, Top 12 cases)
- `#/crypto` → Crypto Claims sub-brand (placeholder copy — replace with turnpage-crypto content)
- `#/briefings` → Briefings library (blog index)
- `#/briefings/SLUG` → Single briefing
- `#/contact` → Contact / intake form (reads `?source=ai-copyright` from hash to attribute leads)
- `#/privacy`, `#/terms` → Legal pages

### File layout
```
src/
  main.jsx                 — Vite entry (don't change)
  App.jsx                  — Router shell + page table
  data/
    tokens.js              — Color and font tokens
    css.js                 — Global CSS (injected at runtime)
    cases.js               — Top 12 AI copyright cases (edit to update tracker)
  lib/
    router.js              — useHashRoute() hook + parseHash() + hashHref()
  components/
    NavBar.jsx             — Fixed top nav with mobile hamburger menu
    Footer.jsx             — 4-col footer
    Hero.jsx               — Subpage hero (eyebrow + title + accentTitle + subtitle)
    IntakeForm.jsx         — Reusable contact form, posts to /api/contact
  pages/
    Home.jsx               — Marketing landing
    AICopyright.jsx        — AI Copyright deep page
    Crypto.jsx             — Crypto Claims sub-brand (PLACEHOLDER copy)
    Briefings.jsx          — Briefings library list
    Briefing.jsx           — Single briefing (renders markdown via marked)
    Contact.jsx            — Contact page wrapping IntakeForm
    Legal.jsx              — Privacy + Terms (kind="privacy" or "terms")
    NotFound.jsx           — 404
public/
  briefings/
    index.json             — Index of all briefings (edit when posting)
    YYYY-MM-DD-SLUG.md     — Briefing markdown files
  bg-paper.jpg, *.png      — Existing imagery (unchanged)
functions/api/
  contact.js               — Cloudflare Pages Function (Resend + Google Sheet)
index.html                 — Vite entry, meta + OG tags
```

### Editing common things
- **Update a case** → edit `src/data/cases.js`. Each entry has `rank`, `name`, `defendants`, `court`, `status`, `damages`, `summary`.
- **Post a briefing** → see "Posting a Briefing" below.
- **Replace Crypto placeholder copy** → edit `src/pages/Crypto.jsx`. Structure mirrors AICopyright.jsx.
- **Hero copy** → home is in `src/pages/Home.jsx`; AI Copyright hero is in `src/pages/AICopyright.jsx` (uses the shared `Hero` component).
- **Subject options on contact form** → edit `SUBJECT_OPTIONS` in `src/components/IntakeForm.jsx`. Also update `subjectLabels` in `functions/api/contact.js` so the email shows the right label.

## Posting a Briefing

1. Create a markdown file at `public/briefings/YYYY-MM-DD-slug.md`. The first H1 is auto-stripped from the rendered body (the title is rendered separately from the index, so duplicating it isn't needed).
2. Open `public/briefings/index.json` and add a new entry to the `items` array:
   ```json
   {
     "slug": "2026-05-14-bartz-fairness-hearing",
     "date": "2026-05-14",
     "title": "Headline that appears on the card and the briefing page",
     "summary": "1–3 sentence card preview shown on /briefings.",
     "tags": ["Bartz", "Anthropic"]
   }
   ```
3. `git add -A && git commit -m "Briefing: Bartz fairness hearing" && git push`. Cloudflare auto-deploys in ~1–2 min.

## Contact Form
- Fields: First Name, Last Name (required), Email (required), Phone, Telegram, WhatsApp (optional), Subject (required), Message (required)
- Hidden `source` field captures which sub-brand drove the lead (`ai-copyright`, `crypto`, `briefings`).
- Submits to `/api/contact` which:
  1. Sends formatted HTML email to info@turnpagedigital.com via Resend API (now includes the Source field)
  2. Logs row to Google Sheet via Apps Script (now includes the source label)

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
