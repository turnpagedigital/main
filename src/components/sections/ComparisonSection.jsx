import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";

/* ComparisonSection — Old way vs. new way.
   Inline section: content lives in page-compositions.json sectionConfig.content.
   Schema:
     eyebrow              — section eyebrow
     title, accent        — section heading
     oldWay.title         — left column heading
     oldWay.items[]       — string list of old-way items
     newWay.title         — right column heading
     newWay.items[]       — string list of new-way items
     colorScheme          — "light-gray" (default) | "dark" | "white"
*/
export default function ComparisonSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const eyebrow     = c.eyebrow     || "Why Turnpage";
  const title       = c.title       || "";
  const accent      = c.accent      || "";
  const oldWay      = c.oldWay      || { title: "The old way.", items: [] };
  const newWay      = c.newWay      || { title: "Through Turnpage.", items: [] };
  const colorScheme = c.colorScheme || "light-gray";

  if (!oldWay.items?.length && !newWay.items?.length) return null;

  const isDark    = colorScheme === "dark";
  const sectionBg = { "light-gray": "#F4F5F7", dark: "#0A0A0A", white: "#fff" }[colorScheme] || "#F4F5F7";
  const textColor = isDark ? "#fff" : INK;

  return (
    <section style={{
      background: sectionBg,
      padding: "clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: colorScheme !== "dark" ? `1px solid ${LINE}` : "none",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Section header */}
        {title && (
          <div style={{ marginBottom: "clamp(3rem, 6vw, 5rem)", maxWidth: 700 }}>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: isDark ? NEON : INK_60, marginBottom: "1.1rem",
            }}>{eyebrow}</p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              lineHeight: 1.05, letterSpacing: "-0.03em",
              color: textColor, margin: 0,
            }}>
              {title}
              {accent && <> <span className={isDark ? "accent-neon" : "accent-light"}>{accent}</span></>}
            </h2>
          </div>
        )}

        {/* Two columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(1rem, 3vw, 2rem)",
        }} className="comparison-grid">

          {/* Old way — muted */}
          <ComparisonColumn
            title={oldWay.title}
            items={oldWay.items}
            variant="old"
            dark={isDark}
          />

          {/* New way — neon accent */}
          <ComparisonColumn
            title={newWay.title}
            items={newWay.items}
            variant="new"
            dark={isDark}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) { .comparison-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function ComparisonColumn({ title, items, variant, dark }) {
  const isNew     = variant === "new";
  const colBg     = isNew ? "#0A0A0A" : (dark ? "rgba(255,255,255,0.04)" : "#fff");
  const colBorder = isNew ? "transparent" : (dark ? "rgba(255,255,255,0.1)" : LINE);
  const titleClr  = isNew ? NEON : (dark ? "rgba(255,255,255,0.5)" : INK_60);
  const itemClr   = isNew ? "#fff" : (dark ? "rgba(255,255,255,0.5)" : INK_60);
  const dotClr    = isNew ? NEON : (dark ? "rgba(255,255,255,0.25)" : "#CBD5E1");

  return (
    <div style={{
      background: colBg,
      border: `1px solid ${colBorder}`,
      padding: "clamp(1.8rem, 3vw, 2.6rem)",
      position: "relative", overflow: "hidden",
    }}>
      {isNew && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(50% 50% at 0% 100%, rgba(212,255,0,0.08), transparent 65%)",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(1.15rem, 1.8vw, 1.5rem)",
          letterSpacing: "-0.02em", lineHeight: 1.15,
          color: titleClr, marginBottom: "1.6rem",
        }}>
          {title}
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {(items || []).map((item, i) => (
            <li key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                background: dotClr, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginTop: "0.1rem",
              }}>
                {isNew ? (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </span>
              <span style={{
                fontFamily: FONT, fontSize: "0.97rem",
                color: itemClr, lineHeight: 1.6,
              }}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
