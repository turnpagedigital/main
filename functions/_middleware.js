/* Cloudflare Pages middleware: per-path Open Graph + Twitter meta injection.
 *
 * Cloudflare Pages routes all matching requests through this middleware before
 * static assets are served. We let the response flow through normally; for
 * HTML responses we use HTMLRewriter to mutate the existing meta tags in
 * index.html so each path gets a tailored social preview.
 *
 * HTMLRewriter only fires on elements that already exist in the source —
 * index.html must contain a placeholder for every selector below.
 */

const SITE_NAME = "Turnpage Digital Markets";

const DEFAULT_TITLE = "Turnpage Digital Markets — The OTC Desk for Rights Holders";
const DEFAULT_DESC  = "Capital and advisory for rights holders. AI copyright class actions, crypto bankruptcies, complex litigation — over $1B liquidated.";
const DEFAULT_IMAGE = "/og/home.png";

/* Per-path metadata. Keys are exact pathnames (no trailing slash except "/"). */
const PAGE_META = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    image: "/og/home.png",
  },
  "/crypto": {
    title: "Locked Crypto — Turnpage Digital Markets",
    description: "FTX. Celsius. BlockFi. Voyager. Genesis. Mt. Gox. We quote in fiat and close fast on locked digital assets.",
    image: "/og/crypto.png",
  },
  "/ai-copyright": {
    title: "AI Copyright Claims — Turnpage Digital Markets",
    description: "Bartz. The OpenAI MDL. Concord. Getty. We buy copyright claims against generative AI companies and advise on strategy.",
    image: "/og/ai-copyright.png",
  },
  "/press": {
    title: "Press & Publications — Turnpage Digital Markets",
    description: "Coverage, briefings, and commentary from the Turnpage desk.",
    image: "/og/press.png",
  },
  "/briefings": {
    title: "Briefings — Turnpage Digital Markets",
    description: "Analysis, deep dives, and market updates from the Turnpage desk.",
    image: "/og/briefings.png",
  },
  "/contact": {
    title: "Get in Touch — Turnpage Digital Markets",
    description: "Tell us about your claim. 48-hour response. Confidentiality default. Every inquiry read by a partner.",
    image: "/og/contact.png",
  },
  "/privacy": {
    title: "Privacy Policy — Turnpage Digital Markets",
    description: "How Turnpage Digital Markets collects, uses, and safeguards your personal information.",
    image: "/og/legal.png",
  },
  "/terms": {
    title: "Terms of Use — Turnpage Digital Markets",
    description: "Terms of use and disclosures for Turnpage Digital Markets.",
    image: "/og/legal.png",
  },
  "/litigation-finance": {
    title: "Litigation Finance — Turnpage Digital Markets",
    description: "Capital for the best contingency law firms — so merit drives the docket, not client cashflow.",
    image: "/og/litigation-finance.png",
  },
};

/* Resolve a request path to its OG metadata. Nested routes (e.g. a
 * /briefings/<slug> permalink) fall back to their parent section's meta until
 * we generate per-item OG images. */
function resolveMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];

  // Strip trailing slash and try again (Cloudflare typically normalizes,
  // but be defensive).
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const stripped = pathname.slice(0, -1);
    if (PAGE_META[stripped]) return PAGE_META[stripped];
  }

  // Nested route fallback — match the longest known prefix.
  if (pathname.startsWith("/briefings/")) return PAGE_META["/briefings"];
  if (pathname.startsWith("/press/"))     return PAGE_META["/press"];

  return PAGE_META["/"];
}

export async function onRequest(context) {
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const url = new URL(context.request.url);
  const meta = resolveMeta(url.pathname);

  const fullImageUrl = `${url.origin}${meta.image}`;
  const fullPageUrl  = `${url.origin}${url.pathname}`;

  return new HTMLRewriter()
    .on("title", {
      element(el) { el.setInnerContent(meta.title); },
    })
    .on('meta[name="description"]', {
      element(el) { el.setAttribute("content", meta.description); },
    })
    .on('link[rel="canonical"]', {
      element(el) { el.setAttribute("href", fullPageUrl); },
    })
    .on('meta[property="og:title"]', {
      element(el) { el.setAttribute("content", meta.title); },
    })
    .on('meta[property="og:description"]', {
      element(el) { el.setAttribute("content", meta.description); },
    })
    .on('meta[property="og:image"]', {
      element(el) { el.setAttribute("content", fullImageUrl); },
    })
    .on('meta[property="og:url"]', {
      element(el) { el.setAttribute("content", fullPageUrl); },
    })
    .on('meta[property="og:site_name"]', {
      element(el) { el.setAttribute("content", SITE_NAME); },
    })
    .on('meta[name="twitter:title"]', {
      element(el) { el.setAttribute("content", meta.title); },
    })
    .on('meta[name="twitter:description"]', {
      element(el) { el.setAttribute("content", meta.description); },
    })
    .on('meta[name="twitter:image"]', {
      element(el) { el.setAttribute("content", fullImageUrl); },
    })
    .transform(response);
}
