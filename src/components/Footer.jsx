import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import { useI18n } from "../lib/i18n.js";
import LanguageSelector from "./LanguageSelector.jsx";

/* Polestar-style simple footer.
   Light gray background, subscribe column on the left, multiple short link
   columns to the right, thin bottom-row with copyright and legal links. */
export default function Footer() {
  const { t } = useI18n();

  const COL_DESKS = [
    { key: "ai-copyright", label: t("nav.copyright") },
    { key: "crypto", label: t("nav.crypto") },
    { key: "tariff-refunds", label: t("nav.tariff"), externalHref: "https://www.rewindtariffs.com" },
    { key: "contact", label: "Bankruptcy & Litigation" },
  ];
  const COL_RESOURCES = [
    { key: "briefings", label: t("nav.briefings") },
    { key: "ai-copyright", label: "Top 12 Cases", hashSuffix: "#cases-section" },
  ];
  const COL_FIRM = [
    { key: "contact", label: t("footer.firm.contact") },
  ];
  const COL_LEGAL = [
    { key: "privacy", label: t("footer.legal.privacy") },
    { key: "terms", label: t("footer.legal.terms") },
  ];

  return (
    <footer style={{
      background: "#F4F5F7",
      color: INK,
      borderTop: `1px solid ${LINE}`,
    }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        padding: "clamp(3rem,5vw,4.5rem) clamp(1.5rem,5vw,4rem) 2rem",
      }}>
        {/* Top row: subscribe + link columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) repeat(4, minmax(0, 1fr))",
          gap: "clamp(2rem, 4vw, 3.5rem)",
          marginBottom: "clamp(3rem, 5vw, 4rem)",
        }} className="footer-grid">
          {/* Subscribe */}
          <div>
            <h3 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(1.4rem, 2.2vw, 1.75rem)",
              lineHeight: 1.2, letterSpacing: "-0.02em",
              color: INK, marginBottom: "1.4rem",
              maxWidth: 360,
            }}>
              {t("footer.subscribe_title")}
            </h3>
            <a
              href={hashHref("briefings")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.7em",
                fontFamily: FONT, fontSize: "0.92rem", fontWeight: 600,
                color: INK,
                padding: "0.85rem 1.4rem",
                border: `1px solid ${INK}`, borderRadius: 0,
                letterSpacing: "0.02em",
                transition: "background 0.2s, color 0.2s, gap 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = "#fff"; e.currentTarget.style.gap = "1em"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = INK; e.currentTarget.style.gap = "0.7em"; }}
            >
              <span>{t("footer.subscribe_cta")}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <FooterCol title={t("footer.col.desks")} items={COL_DESKS} />
          <FooterCol title={t("footer.col.resources")} items={COL_RESOURCES} />
          <FooterCol title={t("footer.col.firm")} items={COL_FIRM} />
          <FooterCol title={t("footer.col.legal")} items={COL_LEGAL} />
        </div>

        {/* Bottom row */}
        <div style={{
          paddingTop: "1.5rem", borderTop: `1px solid ${LINE}`,
          display: "flex", flexWrap: "wrap", gap: "1rem 2rem",
          justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 2rem", alignItems: "center" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: INK_60 }}>
              {t("footer.copyright")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
              <FooterBottomLink href={hashHref("privacy")}>{t("footer.legal.privacy")}</FooterBottomLink>
              <FooterBottomLink href={hashHref("terms")}>{t("footer.legal.terms")}</FooterBottomLink>
              <FooterBottomLink href="mailto:info@turnpagedigital.com">info@turnpagedigital.com</FooterBottomLink>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
          }
          .footer-grid > div:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 540px) {
          .footer-grid { grid-template-columns: 1fr !important; }
          .footer-grid > div:first-child { grid-column: auto; }
        }
      `}</style>
    </footer>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem",
        color: INK_60, marginBottom: "0.9rem",
        fontWeight: 500,
      }}>
        {title}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {items.map(item => {
          const isExternal = Boolean(item.externalHref);
          return (
            <li key={item.key + (item.hashSuffix || "")}>
              <a
                href={isExternal ? item.externalHref : hashHref(item.key) + (item.hashSuffix || "")}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                style={{
                  fontFamily: FONT, fontSize: "0.95rem",
                  color: INK, transition: "color 0.2s",
                  display: "inline-flex", alignItems: "center", gap: "0.35em",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = INK_60; }}
                onMouseLeave={e => { e.currentTarget.style.color = INK; }}
              >
                {item.label}
                {isExternal && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.55 }}>
                    <path d="M4 2h6v6M10 2l-7 7" strokeLinecap="round" />
                  </svg>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FooterBottomLink({ href, children }) {
  return (
    <a
      href={href}
      style={{
        fontFamily: FONT, fontSize: "0.82rem",
        color: INK_60, transition: "color 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.color = INK; }}
      onMouseLeave={e => { e.currentTarget.style.color = INK_60; }}
    >
      {children}
    </a>
  );
}
