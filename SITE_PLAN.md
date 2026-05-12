# Turnpage Digital Markets — Site Plan v1

**Reviewed by Andrew before coding.** Once you sign off (or mark up changes inline), I'll build it.

---

## What we're building

A multi-page version of **turnpagedigital.com** that positions Turnpage Digital Markets (TPDM) as the OTC desk for **rights holders**, with sub-brands per claim type. AI Copyright is the headline sub-brand at launch. Crypto is also live as a sub-brand. Bankruptcy and other claim types can be added later.

We mirror the **engineering** of the rewind-tariffs site (single React SPA, in-app hash routing, shared nav and footer, mobile-friendly). We do not mirror its content, IA, or visual design. TPDM's existing tokens (neon green `#D4FF00`, black, Archivo) stay.

---

## Top-level sitemap

```
turnpagedigital.com/
├── /              → Home (rights-holder OTC desk; sub-brand cards)
├── /ai-copyright  → AI Copyright sub-brand (deep page, Top 12 cases)
├── /crypto        → Crypto Claims sub-brand (deep page)
├── /briefings     → Blog index (briefings library)
├── /briefings/:slug → Individual briefing
├── /about         → About TPDM
├── /contact       → Contact / intake form
├── /privacy       → Privacy policy
└── /terms         → Terms of use
```

Routing is **hash-based, in-app**: `#/ai-copyright`, `#/briefings/2026-04-29-bartz-fairness-hearing`. No React Router dependency, no server-side routing — same pattern as rewind-tariffs.

**Top nav (desktop):** Logo · AI Copyright · Crypto · Briefings · About · Get in Touch (CTA button)
**Top nav (mobile):** Logo · Hamburger → same items in slide-down menu.

**Footer:** Two columns. Left: TPDM tagline + copyright. Right: link list (AI Copyright, Crypto, Briefings, About, Contact, Privacy, Terms) + email (`info@turnpagedigital.com`).

---

## Page-by-page specs

### 1. Home (`/`)

The "front door" of the rights-holder OTC desk. Five sections, each separated by background contrast (dark hero → cream → dark → cream → dark CTA).

| Section | Purpose | Content |
|---|---|---|
| Hero (dark) | One-line positioning + sub-brand entry points | **H1:** "The OTC desk for rights holders." **Sub:** "Capital and advisory for individuals and institutions with claims to compensation — across the largest class actions, bankruptcies, and complex litigation in the world." Two primary CTAs: **Explore AI Copyright →** and **Explore Crypto Claims →**. Background: existing `bg-paper.jpg`. |
| Track record (cream) | Establish credibility | The current site's $1B+ paragraph and 500-financial-institutions paragraph, lightly rewritten as two stat cards plus narrative. |
| Sub-brand cards (dark) | Direct users to the right vertical | Three cards in a 3-col grid: **AI Copyright** (the headline; "Capital and advisory for authors, publishers, and music rights holders with claims against generative AI companies"), **Crypto Claims** (TBD copy from your turnpage-crypto site), **Bankruptcy & Complex Litigation** ("Coming soon — speak to a partner"). Each card → its sub-brand page or contact form. |
| How it works (cream) | Universal 3-step process | (1) Tell us about your claim → (2) We assess and structure a bid → (3) We close in days, not years. |
| Closing CTA (dark) | Final push | "Ready to liquidate?" + intake form CTA → `/contact`. |

### 2. AI Copyright (`/ai-copyright`)

The marquee sub-brand page. Long, scrolling, intentionally substantive — the kind of page a music publisher or author would forward to their counsel.

