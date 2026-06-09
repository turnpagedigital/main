import React from "react";
import { NEON, FONT, INK } from "../data/tokens.js";

/* Polestar-style horizontal CTA banner.
   Narrow wide photo with a headline overlaid on the left and a black button
   carrying a neon-green arrow.  Used as a recurring "subscribe / take action"
   moment across pages. */
export default function CTABanner({
  title,
  href,
  cta = "Sign up",
  image = "/Building_Wide.jpg",
  external = false,
  align = "left",
}) {
  const isRight = align === "right";
  return (
    <section style={{
      position: "relative", overflow: "hidden",
      minHeight: "clamp(280px, 36vw, 460px)",
      display: "flex", alignItems: "center",
    }}>
      <img
        src={image}
        alt=""
        loading="lazy"
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          width: "100%", height: "100%", objectFit: "cover",
          filter: "saturate(0.6) contrast(1.05)",
        }}
      />
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: isRight
          ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.20) 35%, rgba(255,255,255,0.70) 65%, rgba(255,255,255,0.92) 100%)"
          : "linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.70) 35%, rgba(255,255,255,0.20) 65%, transparent 100%)",
      }} className="cta-banner-overlay" />
      <div style={{
        position: "relative", zIndex: 2,
        maxWidth: 1440, width: "100%", margin: "0 auto",
        padding: "clamp(2.5rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)",
        display: "flex", flexDirection: "column",
        alignItems: isRight ? "flex-end" : "flex-start",
      }}>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(1.6rem, 3.4vw, 2.8rem)",
          lineHeight: 1.1, letterSpacing: "-0.025em",
          color: INK, marginBottom: "2rem",
          maxWidth: 640,
          textAlign: isRight ? "right" : "left",
        }}>
          {title}
        </h2>
        <
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.7em",
            fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700,
            color: "#fff", background: INK,
            padding: "0.95rem 1.5rem",
            letterSpacing: "0.02em",
            transition: "background 0.2s, gap 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.gap = "1em"; e.currentTarget.style.background = "#222"; }}
          onMouseLeave={e => { e.currentTarget.style.gap = "0.7em"; e.currentTarget.style.background = INK; }}
        >
          <span>{cta}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .cta-banner-overlay {
            background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.85) 70%, rgba(255,255,255,0.75) 100%) !important;
          }
        }
      `}</style>
    </section>
  );
}
