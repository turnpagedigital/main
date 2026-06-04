import React from "react";
import { NEON, FONT } from "../../data/tokens.js";

/* Full-screen video hero — Home page only.
   Content driven by sectionConfig.content from page-compositions.json. */
export default function HomeHeroSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const title1      = c.title1      || "We broker the claims";
  const title2      = c.title2      || "no one else will.";
  const subtitle    = c.subtitle    || "";
  const ctaPrimary  = c.ctaPrimary  || { label: "Get a Quote", href: "/contact" };
  const ctaSecondary= c.ctaSecondary|| { label: "What we cover", href: "#situations" };
  const video       = c.video       || null;

  return (
    <section style={{
      position: "relative", overflow: "hidden",
      minHeight: "calc(100vh - 88px)",
      display: "flex", alignItems: "flex-end",
      padding: "0 clamp(1.5rem,5vw,4rem) clamp(3rem,6vh,5rem)",
      background: "#06070A",
    }}>
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #0A0C10 0%, #06070A 100%)",
      }} />
      {video && (
        <video
          autoPlay muted loop playsInline preload="none"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{
            position: "absolute", inset: 0, zIndex: 1,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: 0.85, filter: "saturate(0.85) contrast(1.05)",
            pointerEvents: "none",
          }}
        >
          <source src={video} type="video/mp4" />
        </video>
      )}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, transparent 30%, transparent 45%, rgba(0,0,0,0.70) 100%)",
      }} />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1440, width: "100%", margin: "0 auto" }}>
        <h1 style={{
          fontFamily: FONT, fontWeight: 900,
          fontSize: "clamp(2.6rem, 8vw, 7.5rem)",
          lineHeight: 0.96, letterSpacing: "-0.04em",
          color: "#FFFFFF", marginBottom: "1.8rem",
          maxWidth: 1200,
        }}>
          {title1}<br />
          <span style={{ fontStyle: "italic", fontWeight: 800, color: NEON }}>{title2}</span>
        </h1>
        <p style={{
          fontFamily: FONT, fontSize: "clamp(1rem, 1.5vw, 1.3rem)",
          color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
          maxWidth: 720, marginBottom: "2.4rem",
        }}>
          {subtitle}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={ctaPrimary.href} className="btn-neon">{ctaPrimary.label}</a>
          <a
            href={ctaSecondary.href}
            style={{
              fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600,
              color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em",
              padding: "1em 0", borderBottom: "1px solid rgba(255,255,255,0.4)",
              transition: "color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
          >
            {ctaSecondary.label} →
          </a>
        </div>
      </div>

      <div style={{
        position: "absolute", right: "clamp(1.5rem,5vw,4rem)", bottom: "2rem", zIndex: 10,
        fontFamily: FONT, fontSize: "0.7rem", fontWeight: 600,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.5)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
      }} className="hide-on-mobile">
        <span>Scroll</span>
        <span style={{ width: 1, height: 36, background: "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)" }} />
      </div>
    </section>
  );
}