| Section | Purpose | Content |
|---|---|---|
| Hero (dark) | Frame the moment | **H1:** "The largest copyright settlement in U.S. history is just the beginning." **Sub:** "Bartz v. Anthropic. The OpenAI MDL. Concord Music v. Anthropic. Getty v. Stability. We help authors, music publishers, and other rights holders navigate this landscape — with capital today and advisory across the lifecycle of every claim." CTAs: **Get in touch →** + **See active cases →** (anchor to Cases section). |
| Why now (cream) | Set the stakes | Three stat cards: **$1.5B** Bartz settlement (largest copyright settlement ever); **70+** federal lawsuits against AI companies; **$3.1B** statutory ceiling in the new Concord II music-publisher complaint. Followed by a narrative paragraph drawn from your daily advisories. |
| Who we help (dark) | Audience targeting | Two lead audience cards (Authors & Music publishers/labels) plus secondary cards (News organizations, Visual artists, Software developers, Stock libraries). Each card: 1-line description + "Learn more" anchor. |
| What we offer (cream) | The product | Two side-by-side blocks. **Capital Solutions:** "Liquidity for class members and individual claimants — receive a competitive cash bid for your claim and exit the timeline." **Advisory:** "Settlement strategy, opt-in vs. opt-out analysis, valuation, and counterparty introductions across our network of 500+ institutional buyers." |
| Top 12 active cases (dark) | Substantive proof of expertise | A card grid showing the top 12 cases (full list below). Each card: case name, defendants, court, status badge, alleged damages, 2-line summary, "View brief" link → `/briefings`. |
| From the briefings room (cream) | Surface the latest advisory | Latest 3 briefings as cards with date, headline, 2-line excerpt, "Read more" → `/briefings/:slug`. |
| Closing CTA (dark) | Convert | "Hold a claim or considering action? Talk to us." + button → `/contact?source=ai-copyright`. |

### 3. Crypto (`/crypto`)

I haven't seen the content of your `turnpage-crypto` repo (it lives in a separate folder I don't have mounted). For Day 1 I'll **scaffold a parallel structure** to the AI Copyright page (hero, why now, who we help, what we offer, closing CTA) with placeholder copy you can replace, OR mount the `turnpage-crypto` folder so I can lift its existing content.

> **Decision needed (Q4 below):** mount turnpage-crypto, or write placeholder copy?

### 4. Briefings (`/briefings` + `/briefings/:slug`)

A simple blog where you can post advisories.

**How posting works:**
1. You (or the `llm-class-action` skill) drops a markdown file into `public/briefings/`. Filename pattern: `YYYY-MM-DD-slug.md`. Frontmatter: `title`, `date`, `summary`, `tags`.
2. You update `public/briefings/index.json` to add the new entry.
3. You git push; Cloudflare auto-deploys; the briefing is live at `/briefings/YYYY-MM-DD-slug`.

The list page (`/briefings`) fetches `index.json` and renders cards (newest first). The single page (`/briefings/:slug`) fetches the `.md` file and renders it with a tiny markdown library (`marked`, ~30 KB).

We'll seed the library with the most recent 3–5 advisories from `Development/llm-class-action/public/` so the page isn't empty on launch. Briefings get their own SEO-friendly meta/OG tags rendered client-side.

### 5. About (`/about`)

Three sections: **Mission** (rights-holder advocacy framing), **Track record** ($1B+ paragraph + 500 institutions paragraph, expanded), **How we work** (universal process across all claim types). Standard contact CTA at bottom.

### 6. Contact (`/contact`)

Keep the existing intake form (First/Last/Email/Phone/Telegram/WhatsApp/Subject/Message) and the existing `/api/contact` Cloudflare Function. Add a hidden `source` field captured from the URL (`?source=ai-copyright`, `?source=crypto`) so submissions flag which sub-brand drove the lead. Subject dropdown gains AI-Copyright- and Crypto-specific options.

### 7. Privacy + Terms

Standard pages. I'll write generic-but-correct boilerplate; you should have counsel review before launch.

---

## Top 12 cases (AI Copyright page)

Pulled from `ai_ip_litigation_tracker.xlsx` → "Ranked by Alleged Damages" sheet. I'll render these as a card grid, each card linking to a single-source canonical filing or briefing.

