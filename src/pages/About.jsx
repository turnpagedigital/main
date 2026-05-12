import React from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatStrip from "../components/StatStrip.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

const STATS = [
  { value: "$1B+",  label: "Claims liquidated" },
  { value: "500+",  label: "Institutional buyers" },
  { value: "NYC",   label: "Based" },
];

export default function About() {
  return (
    <>
      <Hero
        eyebrow="About"
        title="An OTC desk for"
        accentTitle="rights holders."
        subtitle="Institutional liquidity for claims markets that overlooked everyone but the largest creditors."
      />

      {/* STAT STRIP */}
      <section className="surface-paper" style={{ padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container">
          <StatStrip items={STATS} theme="light" />
        </div>
      </section>

      {/* MISSION */}
      <section className="surface-paper section-pad" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <SectionHeader
            eyebrow="What we do"
            title="We buy claims."
            accent="And advise."
            align="left"
            maxWidth={760}
          />
          <p style={{
            fontFamily: FONT, fontSize: "1.1rem", color: INK_60,
            lineHeight: 1.75,
          }}>
            Whether you're an author with a single Bartz claim or a fund running an aggregated catalogue, you transact with us the way institutional desks transact with each other — fast, fair, documented.
          </p>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="surface-paper-2 section-pad">
        <div className="container" style={{ maxWidth: 960 }}>
          <SectionHeader
            eyebrow="Leadership"
            title="Andrew Glantz"
            align="left"
            maxWidth={960}
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 240px) minmax(0,1fr)",
            gap: "clamp(2rem, 5vw, 4rem)",
            alignItems: "start",
          }} className="bio-grid">
            <div style={{
              width: 240, maxWidth: "100%",
              aspectRatio: "4/5", overflow: "hidden",
              borderRadius: 14, background: "#0A0A0A",
              border: `1px solid ${LINE_STRONG}`,
            }}>
              <img
                src="/andrew.png"
                alt="Andrew Glantz"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div>
              <p style={{
                fontFamily: FONT, fontSize: "1.02rem", color: INK_60, lineHeight: 1.75,
                marginBottom: "1.2rem", fontStyle: "italic",
                padding: "1.1rem 1.3rem",
                background: "rgba(212,255,0,0.10)",
                border: `1px dashed rgba(10,10,10,0.18)`,
                borderRadius: 12,
              }}>
                [Founder bio — paste your bio here. 3–6 sentences ideal.]
              </p>
              <a href={hashHref("contact")} className="btn-ghost-ink">Reach out</a>
            </div>
          </div>
          <style>{`
            @media (max-width: 720px) {
              .bio-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
              .bio-grid > div:first-child { max-width: 200px; }
            }
          `}</style>
        </div>
      </section>

      <BottomCTA
        eyebrow="Get in Touch"
        title="Want to work together?"
        accent="Let's talk."
        kicker="48-hour response. Confidentiality default."
        primary={{ label: "Get in Touch", href: hashHref("contact") }}
        secondary={null}
      />
    </>
  );
}
