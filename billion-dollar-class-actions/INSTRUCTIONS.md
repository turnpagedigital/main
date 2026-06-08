# $1B+ Class Actions — Project Instructions

**Project dir:** `billion-dollar-class-actions/`
**Tab config:** `daily-briefing/tabs/06-billion-dollar-class-actions.md`
**Audience:** Plaintiff-side mega-class firms (Robbins Geller, Bernstein Litowitz, Cohen Milstein, Lieff Cabraser, Hagens Berman); defendant-side mega-class defense (Wachtell, S&C, Gibson Dunn, Kirkland); settlement administrators (Epiq, JND, KCC/Verita, A.B. Data, Angeion); litigation funders; corporate GCs at frequent-defendant industries (banks, pharma, big tech, big retail); academic class-action scholars.
**Voice grade:** litigation-grade (settlement-economics overlay)
**Sales-close entity:** Turnpage Digital Markets

## How to run the daily briefing for this tab

1. Read the tab config at `daily-briefing/tabs/06-billion-dollar-class-actions.md`.
2. Read the knowledge baseline at `references/background.md`.
3. Run a 48-hour news scan against the tier-1 and tier-3 sources in the tab config, excluding the listed exclusions.
4. Apply themes filter (see tab config).
5. Write the day's advisory to `public/advisory-YYYY-MM-DD.md`.
6. Write the day's changelog to `trackers/changelog-YYYY-MM-DD.md`.
7. Generate the approval HTML at `advisory-approval-YYYY-MM-DD.html` (light theme, sticky nav, briefing lead + advisory toggle + key dates + LinkedIn post + clipboard copy).
8. Update `dashboard.html` if material new matters or watchlist items emerged.

## Refinement workflow

The dashboard exposes a "Refine This Tab" dialog that lets the operator (Andrew) save content-refinement instructions locally and copy a `TAB INSTRUCTION` block to clipboard. Pasting that block into a new Claude session triggers an update to this tab's config (`daily-briefing/tabs/06-billion-dollar-class-actions.md` — specifically the `themes`, `editorial_notes`, or source-tier sections). Refinements take effect on the next daily run.

## Output structure

```
billion-dollar-class-actions/
├── INSTRUCTIONS.md                  ← this file
├── SKILL.md                         ← skill spec for the briefing routine
├── dashboard.html                   ← persistent internal tracker
├── advisory-approval-YYYY-MM-DD.html
├── public/
│   └── advisory-YYYY-MM-DD.md       ← daily client-facing advisory
├── trackers/
│   └── changelog-YYYY-MM-DD.md
└── references/
    ├── background.md                ← knowledge baseline
    └── background.html              ← rendered for in-page nav
```

## Cross-references

See the tab config `themes:` block and the dashboard's "Cross-references" notes for which adjacent tabs to link.
