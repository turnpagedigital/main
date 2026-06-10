import React, { useState, useEffect, useCallback } from "react";
import { NEON, FONT, INK, INK_60, LINE, SURFACE, ERROR, ERROR_BG, WARNING, SUCCESS, SECONDARY_BG } from "../../data/tokens.js";

// --- Styles ------------------------------------------------------------------

// SVG chevron for custom <select> arrow (replaces browser-native arrow after appearance:none)
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(10%2C10%2C10%2C0.45)'/%3E%3C/svg%3E")`;

export const filterSelectStyle = {
  padding: "0.32rem 1.6rem 0.32rem 0.6rem", border: `1px solid ${LINE}`, borderRadius: 0,
  fontFamily: FONT, fontSize: "0.82rem", color: INK,
  background: SURFACE, cursor: "pointer", outline: "none", boxShadow: "none",
  appearance: "none", WebkitAppearance: "none",
  backgroundImage: CHEVRON, backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.45rem center", backgroundSize: "8px 5px",
};

export const inputStyle = {
  display: "block", width: "100%", marginTop: "0.3rem",
  padding: "0.55rem 0.7rem", border: `1px solid ${LINE}`, borderRadius: 0,
  fontFamily: FONT, fontSize: "0.92rem", color: INK,
  background: SURFACE, outline: "none", resize: "vertical", boxSizing: "border-box",
  boxShadow: "none", appearance: "none", WebkitAppearance: "none",
};

// Use this for <select> elements — same as inputStyle but with cursor + custom chevron arrow
export const selectStyle = {
  display: "block", width: "100%", marginTop: "0.3rem",
  padding: "0.55rem 1.8rem 0.55rem 0.7rem", border: `1px solid ${LINE}`, borderRadius: 0,
  fontFamily: FONT, fontSize: "0.92rem", color: INK,
  background: SURFACE, outline: "none", boxSizing: "border-box",
  boxShadow: "none", appearance: "none", WebkitAppearance: "none",
  cursor: "pointer",
  backgroundImage: CHEVRON, backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.6rem center", backgroundSize: "8px 5px",
};
export const btnStyle = {
  background: "transparent", border: `1px solid ${LINE}`, color: INK,
  padding: "0.5rem 0.9rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600,
  cursor: "pointer", borderRadius: 0,
};
export const btnPrimaryStyle = {
  background: NEON, border: "none", color: "#000",
  padding: "0.55rem 1.1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700,
  cursor: "pointer", borderRadius: 0, letterSpacing: "0.02em",
};
export function iconBtnStyle(disabled) {
  return {
    width: 32, height: 32, padding: 0, lineHeight: 1,
    border: `1px solid ${LINE}`, background: SURFACE, color: INK,
    fontFamily: FONT, fontSize: "1rem", fontWeight: 700,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1,
    borderRadius: 0,
  };
}

export function formatTime(d) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function CenteredMessage({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: SECONDARY_BG, fontFamily: FONT, color: INK_60,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem", flexDirection: "column",
    }}>
      {children}
    </div>
  );
}

