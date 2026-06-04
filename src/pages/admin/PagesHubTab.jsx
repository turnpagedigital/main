import React, { useState, useEffect, useCallback } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";
import PageBuilderTab from "./PageBuilderTab.jsx";
import SectionTypesTab from "./SectionTypesTab.jsx";

/* PagesHubTab — master wrapper for page management.
   Sub-tab strip → Builder / Section Types

   URL: /admin/pages           → defaults to "builder"
        /admin/pages/sections  → Section Types sub-tab */

const SUB_TABS = [
  { key: "builder",  label: "Builder" },
  { key: "sections", label: "Section Types" },
];

function getSubTab() {
  if (typeof window === "undefined") return "builder";
  const m = window.location.pathname.match(/^\/admin\/pages(?:\/([a-z][a-z0-9-]*))?/);
  if (!m || !m[1]) return "builder";
  return SUB_TABS.some(t => t.key === m[1]) ? m[1] : "builder";
}

export default function PagesHubTab({ onDirtyChange }) {
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

      {sub === "builder"  && <PageBuilderTab  onDirtyChange={makeDirty("builder")} />}
      {sub === "sections" && <SectionTypesTab />}
    </div>
  );
}
