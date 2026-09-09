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
 *  - /ai-guide — Organization/WebPage JSON-LD PLUS the full guide as static
 *    HTML inside #root, so LLM crawlers that don't execute JavaScript read
 *    the whole page. React clears it on mount (createRoot().render()).
 *
 * Resolution + JSON-LD building live in functions/_meta.js (pure, unit-tested
 * in tests/meta-resolver.test.js).
 */

import pageMeta from "../src/data/page-meta.json";
import briefingsIndex from "../public/briefings/index.json";
import faqs from "../src/data/faqs.json";
import routesData from "../src/data/routes.json";
import partnersData from "../src/data/referral-partners.json";
import aiGuide from "../src/data/ai-guide.json";
import dealsData from "../src/data/deals.json";
import bioData from "../src/data/bio.json";
import testimonialsData from "../src/data/testimonials.json";
import {
  resolveMeta,
  jsonLdScript,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  isKnownPath,
} from "./_meta.js";
import { assembleGuide, buildAiGuideJsonLd, buildAiGuideHtml } from "./_ai-guide.js";
import pageCompositions from "../src/data/page-compositions.json";
import navData from "../src/data/nav.json";
import footerData from "../src/data/footer.json";
import aiCopyrightContent from "../src/data/ai-copyright-content.json";
import pressData from "../src/data/press.json";
import {
  buildPageHtml,
  buildSectionHtml,
  buildLinkGraphHtml,
  buildBriefingsListHtml,
  buildBriefingHtml,
  buildPressListHtml,
  isDocumentPage,
  DOCUMENT_LINKS,
} from "./_prerender.js";

/* Canonical/OG URLs always point at the apex host, so www and preview
 * deployments never compete with production in Google's index. A www→apex
 * 301 also exists in public/_redirects; this is the belt to that suspender. */
const CANONICAL_ORIGIN = "https://turnpagedigital.com";

/* Static (non-dynamic) routes — the set of paths that really exist. */
const STATIC_PATHS = routesData.routes
  .filter((r) => !r.dynamic && !r.path.includes(":"))
  .map((r) => r.path);

/* ---- Prerendered body for non-JS crawlers (see functions/_prerender.js) ----
 * The SPA shell shipped 6-12 words and no <h1> on every URL; these maps turn
 * the same composition data the React PageRenderer reads into static HTML
 * that the #root handler below injects. React clears it on mount. */
const PATH_TO_KEY = new Map(
  routesData.routes.filter((r) => !r.dynamic).map((r) => [r.path, r.key]),
);
const COMPOSITIONS = new Map((pageCompositions.pages || []).map((p) => [p.path, p]));
/* Draft, archived, and not-yet-built Page Builder pages stay reachable for
 * review but must never be indexed. A page created in /admin starts with zero
 * sections; advertising that to Google is how /team ended up in the sitemap
 * with nothing behind it. The sitemap skips the same set; this is the header
 * half. */
const NON_ACTIVE_PATHS = new Set(
  (pageCompositions.pages || [])
    .filter((p) => (p.status && p.status !== "active") || !(p.sections || []).length)
    .map((p) => p.path),
);
/* Nav + footer as real anchors, so authority flows between pages. */
const LINK_GRAPH = buildLinkGraphHtml(navData, footerData);
/* Never prerender: /admin (noindexed, and not public content), the unlisted
 * partner portal, and /intel (own middleware). /ai-guide returns earlier. */
const NO_PRERENDER = /^\/(admin|partners|intel)(\/|$)/;
/* Per-isolate memo — the composition data is build-time constant. Bounded by
 * the route table plus the briefing index. */
const PRERENDER_CACHE = new Map();

const PRERENDER_CTX = {
  faqs: faqs.faqs || [],
  deals: dealsData.deals || [],
  testimonials: testimonialsData.testimonials || [],
  bio: bioData,
  damages: aiCopyrightContent.damagesData || [],
};

async function buildRootHtml(url, briefingSlug, isDraftBriefing) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (PRERENDER_CACHE.has(path)) return PRERENDER_CACHE.get(path);

  let body = "";

  if (briefingSlug) {
    if (isDraftBriefing) return "";
    const item = briefingsIndex.items.find((b) => b.slug === briefingSlug);
    if (item) {
      /* The markdown body is a bonus: if the subrequest fails the page still
       * ships its title, date and summary rather than the old empty shell. */
      let markdown = "";
      try {
        const res = await fetch(new URL(`/briefings/${briefingSlug}.md`, url.origin).toString());
        if (res.ok) markdown = await res.text();
      } catch {
        /* ignore — fall through to title + summary only */
      }
      body = buildBriefingHtml(item, markdown);
    }
  } else if (path === "/briefings") {
    body = buildBriefingsListHtml(briefingsIndex.items);
  } else {
    const pageKey = PATH_TO_KEY.get(path);
    const page = COMPOSITIONS.get(path);
    if (page && pageKey) {
      /* /press's composition is just a closing CTA — the media list itself
       * comes from press.json, the same source the Press page reads, and it
       * owns the page's <h1>. */
      const pressHtml = pageKey === "press" ? buildPressListHtml(pressData.items || []) : "";
      const ctx = { ...PRERENDER_CTX, pageKey, h1Claimed: Boolean(pressHtml) };
      body = pressHtml + buildPageHtml(page, ctx);
      /* /faq's composition is just a hero — the questions themselves come
       * from faqs.json, the same source the FAQ page component reads. */
      if (pageKey === "faq") {
        body += buildSectionHtml({ type: "faq", content: {} }, ctx, 2);
      }
    }
  }

  /* Reference pages carry attribution and legal links only — the marketing
   * nav would put "sell your claim" links around a document meant to be
   * cited. Mirrors DocumentChrome on the rendered page. */
  const chrome = isDocumentPage(COMPOSITIONS.get(path)) ? DOCUMENT_LINKS : LINK_GRAPH;
  const html = body ? `${body}\n${chrome}` : "";
  PRERENDER_CACHE.set(path, html);
  return html;
}

