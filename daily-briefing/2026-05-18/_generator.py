#!/usr/bin/env python3
"""Daily briefing generator — 2026-05-18 run.
Generates per-tab advisory.md + advisory-approval.html for all 7 tabs,
plus the consolidated dashboard.html and dashboard-latest.html.
"""
import os, json, html, datetime, pathlib, re

DATE = "2026-05-18"
DISPLAY_DATE = "Monday, May 18, 2026"
ROOT = "/sessions/sweet-trusting-edison/mnt/daily-briefing"
DATED = f"{ROOT}/{DATE}"

TABS = [
    {"slug": "01-tariffs-trade",            "dir_slug": "rewind-tariffs",             "name": "Tariffs / Trade",        "short": "Tariffs",    "emoji": "⚖️", "overview": "Capital and advisory for IEEPA tariff refund rights. CAPE refunds, the CIT and Federal Circuit dockets, Section 122, and consumer-class exposure on pass-through.", "voice": "trade-law-grade"},
    {"slug": "02-llm-copyright",            "dir_slug": "llm-class-action",           "name": "LLM / Copyright",        "short": "LLM",        "emoji": "🤖", "overview": "AI training-data class actions. Bartz v. Anthropic, the OpenAI MDL, Concord, Disney v. Midjourney — settlement mechanics and benchmark claims rates.", "voice": "litigation-grade"},
    {"slug": "03-crypto-insolvency",        "dir_slug": "crypto-insolvency",          "name": "Crypto Insolvency",      "short": "Crypto",     "emoji": "🪙", "overview": "Customer-property litigation and crypto bankruptcies. BlockFills, Genesis LOC, FTX progeny, and the cross-border Chapter 15 recognition track.", "voice": "restructuring-grade"},
    {"slug": "04-ponzi-fraud-recovery",     "dir_slug": "fraud-recovery",             "name": "Ponzi / Fraud Recovery",  "short": "Fraud",      "emoji": "🕵️", "overview": "Receivership clawbacks, SEC enforcement, and cross-border asset recovery. Goliath Ventures, Paramount/Prestige, and active receiver-led liquidation tracks.", "voice": "recovery-grade"},
    {"slug": "05-tech-mass-arbitration",    "dir_slug": "tech-mass-arbitration",      "name": "Tech Mass Arbitration",  "short": "Mass Arb",   "emoji": "⚙️", "overview": "B2B mass-arbitration campaigns against Big Tech defendants. The Google advertiser playbook, Meta waiver track, AAA/JAMS mechanics, foreign analogues.", "voice": "litigation-grade"},
    {"slug": "06-billion-dollar-class-actions","dir_slug": "billion-dollar-class-actions","name": "$1B+ Class Actions",    "short": "$1B+",       "emoji": "💰", "overview": "The mega-settlement cycle. BCBS Subscriber & Provider, Bartz v. Anthropic, Purdue/Sackler, Roundup, Visa/Mastercard interchange.", "voice": "litigation-grade"},
    {"slug": "07-bankruptcy-creditor-rights","dir_slug": "bankruptcy-creditor-rights","name": "Bankruptcy Creditor Rights","short": "Bankr",   "emoji": "📜", "overview": "Plan-confirmation appellate docket. Equitable-mootness drift, post-Purdue third-party releases, Texas Two-Step, exculpation scope, and Subchapter V.", "voice": "restructuring-grade"},
]

# ---------------- PER-TAB CONTENT ----------------
CONTENT = {}

CONTENT["01-tariffs-trade"] = {
    "urgency": "high",
    "lead_headline": "Federal Circuit Section 122 briefing closes May 22; CAPE refund pool holds at $35.46B as DOJ June 7 deadline approaches.",
    "lead_html": """<p>The IEEPA refund track and the Section 122 stay both remain mid-stride as the work week opens. CBP's most recent CAPE progress report confirms <a href="https://www.gtlaw.com/en/insights/2026/5/us-tariff-update-section-122-duties-found-unauthorized-by-law-ieepa-refunds-under-way" target="_blank" rel="noopener">8,338,081 entries liquidated or reliquidated without IEEPA duties</a>, against an anticipated refund and interest pool of approximately $35.46 billion, while the Federal Circuit's <a href="https://www.buchalter.com/insights/one-small-step-for-importers-federal-circuit-clears-the-way-for-ieepa-tariff-refund-litigation-to-resume/" target="_blank" rel="noopener">May 12 temporary administrative stay</a> of the CIT's May 7 Section 122 decision continues to hold. Plaintiffs' response on the stay motion is due Tuesday, May 19; DOJ's reply closes the briefing window on Friday, May 22. The June 7 DOJ appeal deadline on the scope of Judge Eaton's reissued refund order — now five business days closer — remains the central calendar peg for refund-finality modeling.</p>""",
    "advisory_md": """## I. CAPE Refund Track — $35.46B Pool, Phase-1 Coverage at 82%

CBP's controlling operational snapshot continues to be the second progress report to the Court of International Trade, which confirmed 8,338,081 entries liquidated or reliquidated without IEEPA duties against an anticipated refund-and-interest pool of approximately $35.46 billion. The CAPE module is capturing roughly 82% of IEEPA entries; the remaining 18% — entries with non-standard liquidation postures, suspended-entry status, or compliance flags — continues to be routed to manual processing. The 1,880 stalled consolidated refunds previously flagged for missing ACH information remained outstanding heading into the weekend, and Sandler, Travis & Rosenberg has reiterated that importers should not rely on CAPE alone: protest filings under 19 U.S.C. §1514 remain the durable preservation mechanism, particularly for entries that have not yet liquidated.

## II. Section 122 — Federal Circuit Briefing Closes May 22

The Federal Circuit's May 12 temporary administrative stay of the CIT's May 7 ruling continues to keep the 10% Section 122 global tariff in force for all importers. The expedited briefing schedule — plaintiffs' response due May 19, DOJ reply due May 22 — closes this week, after which a substantive stay order is expected on a compressed timeline. The CIT's underlying May 7 decision held by 2–1 that the statutory predicate of a "large and serious United States balance-of-payments deficit" was not satisfied; relief was named-plaintiff-limited (Burlap & Barrel, Basic Fun, State of Washington). Regardless of the appeal outcome, the Section 122 surcharge expires by operation of statute on July 24, 2026 under the Trade Act's 150-day limit absent affirmative congressional extension.

## III. DOJ Appeal Window — June 7 Pivot

With the reissuance of Judge Eaton's refund order on March 4, the 60-day DOJ appeal window has been reset to approximately June 7. As of May 18, no notice of appeal, motion for extension, or public administration signaling has surfaced. The lengthening silence is itself a market-moving fact: trade-law commentators are increasingly modeling a non-appeal scenario, in which the refund architecture stabilizes through the summer with the only residual litigation risk centered on the small subset of high-compliance-flag entries. Refund-recovery counsel should treat June 7 as the operative pivot — a missed appeal date converts the refund obligation from contingent to settled.

## IV. Consumer Pass-Through and State AG Pressure

The coalition letter from eight state comptrollers and treasurers demanding disclosure of IEEPA refund applications and protections for consumers who bore the pass-through continues to generate downstream activity. Plaintiffs' firms are filing putative nationwide actions under unjust-enrichment, contract, and state consumer-protection theories. The discovery posture in the early class-action filings is being built around whether companies retained the IEEPA-tariff surcharge in their pricing after the refund became foreseeable. Refund-recipient companies should be working through their pricing documentation now.

## V. Section 301 Hearing Cycle and Onshoring Pipeline

USTR's 76 Section 301 investigations launched May 5 continue through their public-hearing cycle. Findings will roll out as proposed new targeted tariffs through the summer. Separately, Commerce released applications for onshoring agreements that allow domestic producers to reduce Section 232 exposure in exchange for U.S.-based capacity-expansion commitments — a meaningful new lever for companies in steel, aluminum, semiconductors, and critical minerals.

## Recommended Actions

Importers with IEEPA exposure should verify ACH registration on the CBP electronic refund portal to clear stalled consolidated refunds, continue filing §1514 protests in parallel with CAPE declarations, and treat the June 7 DOJ deadline as the operative pivot for refund-finality modeling. Section 122-exposed importers should continue paying the 10% duty during the Federal Circuit stay and file their own CIT actions before the Federal Circuit decides the stay question, since the May 7 ruling was expressly named-plaintiff limited. Companies that passed IEEPA tariffs to customers should document their pricing rationale and consider voluntary-disclosure strategies before consumer class-action discovery posture hardens.
""",
    "advisory_html": """<h3>I. CAPE Refund Track — $35.46B Pool, Phase-1 Coverage at 82%</h3>
<p>CBP's controlling operational snapshot continues to be the second progress report to the Court of International Trade, which confirmed <a href="https://www.gtlaw.com/en/insights/2026/5/us-tariff-update-section-122-duties-found-unauthorized-by-law-ieepa-refunds-under-way" target="_blank" rel="noopener">8,338,081 entries liquidated or reliquidated without IEEPA duties</a> against an anticipated refund-and-interest pool of approximately $35.46 billion. The CAPE module is capturing roughly 82% of IEEPA entries; the remaining 18% — entries with non-standard liquidation postures, suspended-entry status, or compliance flags — continues to be routed to manual processing. The 1,880 stalled consolidated refunds previously flagged for missing ACH information remained outstanding heading into the weekend, and Sandler, Travis & Rosenberg has reiterated that importers should not rely on CAPE alone: protest filings under 19 U.S.C. §1514 remain the durable preservation mechanism, particularly for entries that have not yet liquidated.</p>

<h3>II. Section 122 — Federal Circuit Briefing Closes May 22</h3>
<p>The Federal Circuit's <a href="https://www.buchalter.com/insights/one-small-step-for-importers-federal-circuit-clears-the-way-for-ieepa-tariff-refund-litigation-to-resume/" target="_blank" rel="noopener">May 12 temporary administrative stay</a> of the CIT's May 7 ruling continues to keep the 10% Section 122 global tariff in force for all importers. The expedited briefing schedule — plaintiffs' response due May 19, DOJ reply due May 22 — closes this week, after which a substantive stay order is expected on a compressed timeline. The CIT's underlying May 7 decision held by 2–1 that the statutory predicate of a "large and serious United States balance-of-payments deficit" was not satisfied; relief was named-plaintiff-limited (Burlap & Barrel, Basic Fun, State of Washington). Regardless of the appeal outcome, the Section 122 surcharge expires by operation of statute on July 24, 2026 under the Trade Act's 150-day limit absent affirmative congressional extension.</p>

<h3>III. DOJ Appeal Window — June 7 Pivot</h3>
<p>With the reissuance of Judge Eaton's refund order on March 4, the 60-day DOJ appeal window has been reset to approximately June 7. As of May 18, no notice of appeal, motion for extension, or public administration signaling has surfaced. The lengthening silence is itself a market-moving fact: trade-law commentators are increasingly modeling a non-appeal scenario, in which the refund architecture stabilizes through the summer with the only residual litigation risk centered on the small subset of high-compliance-flag entries. <a href="https://www.flexport.com/blog/the-cits-section-122-tariff-ruling-key-takeaways-refund-outlook-and-next-steps-for-importers/" target="_blank" rel="noopener">Refund-recovery counsel should treat June 7 as the operative pivot</a> — a missed appeal date converts the refund obligation from contingent to settled.</p>

<h3>IV. Consumer Pass-Through and State AG Pressure</h3>
<p>The coalition letter from eight state comptrollers and treasurers demanding disclosure of IEEPA refund applications and protections for consumers who bore the pass-through continues to generate downstream activity. Plaintiffs' firms are filing putative nationwide actions under unjust-enrichment, contract, and state consumer-protection theories. The discovery posture in the early class-action filings is being built around whether companies retained the IEEPA-tariff surcharge in their pricing after the refund became foreseeable. Refund-recipient companies should be working through their pricing documentation now.</p>

<h3>V. Section 301 Hearing Cycle and Onshoring Pipeline</h3>
<p>USTR's 76 Section 301 investigations launched May 5 continue through their public-hearing cycle. Findings will roll out as proposed new targeted tariffs through the summer. Separately, Commerce released applications for onshoring agreements that allow domestic producers to reduce Section 232 exposure in exchange for U.S.-based capacity-expansion commitments — a meaningful new lever for companies in steel, aluminum, semiconductors, and critical minerals.</p>

<h3>Recommended Actions</h3>
<p>Importers with IEEPA exposure should verify ACH registration on the CBP electronic refund portal to clear stalled consolidated refunds, continue filing §1514 protests in parallel with CAPE declarations, and treat the June 7 DOJ deadline as the operative pivot for refund-finality modeling. Section 122-exposed importers should continue paying the 10% duty during the Federal Circuit stay and file their own CIT actions before the Federal Circuit decides the stay question, since the May 7 ruling was expressly named-plaintiff limited. Companies that passed IEEPA tariffs to customers should document their pricing rationale and consider voluntary-disclosure strategies before consumer class-action discovery posture hardens.</p>""",
    "linkedin_post": """The Section 122 briefing window closes Friday. Plaintiffs' response is due Tuesday, May 19; DOJ's reply Friday, May 22. After that, the Federal Circuit decides the stay on a compressed timeline.

While the appellate fight runs, three numbers are sitting on importers' desks:

1. $35.46B — the CAPE phase-1 refund and interest pool. Phase 1 is now covering ~82% of IEEPA entries; the remaining 18% gets manual processing.

2. 1,880 — stalled consolidated refunds still missing ACH registration. That's tens of millions of dollars sitting on a missing-form problem.

3. June 7 — the operative DOJ appeal deadline on the scope of Judge Eaton's reissued refund order. Eleven business days out and no government filing.

What the trade bar is converging on this week: file §1514 protests in parallel with your CAPE declaration; if you're Section 122-exposed and not yet a named plaintiff, file your own CIT action before the Federal Circuit decides; if you passed the tariff to your customers, document your pricing rationale now before the consumer class-action discovery posture hardens.

A missed June 7 appeal converts the refund obligation from contingent to settled. The longer the silence runs, the more the market should be pricing in stability.

#IEEPA #Tariffs #Section122 #CBP #CIT #Trade""",
    "key_dates": [
        ("imminent", "May 19, 2026", "Plaintiffs' response brief due, Federal Circuit Section 122 stay appeal"),
        ("imminent", "May 22, 2026", "DOJ reply brief due, Federal Circuit Section 122 stay appeal"),
        ("upcoming", "May 26, 2026", "CBP next CAPE progress report to CIT"),
        ("upcoming", "June 7, 2026", "DOJ appeal deadline on CIT refund order (reset from May 6)"),
        ("watch",    "July 24, 2026", "Section 122 150-day statutory expiration"),
    ],
    "articles": [
        ("US Tariff Update: Section 122 Duties Found Unauthorized by Law; IEEPA Refunds Under Way",
         "https://www.gtlaw.com/en/insights/2026/5/us-tariff-update-section-122-duties-found-unauthorized-by-law-ieepa-refunds-under-way",
         "Greenberg Traurig (Tier 3) · May 17, 2026",
         "Confirms 8.33M entries liquidated under CAPE phase 1 (~82% coverage); Section 122 next-steps protocol; stalled-ACH cohort still outstanding."),
        ("One Small Step for Importers: Federal Circuit Clears the Way for IEEPA Tariff Refund Litigation to Resume",
         "https://www.buchalter.com/insights/one-small-step-for-importers-federal-circuit-clears-the-way-for-ieepa-tariff-refund-litigation-to-resume/",
         "Buchalter (Tier 3) · May 17, 2026",
         "Mandate-transfer mechanics + CIT March 4 reissuance walkthrough; confirms June 7 reset on DOJ scope-of-order appeal deadline."),
        ("Section 122 Tariffs Ruled Unlawful",
         "https://perkinscoie.com/insights/update/section-122-tariffs-ruled-unlawful",
         "Perkins Coie (Tier 3) · May 17, 2026",
         "CIT 2-1 holding on balance-of-payments-deficit predicate; named-plaintiff-only relief; expedited Federal Circuit briefing through May 22."),
    ],
    "site_updates": True,
    "stats": {"new_articles_count": 3, "total_archive_count": 43},
}

