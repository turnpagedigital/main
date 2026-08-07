---
name: daily-briefing
description: Andrew's consolidated daily legal/regulatory briefing across all topics he tracks (tariffs/trade, LLM copyright, crypto distress/insolvency, Ponzi/cross-border fraud, $1B+ class actions, major bankruptcy creditor-rights decisions). Produces a landing page and per-topic dashboards, with each topic's dashboard middle column carrying a rich, dense, fully-cited advisory in the same prose register a major law firm would publish. Triggers on "run the daily briefing", "generate today's briefing", "morning advisory", "all-topics briefing", or any variation.
---

# Daily Briefing — Consolidated Multi-Topic Advisory

This skill produces Andrew's morning legal/regulatory briefing across six topics. The output is a fully-static HTML system Andrew opens in a browser. Each topic has its own dashboard; the landing page links to all six.

## Tracked topics

| # | Slug | Display | Voice |
|---|---|---|---|
| 01 | `rewind-tariffs` | Tariffs / Trade | trade-law-grade |
| 02 | `llm-class-action` | LLM / Copyright | litigation-grade |
| 03 | `crypto-insolvency` | Crypto Insolvency | restructuring-grade |
| 04 | `fraud-recovery` | Ponzi / Fraud Recovery | recovery-grade |
| 05 | `billion-dollar-class-actions` | $1B+ Class Actions & Mass Arbitration | litigation-grade |

**Tab 05 covers BOTH class actions AND mass arbitration.** Consolidated 2026-05-19. The advisory body must include coverage of: (a) mega-settlement class actions (BCBS, Bartz, Purdue, Visa/MA interchange, Roundup, securities mega-cycle) AND (b) Big Tech mass-arbitration campaigns (Keller Postman Google advertiser ~$218B, Apple App Store, Meta waiver track, Amazon seller, AAA/JAMS mechanics). Same defendants, same recovery posture; both belong in this tab's advisory and dashboard.
| 06 | `bankruptcy-creditor-rights` | Bankruptcy Creditor Rights | restructuring-grade |

Tab configs live at `daily-briefing/tabs/NN-<slug>.md`.

### Global sources whitelist + blacklist

Andrew maintains a single editable file — `daily-briefing/sources.md` — listing every media outlet, law firm, professional firm, and primary-source domain to prefer or exclude. **Load this file at the start of every run** before any research or news fetching:

- Whitelisted domains pass the relevance filter automatically and get tier-1 weight in the source citation chain.
- Blacklisted domains are never cited regardless of how on-topic the article appears.
- Greylisted (unclassified) domains pass through with normal scoring and any source actually used gets logged to `daily-briefing/YYYY-MM-DD/unknown-sources.md` so Andrew can promote or exclude it on the next edit pass.
- Domain matching is subdomain-aware: `bloomberg.com` matches `news.bloomberg.com`, `www.bloomberg.com`, etc.
- Per-tab `tabs/NN-<slug>.md` configs may add `additional_whitelist:` or `additional_blacklist:` sections that supplement (not replace) the global file. The merge rule: global blacklist wins over per-tab additions; per-tab additions to whitelist extend the global list.

### Bloomberg + WSJ section mapping (which sections each tab pulls)

The Bloomberg + WSJ paywalled-headline scan (Step 2a) pulls all four section groups, then routes candidates to tabs based on this mapping:

| Tab | Bloomberg sections | WSJ sections |
|---|---|---|
| 01 Tariffs / Trade | Politics, Markets | Politics, Markets |
| 02 LLM / Copyright | Technology, Law | Tech, Pro Bankruptcy (re: AI co. distress) |
| 03 Crypto Insolvency | Markets, Law | Markets, Pro Bankruptcy |
| 04 Ponzi / Fraud Recovery | Markets, Law | Markets, Pro Bankruptcy |
| 05 $1B+ Class Actions & Mass Arbitration | Markets, Law, Technology | Markets, Tech, Pro Bankruptcy |
| 06 Bankruptcy Creditor Rights | Markets, Law | Pro Bankruptcy |

A single headline may route to multiple tabs (e.g., a Purdue-related Bloomberg Law story routes to both 05 $1B+ Class Actions and 06 Bankruptcy Creditor Rights). The article gets fetched once via Claude in Chrome; the cite appears in both advisories where it materially advances the analysis.

