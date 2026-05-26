import React, { useEffect, useState, useCallback } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { CenteredMessage, LoginForm, btnStyle } from "./admin/shared.jsx";
import BioTab    from "./admin/BioTab.jsx";
import DealsTab  from "./admin/DealsTab.jsx";
import PressTab  from "./admin/PressTab.jsx";
import PostsTab  from "./admin/PostsTab.jsx";
import FAQsTab   from "./admin/FAQsTab.jsx";
import AlertsTab from "./admin/AlertsTab.jsx";

/* Admin panel — auth shell + tab navigation.
   Each tab owns its own fetch/save/state lifecycle (see src/pages/admin/). */

/* Swap the favicon to the original (favicon.png) while admin is mounted,
   then restore the main site favicon (favicon1.png) on unmount. */
function useFaviconSwap(adminHref, restoreHref) {
  useEffect(() => {
    const icons = document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']");
    icons.forEach(el => { el.href = adminHref; });
    return () => {
      icons.forEach(el => { el.href = restoreHref; });
    };
  }, [adminHref, restoreHref]);
}

export default function Admin() {
  useFaviconSwap("/favicon.png", "/favicon1.png");

  const [phase, setPhase] = useState("checking"); // checking | login | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState("bio");
  const [dirtyTabs, setDirtyTabs] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/session", { credentials: "include" });
        if (cancelled) return;
        setPhase(r.ok ? "ready" : "login");
      } catch {
        if (!cancelled) setPhase("login");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const makeDirtyCallback = useCallback((key) => (isDirty) =>
    setDirtyTabs(prev => prev[key] === isDirty ? prev : ({ ...prev, [key]: isDirty })), []);

  async function handleLogin(password) {
    setErrorMsg("");
    setPhase("checking");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Login failed");
      setPhase("ready");
    } catch (e) {
      setErrorMsg(e.message);
      setPhase("login");
    }
  }

  async function handleLogout() {
    try { await fetch("/api/admin/logout", { method: "POST", credentials: "include" }); } catch {}
    setDirtyTabs({});
    setPhase("login");
  }

  if (phase === "checking") return <CenteredMessage>Loading admin…</CenteredMessage>;
  if (phase === "login")    return <LoginForm onSubmit={handleLogin} error={errorMsg} />;

  const TAB_DEFS = [
    { key: "bio",    label: "Bio",    dirty: dirtyTabs.bio    ?? false },
    { key: "posts",  label: "Posts",  dirty: dirtyTabs.posts  ?? false },
    { key: "deals",  label: "Deals",  dirty: dirtyTabs.deals  ?? false },
    { key: "press",  label: "Press",  dirty: dirtyTabs.press  ?? false },
    { key: "alerts", label: "Alerts", dirty: dirtyTabs.alerts ?? false },
    { key: "faqs",   label: "FAQs",   dirty: dirtyTabs.faqs   ?? false },
  ];

  return (
    <div style={{ background: "#F4F5F7", minHeight: "100vh", fontFamily: FONT, color: INK }}>

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#FFFFFF", borderBottom: `1px solid ${LINE}`,
      }}>
        {/* Title row */}
        <div style={{
          padding: "0.75rem clamp(1rem, 3vw, 2rem)",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em", flex: 1 }}>
            Turnpage Admin
          </div>
          <button onClick={handleLogout} style={btnStyle}>Log out</button>
        </div>

        {/* Tab row */}
        <div style={{
          display: "flex", alignItems: "stretch",
          padding: "0 clamp(1rem, 3vw, 2rem)",
          gap: 0, borderTop: `1px solid ${LINE}`,
        }}>
          {TAB_DEFS.map(({ key, label, dirty }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  fontFamily: FONT, fontSize: "0.88rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? INK : INK_60,
                  background: "transparent", border: "none",
                  borderBottom: active ? `2px solid ${INK}` : "2px solid transparent",
                  padding: "0.7rem 1.4rem 0.7rem 0",
                  marginRight: "1.8rem",
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: "0.45em",
                  transition: "color 0.15s",
                }}
              >
                {label}
                {dirty && (
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: NEON, display: "inline-block", flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab panels ────────────────────────────────────────────── */}
      {tab === "bio"    && <BioTab    onDirtyChange={makeDirtyCallback("bio")} />}
      {tab === "posts"  && <PostsTab  onDirtyChange={makeDirtyCallback("posts")} />}
      {tab === "deals"  && <DealsTab  onDirtyChange={makeDirtyCallback("deals")} />}
      {tab === "press"  && <PressTab  onDirtyChange={makeDirtyCallback("press")} />}
      {tab === "alerts" && <AlertsTab onDirtyChange={makeDirtyCallback("alerts")} />}
      {tab === "faqs"   && <FAQsTab   onDirtyChange={makeDirtyCallback("faqs")} />}
    </div>
  );
}
