import React, { useState, useRef, useEffect } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref, navigate } from "../lib/router.js";
import { useI18n } from "../lib/i18n.js";
import navData from "../data/nav.json";
import pageCompositions from "../data/page-compositions.json";

/* ─── Main site nav ──────────────────────────────────────────────────────── */

// Build a quick path → status lookup so draft/archived pages auto-hide from nav.
const PAGE_STATUS_BY_PATH = {};
for (const p of (pageCompositions.pages || [])) {
  if (p.path && p.status) PAGE_STATUS_BY_PATH[p.path] = p.status;
}

// Build NAV_ITEMS from nav.json — only active items, in JSON order.
// Also filters out items pointing to draft or archived pages.
// Each JSON item has: id, label, href, labelKey, active, external (optional).
// `label` (admin-editable plain text) wins; `labelKey` is a translation fallback.
const NAV_ITEMS = navData.items
  .filter(i => {
    if (!i.active) return false;
    if (!i.external && i.href) {
      const st = PAGE_STATUS_BY_PATH[i.href];
      if (st === "draft" || st === "archive") return false;
    }
    return true;
  })
  .map(i => ({
    key:          i.id,
    label:        i.label,
    labelKey:     i.labelKey,
    externalHref: i.external ? i.href : undefined,
    _href:        i.href,
  }));

/* Resolve a nav item's display label: prefer the admin-editable plain `label`,
 * fall back to the i18n translation by labelKey. This way edits made in the
 * admin Navigation tab actually show up on the site. */
function navLabel(t, item) {
  if (item.label && item.label.trim()) return item.label;
  if (item.labelKey) return t(item.labelKey);
  return "";
}

// Build PREVIEWS from nav.json items that have a dropdown.
const PREVIEWS = Object.fromEntries(
  navData.items
    .filter(i => i.dropdown)
    .map(i => [i.id, i.dropdown])
);

/* ─── Microsite navs (one per sub-brand page) ───────────────────────────── */

// MICROSITE_NAVS comes from the microsites object in nav.json.
const MICROSITE_NAVS = navData.microsites || {};

/* ─── NavBar ────────────────────────────────────────────────────────────── */

