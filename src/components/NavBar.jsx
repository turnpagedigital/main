import React, { useState, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import { useI18n } from "../lib/i18n.js";

/* Nav items reference translation keys; labels are resolved at render time. */
const NAV_ITEMS = [
  { key: "ai-copyright",  labelKey: "nav.copyright" },
  { key: "crypto",        labelKey: "nav.crypto" },
  { key: "tariff-refunds",labelKey: "nav.tariff", externalHref: "https://www.rewindtariffs.com" },
  { key: "press",         labelKey: "nav.press" },
];

/* Preview content shown when hovering over a nav item.
   Keyed by nav item `key`. Items without an entry here render no dropdown. */
const PREVIEWS = {
  "ai-copyright": {
    title: "Copyright Claims",
    body: "Capital and advisory for rights holders with claims against generative AI companies — Bartz, the OpenAI MDL, Concord, Getty.",
    links: [
      { label: "Top 12 active cases", href: hashHref("ai-copyright") + "#cases-section" },
      { label: "Who we help",         href: hashHref("ai-copyright") },
      { label: "Briefings",           href: hashHref("briefings") },
      { label: "FAQ",                 href: hashHref("ai-copyright") },
    ],
    cta: { label: "Talk to a Partner", href: hashHref("contact") + "?source=ai-copyright" },
  },
  "crypto": {
    title: "Locked Crypto",
    body: "Liquidity for locked digital assets — FTX, Celsius, BlockFi, Voyager, Genesis, Mt. Gox. Quoted in fiat, closed in days.",
    links: [
      { label: "Who we help",      href: hashHref("crypto") },
      { label: "How it works",     href: hashHref("crypto") + "#how-crypto" },
      { label: "FAQ",              href: hashHref("crypto") },
    ],
    cta: { label: "Get a Quote", href: hashHref("contact") + "?source=crypto" },
  },
  "tariff-refunds": {
    title: "Tariff Refunds",
    body: "Liquidity for tariff refund rights and customs recoveries — a separate Turnpage property at rewindtariffs.com.",
    links: [
      { label: "Active CIT cases", href: "https://www.rewindtariffs.com/#cases", external: true },
      { label: "For brokers",      href: "https://www.rewindtariffs.com/#brokers", external: true },
    ],
    cta: { label: "Visit Rewind Tariffs", href: "https://www.rewindtariffs.com", external: true },
  },
  "press": {
    title: "Press & Publications",
    body: "Andrew Glantz in the Wall Street Journal, Bloomberg, New York Times, CoinDesk, NPR, BBC, Grant's, and the ABI Journal — plus articles and commentary authored by Andrew.",
    links: [
      { label: "Media coverage",    href: hashHref("press") },
      { label: "By Andrew",         href: hashHref("press") },
      { label: "Briefings",         href: hashHref("briefings") },
    ],
    cta: { label: "View all", href: hashHref("press") },
  },
};

/* Polestar-style clean white header with hover dropdowns showing preview
   info for each desk/section.  Wraps the announcement banner outside. */
export default function NavBar({ currentPage }) {
  const [open, setOpen] = useState(false);
  const [activeDrop, setActiveDrop] = useState(null);
  const closeTimer = useRef(null);
  const { t } = useI18n();

  function close() { setOpen(false); }

  function openDrop(key) {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (PREVIEWS[key]) setActiveDrop(key);
    else setActiveDrop(null);
  }
  function cancelClose() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveDrop(null), 140);
  }

  const dropContent = activeDrop ? PREVIEWS[activeDrop] : null;

  return (
    <nav style={{
      background: "#FFFFFF",
      position: "relative",
    }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        padding: "0.85rem clamp(1.25rem,3vw,2.5rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        {/* Logo */}
        <a
          href={hashHref("")}
          onClick={close}
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
          aria-label="Turnpage Digital Markets — Home"
        >
          <img
            src="/TPDM Logo Green_No BKGD.png"
            alt="Turnpage Digital Markets"
            style={{ height: 26, width: "auto", display: "block", filter: "brightness(0)" }}
          />
        </a>

        {/* Desktop links */}
        <div className="nav-desktop" style={{ alignItems: "center", gap: "clamp(1rem,2vw,2rem)" }}>
          {NAV_ITEMS.map(item => {
            const active = !item.externalHref && currentPage === item.key;
            const isExternal = Boolean(item.externalHref);
            const hasPreview = Boolean(PREVIEWS[item.key]);
            return (
              <a
                key={item.key}
                href={isExternal ? item.externalHref : hashHref(item.key)}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onMouseEnter={() => hasPreview ? openDrop(item.key) : setActiveDrop(null)}
                onMouseLeave={hasPreview ? scheduleClose : undefined}
                onFocus={() => hasPreview ? openDrop(item.key) : setActiveDrop(null)}
                onBlur={hasPreview ? scheduleClose : undefined}
                style={{
                  fontFamily: FONT, fontSize: "0.92rem",
                  fontWeight: active ? 700 : 500,
                  color: INK, letterSpacing: "0.005em",
                  transition: "opacity 0.2s",
                  display: "inline-flex", alignItems: "center", gap: "0.4em",
                  opacity: active ? 1 : (activeDrop === item.key ? 1 : 0.85),
                  paddingBottom: 2,
                  borderBottom: activeDrop === item.key ? `2px solid ${INK}` : "2px solid transparent",
                }}
              >
                {t(item.labelKey)}
                {isExternal && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.55 }}>
                    <path d="M4 2h6v6M10 2l-7 7" strokeLinecap="round" />
                  </svg>
                )}
              </a>
            );
          })}
          <a
            href={hashHref("contact")}
            onMouseEnter={() => setActiveDrop(null)}
            style={{
              fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
              color: INK, background: NEON,
              padding: "0.65rem 1.3rem",
              borderRadius: 0, letterSpacing: "0.02em",
              transition: "background 0.2s",
              display: "inline-block",
            }}
            onMouseLeave={e => { e.currentTarget.style.background = NEON; }}
          >
            {t("nav.contact")}
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="nav-mobile-toggle"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          style={{
            display: "none", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, padding: 0,
            background: "transparent", border: `1px solid rgba(10,10,10,0.12)`,
            borderRadius: 8, color: INK, cursor: "pointer",
          }}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          )}
        </button>
      </div>

      {/* Desktop dropdown panel — shows preview for hovered nav item */}
      {dropContent && (
        <div
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="nav-dropdown"
          style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: "#FFFFFF",
            borderBottom: `1px solid ${LINE}`,
            boxShadow: "0 14px 28px rgba(10,10,10,0.06)",
            animation: "navDropFade 0.18s ease-out",
            zIndex: 50,
          }}
        >
          <div style={{
            maxWidth: 1440, margin: "0 auto",
            padding: "clamp(1.8rem,3vw,2.8rem) clamp(1.25rem,3vw,2.5rem)",
            display: "grid",
            gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) auto",
            gap: "clamp(2rem, 5vw, 5rem)",
            alignItems: "start",
          }}>
            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: INK_60, marginBottom: "0.8rem",
              }}>
                Overview
              </p>
              <h3 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(1.4rem, 2vw, 1.75rem)",
                lineHeight: 1.15, letterSpacing: "-0.02em",
                color: INK, marginBottom: "0.9rem",
              }}>
                {dropContent.title}
              </h3>
              <p style={{
                fontFamily: FONT, fontSize: "0.98rem",
                color: INK_60, lineHeight: 1.55,
                maxWidth: 460,
              }}>
                {dropContent.body}
              </p>
            </div>

            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: INK_60, marginBottom: "0.8rem",
              }}>
                Quick links
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {dropContent.links.map((l, i) => (
                  <li key={i}>
                    <a
                      href={l.href}
                      target={l.external ? "_blank" : undefined}
                      rel={l.external ? "noopener noreferrer" : undefined}
                      onClick={() => setActiveDrop(null)}
                      style={{
                        fontFamily: FONT, fontSize: "0.98rem", fontWeight: 600,
                        color: INK, transition: "color 0.2s, gap 0.2s",
                        display: "inline-flex", alignItems: "center", gap: "0.4em",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = INK_60; }}
                      onMouseLeave={e => { e.currentTarget.style.color = INK; }}
                    >
                      <span>{l.label}</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ alignSelf: "center" }}>
              <a
                href={dropContent.cta.href}
                target={dropContent.cta.external ? "_blank" : undefined}
                rel={dropContent.cta.external ? "noopener noreferrer" : undefined}
                onClick={() => setActiveDrop(null)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.7em",
                  fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700,
                  color: "#fff", background: INK,
                  padding: "0.9rem 1.4rem",
                  letterSpacing: "0.02em",
                  transition: "background 0.2s, gap 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#222"; e.currentTarget.style.gap = "1em"; }}
                onMouseLeave={e => { e.currentTarget.style.background = INK; e.currentTarget.style.gap = "0.7em"; }}
              >
                <span>{dropContent.cta.label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {open && (
        <div className="nav-mobile-menu" style={{
          background: "#FFFFFF", borderTop: `1px solid rgba(10,10,10,0.08)`,
          animation: "slideDown 0.2s ease",
        }}>
          <div style={{ display: "flex", flexDirection: "column", padding: "0.5rem 1.25rem 1.25rem" }}>
            {NAV_ITEMS.map(item => {
              const active = !item.externalHref && currentPage === item.key;
              const isExternal = Boolean(item.externalHref);
              return (
                <a
                  key={item.key}
                  href={isExternal ? item.externalHref : hashHref(item.key)}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  onClick={close}
                  style={{
                    fontFamily: FONT, fontSize: "1.05rem",
                    fontWeight: active ? 700 : 500,
                    color: INK,
                    padding: "0.9rem 0", borderBottom: `1px solid rgba(10,10,10,0.06)`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <span>{t(item.labelKey)}</span>
                  {isExternal && (
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.55 }}>
                      <path d="M4 2h6v6M10 2l-7 7" strokeLinecap="round" />
                    </svg>
                  )}
                </a>
              );
            })}
            <a
              href={hashHref("contact")}
              onClick={close}
              style={{
                marginTop: "1.2rem", textAlign: "center",
                fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700,
                color: INK, background: NEON,
                padding: "0.95rem 1.5rem",
                borderRadius: 0, letterSpacing: "0.02em",
              }}
            >
              Get in Touch
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes navDropFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 880px) {
          .nav-dropdown { display: none; }
        }
      `}</style>
    </nav>
  );
}
