import React, { useState, useEffect, useCallback } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";
import ThemesTab from "./ThemesTab.jsx";
import CasesTab from "./CasesTab.jsx";
import IntelligenceDefaultsTab from "./IntelligenceDefaultsTab.jsx";

/* IntelligenceHubTab — master wrapper for the Intelligence config layer.
   Horizontal sub-tab strip → Themes / Cases / Defaults. Each child keeps its
   own fetch/save. Reports combined dirty state (any child dirty → parent dirty).

   URL: /admin/intelligence            → defaults to "themes"
        /admin/intelligence/cases      → Cases sub-tab
        /admin/intelligence/defaults   → Defaults sub-tab */

const SUB_TABS = [
  { key: "themes", label: "Themes" },
  { key: "cases", label: "Cases" },
  { key: "defaults", label: "Defaults" },
];

function getSubTab() {
  if (typeof window === "undefined") return "themes";
  const m = window.location.pathname.match(/^\/admin\/intelligence(?:\/([a-z][a-z0-9-]*))?/);
  if (!m || !m[1]) return "themes";
  return SUB_TABS.some(t => t.key === m[1]) ? m[1] : "themes";
}

export default function IntelligenceHubTab({ onDirtyChange }) {
  const [sub, setSub] = useState(getSubTab);
  const [dirtyFlags, setDirtyFlags] = useState({});

  useEffect(() => {
    function onPop() { setSub(getSubTab()); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function selectSub(key) {
    const next = `/admin/intelligence/${key}`;
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
                {isDirty && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: NEON, display: "inline-block", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active child */}
      {sub === "themes"   && <ThemesTab               onDirtyChange={makeDirty("themes")} />}
      {sub === "cases"    && <CasesTab                onDirtyChange={makeDirty("cases")} />}
      {sub === "defaults" && <IntelligenceDefaultsTab onDirtyChange={makeDirty("defaults")} />}
    </div>
  );
}
