# Ponzi / Cross-Border Fraud / Recovery — Project Instructions

**Project type:** Daily-briefing topic dir (Tab 04 of daily-briefing)
**Sales-close entity:** Turnpage Digital Markets
**Persistent artifact:** `dashboard.html` (internal-only)
**Skill that drives it:** `fraud-recovery-briefing` (see `SKILL.md`)
**Tab config:** `daily-briefing/tabs/04-ponzi-fraud-recovery.md`

## Repo layout

```
fraud-recovery/
├── SKILL.md                          # Dedicated skill — daily workflow
├── INSTRUCTIONS.md                   # This file
├── dashboard.html                    # Persistent internal dashboard
├── advisory-approval-YYYY-MM-DD.html # Per-day approval HTML
├── public/
│   └── advisory-YYYY-MM-DD.md        # Per-day advisory
├── trackers/
│   └── changelog-YYYY-MM-DD.md       # Per-day record of dashboard changes
└── references/
    └── background.md                 # Knowledge baseline
```

## Daily run summary

1. Skill triggers on "run fraud recovery briefing", "Ponzi update", "receivership scan", or daily-briefing orchestrator.
2. Web-search 4-6 queries against tab themes with 48-hour freshness rule.
3. Compose advisory in **recovery-grade** voice (pragmatic, operationally specific, deal-aware).
4. Update persistent dashboard with new active receiverships, status changes, asset-pool updates.
5. Build approval HTML for review.
6. Nothing ships without Andrew's approval.

## Qualifying article test

- Published within last 48 hours
- From Tier 1 or Tier 3 source per tab config
- Substantively about: (a) a new SEC/CFTC/DOJ Ponzi or fraud enforcement action with asset freeze; (b) a receivership development; (c) a clawback/avoidance decision; (d) a cross-border asset-tracing development; (e) a SIPC liquidation event.

## Voice & style

Recovery-grade — pragmatic, operationally specific, deal-aware. Reads like a Norton Rose Fulbright clawback note, an Akerman receivership update, or a Bradley crypto-victim alert. Heavy on procedural mechanics: when the receiver was appointed, who the receiver is, what the asset pool is, what the distribution waterfall looks like, what the cross-border friction points are.

## Dashboard sections

1. **Active Receiverships** — case name, court/judge, receiver, asset pool, key dates.
2. **Recent SEC/CFTC/DOJ Enforcement Actions** — last 6 months of meaningful matters.
3. **Cross-Border Tracing Threads** — § 1782 applications, foreign-jurisdiction asset locations.
4. **Open Legal Questions** — doctrinal questions the docket is testing.
5. **Last 5 Advisories** — links to recent `public/advisory-*.md`.

## Cross-references

- **Tab 03 (Crypto Insolvency)** — when a Ponzi-scheme case is routed through Chapter 11.
- **Tab 07 (Bankruptcy Creditor Rights)** — on clawback-related appellate decisions.
