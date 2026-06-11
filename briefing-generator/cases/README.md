# Tracked Cases

Each `*.md` here defines **one tracked court case** (as opposed to a *topic*, which is one of the six
briefing dirs at the repo root). A case is "loaded" by dropping a config file in this directory —
same auto-discovery model the topics use.

## How a case relates to the topics

- A case is **tagged to one or more topics** via its `topics:` list (the topic dir slugs, e.g.
  `llm-class-action`, `billion-dollar-class-actions`).
- On each tagged topic's `dashboard.html`, the case appears as a **Tracked Cases** summary box at the
  top of the left column: the most recent **3 filings** plus a **counter of new filings in the last
  72 hours**.
- The case also gets its **own docket page** at `cases/<slug>.html`, which mirrors the CourtListener
  docket and (optionally) the case's claims administrator (settlement / bankruptcy estate site).
- Because the page lives at `cases/<slug>.html` — the same directory depth as `<topic>/dashboard.html`
  — it reuses the identical brand chrome and relative asset paths (`../daily-briefing/assets/...`),
  so the logo, theme toggle, and nav resolve exactly like the topic dashboards.

## Coverage scope

**Federal & bankruptcy only.** `docket_source.type: courtlistener` pulls the live docket from the
free CourtListener REST API (federal district, appellate, and bankruptcy). State-court / offshore
cases have no free feed — set `docket_source.type: manual` (or `awaiting_sync: true`) and the box
shows the last known filing + a dormant counter until a docket is wired.

## Files

```
cases/
  <slug>.md            # case config (front-matter below) + free-form notes
  <slug>.html          # GENERATED docket page (built by scripts/inject_cases.py — do not hand-edit)
  data/
    <slug>.json        # docket mirror (refreshed by scripts/fetch_dockets.py) + seeded claims/coverage
  README.md            # this file
```

## Config schema (`<slug>.md` front-matter)

```yaml
---
slug: bartz-anthropic                 # filename stem + data file name
display_name: Bartz v. Anthropic
type: case                            # required — marks this a case, not a topic
emoji: ⚖️
status: "Settlement — final approval pending"
topics:                               # which topic dashboards show this case's summary box
  - llm-class-action
  - billion-dollar-class-actions
case:
  parties: "Bartz, et al. v. Anthropic PBC"
  court: "U.S. District Court, N.D. Cal."
  court_id: cand                      # CourtListener court code
  case_number: "3:24-cv-05417"
  judge: "Hon. Araceli Martínez-Olguín"
docket_source:
  type: courtlistener                 # courtlistener (federal/bankruptcy) | manual (state/offshore)
  docket_id: 69058235                 # CourtListener docket id (in the docket URL)
  url: "https://www.courtlistener.com/docket/69058235/..."
  awaiting_sync: false                # true → quiet box, no standalone page, until a docket_id + token land
claims_administrator:                 # optional — for settlements / bankruptcy estates
  name: "Anthropic Copyright Settlement Administrator"
  url: "https://www.anthropiccopyrightsettlement.com/"
  key_dates_url: "https://www.anthropiccopyrightsettlement.com/dates"
research:                             # same source-tier model as the topics
  source_tiers:
    tier_1: [Reuters, Bloomberg Law, Law360]
    tier_3: [Authors Alliance, Authors Guild]
    exclude: [nytimes.com, aljazeera.com]
alert_cadence: daily
---

# Free-form case notes (what to watch, key parties, mirrors).
```

## Docket data (federal + bankruptcy)

`scripts/fetch_dockets.py` pulls the live docket from **CourtListener's free REST API v4** and writes
the `docket` block of `data/<slug>.json` (the seeded `claims_administrator` + `coverage` blocks are
preserved). It needs a free API token (one-time setup):

1. Create a free account at courtlistener.com.
2. Copy your token from your **Profile → API** page (https://www.courtlistener.com/profile/api/).
3. Add it as a GitHub Actions secret named `COURTLISTENER_TOKEN` (the daily workflow passes it through).

Locally: `COURTLISTENER_TOKEN=xxxx python scripts/fetch_dockets.py`

**Without a token the pipeline still runs** — the seeded `data/<slug>.json` renders unchanged and the
box/page show a "seeded · awaiting first live sync" note. Nothing crashes.

## Rendering

`scripts/inject_cases.py` does two things (run automatically at the end of `scripts/generate.py`,
after the advisory injection):

1. Builds each non-awaiting case's `cases/<slug>.html` from its `data/<slug>.json`.
2. Injects a sentinel-wrapped **Tracked Cases** box into every tagged topic's `dashboard.html`
   (idempotent — the block between `<!-- TRACKED-CASES START -->` and `<!-- TRACKED-CASES END -->`
   is replaced wholesale each run; a topic with no tagged cases has the block removed cleanly).

## Loading a new case

- **By link:** paste a CourtListener docket URL → read the `docket_id`, court, and case name off it.
- **By number:** give the court + case number → look it up on CourtListener to find the `docket_id`.

Either way, write a `<slug>.md` here (+ a seed `data/<slug>.json`) and the case appears on every
tagged topic dashboard on the next run. Disable a case by renaming it with a `_disabled.md` suffix;
this directory is never auto-modified — you control it.
