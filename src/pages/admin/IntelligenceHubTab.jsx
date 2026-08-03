import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { INK_60 } from "../../data/tokens.js";
import { SubTabStrip, useSubTabs } from "./shared.jsx";

// Lazy-load sub-tabs
const ThemesTab = lazy(() => import("./ThemesTab.jsx"));
const CasesTab = lazy(() => import("./CasesTab.jsx"));
const IntelligenceDefaultsTab = lazy(() => import("./IntelligenceDefaultsTab.jsx"));
const XSourcesTab = lazy(() => import("./XSourcesTab.jsx"));

/* IntelligenceHubTab — master wrapper for the Intelligence config layer.
   Horizontal sub-tab strip → Themes / Cases / Defaults. Each child keeps its
   own fetch/save. Reports combined dirty state (any child dirty → parent dirty).

   URL: /admin/intelligence            → defaults to "themes"
        /admin/intelligence/cases      → Cases sub-tab
        /admin/intelligence/defaults   → Defaults sub-tab */

const SUB_TABS = [
  { key: "themes", label: "Themes" },
  { key: "cases", label: "Cases" },
  { key: "x", label: "X Accounts" },
  { key: "defaults", label: "Defaults" },
];
const SUB_KEYS = SUB_TABS.map(t => t.key);

export default function IntelligenceHubTab({ onDirtyChange }) {
  const [dirtyFlags, setDirtyFlags] = useState({});
  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  const [sub, selectSub] = useSubTabs(
    "/admin/intelligence", SUB_KEYS, "themes",
    () => !isAnyDirty || window.confirm("You have unsaved changes. Discard them and switch?"),
  );

  const makeDirty = useCallback((key) => (isDirty) => {
    setDirtyFlags(prev => prev[key] === isDirty ? prev : { ...prev, [key]: isDirty });
  }, []);

  useEffect(() => { onDirtyChange?.(isAnyDirty); }, [isAnyDirty, onDirtyChange]);

  return (
    <div>
      <SubTabStrip tabs={SUB_TABS} active={sub} dirtyFlags={dirtyFlags} onSelect={selectSub} />

      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>Loading…</div>}>
        {sub === "themes"   && <ThemesTab               onDirtyChange={makeDirty("themes")} />}
        {sub === "cases"    && <CasesTab                onDirtyChange={makeDirty("cases")} />}
        {sub === "x"        && <XSourcesTab             onDirtyChange={makeDirty("x")} />}
        {sub === "defaults" && <IntelligenceDefaultsTab onDirtyChange={makeDirty("defaults")} />}
      </Suspense>
    </div>
  );
}
