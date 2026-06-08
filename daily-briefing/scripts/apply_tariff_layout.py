#!/usr/bin/env python3
"""One-shot: apply the tariff-tab layout changes to the other 5 dashboards.

Changes per dashboard:
  1. Replace "Today at a Glance" + everything below it inside advisory-body
     with a focused Story of the Day block (h2 + story-meta + 5 paragraphs).
  2. Embed primary-source <a class="doc-chip"> chips inside each storyline item.
  3. Add the CSS (story-meta + doc-chip set) once per file.

Run from the briefing root:
    python3 daily-briefing/scripts/apply_tariff_layout.py
"""
import re
from pathlib import Path

# --- Paths -------------------------------------------------------------------
ROOT = Path("/sessions/upbeat-lucid-brahmagupta/mnt/Development")
if not ROOT.exists():
    ROOT = Path("/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development")

DASHBOARDS = {
    "llm-class-action":            ROOT / "llm-class-action/dashboard.html",
    "crypto-insolvency":           ROOT / "crypto-insolvency/dashboard.html",
    "fraud-recovery":              ROOT / "fraud-recovery/dashboard.html",
    "billion-dollar-class-actions":ROOT / "billion-dollar-class-actions/dashboard.html",
    "bankruptcy-creditor-rights":  ROOT / "bankruptcy-creditor-rights/dashboard.html",
}

# --- Paper-document icon set (same set used on the tariff tab) --------------
PAGE = ('<path d="M5 2.5 H12 L15.5 6 V17 a0.5 0.5 0 0 1 -0.5 0.5 H5 a0.5 0.5 0 0 1 -0.5 -0.5 V3 a0.5 0.5 0 0 1 0.5 -0.5z" '
        'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>'
        '<path d="M12 2.5 V6 H15.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>')

BRIEF = (
    '<line x1="6.5" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="11.2" x2="14" y2="11.2" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="13.4" x2="14" y2="13.4" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="15.6" x2="11.5" y2="15.6" stroke="currentColor" stroke-width="1.1"/>'
)
ORDER = (
    '<line x1="6.5" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="12.9" x2="11" y2="12.9" stroke="currentColor" stroke-width="1.1"/>'
    '<circle cx="12.6" cy="14.9" r="1.7" fill="none" stroke="currentColor" stroke-width="1.2"/>'
    '<path d="M11.7 14.9 L12.4 15.6 L13.6 14.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
)
OPINION = (
    '<line x1="8.3" y1="8" x2="12.7" y2="8" stroke="currentColor" stroke-width="1.8"/>'
    '<line x1="9.3" y1="9.4" x2="11.7" y2="9.4" stroke="currentColor" stroke-width="1"/>'
    '<line x1="6.5" y1="11.5" x2="14" y2="11.5" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="13.3" x2="14" y2="13.3" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="15.1" x2="12" y2="15.1" stroke="currentColor" stroke-width="1.1"/>'
)
RELEASE = (
    '<rect x="6.5" y="7.5" width="7.5" height="1.6" fill="currentColor"/>'
    '<line x1="6.5" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="15" x2="11.5" y2="15" stroke="currentColor" stroke-width="1.1"/>'
)
LETTER = (
    '<line x1="10" y1="6.6" x2="13.5" y2="6.6" stroke="currentColor" stroke-width="1"/>'
    '<line x1="10.5" y1="7.8" x2="13.5" y2="7.8" stroke="currentColor" stroke-width="1"/>'
    '<line x1="11" y1="9" x2="13.5" y2="9" stroke="currentColor" stroke-width="1"/>'
    '<line x1="6.5" y1="11.6" x2="14" y2="11.6" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="13.4" x2="13.5" y2="13.4" stroke="currentColor" stroke-width="1.1"/>'
    '<path d="M9.5 16.2 q1 -1.2 2 0 q1 1.2 2 -0.3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
)
STATUTE = (
    '<line x1="6.5" y1="9" x2="9.5" y2="9" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="11" x2="9.5" y2="11" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="13" x2="9.5" y2="13" stroke="currentColor" stroke-width="1.1"/>'
    '<line x1="6.5" y1="15" x2="9.5" y2="15" stroke="currentColor" stroke-width="1.1"/>'
    '<text x="12.5" y="14.2" font-family="Archivo, sans-serif" font-size="9" font-weight="900" fill="currentColor" text-anchor="middle">§</text>'
)
ICONS = {"brief":BRIEF, "order":ORDER, "opinion":OPINION, "release":RELEASE, "letter":LETTER, "statute":STATUTE}

