/**
 * TokenList — live design-token editor.
 *
 * Reads current values from GET /api/admin/tokens (the repo, not the deployed
 * bundle), so edits show up immediately after saving even though the public
 * site only picks them up on the next Cloudflare build (~1–2 min).
 * Tokens whose repo value differs from the deployed bundle get a
 * "pending deploy" chip. Saving goes through TokenEditorModal → PUT.
 */

import React, { useState, useEffect, useCallback } from "react";
import * as DeployedTokens from "../../../data/tokens.js";
import { INK, INK_60, LINE, SUCCESS_BG, SUCCESS } from "../../../data/tokens.js";
import { btnStyle, CenteredMessage, ErrorBanner } from "../shared.jsx";
import TokenEditorModal from "./TokenEditorModal.jsx";

const CATEGORIES = {
  accent: { label: "Accent Colors", tokens: ["NEON", "NEON_HOVER", "NEON_SOFT", "NEON_SOFT_DARK"] },
  dark: { label: "Dark Surfaces", tokens: ["DARK", "DARK_CARD", "LIFT_1", "LIFT_2", "DARK_BORDER"] },
  light: { label: "Light Surfaces", tokens: ["PAPER", "PAPER_2", "SURFACE", "INK", "INK_60", "INK_40", "INK_20", "LINE", "LINE_STRONG"] },
  darkText: { label: "Dark Text", tokens: ["TEXT", "MUTED", "MUTED_2"] },
  status: { label: "Status Colors", tokens: ["ERROR", "ERROR_BG", "ERROR_TEXT", "WARNING", "WARNING_BG", "SUCCESS", "SUCCESS_BG", "SECONDARY_BG"] },
  typography: { label: "Typography", tokens: ["FONT"] },
};

const TOKEN_ROW_STYLE = {
  display: "grid",
  gridTemplateColumns: "140px 1fr 90px 150px 80px",
  gap: "1rem",
  padding: "0.85rem 1rem",
  borderBottom: `1px solid ${LINE}`,
  alignItems: "center",
  fontSize: "0.85rem",
};

const SWATCH_STYLE = {
  width: "40px",
  height: "28px",
  borderRadius: "4px",
  border: `1px solid ${LINE}`,
};

function isColorValue(v) {
  return typeof v === "string" && (v.startsWith("#") || v.startsWith("rgba") || v.startsWith("rgb("));
}

export default function TokenList() {
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [liveTokens, setLiveTokens] = useState(null); // repo values
  const [editingToken, setEditingToken] = useState(null);
  const [savedBanner, setSavedBanner] = useState("");

  const load = useCallback(async () => {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/tokens", { credentials: "include" });
      if (r.status === 401) return; // Admin shell handles login
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setLiveTokens(body.data || {});
      setPhase("ready");
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(tokenName, newValue) {
    setLiveTokens(prev => ({ ...(prev || {}), [tokenName]: newValue }));
    setEditingToken(null);
    setSavedBanner(`${tokenName} saved — Cloudflare is rebuilding; the live site updates in ~1–2 minutes.`);
  }

  if (phase === "loading") return <CenteredMessage>Loading live token values…</CenteredMessage>;
  if (phase === "error" && liveTokens === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (liveTokens === null) return null;

  return (
    <div>
      {savedBanner && (
        <div style={{
          background: SUCCESS_BG, color: SUCCESS, border: `1px solid ${SUCCESS}33`,
          padding: "0.7rem 1rem", marginBottom: "1.25rem", fontSize: "0.85rem",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <span style={{ flex: 1 }}>{savedBanner}</span>
          <button onClick={() => setSavedBanner("")} style={{ ...btnStyle, padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}>×</button>
        </div>
      )}
      <ErrorBanner>{phase === "error" ? error : ""}</ErrorBanner>

      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "1.5rem" }}>
        These are the live values in the repo. Editing a token updates <strong>everything</strong> that
        uses it — public pages, section palettes, and the admin itself — after the next deploy (~1–2 min).
      </p>

      {Object.values(CATEGORIES).map((category) => (
        <div key={category.label} style={{ marginBottom: "2rem" }}>
          <h3 style={{
            fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem", color: INK,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {category.label}
          </h3>

          <div style={{ border: `1px solid ${LINE}`, borderRadius: "4px", overflow: "hidden", background: "#fff" }}>
            {category.tokens.map((tokenName) => {
              const liveValue = liveTokens[tokenName] ?? DeployedTokens[tokenName] ?? "";
              const deployedValue = DeployedTokens[tokenName];
              const pending = typeof deployedValue === "string" && liveValue !== deployedValue;
              return (
                <div key={tokenName} style={TOKEN_ROW_STYLE}>
                  <div style={{ fontFamily: "monospace", fontWeight: 600, color: INK, fontSize: "0.8rem" }}>
                    {tokenName}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: INK_60, wordBreak: "break-all" }}>
                    {liveValue}
                  </div>
                  <div>
                    {isColorValue(liveValue)
                      ? <div style={{ ...SWATCH_STYLE, background: liveValue }} />
                      : <div style={{ ...SWATCH_STYLE, display: "flex", alignItems: "center", justifyContent: "center", color: INK_60 }}>—</div>}
                  </div>
                  <div>
                    {pending && (
                      <span
                        title={`Deployed site still shows ${deployedValue} until the current build finishes.`}
                        style={{
                          fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em",
                          textTransform: "uppercase", color: "#7a5c00", background: "#fdf6e3",
                          border: "1px solid #e8d9a0", padding: "0.18rem 0.5rem", borderRadius: 3,
                          whiteSpace: "nowrap",
                        }}
                      >
                        pending deploy
                      </span>
                    )}
                  </div>
                  <button
                    style={{ ...btnStyle, padding: "0.4rem 0.9rem", fontSize: "0.78rem" }}
                    onClick={() => setEditingToken(tokenName)}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {editingToken && (
        <TokenEditorModal
          tokenName={editingToken}
          currentValue={liveTokens[editingToken] ?? DeployedTokens[editingToken] ?? ""}
          liveTokens={liveTokens}
          onSaved={handleSaved}
          onCancel={() => setEditingToken(null)}
        />
      )}
    </div>
  );
}
