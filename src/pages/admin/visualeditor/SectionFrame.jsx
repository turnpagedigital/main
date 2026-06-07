import React, { useState } from "react";
import { NEON, FONT, INK, INK_60 } from "../../../data/tokens.js";

/* SectionFrame — wraps a rendered section with hover/select highlighting.
   The inner content is rendered with pointer-events:none so the user's
   clicks on real buttons/links don't navigate. A transparent overlay
   on top captures clicks and forwards them to onSelect. */
export default function SectionFrame({
  sectionId,
  sectionLabel,
  isSelected,
  onSelect,
  children,
}) {
  const [hovered, setHovered] = useState(false);

  const outlineColor = isSelected ? NEON : (hovered ? "rgba(212,255,0,0.55)" : "transparent");
  const outlineWidth = isSelected ? 2 : (hovered ? 2 : 0);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        outline: `${outlineWidth}px solid ${outlineColor}`,
        outlineOffset: -outlineWidth,
        transition: "outline-color 0.1s",
      }}
    >
      {/* Section label tag — shows on hover/select at top-left */}
      {(hovered || isSelected) && sectionLabel && (
        <div style={{
          position: "absolute",
          top: 0, left: 0,
          background: isSelected ? NEON : "rgba(212,255,0,0.85)",
          color: INK,
          fontFamily: FONT,
          fontSize: "0.7rem",
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "0.2rem 0.55rem",
          zIndex: 11,
          pointerEvents: "none",
          borderBottomRightRadius: 3,
        }}>
          {sectionLabel}
        </div>
      )}

      {/* Real content — pointer-events disabled so links/buttons don't fire */}
      <div style={{ pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>

      {/* Transparent click overlay */}
      <div
        onClick={e => { e.stopPropagation(); onSelect(sectionId); }}
        style={{
          position: "absolute",
          inset: 0,
          cursor: "pointer",
          zIndex: 10,
        }}
      />
    </div>
  );
}
