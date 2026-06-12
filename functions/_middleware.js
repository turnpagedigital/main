/* Cloudflare Pages middleware: per-path SEO — meta rewriting + JSON-LD.
 *
 * For HTML responses we use HTMLRewriter to mutate the existing meta tags in
 * index.html so each path gets a tailored title/description/social preview.
 * The image is served dynamically by functions/og/[slug].js (workers-og).
 *
 * Paths covered:
 *  - Marketing pages from src/data/page-meta.json (edit via /admin/structure).
 *  - /briefings/:slug — every ACTIVE briefing gets its own title, description
 *    (from its index summary), canonical, og:type=article, published date,
 *    a per-briefing OG image, and NewsArticle + BreadcrumbList JSON-LD.
 *    Drafts (active: false) fall back to the site defaults.
 *  - /faq — FAQPage JSON-LD from src/data/faqs.json.
 *
 * Resolution + JSON-LD building live in functions/_meta.js (pure, unit-tested
 * in tests/meta-resolver.test.js).
 */

import pageMeta from "../src/data/page-meta.json";
import briefingsIndex from "../public/briefings/index.json";
import faqs from "../src/data/faqs.json";
import {
  resolveMeta,
  jsonLdScript,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
} from "./_meta.js";

const SITE_NAME = pageMeta.site.name;
/* Optional "@handle" in page-meta.json's site block; empty → tag not emitted. */
const TWITTER_SITE = (pageMeta.site.twitterHandle || "").trim();

/* Bump this to bust crawler caches (LinkedIn, X, Slack) after design changes.
 * Appended to the OG image URL as ?v=N. */
const OG_VERSION = 2;

const META_DATA = {
  site: pageMeta.site,
  pages: Object.fromEntries(
    pageMeta.pages.map((p) => [
      p.path,
      { title: p.title, description: p.description, og: p.og },
    ]),
  ),
  briefings: briefingsIndex.items,
};

export async function onRequest(context) {
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const url = new URL(context.request.url);
  const meta = resolveMeta(url.pathname, META_DATA);

  const fullImageUrl = `${url.origin}/og/${meta.og}?v=${OG_VERSION}`;
  const fullPageUrl = `${url.origin}${url.pathname}`;

  /* Tags that have no placeholder in index.html get appended to <head>. */
  const headExtras = [];
  headExtras.push(
    `<meta property="og:image:alt" content="${escapeAttr(meta.title)}">`,
  );
  if (TWITTER_SITE) {
    headExtras.push(`<meta name="twitter:site" content="${escapeAttr(TWITTER_SITE)}">`);
  }
  if (meta.type === "article" && meta.briefing) {
    headExtras.push(
      `<meta property="article:published_time" content="${escapeAttr(meta.publishedTime)}">`,
      `<meta property="article:author" content="${escapeAttr(meta.briefing.author || "Turnpage Intelligence")}">`,
      `<script type="application/ld+json">${jsonLdScript(buildArticleJsonLd(meta.briefing, url.origin, pageMeta.site))}</script>`,
      `<script type="application/ld+json">${jsonLdScript(buildBreadcrumbJsonLd(meta.briefing, url.origin))}</script>`,
    );
  }
  if (url.pathname === "/faq" || url.pathname === "/faq/") {
    const faqLd = buildFaqJsonLd(faqs.faqs || []);
    if (faqLd) {
      headExtras.push(`<script type="application/ld+json">${jsonLdScript(faqLd)}</script>`);
    }
  }

  const setContent = (value) => ({
    element(el) {
      el.setAttribute("content", value);
    },
  });

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on("head", {
      element(el) {
        el.onEndTag((end) => {
          end.before(headExtras.join("\n"), { html: true });
        });
      },
    })
    .on('meta[name="description"]', setContent(meta.description))
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", fullPageUrl);
      },
    })
    .on('meta[property="og:type"]', setContent(meta.type))
    .on('meta[property="og:title"]', setContent(meta.title))
    .on('meta[property="og:description"]', setContent(meta.description))
    .on('meta[property="og:image"]', setContent(fullImageUrl))
    .on('meta[property="og:url"]', setContent(fullPageUrl))
    .on('meta[property="og:site_name"]', setContent(SITE_NAME))
    .on('meta[name="twitter:title"]', setContent(meta.title))
    .on('meta[name="twitter:description"]', setContent(meta.description))
    .on('meta[name="twitter:image"]', setContent(fullImageUrl))
    .transform(response);
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
