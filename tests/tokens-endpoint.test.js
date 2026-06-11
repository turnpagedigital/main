/* tokens-endpoint — unit tests for the token editing safety rails.
 * Covers the corruption vectors: quote injection breaking tokens.js,
 * $-sequences in regex replacement, and prefix-name collisions (DARK
 * must never clobber DARK_CARD). */

import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidCssColor,
  validateTokenValue,
  parseTokensFromContent,
  updateTokenInContent,
} from "../functions/api/admin/tokens.js";

const SAMPLE = `/* tokens */
export const NEON = "#D4FF00";
export const DARK = "#000";
export const DARK_CARD = "#0A0A0A";
export const INK_60 = "rgba(10,10,10,0.6)";
export const RADIUS_CARD = "clamp(0.2rem, 1.2vw, 0.3125rem)";
export const FONT = "'Archivo', sans-serif";
`;

test("isValidCssColor accepts hex and rgb/rgba forms", () => {
  for (const v of ["#fff", "#FFF8", "#D4FF00", "#D4FF00CC", "rgb(1,2,3)", "rgba(10, 10, 10, 0.6)", "rgba(255,255,255,1)"]) {
    assert.ok(isValidCssColor(v), `${v} should be valid`);
  }
  for (const v of ["", "red", "#GGG", "#12345", "rgba(1,2)", "url(x)", "rgba(1,2,3,2.5)"]) {
    assert.ok(!isValidCssColor(v), `${v} should be invalid`);
  }
});

test("validateTokenValue blocks string-breaking characters", () => {
  assert.equal(validateTokenValue("#fff", '#fff" } body { display:none').ok, false);
  assert.equal(validateTokenValue("#fff", "#ff\\f").ok, false);
  assert.equal(validateTokenValue("#fff", "#ff\nf").ok, false);
  assert.equal(validateTokenValue("#fff", "").ok, false);
  assert.equal(validateTokenValue("#fff", "x".repeat(121)).ok, false);
});

test("validateTokenValue keeps color tokens colors", () => {
  assert.equal(validateTokenValue("#D4FF00", "blueish").ok, false);
  assert.equal(validateTokenValue("#D4FF00", "#00FFD4").ok, true);
  assert.equal(validateTokenValue("rgba(10,10,10,0.6)", "rgba(10,10,10,0.4)").ok, true);
  // non-color tokens (FONT) may hold text
  assert.equal(validateTokenValue("'Archivo', sans-serif", "'Inter', sans-serif").ok, true);
});

test("parseTokensFromContent reads all export styles", () => {
  const tokens = parseTokensFromContent(SAMPLE);
  assert.equal(tokens.NEON, "#D4FF00");
  assert.equal(tokens.DARK_CARD, "#0A0A0A");
  assert.equal(tokens.INK_60, "rgba(10,10,10,0.6)");
  assert.equal(tokens.FONT, "'Archivo', sans-serif");
});

test("updateTokenInContent replaces only the named token", () => {
  const { success, content } = updateTokenInContent(SAMPLE, "DARK", "#111");
  assert.ok(success);
  assert.match(content, /export const DARK = "#111";/);
  // prefix collision guard: DARK_CARD untouched
  assert.match(content, /export const DARK_CARD = "#0A0A0A";/);
});

test("updateTokenInContent treats $ sequences literally", () => {
  const { success, content } = updateTokenInContent(SAMPLE, "NEON", "#D4$&00");
  assert.ok(success);
  assert.match(content, /export const NEON = "#D4\$&00";/);
});

test("updateTokenInContent errors on unknown token", () => {
  const result = updateTokenInContent(SAMPLE, "NOT_REAL", "#fff");
  assert.equal(result.success, false);
  assert.match(result.error, /not found/);
});

test("radius tokens (clamp values with commas/parens) parse and update", () => {
  const tokens = parseTokensFromContent(SAMPLE);
  assert.equal(tokens.RADIUS_CARD, "clamp(0.2rem, 1.2vw, 0.3125rem)");

  const { success, content } = updateTokenInContent(SAMPLE, "RADIUS_CARD", "12px");
  assert.ok(success);
  assert.match(content, /export const RADIUS_CARD = "12px";/);
  // non-color token accepts length values through validation
  assert.equal(validateTokenValue("clamp(0.2rem, 1.2vw, 0.3125rem)", "1rem").ok, true);
});