/* Vanity referral links: /<code> 302-redirects to /?ref=<code>, so partners
 * can hand out turnpagedigital.com/pari-passu instead of a query-string URL.
 * Codes come from the partner registry; a code that would shadow a real page
 * path is ignored (never pick such a code — see docs/marketing/referral-partners.md). */
/* Every vanity token (canonical code + optional aliases) → canonical code,
 * so /paripassu and /pari-passu both redirect as ?ref=pari-passu and all
 * reporting stays unified under the canonical code. */
const VANITY_TO_CODE = new Map();
for (const p of partnersData.partners || []) {
  if (p.active === false || !p.code) continue;
  for (const token of [p.code, ...(p.aliases || [])]) {
    if (!STATIC_PATHS.includes(`/${token}`)) VANITY_TO_CODE.set(token, p.code);
  }
}

/* AI Learning Bot Guide — assembled once per isolate from the same data
 * files the admin edits (FAQs, deals, bio, testimonials). */
const AI_GUIDE_PATH = aiGuide.path || "/ai-guide";
const AI_GUIDE = assembleGuide({
  guide: aiGuide,
  faqs,
  deals: dealsData,
  bio: bioData,
  testimonials: testimonialsData,
});

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
  const canonicalCode = vanity && VANITY_TO_CODE.get(vanity);
  if (canonicalCode) {
    const dest = new URL(url);
    dest.pathname = "/";
    dest.searchParams.set("ref", canonicalCode);
    return Response.redirect(dest.toString(), 302);
  }

  /* The /intel mount (briefing dashboards + their login gate) carries its
   * own titles and is noindex by robots.txt — never rewrite it. */
  if (url.pathname === "/intel" || url.pathname.startsWith("/intel/")) {
    return context.next();
  }

  /* /ai-guide is a static file (public/ai-guide.html), not an SPA route —
   * it carries its own meta/JSON-LD, so the rewriter and 404 logic below
   * must never touch it. */
  if (url.pathname === "/ai-guide" || url.pathname === "/ai-guide.html") {
    return context.next();
  }

  const response = await context.next();

  /* Hashed-asset 404s (deploy-transition windows) must never be cached:
   * Cloudflare's default ~5-min 404 caching once pinned a missing chunk at
   * a colo and blanked the site for its visitors (Aug 18 2026). Assets are
   * otherwise passed through untouched — this only post-processes the
   * response, it never intercepts serving (the earlier interception attempt
   * 404'd every asset and IS the incident it was meant to prevent). */
  if (url.pathname.startsWith("/assets/")) {
    const assetType = response.headers.get("content-type") || "";
    /* A miss surfaces either as a 404 OR as the SPA fallback: 200 text/html
     * that Pages stamps with the /assets/ path's year-long immutable
     * cache-control — the header that made the Aug 18 2026 outage sticky.
     * Either way: uncacheable plain 404, so nothing can pin it. Real assets
     * (js/css/img content-types) pass through untouched. */
    if (response.status === 404 || assetType.includes("text/html")) {
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" },
      });
    }
    return response;
  }

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
  const isAiGuide = url.pathname === AI_GUIDE_PATH || url.pathname === `${AI_GUIDE_PATH}/`;
  if (isAiGuide) {
    headExtras.push(
      `<script type="application/ld+json">${jsonLdScript(buildAiGuideJsonLd(AI_GUIDE, CANONICAL_ORIGIN))}</script>`,
    );
  }

  /* Static body for crawlers that don't execute JavaScript. */
  const rootHtml =
    isKnown && !isAiGuide && !NO_PRERENDER.test(url.pathname)
      ? await buildRootHtml(url, briefingSlugMatch && briefingSlugMatch[1], isDraftBriefing)
      : "";

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
    .on("#root", {
      element(el) {
        /* Static content for non-JS crawlers; React replaces it on mount. */
        if (isAiGuide) {
          el.setInnerContent(buildAiGuideHtml(AI_GUIDE, CANONICAL_ORIGIN), { html: true });
        } else if (rootHtml) {
          el.setInnerContent(rootHtml, { html: true });
        }
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

  if (isDraftBriefing || NON_ACTIVE_PATHS.has(url.pathname.replace(/\/+$/, "") || "/") || url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
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