CONTENT["02-llm-copyright"] = {
    "urgency": "high",
    "lead_headline": "Bartz v. Anthropic fairness hearing May 14 closed the record; final approval order watch opens through Memorial Day weekend.",
    "lead_html": """<p>The Bartz v. Anthropic fairness hearing held May 14 closed the record on what would be the largest copyright class settlement in U.S. history, with <a href="https://legalblogs.wolterskluwer.com/copyright-blog/the-bartz-v-anthropic-settlement-understanding-americas-largest-copyright-settlement/" target="_blank" rel="noopener">Anthropic's $1.5 billion settlement fund</a> now awaiting Judge Alsup's final-approval order on a customary 7–21 day timeline. Author-side claims activity through the close of the bar date set the rate at roughly 91.3% of identified class members — a figure that effectively forecloses any meaningful adequacy-of-notice objection on appeal. With the fairness hearing behind it, the docket pivots to the fee petition under Rule 23(h) and the parallel Kadrey v. Meta liability track on the seeding theory, where Meta executive depositions are scheduled through June.</p>""",
    "advisory_md": """## I. Bartz v. Anthropic — Final Approval Order Watch

The May 14 fairness hearing on the proposed $1.5 billion settlement closed the record before Judge William Alsup. Authors Guild and Authors Alliance objections were briefed and argued. The customary post-hearing window for a final-approval order is 7–21 days, putting the order in a Memorial Day to early-June window. The 91.3% claims rate among identified class members is itself a procedural defense — class-action adequacy-of-notice objections on appeal turn on whether the notice plan reached and produced response from class members, and a 91%+ rate makes that objection essentially unwinnable.

The settlement structure — pooled fund with author-by-author allocation based on book counts in the Anthropic training corpus — sets the benchmark settlement structure for the rest of the AI training-data class action docket. Banner Witcoff and Norton Rose Fulbright have both flagged the per-book pricing implicit in the settlement (roughly $3,000 per book at the high end of the claimed pool) as the operative comparator for OpenAI MDL, Concord, and the Disney v. Midjourney negotiating posture.

## II. Kadrey v. Meta — Seeding Theory Discovery Through June

The Kadrey v. Meta docket continues to move on the seeding theory after Judge Chhabria's earlier denial of summary judgment on the LibGen/PiLiMi piracy issue. Meta executive depositions, including the deposition of Mark Zuckerberg, are scheduled through June on the question of corporate knowledge that 267 TB of pirated material was being acquired and used. The seeding theory — that downloading and storing copyrighted material from shadow libraries is independently actionable separate from the fair-use defense applicable to the training itself — survived the Bartz settlement and remains the most viable plaintiff-side theory in cases where the training-corpus formation involved torrenting.

## III. Thomson Reuters v. ROSS — Third Circuit Q3 2026 Argument

The Third Circuit has scheduled oral argument on Thomson Reuters v. ROSS (No. 25-2153) for Q3 2026. The case is the first appellate AI fair-use argument and will produce the first published Circuit decision applying the four-factor fair-use test to AI training. The lower-court rulings split: the district court initially granted ROSS partial summary judgment on fair use, then reversed and held that ROSS's use was not transformative because ROSS built a competing legal-research tool from Westlaw headnotes. The Third Circuit's framing of "transformativeness" against substitutionary use will set the standard for the rest of the docket.

## IV. AI Copyright Legislation — TRAIN, NO FAKES, CLEAR

Committee activity on the TRAIN Act (training data transparency), NO FAKES Act (digital replica rights), and CLEAR Act (AI content labeling) has accelerated through May, with markup activity in House Judiciary and Senate Commerce. The TRUMP AMERICA AI Act, introduced as a competing framework that would preempt state AI laws and limit class-action remedies for AI training, has not yet had a markup vote but is being read as the administration's preferred posture.

## Recommended Actions

AI-developer GCs should monitor for the Bartz final-approval order through Memorial Day and prepare distribution communications to identified authors. Publisher and rightsholder counsel should treat the Bartz per-book pricing as the operative settlement comparator. Music-publishing counsel watching Concord/UMG v. Anthropic should expect renewed settlement signaling now that the Bartz benchmark is set. Plaintiff-side firms in AI training-data cases should align discovery on the seeding theory where shadow-library acquisition is alleged, since the fair-use defense does not reach the seeding question post-Bartz.
""",
    "advisory_html": """<h3>I. Bartz v. Anthropic — Final Approval Order Watch</h3>
<p>The May 14 fairness hearing on the proposed <a href="https://legalblogs.wolterskluwer.com/copyright-blog/the-bartz-v-anthropic-settlement-understanding-americas-largest-copyright-settlement/" target="_blank" rel="noopener">$1.5 billion settlement</a> closed the record before Judge William Alsup. Authors Guild and Authors Alliance objections were briefed and argued. The customary post-hearing window for a final-approval order is 7–21 days, putting the order in a Memorial Day to early-June window. The 91.3% claims rate among identified class members is itself a procedural defense — class-action adequacy-of-notice objections on appeal turn on whether the notice plan reached and produced response from class members, and a 91%+ rate makes that objection essentially unwinnable.</p>
<p>The settlement structure — pooled fund with author-by-author allocation based on book counts in the Anthropic training corpus — sets the benchmark settlement structure for the rest of the AI training-data class action docket. Banner Witcoff and Norton Rose Fulbright have both flagged the per-book pricing implicit in the settlement (roughly $3,000 per book at the high end of the claimed pool) as the operative comparator for OpenAI MDL, Concord, and the Disney v. Midjourney negotiating posture.</p>

<h3>II. Kadrey v. Meta — Seeding Theory Discovery Through June</h3>
<p>The Kadrey v. Meta docket continues to move on the seeding theory after Judge Chhabria's earlier denial of summary judgment on the LibGen/PiLiMi piracy issue. <a href="https://authorsguild.org/advocacy/artificial-intelligence/what-authors-need-to-know-about-the-anthropic-settlement/" target="_blank" rel="noopener">Meta executive depositions</a>, including the deposition of Mark Zuckerberg, are scheduled through June on the question of corporate knowledge that 267 TB of pirated material was being acquired and used. The seeding theory — that downloading and storing copyrighted material from shadow libraries is independently actionable separate from the fair-use defense applicable to the training itself — survived the Bartz settlement and remains the most viable plaintiff-side theory in cases where the training-corpus formation involved torrenting.</p>

<h3>III. Thomson Reuters v. ROSS — Third Circuit Q3 2026 Argument</h3>
<p>The Third Circuit has scheduled oral argument on <a href="https://publicknowledge.org/courts-agree-ai-training-ruled-as-fair-use-in-bartz-v-anthropic-and-kadrey-v-meta/" target="_blank" rel="noopener">Thomson Reuters v. ROSS</a> (No. 25-2153) for Q3 2026. The case is the first appellate AI fair-use argument and will produce the first published Circuit decision applying the four-factor fair-use test to AI training. The lower-court rulings split: the district court initially granted ROSS partial summary judgment on fair use, then reversed and held that ROSS's use was not transformative because ROSS built a competing legal-research tool from Westlaw headnotes. The Third Circuit's framing of "transformativeness" against substitutionary use will set the standard for the rest of the docket.</p>

<h3>IV. AI Copyright Legislation — TRAIN, NO FAKES, CLEAR</h3>
<p>Committee activity on the TRAIN Act (training data transparency), NO FAKES Act (digital replica rights), and CLEAR Act (AI content labeling) has accelerated through May, with markup activity in House Judiciary and Senate Commerce. The TRUMP AMERICA AI Act, introduced as a competing framework that would preempt state AI laws and limit class-action remedies for AI training, has not yet had a markup vote but is being read as the administration's preferred posture.</p>

<h3>Recommended Actions</h3>
<p>AI-developer GCs should monitor for the Bartz final-approval order through Memorial Day and prepare distribution communications to identified authors. Publisher and rightsholder counsel should treat the Bartz per-book pricing as the operative settlement comparator. Music-publishing counsel watching Concord/UMG v. Anthropic should expect renewed settlement signaling now that the Bartz benchmark is set. Plaintiff-side firms in AI training-data cases should align discovery on the seeding theory where shadow-library acquisition is alleged, since the fair-use defense does not reach the seeding question post-Bartz.</p>""",
    "linkedin_post": """Bartz v. Anthropic — the May 14 fairness hearing closed the record on what would be the largest copyright class settlement in U.S. history. Final approval order watch opens this week.

Three numbers from the back end of the docket:

1. $1.5 billion — Anthropic's settlement fund.

2. 91.3% — claims rate among identified class members. That number is itself a procedural defense. Adequacy-of-notice objections on appeal turn on whether the notice plan reached class members and produced response. A 91%+ rate makes that objection essentially unwinnable.

3. ~$3,000 per book — the implicit per-work price at the high end of the claimed pool. That's now the benchmark settlement comparator for the OpenAI MDL, Concord/UMG, and the Disney v. Midjourney negotiating posture.

What to watch through Memorial Day:

— Judge Alsup's final-approval order (customary 7–21 days post-hearing).
— Kadrey v. Meta seeding-theory depositions, including Zuckerberg, scheduled through June.
— Thomson Reuters v. ROSS argument at the Third Circuit in Q3 — the first appellate AI fair-use decision.

The fair-use defense doesn't reach the seeding question post-Bartz. Where training-corpus formation involved torrenting, the seeding theory survives. That's the doctrine to watch as Bartz closes out and the next bellwether opens.

#AICopyright #Bartz #Anthropic #FairUse #ClassAction""",
    "key_dates": [
        ("imminent", "May 22, 2026", "Bartz v. Anthropic final approval order — earliest customary window"),
        ("upcoming", "June 5, 2026", "Bartz final approval order — latest customary window (21d post-hearing)"),
        ("upcoming", "June 15, 2026", "Kadrey v. Meta — executive depositions complete (Zuckerberg deposition window)"),
        ("watch",    "July 15, 2026", "Concord/UMG/ABKCO v. Anthropic cross-MSJ hearing"),
        ("watch",    "Q3 2026",       "Thomson Reuters v. ROSS — 3d Cir. oral argument (No. 25-2153)"),
    ],
    "articles": [
        ("The Bartz v. Anthropic Settlement: Understanding America's Largest Copyright Settlement",
         "https://legalblogs.wolterskluwer.com/copyright-blog/the-bartz-v-anthropic-settlement-understanding-americas-largest-copyright-settlement/",
         "Kluwer Copyright Blog (Tier 3) · May 16, 2026",
         "Post-fairness-hearing analysis of $1.5B fund mechanics, per-book allocation math, and benchmark comparators for downstream AI cases."),
        ("Bartz v. Anthropic Settlement: What Authors Need to Know",
         "https://authorsguild.org/advocacy/artificial-intelligence/what-authors-need-to-know-about-the-anthropic-settlement/",
         "Authors Guild (Tier 3) · May 17, 2026",
         "Authors-side post-fairness-hearing summary; confirms 91.3% claims rate and outlines distribution timeline post-final-approval."),
        ("What's at Stake — and What Isn't — as Bartz v. Anthropic Settlement Heads Toward Approval",
         "https://www.wordsandmoney.com/whats-at-stake-and-what-isnt-as-bartz-v-anthropic-settlement-heads-toward-approval/",
         "Words and Money (Tier 3) · May 17, 2026",
         "Independent analysis of objection record from fairness hearing; benchmark per-book pricing for downstream AI training cases."),
        ("Courts Agree: AI Training Ruled As Fair Use in Bartz v. Anthropic and Kadrey v. Meta",
         "https://publicknowledge.org/courts-agree-ai-training-ruled-as-fair-use-in-bartz-v-anthropic-and-kadrey-v-meta/",
         "Public Knowledge (Tier 3) · May 16, 2026",
         "Comparative analysis of Alsup and Chhabria fair-use rulings; flags Kadrey seeding theory as surviving the fair-use defense."),
    ],
    "site_updates": True,
    "stats": {"new_articles_count": 4, "total_archive_count": 67},
}

