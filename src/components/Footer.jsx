import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

const COL_DESKS = [
  { key: "ai-copyright", label: "Copyright Claims" },
  { key: "crypto", label: "Locked Crypto" },
  { key: "tariff-refunds", label: "Tariff Refunds", externalHref: "https://www.rewindtariffs.com" },
  { key: "contact", label: "Bankruptcy & Litigation" },
];
const COL_RESOURCES = [
  { key: "briefings", label: "Briefings" },
  { key: "ai-copyright", label: "Top 12 Cases", hashSuffix: "#cases-section" },
];
const COL_FIRM = [
  { key: "about", label: "About" },
  { key: "contact", label: "Get in Touch" },
];
const COL_LEGAL = [
  { key: "privacy", label: "Privacy Policy" },
  { key: "terms", label: "Terms of Use" },
];

/* Polestar-style simple footer.
   Light gray background, subscribe column on the left, multiple short link
   columns to the right, thin bottom-row with copyright and legal links. */
export default function Footer() {
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
              Stay current on the latest Turnpage briefings.
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
              <span>Subscribe</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <FooterCol title="Desks" items={COL_DESKS} />
          <FooterCol title="Resources" items={COL_RESOURCES} />
          <FooterCol title="Firm" items={COL_FIRM} />
          <FooterCol title="Legal" items={COL_LEGAL} />
        </div>

        {/* Bottom row */}
        <div style={{
          paddingTop: "1.5rem", borderTop: `1px solid ${LINE}`,
          display: "flex", flexWrap: "wrap", gap: "1rem 2rem",
          justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 2rem", alignItems: "center" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: INK_60 }}>
              Turnpage Digital Markets © 2026 · All rights reserved
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
              <FooterBottomLink href={hashHref("privacy")}>Privacy</FooterBottomLink>
              <FooterBottomLink href={hashHref("terms")}>Terms</FooterBottomLink>
              <FooterBottomLink href="mailto:info@turnpagedigital.com">info@turnpagedigital.com</FooterBottomLink>
            </div>
          </div>
          <RegionSelector />
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

/* Polestar-style globe + "Global" region selector.
   Currently a single-region indicator — clicking opens a small menu, but the
   only entry is "Global (English)" since TPDM doesn't yet have regional sites.
   Easy to extend with more regions later. */
function RegionSelector() {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          background: "transparent", border: 0, padding: 0, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: "0.5em",
          fontFamily: FONT, fontSize: "0.82rem",
          color: INK, transition: "opacity 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span>Global</span>
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", bottom: "calc(100% + 0.6rem)", right: 0,
            background: "#FFFFFF",
            border: `1px solid ${LINE}`,
            boxShadow: "0 8px 24px rgba(10,10,10,0.08)",
            minWidth: 200,
            zIndex: 20,
          }}
        >
          <button
            role="option"
            aria-selected={true}
            onClick={() => setOpen(false)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "0.85rem 1rem",
              background: "transparent", border: 0, cursor: "pointer",
              fontFamily: FONT, fontSize: "0.92rem", fontWeight: 600,
              color: INK,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F4F5F7"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            Global · English
          </button>
        </div>
      )}
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