---

## HARD REGRESSION FENCES — read before doing anything

These are failure patterns from prior runs. Each one is FORBIDDEN. If you find yourself doing any of these, STOP and re-read the workspace files:

1. **DO NOT regenerate `daily-briefing/index.html` from scratch.** The canonical reference snapshot is at `daily-briefing/index.canonical.html` (~26 KB). Open it to see the locked structure. Update `index.html` IN PLACE — change only text content inside existing elements (date stamp, card-stat anchors, card bodies, calendar-tile labels). Do not rebuild the HTML structure or strip CSS.

2. **DO NOT write a separate dashboard at `daily-briefing/YYYY-MM-DD/dashboard.html`.** That path is dead architecture. The single landing entry point is `daily-briefing/index.html`.

3. **DO NOT make landing-page card buttons link to `.md` files.** The 6 card "Read Briefing →" links MUST point to `../<slug>/dashboard.html`. The advisory `.md` files are the raw source content fed into the dashboard center column — never the click target.

4. **DO NOT generate a multi-file `present_files` panel.** Final step: `present_files` with exactly `daily-briefing/index.html` and nothing else.

5. **DO NOT build a consolidated card-grid dashboard.** Architecture is one landing → six per-topic dashboards. Each per-topic dashboard has the 3-column layout (Key Dates | advisory body | Storylines).

6. **DO NOT generate calendar tiles with cryptic labels.** Every calendar tile sub-line must include case name + court abbreviation + substantive context. "DOJ reply brief — Federal Circuit · briefing closes" is FORBIDDEN; "DOJ Sec 122 reply brief — Burlap & Barrel v. U.S. · Fed Cir briefing closes" is correct.

7. **DO NOT reintroduce 7 tabs anywhere.** Tech Mass Arbitration was consolidated into $1B+ Class Actions on 2026-05-19. Six tabs only. Mass-arbitration stories surface under `billion-dollar-class-actions`. The standalone `tech-mass-arbitration/` project directory is archived; do not create new outputs in it.

8. **DO NOT refer to "Andrew Pearson" or "117 Partners".** Principal is Andrew Glantz, founder of Turnpage Digital Markets LLC. Rewind Tariffs is a DBA of Turnpage Digital Markets LLC for the IEEPA tariff-refund vertical — a brand, not a separate entity.

9. **DO NOT use the schedule time as the timestamp.** The landing-page and per-topic dashboard time stamps must reflect the actual end-of-run time. Format: `H:MM AM/PM ET · DAY, MONTH D, YYYY` uppercase.

---

## Self-check before presenting

After all per-tab work plus the landing-page update, run these checks. If any fails, halt and restore the affected file from its canonical reference:

