import React, { useState, useEffect, useRef } from "react";
import { NEON, FONT } from "../../data/tokens.js";
import aiCopyrightContent from "../../data/ai-copyright-content.json";

/* Animated horizontal bar chart of case damages data. AI Copyright only. */
const DAMAGES_DATA = aiCopyrightContent.damagesData || [];
const MAX_B = DAMAGES_DATA.length ? Math.max(...DAMAGES_DATA.map(c => c.amountB)) : 1;

export default function DamagesSection({ pageKey }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (pageKey !== "ai-copyright" || !DAMAGES_DATA.length) return null;

  return (
    <section id="cases-section" style={{
      background: "#0A0B0E", color: "#fff",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
        <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5) contrast(1.1)" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.85))" }} />

      <div className="container" style={{ position: "relative", zIndex: 5, maxWidth: 1080 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
          gap: "clamp(2rem,4vw,4rem)", alignItems: "end",
          marginBottom: "clamp(3rem,6vw,5rem)",
        }} className="section-split">
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: NEON, marginBottom: "1rem",
            }}>
              Active Docket
            </p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem,4.5vw,4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em",
              color: "#fff", margin: 0,
            }}>
              Quantified exposure<br />
              <span style={{ color: NEON, fontStyle: "italic" }}>across the docket.</span>
            </h2>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(0.95rem,1.3vw,1.1rem)",
            color: "rgba(255,255,255,0.6)", lineHeight: 1.65, margin: 0,
          }}>
            Cases with a confirmed settlement or an arithmetic statutory ceiling
            (registered-works count&nbsp;×&nbsp;17&nbsp;U.S.C.&nbsp;§504(c)(2) maximum of $150,000 per work).
            Excludes cases where damages remain formally unquantified.
          </p>
        </div>

        <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "clamp(1.4rem,3vw,2rem)" }}>
          {DAMAGES_DATA.map((c, i) => {
            const widthPct = (c.amountB / MAX_B) * 100;
            const isSettled = c.type === "settled";
            const barFill = isSettled ? NEON : c.type === "dmca" ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.52)";
            const amtColor = isSettled ? NEON : "#fff";
            const badgeBg = isSettled ? "rgba(212,255,0,0.12)" : "rgba(255,255,255,0.07)";
            const badgeBorder = isSettled ? "rgba(212,255,0,0.4)" : "rgba(255,255,255,0.18)";
            const badgeText = isSettled ? NEON : "rgba(255,255,255,0.6)";
            const delay = `${i * 0.32}s`;
            const amtDelay = `${i * 0.32 + 1.1}s`;
            return (
              <div key={c.name} className="chart-row" style={{ display: "flex", gap: "clamp(1rem,2vw,1.5rem)", alignItems: "stretch" }}>
                <div style={{ width: "clamp(150px,22%,220px)", flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.45rem" }}>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "clamp(0.78rem,1.1vw,0.92rem)", color: "#fff", lineHeight: 1.3 }}>
                    {c.name}
                  </span>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
                    letterSpacing: "0.09em", textTransform: "uppercase",
                    background: badgeBg, border: `1px solid ${badgeBorder}`,
                    color: badgeText, padding: "0.2rem 0.5rem",
                    borderRadius: 3, display: "inline-block", alignSelf: "flex-start",
                  }}>
                    {c.badge}
                  </span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ flex: 1, height: 54, background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: animated ? `${widthPct}%` : "0%",
                        background: barFill,
                        transition: `width 1.5s cubic-bezier(0.4,0,0.15,1) ${delay}`,
                      }} />
                    </div>
                    <span style={{
                      fontFamily: FONT, fontWeight: 900,
                      fontSize: "clamp(1.05rem,1.7vw,1.35rem)",
                      color: amtColor, letterSpacing: "-0.03em",
                      flexShrink: 0, minWidth: "4rem", textAlign: "right",
                      opacity: animated ? 1 : 0,
                      transition: `opacity 0.5s ease ${amtDelay}`,
                    }}>
                      {c.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    {c.basis && <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{c.basis}</span>}
                    {c.source && (
                      <a href={c.source} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: FONT, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textDecoration: "underline", flexShrink: 0 }}>
                        Source
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
