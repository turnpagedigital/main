/* known-path — unit tests for isKnownPath in functions/_meta.js, the
 * validity check behind the middleware's real-404 behavior (unknown routes
 * get status 404 + noindex instead of a soft-404 200). */

import test from "node:test";
import assert from "node:assert/strict";

import { isKnownPath } from "../functions/_meta.js";

const DATA = {
  briefings: [
    { slug: "2026-06-11-crypto-advisory", active: true },
    { slug: "2026-07-01-draft-advisory", active: false },
  ],
};

const STATIC_PATHS = ["/", "/copyright", "/crypto", "/briefings", "/faq", "/admin"];

test("root and static routes are known", () => {
  assert.ok(isKnownPath("/", DATA, STATIC_PATHS));
  assert.ok(isKnownPath("/copyright", DATA, STATIC_PATHS));
  assert.ok(isKnownPath("/briefings", DATA, STATIC_PATHS));
});

test("trailing slashes normalize before matching", () => {
  assert.ok(isKnownPath("/crypto/", DATA, STATIC_PATHS));
});

test("admin shell and its sub-tabs are known (they noindex separately)", () => {
  assert.ok(isKnownPath("/admin", DATA, STATIC_PATHS));
  assert.ok(isKnownPath("/admin/structure/navigation", DATA, STATIC_PATHS));
});

test("briefing slugs resolve against the index, drafts included", () => {
  assert.ok(isKnownPath("/briefings/2026-06-11-crypto-advisory", DATA, STATIC_PATHS));
  assert.ok(isKnownPath("/briefings/2026-07-01-draft-advisory", DATA, STATIC_PATHS));
});

test("unknown paths and unknown briefing slugs are not known", () => {
  assert.ok(!isKnownPath("/this-page-does-not-exist", DATA, STATIC_PATHS));
  assert.ok(!isKnownPath("/briefings/no-such-briefing", DATA, STATIC_PATHS));
  assert.ok(!isKnownPath("/copyright/extra-segment", DATA, STATIC_PATHS));
});
