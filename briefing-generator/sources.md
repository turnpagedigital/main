# Sources — Whitelist + Blacklist

Edit this file at any time. Changes take effect on the next daily-briefing run.

## How it works

- Every source line is `domain.com` (optionally followed by ` — Notes` for a comment).
- **Whitelist** sources are preferred — they pass the relevance filter automatically, get cited at face value, and surface higher in the "Proposed Articles for the Briefing Site" block.
- **Blacklist** sources are never cited, regardless of how on-topic the article appears.
- **Greylist** sources (neither white nor black) pass through with normal relevance scoring, and any source actually used gets surfaced in `daily-briefing/YYYY-MM-DD/unknown-sources.md` after the run so you can decide whether to add to white or black on the next edit pass.
- Subdomain matching: `bloomberg.com` matches `news.bloomberg.com`, `www.bloomberg.com`, etc.
- Lines beginning with `#` are headings/comments and are ignored by the parser.

---

## Whitelist — Media (general news + subscriber publications)

### Tier 1 — primary-source proximity + editorial standards
- reuters.com — Reuters
- bloomberg.com — Bloomberg (subscriber)
- wsj.com — Wall Street Journal (subscriber)
- ft.com — Financial Times (subscriber)
- news.bloomberglaw.com — Bloomberg Law (subscriber)
- law360.com — Law360
- politico.com — Politico
- washingtonpost.com — Washington Post (subscriber)
- apnews.com — Associated Press
- npr.org — NPR
- nikkei.com — Nikkei Asia
- scmp.com — South China Morning Post

### Tier 2 — solid secondary
- axios.com — Axios
- semafor.com — Semafor
- thehill.com — The Hill
- thedispatch.com — The Dispatch
- americanbanker.com — American Banker
- marketwatch.com — MarketWatch
- barrons.com — Barron's (subscriber)
- cnbc.com — CNBC
- forbes.com — Forbes (selective; avoid contributor-driven content)
- bloomberg.com/opinion — Bloomberg Opinion (subscriber; Matt Levine, Justin Fox, etc.)

### Tier 3 — trade & specialist press
- bankingdive.com — Banking Dive
- pymnts.com — PYMNTS
- coindesk.com — CoinDesk
- theblock.co — The Block (crypto)
- protocol.com — Protocol
- techpolicypress.com — Tech Policy Press

---

## Whitelist — Law Firm Publications

Client alerts, white papers, and bylined commentary from major firms. We cite these when they advance the analysis with primary-source detail (case captions, docket activity, statutory interpretation).

### Trade / IEEPA / Customs
- diaztradelaw.com — Diaz Trade Law
- strtrade.com — Sandler, Travis & Rosenberg
- crowell.com — Crowell & Moring (International Trade)
- shearman.com — Shearman & Sterling (Trade & National Security)
- akingump.com — Akin Gump (Trade)
- mayerbrown.com — Mayer Brown (International Trade)
- whitecase.com — White & Case (Trade)

