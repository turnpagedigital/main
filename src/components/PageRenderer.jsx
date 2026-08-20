import React from "react";
import pageCompositions from "../data/page-compositions.json";
import { SECTION_MAP } from "./sections/registry.js";
import { INK } from "../data/tokens.js";

/* ── Section spacing & height overrides ─────────────────────────────────
   Stored in section.content._spacing / section.content._minHeight.
   Underscored prefix keeps them separate from section-specific content keys.
   Applied as a wrapper div so no individual section components need changing. */

const SPACING_VALUES = {
  none:    "0px",
  small:   "2rem",
  medium:  "4rem",
  large:   "6rem",
  xlarge:  "10rem",
};

const MIN_HEIGHT_VALUES = {
  auto:  null,
  "50":  "50vh",
  "75":  "75vh",
  "100": "100vh",
};

// section.content._bottomDivider (bool) + ._bottomDividerColor ("gray" |
// "black") — same underscored-wrapper pattern as spacing/height above, so
// any section type gets a bottom rule without its own component changing.
// Deliberately opaque (not the ~8% LINE token used for internal hairlines)
// since this is a visible, intentional divider between sections, not a
// subtle in-section border.
const DIVIDER_COLORS = {
  gray:  "#9CA3AF",
  black: INK,
};

function buildWrapStyle(c) {
  const mt = SPACING_VALUES[c._spacingTop];
  const mb = SPACING_VALUES[c._spacingBottom];
  const mh = MIN_HEIGHT_VALUES[c._minHeight];
  const dividerColor = c._bottomDivider ? (DIVIDER_COLORS[c._bottomDividerColor] || DIVIDER_COLORS.gray) : null;
  const hasSpacing = mt || mb;
  const hasHeight  = mh;
  const hasDivider = !!dividerColor;
  if (!hasSpacing && !hasHeight && !hasDivider) return null;
  // Padding (not margin) so the added space stays inside the wrapper, which
  // adopts the section's own background below — expanded space matches the
  // section instead of exposing the black page body.
  return {
    ...(mt  ? { paddingTop:    mt  } : {}),
    ...(mb  ? { paddingBottom: mb  } : {}),
    ...(mh  ? { minHeight:     mh  } : {}),
    ...(hasDivider ? { borderBottom: `1px solid ${dividerColor}` } : {}),
  };
}

/* Wrapper for a section with spacing/height overrides: after mount, copy the
   section's rendered background onto the wrapper so the padded area is
   indistinguishable from the section itself. */
function SpacedSection({ id, wrapStyle, children }) {
  const ref = React.useRef(null);
  const [bg, setBg] = React.useState(null);
  React.useLayoutEffect(() => {
    const first = ref.current && ref.current.firstElementChild;
    if (!first) return;
    const cs = getComputedStyle(first);
    const style = {};
    if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
      style.backgroundColor = cs.backgroundColor;
    }
    if (cs.backgroundImage && cs.backgroundImage !== "none") {
      style.backgroundImage    = cs.backgroundImage;
      style.backgroundSize     = cs.backgroundSize;
      style.backgroundPosition = cs.backgroundPosition;
      style.backgroundRepeat   = cs.backgroundRepeat;
    }
    if (Object.keys(style).length) setBg(style);
  }, []);
  return (
    <div ref={ref} id={id} style={{ scrollMarginTop: "98px", ...wrapStyle, ...(bg || {}) }}>
      {children}
    </div>
  );
}

/* PageRenderer — renders a page by its composition.
   Usage: <PageRenderer pageKey="home" />
   Reads page-compositions.json, filters visible sections, renders each in order.
   Unknown section types are silently skipped (degrade gracefully). */
export default function PageRenderer({ pageKey }) {
  const page = (pageCompositions.pages || []).find(p => p.pageKey === pageKey);
  if (!page) {
    if (import.meta.env.DEV) {
      console.warn(`[PageRenderer] No composition found for pageKey: "${pageKey}"`);
    }
    return null;
  }

  const visible = (page.sections || []).filter(s => s.visible !== false);

  return (
    <>
      {visible.map(section => {
        const Component = SECTION_MAP[section.type];
        if (!Component) return null;
        const c = section.content || {};
        // Optional spacing/size overrides set in the page builder
        const wrapStyle = buildWrapStyle(c);
        // Use custom bookmark if set, otherwise fall back to section ID.
        // scrollMarginTop keeps anchored sections clear of the fixed nav
        // when a #bookmark link scrolls to them.
        const sectionId = (c._bookmark && c._bookmark.trim()) || section.id;
        if (wrapStyle) {
          return (
            <SpacedSection key={section.id} id={sectionId} wrapStyle={wrapStyle}>
              <Component sectionConfig={section} pageKey={pageKey} />
            </SpacedSection>
          );
        }
        return (
          <div key={section.id} id={sectionId} style={{ scrollMarginTop: "98px" }}>
            <Component sectionConfig={section} pageKey={pageKey} />
          </div>
        );
      })}
    </>
  );
}
