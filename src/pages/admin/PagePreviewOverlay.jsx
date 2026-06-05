import React from "react";
import { I18nProvider } from "../../lib/i18n.js";
import { SECTION_MAP } from "../../components/sections/registry.js";
import { FONT, NEON } from "../../data/tokens.js";

/* PagePreviewOverlay — full-screen preview of a page's current (possibly
   unsaved) section layout, rendered with the same components the live site
   uses. Only the page BODY (sections) is shown; the site header/footer are
   managed elsewhere. Each section is isolated by an error boundary so one
   broken section degrades to a notice instead of blanking the whole preview. */

class SectionBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: "1.25rem 1.5rem", background: "#2a0d0d", color: "#ffb3b3", fontFamily: "monospace", fontSize: "0.8rem" }}>
          Section "{this.props.type}" couldn't render in preview: {String(this.state.err.message || this.state.err)}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PagePreviewOverlay({ sections, pageKey, title, onClose }) {
  const visible = (sections || []).filter(s => s.visible !== false);

  // Close on Escape
  React.useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#06070A", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "0.6rem 1rem", background: "#0A0B0E", borderBottom: "1px solid rgba(255,255,255,0.12)",
        color: "#fff", fontFamily: FONT,
      }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Preview — {title}
          <span style={{ fontWeight: 400, opacity: 0.55, marginLeft: 8, fontSize: "0.76rem" }}>showing unsaved changes · page body only</span>
        </div>
        <button
          onClick={onClose}
          style={{ flexShrink: 0, fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "#06070A", background: NEON, border: "none", padding: "0.45rem 1.1rem", cursor: "pointer" }}
        >
          Close preview
        </button>
      </div>

      {/* Rendered page body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <I18nProvider>
          {visible.length === 0 ? (
            <div style={{ padding: "4rem 1rem", textAlign: "center", color: "rgba(255,255,255,0.5)", fontFamily: FONT, fontSize: "0.9rem" }}>
              No visible sections to preview. Add a section or toggle one to “Visible.”
            </div>
          ) : (
            visible.map(section => {
              const Component = SECTION_MAP[section.type];
              if (!Component) {
                return (
                  <div key={section.id} style={{ padding: "1rem 1.5rem", background: "#15171c", color: "rgba(255,255,255,0.5)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                    Unknown section type: {section.type}
                  </div>
                );
              }
              return (
                <SectionBoundary key={section.id} type={section.type}>
                  <Component sectionConfig={section} pageKey={pageKey} />
                </SectionBoundary>
              );
            })
          )}
        </I18nProvider>
      </div>
    </div>
  );
}
