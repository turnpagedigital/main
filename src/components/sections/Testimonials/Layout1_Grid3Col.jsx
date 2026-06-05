import React from "react";
import { FONT, INK, INK_60 } from "../../../data/tokens.js";
import SectionHeader from "../../SectionHeader.jsx";

/* Testimonials Layout 1 — 3-Column Grid (Home page style)
   Three equal columns with border-top cards, centered layout.
   Props: { testimonials, eyebrow, title, accent, colorScheme } */

const THEMES = {
  light:        { bg: "#FFFFFF",  quote: INK,    attribution: INK_60,                   border: INK,    headerTheme: "light" },
  "light-gray": { bg: "#F4F5F7",  quote: INK,    attribution: INK_60,                   border: INK,    headerTheme: "light" },
  dark:         { bg: "#0A0A0A",  quote: "#fff", attribution: "rgba(255,255,255,0.55)", border: "#fff", headerTheme: "dark"  },
};

export default function TestimonialsLayout1Grid3Col({
  testimonials,
  eyebrow = "What Clients Say",
  title = "When others give up,",
  accent = "we dig in.",
  colorScheme = "light",
}) {
  if (!testimonials || testimonials.length === 0) return null;

  const theme = THEMES[colorScheme] || THEMES.light;

  return (
    <section style={{ background: theme.bg, padding: "clamp(5rem,10vw,9rem) clamp(1.5rem,5vw,4rem)" }}>
      <div className="container">
        <SectionHeader eyebrow={eyebrow} title={title} accent={accent} theme={theme.headerTheme} />

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(2rem, 4vw, 3rem)" }}
          className="testimonials-grid"
        >
          {testimonials.map((t, i) => (
            <figure
              key={t.id || i}
              style={{ borderTop: `2px solid ${theme.border}`, padding: "1.6rem 0 0", margin: 0, textAlign: "left" }}
            >
              <blockquote style={{
                fontFamily: FONT, fontSize: "clamp(0.95rem, 1.2vw, 1.1rem)",
                color: theme.quote, lineHeight: 1.6,
                margin: 0, marginBottom: "1.2rem", textAlign: "left",
              }}>
                "{t.quote}"
              </blockquote>
              <figcaption style={{
                fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: theme.attribution, textAlign: "left",
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
