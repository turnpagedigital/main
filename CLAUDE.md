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

## Checks (run before pushing)
```bash
npm run lint    # ESLint — errors gate real breakage; warnings are advisory
npm test        # node:test unit tests (nav cascade, session HMAC, redirects)
npm run build   # Vite build must stay green
```

## Site Structure (rebuilt April 2026, refactored May 2026)

The site is a multi-page Vite/React SPA with **HTML5 history routing** (clean paths, not hash fragments). Positioning is **TPDM as the OTC desk for rights holders**, with sub-brands per claim type. AI Copyright is the headline sub-brand; Crypto is live; Bankruptcy is "Coming Soon."

### Routes (history mode — clean paths)
- `/` → Home
- `/ai-copyright` → AI Copyright sub-brand
- `/crypto` → Locked Crypto sub-brand
- `/litigation-finance` → Litigation Finance sub-brand
- `/press` → Press & insights
- `/briefings` → Briefings library
- `/briefings/SLUG` → Single briefing
- `/contact` → Contact form (reads `?source=ai-copyright` from query string)
- `/legal` → Legal pages (Privacy/Terms)
- `/admin` and `/admin/<tab>` → Admin panel

Legacy `/#/path` URLs are auto-redirected to `/path` via a shim in `src/main.jsx` (runs before React mounts). Don't reintroduce hash routing.

### File layout
```
src/
  main.jsx                 — Vite entry (don't change)
  App.jsx                  — Router shell + page table
  data/
    tokens.js              — Color and font tokens
    css.js                 — Global CSS (injected at runtime)
    cases.js               — Top 12 AI copyright cases (edit to update tracker)
    deals.json             — Deal cards for Home + Crypto (edit via chat OR /#/admin)
    translations.js        — 8-language string table (en/es/fr/de/it/pt/ko/zh)
  lib/
    router.js              — useHashRoute() hook + parseHash() + hashHref()
    i18n.js                — Language provider + LANGUAGES list + useI18n()
  components/
    NavBar.jsx             — Fixed top nav with mobile hamburger menu
    Footer.jsx             — 4-col footer
    Hero.jsx               — Subpage hero (eyebrow + title + accentTitle + subtitle)
    IntakeForm.jsx         — Reusable contact form, posts to /api/contact
    DealCard.jsx           — Single deal tile with flip animation (front/back)
    LanguageSelector.jsx   — Globe + language dropdown (banner + footer)
    AnnouncementBanner.jsx — Thin promo bar above the nav
  pages/
    Home.jsx               — Marketing landing
    AICopyright.jsx        — AI Copyright deep page
    Crypto.jsx             — Crypto Claims sub-brand
    Briefings.jsx          — Briefings library list
    Briefing.jsx           — Single briefing (renders markdown via marked)
    Contact.jsx            — Contact page wrapping IntakeForm
    Legal.jsx              — Privacy + Terms (kind="privacy" or "terms")
    Admin.jsx              — Admin panel (login + deal editor at /#/admin)
    NotFound.jsx           — 404
public/
  briefings/
    index.json             — Index of all briefings (edit when posting)
    YYYY-MM-DD-SLUG.md     — Briefing markdown files
  bg-paper.jpg, *.png      — Existing imagery (unchanged)
functions/api/
  contact.js               — Cloudflare Pages Function (Resend + Google Sheet)
  admin/
    _utils.js              — HMAC session cookie + cookie parsing helpers
    login.js               — POST: verify ADMIN_PASSWORD, set session cookie
    logout.js              — POST: clear session cookie
    session.js             — GET: check if session is valid (for frontend init)
    deals.js               — GET/PUT deals.json via GitHub Contents API
index.html                 — Vite entry, meta + OG tags
```

