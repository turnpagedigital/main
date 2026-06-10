import React from "react";
import { FONT } from "../../../data/tokens.js";
import { getSectionTheme } from "../../../lib/palette-resolver.js";

/* CTA Layout 1 — Get Quote Card (Dark rounded panel style)
   Colors come from section-palettes.json (cta.* schemes).
   Props: { eyebrow, title, titleAccent, body, cta, secondary, colorScheme } */
export default function CTALayout1GetQuote({
  eyebrow = "Get a Quote",
  title = "Why wait?",
  titleAccent = "Talk to us.",
  body = "Contact us for a quote or to learn more. 48-hour response. Confidentiality default.",
  cta = { label: "Get in Touch", href: "/contact" },
  secondary = null,
  colorScheme = "dark",
}) {
  const theme = getSectionTheme("cta", colorScheme, "dark");

  return (
    <section style={{
      background: theme.background,
      padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem) clamp(3rem,5vw,5rem)",
    }}>
      <div className="container">
        <div style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          padding: "clamp(2.5rem,5vw,4rem)",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: theme.eyebrow, marginBottom: "1.1rem",
          }}>
            {eyebrow}
          </p>
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(1.8rem,3.6vw,2.8rem)",
            lineHeight: 1.15, letterSpacing: "-0.02em",
            color: theme.title, maxWidth: 760, margin: "0 auto 1rem",
          }}>
            {title}{" "}
            <span style={{ color: theme.accent, fontStyle: "italic" }}>{titleAccent}</span>
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "1.05rem",
            color: theme.body, lineHeight: 1.6,
            maxWidth: 600, margin: "0 auto 2rem",
          }}>
            {body}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "center" }}>
            <a href={cta.href} className="btn-neon">{cta.label}</a>
            {secondary && (
              <a href={secondary.href} className="btn-ghost">{secondary.label}</a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
