import React from "react";
import { NEON, FONT, INK, INK_60, INK_40, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import FAQ from "../components/FAQ.jsx";

const FAQS = [
  {
    q: "What does Turnpage do?",
    a: "We buy claims and advise rights holders. Our counterparties hold positions in class actions, bankruptcies, and complex litigation.",
  },
  {
    q: "What claims do you buy?",
    a: "AI copyright, crypto bankruptcy, Chapter 11 trade claims, mass-tort settlements. Other complex matters by conversation.",
  },
  {
    q: "How does pricing work?",
    a: "Competitive auction across our buyer network. No upfront retainers; we earn a spread on what closes.",
  },
  {
    q: "How fast can you close?",
    a: "Days on simple matters. Longer when the docket requires it.",
  },
  {
    q: "Is this legal or financial advice?",
    a: "No. We will introduce you to counsel and tax specialists when a matter calls for it.",
  },
];

export default function Home() {
  return (
    <>
      {/* ─── HERO ─── */}
      <HeroSection />

      {/* ─── DESK 01 · AI COPYRIGHT ─── */}
      <DeskSection
        index="01"
        tag="Featured Desk"
        title="AI Copyright"
        body="Bartz, the OpenAI MDL, Concord, Getty, Disney v. Midjourney. We buy claims from class members and advise plaintiffs and publishers across the docket."
        big="$1.5B"
        bigCaption="Bartz settlement — the largest U.S. copyright settlement on record."
        cta="Explore the desk"
        href={hashHref("ai-copyright")}
        bg="#FFFFFF"
      />

      {/* ─── DESK 02 · CRYPTO ─── */}
      <DeskSection
        index="02"
        tag="Live"
        title="Crypto Claims"
        body="FTX, Celsius, BlockFi, Voyager. Liquidity for single creditors, funds, and estates — quoted in fiat, closed in days."
        big="$10B+"
        bigCaption="Estimated unresolved creditor claims across major crypto estates."
        cta="Explore the desk"
        href={hashHref("crypto")}
        bg="#F4F5F7"
        mirrored
      />

      {/* ─── DESK 03 · BANKRUPTCY & LITIGATION ─── */}
      <DeskSection
        index="03"
        tag="By Conversation"
        title="Bankruptcy & Litigation"
        body="Chapter 11 trade claims, mass-tort settlements, and bespoke complex matters. The original Turnpage book of business."
        big="∞"
        bigCaption="The matters that don't fit a category. Speak to a partner."
        cta="Speak to a partner"
        href={hashHref("contact")}
        bg="#FFFFFF"
      />

      {/* ─── NUMBERS — editorial manifesto ─── */}
      <NumbersSection />

      {/* ─── FAQ ─── */}
      <section style={{
        background: "#FFFFFF",
        padding: "clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 4rem)",
        borderTop: `1px solid ${LINE}`,
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: INK_60, marginBottom: "1.5rem",
          }}>
            Frequently asked
          </p>
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)",
            lineHeight: 1.02, letterSpacing: "-0.035em",
            color: INK, marginBottom: "clamp(2.5rem, 5vw, 4rem)",
            maxWidth: 880,
          }}>
            Questions, <span className="accent-light">answered.</span>
          </h2>
          <div style={{ maxWidth: 880 }}>
            <FAQ items={FAQS} openFirst={false} />
          </div>
        </div>
      </section>

      {/* ─── CLOSING ─── */}
      <ClosingSection />
    </>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  return (
    <section style={{
      position: "relative", overflow: "hidden",
      minHeight: "calc(100vh - 88px)",
      display: "flex", alignItems: "flex-end",
      padding: "0 clamp(1.5rem,5vw,4rem) clamp(3rem,6vh,5rem)",
      background: "#06070A",
    }}>
      {/* Base wash */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #0A0C10 0%, #06070A 100%)",
      }} />

      {/* Video */}
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

      {/* Bottom gradient so headline sits on a legible base. */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, transparent 30%, transparent 50%, rgba(0,0,0,0.65) 100%)",
      }} />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1440, width: "100%", margin: "0 auto" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.78)", marginBottom: "1.5rem",
        }}>
          OTC Claims Desk
        </p>
        <h1 style={{
          fontFamily: FONT, fontWeight: 900,
          fontSize: "clamp(3rem, 9vw, 8.5rem)",
          lineHeight: 0.95, letterSpacing: "-0.045em",
          color: "#FFFFFF", marginBottom: "1.8rem",
          maxWidth: 1200,
        }}>
          The OTC desk for<br />
          <span style={{ fontStyle: "italic", fontWeight: 800, color: NEON }}>rights holders.</span>
        </h1>
        <p style={{
          fontFamily: FONT, fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
          color: "rgba(255,255,255,0.72)", lineHeight: 1.55,
          maxWidth: 640, marginBottom: "2.4rem",
        }}>
          We buy claims. Class actions, bankruptcies, complex litigation.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={hashHref("contact")} className="btn-neon">Talk to a Partner</a>
          <a
            href={hashHref("ai-copyright")}
            style={{
              fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.04em",
              padding: "1em 0",
              borderBottom: "1px solid rgba(255,255,255,0.4)",
              transition: "color 0.2s, border-color 0.2s",
              display: "inline-flex", alignItems: "center", gap: "0.5em",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
          >
            Explore AI Copyright →
          </a>
        </div>
      </div>

      {/* Tiny scroll cue, bottom-right */}
      <div style={{
        position: "absolute", right: "clamp(1.5rem,5vw,4rem)", bottom: "2rem", zIndex: 10,
        fontFamily: FONT, fontSize: "0.7rem", fontWeight: 600,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.5)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
      }} className="hide-on-mobile">
        <span>Scroll</span>
        <span style={{
          width: 1, height: 36,
          background: "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)",
        }} />
      </div>
    </section>
  );
}