def svg(body):
    return f'<svg viewBox="0 0 20 20" aria-hidden="true">{PAGE}{body}</svg>'

def chip(typ, href, label):
    return (f'<a class="doc-chip doc-{typ}" href="{href}" target="_blank" rel="noopener">'
            f'<span class="doc-chip-icon">{svg(ICONS[typ])}</span>'
            f'<span class="doc-chip-label">{label}</span></a>')

# --- CSS block ---------------------------------------------------------------
CSS_BLOCK = '''
  /* === Story of the Day lead-meta line === */
  .story-meta {
    border-left: 3px solid #D4FF00;
    padding: 8px 14px;
    background: var(--paper-2);
    margin-bottom: 18px;
    line-height: 1.6;
  }
  [data-theme="dark"] .story-meta { border-left-color: #5D7A00; }
  .story-meta strong { font-weight: 800; letter-spacing: 0.02em; }

  /* === Doc chip (embedded primary-source link inside storyline items) === */
  .item-doc { margin-top: 6px; }
  .doc-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 8px 3px 6px;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-left-width: 2px; border-left-style: solid;
    font-family: 'Archivo', sans-serif;
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.01em; line-height: 1.3;
    color: var(--ink); text-decoration: none;
    max-width: 100%;
    transition: background 0.15s, border-color 0.15s;
  }
  .doc-chip:hover { background: var(--paper-2); border-color: var(--ink); }
  .doc-chip .doc-chip-icon { display: inline-flex; flex-shrink: 0; }
  .doc-chip .doc-chip-icon svg { width: 13px; height: 13px; display: block; }
  .doc-chip .doc-chip-label { overflow-wrap: anywhere; }
  .doc-chip.doc-opinion { border-left-color: #D4FF00; }
  .doc-chip.doc-order   { border-left-color: #D4FF00; }
  .doc-chip.doc-brief   { border-left-color: rgba(10,10,10,0.4); }
  .doc-chip.doc-release { border-left-color: #2D8E47; }
  .doc-chip.doc-letter  { border-left-color: #4A6FA5; }
  .doc-chip.doc-statute { border-left-color: #8B5CF6; }
  [data-theme="dark"] .doc-chip.doc-opinion,
  [data-theme="dark"] .doc-chip.doc-order { border-left-color: #5D7A00; }
  [data-theme="dark"] .doc-chip.doc-brief { border-left-color: rgba(229,231,235,0.4); }
  [data-theme="dark"] .doc-chip.doc-release { border-left-color: #54C277; }
  [data-theme="dark"] .doc-chip.doc-letter { border-left-color: #7A9AC8; }
  [data-theme="dark"] .doc-chip.doc-statute { border-left-color: #A78BFA; }
'''

# --- Per-tab Story of the Day blocks ----------------------------------------
def story_block(slug, headline, lead_meta_html, paragraphs):
    """paragraphs: list of HTML-ready paragraph strings (without <p> tags)."""
    ps = "\n".join(f"<p>{p}</p>" for p in paragraphs)
    return (f'<h2>Story of the Day · {headline}</h2>\n'
            f'<p class="story-meta">{lead_meta_html}</p>\n\n'
            f'{ps}\n')

STORIES = {}

