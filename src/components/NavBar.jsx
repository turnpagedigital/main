import React, { useState, useEffect } from "react";
import { NEON, FONT, DARK, DARK_BORDER } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

const NAV_ITEMS = [
  { key: "ai-copyright", label: "AI Copyright" },
  { key: "crypto", label: "Crypto" },
  { key: "briefings", label: "Briefings" },
  { key: "about", label: "About" },
];

/* Sticky nav. Lives inside the AppHeader wrapper in App.jsx, which sits
   above all page content. The wrapper handles the page-top reservation. */
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
      background: scrolled ? "rgba(0,0,0,0.92)" : "rgba(0,0,0,0.7)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      borderBottom: scrolled ? `1px solid ${DARK_BORDER}` : "1px solid rgba(255,255,255,0.05)",
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
            const active = currentPage === item.key;
            return (
              <a
                key={item.key}
                href={hashHref(item.key)}
                style={{
                  fontFamily: FONT, fontSize: "0.88rem", fontWeight: active ? 700 : 500,
                  color: active ? NEON : "rgba(255,255,255,0.82)",
                  letterSpacing: "0.02em",
                  borderBottom: active ? `2px solid ${NEON}` : "2px solid transparent",
                  paddingBottom: 2, transition: "color 0.2s",
                }}
                onMouseEnter={e => { if (!active) e.target.style.color = "#fff"; }}
                onMouseLeave={e => { if (!active) e.target.style.color = "rgba(255,255,255,0.82)"; }}
              >
                {item.label}
              </a>
            );
          })}
          <a
            href={hashHref("contact")}
            style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              color: "#000", background: NEON, padding: "0.6rem 1.4rem",
              borderRadius: 50, letterSpacing: "0.1em", textTransform: "uppercase",
              transition: "background 0.25s, transform 0.25s, box-shadow 0.25s",
            }}
            onMouseEnter={e => { e.target.style.background = "#E2FF4D"; e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 4px 18px rgba(212,255,0,0.28)"; }}
            onMouseLeave={e => { e.target.style.background = NEON; e.target.style.transform = ""; e.target.style.boxShadow = ""; }}
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
          background: DARK, borderTop: `1px solid ${DARK_BORDER}`,
          animation: "slideDown 0.2s ease",
        }}>
          <div style={{ display: "flex", flexDirection: "column", padding: "0.5rem 1rem 1rem" }}>
            {NAV_ITEMS.map(item => {
              const active = currentPage === item.key;
              return (
                <a
                  key={item.key}
                  href={hashHref(item.key)}
                  onClick={close}
                  style={{
                    fontFamily: FONT, fontSize: "1rem", fontWeight: active ? 700 : 500,
                    color: active ? NEON : "rgba(255,255,255,0.85)",
                    padding: "0.9rem 0.5rem", borderBottom: `1px solid ${DARK_BORDER}`,
                  }}
                >
                  {item.label}
                </a>
              );
            })}
            <a
              href={hashHref("contact")}
              onClick={close}
              style={{
                marginTop: "1rem", textAlign: "center",
                fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700,
                color: "#000", background: NEON, padding: "0.85rem 1.5rem",
                borderRadius: 50, letterSpacing: "0.1em", textTransform: "uppercase",
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
