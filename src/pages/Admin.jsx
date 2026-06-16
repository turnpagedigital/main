import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { CenteredMessage, LoginForm, btnStyle } from "./admin/shared.jsx";
import RollbackButton from "./admin/RollbackButton.jsx";

// Lazy-load each master tab to reduce the admin bundle size from 779 KB
const SharedContentTab  = lazy(() => import("./admin/SharedContentTab.jsx"));
const AssetsTab         = lazy(() => import("./admin/AssetsTab.jsx"));
const StructureTab      = lazy(() => import("./admin/StructureTab.jsx"));
const IntelligenceHubTab = lazy(() => import("./admin/IntelligenceHubTab.jsx"));
const PagesHubTab        = lazy(() => import("./admin/PagesHubTab.jsx"));
const CSSTab             = lazy(() => import("./admin/CSSTab.jsx"));

/* Admin panel — auth shell + tab navigation.
   Each tab owns its own fetch/save/state lifecycle (see src/pages/admin/).
   Tab state syncs to the URL path: /admin/<tab>.

   Master tabs (4):
     Content   — sub-tab strip → Bio, Posts, Deals, Press, Alerts, FAQs
     Pages     — sub-tab strip → Home, Crypto, AI Copyright, Litigation Finance, Contact Us
     Assets    — file library management
     Structure — sub-tab strip → Metadata, Navigation, Footer, Routes

   NOTE: The favicon for /admin is set in src/main.jsx before React mounts,
   driven by src/data/file-library.json. The favicon picker lives in the
   Structure → Metadata sub-tab. */

const VALID_TABS = ["content", "page-builder", "assets", "structure", "intelligence", "css"];

function getTabFromPath() {
  if (typeof window === "undefined") return "content";
  const m = window.location.pathname.match(/^\/admin(?:\/([a-z][a-z0-9-]*))?/);
  if (!m || !m[1]) return "content";
  return VALID_TABS.includes(m[1]) ? m[1] : "content";
}

