import React from "react";
import { FONT } from "../../../data/tokens.js";
import { getSectionTheme } from "../../../lib/palette-resolver.js";
import FAQ from "../../FAQ.jsx";

/* FAQ Layout 1 — Full Width (Home page style)
   Single column, large headline, full-width accordion below.
   Colors come from section-palettes.json (faq.* schemes).
   Props: { faqs, title, accent, colorScheme, hasMoreFaqs, pageKey } */

export default function FAQLayout1FullWidth({ faqs, title = "Your questions,", accent = "answered.", colorScheme = "light", hasMoreFaqs = false, pageKey = "" }) {
  const theme = getSectionTheme("faq", colorScheme, "light");

  return (
    <section style={{
      background: theme.background,
      padding: "clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${theme.border}`,
    }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: theme.textSecondary, marginBottom: "1.5rem",
        }}>
          FAQ
        </p>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)",
          lineHeight: 1.02, letterSpacing: "-0.035em",
          color: theme.text, marginBottom: "clamp(2.5rem, 5vw, 4rem)", maxWidth: 880,
        }}>
          {title} <span className="accent-light">{accent}</span>
        </h2>
        <div style={{ maxWidth: 880 }}>
          <FAQ items={faqs} openFirst={false} />
          {hasMoreFaqs && (
            <a href={pageKey ? `/faq?topic=${pageKey}` : "/faq"} style={{
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
    </section>
  );
}
