import React from "react";
import pageCompositions from "../data/page-compositions.json";
import { SECTION_MAP } from "./sections/registry.js";

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

function buildWrapStyle(c) {
  const mt = SPACING_VALUES[c._spacingTop];
  const mb = SPACING_VALUES[c._spacingBottom];
  const mh = MIN_HEIGHT_VALUES[c._minHeight];
  const hasSpacing = mt || mb;
  const hasHeight  = mh;
  if (!hasSpacing && !hasHeight) return null;
  return {
    ...(mt  ? { marginTop:    mt  } : {}),
    ...(mb  ? { marginBottom: mb  } : {}),
    ...(mh  ? { minHeight:    mh  } : {}),
  };
}

/* PageRenderer — renders a page by its composition.
   Usage: <PageRenderer pageKey="home" />
   Reads page-compositions.json, filters visible sections, renders each in order.
   Unknown section types are silently skipped (degrade gracefully). */
export default function PageRenderer({ pageKey }) {
  const page = (pageCompositions.pages || []).find(p => p.pageKey === pageKey);
  if (!page) {
    if (process.env.NODE_ENV !== "production") {
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
        return (
          <div key={section.id} id={section.id} style={wrapStyle || undefined}>
            <Component sectionConfig={section} pageKey={pageKey} />
          </div>
        );
      })}
    </>
  );
}