export default function Admin() {
  const [phase, setPhase] = useState("checking"); // checking | login | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState(getTabFromPath);
  const [dirtyTabs, setDirtyTabs] = useState({});

  // Deploy state
  const [deployState, setDeployState] = useState("idle"); // idle | confirm-dev | confirm-prod | deploying | done | error
  const [deployMsg, setDeployMsg] = useState("");

  // Check if any tab is dirty
  const isAnyDirty = Object.values(dirtyTabs).some(Boolean);

  // Sync tab state with URL path (back/forward + bookmarks)
  useEffect(() => {
    function onPopstate() { setTab(getTabFromPath()); }
    window.addEventListener("popstate", onPopstate);
    return () => window.removeEventListener("popstate", onPopstate);
  }, []);

  // Guard against losing unsaved changes on close/refresh
  useEffect(() => {
    function onBeforeUnload(e) {
      if (isAnyDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isAnyDirty]);

  function selectTab(key) {
    // If switching tabs with unsaved changes, confirm first
    if (isAnyDirty && !window.confirm("You have unsaved changes. Discard them and switch tabs?")) {
      return;
    }
    const next = `/admin/${key}`;
    if (window.location.pathname !== next) {
      window.history.pushState(null, "", next);
      // Notify our app-level listeners (App.jsx useRoute) that the URL changed
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setTab(key);
  }

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

  async function handleLogin(email, password) {
    setErrorMsg("");
    setPhase("checking");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
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

  async function handleDeploy(target) {
    setDeployState("deploying");
    setDeployMsg("");
    try {
      const r = await fetch("/api/admin/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Deploy failed");
      setDeployState("done");
      setDeployMsg(body.message || `Deploy to ${target} triggered.`);
      setTimeout(() => setDeployState("idle"), 6000);
    } catch (e) {
      setDeployState("error");
      setDeployMsg(e.message);
      setTimeout(() => setDeployState("idle"), 8000);
    }
  }

  if (phase === "checking") return <CenteredMessage>Loading admin…</CenteredMessage>;
  if (phase === "login")    return <LoginForm onSubmit={handleLogin} error={errorMsg} />;

  const TAB_DEFS = [
    { key: "content",      label: "Content",      dirty: dirtyTabs.content      ?? false },
    { key: "page-builder", label: "Pages",         dirty: dirtyTabs["page-builder"] ?? false },
    { key: "assets",       label: "Assets",        dirty: dirtyTabs.assets       ?? false },
    { key: "structure",    label: "Structure",     dirty: dirtyTabs.structure    ?? false },
    { key: "intelligence", label: "Intelligence",  dirty: dirtyTabs.intelligence ?? false },
    { key: "css",          label: "CSS & Design",  dirty: false },
  ];

  return (
    <div className="tpdm-admin" style={{ background: "#F4F5F7", minHeight: "100vh", fontFamily: FONT, color: INK }}>
      {/* Keyboard focus indicator — admin styles strip the native outline
          (outline: none in inputStyle/selectStyle), so without this a
          keyboard user can't see which control is focused. focus-visible
          keeps mouse clicks outline-free. */}
      <style>{`
        .tpdm-admin :is(button, input, select, textarea, a, [tabindex]):focus-visible {
          outline: 2px solid ${NEON};
          outline-offset: 2px;
        }
      `}</style>

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#FFFFFF", borderBottom: `1px solid ${LINE}`,
      }}>
        {/* Title row */}
        <div style={{
          padding: "0.75rem clamp(1rem, 3vw, 2rem)",
          display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
        }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em", flex: 1 }}>
            Turnpage Admin
          </div>

          {/* Deploy status message */}
          {(deployState === "done" || deployState === "error") && (
            <span style={{
              fontSize: "0.78rem", fontWeight: 600,
              color: deployState === "done" ? "#1a7f37" : "#c0392b",
              padding: "0.2rem 0.5rem",
              background: deployState === "done" ? "rgba(26,127,55,0.09)" : "rgba(192,57,43,0.09)",
              border: `1px solid ${deployState === "done" ? "rgba(26,127,55,0.3)" : "rgba(192,57,43,0.3)"}`,
            }}>
              {deployMsg}
            </span>
          )}

          {/* Confirm overlay — replaces the buttons briefly */}
          {(deployState === "confirm-dev" || deployState === "confirm-prod") && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: INK }}>
                {deployState === "confirm-dev"
                  ? "Deploy to Dev — are you sure?"
                  : "Deploy to Production — are you sure?"}
              </span>
              <button
                onClick={() => handleDeploy(deployState === "confirm-dev" ? "dev" : "production")}
                style={{
                  ...btnStyle, background: "#0A0A0A", color: "#fff",
                  border: "1px solid #0A0A0A", fontWeight: 700, fontSize: "0.78rem",
                }}
              >
                Yes, deploy
              </button>
              <button
                onClick={() => setDeployState("idle")}
                style={{ ...btnStyle, fontSize: "0.78rem" }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Deploy buttons (shown when idle, deploying, done, or error) */}
          {deployState !== "confirm-dev" && deployState !== "confirm-prod" && (
            <>
              <RollbackButton
                deployState={deployState}
                deployMsg={deployMsg}
                onRollbackStart={() => setDeployState("deploying")}
                onRollbackDone={(data) => {
                  setDeployState("done");
                  setDeployMsg(data.message || "Rollback complete.");
                  setTimeout(() => setDeployState("idle"), 6000);
                }}
              />
              <button
                disabled={deployState === "deploying"}
                onClick={() => setDeployState("confirm-dev")}
                style={{
                  ...btnStyle, fontSize: "0.78rem", fontWeight: 700,
                  opacity: deployState === "deploying" ? 0.5 : 1,
                  cursor: deployState === "deploying" ? "default" : "pointer",
                }}
              >
                {deployState === "deploying" ? "Deploying…" : "↑ Deploy to Dev"}
              </button>
              <button
                disabled={deployState === "deploying"}
                onClick={() => setDeployState("confirm-prod")}
                style={{
                  ...btnStyle, fontSize: "0.78rem", fontWeight: 700,
                  background: "#0A0A0A", color: "#fff", border: "1px solid #0A0A0A",
                  opacity: deployState === "deploying" ? 0.5 : 1,
                  cursor: deployState === "deploying" ? "default" : "pointer",
                }}
              >
                {deployState === "deploying" ? "Deploying…" : "↑ Deploy to Production"}
              </button>
            </>
          )}

          <button onClick={handleLogout} style={{ ...btnStyle, fontSize: "0.78rem" }}>Log out</button>
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
                onClick={() => selectTab(key)}
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

      {/* ── Tab panels (lazy-loaded) ────────────────────────────── */}
      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>Loading…</div>}>
        {tab === "content"      && <SharedContentTab  onDirtyChange={makeDirtyCallback("content")} />}
        {tab === "page-builder" && <PagesHubTab       onDirtyChange={makeDirtyCallback("page-builder")} />}
        {tab === "assets"       && <AssetsTab         onDirtyChange={makeDirtyCallback("assets")} />}
        {tab === "structure"    && <StructureTab      onDirtyChange={makeDirtyCallback("structure")} />}
        {tab === "intelligence" && <IntelligenceHubTab onDirtyChange={makeDirtyCallback("intelligence")} />}
        {tab === "css"          && <CSSTab />}
        {/* Legacy "pages" tab (meta/favicons) still accessible as sub-tab of Structure */}
      </Suspense>
    </div>
  );
}
