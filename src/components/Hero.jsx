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
  size = "default", // "default" | "short" | "medium" | "tall" | "full"
  titleSize = "xl", // "xl" (home-scale) | "large" | "standard"
  video = null,
  image = null, // custom photo background — gets the video layer's treatment, not the crushed paper-base filter
}) {
  const isShort = size === "short";
  const isMedium = size === "medium";
  const isTall = size === "tall";
  const isFull = size === "full";
  return (
    <section style={{
      position: "relative", overflow: "hidden",
      minHeight: isFull ? "calc(100vh - 88px)" : isTall ? "clamp(520px, 70vh, 900px)" : isMedium ? "clamp(400px, 52vh, 650px)" : isShort ? "clamp(260px, 35vh, 450px)" : undefined,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: isTall || isFull || isMedium
        ? "clamp(3rem,7.5vw,6.5rem) clamp(1.5rem,5vw,4rem) clamp(3.5rem,7vw,6.5rem)"
        : isShort
        ? "clamp(1.5rem,3.5vw,3rem) clamp(1.5rem,5vw,4rem) clamp(1.75rem,3.5vw,3rem)"
        : "clamp(3rem,6vw,5.5rem) clamp(1.5rem,5vw,4rem) clamp(2.5rem,5.5vw,5rem)",
      background: "#000",
    }}>
      {/* BG image */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <img
          src="/bg-paper.jpg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.22) contrast(1.1)" }}
        />
      </div>
      {/* Optional custom image background — same layer/treatment as video */}
      {image && (
        <img
          src={image}
          alt=""
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{
            position: "absolute", inset: 0, zIndex: 1,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: 0.9, filter: "saturate(1.0) contrast(1.05) brightness(0.72)",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Optional video background */}
      {video && (
        <video
          autoPlay muted loop playsInline
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{
            position: "absolute", inset: 0, zIndex: 1,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: 0.9, filter: "saturate(1.0) contrast(1.05) brightness(0.72) sepia(0.18)",
            pointerEvents: "none",
          }}
        >
          <source src={video} type="video/mp4" />
        </video>
      )}
      {/* Warm tint overlay (only when video is present) */}
      {video && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "rgba(210, 120, 30, 0.06)",
        }} />
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
      <div className="container" style={{ position: "relative", zIndex: 10, maxWidth: 1440, width: "100%" }}>
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
          fontFamily: FONT, fontWeight: 900,
          fontSize: titleSize === "standard" ? "clamp(1.8rem, 4vw, 3.2rem)"
            : titleSize === "medium" ? "clamp(2rem, 4.75vw, 4rem)"
            : titleSize === "large" ? "clamp(2.2rem, 5.5vw, 4.8rem)"
            : "clamp(2.6rem, 7vw, 7rem)",
          lineHeight: titleSize === "standard" ? 1.06 : 1.02,
          letterSpacing: titleSize === "standard" ? "-0.02em" : "-0.035em",
          color: "#fff", marginBottom: "1.2rem", maxWidth: 1200,
        }}>
          {title}
          {accentTitle && (
            <>
              {" "}
              {/* inline-block makes the accent wrap as one unit: the line breaks
                  before it when it doesn't fit, keeping the accent words together
                  (it still wraps internally if longer than a full line) */}
              <span style={{ color: NEON, fontStyle: "italic", fontWeight: 800, display: "inline-block" }}>{accentTitle}</span>
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
    </section>
  );
}
