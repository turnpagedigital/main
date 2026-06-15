import React, { useRef, useState, useEffect } from "react";
import { I18nProvider } from "../../../lib/i18n.js";
import { SECTION_MAP } from "../../../components/sections/registry.js";
import { FONT, INK_60, NEON } from "../../../data/tokens.js";
import PreviewFrame from "./PreviewFrame.jsx";
import SectionFrame from "./SectionFrame.jsx";

/* CenterPreview — live-rendered page preview scaled to simulate a real
   desktop viewport.

   HOW THE SCALE WORKS:
   - The page is rendered at DESKTOP_W (1280 px) — the real desktop width
     that the live site uses.
   - A ResizeObserver watches the outer container and computes:
       scale = containerWidth / DESKTOP_W
   - The inner page div is rendered at DESKTOP_W and CSS-scaled down via
     transform: scale(scale) with transform-origin: top left.
   - The outer clip div height is set to innerHeight * scale so the scaled
     content is fully visible without any gap or overflow. This means the
     whole page is visible in the editor — no scroll needed inside the
     preview itself (the admin page scrolls normally).
   - Clicking any section selects it; clicking the background deselects.  */

const DESKTOP_W  = 1280;
const DESKTOP_H  = 800;   // standard laptop viewport height (16:10)

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
  _pageTitle,
  selectedSectionId,
  onSelectSection,
  sectionTypes,
}) {
  const containerRef = useRef(null);  // outer clip div
  const innerRef     = useRef(null);  // full-width desktop render

  const [containerWidth, setContainerWidth] = useState(600);
  const [innerHeight,    setInnerHeight]    = useState(0);

  // Watch outer container width → recompute scale when editor resizes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Watch inner page height → keep clip div height in sync with scaled content
  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setInnerHeight(entries[0].contentRect.height);
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [sections]);  // re-observe when sections change (new section added etc.)

  const scale = containerWidth > 0 ? containerWidth / DESKTOP_W : 1;
  const clipHeight = innerHeight > 0 ? Math.ceil(innerHeight * scale) : Math.ceil(DESKTOP_H * scale);

  const allSections = sections || [];

  function labelFor(type) {
    const st = (sectionTypes || []).find(t => t.id === type);
    return st ? st.displayName : type;
  }

  return (
    <PreviewFrame path={pagePath}>
      {/* Outer clip — sized exactly to the scaled content height */}
      <div
        ref={containerRef}
        onClick={() => onSelectSection(null)}
        style={{
          width: "100%",
          height: clipHeight,
          position: "relative",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        {/* Inner page at full desktop width, scaled to fit */}
        <div
          ref={innerRef}
          style={{
            width: DESKTOP_W,
            position: "absolute",
            top: 0,
            left: 0,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          <I18nProvider>
            {allSections.length === 0 ? (
              <div style={{
                padding: "10rem 4rem",
                textAlign: "center",
                fontFamily: FONT,
                color: INK_60,
              }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>
                  No sections yet
                </div>
                <div style={{ fontSize: "1.1rem" }}>
                  Click{" "}
                  <span style={{ color: NEON, fontWeight: 700 }}>+ Add section</span>
                  {" "}above to start building this page.
                </div>
              </div>
            ) : (
              allSections.map(s => {
                const isHidden = s.visible === false;
                const Component = SECTION_MAP[s.type];
                const inner = !Component ? (
                  <div style={{ padding: "2rem", background: "#fff8e8", color: "#a06000", fontFamily: "monospace", fontSize: "0.9rem" }}>
                    Unknown section type "{s.type}"
                  </div>
                ) : (
                  <SectionBoundary type={s.type}>
                    <Component sectionConfig={s} pageKey={pageKey} />
                  </SectionBoundary>
                );
                return (
                  <SectionFrame
                    key={s.id}
                    sectionId={s.id}
                    sectionLabel={labelFor(s.type) + (isHidden ? " (hidden)" : "")}
                    isSelected={s.id === selectedSectionId}
                    onSelect={onSelectSection}
                  >
                    <div style={{ position: "relative" }}>
                      {isHidden && (
                        <div style={{
                          position: "absolute",
                          top: 0, left: 0, right: 0,
                          background: "rgba(0,0,0,0.65)",
                          color: "#fff",
                          fontFamily: FONT,
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "5px 12px",
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                          zIndex: 5,
                          pointerEvents: "none",
                        }}>
                          Hidden — click to select, then click "Show"
                        </div>
                      )}
                      <div style={{ opacity: isHidden ? 0.35 : 1 }}>
                        {inner}
                      </div>
                    </div>
                  </SectionFrame>
                );
              })
            )}
          </I18nProvider>
        </div>
      </div>
    </PreviewFrame>
  );
}
