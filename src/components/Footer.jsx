import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import { useI18n } from "../lib/i18n.js";
import LanguageSelector from "./LanguageSelector.jsx";
import SocialLinks from "./SocialLinks.jsx";
import footerData from "../data/footer.json";
import pageMeta from "../data/page-meta.json";
import contactData from "../data/contact-form.json";

// Build a Set of paths that are explicitly marked inactive (draft).
// Only pages listed in page-meta.json with active: false are suppressed;
// everything else (including pages not listed there) shows normally.
const DRAFT_PATHS = new Set(
  (pageMeta.pages || []).filter(p => p.active === false).map(p => p.path)
);

/* Polestar-style simple footer.
   Light gray background, subscribe column on the left, multiple short link
   columns to the right, thin bottom-row with copyright and legal links.

   Column/link data is loaded from src/data/footer.json.
   labelKey / titleKey fields are used for i18n lookup; plain label/title
   is the English fallback shown in the admin. */
export default function Footer() {
  const { t, td } = useI18n();

  // Resolve a label: admin-editable plain text wins so edits in the Footer
  // admin tab take effect on the site. Fall back to the i18n key only when
  // the plain text is empty (legacy entries that were never edited).
  function tx(key, fallback) {
    if (fallback && fallback.trim()) return fallback;
    return key ? t(key) : "";
  }

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
        {/* Top row: logo + link columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `minmax(0, 1.6fr) repeat(${footerData.columns.filter(c => !c.hidden).length}, minmax(0, 1fr))`,
          gap: "clamp(2rem, 4vw, 3.5rem)",
          marginBottom: "clamp(3rem, 5vw, 4rem)",
        }} className="footer-grid">
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <a href={hashHref("")} style={{ display: "inline-block", lineHeight: 0 }}>
              <img
                src="/TPDM%20Logo%20Std.png"
                alt="TURNPAGE"
                loading="lazy"
                style={{ maxWidth: 200, width: "100%", height: "auto", display: "block" }}
              />
            </a>
          </div>

          {footerData.columns.filter(col => !col.hidden).map(col => (
            <FooterCol
              key={col.id}
              title={tx(col.titleKey, col.title)}
              items={col.links
                .filter(link => !link.hidden && (link.external || !DRAFT_PATHS.has(link.href)))
                .map(link => ({
                  key:      link.id,
                  label:    tx(link.labelKey, link.label),
                  href:     link.href,
                  external: link.external ?? false,
                }))}
            />
          ))}
        </div>

        {/* Bottom row */}
        <div style={{
          paddingTop: "1.5rem", borderTop: `1px solid ${LINE}`,
          display: "flex", flexWrap: "wrap", gap: "1rem 2rem",
          justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 2rem", alignItems: "center" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: INK_60 }}>
              {td("footer", tx(footerData.copyrightKey, footerData.copyright))}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
            {Array.isArray(contactData.social_links) && contactData.social_links.some(l => l.url) && (
              <SocialLinks links={contactData.social_links} dark={false} size={18} gap="0.25rem" />
            )}
            <LanguageSelector />
          </div>
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

/* ── FooterCol ──────────────────────────────────────────────────────────────── */

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
        {items.map(item => (
          <li key={item.key}>
            <a
              href={item.external ? item.href : hashHref(item.href.replace(/^\//, "")) + (item.hashSuffix || "")}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              style={{
                fontFamily: FONT, fontSize: "0.95rem",
                color: INK, transition: "color 0.2s",
                display: "inline-flex", alignItems: "center", gap: "0.35em",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = INK_60; }}
              onMouseLeave={e => { e.currentTarget.style.color = INK; }}
            >
              {item.label}
              {item.external && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.55 }}>
                  <path d="M4 2h6v6M10 2l-7 7" strokeLinecap="round" />
                </svg>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── FooterBottomLink ────────────────────────────────────────────────────────── */

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
