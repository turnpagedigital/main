import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { INK_60 } from "../../data/tokens.js";
import { SubTabStrip, useSubTabs } from "./shared.jsx";

// Lazy-load sub-tabs
const BioTab           = lazy(() => import("./BioTab.jsx"));
const PostsTab         = lazy(() => import("./PostsTab.jsx"));
const DealsTab         = lazy(() => import("./DealsTab.jsx"));
const PressTab         = lazy(() => import("./PressTab.jsx"));
const TopicsTab        = lazy(() => import("./TopicsTab.jsx"));
const AlertsTab        = lazy(() => import("./AlertsTab.jsx"));
const FAQsTab          = lazy(() => import("./FAQsTab.jsx"));
const TestimonialsTab  = lazy(() => import("./TestimonialsTab.jsx"));
const ContactFormTab   = lazy(() => import("./ContactFormTab.jsx"));
const ReferralPartnersTab = lazy(() => import("./ReferralPartnersTab.jsx"));

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
  { key: "posts",         label: "Posts & Briefings" },
  { key: "deals",         label: "Deals" },
  { key: "press",         label: "Press" },
  { key: "topics",        label: "Topics" },
  { key: "alerts",        label: "Alerts" },
  { key: "faqs",          label: "FAQs" },
  { key: "testimonials",  label: "Testimonials" },
  { key: "contact-form",  label: "Contact Form" },
  { key: "partners",      label: "Partners" },
];
const SUB_KEYS = SUB_TABS.map(t => t.key);

// The former Briefings sub-tab merged into Posts (June 2026) — old
// /admin/content/briefings URLs land on the combined tab. Flows moved to
// the Registration master tab (July 2026); old links land on Bio by default.
const SUB_ALIASES = { briefings: "posts" };

export default function SharedContentTab({ onDirtyChange }) {
  const [dirtyFlags, setDirtyFlags] = useState({});
  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  const [rawSub, selectSub] = useSubTabs(
    "/admin/content", [...SUB_KEYS, ...Object.keys(SUB_ALIASES)], "bio",
    () => !isAnyDirty || window.confirm("You have unsaved changes. Discard them and switch?"),
  );
  const sub = SUB_ALIASES[rawSub] || rawSub;

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
        {sub === "deals"         && <DealsTab        onDirtyChange={makeDirty("deals")} />}
        {sub === "press"         && <PressTab        onDirtyChange={makeDirty("press")} />}
        {sub === "topics"        && <TopicsTab       onDirtyChange={makeDirty("topics")} />}
        {sub === "alerts"        && <AlertsTab       onDirtyChange={makeDirty("alerts")} />}
        {sub === "faqs"          && <FAQsTab         onDirtyChange={makeDirty("faqs")} />}
        {sub === "testimonials"  && <TestimonialsTab onDirtyChange={makeDirty("testimonials")} />}
        {sub === "contact-form"  && <ContactFormTab  onDirtyChange={makeDirty("contact-form")} />}
        {sub === "partners"      && <ReferralPartnersTab onDirtyChange={makeDirty("partners")} />}
      </Suspense>
    </div>
  );
}
