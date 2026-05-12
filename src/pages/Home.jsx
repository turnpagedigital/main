import React from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import StatStrip from "../components/StatStrip.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import SubBrandTile from "../components/SubBrandTile.jsx";
import Comparison from "../components/Comparison.jsx";
import FAQ from "../components/FAQ.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

const STATS = [
  { value: "$1B+",  label: "In claims liquidated" },
  { value: "500+",  label: "Institutional buyers" },
  { value: "<48h",  label: "Response time" },
];

const OLD_WAY = {
  title: "The traditional path.",
  items: [
    "Wait years for distributions.",
    "Pricing opaque, counterparties scattered.",
    "Bespoke documentation every time.",
  ],
};
const NEW_WAY = {
  title: "Through Turnpage.",
  items: [
    "Cash bid today, in days not years.",
    "Competitive auction across our buyer network.",
    "Standardized docs, transparent pricing.",
  ],
};

const FAQS = [
  {
    q: "What does Turnpage do?",
    a: "We buy claims and advise rights holders. Our counterparties hold positions in class actions, bankruptcies, and complex litigation. We quote, document, and close.",
  },
  {
    q: "What claims do you buy?",
    a: "AI copyright (Bartz, the OpenAI MDL, Concord, Getty, and adjacent matters) and crypto bankruptcy claims (FTX, Celsius, BlockFi, Voyager). Also Chapter 11 trade claims and mass-tort settlements by conversation.",
  },
  {
    q: "How does pricing work?",
    a: "We run a competitive process across our buyer network. You see real bids. No upfront retainers; we earn a spread on what closes.",
  },
  {
    q: "How fast can you close?",
    a: "Days on simple matters. Longer when the docket requires it.",
  },
  {
    q: "Is this legal or financial advice?",
    a: "No. Information on this site is general in nature. We will introduce you to counsel and tax specialists when a matter calls for it.",
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
        background: "#06070A",
      }}>
        {/* Base dark wash so everything has a solid foundation. */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "linear-gradient(180deg, #0A0C10 0%, #06070A 100%)",
        }} />

        {/* OPTIONAL VIDEO BACKGROUND
            Drop an .mp4 (or .webm) into public/hero.mp4 and it will appear here.
            If the file doesn't exist, the <video> hides itself (onError) and the
            animated mesh below takes over. */}
        <video
          autoPlay muted loop playsInline
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{
            position: "absolute", inset: 0, zIndex: 1,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: 0.85, filter: "saturate(0.85) contrast(1.05)",
            pointerEvents: "none",
          }}
        >
          <source src="/hero.mp4" type="video/mp4" />
          <source src="/hero.webm" type="video/webm" />
        </video>

        {/* Animated gradient mesh — ambient layer. */}
        <div className="hero-mesh" style={{ zIndex: 2 }} />

        {/* Grain. */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 5, opacity: 0.06, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }} />

        {/* Bottom fade. */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(6,7,10,0.30) 0%, transparent 25%, transparent 60%, rgba(0,0,0,0.85) 100%)",
        }} />

        <div className="container" style={{ position: "relative", zIndex: 10, maxWidth: 1080 }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", color: NEON, marginBottom: "1.4rem",
          }}>
            OTC Claims Desk
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
            lineHeight: 1.5, color: "rgba(255,255,255,0.82)", maxWidth: 680,
            marginBottom: "2.2rem",
          }}>
            We buy claims. Class actions, bankruptcies, complex litigation.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", marginBottom: "3rem" }}>
            <a href={hashHref("contact")} className="btn-neon">Talk to a Partner</a>
            <a href={hashHref("ai-copyright")} className="btn-ghost">AI Copyright Desk</a>
          </div>

          <div style={{ maxWidth: 980 }}>
            <StatStrip items={STATS} theme="dark" />
          </div>
        </div>
      </section>

      {/* ─── SUB-BRAND GRID (light) ─── */}
      <section className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Desks"
            title="Where we work."
          />
          <div className="grid-3col" style={{ alignItems: "stretch" }}>
            <SubBrandTile
              variant="featured"
              tag="Featured"
              number="01"
              title="AI Copyright"
              body="Bartz, the OpenAI MDL, Concord, Getty, Disney v. Midjourney. Class members, plaintiffs, publishers."
              href={hashHref("ai-copyright")}
              cta="Explore →"
            />
            <SubBrandTile
              variant="live"
              tag="Live"
              number="02"
              title="Crypto Claims"
              body="FTX, Celsius, BlockFi, Voyager. Single creditors, funds, estates."
              href={hashHref("crypto")}
              cta="Explore →"
            />
            <SubBrandTile
              variant="soon"
              tag="By Conversation"
              number="03"
              title="Bankruptcy & Litigation"
              body="Chapter 11 trade claims, mass-tort settlements, bespoke matters."
              href={hashHref("contact")}
              cta="Speak to a partner →"
            />
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Why Turnpage"
            title="A simpler path"
            accent="to liquidity."
          />
          <Comparison oldWay={OLD_WAY} newWay={NEW_WAY} />
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="surface-paper section-pad">
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

      <BottomCTA
        eyebrow="Get in Touch"
        title="Hold a claim?"
        accent="Talk to us."
        kicker="48-hour response. Confidentiality default."
        primary={{ label: "Get in Touch", href: hashHref("contact") }}
        secondary={null}
      />
    </>
  );
}
