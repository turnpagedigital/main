import React from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../../data/tokens.js";

/* PropertyPanel — right-rail container for editing the selected section.
   Phase 1+2 stub: shows breadcrumb + selected section type + a sections
   outline list (click to jump). Phase 3 fills it with the actual forms
   extracted from SectionEditorModal. */

export default function PropertyPanel({
  pageTitle,
  selectedSection,
  sectionTypeDef,
  sections,
  selectedSectionId,
  onSelectSection,
}) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${LINE}`,
      borderRadius: 6,
      overflow: "hidden",
      fontFamily: FONT,
      color: INK,
      height: "fit-content",
      position: "sticky",
      top: 0,
    }}>
      {/* Breadcrumb header */}
      <div style={{
        padding: "0.75rem 0.95rem",
        borderBottom: `1px solid ${LINE}`,
        background: "#FAFAFB",
      }}>
        <div style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: INK_60,
          marginBottom: 2,
        }}>
          {pageTitle || "—"}
        </div>
        <div style={{ fontSize: "0.92rem", fontWeight: 800 }}>
          {selectedSection
            ? (sectionTypeDef ? sectionTypeDef.displayName : selectedSection.type)
            : "Pick a section"}
        </div>
        {!selectedSection && (
          <div style={{ fontSize: "0.74rem", color: INK_60, marginTop: 3 }}>
            Click any section in the preview to edit it.
          </div>
        )}
      </div>

      {/* Phase 1+2: outline list — Phase 3 swaps this for the property form */}
      <div style={{ padding: "0.65rem" }}>
        <div style={{
          fontSize: "0.65rem",
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: INK_60,
          marginBottom: "0.45rem",
          padding: "0 0.3rem",
        }}>
          Sections on this page
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {(sections || []).map(s => {
            const isSel = s.id === selectedSectionId;
            const hidden = s.visible === false;
            return (
              <button
                key={s.id}
                onClick={() => onSelectSection(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: isSel ? "rgba(212,255,0,0.12)" : "transparent",
                  border: `1px solid ${isSel ? NEON : "transparent"}`,
                  borderRadius: 3,
                  padding: "0.4rem 0.55rem",
                  fontFamily: FONT,
                  fontSize: "0.78rem",
                  fontWeight: isSel ? 700 : 500,
                  color: INK,
                  cursor: "pointer",
                  textAlign: "left",
                  opacity: hidden ? 0.5 : 1,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: hidden ? "#9CA3AF" : (isSel ? NEON : "#D1D5DB"),
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1 }}>{s.type}</span>
                {hidden && (
                  <span style={{ fontSize: "0.62rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Hidden
                  </span>
                )}
              </button>
            );
          })}
          {(sections || []).length === 0 && (
            <div style={{ fontSize: "0.75rem", color: INK_60, padding: "0.6rem 0.55rem" }}>
              No sections yet.
            </div>
          )}
        </div>
      </div>

      {selectedSection && (
        <div style={{
          padding: "0.85rem 0.95rem",
          borderTop: `1px solid ${LINE}`,
          background: "#FAFAFB",
          fontSize: "0.78rem",
          color: INK_60,
        }}>
          Properties panel coming in Phase 3 — for now, use{" "}
          <strong style={{ color: INK }}>Edit content</strong>{" "}
          in the top toolbar to edit this section.
        </div>
      )}
    </div>
  );
}