### Editing common things
- **Update a case** → edit `src/data/cases.js`. Each entry has `rank`, `name`, `defendants`, `court`, `status`, `damages`, `summary`.
- **Post a briefing** → see "Posting a Briefing" below.
- **Replace Crypto placeholder copy** → edit `src/pages/Crypto.jsx`. Structure mirrors AICopyright.jsx.
- **Hero copy** → home is in `src/pages/Home.jsx`; AI Copyright hero is in `src/pages/AICopyright.jsx` (uses the shared `Hero` component).
- **Subject options on contact form** → edit `SUBJECT_OPTIONS` in `src/components/IntakeForm.jsx`. Also update `subjectLabels` in `functions/api/contact.js` so the email shows the right label.
- **Change a site-wide color (NEON, INK, …)** → `/admin/css` → Colors & Tokens, or edit `src/data/tokens.js`. Everything importing the token follows on the next deploy.
- **Change FAQ/Testimonials/CTA section colors** → `/admin/css` → Section Palettes, or edit `src/data/section-palettes.json`. Those sections resolve colors from this file at render time (`src/lib/palette-resolver.js`); `tests/palette-equivalence.test.js` snapshots the expected values — update it when intentionally changing a palette.

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
- `ADMIN_PASSWORD` — admin login password (for /#/admin)
- `ADMIN_SECRET` — random 32+ char string, signs session cookies
- `GITHUB_TOKEN` — fine-grained PAT scoped to this repo with "Contents: Read and write"
- `GITHUB_REPO` — `turnpagedigital/main`
- `GITHUB_BRANCH` — `dev` on the dev environment, `main` on production

## Admin Panel (`/admin`)

Admin panel manages nearly all editable content on the site. Single source of truth: JSON files under `src/data/`. Two ways to edit:
1. **Chat with Claude** — Claude edits the relevant JSON file and pushes via git.
2. **Admin UI at `/admin`** — user logs in with `ADMIN_PASSWORD`, edits via per-tab forms. Cloudflare Pages Functions commit the new JSON via the GitHub Contents API.

Both paths write to the same files. Git enforces ordering — latest commit wins. There is no parallel database.

### Admin structure: 6 master tabs, each with lazy-loaded sub-tabs

| Master tab URL | Sub-tabs | What they manage |
|---|---|---|
| `/admin/content` | Bio, Posts, Briefings, Deals, Press, Alerts, FAQs, Testimonials, Contact Form | `bio.json`, `public/briefings/*`, `deals.json`, `press.json`, `alerts.json`, `faqs.json`, `testimonials.json`, `contact-form.json` |
| `/admin/page-builder` | Builder, Section Types | `page-compositions.json` (+ registers routes in `routes.json` on page create/delete; changes page URLs via `/api/admin/page-path` cascade) |
| `/admin/assets` | — | `file-library.json` — archive, rename cascade, permanent delete cascade |
| `/admin/structure` | Favicons, Site Meta, Navigation, Footer, Routes | `file-library.json` (favicons), `page-meta.json`, `nav.json`, `footer.json`, `routes.json` |
| `/admin/intelligence` | Themes, Cases, Defaults | Briefing-system config (`themes.json`, cases, intelligence settings) |
| `/admin/css` | Colors & Tokens, Section Palettes, Design System | `tokens.js` (global design tokens — editing NEON etc. restyles the whole site after rebuild) + `section-palettes.json` (drives the real colors of FAQ/Testimonials/CTA sections via `src/lib/palette-resolver.js`) |

Sub-tab URLs follow `/admin/<master>/<sub>` (e.g. `/admin/structure/navigation`), except the Pages hub which keeps its sub-tab in local state. Each sub-tab owns its own fetch/save/dirty lifecycle and reports dirty state up via `onDirtyChange`.

Endpoint naming still matches the data file (`/api/admin/deals` → `deals.json`, etc.). The old flat URLs (`/admin/bio`, `/admin/deals`, …) no longer exist.

### Asset library pattern (important)

All images, videos, logos, favicons, and documents on the site are tracked in **`src/data/file-library.json`** with `{ id, name, url, type, companies, source, archived, addedAt }`.

When adding an asset URL field to ANY admin tab, use the shared `<AssetPicker />` component at `src/components/admin/AssetPicker.jsx`:

```jsx
import AssetPicker from "../../components/admin/AssetPicker.jsx";

<AssetPicker
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  onPick={(url, entry) => { setUrl(url); setPickerOpen(false); }}
  defaultType="logo"
  defaultCompany={item.who || item.outlet}
  acceptTypes={["logo", "image"]}
/>
```

The picker auto-syncs new uploads/URLs back into the library. Archive entries are hidden from the picker by default.

### Schema-change rules

When changing the shape of a JSON data file (adding/removing/renaming fields), update *all three* in the same commit:
1. The JSON file itself
2. The component(s) that render it
3. The admin tab's `sanitize*` function (also mirrored on the server in the relevant `functions/api/admin/*.js`)

Admin tabs do NOT auto-generate forms from JSON. Fields are explicitly listed in each tab's render code. This is intentional (per-field help text, validators) but means a schema change touches multiple files.

### Shared admin helpers

- `functions/api/admin/_github.js` — `getFileFromGitHub`, `commitFileToGitHub`, `commitBinaryToGitHub`, **`commitFilesToGitHub`** (atomic multi-file commit via Git Data API — use it whenever a save spans files; supports `content: null` deletions and `contentBase64` binaries, retries once on a ref race), `getFileSha`, `listDirFromGitHub`, `findUrlReferences`, `deleteFileFromGitHub`. All GitHub calls have a 10s timeout. Signatures: reads return `{ ok, text, data, sha }`; `commitFileToGitHub(env, path, content, sha, message)` — **sha comes before message**.
- `functions/api/admin/_routes.js` — `detectRouteReferences`, `applyRouteReferences` (nav.json cascade for path renames; used by both `routes.js` and `page-path.js`)
- `functions/api/admin/_utils.js` — `isAuthed(request, env)` (async — always `await`), `jsonResponse`, `constantTimeEqual`, `sessionSecret` (session cookies are signed with ADMIN_SECRET+ADMIN_PASSWORD — rotating either env var logs every session out), cookie helpers
- `src/pages/admin/shared.jsx` — `inputStyle`, `selectStyle`, `btnStyle`, `btnPrimaryStyle`, `iconBtnStyle`, `formatTime`, `CenteredMessage`, `LoginForm`, `Banner`, `Modal`, `ConfirmDialog`, `ErrorBanner`, `SubTabStrip`, `useSubTabs`, style consts (`cardStyle`, `labelStyle`, `wrapStyle`)
- `src/pages/admin/useTabData.js` — **the standard tab lifecycle** (load/save/dirty/error/lastSavedAt). All standard content tabs use it; when adding a new admin tab, start here. Bespoke flows (Posts, Briefings, Assets, Routes, PageBuilder, NavItems, SiteMeta, Favicons, IntelligenceDefaults) intentionally don't.

Never duplicate these — always import from the shared modules.

### Page URL changes & redirects

Changing a page's URL (Page Builder → path field, or the Routes tab) cascades through routes.json, nav.json, footer.json, and page-compositions.json in one atomic commit. The Page Builder flow also appends a `301` rule to `public/_redirects` (Cloudflare-native), so old links keep working after the next deploy.

## Design Tokens
- Neon green: #D4FF00
- Background: #000
- Font: Archivo

## User Preferences
- TALK TO ME LIKE I DON'T UNDERSTAND ANYTHING — simple, step-by-step instructions
- Deploys via GitHub push (NOT wrangler)
- No Supabase, no auth, no magic links
- Owner: Andrew (andrewglantz@gmail.com)
- **Translations**: every English copy change must be reflected in all 7 languages in `src/data/translations.js` (en, es, fr, it, pt, ko, zh). If the English string lives in a translation key, update all 7; if it's a new piece of copy that isn't translated yet, add a new key and translate to all 7. Do NOT leave non-English translations referencing the old wording.

## Other Projects
- **rewind-tariffs**: IEEPA tariff refund site with CIT case tracker (`public/cit-cases.json`), Vite+React, Cloudflare Pages
- **turnpage-crypto**: Static HTML crypto claims site, separate repo
