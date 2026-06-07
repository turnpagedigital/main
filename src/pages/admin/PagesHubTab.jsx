import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";

// Lazy-load sub-tabs
const PageBuilderTab  = lazy(() => import("./PageBuilderTab.jsx"));
const SectionTypesTab = lazy(() => import("./SectionTypesTab.jsx"));

/* PagesHubTab — page builder + section types.
   Content editing for shared sections (situations, audience cards, service cards, etc.)
   is accessed via "Edit content" on each section in the Builder.
   Contact Form settings live under Content → Contact Form. */

const SUB_TABS = [
  { key: "builder",  label: "Builder" },
  { key: "sections", label: "Section Types" },
];

export default function PagesHubTab({ onDirtyChange }) {
  // Sub-tab is local state only — no URL syncing, to avoid conflicting
  // with Admin.jsx's own /admin/<tab> router which would misinterpret
  // /admin/page-builder/sections as an unknown top-level tab.
  const [sub, setSub] = useState("builder");
  const [dirtyFlags, setDirtyFlags] = useState({});

  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  function selectSub(key) {
    // Guard: confirm before switching with unsaved changes
    if (isAnyDirty && !window.confirm("You have unsaved changes. Discard them and switch?")) {
      return;
    }
    setSub(key);
  }

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

      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>Loading…</div>}>
        {sub === "builder"  && <PageBuilderTab  onDirtyChange={makeDirty("builder")} />}
        {sub === "sections" && <SectionTypesTab />}
      </Suspense>
    </div>
  );
}