# ---- LLM / Copyright -------------------------------------------------------
STORIES["llm-class-action"] = story_block(
    "llm-class-action",
    "Bartz final-approval window enters its median band",
    ('<strong>New in the last 24 hours.</strong> The customary 7–21 day post-fairness-hearing window in '
     '<em>Bartz v. Anthropic PBC</em>, 3:24-cv-05417 (N.D. Cal.) before Judge Araceli Martínez-Olguín has reached Day 10 — '
     'past the early-entry threshold and into the median band where final-approval orders are typically entered. '
     'No order on the docket as of this morning. '
     '<span class="src-tip"><a class="src-arrow" href="https://www.courtlistener.com/docket/?q=Bartz+v.+Anthropic&type=r" target="_blank" rel="noopener" aria-label="View source: CourtListener docket"><svg class="src" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5 L8.5 3.5 M5 3.5 L8.5 3.5 L8.5 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></a><span class="src-tooltip"><span class="src-tooltip-label">CourtListener — Bartz docket</span>Track the final-approval order and accompanying fee-petition ruling.</span></span>'),
    [
     "The arrival of the Bartz final-approval order will lock in the largest copyright class settlement in United States history and matters for four reasons that propagate across the rest of the AI training-data class action docket.",
     "<strong>First</strong>, the 92.77 percent claims rate effectively forecloses adequacy-of-notice objections on appeal, and the 350 valid opt-outs covering 1,802 works cap carve-out exposure to a footnote in the eventual judgment. Class counsel's downward revision of the fee request from 15 to 12.5 percent of the gross fund (yielding approximately $187.5 million plus $3 million in incurred expenses, an $18.22 million cost reserve, and $50,000 service awards to each of the three class representatives) eliminates the most-litigated objection category before the order even issues.",
     "<strong>Second</strong>, the $3,000-per-book settlement structure becomes the operative pricing comparator for every other AI training-data class action on the docket — <em>OpenAI</em> MDL, <em>Concord/UMG v. Anthropic</em>, <em>Disney v. Midjourney</em>, and any post-<em>Bartz</em> filings. Settlement administrators in those parallel matters will anchor settlement-negotiation models on the Bartz benchmark plus claims-rate adjustments rather than starting from a blank slate.",
     "<strong>Third</strong>, distribution mechanics begin running on entry. Claims-intake systems have been prepared for activation; the pooled fund with author-by-author allocation based on book counts in the Anthropic training corpus moves from theory to operational disbursement. AI-developer general counsel should prepare distribution communications and claims-intake systems in anticipation of Judge Martínez-Olguín's entry this coming week.",
     "<strong>Fourth</strong>, the seeding theory — already preserved post-<em>Bartz</em> in <em>Kadrey v. Meta</em> — becomes the live plaintiff-side theory of choice in cases where shadow-library acquisition is alleged. The <em>Elsevier v. Meta</em> 267 TB complaint (S.D.N.Y., filed May 5, eighteen days on the docket with no Meta response yet) provides the granular template for executive-knowledge discovery, and the Bartz entry order will materially reset settlement signaling in <em>Concord/UMG v. Anthropic</em> and parallel music-publisher matters.",
    ]
)

# ---- Crypto Insolvency -----------------------------------------------------
STORIES["crypto-insolvency"] = story_block(
    "crypto-insolvency",
    "BlockFills § 341 first-creditor meeting four days out",
    ('<strong>New in the last 24 hours.</strong> The <em>In re Reliz Technology Group Holdings, Inc.</em> (BlockFills) '
     '§ 341 meeting of creditors — the first opportunity for creditors to examine debtor representatives under oath on '
     'customer-property accounting — is calendared for Thursday, May 28 in the U.S. Bankruptcy Court for the District of '
     'Delaware. The court\'s first-day commingling concession ("customer funds were always commingled") frames every '
     'question on the agenda. '
     '<span class="src-tip"><a class="src-arrow" href="https://www.courtlistener.com/docket/?q=Reliz+Technology+Group&type=r" target="_blank" rel="noopener" aria-label="View source: CourtListener — BlockFills docket"><svg class="src" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5 L8.5 3.5 M5 3.5 L8.5 3.5 L8.5 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></a><span class="src-tooltip"><span class="src-tooltip-label">CourtListener — Reliz Technology Group docket</span>BlockFills docket entries; § 341 notice and trustee filings.</span></span>'),
    [
     "The May 28 § 341 examination matters for four reasons that propagate across the BlockFills docket and the broader crypto-insolvency customer-property frame.",
     "<strong>First</strong>, the commingling concession effectively concedes that customer claims will be treated as unsecured creditor claims under the <em>Celsius</em> / <em>Genesis</em> precedent stack rather than as segregated customer property entitled to priority recovery. The pivotal § 541 question (estate vs. customer property) collapses into a recovery-percentage question rather than a category dispute. Creditors should arrive prepared to examine the debtor's reconstruction of cash-versus-crypto flow and the timing of any pre-petition transfers between customer accounts and operating accounts.",
     "<strong>Second</strong>, the Dominion Capital adversary proceeding — currently freezing 70.6 BTC alleged to belong to Dominion — becomes the lead-case test for the boundary between segregated and commingled assets. A § 341 examination that reinforces the commingling concession effectively previews how the court will resolve the segregation versus commingling boundary for the broader customer base, and feeds directly into the customer-property ledger reconciliation the court ordered at first-day.",
     "<strong>Third</strong>, the § 341 transcript provides the operative record for subsequent § 503(b)(9) administrative-priority claims, fraudulent-transfer adversary proceedings under § 548, and preference-period analysis under § 547. Creditors with positions transferred within the 90-day or 1-year look-back windows should be filing notices of appearance to preserve their right to participate in those adversary proceedings.",
     "<strong>Fourth</strong>, the BlockFills outcome informs the <em>Bitcoin Depot</em> (Bankr. N.D. Ga., petition filed May 18) customer-property posture and the larger crypto-custody competitive set (Bitstop, Coin Cloud, RockItCoin). State AG enforcement convergence around the Massachusetts/Iowa template means surviving operators with similar customer-fund handling protocols should expect regulatory-tail risk pricing to elevate on the heels of BlockFills' segregation-question adjudication.",
    ]
)