export default function NavBar({ currentPage, open, onOpenChange }) {
  const [activeDrop, setActiveDrop] = useState(null);
  const closeTimer = useRef(null);
  const { t } = useI18n();

  // Persist microsite context in sessionStorage so we keep the microsite nav
  // when navigating away from a microsite (to Team, Publications, etc.)
  // Only clear when explicitly clicking the logo.
  const activeMicrosite = MICROSITE_NAVS[currentPage] ? currentPage : sessionStorage.getItem('activeMicrosite');
  if (MICROSITE_NAVS[currentPage]) {
    sessionStorage.setItem('activeMicrosite', currentPage);
  }

  function close() { onOpenChange(false); }

  // Escape closes the mobile menu and any open desktop dropdown.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      onOpenChange(false);
      setActiveDrop(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const microsite = activeMicrosite ? MICROSITE_NAVS[activeMicrosite] : null;
  const dropContent = activeDrop ? PREVIEWS[activeDrop] : null;

  return (
    <nav style={{ background: "#FFFFFF", position: "relative" }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        padding: "0.85rem clamp(1.25rem,3vw,2.5rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        {/* Logo — always links home and resets microsite nav */}
        <a
          href={hashHref("")}
          onClick={(e) => {
            e.preventDefault();
            close();
            // Clear microsite context when returning to main site via logo
            sessionStorage.removeItem('activeMicrosite');
            // Explicitly navigate to home to ensure route changes
            navigate("/");
          }}
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
          aria-label="Turnpage Digital Markets — Home"
        >
          <img
            src="/TPDM Logo Green_No BKGD.png"
            alt="Turnpage Digital Markets"
            style={{ height: 26, width: "auto", display: "block", filter: "brightness(0)" }}
          />
        </a>

        {/* ── Desktop links ─────────────────────────────────────────── */}
        {microsite ? (
          /* Microsite nav — flat links, no dropdowns */
          <div className="nav-desktop" style={{ alignItems: "center", gap: "clamp(1rem,2vw,2rem)" }}>
            {/* Brand name — active/current */}
            <a
              href={microsite.brand.href}
              style={{
                fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700,
                color: INK, letterSpacing: "0.005em",
                borderBottom: `2px solid ${INK}`, paddingBottom: 2,
              }}
            >
              {microsite.brand.label}
            </a>

            {/* Divider */}
            <span style={{ width: 1, height: 16, background: LINE, flexShrink: 0 }} />

            {/* Section links */}
            {microsite.items.map(item => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  fontFamily: FONT, fontSize: "0.92rem", fontWeight: 500,
                  color: INK, letterSpacing: "0.005em",
                  opacity: 0.75, transition: "opacity 0.15s",
                  paddingBottom: 2, borderBottom: "2px solid transparent",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderBottomColor = "rgba(10,10,10,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.75"; e.currentTarget.style.borderBottomColor = "transparent"; }}
              >
                {item.label}
              </a>
            ))}

            {/* CTA */}
            <a
              href={microsite.cta.href}
              style={{
                fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
                color: INK, background: NEON,
                padding: "0.65rem 1.3rem",
                letterSpacing: "0.02em",
                display: "inline-block",
              }}
            >
              {microsite.cta.label}
            </a>
          </div>
        ) : (
          /* Main site nav — with dropdowns */
          <div className="nav-desktop" style={{ alignItems: "center", gap: "clamp(1rem,2vw,2rem)" }}>
            {NAV_ITEMS.map(item => {
              const active = !item.externalHref && currentPage === item.key;
              const isExternal = Boolean(item.externalHref);
              const hasPreview = Boolean(PREVIEWS[item.key]);
              return (
                <a
                  key={item.key}
                  href={isExternal ? item.externalHref : item._href}
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
                  {navLabel(t, item)}
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
        )}

        {/* Mobile toggle */}
        <button
          className="nav-mobile-toggle"
          onClick={() => onOpenChange(o => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="nav-mobile-menu"
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

      {/* Desktop dropdown — only on the main nav, not microsite nav */}
      {!microsite && dropContent && (
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
            gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.5fr) auto",
            gap: "clamp(2rem, 5vw, 5rem)",
            alignItems: "start",
          }}>
            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: INK_60, marginBottom: "0.8rem",
              }}>{t("nav.dropdown.overview")}</p>
              <h3 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(1.4rem, 2vw, 1.75rem)",
                lineHeight: 1.15, letterSpacing: "-0.02em",
                color: INK, marginBottom: "0.9rem",
              }}>{dropContent.title}</h3>
              <p style={{
                fontFamily: FONT, fontSize: "0.98rem",
                color: INK_60, lineHeight: 1.55, maxWidth: 460,
              }}>{dropContent.body}</p>
            </div>

            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: INK_60, marginBottom: "0.8rem",
              }}>{t("nav.dropdown.quicklinks")}</p>
              <ul style={{
                listStyle: "none", padding: 0, margin: 0,
                display: "grid",
                gridTemplateRows: "repeat(4, auto)",
                gridAutoFlow: "column",
                gridAutoColumns: "minmax(0, 1fr)",
                rowGap: "0.55rem",
                columnGap: "2.5rem",
              }}>
                {dropContent.links.slice(0, 8).map((l, i) => (
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
        <div className="nav-mobile-menu" id="nav-mobile-menu" style={{
          background: "#FFFFFF", borderTop: `1px solid rgba(10,10,10,0.08)`,
          animation: "slideDown 0.2s ease",
        }}>
          <div style={{ display: "flex", flexDirection: "column", padding: "0.5rem 1.25rem 1.25rem" }}>
            {microsite ? (
              /* Microsite mobile links */
              <>
                <a
                  href={microsite.brand.href}
                  onClick={close}
                  style={{
                    fontFamily: FONT, fontSize: "1.05rem", fontWeight: 700,
                    color: INK, padding: "0.9rem 0",
                    borderBottom: `1px solid rgba(10,10,10,0.06)`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  {microsite.brand.label}
                </a>
                {microsite.items.map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={close}
                    style={{
                      fontFamily: FONT, fontSize: "1.05rem", fontWeight: 500,
                      color: INK, padding: "0.9rem 0",
                      borderBottom: `1px solid rgba(10,10,10,0.06)`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    {item.label}
                  </a>
                ))}
                {/* Back to main site */}
                <a
                  href={hashHref("")}
                  onClick={close}
                  style={{
                    fontFamily: FONT, fontSize: "0.88rem", fontWeight: 500,
                    color: INK_60, padding: "0.75rem 0",
                    borderBottom: `1px solid rgba(10,10,10,0.06)`,
                    display: "flex", alignItems: "center", gap: "0.4em",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Turnpage Digital Markets
                </a>
              </>
            ) : (
              /* Main mobile links */
              NAV_ITEMS.map(item => {
                const active = !item.externalHref && currentPage === item.key;
                const isExternal = Boolean(item.externalHref);
                return (
                  <a
                    key={item.key}
                    href={isExternal ? item.externalHref : item._href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={close}
                    style={{
                      fontFamily: FONT, fontSize: "1.05rem",
                      fontWeight: active ? 700 : 500,
                      color: INK, padding: "0.9rem 0",
                      borderBottom: `1px solid rgba(10,10,10,0.06)`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    <span>{navLabel(t, item)}</span>
                    {isExternal && (
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.55 }}>
                        <path d="M4 2h6v6M10 2l-7 7" strokeLinecap="round" />
                      </svg>
                    )}
                  </a>
                );
              })
            )}
            <a
              href={microsite ? microsite.cta.href : hashHref("contact")}
              onClick={close}
              style={{
                marginTop: "1.2rem", textAlign: "center",
                fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700,
                color: INK, background: NEON,
                padding: "0.95rem 1.5rem",
                borderRadius: 0, letterSpacing: "0.02em",
              }}
            >
              {microsite ? microsite.cta.label : t("nav.contact")}
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes navDropFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .nav-dropdown { display: none; }
        }
      `}</style>
    </nav>
  );
}
