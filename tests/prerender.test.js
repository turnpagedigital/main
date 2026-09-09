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
  isDocumentPage,
  DOCUMENT_LINKS,
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

/* Every composed page, rendered the way _middleware.js renders it.
 * Pages with no sections are skipped: a page created in /admin legitimately
 * starts empty. They are covered instead by the sitemap/noindex rules and by
 * "a page with no sections is never advertised" below. */
const pages = compositions.pages.filter((p) => (p.sections || []).length).map((page) => {
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

/* ---------------------------------------------------------------------------
 * Page titles. The client used to carry its own hardcoded TITLES map in
 * App.jsx, which drifted from page-meta.json: it overwrote the keyword-bearing
 * server titles, and its lookup fell back to the home entry, so team,
 * bankruptcy-claims and partners each rendered with the HOMEPAGE's title.
 * These guard the single-source-of-truth that replaced it.
 * ------------------------------------------------------------------------ */

const pageMeta = J("src/data/page-meta.json");
/* Not indexed, deliberately absent from page-meta; App.jsx names them. */
const CHROME_KEYS = new Set(["admin", "partners"]);

test("every routable page has its own title in page-meta.json", () => {
  const byPath = new Map((pageMeta.pages || []).map((p) => [p.path, p.title]));
  const built = new Set(
    compositions.pages.filter((p) => (p.sections || []).length).map((p) => p.path),
  );
  const unbuilt = new Set(
    compositions.pages.filter((p) => !(p.sections || []).length).map((p) => p.path),
  );
  const missing = routes.routes
    .filter((r) => !r.dynamic && !CHROME_KEYS.has(r.key) && !byPath.get(r.path) && !unbuilt.has(r.path))
    .map((r) => r.path);
  void built;
  assert.deepEqual(
    missing,
    [],
    `these routes would fall back to the site default title: ${missing.join(", ")}`,
  );
});

test("no two pages share a title", () => {
  const seen = new Map();
  for (const p of pageMeta.pages || []) {
    const prev = seen.get(p.title);
    assert.equal(prev, undefined, `${p.path} and ${prev} share the title "${p.title}"`);
    seen.set(p.title, p.path);
  }
});

test("App.jsx does not reintroduce a hardcoded title map", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.ok(
    !/const TITLES\s*=\s*\{/.test(app),
    "a second copy of the titles is back in App.jsx — titles must come from page-meta.json",
  );
  assert.match(app, /TITLE_BY_KEY/, "App.jsx no longer resolves titles from page-meta");
});

test("removed routes leave no dangling references", () => {
  /* /team was retired in favour of the Leadership section on the homepage. */
  const paths = new Set(routes.routes.map((r) => r.path));
  assert.ok(!paths.has("/team"), "/team is back in routes.json without a composition");

  const redirects = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
  assert.match(redirects, /^\/team\s+\/#leadership\s+301$/m, "/team redirect missing");

  /* The anchor those links point at has to actually exist as a bookmark. */
  const bookmarks = new Set();
  for (const page of compositions.pages) {
    for (const s of page.sections || []) {
      const b = (s.content || {})._bookmark;
      if (b) bookmarks.add(String(b).toLowerCase());
    }
  }
  for (const file of ["src/data/nav.json", "src/data/footer.json"]) {
    const raw = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(!raw.includes('"/#team"'), `${file} still points at the dead /#team anchor`);
    for (const m of raw.matchAll(/"\/#([a-z0-9-]+)"/gi)) {
      assert.ok(
        bookmarks.has(m[1].toLowerCase()),
        `${file} links to /#${m[1]} but no section carries that bookmark`,
      );
    }
  }
});

test("no _redirects rule loops back on itself", () => {
  /* Cloudflare Pages serves foo.html at /foo and 308-redirects /foo.html back
   * to /foo. A rule pointing /foo at /foo.html therefore bounces forever. That
   * is exactly what happened to /ai-guide: the page was unreachable for days
   * while still being advertised in the sitemap. */
  const raw = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
  /* Only the .html normalization is checked. Pages strips a .html extension
   * and redirects to the clean path; it does NOT collapse trailing slashes the
   * same way, so /intel -> /intel/ is a legitimate rule, not a loop. */
  const clean = (u) => u.replace(/index\.html$/, "").replace(/\.html$/, "") || "/";

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const [from, to] = t.split(/\s+/);
    if (!from || !to || from.includes("*")) continue;
    assert.notEqual(
      clean(to.split("#")[0]),
      clean(from),
      `_redirects sends ${from} to ${to}, which normalizes back to itself — infinite loop`,
    );
  }
});

/* ---------------------------------------------------------------------------
 * Case Briefing — the reusable long-form case template. Educational by
 * default; the selling CTA is a single toggle. These lock the two properties
 * that make it worth having: it is fully crawlable, and the CTA stays off
 * unless someone deliberately turns it on.
 * ------------------------------------------------------------------------ */

const sectionTypes = J("src/data/section-types.json");
const caseBriefingType = (sectionTypes.sectionTypes || []).find((t) => t.id === "case-briefing");

const briefingPages = compositions.pages.filter((p) =>
  (p.sections || []).some((s) => s.type === "case-briefing"),
);

test("the case-briefing type is declared and registered", () => {
  assert.ok(caseBriefingType, "case-briefing missing from section-types.json");
  assert.equal(caseBriefingType.ctaEnabled, undefined);
  assert.equal(
    caseBriefingType.defaultContent.ctaEnabled,
    false,
    "a new case briefing must default to no CTA",
  );
  const registry = readFileSync(
    new URL("../src/components/sections/registry.js", import.meta.url),
    "utf8",
  );
  assert.match(registry, /"case-briefing":\s*CaseBriefingSection/);
});

test("a case briefing prerenders as a full document", () => {
  assert.ok(briefingPages.length, "no page uses the case-briefing section");
  for (const page of briefingPages) {
    const html = buildPageHtml(page, { ...BASE, pageKey: page.pageKey });
    assert.ok(wordCount(html) > 1500, `${page.path} rendered only ${wordCount(html)} words`);
    assert.equal(countTag(html, "h1"), 1, `${page.path} must have exactly one h1`);
    assert.ok(countTag(html, "h2") >= 5, `${page.path} has too few section headings`);
    /* Sources are the point of a citable reference page. */
    assert.ok((html.match(/<a href=/g) || []).length >= 20, `${page.path} lost its source links`);
  }
});

test("markdown tables survive into the crawlable HTML", () => {
  const html = miniMarkdownToHtml(
    "| Stage | Figure |\n| --- | --- |\n| Filed | 16,640 |\n| Issued | 8,449 |",
    2,
  );
  assert.match(html, /<table>/);
  assert.match(html, /<th>Stage<\/th>/);
  assert.match(html, /<td>16,640<\/td>/);
  assert.ok(!html.includes("|"), "raw pipes leaked into the output");
});

test("the CTA only renders when explicitly enabled", () => {
  const base = {
    title: "A case",
    ctaHeading: "Holding a claim?",
    ctaLabel: "Get in touch",
    ctaHref: "/contact",
  };
  const off = buildSectionHtml(
    { type: "case-briefing", content: { ...base, ctaEnabled: false } },
    { ...BASE, pageKey: "x" },
    1,
  );
  assert.ok(!off.includes("Get in touch"), "CTA rendered while switched off");

  const on = buildSectionHtml(
    { type: "case-briefing", content: { ...base, ctaEnabled: true } },
    { ...BASE, pageKey: "x" },
    1,
  );
  assert.match(on, /Get in touch/);
  assert.match(on, /href="\/contact"/);
});

test("draft pages are kept out of the sitemap", () => {
  const script = readFileSync(new URL("../scripts/generate-sitemap.mjs", import.meta.url), "utf8");
  assert.match(script, /NON_ACTIVE_PATHS/, "sitemap no longer filters non-active pages");
  const mw = readFileSync(new URL("../functions/_middleware.js", import.meta.url), "utf8");
  assert.match(mw, /NON_ACTIVE_PATHS/, "middleware no longer noindexes non-active pages");
  for (const page of briefingPages) {
    if (page.status === "active") continue;
    assert.ok(page.status, `${page.path} has no status, so it would be indexed by default`);
  }
});

test("an unlisted case page stays out of nav and footer", () => {
  const nav = readFileSync(new URL("../src/data/nav.json", import.meta.url), "utf8");
  const footer = readFileSync(new URL("../src/data/footer.json", import.meta.url), "utf8");
  for (const page of briefingPages) {
    if (page.status === "active") continue;
    assert.ok(!nav.includes(page.path), `${page.path} is linked from nav while still a draft`);
    assert.ok(!footer.includes(page.path), `${page.path} is linked from footer while still a draft`);
  }
});

test("a declared section type is actually offered in the Page Builder picker", () => {
  /* section-types.json is not the gate: TemplatePicker.jsx renders a curated
   * catalogue, so a type absent from it can never be added to a page. This is
   * how case-briefing shipped invisible on its first deploy. */
  const picker = readFileSync(new URL("../src/pages/admin/TemplatePicker.jsx", import.meta.url), "utf8");
  const offered = new Set([...picker.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));

  /* Deliberately absent: superseded by the unified "cta" type, or driven by
   * page data rather than added by hand. */
  const NOT_OFFERED = new Set([
    "cta-banner", "bottom-cta", "get-quote",
    "timeline", "scenario-cards", "contact-form",
  ]);

  const missing = (sectionTypes.sectionTypes || [])
    .map((t) => t.id)
    .filter((id) => !offered.has(id) && !NOT_OFFERED.has(id));

  assert.deepEqual(
    missing,
    [],
    `declared but not addable in the Page Builder: ${missing.join(", ")}`,
  );
});

test("a page with no sections is never advertised", () => {
  /* A page created in /admin starts with zero sections. Serving that URL is
   * fine — the author is about to build it — but putting it in the sitemap
   * ships an empty result to Google, which is exactly what /team was. */
  const empty = compositions.pages.filter((p) => !(p.sections || []).length);
  const sitemapScript = readFileSync(new URL("../scripts/generate-sitemap.mjs", import.meta.url), "utf8");
  const mw = readFileSync(new URL("../functions/_middleware.js", import.meta.url), "utf8");
  for (const file of [sitemapScript, mw]) {
    assert.match(
      file,
      /!\(p\.sections \|\| \[\]\)\.length/,
      "empty compositions are no longer filtered out",
    );
  }
  for (const p of empty) {
    assert.ok(p.path, `composition ${p.pageKey} has no path`);
  }
});

/* ---------------------------------------------------------------------------
 * Citation policy. Case pages are meant to be cited by journalists, law firms
 * and AI assistants, which only works if what they cite is primary. A weak
 * source is not a style problem here — linking a competitor hands them the
 * referral and the authority on our own page.
 * ------------------------------------------------------------------------ */

const citationPolicy = J("src/data/citation-policy.json");

const ALLOWED_HOSTS = new Set([
  ...citationPolicy.court,
  ...citationPolicy.government,
  ...citationPolicy.media,
]);

/* An official company channel on a generic host (a plan-administrator notice
 * on Medium, say) is a primary source, but allowlisting medium.com outright
 * would let anything through. Each official channel is named by URL prefix so
 * every exception stays auditable. */
const DISCLOSURE_PREFIXES = (citationPolicy.companyDisclosureUrls || []).map((d) => d.prefix);

function hostAllowed(url) {
  if (DISCLOSURE_PREFIXES.some((prefix) => url.startsWith(prefix))) return true;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  if (ALLOWED_HOSTS.has(host)) return true;
  /* Allow subdomains of an allowed registrable domain (docs.sec.gov, etc.). */
  return [...ALLOWED_HOSTS].some((h) => host === h || host.endsWith(`.${h}`));
}

test("case briefings cite only approved sources", () => {
  const offenders = [];
  for (const page of briefingPages) {
    for (const section of page.sections || []) {
      if (section.type !== "case-briefing") continue;
      const c = section.content || {};
      for (const s of c.sources || []) {
        if (!s.url) continue; // label-only entries are company disclosures
        if (!hostAllowed(s.url)) offenders.push(`${page.path} sources: ${s.url}`);
      }
      const prose = [
        c.statusIntro || "",
        ...(c.sections || []).map((x) => x.markdown || ""),
        ...(c.faqs || []).map((x) => x.a || ""),
      ].join("\n");
      for (const m of prose.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
        if (!hostAllowed(m[1])) offenders.push(`${page.path} body: ${m[1]}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `off-policy citations (add the outlet to src/data/citation-policy.json if it qualifies):\n  ${offenders.join("\n  ")}`,
  );
});

test("no case page links to a competitor", () => {
  /* Named explicitly rather than relying on the allowlist, so this still
   * fails loudly if someone widens the policy without thinking. */
  const COMPETITORS = [
    "reclaim-capital.com", "terra-claim.com", "x-claim.com", "claims-market.com",
    "paxtibi.xyz", "paxtibi.com", "found.xyz", "ftxcreditor.com", "athletecreditor.com",
    "harucreditor.com", "qredax.com", "frnt.io", "ftxclaims.com", "slfaqllc.com",
    "seaportmarketplace.com",
  ];
  const blob = JSON.stringify(briefingPages);
  for (const c of COMPETITORS) {
    assert.ok(!blob.includes(c), `a case page cites the competitor ${c}`);
  }
});

test("a reference page offers no link to sell a claim", () => {
  /* The CTA toggle only governs the section. The marketing header and footer
   * would still ring the document with "Copyright Claims", "Locked Crypto"
   * and "Talk to Us", which is the opposite of what a citable page is for.
   * DocumentChrome replaces them on the rendered page; DOCUMENT_LINKS does
   * the same in the HTML a crawler reads. */
  const SELLING_PATHS = [
    "/copyright", "/crypto", "/bankruptcy-claims", "/litigation-funding",
    "/contact", "rewindtariffs.com",
  ];

  for (const page of briefingPages) {
    const body = buildPageHtml(page, { ...BASE, pageKey: page.pageKey });
    const full = `${body}\n${DOCUMENT_LINKS}`;
    for (const p of SELLING_PATHS) {
      assert.ok(
        !full.includes(`href="${p}"`) && !full.includes(`href="https://${p}`),
        `${page.path} links to ${p}`,
      );
    }
    assert.ok(isDocumentPage(page), `${page.path} is not recognised as a document page`);
  }

  /* And the chrome itself carries attribution only. */
  assert.match(DOCUMENT_LINKS, /href="\/privacy"/);
  assert.match(DOCUMENT_LINKS, /href="\/terms"/);
  assert.equal((DOCUMENT_LINKS.match(/<a href=/g) || []).length, 3);
});

test("App.jsx routes case briefings through DocumentChrome", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /DOCUMENT_PAGES/, "document-mode page set is gone");
  assert.match(app, /case-briefing/, "DOCUMENT_PAGES no longer derives from the section type");
  assert.match(app, /<DocumentChrome>/, "DocumentChrome is imported but never rendered");
});