- `index.html` size ≥ 25 KB.
- Card count in `index.html` == 6.
- Calendar tile count in `index.html` ≥ 20.
- Every card link resolves to `../<slug>/dashboard.html`, never to a `.md` file.
- Every calendar tile sub-line includes a case name OR court abbreviation OR substantive context.
- Per-topic dashboards each ≥ 75 KB (preserved brand chrome).
- Dark-mode highlighter sentinel `/* DARK-MODE HIGHLIGHTER START */` present in every dashboard.
- No `<details>` tag immediately following `</ul>` inside any `.tn-dd-list` (that's the dropdown CTA-collapse bug).

---

## Critical: voice and length

**The authoritative voice lives in the admin-managed House Instructions** (`src/data/intelligence-settings.json` → voice.default, editable at Admin → Intelligence → Defaults). Core rules: write like a senior litigation/restructuring partner briefing a sophisticated client — plain, precise, direct; no jargon, euphemisms, or arcane language (a necessary term of art is used correctly and passed over, never explained down); no hype, no marketing adjectives, no hedging filler; short, declarative sentences; never any throat-clearing family phrase ("here's the rub," "here's the thing," "let's dive in," "it's worth noting"). You are an analyst, not a commentator — no editorializing, no opinions, no sweeping generalizations; match tone to the weight of each update (a scheduling order is never a turning point), and when only secondary reporting exists, cite the outlet, flag it as unconfirmed, and say what confirmation would look like. Lookback: 24 hours Tuesday–Friday, 72 hours on Monday.

### Style requirements (these define the deliverable)

- **Pure prose. No bullet points, no numbered lists, no visual breaks, and NO subheadings inside the analysis body.** The briefing is one flowing narrative under a single `## Analysis & Developments` header — not a stack of `## I.` / `## II.` sections. Use dense medium-length paragraphs of five to seven sentences so complex points unfold rather than being chopped into fragments.
- **Create urgency through factual circumstance, not alarm.** Specific dates, counts, dollar figures, and named mechanisms do the work adjectives cannot. Never reach for hype or a scare hook.
- **Density is the single hardest requirement.** Every paragraph must carry specific docket numbers, judge names, courtroom designations, dollar figures, percentages, dates, party names, and statute or regulation citations. Generic summaries are unacceptable.
- **Weave citations into narrative context** rather than listing them — the case captions, docket numbers, statutes, and figures referenced where they bear on the point, each factual sentence closing with its source link.
- **Separate what happened from what to do about it, but integrate the two fluidly** — implication and consequence belong in the same paragraph as the fact, not quarantined into an action list.
- **Emphasize unresolved questions, approaching deadlines, and forward-looking implications.** Open on the most consequential development and its practical consequence, progress through the remaining matters in descending order of consequence, and end on the emerging questions nobody has resolved yet.

### Source credibility tiers

Weight and cite sources in this order: **Tier 1** — the primary filing, order, docket entry, or transcript itself, plus major wire and business press (Reuters, Bloomberg / Bloomberg Law, Law360, WSJ, AP, FT); **Tier 2** — established national outlets and the legal/restructuring trade press; **Tier 3** — practitioner commentary (firm alerts, restructuring advisers, agency and claims-agent statements), mined for procedural nuance and forward read-through even though Tier 1 carries the facts; **Tier 4** — everything else, only to corroborate. Never cite a bare outlet homepage or a blacklisted source, even indirectly.

### Reference exemplar — what "rich" looks like

The advisory body for LLM/Copyright on May 15, 2026 included a passage that reads:

> Yesterday's Rule 23(e) fairness hearing in *Bartz v. Anthropic PBC*, 3:24-cv-05417 (N.D. Cal.), convened at 2:00 p.m. PT before Judge Araceli Martínez-Olguín in Courtroom 12 of the San Francisco Federal Courthouse, with Zoom access available to the public. Class Counsel submitted a Proposed Order (Dkt. 646-1) requesting final approval of the $1.5 billion settlement — the largest copyright resolution in United States history — and overruling all objections, while simultaneously disclosing a downward revision of the fee request from 15 percent to 12.5 percent of the gross fund, yielding a petition of approximately $187.5 million plus $3 million in incurred expenses, an $18.22 million cost reserve, and $50,000 service awards to each of the three class representatives. The claims data remains extraordinary: 440,490 of 482,460 eligible works have been claimed, a 91.3 percent rate reported in Class Counsel's April 16 updated claims filing (Dkt. 643)…

That passage — case caption with full docket, courtroom number, Judge name, specific dollar figures (down to four sig figs), the docket numbers for each filing referenced, percentages, party-specific objectors — is the floor. Aim for this density everywhere.

### Length per topic

- ONE flowing client briefing under a single `## Analysis & Developments` header — three to five dense paragraphs on a heavy day, fewer on a light one, and NO subheadings inside it
- NO action-items sections of any kind (no "Recommended Actions", no "What to do this week" — the briefing itself is the whole deliverable)
- 1 `## Proposed Articles for the Briefing Site (up to 5)` block — up to five sources published in the last 48 hours, each with a two-to-three-sentence Key Insight carrying the specific figures/deadlines/counts and a one-word tag; thematic diversity required (five articles on the same development is a failure); fewer on light days, zero on quiet days, and say so explicitly when short
- 1 `## Sources` block at the bottom (full citation list)

Target total length: **proportional to the last 24 hours.** A heavy day may run 1,500–2,500 words; a normal day 400–900; a genuinely quiet day can be under 150 words. There is NO length floor — never pad a light day with background, recap, or restatement. The reader follows these matters daily and is charged by the word in attention: every sentence must contain something that happened, changed, or newly matters in the last 24 hours.

---

## 24-hour focus — write only what moved

The daily run is a **delta desk for a close-following reader**. Assume the audience read yesterday's briefing and every briefing before it. They do not need the backdrop re-set, the settlement mechanics re-explained, or the case posture re-described. Each day's advisory covers **events and developments from the last 24 hours** and nothing else.

### Workflow rule

Before composing today's advisory, **read the most recent prior advisory** for that topic — the most-recent `.md` file in the topic's `<project-dir>/public/advisory-*.md` directory, excluding today's. Use it to know what the reader already knows (so you don't repeat it), not as a draft to carry forward. Classify each candidate development:

