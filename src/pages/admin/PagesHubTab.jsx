import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { INK_60 } from "../../data/tokens.js";
import { SubTabStrip } from "./shared.jsx";

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

  useEffect(() => { onDirtyChange?.(isAnyDirty); }, [isAnyDirty, onDirtyChange]);

  return (
    <div>
      <SubTabStrip tabs={SUB_TABS} active={sub} dirtyFlags={dirtyFlags} onSelect={selectSub} />

      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>Loading…</div>}>
        {sub === "builder"  && <PageBuilderTab  onDirtyChange={makeDirty("builder")} />}
        {sub === "sections" && <SectionTypesTab />}
      </Suspense>
    </div>
  );
}
