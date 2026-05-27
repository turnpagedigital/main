/* Cloudflare Pages middleware: per-path Open Graph + Twitter meta injection.
 *
 * For HTML responses we use HTMLRewriter to mutate the existing meta tags in
 * index.html so each path gets a tailored social preview. The image is served
 * dynamically by functions/og/[slug].js (workers-og) — not a static PNG.
 *
 * Only 4 paths get a custom OG image; everything else falls back to /og/home.
 * The selectors below must exist as placeholders in index.html.
 */

const SITE_NAME = "Turnpage Digital Markets";

const DEFAULT_TITLE = "Turnpage Digital Markets — The OTC Desk for Rights Holders";
const DEFAULT_DESC =
  "Capital and advisory for rights holders. AI copyright class actions, crypto bankruptcies, complex litigation — over $1B liquidated.";
const DEFAULT_OG_SLUG = "home";

/* Bump this to bust crawler caches (LinkedIn, X, Slack) after design changes.
 * Appended to the OG image URL as ?v=N. */
const OG_VERSION = 1;

/* Per-path metadata. Keys are exact pathnames. The `og` field is a slug that
 * must exist in functions/og/[slug].js's PAGES registry. Paths not listed here
 * fall back to the home OG image. */
const PAGE_META = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    og: "home",
  },
  "/crypto": {
    title: "Locked Crypto — Turnpage Digital Markets",
    description:
      "FTX. Celsius. BlockFi. Voyager. Genesis. Mt. Gox. We quote in fiat and close fast on locked digital assets.",
    og: "crypto",
  },
  "/ai-copyright": {
    title: "AI Copyright Claims — Turnpage Digital Markets",
    description:
      "Bartz. The OpenAI MDL. Concord. Getty. We buy copyright claims against generative AI companies and advise on strategy.",
    og: "ai-copyright",
  },
  "/litigation-finance": {
    title: "Litigation Finance — Turnpage Digital Markets",
    description:
      "Capital for the best contingency law firms — so merit drives the docket, not client cashflow.",
    og: "litigation-finance",
  },
};

/* Resolve a request path to its OG metadata. Unknown paths use the default
 * title/desc and fall back to the home OG image. */
function resolveMeta(pathname) {
  // Normalize trailing slash (Cloudflare typically does this, but be defensive).
  let p = pathname;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);

  if (PAGE_META[p]) return PAGE_META[p];

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    og: DEFAULT_OG_SLUG,
  };
}

export async function onRequest(context) {
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const url = new URL(context.request.url);
  const meta = resolveMeta(url.pathname);

  const fullImageUrl = `${url.origin}/og/${meta.og}?v=${OG_VERSION}`;
  const fullPageUrl = `${url.origin}${url.pathname}`;

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", fullPageUrl);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute("content", meta.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on('meta[property="og:image"]', {
      element(el) {
        el.setAttribute("content", fullImageUrl);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute("content", fullPageUrl);
      },
    })
    .on('meta[property="og:site_name"]', {
      element(el) {
        el.setAttribute("content", SITE_NAME);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute("content", meta.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on('meta[name="twitter:image"]', {
      element(el) {
        el.setAttribute("content", fullImageUrl);
      },
    })
    .transform(response);
}
