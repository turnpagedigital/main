import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { INK_60 } from "../../data/tokens.js";
import { SubTabStrip, useSubTabs } from "./shared.jsx";

const FlowsTab   = lazy(() => import("./FlowsTab.jsx"));
const PricingTab = lazy(() => import("./PricingTab.jsx"));

/* ═══════════════════════════════════════════════════════════════════════════
   RegistrationHubTab — master wrapper for everything behind the registration
   funnel: Flows (the multi-step wizard builder) and Pricing (the private
   Bartz offer inputs).

   URL pattern: /admin/registration          → defaults to "flows"
                /admin/registration/flows    → Flows sub-tab
                /admin/registration/pricing  → Pricing sub-tab

   Reports combined dirty state (any child dirty → parent dirty).
═══════════════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: "flows",   label: "Flows" },
  { key: "pricing", label: "Pricing" },
];
const SUB_KEYS = SUB_TABS.map(t => t.key);

export default function RegistrationHubTab({ onDirtyChange }) {
  const [dirtyFlags, setDirtyFlags] = useState({});
  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  const [sub, selectSub] = useSubTabs(
    "/admin/registration", SUB_KEYS, "flows",
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
        {sub === "flows"   && <FlowsTab   onDirtyChange={makeDirty("flows")} />}
        {sub === "pricing" && <PricingTab onDirtyChange={makeDirty("pricing")} />}
      </Suspense>
    </div>
  );
}