| # | Case | Defendants | Status | Alleged damages | Court |
|---|---|---|---|---|---|
| 1 | In re OpenAI Copyright Infringement Litigation (MDL 3143) | OpenAI; Microsoft | Active | Trillions (statutory) | S.D.N.Y. (Stein) |
| 2 | Bartz v. Anthropic PBC | Anthropic | Settled $1.5B | Up to ~$10T theoretical | N.D. Cal. (Alsup) |
| 3 | Doe 1 v. GitHub, Inc. | GitHub; Microsoft; OpenAI | Partial / appeal | $9B+ (DMCA) | N.D. Cal. (Tigar) |
| 4 | Getty Images v. Stability AI (US) | Stability AI | Active | Up to $1.7B | D. Del. (Bibas) |
| 5 | UMG et al. v. Suno (RIAA) | Suno | Active | Up to $150K/work | D. Mass. (Saylor) |
| 6 | UMG et al. v. Udio (RIAA) | Uncharted Labs (Udio) | Settled (UMG/WMG) | Undisclosed | S.D.N.Y. (Hellerstein) |
| 7 | Disney/Universal v. Midjourney | Midjourney | Active | Damages + injunction | C.D. Cal. (Anderson) |
| 8 | Concord Music et al. v. Anthropic | Anthropic | Active | Up to $150K/work | N.D. Cal. (Lee) |
| 9 | Advance Local Media v. Cohere | Cohere | Active | Unspecified | S.D.N.Y. (McMahon) |
| 10 | Andersen v. Stability AI et al. | Stability; Midjourney; DeviantArt; Runway | Active | $150K/work | N.D. Cal. (Orrick) |
| 11 | GEMA v. OpenAI (Germany) | OpenAI | Judgment for GEMA | + injunction | LG München I (Reinhardt) |
| 12 | Getty Images v. Stability AI (UK) | Stability AI | Judgment (Nov 2025) | Reduced after narrowing | High Court (Smith J) |

(Plus we'll feature **Concord/UMG v. Anthropic II — $3.1B** as a "New for 2026" sidebar callout.)

---

## Engineering plan

- **Structure:** keep `src/main.jsx`. Replace single-component `src/App.jsx` with a router shell. Split pages into `src/pages/*.jsx` and shared chrome into `src/components/*.jsx` for maintainability.
- **Routing:** hash-based, no library. `useState` for current page; `window.addEventListener('hashchange')` to re-render. Mirrors rewind-tariffs's `onNavigate(pageKey)` pattern.
- **Markdown:** add `marked` (~30 KB) for briefing rendering. Only dep added.
- **Cases data:** static array in `src/lib/cases.js` (the table above + per-case 2-line summary). Easy to update later.
- **Briefings data:** static `public/briefings/index.json` + `public/briefings/*.md` files. Updated via git push.
- **Forms:** existing `/api/contact` Cloudflare Function unchanged. Just adds the hidden `source` field.
- **Styling:** keep TPDM tokens (`#D4FF00`, `#000`, Archivo). No new colors. Reuse hero `bg-paper.jpg`, existing logos.
- **Mobile:** test at 375 px and 768 px.

I do **not** pull in: Supabase, the rewind-tariffs editable-content CMS, theme switcher, or any of its tariff-specific calculators.

---

## Decisions I still need from you

1. **Crypto sub-brand content:** mount your `turnpage-crypto` folder so I can lift the existing copy, or write placeholder copy that you replace later?
2. **Hero positioning copy:** does the home hero ("The OTC desk for rights holders.") and the AI Copyright hero ("The largest copyright settlement in U.S. history is just the beginning.") feel right? If not, what direction?
3. **Track record stats:** the current site says "over $1 billion in claims liquidated" and "500 financial institutions on speed dial." Are those still accurate? Anything to add (e.g. # of class actions, # of years operating)?
4. **About page bio:** do you want a bio block ("Founded by Andrew Glantz / led by ___") or should the About page stay institutional-only?
5. **Seed briefings:** OK to copy the most recent 3–5 advisories from `Development/llm-class-action/public/` into `public/briefings/` so the library isn't empty on launch?
6. **Subject dropdown options on the contact form:** current is `Request a Quote / Claims Inquiry / Partnership / Other`. Add `AI Copyright Inquiry` and `Crypto Claims Inquiry`?
