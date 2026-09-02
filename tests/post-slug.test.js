import { test } from "node:test";
import assert from "node:assert/strict";
import { retimeSlug } from "../src/lib/post-slug.js";

/* The date prefix of a published post's slug tracks its publication date. */

test("swaps the date prefix and keeps the title tail", () => {
  assert.equal(
    retimeSlug("2026-08-03-openai-copyright-mdl-authors", "2026-09-02"),
    "2026-09-02-openai-copyright-mdl-authors",
  );
});

test("leaves a date inside the title tail alone", () => {
  assert.equal(
    retimeSlug("2026-08-03-hearing-set-for-2026-12-01", "2026-09-02"),
    "2026-09-02-hearing-set-for-2026-12-01",
  );
});

test("a slug that is only a date is replaced wholesale", () => {
  assert.equal(retimeSlug("2026-08-03", "2026-09-02"), "2026-09-02");
});

test("prefixes a slug that has no date", () => {
  assert.equal(retimeSlug("some-legacy-slug", "2026-09-02"), "2026-09-02-some-legacy-slug");
});

test("a partial or malformed date prefix is not treated as one", () => {
  assert.equal(retimeSlug("2026-8-3-post", "2026-09-02"), "2026-09-02-2026-8-3-post");
});

test("no date means no change", () => {
  assert.equal(retimeSlug("2026-08-03-post", ""), "2026-08-03-post");
});
