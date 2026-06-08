# SKILL.md Patch — Brand Styling Integration

This patch should be applied to the read-only daily-briefing skill at:
`/var/folders/.../skills/daily-briefing/SKILL.md`

To apply: paste the section below into the live skill file (the sandbox can't write there directly).

---

## INSERT THIS SECTION

Place it between the existing "Step 3 — Run each tab sequentially" section and "Step 4 — Build the dashboard":

```markdown
---

## Brand styling — must apply on every daily run

All HTML outputs (per-tab `dashboard.html`, `advisory-approval-YYYY-MM-DD.html`, `posts.html`, `refine.html`, `references/background.html`) MUST conform to the styling reference at:

**`<briefing-root>/BRAND_STYLING.md`**

That file is the canonical specification for: palette tokens, typography, 3-column layout, 2-row nav, hover-dropdown pattern, calendar squares, source-arrow + tooltip components, posts subtab structure, refine subtab structure, button styles, dark-mode contrast, and prose voice rules.

**Key invariants (consult `BRAND_STYLING.md` for the full spec):**

1. **Layout:** 3-column dashboard grid — 260px Key Dates / 1fr briefing / 290px Storylines. Max-width 1440px.

2. **Navigation:** 2 rows. Brand strip (logo + theme toggle) + topic tabs (7 pills with full-width hover dropdowns). Square corners. Active tab = neon `#D4FF00`, ink text, NOT clickable. Active tab dims to light gray + transparent border when another tab is hovered. Hovered tab also goes neon.

3. **Hover dropdown:** Polestar-style full-width panel, neon green bg flush against the tab (no white gap — use `margin-top: -10px` to bridge nav padding). 3-col layout inside: Overview eyebrow + title + body / Quick Links (5 view links) / CTA button.

4. **Page title (not "Daily Briefing"):** Uses topic emoji + topic name. Date stamp on the right. Border-bottom 2px ink.

5. **Briefing prose:** Plain prose at 12th-grade reading level. No bullet-and-dash lists. Every factual statement carries an inline source-arrow link with hover tooltip showing the excerpt that supports the fact.

6. **Highlighter italic accent:** Applied to ONE phrase in the lead headline only. NEVER in the body.

7. **Right column = Storylines (subject-grouped):** e.g., Refund Process · CAPE / Section 122 / Pass-Through Litigation / Trade Policy. Not "Active Matters + Watchlist" — those status-based labels overlap conceptually.

8. **Key Dates (left column):** Calendar squares — 56×56, white box + thin gray border, "MAY" uppercase at top, day number 22px weight-900 with neon highlighter painted across the bottom 36% of the digit (brand's signature accent style).

9. **Source arrows:** 16×16 light-gray bg (`rgba(10,10,10,0.08)`) with 10×10 SVG glyph + hover tooltip (340px black panel with neon left border, source-name eyebrow + 1-3 sentence excerpt). NOT neon-filled.

10. **Buttons:** 3 styles — Primary (ink bg / white text), Ghost (transparent / ink border), Neon CTA (neon bg / ink text). All square corners. Archivo weight 700.

11. **Dark mode contrast (softened):** `--bg: #16161B` (lift-1, not pure black). `--ink: #E5E7EB` (paper soft white, not pure white). Variables redefine per theme so every `var(--ink)` reference cascades correctly.

12. **No consolidated dashboard.** The daily-briefing root has no `dashboard-latest.html`. Brand-link in every nav goes to `rewind-tariffs/dashboard.html` as the default landing.

13. **Views per topic (5 subtabs accessed via hover dropdown):**
    - `Daily Briefing` → `dashboard.html`
    - `Website Updates` → `advisory-approval-YYYY-MM-DD.html` (meaningful only for Tariffs; placeholder for other 6)
    - `Posts` → `posts.html` — LinkedIn + X.com side-by-side, editable, Adjust This Post + I used this post controls
    - `Refine` → `refine.html` — Save & Copy Refinement Block button → clipboard
    - `Background` → `references/background.html`

**When the user iterates on styling:** Update `BRAND_STYLING.md` so the latest decision becomes the reference for the next daily run.
```

---

## ALSO UPDATE Step 4 (consolidated dashboard) — remove that step

The `dashboard-latest.html` consolidated page has been killed. Step 4 in the existing SKILL.md describes generating it; remove or replace that step with the following:

```markdown
## Step 4 — REMOVED

No consolidated dashboard is produced. Each topic's `dashboard.html` is the standalone landing page for that topic. The nav's brand-link defaults to `rewind-tariffs/dashboard.html`.
```

---

## ALSO ADD — Pre-filing Watchlist on every dashboard (added 2026-05-24)

Every per-topic dashboard must carry a compact **Watchlist** section in the center column, **inside `advisory-body`, immediately under "Story of the Day"** and before the close of the article. It is distinct from the right-column Storylines accordion.

**Purpose:**
- **Storylines** (right column) = already-filed / ripe matters organized by subject thread.
- **Watchlist** (center column, under Story of the Day) = pre-filing / pre-event **leading indicators** — situations developing toward potential ripeness but not yet a filed case, charged action, or adjudicated event.

**Source of truth:** Each tab's `watchlist:` block in `tabs/NN-<slug>.md` frontmatter:

```yaml
watchlist:
  research_themes:
    - What kinds of pre-filing signals the daily run should scan for in this tab
  items:
    - name: "Display name (bolded)"
      signal: "One-line pre-filing signal (≤ 150 chars, ending with 'no X yet' / 'pre-enforcement' / etc.)"
```

**Daily-run workflow (add to Step 3, per-tab):**

After composing the advisory and before building the dashboard, refresh the Watchlist:
1. **Carry forward** prior items as a starting set — do not blank-slate.
2. **Scan against `watchlist.research_themes`** for new pre-filing names surfacing in the last 24-48 hours.
3. **Retire ripened items.** If a prior item became ripe (filed Ch. 11, was charged, complaint filed, order issued), remove from `watchlist.items` and note the transition in today's advisory body.
4. **Add at most 1-2 net-new items per run.** Watchlists churn slowly; aim for steady 3-5 items per tab.
5. **Update the tab config in place** at `tabs/NN-<slug>.md`.

**Injection script:**

After all per-tab dashboards are built and Watchlist blocks refreshed, run (before `fetch_tickers.py`):

```bash
python3 <briefing-root>/scripts/apply_watchlist.py
```

This reads each tab's `watchlist.items`, renders the `<section class="watchlist-box">`, and injects it into the canonical center-column anchor under Story of the Day. Idempotent — strips any prior Watchlist anywhere in the dashboard before re-inserting.

**Self-check addition:** Every per-topic dashboard contains exactly one `<section class="watchlist-box">`, positioned inside `advisory-body` (center column). Right column remains Storylines only.

**Regression fence (add to the existing HARD REGRESSION FENCES):**

> **DO NOT put the Watchlist in the right column or fold it into Storylines.** The Watchlist is a separate component in the *center column*, inside `advisory-body`, immediately under "Story of the Day". Items must not migrate back-and-forth between Watchlist and Storylines without an explicit ripening event (filing, charge, adjudication) noted in the advisory body.

Full styling tokens and content rules live in `BRAND_STYLING.md` under "Watchlist (center column, under Story of the Day)".

---

## End of patch

The corresponding `BRAND_STYLING.md` reference file lives at the briefing root and is the source of truth for all styling decisions. Read it before generating any HTML.
