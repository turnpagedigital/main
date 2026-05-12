import React from "react";
import { NEON, FONT, INK, INK_60, LINE, LINE_STRONG } from "../data/tokens.js";

/* Rich sub-brand tile for the home page grid. Includes tag, oversized number,
   title, body, and bullet highlights. Three variants per the site:
   - featured: prominent, neon accents
   - live: standard
   - soon: muted, "coming soon" stamp */

const VARIANTS = {
  featured: {
    bg: "#0A0A0A", color: "#fff",
    border: "rgba(255,255,255,0.14)",
    tagBg: NEON, tagColor: "#000",
    titleColor: "#fff", bodyColor: "rgba(255,255,255,0.7)",
    bulletColor: "rgba(255,255,255,0.78)",
    bulletArrow: NEON,        // neon on dark — fine
    numberColor: NEON,
    ctaColor: NEON,
    hoverBorder: NEON,
  },
  live: {
    bg: "#fff", color: INK,
    border: LINE,
    tagBg: INK, tagColor: "#fff",
    titleColor: INK, bodyColor: INK_60,
    bulletColor: INK,
    bulletArrow: INK,         // ink on white — readable
    numberColor: INK,
    ctaColor: INK,
    hoverBorder: INK,
  },
  soon: {
    bg: "#fff", color: INK,
    border: LINE,
    tagBg: "rgba(10,10,10,0.08)", tagColor: INK_60,
    titleColor: INK, bodyColor: INK_60,
    bulletColor: INK_60,
    bulletArrow: INK_60,      // muted ink on white
    numberColor: "rgba(10,10,10,0.25)",
    ctaColor: INK_60,
    hoverBorder: LINE_STRONG,
  },
};

export default function SubBrandTile({
  variant = "live",
  number,
  tag,
  title,
  body,
  bullets = [],
  href,
  cta = "Explore →",
}) {
  const v = VARIANTS[variant] || VARIANTS.live;
  return (
    <a
      href={href}
      style={{
        background: v.bg, color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: 18,
        padding: "1.8rem 1.7rem 1.6rem",
        transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s",
        position: "relative", overflow: "hidden",
        minHeight: 360,
        display: "flex", flexDirection: "column",
        textDecoration: "none",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = v.hoverBorder;
        e.currentTarget.style.transform = "translateY(-4px)";
        if (variant !== "featured") {
          e.currentTarget.style.boxShadow = "0 14px 36px rgba(10,10,10,0.08)";
        } else {
          e.currentTarget.style.boxShadow = "0 14px 40px rgba(212,255,0,0.18)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = v.border;
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {variant === "featured" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(70% 60% at 100% 0%, rgba(212,255,0,0.10), transparent 60%)",
          pointerEvents: "none",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.4rem" }}>
          {tag && (
            <span style={{
              fontFamily: FONT, fontSize: "0.66rem", fontWeight: 800,
              letterSpacing: "0.18em", textTransform: "uppercase",
              padding: "0.32rem 0.7rem", borderRadius: 4,
              background: v.tagBg, color: v.tagColor,
            }}>{tag}</span>
          )}
          {number && (
            <span style={{
              fontFamily: FONT, fontSize: "2.4rem", fontWeight: 900,
              letterSpacing: "-0.04em", color: v.numberColor, lineHeight: 1,
            }}>{number}</span>
          )}
        </div>
        <h3 style={{
          fontFamily: FONT, fontSize: "clamp(1.4rem, 2vw, 1.7rem)",
          fontWeight: 800, color: v.titleColor,
          letterSpacing: "-0.015em", marginBottom: "0.7rem", lineHeight: 1.15,
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.95rem", color: v.bodyColor,
          lineHeight: 1.6, marginBottom: bullets.length ? "1.2rem" : "1.6rem",
        }}>
          {body}
        </p>
        {bullets.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {bullets.map((b, i) => (
              <li key={i} style={{
                fontFamily: FONT, fontSize: "0.87rem", color: v.bulletColor,
                paddingLeft: "1.1rem", position: "relative", lineHeight: 1.5,
              }}>
                <span style={{ position: "absolute", left: 0, top: 0, color: v.bulletArrow, fontWeight: 700 }}>›</span>
                {b}
              </li>
            ))}
          </ul>
        )}
        <span style={{
          marginTop: "auto",
          fontFamily: FONT, fontSize: "0.86rem", fontWeight: 700,
          color: v.ctaColor, letterSpacing: "0.02em",
        }}>
          {cta}
        </span>
      </div>
    </a>
  );
}
