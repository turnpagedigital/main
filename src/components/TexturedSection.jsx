import React from "react";

/* Section with the bg-paper.jpg texture at very low brightness — used as a
   subtle visual break for high-impact moments (Top 12 cases, Track Record).
   Children render on top of the texture. */
export default function TexturedSection({ children, padding = "clamp(3rem,6vw,5rem) clamp(1.5rem,5vw,4rem)", id }) {
  return (
    <section id={id} style={{ position: "relative", overflow: "hidden", padding, background: "#0F0F12" }}>
      {/* Paper texture */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <img
          src="/bg-paper.jpg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.18) contrast(1.05) saturate(0.7)" }}
        />
      </div>
      {/* Grain */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, opacity: 0.04, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 200px",
      }} />
      {/* Soft warm overlay so text remains legible */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)",
      }} />
      <div style={{ position: "relative", zIndex: 5 }}>
        {children}
      </div>
    </section>
  );
}
