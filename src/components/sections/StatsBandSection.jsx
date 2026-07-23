import React from "react";
import { NEON, FONT, PAPER, INK, INK_60, INK_40, LINE, SURFACE, SECONDARY_BG } from "../../data/tokens.js";
import { useI18n } from "../../lib/i18n.js";

/* Stats Band — large numbers in a horizontal strip.
   Uses composition content if provided; falls back to translation keys.
   Content options (all optional — defaults reproduce the classic dark band):
     stats[]     — { value, label, labelKey } (any count; grid adapts)
     footnote    — small italic line under the band ("" hides it)
     colorScheme — "dark" (default) | "neon" | "white" | "light-gray" | "paper"
     layout      — "band" (flush, divider lines) | "cards" (boxed with gaps)
                   | "minimal" (open, no dividers)
     align       — "left" (default) | "center"
     valueColor  — "auto" (white on dark / ink on light) | "neon"
*/

const SCHEMES = {
  dark:         { bg: "#0A0B0E",    ink: "#fff", body: "rgba(255,255,255,0.78)", faint: "rgba(255,255,255,0.5)", line: "rgba(255,255,255,0.08)", card: "rgba(255,255,255,0.04)" },
  neon:         { bg: NEON,         ink: INK,    body: "rgba(10,10,10,0.78)",    faint: INK_40,                  line: "rgba(10,10,10,0.15)",    card: "rgba(255,255,255,0.45)" },
  white:        { bg: SURFACE,      ink: INK,    body: INK_60,                   faint: INK_40,                  line: LINE,                     card: SECONDARY_BG },
  "light-gray": { bg: SECONDARY_BG, ink: INK,    body: INK_60,                   faint: INK_40,                  line: LINE,                     card: SURFACE },
  paper:        { bg: PAPER,        ink: INK,    body: INK_60,                   faint: INK_40,                  line: LINE,                     card: SURFACE },
};

export default function StatsBandSection({ sectionConfig }) {
  const { t, lang } = useI18n();
  const c = (sectionConfig && sectionConfig.content) || {};
  const en = lang === "en";
  const stats = c.stats || [
    { value: "$1B+", labelKey: "stats.claims_traded" },
    { value: "5K+",  labelKey: "stats.claims_advised" },
    { value: "500+", labelKey: "stats.institutions" },
  ];
  const footnoteKey = c.footnoteKey || "stats.footnote";

  const s = SCHEMES[c.colorScheme] || SCHEMES.dark;
  const layout = c.layout || "band";
  const center = c.align === "center";
  const valueColor = c.valueColor === "neon" ? NEON : s.ink;
  const isBand = layout === "band";
  const isCards = layout === "cards";

  const cols = Math.max(stats.length, 1);
  const footnoteText = en ? (c.footnote ?? t(footnoteKey)) : t(footnoteKey);

  return (
    <section style={{
      background: s.bg, color: s.ink,
      ...(isBand ? {
        borderTop: `1px solid ${s.line}`,
        borderBottom: `1px solid ${s.line}`,
      } : {}),
    }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        padding: isBand ? 0 : "clamp(2rem,4vw,3rem) clamp(1.5rem,3vw,2.5rem)",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`,
          ...(isBand
            ? { borderLeft: `1px solid ${s.line}` }
            : { gap: isCards ? "clamp(1rem,2vw,1.5rem)" : "clamp(1.5rem,3vw,2.5rem)" }),
        }} className="stats-band-grid">
          {stats.map((it, i) => (
            <div key={i} className="stat-band-item" style={{
              padding: isBand
                ? "clamp(2rem,4vw,3.5rem) clamp(1.5rem,3vw,2.5rem)"
                : isCards ? "clamp(1.6rem,3vw,2.4rem) clamp(1.2rem,2.5vw,1.8rem)" : 0,
              ...(isBand ? { borderRight: `1px solid ${s.line}` } : {}),
              ...(isCards ? { background: s.card, border: `1px solid ${s.line}` } : {}),
              textAlign: center ? "center" : "left",
            }}>
              <div style={{
                fontFamily: FONT, fontWeight: 900,
                fontSize: "clamp(2.4rem, 5vw, 4rem)",
                lineHeight: 0.95, letterSpacing: "-0.04em",
                color: valueColor, marginBottom: "0.6rem",
              }}>
                {it.value}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.92rem",
                color: s.body,
                letterSpacing: "0.01em",
              }}>
                {en ? (it.label || t(it.labelKey)) : t(it.labelKey)}
              </div>
            </div>
          ))}
        </div>
        {footnoteText && (
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", color: s.faint,
            padding: isBand ? "0.9rem clamp(1.5rem,3vw,2.5rem)" : "0.9rem 0 0",
            fontStyle: "italic",
            textAlign: center ? "center" : "left",
          }}>
            {footnoteText}
          </p>
        )}
        <style>{`
          @media (max-width: 720px) {
            .stats-band-grid {
              grid-template-columns: 1fr !important;
              border-left: none !important;
            }
            .stat-band-item {
              border-right: none !important;
              ${isBand ? `border-bottom: 1px solid ${s.line} !important;` : ""}
            }
            .stat-band-item:last-child {
              border-bottom: none !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
