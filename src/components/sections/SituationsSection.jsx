import React, { useState } from "react";
import { FONT, INK, INK_60, INK_40, LINE_STRONG } from "../../data/tokens.js";
import homeContent from "../../data/home-content.json";

const SITUATIONS = (homeContent.situations || []).filter(s => s.hidden !== true);

/* Expandable situations list. Content managed in Content → Home Content. */
export default function SituationsSection() {
  const [openIdx, setOpenIdx] = useState(null);
  const toggle = idx => setOpenIdx(prev => prev === idx ? null : idx);

  return (
    <section id="situations" style={{
      background: "#FFFFFF",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: "clamp(2rem, 5vw, 5rem)",
          marginBottom: "clamp(3rem, 7vw, 6rem)",
          alignItems: "end",
        }} className="section-split">
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: INK_60, marginBottom: "1.2rem",
            }}>
              What we cover
            </p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem, 4.5vw, 4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em", color: INK,
            }}>
              The toughest claims<br/>
              <span className="accent-light">on the docket.</span>
            </h2>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1.05rem, 1.4vw, 1.25rem)",
            color: INK_60, lineHeight: 1.6, maxWidth: 640,
          }}>
            We handle every kind of compensation claim — from class action settlements and Chapter 11 customer positions to refund rights and locked digital assets. Whatever the situation, if there's a path to liquidity, we've got it covered.
          </p>
        </div>

        <div style={{ borderTop: `1px solid ${LINE_STRONG}` }}>
          {SITUATIONS.map((s, idx) => {
            const isOpen = openIdx === idx;
            const ROW_PAD = "clamp(1.8rem, 3vw, 2.4rem)";
            const rowPb = isOpen ? "0.6rem" : ROW_PAD;
            return (
              <div
                key={s.no || s.id}
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(idx); } }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(220px, 1.4fr) minmax(0, 2fr)",
                  columnGap: "clamp(1.5rem, 4vw, 4rem)",
                  alignItems: "start",
                  borderBottom: `1px solid ${LINE_STRONG}`,
                  background: isOpen ? "#FAFAFA" : "transparent",
                  transition: "background 0.25s",
                  cursor: "pointer",
                }}
                className="situations-row"
              >
                <div style={{ paddingTop: ROW_PAD, paddingBottom: rowPb, display: "flex", alignItems: "flex-start" }}>
                  <span style={{
                    fontFamily: FONT, fontWeight: 700, fontSize: "1.6rem", lineHeight: 1,
                    color: isOpen ? INK : INK_40, display: "inline-block",
                    transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), color 0.2s",
                    userSelect: "none",
                  }}>+</span>
                </div>
                <h3 style={{
                  fontFamily: FONT, fontWeight: 800,
                  fontSize: "clamp(1.5rem, 3vw, 2.4rem)",
                  color: INK, letterSpacing: "-0.02em", lineHeight: 1.05, margin: 0,
                  paddingTop: ROW_PAD, paddingBottom: rowPb,
                }}>
                  {s.title}
                </h3>
                <p className="situations-body" style={{
                  fontFamily: FONT, fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
                  color: INK_60, lineHeight: 1.6, margin: 0,
                  paddingTop: ROW_PAD, paddingBottom: rowPb,
                }}>
                  {s.body}
                </p>
                <div style={{
                  gridColumn: "2 / -1", overflow: "hidden",
                  maxHeight: isOpen ? "300px" : "0",
                  transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
                }}>
                  <p style={{
                    fontFamily: FONT, fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
                    color: INK, lineHeight: 1.7, margin: 0,
                    paddingTop: "clamp(0.5rem, 1vw, 0.75rem)",
                    paddingBottom: ROW_PAD,
                    paddingRight: "clamp(1rem, 4vw, 4rem)",
                  }}>
                    {s.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          @media (max-width: 720px) {
            .section-split { grid-template-columns: 1fr !important; }
            .situations-row { grid-template-columns: auto 1fr !important; }
            .situations-body { grid-column: 2 / -1 !important; padding-top: 0 !important; }
          }
        `}</style>
      </div>
    </section>
  );
}
