import React, { useState } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";

// --- Styles ------------------------------------------------------------------

export const filterSelectStyle = {
  padding: "0.32rem 0.6rem", border: `1px solid ${LINE}`, borderRadius: 0,
  fontFamily: FONT, fontSize: "0.82rem", color: INK,
  background: "#fff", cursor: "pointer", outline: "none",
};

export const inputStyle = {
  display: "block", width: "100%", marginTop: "0.3rem",
  padding: "0.55rem 0.7rem", border: `1px solid ${LINE}`, borderRadius: 0,
  fontFamily: FONT, fontSize: "0.92rem", color: INK,
  background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box",
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
    border: `1px solid ${LINE}`, background: "#fff", color: INK,
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
      minHeight: "100vh", background: "#F4F5F7", fontFamily: FONT, color: INK_60,
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
      minHeight: "100vh", background: "#F4F5F7", fontFamily: FONT, color: INK,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
    }}>
      <form onSubmit={submit} style={{
        background: "#fff", border: `1px solid ${LINE}`,
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
