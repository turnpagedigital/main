import React, { useState } from "react";
import { NEON, FONT } from "../data/tokens.js";

/* Single deal tile rendered inside the "Relevant Experience" grid on Home
   and Crypto pages. Front face shows the headline numbers and metadata
   that has always been there. If the deal has a non-empty `summary`, the
   card becomes flippable — hover on desktop or tap on touch — and the
   back face reveals the summary. Cards without a summary stay static so
   we don't show a flip affordance for empty content. */
export default function DealCard({ deal }) {
  const [flipped, setFlipped] = useState(false);
  const hasSummary = Boolean(deal.summary && deal.summary.trim());

  function onClick() {
    if (hasSummary) setFlipped(f => !f);
  }

  function onKeyDown(e) {
    if (!hasSummary) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFlipped(f => !f);
    }
  }

  return (
    <div
      className={"deal-card-flip" + (flipped ? " is-flipped" : "") + (hasSummary ? " has-summary" : "")}
      style={{ cursor: hasSummary ? "pointer" : "default" }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={hasSummary ? 0 : -1}
      role={hasSummary ? "button" : undefined}
      aria-pressed={hasSummary ? flipped : undefined}
    >
      <div className="deal-card-inner">
        {/* FRONT */}
        <div className="deal-card-face deal-card-front">
          <div style={{
            fontFamily: FONT, fontWeight: 900,
            fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)",
            lineHeight: 1, letterSpacing: "-0.03em",
            color: NEON, marginBottom: "0.8rem",
          }}>
            {deal.amt}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700,
            color: "#fff", marginBottom: "0.4rem",
            letterSpacing: "-0.01em",
          }}>
            {deal.who}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: "0.92rem",
            color: "rgba(255,255,255,0.78)", lineHeight: 1.45,
            marginBottom: "0.9rem",
          }}>
            {deal.type}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: "0.74rem",
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.04em",
          }}>
            {deal.form} · {deal.when}
          </div>

          {hasSummary && (
            <span aria-hidden="true" style={{
              position: "absolute", top: "1.1rem", right: "1.1rem",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 19L19 3M19 3H8M19 3V14" stroke={NEON} strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter"/>
              </svg>
            </span>
          )}
        </div>

        {/* BACK */}
        <div className="deal-card-face deal-card-back">
          <div style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(1rem, 1.4vw, 1.15rem)",
            lineHeight: 1.15, letterSpacing: "-0.01em",
            color: NEON, marginBottom: "0.6rem",
          }}>
            {deal.amt} · {deal.who}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: "0.92rem",
            color: "rgba(255,255,255,0.88)", lineHeight: 1.55,
            overflowY: "auto", flex: 1, paddingRight: "0.3rem",
          }}>
            {deal.summary}
          </div>
          <span aria-hidden="true" style={{
            position: "absolute", top: "1.1rem", right: "1.1rem",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 2L18 18M18 2L2 18" stroke={NEON} strokeWidth="1.75" strokeLinecap="square"/>
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
