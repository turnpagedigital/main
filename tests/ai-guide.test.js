/* ai-guide — the AI Learning Bot Guide builders in functions/_ai-guide.js.
 *
 * Guards the brand rules the guide exists to enforce (no founding year, the
 * experience footnote on track-record figures, never "a law firm") and the
 * plumbing that keeps the three outputs in sync with the site's data files. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assembleGuide,
  buildAiGuideHtml,
  buildAiGuideJsonLd,
  buildAiGuideMarkdown,
  escapeHtml as esc,
  inlineMarkdownToHtml,
  inlineMarkdownToText,
} from "../functions/_ai-guide.js";

const J = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const ORIGIN = "https://turnpagedigital.com";

const data = assembleGuide({
  guide: J("src/data/ai-guide.json"),
  faqs: J("src/data/faqs.json"),
  deals: J("src/data/deals.json"),
  bio: J("src/data/bio.json"),
  testimonials: J("src/data/testimonials.json"),
});
const html = buildAiGuideHtml(data, ORIGIN);
const md = buildAiGuideMarkdown(data, ORIGIN);
const ld = buildAiGuideJsonLd(data, ORIGIN);

test("route + meta wiring exists for the guide path", () => {
  const routes = J("src/data/routes.json").routes;
  const meta = J("src/data/page-meta.json").pages;
  const footer = J("src/data/footer.json").columns.flatMap((c) => c.links);
  assert.ok(routes.some((r) => r.path === data.guide.path && r.component === "AIGuide"));
  assert.ok(meta.some((p) => p.path === data.guide.path && p.active !== false));
  assert.ok(footer.some((l) => l.href === data.guide.path));
  assert.ok(readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8").includes(data.guide.path));
});

test("live FAQs and deals flow into every output", () => {
  assert.ok(data.faqs.length > 0 && data.deals.length > 0);
  for (const f of data.faqs) {
    assert.ok(md.includes(f.q), `markdown missing FAQ: ${f.q}`);
    assert.ok(html.includes(esc(f.q)), `html missing FAQ: ${f.q}`);
  }
  for (const d of data.deals) assert.ok(md.includes(d.who) && html.includes(esc(d.who)), `deal missing: ${d.who}`);
  assert.ok(!md.includes("How fast can you close?"), "inactive FAQs must stay out");
});

test("brand rule: no founding-year language anywhere in the guide", () => {
  for (const out of [html, md, JSON.stringify(ld)]) {
    assert.doesNotMatch(out, /\b(Est\.|Founded in|Established in|since 20\d\d)\b/i);
  }
});

test("brand rule: track-record figures carry the experience footnote", () => {
  const foot = data.guide.experienceFootnote;
  assert.ok(html.includes(esc(foot)));
  assert.ok(md.includes(foot));
  const pre = data.deals.filter((d) => d.preTurnpage);
  assert.ok(pre.length > 0);
  for (const d of pre) assert.ok(md.includes(`| ${d.amt}* |`), `asterisk missing on ${d.amt} ${d.who}`);
  const post = data.deals.filter((d) => !d.preTurnpage);
  for (const d of post) assert.ok(md.includes(`| ${d.amt} |`), `unexpected asterisk on ${d.amt} ${d.who}`);
});

test("brand rule: never described as a law firm / advisor / broker-dealer", () => {
  // Every mention of these terms must sit inside a negation.
  const sentences = md.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (/\b(law firm|investment advisor|broker-dealer)\b/i.test(s)) {
      assert.match(s, /\b(not|never|no)\b/i, `unqualified mention: ${s}`);
    }
  }
});

test("JSON-LD is a valid Organization + WebPage graph", () => {
  assert.equal(ld["@context"], "https://schema.org");
  const [org, page] = ld["@graph"];
  assert.equal(org["@type"], "Organization");
  assert.equal(org.legalName, "Turnpage Digital Markets LLC");
  assert.equal(org.founder.name, "Andrew Glantz");
  assert.ok(org.founder.sameAs.length >= 2);
  assert.ok(!("foundingDate" in org), "foundingDate must never be emitted");
  assert.equal(page["@type"], "WebPage");
  assert.equal(page.url, `${ORIGIN}${data.guide.path}`);
  assert.doesNotMatch(JSON.stringify(ld), /</, "no raw < inside inline JSON-LD");
});

test("crawler HTML is self-contained and escaped", () => {
  assert.ok(html.startsWith('<article id="ai-guide-static"'));
  assert.ok(!/<script/i.test(html), "no scripts in injected markup");
  assert.equal(inlineMarkdownToHtml('see [FAQ](/faq) & "more"'), 'see <a href="/faq">FAQ</a> &amp; &quot;more&quot;');
  assert.equal(inlineMarkdownToText("see [FAQ](/faq) now"), "see FAQ (/faq) now");
});