# ---- Fraud Recovery --------------------------------------------------------
STORIES["fraud-recovery"] = story_block(
    "fraud-recovery",
    "Weekend quiet underscores the spring-investigation lag thesis",
    ('<strong>New in the last 24 hours.</strong> No qualifying SEC fraud complaint, asset-freeze order, federal receiver '
     'appointment, or trustee clawback filing surfaced on the wire over the May 22–23 weekend. The absence is itself data: '
     'the SEC\'s FY2025 enforcement disclosure earlier this month — Paramount Management Group ($400M / 2,700 investors) '
     'and First Liberty Building &amp; Loan ($140M / ~300 investors) the headline names — telegraphs a Q2/Q3 acceleration '
     'cluster that has not yet hit federal dockets. '
     '<span class="src-tip"><a class="src-arrow" href="https://www.sec.gov/spotlight/enf-actions-ponzi.shtml" target="_blank" rel="noopener" aria-label="View source: SEC Ponzi enforcement index"><svg class="src" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5 L8.5 3.5 M5 3.5 L8.5 3.5 L8.5 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></a><span class="src-tooltip"><span class="src-tooltip-label">SEC Ponzi Enforcement Index</span>Ongoing list of SEC Ponzi cases; useful baseline reference.</span></span>'),
    [
     "The pattern of weekend silence following an FY-year enforcement disclosure matters for four reasons that shape receiver-recovery and clawback-defense strategy through Q3.",
     "<strong>First</strong>, fraud-enforcement velocity typically lags underlying scheme detection by 18–24 months — the standard SEC/CFTC investigation cycle from suspicious-activity reporting through asset-freeze application. The May 2026 disclosure suggests the agency's spring investigation pipeline is loading rather than discharging; the Q3 disclosure cycle (typically pre-fiscal-year-end reporting) will likely surface the next cluster of complaints and freeze orders.",
     "<strong>Second</strong>, receivership practitioners should treat the current calendar quiet as a preparation window. The <em>Goliath Ventures</em> crypto-fraud receivership in Broward County Circuit Court (Florida) — the $328 million scheme anchoring the spring enforcement narrative — has a June 2 status report calendared, ten days out, that will refresh the asset-recovery baseline and signal whether clawback-motion phase begins on the standard 12–18 month post-appointment schedule.",
     "<strong>Third</strong>, the clawback-defense pipeline reaches its activation threshold roughly 12–18 months after receivership appointment. Investors who received returns above their net contribution from any scheme entering its second year of receivership — Goliath, Paramount, First Liberty — should be documenting investment basis and proof of loss now, while contemporaneous records remain accessible.",
     "<strong>Fourth</strong>, the litigation-funding market for clawback recovery remains structurally bid. Burford Capital (the NYSE-listed sector proxy), Longford Capital, Parabellum Capital, and Omni Bridgeway continue deploying capital in receiver-led dockets, and the dry-powder accumulation through the spring quiet will pressure receivers in the maturing pipeline (Goliath, Paramount, First Liberty) toward early clawback-motion engagement to absorb committed capital.",
    ]
)

