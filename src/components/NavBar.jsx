import React, { useState } from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

const NAV_ITEMS = [
  { key: "ai-copyright", label: "Copyright Claims" },
  { key: "crypto", label: "Locked Crypto" },
  { key: "tariff-refunds", label: "Tariff Refunds", externalHref: "https://www.rewindtariffs.com" },
  { key: "briefings", label: "Briefings" },
  { key: "about", label: "About" },
];

/* Polestar-inspired clean white header.
   White background, thin gray hairline below, black wordmark + nav,
   neon "Get in Touch" CTA as the single signature accent. */
export default function NavBar({ currentPage }) {
  const [open, setOpen] = useState(false);
  function close() { setOpen(false); }

  return (
    <nav style={{
      background: "#FFFFFF",
      borderBottom: "1px solid rgba(10,10,10,0.08)",
    }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        padding: "0.85rem clamp(1.25rem,3vw,2.5rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        {/* Logo — green wordmark filtered to black for the white header. */}
        <a
          href={hashHref("")}
          onClick={close}
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
          aria-label="Turnpage Digital Markets — Home"
        >
          <img
            src="/TPDM Logo Green_No BKGD.png"
            alt="Turnpage Digital Markets"
            style={{
              height: 26, width: "auto", display: "block",
              filter: "brightness(0)",
            }}
          />
        </a>

        {/* Desktop links */}
        <div className="nav-desktop" style={{ alignItems: "center", gap: "clamp(1rem,2vw,2rem)" }}>
          {NAV_ITEMS.map(item => {
            const active = !item.externalHref && currentPage === item.key;
            const isExternal = Boolean(item.externalHref);
            return (
              <a
                key={item.key}
                href={isExternal ? item.externalHref : hashHref(item.key)}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                style={{
                  fontFamily: FONT, fontSize: "0.92rem",
                  fontWeight: active ? 700 : 500,
                  color: INK, letterSpacing: "0.005em",
                  transition: "opacity 0.2s",
                  display: "inline-flex", alignItems: "center", gap: "0.4em",
                  opacity: active ? 1 : 0.85,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = active ? "1" : "0.85"; }}
              >
                {item.label}
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
            style={{
              fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
              color: INK, background: NEON,
              padding: "0.6rem 1.4rem",
              borderRadius: 50, letterSpacing: "0.04em",
              transition: "background 0.25s, transform 0.2s",
              display: "inline-block",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#E2FF4D"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = NEON; e.currentTarget.style.transform = ""; }}
          >
            Get in Touch
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
                  <span>{item.label}</span>
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
                borderRadius: 50, letterSpacing: "0.04em",
              }}
            >
              Get in Touch
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
