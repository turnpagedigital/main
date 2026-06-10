import React from "react";
import { FONT } from "../../../data/tokens.js";
import { getSectionTheme } from "../../../lib/palette-resolver.js";

/* Testimonials Layout 3 — Large Featured Quote
   One prominent quote, centered, with oversized quotation marks.
   Great for a single standout testimonial or a hero-style endorsement.
   Colors come from section-palettes.json (testimonials.* schemes) —
   this layout uses the featured* slots plus quoteMark/attrLine.
   Props: { testimonials, eyebrow, title, accent, colorScheme } */

export default function TestimonialsLayout3LargeFeatured({
  testimonials,
  eyebrow = "What Clients Say",
  _title,
  _accent,
  colorScheme = "light",
}) {
  if (!testimonials || testimonials.length === 0) return null;

  // Show just the first testimonial as the featured quote
  const featured = testimonials[0];
  const theme = getSectionTheme("testimonials", colorScheme, "light");

  return (
    <section style={{
      background: theme.background,
      padding: "clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 4rem)",
    }}>
      <div className="container" style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>

        {eyebrow && (
          <p style={{
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: theme.featuredEyebrow, marginBottom: "2.5rem",
          }}>
            {eyebrow}
          </p>
        )}

        {/* Oversized quote mark */}
        <div style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(6rem, 12vw, 10rem)",
          lineHeight: 0.6,
          color: theme.quoteMark,
          marginBottom: "1.5rem",
          userSelect: "none",
          letterSpacing: "-0.05em",
        }} aria-hidden="true">
          "
        </div>

        <blockquote style={{
          fontFamily: FONT,
          fontSize: "clamp(1.25rem, 2.2vw, 1.75rem)",
          fontWeight: 500,
          lineHeight: 1.5,
          letterSpacing: "-0.01em",
          color: theme.quote,
          margin: "0 0 2.5rem",
          fontStyle: "italic",
        }}>
          {featured.quote}
        </blockquote>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "1rem",
          justifyContent: "center",
        }}>
          <div style={{ width: 32, height: 1, background: theme.attrLine }} />
          <figcaption style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: theme.featuredAttribution,
          }}>
            {featured.by}
          </figcaption>
          <div style={{ width: 32, height: 1, background: theme.attrLine }} />
        </div>

        {/* If there are additional testimonials, show them smaller below */}
        {testimonials.length > 1 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(testimonials.length - 1, 3)}, 1fr)`,
            gap: "2rem",
            marginTop: "4rem",
            paddingTop: "3rem",
            borderTop: `1px solid ${theme.attrLine}`,
            textAlign: "left",
          }} className="featured-secondary-grid">
            {testimonials.slice(1).map((t, i) => (
              <div key={t.id || i}>
                <p style={{
                  fontFamily: FONT, fontSize: "0.9rem", lineHeight: 1.6,
                  color: theme.quote, marginBottom: "0.75rem",
                  fontStyle: "italic",
                }}>
                  "{t.quote}"
                </p>
                <p style={{
                  fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: theme.featuredAttribution,
                }}>
                  — {t.by}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 700px) {
          .featured-secondary-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
