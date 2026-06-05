import React, { useState, useEffect, useCallback } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";
import PageBuilderTab from "./PageBuilderTab.jsx";
import SectionTypesTab from "./SectionTypesTab.jsx";
import HomeContentTab from "./HomeContentTab.jsx";
import MarketingPagesTab from "./MarketingPagesTab.jsx";
import ContactFormTab from "./ContactFormTab.jsx";

/* PagesHubTab — master wrapper for page management and content.
   Sub-tab strip → Builder / Section Types / Home Content / Marketing Pages / Contact Form

   URL: /admin/pages                      → defaults to "builder"
        /admin/pages/sections             → Section Types
        /admin/pages/home                 → Home Content (situations, testimonials)
        /admin/pages/marketing            → Marketing Pages (audience cards, services, comparisons)
        /admin/pages/contact-form         → Contact Form settings */

const SUB_TABS = [
  { key: "builder",       label: "Builder" },
  { key: "sections",      label: "Section Types" },
  { key: "home",          label: "Home Content" },
  { key: "marketing",     label: "Marketing Pages" },
  { key: "contact-form",  label: "Contact Form" },
];

export default function PagesHubTab({ onDirtyChange }) {
  // Sub-tab is local state only — no URL syncing, to avoid conflicting
  // with Admin.jsx's own /admin/<tab> router which would misinterpret
  // /admin/page-builder/sections as an unknown top-level tab.
  const [sub, setSub] = useState("builder");
  const [dirtyFlags, setDirtyFlags] = useState({});

  function selectSub(key) { setSub(key); }

  const makeDirty = useCallback((key) => (isDirty) => {
    setDirtyFlags(prev => prev[key] === isDirty ? prev : { ...prev, [key]: isDirty });
  }, []);

  const combinedDirty = Object.values(dirtyFlags).some(Boolean);
  useEffect(() => { onDirtyChange?.(combinedDirty); }, [combinedDirty, onDirtyChange]);

  return (
    <div>
      {/* Sub-tab strip */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0.6rem clamp(1rem, 3vw, 2rem) 0" }}>
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${LINE}` }}>
          {SUB_TABS.map(({ key, label }) => {
            const active = sub === key;
            const isDirty = dirtyFlags[key];
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
                  marginRight: "1.2rem", marginBottom: "-1px",
                  cursor: "pointer", transition: "color 0.15s",
                  display: "inline-flex", alignItems: "center", gap: "0.4em",
                }}
              >
                {label}
                {isDirty && <span style={{ width: 6, height: 6, borderRadius: "50%", background: NEON, display: "inline-block", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {sub === "builder"       && <PageBuilderTab      onDirtyChange={makeDirty("builder")} />}
      {sub === "sections"      && <SectionTypesTab />}
      {sub === "home"          && <HomeContentTab      onDirtyChange={makeDirty("home")} />}
      {sub === "marketing"     && <MarketingPagesTab   onDirtyChange={makeDirty("marketing")} />}
      {sub === "contact-form"  && <ContactFormTab      onDirtyChange={makeDirty("contact-form")} />}
    </div>
  );
}
