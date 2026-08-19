import React from "react";
import { hasValue } from "../../lib/utils.js";
import { NEON, FONT, INK, INK_60 } from "../../data/tokens.js";
import Card from "../Card.jsx";
import { sectionBackground } from "../../lib/section-background.js";
import LiquidGlassCard from "../LiquidGlassCard.jsx";

// Card styles whose surface reads as light — neon-on-neon (the "neon"/
// "neon-glass" styles) or neon-on-white/gray/glass are both too low-contrast
// to read as a number, so these flip the numeral to ink. Mirrors Card.jsx's
// own light/dark split (its inverse of needsLightText).
const LIGHT_CARD_STYLES = ["white", "light-gray", "light-glass", "clear-glass", "neon", "neon-glass"];

// Step numeral — neon on a dark surface (unchanged), ink with a bold neon
// chevron accent on a light surface, so the brand color stays present even
// though the number itself needs to flip for contrast. The chevron sits
// behind the number (number wins the overlap) but straddles its right edge —
// half tucked behind the second digit, half poking out to the right.
function StepNumber({ n, light, fontSize }) {
  // fontSize lives on the wrapper (not just the number span) so the
  // chevron's em-based size/position resolve against the same font-size —
  // otherwise the svg inherits whatever ambient size sits above this
  // component instead of the number's actual rendered size.
  return (
    <span style={{ position: "relative", display: "inline-block", fontSize, lineHeight: 1 }}>
      <span style={{
        position: "relative", zIndex: 1,
        fontFamily: FONT, fontWeight: 800, letterSpacing: "-0.04em",
        color: light ? INK : NEON,
      }}>
        {n}
      </span>
      {light && (
        <svg viewBox="0 0 46 46" aria-hidden="true" focusable="false" style={{
          position: "absolute", right: "-0.5em", top: 0,
          width: "1em", height: "1em", zIndex: 0, pointerEvents: "none",
        }}>
          <path d="M8 4 L36 23 L8 42" stroke={NEON} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </span>
  );
}

/* HowItWorksSection — numbered step sequence.
   Inline section: content lives in page-compositions.json sectionConfig.content.
   Schema:
     eyebrow                — section eyebrow
     title, accent          — section heading (left column)
     kicker                 — subtitle text (right column)
     steps[]                — { id, n, title, body }
     stepsLayout            — "auto" (default, up to 3 across) | "2".."5"
                              (fixed columns) | "vertical" (stacked list,
                              number beside the text)
     colorScheme            — "dark" (default) | "light-gray" | "white"
     cardStyle              — "standard" (default) | "white" | "black" | "light-gray" | "dark" | "light-glass" | "clear-glass"
     cardRadius             — "rounded" (default) | "square"
     backgroundImage        — optional image URL for section background
*/
export default function HowItWorksSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const eyebrow          = c.eyebrow     || "How It Works";
  const title            = c.title       || "Three steps to close.";
  const accent           = c.accent      || "";
  const kicker           = c.kicker      || "";
  const steps            = c.steps       || [];
  const colorScheme      = c.colorScheme || "dark";
  const cardStyle        = c.cardStyle   || "standard";
  const cardRadius       = c.cardRadius  || "rounded";
  const cardBlur         = hasValue(c.cardBlur) ? Number(c.cardBlur) : undefined;
  const cardBrightness   = hasValue(c.cardBrightness) ? Number(c.cardBrightness) : undefined;
  const backgroundImage  = c.backgroundImage || "";
  const imageFilter         = c.imageFilter || "dark";
  const imageFilterStrength = c.imageFilterStrength ?? 30;

  if (!steps.length) return null;

  const stepsLayout = c.stepsLayout || "auto";
  const isVertical  = stepsLayout === "vertical";
  const stepCols    = isVertical ? 1
    : stepsLayout === "auto" ? Math.min(steps.length, 3)
    : Math.max(2, Math.min(5, parseInt(stepsLayout, 10) || 3));

  const isDark    = colorScheme === "dark";
  const isWhite   = colorScheme === "white";
  const sectionBg = backgroundImage
    ? sectionBackground(backgroundImage, imageFilter, imageFilterStrength)
    : isDark ? "#0A0B0E" : isWhite ? "#FFFFFF" : "#F4F5F7";
  const textColor = isDark ? "#fff" : "#0A0A0A";
  const eyebrowColor = isDark ? NEON : INK_60;

  return (
    <section id="how-it-works" style={{
      background: sectionBg,
      color: textColor,
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
      position: "relative",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Split header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: "clamp(2rem, 5vw, 5rem)",
          marginBottom: "clamp(3rem, 6vw, 5rem)",
          alignItems: "end",
        }} className="how-header-split">
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: eyebrowColor, marginBottom: "1.2rem",
            }}>{eyebrow}</p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem, 4.5vw, 4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em",
              color: textColor, margin: 0,
            }}>
              {title}
              {accent && <> <span className="accent-neon">{accent}</span></>}
            </h2>
          </div>
          {kicker && (
            <p style={{
              fontFamily: FONT,
              fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
              color: isDark ? "rgba(255,255,255,0.65)" : "rgba(10,10,10,0.6)",
              lineHeight: 1.6, maxWidth: 600, margin: 0,
            }}>
              {kicker}
            </p>
          )}
        </div>

        {/* Steps grid */}
        {cardStyle === "liquid-glass" ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${stepCols}, 1fr)`,
            gap: "clamp(1.5rem, 2.5vw, 2rem)",
          }} className="steps-grid">
            {steps.map(step => (
              <LiquidGlassCard
                key={step.n || step.id}
                title={step.title}
                description={step.body}
                blurAmount={cardBlur}
                brightness={cardBrightness}
                icon={<StepNumber n={step.n} light={!isDark} fontSize="clamp(2rem, 3.5vw, 3rem)" />}
                radius={step.cardRadius || cardRadius}
                variant={isDark ? "dark" : "light"}
              />
            ))}
          </div>
        ) : ["white", "black", "light-gray", "dark", "light-glass", "clear-glass", "neon", "neon-glass"].includes(cardStyle) ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${stepCols}, 1fr)`,
            gap: "clamp(1rem, 2vw, 1.5rem)",
          }} className="steps-grid">
            {steps.map(step => (
              <Card key={step.n || step.id} style={step.cardStyle || cardStyle} radius={step.cardRadius || cardRadius} blurAmount={cardBlur} brightness={cardBrightness}>
                <div style={isVertical ? { display: "flex", gap: "clamp(1.2rem,2.5vw,2rem)", alignItems: "flex-start" } : undefined}>
                  <div style={{
                    margin: isVertical ? 0 : "0 0 1.2rem",
                    ...(isVertical ? { minWidth: "4.5rem" } : {}),
                  }}>
                    <StepNumber n={step.n} light={LIGHT_CARD_STYLES.includes(step.cardStyle || cardStyle)} fontSize="clamp(2rem, 3.5vw, 3.5rem)" />
                  </div>
                  <div>
                    <h3 style={{
                      fontFamily: FONT, fontWeight: 800,
                      fontSize: "clamp(1.1rem, 1.5vw, 1.25rem)",
                      letterSpacing: "-0.01em", lineHeight: 1.2,
                      color: "var(--card-text-color)", margin: "0 0 0.65rem",
                    }}>
                      {step.title}
                    </h3>
                    <p style={{
                      fontFamily: FONT, fontSize: "0.95rem",
                      color: "var(--card-secondary-text)",
                      lineHeight: 1.65, margin: 0,
                    }}>
                      {step.body}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${stepCols}, 1fr)`,
            gap: "1px",
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
          }} className="steps-grid">
            {steps.map(step => (
              <div key={step.n || step.id} style={{
                padding: "clamp(1.8rem, 3vw, 2.6rem)",
                background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                ...(isVertical ? { display: "flex", gap: "clamp(1.2rem,2.5vw,2rem)", alignItems: "flex-start" } : {}),
              }}>
                <div style={{
                  marginBottom: isVertical ? 0 : "1.2rem",
                  ...(isVertical ? { minWidth: "4.5rem" } : {}),
                }}>
                  <StepNumber n={step.n} light={!isDark} fontSize="clamp(2rem, 3.5vw, 3.5rem)" />
                </div>
                <div>
                  <h3 style={{
                    fontFamily: FONT, fontWeight: 800,
                    fontSize: "clamp(1.1rem, 1.5vw, 1.25rem)",
                    letterSpacing: "-0.01em", lineHeight: 1.2,
                    color: textColor, marginBottom: "0.65rem",
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontFamily: FONT, fontSize: "0.95rem",
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(10,10,10,0.6)",
                    lineHeight: 1.65, margin: 0,
                  }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 720px) {
          .how-header-split { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
