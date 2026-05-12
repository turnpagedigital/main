import React from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";

/* Centered or left-aligned section header: small eyebrow + headline + optional kicker.
   Light theme (default): ink eyebrow with neon bar, accent uses highlighter.
   Dark theme: neon eyebrow, accent italic in neon. */
export default function SectionHeader({
  eyebrow,
  title,
  accent,
  kicker,
  align = "center",
  theme = "light",
  maxWidth = 760,
}) {
  const isDark = theme === "dark";
  const titleColor = isDark ? "#fff" : INK;
  const kickerColor = isDark ? "rgba(255,255,255,0.65)" : INK_60;

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
          <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>
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
                <span style={{ color: NEON, fontStyle: "italic", fontWeight: 800 }}>
                  {accent}
                </span>
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
