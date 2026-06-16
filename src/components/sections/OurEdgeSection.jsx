import React from "react";
import { FONT, INK, INK_60 } from "../../data/tokens.js";

/* Three-point differentiation grid. Content from sectionConfig.content. */
export default function OurEdgeSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const eyebrow    = c.eyebrow    || "Our Edge";
  const title      = c.title      || "Built to move fast";
  const titleAccent= c.titleAccent|| "when it counts.";
  const intro      = c.intro      || "";
  const colorScheme = c.colorScheme || "white";
  const points = c.points || [
    { id: "e1", h: "Practically unlimited liquidity", b: "We partner with major asset managers — over 500 institutions on speed dial." },
    { id: "e2", h: "Lightning-fast settlement",       b: "Automation accelerates diligence and closing in the largest volume cases." },
    { id: "e3", h: "Relationship builders, not just dealmakers", b: "We go the extra mile to understand your business needs so we can structure the right deal for our clients." },
  ];

  const isLightGray = colorScheme === "light-gray";
  const bgColor = isLightGray ? "#F4F5F7" : "#FFFFFF";
  const _eyebrowColor = isLightGray ? INK_60 : INK_60;
  const borderColor = isLightGray ? INK : INK;

  return (
    <section style={{ background: bgColor, padding: "clamp(4rem, 10vw, 10rem) clamp(1.5rem, 5vw, 4rem)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div className="section-split" style={{ alignItems: "end", marginBottom: "clamp(3rem, 6vw, 5rem)" }}>
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: INK_60, marginBottom: "1.2rem",
            }}>
              {eyebrow}
            </p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(1.8rem, 3.8vw, 3.4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em", color: INK,
            }}>
              {title}<br />
              <span className="accent-light">{titleAccent}</span>
            </h2>
          </div>
          {intro && (
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1.05rem, 1.4vw, 1.25rem)",
              color: INK_60, lineHeight: 1.6, maxWidth: 640,
            }}>
              {intro}
            </p>
          )}
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "clamp(1.5rem, 3vw, 3rem)",
        }} className="edge-grid">
          {points.map(p => (
            <div key={p.id || p.h} style={{ borderTop: `2px solid ${borderColor}`, paddingTop: "1.4rem" }}>
              <h3 style={{
                fontFamily: FONT, fontSize: "clamp(1.2rem, 1.8vw, 1.45rem)",
                fontWeight: 800, color: INK, letterSpacing: "-0.015em",
                marginBottom: "0.7rem", lineHeight: 1.2,
              }}>
                {p.h}
              </h3>
              <p style={{
                fontFamily: FONT, fontSize: "clamp(0.95rem,1.2vw,1.05rem)",
                color: INK_60, lineHeight: 1.55,
              }}>
                {p.b}
              </p>
            </div>
          ))}
        </div>
        <style>{`
          @media (max-width: 900px) { .edge-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </section>
  );
}
