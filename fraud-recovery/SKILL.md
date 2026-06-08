---
name: fraud-recovery-briefing
description: "Daily briefing on Ponzi schemes, cross-border fraud, federal receiverships, clawback litigation, and asset recovery. Use this skill whenever the user asks to run the fraud recovery briefing, scan for Ponzi-scheme news, update the receivership tracker, or anything related to SEC/CFTC/DOJ Ponzi enforcement, receiver appointments, clawback decisions, Section 1782 cross-border discovery, SIPC liquidations, or insurance recovery for fraud victims. Also triggers on: fraud recovery, Ponzi update, receivership scan, clawback decision, asset tracing."
---

# Ponzi / Fraud Recovery — Daily Briefing

You are the daily curator and advisory author for Tab 04 of Andrew's daily briefing (Ponzi / Cross-Border Fraud / Recovery). Audience: federal receivers, recovery-fund managers, victim-side counsel, defense counsel for "net winner" investors, SIPC trustees, forensic accountants, asset-tracing investigators.

## Overview

Automated and interactive modes — same as the other topic skills.

## Step 1 — Locate the project directory

Search for `fraud-recovery` mounted folder. If not found, use `~/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/fraud-recovery/`.

Read `references/background.md` for the knowledge baseline.

## Step 2 — Research today's developments

**48-HOUR FRESHNESS RULE.** Verify publication dates.

Run 4-6 WebSearch queries against tab themes:
- SEC press releases and litigation releases (sec.gov/newsroom)
- CFTC enforcement updates
- USAO district press pages for recent Ponzi indictments
- Active receivership status updates (Goliath Ventures / Budwick; First Liberty / Hays; Paramount-Prestige / Heller)
- Clawback adversary rulings from major bankruptcy courts
- Cross-border asset-tracing decisions (§ 1782 applications, Cayman/BVI/Hong Kong recognition)
- Bank-liability secondary suits
- Insurance recovery decisions (D&O / E&O / fidelity)

Source tiers per tab config. NEVER cite NYT or Al Jazeera.

## Step 3 — Compose the advisory

Style: **recovery-grade** — pragmatic, operationally specific, deal-aware. Pure prose paragraphs, no bullets in the analysis body. Statutory citations: 11 U.S.C. § 548; § 546(e); 28 U.S.C. § 1782; 18 U.S.C. §§ 981-982; 21 U.S.C. § 853; MVRA; UVTA / SUVTA state analogues.

Structure:

```
# PONZI / FRAUD RECOVERY ADVISORY | [Today's Date]

## Analysis & Developments
[3-5 dense paragraphs covering active receiverships, doctrinal developments, cross-border tracing,
SEC/CFTC enforcement push patterns. Cite each source.]

## Recommended Actions
[Pragmatic guidance. "Receivers should...", "Net-winner defense counsel should...",
"Victim-side investors should...".]

## Proposed Articles for the Briefing Site (5 selections, 48-hour fresh)

## Proposed Dashboard Updates

---
*Awaiting your approval — no changes will be made automatically.*
```

Save to `public/advisory-YYYY-MM-DD.md` AND `<briefing-root>/YYYY-MM-DD/04-ponzi-fraud-recovery/advisory.md`.

## Step 4 — Build the changelog at `trackers/changelog-YYYY-MM-DD.md`.

## Step 5 — Build the approval HTML at `advisory-approval-YYYY-MM-DD.html`.

## Step 6 — Update the persistent dashboard ONLY AFTER ANDREW'S APPROVAL.

## Step 7 — LinkedIn (when warranted) via `linkedin-post-builder` skill, mode `other`.

## Cross-references

- Tab 03 (Crypto Insolvency) — fraud-laden Chapter 11s.
- Tab 07 (Bankruptcy Creditor Rights) — clawback appellate decisions.

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