CONTENT["03-crypto-insolvency"] = {
    "urgency": "normal",
    "lead_headline": "BlockFills Chapter 11 customer-led plan in early-stage motion practice; Dominion adversary anchors the customer-property fight.",
    "lead_html": """<p>The BlockFills Chapter 11 (Bankr. D. Del., filed March 15, 2026) remains the active crypto-insolvency matter as the case moves through early-stage cash collateral, KEIP, and 341 motion practice. The <a href="https://www.theblock.co/post/393644/blockfills-chapter-11-bankruptcy" target="_blank" rel="noopener">customer-led reorganization framework</a> contemplated by the debtor positions customer claimants as the senior plan constituency, but the <a href="https://bondoro.com/blockfills/" target="_blank" rel="noopener">Dominion Capital adversary proceeding</a> alleging misappropriation of approximately 70.6 BTC remains the central customer-property fight. No published Chapter 15 recognition decisions or major in-kind distribution rulings issued in the 48-hour window.</p>""",
    "advisory_md": """## I. BlockFills — Customer-Led Plan Architecture, Dominion Adversary Open

BlockFills (Bankr. D. Del., 26-XXXXX) continues through early-stage motion practice following the March 15 Chapter 11 filing. The customer-led plan architecture contemplated by the debtor — which would treat customer claimants as a senior, conflicted-counsel-supervised constituency — is being framed in early hearings against the prior crypto-debtor precedent (Celsius, FTX, Genesis). The Dominion Capital adversary proceeding remains the central commingling fight: Dominion alleges misappropriation of approximately 70.6 BTC (~$4.8M at the time of the freeze order) and is seeking turnover under § 542 and constructive trust under state law principles, while the debtor frames the assets as estate property subject to the customer-property allocation framework.

Cleary Gottlieb's "Novel Issues in the Crypto Bankruptcy Cluster" analysis remains the controlling industry-commentary baseline on customer-property characterization. The case will turn on the same issue that drove Celsius and FTX: whether the debtor's terms of service create an Article 9 secured-creditor / bailment / agency relationship versus a debtor-creditor relationship. The Steptoe valuation precedent on crypto claim valuation continues to anchor the in-kind-vs-fiat distribution debate.

## II. Legacy Cases — Genesis, FTX, Celsius Distribution Mechanics

No major in-kind distribution rulings issued in the 48-hour window. The Genesis liquidation plan continues to wind through customer distributions; FTX wave-2 distributions to retail creditors remain on the announced schedule; Celsius continues to litigate the Stretto/Earn-Cohort residual claims.

## III. Stablecoin and DeFi Insolvency Watchlist

No new stablecoin issuer distress filings in the window. The DeFi-as-debtor question (Tornado Cash precedent, DAO governance under bankruptcy law) remains theoretical pending a real filing on a Curve-style protocol.

## Recommended Actions

Distressed-debt buyers and claims-trading firms should continue to watch BlockFills schedules, statements of financial affairs, and the Dominion adversary docket for customer-property characterization signals. Crypto-creditor committees should prepare for an extended customer-property fight before plan confirmation. Restructuring counsel should treat the Cleary "Novel Issues" framework as the controlling industry guide. Counsel for crypto-debtor counterparties should run a Curve-style risk assessment now on any platform with commingled customer-asset architecture.
""",
    "advisory_html": """<h3>I. BlockFills — Customer-Led Plan Architecture, Dominion Adversary Open</h3>
<p>BlockFills (Bankr. D. Del., 26-XXXXX) continues through early-stage motion practice following the <a href="https://www.theblock.co/post/393644/blockfills-chapter-11-bankruptcy" target="_blank" rel="noopener">March 15 Chapter 11 filing</a>. The customer-led plan architecture contemplated by the debtor — which would treat customer claimants as a senior, conflicted-counsel-supervised constituency — is being framed in early hearings against the prior crypto-debtor precedent (Celsius, FTX, Genesis). The Dominion Capital adversary proceeding remains the central commingling fight: <a href="https://bondoro.com/blockfills/" target="_blank" rel="noopener">Dominion alleges misappropriation of approximately 70.6 BTC</a> (~$4.8M at the time of the freeze order) and is seeking turnover under § 542 and constructive trust under state law principles, while the debtor frames the assets as estate property subject to the customer-property allocation framework.</p>
<p><a href="https://content.clearygottlieb.com/corporate/global-restructuring-insights/novel-issues-in-the-crypto-bankruptcy-cluster/index.html" target="_blank" rel="noopener">Cleary Gottlieb's "Novel Issues in the Crypto Bankruptcy Cluster" analysis</a> remains the controlling industry-commentary baseline on customer-property characterization. The case will turn on the same issue that drove Celsius and FTX: whether the debtor's terms of service create an Article 9 secured-creditor / bailment / agency relationship versus a debtor-creditor relationship. The Steptoe valuation precedent on crypto claim valuation continues to anchor the in-kind-vs-fiat distribution debate.</p>

<h3>II. Legacy Cases — Genesis, FTX, Celsius Distribution Mechanics</h3>
<p>No major in-kind distribution rulings issued in the 48-hour window. The Genesis liquidation plan continues to wind through customer distributions; FTX wave-2 distributions to retail creditors remain on the announced schedule; Celsius continues to litigate the Stretto/Earn-Cohort residual claims.</p>

<h3>III. Stablecoin and DeFi Insolvency Watchlist</h3>
<p>No new stablecoin issuer distress filings in the window. The DeFi-as-debtor question (Tornado Cash precedent, DAO governance under bankruptcy law) remains theoretical pending a real filing on a Curve-style protocol.</p>

<h3>Recommended Actions</h3>
<p>Distressed-debt buyers and claims-trading firms should continue to watch BlockFills schedules, statements of financial affairs, and the Dominion adversary docket for customer-property characterization signals. Crypto-creditor committees should prepare for an extended customer-property fight before plan confirmation. Restructuring counsel should treat the Cleary "Novel Issues" framework as the controlling industry guide. Counsel for crypto-debtor counterparties should run a Curve-style risk assessment now on any platform with commingled customer-asset architecture.</p>""",
    "linkedin_post": """The crypto-insolvency thesis that emerged after FTX is being tested again — quietly — in the BlockFills Chapter 11 in Delaware.

The customer-property fight is the case. Dominion Capital is alleging misappropriation of ~70.6 BTC and seeking turnover under § 542 and a constructive trust under state law. The debtor frames the same assets as estate property subject to the customer-allocation framework.

That is the same Article 9 / bailment / agency vs. debtor-creditor question that drove Celsius and FTX. The terms of service usually decide it. Counsel evaluating any crypto-debtor counterparty should be reading those TOS now — not after a filing.

Three threads to watch as BlockFills moves toward plan confirmation:

— The Dominion adversary as the customer-property bellwether.
— The customer-led plan architecture (whether claimant-driven governance survives early motion practice).
— Steptoe valuation precedent on crypto claim valuation as the in-kind-vs-fiat distribution debate gets active.

The Cleary "Novel Issues in the Crypto Bankruptcy Cluster" framework continues to be the operative industry baseline. The next stablecoin or DeFi failure will run through the same doctrinal channels.

Read your counterparties' TOS now.

#Crypto #Bankruptcy #Chapter11 #BlockFills #CustomerProperty #CreditorRights""",
    "key_dates": [
        ("upcoming", "May 28, 2026", "BlockFills — second-day motions hearing (cash collateral, KEIP)"),
        ("watch",    "June 12, 2026", "BlockFills 341 meeting of creditors (estimated)"),
        ("watch",    "June 30, 2026", "Genesis plan-implementation period — quarterly distribution checkpoint"),
        ("watch",    "Q3 2026",       "FTX wave-2 retail distribution window"),
    ],
    "articles": [
        ("Case Summary: BlockFills Chapter 11",
         "https://bondoro.com/blockfills/",
         "Bondoro (Tier 3) · May 17, 2026",
         "Operational summary of Dominion Capital adversary, 70.6 BTC freeze order, and customer-led plan framework as filed."),
    ],
    "site_updates": False,
    "stats": {"new_articles_count": 1, "total_archive_count": 18},
}

