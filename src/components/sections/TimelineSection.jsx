import React from "react";
import { NEON, NEON_SOFT, FONT, PAPER, PAPER_2, SURFACE, INK, INK_60, INK_40, INK_20, LINE, DARK_CARD, DARK_BORDER } from "../../data/tokens.js";

/* TimelineSection — milestone timeline with status dots ("You are here"),
   followed by an optional row of outcome/scenario cards and a footnote.
   Built for the Bartz payout-timeline content but fully generic.
   Inline section: content lives in page-compositions.json sectionConfig.content.
   Schema:
     eyebrow, title, accent       — section header (accent gets the neon underline)
     steps[]                      — { id, when, heading, body, state, pillLabel, pillStyle }
                                    state: "" | "here" (neon dot) | "done" (filled dot)
                                    pillStyle: "neon" | "ink"
     scenariosEyebrow             — header above the scenario cards (cards hidden if no scenarios)
     scenarios[]                  — { id, tag, year, title, note, highlight }
                                    highlight: true renders the dark featured card
     footnote                     — small print under the scenario cards
*/

export default function TimelineSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const eyebrow          = c.eyebrow || "";
  const title            = c.title || "";
  const accent           = c.accent || "";
  const steps            = c.steps || [];
  const scenariosEyebrow = c.scenariosEyebrow || "";
  const scenarios        = c.scenarios || [];
  const footnote         = c.footnote || "";

  const eyebrowStyle = {
    fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
    letterSpacing: "0.22em", textTransform: "uppercase", color: INK,
    display: "flex", alignItems: "center", gap: "0.6em", margin: 0,
  };
  const eyebrowDash = (
    <span aria-hidden="true" style={{
      display: "inline-block", width: "1.6em", height: "0.18em",
      background: NEON, borderRadius: 2, flexShrink: 0,
    }} />
  );
  const pillStyle = (style) => ({
    display: "inline-block", fontFamily: FONT, fontSize: "0.6rem", fontWeight: 800,
    letterSpacing: "0.16em", textTransform: "uppercase",
    padding: "0.28rem 0.6rem", borderRadius: 4, marginTop: "0.5rem",
    background: style === "ink" ? INK : NEON,
    color: style === "ink" ? "#fff" : INK,
  });

  return (
    <section style={{ fontFamily: FONT, color: INK }}>

      {/* ── Timeline ── */}
      <div style={{ background: PAPER, padding: "clamp(3rem, 7vw, 6rem) clamp(1.5rem, 5vw, 4rem)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          {eyebrow && <p style={eyebrowStyle}>{eyebrowDash}{eyebrow}</p>}
          {title && (
            <h2 style={{
              fontWeight: 800, fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)",
              lineHeight: 1.15, letterSpacing: "-0.02em", color: INK,
              margin: "0.9rem 0 0",
            }}>
              {title}
              {accent && <> <span style={{
                fontStyle: "italic",
                backgroundImage: `linear-gradient(180deg, transparent 58%, ${NEON} 58%, ${NEON} 94%, transparent 94%)`,
                padding: "0 0.12em",
                WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone",
              }}>{accent}</span></>}
            </h2>
          )}

          <div className="tlsec-grid" style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, 1fr)`,
            gap: "clamp(1rem, 2vw, 1.5rem)",
            position: "relative",
            marginTop: "clamp(2.5rem, 5vw, 4rem)",
          }}>
            <span className="tlsec-line" aria-hidden="true" style={{
              position: "absolute", left: 0, right: 0, top: 7,
              height: 2, background: INK_20,
            }} />
            {steps.map((step, i) => (
              <div key={step.id || i} className="tlsec-step" style={{ position: "relative", paddingTop: "2rem" }}>
                <span className="tlsec-dot" style={{
                  position: "absolute", top: 0, left: 0,
                  width: 16, height: 16, borderRadius: "50%", boxSizing: "border-box",
                  background: step.state === "here" ? NEON : step.state === "done" ? INK : PAPER,
                  border: `2px solid ${step.state === "here" || step.state === "done" ? INK : INK_40}`,
                  boxShadow: step.state === "here" ? `0 0 0 6px ${NEON_SOFT}` : "none",
                }} />
                {step.when && (
                  <div style={{
                    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: INK_60,
                  }}>{step.when}</div>
                )}
                {step.pillLabel && <div><span style={pillStyle(step.pillStyle)}>{step.pillLabel}</span></div>}
                {step.heading && (
                  <h3 style={{
                    margin: "0.7rem 0 0", fontSize: "1.06rem", fontWeight: 700,
                    letterSpacing: "-0.01em", lineHeight: 1.3, color: INK,
                  }}>{step.heading}</h3>
                )}
                {step.body && (
                  <p style={{ margin: "0.55rem 0 0", fontSize: "0.9rem", lineHeight: 1.55, color: INK_60 }}>
                    {step.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scenario cards ── */}
      {scenarios.length > 0 && (
        <div style={{ background: PAPER_2, padding: "clamp(2rem, 5vw, 4rem) clamp(1.5rem, 5vw, 4rem) clamp(3rem, 7vw, 6rem)" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            {scenariosEyebrow && <p style={eyebrowStyle}>{eyebrowDash}{scenariosEyebrow}</p>}

            <div className="tlsec-scenarios" style={{
              display: "grid",
              gridTemplateColumns: `repeat(${scenarios.length}, 1fr)`,
              gap: "clamp(1rem, 2vw, 1.5rem)",
              marginTop: "clamp(2rem, 4vw, 3rem)",
            }}>
              {scenarios.map((sc, i) => {
                const dark = !!sc.highlight;
                return (
                  <div key={sc.id || i} style={{
                    background: dark ? DARK_CARD : SURFACE,
                    color: dark ? "#fff" : INK,
                    border: `1px solid ${dark ? DARK_BORDER : LINE}`,
                    borderRadius: 14, padding: "1.9rem 1.7rem",
                    display: "flex", flexDirection: "column",
                    position: "relative", overflow: "hidden",
                  }}>
                    {dark && (
                      <span aria-hidden="true" style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        background: "radial-gradient(120% 70% at 0% 0%, rgba(212,255,0,0.10), transparent 50%)",
                      }} />
                    )}
                    {sc.tag && (
                      <span style={{
                        position: "relative", alignSelf: "flex-start",
                        fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.18em",
                        textTransform: "uppercase", padding: "0.25rem 0.6rem",
                        borderRadius: 4, marginBottom: "0.9rem",
                        background: NEON, color: "#000",
                      }}>{sc.tag}</span>
                    )}
                    <div style={{
                      position: "relative", fontSize: "0.66rem", fontWeight: 800,
                      letterSpacing: "0.18em", textTransform: "uppercase",
                      color: dark ? "rgba(255,255,255,0.5)" : INK_40,
                    }}>Scenario</div>
                    {sc.year && (
                      <div style={{
                        position: "relative", marginTop: "1.1rem", fontWeight: 900,
                        fontSize: "clamp(2rem, 3.6vw, 2.9rem)", lineHeight: 1,
                        letterSpacing: "-0.02em", color: dark ? NEON : INK,
                      }}>{sc.year}</div>
                    )}
                    {sc.title && (
                      <div style={{
                        position: "relative", marginTop: "0.9rem", fontSize: "0.98rem",
                        fontWeight: 600, lineHeight: 1.5,
                        color: dark ? "rgba(255,255,255,0.92)" : INK,
                      }}>{sc.title}</div>
                    )}
                    {sc.note && (
                      <div style={{
                        position: "relative", marginTop: "0.6rem", fontSize: "0.82rem",
                        lineHeight: 1.5, color: dark ? "rgba(255,255,255,0.6)" : INK_60,
                      }}>{sc.note}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {footnote && (
              <p style={{ marginTop: "2rem", fontSize: "0.76rem", lineHeight: 1.6, color: INK_40, maxWidth: 860 }}>
                {footnote}
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 980px) {
          .tlsec-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .tlsec-line { top: 0 !important; bottom: 0 !important; left: 7px !important; right: auto !important; width: 2px !important; height: auto !important; }
          .tlsec-step { padding: 0 0 2.2rem 2.4rem !important; }
          .tlsec-step:last-child { padding-bottom: 0.4rem !important; }
          .tlsec-dot { top: 2px !important; }
          .tlsec-scenarios { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
