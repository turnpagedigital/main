/* Top 12 active AI copyright cases — pulled from ai_ip_litigation_tracker.xlsx
   "Ranked by Alleged Damages" sheet. Edit this file to update the cases page. */

export const TOP_CASES = [
  {
    rank: 1,
    name: "In re OpenAI Copyright Infringement Litigation",
    citation: "MDL No. 3143",
    defendants: "OpenAI; Microsoft",
    plaintiffs: "Authors Guild, NYT, Daily News, CIR, others",
    court: "S.D.N.Y. (Stein, J.)",
    status: "Active",
    statusColor: "active",
    damages: "Statutory: trillions theoretical",
    summary:
      "Consolidated multi-district litigation covering NYT v. OpenAI, the Authors Guild class, and a dozen other newspaper and author plaintiffs. Discovery includes the 20-million ChatGPT log production order and Books1/Books2 spoliation inquiry. Summary judgment briefing expected mid-2026.",
  },
  {
    rank: 2,
    name: "Bartz v. Anthropic PBC",
    citation: "N.D. Cal.",
    defendants: "Anthropic",
    plaintiffs: "Andrea Bartz, Charles Graeber, Kirk Wallace Johnson",
    court: "N.D. Cal. (Alsup, J.)",
    status: "Settled — $1.5B",
    statusColor: "settled",
    damages: "$1.5B class settlement; ~$3,000 per work",
    summary:
      "The largest copyright settlement in U.S. history. 91.3% claim rate (440,490 of 482,460 eligible works). Second $300M installment due April 30, 2026. Fairness hearing May 14, 2026 at 2:00 PT (Zoom available). Establishes the training-vs-retention split on fair use.",
  },
  {
    rank: 3,
    name: "Doe 1 v. GitHub, Inc.",
    citation: "N.D. Cal.",
    defendants: "GitHub; Microsoft; OpenAI",
    plaintiffs: "Anonymous software developers (proposed class)",
    court: "N.D. Cal. (Tigar, J.)",
    status: "On appeal",
    statusColor: "active",
    damages: "$9B+ DMCA statutory estimated",
    summary:
      "First AI-related class action (Nov 2022). DMCA §1202 claims against Copilot training. Copyright counts dismissed; DMCA and contract claims survived in part. Now on Ninth Circuit appeal. Implications for any open-source-trained model.",
  },
  {
    rank: 4,
    name: "Getty Images v. Stability AI",
    citation: "D. Del.",
    defendants: "Stability AI",
    plaintiffs: "Getty Images (US) Inc.",
    court: "D. Del. (Bibas, J.)",
    status: "Active",
    statusColor: "active",
    damages: "Up to $1.7B (11,383 works × $150K)",
    summary:
      "Stock-image plaintiff alleges 12M+ images used to train Stable Diffusion. Amended complaint specifies 11,383 registered works for statutory damages. Trademark and watermark-removal claims add layered exposure. Discovery ongoing.",
  },
  {
    rank: 5,
    name: "UMG Recordings et al. v. Suno, Inc.",
    citation: "D. Mass.",
    defendants: "Suno",
    plaintiffs: "Sony, UMG, Warner (RIAA-coordinated)",
    court: "D. Mass. (Saylor, J.)",
    status: "Active",
    statusColor: "active",
    damages: "Up to $150K per sound recording",
    summary:
      "Major-label copyright infringement suit over alleged training on millions of copyrighted sound recordings. Fair use defense expected to track the Concord v. Anthropic framework. Companion to the Udio case.",
  },
  {
    rank: 6,
    name: "UMG Recordings et al. v. Uncharted Labs (Udio)",
    citation: "S.D.N.Y.",
    defendants: "Uncharted Labs (Udio)",
    plaintiffs: "Sony, UMG, Warner (RIAA-coordinated)",
    court: "S.D.N.Y. (Hellerstein, J.)",
    status: "Settled (UMG, WMG)",
    statusColor: "settled",
    damages: "Undisclosed; licensing component",
    summary:
      "UMG settled October 2025; Warner settled November 2025 — both with licensing deals supporting Udio's new opt-in subscription. Sony case remains active. Establishes licensing-and-settlement template for AI music generators.",
  },
  {
    rank: 7,
    name: "Disney Enterprises et al. v. Midjourney",
    citation: "C.D. Cal.",
    defendants: "Midjourney",
    plaintiffs: "Disney, Marvel, Lucasfilm, 20th Century, Universal",
    court: "C.D. Cal. (Anderson, J.)",
    status: "Active",
    statusColor: "active",
    damages: "Damages + injunction sought",
    summary:
      "Hollywood studios target image-generation outputs that reproduce protected characters. Disney's parallel $1B OpenAI Sora deal (200+ characters licensed) sets a market comparator. Companion suits against Minimax (Hailuo) and others.",
  },
  {
    rank: 8,
    name: "Concord Music Group et al. v. Anthropic",
    citation: "N.D. Cal.",
    defendants: "Anthropic",
    plaintiffs: "UMG, Concord, ABKCO, other major music publishers",
    court: "N.D. Cal. (Lee, J.); transferred from M.D. Tenn.",
    status: "Active",
    statusColor: "active",
    damages: "Up to $150K per work; potential billions",
    summary:
      "Music-publisher fair-use battleground. CCIA, AI Progress, and NetChoice filed amicus supporting Anthropic; RIAA and NMPA filed amicus opposing. Cross-MSJ filed April 22; hearing on May calendar. Companion January 2026 complaint adds $3.1B in statutory exposure.",
  },
  {
    rank: 9,
    name: "Advance Local Media v. Cohere",
    citation: "S.D.N.Y.",
    defendants: "Cohere",
    plaintiffs: "Condé Nast, Advance Local Media, other news cos.",
    court: "S.D.N.Y. (McMahon, J.)",
    status: "Active",
    statusColor: "active",
    damages: "Unspecified",
    summary:
      "Publisher coalition led by Condé Nast targets RAG-style content scraping. MTD denied November 2025; the resulting 'substitutive summaries' doctrine is now being cited across the OpenAI MDL as output-side infringement precedent.",
  },
  {
    rank: 10,
    name: "Andersen v. Stability AI et al.",
    citation: "N.D. Cal.",
    defendants: "Stability AI; Midjourney; DeviantArt; Runway AI",
    plaintiffs: "Sarah Andersen, Kelly McKernan, Karla Ortiz, Greg Rutkowski, others",
    court: "N.D. Cal. (Orrick, J.)",
    status: "Active",
    statusColor: "active",
    damages: "Up to $150K per work (class)",
    summary:
      "Visual-artists class action. Core claims survived August 2024 motions. DMCA §1202, right of publicity, and Lanham Act claims all surviving. Discovery now in dispute — defendants' RLHF training disclosures are a live battleground.",
  },
  {
    rank: 11,
    name: "GEMA v. OpenAI",
    citation: "Germany",
    defendants: "OpenAI LLC; OpenAI Ireland Ltd.",
    plaintiffs: "GEMA (German music rights society — 95,000+ composers)",
    court: "LG München I (Reinhardt, J.)",
    status: "Judgment for plaintiff (Nov 2025)",
    statusColor: "settled",
    damages: "Hundreds of thousands of euros + injunction",
    summary:
      "First European AI copyright ruling on the merits. Court held that memorization plus output of song lyrics constitutes infringement; rejected the TDM exception for generative-AI training. Influential template for EU-wide enforcement.",
  },
  {
    rank: 12,
    name: "Getty Images v. Stability AI (UK)",
    citation: "England & Wales",
    defendants: "Stability AI Limited",
    plaintiffs: "Getty Images (US, Ireland, UK)",
    court: "High Court (Smith, J.)",
    status: "Judgment (Nov 2025)",
    statusColor: "settled",
    damages: "Reduced after claims narrowing",
    summary:
      "First UK AI copyright ruling. Held that AI model weights are not 'infringing copies' under CDPA, narrowing the primary copyright theory. Trademark and database rights claims survived. Now on appeal — outcome will frame UK and CJEU litigation alike.",
  },
];

export const FEATURED_NEW = {
  name: "Concord/UMG v. Anthropic II",
  citation: "N.D. Cal., filed January 2026",
  damages: "$3.1B statutory ceiling (20,517 works × $150K)",
  summary:
    "Second music-publisher complaint against Anthropic, focused on alleged BitTorrent piracy of 20,517+ musical compositions from shadow libraries. Adds Dario Amodei and Benjamin Mann as individual defendants.",
};

/* Status badge color mapping */
export const STATUS_COLORS = {
  active: { bg: "rgba(212,255,0,0.12)", border: "rgba(212,255,0,0.4)", text: "#D4FF00" },
  settled: { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.25)", text: "#fff" },
};
