import React from "react";
import { FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import FAQ from "../FAQ.jsx";
import faqsData from "../../data/faqs.json";

/* FAQ section — filters shared FAQs by pageKey; heading from sectionConfig.content. */
export default function FAQSection({ sectionConfig, pageKey }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const title    = c.title    || "Your questions,";
  const accent   = c.accent   || "answered.";
  const ctaLabel = c.ctaLabel || null;
  const ctaHref  = c.ctaHref  || "/contact";

  const faqs = (faqsData.faqs || []).filter(
    f => f.active !== false && Array.isArray(f.pages) && f.pages.includes(pageKey)
  );

  const isHome = pageKey === "home";

  if (isHome) {
    return (
      <section style={{
        background: "#F4F5F7",
        padding: "clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 4rem)",
        borderTop: `1px solid ${LINE}`,
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: INK_60, marginBottom: "1.5rem",
          }}>
            FAQ
          </p>
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)",
            lineHeight: 1.02, letterSpacing: "-0.035em",
            color: INK, marginBottom: "clamp(2.5rem, 5vw, 4rem)", maxWidth: 880,
          }}>
            {title} <span className="accent-light">{accent}</span>
          </h2>
          <div style={{ maxWidth: 880 }}>
            <FAQ items={faqs} openFirst={false} />
          </div>
        </div>
      </section>
    );
  }

  // Subpage FAQ layout (split)
  return (
    <section className="surface-paper section-pad">
      <div className="container" style={{ maxWidth: 960 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
          gap: "clamp(2rem, 6vw, 5rem)", alignItems: "start",
        }} className="faq-layout">
          <div>
            <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>FAQ</p>
            <h2 className="h-section" style={{ marginBottom: "1rem" }}>
              {title}{" "}
              <span className="accent-light">{accent}</span>
            </h2>
            {ctaLabel && <a href={ctaHref} className="btn-ghost-ink">{ctaLabel}</a>}
          </div>
          <div>
            <FAQ items={faqs} />
          </div>
        </div>
        <style>{`
          @media (max-width: 880px) {
            .faq-layout { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          }
        `}</style>
      </div>
    </section>
  );
}
