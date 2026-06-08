import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import LiquidGlassCard from "../LiquidGlassCard.jsx";
import Card from "../Card.jsx";

/* ServiceCardsSection — "What We Offer"
   Inline section: content lives in page-compositions.json sectionConfig.content.
   Schema:
     eyebrow, title, accent     — section header text
     cards[]                    — { id, title, body }
     layout                     — "grid-3col" (default) | "grid-2col" | "list"
     colorScheme                — "dark" (default) | "light-gray" | "white"
     cardStyle                  — "standard" (default) | "liquid-glass" | "white" | "black" | "light-gray" | "dark" | "light-glass" | "clear-glass"
     cardRadius                 — "rounded" (default) | "square"
     backgroundImage            — optional image URL for section background
*/
export default function ServiceCardsSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const cards            = c.cards  || [];
  const eyebrow          = c.eyebrow || "What We Offer";
  const title            = c.title   || "";
  const accent           = c.accent  || "";
  const layout           = c.layout  || "grid-3col";
  const colorScheme      = c.colorScheme || "dark";
  const cardStyle        = c.cardStyle || "standard";
  const cardRadius       = c.cardRadius || "rounded";
  const backgroundImage  = c.backgroundImage || "";

  const isDark  = colorScheme === "dark";
  const sectionBg = { dark: "#0A0A0A", "light-gray": "#F4F5F7", white: "#fff" }[colorScheme] || "#0A0A0A";
  const eyebrowColor = isDark ? NEON : INK_60;
  const titleColor   = isDark ? "#fff" : INK;
  const isList = layout === "list";
  const cols   = layout === "grid-2col" ? "repeat(2, 1fr)" : "repeat(3, 1fr)";

  return (
    <section style={{
      background: backgroundImage
        ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${backgroundImage}') center/cover no-repeat`
        : sectionBg,
      padding: "clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 4rem)",
      position: "relative",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
          gap: "clamp(2rem,5vw,5rem)",
          marginBottom: "clamp(3rem, 6vw, 5rem)",
          alignItems: "end",
        }} className="service-header-split">
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: eyebrowColor, marginBottom: "1.1rem",
            }}>{eyebrow}</p>
            {title && (
              <h2 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(2rem, 4.5vw, 4rem)",
                lineHeight: 1.02, letterSpacing: "-0.035em",
                color: titleColor, margin: 0,
              }}>
                {title}
                {accent && <> <span className={isDark ? "accent-neon" : "accent-light"}>{accent}</span></>}
              </h2>
            )}
          </div>
        </div>

        {/* Cards */}
        {isList ? (
          <div style={{
            display: "flex", flexDirection: "column",
            gap: "1px",
            background: isDark ? "rgba(255,255,255,0.08)" : LINE,
          }}>
            {cards.map(card => <ServiceListRow key={card.id} card={card} dark={isDark} />)}
          </div>
        ) : cardStyle === "liquid-glass" ? (
          <div style={{
            display: "grid", gridTemplateColumns: cols,
            gap: "clamp(1.5rem, 2.5vw, 2rem)",
          }} className="service-grid">
            {cards.map(card => (
              <LiquidGlassCard
                key={card.id}
                title={card.title}
                description={card.body}
                variant={isDark ? "dark" : "light"}
              />
            ))}
          </div>
        ) : ["white", "black", "light-gray", "dark", "light-glass", "clear-glass"].includes(cardStyle) ? (
          <div style={{
            display: "grid", gridTemplateColumns: cols,
            gap: "clamp(1rem, 2vw, 1.5rem)",
          }} className="service-grid">
            {cards.map(card => (
              <Card key={card.id} style={cardStyle} radius={cardRadius}>
                <h3 style={{
                  fontFamily: FONT, fontWeight: 800,
                  fontSize: "clamp(1.3rem, 2vw, 1.7rem)",
                  letterSpacing: "-0.015em", lineHeight: 1.1,
                  color: "var(--card-text-color)", marginBottom: "0.85rem",
                  margin: 0,
                }}>
                  {card.title}
                </h3>
                <p style={{
                  fontFamily: FONT, fontSize: "0.97rem",
                  color: "var(--card-secondary-text)", lineHeight: 1.65, margin: 0,
                }}>
                  {card.body}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: cols,
            gap: "clamp(1rem, 2vw, 1.5rem)",
          }} className="service-grid">
            {cards.map(card => <ServiceCard key={card.id} card={card} dark={isDark} />)}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .service-grid { grid-template-columns: 1fr 1fr !important; }
          .service-header-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) { .service-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function ServiceCard({ card, dark }) {
  const { title, body } = card;
  const cardBg    = dark ? "rgba(255,255,255,0.03)" : "#fff";
  const cardBorder = dark ? "rgba(255,255,255,0.1)" : LINE;
  const bodyColor = dark ? "rgba(255,255,255,0.72)" : INK_60;

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      padding: "clamp(1.5rem, 2.5vw, 2.2rem)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(1.3rem, 2vw, 1.7rem)",
          letterSpacing: "-0.015em", lineHeight: 1.1,
          color: dark ? NEON : INK,
          marginBottom: "0.85rem",
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.97rem",
          color: bodyColor, lineHeight: 1.65, margin: 0,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function ServiceListRow({ card, dark }) {
  const { title, body } = card;
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
        color: dark ? NEON : INK,
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
