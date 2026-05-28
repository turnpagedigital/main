import React, { useState, useEffect, useCallback } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";
import HomeContentTab    from "./HomeContentTab.jsx";
import MarketingPagesTab from "./MarketingPagesTab.jsx";
import ContactFormTab    from "./ContactFormTab.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   ContentPagesTab — master wrapper for page-specific content editors.
   Shows a horizontal sub-tab strip: Home | Crypto | AI Copyright |
   Litigation Finance | Contact Us.

   - "home" renders HomeContentTab (manages home-content.json)
   - "crypto" / "ai-copyright" / "litigation-finance" render
     MarketingPagesTab with controlledPage prop (manages the three
     marketing-page JSON files)
   - "contact" renders ContactFormTab (manages contact-form.json)

   Each child manages its own fetch/save/dirty lifecycle.
   URL pattern: /admin/pages          → defaults to "home"
                /admin/pages/crypto   → Crypto sub-tab

   Reports combined dirty state to Admin.jsx.
═══════════════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: "home",                label: "Home" },
  { key: "crypto",              label: "Crypto" },
  { key: "ai-copyright",       label: "AI Copyright" },
  { key: "litigation-finance",  label: "Litigation Finance" },
  { key: "contact",             label: "Contact Us" },
];

/* Map sub-tab keys to the MarketingPagesTab internal page keys.
   MarketingPagesTab uses camelCase internally (crypto, aiCopyright,
   litigationFinance) while our URL slugs use kebab-case. */
const MARKETING_PAGE_MAP = {
  "crypto":              "crypto",
  "ai-copyright":        "aiCopyright",
  "litigation-finance":  "litigationFinance",
};

function getSubTab() {
  if (typeof window === "undefined") return "home";
  const m = window.location.pathname.match(/^\/admin\/pages(?:\/([a-z][a-z0-9-]*))?/);
  if (!m || !m[1]) return "home";
  return SUB_TABS.some(t => t.key === m[1]) ? m[1] : "home";
}

export default function ContentPagesTab({ onDirtyChange }) {
  const [sub, setSub] = useState(getSubTab);
  const [dirtyFlags, setDirtyFlags] = useState({});

  useEffect(() => {
    function onPop() { setSub(getSubTab()); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function selectSub(key) {
    const next = `/admin/pages/${key}`;
    if (window.location.pathname !== next) {
      window.history.pushState(null, "", next);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setSub(key);
  }

  const makeDirty = useCallback((key) => (isDirty) => {
    setDirtyFlags(prev => prev[key] === isDirty ? prev : { ...prev, [key]: isDirty });
  }, []);

  const combinedDirty = Object.values(dirtyFlags).some(Boolean);
  useEffect(() => { onDirtyChange?.(combinedDirty); }, [combinedDirty, onDirtyChange]);

  const isMarketing = sub in MARKETING_PAGE_MAP;

  return (
    <div>
      {/* Sub-tab strip */}
      <div style={{
        maxWidth: 1080, margin: "0 auto",
        padding: "0.6rem clamp(1rem, 3vw, 2rem) 0",
      }}>
        <div style={{
          display: "flex", gap: 0, borderBottom: `1px solid ${LINE}`,
        }}>
          {SUB_TABS.map(({ key, label }) => {
            const active = sub === key;
            const isDirty = dirtyFlags[key] || (isMarketing && key !== sub && dirtyFlags.marketing);
            return (
              <button
                key={key}
                onClick={() => selectSub(key)}
                style={{
                  fontFamily: FONT, fontSize: "0.85rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? INK : INK_60,
                  background: "transparent", border: "none",
                  borderBottom: active ? `2px solid ${INK}` : "2px solid transparent",
                  padding: "0.6rem 1.1rem 0.6rem 0",
                  marginRight: "1.2rem",
                  cursor: "pointer",
                  marginBottom: "-1px",
                  transition: "color 0.15s",
                  display: "inline-flex", alignItems: "center", gap: "0.4em",
                }}
              >
                {label}
                {isDirty && (
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: NEON, display: "inline-block", flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render the active child */}
      {sub === "home" && (
        <HomeContentTab onDirtyChange={makeDirty("home")} />
      )}
      {isMarketing && (
        <MarketingPagesTab
          key={sub}
          controlledPage={MARKETING_PAGE_MAP[sub]}
          onDirtyChange={makeDirty("marketing")}
        />
      )}
      {sub === "contact" && (
        <ContactFormTab onDirtyChange={makeDirty("contact")} />
      )}
    </div>
  );
}
