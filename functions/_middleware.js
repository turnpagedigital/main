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
import routesData from "../src/data/routes.json";
import partnersData from "../src/data/referral-partners.json";
import {
  resolveMeta,
  jsonLdScript,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  isKnownPath,
} from "./_meta.js";

/* Canonical/OG URLs always point at the apex host, so www and preview
 * deployments never compete with production in Google's index. A www→apex
 * 301 also exists in public/_redirects; this is the belt to that suspender. */
const CANONICAL_ORIGIN = "https://turnpagedigital.com";

/* Static (non-dynamic) routes — the set of paths that really exist. */
const STATIC_PATHS = routesData.routes
  .filter((r) => !r.dynamic && !r.path.includes(":"))
  .map((r) => r.path);

/* Vanity referral links: /<code> 302-redirects to /?ref=<code>, so partners
 * can hand out turnpagedigital.com/pari-passu instead of a query-string URL.
 * Codes come from the partner registry; a code that would shadow a real page
 * path is ignored (never pick such a code — see docs/marketing/referral-partners.md). */
const PARTNER_CODES = new Set(
  (partnersData.partners || [])
    .filter((p) => p.active !== false && p.code)
    .map((p) => p.code)
    .filter((code) => !STATIC_PATHS.includes(`/${code}`)),
);

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
  const url = new URL(context.request.url);

  /* www → apex, 301. Lives here because Cloudflare Pages _redirects rules
   * match paths only — they cannot match on hostname. */
  if (url.hostname === "www.turnpagedigital.com") {
    url.hostname = "turnpagedigital.com";
    return Response.redirect(url.toString(), 301);
  }

  /* Vanity referral link → homepage with the ref code as a query param,
   * where the SPA's attribution capture picks it up. 302 (not 301) so the
   * mapping stays revocable and uncached. */
  const vanity = url.pathname.replace(/\/+$/, "").slice(1).toLowerCase();
  if (vanity && PARTNER_CODES.has(vanity)) {
    const dest = new URL(url);
    dest.pathname = "/";
    dest.searchParams.set("ref", vanity);
    return Response.redirect(dest.toString(), 302);
  }

  /* The /intel mount (briefing dashboards + their login gate) carries its
   * own titles and is noindex by robots.txt — never rewrite it. */
  if (url.pathname === "/intel" || url.pathname.startsWith("/intel/")) {
    return context.next();
  }

  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  // Draft briefings (active: false) should never be indexed
  const briefingSlugMatch = url.pathname.match(/^\/briefings\/([^/]+)\/?$/);
  const isDraftBriefing = briefingSlugMatch
    ? (briefingsIndex.items.find(b => b.slug === briefingSlugMatch[1])?.active === false)
    : false;

  const isKnown = isKnownPath(url.pathname, META_DATA, STATIC_PATHS);
  const meta = isKnown
    ? resolveMeta(url.pathname, META_DATA)
    : {
        title: `Page Not Found — ${SITE_NAME}`,
        description: pageMeta.site.defaultDescription,
        og: "home",
        type: "website",
      };

  const fullImageUrl = `${CANONICAL_ORIGIN}/og/${meta.og}?v=${OG_VERSION}`;
  const fullPageUrl = `${CANONICAL_ORIGIN}${url.pathname}`;

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
      `<script type="application/ld+json">${jsonLdScript(buildArticleJsonLd(meta.briefing, CANONICAL_ORIGIN, pageMeta.site))}</script>`,
      `<script type="application/ld+json">${jsonLdScript(buildBreadcrumbJsonLd(meta.briefing, CANONICAL_ORIGIN))}</script>`,
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

  const transformed = new HTMLRewriter()
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

  /* Unknown routes: same SPA shell (the client renders the NotFound page),
   * but with a real 404 status so crawlers drop the URL instead of indexing
   * an infinite space of soft-404 duplicates. */
  if (!isKnown) {
    const notFound = new Response(transformed.body, {
      status: 404,
      headers: transformed.headers,
    });
    notFound.headers.set("X-Robots-Tag", "noindex, nofollow");
    return notFound;
  }

  if (isDraftBriefing || url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    const noindexed = new Response(transformed.body, transformed);
    noindexed.headers.set("X-Robots-Tag", "noindex, nofollow");
    return noindexed;
  }
  return transformed;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
