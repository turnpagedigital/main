/* prerender — the static-HTML builders in functions/_prerender.js.
 *
 * These exist because the SPA shell served 6-12 words, zero <h1> and one link
 * on every URL, identical for Googlebot. The assertions here are the SEO
 * contract that regression would silently undo: real text, exactly one <h1>
 * per page, headings in order, and a crawlable internal link graph. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildPageHtml,
  buildSectionHtml,
  buildLinkGraphHtml,
  buildBriefingsListHtml,
  buildBriefingHtml,
  buildPressListHtml,
  miniMarkdownToHtml,
} from "../functions/_prerender.js";

const J = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

const compositions = J("src/data/page-compositions.json");
const routes = J("src/data/routes.json");
const faqs = J("src/data/faqs.json");
const deals = J("src/data/deals.json");
const testimonials = J("src/data/testimonials.json");
const bio = J("src/data/bio.json");
const aiCopyright = J("src/data/ai-copyright-content.json");
const nav = J("src/data/nav.json");
const footer = J("src/data/footer.json");
const briefings = J("public/briefings/index.json");
const press = J("src/data/press.json");

const PATH_TO_KEY = new Map(
  routes.routes.filter((r) => !r.dynamic).map((r) => [r.path, r.key]),
);
const BASE = {
  faqs: faqs.faqs || [],
  deals: deals.deals || [],
  testimonials: testimonials.testimonials || [],
  bio,
  damages: aiCopyright.damagesData || [],
};

const textOf = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const wordCount = (html) => (textOf(html) ? textOf(html).split(" ").length : 0);
const countTag = (html, tag) => (html.match(new RegExp(`<${tag}>`, "g")) || []).length;

/* Every composed page, rendered the way _middleware.js renders it. */
const pages = compositions.pages.map((page) => {
  const pageKey = PATH_TO_KEY.get(page.path);
  const pressHtml = pageKey === "press" ? buildPressListHtml(press.items || []) : "";
  const ctx = { ...BASE, pageKey, h1Claimed: Boolean(pressHtml) };
  let html = pressHtml + buildPageHtml(page, ctx);
  if (pageKey === "faq") html += buildSectionHtml({ type: "faq", content: {} }, ctx, 2);
  return { path: page.path, pageKey, html };
});

test("every composed page has a route key", () => {
  for (const { path, pageKey } of pages) {
    assert.ok(pageKey, `${path} has no key in routes.json`);
  }
});

test("every composed page renders substantial crawlable text", () => {
  for (const { path, html } of pages) {
    /* /contact is the intake form — sidebar copy and the direct handles are
     * all the prose it has, by design. Every other page is a content page.
     * The shell this replaced was 11 words on all of them. */
    const floor = path === "/contact" ? 15 : 250;
    assert.ok(
      wordCount(html) >= floor,
      `${path} rendered only ${wordCount(html)} words (floor ${floor})`,
    );
  }
});

test("every composed page has exactly one <h1>", () => {
  for (const { path, html } of pages) {
    assert.equal(countTag(html, "h1"), 1, `${path} has ${countTag(html, "h1")} h1 tags`);
  }
});

test("no heading outranks the <h1> before it appears", () => {
  for (const { path, html } of pages) {
    const first = html.match(/<h([1-6])>/);
    assert.equal(first && first[1], "1", `${path} opens with h${first && first[1]}, not h1`);
  }
});

test("pages carry the internal link graph", () => {
  const graph = buildLinkGraphHtml(nav, footer);
  assert.ok(countTag(graph, "li") >= 10, "link graph is suspiciously small");
  assert.match(graph, /<a href="\/copyright">/);
  assert.match(graph, /<a href="\/crypto">/);
  /* The defect this fixes: the served HTML used to carry exactly one href. */
  assert.ok((graph.match(/<a href=/g) || []).length >= 15);
});

