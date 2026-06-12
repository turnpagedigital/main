<!-- EXECUTION PREAMBLE — read this first if you are a fresh Claude session.

You are executing an APPROVED overnight upgrade plan for turnpagedigital.com.
Andrew approved every track below on 2026-06-11; no re-confirmation is needed
except where the plan itself says to stop.

Ground rules:
- Working directory: this repo (turnpagedigital.com). All work on the `dev`
  branch ONLY — never push to `main` (production) without Andrew's express OK.
- Execute tracks in order A → B → C → D → F → E, committing per track with
  lint (0 errors), tests (all green), and build verified before each commit,
  then push dev (each push auto-deploys the dev site in ~2 min).
- Verify in the browser via the preview tooling where the plan says to;
  curl the deployed dev site for middleware/OG checks after pushes.
- Andrew's standing rule: NEVER delete files, code, or data without his
  express authorization. Backups before risky syncs.
- If something proves impossible or risky mid-track, skip it, note it for the
  morning report, and continue — do not block the night on one item.
- End with the Morning Report described at the bottom: one summary message
  covering everything shipped, dev URLs to click, flags, the promotion
  checklist for main, and Andrew's account-setup steps.

Repo context worth knowing cold:
- CLAUDE.md in the repo root documents architecture, deploy flow, and checks.
- The daily briefing pipeline lives in briefing-generator/ and runs via
  .github/workflows/daily-briefing.yml (on main); its admin trigger is
  repository_dispatch. The /intel mount is built by scripts/copy-intel.mjs.
- Admin auth: HMAC session cookie set by /api/admin/login, verified by
  isAuthed() in functions/api/admin/_utils.js.
-->

# Overnight Upgrade Run — SEO, Accessibility, FAQ, Growth Infrastructure & Marketing Playbook

## Context

Andrew asked: "using the best features of Fable 5, what could you do for me overnight that would be meaningful upgrades to my website?" — then expanded scope to include outreach: marketing efforts, Google AdWords, social media.

Three audits (SEO, performance, accessibility) established ground truth. The headline finding: **the daily briefing engine we just built publishes pages that are invisible to Google and social** — every briefing shares one generic title/description/preview image, there's no sitemap or robots.txt, and no structured data anywhere. Meanwhile the site has zero analytics (ads would fly blind), the contact form captures no ad attribution, and accessibility has textbook gaps (focus rings stripped, unlabeled form fields, no reduced-motion support).

