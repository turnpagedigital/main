import React from "react";
import { NEON, FONT } from "../../data/tokens.js";
import DealCard from "../DealCard.jsx";
import dealsData from "../../data/deals.json";

/* Relevant Experience — deal cards filtered by pageKey.
   Content managed in Content → Deals. */
export default function ExperienceSection({ pageKey }) {
  const deals = (dealsData.deals || []).filter(
    d => Array.isArray(d.pages) && d.pages.includes(pageKey)
  );
  if (!deals.length) return null;

  // Page-specific heading copy
  const headings = {
    home: {
      eyebrow: "Relevant Experience",
      title: "A track record across the largest claims trades.",
      body: "A representative slice of recent deals across crypto insolvencies, pension claims, antitrust settlements, and complex litigation matters.",
    },
    "ai-copyright": {
      eyebrow: "Relevant Experience",
      title: "A track record across other class actions.",
      body: "A representative selection of our work advising rights holders, class members, and institutional buyers across the emerging AI copyright landscape.",
    },
    crypto: {
      eyebrow: "Relevant Experience",
      title: "A track record across digital-asset insolvencies.",
      body: "A representative slice of deals across crypto insolvencies, exchange failures, and digital-asset restructurings.",
    },
  };
  const h = headings[pageKey] || headings.home;

  return (
    <section style={{
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
              {h.eyebrow}
            </p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem, 4.5vw, 4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em", color: "#fff",
            }}>
              {h.title}
            </h2>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
            color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 640,
          }}>
            {h.body}
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px",
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8, overflow: "hidden",
        }} className="deals-grid">
          {deals.map((d, i) => <DealCard key={i} deal={d} />)}
        </div>

        <p style={{
          fontFamily: FONT, fontSize: "0.78rem",
          color: "rgba(255,255,255,0.4)", marginTop: "1.2rem", fontStyle: "italic",
        }}>
          * Experience prior to Turnpage
        </p>

        <style>{`
          @media (max-width: 1000px) { .deals-grid { grid-template-columns: repeat(2, 1fr) !important; } }
          @media (max-width: 640px)  { .deals-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </section>
  );
}
