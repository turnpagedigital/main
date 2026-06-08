---
name: billion-dollar-class-actions-briefing
description: Daily briefing on $1B+ Class Actions. Triggers on "billion-dollar-class-actions advisory", "billion-dollar-class-actions briefing", or invocation from the daily-briefing orchestrator. Runs a 48h news scan against the tier-1/tier-3 sources from `daily-briefing/tabs/06-billion-dollar-class-actions.md`, composes a litigation-grade (settlement-economics overlay) advisory, drafts a LinkedIn post, and produces an interactive approval HTML.
---

# $1B+ Class Actions — Briefing Skill

## When to use

- Invoked by the daily-briefing orchestrator for Tab `billion-dollar-class-actions`.
- Direct invocation: "run the $1B+ Class Actions briefing", "billion-dollar-class-actions daily advisory", or related phrases.

## Inputs

- Tab config: `daily-briefing/tabs/06-billion-dollar-class-actions.md`
- Knowledge baseline: `references/background.md` (this project dir)
- Yesterday's outputs in `public/` and `trackers/`

## Procedure

1. Load tab config — pull `themes`, `source_tiers.tier_1`, `source_tiers.tier_3`, `source_tiers.exclude`, and `editorial_notes`.
2. Read knowledge baseline at `references/background.md` for context.
3. Run a 48-hour news scan against tier-1 and tier-3 sources, applying themes filter and exclusion list.
4. Compose a litigation-grade (settlement-economics overlay) advisory in markdown at `public/advisory-YYYY-MM-DD.md`.
5. Write changelog at `trackers/changelog-YYYY-MM-DD.md` summarizing what changed.
6. Generate approval HTML at `advisory-approval-YYYY-MM-DD.html` with:
   - sticky tab+view nav
   - briefing-lead block
   - collapsible advisory body
   - key-dates block (imminent/upcoming/watch pips)
   - LinkedIn post block with copy-to-clipboard
   - light theme by default; theme toggle persisted via localStorage
7. If material new matters / watchlist items, update `dashboard.html`.

## Voice

litigation-grade (settlement-economics overlay). See `references/background.md` for tone calibration. Audience: Plaintiff-side mega-class firms (Robbins Geller, Bernstein Litowitz, Cohen Milstein, Lieff Cabraser, Hagens Berman); defendant-side mega-class defense (Wachtell, S&C, Gibson Dunn, Kirkland); settlement administrators (Epiq, JND, KCC/Verita, A.B. Data, Angeion); litigation funders; corporate GCs at frequent-defendant industries (banks, pharma, big tech, big retail); academic class-action scholars.

## Output

- `public/advisory-YYYY-MM-DD.md`
- `trackers/changelog-YYYY-MM-DD.md`
- `advisory-approval-YYYY-MM-DD.html`
- `dashboard.html` (when material developments)

## Refinement

The dashboard "Refine This Tab" dialog produces `TAB INSTRUCTION` blocks. When pasted into Claude, those blocks should be applied to `daily-briefing/tabs/06-billion-dollar-class-actions.md` (editorial_notes, themes, source tiers). Refinements take effect on the next daily run.

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
