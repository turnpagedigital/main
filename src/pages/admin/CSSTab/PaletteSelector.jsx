/**
 * PaletteSelector — Grid view of section types and their color schemes
 */

import React, { useState } from "react";
import { SECTION_PALETTES } from "../../../lib/palette-resolver.js";
import { FONT, INK, INK_60, LINE, NEON } from "../../../data/tokens.js";
import { btnStyle } from "../shared.jsx";
import PaletteEditorModal from "./PaletteEditorModal.jsx";

const SECTION_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "1.5rem",
  marginBottom: "2rem",
};

const SECTION_CARD = {
  border: `1px solid ${LINE}`,
  borderRadius: "8px",
  padding: "1.5rem",
  background: "#f9f9f9",
};

const SCHEME_ITEM = {
  padding: "1rem",
  borderBottom: `1px solid ${LINE}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const SWATCH_ROW = {
  display: "flex",
  gap: "0.5rem",
  marginTop: "0.5rem",
};

const SWATCH = {
  width: "24px",
  height: "24px",
  borderRadius: "2px",
  border: `1px solid ${LINE}`,
};

export default function PaletteSelector() {
  const [expandedSection, setExpandedSection] = useState(null);
  const [editingPalette, setEditingPalette] = useState(null);

  const handleEditPalette = (sectionType, schemeId) => {
    setEditingPalette({ sectionType, schemeId });
  };

  const handleSavePalette = (sectionType, schemeId, newTokens) => {
    // In Phase 2 of implementation, this will POST to /api/admin/section-palettes
    console.log(`Would save palette ${sectionType}.${schemeId}`, newTokens);
    setEditingPalette(null);
  };

  return (
    <div>
      <p style={{ marginBottom: "1.5rem", color: INK_60, fontSize: "0.85rem" }}>
        Click a section type to expand and view its color schemes. Click "Edit" to modify token assignments.
      </p>

      <div style={SECTION_GRID}>
        {Object.values(SECTION_PALETTES).map((section) => (
          <div key={section.id} style={SECTION_CARD}>
            <div
              style={{
                cursor: "pointer",
                paddingBottom: "1rem",
                borderBottom: `1px solid ${LINE}`,
                marginBottom: "1rem",
              }}
              onClick={() =>
                setExpandedSection(expandedSection === section.id ? null : section.id)
              }
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.25rem",
                  color: NEON,
                }}
              >
                {section.displayName}
              </h3>
              <p style={{ fontSize: "0.78rem", color: INK_60, margin: 0 }}>
                {section.description}
              </p>
            </div>

            {/* Expanded schemes */}
            {expandedSection === section.id && (
              <div>
                {Object.values(section.schemes).map((scheme) => (
                  <div key={scheme.id} style={SCHEME_ITEM}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                        {scheme.displayName}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: INK_60 }}>
                        {scheme.description}
                      </div>
                      {/* Color swatches preview */}
                      <div style={SWATCH_ROW}>
                        {Object.entries(scheme.tokens || {})
                          .slice(0, 5) // Show first 5 token references
                          .map(([key]) => (
                            <div
                              key={key}
                              style={{
                                ...SWATCH,
                                background: `var(--${key}, #ccc)`,
                                title: key,
                              }}
                            />
                          ))}
                      </div>
                    </div>
                    <button
                      style={{
                        ...btnStyle,
                        padding: "0.5rem 1rem",
                        fontSize: "0.78rem",
                        whiteSpace: "nowrap",
                        marginLeft: "1rem",
                      }}
                      onClick={() => handleEditPalette(section.id, scheme.id)}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editingPalette && (
        <PaletteEditorModal
          sectionType={editingPalette.sectionType}
          schemeId={editingPalette.schemeId}
          onSave={handleSavePalette}
          onCancel={() => setEditingPalette(null)}
        />
      )}
    </div>
  );
}