1. **NEW** — not previously covered → full rich treatment (case caption, docket, judge, dollar figures, percentages, citations). One or two sentences of connective tissue tying it to the coverage theme is fine; a backgrounder is not.
2. **DELTA** — previously covered matter that moved today → report the movement and its implication. Reference the prior posture in a clause ("following last week's stay denial…"), never a paragraph.
3. **STALE** — previously covered, no movement today → **omit entirely.** Do not restate it, do not summarize it, do not keep its section. The prior briefings are the record; the reader has them.

### The connective-tissue rule

Each development should read as part of the running coverage — a clause locating it in the arc ("the third such transfer notice this month", "the first substantive ruling since the July 8 hearing") — without rebuilding the arc. If a sentence would be at home in last week's briefing, it does not belong in today's.

### Lede pattern

Open `## Analysis & Developments` with one paragraph naming today's developments in a single sweep:

> Three developments today: the Federal Circuit granted the government's stay motion in *Burlap & Barrel v. United States* (Dkt. 26), CBP confirmed a second $230,000 CAPE refund disbursement, and the CIT issued a scheduling order in the consolidated reciprocal-tariff dockets (Slip Op. 26-58).

### When the day is genuinely quiet

Say so in two or three sentences and stop. Pattern:

> No qualifying developments in the last 24 hours across the tracked dockets. The next scheduled milestone is the August 24 second-day hearing in *RNDC* (Bankr. S.D. Tex.). Yesterday's briefing remains the current state of play.

A quiet-day briefing under 150 words is correct output, not a failure. Proposed Articles and Sources shrink to whatever the day actually produced (zero is acceptable).

### What this does NOT change

- The Bartz-passage density requirement **for what is covered** (full case caption, docket number, judge name, dollar figures, percentages, statutory citations).
- The section structure when sections have content (`## Analysis & Developments` → `## Proposed Articles for the Briefing Site` → `## Sources`).
- The voice rules (complete sentences, em-dash discipline, no hedging, creditor/claimant orientation).
- The citation format and inline source-arrow density.

---

## Output format (per topic)

Save as `<project-dir>/public/advisory-YYYY-MM-DD.md`. Markdown structure:

```markdown
# <TOPIC EMOJI> <TOPIC NAME> | <Long Date>

## Analysis & Developments

[Paragraph 1 — densely cited, opens with the headline development]

[Paragraph 2 — the next development in descending order of consequence, its facts and its implication in the same breath]

[Paragraph 3 — adjacent matters / parallel docket / pending appeal, woven into the arc in a clause, not re-explained]

[Optional Paragraph 4 — the emerging questions, approaching deadlines, and forward read-through the reader can't get elsewhere]

(No subheadings inside the body; no bullets; one flowing narrative. No Recommended Actions or any other action-items section.)

## Proposed Articles for the Briefing Site (up to 5)

- **<Title 1>** — [<clickable link>](<URL>) · <Publisher> (<Tier>), <explicit publication date>
  - **Key Insight:** <Two-to-three sentences carrying the specific figures, deadlines, or counts that make this worth the reader's click.> `<one-word tag>`
- **<Title 2>** — ...
- (Up to five, each on a distinct development. Fewer on light days; if fewer than five qualify in the last 48 hours, say so explicitly.)

## Sources

- [<Title>](<URL>) — <Publisher> (<Tier>), <Date>
- (One entry per source actually cited inline; the Proposed Articles list is separate.)

*This advisory is provided for informational purposes by Turnpage Digital Markets and does not constitute legal advice.*
```

### Citation format

Every factual proposition that depends on a public source MUST be cited inline using markdown:

```
(__[Source Name](https://url)__)
```

For multiple sources supporting one claim, chain them: `(__[Source A](url1)__) (__[Source B](url2)__)`.