CONTENT["04-ponzi-fraud-recovery"] = {
    "urgency": "quiet",
    "lead_headline": "No qualifying SEC or receiver actions in the 48-hour window; Paramount/Prestige and Goliath Ventures recovery tracks proceeding on calendar.",
    "lead_html": """<p>No new SEC enforcement complaints with asset freezes, federal receiver appointments, major clawback rulings, or cross-border recognition decisions issued in the 48-hour scan window. The two active major receivership recovery tracks — Paramount Management Group / Prestige Investment Group (Heller, ~$400M, ~2,700 investors) and Goliath Ventures (M.D. Fla., ~$328M crypto Ponzi) — continue to proceed on calendar without new public rulings. Q1 2026 enforcement activity, including the Marco Santarelli-related private litigation wave following the October 2025 SEC action, continues to develop in district courts across at least ten states.</p>""",
    "advisory_md": """## I. Active Receiverships — Paramount/Prestige, Goliath Ventures

The Paramount Management Group / Prestige Investment Group receivership (Heller defendants, approximately $400M in losses, approximately 2,700 investors) and the Goliath Ventures receivership (M.D. Fla., approximately $328M crypto Ponzi) remain the two largest active receivership recovery tracks. No major rulings in either matter in the 48-hour window. Both receivers continue to work asset-tracing through standard channels: domestic banking records, securities-account discovery, and offshore-exchange production demands where crypto assets are at issue.

The Norton Rose Fulbright "even the winners lose" framing of clawback exposure under fraudulent-conveyance statutes (actual fraud vs. constructive fraud under the Ponzi-scheme presumption) continues to define defense-side strategy for net-winner investors. The Sonn Law Group / Carolina Nunez Law plaintiff-side recovery practice is increasingly active on tracing-and-recovery against secondary defendants (CPAs, custodians, broker-dealers who failed to detect red flags).

## II. SEC Enforcement Posture — Q1 2026 Trends

SEC enforcement under Chairman Atkins continues to focus on outright fraud and investor harm in Ponzi-like schemes, with a narrower agenda than the prior administration. Just $262 million was returned to harmed investors in FY 2025 — a number that the receivership bar reads as a structural ceiling on government-recovery effectiveness and a tailwind for private receiver-led recovery vehicles.

The private litigation wave following the October 2025 SEC enforcement action against Marco Santarelli continues to develop in district courts across at least ten states. Investor groups are filing follow-on civil complaints under federal securities-fraud and state Blue Sky-act theories, often in parallel with the federal receivership track.

## III. Cross-Border Asset Tracing Watchlist

No new Section 1782 cross-border discovery rulings of note in the window. Venezuela / Caribbean asset-tracing friction continues to be the operational bottleneck on the largest crypto-Ponzi recovery tracks. USDT/USDC tracing through offshore exchanges remains the standard recovery methodology.

## Recommended Actions

Federal receivers should continue working through Section 1782 applications and MLAT requests for offshore-asset tracing. Recovery-fund managers should pressure-test their distribution waterfall assumptions against the Norton Rose "even the winners lose" framework. Defense counsel for net-winner investors should preserve good-faith-receipt defenses early in the receiver's claims process. Counsel advising secondary-defendant institutions (CPAs, custodians, broker-dealers) should run red-flag-detection assessments on any client showing Madoff-pattern operational signals.
""",
    "advisory_html": """<h3>I. Active Receiverships — Paramount/Prestige, Goliath Ventures</h3>
<p>The Paramount Management Group / Prestige Investment Group receivership (Heller defendants, approximately $400M in losses, approximately 2,700 investors) and the Goliath Ventures receivership (M.D. Fla., approximately $328M crypto Ponzi) remain the two largest active receivership recovery tracks. No major rulings in either matter in the 48-hour window. Both receivers continue to work asset-tracing through standard channels: domestic banking records, securities-account discovery, and offshore-exchange production demands where crypto assets are at issue.</p>
<p>The Norton Rose Fulbright "even the winners lose" framing of clawback exposure under fraudulent-conveyance statutes (actual fraud vs. constructive fraud under the Ponzi-scheme presumption) continues to define defense-side strategy for net-winner investors. The Sonn Law Group / Carolina Nunez Law plaintiff-side recovery practice is increasingly active on tracing-and-recovery against secondary defendants (CPAs, custodians, broker-dealers who failed to detect red flags).</p>

<h3>II. SEC Enforcement Posture — Q1 2026 Trends</h3>
<p><a href="https://www.ponziblog.com/2026/04/q1-2026-roundup/" target="_blank" rel="noopener">SEC enforcement under Chairman Atkins</a> continues to focus on outright fraud and investor harm in Ponzi-like schemes, with a narrower agenda than the prior administration. Just $262 million was returned to harmed investors in FY 2025 — a number that the receivership bar reads as a structural ceiling on government-recovery effectiveness and a tailwind for private receiver-led recovery vehicles.</p>
<p>The private litigation wave following the October 2025 SEC enforcement action against Marco Santarelli continues to develop in district courts across at least ten states. Investor groups are filing follow-on civil complaints under federal securities-fraud and state Blue Sky-act theories, often in parallel with the federal receivership track.</p>

<h3>III. Cross-Border Asset Tracing Watchlist</h3>
<p>No new Section 1782 cross-border discovery rulings of note in the window. Venezuela / Caribbean asset-tracing friction continues to be the operational bottleneck on the largest crypto-Ponzi recovery tracks. USDT/USDC tracing through offshore exchanges remains the standard recovery methodology.</p>

<h3>Recommended Actions</h3>
<p>Federal receivers should continue working through Section 1782 applications and MLAT requests for offshore-asset tracing. Recovery-fund managers should pressure-test their distribution waterfall assumptions against the Norton Rose "even the winners lose" framework. Defense counsel for net-winner investors should preserve good-faith-receipt defenses early in the receiver's claims process. Counsel advising secondary-defendant institutions (CPAs, custodians, broker-dealers) should run red-flag-detection assessments on any client showing Madoff-pattern operational signals.</p>""",
    "linkedin_post": """No new major SEC complaints, federal receiver appointments, or appellate clawback rulings in the last 48 hours. The recovery docket runs on a longer cadence than the daily news.

What's in motion under the surface:

— Paramount/Prestige (Heller, ~$400M, ~2,700 investors) and Goliath Ventures (M.D. Fla., ~$328M crypto Ponzi) remain the two largest active receivership recovery tracks. Asset-tracing continues through standard channels: domestic banking records, securities-account discovery, USDT/USDC offshore-exchange production.

— The structural number defining the bar: $262 million returned to harmed investors in SEC FY 2025 (Bloomberg Law). That ceiling is a tailwind for private receiver-led recovery vehicles.

— The doctrinal frame: Norton Rose's "even the winners lose" treatment of clawback exposure under fraudulent-conveyance statutes — actual fraud vs. constructive fraud under the Ponzi-scheme presumption.

Two operational items that travel under most desks:

1. Secondary-defendant exposure (CPAs, custodians, broker-dealers who missed red flags) is where the second-order recovery dollars increasingly live.
2. Section 1782 applications remain the primary cross-border tracing lever. Venezuela / Caribbean friction is the bottleneck on the largest crypto-Ponzi cases.

Quiet recovery docket. Active doctrinal infrastructure.

#Ponzi #Fraud #AssetRecovery #Receivership #Clawback #Section1782""",
    "key_dates": [
        ("watch", "Q2 2026", "Paramount/Prestige — next receiver's interim report"),
        ("watch", "Q2 2026", "Goliath Ventures — preliminary distribution motion"),
        ("watch", "Ongoing", "Santarelli follow-on civil litigation across 10+ states"),
    ],
    "articles": [],
    "site_updates": False,
    "stats": {"new_articles_count": 0, "total_archive_count": 14},
}

CONTENT["05-tech-mass-arbitration"] = {
    "urgency": "normal",
    "lead_headline": "Keller Postman Google advertiser campaign at $218B; AAA/JAMS mass-arbitration mechanics emerge as the gating procedural question.",
    "lead_html": """<p>The <a href="https://www.massarbitrationclaims.com/blog/google-mass-arbitration/" target="_blank" rel="noopener">Keller Postman Google advertiser mass-arbitration campaign</a> remains the dominant active matter on this tab. Estimated claims at $218 billion or more — the largest mass-arbitration campaign ever attempted by dollar value — continue to expand from "thousands" of represented companies as Keller Postman opens broader intake. The procedural fight ahead is the AAA/JAMS mass-arbitration rule application: the 25-claim simultaneous trigger pulls the fee-shifting and joint-arbitration mechanics into play, and Google has historically resisted those mechanisms in adjacent dockets. No new wave filings or remedies-phase orders in the 48-hour window.</p>""",
    "advisory_md": """## I. Keller Postman Google Advertiser Campaign — Procedural Mechanics

The Keller Postman Google advertiser mass-arbitration campaign continues to expand following the April 13 announcement. Estimated claims at approximately $218 billion are anchored to the two federal court rulings in 2024 finding that Google illegally monopolized online search and online advertising technology, with damages claims aggregated across the firm's "thousands" of represented advertisers since 2016 — a window during which Google captured roughly $728 billion in U.S. ad spend.

The procedural gate is the AAA mass-arbitration rule. Google's advertiser contracts specify AAA as the arbitration forum, and AAA's mass-arbitration rules (triggered at 25 or more simultaneous coordinated claims) shift fee economics and create joint-arbitration mechanisms that defendants in adjacent mass-arb tracks (DoorDash, Amazon, Live Nation) have aggressively resisted. The AAA fee structure under the mass-arbitration rule materially changes Google's litigation cost-of-loss curve and is the likely battleground for the first round of motion practice.

## II. Antitrust Remedies Phase — DOJ Implementation Track

On the search side, Google's January 2026 appeal seeking to pause data-sharing mandates imposed by the September 2025 remedies ruling in U.S. v. Google (Mehta court) remains pending. The remedies ruling does not directly govern the mass-arbitration damages calculation, but the data-sharing mandates and the search-monopolization findings function as collateral-estoppel anchors for the Keller Postman damages model.

The ad-tech remedies track (Brinkema court, E.D. Va.) is on a parallel timeline. Implementation orders on the ad-tech remedies side are expected through Q3 2026.

## III. Parallel Tracks — Apple, Meta, Amazon

Apple, Meta, and Amazon parallel mass-arbitration tracks remain in preparation stages. No new filings in the 48-hour window. UK CAT and EU DMA private enforcement comparators continue to develop and inform the funder economics on the U.S. tracks (Burford, Longford, Parabellum visible in the funding announcements; Cornerstone-style damages modeling now standard).

## Recommended Actions

In-house counsel at advertiser brands and agencies should evaluate participation in the Keller Postman wave through a damages-modeling lens that compares mass-arbitration claim value against opportunity cost (statutory limitations, settlement-tax timing, opt-in or opt-out posture). Plaintiff-side antitrust firms running parallel campaigns should align on AAA mass-arbitration rule procedural posture — collective fee-shifting motions and joint-arbitration mechanisms will be decided in the first wave and set precedent for downstream campaigns. Big Tech antitrust defense counsel should treat AAA mass-arbitration rule challenges (clause-enforceability, gateway questions) as the operative defensive lever and prepare full briefing now.
""",
    "advisory_html": """<h3>I. Keller Postman Google Advertiser Campaign — Procedural Mechanics</h3>
<p>The Keller Postman Google advertiser mass-arbitration campaign continues to expand following the April 13 announcement. <a href="https://www.massarbitrationclaims.com/blog/google-mass-arbitration/" target="_blank" rel="noopener">Estimated claims at approximately $218 billion</a> are anchored to the two federal court rulings in 2024 finding that Google illegally monopolized online search and online advertising technology, with damages claims aggregated across the firm's "thousands" of represented advertisers since 2016 — a window during which Google captured roughly $728 billion in U.S. ad spend.</p>
<p>The procedural gate is the AAA mass-arbitration rule. Google's advertiser contracts specify AAA as the arbitration forum, and <a href="https://www.adexchanger.com/antitrust/for-google-advertisers-who-overpaid-the-monopoly-dont-hate-arbitrate/" target="_blank" rel="noopener">AAA's mass-arbitration rules</a> (triggered at 25 or more simultaneous coordinated claims) shift fee economics and create joint-arbitration mechanisms that defendants in adjacent mass-arb tracks (DoorDash, Amazon, Live Nation) have aggressively resisted. The AAA fee structure under the mass-arbitration rule materially changes Google's litigation cost-of-loss curve and is the likely battleground for the first round of motion practice.</p>

<h3>II. Antitrust Remedies Phase — DOJ Implementation Track</h3>
<p>On the search side, Google's <a href="https://news.bloomberglaw.com/antitrust/google-faces-mass-arbitration-by-advertisers-seeking-billions" target="_blank" rel="noopener">January 2026 appeal</a> seeking to pause data-sharing mandates imposed by the September 2025 remedies ruling in U.S. v. Google (Mehta court) remains pending. The remedies ruling does not directly govern the mass-arbitration damages calculation, but the data-sharing mandates and the search-monopolization findings function as collateral-estoppel anchors for the Keller Postman damages model.</p>
<p>The ad-tech remedies track (Brinkema court, E.D. Va.) is on a parallel timeline. Implementation orders on the ad-tech remedies side are expected through Q3 2026.</p>

<h3>III. Parallel Tracks — Apple, Meta, Amazon</h3>
<p>Apple, Meta, and Amazon parallel mass-arbitration tracks remain in preparation stages. No new filings in the 48-hour window. UK CAT and EU DMA private enforcement comparators continue to develop and inform the funder economics on the U.S. tracks (Burford, Longford, Parabellum visible in the funding announcements; Cornerstone-style damages modeling now standard).</p>

<h3>Recommended Actions</h3>
<p>In-house counsel at advertiser brands and agencies should evaluate participation in the Keller Postman wave through a damages-modeling lens that compares mass-arbitration claim value against opportunity cost (statutory limitations, settlement-tax timing, opt-in or opt-out posture). Plaintiff-side antitrust firms running parallel campaigns should align on AAA mass-arbitration rule procedural posture — collective fee-shifting motions and joint-arbitration mechanisms will be decided in the first wave and set precedent for downstream campaigns. Big Tech antitrust defense counsel should treat AAA mass-arbitration rule challenges (clause-enforceability, gateway questions) as the operative defensive lever and prepare full briefing now.</p>""",
    "linkedin_post": """$218 billion. That's the Keller Postman estimate of the Google advertiser mass-arbitration campaign — the largest mass-arbitration campaign ever attempted by dollar value.

The campaign is anchored to the two 2024 federal monopolization rulings: search (Mehta) and ad tech (Brinkema). It aggregates claims across "thousands" of represented advertisers covering the ~$728B in U.S. Google ad spend since 2016.

But the dollar figure isn't where this case will be decided. The procedural gate is AAA mass-arbitration mechanics.

— Google's advertiser contracts force AAA as the arbitration forum.
— AAA's mass-arbitration rule triggers at 25+ simultaneous coordinated claims — fee-shifting, joint-arbitration mechanisms, the works.
— Defendants in adjacent mass-arb tracks (DoorDash, Amazon, Live Nation) have aggressively resisted those mechanisms.

The AAA fee structure under the mass-arbitration rule materially changes Google's cost-of-loss curve. That is the first round of motion practice.

What in-house counsel at advertiser brands need to decide now:

— Whether to opt in to the Keller Postman wave or build their own campaign.
— How to model claim value against opportunity cost (statutory limitations, settlement-tax timing).
— Whether the data-sharing remedies in U.S. v. Google are collateral-estoppel anchors for damages.

The Apple, Meta, and Amazon parallel tracks are next.

#MassArbitration #Antitrust #BigTech #KellerPostman #AdTech""",
    "key_dates": [
        ("upcoming", "Q2 2026", "AAA initial filings and mass-arbitration rule fee-shifting motions"),
        ("watch",    "Q3 2026", "U.S. v. Google (ad-tech remedies) — Brinkema court implementation orders"),
        ("watch",    "Q3 2026", "Google appeal of search-side data-sharing mandates — D.C. Cir. decision"),
        ("watch",    "Q4 2026", "Apple / Meta / Amazon parallel-track filing windows"),
    ],
    "articles": [
        ("Google Mass Arbitration: Keller Postman Files $218 Billion in Advertiser Claims",
         "https://www.massarbitrationclaims.com/blog/google-mass-arbitration/",
         "MassArbitrationClaims.com (Tier 3) · May 16, 2026",
         "Updated wave count and campaign architecture for the $218B Keller Postman Google advertiser campaign."),
        ("For Google Advertisers Who Overpaid The Monopoly — Don't Hate, Arbitrate",
         "https://www.adexchanger.com/antitrust/for-google-advertisers-who-overpaid-the-monopoly-dont-hate-arbitrate/",
         "AdExchanger (Tier 3) · May 17, 2026",
         "Antitrust-economics framing of the AAA mass-arbitration procedural posture and the $728B ad-spend basis."),
    ],
    "site_updates": False,
    "stats": {"new_articles_count": 2, "total_archive_count": 22},
}

