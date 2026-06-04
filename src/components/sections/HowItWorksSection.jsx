import React from "react";
import { NEON, FONT } from "../../data/tokens.js";
import litFinContent from "../../data/litigation-finance-content.json";

/* How It Works step sequence — currently Litigation Finance only. */
export default function HowItWorksSection({ pageKey }) {
  // Currently only litigation-finance has this section
  const steps = (pageKey === "litigation-finance" && litFinContent.howItWorks) || [];
  if (!steps.length) return null;

  return (
    <section id="how-litfin" style={{
      background: "#0A0B0E", color: "#fff",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: "clamp(2rem, 5vw, 5rem)",
          marginBottom: "clamp(3rem, 6vw, 5rem)",
          alignItems: "end",
        }} className="section-split">
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: NEON, marginBottom: "1.2rem",
            }}>
              How It Works
            </p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem,4.5vw,4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em",
              color: "#fff", margin: 0,
            }}>
              Three steps to a funded case.
            </h2>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
            color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 600, margin: 0,
          }}>
            We underwrite quickly and move capital decisively. No committees, no endless diligence loops.
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.08)",
        }} className="steps-grid">
          {steps.map(step => (
            <div key={step.n} style={{ padding: "clamp(1.8rem,3vw,2.4rem)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.2em", color: NEON, marginBottom: "1rem",
              }}>
                {step.n}
              </p>
              <h3 style={{
                fontFamily: FONT, fontWeight: 800, fontSize: "1.15rem",
                letterSpacing: "-0.01em", color: "#fff",
                marginBottom: "0.65rem", lineHeight: 1.2,
              }}>
                {step.title}
              </h3>
              <p style={{
                fontFamily: FONT, fontSize: "0.95rem",
                color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0,
              }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <style>{`
          @media (max-width: 720px) { .steps-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </section>
  );
}
