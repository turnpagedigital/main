import React from "react";
import { FONT } from "../../../data/tokens.js";
import { getSectionTheme } from "../../../lib/palette-resolver.js";
import FAQ from "../../FAQ.jsx";

/* FAQ Layout 2 — Split Sidebar (Subpage style)
   Two-column: left side has title and optional CTA button, right side has accordion.
   Colors come from section-palettes.json (faq.* schemes).
   Props: { faqs, title, accent, ctaLabel, ctaHref, hasMoreFaqs, pageKey, colorScheme } */

export default function FAQLayout2SplitSidebar({
  faqs,
  title = "Your questions,",
  accent = "answered.",
  ctaLabel = null,
  ctaHref = "/contact",
  hasMoreFaqs = false,
  pageKey = "home",
  colorScheme = "light",
}) {
  const theme = getSectionTheme("faq", colorScheme, "light");

  return (
    <section style={{ background: theme.background, padding: "clamp(5rem,10vw,9rem) clamp(1.5rem,5vw,4rem)" }}>
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
            {hasMoreFaqs && (
              <a href={`/faq?topic=${pageKey}`} style={{
                display: "inline-block", marginTop: "2rem",
                fontFamily: FONT, fontSize: "0.88rem", color: theme.textSecondary,
                textDecoration: "none", transition: "color 0.2s",
              }}
              onMouseEnter={e => e.target.style.color = theme.text}
              onMouseLeave={e => e.target.style.color = theme.textSecondary}>
                More Questions? See all FAQs →
              </a>
            )}
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
