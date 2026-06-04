import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import SectionHeader from "../SectionHeader.jsx";
import aiCopyrightContent   from "../../data/ai-copyright-content.json";
import cryptoContent        from "../../data/crypto-content.json";
import litFinContent        from "../../data/litigation-finance-content.json";

const PAGE_CONTENT = {
  "ai-copyright":      aiCopyrightContent,
  "crypto":            cryptoContent,
  "litigation-finance": litFinContent,
};

/* Per-page audience cards ("Who We Help"). Content managed via Pages → Marketing Pages. */
export default function AudienceCardsSection({ pageKey }) {
  const content = PAGE_CONTENT[pageKey];
  if (!content) return null;
  const cards    = content.audienceCards || [];
  const priority = cards.filter(c => c.priority);
  const rest     = cards.filter(c => !c.priority);

  // Page-specific headers
  const headers = {
    "ai-copyright":      { eyebrow: "Who We Help", title: "Authors. Publishers.", accent: "Newsrooms. Artists." },
    "crypto":            { eyebrow: "Who We Help", title: "Creditors. Funds.",    accent: "Estates." },
    "litigation-finance":{ eyebrow: "Who We Help", title: "Firms. Claimants.",   accent: "Cases." },
  };
  const h = headers[pageKey] || { eyebrow: "Who We Help", title: "", accent: "" };

  return (
    <section id="who-we-help" className="surface-paper-2 section-pad">
      <div className="container">
        <SectionHeader eyebrow={h.eyebrow} title={h.title} accent={h.accent} />
        {priority.length > 0 && (
          <div className="grid-2col" style={{ marginBottom: "1.2rem" }}>
            {priority.map(c => <AudienceCard key={c.id} priority title={c.title} body={c.body} />)}
          </div>
        )}
        {rest.length > 0 && (
          <div className="grid-2col">
            {rest.map(c => <AudienceCard key={c.id} title={c.title} body={c.body} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function AudienceCard({ title, body, priority }) {
  return (
    <div className="card-light" style={{
      background: priority ? "#0A0A0A" : "#fff",
      color: priority ? "#fff" : INK,
      borderColor: priority ? "rgba(255,255,255,0.14)" : LINE,
      position: priority ? "relative" : undefined,
      overflow: priority ? "hidden" : undefined,
    }}>
      {priority && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(60% 70% at 0% 0%, rgba(212,255,0,0.08), transparent 60%)",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontSize: "1.3rem", fontWeight: 800,
          color: priority ? "#fff" : INK,
          marginBottom: "0.7rem", letterSpacing: "-0.01em", lineHeight: 1.2,
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.97rem",
          color: priority ? "rgba(255,255,255,0.78)" : INK_60,
          lineHeight: 1.6,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}