# ---- $1B+ Class Actions ----------------------------------------------------
STORIES["billion-dollar-class-actions"] = story_block(
    "billion-dollar-class-actions",
    "MDL 1720 final-approval hearing 24 days out",
    ('<strong>New in the last 24 hours.</strong> Final-approval hearing in <em>In re Payment Card Interchange Fee and '
     'Merchant Discount Antitrust Litigation</em>, MDL 1720 (E.D.N.Y.), is calendared for June 17, 2026 at 11:00 a.m. '
     'before U.S. District Judge Brian M. Cogan — 24 days from today. Substantive objections from the National Retail '
     'Federation, National Association of Convenience Stores, National Restaurant Association, Walmart, and Hugo Boss '
     'remain preserved on the 10-bps / 1.25%-rate-cap thesis from the April 29 objection deadline. '
     '<span class="src-tip"><a class="src-arrow" href="https://www.courtlistener.com/docket/?q=MDL+1720+Payment+Card+Interchange&type=r" target="_blank" rel="noopener" aria-label="View source: CourtListener — MDL 1720 docket"><svg class="src" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5 L8.5 3.5 M5 3.5 L8.5 3.5 L8.5 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></a><span class="src-tooltip"><span class="src-tooltip-label">CourtListener — MDL 1720</span>Payment Card Interchange Fee and Merchant Discount Antitrust Litigation docket.</span></span>'),
    [
     "Judge Cogan's coming ruling matters for four reasons that propagate across the antitrust mega-settlement cycle and the parallel mass-arbitration tracks now consolidated under this tab.",
     "<strong>First</strong>, the revised settlement covers approximately 12 million U.S. merchants and is positioned to end 21 years of litigation. The headline 10-basis-point interchange reduction over five years and the 1.25 percent rate cap over eight years on standard consumer credit transactions sit against estimated $13–15 billion-per-annum overcharges — and objection counsel will press whether the relief is structurally too narrow against that baseline.",
     "<strong>Second</strong>, distribution mechanics post-approval run on a 90–120 day window. Merchant interested parties should review pro-rata recovery models against the headline rate-cap structure and prepare claim-filing infrastructure for activation upon entry of final judgment, since the claims window will open promptly and small-merchant participation rates historically track to the first 90 days of notice.",
     "<strong>Third</strong>, the <em>Roundup</em> MDL fairness hearing on July 9 (seven weeks from MDL 1720) and the Keller Postman Google advertiser mass-arbitration first AAA wave on June 23 ($218 billion aggregate) sit on the same Q3 calendar. Judge Cogan's ruling on a sister mega-settlement will inform settlement-administrator and defense-counsel expectations for both — particularly on the \"adequacy of relief vs. statutory ceiling\" framing the merchant objectors are pressing.",
     "<strong>Fourth</strong>, the <em>Bartz v. Anthropic</em> final-approval order (N.D. Cal., pending entry in the same May 25–early June band) will lock in the $3,000-per-book benchmark for the AI copyright track; <em>Purdue Pharma</em> plan implementation reaches its second Sackler tranche ($500 million) on Wednesday, May 27. Three of the four largest active mega-deals on the docket sit within a 25-day funding window — a cycle that will reset the 2026 aggregate settlement record against the 2025 top-10 baseline of $79 billion.",
    ]
)

