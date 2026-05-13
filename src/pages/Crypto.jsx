import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatStrip from "../components/StatStrip.jsx";
import Comparison from "../components/Comparison.jsx";
import FAQ from "../components/FAQ.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

const STATS = [
  { value: "$10B+",  label: "Unresolved claims" },
  { value: "FTX",    label: "Most active estate" },
  { value: "Fiat",   label: "All-cash close" },
  { value: "<14d",   label: "Median close" },
];

const OLD_WAY = {
  title: "Wait for the docket.",
  items: [
    "Multi-year court timelines.",
    "Token-vs-fiat valuation risk.",
    "Plan-of-reorganization surprises.",
  ],
};
const NEW_WAY = {
  title: "Through Turnpage.",
  items: [
    "Cash bid quoted in fiat.",
    "Tax-basis-aware structuring.",
    "Single creditor or bulk fund — same desk.",
  ],
};

const FAQS = [
  {
    q: "Which estates are you active in?",
    a: "FTX, Celsius, BlockFi, Voyager, Genesis. Also smaller and edge-case estates by conversation.",
  },
  {
    q: "How does pricing work?",
    a: "Competitive auction across our buyer network. A real bid in fiat, not an indication.",
  },
  {
    q: "Token-vs-fiat valuation?",
    a: "Our quotes reflect current case law and plan-of-reorganization mechanics. We'll walk you through the math.",
  },
  {
    q: "Can you handle bulk fund positions?",
    a: "Yes. Bulk dispositions, side-pockets, time-pressured liquidations. We move size discreetly.",
  },
];

export default function Crypto() {
  return (
    <>
      <Hero
        eyebrow="Locked Crypto"
        title="Liquidity for locked"
        accentTitle="digital assets."
        subtitle="FTX. Celsius. BlockFi. Voyager. Genesis. Mt. Gox. We quote in fiat and close fast."
        size="tall"
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={hashHref("contact") + "?source=crypto"} className="btn-neon">Get a Quote</a>
          <a href="#how-crypto" className="btn-ghost">How it works</a>
        </div>
      </Hero>

      {/* STAT STRIP */}
      <section className="surface-paper" style={{ padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container">
          <StatStrip items={STATS} theme="light" />
        </div>
      </section>

      {/* WHO WE HELP */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Who We Help"
            title="Creditors. Funds."
            accent="Estates."
          />
          <div className="grid-3col">
            <AudienceCard
              title="Individual Creditors"
              body="Single-position holders on FTX, Celsius, BlockFi, Voyager, and others."
            />
            <AudienceCard
              title="Funds & Institutions"
              body="Bulk dispositions and side-pocket cleanups. Size moved discreetly."
            />
            <AudienceCard
              title="Estates & Trustees"
              body="Administering an estate or trust? We can quote the entire position."
            />
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="how-crypto" className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Why Turnpage"
            title="A simpler path"
            accent="to liquidity."
          />
          <Comparison oldWay={OLD_WAY} newWay={NEW_WAY} />
        </div>
      </section>

      {/* WHAT WE OFFER */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="What We Offer"
            title="Capital."
            accent="Advisory."
          />
          <div className="grid-2col">
            <ServiceCard
              title="Capital"
              body="A competitive cash bid from our institutional buyer network. Quoted and settled in fiat. Days to close."
            />
            <ServiceCard
              title="Advisory"
              body="Plan-of-reorganization analysis. Token-vs-fiat valuation strategy. Counsel introductions when needed."
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="surface-paper section-pad">
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: "clamp(2rem, 6vw, 5rem)", alignItems: "start",
          }} className="faq-layout">
            <div>
              <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>FAQ</p>
              <h2 className="h-section" style={{ marginBottom: "1rem" }}>
                Crypto claims,{" "}
                <span className="accent-light">answered.</span>
              </h2>
              <a href={hashHref("contact") + "?source=crypto"} className="btn-ghost-ink">Get a Quote</a>
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

      <BottomCTA
        eyebrow="Crypto Claims Desk"
        title="Ready to liquidate?"
        accent="Get a quote."
        kicker="48-hour response. Confidentiality default."
        primary={{ label: "Get a Quote", href: hashHref("contact") + "?source=crypto" }}
        secondary={null}
      />
    </>
  );
}

function AudienceCard({ title, body }) {
  return (
    <div className="card-light">
      <h3 style={{
        fontFamily: FONT, fontSize: "1.2rem", fontWeight: 800, color: INK,
        marginBottom: "0.6rem", letterSpacing: "-0.01em", lineHeight: 1.2,
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: FONT, fontSize: "0.95rem", color: INK_60, lineHeight: 1.6,
      }}>
        {body}
      </p>
    </div>
  );
}

function ServiceCard({ title, body }) {
  return (
    <div style={{
      padding: "2rem 1.8rem", background: "#0A0A0A", color: "#fff",
      border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(60% 60% at 100% 0%, rgba(212,255,0,0.08), transparent 60%)",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontSize: "1.6rem", fontWeight: 800, color: NEON,
          marginBottom: "0.9rem", letterSpacing: "-0.01em",
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "1rem", color: "rgba(255,255,255,0.82)",
          lineHeight: 1.65,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}
