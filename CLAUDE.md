# Turnpage Digital Markets — Project Reference

## Architecture
- **Stack**: Vite + React SPA, Cloudflare Pages hosting
- **Pattern**: Same as rewind-tariffs site
- **Deploy**: Push to GitHub → Cloudflare Pages auto-builds and deploys (NO wrangler)
- **Repo**: https://github.com/turnpagedigital/main.git
- **Branch**: `dev` — ALL work (Claude sessions, briefing runs, admin saves, overnight automation) commits to `dev`. `main` is production and only ever changes by promoting dev (the admin's "Deploy to Production" button, or the git merge in Deploy Command below). Never commit directly to main — that's what caused the dev/main merge conflicts of July 2026.

## Local Paths (Mac)
- **turnpagedigital.com**: `/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/turnpagedigital.com`
- **rewind-tariffs**: `/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/rewind-tariffs`
- **turnpage-crypto**: separate folder, static HTML site for crypto claims

## Deploy Command

Step 1 — commit work to `dev` (the repo checkout lives on dev):
```bash
cd "/Users/waquoitcapital/Library/CloudStorage/Dropbox-Personal/Professional/Development/turnpagedigital.com" && git add -A && git commit -m "description here" && git push origin dev
```

Step 2 — put it LIVE on turnpagedigital.com (promotes EVERYTHING currently on dev, including any admin edits and queued drafts sitting there):
```bash
git fetch origin && git checkout main && git merge --ff-only origin/main && git merge origin/dev --no-edit && git push origin main && git checkout dev
```
Andrew can do Step 2 himself with the admin's "Deploy to Production" button — for briefings and routine site updates, run Step 2 in-session so changes are live same-day. After the main push, Cloudflare builds in ~1–2 min; Cmd+Shift+R to clear cache.

**Auto-promote, intel only (added Aug 2026)**: `.github/workflows/promote-dev.yml` copies the `briefing-generator/` tree from dev onto main hourly at :25 (exact tree, deletions included — NOT a branch merge), so news scans, docket syncs, intel notes, and case edits reach production within the hour. Admin/site content (`src/`, `public/`, `functions/`, …) stays staged on dev until the manual Deploy — a pending admin draft never rides along. Step 2 remains for making anything live immediately.

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
- `/ai-guide` → AI Learning Bot Guide (see "AI Guide" below)
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
    (cases live in the intelligence system, not a static file — edit via the intel site: the ⚙️ Settings link in the intel nav (/intel/manage.html), served by /api/admin/cases)
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
- **AI Guide (`/ai-guide`, `/llms.txt`, `/llms-full.txt`)** → the canonical reference page for AI assistants and search crawlers. Content lives in `src/data/ai-guide.json` (identity, boundaries, services, claim types, process, leadership links, site map, AI instructions). FAQs, deals, bio and testimonials are pulled live from their own JSON files — don't duplicate them. Three outputs share the builders in `functions/_ai-guide.js`: the React page `src/pages/AIGuide.jsx`, the static HTML that `functions/_middleware.js` injects into `#root` for crawlers that don't run JS (React clears it on mount), and `dist/llms-full.txt` from `scripts/generate-llms-full.mjs` (part of `npm run build`). `public/llms.txt` is the short index and is edited by hand. `tests/ai-guide.test.js` enforces the brand rules (no founding year, experience footnote on asterisked figures, never "a law firm"). Bump `updated` in the JSON when you change the content. English only by design.
- **Update a case** → edit on the intel site: the intel nav’s **⚙️ Settings** link (`/intel/manage.html`, tabs for Cases / Themes / Groups / Settings), or the per-case edit actions on each briefing page. Both save through `/api/admin/cases` (admin session cookie; the Manage page shows a login prompt if needed). Admin's Intelligence → Cases/Themes tabs were removed Aug 2026; the default pill color palette is editable only in Manage → Settings.
- **Post a briefing** → see "Posting a Briefing" below.
- **Replace Crypto placeholder copy** → edit `src/pages/Crypto.jsx`. Structure mirrors AICopyright.jsx.
- **Add/manage a referral partner** → Admin → Content → Partners (generates access keys in-browser, stores only the SHA-256; changes live on next deploy) or edit `src/data/referral-partners.json` directly. Full recipe incl. key generation + Attio schema notes: `docs/marketing/referral-partners.md`. Partner-facing portal lives at `/partners` (unlisted), API under `functions/api/partner/`.
- **Hero copy** → home is in `src/pages/Home.jsx`; AI Copyright hero is in `src/pages/AICopyright.jsx` (uses the shared `Hero` component).
- **Subject options on contact form** → edit subjects in `src/data/contact-form.json` (or via Admin → Content → Contact Form). `IntakeForm.jsx` reads them at build time. The `id` field is what gets submitted; use a readable value like "Copyright claims". The email notification shows the `id` value directly.
- **Add/rename a public Topic (press filter + item tags)** → Admin → Content → Topics (`src/data/topics.json`, served by `/api/admin/topics`). Press.jsx and PressTab read it at build time — changes go live on the next deploy. Topics are deliberately INDEPENDENT of the intel themes in `briefing-generator` (scan beats, managed at `/intel/manage.html`).
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
3. Commit and push to `dev`, then promote to `main` (both steps of the Deploy Command) so the briefing is live same-day.

## Contact Form
- Fields: First Name, Last Name (required), Email (required), Subject (required), Message (required)
- Optional contact method: a dropdown ("How would you like to be contacted?") with Phone/SMS, Telegram, WhatsApp. Selecting one reveals a single handle/number field. Submits as `contactMethod` + `contactHandle`.
- Hidden `source` field captures which sub-brand drove the lead (`ai-copyright`, `crypto`, `briefings`). Maps to a default subject selection via `SOURCE_SUBJECTS` in `IntakeForm.jsx`.
- Subjects are loaded at build time from `src/data/contact-form.json` — admin changes to subjects take effect after the next deploy.
- Submits to `/api/contact` which:
  1. Sends formatted HTML email to info@turnpagedigital.com via Resend API
  2. Logs row to Google Sheet via Apps Script

## Cloudflare Environment Variables
- `RESEND_API_KEY` — Resend API key
- `NOTIFY_EMAIL` — recipient (default: info@turnpagedigital.com)
- `FROM_EMAIL` — sender (default: Turnpage Digital Markets <noreply@turnpagedigital.com>)
- `GOOGLE_SHEET_URL` — Google Apps Script web app URL
- `ADMIN_PASSWORD` — admin login password (for /#/admin)
- `ADMIN_SECRET` — random 32+ char string, signs session cookies
- `GITHUB_TOKEN` — fine-grained PAT scoped to this repo with "Contents: Read and write"
- `GITHUB_REPO` — `turnpagedigital/main`
- `GITHUB_BRANCH` — the branch the admin API reads/writes (`dev`; "Deploy to Production" merges it into `main`). Since ALL git work also happens on `dev` (see Deploy Command), the admin and git always see the same data. Do not push directly to main.
- `ANTHROPIC_API_KEY` — Anthropic API key (console key name: `tpdm-site`). Powers `/api/extract-claim` (claim-form reading in registration flows) and `/api/admin/flow-generator` (admin Flows generator). Added July 2026; env var changes only take effect on the next deployment (Deployments → ⋯ → Retry deployment).
- `ATTIO_API_KEY` — OPTIONAL Attio access token (record + note read-write scopes). When set, `/api/register` asserts a Person by email, attaches a "Registration [label] — flow name" note, and creates a Deal per submission (stage Lead, Asset "Claim (Class Action)", type Buying, person as Seller; Face Amount = est. recovery, Deal value = offer, Purchase rate = payout % when the flow priced one). `ATTIO_DEAL_OWNER` (optional) overrides the deal owner workspace-member id (defaults to Andrew's). Unset key = Attio push silently skipped (email + Sheet still work).

## Admin Panel (`/admin`)

Admin panel manages nearly all editable content on the site. Single source of truth: JSON files under `src/data/`. Two ways to edit:
1. **Chat with Claude** — Claude edits the relevant JSON file and pushes via git.
2. **Admin UI at `/admin`** — user logs in with `ADMIN_PASSWORD`, edits via per-tab forms. Cloudflare Pages Functions commit the new JSON via the GitHub Contents API.

Both paths write to the same files. Git enforces ordering — latest commit wins. There is no parallel database.

### Admin structure: 6 master tabs, each with lazy-loaded sub-tabs

| Master tab URL | Sub-tabs | What they manage |
|---|---|---|
| `/admin/content` | Bio, Posts, Briefings, Deals, Press, Topics, Alerts, FAQs, Testimonials, Contact Form, Partners | `bio.json`, `public/briefings/*`, `deals.json`, `press.json`, `topics.json`, `alerts.json`, `faqs.json`, `testimonials.json`, `contact-form.json` |
| `/admin/page-builder` | Builder, Section Types | `page-compositions.json` (+ registers routes in `routes.json` on page create/delete; changes page URLs via `/api/admin/page-path` cascade) |
| `/admin/registration` | Flows, Pricing | `forms.json` (multi-step registration wizards rendered by the `registration-flow` section) + `functions/api/_pricing-config.json` (PRIVATE Bartz offer inputs — recovery $ per self-pub/publisher work, payout %, volume premium % + threshold; served only to logged-in admins via `/api/admin/pricing`, priced server-side by `/api/quote` and `/api/register`) |
| `/admin/assets` | — | `file-library.json` — archive, rename cascade, permanent delete cascade |
| `/admin/structure` | Favicons, Site Meta, Navigation, Footer, Routes | `file-library.json` (favicons), `page-meta.json`, `nav.json`, `footer.json`, `routes.json` |
| `/admin/intelligence` | X Accounts, Defaults | Intelligence settings only — Cases & Themes moved to the intel site (`/intel/manage.html`, Aug 2026) but still save via `/api/admin/cases` + `/api/admin/themes` |
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
- **Translations**: every English copy change must be reflected in all 6 other languages in `src/data/translations.js` (en, es, fr, de, it, ko, zh). If the English string lives in a translation key, update all 6; if it's a new piece of copy that isn't translated yet, add a new key and translate to all 6. Do NOT leave non-English translations referencing the old wording.

## Other Projects
- **rewind-tariffs**: IEEPA tariff refund site with CIT case tracker (`public/cit-cases.json`), Vite+React, Cloudflare Pages
- **turnpage-crypto**: Static HTML crypto claims site, separate repo