Sources cited inline must also appear in the `## Sources` block at the bottom.

### Voice rules

- **Complete sentences only.** No fragments, no telegraphic shorthand.
- **Specific docket detail.** Case name in italics, full case number, court abbreviation, judge name. Example: `*Bartz v. Anthropic PBC*, 3:24-cv-05417 (N.D. Cal.) before Judge Araceli Martínez-Olguín`.
- **Dollar figures and percentages always.** Use round figures sparingly; default to the precise number reported (e.g., `$187.5 million`, not `$187M`; `91.3 percent`, not `91%+`).
- **Em-dashes are rare.** Reserve em-dashes for moments where no other punctuation conveys the meaning. Aim for 1 em-dash per 100 sentences.
- **No bullets, numbered lists, or subheadings anywhere in the analysis body.** The briefing is pure flowing prose; the only list on the page is the Proposed Articles block.
- **No hedging adjectives.** Avoid "approximately," "potentially," "likely," "may," "could" unless the underlying uncertainty is itself the point.
- **No "we are excited to" openers.** No marketing speak. No buzzwords. The desk speaks like a trade-law-grade or restructuring-grade publication, not a consultant deck.
- **Creditor/claimant orientation throughout.** The audience is the claimant, the receiver, the trade creditor, the rights-holder. Not the defendant. Not "general counsel." Every implication is framed to the recovery posture.

---

## Step 1 — Load tab configurations

Read each `tabs/NN-<slug>.md`, skipping files ending `_disabled.md`. Sort by numeric prefix.

## Step 2 — Locate the briefing root

The briefing root is the user's `daily-briefing/` workspace. Output files go there and into each topic's `<slug>/` project directory.

## Step 3 — Per tab: research + advisory

For each tab in order:

1. **Load prior advisory as starting draft.** Locate the most recent existing advisory for this topic — the latest `.md` under `<project-dir>/public/advisory-*.md`, excluding today's. Read it end-to-end. This is today's working draft: the analytical content carries forward intact. Build an inventory of every matter already covered (case caption, docket number, dollar figures, settlement mechanics, hearing dates, deadlines, named storylines) so research effort can focus on movement against that inventory rather than re-narrating it.
2. **News fetch.** Run the tab's `news_fetch_command` if set (300s timeout).
2a. **Bloomberg + WSJ paywalled-headline scan.** Pull headlines and standfirsts from the following section pages (all free at the headline/standfirst level — no subscription needed for the scan itself):
   - Bloomberg Markets — `https://www.bloomberg.com/markets`
   - Bloomberg Technology — `https://www.bloomberg.com/technology`
   - Bloomberg Politics — `https://www.bloomberg.com/politics`
   - Bloomberg Law — `https://news.bloomberglaw.com/`
   - WSJ Markets — `https://www.wsj.com/news/markets`
   - WSJ Tech — `https://www.wsj.com/news/tech`
   - WSJ Politics — `https://www.wsj.com/news/politics`
   - WSJ Pro Bankruptcy headline index — `https://www.wsj.com/pro/bankruptcy`

   Use `mcp__workspace__web_fetch` or `WebFetch` to grab the section index HTML. Extract `(headline, url, standfirst, publication_date)` tuples published in the last 48 hours. Match each headline + standfirst against the current tab's `themes[]` and `keywords[]` lists. Keep candidates that contain at least one theme term or that the model judges as substantively on-topic (case names, docket numbers, party names, statutory citations are strong signals).

