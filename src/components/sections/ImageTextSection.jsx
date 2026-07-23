import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";

/* ImageTextSection — an image with a header + paragraph of text.
   Inline section: content lives in page-compositions.json sectionConfig.content.

   Layouts:
     layout-1-image-right — text left, image right (default)
     layout-2-image-left  — image left, text right
     layout-3-image-top   — wide image above, centered text below

   Schema:
     eyebrow, title, accent — header text (accent renders neon/italic)
     body                   — paragraph
     image, imageAlt        — the image
     imageTone              — "none" (default) | "mono" (black & white)
                              | "neon" (ink-to-neon duotone) | "paper" (soft
                              ink-to-paper mono) — on-brand image treatments
     imageOverlay           — "none" (default) | "dark" | "light" scrim
     imageOverlayStrength   — scrim opacity 0-100 (default 30)
     cta                    — optional { label, href }
     colorScheme            — "white" (default) | "light-gray" | "dark"
*/

/* Duotone: image goes grayscale, then a brand color multiplies over it —
   highlights take the color, shadows stay ink. */
const TONES = {
  neon:  "#D4FF00",
  paper: "#E5E7EB",
};

const SCHEMES = {
  "white":      { bg: "#FFFFFF", title: INK,    body: INK_60,                    eyebrow: INK_60, accentClass: "accent-light", border: LINE },
  "light-gray": { bg: "#F4F5F7", title: INK,    body: INK_60,                    eyebrow: INK_60, accentClass: "accent-light", border: LINE },
  "dark":       { bg: "#0A0A0A", title: "#fff", body: "rgba(255,255,255,0.65)", eyebrow: NEON,   accentClass: "accent-neon",  border: "none" },
};

export default function ImageTextSection({ sectionConfig }) {
  const sc = sectionConfig || {};
  const c = sc.content || {};
  const layout      = sc.layout || c.layout || "layout-1-image-right";
  const colorScheme = sc.colorScheme || c.colorScheme || "white";
  const theme = SCHEMES[colorScheme] || SCHEMES.white;

  const eyebrow  = c.eyebrow  || "";
  const title    = c.title    || "";
  const accent   = c.accent   || "";
  const body     = c.body     || "";
  const image    = c.image    || "";
  const imageAlt = c.imageAlt || "";
  const tone     = c.imageTone && c.imageTone !== "none" ? c.imageTone : "";
  const toneColor = TONES[tone] || "";
  const overlay  = c.imageOverlay && c.imageOverlay !== "none" ? c.imageOverlay : "";
  const overlayStrength = (() => {
    const n = Number(c.imageOverlayStrength);
    return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 30)) / 100;
  })();
  const cta      = c.cta && c.cta.label && c.cta.href ? c.cta : null;

  const isTop  = layout === "layout-3-image-top";
  const isLeft = layout === "layout-2-image-left";

  const textBlock = (
    <div style={isTop ? { maxWidth: 760, margin: "0 auto", textAlign: "center" } : undefined}>
      {eyebrow && (
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: theme.eyebrow, marginBottom: "1.1rem",
        }}>
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(1.9rem, 3.8vw, 3.2rem)",
          lineHeight: 1.05, letterSpacing: "-0.03em",
          color: theme.title, margin: "0 0 1.1rem",
        }}>
          {title}
          {accent && <> <span className={theme.accentClass}>{accent}</span></>}
        </h2>
      )}
      {body && (
        <p style={{
          fontFamily: FONT, fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
          color: theme.body, lineHeight: 1.7, margin: 0,
          whiteSpace: "pre-line",
        }}>
          {body}
        </p>
      )}
      {cta && (
        <div style={{ marginTop: "1.8rem" }}>
          <a href={cta.href} className={colorScheme === "dark" ? "btn-neon" : "btn-ghost-ink"}>
            {cta.label}
          </a>
        </div>
      )}
    </div>
  );

  const imageBlock = image ? (
    <div className="imgtext-media" style={{
      position: "relative",
      aspectRatio: isTop ? "21 / 9" : "4 / 3",
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: colorScheme === "dark"
        ? "0 14px 34px rgba(0,0,0,0.45)"
        : "0 10px 28px rgba(10,10,30,0.14)",
    }}>
      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        style={{
          width: "100%", height: "100%",
          objectFit: "cover",
          display: "block",
          ...(tone ? { filter: "grayscale(1) contrast(1.05)" } : {}),
        }}
      />
      {toneColor && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: toneColor, mixBlendMode: "multiply",
        }} />
      )}
      {overlay && overlayStrength > 0 && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: overlay === "light"
            ? `rgba(255,255,255,${overlayStrength})`
            : `rgba(0,0,0,${overlayStrength})`,
        }} />
      )}
    </div>
  ) : null;

  return (
    <section style={{
      background: theme.bg,
      padding: "clamp(4rem, 9vw, 8rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: theme.border === "none" ? "none" : `1px solid ${theme.border}`,
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        {isTop ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 4vw, 3.5rem)" }}>
            {imageBlock}
            {textBlock}
          </div>
        ) : (
          <div
            className="imgtext-split"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: "clamp(2rem, 5vw, 5rem)",
              alignItems: "center",
            }}
          >
            {isLeft ? imageBlock : textBlock}
            {isLeft ? textBlock : imageBlock}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 880px) {
          .imgtext-split { grid-template-columns: 1fr !important; }
          .imgtext-split > .imgtext-media { order: -1; }
        }
      `}</style>
    </section>
  );
}
