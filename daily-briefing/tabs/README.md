# Tab Configurations — Daily Briefing

This directory holds the canonical configuration files that drive the daily-briefing skill.
Each `NN-<slug>.md` file defines one topic the daily briefing tracks.

## Schema

Each tab config is a markdown file with YAML frontmatter:

```yaml
---
slug: tariffs-trade                           # URL-safe identifier
display_name: "Tariffs / Trade"               # Shown in dashboard column header
emoji: "⚖️"                                    # Single emoji shown in column header
tab_color: "#d29922"                          # Hex color for accent
voice_grade: trade-law-grade                  # One of: trade-law-grade, litigation-grade, restructuring-grade, recovery-grade
linkedin_enabled: true                        # Whether to draft a LinkedIn post when warranted
linkedin_mode: tariff                         # tariff | llm-copyright | other
sales_close_entity: "Rewind Tariffs"          # Brand the advisory closes under
project_dir_search:                           # Candidate paths to find the project dir
  - "rewind-tariffs"
news_fetch_command: "node scripts/fetch-news.cjs"  # null if no fetch script
themes:
  - CBP CAPE refund system progress
  - CIT orders and hearings
  - Section 122 / Section 301 / Section 232 developments
  - Consumer pass-through class actions
source_tiers:
  tier_1:
    - Reuters
    - Bloomberg
    - WSJ
    - AP
    - FT
  tier_3:
    - "Holland & Knight"
    - Skadden
    - "Troutman Pepper"
    - "Diaz Trade Law"
    - "Sandler, Travis & Rosenberg"
  exclude:
    - "New York Times"
    - Al Jazeera
hashtags:
  - "#IEEPA"
  - "#Tariffs"
  - "#Trade"
---

# Notes on this tab

(Free-form editorial notes go here, in markdown.)
```

## Conventions

- **Number prefix** determines execution order and dashboard column order. Pad to 2 digits.
- **NEVER cite NYT or Al Jazeera** — this is a universal rule already enforced in SKILL.md; the `exclude` list lets you add tab-specific exclusions on top.
- **48-hour freshness rule** applies to every tab. Articles older than 48 hours are tracked as context but not surfaced as "new" in the proposed-articles section.
- **`voice_grade`** controls the tone of the advisory. See `references/voice-grades.md` (TODO).
- **`linkedin_mode`** routes the post-builder to the right voice template. Use `other` for new topics until a custom mode is added.

## Adding a tab

1. Copy `_TEMPLATE.md` to `NN-<slug>.md` (use the next available number prefix).
2. Fill in the frontmatter — every field above is required except `news_fetch_command` (set to `null` if none) and `hashtags` (optional).
3. Write 1-3 paragraphs of editorial notes in the body — what makes this topic distinct, who the audience is, recurring sub-themes.
4. The orchestrator auto-discovers the new file on the next daily run.

## Disabling a tab

Rename to `NN-<slug>_disabled.md`. The orchestrator skips files ending in `_disabled.md`.

## Tab-config update workflow

When the user pastes a `TAB CONFIG UPDATE` block from the dashboard, parse and apply per the workflow in SKILL.md (section: "Handling TAB CONFIG UPDATE clipboard blocks").

## Current tabs

| #   | Slug                          | Status      | Project dir              | Persistent artifact                                    |
| --- | ----------------------------- | ----------- | ------------------------ | ------------------------------------------------------ |
| 01  | tariffs-trade                 | Canonical   | rewind-tariffs/          | rewindtariffs.com (public site, case tracker, brokers) |
| 02  | llm-copyright                 | Canonical   | llm-class-action/        | AI IP Litigation Tracker XLSX                          |
| 03  | crypto-insolvency             | Building    | crypto-insolvency/       | Internal dashboard HTML                                |
| 04  | ponzi-fraud-recovery          | Building    | fraud-recovery/          | Internal dashboard HTML                                |
| 05  | tech-mass-arbitration         | Building    | tech-mass-arbitration/   | Internal dashboard HTML                                |
| 06  | billion-dollar-class-actions  | Config only | (none yet)               | (TBD)                                                  |
| 07  | bankruptcy-creditor-rights    | Config only | (none yet)               | (TBD)                                                  |
