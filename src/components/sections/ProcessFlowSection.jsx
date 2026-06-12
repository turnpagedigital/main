import React from "react";
import { NEON, FONT, INK, INK_60 } from "../../data/tokens.js";
import { sectionBackground } from "../../lib/section-background.js";

/* ProcessFlowSection — horizontal step timeline ("How the typical sales
   process works"): pill labels with arrows, each step carrying a bold
   heading and a bullet list beneath.
   Inline section: content lives in page-compositions.json sectionConfig.content.
   Schema:
     eyebrow, title, accent     — section header text
     steps[]                    — { id, label, heading, bullets[] }
     colorScheme                — "neon" (default) | "white" | "light-gray" | "dark"
     pillStyle                  — "white" (default) | "black" | "neon" | "outline"
     backgroundImage            — optional image URL for section background
     imageFilter / imageFilterStrength — background overlay treatment
*/

const SCHEMES = {
  neon:         { bg: NEON,      ink: INK,  body: "rgba(10,10,10,0.78)", arrow: INK },
  white:        { bg: "#fff",    ink: INK,  body: INK_60,                arrow: INK },
  "light-gray": { bg: "#F4F5F7", ink: INK,  body: INK_60,                arrow: INK },
  dark:         { bg: "#0A0A0A", ink: "#fff", body: "rgba(255,255,255,0.72)", arrow: NEON },
};

const PILLS = {
  white:   { bg: "#fff",    color: INK,    border: INK },
  black:   { bg: "#0A0A0A", color: "#fff", border: "#0A0A0A" },
  neon:    { bg: NEON,      color: INK,    border: INK },
  outline: { bg: "transparent", color: "currentColor", border: "currentColor" },
};

export default function ProcessFlowSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const steps            = c.steps || [];
  const eyebrow          = c.eyebrow || "";
  const title            = c.title || "";
  const accent           = c.accent || "";
  const colorScheme      = c.colorScheme || "neon";
  const pillStyle        = c.pillStyle || "white";
  const backgroundImage  = c.backgroundImage || "";
  const imageFilter         = c.imageFilter || "dark";
  const imageFilterStrength = c.imageFilterStrength ?? 30;

  const s = SCHEMES[colorScheme] || SCHEMES.neon;
  const pill = PILLS[pillStyle] || PILLS.white;
  const isDark = colorScheme === "dark";

  return (
    <section style={{
      background: backgroundImage
        ? sectionBackground(backgroundImage, imageFilter, imageFilterStrength)
        : s.bg,
      color: s.ink,
      padding: "clamp(4rem, 8vw, 7rem) clamp(1.5rem, 5vw, 4rem)",
      position: "relative",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Header */}
        {eyebrow && (
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: isDark ? NEON : s.body, marginBottom: "1.1rem",
          }}>{eyebrow}</p>
        )}
        {title && (
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(1.9rem, 4vw, 3.2rem)",
            lineHeight: 1.05, letterSpacing: "-0.03em",
            color: s.ink, margin: "0 0 clamp(2.5rem, 5vw, 4rem)",
          }}>
            {title}
            {accent && <> <span style={{ fontStyle: "italic", color: isDark ? NEON : s.ink }}>{accent}</span></>}
          </h2>
        )}

        {/* Steps */}
        <div className="pflow-grid" style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, 1fr)`,
          gap: "clamp(1.5rem, 3vw, 2.5rem)",
        }}>
          {steps.map((step, i) => (
            <div key={step.id || i}>
              {/* Pill + arrow */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1.6rem" }}>
                <span style={{
                  fontFamily: FONT, fontWeight: 800, fontSize: "0.92rem",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  background: pill.bg, color: pill.color,
                  border: `2px solid ${pill.border}`,
                  borderRadius: 999, padding: "0.55rem 1.5rem",
                  boxShadow: pillStyle === "outline" ? "none" : "0 3px 0 rgba(0,0,0,0.35)",
                  whiteSpace: "nowrap",
                }}>
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <span className="pflow-arrow" aria-hidden="true" style={{
                    flex: 1, display: "flex", alignItems: "center", color: s.arrow, minWidth: 24,
                  }}>
                    <span style={{ flex: 1, height: 2, background: "currentColor" }} />
                    <span style={{
                      width: 0, height: 0, borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent", borderLeft: "8px solid currentColor",
                    }} />
                  </span>
                )}
              </div>
              {/* Heading */}
              {step.heading && (
                <h3 style={{
                  fontFamily: FONT, fontWeight: 800,
                  fontSize: "clamp(1.05rem, 1.5vw, 1.25rem)",
                  lineHeight: 1.25, letterSpacing: "-0.01em",
                  color: s.ink, margin: "0 0 0.9rem",
                }}>
                  {step.heading}
                </h3>
              )}
              {/* Bullets */}
              {(step.bullets || []).length > 0 && (
                <ul style={{ margin: 0, paddingLeft: "1.15rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {step.bullets.map((b, j) => (
                    <li key={j} style={{
                      fontFamily: FONT, fontSize: "0.95rem",
                      color: s.body, lineHeight: 1.5,
                    }}>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .pflow-grid { grid-template-columns: 1fr 1fr !important; }
          .pflow-arrow { display: none !important; }
        }
        @media (max-width: 600px) { .pflow-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
