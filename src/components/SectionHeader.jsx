import React from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";

/* Section header.

   Layouts:
   - "stack" (default): eyebrow stacked above title above kicker, centered or
     left-aligned.
   - "split": Polestar two-column lockup — title on the left, kicker (body
     paragraph) on the right.  No eyebrow needed; the title carries the weight. */
export default function SectionHeader({
  eyebrow,
  title,
  accent,
  kicker,
  align = "center",
  theme = "light",
  layout = "stack",
  maxWidth = 760,
}) {
  const isDark = theme === "dark";
  const titleColor = isDark ? "#fff" : INK;
  const kickerColor = isDark ? "rgba(255,255,255,0.65)" : INK_60;

  if (layout === "split") {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
        gap: "clamp(2rem, 5vw, 5rem)",
        alignItems: "start",
        margin: "0 0 clamp(2.4rem, 5vw, 4rem)",
      }} className="section-split">
        <div>
          {eyebrow && (
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: isDark ? NEON : INK_60, marginBottom: "1rem",
            }}>
              {eyebrow}
            </p>
          )}
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(1.8rem, 3.8vw, 3rem)",
            lineHeight: 1.05, letterSpacing: "-0.025em",
            color: titleColor,
          }}>
            {title}
            {accent && (
              <>
                {" "}
                {isDark ? (
                  <span style={{ color: NEON, fontStyle: "italic", fontWeight: 800 }}>{accent}</span>
                ) : (
                  <span className="accent-light">{accent}</span>
                )}
              </>
            )}
          </h2>
        </div>
        {kicker && (
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
            color: kickerColor, lineHeight: 1.6, maxWidth: 640,
          }}>
            {kicker}
          </p>
        )}
        <style>{`
          @media (max-width: 880px) {
            .section-split { grid-template-columns: 1fr !important; gap: 1.2rem !important; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      textAlign: align,
      maxWidth: align === "center" ? maxWidth : "100%",
      margin: align === "center" ? "0 auto 2.6rem" : "0 0 2.4rem",
    }}>
      {eyebrow && (
        isDark ? (
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: NEON, marginBottom: "0.9rem",
          }}>
            {eyebrow}
          </p>
        ) : (
          <p className="eyebrow-neon" style={{ marginBottom: "0.9rem" }}>
            {eyebrow}
          </p>
        )
      )}
      {title && (
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)",
          lineHeight: 1.15, letterSpacing: "-0.02em",
          color: titleColor, marginBottom: kicker ? "1rem" : 0,
        }}>
          {title}
          {accent && (
            <>
              {" "}
              {isDark ? (
                <span style={{ color: NEON, fontStyle: "italic", fontWeight: 800 }}>{accent}</span>
              ) : (
                <span className="accent-light">{accent}</span>
              )}
            </>
          )}
        </h2>
      )}
      {kicker && (
        <p style={{
          fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.1rem)",
          color: kickerColor, lineHeight: 1.65,
          maxWidth: 720, margin: align === "center" ? "0 auto" : 0,
        }}>
          {kicker}
        </p>
      )}
    </div>
  );
}
