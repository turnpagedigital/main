import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { INK_60 } from "../../data/tokens.js";
import { SubTabStrip, useSubTabs } from "./shared.jsx";

// Lazy-load sub-tabs
const BioTab           = lazy(() => import("./BioTab.jsx"));
const PostsTab         = lazy(() => import("./PostsTab.jsx"));
const BriefingsTab     = lazy(() => import("./BriefingsTab.jsx"));
const DealsTab         = lazy(() => import("./DealsTab.jsx"));
const PressTab         = lazy(() => import("./PressTab.jsx"));
const AlertsTab        = lazy(() => import("./AlertsTab.jsx"));
const FAQsTab          = lazy(() => import("./FAQsTab.jsx"));
const TestimonialsTab  = lazy(() => import("./TestimonialsTab.jsx"));
const ContactFormTab   = lazy(() => import("./ContactFormTab.jsx"));

/* ═══════════════════════════════════════════════════════════════════════════
   SharedContentTab — master wrapper for Bio, Posts, Deals, Press, Alerts,
   FAQs. Provides a horizontal sub-tab strip; each child keeps its own
   fetch/save.

   URL pattern: /admin/content         → defaults to "bio"
                /admin/content/posts   → Posts sub-tab
                /admin/content/faqs    → FAQs sub-tab

   Reports combined dirty state (any child dirty → parent dirty).
═══════════════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: "bio",           label: "Bio" },
  { key: "posts",         label: "Posts" },
  { key: "briefings",     label: "Briefings" },
  { key: "deals",         label: "Deals" },
  { key: "press",         label: "Press" },
  { key: "alerts",        label: "Alerts" },
  { key: "faqs",          label: "FAQs" },
  { key: "testimonials",  label: "Testimonials" },
  { key: "contact-form",  label: "Contact Form" },
];
const SUB_KEYS = SUB_TABS.map(t => t.key);

export default function SharedContentTab({ onDirtyChange }) {
  const [dirtyFlags, setDirtyFlags] = useState({});
  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  const [sub, selectSub] = useSubTabs(
    "/admin/content", SUB_KEYS, "bio",
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
        {sub === "bio"           && <BioTab          onDirtyChange={makeDirty("bio")} />}
        {sub === "posts"         && <PostsTab        onDirtyChange={makeDirty("posts")} />}
        {sub === "briefings"     && <BriefingsTab    onDirtyChange={makeDirty("briefings")} />}
        {sub === "deals"         && <DealsTab        onDirtyChange={makeDirty("deals")} />}
        {sub === "press"         && <PressTab        onDirtyChange={makeDirty("press")} />}
        {sub === "alerts"        && <AlertsTab       onDirtyChange={makeDirty("alerts")} />}
        {sub === "faqs"          && <FAQsTab         onDirtyChange={makeDirty("faqs")} />}
        {sub === "testimonials"  && <TestimonialsTab onDirtyChange={makeDirty("testimonials")} />}
        {sub === "contact-form"  && <ContactFormTab  onDirtyChange={makeDirty("contact-form")} />}
      </Suspense>
    </div>
  );
}
