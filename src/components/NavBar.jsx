import React, { useState, useEffect } from "react";
import { NEON, FONT, INK, DARK_BORDER } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

const NAV_ITEMS = [
  { key: "ai-copyright", label: "AI Copyright" },
  { key: "crypto", label: "Crypto" },
  { key: "tariff-refunds", label: "Tariff Refunds", externalHref: "https://www.rewindtariffs.com" },
  { key: "briefings", label: "Briefings" },
  { key: "about", label: "About" },
];

/* Semi-transparent black header with frosted blur — sits below the neon
   announcement bar. White text on dark glass, with a white "Get in Touch"
   pill carrying a 2px hard black drop shadow (no blur). */
export default function NavBar({ currentPage }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function close() { setOpen(false); }

  return (
    <nav style={{
      background: scrolled ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.55)",
      backdropFilter: "blur(18px) saturate(160%)",
      WebkitBackdropFilter: "blur(18px) saturate(160%)",
      borderBottom: `1px solid rgba(255,255,255,${scrolled ? 0.12 : 0.06})`,
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0.7rem clamp(1rem,3vw,2rem)",
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
            src="/New TPDM Logo.png"
            alt="Turnpage Digital Markets"
            style={{ height: 32, width: "auto", display: "block" }}
          />
        </a>

        {/* Desktop links */}
        <div className="nav-desktop" style={{ alignItems: "center", gap: "clamp(0.8rem,2vw,1.6rem)" }}>
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
                  fontFamily: FONT, fontSize: "0.88rem", fontWeight: active ? 700 : 500,
                  color: active ? NEON : "rgba(255,255,255,0.82)",
                  letterSpacing: "0.02em",
                  borderBottom: active ? `2px solid ${NEON}` : "2px solid transparent",
                  paddingBottom: 2, transition: "color 0.2s",
                  display: "inline-flex", alignItems: "center", gap: "0.35em",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.82)"; }}
              >
                {item.label}
                {isExternal && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.7 }}>
                    <path d="M4 2h6v6M10 2l-7 7" strokeLinecap="round" />
                  </svg>
                )}
              </a>
            );
          })}
          <a
            href={hashHref("contact")}
            style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800,
              color: INK, background: "#fff",
              padding: "0.6rem 1.4rem",
              borderRadius: 50,
              letterSpacing: "0.1em", textTransform: "uppercase",
              border: `1.5px solid ${INK}`,
              boxShadow: "2px 2px 0 0 #000",
              transition: "transform 0.15s, box-shadow 0.15s",
              display: "inline-block",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 0 #000"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "2px 2px 0 0 #000"; }}
            onMouseDown={e => { e.currentTarget.style.transform = "translate(1px,1px)"; e.currentTarget.style.boxShadow = "0px 0px 0 0 #000"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 0 #000"; }}
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
            background: "transparent", border: `1px solid ${DARK_BORDER}`,
            borderRadius: 8, color: "#fff", cursor: "pointer",
          }}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M6 18L18 6"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="nav-mobile-menu" style={{
          background: "#000", borderTop: `1px solid ${DARK_BORDER}`,
          animation: "slideDown 0.2s ease",
        }}>
          <div style={{ display: "flex", flexDirection: "column", padding: "0.5rem 1rem 1rem" }}>
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
                    fontFamily: FONT, fontSize: "1rem", fontWeight: active ? 700 : 500,
                    color: active ? NEON : "rgba(255,255,255,0.85)",
                    padding: "0.9rem 0.5rem", borderBottom: `1px solid ${DARK_BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <span>{item.label}</span>
                  {isExternal && (
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.6 }}>
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
                marginTop: "1rem", textAlign: "center",
                fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800,
                color: INK, background: "#fff",
                padding: "0.85rem 1.5rem",
                borderRadius: 50, letterSpacing: "0.1em", textTransform: "uppercase",
                border: `1.5px solid ${INK}`,
                boxShadow: "2px 2px 0 0 #000",
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
