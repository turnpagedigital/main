import React, { useState, useEffect } from "react";
import { FONT, INK, INK_60, LINE, LINE_STRONG, NEON } from "../../../data/tokens.js";
import { btnStyle, btnPrimaryStyle, iconBtnStyle } from "../shared.jsx";
import SectionEditorFields from "./SectionEditorFields.jsx";

/* PropertyPanel — right-rail live editor.
   Two modes:
   • Browse  (no section selected): shows the sections outline.
   • Edit    (section selected): shows the content editor for that section.

   The parent (PageBuilderTab) passes callbacks for all mutations so the
   panel never writes to state directly.  */

export default function PropertyPanel({
  pageTitle,
  selectedSection,
  sectionTypeDef,
  sections,
  selectedSectionId,
  onSelectSection,
  onUpdateContent,   // (sectionId, newContent) → void
  onToggleVisible,   // (index) → void
  onMoveUp,          // (index) → void
  onMoveDown,        // (index) → void
}) {
  // Local form state — reset whenever the selected section changes
  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(selectedSection?.content || {})));
  const [dirty, setDirty] = useState(false);

  const selectedIndex = (sections || []).findIndex(s => s.id === selectedSectionId);

  useEffect(() => {
    setForm(JSON.parse(JSON.stringify(selectedSection?.content || {})));
    setDirty(false);
  }, [selectedSectionId]);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function apply() {
    if (selectedSection) {
      onUpdateContent?.(selectedSection.id, form);
      setDirty(false);
    }
  }

  function discard() {
    setForm(JSON.parse(JSON.stringify(selectedSection?.content || {})));
    setDirty(false);
  }

  function selectSection(id) {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onSelectSection(id);
  }

  const isEditing = !!selectedSection;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${LINE}`,
      borderRadius: 6,
      overflow: "hidden",
      fontFamily: FONT,
      color: INK,
      position: "sticky",
      top: "88px",
      maxHeight: "calc(100vh - 110px)",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "0.75rem 0.95rem",
        borderBottom: `1px solid ${LINE}`,
        background: "#FAFAFB",
        flexShrink: 0,
      }}>
        {isEditing ? (
          <div>
            <button
              onClick={() => selectSection(null)}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: "0.72rem", color: INK_60, padding: 0, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}
            >
              ← {pageTitle || "Pages"}
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "0.92rem", fontWeight: 800 }}>
                {sectionTypeDef ? sectionTypeDef.displayName : selectedSection.type}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => onToggleVisible?.(selectedIndex)} title={selectedSection.visible !== false ? "Hide" : "Show"}
                  style={{ ...iconBtnStyle(false), fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}>
                  {selectedSection.visible !== false ? "Hide" : "Show"}
                </button>
                <button onClick={() => onMoveUp?.(selectedIndex)} disabled={selectedIndex === 0} title="Move up"
                  style={iconBtnStyle(selectedIndex === 0)}>↑</button>
                <button onClick={() => onMoveDown?.(selectedIndex)} disabled={selectedIndex >= (sections||[]).length - 1} title="Move down"
                  style={iconBtnStyle(selectedIndex >= (sections||[]).length - 1)}>↓</button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: INK_60, marginBottom: 2 }}>
              {pageTitle || "—"}
            </div>
            <div style={{ fontSize: "0.92rem", fontWeight: 800 }}>Sections</div>
            <div style={{ fontSize: "0.74rem", color: INK_60, marginTop: 3 }}>Click a section to edit it.</div>
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── Browse mode: sections outline ── */}
        {!isEditing && (
          <div style={{ padding: "0.65rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {(sections || []).map((s, idx) => {
                const hidden = s.visible === false;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectSection(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "transparent",
                      border: `1px solid transparent`,
                      borderRadius: 3, padding: "0.4rem 0.55rem",
                      fontFamily: FONT, fontSize: "0.78rem", fontWeight: 500,
                      color: INK, cursor: "pointer", textAlign: "left",
                      opacity: hidden ? 0.5 : 1,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F4F5F7"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: hidden ? "#9CA3AF" : "#D1D5DB", flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{s.type}</span>
                    {hidden && <span style={{ fontSize: "0.62rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Hidden</span>}
                  </button>
                );
              })}
              {(sections || []).length === 0 && (
                <div style={{ fontSize: "0.75rem", color: INK_60, padding: "0.6rem 0.55rem" }}>No sections yet.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Edit mode: section content editor ── */}
        {isEditing && (
          <div style={{ padding: "1rem 0.95rem" }}>
            <SectionEditorFields typeId={selectedSection.type} form={form} set={set} />

            {/* Fallback for unrecognized types */}
            {!["hero","home-hero","stats-band","our-edge","photo-break","cta-banner","bottom-cta","get-quote","cta","faq","testimonials"].includes(selectedSection.type) && (
              <div>
                <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.5rem" }}>Raw content (no custom editor for this type):</p>
                <textarea
                  style={{ width: "100%", minHeight: 160, fontFamily: "monospace", fontSize: "0.78rem", border: `1px solid ${LINE}`, padding: "0.5rem", boxSizing: "border-box" }}
                  value={JSON.stringify(form, null, 2)}
                  onChange={e => { try { setForm(JSON.parse(e.target.value)); setDirty(true); } catch {} }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky Apply/Discard footer (edit mode only) ── */}
      {isEditing && (
        <div style={{
          flexShrink: 0,
          padding: "0.75rem 0.95rem",
          borderTop: `2px solid ${dirty ? NEON : LINE}`,
          background: "#FAFAFB",
          display: "flex", gap: 8, alignItems: "center",
          transition: "border-color 0.15s",
        }}>
          <button
            style={{ ...btnPrimaryStyle, flex: 1, opacity: dirty ? 1 : 0.45, cursor: dirty ? "pointer" : "default" }}
            onClick={apply}
            disabled={!dirty}
          >
            Apply
          </button>
          <button
            style={{ ...btnStyle, opacity: dirty ? 1 : 0.45, cursor: dirty ? "pointer" : "default" }}
            onClick={discard}
            disabled={!dirty}
          >
            Discard
          </button>
          {dirty && (
            <span style={{ fontSize: "0.68rem", color: "#7a5c00", fontWeight: 700 }}>Unsaved</span>
          )}
        </div>
      )}
    </div>
  );
}
