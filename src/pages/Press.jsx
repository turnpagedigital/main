import React, { useState } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import BottomCTA from "../components/BottomCTA.jsx";
import pressData from "../data/press.json";

/* ── Outlet name → domain (used for Clearbit logo fetches) ──────────────── */
const OUTLET_DOMAINS = {
  "wall street journal": "wsj.com",
  "wsj": "wsj.com",
  "bloomberg": "bloomberg.com",
  "bloomberg law": "bloomberg.com",
  "bloomberg businessweek": "bloomberg.com",
  "new york times": "nytimes.com",
  "the new york times": "nytimes.com",
  "nyt": "nytimes.com",
  "financial times": "ft.com",
  "the financial times": "ft.com",
  "ft": "ft.com",
  "reuters": "reuters.com",
  "npr": "npr.org",
  "bbc": "bbc.com",
  "bbc news": "bbc.com",
  "forbes": "forbes.com",
  "fortune": "fortune.com",
  "axios": "axios.com",
  "coindesk": "coindesk.com",
  "coin desk": "coindesk.com",
  "cointelegraph": "cointelegraph.com",
  "coin telegraph": "cointelegraph.com",
  "the block": "theblock.co",
  "decrypt": "decrypt.co",
  "law360": "law360.com",
  "abi journal": "abi.org",
  "american bankruptcy institute": "abi.org",
  "grant's": "grantspub.com",
  "grant's interest rate observer": "grantspub.com",
  "politico": "politico.com",
  "the information": "theinformation.com",
  "techcrunch": "techcrunch.com",
  "wired": "wired.com",
  "the verge": "theverge.com",
  "variety": "variety.com",
  "hollywood reporter": "hollywoodreporter.com",
  "the hollywood reporter": "hollywoodreporter.com",
  "guardian": "theguardian.com",
  "the guardian": "theguardian.com",
  "washington post": "washingtonpost.com",
  "the washington post": "washingtonpost.com",
  "cnbc": "cnbc.com",
  "cnn": "cnn.com",
  "barron's": "barrons.com",
  "barrons": "barrons.com",
  "seeking alpha": "seekingalpha.com",
  "yahoo finance": "finance.yahoo.com",
  "the atlantic": "theatlantic.com",
  "new yorker": "newyorker.com",
  "the new yorker": "newyorker.com",
  "slate": "slate.com",
  "vox": "vox.com",
  "business insider": "businessinsider.com",
  "insider": "businessinsider.com",
  "morning brew": "morningbrew.com",
  "the economist": "economist.com",
};

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

const SOCIAL_POSTS = ALL_ITEMS
  .filter(d => d.author === "Andrew" && d.type === "social post")
  .map(d => ({
    platform: d.publication_title || "",   // e.g. "LinkedIn", "X", "Substack"
    date:     d.date || null,
    title:    d.piece_title || null,
    excerpt:  d.excerpt || null,
    href:     d.url || null,
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
        background: "#080C12",
        padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
        borderTop: "1px solid rgba(10,102,194,0.2)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle dark gradient accent */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(70% 50% at 50% 0%, rgba(10,102,194,0.07), transparent 70%)",
        }} />
        <div style={{ maxWidth: 1440, margin: "0 auto", position: "relative" }}>
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
                color: "rgba(255,255,255,0.45)", marginBottom: "1.2rem",
                display: "flex", alignItems: "center", gap: "0.5em",
              }}>
                {/* Feed icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Social
              </p>
              <h2 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(2rem,4.5vw,4rem)",
                lineHeight: 1.02, letterSpacing: "-0.04em",
                color: "#fff", margin: 0,
              }}>
                On the<br />
                <span style={{ color: NEON }}>feed.</span>
              </h2>
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
              color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: 640,
            }}>
              Posts from Andrew across LinkedIn, X, and beyond — market commentary, case updates, and observations from the claims desk.
            </p>
          </div>

          {SOCIAL_POSTS.length === 0 ? (
            <div style={{
              padding: "3rem", border: "1px dashed rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.35)", fontFamily: FONT, fontSize: "0.92rem",
              fontStyle: "italic", textAlign: "center",
            }}>
              Social posts to be added via admin — select type "Social post", author "Andrew", and enter the platform name (LinkedIn, X, etc.) in the outlet field.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "clamp(1rem, 2vw, 1.5rem)",
            }} className="press-li-grid">
              {SOCIAL_POSTS.map((item, i) => <SocialPostCard key={i} item={item} />)}
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

/* ── Clearbit logo helper ────────────────────────────────────────────────── */
function OutletLogo({ name, style = {} }) {
  const domain = name ? OUTLET_DOMAINS[name.toLowerCase().trim()] : null;
  if (!domain) return null;
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      style={{
        height: 22, maxWidth: 110, width: "auto",
        objectFit: "contain", objectPosition: "left center",
        display: "block", marginBottom: "0.9rem",
        ...style,
      }}
      onError={e => { e.currentTarget.style.display = "none"; }}
    />
  );
}

