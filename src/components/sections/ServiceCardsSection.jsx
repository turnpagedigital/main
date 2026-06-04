import React from "react";
import { NEON, FONT } from "../../data/tokens.js";
import SectionHeader from "../SectionHeader.jsx";
import aiCopyrightContent   from "../../data/ai-copyright-content.json";
import cryptoContent        from "../../data/crypto-content.json";
import litFinContent        from "../../data/litigation-finance-content.json";

const PAGE_CONTENT = {
  "ai-copyright":       aiCopyrightContent,
  "crypto":             cryptoContent,
  "litigation-finance": litFinContent,
};

/* Per-page service/offer cards. Content managed via Pages → Marketing Pages. */
export default function ServiceCardsSection({ pageKey }) {
  const content = PAGE_CONTENT[pageKey];
  if (!content) return null;
  const cards = content.serviceCards || [];

  const headers = {
    "ai-copyright":       { eyebrow: "What We Offer",  title: "Capital.",   accent: "Advisory." },
    "crypto":             { eyebrow: "What We Offer",  title: "Trade.",      accent: "Advise. Close." },
    "litigation-finance": { eyebrow: "What We Fund",   title: "Cases that deserve to win.", accent: "" },
  };
  const h = headers[pageKey] || { eyebrow: "What We Offer", title: "", accent: "" };

  return (
    <section className="surface-paper section-pad">
      <div className="container">
        <SectionHeader eyebrow={h.eyebrow} title={h.title} accent={h.accent} />
        <div className="grid-3col">
          {cards.map(c => <ServiceCard key={c.id} title={c.title} body={c.body} />)}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ title, body }) {
  return (
    <div className="card-light" style={{
      background: "#0A0A0A", color: "#fff",
      borderColor: "rgba(255,255,255,0.14)",
      padding: "2rem 1.8rem", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(60% 60% at 100% 0%, rgba(212,255,0,0.08), transparent 60%)",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontSize: "1.6rem", fontWeight: 800, color: NEON,
          marginBottom: "0.9rem", letterSpacing: "-0.01em",
        }}>
          {title}
        </h3>
        <p style={{ fontFamily: FONT, fontSize: "1rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.65 }}>
          {body}
        </p>
      </div>
    </div>
  );
}
