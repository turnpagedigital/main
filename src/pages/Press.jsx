import React, { useState } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import BottomCTA from "../components/BottomCTA.jsx";
import pressData from "../data/press.json";

/* ── Data-driven from src/data/press.json (managed via /#/admin) ─────────────
   author === "Other" (or unset)              → In the press
   author === "Andrew", type !== "social post" → Articles & Commentary
   author === "Andrew", type === "social post" → LinkedIn Posts         */
const ALL_ITEMS = (pressData.items || []);

const PRESS_ITEMS = ALL_ITEMS
  .filter(d => d.author !== "Andrew")
  .map(d => ({
    outlet:   d.publication_title,
    date:     d.date || null,
    headline: d.piece_title,
    excerpt:  d.excerpt || null,
    href:     d.url || null,
  }));

const BY_ANDREW = ALL_ITEMS
  .filter(d => d.author === "Andrew" && d.type !== "social post")
  .map(d => ({
    venue:   d.publication_title,
    date:    d.date || null,
    title:   d.piece_title,
    excerpt: d.excerpt || null,
    href:    d.url || null,
  }));

const LINKEDIN_POSTS = ALL_ITEMS
  .filter(d => d.author === "Andrew" && d.type === "social post")
  .map(d => ({
    date:    d.date || null,
    title:   d.piece_title || null,
    excerpt: d.excerpt || null,
    href:    d.url || null,
  }));

export default function Press() {
  return (
    <>
      {/* ── Divider strip ─────────────────────────────────────────── */}
      <div style={{ width: "100%", height: "clamp(180px, 27vw, 330px)", overflow: "hidden", display: "block" }}>
        <img
          src="/metal-folds.jpg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
      </div>

      {/* ── Media Coverage ────────────────────────────────────────── */}
      <section style={{
        background: "#FFFFFF",
        padding: "clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 5vw, 4rem) clamp(5rem, 12vw, 11rem)",
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
              Articles to be added via admin.
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

      {/* ── LinkedIn Posts ────────────────────────────────────────── */}
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
                color: "#0A66C2", marginBottom: "1.2rem",
                display: "flex", alignItems: "center", gap: "0.5em",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2" style={{ flexShrink: 0 }}>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </p>
              <h2 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(2rem,4.5vw,4rem)",
                lineHeight: 1.02, letterSpacing: "-0.04em",
                color: INK, margin: 0,
              }}>
                On the<br />
                <span className="accent-light">feed.</span>
              </h2>
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
              color: INK_60, lineHeight: 1.6, maxWidth: 640,
            }}>
              Posts from Andrew on LinkedIn — market commentary, case updates, and observations from the claims desk.
            </p>
          </div>

          {LINKEDIN_POSTS.length === 0 ? (
            <div style={{
              padding: "3rem", border: `1px dashed ${LINE}`,
              color: INK_60, fontFamily: FONT, fontSize: "0.92rem",
              fontStyle: "italic", textAlign: "center",
            }}>
              LinkedIn posts to be added via admin — select type "Social post" and author "Andrew".
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "clamp(1rem, 2vw, 1.5rem)",
            }} className="press-li-grid">
              {LINKEDIN_POSTS.map((item, i) => <LinkedInCard key={i} item={item} />)}
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
          .press-grid    { grid-template-columns: 1fr !important; }
          .press-by-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 880px) {
          .press-li-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .press-li-grid { grid-template-columns: 1fr !important; }
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

function LinkedInCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const inner = (
    <div style={{
      background: "#fff",
      border: `1px solid ${LINE}`,
      borderTop: "3px solid #0A66C2",
      padding: "1.4rem 1.5rem",
      height: "100%", boxSizing: "border-box",
      opacity: hovered && item.href ? 0.72 : 1,
      transition: "opacity 0.2s",
      display: "flex", flexDirection: "column", gap: "0.65rem",
    }}>
      {/* Header row: LinkedIn icon + date */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.45em" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#0A66C2" style={{ flexShrink: 0 }}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        <span style={{
          fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase", color: "#0A66C2",
        }}>
          {item.date || "LinkedIn"}
        </span>
      </div>
      {/* Optional title/topic */}
      {item.title && (
        <p style={{
          fontFamily: FONT, fontWeight: 700, fontSize: "0.95rem",
          color: INK, lineHeight: 1.3, margin: 0,
        }}>
          {item.title}
        </p>
      )}
      {/* Post text */}
      {item.excerpt && (
        <p style={{
          fontFamily: FONT, fontSize: "0.92rem",
          color: INK_60, lineHeight: 1.65, margin: 0, flex: 1,
        }}>
          {item.excerpt}
        </p>
      )}
      {/* View post link */}
      {item.href && (
        <span style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
          color: "#0A66C2", letterSpacing: "0.02em", marginTop: "auto",
        }}>
          View post →
        </span>
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