/* ─── Desk section — large editorial moment per sub-brand ─── */
function DeskSection({ index, tag, title, body, big, bigCaption, cta, href, bg, mirrored }) {
  const isDark = bg === "#0A0A0A" || bg === "#000";
  const ink = isDark ? "#fff" : INK;
  const muted = isDark ? "rgba(255,255,255,0.65)" : INK_60;
  const faint = isDark ? "rgba(255,255,255,0.3)" : INK_40;

  return (
    <section style={{
      background: bg,
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : `1px solid ${LINE}`,
    }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "clamp(2rem, 6vw, 6rem)",
        alignItems: "center",
      }} className="desk-grid">
        {/* Text column */}
        <div style={{ order: mirrored ? 2 : 1 }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: muted, marginBottom: "1.5rem",
            display: "flex", alignItems: "center", gap: "0.7em",
          }}>
            <span style={{ color: faint }}>{index}</span>
            <span style={{ width: 22, height: 1, background: faint }} />
            <span>{tag}</span>
          </p>
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(2.4rem, 6vw, 5rem)",
            lineHeight: 0.98, letterSpacing: "-0.04em",
            color: ink, marginBottom: "1.6rem",
          }}>
            {title}
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
            color: muted, lineHeight: 1.6,
            marginBottom: "2.2rem", maxWidth: 520,
          }}>
            {body}
          </p>
          <a
            href={href}
            style={{
              fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700,
              color: ink, letterSpacing: "0.02em",
              paddingBottom: "0.45rem",
              borderBottom: `2px solid ${NEON}`,
              transition: "padding 0.2s",
              display: "inline-block",
            }}
            onMouseEnter={e => { e.currentTarget.style.paddingRight = "0.5rem"; }}
            onMouseLeave={e => { e.currentTarget.style.paddingRight = "0"; }}
          >
            {cta} →
          </a>
        </div>

        {/* Big editorial number */}
        <div style={{ order: mirrored ? 1 : 2, textAlign: mirrored ? "right" : "left" }}>
          <div style={{
            fontFamily: FONT, fontWeight: 900,
            fontSize: "clamp(5rem, 16vw, 14rem)",
            lineHeight: 0.85, letterSpacing: "-0.06em",
            color: ink,
          }}>
            {big}
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "0.92rem",
            color: muted, lineHeight: 1.55,
            marginTop: "1.5rem", maxWidth: 360,
            marginLeft: mirrored ? "auto" : 0,
          }}>
            {bigCaption}
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .desk-grid {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
          }
          .desk-grid > div:nth-child(1),
          .desk-grid > div:nth-child(2) {
            order: unset !important;
            text-align: left !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ─── Numbers section ─── */
function NumbersSection() {
  const items = [
    { v: "$1B+", l: "In claims liquidated to date." },
    { v: "500+", l: "Institutional buyers on speed dial." },
    { v: "<48h", l: "Response on serious inquiries." },
  ];
  return (
    <section style={{
      background: "#F4F5F7",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${LINE}`,
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: INK_60, marginBottom: "1.5rem",
        }}>
          The Desk
        </p>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(2.4rem, 6vw, 5rem)",
          lineHeight: 0.98, letterSpacing: "-0.04em",
          color: INK, marginBottom: "clamp(3rem, 7vw, 6rem)",
          maxWidth: 1000,
        }}>
          Numbers behind the firm.
        </h2>

        <div style={{ borderTop: `1px solid ${LINE}` }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)",
                gap: "clamp(2rem,4vw,4rem)",
                alignItems: "center",
                padding: "clamp(2rem,4vw,3rem) 0",
                borderBottom: `1px solid ${LINE}`,
              }}
              className="numbers-row"
            >
              <div style={{
                fontFamily: FONT, fontWeight: 900,
                fontSize: "clamp(3rem, 8vw, 7rem)",
                lineHeight: 0.9, letterSpacing: "-0.04em",
                color: INK,
              }}>
                {it.v}
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
                color: INK_60, lineHeight: 1.45,
              }}>
                {it.l}
              </p>
            </div>
          ))}
        </div>

        <style>{`
          @media (max-width: 720px) {
            .numbers-row { grid-template-columns: 1fr !important; gap: 0.8rem !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ─── Closing CTA — dark editorial moment ─── */
function ClosingSection() {
  return (
    <section style={{
      background: "#0A0B0E",
      padding: "clamp(6rem, 14vw, 12rem) clamp(1.5rem, 5vw, 4rem)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(60% 70% at 50% 0%, rgba(212,255,0,0.06), transparent 60%)",
      }} />
      <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: NEON, marginBottom: "2rem",
        }}>
          Get in Touch
        </p>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(3rem, 8vw, 7rem)",
          lineHeight: 0.95, letterSpacing: "-0.04em",
          color: "#FFFFFF", marginBottom: "1.8rem",
        }}>
          Hold a claim?<br />
          <span style={{ fontStyle: "italic", color: NEON }}>Talk to us.</span>
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
          color: "rgba(255,255,255,0.7)", lineHeight: 1.55,
          maxWidth: 540, margin: "0 auto 3rem",
        }}>
          48-hour response. Confidentiality default.
        </p>
        <a href={hashHref("contact")} className="btn-neon">Get in Touch</a>
      </div>
    </section>
  );
}
