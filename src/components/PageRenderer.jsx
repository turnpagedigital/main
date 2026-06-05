import React from "react";
import pageCompositions from "../data/page-compositions.json";
import { SECTION_MAP } from "./sections/registry.js";

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
        return (
          <Component
            key={section.id}
            sectionConfig={section}
            pageKey={pageKey}
          />
        );
      })}
    </>
  );
}
