import { test } from "node:test";
import assert from "node:assert/strict";
import { detectRouteReferences, applyRouteReferences } from "../functions/api/admin/_routes.js";

/* The nav cascade backs BOTH path-rename endpoints (routes.js and
   page-path.js) — if it misses a reference, a rename strands dead links. */

const NAV = {
  items: [
    { id: "home", label: "Home", href: "/" },
    {
      id: "crypto", label: "Crypto", href: "/crypto",
      dropdown: {
        title: "Crypto",
        links: [
          { label: "Overview", href: "/crypto" },
          { label: "Briefings", href: "/briefings" },
        ],
        cta: { label: "Talk", href: "/crypto" },
      },
    },
  ],
  microsites: {
    crypto: {
      brand: { label: "Crypto", href: "/crypto" },
      items: [{ label: "Cases", href: "/crypto" }, { label: "FAQ", href: "/faq" }],
      cta: { label: "Contact", href: "/contact" },
    },
  },
};

test("detects every reference shape: item, dropdown link, dropdown cta, microsite brand/item", () => {
  const refs = detectRouteReferences("/crypto", "/digital-assets", NAV);
  const types = refs.map(r => r.type).sort();
  assert.deepEqual(types, [
    "microsite-brand",
    "microsite-item",
    "nav-dropdown-cta",
    "nav-dropdown-link",
    "nav-item-href",
  ]);
});

test("detects nothing for an unreferenced path", () => {
  assert.deepEqual(detectRouteReferences("/nowhere", "/elsewhere", NAV), []);
});

test("apply rewrites all detected refs and leaves everything else alone", () => {
  const refs = detectRouteReferences("/crypto", "/digital-assets", NAV);
  const updated = applyRouteReferences(NAV, refs);

  assert.equal(updated.items[1].href, "/digital-assets");
  assert.equal(updated.items[1].dropdown.links[0].href, "/digital-assets");
  assert.equal(updated.items[1].dropdown.cta.href, "/digital-assets");
  assert.equal(updated.microsites.crypto.brand.href, "/digital-assets");
  assert.equal(updated.microsites.crypto.items[0].href, "/digital-assets");

  // Untouched references stay
  assert.equal(updated.items[0].href, "/");
  assert.equal(updated.items[1].dropdown.links[1].href, "/briefings");
  assert.equal(updated.microsites.crypto.items[1].href, "/faq");
  assert.equal(updated.microsites.crypto.cta.href, "/contact");
});

test("apply does not mutate the original nav object", () => {
  const before = JSON.stringify(NAV);
  const refs = detectRouteReferences("/crypto", "/digital-assets", NAV);
  applyRouteReferences(NAV, refs);
  assert.equal(JSON.stringify(NAV), before);
});

test("exact-match only — /crypto does not touch /crypto-faq", () => {
  const nav = { items: [{ id: "x", label: "X", href: "/crypto-faq" }], microsites: {} };
  assert.deepEqual(detectRouteReferences("/crypto", "/digital-assets", nav), []);
});
