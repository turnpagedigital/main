import React from "react";
import { NEON, FONT, PAPER, PAPER_2, SURFACE, INK, INK_60, INK_40, LINE, DARK_CARD, DARK_BORDER } from "../../data/tokens.js";

/* ScenarioCardsSection — a row of outcome/scenario cards, each with a small
   kicker, a big headline figure (year, amount, …), a title, and a note. One
   card can be highlighted as the dark featured card with a neon tag. Generic
   template section; pairs naturally with the timeline section.
   Inline section: content lives in page-compositions.json sectionConfig.content.
   Schema:
     eyebrow, title, accent — section header (all optional; accent gets the
                              neon underline on light schemes, neon italic on dark)
     showKicker             — false hides the small in-card labels entirely (default true)
     kicker                 — default small label inside each card ("Scenario")
     cards[]                — { id, tag, figure, title, note, highlight, kicker, cardStyle }
                              cardStyle: "white" (default) | "light-gray" | "dark"
                              (dark is the featured card with the neon figure;
                               highlight: true is the legacy alias for it)
                              kicker: per-card override of the default kicker
     cardRadius             — card corner radius in px (0–40, default 14; 0 = square)
     cardAlign              — "left" (default) | "center" — text alignment inside each card
     cardMaxWidth           — card width cap in px (default "" = fills its grid column);
                              the card centers within its column once capped
     footnote               — small print under the cards
     colorScheme            — "paper-2" (default) | "paper" | "white" | "light-gray" | "dark"
*/

const SCHEMES = {
  "paper-2":    { bg: PAPER_2,   dark: false },
  paper:        { bg: PAPER,     dark: false },
  white:        { bg: "#fff",    dark: false },
  "light-gray": { bg: "#F4F5F7", dark: false },
  dark:         { bg: "#0A0A0A", dark: true },
};

/* Shared renderer for the cards grid + footnote — also used by the timeline
   section when its content includes cards, so one section can carry the full
   header → timeline → scenarios → footnote flow. */
export function ScenarioCardsGrid({ cards, kicker = "Scenario", showKicker = true, cardRadius = 14, cardAlign = "left", cardMaxWidth = "", footnote = "", darkSection = false }) {
  const radius = Number.isFinite(Number(cardRadius)) && cardRadius !== "" && cardRadius !== null
    ? Math.max(0, Math.min(40, Number(cardRadius)))
    : 14;
  const centered = cardAlign === "center";
  const maxW = Number.isFinite(Number(cardMaxWidth)) && cardMaxWidth !== "" && cardMaxWidth !== null
    ? Math.max(0, Number(cardMaxWidth))
    : null;
  return (
    <>
      <div className="sccards-grid" style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.max(cards.length, 1)}, 1fr)`,
        gap: "clamp(1rem, 2vw, 1.5rem)",
      }}>
        {cards.map((card, i) => {
          const style = card.cardStyle || (card.highlight ? "dark" : "white");
          const featured = style === "dark";
          const cardBg = featured ? DARK_CARD : style === "light-gray" ? "#F4F5F7" : SURFACE;
          const cardKicker = showKicker ? (card.kicker || kicker) : "";
          return (
            <div key={card.id || i} style={{
              background: cardBg,
              color: featured ? "#fff" : INK,
              border: `1px solid ${featured ? DARK_BORDER : LINE}`,
              borderRadius: radius, padding: "1.9rem 1.7rem",
              display: "flex", flexDirection: "column",
              alignItems: centered ? "center" : "stretch",
              textAlign: centered ? "center" : "left",
              position: "relative", overflow: "hidden",
              ...(maxW != null ? { maxWidth: maxW, marginLeft: "auto", marginRight: "auto" } : {}),
            }}>
              {featured && (
                <span aria-hidden="true" style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "radial-gradient(120% 70% at 0% 0%, rgba(212,255,0,0.10), transparent 50%)",
                }} />
              )}
              {card.tag && (
                <span style={{
                  position: "relative", alignSelf: centered ? "center" : "flex-start",
                  fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.18em",
                  textTransform: "uppercase", padding: "0.25rem 0.6rem",
                  borderRadius: 4, marginBottom: "0.9rem",
                  background: NEON, color: "#000",
                }}>{card.tag}</span>
              )}
              {cardKicker && (
                <div style={{
                  position: "relative", fontSize: "0.66rem", fontWeight: 800,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: featured ? "rgba(255,255,255,0.5)" : INK_40,
                }}>{cardKicker}</div>
              )}
              {card.figure && (
                <div style={{
                  position: "relative", marginTop: "1.1rem", fontWeight: 900,
                  fontSize: "clamp(2rem, 3.6vw, 2.9rem)", lineHeight: 1,
                  letterSpacing: "-0.02em", color: featured ? NEON : INK,
                }}>{card.figure}</div>
              )}
              {card.title && (
                <div style={{
                  position: "relative", marginTop: "0.9rem", fontSize: "0.98rem",
                  fontWeight: 600, lineHeight: 1.5,
                  color: featured ? "rgba(255,255,255,0.92)" : INK,
                }}>{card.title}</div>
              )}
              {card.note && (
                <div style={{
                  position: "relative", marginTop: "0.6rem", fontSize: "0.82rem",
                  lineHeight: 1.5, color: featured ? "rgba(255,255,255,0.6)" : INK_60,
                }}>{card.note}</div>
              )}
            </div>
          );
        })}
      </div>
      {footnote && (
        <p style={{
          marginTop: "2rem", fontSize: "0.76rem", lineHeight: 1.6,
          color: darkSection ? "rgba(255,255,255,0.45)" : INK_40, maxWidth: 860,
        }}>
          {footnote}
        </p>
      )}
      <style>{`
        @media (max-width: 980px) {
          .sccards-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

export default function ScenarioCardsSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const eyebrow  = c.eyebrow || "";
  const title    = c.title || "";
  const accent   = c.accent || "";
  const showKicker = c.showKicker !== false;
  const kicker     = c.kicker ?? "Scenario";
  const cards      = c.cards || [];
  const footnote = c.footnote || "";

  const s = SCHEMES[c.colorScheme] || SCHEMES["paper-2"];
  const ink = s.dark ? "#fff" : INK;
  const cardRadius = Number.isFinite(Number(c.cardRadius)) && c.cardRadius !== "" && c.cardRadius !== null
    ? Math.max(0, Math.min(40, Number(c.cardRadius)))
    : 14;
  const cardAlign = c.cardAlign === "center" ? "center" : "left";
  const cardMaxWidth = c.cardMaxWidth ?? "";

  return (
    <section style={{
      fontFamily: FONT, color: ink, background: s.bg,
      padding: "clamp(2.5rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)",
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

        <div style={{ marginTop: (eyebrow || title) ? "clamp(2rem, 4vw, 3rem)" : 0 }}>
          <ScenarioCardsGrid
            cards={cards}
            kicker={kicker}
            showKicker={showKicker}
            cardRadius={cardRadius}
            cardAlign={cardAlign}
            cardMaxWidth={cardMaxWidth}
            footnote={footnote}
            darkSection={s.dark}
          />
        </div>
      </div>
    </section>
  );
}
