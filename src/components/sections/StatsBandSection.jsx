import React from "react";
import { FONT } from "../../data/tokens.js";
import { useI18n } from "../../lib/i18n.js";

/* Three large numbers in a dark horizontal band.
   Uses composition content if provided; falls back to translation keys. */
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

  return (
    <section style={{
      background: "#0A0B0E", color: "#fff",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }} className="stats-band-grid">
          {stats.map((it, i) => (
            <div key={i} className="stat-band-item" style={{
              padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,3vw,2.5rem)",
              borderRight: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{
                fontFamily: FONT, fontWeight: 900,
                fontSize: "clamp(2.4rem, 5vw, 4rem)",
                lineHeight: 0.95, letterSpacing: "-0.04em",
                color: "#fff", marginBottom: "0.6rem",
              }}>
                {it.value}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.92rem",
                color: "rgba(255,255,255,0.78)",
                letterSpacing: "0.01em",
              }}>
                {en ? (it.label || t(it.labelKey)) : t(it.labelKey)}
              </div>
            </div>
          ))}
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.5)",
          padding: "0.9rem clamp(1.5rem,3vw,2.5rem)",
          fontStyle: "italic",
        }}>
          {en ? (c.footnote || t(footnoteKey)) : t(footnoteKey)}
        </p>
        <style>{`
          @media (max-width: 720px) {
            .stats-band-grid {
              grid-template-columns: 1fr !important;
              border-left: none !important;
            }
            .stat-band-item {
              border-right: none !important;
              border-bottom: 1px solid rgba(255,255,255,0.08) !important;
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