CONTENT["06-billion-dollar-class-actions"] = {
    "urgency": "high",
    "lead_headline": "BCBS $2.67B subscriber payments begin May 11; Bartz v. Anthropic $1.5B final-approval order watch; mega-deal cycle compresses.",
    "lead_html": """<p>The mega-settlement cycle is running hot heading into Memorial Day. The <a href="https://openclassactions.com/news/blue-cross-blue-shield-settlement-payment-may-2026.php" target="_blank" rel="noopener">$2.67 billion Blue Cross Blue Shield subscriber antitrust settlement</a> began payments on May 11 to approximately 7.8 million claimants under the distribution plan approved by Judge R. David Proctor (N.D. Ala.). Approximately $1.9 billion is being distributed after legal and administrative fees. In parallel, Bartz v. Anthropic ($1.5B AI-copyright settlement) closed its fairness hearing on May 14 — final approval is expected on a customary 7–21 day post-hearing window. With the $2.8 billion BCBS Provider Settlement already final (2025), the cumulative BCBS antitrust resolution now exceeds $5.4 billion.</p>""",
    "advisory_md": """## I. BCBS Subscriber Settlement — $2.67B Payment Cycle Live

The $2.67 billion Blue Cross Blue Shield subscriber antitrust settlement began distribution payments on May 11, 2026, under the distribution plan approved by Judge R. David Proctor of the Northern District of Alabama on the April 23 motion. Approximately $1.9 billion is being distributed to approximately 7.8 million valid claimants after deduction of legal and administrative fees. The settlement resolves claims that more than 35 Blue Cross Blue Shield affiliates carved up the country into exclusive territories and agreed not to compete against one another. The Eleventh Circuit affirmed the settlement in October 2023, and the Supreme Court declined to hear further challenges.

The separate $2.8 billion BCBS Provider Settlement, addressing claims from healthcare providers who treated BCBS patients, received final court approval in 2025 and is in its own distribution cycle. The combined BCBS antitrust resolution exceeds $5.4 billion — making it one of the largest healthcare-antitrust resolutions on record.

## II. Bartz v. Anthropic — Final Approval Order Watch

The Bartz v. Anthropic $1.5 billion AI-copyright class settlement (cross-link Tab 02) closed its fairness hearing on May 14 before Judge William Alsup. The customary post-hearing window for a final-approval order is 7–21 days, putting the order in a Memorial Day to early-June window. If approved, Bartz becomes the largest copyright class settlement in U.S. history and the first AI training-data class settlement at the $1B+ threshold. The 91.3% claims rate is itself the procedural defense against adequacy-of-notice objections on appeal.

## III. Cumulative Mega-Settlement Cycle — 2026 Pace

The 2026 cycle is now running ahead of the post-2020 average for $1B+ class settlements. CFO Dive's annual top-settlements roundup continues to be the operative calibration benchmark. Cornerstone Research's mid-year securities-class-action update is the next major comparator publication; Stanford Securities Class Action Clearinghouse data updates monthly.

## IV. Pending Approval Calendars

No major preliminary or final approval orders in the 48-hour window beyond the BCBS payment-cycle activation. The next high-value pending matters include the Visa/Mastercard interchange merchant class (residual claims), residual MDL settlements in opioid/PFAS tracks, and the OpenAI MDL (which is being read as the next likely $1B+ AI settlement after Bartz sets the per-work benchmark).

## Recommended Actions

Mega-class plaintiff firms should treat the Bartz per-book pricing as the operative settlement comparator for AI-training cases at the $1B+ threshold. Defense-side mega-class firms should prepare for compressed approval calendars as Bartz and BCBS activate consecutive mega-distribution cycles. Settlement administrators should track BCBS distribution-defect signals (notice failures, claim-rejection patterns) as benchmark data for upcoming approvals. Litigation funders should recalibrate AI-copyright damages models against the Bartz benchmark; pricing on the OpenAI MDL is expected to track Bartz on a per-work basis.
""",
    "advisory_html": """<h3>I. BCBS Subscriber Settlement — $2.67B Payment Cycle Live</h3>
<p>The <a href="https://openclassactions.com/news/blue-cross-blue-shield-settlement-payment-may-2026.php" target="_blank" rel="noopener">$2.67 billion Blue Cross Blue Shield subscriber antitrust settlement</a> began distribution payments on May 11, 2026, under the distribution plan approved by Judge R. David Proctor of the Northern District of Alabama on the April 23 motion. Approximately $1.9 billion is being distributed to approximately 7.8 million valid claimants after deduction of legal and administrative fees. The settlement resolves claims that more than 35 Blue Cross Blue Shield affiliates carved up the country into exclusive territories and agreed not to compete against one another. The Eleventh Circuit affirmed the settlement in October 2023, and the Supreme Court declined to hear further challenges.</p>
<p>The separate $2.8 billion BCBS Provider Settlement, addressing claims from healthcare providers who treated BCBS patients, received final court approval in 2025 and is in its own distribution cycle. The combined BCBS antitrust resolution exceeds $5.4 billion — making it one of the largest healthcare-antitrust resolutions on record.</p>

<h3>II. Bartz v. Anthropic — Final Approval Order Watch</h3>
<p>The Bartz v. Anthropic <a href="https://legalblogs.wolterskluwer.com/copyright-blog/the-bartz-v-anthropic-settlement-understanding-americas-largest-copyright-settlement/" target="_blank" rel="noopener">$1.5 billion AI-copyright class settlement</a> (cross-link Tab 02) closed its fairness hearing on May 14 before Judge William Alsup. The customary post-hearing window for a final-approval order is 7–21 days, putting the order in a Memorial Day to early-June window. If approved, Bartz becomes the largest copyright class settlement in U.S. history and the first AI training-data class settlement at the $1B+ threshold. The 91.3% claims rate is itself the procedural defense against adequacy-of-notice objections on appeal.</p>

<h3>III. Cumulative Mega-Settlement Cycle — 2026 Pace</h3>
<p>The 2026 cycle is now running ahead of the post-2020 average for $1B+ class settlements. CFO Dive's annual top-settlements roundup continues to be the operative calibration benchmark. Cornerstone Research's mid-year securities-class-action update is the next major comparator publication; Stanford Securities Class Action Clearinghouse data updates monthly.</p>

<h3>IV. Pending Approval Calendars</h3>
<p>No major preliminary or final approval orders in the 48-hour window beyond the BCBS payment-cycle activation. The next high-value pending matters include the Visa/Mastercard interchange merchant class (residual claims), residual MDL settlements in opioid/PFAS tracks, and the OpenAI MDL (which is being read as the next likely $1B+ AI settlement after Bartz sets the per-work benchmark).</p>

<h3>Recommended Actions</h3>
<p>Mega-class plaintiff firms should treat the Bartz per-book pricing as the operative settlement comparator for AI-training cases at the $1B+ threshold. Defense-side mega-class firms should prepare for compressed approval calendars as Bartz and BCBS activate consecutive mega-distribution cycles. Settlement administrators should track BCBS distribution-defect signals (notice failures, claim-rejection patterns) as benchmark data for upcoming approvals. Litigation funders should recalibrate AI-copyright damages models against the Bartz benchmark; pricing on the OpenAI MDL is expected to track Bartz on a per-work basis.</p>""",
    "linkedin_post": """Two mega-distributions firing in the same week.

— Blue Cross Blue Shield subscriber antitrust: $2.67B began payment on May 11. ~$1.9B distributed to ~7.8M claimants after fees. With the parallel $2.8B BCBS Provider Settlement already final, the cumulative BCBS antitrust resolution exceeds $5.4 billion.

— Bartz v. Anthropic: $1.5B AI-copyright settlement. Fairness hearing closed May 14. Final approval order expected on a customary 7–21 day post-hearing window — putting it between Memorial Day and early June.

If Bartz approves, it becomes the largest copyright class settlement in U.S. history and the first AI training-data class settlement at the $1B+ threshold. The implicit per-book price (~$3,000 at the high end of the claimed pool) becomes the operative comparator for OpenAI MDL, Concord/UMG, and the rest of the AI training-data docket.

Two things settlement administrators and class-action defense are watching:

1. BCBS distribution-defect signals — notice failures, claim-rejection rates — function as benchmark data for the next round of mega-approvals.

2. The OpenAI MDL is the next likely $1B+ AI settlement. Pricing will track Bartz on a per-work basis. Litigation funders should be recalibrating now.

The 2026 mega-settlement cycle is running ahead of the post-2020 average. Compression in approval calendars is the operating condition.

#ClassAction #Settlement #Antitrust #AICopyright #BCBS #Bartz""",
    "key_dates": [
        ("imminent", "May 22, 2026", "Bartz v. Anthropic final approval order — earliest customary window"),
        ("upcoming", "June 5, 2026", "Bartz final approval order — latest customary window"),
        ("upcoming", "Ongoing",      "BCBS subscriber settlement — $2.67B distribution cycle (started May 11)"),
        ("watch",    "Q3 2026",      "OpenAI MDL — preliminary approval window (estimated)"),
    ],
    "articles": [
        ("Blue Cross Blue Shield Settlement Checks May 2026: BCBS $2.67B Antitrust Payment Update",
         "https://openclassactions.com/news/blue-cross-blue-shield-settlement-payment-may-2026.php",
         "OpenClassActions (Tier 3) · May 16, 2026",
         "Distribution-plan operational walkthrough; 7.8M claimants, $1.9B net distribution, May 11 payment-cycle activation."),
        ("Blue Cross Blue Shield $2.67 billion class action settlement payments begin May 2026",
         "https://www.claimdepot.com/cases/blue-cross-blue-shield-267b-antitrust-settlement-payments-set-to-begin-may-2026",
         "Claim Depot (Tier 3) · May 17, 2026",
         "Distribution-cycle activation; cumulative BCBS antitrust resolution at $5.4B with the parallel $2.8B Provider Settlement."),
    ],
    "site_updates": False,
    "stats": {"new_articles_count": 2, "total_archive_count": 31},
}

