/**
 * CSSTab — Centralized design system management
 * Three sub-tabs: Colors (global tokens), Palettes (section schemes), Reference (read-only)
 */

import React, { useState } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnPrimaryStyle, btnStyle } from "./shared.jsx";
import TokenList from "./CSSTab/TokenList.jsx";
import PaletteSelector from "./CSSTab/PaletteSelector.jsx";
import DesignSystemReference from "./CSSTab/DesignSystemReference.jsx";

const TAB_STYLE = {
  padding: "1.5rem",
  borderBottom: `1px solid ${LINE}`,
  display: "flex",
  gap: "1rem",
  marginBottom: "1.5rem",
  flexWrap: "wrap",
};

const TAB_BTN_STYLE = (isActive) => ({
  ...btnStyle,
  ...(isActive ? btnPrimaryStyle : {}),
  padding: "0.75rem 1.5rem",
  fontSize: "0.85rem",
  fontWeight: isActive ? 700 : 600,
  border: "none",
  cursor: "pointer",
});

export default function CSSTab() {
  const [subTab, setSubTab] = useState("colors");

  return (
    <div style={{ padding: "1.5rem", fontFamily: FONT }}>
      <h1 style={{ marginBottom: "0.5rem", fontSize: "1.5rem", fontWeight: 800 }}>
        CSS & Design System
      </h1>
      <p style={{ marginBottom: "1.5rem", color: INK_60, fontSize: "0.85rem" }}>
        Manage global tokens, section color palettes, and design system reference
      </p>

      {/* Sub-tab navigation */}
      <div style={TAB_STYLE}>
        <button style={TAB_BTN_STYLE(subTab === "colors")} onClick={() => setSubTab("colors")}>
          Colors & Tokens
        </button>
        <button style={TAB_BTN_STYLE(subTab === "palettes")} onClick={() => setSubTab("palettes")}>
          Section Palettes
        </button>
        <button style={TAB_BTN_STYLE(subTab === "reference")} onClick={() => setSubTab("reference")}>
          Design System
        </button>
      </div>

      {/* Sub-tab content */}
      {subTab === "colors" && <TokenList />}
      {subTab === "palettes" && <PaletteSelector />}
      {subTab === "reference" && <DesignSystemReference />}
    </div>
  );
}
