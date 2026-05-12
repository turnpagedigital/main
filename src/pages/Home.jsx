import React from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import StatStrip from "../components/StatStrip.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import SubBrandTile from "../components/SubBrandTile.jsx";
import Comparison from "../components/Comparison.jsx";
import FAQ from "../components/FAQ.jsx";
import CaseChipRow from "../components/CaseChipRow.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

const STATS = [
  { value: "$1B+",  label: "In claims liquidated across class actions, bankruptcies, and complex litigation" },
  { value: "500+",  label: "Financial institutions on speed dial for competitive bids" },
  { value: "<48h",  label: "From inquiry to a serious response on most claims" },
  { value: "2018",  label: "Founded to serve rights holders the markets overlook" },
];

const OLD_WAY = {
  title: "Wait years. Take whatever comes.",
  items: [
    "Distributions stretched across multi-year court timelines.",
    "Pricing opaque — you have no idea what your claim is worth today.",
    "DIY outreach to a handful of buyers, all bidding for themselves.",
    "Bespoke documentation, contingent payouts, surprise carve-outs.",
    "Tax and timing decisions left until the last moment.",
  ],
};
const NEW_WAY = {
  title: "Liquidate in days. On your terms.",
  items: [
    "All-cash bids today — convert a contingent recovery into capital.",
    "Competitive auction across 500+ institutional buyers.",
    "Transparent pricing, benchmarked against the broader market.",
    "Standardized documentation. Days to close, not months.",
    "Tax-aware structuring and counsel introductions built in.",
  ],
};

const FAQS = [
  {
    q: "What is Turnpage Digital Markets?",
    a: [
      "We are the institutional OTC desk for rights holders — individuals and institutions with claims to compensation across class actions, bankruptcies, and complex litigation.",
      "We bring competitive capital and lifecycle advisory to a market that historically only worked for the largest creditors. Founded 2018; over $1B in claims transacted.",
    ],
  },
  {
    q: "What types of claims do you buy?",
    a: "Today we are most active in AI copyright (Bartz, the OpenAI MDL, Concord, Getty, and adjacent matters) and crypto bankruptcy claims (FTX, Celsius, BlockFi, Voyager). We also work on Chapter 11 trade claims, mass-tort settlements, and other complex litigation — speak with a partner about your specific matter.",
  },
  {
    q: "How does pricing work?",
    a: "We run a competitive process across our network of 500+ institutional buyers. You see real bids from real counterparties. We earn a market-clearing spread on each transaction; you keep the rest. No upfront retainers, no hidden fees.",
  },
  {
    q: "How fast can you close?",
    a: "On simple, well-documented claims, days. On complex matters — multi-party catalogues, contested filings, or transfers requiring court approval — we plan against the relevant docket. Either way, we move on your timeline, not the docket's.",
  },
  {
    q: "Is this advice?",
    a: "No. Information on this site is general in nature and is not legal, tax, or investment advice. We will, however, introduce you to counsel and tax professionals when a matter requires them — and structure any transaction we lead to be transparent about every economic moving part.",
  },
];

