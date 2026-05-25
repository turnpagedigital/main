import React from "react";
import { NEON, FONT } from "../data/tokens.js";

/* Dramatic dark hero used at the top of every subpage. Reads as a single
   black-paper canvas with a neon-accented title. */
export default function Hero({
  eyebrow,
  title,
  subtitle,
  accentTitle,
  children,
  size = "default", // "default" | "tall"
  video = null,
  videoMode = "feature", // "bg" | "feature"
}) {
  const isTall = size === "tall";
  const hasFeatureVideo = video && videoMode === "feature";
  const hasBgVideo = video && videoMode === "bg";

  return (
    <section style={{ background: "#000", overflow: "hidden" }}>
      {/* ── Text zone ── */}
      <div style={{
        position: "relative",
        padding: isTall
          ? "clamp(4rem,9vw,7rem) clamp(1.5rem,5vw,4rem) clamp(4.5rem,8vw,7rem)"
          : "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,4rem) clamp(3rem,6vw,5rem)",
      }}>
        {/* BG image */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img
            src="/bg-paper.jpg"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.22) contrast(1.1)" }}
          />
        </div>
        {/* BG video mode */}
        {hasBgVideo && (
          <video
            autoPlay muted loop playsInline
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            style={{
              position: "absolute", inset: 0, zIndex: 1,
              width: "100%", height: "100%", objectFit: "cover",
              opacity: 0.75, filter: "saturate(0.7) contrast(1.05) brightness(0.6)",
              pointerEvents: "none",
            }}
          >
            <source src={video} type="video/mp4" />
          </video>
        )}
        {/* Grain */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, opacity: 0.05, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }} />
        {/* Gradient */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.6) 100%)",
        }} />
        {/* Soft neon glow */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "radial-gradient(50% 60% at 80% 0%, rgba(212,255,0,0.08), transparent 60%), radial-gradient(40% 50% at 0% 100%, rgba(212,255,0,0.04), transparent 70%)",
        }} />

        {/* Content */}
        <div className="container" style={{ position: "relative", zIndex: 10, maxWidth: 920 }}>
          {eyebrow && (
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase", color: NEON,
              marginBottom: "1.2rem",
            }}>
              {eyebrow}
            </p>
          )}
          <h1 className="hero-title-xl" style={{
            fontFamily: FONT, fontWeight: 900, fontSize: "clamp(2rem,4.8vw,3.6rem)",
            lineHeight: 1.06, letterSpacing: "-0.02em", color: "#fff",
            marginBottom: "1.2rem",
          }}>
            {title}
            {accentTitle && (
              <>
                {" "}
                <span style={{ color: NEON, fontStyle: "italic", fontWeight: 800 }}>{accentTitle}</span>
              </>
            )}
          </h1>
          {subtitle && (
            <p className="hero-sub-xl" style={{
              fontFamily: FONT, fontSize: "clamp(1.05rem,1.6vw,1.25rem)",
              fontWeight: 400, lineHeight: 1.55, color: "rgba(255,255,255,0.82)",
              maxWidth: 760, marginBottom: children ? "1.8rem" : 0,
            }}>
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>

      {/* ── Feature video strip ── */}
      {hasFeatureVideo && (
        <div style={{
          position: "relative", width: "100%",
          height: "clamp(240px, 38vw, 580px)",
          overflow: "hidden",
        }}>
          <video
            autoPlay muted loop playsInline
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              filter: "saturate(0.75) contrast(1.05)",
              display: "block",
            }}
          >
            <source src={video} type="video/mp4" />
          </video>
          {/* Subtle top fade to blend with dark text zone */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.3) 100%)",
          }} />
        </div>
      )}
    </section>
  );
}
