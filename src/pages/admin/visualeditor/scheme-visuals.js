/* scheme-visuals — swatch + label for a (sectionType, scheme) pair.
 *
 * For sections whose colors live in section-palettes.json (faq, testimonials,
 * cta) the swatch is the scheme's actual resolved background, so the picker
 * always matches what renders. Sections still styled inline (the cards
 * family: audience-cards, service-cards, comparison, how-it-works) fall back
 * to the static map below — keep it in sync with those components' inline
 * background maps. */

import { SECTION_PALETTES, resolvePaletteTokens } from "../../../lib/palette-resolver.js";

const STATIC_VISUALS = {
  "light":       { label: "White",      swatch: "#FFFFFF", border: "#E0E0E0" },
  "light-gray":  { label: "Light Gray", swatch: "#F4F5F7", border: "#E0E0E0" },
  "light-card":  { label: "Card",       swatch: "#FFFFFF", border: "#E0E0E0" },
  "white":       { label: "White",      swatch: "#FFFFFF", border: "#E0E0E0" },
  "paper":       { label: "Paper",      swatch: "#E5E7EB", border: "#C9CDD3" },
  "paper-2":     { label: "Deep Paper", swatch: "#D5D9DF", border: "#B8BDC5" },
  "charcoal":    { label: "Dark Gray",  swatch: "#242528", border: "#333"    },
  "dark":        { label: "Dark",       swatch: "#0A0A0A", border: "#333"    },
  "neon":        { label: "Neon",       swatch: "#D4FF00", border: "#9DBD00" },
  "photo":       { label: "Photo",      swatch: "linear-gradient(135deg,#6b7280 0%,#374151 100%)", border: "#555" },
};

function isDarkColor(hexOrRgb) {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hexOrRgb || "");
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/**
 * @returns {{ label: string, swatch: string, border: string }}
 */
export function getSchemeVisual(typeId, schemeKey) {
  const scheme = SECTION_PALETTES[typeId]?.schemes?.[schemeKey];
  if (scheme) {
    const resolved = resolvePaletteTokens(typeId, schemeKey);
    const bg = resolved.background;
    const isColor = typeof bg === "string" && (bg.startsWith("#") || bg.startsWith("rgb"));
    if (isColor) {
      return {
        label: scheme.displayName || schemeKey,
        swatch: bg,
        border: isDarkColor(bg) ? "#333" : "#E0E0E0",
      };
    }
  }
  return STATIC_VISUALS[schemeKey] || { label: schemeKey, swatch: "#eee", border: "#ccc" };
}