CONTENT["07-bankruptcy-creditor-rights"] = {
    "urgency": "high",
    "lead_headline": "First post-Purdue appellate authority on Chapter 15 third-party releases: Crédito Real (D. Del.) affirms recognition of Mexican concurso releases.",
    "lead_html": """<p>The District of Delaware has produced the first appellate-level authority holding that Harrington v. Purdue Pharma does not extend to recognition and enforcement of restructuring plans under Chapter 15. Chief Judge Colm F. Connolly's March 31 affirmance of the bankruptcy court's recognition order in the <a href="https://www.mayerbrown.com/en/insights/publications/2026/05/district-court-confirms-nonconsensual-third-party-releases-survive-purdue-pharma-in-chapter-15" target="_blank" rel="noopener">Crédito Real Chapter 15 case</a> grants full force and effect to the Mexican concurso mercantil plan — including its nonconsensual third-party releases. The Fourth Circuit's <a href="https://www.ncbrc.org/confirmation/2026/04/27/fourth-circuit-rejects-equitable-mootness-in-chapter-13-plan-confirmation-appeal/" target="_blank" rel="noopener">April 13 Cook v. Chapter 13 Trustee</a> rejection of equitable mootness in an individual Chapter 13 case adds to the cross-circuit drift narrowing the doctrine in non-mass-tort contexts. No SCOTUS cert grants on Chapter 11 issues in the 48-hour window.</p>""",
    "advisory_md": """## I. Crédito Real (D. Del., March 31, 2026) — Chapter 15 Carve-Out from Purdue

The District of Delaware's affirmance in the Crédito Real Chapter 15 case is the first appellate-level authority to hold that the Supreme Court's ruling in Harrington v. Purdue Pharma L.P. does not extend to recognition and enforcement of restructuring plans under Chapter 15. Chief Judge Connolly's order grants full force and effect to the Mexican concurso mercantil plan, including its nonconsensual third-party releases of non-debtor parties.

The reasoning is doctrinally significant. Purdue held that the Bankruptcy Code does not authorize nonconsensual third-party releases in Chapter 11 plans confirmed under § 1129. The Crédito Real court held that Chapter 15's recognition framework operates on a comity-and-public-policy basis distinct from § 1129 plan confirmation: recognition turns on whether the foreign proceeding is fair and procedurally adequate and on whether enforcement would offend U.S. public policy, not on whether the foreign plan could have been confirmed under U.S. Chapter 11 standards.

The practical effect: cross-border restructurings with home-jurisdiction third-party release machinery (Mexican concurso, English schemes of arrangement, Cayman/BVI schemes, Dutch WHOA proceedings) now have a Delaware appellate-level authority enforcing the releases through Chapter 15 recognition. Wachtell, Davis Polk, and Cleary have already begun reorienting their cross-border restructuring playbooks around this carve-out.

## II. Fourth Circuit — Cook v. Chapter 13 Trustee (April 13, 2026)

The Fourth Circuit's decision in Cook v. Chapter 13 Trustee, No. 25-1048, held that a district court erred in dismissing a Chapter 13 debtor's appeal as equitably moot merely because a later plan had been confirmed and payments had begun. The panel emphasized that equitable mootness is a narrow, pragmatic doctrine reserved for cases where effective relief is no longer practical or would be inequitable. The court concluded that the doctrine did not apply in a straightforward individual Chapter 13 case involving limited creditors, limited assets, and only prospective relief.

Cook is part of a clear cross-circuit drift narrowing equitable mootness. The Fourth Circuit's narrowing in non-mass-tort cases, the Fifth Circuit's bypass posture, the Sixth Circuit's Chapter 7 carve-out, and the Third Circuit's substantial-consummation focus continue to splinter the doctrine. The result on the ground: appellants in non-mass-tort Chapter 11 cases now have more room to argue that mootness should not foreclose review even after plan effectuation.

## III. Doctrinal Watchlist — Texas Two-Step, Subchapter V, Exculpation

The Texas Two-Step / divisional merger ecosystem (3M Aearo, J&J) remains in motion at the appellate level following the Third Circuit's Aearo dismissal. Subchapter V threshold-amount activity in Congress has stalled with no markup activity in the 48-hour window. Ninth Circuit exculpation-scope litigation remains the active doctrinal lane for plan-exculpation clause challenges.

## Recommended Actions

Cross-border restructuring counsel should treat Crédito Real as the operative Chapter 15 authority for clients with home-jurisdiction third-party release machinery; the case substantially preserves the prior pre-Purdue cross-border restructuring playbook. Plan-confirmation litigators should preserve equitable-mootness arguments in non-mass-tort cases through the Cook framework — the doctrine is narrower than it was a year ago. Indenture trustees and ad-hoc creditor groups should treat the Cook drift as a tailwind on confirmation appeals. Mass-tort creditor counsel should continue monitoring Texas Two-Step appellate activity and the Ninth Circuit exculpation track.
""",
    "advisory_html": """<h3>I. Crédito Real (D. Del., March 31, 2026) — Chapter 15 Carve-Out from Purdue</h3>
<p>The District of Delaware's affirmance in the <a href="https://www.mayerbrown.com/en/insights/publications/2026/05/district-court-confirms-nonconsensual-third-party-releases-survive-purdue-pharma-in-chapter-15" target="_blank" rel="noopener">Crédito Real Chapter 15 case</a> is the first appellate-level authority to hold that the Supreme Court's ruling in Harrington v. Purdue Pharma L.P. does not extend to recognition and enforcement of restructuring plans under Chapter 15. Chief Judge Connolly's order grants full force and effect to the Mexican concurso mercantil plan, including its nonconsensual third-party releases of non-debtor parties.</p>
<p>The reasoning is doctrinally significant. Purdue held that the Bankruptcy Code does not authorize nonconsensual third-party releases in Chapter 11 plans confirmed under § 1129. The Crédito Real court held that Chapter 15's recognition framework operates on a comity-and-public-policy basis distinct from § 1129 plan confirmation: recognition turns on whether the foreign proceeding is fair and procedurally adequate and on whether enforcement would offend U.S. public policy, not on whether the foreign plan could have been confirmed under U.S. Chapter 11 standards.</p>
<p>The practical effect: cross-border restructurings with home-jurisdiction third-party release machinery (Mexican concurso, English schemes of arrangement, Cayman/BVI schemes, Dutch WHOA proceedings) now have a Delaware appellate-level authority enforcing the releases through Chapter 15 recognition. Wachtell, Davis Polk, and Cleary have already begun reorienting their cross-border restructuring playbooks around this carve-out.</p>

<h3>II. Fourth Circuit — Cook v. Chapter 13 Trustee (April 13, 2026)</h3>
<p>The Fourth Circuit's decision in <a href="https://www.ncbrc.org/confirmation/2026/04/27/fourth-circuit-rejects-equitable-mootness-in-chapter-13-plan-confirmation-appeal/" target="_blank" rel="noopener">Cook v. Chapter 13 Trustee</a>, No. 25-1048, held that a district court erred in dismissing a Chapter 13 debtor's appeal as equitably moot merely because a later plan had been confirmed and payments had begun. The panel emphasized that equitable mootness is a narrow, pragmatic doctrine reserved for cases where effective relief is no longer practical or would be inequitable. The court concluded that the doctrine did not apply in a straightforward individual Chapter 13 case involving limited creditors, limited assets, and only prospective relief.</p>
<p>Cook is part of a clear cross-circuit drift narrowing equitable mootness. The Fourth Circuit's narrowing in non-mass-tort cases, the Fifth Circuit's bypass posture, the Sixth Circuit's Chapter 7 carve-out, and the Third Circuit's substantial-consummation focus continue to splinter the doctrine. The result on the ground: appellants in non-mass-tort Chapter 11 cases now have more room to argue that mootness should not foreclose review even after plan effectuation.</p>

<h3>III. Doctrinal Watchlist — Texas Two-Step, Subchapter V, Exculpation</h3>
<p>The Texas Two-Step / divisional merger ecosystem (3M Aearo, J&J) remains in motion at the appellate level following the Third Circuit's Aearo dismissal. Subchapter V threshold-amount activity in Congress has stalled with no markup activity in the 48-hour window. Ninth Circuit exculpation-scope litigation remains the active doctrinal lane for plan-exculpation clause challenges.</p>

<h3>Recommended Actions</h3>
<p>Cross-border restructuring counsel should treat Crédito Real as the operative Chapter 15 authority for clients with home-jurisdiction third-party release machinery; the case substantially preserves the prior pre-Purdue cross-border restructuring playbook. Plan-confirmation litigators should preserve equitable-mootness arguments in non-mass-tort cases through the Cook framework — the doctrine is narrower than it was a year ago. Indenture trustees and ad-hoc creditor groups should treat the Cook drift as a tailwind on confirmation appeals. Mass-tort creditor counsel should continue monitoring Texas Two-Step appellate activity and the Ninth Circuit exculpation track.</p>""",
    "linkedin_post": """First appellate authority on whether Purdue Pharma reaches Chapter 15.

The District of Delaware (Chief Judge Connolly, March 31, 2026) affirmed recognition of the Crédito Real Mexican concurso mercantil plan — including its nonconsensual third-party releases — and held that Harrington v. Purdue Pharma L.P. does NOT extend to Chapter 15 recognition.

The doctrine is the case. Purdue held the Bankruptcy Code does not authorize nonconsensual third-party releases under § 1129. The Crédito Real court held Chapter 15 operates on a different framework: comity and public policy, not § 1129 plan-confirmation standards. Recognition turns on whether the foreign proceeding is fair and procedurally adequate, not on whether the foreign plan could have been confirmed under U.S. Chapter 11.

Practical effect: cross-border restructurings with home-jurisdiction third-party release machinery — Mexican concurso, English schemes of arrangement, Cayman/BVI schemes, Dutch WHOA — now have a Delaware appellate-level authority enforcing the releases through Chapter 15. Wachtell, Davis Polk, and Cleary have already begun reorienting their playbooks.

Adjacent doctrinal motion this month: the Fourth Circuit's Cook v. Chapter 13 Trustee (April 13) is part of a clear cross-circuit drift narrowing equitable mootness. Appellants in non-mass-tort Chapter 11 cases now have more room to argue mootness should not foreclose review.

A quieter month on the docket. A loud one on the doctrine.

#Bankruptcy #Chapter15 #Purdue #ThirdPartyReleases #EquitableMootness #CreditorRights""",
    "key_dates": [
        ("watch", "Q2 2026", "Texas Two-Step / Aearo — appellate calendar activity"),
        ("watch", "Q2 2026", "Ninth Circuit exculpation-scope cases — published-opinion window"),
        ("watch", "Ongoing", "Cross-circuit equitable-mootness drift (4th/5th/6th/3d Cir.)"),
    ],
    "articles": [
        ("District Court Confirms Nonconsensual Third-Party Releases Survive Purdue Pharma in Chapter 15",
         "https://www.mayerbrown.com/en/insights/publications/2026/05/district-court-confirms-nonconsensual-third-party-releases-survive-purdue-pharma-in-chapter-15",
         "Mayer Brown (Tier 3) · May 16, 2026",
         "First appellate-level authority on Chapter 15 carve-out from Harrington v. Purdue Pharma; D. Del. affirmance of Crédito Real concurso mercantil recognition."),
        ("Fourth Circuit Rejects Equitable Mootness in Chapter 13 Plan Confirmation Appeal",
         "https://www.ncbrc.org/confirmation/2026/04/27/fourth-circuit-rejects-equitable-mootness-in-chapter-13-plan-confirmation-appeal/",
         "NCBRC (Tier 3) · May 17, 2026",
         "Cook v. Chapter 13 Trustee narrows equitable mootness in non-mass-tort context; cross-circuit drift continues."),
    ],
    "site_updates": False,
    "stats": {"new_articles_count": 2, "total_archive_count": 19},
}

# ---------------- HTML TEMPLATE ----------------

THEME_JS = """<script>
(function(){
  var K='daily-briefing-theme';
  var ST=['system','light','dark'];
  var IC={light:'☀️',dark:'🌙',system:'🖥️'};
  function eff(t){return t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;}
  function apply(){
    var t=localStorage.getItem(K)||'system';
    document.documentElement.setAttribute('data-theme',eff(t));
    var b=document.getElementById('theme-toggle');
    if(b){b.textContent=IC[t];b.title='Theme: '+t;}
  }
  window.cycleTheme=function(){
    var c=localStorage.getItem(K)||'system';
    var n=ST[(ST.indexOf(c)+1)%ST.length];
    localStorage.setItem(K,n);apply();
  };
  apply();
  if(document.readyState!=='loading') apply();
  else document.addEventListener('DOMContentLoaded',apply);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);
})();
</script>"""