/* ── Card components ─────────────────────────────────────────────────────── */

function PressCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const inner = (
    <div style={{
      opacity: hovered && item.href ? 0.65 : 1,
      transition: "opacity 0.2s",
    }}>
      <OutletLogo name={item.outlet} />
      <div style={{ borderTop: `2px solid ${INK}`, paddingTop: "1.4rem" }}>
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
            display: "-webkit-box", WebkitLineClamp: 8,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            "{item.excerpt}"
          </p>
        )}
      </div>
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
      height: "100%", boxSizing: "border-box",
    }}>
      <OutletLogo name={item.venue} style={{ marginBottom: "1rem", filter: "grayscale(1)", opacity: 0.6 }} />
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
          display: "-webkit-box", WebkitLineClamp: 8,
          WebkitBoxOrient: "vertical", overflow: "hidden",
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

/* ── Platform icons + color map ─────────────────────────────────────────── */
const PlatformIcon = ({ platform, size = 14, color = "currentColor" }) => {
  const key = (platform || "").toLowerCase().trim();
  if (key === "linkedin") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
  if (key === "x" || key === "twitter") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
  if (key === "substack") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
    </svg>
  );
  /* Generic speech-bubble fallback */
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
};

function getPlatformAccent(platform) {
  const key = (platform || "").toLowerCase().trim();
  if (key === "linkedin") return "#0A66C2";
  if (key === "x" || key === "twitter") return "#e7e7e7";
  if (key === "substack") return "#FF6719";
  return "rgba(255,255,255,0.5)";
}

function getPlatformLabel(platform) {
  const key = (platform || "").toLowerCase().trim();
  if (key === "x") return "X";
  if (key === "twitter") return "X (Twitter)";
  if (!platform) return "Social";
  return platform;
}

function SocialPostCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const accent = getPlatformAccent(item.platform);
  const label  = getPlatformLabel(item.platform);

  const inner = (
    <div style={{
      background: "#0D1827",
      border: `1px solid ${accent}33`,   /* 20% opacity border in accent color */
      padding: "1.6rem 1.8rem",
      height: "100%", boxSizing: "border-box",
      opacity: hovered && item.href ? 0.8 : 1,
      transition: "opacity 0.2s",
      display: "flex", flexDirection: "column", gap: "0.75rem",
      position: "relative", overflow: "hidden",
    }}>
      {/* Subtle glow top-left in platform accent color */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(60% 55% at 0% 0%, ${accent}22, transparent 65%)`,
      }} />
      {/* Header: platform icon + label + date */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45em" }}>
          <PlatformIcon platform={item.platform} size={14} color={accent} />
          <span style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", color: accent,
          }}>
            {label}
          </span>
        </div>
        {item.date && (
          <span style={{
            fontFamily: FONT, fontSize: "0.68rem",
            color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em",
          }}>
            {item.date}
          </span>
        )}
      </div>
      {/* Optional topic/title label */}
      {item.title && (
        <p style={{
          fontFamily: FONT, fontWeight: 700, fontSize: "0.85rem",
          color: "rgba(255,255,255,0.5)", lineHeight: 1.3,
          margin: 0, position: "relative",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {item.title}
        </p>
      )}
      {/* Post excerpt — hero text */}
      {item.excerpt && (
        <p style={{
          fontFamily: FONT,
          fontSize: "clamp(0.97rem, 1.2vw, 1.05rem)",
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.7, margin: 0,
          position: "relative", fontStyle: "italic",
          display: "-webkit-box", WebkitLineClamp: 8,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          "{item.excerpt}"
        </p>
      )}
      {/* View post CTA */}
      {item.href && (
        <span style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
          color: accent, letterSpacing: "0.04em",
          marginTop: "auto", position: "relative",
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
  return <div style={{ height: "100%" }}>{inner}</div>;
}
