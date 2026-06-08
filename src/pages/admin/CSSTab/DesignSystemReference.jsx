/**
 * DesignSystemReference — Read-only design system documentation
 */

import React from "react";
import * as TokenModule from "../../../data/tokens.js";
import { FONT, INK, INK_60, LINE, NEON, FONT_SIZES, SPACING } from "../../../data/tokens.js";

const CARD_STYLE = {
  border: `1px solid ${LINE}`,
  borderRadius: "8px",
  padding: "1.5rem",
  marginBottom: "1.5rem",
  background: "#f9f9f9",
};

const GRID_2COL = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1rem",
  marginTop: "1rem",
};

export default function DesignSystemReference() {
  // Get all color tokens
  const colorTokens = [
    "NEON",
    "NEON_HOVER",
    "DARK",
    "DARK_CARD",
    "PAPER",
    "PAPER_2",
    "SURFACE",
    "INK",
    "TEXT",
    "ERROR",
    "WARNING",
    "SUCCESS",
  ];

  return (
    <div style={{ fontFamily: FONT }}>
      <p style={{ marginBottom: "2rem", color: INK_60, fontSize: "0.85rem" }}>
        Reference guide for the Turnpage Digital design system. All tokens are exported from{" "}
        <code>src/data/tokens.js</code>.
      </p>

      {/* Color Palette */}
      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
          Color Palette
        </h3>
        <div style={GRID_2COL}>
          {colorTokens.map((tokenName) => {
            const value = TokenModule[tokenName];
            const isColor = value && (value.startsWith("#") || value.startsWith("rgba"));

            return (
              <div key={tokenName} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                {isColor && (
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "4px",
                      background: value,
                      border: `1px solid ${LINE}`,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{tokenName}</div>
                  <div style={{ fontSize: "0.78rem", color: INK_60, fontFamily: "monospace" }}>
                    {value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Typography Scale */}
      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
          Typography Scale
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {Object.entries(FONT_SIZES).map(([key, value]) => (
            <div key={key}>
              <div style={{ fontSize: value, fontWeight: 600, marginBottom: "0.25rem" }}>
                {key}
              </div>
              <div style={{ fontSize: "0.78rem", color: INK_60 }}>
                Font size: <code>{value}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spacing Scale */}
      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
          Spacing Scale
        </h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ borderBottom: `2px solid ${LINE}` }}>
              <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 700 }}>Name</th>
              <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 700 }}>Value</th>
              <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 700 }}>Visual</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SPACING).map(([key, value]) => (
              <tr key={key} style={{ borderBottom: `1px solid ${LINE}` }}>
                <td style={{ padding: "0.75rem", fontFamily: "monospace", fontWeight: 600 }}>
                  {key}
                </td>
                <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>{value}</td>
                <td style={{ padding: "0.75rem" }}>
                  <div
                    style={{
                      width: `calc(${value} * 20)`,
                      height: "4px",
                      background: NEON,
                      borderRadius: "2px",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Design Principles */}
      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
          Design Principles
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.5rem", lineHeight: 1.6, fontSize: "0.9rem" }}>
          <li>
            <strong>Dark + Neon:</strong> Black backgrounds with neon green accents preserve TPDM brand DNA
          </li>
          <li>
            <strong>Light Surfaces:</strong> Cool slate-gray palette (not warm beige) for modern, clean feel
          </li>
          <li>
            <strong>Contrast:</strong> High contrast between text and background for accessibility
          </li>
          <li>
            <strong>Consistency:</strong> All colors referenced via tokens, not hardcoded hex values
          </li>
          <li>
            <strong>Semantic:</strong> Status colors (ERROR, WARNING, SUCCESS) reserved for functional meaning
          </li>
        </ul>
      </div>

      {/* Token Usage Guide */}
      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
          Using Tokens in Code
        </h3>
        <pre
          style={{
            background: "#f0f0f0",
            padding: "1rem",
            borderRadius: "4px",
            fontSize: "0.78rem",
            overflow: "auto",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {`// Import tokens
import { NEON, INK, PAPER, FONT_SIZES } from "src/data/tokens.js";

// Use in styles
const buttonStyle = {
  background: NEON,
  color: "#000",
  padding: SPACING.md,
  fontSize: FONT_SIZES.body,
};

// Import palette resolver for sections
import { resolvePaletteTokens } from "src/lib/palette-resolver.js";

const colors = resolvePaletteTokens("faq", "light");
// → { background: "#E5E7EB", text: "#0A0A0A", ... }`}
        </pre>
      </div>

      {/* Section Palettes Overview */}
      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
          Section Palettes
        </h3>
        <p style={{ fontSize: "0.9rem", marginBottom: "1rem", color: INK_60 }}>
          Each section type (FAQ, Testimonials, CTA, etc.) has pre-defined color schemes. See the{" "}
          <strong>Section Palettes</strong> tab to edit them.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
          <li>
            <strong>Light:</strong> Light gray background, good for subpages
          </li>
          <li>
            <strong>Light Gray:</strong> Darker gray for higher contrast
          </li>
          <li>
            <strong>Light Card:</strong> White cards on light background (Home page style)
          </li>
          <li>
            <strong>Dark:</strong> Black background with white text
          </li>
          <li>
            <strong>Photo:</strong> Full-bleed photo background (CTA sections only)
          </li>
        </ul>
      </div>
    </div>
  );
}
