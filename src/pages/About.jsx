import React from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatStrip from "../components/StatStrip.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

const STATS = [
  { value: "$1B+",  label: "In claims liquidated across class actions, bankruptcies, and complex litigation" },
  { value: "500+",  label: "Financial institutions on speed dial — competitive bids, shorter timelines" },
  { value: "2018",  label: "Founded to serve rights holders the traditional capital markets overlook" },
  { value: "NYC",   label: "Headquartered in New York, working with counterparties globally" },
];

const PRINCIPLES = [
  {
    title: "Markets, not promises.",
    body: "We don't sell timelines. We sell bids — real prices from real institutional buyers, today.",
  },
  {
    title: "Sophistication, on both sides.",
    body: "Whether you're a single author or a global music group, you transact with us the way institutional desks transact with each other — fast, fair, documented.",
  },
  {
    title: "Skin in the game.",
    body: "No retainers, no hidden fees. We earn a market-clearing spread. If you win, we win. If we can't deliver, you owe us nothing.",
  },
  {
    title: "Confidentiality, full stop.",
    body: "Every inquiry is treated as confidential from the first email. NDAs by default; no marketing without your explicit approval.",
  },
];

export default function About() {
  return (
    <>
      <Hero
        eyebrow="About Turnpage"
        title="An OTC desk built for"
        accentTitle="rights holders."
        subtitle="Turnpage Digital Markets is the institutional-grade desk for individuals and institutions with claims to compensation. We bring the discipline of a trading floor to a market that, until recently, didn't have one."
      />

      {/* STAT STRIP */}
      <section className="surface-paper" style={{ padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container">
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: "1.4rem" }}>The Desk</p>
          <StatStrip items={STATS} theme="light" />
        </div>
      </section>

      {/* MISSION */}
      <section className="surface-paper section-pad" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <SectionHeader
            eyebrow="Mission"
            title="Turn legal recoveries"
            accent="into liquid capital."
            align="left"
            kicker="Most rights holders never get the chance to liquidate their claims efficiently. The counterparties are scattered. The pricing is opaque. The documentation is bespoke. Distributions take years. Turnpage exists to fix that."
            maxWidth={880}
          />
          <p style={{
            fontFamily: FONT, fontSize: "1.08rem", color: INK_60,
            lineHeight: 1.75, marginBottom: "1.2rem",
          }}>
            We bring institutional buyers — over 500 financial institutions and growing — into a
            market that traditionally only worked for the largest creditors. Whether you're an
            author with a single Bartz claim, a music publisher running an aggregated catalogue, or
            a creditor sitting on a crypto bankruptcy distribution timeline, you can transact with
            us the way an institutional desk would transact with another desk: fast, fair, and
            documented.
          </p>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="How We Operate"
            title="Four principles."
            accent="One desk."
          />
          <div className="grid-2col">
            {PRINCIPLES.map((p, i) => (
              <div key={i} className="card-light" style={{ position: "relative", paddingTop: "2.2rem", overflow: "hidden" }}>
                <span style={{
                  position: "absolute", top: "0.9rem", right: "1.2rem",
                  fontFamily: FONT, fontWeight: 900, fontSize: "3.4rem",
                  color: "rgba(10,10,10,0.06)", lineHeight: 1, letterSpacing: "-0.04em",
                  pointerEvents: "none",
                }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{
                  display: "inline-block", marginBottom: "0.9rem",
                  width: "1.6em", height: "0.18em", background: NEON, borderRadius: 2,
                }} aria-hidden />
                <h3 style={{
                  fontFamily: FONT, fontSize: "1.25rem", fontWeight: 800, color: INK,
                  marginBottom: "0.7rem", letterSpacing: "-0.01em", lineHeight: 1.25,
                  maxWidth: "75%",
                }}>
                  {p.title}
                </h3>
                <p style={{
                  fontFamily: FONT, fontSize: "0.97rem", color: INK_60, lineHeight: 1.65,
                }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="surface-paper section-pad">
        <div className="container" style={{ maxWidth: 960 }}>
          <SectionHeader
            eyebrow="Leadership"
            title="Andrew Glantz"
            accent="Founder & Managing Partner"
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
                fontFamily: FONT, fontSize: "1.05rem", color: INK, lineHeight: 1.75,
                marginBottom: "1.2rem", fontWeight: 500,
              }}>
                Andrew Glantz founded Turnpage Digital Markets in 2018 to bring institutional
                liquidity to the most complex corners of the claims market. Today, the firm acts
                as the OTC desk for rights holders across the largest class actions, bankruptcies,
                and complex litigation in the world.
              </p>
              <p style={{
                fontFamily: FONT, fontSize: "1.02rem", color: INK_60, lineHeight: 1.75,
                marginBottom: "1.2rem", fontStyle: "italic",
                padding: "1.1rem 1.3rem",
                background: "rgba(212,255,0,0.08)",
                border: `1px dashed rgba(212,255,0,0.4)`,
                borderRadius: 12,
              }}>
                [Founder bio — paste your bio here. 3–6 sentences ideal: background, what you've
                built at Turnpage, why this work matters to you. We can also pull from your
                LinkedIn if you send a URL.]
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
        kicker="Confidentiality assured. We respond to every inquiry within 48 hours."
        primary={{ label: "Get in Touch", href: hashHref("contact") }}
        secondary={{ label: "Explore the Desks", href: hashHref("ai-copyright") }}
      />
    </>
  );
}
