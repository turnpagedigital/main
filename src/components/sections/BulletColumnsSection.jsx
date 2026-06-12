import React from "react";
import { NEON, FONT, INK, INK_60 } from "../../data/tokens.js";
import { sectionBackground } from "../../lib/section-background.js";

/* BulletColumnsSection — multi-column bullet lists under bold headings
   ("Our services"). Inline section: content lives in page-compositions.json
   sectionConfig.content.
   Schema:
     eyebrow, title, accent     — section header text
     columns[]                  — { id, heading, items[] }
     colorScheme                — "neon" (default) | "white" | "light-gray" | "dark"
     backgroundImage            — optional image URL for section background
     imageFilter / imageFilterStrength — background overlay treatment
*/

const SCHEMES = {
  neon:         { bg: NEON,      ink: INK,    body: "rgba(10,10,10,0.78)" },
  white:        { bg: "#fff",    ink: INK,    body: INK_60 },
  "light-gray": { bg: "#F4F5F7", ink: INK,    body: INK_60 },
  dark:         { bg: "#0A0A0A", ink: "#fff", body: "rgba(255,255,255,0.72)" },
};

export default function BulletColumnsSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const columns          = c.columns || [];
  const eyebrow          = c.eyebrow || "";
  const title            = c.title || "";
  const accent           = c.accent || "";
  const colorScheme      = c.colorScheme || "neon";
  const backgroundImage  = c.backgroundImage || "";
  const imageFilter         = c.imageFilter || "dark";
  const imageFilterStrength = c.imageFilterStrength ?? 30;

  const s = SCHEMES[colorScheme] || SCHEMES.neon;
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

        {/* Columns */}
        <div className="bcols-grid" style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, 1fr)`,
          gap: "clamp(1.5rem, 3vw, 3rem)",
        }}>
          {columns.map((col, i) => (
            <div key={col.id || i}>
              {col.heading && (
                <h3 style={{
                  fontFamily: FONT, fontWeight: 800,
                  fontSize: "clamp(1.1rem, 1.6vw, 1.35rem)",
                  lineHeight: 1.2, letterSpacing: "-0.015em",
                  color: s.ink, margin: "0 0 1rem",
                }}>
                  {col.heading}
                </h3>
              )}
              {(col.items || []).length > 0 && (
                <ul style={{ margin: 0, paddingLeft: "1.15rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {col.items.map((item, j) => (
                    <li key={j} style={{
                      fontFamily: FONT, fontSize: "0.97rem",
                      color: s.body, lineHeight: 1.5,
                    }}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) { .bcols-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 600px) { .bcols-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