# ---- Bankruptcy Creditor Rights --------------------------------------------
STORIES["bankruptcy-creditor-rights"] = story_block(
    "bankruptcy-creditor-rights",
    "Purdue tranche 2 ($500M Sackler) funds Wednesday May 27",
    ('<strong>New in the last 24 hours.</strong> The second tranche of Sackler family payments under the '
     '<em>In re Purdue Pharma L.P.</em> (Bankr. S.D.N.Y. 19-50026) amended Chapter 11 plan — $500 million — is calendared '
     'to fund Wednesday, May 27, three days from today. The funding closes the second of approximately $3.3 billion in '
     'Sackler transfers scheduled over four years under the post-<em>Harrington v. Purdue Pharma</em> plan structure. '
     '<span class="src-tip"><a class="src-arrow" href="https://restructuring.ra.kroll.com/purduepharma/" target="_blank" rel="noopener" aria-label="View source: Kroll Purdue claims agent"><svg class="src" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5 L8.5 3.5 M5 3.5 L8.5 3.5 L8.5 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></a><span class="src-tooltip"><span class="src-tooltip-label">Kroll Restructuring — Purdue Claims Agent</span>Plan documents, distribution mechanics, and claimant notice page.</span></span>'),
    [
     "The May 27 funding matters for four reasons that propagate across the broader claims-distribution architecture and the post-<em>Purdue</em> creditor-rights doctrine.",
     "<strong>First</strong>, the amended plan structure — confirmed April 10, 2026 and effective May 1 — eliminates nonconsensual releases for the Sackler family as non-debtors (per <em>Harrington</em>) but preserves narrow releases for Purdue insiders acting as plan fiduciaries and settlement administrators. The May 27 tranche flows under this constrained release architecture; holders of allowed claims should confirm funding-account details ahead of disbursement and monitor for any motion practice raising the personal-injury vs. governmental-claims hierarchy dispute that remains active before the court.",
     "<strong>Second</strong>, the funding cadence — $500 million on May 27, then $500 million each in May 2027 and May 2028, capping at $400 million in May 2029 — sets the operative cash-flow profile for opioid-claimant trusts and state and local governmental entities receiving the first-tranche distributions. Plan administrators in adjacent mass-tort restructurings (<em>Red River Talc</em> on its Fifth Circuit appeal track; J&amp;J's $9+ billion aggregate talc settlement framework outside bankruptcy) will model their own multi-year settlement-payment architecture against the Purdue benchmark.",
     "<strong>Third</strong>, the Delaware District Court's <em>Crédito Real</em> Chapter 15 decision (Chief Judge Connolly, affirmed March 31) — holding that <em>Harrington</em> does not extend to Chapter 15 recognition of foreign-plan nonconsensual third-party releases — remains the first appellate-level workaround to <em>Purdue</em>. The Purdue payment cadence proceeding on schedule reinforces the policy distinction Connolly drew between domestic Chapter 11 confirmation standards and cross-border Chapter 15 comity. Expect a cert petition to the Supreme Court by late 2026 if the Second, Third, Ninth, or Eleventh Circuits split on the question.",
     "<strong>Fourth</strong>, the <em>Cook v. Chapter 13 Trustee</em> Fourth Circuit decision (No. 25-1048, Apr. 27, 2026, en banc petition deadline now twenty-two days out) narrows equitable mootness as a confirmation-order shield. Creditors in adjacent Chapter 11 plan-implementation tracks now have stronger appellate leverage to challenge confirmation orders — and the Purdue plan, which carried significant creditor-objection pressure through confirmation, will be watched for any second-tranche-related appellate activity if creditor groups perceive disparate treatment in the distribution methodology.",
    ]
)

