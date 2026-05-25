import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Comparison from "../components/Comparison.jsx";
import FAQ from "../components/FAQ.jsx";
import BottomCTA from "../components/BottomCTA.jsx";
import DealCard from "../components/DealCard.jsx";
import dealsData from "../data/deals.json";

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

const DEALS = (dealsData.deals || []).filter(d => Array.isArray(d.pages) && d.pages.includes("crypto"));

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
        video="/robotvault1.mp4"
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={hashHref("contact") + "?source=crypto"} className="btn-neon">Get a Quote</a>
          <a href="#how-crypto" className="btn-ghost">How it works</a>
        </div>
      </Hero>

      {/* WHO WE HELP */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Who We Help"
            title="Creditors. Funds."
            accent="Estates."
          />
          <div className="grid-2col" style={{ marginBottom: "1.2rem" }}>
            <AudienceCard
              priority
              title="Individual Creditors"
              body="Single-position holders on FTX, Celsius, BlockFi, Voyager, and others."
            />
            <AudienceCard
              priority
              title="Funds & Institutions"
              body="Bulk dispositions and side-pocket cleanups. Size moved discreetly."
            />
          </div>
          <div className="grid-2col">
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

      {/* RELEVANT EXPERIENCE */}
      <section style={{
        background: "#0A0B0E", color: "#fff",
        padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
            gap: "clamp(2rem, 5vw, 5rem)",
            marginBottom: "clamp(3rem, 6vw, 5rem)",
            alignItems: "end",
          }} className="section-split">
            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: NEON, marginBottom: "1.2rem",
              }}>
                Relevant Experience
              </p>
              <h2 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(2rem, 4.5vw, 4rem)",
                lineHeight: 1.02, letterSpacing: "-0.035em",
                color: "#fff",
              }}>
                Every major crypto insolvency of the last decade.
              </h2>
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
              color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 640,
            }}>
              FTX. Mt. Gox. Genesis. Celsius. BlockFi. Three Arrows. Voyager. Terra. A representative slice of deal history across the largest claims trades in recent crypto bankruptcy history.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8, overflow: "hidden",
          }} className="deals-grid">
            {DEALS.map((d, i) => (
              <DealCard key={i} deal={d} />
            ))}
          </div>

          <p style={{
            fontFamily: FONT, fontSize: "0.78rem",
            color: "rgba(255,255,255,0.4)", marginTop: "1.2rem",
            fontStyle: "italic",
          }}>
            * Experience prior to Turnpage
          </p>

          <style>{`
            @media (max-width: 1000px) {
              .deals-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 640px) {
              .deals-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
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

function AudienceCard({ title, body, priority }) {
  return (
    <div className="card-light" style={{
      background: priority ? "#0A0A0A" : "#fff",
      color: priority ? "#fff" : INK,
      borderColor: priority ? "rgba(255,255,255,0.14)" : LINE,
      position: priority ? "relative" : undefined,
      overflow: priority ? "hidden" : undefined,
    }}>
      {priority && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(60% 70% at 0% 0%, rgba(212,255,0,0.08), transparent 60%)",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontSize: "1.3rem", fontWeight: 800,
          color: priority ? "#fff" : INK,
          marginBottom: "0.7rem", letterSpacing: "-0.01em", lineHeight: 1.2,
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.97rem",
          color: priority ? "rgba(255,255,255,0.78)" : INK_60,
          lineHeight: 1.6,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function ServiceCard({ title, body }) {
  return (
    <div className="card-light" style={{
      background: "#0A0A0A", color: "#fff",
      borderColor: "rgba(255,255,255,0.14)",
      padding: "2rem 1.8rem", position: "relative", overflow: "hidden",
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