**Approved scope (Andrew's selections):** Briefing SEO + Accessibility + FAQ search page + GA4/Ads-ready analytics (inert until IDs pasted) + pipeline LinkedIn drafts for 3 topics (LLM/Copyright, Crypto, Bankruptcy) + full marketing playbook docs. Newsletter capture: explicitly deferred. Image re-encoding: explicitly skipped. Ambition: "Go big" — adjacent wins welcome.

**Branch policy: everything lands on `dev` only.** Morning report lists what to review; promotion to `main` (production — where SEO actually takes effect) is a single approved push after Andrew's review. Nothing outward-facing (no posting, no ad accounts, no emails) happens overnight.

---

## Track A — Briefing SEO (every briefing becomes a first-class page)

Extend the *existing* server-side metadata system rather than building new machinery:

1. **`functions/_middleware.js`** — already rewrites title/description/canonical/OG/Twitter per path via HTMLRewriter using `src/data/page-meta.json`. Extend `resolveMeta()` to detect `/briefings/:slug`, look the slug up in `public/briefings/index.json` (build-time import, same pattern as page-meta), and emit: article title, summary as description, canonical, `og:type=article`, `article:published_time`, per-briefing OG image URL. Active-only; drafts fall back to defaults.
2. **`functions/og/[slug].js`** — already generates branded 1200×630 PNGs (workers-og/Satori) for 4 marketing slugs. Add a `briefing--<slug>` pattern: same brand template with briefing title + date + topic tag. Unknown → existing `/og/home` 302 fallback stays.
3. **JSON-LD structured data** (new, injected via middleware and/or index.html):
   - Sitewide: `Organization` (+ `WebSite`) schema.
   - Briefings: `NewsArticle`/`Article` (headline, datePublished, author "Turnpage Intelligence", publisher, image) + `BreadcrumbList`.
   - `/faq`: `FAQPage` schema (pairs with Track C).
4. **`scripts/generate-sitemap.mjs`** (new) — runs in the build (extend `package.json` build chain, pattern of `scripts/copy-intel.mjs`): static routes from `src/data/routes.json` (exclude `/admin`) + all `active` briefings from `public/briefings/index.json` with `lastmod` from their date. Plus a static **`public/robots.txt`** referencing the sitemap. Daily briefing commits → rebuild → sitemap stays current automatically.
5. **`src/pages/Briefing.jsx`** — client-side `document.title` + meta description sync on SPA navigation (crawlers get the middleware version; this is for humans/history).
6. Go-big extras: `og:image:alt`, `twitter:site` (config-driven from page-meta.json site block), share-to-LinkedIn/X buttons on briefing pages.

## Track B — Accessibility (Lighthouse-green, zero visual redesign)

From the audit, all in confirmed locations:

1. **Focus indicators** — `src/data/css.js` line 10 strips `outline` on inputs globally with no replacement. Add `:focus-visible` neon-ring rules for public inputs, nav links, buttons (reuse the existing `.deal-card-flip:focus-visible` pattern, css.js ~line 380).
2. **Contact form** (`src/components/IntakeForm.jsx`) — add `id`/`htmlFor` label association, `aria-required`, `aria-invalid` on error, `aria-describedby` for the error text, `role="alert"`/`role="status"` on the submit feedback.
3. **Reduced motion** — wrap the hero animation block (css.js: `heroMeshDrift`, `heroSweep`, `heroTicker`, reveal transitions, deal-card flip) in `@media (prefers-reduced-motion: reduce)` (LiquidGlassCard already does this — mirror its pattern).
4. **Landmarks** — `src/components/AppHeader.jsx` div → `<header>`; add a visually-hidden skip-to-content link targeting the existing `<main>` in App.jsx.
5. **Mobile menu** (`src/components/NavBar.jsx` ~line 227) — `aria-expanded` on the hamburger; Escape-to-close.
6. Judgment call (minimal): `INK_40` tiny-label contrast (BioSection "As seen in") — bump only if it doesn't visibly change design; otherwise note in morning report.

## Track C — FAQ search page

`/faq` route + `src/pages/FAQ.jsx` already exist — **first verify what's already implemented**, then complete the previously-scoped feature: full-text search input, `?topic=` filter (wired to `MARKETING_PAGES` keys), result count, `featured` flag filtering on marketing-page FAQ sections with "More questions? See all FAQs →" CTA (`FAQSection.jsx`), footer FAQ link (`src/data/footer.json` — via the admin-compatible JSON edit), `featured` checkbox in `FAQsTab.jsx` + `functions/api/admin/faqs.js` accepting the field. Add FAQPage JSON-LD (Track A.3).

## Track D — Growth infrastructure (measurement + attribution + social)

1. **Analytics module** (`src/lib/analytics.js`, new) — config-driven from a new `src/data/analytics.json` (`{ ga4MeasurementId: "", adsConversionId: "", adsConversionLabel: "" }`). **Ships inert**: loads gtag.js only when an ID is present. Fires SPA `page_view` on route change (hook into the existing `useRoute` popstate flow in App.jsx) and a `generate_lead` + Ads conversion event on successful contact-form submit (IntakeForm success path).
2. **UTM/ad-click attribution** — tiny module captures `utm_source/medium/campaign/term/content` + `gclid` from the landing URL into sessionStorage; IntakeForm appends them as hidden fields; `functions/api/contact.js` accepts them (length-capped like existing fields) and includes an "Attribution" block in the notification email (no Apps Script change required; also passed to the sheet payload harmlessly).
3. **Pipeline LinkedIn drafts — 3 topics** (`llm-class-action`, `crypto-insolvency`, `bankruptcy-creditor-rights`): extend `briefing-generator/scripts/generate.py` — after each of these topics' advisories, a second short generation (same verified advisory as source, voice distilled from BRAND_STYLING/linkedin-post-builder conventions) writes `<topic>/posts/DATE.md` and updates the existing `<topic>/posts.html` surface (it already has LinkedIn affordances + a "used this post" preference-signal feature — inspect its structure at execution and inject content the way the local skill did). Respect the new rate-limit pacing. **Caveat:** runs on `main`'s workflow, so end-to-end pipeline test happens after morning promotion; overnight = code + local dry-run of non-API parts.

## Track F — Intel behind the admin login (replace Supabase magic link)

Andrew confirmed he wants `/intel` gated by the same login as the admin, not Supabase:

1. **`functions/intel/_middleware.js`** (new) — runs on every `/intel/*` request: `await isAuthed(request, env)` (reuse `functions/api/admin/_utils.js`; the session cookie is set with `Path=/` so it's visible here — verify). Authed → `context.next()`. Not authed → serve a minimal branded login page (single password field) that POSTs to the **existing** `/api/admin/login` endpoint and reloads on success. Same rate limiting + session revocation we already built.
2. **`scripts/copy-intel.mjs`** — strip the Supabase layer from the served copy: exclude `auth/` + `login.html`, remove the two `<script src="/auth/…">` tags from every copied HTML file (this exact change was drafted earlier today and reverted — reuse it).
3. Leave the Supabase files in `briefing-generator/` source untouched (generator keeps emitting them; they just never reach the deployed mount). Supabase project/allowlist becomes irrelevant to intel — note in morning report; no Supabase changes needed.
4. **Trade-off (accepted)**: intel readers share the admin password — single-user assumption, revisit if he adds readers.
5. Verify: unauthenticated curl of `/intel/` on dev returns the login page (not dashboards); after login via cookie, content serves; admin itself unaffected.

## Track E — Marketing playbook (research-backed deliverable docs, `docs/marketing/`)

Researched overnight via web search; written in Andrew's voice conventions where copy is drafted:

1. **`google-ads-plan.md`** — campaign architecture mapped to sub-brands (bankruptcy claims / crypto claims (FTX, Celsius…) / AI copyright (Bartz payouts) / litigation funding); ad groups with ~30–50 researched keywords + intent notes + negative keywords; 3–5 responsive-search-ad copy variants per group; landing-page mapping to existing pages; realistic CPC/budget tiers from current research; conversion-tracking wiring instructions (pairs with Track D.1).
2. **`social-playbook.md`** — LinkedIn-first cadence keyed to the daily pipeline drafts (Track D.3), content pillars from the 6 topics, X strategy, profile/page optimization notes.
3. **`setup-checklists.md`** — exact click-paths Andrew runs in the morning: create GA4 property → paste measurement ID into `analytics.json` via admin/chat; Google Ads account + conversion action + link GA4; **Google Search Console** domain verification + submit the new sitemap; Cloudflare Web Analytics 1-click as complement.

---

## Reuse (don't rebuild)

- `functions/_middleware.js` HTMLRewriter pattern + `page-meta.json` import-at-build pattern → extend for briefings.
- `functions/og/[slug].js` Satori template + cache strategy → extend with briefing registry.
- `scripts/copy-intel.mjs` build-chain pattern → model for `generate-sitemap.mjs`.
- `LiquidGlassCard.jsx` `prefers-reduced-motion` block → pattern for css.js animations.
- `.deal-card-flip:focus-visible` (css.js) → pattern for site-wide focus rings.
- Existing `source` field plumbing in IntakeForm/contact.js → extend for UTM fields.
- `queue_site_drafts.py` idempotent-write pattern → model for posts injection in generate.py.
- `MARKETING_PAGES` from `src/data/page-keys.js` → FAQ topic filter options.

## Verification (each track, before commit)

- `npm run lint` 0 errors, `npm test` all green (39+), `npm run build` green — after every logical step; commit per track.
- **Preview browser checks** (vite dev server): FAQ search/filter interaction; skip-link + focus rings via keyboard-simulation eval; form ARIA attributes in DOM; reduced-motion CSS present; analytics module makes zero network calls with empty config; UTM params flow into form hidden fields; briefing share buttons render.
- **Build-output checks**: `dist/sitemap.xml` lists routes + active briefings; `robots.txt` present; JSON-LD parses (validate structure with a script); `node scripts/generate-sitemap.mjs` idempotent.
- **Middleware/OG**: unit-test `resolveMeta()` with briefing paths (extend tests/ suite — handler-test pattern from `tests/css-admin-handlers.test.js`); visual check of OG output requires deployed dev — listed in morning report with exact curl commands.
- **Pipeline drafts**: py_compile + dry-run with a stub; full run post-promotion.
- Push to `dev` after each track → Cloudflare dev deploy → curl-verify middleware meta + sitemap on the live dev URL overnight.

## Morning report contract

A single summary covering: what shipped per track (with dev-site URLs to click), the marketing playbook docs, anything skipped or flagged (e.g. INK_40 contrast judgment), the **promotion checklist** (one approved push of the batch to `main`), and your account-setup steps (GA4/Ads/Search Console — ~20 min total, from `setup-checklists.md`).
