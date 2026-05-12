import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatStrip from "../components/StatStrip.jsx";
import Comparison from "../components/Comparison.jsx";
import FAQ from "../components/FAQ.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

/* PLACEHOLDER COPY — Andrew to refine with content lifted from the
   turnpage-crypto repo when ready. Structure mirrors AICopyright.jsx. */

const STATS = [
  { value: "$10B+",  label: "In crypto bankruptcy claims still unresolved across major estates" },
  { value: "FTX",    label: "Most active estate — distributions ongoing" },
  { value: "All-Cash", label: "Quotes in fiat, settled in fiat" },
  { value: "<14 Day", label: "Median close on simple, well-documented claims" },
];

const OLD_WAY = {
  title: "Wait for the docket.",
  items: [
    "Multi-year court timelines with no certainty of recovery.",
    "Token-vs-fiat valuation disputes consuming creditor value.",
    "Plan-of-reorganization risk on every distribution.",
    "Tax basis preserved or destroyed by accident.",
  ],
};
const NEW_WAY = {
  title: "Cash now, basis intact.",
  items: [
    "Competitive all-cash bid quoted in fiat.",
    "Tax-basis-aware structuring on the disposition.",
    "No exposure to plan-of-reorganization surprises.",
    "Single-creditor or bulk-fund — we move size discreetly.",
  ],
};

const FAQS = [
  {
    q: "Which crypto estates are you most active in?",
    a: "FTX, Celsius, BlockFi, Voyager, and other major estates. We can quote on any reasonably documented claim — including smaller estates and edge-case matters.",
  },
  {
    q: "How does pricing work?",
    a: "We run a competitive process across institutional buyers and come back with a real bid in fiat. Pricing reflects current market conditions, estate dynamics, and timing.",
  },
  {
    q: "What about the token-versus-fiat valuation question?",
    a: "We've been navigating this since the early FTX days. Our quotes reflect the relevant case law and plan-of-reorganization mechanics; we'll walk you through the math.",
  },
  {
    q: "Can you handle bulk fund positions?",
    a: "Yes. Bulk dispositions, side-pocket cleanups, time-pressured liquidations — we move size discreetly and price competitively against the broader claims market.",
  },
  {
    q: "What about tax?",
    a: "We're not your tax adviser, but we structure transactions to be tax-basis-aware and will introduce you to specialist counsel when a matter warrants it.",
  },
];

export default function Crypto() {
  return (
    <>
      <Hero
        eyebrow="Crypto Claims Desk"
        title="Liquidity for crypto creditors"
        accentTitle="when the docket says wait."
        subtitle="FTX. Celsius. BlockFi. Voyager. We make the secondary market for crypto bankruptcy claims work for you — competitive bids from institutional buyers, fast close, no surprises."
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
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: "1.4rem" }}>The Desk</p>
          <StatStrip items={STATS} theme="light" />
        </div>
      </section>

      {/* WHY NOW */}
      <section className="surface-paper section-pad" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHeader
            eyebrow="Why Now"
            title="The biggest crypto estates"
            accent="are still working through the courts."
            kicker="Tens of billions of dollars in creditor claims remain unresolved, with distributions stretching across multi-year timelines and complex token-versus-USD valuation disputes. You don't have to wait. Turnpage's institutional buyers are pricing crypto claims daily — and we structure transactions that fit your tax posture, fund obligations, and risk tolerance."
          />
        </div>
      </section>

      {/* WHO WE HELP */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Who We Help"
            title="From single creditors"
            accent="to institutional fund holders."
          />
          <div className="grid-3col">
            <AudienceCard
              title="Individual Creditors"
              body="If you held assets on FTX, Celsius, BlockFi, Voyager, or another crypto platform that filed for bankruptcy, you can sell your claim to a Turnpage counterparty and exit the proceeding."
            />
            <AudienceCard
              title="Funds & Institutional Holders"
              body="Bulk dispositions, side-pocket cleanups, and time-pressured liquidations. We move size discreetly and price competitively against the broader claims market."
            />
            <AudienceCard
              title="Estates & Trustees"
              body="Administering an estate or trust that holds crypto bankruptcy claims? We can quote the entire position and close end-to-end."
            />
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="how-crypto" className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Why Turnpage"
            title="Time kills claims."
            accent="We save both."
          />
          <Comparison oldWay={OLD_WAY} newWay={NEW_WAY} />
        </div>
      </section>

      {/* WHAT WE OFFER */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="What We Offer"
            title="Capital first."
            accent="Mechanics handled."
          />
          <div className="grid-2col">
            <ServiceCard
              title="Capital Solutions"
              body="A competitive cash bid for your claim, sourced from our network of 500+ institutional buyers. We quote in fiat, settle in fiat, and handle the assignment paperwork."
              bullets={[
                "Single-creditor and bulk-fund claim purchases",
                "Quotes turned around in days, not weeks",
                "All-cash close — no contingent payouts",
                "Transparent pricing benchmarked against the broader market",
              ]}
            />
            <ServiceCard
              title="Advisory"
              body="Distribution waterfalls. Token-vs-fiat valuation disputes. Tax basis preservation. The plan-of-reorganization landscape is messy — we navigate it with you and bring counsel introductions when needed."
              bullets={[
                "Plan of reorganization analysis",
                "Token-vs-fiat valuation strategy",
                "Tax-basis-aware structuring",
                "Counsel introductions for complex matters",
              ]}
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
              <p style={{
                fontFamily: FONT, fontSize: "1rem", color: INK_60,
                lineHeight: 1.65, marginBottom: "1.4rem",
              }}>
                What we hear from creditors, funds, and estates. Send anything else.
              </p>
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
        kicker="Send us the basics and we'll come back with a competitive bid within 48 hours."
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
        fontFamily: FONT, fontSize: "0.95rem", color: INK_60, lineHeight: 1.65,
      }}>
        {body}
      </p>
    </div>
  );
}

function ServiceCard({ title, body, bullets }) {
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
          fontFamily: FONT, fontSize: "1.5rem", fontWeight: 800, color: NEON,
          marginBottom: "0.9rem", letterSpacing: "-0.01em",
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "1rem", color: "rgba(255,255,255,0.82)",
          lineHeight: 1.65, marginBottom: "1.4rem",
        }}>
          {body}
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {bullets.map((b, i) => (
            <li key={i} style={{
              fontFamily: FONT, fontSize: "0.93rem", color: "rgba(255,255,255,0.7)",
              paddingLeft: "1.3rem", position: "relative", lineHeight: 1.5,
            }}>
              <span style={{ position: "absolute", left: 0, top: 0, color: NEON, fontWeight: 700 }}>›</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
