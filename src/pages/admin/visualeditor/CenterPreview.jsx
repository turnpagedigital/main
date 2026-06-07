import React from "react";
import { I18nProvider } from "../../../lib/i18n.js";
import { SECTION_MAP } from "../../../components/sections/registry.js";
import { FONT, INK_60, NEON } from "../../../data/tokens.js";
import PreviewFrame from "./PreviewFrame.jsx";
import SectionFrame from "./SectionFrame.jsx";

/* CenterPreview — the live-rendered page that sits in the middle of the
   page editor. Renders every visible section via SECTION_MAP wrapped in
   SectionFrame so clicks select instead of navigate. Same render pipeline
   as PagePreviewOverlay; just instrumented for editing. */

class SectionBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: "1rem 1.25rem", background: "#fff4f4", color: "#a00", fontFamily: "monospace", fontSize: "0.78rem" }}>
          Section "{this.props.type}" couldn't render: {String(this.state.err.message || this.state.err)}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CenterPreview({
  sections,
  pageKey,
  pagePath = "/",
  pageTitle,
  selectedSectionId,
  onSelectSection,
  sectionTypes,
}) {
  const visible = (sections || []).filter(s => s.visible !== false);

  function labelFor(type) {
    const st = (sectionTypes || []).find(t => t.id === type);
    return st ? st.displayName : type;
  }

  return (
    <PreviewFrame path={pagePath}>
      {/* Click on empty preview body deselects */}
      <div
        onClick={() => onSelectSection(null)}
        style={{ minHeight: "100%", background: "#fff" }}
      >
        <I18nProvider>
          {visible.length === 0 ? (
            <div style={{
              padding: "5rem 2rem",
              textAlign: "center",
              fontFamily: FONT,
              color: INK_60,
            }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 6 }}>
                No sections yet
              </div>
              <div style={{ fontSize: "0.85rem" }}>
                Click <span style={{ color: NEON, fontWeight: 700 }}>+ Add section</span> above to start building this page.
              </div>
            </div>
          ) : (
            visible.map(s => {
              const Component = SECTION_MAP[s.type];
              if (!Component) {
                return (
                  <SectionFrame
                    key={s.id}
                    sectionId={s.id}
                    sectionLabel={s.type + " (unknown)"}
                    isSelected={s.id === selectedSectionId}
                    onSelect={onSelectSection}
                  >
                    <div style={{ padding: "1.5rem 1rem", background: "#fff8e8", color: "#a06000", fontFamily: "monospace", fontSize: "0.82rem" }}>
                      Unknown section type "{s.type}"
                    </div>
                  </SectionFrame>
                );
              }
              return (
                <SectionFrame
                  key={s.id}
                  sectionId={s.id}
                  sectionLabel={labelFor(s.type)}
                  isSelected={s.id === selectedSectionId}
                  onSelect={onSelectSection}
                >
                  <SectionBoundary type={s.type}>
                    <Component sectionConfig={s} pageKey={pageKey} />
                  </SectionBoundary>
                </SectionFrame>
              );
            })
          )}
        </I18nProvider>
      </div>
    </PreviewFrame>
  );
}