export default function Home() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section style={{
        position: "relative", overflow: "hidden",
        minHeight: "calc(100vh - 100px)",
        display: "flex", alignItems: "center",
        padding: "clamp(3rem,6vh,5rem) clamp(1.5rem,5vw,4rem) clamp(3.5rem,7vh,6rem)",
      }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.28) contrast(1.1)" }} />
        </div>
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, opacity: 0.06, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.95) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "radial-gradient(45% 60% at 85% 0%, rgba(212,255,0,0.10), transparent 60%), radial-gradient(40% 50% at 0% 100%, rgba(212,255,0,0.05), transparent 70%)",
        }} />

        <div className="container" style={{ position: "relative", zIndex: 10, maxWidth: 1080 }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", color: NEON, marginBottom: "1.4rem",
          }}>
            OTC Claims Desk · Established 2018
          </p>
          <h1 className="hero-title-xl" style={{
            fontFamily: FONT, fontWeight: 900, fontSize: "clamp(2.4rem,6vw,4.6rem)",
            lineHeight: 1.02, letterSpacing: "-0.025em", color: "#fff",
            marginBottom: "1.5rem", maxWidth: 960,
          }}>
            The OTC desk for{" "}
            <span style={{ color: NEON, fontStyle: "italic" }}>rights holders.</span>
          </h1>
          <p className="hero-sub-xl" style={{
            fontFamily: FONT, fontSize: "clamp(1.1rem,1.7vw,1.4rem)", fontWeight: 400,
            lineHeight: 1.5, color: "rgba(255,255,255,0.82)", maxWidth: 780,
            marginBottom: "2.2rem",
          }}>
            Capital and advisory for individuals and institutions with claims to compensation —
            across the largest class actions, bankruptcies, and complex litigation in the world.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", marginBottom: "3rem" }}>
            <a href={hashHref("contact")} className="btn-neon">Talk to a Partner</a>
            <a href={hashHref("ai-copyright")} className="btn-ghost">Explore AI Copyright</a>
          </div>

          {/* Hero stat strip — sits just below the CTA, gives credibility above the fold */}
          <div style={{ maxWidth: 980 }}>
            <StatStrip items={STATS} theme="dark" />
          </div>
        </div>
      </section>

      {/* ─── CASES WE COVER (chip row on dark) ─── */}
      <section className="surface-dark" style={{ padding: "clamp(2rem,4vw,3rem) clamp(1.5rem,5vw,4rem) clamp(2.5rem,5vw,4rem)" }}>
        <div className="container">
          <CaseChipRow
            label="Cases & estates we cover"
            theme="dark"
            items={[
              "Bartz v. Anthropic",
              "OpenAI MDL",
              "Concord v. Anthropic",
              "Getty v. Stability",
              "Andersen v. Stability",
              "UMG v. Suno / Udio",
              "Disney v. Midjourney",
              "FTX",
              "Celsius",
              "BlockFi",
              "Voyager",
              "Chapter 11 trade claims",
            ]}
          />
        </div>
      </section>

      {/* ─── SUB-BRAND GRID (light) ─── */}
      <section className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Where We Work"
            title="One desk."
            accent="Every claim type."
            kicker="Three sub-brands organized by where the action is. AI Copyright is the front line. Crypto is live. Bankruptcy and complex litigation is the original book."
          />
          <div className="grid-3col" style={{ alignItems: "stretch" }}>
            <SubBrandTile
              variant="featured"
              tag="Featured"
              number="01"
              title="AI Copyright"
              body="Capital and advisory for authors, music publishers, news organizations, and visual artists with claims against generative AI companies."
              bullets={[
                "Bartz, OpenAI MDL, Concord, Getty, Disney v. Midjourney",
                "Class-member purchases & opt-out economics",
                "Strategy across U.S., UK, EU, and Germany",
              ]}
              href={hashHref("ai-copyright")}
              cta="Explore the AI Copyright desk →"
            />
            <SubBrandTile
              variant="live"
              tag="Live"
              number="02"
              title="Crypto Claims"
              body="Liquidity for creditors holding claims in major crypto bankruptcies — from FTX and Celsius to BlockFi, Voyager, and beyond."
              bullets={[
                "Single-creditor and bulk-fund dispositions",
                "All-cash close, fiat settlement",
                "Tax-basis-aware structuring",
              ]}
              href={hashHref("crypto")}
              cta="Explore the Crypto desk →"
            />
            <SubBrandTile
              variant="soon"
              tag="By Conversation"
              number="03"
              title="Bankruptcy & Complex Litigation"
              body="The original Turnpage book of business — Chapter 11 trade claims, mass-tort settlements, and bespoke complex matters."
              bullets={[
                "Chapter 11 trade claim purchases",
                "Mass-tort settlement liquidity",
                "Direct underwrite for unusual claims",
              ]}
              href={hashHref("contact")}
              cta="Speak to a partner →"
            />
          </div>
        </div>
      </section>

      {/* ─── COMPARISON — Old way vs Turnpage way ─── */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Why Turnpage"
            title="Time kills claims."
            accent="We save both."
            kicker="The market for claims has worked for institutional creditors for decades. We bring the same machinery to everyone else."
          />
          <Comparison oldWay={OLD_WAY} newWay={NEW_WAY} />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="How It Works"
            title="Three steps."
            accent="Days, not years."
            kicker="No retainers, no obligation. We sign an NDA, diligence the matter, and come back with terms."
          />
          <div className="grid-3col">
            <Step n="01" title="Tell us about your claim" body="Share the basics — what type of claim, against whom, what stage. We sign an NDA and start diligence." />
            <Step n="02" title="We assess and structure a bid" body="We tap our 500+ institutional buyers for competitive pricing and structure terms that fit your timeline and tax posture." />
            <Step n="03" title="We close" body="Documentation, transfer mechanics, settlement — handled end-to-end. Most claims close in days." />
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="surface-paper-2 section-pad">
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: "clamp(2rem, 6vw, 5rem)", alignItems: "start",
          }} className="faq-layout">
            <div>
              <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>FAQ</p>
              <h2 className="h-section" style={{ marginBottom: "1rem" }}>
                Questions, <span className="accent-light">answered.</span>
              </h2>
              <p style={{
                fontFamily: FONT, fontSize: "1rem", color: INK_60,
                lineHeight: 1.65, marginBottom: "1.4rem",
              }}>
                What we hear most often from new counterparties. If your question isn't here, send it.
              </p>
              <a href={hashHref("contact")} className="btn-ghost-ink">Ask a Question</a>
            </div>
            <div>
              <FAQ items={FAQS} />
            </div>
          </div>
          <style>{`
            @media (max-width: 880px) {
              .faq-layout { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
            }
          `}</style>
        </div>
      </section>

      {/* ─── BOTTOM CTA ─── */}
      <BottomCTA
        eyebrow="Ready to talk?"
        title="Hold a claim?"
        accent="Talk to us."
        kicker="We respond to every inquiry within 48 hours. Confidentiality assured."
        primary={{ label: "Get in Touch", href: hashHref("contact") }}
        secondary={{ label: "Read the Briefings", href: hashHref("briefings") }}
      />
    </>
  );
}

function Step({ n, title, body }) {
  return (
    <div className="card-light" style={{ position: "relative" }}>
      <p style={{
        fontFamily: FONT, fontWeight: 900, fontSize: "0.85rem",
        color: NEON, background: INK, padding: "0.25rem 0.55rem",
        borderRadius: 4, display: "inline-block",
        letterSpacing: "0.16em", marginBottom: "1rem",
      }}>
        Step {n}
      </p>
      <h3 style={{
        fontFamily: FONT, fontSize: "1.2rem", fontWeight: 800, color: INK,
        marginBottom: "0.6rem", letterSpacing: "-0.01em", lineHeight: 1.25,
      }}>
        {title}
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.95rem", color: INK_60, lineHeight: 1.6 }}>
        {body}
      </p>
    </div>
  );
}
