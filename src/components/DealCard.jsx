import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";

/* Single deal tile rendered inside the "Relevant Experience" grid on Home
   and Crypto pages.

   Interaction:
   - Cards with a summary flip on hover (desktop) / tap (touch) — unchanged.
   - If the deal also has a case_study, a "View case study →" button appears
     on the back face. Clicking it opens a full modal; the button's click
     does NOT toggle the flip back (stopPropagation).
   - Cards without a summary stay static. */

export default function DealCard({ deal }) {
  const [flipped,   setFlipped]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const hasSummary   = Boolean(deal.summary    && deal.summary.trim());
  const hasCaseStudy = Boolean(deal.case_study && deal.case_study.trim());

  /* ── Escape closes modal ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = e => { if (e.key === "Escape") setModalOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  /* ── Body-scroll lock ──────────────────────────────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  function handleCardClick() {
    if (hasSummary) setFlipped(f => !f);
  }

  function handleCardKeyDown(e) {
    if (!hasSummary) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(f => !f); }
  }

  function openModal(e) {
    e.stopPropagation(); // don't flip the card back
    setModalOpen(true);
  }

  return (
    <>
      <div
        className={"deal-card-flip" + (flipped ? " is-flipped" : "") + (hasSummary ? " has-summary" : "")}
        style={{ cursor: hasSummary ? "pointer" : "default" }}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        tabIndex={hasSummary ? 0 : -1}
        role={hasSummary ? "button" : undefined}
        aria-pressed={hasSummary ? flipped : undefined}
      >
        <div className="deal-card-inner">

          {/* ── FRONT ──────────────────────────────────────────────────── */}
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
              {deal.type}{deal.preTurnpage ? <span style={{ color: NEON, marginLeft: "0.15em" }}>*</span> : null}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "0.74rem",
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.04em",
            }}>
              {deal.form} · {deal.when}
            </div>

            {/* Logos */}
            {Array.isArray(deal.logos) && deal.logos.filter(Boolean).length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                marginTop: "0.85rem", flexWrap: "wrap",
              }}>
                {deal.logos.filter(Boolean).slice(0, 3).map((url, i) => (
                  <img
                    key={i} src={url} alt=""
                    style={{
                      height: 18, maxWidth: 64,
                      objectFit: "contain",
                      filter: "brightness(0) invert(1)",
                      opacity: 0.65, display: "block",
                    }}
                    onError={e => { e.currentTarget.style.display = "none"; }}
                  />
                ))}
              </div>
            )}

            {hasSummary && (
              <span aria-hidden="true" style={{
                position: "absolute", top: "calc(1.1rem + 10px)", right: "calc(1.1rem + 5px)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M3 19L19 3M19 3H8M19 3V14" stroke={NEON} strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter"/>
                </svg>
              </span>
            )}
          </div>

          {/* ── BACK ───────────────────────────────────────────────────── */}
          <div className="deal-card-face deal-card-back">
            <div style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(1rem, 1.4vw, 1.15rem)",
              lineHeight: 1.15, letterSpacing: "-0.01em",
              color: "#000", marginBottom: "0.6rem",
              paddingRight: "3.5rem",
            }}>
              {deal.amt} · {deal.who}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "0.92rem",
              color: "rgba(0,0,0,0.75)", lineHeight: 1.55,
              overflowY: "auto", flex: 1, paddingRight: "0.3rem",
            }}>
              {deal.summary}
            </div>

            {/* Case study CTA — only shown on the back face */}
            {hasCaseStudy && (
              <button
                onClick={openModal}
                style={{
                  marginTop: "1rem",
                  background: "none", border: "none", padding: 0,
                  cursor: "pointer",
                  fontFamily: FONT, fontSize: "0.8rem", fontWeight: 800,
                  letterSpacing: "0.04em", color: "#000",
                  textDecoration: "underline", textUnderlineOffset: "3px",
                  alignSelf: "flex-start",
                }}
              >
                View case study →
              </button>
            )}

            <span aria-hidden="true" style={{
              position: "absolute", top: "calc(1.1rem + 10px)", right: "calc(1.1rem + 5px)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 2L18 18M18 2L2 18" stroke="#000" strokeWidth="1.75" strokeLinecap="square"/>
              </svg>
            </span>
          </div>

        </div>
      </div>

      {/* ── Case study modal ─────────────────────────────────────────────── */}
      {hasCaseStudy && modalOpen && createPortal(
        <div
          className="cs-modal-backdrop"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${deal.amt} · ${deal.who} — Case Study`}
        >
          <div className="cs-modal-panel" onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button
              className="cs-modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M2 2L18 18M18 2L2 18" stroke={INK} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Header */}
            <div style={{ marginBottom: "1.5rem", paddingRight: "2.5rem" }}>
              <div style={{
                fontFamily: FONT, fontWeight: 900,
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                letterSpacing: "-0.03em", color: INK,
                lineHeight: 1.05, marginBottom: "0.4rem",
              }}>
                {deal.amt}
              </div>
              <div style={{
                fontFamily: FONT, fontWeight: 700,
                fontSize: "0.95rem", color: INK_60,
                letterSpacing: "-0.01em",
              }}>
                {deal.who}{deal.type ? ` · ${deal.type}` : ""}
              </div>
            </div>

            {/* Neon rule */}
            <div style={{ borderTop: `3px solid ${NEON}`, marginBottom: "1.75rem" }} />

            {/* Body */}
            <div style={{
              fontFamily: FONT, fontSize: "0.95rem",
              color: INK_60, lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}>
              {deal.case_study}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
