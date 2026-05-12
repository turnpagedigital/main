import React from "react";
import { NEON, FONT } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

export default function NotFound() {
  return (
    <section style={{
      position: "relative", overflow: "hidden",
      background: "#000",
      padding: "clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)",
      textAlign: "center", minHeight: "calc(100vh - 100px)",
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
    }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.18) contrast(1.1)" }} />
      </div>
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(50% 50% at 50% 30%, rgba(212,255,0,0.08), transparent 60%)",
      }} />
      <div style={{ position: "relative", zIndex: 5 }}>
        <p style={{
          fontFamily: FONT, fontWeight: 900, fontSize: "clamp(5rem, 14vw, 9rem)",
          color: NEON, lineHeight: 1, letterSpacing: "-0.04em", marginBottom: "1rem",
        }}>
          404
        </p>
        <h1 style={{
          fontFamily: FONT, fontWeight: 800, fontSize: "clamp(1.4rem,2.6vw,1.8rem)",
          color: "#fff", marginBottom: "0.8rem", letterSpacing: "-0.01em",
        }}>
          Page not found.
        </h1>
        <p style={{ fontFamily: FONT, color: "rgba(255,255,255,0.65)", marginBottom: "2rem", maxWidth: 520, margin: "0 auto 2rem" }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a href={hashHref("")} className="btn-neon">Back to home</a>
      </div>
    </section>
  );
}