export function LoginForm({ onSubmit, error }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    await onSubmit(password);
    setSubmitting(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: SECONDARY_BG, fontFamily: FONT, color: INK,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
    }}>
      <form onSubmit={submit} style={{
        background: SURFACE, border: `1px solid ${LINE}`,
        padding: "2rem", width: "100%", maxWidth: 380,
      }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.4rem", letterSpacing: "-0.01em" }}>
          Turnpage Admin
        </h1>
        <p style={{ fontSize: "0.85rem", color: INK_60, marginBottom: "1.5rem" }}>
          Enter the admin password to continue.
        </p>
        <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={submitting}
            style={inputStyle}
          />
        </label>
        {error && <p style={{ color: "#c44", fontSize: "0.85rem", marginTop: "0.6rem" }}>{error}</p>}
        <button type="submit" disabled={!password || submitting} style={{
          ...btnPrimaryStyle, width: "100%", marginTop: "1.2rem",
          opacity: (!password || submitting) ? 0.5 : 1,
          cursor: (!password || submitting) ? "default" : "pointer",
        }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// --- Shared admin UI components -----------------------------------------------

export function Banner({ kind, children }) {
  const ok = kind === "ok";
  return (
    <div style={{
      padding: "0.7rem 0.9rem", marginBottom: "1rem", fontSize: "0.86rem",
      background: ok ? "rgba(26,127,55,0.08)" : "rgba(192,57,43,0.07)",
      border: `1px solid ${ok ? "rgba(26,127,55,0.3)" : "rgba(192,57,43,0.3)"}`,
      color: ok ? "#1a7f37" : "#c0392b",
    }}>
      {children}
    </div>
  );
}

export function Modal({ children, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.5rem", maxWidth: 480, width: "100%", fontFamily: FONT, color: INK, maxHeight: "80vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <Modal onClose={onCancel}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.8rem", color: INK }}>
        {title}
      </h3>
      <p style={{ fontSize: "0.9rem", color: INK_60, marginBottom: "1.4rem", lineHeight: 1.5 }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: "0.8rem", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={btnStyle}>
          Cancel
        </button>
        <button onClick={onConfirm} style={{ ...btnPrimaryStyle, background: "#c0392b", color: "#fff" }}>
          {confirmLabel || "Delete"}
        </button>
      </div>
    </Modal>
  );
}

/* ErrorBanner — the standard red error strip used across admin tabs.
   Renders nothing when children is falsy, so callers can pass the error
   string directly without an outer guard. */
export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
      {children}
    </div>
  );
}

/* useSubTabs — URL-synced sub-tab state for hub tabs (Content, Pages,
   Structure, Intelligence). Keeps the active sub-tab in sync with
   /admin/<hub>/<sub> paths, including back/forward navigation.

   basePath   "/admin/content" (no trailing slash)
   tabKeys    array of valid sub-tab keys
   defaultKey key used when the URL has no (or an unknown) sub segment
   guard      optional () => boolean — return false to block a switch
              (used for the unsaved-changes confirm)

   Returns [sub, selectSub]. */
export function useSubTabs(basePath, tabKeys, defaultKey, guard) {
  // Hubs pass module-level constant arrays; a joined string keeps the
  // callback stable even if a caller inlines the array.
  const tabKeysKey = tabKeys.join(",");
  const get = useCallback(() => {
    if (typeof window === "undefined") return defaultKey;
    const m = window.location.pathname.match(new RegExp(`^${basePath}(?:/([a-z][a-z0-9-]*))?`));
    if (!m || !m[1]) return defaultKey;
    return tabKeysKey.split(",").includes(m[1]) ? m[1] : defaultKey;
  }, [basePath, defaultKey, tabKeysKey]);

  const [sub, setSub] = useState(get);

  useEffect(() => {
    function onPop() { setSub(get()); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [get]);

  function selectSub(key) {
    if (guard && !guard()) return;
    const next = `${basePath}/${key}`;
    if (window.location.pathname !== next) {
      window.history.pushState(null, "", next);
      // Notify app-level listeners (App.jsx useRoute) that the URL changed
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setSub(key);
  }

  return [sub, selectSub];
}

/* SubTabStrip — the horizontal sub-tab bar rendered by every hub tab.
   tabs        [{ key, label }]
   active      current sub-tab key
   dirtyFlags  { [key]: boolean } — shows the neon unsaved dot
   onSelect    (key) => void */
export function SubTabStrip({ tabs, active, dirtyFlags = {}, onSelect }) {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0.6rem clamp(1rem, 3vw, 2rem) 0" }}>
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${LINE}` }}>
        {tabs.map(({ key, label }) => {
          const isActive = active === key;
          const isDirty = dirtyFlags[key];
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                fontFamily: FONT, fontSize: "0.85rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? INK : INK_60,
                background: "transparent", border: "none",
                borderBottom: isActive ? `2px solid ${INK}` : "2px solid transparent",
                padding: "0.6rem 1.1rem 0.6rem 0",
                marginRight: "1.2rem", marginBottom: "-1px",
                cursor: "pointer", transition: "color 0.15s",
                display: "inline-flex", alignItems: "center", gap: "0.4em",
              }}
            >
              {label}
              {isDirty && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: NEON, display: "inline-block", flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Shared style constants ---------------------------------------------------

export const cardStyle = { background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1.2rem" };
export const labelStyle = { display: "block", fontSize: "0.74rem", color: INK_60, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 4 };
export const sectionHeaderStyle = { fontSize: "1rem", fontWeight: 800, margin: 0, marginBottom: "0.9rem", color: INK };
export const wrapStyle = { maxWidth: 1080, margin: "0 auto", padding: "1.4rem clamp(1rem,3vw,2rem) 3rem" };
export const wrapNarrowStyle = { maxWidth: 820, margin: "0 auto", padding: "1.4rem clamp(1rem,3vw,2rem) 3rem" };
