import React, { useState } from "react";
import { NEON, FONT, INK, INK_60, INK_40, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

/* ── Media coverage items ─────────────────────────────────────────────────────
   Add objects here to populate the "In the Press" grid.
   Schema: { outlet, date, headline, excerpt, href }
   - outlet: e.g. "The Wall Street Journal"
   - date:   display string e.g. "March 2025"
   - headline: article headline or quote intro
   - excerpt:  short quote or description (optional)
   - href:  URL to the article (string), or null if not yet linked  */
const PRESS_ITEMS = [];

/* ── Publications by Andrew ───────────────────────────────────────────────────
   Add objects here to populate the "By Andrew" grid.
   Schema: { title, venue, date, excerpt, href }
   - venue: e.g. "ABI Journal"
   - href: URL or null  */
const BY_ANDREW = [];

export default function Press() {
  return (
    <>
      <Hero
        eyebrow="Press & Publications"
        title="Coverage and"
        accentTitle="commentary."
        subtitle="Andrew Glantz has been quoted or featured in the Wall Street Journal, Bloomberg, The New York Times, CoinDesk, NPR's Planet Money, the BBC, Grant's Interest Rate Observer, and the ABI Journal."
        size="tall"
      />

      {/* ── As seen in ────────────────────────────────────────────── */}
      <section style={{
        background: "#F4F5F7",
        padding: "clamp(2.5rem,5vw,4rem) clamp(1.5rem,5vw,4rem)",
        borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: INK_40, marginBottom: "1.8rem",
          }}>
            As seen in
          </p>
          <div style={{
            display: "flex", flexWrap: "wrap",
            alignItems: "center",
            gap: "clamp(1.8rem, 3.5vw, 3rem)",
          }}>
            {/* Wall Street Journal */}
            <span style={{ fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: "1.23rem",
              letterSpacing: "0.04em", color: INK, opacity: 0.42,
              textTransform: "uppercase", whiteSpace: "nowrap" }}>
              The Wall Street Journal
            </span>
            {/* Bloomberg */}
            <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: "1.5rem",
              letterSpacing: "-0.02em", color: INK, opacity: 0.42,
              textTransform: "uppercase", whiteSpace: "nowrap" }}>
              Bloomberg
            </span>
            {/* NYT */}
            <span style={{ fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: "1.23rem",
              letterSpacing: "0.02em", color: INK, opacity: 0.42,
              whiteSpace: "nowrap" }}>
              The New York Times
            </span>
            {/* NPR */}
            <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: "1.32rem",
              letterSpacing: "0.06em", color: INK, opacity: 0.42,
              textTransform: "uppercase", whiteSpace: "nowrap" }}>
              NPR
            </span>
            {/* BBC — three-box SVG */}
            <svg width="90" height="33" viewBox="0 0 90 33" fill="none"
              style={{ opacity: 0.42, flexShrink: 0 }}>
              <rect x="0"    y="0" width="27" height="33" fill={INK} />
              <rect x="31.5" y="0" width="27" height="33" fill={INK} />
              <rect x="63"   y="0" width="27" height="33" fill={INK} />
              <text x="13.5" y="23" textAnchor="middle" fontFamily={FONT} fontWeight="900"
                fontSize="19.5" fill="#F4F5F7">B</text>
              <text x="45"   y="23" textAnchor="middle" fontFamily={FONT} fontWeight="900"
                fontSize="19.5" fill="#F4F5F7">B</text>
              <text x="76.5" y="23" textAnchor="middle" fontFamily={FONT} fontWeight="900"
                fontSize="19.5" fill="#F4F5F7">C</text>
            </svg>
            {/* CoinDesk */}
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.32rem",
              letterSpacing: "-0.01em", color: INK, opacity: 0.42,
              whiteSpace: "nowrap" }}>
              CoinDesk
            </span>
            {/* Grant's */}
            <span style={{ fontFamily: "'Georgia', serif", fontStyle: "italic",
              fontWeight: 700, fontSize: "1.32rem",
              color: INK, opacity: 0.42, whiteSpace: "nowrap" }}>
              Grant's
            </span>
            {/* ABI Journal */}
            <span style={{ fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: "1.23rem",
              letterSpacing: "0.06em", color: INK, opacity: 0.42,
              textTransform: "uppercase", whiteSpace: "nowrap" }}>
              ABI Journal
            </span>
          </div>
        </div>
      </section>

      {/* ── Media Coverage ────────────────────────────────────────── */}
      <section style={{
        background: "#FFFFFF",
        padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
        borderTop: `1px solid ${LINE}`,
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: "clamp(2rem,5vw,5rem)",
            marginBottom: "clamp(3rem,6vw,5rem)",
            alignItems: "end",
          }} className="press-split">
            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: INK_60, marginBottom: "1.2rem",
              }}>
                Media Coverage
              </p>
              <h2 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(2rem,4.5vw,4rem)",
                lineHeight: 1.02, letterSpacing: "-0.04em",
                color: INK, margin: 0,
              }}>
                In the<br />
                <span className="accent-light">press.</span>
              </h2>
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
              color: INK_60, lineHeight: 1.6, maxWidth: 640,
            }}>
              Selected quotes, features, and commentary from financial and legal media covering bankruptcy, crypto insolvencies, and AI copyright claims.
            </p>
          </div>

          {PRESS_ITEMS.length === 0 ? (
            <div style={{
              padding: "3rem", border: `1px dashed ${LINE}`,
              color: INK_60, fontFamily: FONT, fontSize: "0.92rem",
              fontStyle: "italic", textAlign: "center",
            }}>
              Press coverage to be added — populate the <code style={{ fontSize: "0.85em", background: "#f0f0f0", padding: "0.1em 0.4em" }}>PRESS_ITEMS</code> array at the top of this file.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "clamp(1.5rem, 3vw, 2.5rem)",
            }} className="press-grid">
              {PRESS_ITEMS.map((item, i) => <PressCard key={i} item={item} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── By Andrew ─────────────────────────────────────────────── */}
      <section style={{
        background: "#F4F5F7",
        padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
        borderTop: `1px solid ${LINE}`,
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: "clamp(2rem,5vw,5rem)",
            marginBottom: "clamp(3rem,6vw,5rem)",
            alignItems: "end",
          }} className="press-split">
            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: INK_60, marginBottom: "1.2rem",
              }}>
                By Andrew
              </p>
              <h2 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(2rem,4.5vw,4rem)",
                lineHeight: 1.02, letterSpacing: "-0.04em",
                color: INK, margin: 0,
              }}>
                Articles &<br />
                <span className="accent-light">commentary.</span>
              </h2>
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
              color: INK_60, lineHeight: 1.6, maxWidth: 640,
            }}>
              Analysis, op-eds, and published work authored by Andrew Glantz on claims markets, restructuring, and digital assets.
            </p>
          </div>

          {BY_ANDREW.length === 0 ? (
            <div style={{
              padding: "3rem", border: `1px dashed ${LINE}`,
              color: INK_60, fontFamily: FONT, fontSize: "0.92rem",
              fontStyle: "italic", textAlign: "center",
            }}>
              Publications to be added — populate the <code style={{ fontSize: "0.85em", background: "#e8e8e8", padding: "0.1em 0.4em" }}>BY_ANDREW</code> array at the top of this file.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "clamp(1.5rem, 3vw, 2.5rem)",
            }} className="press-by-grid">
              {BY_ANDREW.map((item, i) => <ByAndrewCard key={i} item={item} />)}
            </div>
          )}
        </div>
      </section>

      <BottomCTA
        eyebrow="Get in Touch"
        title="Have a claim?"
        accent="Talk to us."
        kicker="48-hour response. Confidentiality default."
        primary={{ label: "Get in Touch", href: hashHref("contact") }}
      />

      <style>{`
        @media (max-width: 880px) {
          .press-split { grid-template-columns: 1fr !important; }
          .press-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .press-grid   { grid-template-columns: 1fr !important; }
          .press-by-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

/* ── Card components ─────────────────────────────────────────────────────── */

function PressCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const inner = (
    <div style={{
      borderTop: `2px solid ${INK}`,
      padding: "1.4rem 0 0",
      opacity: hovered && item.href ? 0.65 : 1,
      transition: "opacity 0.2s",
    }}>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: INK_60, marginBottom: "0.7rem",
      }}>
        {item.outlet}{item.date ? ` · ${item.date}` : ""}
      </p>
      <h3 style={{
        fontFamily: FONT, fontWeight: 800,
        fontSize: "clamp(1rem, 1.4vw, 1.15rem)",
        lineHeight: 1.3, letterSpacing: "-0.01em",
        color: INK, marginBottom: item.excerpt ? "0.75rem" : 0,
      }}>
        {item.headline}
      </h3>
      {item.excerpt && (
        <p style={{
          fontFamily: FONT, fontSize: "0.95rem",
          color: INK_60, lineHeight: 1.6,
          borderLeft: `3px solid ${NEON}`,
          paddingLeft: "0.8rem", margin: 0,
        }}>
          "{item.excerpt}"
        </p>
      )}
    </div>
  );
  if (item.href) {
    return (
      <a
        href={item.href} target="_blank" rel="noopener noreferrer"
        style={{ display: "block", textDecoration: "none" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}

function ByAndrewCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const inner = (
    <div style={{
      background: "#fff", border: `1px solid ${LINE}`,
      padding: "clamp(1.5rem, 3vw, 2rem)",
      opacity: hovered && item.href ? 0.65 : 1,
      transition: "opacity 0.2s",
    }}>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: INK_60, marginBottom: "0.7rem",
      }}>
        {item.venue}{item.date ? ` · ${item.date}` : ""}
      </p>
      <h3 style={{
        fontFamily: FONT, fontWeight: 800,
        fontSize: "clamp(1.1rem, 1.6vw, 1.35rem)",
        lineHeight: 1.25, letterSpacing: "-0.01em",
        color: INK, marginBottom: item.excerpt ? "0.7rem" : 0,
      }}>
        {item.title}
      </h3>
      {item.excerpt && (
        <p style={{
          fontFamily: FONT, fontSize: "0.95rem",
          color: INK_60, lineHeight: 1.6, margin: 0,
        }}>
          {item.excerpt}
        </p>
      )}
    </div>
  );
  if (item.href) {
    return (
      <a
        href={item.href} target="_blank" rel="noopener noreferrer"
        style={{ display: "block", textDecoration: "none" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}
