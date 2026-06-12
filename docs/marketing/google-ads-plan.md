# Google Ads Plan — Turnpage Digital Markets

*Planning document, June 2026. Nothing here is live. Internal use only.*

TPDM is the OTC desk for rights holders. The person we want clicking an ad is someone who **holds a claim and wants money now**: an FTX creditor tired of waiting, an author with a Bartz allocation, a trade creditor in a Chapter 11, a plaintiff with a judgment. That intent is narrow, which is good news — we are NOT bidding on "personal injury lawyer" at $100+ per click. We're bidding on claim-monetization terms that few advertisers compete for.

---

## 1. Campaign architecture

Four search campaigns, one per sub-brand. Keep them separate so budgets, bids, and reporting map cleanly to the business lines.

| # | Campaign | Sub-brand | Landing page | Status note |
|---|----------|-----------|--------------|-------------|
| 1 | `TPDM-Search-Crypto` | Locked Crypto | `/crypto` | Launch first — highest transactional intent |
| 2 | `TPDM-Search-AICopyright` | AI Copyright | `/copyright` | Launch second — Bartz payouts begin late fall 2026 (https://writerbeware.blog/2026/04/10/anthropic-copyright-settlement-april-update/); demand peaks between final approval and checks |
| 3 | `TPDM-Search-Bankruptcy` | Bankruptcy creditor claims | `/contact?source=bankruptcy` (until the sub-brand page ships) | Launch when the page exists, or run small to `/contact` |
| 4 | `TPDM-Search-LitFin` | Litigation Finance | `/litigation-funding` | Most expensive keywords — run last, smallest budget, tightest match types |

Campaign settings for all four:
- **Network:** Google Search only. Uncheck Search Partners and Display Network at launch (they dilute lead quality in legal-adjacent verticals).
- **Location:** United States. Crypto campaign can later add English-speaking creditor populations (UK, Canada, Singapore) — FTX/Celsius creditors are global.
- **Bidding:** start Manual CPC or Maximize Clicks with a CPC cap; switch to Maximize Conversions only after ~30 recorded conversions (Smart Bidding needs data; see https://growthmindedmarketing.com/blog/google-ads-conversion-tracking/).
- **Ad rotation:** Optimize.
- **One shared negative-keyword list** applied to all campaigns (Section 4).

---

## 2. Ad groups, keywords, and intent

~48 keywords across the plan. Match-type key: `[exact]`, `"phrase"`. Avoid broad match until conversion data exists — broad match plus legal-adjacent terms equals burned budget.

**CPC estimates are directional.** There is no published benchmark for claim-monetization keywords specifically; the figures below are inferred from 2025–2026 legal-industry data: legal-vertical weighted average ~$8.67 (https://www.get-ryze.ai/blog/average-cpc-by-industry-google-ads-2026), niche/low-competition legal terms far below the $50–$200+ paid for high-intent injury terms (https://roa-marketing.com/blog/attorney-google-ads-cost-per-click-2026/, https://www.ilawyermarketing.com/most-expensive-google-ads-keywords-legal-industry-2025/). Claim-selling keywords have a tiny advertiser pool (Xclaim, Cherokee, FRNT, Claims Market and a handful of funds), so expect the low end. Validate everything in Keyword Planner before launch and treat the first $500 as price discovery.

### Campaign 1 — Crypto Claims (`/crypto`)

**Ad group 1.1: FTX claims (transactional)** — est. CPC $4–12

| Keyword | Match | Intent |
|---|---|---|
| sell ftx claim | exact + phrase | Transactional — the money keyword |
| sell my ftx claim | exact | Transactional |
| ftx claim buyers | exact + phrase | Transactional |
| ftx bankruptcy claim price | phrase | High-intent research (price-checking before selling) |
| ftx claim value | phrase | High-intent research |
| how much is my ftx claim worth | phrase | High-intent research |

**Ad group 1.2: Celsius / Voyager / Genesis (transactional)** — est. CPC $3–10

| Keyword | Match | Intent |
|---|---|---|
| sell celsius claim | exact + phrase | Transactional |
| celsius bankruptcy claim buyers | phrase | Transactional |
| sell genesis claim | exact + phrase | Transactional |
| genesis bankruptcy claim | phrase | Mixed — watch search-term report |
| sell voyager claim | exact | Transactional (smaller volume; Voyager largely distributed) |
| celsius stub claim sale | phrase | Transactional, sophisticated holder |

**Ad group 1.3: Generic crypto claim monetization** — est. CPC $3–8

| Keyword | Match | Intent |
|---|---|---|
| sell crypto bankruptcy claim | exact + phrase | Transactional |
| crypto bankruptcy claim buyers | phrase | Transactional |
| crypto claims marketplace | phrase | Transactional — comparison shoppers (Xclaim/Claims Market searchers) |
| sell locked crypto | phrase | Transactional but ambiguous — monitor for staking/DeFi noise |
| crypto exchange bankruptcy payout | phrase | Informational — bid low, feeds awareness |

### Campaign 2 — AI Copyright (`/copyright`)

Context for copy: 91.3% of 482,460 eligible works were claimed by the March 30, 2026 deadline; allocation is at least $3,000 per claimed work, paid only after final approval and appeals resolve — late fall 2026 at the earliest (https://authorsguild.org/news/anthropic-settlement-update-91-percent-of-books-claimed/, https://copyrightalliance.org/participating-bartz-v-anthropic-settlement/). The TPDM pitch is the waiting gap.

**Ad group 2.1: Bartz / Anthropic settlement (transactional + high-intent research)** — est. CPC $2–8 (almost no commercial competition yet)

| Keyword | Match | Intent |
|---|---|---|
| sell anthropic settlement claim | exact + phrase | Transactional |
| bartz settlement payout date | phrase | Informational, high relevance — they're impatient, which is the pitch |
| anthropic settlement payment timeline | phrase | Informational, high relevance |
| anthropic copyright settlement advance | phrase | Transactional |
| bartz v anthropic settlement amount per book | phrase | High-intent research |
| anthropic author settlement when paid | phrase | Informational |

**Ad group 2.2: Authors selling claims (transactional)** — est. CPC $2–6

| Keyword | Match | Intent |
|---|---|---|
| sell copyright claim | exact + phrase | Transactional |
| sell class action claim | phrase | Transactional — broad, watch search terms |
| sell my settlement payout | phrase | Transactional — overlaps structured-settlement searches; negate "structured", "annuity" |
| ai copyright settlement cash advance | phrase | Transactional |
| class action settlement advance | phrase | Transactional — adjacent industry exists (lawsuit-advance shops), CPC may run higher |

### Campaign 3 — Bankruptcy creditor claims (`/contact?source=bankruptcy`)

**Ad group 3.1: Sell a bankruptcy claim (transactional)** — est. CPC $4–12

| Keyword | Match | Intent |
|---|---|---|
| sell bankruptcy claim | exact + phrase | Transactional — core term |
| bankruptcy claim buyers | exact + phrase | Transactional |
| sell trade claim | exact + phrase | Transactional, B2B creditor |
| who buys bankruptcy claims | phrase | High-intent research |
| bankruptcy claim purchase agreement | phrase | High-intent research, sophisticated seller |
| chapter 11 claim sale | phrase | Transactional |

**Ad group 3.2: Claims trading / valuation (research)** — est. CPC $3–8

| Keyword | Match | Intent |
|---|---|---|
| bankruptcy claims trading | phrase | Mixed — includes industry observers |
| how much is my bankruptcy claim worth | phrase | High-intent research |
| sell unsecured creditor claim | phrase | Transactional |
| bankruptcy claim valuation | phrase | Research — bid low |

### Campaign 4 — Litigation Finance (`/litigation-funding`)

This is the only campaign that brushes against established, well-funded advertisers (pre-settlement funders like Oasis, plaintiff-funding lead-gen). Expect the highest CPCs in the plan — high-intent funding terms behave like mid-tier legal keywords, $20–60, occasionally higher in competitive moments (cf. practice-area ranges at https://roa-marketing.com/blog/attorney-google-ads-cost-per-click-2026/ and https://anytimedigitalmarketing.com/2025/12/15/google-ads-cost-for-lawyers-2026-guide/). Exact match only, tight budget caps.

**Ad group 4.1: Plaintiff-side funding (transactional)** — est. CPC $20–60

| Keyword | Match | Intent |
|---|---|---|
| litigation funding for plaintiffs | exact | Transactional |
| sell my lawsuit | exact | Transactional |
| sell lawsuit settlement | exact | Transactional |
| lawsuit cash advance alternatives | phrase | Research — differentiator angle (we buy, we don't lend) |
| commercial litigation funding | exact | Transactional, B2B — better fit than consumer pre-settlement |

**Ad group 4.2: Judgments and awards (transactional)** — est. CPC $10–30

| Keyword | Match | Intent |
|---|---|---|
| sell judgment | exact + phrase | Transactional |
| judgment buyers | exact | Transactional |
| sell arbitration award | phrase | Transactional, low volume, high value |
| monetize legal claim | phrase | Transactional, sophisticated |

---

## 3. Responsive search ads — copy in brand voice

RSA limits: 15 headlines × 30 characters, 4 descriptions × 90 characters. Voice rules: direct, no fluff, no outcome guarantees, never imply TPDM is a law firm. Pin "Not a law firm" style disclaimers into descriptions where space allows. Build 2–3 RSAs per ad group from the pools below; Google assembles combinations.

### Ad group 1.1 — FTX claims

**Headlines (pick 12–15):**
- Sell Your FTX Claim
- Get Paid Now, Not Later
- FTX Claim Buyers
- Skip the Distribution Wait
- Cash for FTX Claims
- The OTC Desk for Claims
- Direct Bids, No Middleman
- Know What Your Claim Is Worth
- Firm Offers in Days
- FTX Creditor? Talk to Us
- Turnpage Digital Markets
- Sell at Today's Price
- No Fees to Get a Quote
- Your Claim. Your Timeline.
- Stop Waiting on the Estate

**Descriptions:**
- Holding an FTX claim? We help creditors sell for cash now instead of waiting on distributions.
- Get a real bid on your claim. Direct process, clear terms, no obligation to accept.
- The OTC desk for rights holders. We buy and broker bankruptcy claims. Not a law firm.
- Tell us your claim size and class. We come back with a firm number. Simple as that.

### Ad group 1.2 — Celsius / Voyager / Genesis

**Headlines:** Sell Your Celsius Claim · Genesis Claim Buyers · Cash for Crypto Claims · Stub Claims Bought Here · Stop Waiting on Distributions · Get a Bid This Week · Voyager Claim? We Buy Those · Direct Buyer, Clear Terms · The OTC Desk for Claims · Turnpage Digital Markets · Know Your Claim's Value · Quote in 48 Hours · No Cost to Ask · Sell the Wait, Keep the Cash · Crypto Creditors Welcome

**Descriptions:**
- Celsius, Genesis, Voyager — if you hold a claim, we'll price it. Free quote, no obligation.
- Distributions drag on for years. Selling your claim turns the wait into cash today.
- We buy and broker crypto bankruptcy claims at market prices. Not a law firm. Not a lender.
- Send your claim details. Get a firm offer. Decide on your own timeline.

### Ad group 2.1 — Bartz / Anthropic settlement

**Headlines:** Anthropic Payout Coming? · Don't Wait for the Check · Sell Your Bartz Claim · $3,000+ Per Claimed Work · Authors: Get Paid Sooner · Advance on Your Settlement · The OTC Desk for Authors · Turnpage Digital Markets · Your Claim Has Value Now · Firm Offer, No Obligation · Skip the Appeals Wait · Cash Before the Payout · Free Claim Assessment · Talk to a Claims Desk · Know Your Options

**Descriptions:**
- Claimed a work in Bartz v. Anthropic? Payouts wait on approval and appeals. You don't have to.
- We buy author settlement claims so you get paid now instead of late fall — or later.
- Direct, transparent pricing on AI copyright settlement claims. Not a law firm.
- Send your claim confirmation. We'll tell you what it's worth today. No cost, no commitment.

*(Note: "$3,000+ Per Claimed Work" cites the court-noticed minimum allocation — keep the landing page citation to https://copyrightalliance.org/participating-bartz-v-anthropic-settlement/ current, and pull the headline if the figure changes.)*

### Ad group 3.1 — Sell a bankruptcy claim

**Headlines:** Sell Your Bankruptcy Claim · Trade Claim Buyers · Get Paid Before the Plan · Cash for Creditor Claims · Chapter 11 Creditor? · The OTC Desk for Claims · Firm Bids on Real Claims · Turnpage Digital Markets · Your Claim, Priced Today · Skip Years of Waiting · No Fee for a Quote · Direct Buyer Network · Unsecured? Still Valuable. · Know What Buyers Pay · Sell on Your Terms

**Descriptions:**
- Chapter 11 distributions take years. Selling your claim takes days. Get a quote.
- We buy and broker trade claims and creditor claims. Clear pricing, clean docs.
- The OTC desk for rights holders. Not a law firm — a market counterparty.
- Tell us the debtor, class, and amount. We return a firm number, fast.

### Ad group 4.1 — Litigation funding

**Headlines:** Monetize Your Legal Claim · We Buy, We Don't Lend · Litigation Capital, Direct · Sell Your Judgment · No Interest, No Loan · Commercial Claims Funded · The OTC Desk for Claims · Turnpage Digital Markets · Get Liquidity From a Case · Firm Terms, Fast Answers · Your Case Has Value Now · Not a Lawsuit Loan · Plaintiffs: Know Your Options · Capital Without the Wait · Confidential Process

**Descriptions:**
- Lawsuit loans charge interest. We buy or fund claims outright — a sale, not a debt.
- Plaintiffs and judgment holders: turn a future recovery into capital today.
- Direct litigation finance for commercial claims and judgments. Not a law firm.
- Send the case basics. We'll tell you quickly whether it's fundable and at what terms.

---

## 4. Negative keywords (shared list — apply to all campaigns)

**Free/pro-bono seekers:** pro bono, free lawyer, free attorney, free legal advice, free consultation lawyer, legal aid
**Job seekers:** jobs, job, careers, hiring, salary, internship, paralegal, "how to become"
**DIY/students:** template, sample, pdf, definition, "what is a" (monitor — can clip good queries), course, exam, study
**Wrong industry:** insurance claim, warranty claim, unemployment claim, va claim, workers comp (unless that vertical opens), structured settlement, annuity
**Crypto noise (Campaign 1):** staking, airdrop, wallet recovery, hack, password, "how to file" (creditors who haven't filed aren't sellable yet — debatable, monitor), tax
**AI Copyright (Campaign 2):** "opt out", objection, "file a claim" (deadline passed — these are too-late searchers; or keep and let the page educate), fanfiction
**Lit-fin (Campaign 4):** loan shark, payday, personal loan, "no credit check"
**Brand-safety:** scam, complaints, lawsuit against turnpage

Review the search-terms report weekly for the first month and feed new negatives in. That report is where the real keyword list gets written.

---

## 5. Landing pages and UTM templates

The site captures UTM parameters + `gclid` into the contact form (wired June 2026), so every lead row shows which campaign produced it. Use Final URL suffix at the campaign level so ad-level URLs stay clean.

| Campaign | Final URL | Final URL suffix |
|---|---|---|
| Crypto | `https://turnpagedigital.com/crypto` | `utm_source=google&utm_medium=cpc&utm_campaign=crypto-claims&utm_content={creative}&utm_term={keyword}` |
| AI Copyright | `https://turnpagedigital.com/copyright` | `utm_source=google&utm_medium=cpc&utm_campaign=ai-copyright&utm_content={creative}&utm_term={keyword}` |
| Bankruptcy | `https://turnpagedigital.com/contact?source=bankruptcy` | `utm_source=google&utm_medium=cpc&utm_campaign=bankruptcy-claims&utm_content={creative}&utm_term={keyword}` |
| Litigation Finance | `https://turnpagedigital.com/litigation-funding` | `utm_source=google&utm_medium=cpc&utm_campaign=lit-finance&utm_content={creative}&utm_term={keyword}` |

`{keyword}` and `{creative}` are Google ValueTrack parameters — Google fills them automatically. `gclid` is appended automatically when auto-tagging is on (it is by default; leave it on).

Each landing page's CTA should route to `/contact?source=<sub-brand>` so the form's hidden `source` field matches the campaign even when the visitor navigates around first.

**Landing-page must-haves before spending:** a visible "Not a law firm. Not legal advice." disclaimer, the contact form or a one-click path to it above the fold on mobile, and at least one concrete proof point (e.g., market context like FTX claims trading at deep discounts in OTC markets — https://www.x-claim.com/blog/ftx-bankruptcy-claims-sell-for-20-cents-on-the-dollar-in-private-otc-markets-coindesk).

---

## 6. Budget tiers

Legal-vertical context: small-firm budgets commonly run $2,500–$15,000/month (https://roa-marketing.com/blog/attorney-google-ads-cost-per-click-2026/), but TPDM's niche keywords cost a fraction of injury-law terms, so meaningful testing starts lower.

| Tier | Monthly spend | Allocation | What it buys |
|---|---|---|---|
| **Probe** | $750–1,500 | 60% Crypto, 40% AI Copyright | ~100–300 clicks/mo at $4–8 blended CPC. Enough to validate that these searches exist and convert. Run 6–8 weeks. |
| **Build** | $2,500–4,000 | 40% Crypto, 30% AI Copyright, 20% Bankruptcy, 10% LitFin | Adds the two remaining campaigns. ~30 conversions/mo unlocks Smart Bidding. |
| **Scale** | $5,000–10,000 | Rebalance to whatever converts — expect Crypto and AI Copyright to win | Maximize Conversions with tCPA targets set ~20% above observed CPA. |

Lead math to sanity-check: at a $6 blended CPC and a 4% landing-page conversion rate (decent for a focused B2B page), a lead costs ~$150. One closed claim purchase should cover months of Probe-tier spend — but track cost-per-qualified-lead, not cost-per-form-fill, since this vertical attracts tire-kickers asking what their claim is worth. (Quote requests are still pipeline; just score them separately.)

---

## 7. Conversion tracking wiring

The site is instrumented so that a successful contact-form submit fires:
1. A GA4 `generate_lead` event, and
2. A Google Ads conversion ping,

both driven by `src/data/analytics.json`. The config ships inert — tracking activates the moment the GA4 measurement ID (`G-XXXX`), the Ads conversion ID (`AW-XXXX`), and the conversion label are pasted in (see `docs/marketing/setup-checklists.md` for the exact click-paths to obtain all three).

**Recommended Ads conversion settings:** Category = *Submit lead form* (or *Qualified lead* once lead scoring exists), Count = *One per click*, Click-through window = 30 days, attribution = data-driven (https://support.google.com/google-ads/answer/12216226).

**Enhanced conversions, in one paragraph:** when a lead submits the form, Google can accept a hashed (SHA-256) version of the email address alongside the conversion ping and match it to signed-in Google users — recovering conversions that cookie loss would otherwise drop. It's a checkbox on the conversion action ("Turn on enhanced conversions") plus passing `user_data` in the tag call. Note: starting June 2026 Google is merging enhanced conversions for web and for leads into a single on/off switch (https://support.google.com/google-ads/answer/15713840), so expect the UI to look simpler than older tutorials. Worth enabling once basic tracking is verified working — not before.

**Consent basics:** the site serves US traffic; there's no EU-style consent banner requirement today, but US state privacy laws (CPRA in California, plus Colorado, Virginia, Connecticut and more coming through 2026–27) are converging on notice-and-opt-out. Google's consent mode v2 carries four signals (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`); for EEA traffic it's mandatory, for US traffic it's currently good hygiene (https://developers.google.com/tag-platform/security/guides/consent). Practical position for now: keep the privacy policy current on `/legal`, disclose analytics/ads cookies there, and revisit a consent banner if EU traffic ever matters or if a state law squarely covers TPDM. Also note Google's June 15, 2026 consent-signal unification — accounts ignoring it see attribution gaps (https://www.uniconsent.com/blog/google-ads-consent-mode-change-2026).

---

## 8. Compliance notes

1. **Google's legal-services rules live under the misrepresentation and "legal requirements" policies** (https://support.google.com/adspolicy/answer/6008942, https://support.google.com/adspolicy/answer/6023676). The parts that bite here: no guaranteed outcomes ("Get $X for your claim" — never), no fabricated stats, no implying government/court endorsement, no implying prior contact with the searcher. Every dollar figure in an ad must be sourced and current (the $3,000 Bartz floor is court-noticed — fine, with a live citation on the landing page).
2. **Personalized-ads restrictions:** Google's personalized advertising policy treats personal hardships — including financial hardship and bankruptcy — as a sensitive category (https://support.google.com/adspolicy/answer/143465). Practical effect: **no remarketing lists built from `/crypto` or bankruptcy-page visitors.** Search ads on typed queries are fine; following claimants around the internet is not.
3. **Claim-purchasing sensitivities:** TPDM buys and brokers claims; it does not give legal advice. Ads and landing pages must never suggest the visitor *should* sell as a matter of legal judgment — frame it as a market option with a price. Keep "Not a law firm. Not legal advice." on every landing page (this is already a hard brand constraint). Avoid "advisor" and "broker-dealer" language entirely — TPDM is neither, and saying so loosely creates regulatory exposure.
4. **Settlement-adjacent advertising:** for Bartz, never imply affiliation with the court, the settlement administrator, the Authors Guild, or Anthropic. "Independent buyer of settlement claims" framing only. Class-action-adjacent ads draw policy review; expect occasional ad disapprovals and appeal with documentation.
5. **Crypto-adjacent review friction:** ads mentioning crypto sometimes trip Google's cryptocurrency policy filters even when the product (bankruptcy claims) isn't a crypto product. If disapprovals cite the crypto policy, appeal on the basis that the ads concern bankruptcy claims, not coins, exchanges, or wallets.
6. **Recommended footer disclaimer for all four landing pages:** "Turnpage Digital Markets LLC purchases and brokers legal claims. We are not a law firm, do not provide legal advice, and are not a registered broker-dealer or investment adviser. Any transaction is subject to diligence and definitive documentation."

---

## 9. Launch order, in one list

1. Wire conversion tracking and confirm a test lead registers in both GA4 and Ads (checklists doc).
2. Launch Campaign 1 (Crypto) + Campaign 2 (AI Copyright) at Probe tier.
3. Week 1–2: daily search-terms review, add negatives aggressively.
4. Week 4: pause keywords with >$50 spend and zero engaged visits; promote winners to exact match.
5. Week 6–8: decide on Build tier; add Bankruptcy and LitFin campaigns.
6. At ~30 conversions: switch to Maximize Conversions, enable enhanced conversions.
