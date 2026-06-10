/**
 * Palette Resolver — section color schemes, resolved against design tokens.
 *
 * section-palettes.json is the single source of truth for template-section
 * colors (FAQ, Testimonials, CTA). Each scheme maps slot names to either a
 * token name from tokens.js or a literal CSS value; resolveScheme() turns
 * that into ready-to-use colors. Layout components call getSectionTheme().
 *
 * Editing flow: /admin/css → Section Palettes commits section-palettes.json;
 * the deployed site picks the change up on the next build (~1–2 min).
 */

import * as TokenModule from "../data/tokens.js";
import SECTION_PALETTES from "../data/section-palettes.json";
import { resolveScheme } from "./resolve-scheme.js";

/**
 * Resolve a palette scheme to actual color values.
 * @param {string} sectionType - e.g. "faq", "testimonials", "cta"
 * @param {string} schemeId    - e.g. "light", "dark", "light-card"
 * @returns {object} resolved slot map, {} if unknown
 */
export function resolvePaletteTokens(sectionType, schemeId) {
  const scheme = SECTION_PALETTES[sectionType]?.schemes?.[schemeId];
  if (!scheme) return {};
  return resolveScheme(scheme.tokens, TokenModule);
}

/**
 * Resolve a scheme with a fallback — mirrors the old per-component
 * `THEMES[colorScheme] || THEMES.<default>` behavior exactly.
 * @param {string} sectionType
 * @param {string} schemeId        - requested scheme (may be unknown)
 * @param {string} fallbackScheme  - scheme to use when schemeId is unknown
 */
export function getSectionTheme(sectionType, schemeId, fallbackScheme) {
  const schemes = SECTION_PALETTES[sectionType]?.schemes || {};
  const id = schemes[schemeId] ? schemeId : fallbackScheme;
  if (!schemes[id]) return {};
  return resolveScheme(schemes[id].tokens, TokenModule);
}

/**
 * Get available palettes for a given section type.
 * @returns {array} [{ id, displayName, description }]
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
 * Get the default palette scheme for a section type.
 * @param {string} sectionType
 * @returns {string} Scheme ID
 */
export function getDefaultPaletteForSection(sectionType) {
  if (sectionType === "cta") return "dark";
  return "light";
}

/** Export the raw registry (admin UI + scheme-visuals helpers). */
export { SECTION_PALETTES };
