---
name: crypto-insolvency-briefing
description: "Daily briefing on crypto distress and insolvency — BlockFills, post-effective wind-downs (Celsius, Genesis, FTX, Voyager), Hong Kong/Cayman/BVI proceedings, customer-property litigation. Use this skill whenever the user asks to run the crypto insolvency briefing, scan for crypto bankruptcy news, update the crypto-insolvency dashboard, or anything related to crypto exchange/lender/miner Chapter 11s, customer-property characterization, Chapter 15 recognition of offshore crypto liquidations, or DeFi-as-debtor doctrine. Also triggers on: crypto insolvency, BlockFills update, crypto bankruptcy, crypto wind-down, customer property, Chapter 15 crypto."
---

# Crypto Insolvency — Daily Briefing

You are the daily curator and client advisory author for Tab 03 of Andrew's daily briefing (Crypto Distress / Insolvency). The target audience is distressed-debt buyers, crypto-creditor committees, restructuring counsel, customer-property litigators, claims-trading firms, in-house counsel at exchanges and lenders.

## Overview

Two modes:
1. **Automated** (scheduler-driven daily): run all steps; produce advisory + dashboard updates + approval HTML.
2. **Interactive** (user-driven): same workflow, can ask before applying dashboard changes.

## Step 1 — Locate the project directory

Search for the crypto-insolvency project dir:
- `/sessions/*/mnt/crypto-insolvency/`
- `/sessions/*/mnt/Waquoit Capital LLC--Development--crypto-insolvency/`
- Any mounted folder ending in `crypto-insolvency`

If not found, use file tools at `~/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/crypto-insolvency/`.

Read `references/background.md` to load the knowledge baseline.

## Step 2 — Research today's developments

**48-HOUR FRESHNESS RULE.** Only articles published within the last 48 hours qualify for the day's proposed-articles section. Verify publication dates.

Run 4-6 targeted WebSearch queries against the themes listed in the tab config `daily-briefing/tabs/03-crypto-insolvency.md`:

- BlockFills docket activity (cure motions, 363 sale, plan term sheets, UCC filings)
- Post-effective wind-down activity (Celsius LOC litigation, Genesis DCG actions, FTX clawback, Voyager distributions)
- New Chapter 11 filings by crypto entities
- Chapter 15 recognition decisions / petitions
- Customer-property and ToS rulings
- Stablecoin issuer distress signals
- DeFi protocol insolvency
- Cross-border wind-up filings (HK / Cayman / BVI / Singapore)

Source tiers per tab config. NEVER cite NYT, Al Jazeera, Cointelegraph, or "Crypto News."

## Step 3 — Compose the advisory

Style: **restructuring-grade** — reads like a Weil restructuring alert or a Cleary Gottlieb "Global Restructuring Insights" note. Pure prose, dense paragraphs (5-7 sentences each), no bullets in the analysis body. Statutory citations woven in: 11 U.S.C. §§ 363, 502, 506, 541, 547, 548, 1129; FRBP 2014, 2019. Plan-confirmation taxonomy (cramdown, absolute priority, classification, gerrymandering, releases, mootness, exculpation) used precisely.

Structure:

```
# CRYPTO INSOLVENCY ADVISORY | [Today's Date]

## Analysis & Developments

[3-5 dense paragraphs. Open with the day's most significant development.
Cover: BlockFills posture; legacy case distribution / litigation activity;
new filings; cross-border developments; doctrinal developments. Cite each
source as a parenthetical markdown link at sentence-end.]

## Recommended Actions

[One paragraph of pragmatic guidance. "Distressed-debt buyers should...";
"Customer-property objectors should..."; "Cross-border claimants should...".]

## Proposed Articles for the Briefing Site (5 selections, 48-hour-fresh)

[Exactly 5, all from last 48 hours. Title, source/date, key insight, suggested tag.]

## Proposed Dashboard Updates

[Specific changes to dashboard.html, e.g., "Add row for [new case]";
"Update BlockFills status to..."; "Move [case] to post-effective section."]

---

*Awaiting your approval — no changes will be made automatically.*
```

Save to `public/advisory-YYYY-MM-DD.md` AND to `<briefing-root>/YYYY-MM-DD/03-crypto-insolvency/advisory.md`.

## Step 4 — Build the changelog

Write a brief `trackers/changelog-YYYY-MM-DD.md` recording what changed in the persistent dashboard.

## Step 5 — Build the approval HTML

Generate `advisory-approval-YYYY-MM-DD.html` with the advisory body, proposed articles cards, proposed dashboard updates, and (when warranted) a LinkedIn draft block.

## Step 6 — Update the persistent dashboard

ONLY AFTER ANDREW'S APPROVAL — update `dashboard.html` per the changelog.

## Step 7 — LinkedIn (when warranted)

Read `linkedin-post-builder` SKILL.md if there's a post-worthy development (mode: `other`). Save support doc to project dir.

## Cross-references

- **Tab 04 (Fraud Recovery)** — for fraud-laden insolvency cases.
- **Tab 07 (Bankruptcy Creditor Rights)** — for any crypto-case appellate decision.

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
