/* resolve-scheme — pure scheme-token resolution, no data imports.

   A scheme's tokens object maps slot names to either:
   - a literal CSS color ("#ECECEE", "rgba(10,10,10,0.5)") → passed through
   - a token name from tokens.js ("INK", "SECONDARY_BG")    → looked up
   - any other lowercase/mixed string ("light", "0.7")      → passed through
     (used for non-color slots like headerTheme)

   Kept free of JSON/data imports so both the Vite bundle and node:test
   can use it; src/lib/palette-resolver.js wires in the actual data. */

const TOKEN_NAME_RE = /^[A-Z][A-Z0-9_]*$/;

/**
 * Resolve one scheme's slot map against a token table.
 * @param {object} schemeTokens - e.g. { background: "SECONDARY_BG", border: "rgba(0,0,0,0.1)" }
 * @param {object} tokenMap     - e.g. { SECONDARY_BG: "#F4F5F7", INK: "#0A0A0A", ... }
 * @returns {object} slot → resolved CSS value
 */
export function resolveScheme(schemeTokens, tokenMap) {
  const resolved = {};
  Object.entries(schemeTokens || {}).forEach(([slot, val]) => {
    if (typeof val !== "string") { resolved[slot] = val; return; }
    if (TOKEN_NAME_RE.test(val) && tokenMap && tokenMap[val] !== undefined) {
      resolved[slot] = tokenMap[val];
      return;
    }
    resolved[slot] = val; // literal color or passthrough string
  });
  return resolved;
}

/** True if a string looks like a token name (UPPER_SNAKE). */
export function isTokenName(val) {
  return typeof val === "string" && TOKEN_NAME_RE.test(val);
}
