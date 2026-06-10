/* palette-equivalence — proves the June 2026 palette migration changed nothing.
 *
 * Before the migration each layout component carried an inline THEMES map.
 * Those exact values are snapshotted below (token constants substituted with
 * the literals they held at migration time). The test resolves every
 * (section, scheme) pair through section-palettes.json + resolve-scheme and
 * asserts the rendered colors are identical.
 *
 * If you intentionally change a palette via /admin/css, update the snapshot
 * here — that's the point: palette changes become visible, reviewable diffs.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { resolveScheme } from "../src/lib/resolve-scheme.js";
import * as tokens from "../src/data/tokens.js";

const here = dirname(fileURLToPath(import.meta.url));
const palettes = JSON.parse(
  readFileSync(join(here, "../src/data/section-palettes.json"), "utf8")
);

/* Normalize colors so "#fff" === "#FFFFFF" and rgba spacing is uniform. */
function norm(v) {
  if (typeof v !== "string") return v;
  let s = v.trim().toLowerCase().replace(/\s+/g, "");
  const m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) s = "#" + m[1].split("").map(c => c + c).join("");
  return s;
}

function resolved(sectionType, schemeId) {
  const scheme = palettes[sectionType]?.schemes?.[schemeId];
  assert.ok(scheme, `palette missing: ${sectionType}.${schemeId}`);
  return resolveScheme(scheme.tokens, tokens);
}

function assertSlots(actual, expected, label) {
  for (const [slot, want] of Object.entries(expected)) {
    assert.equal(
      norm(actual[slot]), norm(want),
      `${label}.${slot}: resolved "${actual[slot]}" ≠ legacy "${want}"`
    );
  }
}

/* ── Legacy inline THEMES, exactly as the layouts rendered pre-migration ── */

test("FAQ schemes match legacy Layout1/Layout2 inline themes", () => {
  const legacy = {
    "light":      { background: "#F4F5F7", text: "#0A0A0A", textSecondary: "rgba(10,10,10,0.6)", border: "rgba(10,10,10,0.08)" },
    "light-gray": { background: "#ECECEE", text: "#0A0A0A", textSecondary: "rgba(10,10,10,0.6)", border: "rgba(10,10,10,0.08)" },
    "light-card": { background: "#FFFFFF", text: "#0A0A0A", textSecondary: "rgba(10,10,10,0.6)", border: "rgba(10,10,10,0.08)" },
  };
  for (const [schemeId, want] of Object.entries(legacy)) {
    assertSlots(resolved("faq", schemeId), want, `faq.${schemeId}`);
  }
});

test("Testimonials schemes match legacy Layout1/Layout2 inline themes", () => {
  const legacy = {
    "light":      { background: "#FFFFFF", quote: "#0A0A0A", attribution: "rgba(10,10,10,0.6)",    border: "#0A0A0A", headerTheme: "light" },
    "light-gray": { background: "#F4F5F7", quote: "#0A0A0A", attribution: "rgba(10,10,10,0.6)",    border: "#0A0A0A", headerTheme: "light" },
    "dark":       { background: "#0A0A0A", quote: "#fff",    attribution: "rgba(255,255,255,0.55)", border: "#fff",    headerTheme: "dark" },
  };
  for (const [schemeId, want] of Object.entries(legacy)) {
    assertSlots(resolved("testimonials", schemeId), want, `testimonials.${schemeId}`);
  }
});

test("Testimonials schemes match legacy Layout3 (featured) inline themes", () => {
  const legacy = {
    "light": {
      background: "#FFFFFF", quoteMark: "rgba(10,10,10,0.08)", quote: "#0A0A0A",
      featuredAttribution: "rgba(10,10,10,0.5)", attrLine: "rgba(10,10,10,0.15)",
      featuredEyebrow: "rgba(10,10,10,0.45)",
    },
    "light-gray": {
      background: "#F4F5F7", quoteMark: "rgba(10,10,10,0.07)", quote: "#0A0A0A",
      featuredAttribution: "rgba(10,10,10,0.5)", attrLine: "rgba(10,10,10,0.15)",
      featuredEyebrow: "rgba(10,10,10,0.45)",
    },
    "dark": {
      background: "#0A0A0A", quoteMark: "rgba(212,255,0,0.12)", quote: "#FFFFFF",
      featuredAttribution: "rgba(255,255,255,0.5)", attrLine: "rgba(255,255,255,0.15)",
      featuredEyebrow: "rgba(255,255,255,0.45)",
    },
  };
  for (const [schemeId, want] of Object.entries(legacy)) {
    assertSlots(resolved("testimonials", schemeId), want, `testimonials(L3).${schemeId}`);
  }
});

test("CTA dark scheme matches legacy Layout1 (Get Quote) inline theme", () => {
  assertSlots(resolved("cta", "dark"), {
    background: "#000",
    border: "rgba(255,255,255,0.15)",
    eyebrow: "#D4FF00",
    title: "#fff",
    body: "rgba(255,255,255,0.6)",
    accent: "#D4FF00",
  }, "cta.dark");
});

/* ── resolveScheme unit behavior ── */

test("resolveScheme: literals pass through, tokens resolve, lowercase strings pass through", () => {
  const out = resolveScheme(
    { a: "#AbC", b: "rgba(1,2,3,0.5)", c: "INK", d: "light", e: "NOT_A_REAL_TOKEN" },
    tokens
  );
  assert.equal(out.a, "#AbC");
  assert.equal(out.b, "rgba(1,2,3,0.5)");
  assert.equal(out.c, tokens.INK);
  assert.equal(out.d, "light");
  // unknown UPPER_SNAKE names fall back to the literal string
  assert.equal(out.e, "NOT_A_REAL_TOKEN");
});

test("resolveScheme: empty/missing input yields empty object", () => {
  assert.deepEqual(resolveScheme(null, tokens), {});
  assert.deepEqual(resolveScheme({}, tokens), {});
});
