import React from "react";
import { FONT, DARK, SURFACE, PAPER, INK, INK_60 } from "../../data/tokens.js";

/* Media Banner — an H1/H2 (left/center/right justified), optional 1-2 CTA
   buttons, over a solid color or a photo. Height is admin-adjustable. */

const THEMES = {
  dark:         { background: DARK,   heading: "#FFFFFF", body: "rgba(255,255,255,0.75)", secondaryBtnClass: "btn-ghost" },
  light:        { background: SURFACE, heading: INK,       body: INK_60,                   secondaryBtnClass: "btn-ghost-ink" },
  "light-gray": { background: PAPER,  heading: INK,       body: INK_60,                   secondaryBtnClass: "btn-ghost-ink" },
};

const HEIGHT_VALUES = {
  auto:   null,
  small:  "clamp(280px, 36vh, 440px)",
  medium: "clamp(420px, 56vh, 640px)",
  large:  "clamp(560px, 78vh, 820px)",
  full:   "calc(100vh - 88px)",
};

const ALIGN_ITEMS = { left: "flex-start", center: "center", right: "flex-end" };
const TEXT_ALIGN  = { left: "left", center: "center", right: "right" };

export default function MediaBannerSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};

  const isPhoto = c.backgroundType === "image";
  const colorScheme = THEMES[c.colorScheme] ? c.colorScheme : "dark";
  const theme = THEMES[colorScheme];
  const align = ALIGN_ITEMS[c.align] ? c.align : "left";
  const minHeight = Object.prototype.hasOwnProperty.call(HEIGHT_VALUES, c.height)
    ? HEIGHT_VALUES[c.height]
    : HEIGHT_VALUES.medium;

  const imageUrl = c.backgroundImage || "/bg-paper.jpg";
  const imageFilter = c.imageFilter || "dark";
  const filterStrength = c.imageFilterStrength ?? 40;

  const title = c.title || "";
  const subtitle = c.subtitle || "";
  const ctaPrimary = c.ctaPrimary && c.ctaPrimary.label ? c.ctaPrimary : null;
  const ctaSecondary = c.ctaSecondary && c.ctaSecondary.label ? c.ctaSecondary : null;

  // Photo backgrounds always get white text over a scrim for legibility.
  const headingColor = isPhoto ? "#FFFFFF" : theme.heading;
  const bodyColor = isPhoto ? "rgba(255,255,255,0.8)" : theme.body;
  const secondaryBtnClass = isPhoto ? "btn-ghost" : theme.secondaryBtnClass;

  return (
    <section style={{
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center",
      minHeight: minHeight || undefined,
      padding: minHeight
        ? "clamp(2.5rem,5vw,4rem) clamp(1.5rem,5vw,4rem)"
        : "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,4rem)",
      background: isPhoto ? "#0A0B0E" : theme.background,
    }}>
      {isPhoto && (
        <>
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover",
            }}
            onError={(e) => { e.currentTarget.src = "/bg-paper.jpg"; }}
          />
          {imageFilter !== "none" && (
            <div style={{
              position: "absolute", inset: 0,
              background: imageFilter === "light"
                ? `rgba(255,255,255,${filterStrength / 100})`
                : `rgba(0,0,0,${filterStrength / 100})`,
              pointerEvents: "none",
            }} />
          )}
        </>
      )}

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 900,
        marginLeft: align === "left" ? 0 : "auto",
        marginRight: align === "right" ? 0 : "auto",
        textAlign: TEXT_ALIGN[align],
        display: "flex", flexDirection: "column", alignItems: ALIGN_ITEMS[align],
      }}>
        {title && (
          <h1 style={{
            fontFamily: FONT, fontWeight: 900,
            fontSize: "clamp(2.2rem, 5vw, 4rem)",
            lineHeight: 1.04, letterSpacing: "-0.03em",
            color: headingColor, margin: 0,
            marginBottom: subtitle ? "1rem" : (ctaPrimary || ctaSecondary) ? "1.8rem" : 0,
          }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <h2 style={{
            fontFamily: FONT, fontWeight: 400,
            fontSize: "clamp(1.05rem, 1.8vw, 1.35rem)",
            lineHeight: 1.5, color: bodyColor, margin: 0,
            marginBottom: (ctaPrimary || ctaSecondary) ? "1.8rem" : 0,
            maxWidth: 640,
          }}>
            {subtitle}
          </h2>
        )}
        {(ctaPrimary || ctaSecondary) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: ALIGN_ITEMS[align] }}>
            {ctaPrimary && <a href={ctaPrimary.href || "#"} className="btn-neon">{ctaPrimary.label}</a>}
            {ctaSecondary && <a href={ctaSecondary.href || "#"} className={secondaryBtnClass}>{ctaSecondary.label}</a>}
          </div>
        )}
      </div>
    </section>
  );
}
