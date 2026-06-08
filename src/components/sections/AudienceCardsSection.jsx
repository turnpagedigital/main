import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import Card from "../Card.jsx";

/* AudienceCardsSection — "Who We Help"
   Inline section: content lives in page-compositions.json sectionConfig.content.
   Schema:
     eyebrow, title, accent     — section header text
     cards[]                    — { id, title, body, badge }  (badge is a custom label string, e.g., "Featured", "Urgent")
     layout                     — "grid-2col" (default) | "grid-3col" | "list"
     colorScheme                — "light-gray" (default) | "dark" | "white"
     cardStyle                  — "standard" (default) | "white" | "black" | "light-gray" | "dark" | "light-glass" | "clear-glass"
     cardRadius                 — "rounded" (default) | "square"
     backgroundImage            — optional image URL for section background
*/
export default function AudienceCardsSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const cards            = c.cards || [];
  const eyebrow          = c.eyebrow || "Who We Help";
  const title            = c.title   || "";
  const accent           = c.accent  || "";
  const layout           = c.layout  || "grid-2col";
  const colorScheme      = c.colorScheme || "light-gray";
  const cardStyle        = c.cardStyle || "standard";
  const cardRadius       = c.cardRadius || "rounded";
  const backgroundImage  = c.backgroundImage || "";

  const isList = layout === "list";
  const cols   = layout === "grid-3col" ? "repeat(3, 1fr)" : "repeat(2, 1fr)";

  const BG = { "light-gray": "#F4F5F7", "dark": "#0A0A0A", "white": "#fff" }[colorScheme] || "#F4F5F7";
  const eyebrowColor = colorScheme === "dark" ? NEON : INK_60;
  const titleColor   = colorScheme === "dark" ? "#fff" : INK;
  const accentClass  = colorScheme === "dark" ? "accent-neon" : "accent-light";

  return (
    <section id="who-we-help" style={{
      background: backgroundImage
        ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${backgroundImage}') center/cover no-repeat`
        : BG,
      padding: "clamp(4rem, 9vw, 8rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: colorScheme === "light-gray" && !backgroundImage ? `1px solid ${LINE}` : "none",
      position: "relative",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "clamp(2.5rem, 5vw, 4rem)", maxWidth: 800 }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: eyebrowColor, marginBottom: "1.1rem",
          }}>{eyebrow}</p>
          {title && (
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              lineHeight: 1.05, letterSpacing: "-0.03em",
              color: titleColor, margin: 0,
            }}>
              {title}{accent && (
                <> <span className={accentClass}>{accent}</span></>
              )}
            </h2>
          )}
        </div>

        {/* Cards */}
        {isList ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : LINE }}>
            {cards.map(card => <AudienceListRow key={card.id} card={card} dark={colorScheme === "dark"} />)}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: "clamp(1rem, 2vw, 1.5rem)",
          }} className="audience-grid">
            {cards.map(card => <AudienceCard key={card.id} card={card} schemeDark={colorScheme === "dark"} />)}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 760px) { .audience-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function AudienceCard({ card, schemeDark }) {
  const { title, body, badge } = card;
  const hasBadge = badge && badge.trim().length > 0;
  const cardBg = hasBadge
    ? "#0A0A0A"
    : schemeDark ? "rgba(255,255,255,0.05)" : "#fff";
  const titleClr = (hasBadge || schemeDark) ? "#fff" : INK;
  const bodyClr  = (hasBadge || schemeDark) ? "rgba(255,255,255,0.72)" : INK_60;
  const borderClr = (hasBadge || schemeDark)
    ? "rgba(255,255,255,0.12)"
    : LINE;

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${borderClr}`,
      padding: "clamp(1.5rem, 2.5vw, 2.2rem)",
      position: "relative",
      overflow: "hidden",
    }}>
      {hasBadge && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(55% 65% at 0% 0%, rgba(212,255,0,0.11), transparent 65%)",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        {hasBadge && (
          <div style={{
            display: "inline-block", fontFamily: FONT,
            fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em",
            textTransform: "uppercase", color: NEON,
            background: "rgba(212,255,0,0.12)",
            padding: "0.2rem 0.55rem", marginBottom: "0.9rem",
          }}>
            {badge}
          </div>
        )}
        <h3 style={{
          fontFamily: FONT, fontSize: "clamp(1.1rem, 1.6vw, 1.35rem)",
          fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2,
          color: titleClr, marginBottom: "0.65rem",
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.95rem",
          color: bodyClr, lineHeight: 1.65, margin: 0,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function AudienceListRow({ card, dark }) {
  const { title, body, badge } = card;
  const hasBadge = badge && badge.trim().length > 0;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
      gap: "clamp(1rem, 4vw, 3rem)", alignItems: "start",
      padding: "clamp(1.2rem, 2.5vw, 1.8rem) clamp(1rem, 2.5vw, 2rem)",
      background: dark ? "#111" : "#fff",
    }}>
      <h3 style={{
        fontFamily: FONT, fontWeight: 800,
        fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
        color: (dark || hasBadge) ? (hasBadge ? NEON : "#fff") : INK,
        margin: 0, letterSpacing: "-0.01em",
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: FONT, fontSize: "0.95rem",
        color: dark ? "rgba(255,255,255,0.65)" : INK_60,
        lineHeight: 1.65, margin: 0,
      }}>
        {body}
      </p>
    </div>
  );
}
