import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { INK_60 } from "../../data/tokens.js";
import { SubTabStrip, useSubTabs } from "./shared.jsx";

const PricingTab = lazy(() => import("./PricingTab.jsx"));

/* ═══════════════════════════════════════════════════════════════════════════
   RegistrationHubTab — master wrapper for everything behind the registration
   funnel. Currently: Pricing (the private Bartz offer inputs). Flow building
   stays under Content → Flows; move it here later if the section grows.

   URL pattern: /admin/registration          → defaults to "pricing"
                /admin/registration/pricing  → Pricing sub-tab

   Reports combined dirty state (any child dirty → parent dirty).
═══════════════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: "pricing", label: "Pricing" },
];
const SUB_KEYS = SUB_TABS.map(t => t.key);

export default function RegistrationHubTab({ onDirtyChange }) {
  const [dirtyFlags, setDirtyFlags] = useState({});
  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  const [sub, selectSub] = useSubTabs(
    "/admin/registration", SUB_KEYS, "pricing",
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
        {sub === "pricing" && <PricingTab onDirtyChange={makeDirty("pricing")} />}
      </Suspense>
    </div>
  );
}
