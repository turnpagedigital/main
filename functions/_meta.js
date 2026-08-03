/* Pure metadata resolution + JSON-LD builders for the per-path SEO middleware.
 *
 * No JSON imports here — functions/_middleware.js feeds the data in. That
 * keeps this module importable from node:test without import attributes
 * (tests/meta-resolver.test.js).
 */

/* Collapse whitespace and cut at a word boundary with an ellipsis. Meta
 * descriptions should sit under ~160 chars; OG descriptions under ~200. */
export function clampText(text, maxLen = 160) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).split(" ").slice(0, -1).join(" ").replace(/[,;:—-]$/, "") + "…";
}

/* A briefing is public unless explicitly drafted (active: false). One legacy
 * index entry has no flag at all — it has always been served, keep it live. */
export function isActiveBriefing(item) {
  return item && item.active !== false;
}

/* Resolve a pathname to its page metadata.
 *
 * data = {
 *   site:      page-meta.json "site" block,
 *   pages:     map of path → { title, description, og },
 *   briefings: public/briefings/index.json items array,
 * }
 *
 * Returns { title, description, og, type, publishedTime?, briefing? }.
 * `og` is a slug for functions/og/[slug].js; briefing pages use the
 * "briefing--<slug>" pattern handled there.
 */
export function resolveMeta(pathname, data) {
  let p = pathname;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);

  const briefingMatch = /^\/briefings\/([^/]+)$/.exec(p);
  if (briefingMatch) {
    const slug = decodeURIComponent(briefingMatch[1]);
    const item = (data.briefings || []).find((b) => b.slug === slug);
    if (isActiveBriefing(item)) {
      return {
        title: clampText(item.title, 90),
        description: clampText(item.summary, 200) ||
          `${data.site.name} intelligence briefing — ${item.date}.`,
        og: `briefing--${slug}`,
        type: "article",
        publishedTime: item.date,
        briefing: item,
      };
    }
    // Draft or unknown slug — serve defaults, no article markup.
  }

  if (data.pages[p]) return { ...data.pages[p], type: "website" };

  return {
    title: data.site.defaultTitle,
    description: data.site.defaultDescription,
    og: "home",
    type: "website",
  };
}

/* True if the pathname corresponds to a real page: a static route from
 * routes.json, the admin shell, or a briefing slug present in the index
 * (drafts included — they serve with noindex for review-by-URL). Anything
 * else is a soft-404 the middleware must downgrade to a real 404 status. */
export function isKnownPath(pathname, data, staticPaths) {
  let p = pathname;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p === "" || p === "/") return true;
  if (p === "/admin" || p.startsWith("/admin/")) return true;
  if (staticPaths.includes(p)) return true;
  const briefingMatch = /^\/briefings\/([^/]+)$/.exec(p);
  if (briefingMatch) {
    const slug = decodeURIComponent(briefingMatch[1]);
    return (data.briefings || []).some((b) => b.slug === slug);
  }
  return false;
}

/* JSON.stringify hardened for inline <script> embedding. */
export function jsonLdScript(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function buildArticleJsonLd(item, origin, site) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: clampText(item.title, 110),
    description: clampText(item.summary, 300),
    datePublished: item.date,
    dateModified: item.date,
    author: {
      "@type": "Organization",
      name: item.author || "Turnpage Intelligence",
      url: origin,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: origin,
      logo: { "@type": "ImageObject", url: `${origin}/og/home` },
    },
    image: [`${origin}/og/briefing--${item.slug}`],
    mainEntityOfPage: `${origin}/briefings/${item.slug}`,
    ...(Array.isArray(item.tags) && item.tags.length
      ? { keywords: item.tags.join(", ") }
      : {}),
  };
}

export function buildBreadcrumbJsonLd(item, origin) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "Briefings", item: `${origin}/briefings` },
      { "@type": "ListItem", position: 3, name: clampText(item.title, 110), item: `${origin}/briefings/${item.slug}` },
    ],
  };
}

export function buildFaqJsonLd(faqItems) {
  const live = (faqItems || []).filter((f) => f && f.active !== false && f.q && f.a);
  if (!live.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: live.map((f) => ({
      "@type": "Question",
      name: clampText(f.q, 200),
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
