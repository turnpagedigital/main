/**
 * TokenEditorModal — edit one design token with live preview.
 *
 * Validation mirrors the server (functions/api/admin/tokens.js): no quotes,
 * backslashes, or line breaks; color tokens must stay valid colors. The
 * preview panes render representative site surfaces using ALL live tokens
 * with the edited one overridden, so you see the change in context before
 * committing. Saving PUTs to /api/admin/tokens (commits to GitHub).
 */

import React, { useState } from "react";
import { FONT, INK, INK_60, LINE, ERROR_BG, ERROR_TEXT } from "../../../data/tokens.js";
import { inputStyle, btnPrimaryStyle, btnStyle } from "../shared.jsx";

const MODAL_OVERLAY = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: "2rem", overflowY: "auto",
};

const MODAL_BOX = {
  background: "#fff", borderRadius: "8px", padding: "2rem",
  maxWidth: "560px", width: "100%",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)", fontFamily: FONT,
};

/* ── Color helpers (mirror server-side rules) ────────────────────────────── */

function isValidCssColor(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) return true;
  return /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+|1\.0+)\s*)?\)$/.test(s);
}

function validateClientSide(currentValue, newValue) {
  if (!newValue || !newValue.trim()) return "Value can't be empty";
  if (newValue.length > 120) return "Value too long (max 120 characters)";
  if (/["\\\r\n]/.test(newValue)) return "No quotes, backslashes, or line breaks";
  const currentIsColor = typeof currentValue === "string" &&
    (currentValue.startsWith("#") || /^rgba?\(/.test(currentValue));
  if (currentIsColor && !isValidCssColor(newValue)) {
    return "This is a color token — use a hex color like #D4FF00 or rgba(…)";
  }
  return "";
}

/* Parse a color to [r,g,b,alpha] or null. */
function parseColor(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  let m = /^#([0-9a-fA-F]{6})$/.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  m = /^#([0-9a-fA-F]{3})$/.exec(s);
  if (m) {
    const [r, g, b] = m[1].split("").map(c => parseInt(c + c, 16));
    return [r, g, b, 1];
  }
  m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  return null;
}

function luminance([r, g, b]) {
  const lin = c => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(rgb1), l2 = luminance(rgb2);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* Convert to a 6-digit hex for the native color input, if possible. */
function toHex6(v) {
  const rgba = parseColor(v);
  if (!rgba || rgba[3] !== 1) return null;
  return "#" + rgba.slice(0, 3).map(c => c.toString(16).padStart(2, "0")).join("");
}

/* ── Preview panes — representative site surfaces ────────────────────────── */

function PreviewPanes({ t }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.9rem" }}>
      {/* Dark surface (hero / footer / CTA) */}
      <div style={{ background: t.DARK, border: `1px solid ${t.DARK_BORDER}`, borderRadius: 6, padding: "0.9rem" }}>
        <p style={{ fontFamily: FONT, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: t.NEON, margin: "0 0 0.4rem" }}>Eyebrow</p>
        <p style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: t.TEXT, margin: "0 0 0.3rem" }}>Dark surface</p>
        <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: t.MUTED, margin: "0 0 0.6rem" }}>Body copy on dark.</p>
        <span style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 800, background: t.NEON, color: "#000", padding: "0.3rem 0.7rem", borderRadius: 3 }}>Button</span>
      </div>
      {/* Light surface (subpage body) */}
      <div style={{ background: t.PAPER, borderRadius: 6, padding: "0.9rem" }}>
        <div style={{ background: t.SURFACE, border: `1px solid ${t.LINE}`, borderRadius: 4, padding: "0.7rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, color: t.INK, margin: "0 0 0.3rem" }}>Light card</p>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: t.INK_60, margin: 0 }}>Body copy on light.</p>
        </div>
        <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.55rem", flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, background: t.ERROR_BG, color: t.ERROR_TEXT, padding: "0.15rem 0.45rem", borderRadius: 3 }}>Error</span>
          <span style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, background: t.WARNING_BG, color: t.WARNING, padding: "0.15rem 0.45rem", borderRadius: 3 }}>Warning</span>
          <span style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, background: t.SUCCESS_BG, color: t.SUCCESS, padding: "0.15rem 0.45rem", borderRadius: 3 }}>Success</span>
        </div>
      </div>
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */

export default function TokenEditorModal({ tokenName, currentValue, liveTokens, onSaved, onCancel }) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const validationError = validateClientSide(currentValue, value);
  const previewTokens = { ...liveTokens, [tokenName]: value };
  const rgba = isValidCssColor(value) ? parseColor(value) : null;
  const hex6 = toHex6(value);

  const handleSave = async () => {
    if (validationError) return;
    setSaving(true); setSaveError("");
    try {
      const r = await fetch("/api/admin/tokens", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tokenName, value: value.trim() }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      onSaved(tokenName, value.trim());
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
          Edit <span style={{ fontFamily: "monospace" }}>{tokenName}</span>
        </h2>
        <p style={{ marginBottom: "1.1rem", color: INK_60, fontSize: "0.8rem" }}>
          Current: <code style={{ fontSize: "0.78rem" }}>{currentValue}</code>
        </p>

        {/* Live preview using all tokens with this one overridden */}
        <PreviewPanes t={previewTokens} />

        {/* Inputs */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.5rem" }}>
          {hex6 && (
            <input
              type="color"
              value={hex6}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              style={{ width: 44, height: 38, padding: 2, border: `1px solid ${LINE}`, borderRadius: 4, cursor: "pointer", background: "#fff" }}
              aria-label="Pick color"
            />
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#D4FF00 or rgba(10,10,10,0.6)"
            style={{ ...inputStyle, marginTop: 0, flex: 1, fontFamily: "monospace" }}
          />
        </div>

        {/* Validation + contrast hints */}
        {validationError && value !== currentValue && (
          <p style={{ fontSize: "0.75rem", color: ERROR_TEXT, background: ERROR_BG, padding: "0.4rem 0.6rem", borderRadius: 3, margin: "0 0 0.6rem" }}>
            {validationError}
          </p>
        )}
        {rgba && rgba[3] === 1 && (
          <p style={{ fontSize: "0.72rem", color: INK_60, margin: "0 0 0.9rem" }}>
            Contrast — on black: <strong>{contrastRatio(rgba, [0, 0, 0]).toFixed(1)}:1</strong>
            {contrastRatio(rgba, [0, 0, 0]) < 4.5 ? " ⚠" : " ✓"}
            {" · "}on white: <strong>{contrastRatio(rgba, [255, 255, 255]).toFixed(1)}:1</strong>
            {contrastRatio(rgba, [255, 255, 255]) < 4.5 ? " ⚠" : " ✓"}
            <span style={{ marginLeft: "0.4rem" }}>(4.5:1+ needed for readable text)</span>
          </p>
        )}

        {saveError && (
          <p style={{ fontSize: "0.78rem", color: ERROR_TEXT, background: ERROR_BG, padding: "0.5rem 0.7rem", borderRadius: 3, margin: "0 0 0.9rem" }}>
            {saveError}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.7rem", justifyContent: "flex-end", alignItems: "center" }}>
          <button style={btnStyle} onClick={onCancel} disabled={saving}>Cancel</button>
          <button
            style={{
              ...btnPrimaryStyle,
              opacity: (saving || !!validationError || value === currentValue) ? 0.5 : 1,
              cursor: (saving || !!validationError || value === currentValue) ? "default" : "pointer",
            }}
            onClick={handleSave}
            disabled={saving || !!validationError || value === currentValue}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <p style={{ marginTop: "0.9rem", fontSize: "0.7rem", color: INK_60 }}>
          Saving commits to GitHub; the live site rebuilds and updates in ~1–2 minutes.
        </p>
      </div>
    </div>
  );
}
