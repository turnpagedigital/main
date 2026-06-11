# Tickers — Public Company Watch by Tab

Edit this file at any time. Changes take effect on the next daily-briefing run.

## How it works

- Each tab has its own ticker list. Add/remove symbols by editing the list under the appropriate heading.
- Format: `SYMBOL — Company Name (relevance note)`. The relevance note is optional but useful for context.
- The morning run fetches current price, day change, and a 30-day sparkline via Yahoo Finance for each symbol.
- The five most-relevant tickers per tab render in a "Market Watch" box in the right column of that tab's dashboard, above the Storylines accordion.
- The two most relevant tickers per tab render in the horizontal ticker ribbon on the landing page, below the unified calendar strip.
- Click-through on any ticker goes to Google Finance for that symbol.
- Symbols listed first in each section get priority placement. Reorder to change which appear in the ribbon.

---

## Tariffs / Trade — `rewind-tariffs`

Importers and retail with material tariff pass-through exposure; auto OEMs on Section 232 watch.

- WMT — Walmart (largest U.S. importer; bellwether for retail pass-through)
- TGT — Target (consumer discretionary import exposure)
- COST — Costco (high-volume imports; member-pricing margin pressure)
- AMZN — Amazon (1P import + 3P marketplace seller exposure)
- HD — Home Depot (Section 232 steel/aluminum + finished-goods imports)
- DG — Dollar General (margin-sensitive; tariff-driven SKU rationalization)
- DLTR — Dollar Tree (price-point business model under tariff pressure)
- NKE — Nike (apparel + footwear imports)
- AAPL — Apple (consumer electronics imports + China assembly)
- F — Ford (Section 232 + Section 301 components)
- GM — General Motors (parallel auto exposure)

## LLM / Copyright — `llm-class-action`

Public AI defendants in training-data class actions and publisher plaintiffs.

- GOOGL — Alphabet (Bartz adjacent + AI Overviews / fair-use exposure)
- MSFT — Microsoft (OpenAI investor; co-defendant exposure in publisher suits)
- META — Meta Platforms (Kadrey v. Meta defendant)
- NVDA — NVIDIA (AI training infrastructure beneficiary)
- AMZN — Amazon (Anthropic investor; Bedrock distribution)
- NWSA — News Corp (publisher-side licensing leverage)
- NYT — New York Times Co. (OpenAI lawsuit plaintiff)
- ADBE — Adobe (Firefly enterprise content-provenance exposure)
- ORCL — Oracle (Anthropic compute partnership)
- DJCO — Daily Journal Corp. (legal publishing)

## Crypto Insolvency — `crypto-insolvency`

Public crypto exchanges, miners, and custody operators with insolvency-rights exposure.

- COIN — Coinbase (regulatory + customer-property litigation)
- MARA — Marathon Digital Holdings
- RIOT — Riot Platforms
- HOOD — Robinhood (crypto trading + customer-property questions)
- SQ — Block Inc. (Bitcoin holdings + Cash App)
- HUT — Hut 8 Mining
- CLSK — CleanSpark
- BTBT — Bit Digital
- MSTR — Strategy (formerly MicroStrategy; BTC treasury)
- IREN — Iris Energy

## Ponzi / Fraud Recovery — `fraud-recovery`

Litigation funders + financial-infrastructure names with material clawback / recovery exposure.

- BUR — Burford Capital (NYSE-listed; litigation funding)
- ICE — Intercontinental Exchange (filings infrastructure + market integrity)
- LDOS — Leidos (FINRA contract / asset-recovery infrastructure)
- DGX — Quest Diagnostics (clawback recipient case studies)
- FDS — FactSet (forensic accounting tooling consumer)


## $1B+ Class Actions & Mass Arbitration — `billion-dollar-class-actions`

Defendants in active mega-settlement litigation cycles.

- JNJ — Johnson & Johnson (talc, opioid, Texas Two-Step)
- PFE — Pfizer (opioid, securities)
- BAYRY — Bayer ADR (Roundup / glyphosate)
- LLY — Eli Lilly (pricing, securities)
- MRK — Merck (Gardasil, securities)
- V — Visa (interchange mega-settlement)
- MA — Mastercard (interchange mega-settlement)
- AMZN — Amazon (antitrust mega-settlements)
- META — Meta (antitrust + privacy class actions)
- BHP — BHP Group (Samarco / mining class actions)
- GOOGL — Alphabet (Google advertiser mass arb — Keller Postman ~$218B)
- AAPL — Apple (App Store mass arb tracks)
- MSFT — Microsoft (B2B + cloud mass arb adjacency)
- TWLO — Twilio (mass arb consumer adjacency)

## Bankruptcy Creditor Rights — `bankruptcy-creditor-rights`

Public companies in or near chapter 11; creditor-rights bellwethers.

- WBD — Warner Bros. Discovery (leverage watchlist)
- AMC — AMC Entertainment (debtor watchlist)
- PARA — Paramount Global (debt restructuring watch)
- CCL — Carnival Corp. (post-COVID debt servicing)
- F — Ford (supplier-bankruptcy creditor exposure)
- GM — General Motors (supplier-bankruptcy creditor exposure)
- WBA — Walgreens Boots Alliance (retail bankruptcy adjacency)
- GME — GameStop (retail / convenience bankruptcies adjacency)

---

## Notes on editing

- Symbols must be on a major U.S. exchange or have a U.S. ADR (e.g., BAYRY for Bayer, BUR for Burford).
- Foreign-only listings (e.g., LSE-only symbols like BUR.L, MANO.L) won't render correctly in the Google Finance click-through; use the U.S. ADR or omit.
- The top entries in each section render first. Move a symbol to the top of its section to surface it in the landing-page ribbon.
- To temporarily hide a ticker without deleting it, prefix the line with `#` (the parser will skip commented lines).
- After each daily run, any symbol that failed to fetch (delisted, halted, network error) gets logged to `daily-briefing/YYYY-MM-DD/ticker-failures.md` so you can prune dead entries.
