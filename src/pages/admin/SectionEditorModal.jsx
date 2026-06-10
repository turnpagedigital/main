import React, { useState, Suspense, lazy } from "react";
import { FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";
import SectionEditorFields, { labelStyle, fieldGroup } from "./visualeditor/SectionEditorFields.jsx";

// Lazy-load data-driven editors — only fetched when a shared/page section is opened
const HomeContentTab    = lazy(() => import("./HomeContentTab.jsx"));
const MarketingPagesTab = lazy(() => import("./MarketingPagesTab.jsx"));

/* SectionEditorModal — the "Edit content" overlay in the Page Builder.

   Three modes:
   - situations → embeds HomeContentTab (data lives in home-content.json)
   - damages    → embeds MarketingPagesTab pinned to the AI Copyright store
                  (DamagesSection renders ai-copyright-content.json damagesData)
   - all other types → SectionEditorFields — the SAME per-type forms the
                  visual editor's right rail uses. Content saves into
                  page-compositions.json via "Apply changes".

   Note: audience-cards / service-cards / comparison / how-it-works are
   INLINE types (they render from page-compositions.json section content).
   They previously embedded MarketingPagesTab here, which edited per-page
   content files those sections never read — edits silently did nothing. */

// Types SectionEditorFields has dedicated forms for. Anything else inline
// gets the raw-JSON fallback below (SectionEditorFields still contributes
// its universal Spacing & Height block for those).
const FIELD_EDITOR_TYPES = new Set([
  "hero", "home-hero", "stats-band", "our-edge", "photo-break",
  "cta-banner", "bottom-cta", "get-quote", "cta", "faq", "testimonials",
  "audience-cards", "service-cards", "comparison", "how-it-works",
]);

export default function SectionEditorModal({ section, sectionType, pageKey, onSave, onClose }) {
  const [form, setForm] = useState(JSON.parse(JSON.stringify(section.content || {})));

  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })); }
  function save() { onSave(form); }

  const typeId = section.type;

  // Data-driven sections embed their own full editor — no "Apply/Cancel"
  const isDataDriven = typeId === "situations" || typeId === "damages";

  // Wide modal for embedded data-driven editors; narrow for inline forms
  const modalWidth = isDataDriven ? 900 : 560;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "2rem 1rem", overflowY: "auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: SURFACE, border: `1px solid ${LINE}`, padding: "1.5rem", maxWidth: modalWidth, width: "100%", fontFamily: FONT, color: INK }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
          <h3 style={{ fontWeight: 800, margin: 0 }}>
            Edit: {sectionType ? sectionType.displayName : section.type}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: INK_60, lineHeight: 1 }}>×</button>
        </div>

        {/* ── Situations — embedded HomeContentTab ── */}
        {typeId === "situations" && (
          <Suspense fallback={<div style={{ padding: "2rem", color: INK_60 }}>Loading editor…</div>}>
            <HomeContentTab />
          </Suspense>
        )}

        {/* ── Damages — embedded MarketingPagesTab (AI Copyright store) ── */}
        {typeId === "damages" && (
          <Suspense fallback={<div style={{ padding: "2rem", color: INK_60 }}>Loading editor…</div>}>
            <MarketingPagesTab controlledPage="aiCopyright" />
          </Suspense>
        )}

        {/* ── Inline section editors (shared with the visual editor rail) ── */}
        {!isDataDriven && (
          <>
            <SectionEditorFields typeId={typeId} form={form} set={set} />

            {/* Fallback for unrecognized inline types — raw JSON */}
            {!FIELD_EDITOR_TYPES.has(typeId) && (
              <div style={fieldGroup}>
                <label style={labelStyle}>Section content (JSON)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 220, fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}
                  value={JSON.stringify(form, null, 2)}
                  onChange={e => { try { setForm(JSON.parse(e.target.value)); } catch {} }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: "1.2rem" }}>
              <button style={btnPrimaryStyle} onClick={save}>Apply changes</button>
              <button style={btnStyle} onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {/* Data-driven editors have their own Save buttons — just close */}
        {isDataDriven && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${LINE}` }}>
            <button style={btnStyle} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