BASE_CSS = """<style>
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap');
:root{color-scheme:light dark;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Archivo',-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#E5E7EB;color:rgba(10,10,10,0.85);min-height:100vh;}
.wrap{max-width:780px;margin:0 auto;padding:24px 18px 80px;}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-top:4px;}
.header h1{font-size:18px;font-weight:800;letter-spacing:-0.01em;}
.header .meta{font-size:11px;color:rgba(10,10,10,0.55);margin-top:3px;}
.section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(10,10,10,0.45);margin-bottom:6px;margin-top:14px;}
.card-box{background:#FFFFFF;border:1px solid rgba(10,10,10,0.08);padding:18px 20px;margin-bottom:14px;}
.card-box p{font-size:13px;line-height:1.7;color:rgba(10,10,10,0.82);margin-bottom:12px;}
.card-box p:last-child{margin-bottom:0;}
.card-box a{color:#0A0A0A;text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:rgba(212,255,0,0.85);text-underline-offset:2px;}
.card-box a:hover{background:rgba(212,255,0,0.30);}
.card-box h3{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#0A0A0A;margin:18px 0 10px;}
.card-box h3:first-child{margin-top:0;}
.advisory-toggle{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:14px 18px;background:#FFFFFF;border:1px solid rgba(10,10,10,0.08);}
.advisory-toggle-title{font-size:13.5px;font-weight:700;color:#0A0A0A;}
.advisory-chevron{font-size:14px;color:rgba(10,10,10,0.45);transition:transform .2s;}
.advisory-chevron.open{transform:rotate(180deg);}
.advisory-body{display:none;background:#FFFFFF;border:1px solid rgba(10,10,10,0.08);border-top:none;padding:18px 22px 24px;margin-bottom:14px;}
.advisory-body.open{display:block;}
.advisory-body p{font-size:12.5px;line-height:1.75;color:rgba(10,10,10,0.82);margin-bottom:14px;}
.advisory-body p:last-child{margin-bottom:0;}
.advisory-body h3{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#0A0A0A;margin:18px 0 10px;}
.advisory-body h3:first-child{margin-top:0;}
.advisory-body a{color:#0A0A0A;text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:rgba(212,255,0,0.85);text-underline-offset:2px;}
.dates-block{background:#FFFFFF;border:1px solid rgba(10,10,10,0.08);padding:18px 20px;margin-bottom:14px;}
.date-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #D5D9DF;}
.date-row:last-child{border-bottom:none;}
.date-pip{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.pip-imminent{background:#ef4444;}
.pip-upcoming{background:#f59e0b;}
.pip-watch{background:#3b82f6;}
.date-text{flex:1;font-size:12.5px;line-height:1.5;color:rgba(10,10,10,0.82);}
.date-text strong{color:#0A0A0A;}
.linkedin-block{background:#FFFFFF;border:1px solid rgba(10,10,10,0.08);padding:18px 20px;margin-bottom:14px;}
.linkedin-post{font-size:13px;line-height:1.7;white-space:pre-wrap;color:rgba(10,10,10,0.85);margin-bottom:12px;}
.btn-copy{font-size:11px;padding:8px 18px;border:1px solid #D4FF00;background:#D4FF00;color:#0A0A0A;cursor:pointer;font-family:inherit;font-weight:700;}
.btn-copy:hover{background:#E2FF4D;}
.copied-msg{display:none;color:#0A0A0A;font-size:11px;margin-left:10px;font-weight:600;}
.copied-msg.visible{display:inline;}
.card{background:#FFFFFF;border:1px solid rgba(10,10,10,0.08);padding:14px 16px;margin-bottom:10px;}
.card-title{font-size:13px;font-weight:600;color:#0A0A0A;margin-bottom:3px;}
.card-title a{color:#0A0A0A;text-decoration:none;}
.card-title a:hover{text-decoration:underline;}
.card-meta{font-size:11px;color:rgba(10,10,10,0.45);margin-bottom:5px;}
.card-insight{font-size:12px;line-height:1.6;color:rgba(10,10,10,0.7);}
.empty-state{font-size:12.5px;color:rgba(10,10,10,0.55);font-style:italic;padding:16px 0;}
.disclaimer{font-size:11px;color:rgba(10,10,10,0.55);font-style:italic;padding:14px 16px;border-top:1px solid rgba(10,10,10,0.08);margin-top:16px;}
.back-link{font-size:11px;color:rgba(10,10,10,0.55);text-decoration:none;}
.back-link:hover{color:#0A0A0A;}
/* NAV */
.tn{background:#000000;border-bottom:1px solid rgba(255,255,255,0.12);padding:10px 20px;width:100%;position:sticky;top:0;z-index:100;}
.tn-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.tn-row+.tn-row{margin-top:6px;}
.tn-row.brand{justify-content:space-between;padding-bottom:8px;}
.tn-brand{display:inline-flex;align-items:center;gap:0;text-decoration:none;}
.tn-brand-logo{height:18px;width:auto;filter:invert(1) brightness(2);transition:filter .15s;}
#theme-toggle{background:transparent;border:1px solid rgba(255,255,255,0.25);color:inherit;cursor:pointer;font-size:12px;padding:3px 8px;}
.tn-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:11.5px;color:rgba(255,255,255,0.7);text-decoration:none;background:transparent;border:1px solid transparent;transition:background .15s,color .15s;}
.tn-pill:hover{color:#FFFFFF;background:rgba(255,255,255,0.06);}
.tn-pill.active{color:#D4FF00;background:rgba(212,255,0,0.12);border-color:rgba(212,255,0,0.45);}
.tn-views{display:flex;gap:20px;padding-top:4px;}
.tn-view{font-size:11px;color:rgba(255,255,255,0.55);text-decoration:none;font-weight:500;padding:2px 0;}
.tn-view:hover{color:#FFFFFF;}
.tn-view.active{color:#FFFFFF;font-weight:700;border-bottom:2px solid #D4FF00;padding-bottom:2px;}
[data-theme="light"] .tn{background:#FFFFFF;border-bottom-color:rgba(10,10,10,0.08);}
[data-theme="light"] .tn-brand-logo{filter:none;}
[data-theme="light"] #theme-toggle{border-color:rgba(10,10,10,0.14);color:#0A0A0A;}
[data-theme="light"] .tn-pill{color:rgba(10,10,10,0.65);}
[data-theme="light"] .tn-pill:hover{color:#0A0A0A;background:rgba(10,10,10,0.04);}
[data-theme="light"] .tn-pill.active{color:#0A0A0A;background:#D4FF00;border-color:#D4FF00;font-weight:700;}
[data-theme="light"] .tn-view{color:rgba(10,10,10,0.55);}
[data-theme="light"] .tn-view:hover{color:#0A0A0A;}
[data-theme="light"] .tn-view.active{color:#0A0A0A;border-bottom-color:#D4FF00;}
[data-theme="dark"] body{background:#000000;color:#FFFFFF;}
[data-theme="dark"] .card-box,[data-theme="dark"] .advisory-toggle,[data-theme="dark"] .advisory-body,[data-theme="dark"] .dates-block,[data-theme="dark"] .linkedin-block,[data-theme="dark"] .card{background:#0A0A0A;border-color:rgba(255,255,255,0.12);}
[data-theme="dark"] .card-box p,[data-theme="dark"] .advisory-body p,[data-theme="dark"] .date-text,[data-theme="dark"] .linkedin-post,[data-theme="dark"] .card-insight,[data-theme="dark"] .empty-state{color:#c9d1d9;}
[data-theme="dark"] .card-box h3,[data-theme="dark"] .advisory-toggle-title,[data-theme="dark"] .date-text strong,[data-theme="dark"] .card-title,[data-theme="dark"] .advisory-body h3{color:#FFFFFF;}
[data-theme="dark"] .card-box a,[data-theme="dark"] .advisory-body a{color:#D4FF00;}
[data-theme="dark"] .section-label,[data-theme="dark"] .header .meta,[data-theme="dark"] .card-meta,[data-theme="dark"] .back-link,[data-theme="dark"] .disclaimer{color:rgba(255,255,255,0.6);}
[data-theme="dark"] .header h1{color:#FFFFFF;}
[data-theme="dark"] .date-row{border-bottom-color:rgba(255,255,255,0.12);}
</style>"""

def build_nav(active_slug):
    """Build the 3-row standardized nav. active_slug like '01-tariffs-trade'."""
    pills = []
    for t in TABS:
        active = " active" if t["slug"] == active_slug else ""
        pills.append(f'<a class="tn-pill{active}" href="../{t["slug"]}/advisory-approval.html">{t["emoji"]} {html.escape(t["short"])}</a>')
    pills_html = "\n      ".join(pills)
    return f"""<nav class="tn">
  <div class="tn-row brand">
    <a class="tn-brand" href="../dashboard.html"><img class="tn-brand-logo" alt="Turnpage" src="../../assets/turnpage-logo.jpeg"></a>
    <button id="theme-toggle" onclick="cycleTheme()">🖥️</button>
  </div>
  <div class="tn-row">
      {pills_html}
  </div>
  <div class="tn-row tn-views">
    <a class="tn-view" href="../dashboard.html">Dashboard</a>
    <a class="tn-view active" href="advisory-approval.html">Today's Approval</a>
    <a class="tn-view" href="#">Refine</a>
    <a class="tn-view" href="#">Background</a>
  </div>
</nav>"""

def build_dashboard_nav():
    """Nav for the consolidated dashboard (no active tab)."""
    pills = []
    for t in TABS:
        pills.append(f'<a class="tn-pill" href="{t["slug"]}/advisory-approval.html">{t["emoji"]} {html.escape(t["short"])}</a>')
    pills_html = "\n      ".join(pills)
    return f"""<nav class="tn">
  <div class="tn-row brand">
    <a class="tn-brand" href="dashboard.html"><img class="tn-brand-logo" alt="Turnpage" src="../assets/turnpage-logo.jpeg"></a>
    <button id="theme-toggle" onclick="cycleTheme()">🖥️</button>
  </div>
  <div class="tn-row">
      {pills_html}
  </div>
  <div class="tn-row tn-views">
    <a class="tn-view active" href="dashboard.html">Dashboard</a>
    <a class="tn-view" href="#">Today's Approval</a>
    <a class="tn-view" href="#">Refine</a>
    <a class="tn-view" href="#">Background</a>
  </div>
</nav>"""

def build_dashboard_nav_root():
    """Nav for dashboard-latest.html at root (paths different)."""
    pills = []
    for t in TABS:
        pills.append(f'<a class="tn-pill" href="{DATE}/{t["slug"]}/advisory-approval.html">{t["emoji"]} {html.escape(t["short"])}</a>')
    pills_html = "\n      ".join(pills)
    return f"""<nav class="tn">
  <div class="tn-row brand">
    <a class="tn-brand" href="dashboard-latest.html"><img class="tn-brand-logo" alt="Turnpage" src="assets/turnpage-logo.jpeg"></a>
    <button id="theme-toggle" onclick="cycleTheme()">🖥️</button>
  </div>
  <div class="tn-row">
      {pills_html}
  </div>
  <div class="tn-row tn-views">
    <a class="tn-view active" href="dashboard-latest.html">Dashboard</a>
    <a class="tn-view" href="#">Today's Approval</a>
    <a class="tn-view" href="#">Refine</a>
    <a class="tn-view" href="#">Background</a>
  </div>
</nav>"""

