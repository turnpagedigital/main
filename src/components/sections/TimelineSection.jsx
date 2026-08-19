import React from "react";
import { NEON, NEON_SOFT, FONT, PAPER, PAPER_2, INK, INK_60, INK_40, INK_20 } from "../../data/tokens.js";
import { ScenarioCardsGrid } from "./ScenarioCardsSection.jsx";

/* TimelineSection — milestone timeline with status dots ("You are here"),
   date labels, and optional status pills per step. Generic template section;
   pairs naturally with the scenario-cards section for outcome scenarios.
   Inline section: content lives in page-compositions.json sectionConfig.content.
   Schema:
     eyebrow, title, accent       — section header (accent gets the neon underline
                                    on light schemes, neon italic on dark)
     steps[]                      — { id, when, heading, body, state, pillLabel, pillStyle }
                                    state: "" | "here" (neon dot) | "done" (filled dot)
                                    pillStyle: "neon" | "ink" | "white" | "light-gray"
                                    (white reads best on gray/dark schemes,
                                     light-gray on the white scheme; ink flips
                                     to a white pill on the dark scheme)
     colorScheme                  — "paper" (default) | "paper-2" | "white" | "light-gray" | "dark"
     cards[] + kicker + showKicker + cardRadius + cardAlign + cardMaxWidth + footnote
                                  — optional scenario cards rendered below the
                                    timeline (same schema as the scenario-cards
                                    section), so one section carries the full
                                    header → timeline → scenarios → footnote flow
*/

const SCHEMES = {
  paper:        { bg: PAPER,     dark: false },
  "paper-2":    { bg: PAPER_2,   dark: false },
  white:        { bg: "#fff",    dark: false },
  "light-gray": { bg: "#F4F5F7", dark: false },
  dark:         { bg: "#0A0A0A", dark: true },
};

export default function TimelineSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const eyebrow = c.eyebrow || "";
  const title   = c.title || "";
  const accent  = c.accent || "";
  const steps   = c.steps || [];
  const cards   = c.cards || [];

  const s = SCHEMES[c.colorScheme] || SCHEMES.paper;
  const ink    = s.dark ? "#fff" : INK;
  const body   = s.dark ? "rgba(255,255,255,0.65)" : INK_60;
  const line   = s.dark ? "rgba(255,255,255,0.22)" : INK_20;
  const dotOff = s.dark ? "rgba(255,255,255,0.45)" : INK_40;

  return (
    <section style={{
      fontFamily: FONT, color: ink, background: s.bg,
      padding: "clamp(3rem, 7vw, 6rem) clamp(1.5rem, 5vw, 4rem)",
      "--tl-line": line,
      "--tl-gap": "clamp(1rem, 2vw, 1.5rem)",
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {eyebrow && (
          <p style={{
            fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", color: s.dark ? NEON : INK,
            margin: 0,
          }}>
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 style={{
            fontWeight: 800, fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)",
            lineHeight: 1.15, letterSpacing: "-0.02em", color: ink,
            margin: "0.9rem 0 0",
          }}>
            {title}
            {accent && <> <span style={s.dark
              ? { fontStyle: "italic", color: NEON }
              : {
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
          gap: "var(--tl-gap)",
          position: "relative",
          marginTop: "clamp(2.5rem, 5vw, 4rem)",
        }}>
          {steps.map((step, i) => (
            <div key={step.id || i} className="tlsec-step" style={{ position: "relative", paddingTop: "2rem" }}>
              {i < steps.length - 1 && (
                <span className="tlsec-conn" aria-hidden="true">
                  <span className="tlsec-connbar" />
                  <span className="tlsec-arrow" />
                </span>
              )}
              <span className="tlsec-dot" style={{
                position: "absolute", top: 0, left: 0,
                width: 16, height: 16, borderRadius: "50%", boxSizing: "border-box",
                background: step.state === "here" ? NEON : step.state === "done" ? ink : s.bg,
                border: `2px solid ${step.state === "here" || step.state === "done" ? (s.dark ? NEON : INK) : dotOff}`,
                boxShadow: step.state === "here" ? `0 0 0 6px ${NEON_SOFT}` : "none",
              }} />
              {step.when && (
                <div style={{
                  fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: body,
                }}>{step.when}</div>
              )}
              {step.pillLabel && (() => {
                const pill =
                  step.pillStyle === "ink"        ? (s.dark ? { bg: "#fff", color: INK } : { bg: INK, color: "#fff" })
                  : step.pillStyle === "white"      ? { bg: "#fff", color: INK }
                  : step.pillStyle === "light-gray" ? { bg: "#F4F5F7", color: INK }
                  : { bg: NEON, color: INK };
                return (
                  <div><span style={{
                    display: "inline-block", fontSize: "0.6rem", fontWeight: 800,
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    padding: "0.28rem 0.6rem", borderRadius: 4, marginTop: "0.5rem",
                    background: pill.bg, color: pill.color,
                  }}>{step.pillLabel}</span></div>
                );
              })()}
              {step.heading && (
                <h3 style={{
                  margin: "0.7rem 0 0", fontSize: "1.06rem", fontWeight: 700,
                  letterSpacing: "-0.01em", lineHeight: 1.3, color: ink,
                }}>{step.heading}</h3>
              )}
              {step.body && (
                <p style={{ margin: "0.55rem 0 0", fontSize: "0.9rem", lineHeight: 1.55, color: body }}>
                  {step.body}
                </p>
              )}
            </div>
          ))}
        </div>

        {cards.length > 0 && (
          <div style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
            <ScenarioCardsGrid
              cards={cards}
              kicker={c.kicker ?? "Scenario"}
              showKicker={c.showKicker !== false}
              cardRadius={c.cardRadius}
              cardAlign={c.cardAlign === "center" ? "center" : "left"}
              cardMaxWidth={c.cardMaxWidth ?? ""}
              footnote={c.footnote || ""}
              darkSection={s.dark}
            />
          </div>
        )}
      </div>

      <style>{`
        /* Connector: line + arrowhead pointing at the next step's dot.
           Rendered per step (except the last), overflowing the grid gap so it
           ends just short of the following dot. */
        .tlsec-conn {
          position: absolute; top: 0; height: 16px;
          left: 24px; right: calc(-1 * var(--tl-gap) + 5px);
          display: flex; align-items: center; pointer-events: none;
        }
        .tlsec-connbar { flex: 1; height: 2px; background: var(--tl-line); }
        .tlsec-arrow {
          width: 0; height: 0; flex-shrink: 0;
          border-top: 4px solid transparent;
          border-bottom: 4px solid transparent;
          border-left: 6px solid var(--tl-line);
        }
        @media (max-width: 980px) {
          .tlsec-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .tlsec-step { padding: 0 0 2.2rem 2.4rem !important; }
          .tlsec-step:last-child { padding-bottom: 0.4rem !important; }
          .tlsec-dot { top: 2px !important; }
          .tlsec-conn {
            top: 24px; bottom: 5px; height: auto; left: 7px; right: auto; width: 2px;
            flex-direction: column;
          }
          .tlsec-connbar { flex: 1; width: 2px; height: auto; }
          .tlsec-arrow {
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 6px solid var(--tl-line);
            border-bottom: none;
            margin-left: -3px;
          }
        }
      `}</style>
    </section>
  );
}
