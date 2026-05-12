import React from "react";
import { NEON, FONT } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

/* Big polished bottom CTA panel. Sits in a paper section with a dark rounded
   card containing headline + buttons. OffDeal-style closer.
   Used at the bottom of nearly every page. */
export default function BottomCTA({
  eyebrow = "Get in Touch",
  title = "Hold a claim?",
  accent = "Talk to us.",
  kicker = "Confidentiality assured. We respond to every inquiry within 48 hours.",
  primary = { label: "Get in Touch", href: hashHref("contact") },
  secondary = null,
}) {
  return (
    <section className="surface-paper" style={{ padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem) clamp(3rem,5vw,5rem)" }}>
      <div className="container">
        <div className="bottom-cta">
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: NEON, marginBottom: "1.1rem",
          }}>
            {eyebrow}
          </p>
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(1.8rem,3.6vw,2.8rem)",
            lineHeight: 1.15, letterSpacing: "-0.02em",
            color: "#fff", marginBottom: "1rem",
            maxWidth: 760, margin: "0 auto 1rem",
          }}>
            {title}{" "}
            <span style={{ color: NEON, fontStyle: "italic" }}>{accent}</span>
          </h2>
          {kicker && (
            <p style={{
              fontFamily: FONT, fontSize: "1.05rem",
              color: "rgba(255,255,255,0.72)", lineHeight: 1.6,
              marginBottom: "2rem", maxWidth: 600, margin: "0 auto 2rem",
            }}>
              {kicker}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "center" }}>
            <a href={primary.href} className="btn-neon">{primary.label}</a>
            {secondary && (
              <a href={secondary.href} className="btn-ghost">{secondary.label}</a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
