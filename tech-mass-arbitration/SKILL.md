---
name: tech-mass-arbitration-briefing
description: "Daily briefing on tech mass arbitration — Keller Postman's $218B Google advertiser campaign, parallel Apple/Meta/Amazon tracks, AAA/JAMS rule mechanics, DOJ Section 2 remedies in U.S. v. Google, mass-arb funding landscape, foreign analogues (UK CAT, EU DMA, German private enforcement), publisher antitrust litigation. Use this skill whenever the user asks to run the tech mass arbitration briefing, scan for Keller Postman news, update the Google campaign tracker, or anything related to mass arbitration claims against Big Tech, AAA/JAMS rule changes, or DOJ antitrust remedies. Also triggers on: tech mass arb, Google advertiser arbitration, Keller Postman scan, Big Tech antitrust, AAA mass arb, DOJ Google remedies."
---

# Tech Mass Arbitration — Daily Briefing

You are the daily curator and advisory author for Tab 05 of Andrew's daily briefing (Tech Mass Arbitration). Audience: plaintiffs' antitrust firms, litigation funders, in-house counsel at advertiser brands and agencies, Big Tech antitrust defense counsel, AAA/JAMS administrators, claim-aggregator firms, GCs at competitive-platform companies.

## Overview

Automated and interactive modes — same as the other topic skills.

## Step 1 — Locate the project directory

Search for `tech-mass-arbitration` mounted folder. If not found, use `~/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/tech-mass-arbitration/`.

Read `references/background.md` for the knowledge baseline.

## Step 2 — Research today's developments

**48-HOUR FRESHNESS RULE.** Verify publication dates.

Run 4-6 WebSearch queries against tab themes:
- Keller Postman Google campaign developments (filing waves, claimant count, AAA filings)
- AAA / JAMS rule changes and fee disputes
- DOJ Section 2 remedies in U.S. v. Google (Mehta search; Brinkema ad tech)
- Parallel mass-arb signaling (Apple, Meta, Amazon)
- Mass-arb funding announcements
- Foreign analogues (UK CAT certifications, EU DMA enforcement, German private enforcement)
- Castel publisher MDL developments (S.D.N.Y.)
- *Heckman v. Live Nation* / SCOTUS cert posture

Source tiers per tab config. NEVER cite NYT or Al Jazeera.

## Step 3 — Compose the advisory

Style: **litigation-grade with antitrust-economics overlay**. Pure prose, dense paragraphs, no bullets in the analysis body. Sherman Act citations naturally integrated: § 2 monopolization, § 4 Clayton Act trebling, FRCP 23 mechanics. Federal Arbitration Act citations: § 1281.97 California-style fee-payment trigger, § 4 motion to compel, § 10 vacatur grounds.

**Editorial guard:** because Keller Postman dominates today's coverage, always include defense-side perspective (Gibson Dunn, O'Melveny, Mayer Brown, Fenwick, Goodwin, Winston & Strawn). Avoid reading as a plaintiffs' press kit.

Structure:

```
# TECH MASS ARBITRATION ADVISORY | [Today's Date]

## Analysis & Developments
[3-5 dense paragraphs: Keller campaign status; AAA/JAMS mechanics; DOJ Section 2 remedies;
parallel tracks; foreign analogues; publisher class action.]

## Recommended Actions
[For plaintiff-side firms, defense-side firms, in-house GCs at advertiser brands, funders.]

## Proposed Articles for the Briefing Site (5 selections, 48-hour fresh)

## Proposed Dashboard Updates

---
*Awaiting your approval — no changes will be made automatically.*
```

Save to `public/advisory-YYYY-MM-DD.md` AND `<briefing-root>/YYYY-MM-DD/05-tech-mass-arbitration/advisory.md`.

## Step 4 — Build the changelog at `trackers/changelog-YYYY-MM-DD.md`.

## Step 5 — Build the approval HTML at `advisory-approval-YYYY-MM-DD.html`.

## Step 6 — Update the persistent dashboard ONLY AFTER ANDREW'S APPROVAL.

## Step 7 — LinkedIn (when warranted) via `linkedin-post-builder` skill, mode `other`.

## Cross-references

- Tab 06 ($1B+ Class Actions) — when antitrust class action component crosses $1B.

## Brand styling

All generated HTML (dashboard.html, advisory-approval-*.html, posts.html, refine.html, references/background.html) MUST conform to the brand-styling reference at:

**`daily-briefing/BRAND_STYLING.md`**

Key invariants to honor on every daily run:

- **Layout**: 3-column dashboard (260px Key Dates / 1fr briefing / 290px Storylines). Max-width 1440px.
- **Nav**: 2 rows. Brand strip + 7 topic tabs with hover dropdowns. Square corners. Active tab = neon `#D4FF00` on ink. Active tab is NOT clickable. Active tab dims to light gray (no border) when another tab is hovered. Hovered tab goes neon.
- **Dropdown**: full-width Polestar pattern, neon green bg flush against the active tab (margin-top: -10px). 3-col inside: Overview / Quick Links / CTA. Black text on neon.
- **Typography**: Archivo only. Eyebrow labels at 0.78rem / weight 700 / 0.22em letter-spacing / uppercase. No neon-bar prefix.
- **Page title**: topic emoji + topic name (not "Daily Briefing"). Date stamp on right.
- **Briefing prose**: plain prose at 12th-grade reading level. No bullet-and-dash lists. Every fact carries a source-arrow link with hover tooltip showing the excerpt that supports it.
- **Highlighter italic accent**: applied to one phrase in the LEAD HEADLINE only. Never in the body.
- **Right column**: Storylines (subject-grouped: e.g., Refund Process, Section 122, Pass-Through Litigation, Trade Policy). NOT "Active Matters + Watchlist" — those overlap.
- **Key Dates**: calendar squares (56×56, white box + thin gray border, MAY uppercase + day number with neon highlighter painted across the bottom of the digit).
- **Source arrows**: 16×16 light-gray bg with 10×10 SVG glyph + hover tooltip showing source name and excerpt. NOT neon-filled.
- **Buttons**: 3 styles (Primary ink, Ghost outlined, Neon CTA). All square corners. Archivo weight 700.
- **Dark mode**: soft white `#E5E7EB` on lift-1 `#16161B`. NOT pure white on pure black. Variables redefine per theme so all `var(--ink)` etc. cascade automatically.
- **No consolidated dashboard.** Brand-link in every nav goes to `rewind-tariffs/dashboard.html` (default landing).

Read `BRAND_STYLING.md` for the full spec, CSS variable values, component HTML structure, and component-specific rules.

When the user iterates on styling, the latest iteration is captured in BRAND_STYLING.md. Honor it on the next daily run.