# --- Per-tab storyline doc-chip mappings ------------------------------------
# {storyline-item <strong> label: (type, href, chip_label)}
CHIPS_BY_TAB = {
    "llm-class-action": {
        "Fairness hearing held May 14":
            ("opinion", "https://www.courtlistener.com/docket/?q=Bartz+v.+Anthropic&type=r",
             "Bartz v. Anthropic · N.D. Cal. docket"),
        "91.3% claims rate":
            ("release", "https://www.authorsalliance.org/2026/05/14/bartz-v-anthropic-fairness-hearing-final-reminder-91-3-claims-rate-and-updates-from-the-docket/",
             "Authors Alliance — claims rate update"),
        "Fee cut to 12.5%":
            ("brief", "https://www.courtlistener.com/docket/?q=Bartz+v.+Anthropic+Dkt+646&type=r",
             "Proposed Order Dkt. 646-1 (fees)"),
        "Three reply objections":
            ("brief", "https://www.courtlistener.com/docket/?q=Bartz+v.+Anthropic+objection&type=r",
             "Reply objections · Bartz docket"),
        "Thomson Reuters v. ROSS":
            ("brief", "https://www.courtlistener.com/docket/?q=Thomson+Reuters+v.+ROSS+Intelligence&type=r",
             "Thomson Reuters v. ROSS · 3d Cir. docket"),
        "Elsevier v. Meta":
            ("brief", "https://publishers.org/wp-content/uploads/2026/05/2026-05-05-Complaint.pdf",
             "Elsevier v. Meta · Complaint (PDF)"),
        "Disney v. Midjourney":
            ("brief", "https://www.courtlistener.com/docket/?q=Disney+v.+Midjourney&type=r",
             "Disney v. Midjourney · C.D. Cal. docket"),
        "OpenAI MDL":
            ("order", "https://news.bloomberglaw.com/ip-law/openai-must-turn-over-20-million-chatgpt-logs-judge-affirms",
             "S.D.N.Y. Order — 20M ChatGPT logs"),
        "Concord v. Anthropic":
            ("brief", "https://www.courtlistener.com/docket/?q=Concord+Music+v.+Anthropic&type=r",
             "Concord v. Anthropic · C.D. Cal. docket"),
    },
    "crypto-insolvency": {
        '&quot;Always commingled&quot; conceded':
            ("brief", "https://www.courtlistener.com/docket/?q=Reliz+Technology+Group&type=r",
             "BlockFills first-day pleadings · D. Del."),
        '"Always commingled" conceded':
            ("brief", "https://www.courtlistener.com/docket/?q=Reliz+Technology+Group&type=r",
             "BlockFills first-day pleadings · D. Del."),
        "Customers go unsecured":
            ("order", "https://www.courtlistener.com/docket/?q=Reliz+Technology+Group&type=r",
             "First-day customer-property order · D. Del."),
        "UCC seated, FTI retention May 28":
            ("brief", "https://www.courtlistener.com/docket/?q=Reliz+Technology+Group+FTI&type=r",
             "FTI Retention Application · D. Del."),
        "Cleary ad-hoc group quiet":
            ("brief", "https://www.courtlistener.com/docket/?q=Reliz+Technology+Group+ad+hoc&type=r",
             "Ad-hoc group filings · D. Del."),
        "Examiner question live":
            ("brief", "https://www.courtlistener.com/docket/?q=Reliz+Technology+Group+examiner&type=r",
             "Examiner motion practice · D. Del."),
        "$3.2B aggregate exposure":
            ("brief", "https://www.courtlistener.com/docket/?q=Genesis+Global+DCG&type=r",
             "Genesis Global v. DCG · S.D.N.Y. docket"),
        "Prince Group recognition pending":
            ("brief", "https://www.courtlistener.com/?q=Prince+Group+Chapter+15&type=r",
             "Prince Group Chapter 15 · CourtListener"),
        "Four names on 2026 watchlist":
            ("release", "https://www.coindesk.com/markets/2026/05/18/bitcoin-depot-once-north-america-s-largest-bitcoin-atm-operator-files-for-bankruptcy",
             "CoinDesk · 2026 crypto-distress watchlist"),
    },
    "fraud-recovery": {
        "Bar date extended to September 30":
            ("order", "https://www.browardclerk.org/Web2/CaseSearch/",
             "Broward Cir. Ct. · Goliath receivership docket"),
        "Wealth MD $141K clawback":
            ("brief", "https://www.browardclerk.org/Web2/CaseSearch/",
             "Goliath clawback motion · Broward Cir. Ct."),
        "Delgado apology":
            ("letter", "https://www.browardclerk.org/Web2/CaseSearch/",
             "Goliath receiver filings · Broward Cir. Ct."),
        "$400M Ponzi advancing":
            ("release", "https://www.sec.gov/newsroom/press-releases/2026-34",
             "SEC FY25 Enforcement Press Release"),
        "Woodcock transition May 4":
            ("release", "https://www.sec.gov/newsroom/press-releases",
             "SEC Newsroom · agency announcements"),
        "Five new May filings":
            ("release", "https://www.sec.gov/spotlight/enf-actions-ponzi.shtml",
             "SEC Ponzi Enforcement Index"),
        "Standard playbook holding":
            ("release", "https://www.sec.gov/spotlight/enf-actions-ponzi.shtml",
             "SEC Ponzi Enforcement Index"),
        "FTX distributions ahead of plan":
            ("release", "https://www.coindesk.com/business/2026/01/14/ftx-estate-sets-next-creditor-payout-date-as-genesis-digital-assets-fights-usd1-billion-clawback-suit",
             "FTX Recovery Trust — distribution schedule"),
    },
    "billion-dollar-class-actions": {
        "BCBS Subscriber $2.67B":
            ("release", "https://www.bcbssettlement.com/",
             "BCBS Antitrust Settlement · JND notice site"),
        "Bartz $1.5B fairness hearing":
            ("opinion", "https://www.courtlistener.com/docket/?q=Bartz+v.+Anthropic&type=r",
             "Bartz v. Anthropic · N.D. Cal. docket"),
        "Purdue/Sackler $7.4B effective":
            ("order", "https://restructuring.ra.kroll.com/purduepharma/",
             "Purdue Plan & Effective Date · Kroll"),
        "Visa/Mastercard ~$38B":
            ("brief", "https://www.courtlistener.com/docket/?q=MDL+1720+Payment+Card+Interchange&type=r",
             "MDL 1720 final-approval briefs · CourtListener"),
        "Bayer Roundup $7.25B":
            ("order", "https://www.courtlistener.com/docket/?q=Roundup+MDL+2741&type=r",
             "Roundup MDL 2741 · N.D. Cal. docket"),
        "Duane Morris top-10 at $79B":
            ("release", "https://www.duanemorris.com/site/duane_morris_class_action_review.html",
             "Duane Morris Class Action Review 2026"),
        "Cornerstone median high":
            ("release", "https://www.cornerstone.com/insights/research-reports/securities-class-action-settlements-2025-review-and-analysis/",
             "Cornerstone Securities Settlement Review 2025"),
    },
    "bankruptcy-creditor-rights": {
        "Cook v. Chapter 13 Trustee":
            ("opinion", "https://www.ca4.uscourts.gov/opinions/published",
             "4th Cir. Opinions · Cook v. Trustee"),
        "SDNY Chapter 15 workaround":
            ("opinion", "https://www.mayerbrown.com/en/insights/publications/2026/05/district-court-confirms-nonconsensual-third-party-releases-survive-purdue-pharma-in-chapter-15",
             "Crédito Real opinion · Mayer Brown analysis"),
        "Delaware gatekeeper rejected":
            ("opinion", "https://www.pillsburylaw.com/en/news-and-insights/us-bankruptcy-court-nonconsensual-third-party-releases-chapter15-bankruptcy-code.html",
             "Crédito Real · Pillsbury analysis"),
        "9th v. 5th Cir. split widens":
            ("opinion", "https://www.dechert.com/knowledge/re-torts/2026/2/second-circuit-to-address-opt-out-third-party-releases-post-purd.html",
             "Circuit-split tracker · Dechert"),
        "Plan effective May 1":
            ("order", "https://restructuring.ra.kroll.com/purduepharma/",
             "Purdue Plan Effective-Date Notice · Kroll"),
        "Red River Talc on appeal":
            ("brief", "https://www.courtlistener.com/?q=Red+River+Talc&type=r",
             "Red River Talc · 5th Cir. docket"),
        "Serta trial sliding":
            ("order", "https://www.courtlistener.com/?q=Serta+Simmons+uptier&type=r",
             "Serta Simmons · S.D. Tex. trial-date order"),
        "S. 3977 in Senate Judiciary":
            ("statute", "https://www.congress.gov/bill/119th-congress/senate-bill/3977",
             "S. 3977 · Congress.gov"),
    },
}

