import React from "react";
import { FONT, INK, INK_60 } from "../../../data/tokens.js";
import SectionHeader from "../../SectionHeader.jsx";

/* Testimonials Layout 2 — Single Column (Subpage style)
   One column, left-aligned, optional header above.
   Props: { testimonials, eyebrow, title, accent, colorScheme } */

const THEMES = {
  light:        { bg: "#FFFFFF",  quote: INK,    attribution: INK_60,                   border: INK,    headerTheme: "light" },
  "light-gray": { bg: "#F4F5F7",  quote: INK,    attribution: INK_60,                   border: INK,    headerTheme: "light" },
  dark:         { bg: "#0A0A0A",  quote: "#fff", attribution: "rgba(255,255,255,0.55)", border: "#fff", headerTheme: "dark"  },
};

export default function TestimonialsLayout2SingleCol({
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
      <div className="container" style={{ maxWidth: 760 }}>
        <SectionHeader eyebrow={eyebrow} title={title} accent={accent} align="left" theme={theme.headerTheme} />

        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2.5rem, 5vw, 4rem)" }}>
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
      </div>
    </section>
  );
}
