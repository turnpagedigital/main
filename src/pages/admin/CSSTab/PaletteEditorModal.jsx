/**
 * PaletteEditorModal — Modal for editing a palette scheme's token assignments
 */

import React, { useState } from "react";
import { SECTION_PALETTES, resolvePaletteTokens } from "../../../lib/palette-resolver.js";
import * as TokenModule from "../../../data/tokens.js";
import { FONT, INK, INK_60, LINE, NEON } from "../../../data/tokens.js";
import { inputStyle, btnPrimaryStyle, btnStyle, selectStyle } from "../shared.jsx";

const MODAL_OVERLAY = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  overflowY: "auto",
  padding: "2rem",
};

const MODAL_BOX = {
  background: "#fff",
  borderRadius: "8px",
  padding: "2rem",
  maxWidth: "600px",
  width: "100%",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  fontFamily: FONT,
};

// Get all available token names
const AVAILABLE_TOKENS = Object.keys(TokenModule).filter(
  (key) => !key.startsWith("_") && typeof TokenModule[key] === "string"
);

export default function PaletteEditorModal({ sectionType, schemeId, onSave, onCancel }) {
  const section = SECTION_PALETTES[sectionType];
  const scheme = section.schemes[schemeId];

  const [tokens, setTokens] = useState({ ...scheme.tokens });
  const [saving, setSaving] = useState(false);

  const handleTokenChange = (key, value) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(sectionType, schemeId, tokens);
    } finally {
      setSaving(false);
    }
  };

  // Resolve current tokens to show color preview
  const resolvedColors = resolvePaletteTokens(sectionType, schemeId);

  return (
    <div style={MODAL_OVERLAY} onClick={onCancel}>
      <div style={MODAL_BOX} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1.2rem", fontWeight: 700 }}>
          Edit Palette: {scheme.displayName}
        </h2>
        <p style={{ marginBottom: "1.5rem", color: INK_60, fontSize: "0.85rem" }}>
          {section.displayName} → {scheme.description}
        </p>

        {/* Token assignments */}
        <div style={{ maxHeight: "60vh", overflowY: "auto", marginBottom: "1.5rem" }}>
          {Object.entries(tokens).map(([key, value]) => {
            const resolvedColor = resolvedColors[key];
            const isColor =
              resolvedColor && (resolvedColor.startsWith("#") || resolvedColor.startsWith("rgba"));

            return (
              <div
                key={key}
                style={{
                  marginBottom: "1.5rem",
                  paddingBottom: "1.5rem",
                  borderBottom: `1px solid ${LINE}`,
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: INK,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {key}
                </label>

                {/* Dropdown to select token */}
                <select
                  value={value}
                  onChange={(e) => handleTokenChange(key, e.target.value)}
                  style={{
                    ...selectStyle,
                    width: "100%",
                    marginBottom: "0.5rem",
                  }}
                >
                  <option value="">-- Select a token --</option>
                  {AVAILABLE_TOKENS.map((tokenName) => (
                    <option key={tokenName} value={tokenName}>
                      {tokenName}
                    </option>
                  ))}
                </select>

                {/* Or custom hex */}
                <input
                  type="text"
                  value={value && !AVAILABLE_TOKENS.includes(value) ? value : ""}
                  onChange={(e) => handleTokenChange(key, e.target.value)}
                  placeholder="#000000 or rgba(...)"
                  style={{
                    ...inputStyle,
                    width: "100%",
                    fontSize: "0.78rem",
                    fontFamily: "monospace",
                  }}
                />

                {/* Color preview */}
                {isColor && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      width: "100%",
                      height: "36px",
                      borderRadius: "4px",
                      background: resolvedColor,
                      border: `1px solid ${LINE}`,
                    }}
                  />
                )}

                <p style={{ fontSize: "0.72rem", color: INK_60, margin: "0.5rem 0 0 0" }}>
                  Resolves to: {resolvedColor}
                </p>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button style={btnStyle} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            style={{ ...btnPrimaryStyle, ...btnStyle }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Palette"}
          </button>
        </div>

        <p style={{ marginTop: "1rem", fontSize: "0.72rem", color: INK_60 }}>
          Changes will update section-palettes.json and be committed to GitHub.
        </p>
      </div>
    </div>
  );
}
