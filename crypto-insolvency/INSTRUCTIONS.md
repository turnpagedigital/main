# Crypto Insolvency — Project Instructions

**Project type:** Daily-briefing topic dir (Tab 03 of daily-briefing)
**Sales-close entity:** Turnpage Digital Markets
**Persistent artifact:** `dashboard.html` (internal-only)
**Skill that drives it:** `crypto-insolvency-briefing` (this folder also contains `SKILL.md`)
**Tab config:** `daily-briefing/tabs/03-crypto-insolvency.md`

## Repo layout

```
crypto-insolvency/
├── SKILL.md                          # Dedicated skill — daily workflow
├── INSTRUCTIONS.md                   # This file — operational manual
├── dashboard.html                    # Persistent internal dashboard (the artifact)
├── advisory-approval-YYYY-MM-DD.html # Per-day interactive approval (proposed content + site updates)
├── public/
│   └── advisory-YYYY-MM-DD.md        # Per-day advisory markdown
├── trackers/
│   └── changelog-YYYY-MM-DD.md       # Per-day record of what changed in the persistent dashboard
└── references/
    └── background.md                 # Knowledge baseline (active matters, precedent, doctrine, actors, watchlist)
```

## How the daily run works

1. **Skill triggers** on phrases like "run crypto insolvency briefing", "daily run", "scan crypto bankruptcy news", or via the daily-briefing orchestrator.
2. **Web-search** 4-6 queries against the themes listed in the tab config, applying the 48-hour freshness rule.
3. **Compose advisory** using restructuring-grade voice (dense paragraphs, statutory citations, no bullets in the analysis body). Save to `public/advisory-YYYY-MM-DD.md`.
4. **Update the persistent dashboard** (`dashboard.html`) with any new active-matter rows, status changes, key-date moves. Record those changes in `trackers/changelog-YYYY-MM-DD.md`.
5. **Build approval HTML** — interactive page with the day's advisory, proposed dashboard updates, and any LinkedIn-post draft. Save to `advisory-approval-YYYY-MM-DD.html`.
6. **Nothing ships without Andrew's approval.** The dashboard is updated only after he signs off on the day's approval HTML.

## What counts as a qualifying article

- Published within the last 48 hours
- From a Tier 1 or Tier 3 source per the tab config (see `daily-briefing/tabs/03-crypto-insolvency.md`)
- Substantively about US Chapter 11 or international wind-up proceedings affecting a crypto exchange, lender, miner, custodian, stablecoin issuer, or DeFi protocol
- Not behind a hard paywall (or where a meaningful summary is published openly)

## What counts as a signal-test "high urgency" day

A new major filing, a customer-property ruling, a § 363 sale order on a major operating business, or a Chapter 15 recognition decision = "high." One significant hearing/order = "normal." Zero qualifying items = "quiet."

## Voice & style

Restructuring-grade — reads like a Weil restructuring alert or a Cleary Gottlieb "Global Restructuring Insights" note. Pure prose, dense medium-length paragraphs (5-7 sentences). Statutory citations: 11 U.S.C. §§ 363, 502, 506, 541, 547, 548, 1129; FRBP 2014, 2019. Plan-confirmation taxonomy (cramdown, absolute priority, classification, gerrymandering, releases, mootness, exculpation) used in precise senses.

## Persistent dashboard contents

The dashboard is the cumulative view across the docket. Sections:

1. **Active matters** — table with: case name, court, judge, filing date, debtors' counsel, UCC counsel, posture, next key date, value at stake.
2. **Recently resolved / post-effective wind-downs** — short list with current recovery percentages and distribution cycle.
3. **Cross-border watch** — Chapter 15 recognition petitions, COMI/Gibbs friction points.
4. **Key open legal questions** — bullet list of the doctrinal questions the docket is currently testing.
5. **Last 5 advisories** — links to recent `public/advisory-YYYY-MM-DD.md` files.

## Cross-references

- **Tab 04 (Ponzi/Fraud Recovery):** When an insolvency case involves alleged fraud (Goliath Ventures-style fact patterns).
- **Tab 07 (Bankruptcy Creditor Rights):** On any plan-confirmation appellate decision arising from a crypto case.
