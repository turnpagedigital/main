import { test } from "node:test";
import assert from "node:assert/strict";
import { sectionsFingerprint } from "../src/lib/section-fingerprint.js";

test("identical layouts fingerprint identically (round-trip through JSON)", () => {
  const sections = [
    { id: "sec-1", type: "hero", visible: true, content: { title: "Hi", accent: "there." } },
    { id: "sec-2", type: "timeline", visible: true },
  ];
  const roundTripped = JSON.parse(JSON.stringify(sections));
  assert.equal(sectionsFingerprint(sections), sectionsFingerprint(roundTripped));
});

test("any layout change (edit, reorder, add, remove) changes the fingerprint", () => {
  const base = [
    { id: "sec-1", type: "hero", content: { title: "Hi" } },
    { id: "sec-2", type: "timeline" },
  ];
  const fp = sectionsFingerprint(base);
  const edited = JSON.parse(JSON.stringify(base));
  edited[0].content.title = "Hello";
  const reordered = [base[1], base[0]];
  const removed = [base[0]];
  const added = [...base, { id: "sec-3", type: "faq" }];
  for (const variant of [edited, reordered, removed, added]) {
    assert.notEqual(sectionsFingerprint(variant), fp);
  }
});

test("empty and missing section lists fingerprint consistently", () => {
  assert.equal(sectionsFingerprint([]), sectionsFingerprint(undefined));
  assert.equal(sectionsFingerprint([]), sectionsFingerprint(null));
});
