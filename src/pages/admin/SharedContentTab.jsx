import React, { useState, useEffect, useCallback } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";
import { inputStyle } from "./shared.jsx";
import BioTab    from "./BioTab.jsx";
import PostsTab  from "./PostsTab.jsx";
import DealsTab  from "./DealsTab.jsx";
import PressTab  from "./PressTab.jsx";
import AlertsTab from "./AlertsTab.jsx";
import FAQsTab   from "./FAQsTab.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   SharedContentTab — master wrapper for Bio, Posts, Deals, Press, Alerts,
   FAQs. Provides a dropdown sub-nav; each child keeps its own fetch/save.

   URL pattern: /admin/content         → defaults to "bio"
                /admin/content/posts   → Posts sub-tab
                /admin/content/faqs    → FAQs sub-tab

   Reports combined dirty state (any child dirty → parent dirty).
═══════════════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: "bio",    label: "Bio" },
  { key: "posts",  label: "Posts" },
  { key: "deals",  label: "Deals" },
  { key: "press",  label: "Press" },
  { key: "alerts", label: "Alerts" },
  { key: "faqs",   label: "FAQs" },
];

function getSubTab() {
  if (typeof window === "undefined") return "bio";
  const m = window.location.pathname.match(/^\/admin\/content(?:\/([a-z][a-z0-9-]*))?/);
  if (!m || !m[1]) return "bio";
  return SUB_TABS.some(t => t.key === m[1]) ? m[1] : "bio";
}

export default function SharedContentTab({ onDirtyChange }) {
  const [sub, setSub] = useState(getSubTab);
  const [dirtyFlags, setDirtyFlags] = useState({});

  // Sync with popstate (back/forward)
  useEffect(() => {
    function onPop() { setSub(getSubTab()); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function selectSub(key) {
    const next = `/admin/content/${key}`;
    if (window.location.pathname !== next) {
      window.history.pushState(null, "", next);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setSub(key);
  }

  // Dirty callback factory — each child reports its own dirty state
  const makeDirty = useCallback((key) => (isDirty) => {
    setDirtyFlags(prev => prev[key] === isDirty ? prev : { ...prev, [key]: isDirty });
  }, []);

  // Report combined dirty to parent
  const combinedDirty = Object.values(dirtyFlags).some(Boolean);
  useEffect(() => { onDirtyChange?.(combinedDirty); }, [combinedDirty, onDirtyChange]);

  return (
    <div>
      {/* Sub-nav bar */}
      <div style={{
        maxWidth: 1080, margin: "0 auto",
        padding: "1rem clamp(1rem, 3vw, 2rem) 0",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          marginBottom: "0",
        }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60, letterSpacing: "0.04em" }}>
            Section:
          </span>
          <select
            value={sub}
            onChange={e => selectSub(e.target.value)}
            style={{
              ...inputStyle,
              marginTop: 0,
              width: "auto",
              minWidth: 160,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.88rem",
            }}
          >
            {SUB_TABS.map(({ key, label }) => {
              const isDirty = dirtyFlags[key];
              return (
                <option key={key} value={key}>
                  {label}{isDirty ? " •" : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Render the active child */}
      {sub === "bio"    && <BioTab    onDirtyChange={makeDirty("bio")} />}
      {sub === "posts"  && <PostsTab  onDirtyChange={makeDirty("posts")} />}
      {sub === "deals"  && <DealsTab  onDirtyChange={makeDirty("deals")} />}
      {sub === "press"  && <PressTab  onDirtyChange={makeDirty("press")} />}
      {sub === "alerts" && <AlertsTab onDirtyChange={makeDirty("alerts")} />}
      {sub === "faqs"   && <FAQsTab   onDirtyChange={makeDirty("faqs")} />}
    </div>
  );
}
