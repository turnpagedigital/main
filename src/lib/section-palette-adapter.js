/**
 * Adapter to convert SECTION_PALETTES into section-types compatible format
 * This bridges the new palette system with the existing page builder
 */

import { SECTION_PALETTES } from "./palette-resolver.js";

/**
 * Get supported color schemes for a section type
 * Returns array of scheme IDs like ["light", "dark", "light-gray"]
 */
export function getSupportedColorSchemes(sectionType) {
  const section = SECTION_PALETTES[sectionType];
  if (!section || !section.schemes) return ["light"];
  return Object.keys(section.schemes);
}

/**
 * Get a palette scheme's visual properties for the UI
 * Returns { label, swatch, text, border }
 */
export function getPaletteVisuals(sectionType, schemeId) {
  const section = SECTION_PALETTES[sectionType];
  if (!section || !section.schemes) return null;

  const scheme = section.schemes[schemeId];
  if (!scheme) return null;

  // Map scheme background token to a swatch color
  const backgroundToken = scheme.tokens?.background;
  let swatchColor = "#F4F5F7"; // default

  if (backgroundToken === "DARK" || backgroundToken === "#000") {
    swatchColor = "#0A0A0A";
  } else if (backgroundToken === "PAPER" || backgroundToken === "#E5E7EB") {
    swatchColor = "#E5E7EB";
  } else if (backgroundToken === "SURFACE" || backgroundToken === "#FFFFFF") {
    swatchColor = "#FFFFFF";
  } else if (backgroundToken && backgroundToken.startsWith("#")) {
    swatchColor = backgroundToken;
  }

  return {
    label: scheme.displayName,
    swatch: swatchColor,
    text: scheme.tokens?.text === "TEXT" ? "#FFFFFF" : "#0A0A0A",
    border: scheme.tokens?.border === "DARK_BORDER" ? "#333" : "#E0E0E0",
  };
}

/**
 * Check if a section type / scheme combination is valid
 */
export function isValidPaletteScheme(sectionType, schemeId) {
  const section = SECTION_PALETTES[sectionType];
  if (!section) return false;
  return Boolean(section.schemes && section.schemes[schemeId]);
}

/**
 * Get default scheme for a section type
 */
export function getDefaultScheme(sectionType) {
  const section = SECTION_PALETTES[sectionType];
  if (!section) return "light";

  // Prefer "light" if it exists, otherwise first available
  if (section.schemes && section.schemes.light) return "light";
  const schemes = Object.keys(section.schemes || {});
  return schemes[0] || "light";
}