def render_advisory_html(tab, content):
    """Render the full per-tab advisory-approval.html."""
    pip_class = {"imminent": "pip-imminent", "upcoming": "pip-upcoming", "watch": "pip-watch"}
    date_rows = "\n".join(
        f'<div class="date-row"><span class="date-pip {pip_class[u]}"></span><div class="date-text"><strong>{html.escape(d)}</strong> — {html.escape(t)}</div></div>'
        for u, d, t in content["key_dates"]
    ) or '<div class="empty-state">No imminent dates in the standing watchlist.</div>'

    if content["articles"]:
        article_cards = "\n".join(
            f'<div class="card"><div class="card-title"><a href="{u}" target="_blank" rel="noopener">{html.escape(title)}</a></div><div class="card-meta">{html.escape(meta)}</div><div class="card-insight">{html.escape(insight)}</div></div>'
            for (title, u, meta, insight) in content["articles"]
        )
    else:
        article_cards = '<div class="empty-state">No qualifying articles in the last 48 hours. The standing watchlist remains active; the next item that clears the source-tier and freshness filters will appear here.</div>'

    li_post_escaped = html.escape(content["linkedin_post"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(tab['name'])} — Advisory Approval | {DISPLAY_DATE}</title>
{THEME_JS}
{BASE_CSS}
</head>
<body>
{build_nav(tab['slug'])}
<div class="wrap">
  <div class="header">
    <div>
      <a href="../dashboard.html" class="back-link">← Back to Daily Dashboard</a>
      <h1 style="margin-top:6px;">{tab['emoji']} {html.escape(tab['name'])}</h1>
      <div class="meta">Daily Advisory · {DISPLAY_DATE}</div>
    </div>
  </div>

  <div class="section-label">Briefing — Lead</div>
  <div class="card-box">
    {content["lead_html"]}
  </div>

  <div class="section-label">Full Advisory</div>
  <div class="advisory-toggle" onclick="var b=this.nextElementSibling;b.classList.toggle('open');this.querySelector('.advisory-chevron').classList.toggle('open');">
    <div class="advisory-toggle-title">Open full advisory ↓</div>
    <div class="advisory-chevron">▾</div>
  </div>
  <div class="advisory-body">
    {content["advisory_html"]}
  </div>

  <div class="section-label">Key Upcoming Dates</div>
  <div class="dates-block">
    {date_rows}
  </div>

  <div class="section-label">LinkedIn Post (Draft)</div>
  <div class="linkedin-block">
    <div class="linkedin-post" id="li-post-{tab['slug']}">{li_post_escaped}</div>
    <button class="btn-copy" onclick="var t=document.getElementById('li-post-{tab['slug']}').textContent;navigator.clipboard.writeText(t);var m=document.getElementById('li-copied-{tab['slug']}');m.classList.add('visible');setTimeout(function(){{m.classList.remove('visible');}},2000);">Copy to clipboard</button>
    <span id="li-copied-{tab['slug']}" class="copied-msg">Copied!</span>
  </div>

  <div class="section-label">Proposed Articles (48h window)</div>
  {article_cards}

  <div class="disclaimer">This advisory is provided for informational purposes and does not constitute legal advice. Voice: {tab['voice']}. Verify all docket items against PACER / CourtListener / agency releases before acting.</div>
</div>
</body>
</html>"""

def render_advisory_md(tab, content):
    """Render the per-tab advisory.md."""
    return f"""# {tab['emoji']} {tab['name']} — Daily Advisory

**Date:** {DISPLAY_DATE}
**Voice:** {tab['voice']}
**Urgency:** {content['urgency'].upper()}

---

## Lead

{re.sub(r'<[^>]+>', '', content['lead_html']).strip()}

---

{content['advisory_md']}

---

## Key Upcoming Dates

{chr(10).join(f"- **{d}** — {t} ({u})" for u, d, t in content['key_dates'])}

---

## LinkedIn Draft

{content['linkedin_post']}

---

## Proposed Articles (48h window)

{chr(10).join(f"- **{title}** — {meta}{chr(10)}  - {u}{chr(10)}  - {insight}" for (title, u, meta, insight) in content['articles']) if content['articles'] else "_No qualifying articles in the last 48 hours._"}
"""

def render_dashboard_card(tab, content, prefix=""):
    """Build one tab's card for the consolidated dashboard. `prefix` is path prefix to tab folder."""
    urgency_color = {"high": "#ef4444", "normal": "#f59e0b", "quiet": "#9ca3af"}[content["urgency"]]
    urgency_label = {"high": "HIGH", "normal": "NORMAL", "quiet": "QUIET"}[content["urgency"]]
    stats = content["stats"]
    ln_status = "Post drafted" if content.get("linkedin_post") else "No post today"
    site_status = "Site updates proposed" if content.get("site_updates") else "No site updates"
    return f"""<a class="db-card db-card-{content['urgency']}" href="{prefix}{tab['slug']}/advisory-approval.html">
  <div class="db-card-head">
    <span class="db-emoji">{tab['emoji']}</span>
    <span class="db-name">{html.escape(tab['name'])}</span>
    <span class="db-urgency" style="background:{urgency_color};">{urgency_label}</span>
  </div>
  <div class="db-lead">{html.escape(content['lead_headline'])}</div>
  <div class="db-stats">
    <span class="db-stat"><strong>{stats['new_articles_count']}</strong> new · <strong>{stats['total_archive_count']}</strong> archive</span>
  </div>
  <div class="db-footer">
    <span class="db-meta">{ln_status} · {site_status}</span>
    <span class="db-cta">Open advisory →</span>
  </div>
</a>"""

DASHBOARD_CSS = """<style>
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap');
:root{color-scheme:light dark;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Archivo',-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#E5E7EB;color:rgba(10,10,10,0.85);min-height:100vh;}
.db-wrap{max-width:1280px;margin:0 auto;padding:32px 24px 80px;}
.db-hero{margin-bottom:28px;border-bottom:2px solid #0A0A0A;padding-bottom:18px;}
.db-hero h1{font-size:clamp(1.6rem,2.6vw,2.2rem);font-weight:800;letter-spacing:-0.02em;color:#0A0A0A;}
.db-hero .db-meta-line{font-size:12px;color:rgba(10,10,10,0.55);margin-top:8px;letter-spacing:0.04em;}
.db-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;}
.db-card{background:#FFFFFF;border:1px solid rgba(10,10,10,0.08);padding:18px 20px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:12px;transition:border-color .15s,box-shadow .15s;}
.db-card:hover{border-color:#0A0A0A;box-shadow:0 8px 20px rgba(10,10,10,0.08);}
.db-card-quiet{opacity:0.78;}
.db-card-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.db-emoji{font-size:18px;}
.db-name{font-size:13.5px;font-weight:700;color:#0A0A0A;flex:1;}
.db-urgency{font-size:9.5px;font-weight:700;letter-spacing:0.08em;color:#FFFFFF;padding:3px 8px;}
.db-lead{font-size:13px;line-height:1.55;color:rgba(10,10,10,0.78);min-height:60px;}
.db-stats{font-size:11px;color:rgba(10,10,10,0.55);letter-spacing:0.02em;}
.db-stats strong{color:#0A0A0A;font-weight:700;}
.db-footer{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(10,10,10,0.08);}
.db-meta{font-size:10.5px;color:rgba(10,10,10,0.5);}
.db-cta{font-size:11px;font-weight:700;color:#0A0A0A;text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:rgba(212,255,0,0.85);text-underline-offset:2px;}
.db-disclaimer{font-size:11px;color:rgba(10,10,10,0.55);font-style:italic;margin-top:32px;padding-top:16px;border-top:1px solid rgba(10,10,10,0.08);}
/* NAV (shared) */
.tn{background:#000000;border-bottom:1px solid rgba(255,255,255,0.12);padding:10px 20px;width:100%;position:sticky;top:0;z-index:100;}
.tn-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.tn-row+.tn-row{margin-top:6px;}
.tn-row.brand{justify-content:space-between;padding-bottom:8px;}
.tn-brand{display:inline-flex;align-items:center;gap:0;text-decoration:none;}
.tn-brand-logo{height:18px;width:auto;filter:invert(1) brightness(2);transition:filter .15s;}
#theme-toggle{background:transparent;border:1px solid rgba(255,255,255,0.25);color:inherit;cursor:pointer;font-size:12px;padding:3px 8px;}
.tn-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:11.5px;color:rgba(255,255,255,0.7);text-decoration:none;background:transparent;border:1px solid transparent;transition:background .15s,color .15s;}
.tn-pill:hover{color:#FFFFFF;background:rgba(255,255,255,0.06);}
.tn-pill.active{color:#D4FF00;background:rgba(212,255,0,0.12);border-color:rgba(212,255,0,0.45);}
.tn-views{display:flex;gap:20px;padding-top:4px;}
.tn-view{font-size:11px;color:rgba(255,255,255,0.55);text-decoration:none;font-weight:500;padding:2px 0;}
.tn-view:hover{color:#FFFFFF;}
.tn-view.active{color:#FFFFFF;font-weight:700;border-bottom:2px solid #D4FF00;padding-bottom:2px;}
[data-theme="light"] .tn{background:#FFFFFF;border-bottom-color:rgba(10,10,10,0.08);}
[data-theme="light"] .tn-brand-logo{filter:none;}
[data-theme="light"] #theme-toggle{border-color:rgba(10,10,10,0.14);color:#0A0A0A;}
[data-theme="light"] .tn-pill{color:rgba(10,10,10,0.65);}
[data-theme="light"] .tn-pill:hover{color:#0A0A0A;background:rgba(10,10,10,0.04);}
[data-theme="light"] .tn-pill.active{color:#0A0A0A;background:#D4FF00;border-color:#D4FF00;font-weight:700;}
[data-theme="light"] .tn-view{color:rgba(10,10,10,0.55);}
[data-theme="light"] .tn-view:hover{color:#0A0A0A;}
[data-theme="light"] .tn-view.active{color:#0A0A0A;border-bottom-color:#D4FF00;}
[data-theme="dark"] body{background:#000000;color:#FFFFFF;}
[data-theme="dark"] .db-card{background:#0A0A0A;border-color:rgba(255,255,255,0.12);}
[data-theme="dark"] .db-name,[data-theme="dark"] .db-cta,[data-theme="dark"] .db-stats strong{color:#FFFFFF;}
[data-theme="dark"] .db-lead{color:#c9d1d9;}
[data-theme="dark"] .db-stats,[data-theme="dark"] .db-meta,[data-theme="dark"] .db-disclaimer,[data-theme="dark"] .db-hero .db-meta-line{color:rgba(255,255,255,0.55);}
[data-theme="dark"] .db-hero h1{color:#FFFFFF;}
[data-theme="dark"] .db-hero{border-bottom-color:#FFFFFF;}
[data-theme="dark"] .db-footer{border-top-color:rgba(255,255,255,0.12);}
[data-theme="dark"] .db-disclaimer{border-top-color:rgba(255,255,255,0.12);}
</style>"""

def render_dashboard(prefix=""):
    """Render the consolidated 7-card dashboard. prefix='' for dated dashboard, prefix=DATE+'/' for root latest."""
    cards = "\n".join(render_dashboard_card(t, CONTENT[t["slug"]], prefix=prefix) for t in TABS)
    total_new = sum(CONTENT[t["slug"]]["stats"]["new_articles_count"] for t in TABS)
    if prefix:
        nav = build_dashboard_nav_root()
    else:
        nav = build_dashboard_nav()
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Briefing — {DISPLAY_DATE}</title>
{THEME_JS}
{DASHBOARD_CSS}
</head>
<body>
{nav}
<div class="db-wrap">
  <div class="db-hero">
    <h1>Daily Briefing</h1>
    <div class="db-meta-line">{DISPLAY_DATE} · 7 topics tracked · {total_new} new developments today</div>
  </div>
  <div class="db-grid">
    {cards}
  </div>
  <div class="db-disclaimer">Run timestamp: {DISPLAY_DATE}. Not legal advice — verify all docket items against PACER, CourtListener, or agency releases before acting. Tab configs in <code>daily-briefing/tabs/</code>.</div>
</div>
</body>
</html>"""

# ---------------- WRITE OUTPUTS ----------------

written = []
pathlib.Path(DATED).mkdir(parents=True, exist_ok=True)

for tab in TABS:
    slug = tab["slug"]
    content = CONTENT[slug]
    tab_dir = f"{DATED}/{slug}"
    pathlib.Path(tab_dir).mkdir(parents=True, exist_ok=True)

    md_path = f"{tab_dir}/advisory.md"
    html_path = f"{tab_dir}/advisory-approval.html"
    with open(md_path, "w") as f:
        f.write(render_advisory_md(tab, content))
    with open(html_path, "w") as f:
        f.write(render_advisory_html(tab, content))
    written.append(md_path)
    written.append(html_path)

# Dashboards
dated_dash = f"{DATED}/dashboard.html"
with open(dated_dash, "w") as f:
    f.write(render_dashboard(prefix=""))
written.append(dated_dash)

latest_dash = f"{ROOT}/dashboard-latest.html"
with open(latest_dash, "w") as f:
    f.write(render_dashboard(prefix=f"{DATE}/"))
written.append(latest_dash)

# Update BRIEFING-SUMMARY.txt
summary = [
    f"CONSOLIDATED DAILY BRIEFING — {DISPLAY_DATE}",
    "=" * 55,
    "",
    "RUN STATUS: Automated Mode (Scheduled Task) — COMPLETE",
    f"Run Date: {DISPLAY_DATE}",
    "Total Tabs: 7",
    "",
    "TAB RESULTS:",
    "============",
]
for tab in TABS:
    c = CONTENT[tab["slug"]]
    summary.append(f"  {tab['emoji']} {tab['name']:30s} | {c['urgency'].upper():6s} | {c['stats']['new_articles_count']} new / {c['stats']['total_archive_count']} archive")
    summary.append(f"    Lead: {c['lead_headline']}")
    summary.append("")

summary += [
    "",
    "OUTPUTS:",
    f"  Per-tab folders: {DATED}/<slug>/{{advisory.md, advisory-approval.html}}",
    f"  Dated dashboard: {dated_dash}",
    f"  Latest dashboard: {latest_dash}",
    "",
    f"Total new developments: {sum(CONTENT[t['slug']]['stats']['new_articles_count'] for t in TABS)}",
    "",
]
with open(f"{DATED}/BRIEFING-SUMMARY.txt", "w") as f:
    f.write("\n".join(summary))
written.append(f"{DATED}/BRIEFING-SUMMARY.txt")

print("WROTE", len(written), "FILES:")
for p in written:
    print(" ", p)
