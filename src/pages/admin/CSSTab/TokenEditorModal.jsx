/**
 * TokenEditorModal — Modal for editing a single token value
 */

import React, { useState } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../../data/tokens.js";
import { inputStyle, btnPrimaryStyle, btnStyle } from "../shared.jsx";

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
};

const MODAL_BOX = {
  background: "#fff",
  borderRadius: "8px",
  padding: "2rem",
  maxWidth: "400px",
  width: "90%",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  fontFamily: FONT,
};

export default function TokenEditorModal({ tokenName, currentValue, onSave, onCancel }) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/tokens", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tokenName, value }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await onSave(value);
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Simple color preview
  const isColor = value && (value.startsWith("#") || value.startsWith("rgba"));
  const previewColor = isColor ? value : null;

  return (
    <div style={MODAL_OVERLAY} onClick={onCancel}>
      <div style={MODAL_BOX} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1.2rem", fontWeight: 700 }}>
          Edit {tokenName}
        </h2>
        <p style={{ marginBottom: "1.5rem", color: INK_60, fontSize: "0.85rem" }}>
          Enter a hex color (e.g., #D4FF00) or RGB/RGBA value
        </p>

        {/* Color preview */}
        {previewColor && (
          <div
            style={{
              width: "100%",
              height: "60px",
              borderRadius: "4px",
              background: previewColor,
              border: `2px solid ${LINE}`,
              marginBottom: "1rem",
            }}
          />
        )}

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="#D4FF00"
          style={{
            ...inputStyle,
            width: "100%",
            marginBottom: "1.5rem",
            fontFamily: "monospace",
          }}
        />

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
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Note */}
        <p style={{ marginTop: "1rem", fontSize: "0.72rem", color: INK_60 }}>
          Note: Changes will be committed to GitHub. This will take a moment.
        </p>
      </div>
    </div>
  );
}
