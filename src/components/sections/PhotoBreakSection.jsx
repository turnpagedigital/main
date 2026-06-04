import React from "react";
import { FONT } from "../../data/tokens.js";

/* Full-bleed photo with optional overlay headline. */
export default function PhotoBreakSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const imageUrl     = c.imageUrl     || "/bg-paper.jpg";
  const overlayText  = c.overlayText  || "";
  const overlayAccent= c.overlayAccent|| "";

  return (
    <section style={{
      position: "relative", width: "100%",
      height: "clamp(320px, 50vw, 720px)",
      overflow: "hidden", background: "#0A0B0E",
    }}>
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%", objectFit: "cover",
          filter: "saturate(0.7) contrast(1.05)",
        }}
        onError={(e) => { e.currentTarget.src = "/bg-paper.jpg"; }}
      />
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse at 100% 100%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.45) 38%, transparent 68%)",
        pointerEvents: "none",
      }} />
      {(overlayText || overlayAccent) && (
        <p style={{
          position: "absolute",
          bottom: "clamp(4rem, 8vw, 7rem)",
          right: "clamp(1.5rem, 5vw, 4rem)",
          margin: 0, zIndex: 10,
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(1.8rem, 4.8vw, 4.2rem)",
          lineHeight: 0.98, letterSpacing: "-0.04em",
          color: "#000", textAlign: "right",
        }}>
          {overlayText}<br />
          {overlayAccent && <span className="accent-light">{overlayAccent}</span>}
        </p>
      )}
    </section>
  );
}
