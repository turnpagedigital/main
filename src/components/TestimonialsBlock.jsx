import React from "react";
import { FONT, INK, INK_60 } from "../data/tokens.js";
import SectionHeader from "./SectionHeader.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   TestimonialsBlock — reusable testimonials section for marketing pages.

   Props:
     testimonials  Array<{ id, quote, by }>  — pre-filtered active entries
     eyebrow       string  (default: "What Clients Say")
     title         string  (default: "When others give up,")
     accent        string  (default: "we dig in.")

   Renders nothing when the array is empty.
   Data source: src/data/testimonials.json, filtered by the calling page.
═══════════════════════════════════════════════════════════════════════════ */

export default function TestimonialsBlock({
  testimonials,
  eyebrow = "What Clients Say",
  title   = "When others give up,",
  accent  = "we dig in.",
}) {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="surface-white section-pad">
      <div className="container">
        <SectionHeader eyebrow={eyebrow} title={title} accent={accent} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(2rem, 4vw, 3rem)",
          }}
          className="testimonials-grid"
        >
          {testimonials.map((t, i) => (
            <figure
              key={t.id || i}
              style={{ borderTop: `2px solid ${INK}`, padding: "1.6rem 0 0", margin: 0, textAlign: "left" }}
            >
              <blockquote style={{
                fontFamily: FONT, fontSize: "clamp(0.95rem, 1.2vw, 1.1rem)",
                color: INK, lineHeight: 1.6,
                margin: 0, marginBottom: "1.2rem", textAlign: "left",
              }}>
                "{t.quote}"
              </blockquote>
              <figcaption style={{
                fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: INK_60, textAlign: "left",
              }}>
                — {t.by}
              </figcaption>
            </figure>
          ))}
        </div>

        <style>{`
          @media (max-width: 900px) {
            .testimonials-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}
