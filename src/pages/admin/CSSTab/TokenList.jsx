/**
 * TokenList — Display all global tokens with edit buttons
 */

import React, { useState } from "react";
import * as TokenModule from "../../../data/tokens.js";
import { FONT, INK, INK_60, LINE, NEON } from "../../../data/tokens.js";
import { inputStyle, btnStyle } from "../shared.jsx";
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
  gridTemplateColumns: "120px 1fr 100px 80px",
  gap: "1rem",
  padding: "1rem",
  borderBottom: `1px solid ${LINE}`,
  alignItems: "center",
  fontSize: "0.85rem",
};

const TOKEN_SWATCH_STYLE = {
  width: "40px",
  height: "40px",
  borderRadius: "4px",
  border: `1px solid ${LINE}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function TokenList() {
  const [editingToken, setEditingToken] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const handleEdit = (tokenName) => {
    setEditingToken(tokenName);
    setEditingValue(TokenModule[tokenName] || "");
  };

  const handleSave = async (newValue) => {
    // In Phase 2 of implementation, this will POST to /api/admin/tokens
    // For now, just log and close
    console.log(`Would save token ${editingToken} = ${newValue}`);
    setEditingToken(null);
  };

  const handleCancel = () => {
    setEditingToken(null);
  };

  const renderSwatch = (value) => {
    // Show color swatch for hex/rgb values
    if (!value || (!value.startsWith("#") && !value.startsWith("rgba"))) {
      return <div style={TOKEN_SWATCH_STYLE}>—</div>;
    }
    return (
      <div
        style={{
          ...TOKEN_SWATCH_STYLE,
          background: value,
        }}
      />
    );
  };

  return (
    <div>
      {Object.values(CATEGORIES).map((category) => (
        <div key={category.label} style={{ marginBottom: "2rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "1rem",
              color: INK,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {category.label}
          </h3>

          <div
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <div
              style={{
                ...TOKEN_ROW_STYLE,
                background: "#f9f9f9",
                fontWeight: 600,
                borderBottom: `2px solid ${LINE}`,
                paddingBottom: "0.75rem",
                paddingTop: "0.75rem",
              }}
            >
              <div>Token</div>
              <div>Value</div>
              <div>Swatch</div>
              <div>Action</div>
            </div>

            {/* Token rows */}
            {category.tokens.map((tokenName) => {
              const value = TokenModule[tokenName];
              return (
                <div key={tokenName} style={TOKEN_ROW_STYLE}>
                  <div style={{ fontFamily: "monospace", fontWeight: 600, color: INK }}>
                    {tokenName}
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.78rem",
                      color: INK_60,
                      wordBreak: "break-all",
                    }}
                  >
                    {value}
                  </div>
                  <div>{renderSwatch(value)}</div>
                  <button
                    style={{
                      ...btnStyle,
                      padding: "0.5rem 1rem",
                      fontSize: "0.78rem",
                    }}
                    onClick={() => handleEdit(tokenName)}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Edit modal */}
      {editingToken && (
        <TokenEditorModal
          tokenName={editingToken}
          currentValue={editingValue}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
