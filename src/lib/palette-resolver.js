/**
 * Palette Resolver — Convert token references to actual hex values
 *
 * Each palette scheme specifies which tokens to use (e.g., "NEON", "INK").
 * This utility resolves those token names to their actual hex values.
 * Inline hex values (starting with #) are passed through as-is.
 */

import * as TokenModule from "../data/tokens.js";
import SECTION_PALETTES from "../data/section-palettes.json";

/**
 * Resolve a palette scheme to actual color values
 * @param {string} sectionType - e.g., "faq", "testimonials", "cta"
 * @param {string} schemeId - e.g., "light", "dark", "light-card"
 * @returns {object} Resolved color values, e.g., { background: "#E5E7EB", text: "#0A0A0A", ... }
 */
export function resolvePaletteTokens(sectionType, schemeId) {
  const section = SECTION_PALETTES[sectionType];
  if (!section) {
    console.warn(`Palette resolver: unknown section type "${sectionType}"`);
    return {};
  }

  const scheme = section.schemes[schemeId];
  if (!scheme) {
    console.warn(`Palette resolver: unknown scheme "${schemeId}" for section "${sectionType}"`);
    return {};
  }

  const resolved = {};

  Object.entries(scheme.tokens || {}).forEach(([key, val]) => {
    if (typeof val !== "string") {
      resolved[key] = val;
      return;
    }

    // If the value is a direct hex color, use it as-is
    if (val.startsWith("#") || val.startsWith("rgba")) {
      resolved[key] = val;
      return;
    }

    // Otherwise, look up the token name in the tokens module
    const tokenValue = TokenModule[val];
    if (tokenValue === undefined) {
      console.warn(`Palette resolver: unknown token "${val}" referenced in palette ${sectionType}.${schemeId}`);
      resolved[key] = val; // fallback: use the token name itself
      return;
    }

    resolved[key] = tokenValue;
  });

  return resolved;
}

/**
 * Get available palettes for a given section type
 * @param {string} sectionType - e.g., "faq"
 * @returns {array} Array of { id, displayName, description }
 */
export function getPalettesForSection(sectionType) {
  const section = SECTION_PALETTES[sectionType];
  if (!section) return [];

  return Object.values(section.schemes).map((scheme) => ({
    id: scheme.id,
    displayName: scheme.displayName,
    description: scheme.description,
  }));
}

/**
 * Get the default palette scheme for a section type
 * (Currently: "light" is default for most; "dark" for CTA)
 * @param {string} sectionType
 * @returns {string} Scheme ID
 */
export function getDefaultPaletteForSection(sectionType) {
  if (sectionType === "cta") return "dark";
  return "light";
}

/**
 * Export the raw SECTION_PALETTES for admin UI use
 */
export { SECTION_PALETTES };
