import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRedirects } from "../functions/api/admin/page-path.js";

/* public/_redirects maintenance for page URL renames. */

test("creates the file content from nothing", () => {
  assert.equal(buildRedirects("", "/old", "/new"), "/old /new 301\n");
});

test("appends to existing rules and keeps comments", () => {
  const existing = "# managed by admin\n/a /b 301\n";
  const out = buildRedirects(existing, "/old", "/new");
  assert.equal(out, "# managed by admin\n/a /b 301\n/old /new 301\n");
});

test("re-points chains: rules targeting the old path now target the new one", () => {
  const existing = "/ancient /old 301\n";
  const out = buildRedirects(existing, "/old", "/new");
  assert.equal(out, "/ancient /new 301\n/old /new 301\n");
});

test("renaming back removes the now-shadowing rule (no loops)", () => {
  // /a was renamed to /b earlier; now /b is renamed back to /a.
  const existing = "/a /b 301\n";
  const out = buildRedirects(existing, "/b", "/a");
  // The stale /a → /b rule must go (it would shadow the live /a page,
  // and the new /b → /a rule would otherwise form a loop).
  assert.equal(out, "/b /a 301\n");
});

test("replaces a stale rule for the same source path", () => {
  const existing = "/old /somewhere-else 301\n";
  const out = buildRedirects(existing, "/old", "/new");
  assert.equal(out, "/old /new 301\n");
});