### Copyright / AI / Tech IP
- gtlaw.com — Greenberg Traurig (IP)
- bakerlaw.com — Baker & Hostetler (Bartz v. Anthropic plaintiffs' counsel)
- susmangodfrey.com — Susman Godfrey (Bartz v. Anthropic)
- jenner.com — Jenner & Block (AI / copyright)
- omm.com — O'Melveny & Myers (AI)
- cooley.com — Cooley (AI / tech)
- proskauer.com — Proskauer (entertainment + AI)
- skadden.com — Skadden (IP litigation)

### Bankruptcy / Restructuring / Creditor Rights
- weil.com — Weil, Gotshal & Manges
- lw.com — Latham & Watkins (Restructuring)
- wlrk.com — Wachtell, Lipton, Rosen & Katz
- jonesday.com — Jones Day (Restructuring)
- kirkland.com — Kirkland & Ellis (Restructuring)
- daviswright.com — Davis Wright Tremaine
- haynesboone.com — Haynes Boone (Creditor Rights)
- stroock.com — Stroock (Insurance / Creditor)
- pillsburylaw.com — Pillsbury (Insolvency)
- troutman.com — Troutman Pepper Locke
- arentfox.com — ArentFox Schiff
- norton-rose-fulbright.com — Norton Rose Fulbright (Restructuring)
- alston.com — Alston & Bird (Bankruptcy)
- akingump.com — Akin Gump (Restructuring)
- pszjlaw.com — Pachulski Stang Ziehl & Jones (debtor / creditor)
- klestadt.com — Klestadt Winters Jureller Southard & Stevens

### Class Actions / Mass Litigation
- robbinsgeller.com — Robbins Geller (securities class actions)
- bermanlaw.com — Berman Tabacco
- bsfllp.com — Boies Schiller Flexner
- kellerpostman.com — Keller Postman (mass arbitration plaintiffs)
- lieffcabraser.com — Lieff Cabraser
- girardsharp.com — Girard Sharp
- cuneolaw.com — Cuneo Gilbert & LaDuca
- hbsslaw.com — Hagens Berman Sobol Shapiro
- cohenmilstein.com — Cohen Milstein

### Crypto / Digital Asset Insolvency
- morrisoncohen.com — Morrison Cohen
- dlapiper.com — DLA Piper (Crypto Insolvency)
- carltonfields.com — Carlton Fields
- whitewilliams.com — White and Williams

### General Litigation / Securities / Antitrust
- paulweiss.com — Paul, Weiss
- gibsondunn.com — Gibson Dunn (antitrust, securities)
- cleary.com — Cleary Gottlieb
- davispolk.com — Davis Polk
- sullcrom.com — Sullivan & Cromwell
- simpsonthacher.com — Simpson Thacher
- bakermckenzie.com — Baker McKenzie
- freshfields.com — Freshfields (US restructuring)
- ropesgray.com — Ropes & Gray
- debevoise.com — Debevoise & Plimpton

---

## Whitelist — Professional Firms (consulting / forensic / restructuring advisors)

- cornerstone.com — Cornerstone Research
- alixpartners.com — AlixPartners
- fticonsulting.com — FTI Consulting
- alvarezandmarsal.com — Alvarez & Marsal
- houlihanlokey.com — Houlihan Lokey (Restructuring practice)
- pjt.com — PJT Partners (RX advisory)
- lazard.com — Lazard (Restructuring)
- mosconegroup.com — Moscone Group
- chartwellcap.com — Chartwell Capital Solutions
- accuracy.com — Accuracy
- analysisgroup.com — Analysis Group (litigation economics)
- compasslexecon.com — Compass Lexecon (antitrust + securities)
- nera.com — NERA Economic Consulting
- charlesriverassociates.com — Charles River Associates (CRA)

---

## Whitelist — Primary Sources (always cite when available)

These never go through the relevance filter; if a docket entry, ruling, or agency release is on the day's record, it leads the citation chain.

- courtlistener.com — CourtListener
- pacer.uscourts.gov — PACER
- supremecourt.gov — U.S. Supreme Court
- cit.uscourts.gov — Court of International Trade
- cafc.uscourts.gov — Federal Circuit
- sec.gov — Securities and Exchange Commission
- cftc.gov — Commodity Futures Trading Commission
- justice.gov — U.S. Department of Justice
- treasury.gov — U.S. Treasury
- cbp.gov — Customs and Border Protection
- ustr.gov — Office of the U.S. Trade Representative
- federalregister.gov — Federal Register
- congress.gov — Congress.gov
- ftc.gov — Federal Trade Commission

---

## Blacklist — Never Cite

Universal exclusions, regardless of tab or how on-topic the article appears.

- nytimes.com — New York Times (per Andrew's standing instruction)
- aljazeera.com — Al Jazeera (per Andrew's standing instruction)
- zerohedge.com — ZeroHedge
- dailymail.co.uk — Daily Mail
- breitbart.com — Breitbart
- rt.com — Russia Today
- sputniknews.com — Sputnik
- gateway-pundit.com — Gateway Pundit
- infowars.com — InfoWars

---

## Notes on editing

- Add a domain to the whitelist in the right category. The skill scans whitelists in tier/category order, but a domain only needs to appear once.
- Add a domain to the blacklist to exclude it everywhere.
- Move a domain by deleting it from one list and adding to the other.
- If you want a source to apply to only certain tabs, add it to the tab's `tabs/NN-<slug>.md` config under `additional_whitelist` or `additional_blacklist` instead. The per-tab list is additive (whitelist) or restrictive (blacklist) on top of this global file.
- After the daily run, check `daily-briefing/YYYY-MM-DD/unknown-sources.md` for sources the skill encountered but couldn't classify. Bulk-promote or bulk-blacklist them with a single edit here.
