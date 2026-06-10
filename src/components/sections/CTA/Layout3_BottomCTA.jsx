import React from "react";
import BottomCTA from "../../BottomCTA.jsx";

/* CTA Layout 3 — Bottom CTA (Dark rounded panel)
   Props: { eyebrow, title, accent, kicker, primary, secondary, colorScheme } */
export default function CTALayout3BottomCTA({
  eyebrow,
  title,
  accent,
  kicker,
  primary,
  secondary = null,
  _colorScheme = "dark",
}) {
  return (
    <BottomCTA
      eyebrow={eyebrow}
      title={title}
      accent={accent}
      kicker={kicker}
      primary={primary}
      secondary={secondary}
    />
  );
}
