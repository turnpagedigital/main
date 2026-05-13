import React from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatStrip from "../components/StatStrip.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

const STATS = [
  { value: "$1B+",  label: "Claims traded*" },
  { value: "5K+",   label: "Claims sold or advised*" },
  { value: "500+",  label: "Institutional buyers" },
  { value: "NYC",   label: "Based" },
];

const TESTIMONIALS = [
  {
    quote: "Andrew is always thinking about how to structure trades in the most elegant way to allocate risk among the parties. When others give up, Andrew digs in.",
    by: "Locked Crypto Interest Holder",
  },
  {
    quote: "Andrew is extremely professional and easy to work with. His negotiating style is collaborative rather than confrontational, but he knows how to dial it up for a client when the situation demands.",
    by: "FTX Trading Ltd. Creditor",
  },
  {
    quote: "Andrew has deep knowledge about bankruptcy and restructuring that gives his clients a major advantage in negotiations.",
    by: "Genesis Global Creditor",
  },
];

export default function About() {
  return (
    <>
      <Hero
        eyebrow="About"
        title="Strategic guidance."
        accentTitle="Turn-key liquidity."
        subtitle="Institutional liquidity for rights holders entitled to compensation — across litigation, bankruptcies, class actions, locked assets, and refund rights."
      />

      {/* STAT STRIP */}
      <section className="surface-paper" style={{ padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container">
          <StatStrip items={STATS} theme="light" />
          <p style={{
            fontFamily: FONT, fontSize: "0.75rem", color: INK_60,
            marginTop: "1rem", fontStyle: "italic",
          }}>
            *Experience prior to founding Turnpage Digital.
          </p>
        </div>
      </section>

      {/* MISSION */}
      <section className="surface-paper section-pad" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <SectionHeader
            eyebrow="What we do"
            title="The OTC desk"
            accent="for tough claims."
            align="left"
            maxWidth={880}
          />
          <p style={{
            fontFamily: FONT, fontSize: "1.1rem", color: INK_60,
            lineHeight: 1.75, marginBottom: "1.2rem",
          }}>
            Turnpage Digital Markets offers strategic guidance and turn-key liquidity solutions for rights holders entitled to compensation. We partner with leading asset managers to offer competitive rates and frictionless solutions — with over 500 financial institutions on speed dial, we save you countless hours identifying the right counterparty to meet your needs.
          </p>
          <p style={{
            fontFamily: FONT, fontSize: "1.1rem", color: INK_60,
            lineHeight: 1.75,
          }}>
            Whether you're a single creditor, a fund running an aggregated portfolio, or a trustee administering an estate, you transact with us the way institutional desks transact with each other — fast, fair, and documented.
          </p>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="surface-paper-2 section-pad">
        <div className="container" style={{ maxWidth: 1100 }}>
          <SectionHeader
            eyebrow="Leadership"
            title="Andrew Glantz"
            align="left"
            maxWidth={1100}
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 320px) minmax(0,1fr)",
            gap: "clamp(2rem, 5vw, 4rem)",
            alignItems: "start",
          }} className="bio-grid">
            <div>
              <div style={{
                width: "100%", maxWidth: 320,
                aspectRatio: "4/5", overflow: "hidden",
                borderRadius: 8, background: "#0A0A0A",
                border: `1px solid ${LINE_STRONG}`,
              }}>
                <img
                  src="/andrew.png"
                  alt="Andrew Glantz"
                  style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }}
                />
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700,
                color: INK, marginTop: "1.2rem",
              }}>
                Andrew Glantz
              </p>
              <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: INK_60, marginTop: "0.2rem" }}>
                Founder & Managing Partner
              </p>
            </div>
            <div>
              <p style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
                lineHeight: 1.2, letterSpacing: "-0.02em",
                color: INK, marginBottom: "1.8rem",
              }}>
                A <span className="accent-light">singular force</span> in the claims market for the toughest situations that demand tenacity, creativity, flexibility, and finesse.
              </p>
              <p style={{
                fontFamily: FONT, fontSize: "1.05rem", color: INK_60,
                lineHeight: 1.75, marginBottom: "1.2rem",
              }}>
                Andrew has facilitated some of the largest claim trades in FTX, Genesis, Mt. Gox, Celsius, and BlockFi, and was one of the early pioneers of crypto loss claims trading.
              </p>
              <p style={{
                fontFamily: FONT, fontSize: "1.05rem", color: INK_60,
                lineHeight: 1.75, marginBottom: "1.6rem",
              }}>
                Trained as a bankruptcy lawyer, Andrew has over a decade of experience in Chapter 11 restructuring, special situations investments, and asset recovery strategies — seamlessly bridging traditional and digital assets.
              </p>
              <a href={hashHref("contact")} className="btn-ghost-ink">Reach out</a>
            </div>
          </div>
          <style>{`
            @media (max-width: 720px) {
              .bio-grid { grid-template-columns: 1fr !important; gap: 1.8rem !important; }
            }
          `}</style>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="What clients say"
            title="When others give up,"
            accent="we dig in."
            align="left"
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(1.5rem, 3vw, 2.5rem)",
          }} className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} style={{
                borderTop: `2px solid ${INK}`,
                padding: "1.6rem 0 0",
                margin: 0,
              }}>
                <blockquote style={{
                  fontFamily: FONT, fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
                  color: INK, lineHeight: 1.55, margin: 0, marginBottom: "1.4rem",
                }}>
                  “{t.quote}”
                </blockquote>
                <figcaption style={{
                  fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                  letterSpacing: "0.12em", textTransform: "uppercase", color: INK_60,
                }}>
                  — {t.by}
                </figcaption>
              </figure>
            ))}
          </div>
          <style>{`
            @media (max-width: 900px) {
              .testimonials-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>

      <BottomCTA
        eyebrow="Get in Touch"
        title="Why wait?"
        accent="Talk to us."
        kicker="48-hour response. Confidentiality default."
        primary={{ label: "Get in Touch", href: hashHref("contact") }}
        secondary={null}
      />
    </>
  );
}
