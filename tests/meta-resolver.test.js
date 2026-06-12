/* meta-resolver — unit tests for functions/_meta.js, the pure resolution
 * layer behind the per-path SEO middleware (functions/_middleware.js).
 *
 * Covers the briefing-path behaviors added June 2026: active briefings get
 * article meta + per-briefing OG slugs; drafts and unknown slugs fall back
 * to site defaults; JSON-LD builders emit valid schema.org shapes. */

import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveMeta,
  clampText,
  isActiveBriefing,
  jsonLdScript,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
} from "../functions/_meta.js";

const SITE = {
  name: "Turnpage Digital Markets",
  defaultTitle: "Default Title",
  defaultDescription: "Default description.",
};

const DATA = {
  site: SITE,
  pages: {
    "/": { title: "Home Title", description: "Home desc", og: "home" },
    "/crypto": { title: "Crypto Title", description: "Crypto desc", og: "crypto" },
  },
  briefings: [
    {
      slug: "2026-06-11-crypto-advisory",
      date: "2026-06-11",
      title: "Crypto Insolvency Advisory — June 11, 2026",
      summary: "Today's delta: the FTX Recovery Trust set a record date.",
      tags: ["Crypto", "FTX"],
      author: "Turnpage Intelligence",
      active: true,
    },
    {
      slug: "2026-06-11-draft-advisory",
      date: "2026-06-11",
      title: "Draft Advisory",
      summary: "Unpublished.",
      active: false,
    },
    {
      slug: "2026-06-01-legacy",
      date: "2026-06-01",
      title: "Legacy Advisory With No Flag",
      summary: "Pre-flag index entry.",
      // no `active` field at all — must be treated as live
    },
  ],
};

test("static page paths resolve from the pages map", () => {
  const m = resolveMeta("/crypto", DATA);
  assert.equal(m.title, "Crypto Title");
  assert.equal(m.og, "crypto");
  assert.equal(m.type, "website");
});

test("trailing slashes are normalized", () => {
  assert.equal(resolveMeta("/crypto/", DATA).title, "Crypto Title");
});

test("unknown paths fall back to site defaults", () => {
  const m = resolveMeta("/nope", DATA);
  assert.equal(m.title, SITE.defaultTitle);
  assert.equal(m.og, "home");
  assert.equal(m.type, "website");
});

test("active briefing gets article meta with its own OG slug", () => {
  const m = resolveMeta("/briefings/2026-06-11-crypto-advisory", DATA);
  assert.equal(m.type, "article");
  assert.equal(m.og, "briefing--2026-06-11-crypto-advisory");
  assert.equal(m.publishedTime, "2026-06-11");
  assert.match(m.title, /Crypto Insolvency Advisory/);
  assert.match(m.description, /FTX Recovery Trust/);
  assert.ok(m.briefing);
});

test("draft briefing (active: false) falls back to defaults", () => {
  const m = resolveMeta("/briefings/2026-06-11-draft-advisory", DATA);
  assert.equal(m.title, SITE.defaultTitle);
  assert.equal(m.type, "website");
  assert.equal(m.og, "home");
  assert.equal(m.briefing, undefined);
});

test("briefing with no active flag is treated as live", () => {
  const m = resolveMeta("/briefings/2026-06-01-legacy", DATA);
  assert.equal(m.type, "article");
  assert.ok(isActiveBriefing(DATA.briefings[2]));
});

test("unknown briefing slug falls back to defaults", () => {
  const m = resolveMeta("/briefings/does-not-exist", DATA);
  assert.equal(m.title, SITE.defaultTitle);
  assert.equal(m.type, "website");
});

test("/briefings list page itself is not treated as an article", () => {
  const m = resolveMeta("/briefings", DATA);
  assert.equal(m.type, "website");
});

test("clampText cuts at word boundaries with an ellipsis", () => {
  const long = "word ".repeat(100).trim();
  const out = clampText(long, 50);
  assert.ok(out.length <= 51); // 50 + ellipsis
  assert.ok(out.endsWith("…"));
  assert.ok(!/\s$/.test(out.slice(0, -1)));
  assert.equal(clampText("short", 50), "short");
  assert.equal(clampText("  collapse   spaces  ", 50), "collapse spaces");
});

test("jsonLdScript escapes </script> breakouts", () => {
  const out = jsonLdScript({ x: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script>"));
  assert.ok(out.includes("\\u003c/script"));
});

test("buildArticleJsonLd emits a NewsArticle", () => {
  const ld = buildArticleJsonLd(DATA.briefings[0], "https://turnpagedigital.com", SITE);
  assert.equal(ld["@type"], "NewsArticle");
  assert.equal(ld.datePublished, "2026-06-11");
  assert.equal(ld.author.name, "Turnpage Intelligence");
  assert.equal(ld.publisher.name, SITE.name);
  assert.match(ld.image[0], /og\/briefing--2026-06-11-crypto-advisory/);
  assert.equal(ld.keywords, "Crypto, FTX");
});

test("buildBreadcrumbJsonLd walks Home → Briefings → post", () => {
  const ld = buildBreadcrumbJsonLd(DATA.briefings[0], "https://turnpagedigital.com");
  assert.equal(ld["@type"], "BreadcrumbList");
  assert.equal(ld.itemListElement.length, 3);
  assert.equal(ld.itemListElement[1].name, "Briefings");
  assert.match(ld.itemListElement[2].item, /briefings\/2026-06-11-crypto-advisory$/);
});

test("buildFaqJsonLd keeps active FAQs only, null when empty", () => {
  const ld = buildFaqJsonLd([
    { q: "Q1?", a: "A1", active: true },
    { q: "Q2?", a: "A2", active: false },
    { q: "Q3?", a: "A3" }, // no flag → live
  ]);
  assert.equal(ld["@type"], "FAQPage");
  assert.equal(ld.mainEntity.length, 2);
  assert.equal(buildFaqJsonLd([{ q: "x", a: "y", active: false }]), null);
  assert.equal(buildFaqJsonLd([]), null);
});
