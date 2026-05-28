import React, { useState, useEffect, useCallback } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";
import StructureMetaTab from "./StructureMetaTab.jsx";
import StructureNavTab  from "./StructureNavTab.jsx";
import StructureFooterTab from "./StructureFooterTab.jsx";
import RoutesTab        from "./RoutesTab.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   StructureTab — master wrapper for site-level settings.

   Shows a horizontal sub-tab strip: Metadata | Navigation | Footer | Routes

   - "metadata"   → Favicons, Site Metadata, Per-page Meta
   - "navigation"  → Nav items, Microsite navs
   - "footer"      → Footer columns, Footer bottom bar
   - "routes"      → Route URL editor with cascade detection

   Each child manages its own fetch/save/dirty lifecycle.
   URL pattern: /admin/structure            → defaults to "metadata"
                /admin/structure/navigation → Navigation sub-tab
                /admin/structure/routes     → Routes sub-tab

   Reports combined dirty state to Admin.jsx.
═══════════════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: "metadata",   label: "Metadata" },
  { key: "navigation", label: "Navigation" },
  { key: "footer",     label: "Footer" },
  { key: "routes",     label: "Routes" },
];

function getSubTab() {
  if (typeof window === "undefined") return "metadata";
  const m = window.location.pathname.match(/^\/admin\/structure(?:\/([a-z][a-z0-9-]*))?/);
  if (!m || !m[1]) return "metadata";
  return SUB_TABS.some(t => t.key === m[1]) ? m[1] : "metadata";
}

export default function StructureTab({ onDirtyChange }) {
  const [sub, setSub] = useState(getSubTab);
  const [dirtyFlags, setDirtyFlags] = useState({});

  useEffect(() => {
    function onPop() { setSub(getSubTab()); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function selectSub(key) {
    const next = `/admin/structure/${key}`;
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
      <div style={{
        maxWidth: 1080, margin: "0 auto",
        padding: "0.6rem clamp(1rem, 3vw, 2rem) 0",
      }}>
        <div style={{
          display: "flex", gap: 0, borderBottom: `1px solid ${LINE}`,
        }}>
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
      {sub === "metadata"   && <StructureMetaTab   onDirtyChange={makeDirty("metadata")} />}
      {sub === "navigation" && <StructureNavTab     onDirtyChange={makeDirty("navigation")} />}
      {sub === "footer"     && <StructureFooterTab  onDirtyChange={makeDirty("footer")} />}
      {sub === "routes"     && <RoutesTab           onDirtyChange={makeDirty("routes")} />}
    </div>
  );
}
