import React, { useState } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import BottomCTA from "../components/BottomCTA.jsx";
import pressData from "../data/press.json";

/* ── Data-driven from src/data/press.json (managed via /#/admin) ─────────────
   Types "publication" and "podcast" → In the press section
   Types "article", "social post", "blog post" → By Andrew section          */
const MEDIA_TYPES = new Set(["publication", "podcast"]);
const AUTHOR_TYPES = new Set(["article", "social post", "blog post"]);

const ALL_ITEMS = (pressData.items || []);

// Map to the shape each card component expects
const PRESS_ITEMS = ALL_ITEMS
  .filter(d => MEDIA_TYPES.has(d.type))
  .map(d => ({
    outlet:   d.publication_title,
    date:     d.date || null,
    headline: d.piece_title,
    excerpt:  d.excerpt || null,
    href:     d.url || null,
  }));

const BY_ANDREW = ALL_ITEMS
  .filter(d => AUTHOR_TYPES.has(d.type))
  .map(d => ({
    venue:   d.publication_title,
    date:    d.date || null,
    title:   d.piece_title,
    excerpt: d.excerpt || null,
    href:    d.url || null,
  }));

export default function Press() {
  return (
    <>
      {/* ── Divider strip ─────────────────────────────────────────── */}
      <div style={{ width: "100%", height: "clamp(120px, 18vw, 220px)", overflow: "hidden", display: "block" }}>
        <img
          src="/metal-folds.jpg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
      </div>

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
