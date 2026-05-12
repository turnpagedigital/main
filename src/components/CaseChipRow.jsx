import React from "react";
import { FONT, INK, INK_60 } from "../data/tokens.js";

/* "Cases we cover" chip row — sits under the hero to act as a soft press-row
   substitute. Looks clean on light or dark sections. */
const DEFAULT_CASES = [
  "Bartz v. Anthropic",
  "OpenAI MDL",
  "Concord v. Anthropic",
  "Getty v. Stability",
  "Andersen v. Stability",
  "UMG v. Suno",
  "FTX",
  "Celsius",
  "BlockFi",
  "Voyager",
];

export default function CaseChipRow({
  label = "Cases we cover",
  items = DEFAULT_CASES,
  theme = "light",
}) {
  const isDark = theme === "dark";
  const chipCls = isDark ? "chip-dark" : "chip";
  return (
    <div style={{ textAlign: "center" }}>
      {label && (
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: isDark ? "rgba(255,255,255,0.5)" : INK_60,
          marginBottom: "1.1rem",
        }}>
          {label}
        </p>
      )}
      <div className="chip-row">
        {items.map((it, i) => (
          <span key={i} className={chipCls}>{it}</span>
        ))}
      </div>
    </div>
  );
}
