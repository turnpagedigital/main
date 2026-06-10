/**
 * PaletteSelector — section color schemes, loaded live and actually editable.
 *
 * Loads section-palettes.json and tokens.js from the repo (not the deployed
 * bundle) so edits show their saved state immediately. Swatches are resolved
 * through resolve-scheme against the live token values. These palettes drive
 * the real rendering of FAQ / Testimonials / CTA sections — editing here
 * changes the live site after the next deploy (~1–2 min).
 */

import React, { useState, useEffect, useCallback } from "react";
import * as DeployedTokens from "../../../data/tokens.js";
import { INK, INK_60, LINE, SUCCESS_BG, SUCCESS } from "../../../data/tokens.js";
import { resolveScheme } from "../../../lib/resolve-scheme.js";
import { btnStyle, CenteredMessage, ErrorBanner } from "../shared.jsx";
import PaletteEditorModal from "./PaletteEditorModal.jsx";

const SECTION_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "1.5rem",
  marginBottom: "2rem",
  alignItems: "start",
};

const SECTION_CARD = {
  border: `1px solid ${LINE}`,
  borderRadius: "8px",
  padding: "1.25rem",
  background: "#fff",
};

function isColorValue(v) {
  return typeof v === "string" && (v.startsWith("#") || v.startsWith("rgba") || v.startsWith("rgb("));
}

export default function PaletteSelector() {
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [palettes, setPalettes] = useState(null);   // live section-palettes.json
  const [liveTokens, setLiveTokens] = useState({}); // live token values for resolution
  const [editing, setEditing] = useState(null);     // { sectionType, schemeId }
  const [savedBanner, setSavedBanner] = useState("");

  const load = useCallback(async () => {
    setPhase("loading"); setError("");
    try {
      const [pr, tr] = await Promise.all([
        fetch("/api/admin/section-palettes", { credentials: "include" }),
        fetch("/api/admin/tokens", { credentials: "include" }),
      ]);
      if (pr.status === 401) return;
      const pBody = await pr.json();
      if (!pr.ok || !pBody.ok) throw new Error(pBody.error || `HTTP ${pr.status}`);
      // tokens fetch is best-effort — fall back to deployed values
      let tokenMap = { ...DeployedTokens };
      try {
        const tBody = await tr.json();
        if (tr.ok && tBody.ok && tBody.data) tokenMap = { ...DeployedTokens, ...tBody.data };
      } catch { /* deployed fallback is fine */ }
      const { _comment, ...sections } = pBody.data || {};
      setPalettes(sections);
      setLiveTokens(tokenMap);
      setPhase("ready");
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(sectionType, schemeId, newTokens) {
    setPalettes(prev => ({
      ...prev,
      [sectionType]: {
        ...prev[sectionType],
        schemes: {
          ...prev[sectionType].schemes,
          [schemeId]: { ...prev[sectionType].schemes[schemeId], tokens: newTokens },
        },
      },
    }));
    setEditing(null);
    setSavedBanner(`${sectionType} / ${schemeId} saved — the live site updates in ~1–2 minutes.`);
  }

  if (phase === "loading") return <CenteredMessage>Loading section palettes…</CenteredMessage>;
  if (phase === "error" && palettes === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (palettes === null) return null;

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

      <p style={{ marginBottom: "1.5rem", color: INK_60, fontSize: "0.85rem" }}>
        These schemes drive the FAQ, Testimonials, and CTA sections on the live site.
        Slot values are either a design token (so token edits cascade here automatically) or a custom color.
        Cards-style sections (Who We Help, What We Offer, Why Turnpage, How It Works) still use fixed styling.
      </p>

      <div style={SECTION_GRID}>
        {Object.values(palettes).map((section) => (
          <div key={section.id} style={SECTION_CARD}>
            <div style={{ paddingBottom: "0.85rem", borderBottom: `1px solid ${LINE}`, marginBottom: "0.85rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.2rem", color: INK }}>
                {section.displayName}
              </h3>
              <p style={{ fontSize: "0.75rem", color: INK_60, margin: 0 }}>
                {section.description}
              </p>
            </div>

            {Object.values(section.schemes || {}).map((scheme) => {
              const resolved = resolveScheme(scheme.tokens, liveTokens);
              const swatchEntries = Object.entries(resolved).filter(([, v]) => isColorValue(v)).slice(0, 6);
              return (
                <div key={scheme.id} style={{
                  padding: "0.75rem 0",
                  borderBottom: `1px solid ${LINE}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.15rem" }}>
                      {scheme.displayName}
                    </div>
                    {scheme.description && (
                      <div style={{ fontSize: "0.7rem", color: INK_60, marginBottom: "0.4rem" }}>
                        {scheme.description}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {swatchEntries.map(([slot, color]) => (
                        <div
                          key={slot}
                          title={`${slot}: ${color}`}
                          style={{
                            width: 22, height: 22, borderRadius: 3,
                            background: color, border: `1px solid ${LINE}`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    style={{ ...btnStyle, padding: "0.4rem 0.9rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                    onClick={() => setEditing({ sectionType: section.id, schemeId: scheme.id })}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {editing && (
        <PaletteEditorModal
          section={palettes[editing.sectionType]}
          scheme={palettes[editing.sectionType].schemes[editing.schemeId]}
          sectionType={editing.sectionType}
          schemeId={editing.schemeId}
          liveTokens={liveTokens}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
