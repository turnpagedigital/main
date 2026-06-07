import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";

// Lazy-load sub-tabs
const BioTab           = lazy(() => import("./BioTab.jsx"));
const PostsTab         = lazy(() => import("./PostsTab.jsx"));
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
  { key: "deals",         label: "Deals" },
  { key: "press",         label: "Press" },
  { key: "alerts",        label: "Alerts" },
  { key: "faqs",          label: "FAQs" },
  { key: "testimonials",  label: "Testimonials" },
  { key: "contact-form",  label: "Contact Form" },
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

  const isAnyDirty = Object.values(dirtyFlags).some(Boolean);

  useEffect(() => {
    function onPop() { setSub(getSubTab()); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function selectSub(key) {
    // Guard: confirm before switching with unsaved changes
    if (isAnyDirty && !window.confirm("You have unsaved changes. Discard them and switch?")) {
      return;
    }
    const next = `/admin/content/${key}`;
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

      {/* Render the active child (lazy-loaded) */}
      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>Loading…</div>}>
        {sub === "bio"           && <BioTab          onDirtyChange={makeDirty("bio")} />}
        {sub === "posts"         && <PostsTab        onDirtyChange={makeDirty("posts")} />}
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
