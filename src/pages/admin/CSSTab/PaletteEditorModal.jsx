/**
 * PaletteEditorModal — edit one scheme's slot assignments against live data.
 *
 * Each slot is either a design token (picked from the dropdown — token edits
 * then cascade automatically) or a custom CSS color. Non-color slots (e.g.
 * headerTheme) are shown as plain text. Saving PUTs the whole scheme to
 * /api/admin/section-palettes (commits to GitHub).
 */

import React, { useState } from "react";
import { FONT, INK, INK_60, LINE, ERROR_BG, ERROR_TEXT } from "../../../data/tokens.js";
import { resolveScheme, isTokenName } from "../../../lib/resolve-scheme.js";
import { inputStyle, btnPrimaryStyle, btnStyle, selectStyle } from "../shared.jsx";

const MODAL_OVERLAY = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, overflowY: "auto", padding: "2rem",
};

const MODAL_BOX = {
  background: "#fff", borderRadius: "8px", padding: "2rem",
  maxWidth: "620px", width: "100%",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)", fontFamily: FONT,
};

const CUSTOM = "__custom__";

function isColorValue(v) {
  return typeof v === "string" && (v.startsWith("#") || v.startsWith("rgba") || v.startsWith("rgb("));
}

export default function PaletteEditorModal({ section, scheme, sectionType, schemeId, liveTokens, onSaved, onCancel }) {
  const [tokens, setTokens] = useState({ ...scheme.tokens });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Token names whose live value is a color — the sensible dropdown choices
  const colorTokenNames = Object.keys(liveTokens)
    .filter(k => /^[A-Z][A-Z0-9_]*$/.test(k) && isColorValue(liveTokens[k]));

  const resolved = resolveScheme(tokens, liveTokens);

  const handleSlotChange = (slot, value) => {
    setTokens(prev => ({ ...prev, [slot]: value }));
  };

  const handleSave = async () => {
    setSaving(true); setSaveError("");
    try {
      const r = await fetch("/api/admin/section-palettes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sectionType, schemeId, tokens }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      onSaved(sectionType, schemeId, tokens);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={MODAL_OVERLAY} onClick={onCancel}>
      <div style={MODAL_BOX} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: "0.35rem", fontSize: "1.15rem", fontWeight: 800 }}>
          {section.displayName} — {scheme.displayName}
        </h2>
        <p style={{ marginBottom: "1.25rem", color: INK_60, fontSize: "0.8rem" }}>
          {scheme.description || "Edit this scheme's color slots."} Pick a design token (recommended —
          token edits cascade automatically) or enter a custom color.
        </p>

        <div style={{ maxHeight: "55vh", overflowY: "auto", marginBottom: "1.25rem" }}>
          {Object.entries(tokens).map(([slot, value]) => {
            const resolvedValue = resolved[slot];
            const isColor = isColorValue(resolvedValue);
            const usingToken = isTokenName(value) && liveTokens[value] !== undefined;
            const nonColorSlot = !isColor && !usingToken;

            return (
              <div key={slot} style={{
                display: "grid",
                gridTemplateColumns: "130px 36px 1fr",
                gap: "0.7rem", alignItems: "center",
                padding: "0.6rem 0",
                borderBottom: `1px solid ${LINE}`,
              }}>
                <label style={{ fontSize: "0.74rem", fontWeight: 700, color: INK, letterSpacing: "0.03em" }}>
                  {slot}
                </label>

                {/* Resolved swatch */}
                {isColor ? (
                  <div title={resolvedValue} style={{ width: 32, height: 28, borderRadius: 4, background: resolvedValue, border: `1px solid ${LINE}` }} />
                ) : (
                  <div style={{ width: 32, height: 28, borderRadius: 4, border: `1px dashed ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: INK_60 }}>txt</div>
                )}

                {/* Editor: token dropdown + custom input */}
                {nonColorSlot ? (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleSlotChange(slot, e.target.value)}
                    style={{ ...inputStyle, marginTop: 0, fontSize: "0.78rem", fontFamily: "monospace" }}
                  />
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", minWidth: 0 }}>
                    <select
                      value={usingToken ? value : CUSTOM}
                      onChange={(e) => {
                        const v = e.target.value;
                        handleSlotChange(slot, v === CUSTOM ? (resolvedValue || "#") : v);
                      }}
                      style={{ ...selectStyle, marginTop: 0, flex: "0 0 150px", fontSize: "0.76rem" }}
                    >
                      <option value={CUSTOM}>Custom…</option>
                      {colorTokenNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {usingToken ? (
                      <span style={{ fontSize: "0.72rem", color: INK_60, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        = {liveTokens[value]}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleSlotChange(slot, e.target.value)}
                        placeholder="#000000 or rgba(…)"
                        style={{ ...inputStyle, marginTop: 0, flex: 1, fontSize: "0.76rem", fontFamily: "monospace" }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {saveError && (
          <p style={{ fontSize: "0.78rem", color: ERROR_TEXT, background: ERROR_BG, padding: "0.5rem 0.7rem", borderRadius: 3, margin: "0 0 0.9rem" }}>
            {saveError}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.7rem", justifyContent: "flex-end" }}>
          <button style={btnStyle} onClick={onCancel} disabled={saving}>Cancel</button>
          <button
            style={{ ...btnPrimaryStyle, opacity: saving ? 0.5 : 1, cursor: saving ? "default" : "pointer" }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Palette"}
          </button>
        </div>

        <p style={{ marginTop: "0.9rem", fontSize: "0.7rem", color: INK_60 }}>
          Saving commits section-palettes.json to GitHub; the live site rebuilds in ~1–2 minutes.
        </p>
      </div>
    </div>
  );
}
