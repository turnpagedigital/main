import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { INK_60 } from "../../data/tokens.js";
import { SubTabStrip, useSubTabs } from "./shared.jsx";

// Lazy-load sub-tabs
const IntelligenceDefaultsTab = lazy(() => import("./IntelligenceDefaultsTab.jsx"));
const XSourcesTab = lazy(() => import("./XSourcesTab.jsx"));

/* IntelligenceHubTab — master wrapper for the Intelligence config layer.

   Cases and Themes moved OUT of admin (Aug 2026) — they're managed on the
   intel site itself: Dashboard → Cases → ⚙ Manage (/intel/manage.html),
   which talks to the same /api/admin/cases and /api/admin/themes endpoints.

   URL: /admin/intelligence            → defaults to "defaults"
        /admin/intelligence/x          → X Accounts sub-tab
        /admin/intelligence/defaults   → Defaults sub-tab */

const SUB_TABS = [
  { key: "x", label: "X Accounts" },
  { key: "defaults", label: "Defaults" },
];
const SUB_KEYS = SUB_TABS.map(t => t.key);

export default function IntelligenceHubTab({ onDirtyChange }) {
  const [dirtyFlags, setDirtyFlags] = useState({});
  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  const [sub, selectSub] = useSubTabs(
    "/admin/intelligence", SUB_KEYS, "defaults",
    () => !isAnyDirty || window.confirm("You have unsaved changes. Discard them and switch?"),
  );

  const makeDirty = useCallback((key) => (isDirty) => {
    setDirtyFlags(prev => prev[key] === isDirty ? prev : { ...prev, [key]: isDirty });
  }, []);

  useEffect(() => { onDirtyChange?.(isAnyDirty); }, [isAnyDirty, onDirtyChange]);

  return (
    <div>
      <p style={{ fontSize: "0.8rem", color: INK_60, margin: "0.6rem auto 0", maxWidth: 1080, padding: "0 clamp(1rem,3vw,2rem)" }}>
        Cases and Themes are managed on the intel site: Dashboard → Cases → ⚙ Manage.
      </p>
      <SubTabStrip tabs={SUB_TABS} active={sub} dirtyFlags={dirtyFlags} onSelect={selectSub} />

      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>Loading…</div>}>
        {sub === "x"        && <XSourcesTab             onDirtyChange={makeDirty("x")} />}
        {sub === "defaults" && <IntelligenceDefaultsTab onDirtyChange={makeDirty("defaults")} />}
      </Suspense>
    </div>
  );
}