test("hidden sections and hidden footer links are omitted", () => {
  const contact = compositions.pages.find((p) => p.path === "/contact");
  const hero = contact.sections.find((s) => s.type === "hero");
  assert.equal(hero.visible, false, "fixture assumption: /contact hero is hidden");
  const html = buildPageHtml(contact, { ...BASE, pageKey: "contact" });
  assert.ok(!html.includes("Tell us about"), "hidden hero leaked into output");

  const graph = buildLinkGraphHtml(nav, footer);
  const hidden = (footer.columns || [])
    .flatMap((c) => c.links || [])
    .filter((l) => l.hidden);
  for (const l of hidden) {
    assert.ok(!graph.includes(`>${l.label}<`), `hidden footer link ${l.label} leaked`);
  }
});

test("/faq prerenders the full active FAQ set, other pages take their slice", () => {
  const activeCount = (faqs.faqs || []).filter((f) => f.active !== false).length;
  const faqPage = pages.find((p) => p.pageKey === "faq");
  assert.ok(
    countTag(faqPage.html, "h3") >= activeCount - 1,
    `/faq rendered ${countTag(faqPage.html, "h3")} questions, expected ~${activeCount}`,
  );

  const cryptoSlice = buildSectionHtml(
    { type: "faq", content: {} },
    { ...BASE, pageKey: "crypto" },
    2,
  );
  assert.ok(wordCount(cryptoSlice) > 0);
  assert.ok(countTag(cryptoSlice, "h3") < activeCount, "crypto took the whole FAQ set");
});

test("draft briefings stay out of the index listing", () => {
  const html = buildBriefingsListHtml(briefings.items);
  for (const b of briefings.items) {
    const listed = html.includes(`/briefings/${b.slug}`);
    assert.equal(listed, b.active !== false, `${b.slug} listed=${listed} active=${b.active}`);
  }
});

test("a briefing renders without its markdown body, and better with it", () => {
  const item = briefings.items.find((b) => b.active !== false);
  const bare = buildBriefingHtml(item, "");
  assert.equal(countTag(bare, "h1"), 1);
  assert.ok(bare.includes(item.title.slice(0, 20)));

  const withBody = buildBriefingHtml(item, "# Ignored\n\nA real paragraph of body copy.");
  assert.ok(wordCount(withBody) > wordCount(bare));
  /* The article's own leading H1 is stripped — the title is rendered above. */
  assert.equal(countTag(withBody, "h1"), 1);
  assert.ok(!withBody.includes("Ignored"));
});

test("miniMarkdownToHtml keeps headings at or below the base level", () => {
  const html = miniMarkdownToHtml("### Heading\n\nBody text.\n\n- one\n- two", 3);
  assert.match(html, /<h3>Heading<\/h3>/);
  assert.match(html, /<p>Body text\.<\/p>/);
  assert.match(html, /<li>one<\/li>/);
  assert.ok(!/<h[45]>/.test(html), "heading dropped below the base level");
});

test("emphasis markers are converted, never leaked as asterisks", () => {
  const html = miniMarkdownToHtml("Plain **bold** and *italic* text.", 2);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.ok(!html.includes("*"), "asterisks leaked into output");

  for (const { path, html: pageHtml } of pages) {
    assert.ok(!/\*\*/.test(pageHtml), `${path} leaked bold markers`);
  }
});

test("data values are escaped, not injected as markup", () => {
  const html = buildPageHtml(
    {
      sections: [
        {
          type: "hero",
          content: { title: '<script>alert(1)</script>', subtitle: 'a "quoted" & thing' },
        },
      ],
    },
    { ...BASE, pageKey: "home" },
  );
  assert.ok(!html.includes("<script>"), "unescaped markup reached the output");
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&amp;/);
});

test("unknown section types are skipped rather than throwing", () => {
  const html = buildPageHtml(
    { sections: [{ type: "some-future-section", content: { title: "x" } }] },
    { ...BASE, pageKey: "home" },
  );
  assert.equal(html, "");
});