2b. **Open each candidate via Claude in Chrome and read the full article.** For each kept Bloomberg/WSJ URL, use the Claude in Chrome MCP (`mcp__Claude_in_Chrome__navigate` to open the URL in Andrew's logged-in Chrome session, then `mcp__Claude_in_Chrome__read_page` or `mcp__Claude_in_Chrome__get_page_text` to extract the article body). The user is signed in to Bloomberg and WSJ in Chrome; the paywall does not trigger for subscriber sessions. **Fallback:** If Claude in Chrome is unreachable (browser not running, MCP error), skip the deep fetch — record the headline and standfirst only, cite the article with a note `(subscriber-only; full text not fetched today)`, and continue. Do not abort the run.

3. **Targeted research on deltas.** Run web searches focused on (a) what's new in the last 24 hours for each matter already in the prior advisory, and (b) genuinely new matters surfacing under the tab's `themes[]`. Apply the **48-hour freshness rule** to article proposals. Apply the source tiers (tier 1 + tier 3) plus the Bloomberg/WSJ candidates from step 2a-b. Exclude NYT and Al Jazeera plus tab-specific exclusions. Classify each candidate development as NEW (not in prior advisory → add new full-rich section), DELTA (in prior advisory, moved today → revise that section to lead with the update, carry forward the prior analytical content beneath), or STALE (in prior advisory, no movement → leave prior section in place, do not strip).
4. **Compose today's advisory** covering ONLY the last 24 hours' NEW and DELTA matters, tied to the running coverage in clauses rather than backdrop paragraphs; omit stale matters entirely. Length is proportional to the day (quiet day = 2–3 sentences naming the next milestone). Whatever is covered gets Bartz-passage density. Save to `<project-dir>/public/advisory-YYYY-MM-DD.md`.
5. **Draft LinkedIn + X.com posts.** Save to `<project-dir>/posts/YYYY-MM-DD.md`. Posts lead with today's NEW item with the highest news-weight; never lead a post with a STALE matter.
6. **Build the per-tab dashboard.** Static HTML page; advisory body fills the center column. The dashboard HTML must conform to `BRAND_STYLING.md` and the layout templates documented there. The right-column Storylines accordion carries forward the running threads alongside the body's running coverage.

## Step 3.5 — Fetch live ticker data + inject Market Watch widgets

After all 6 per-tab dashboards are built, run:

```bash
python3 /Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current\ Roles/Turnpage/Development/daily-briefing/scripts/fetch_tickers.py
```

This reads `daily-briefing/tickers.md` (the editable per-tab ticker registry), fetches current price + 30-day sparkline data via `yfinance` for each symbol, and injects:

- A **Market Watch** box in the right column of each per-topic dashboard, above the Storylines accordion (max 5 tickers per topic; symbol, company name, price, day-change %, mini sparkline; click-through to Google Finance).
- A **horizontal ticker ribbon** on the landing page between the unified calendar strip and the topic cards (top 2 tickers per topic; Bloomberg-terminal style with up/down color coding).

If `yfinance` can't reach Yahoo (network error, firewall, sandbox), the script removes any stale Market Watch blocks rather than rendering placeholder dashes, so users never see empty data on the dashboards. Failed symbol fetches are logged to `daily-briefing/YYYY-MM-DD/ticker-failures.md` for pruning on the next edit pass.

Andrew edits `tickers.md` directly to add, remove, reorder, or temporarily disable ticker symbols. Changes take effect on the next daily-briefing run; no rebuild step.

---

## Step 4 — Update the landing page IN PLACE

**Read `daily-briefing/index.canonical.html` first.** It is the locked structural reference for `index.html` (~26 KB).

**Then update `daily-briefing/index.html` by editing text content inside existing elements only.** Do NOT rebuild the HTML structure or regenerate CSS. The page has six durable regions:

1. **Brand strip** — Turnpage logo (`assets/turnpage-logo.jpeg`) + theme-toggle button. No edits.
2. **Page title** — `<h1>Daily Briefing</h1>` + `.stamp` with the actual end-of-run time. Update only the stamp text. Format: `H:MM AM/PM ET · DAY, MONTH D, YYYY` uppercase.
3. **Unified 60+ day calendar strip** — horizontal scrollable row of `.ucal-item` tiles. Each tile links to its topic's `dashboard.html`. **Every tile sub-line must include case name + court abbreviation + substantive context.** Refresh the date set to reflect the next 60+ days; remove past dates, add new ones as the docket evolves. Minimum 20 tiles.
4. **3 × 2 grid of 6 topic cards** in this order:
   - Tariffs / Trade → `../rewind-tariffs/dashboard.html`
   - LLM / Copyright → `../llm-class-action/dashboard.html`
   - Crypto Insolvency → `../crypto-insolvency/dashboard.html`
   - Ponzi / Fraud Recovery → `../fraud-recovery/dashboard.html`
   - $1B+ Class Actions & Mass Arb → `../billion-dollar-class-actions/dashboard.html`
   - Bankruptcy Creditor Rights → `../bankruptcy-creditor-rights/dashboard.html`
5. **Each card** has emoji + title in header, a neon `.card-stat` anchor (4-7 words naming today's most consequential delta), a `.card-body` (one sentence describing what moved in the last 24 hours, or stating "no movement"), and a black `.card-link` "Read Briefing →" CTA.
6. **No Market Watch placeholder** unless `scripts/fetch_tickers.py` succeeded in fetching real data (the script handles its own injection/cleanup).

**Card body content is 24h-delta only on the landing page.** Per-topic dashboards keep the full rich advisory; the landing page surfaces only what is new in the last 24 hours, one sentence per topic. If a topic had no movement, the card says so directly ("No new appellate decisions in last 24 hours.").

## Step 5 — Present

Run the self-check from the top of this file. If everything passes:

`present_files` with exactly one file: `/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development/daily-briefing/index.html`.

Do not present advisory `.md` files individually. Do not present a `BRIEFING-RUN-SUMMARY.md`. Do not present any per-topic dashboard. One link.

---

## Critical rules

1. **Incremental research, full output.** Read the prior advisory as today's starting draft and carry its analytical content forward intact. Run searches only on what moved today (NEW or DELTA). The output length and density do not change — only the research effort drops. Never shrink the format to save tokens.
2. **Density is non-negotiable; length is not.** Whatever the day's developments are, cover them at the Bartz-passage level (full case caption, docket number, judge name, dollar figures, percentages, statutory citations). Word count follows the news — 2,500-word ceiling on heavy days, a few sentences on quiet ones, never padding.
3. **48-hour freshness rule** for all article proposals.
4. **Never cite NYT or Al Jazeera.**
5. **Creditor/claimant orientation** throughout the briefing body.
6. **Tabs run sequentially.** Do not parallelize.
7. **Failures don't abort the run.** Log the error, render the failed tab in an error state, continue.
8. **Brand styling.** All HTML output conforms to `BRAND_STYLING.md`.

---

## Brand styling

See `BRAND_STYLING.md` for the full visual spec. Key invariants for dashboards:

- **3-column layout:** 260px Key Dates / 1fr advisory body / 290px Storylines.
- **Nav alignment:** `.tn-row.brand` and `.tn-tabs-row` constrained to `max-width: 1440px; margin: 0 auto; padding: 0 32px; box-sizing: border-box` so the Turnpage logo aligns with the left edge of `.page-title`, `.three-col`, and `.sources`.
- **Polestar-style hover dropdowns** with neon-bg `#D4FF00` panels flush against the active tab. **No drop shadow** on `.tn-dropdown` — the panel is flat.
- **Dropdown 3-column grid:** Overview (1.4fr) | Quick Links (1fr) | CTA (auto). The "Open Daily Briefing" button lives in its own third column to the RIGHT of Quick Links — never below the link list. (Failure mode: a stray `</details>` tag where `</div>` should be closes the wrong element and pulls the CTA into the Links column.)
- **Calendar squares:** white background, thin gray border, neon highlighter under the day number. In dark mode the highlighter switches to muted `#5D7A00` with white text.
- **Source-arrow tooltips:** 16×16 light-gray icon with hover panel showing publisher + excerpt.
- **H3 subheadings** in advisory body: neon left-bar accent (`border-left: 4px solid var(--neon-block)` with 14px left padding), auto-switching to `#5D7A00` in dark mode.
- **Three button styles** — Primary ink, Ghost outlined, Neon CTA — all square corners.
- **Dark mode:** `#16161B` background, `#E5E7EB` ink. Large neon highlighter blocks (`.stat-anchor`, `.accent`, `.cal-day`, `.card-stat-anchor`) switch to `#5D7A00` with white text. Small accents (tab pill, source-arrow icon) stay full `#D4FF00`.
- **No consolidated dashboard** at the daily-briefing root.
- **Storylines** (right column) are vertical-accordion collapsible `<details>`/`<summary>` per storyline.

---

## Refinement workflow

The "Refine This Tab" dialog on each tab dashboard produces `TAB INSTRUCTION` clipboard blocks. When pasted, these update the tab config at `daily-briefing/tabs/<NN-slug>.md` (editorial_notes / themes / source tiers). Refinements take effect on the next daily run.
