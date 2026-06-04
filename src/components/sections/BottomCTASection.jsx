import React from "react";
import BottomCTA from "../BottomCTA.jsx";

/* Standard bottom-of-page CTA panel. Content from sectionConfig.content. */
export default function BottomCTASection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  return (
    <BottomCTA
      eyebrow={c.eyebrow}
      title={c.title}
      accent={c.accent}
      kicker={c.kicker}
      primary={c.primary}
      secondary={c.secondary || null}
    />
  );
}
