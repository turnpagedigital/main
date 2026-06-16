import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { INK_60 } from "../../data/tokens.js";
import { SubTabStrip, useSubTabs } from "./shared.jsx";

// Lazy-load sub-tabs
const StructureFaviconsTab  = lazy(() => import("./StructureFaviconsTab.jsx"));
const StructureSiteMetaTab  = lazy(() => import("./StructureSiteMetaTab.jsx"));
const StructureNavItemsTab  = lazy(() => import("./StructureNavItemsTab.jsx"));
const StructureFooterTab    = lazy(() => import("./StructureFooterTab.jsx"));
const RoutesTab             = lazy(() => import("./RoutesTab.jsx"));
const UsersTab              = lazy(() => import("./UsersTab.jsx"));

/* ═══════════════════════════════════════════════════════════════════════════
   StructureTab — master wrapper for site-level settings.

   Horizontal sub-tab strip:
     Favicons | Site Meta | Navigation | Footer | Routes

   Each child manages its own fetch/save/dirty lifecycle.
   Microsite navigation is managed within the Navigation tab (per nav item checkbox).

   URL pattern: /admin/structure             → defaults to "favicons"
                /admin/structure/site-meta   → Site Meta sub-tab
                /admin/structure/navigation  → Navigation sub-tab (includes microsite editing)
                /admin/structure/footer      → Footer sub-tab
                /admin/structure/routes      → Routes sub-tab

   Reports combined dirty state to Admin.jsx.
═══════════════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: "favicons",    label: "Favicons" },
  { key: "site-meta",   label: "Site Meta" },
  { key: "navigation",  label: "Navigation" },
  { key: "footer",      label: "Footer" },
  { key: "routes",      label: "Routes" },
  { key: "users",       label: "Users" },
];
const SUB_KEYS = SUB_TABS.map(t => t.key);

export default function StructureTab({ onDirtyChange }) {
  const [dirtyFlags, setDirtyFlags] = useState({});
  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  const [sub, selectSub] = useSubTabs(
    "/admin/structure", SUB_KEYS, "favicons",
    () => !isAnyDirty || window.confirm("You have unsaved changes. Discard them and switch?"),
  );

  const makeDirty = useCallback((key) => (isDirty) => {
    setDirtyFlags(prev => prev[key] === isDirty ? prev : { ...prev, [key]: isDirty });
  }, []);

  useEffect(() => { onDirtyChange?.(isAnyDirty); }, [isAnyDirty, onDirtyChange]);

  return (
    <div>
      <SubTabStrip tabs={SUB_TABS} active={sub} dirtyFlags={dirtyFlags} onSelect={selectSub} />

      {/* Render the active child (lazy-loaded) */}
      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>Loading…</div>}>
        {sub === "favicons"   && <StructureFaviconsTab   onDirtyChange={makeDirty("favicons")} />}
        {sub === "site-meta"  && <StructureSiteMetaTab   onDirtyChange={makeDirty("site-meta")} />}
        {sub === "navigation" && <StructureNavItemsTab   onDirtyChange={makeDirty("navigation")} />}
        {sub === "footer"     && <StructureFooterTab     onDirtyChange={makeDirty("footer")} />}
        {sub === "routes"     && <RoutesTab              onDirtyChange={makeDirty("routes")} />}
        {sub === "users"      && <UsersTab               onDirtyChange={makeDirty("users")} />}
      </Suspense>
    </div>
  );
}