# --- Patch function ----------------------------------------------------------
def patch(tab_slug, fp):
    with open(fp) as f:
        h = f.read()

    # 1. Replace "Today at a Glance" + all subsequent advisory-body content
    #    (Analysis, Recommended Actions, sub-sections) with Story of the Day.
    #    Match from <h2>Today at a Glance</h2> up to (but not including) the
    #    closing </div> of advisory-body.
    story = STORIES[tab_slug]
    pattern = r'<h2>Today at a Glance</h2>.*?(?=\s*</div>\s*\n\s*</div>\s*</article>)'
    new, n = re.subn(pattern, story, h, count=1, flags=re.DOTALL)
    if n != 1:
        print(f"  [{tab_slug}] ERR: Today-at-a-Glance replacement matched {n} times")
    h = new

    # 2. Embed doc chips into storyline items.
    chip_count = 0
    for label, (typ, href, ctext) in CHIPS_BY_TAB[tab_slug].items():
        c = chip(typ, href, ctext)
        # Pattern: <strong>LABEL</strong>...<em>...</em></div></li>
        # Inject before </div></li>.
        pattern = rf'(<strong>{re.escape(label)}</strong>.*?</em>)(</div></li>)'
        def repl(m, ch=c):
            return m.group(1) + f'<div class="item-doc">{ch}</div>' + m.group(2)
        new, n = re.subn(pattern, repl, h, flags=re.DOTALL)
        if n >= 1:
            h = new
            chip_count += n

    # 3. Add CSS block (only once per file). Insert just before "/* === Arrow
    #    size hard cap" if it exists, else before </style>.
    if "/* === Story of the Day lead-meta line === */" not in h:
        anchor = "/* === Arrow size hard cap"
        if anchor in h:
            h = h.replace(anchor, CSS_BLOCK + "\n  " + anchor, 1)
        else:
            h = h.replace("</style>", CSS_BLOCK + "\n</style>", 1)

    with open(fp, "w") as f:
        f.write(h)
    print(f"  [{tab_slug}] story replaced, {chip_count} chips embedded.")

# --- Run --------------------------------------------------------------------
if __name__ == "__main__":
    for slug, fp in DASHBOARDS.items():
        if not fp.exists():
            print(f"  [{slug}] MISSING: {fp}")
            continue
        patch(slug, fp)
    print("Done.")
