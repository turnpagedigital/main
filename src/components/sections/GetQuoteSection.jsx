import React from "react";
import { NEON, FONT } from "../../data/tokens.js";

/* Home-page "Get a Quote" dark rounded panel. Content from sectionConfig.content. */
export default function GetQuoteSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const eyebrow    = c.eyebrow    || "Get a Quote";
  const title      = c.title      || "Why wait?";
  const titleAccent= c.titleAccent|| "Talk to us.";
  const body       = c.body       || "Contact us for a quote or to learn more. 48-hour response. Confidentiality default.";
  const cta        = c.cta        || { label: "Get in Touch", href: "/contact" };

  return (
    <section style={{
      background: "#000",
      padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem) clamp(3rem,5vw,5rem)",
    }}>
      <div className="container">
        <div style={{
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          padding: "clamp(2.5rem,5vw,4rem)",
          textAlign: "center",
        }}>
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
            color: "#fff", maxWidth: 760, margin: "0 auto 1rem",
          }}>
            {title}{" "}
            <span style={{ color: NEON, fontStyle: "italic" }}>{titleAccent}</span>
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "1.05rem",
            color: "rgba(255,255,255,0.6)", lineHeight: 1.6,
            maxWidth: 600, margin: "0 auto 2rem",
          }}>
            {body}
          </p>
          <a href={cta.href} className="btn-neon">{cta.label}</a>
        </div>
      </div>
    </section>
  );
}
