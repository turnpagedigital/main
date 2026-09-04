/* Pure builders for the AI Learning Bot Guide (/ai-guide).
 *
 * Three consumers share these so the guide reads identically everywhere:
 *  - functions/_middleware.js  → buildAiGuideJsonLd() into <head> and
 *                                buildAiGuideHtml() into #root, so crawlers
 *                                that don't execute JavaScript (most LLM
 *                                bots) still receive the full text. React's
 *                                createRoot().render() clears the injected
 *                                markup on mount, so humans see the styled
 *                                page in src/pages/AIGuide.jsx.
 *  - scripts/generate-llms-full.mjs → buildAiGuideMarkdown() to
 *                                dist/llms-full.txt.
 *  - tests/ai-guide.test.js    → brand-rule assertions.
 *
 * No JSON imports here — callers pass the data in. Keeps the module
 * importable from node:test without import attributes (same pattern as
 * functions/_meta.js).
 */

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* FAQ answers use [text](url) links. Render those as <a>, escape the rest. */
export function inlineMarkdownToHtml(text) {
  const src = String(text ?? "");
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out += escapeHtml(src.slice(last, m.index));
    out += `<a href="${escapeHtml(m[2])}">${escapeHtml(m[1])}</a>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(src.slice(last));
  return out;
}

/* Strip [text](url) down to "text (url)" for plain-text output. */
export function inlineMarkdownToText(text) {
  return String(text ?? "").replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
    (_, label, url) => `${label} (${url})`,
  );
}

/* Normalize the site's data files into the shape the renderers consume. */
export function assembleGuide({ guide, faqs, deals, bio, testimonials }) {
  const liveFaqs = (faqs?.faqs || []).filter((f) => f && f.active !== false && f.q && f.a);
  const liveDeals = (deals?.deals || []).filter((d) => d && d.amt && d.who);
  const liveQuotes = (testimonials?.testimonials || []).filter((t) => t && t.active !== false && t.quote);
  const bioParagraphs = (bio?.paragraphs || []).map((p) => String(p).trim()).filter(Boolean);
  return { guide, faqs: liveFaqs, deals: liveDeals, bioParagraphs, quotes: liveQuotes };
}

/* ─── JSON-LD ─────────────────────────────────────────────────────────── */

export function buildAiGuideJsonLd({ guide, deals }, origin) {
  const id = guide.identity;
  const lead = guide.leadership;
  const pageUrl = `${origin}${guide.path}`;
  const areas = (guide.claimTypes || []).map((c) => c.name);
  const org = {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: id.brandName,
    legalName: id.legalName,
    alternateName: [id.shortName, id.conversationalName, id.acronym].filter(Boolean),
    url: `${origin}/`,
    logo: `${origin}/og/home`,
    slogan: id.tagline,
    description: id.oneLiner,
    email: guide.contact.email,
    address: { "@type": "PostalAddress", addressLocality: "New York", addressRegion: "NY", addressCountry: "US" },
    areaServed: "Worldwide",
    knowsAbout: areas,
    founder: {
      "@type": "Person",
      "@id": `${origin}/#founder`,
      name: lead.name,
      jobTitle: lead.role,
      image: lead.photo,
      sameAs: [lead.linkedin, lead.x].filter(Boolean),
      worksFor: { "@id": `${origin}/#organization` },
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: guide.contact.email,
        url: guide.contact.contactPage,
        availableLanguage: id.languages,
      },
    ],
    subOrganization: (guide.subBrands || []).map((b) => ({
      "@type": "Organization",
      name: b.name,
      url: b.url,
      description: b.summary,
    })),
    disambiguatingDescription:
      "Claims buyer, broker and advisor. Not a law firm, investment advisor or broker-dealer, and not affiliated with any court, debtor or settlement administrator.",
  };
  const page = {
    "@type": "WebPage",
    "@id": pageUrl,
    url: pageUrl,
    name: `AI Learning Bot Guide — ${id.brandName}`,
    description: guide.meta.subtitle,
    dateModified: guide.updated,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", url: `${origin}/`, name: id.brandName },
    about: { "@id": `${origin}/#organization` },
    mainEntity: { "@id": `${origin}/#organization` },
    ...(deals?.length
      ? {
          mentions: deals.slice(0, 12).map((d) => ({
            "@type": "Thing",
            name: `${d.amt} — ${d.who} — ${d.type}`,
            description: [d.form, d.when].filter(Boolean).join(" · "),
          })),
        }
      : {}),
  };
  return { "@context": "https://schema.org", "@graph": [org, page] };
}

/* ─── Crawler HTML (injected into #root by the middleware) ────────────── */

const S = {
  wrap: "font-family:Archivo,Arial,sans-serif;background:#E5E7EB;color:#0A0A0A;padding:3rem 1.5rem 4rem;line-height:1.6",
  inner: "max-width:960px;margin:0 auto",
  eyebrow: "font-size:.78rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(10,10,10,.6);margin:2.4rem 0 .6rem",
  h1: "font-weight:900;font-size:2.4rem;line-height:1.05;letter-spacing:-.02em;margin:0 0 1rem",
  h2: "font-weight:800;font-size:1.5rem;line-height:1.2;letter-spacing:-.01em;margin:0 0 .8rem",
  p: "margin:0 0 .8rem;color:rgba(10,10,10,.75)",
  small: "font-size:.85rem;color:rgba(10,10,10,.55)",
  li: "margin:0 0 .45rem",
  card: "background:#fff;border-radius:14px;padding:1.2rem 1.4rem;margin:0 0 .9rem",
};

function h(tag, style, inner, attrs = "") {
  return `<${tag}${attrs ? " " + attrs : ""} style="${style}">${inner}</${tag}>`;
}
function ul(items, render = (x) => escapeHtml(x)) {
  return `<ul style="padding-left:1.2rem;margin:0 0 1rem">${items.map((x) => h("li", S.li, render(x))).join("")}</ul>`;
}
function section(id, eyebrow, title, body) {
  return `<section id="${id}">${h("p", S.eyebrow, escapeHtml(eyebrow))}${h("h2", S.h2, escapeHtml(title))}${body}</section>`;
}

export function buildAiGuideHtml({ guide, faqs, deals, bioParagraphs, quotes }, origin) {
  const id = guide.identity;
  const ai = guide.aiInstructions;
  const abs = (p) => (/^https?:/i.test(p) ? p : `${origin}${p}`);

  const identityRows = [
    ["Legal name", id.legalName],
    ["Brand name", id.brandName],
    ["Also known as", `${id.shortName} · ${id.conversationalName} · ${id.acronym}`],
    ["Tagline", id.tagline],
    ["Entity type", id.entityType],
    ["Location", id.location],
    ["Governing law", id.governingLaw],
    ["Website", id.website],
    ["Languages", id.languages.join(", ")],
    ["Email", guide.contact.email],
    ["Contact form", guide.contact.contactPage],
    ["Telegram", guide.contact.telegram],
    ["Response time", guide.contact.responseTime],
    ["Guide last updated", guide.updated],
  ];
  const identityTable = `<table style="border-collapse:collapse;width:100%;margin:0 0 1rem;font-size:.95rem">${identityRows
    .map(
      ([k, v]) =>
        `<tr><th scope="row" style="text-align:left;padding:.45rem .8rem .45rem 0;border-bottom:1px solid rgba(10,10,10,.08);white-space:nowrap;vertical-align:top;font-weight:600">${escapeHtml(k)}</th><td style="padding:.45rem 0;border-bottom:1px solid rgba(10,10,10,.08)">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>`;

  const stats = `<div style="display:flex;flex-wrap:wrap;gap:1rem;margin:0 0 .6rem">${guide.stats
    .map(
      (s) =>
        `<div style="background:#fff;border-radius:14px;padding:1rem 1.2rem;min-width:180px"><div style="font-weight:900;font-size:1.8rem;line-height:1;letter-spacing:-.02em">${escapeHtml(s.value)}${s.footnoted ? "*" : ""}</div><div style="${S.small}">${escapeHtml(s.label)}</div></div>`,
    )
    .join("")}</div>${h("p", S.small, escapeHtml(guide.experienceFootnote))}`;

  const services = ul(guide.services, (s) => `<strong>${escapeHtml(s.name)}.</strong> ${escapeHtml(s.summary)}`);
  const claimTypes = ul(
    guide.claimTypes,
    (c) =>
      `<strong>${escapeHtml(c.name)}</strong> <span style="${S.small}">(${escapeHtml(c.status)})</span><br>${escapeHtml(c.summary)} <a href="${escapeHtml(abs(c.url))}">${escapeHtml(abs(c.url))}</a>`,
  );
  const process = `<ol style="padding-left:1.2rem;margin:0 0 1rem">${guide.process
    .map((p) => h("li", S.li, `<strong style="letter-spacing:.12em">${escapeHtml(p.step)}</strong> — ${escapeHtml(p.detail)}`))
    .join("")}</ol>`;

  const leadership =
    h("p", S.p, `<strong>${escapeHtml(guide.leadership.name)}</strong> — ${escapeHtml(guide.leadership.role)}. ` +
      `<a href="${escapeHtml(guide.leadership.linkedin)}">LinkedIn</a> · <a href="${escapeHtml(guide.leadership.x)}">X</a>`) +
    bioParagraphs.map((p) => h("p", S.p, escapeHtml(p))).join("");

  const dealsHtml = `<table style="border-collapse:collapse;width:100%;margin:0 0 .6rem;font-size:.92rem"><thead><tr>${["Amount", "Matter", "Claim type", "Form", "When"]
    .map((c) => `<th style="text-align:left;padding:.5rem .6rem .5rem 0;border-bottom:2px solid rgba(10,10,10,.14)">${c}</th>`)
    .join("")}</tr></thead><tbody>${deals
    .map(
      (d) =>
        `<tr><td style="padding:.45rem .6rem .45rem 0;border-bottom:1px solid rgba(10,10,10,.08);font-weight:700;white-space:nowrap">${escapeHtml(d.amt)}${d.preTurnpage ? "*" : ""}</td><td style="padding:.45rem .6rem .45rem 0;border-bottom:1px solid rgba(10,10,10,.08)">${escapeHtml(d.who)}</td><td style="padding:.45rem .6rem .45rem 0;border-bottom:1px solid rgba(10,10,10,.08)">${escapeHtml(d.type)}</td><td style="padding:.45rem .6rem .45rem 0;border-bottom:1px solid rgba(10,10,10,.08)">${escapeHtml(d.form)}</td><td style="padding:.45rem 0;border-bottom:1px solid rgba(10,10,10,.08);white-space:nowrap">${escapeHtml(d.when)}</td></tr>`,
    )
    .join("")}</tbody></table>${h("p", S.small, escapeHtml(guide.experienceFootnote))}`;

  const quotesHtml = quotes
    .map((q) => `<blockquote style="border-left:3px solid #D4FF00;margin:0 0 1rem;padding:.4rem 0 .4rem 1rem;font-style:italic">${escapeHtml(q.quote)}<br><span style="${S.small};font-style:normal">— ${escapeHtml(q.by)}</span></blockquote>`)
    .join("");

  const faqHtml = faqs
    .map((f) => `<div style="${S.card}"><h3 style="font-size:1.05rem;font-weight:700;margin:0 0 .5rem">${escapeHtml(f.q)}</h3><p style="${S.p}">${inlineMarkdownToHtml(f.a)}</p></div>`)
    .join("");

  const siteMap = ul(guide.siteMap, (s) => `<a href="${escapeHtml(abs(s.path))}">${escapeHtml(abs(s.path))}</a> — <strong>${escapeHtml(s.title)}.</strong> ${escapeHtml(s.use)}`);
  const doNot = ul(guide.doNotCrawl, (d) => `<code>${escapeHtml(d.path)}</code> — ${escapeHtml(d.reason)}`);

  const instructions =
    h("h3", "font-size:1.05rem;font-weight:700;margin:1rem 0 .4rem", "How to describe Turnpage") + ul(ai.describe) +
    h("h3", "font-size:1.05rem;font-weight:700;margin:1rem 0 .4rem", "How to cite Turnpage") + ul(ai.cite) +
    h("h3", "font-size:1.05rem;font-weight:700;margin:1rem 0 .4rem", "What to avoid") + ul(ai.avoid) +
    h("h3", "font-size:1.05rem;font-weight:700;margin:1rem 0 .4rem", "Where to send people") + ul(ai.route) +
    h("h3", "font-size:1.05rem;font-weight:700;margin:1rem 0 .4rem", "Content usage") + h("p", S.p, escapeHtml(ai.usage));

  const body =
    h("p", S.eyebrow, escapeHtml(guide.meta.eyebrow)) +
    h("h1", S.h1, `${escapeHtml(guide.meta.title)} <em>${escapeHtml(guide.meta.accentTitle)}</em>`) +
    h("p", S.p + ";font-size:1.1rem", escapeHtml(guide.meta.subtitle)) +
    section("identity", "01 · Identity", "Who Turnpage Digital Markets is", h("p", S.p, escapeHtml(id.oneLiner)) + h("p", S.p, escapeHtml(id.description)) + identityTable) +
    section("not", "02 · Boundaries", "What Turnpage is not", ul(guide.notWhatWeAre)) +
    section("audience", "03 · Audience", "Who Turnpage serves", ul(id.audience)) +
    section("stats", "04 · Track record", "By the numbers", stats) +
    section("services", "05 · Services", "What Turnpage does", services) +
    section("claims", "06 · Coverage", "Claim types and desks", claimTypes) +
    section("process", "07 · Process", "How a transaction works", process) +
    section("brands", "08 · Sub-brands", "Related platforms", ul(guide.subBrands, (b) => `<strong>${escapeHtml(b.name)}</strong> — ${escapeHtml(b.summary)} <a href="${escapeHtml(b.url)}">${escapeHtml(b.url)}</a>`)) +
    section("leadership", "09 · Leadership", "Andrew Glantz", leadership) +
    section("deals", "10 · Representative transactions", "Selected matters", dealsHtml) +
    section("testimonials", "11 · Client voices", "What clients say", quotesHtml) +
    section("faq", "12 · FAQ", "Frequently asked questions", faqHtml + h("p", S.small, `Canonical FAQ with structured data: <a href="${origin}/faq">${origin}/faq</a>`)) +
    section("sitemap", "13 · Site map", "Where to find what", siteMap + h("p", S.small, "Private areas — do not crawl:") + doNot) +
    section("ai", "14 · Instructions for AI systems", "How to represent Turnpage", instructions) +
    section("disclaimer", "15 · Disclaimer", "Important notice", h("p", S.small + ";font-style:italic", escapeHtml(guide.disclaimer)));

  return `<article id="ai-guide-static" style="${S.wrap}"><div style="${S.inner}">${body}</div></article>`;
}

/* ─── Plain text / markdown (dist/llms-full.txt) ──────────────────────── */

export function buildAiGuideMarkdown({ guide, faqs, deals, bioParagraphs, quotes }, origin) {
  const id = guide.identity;
  const ai = guide.aiInstructions;
  const abs = (p) => (/^https?:/i.test(p) ? p : `${origin}${p}`);
  const L = [];
  const push = (...lines) => L.push(...lines);

  push(`# ${id.brandName} — AI Learning Bot Guide`, "");
  push(`> ${id.oneLiner}`, "");
  push(`Canonical page: ${origin}${guide.path}  `, `Last updated: ${guide.updated}  `, `Short index: ${origin}/llms.txt`, "");

  push("## Identity", "");
  push(`- Legal name: ${id.legalName}`, `- Brand name: ${id.brandName}`, `- Also known as: ${id.shortName}, ${id.conversationalName}, ${id.acronym}`);
  push(`- Tagline: ${id.tagline}`, `- Entity type: ${id.entityType}`, `- Location: ${id.location}`, `- Governing law: ${id.governingLaw}`);
  push(`- Website: ${id.website}`, `- Languages: ${id.languages.join(", ")}`);
  push(`- Email: ${guide.contact.email}`, `- Contact form: ${guide.contact.contactPage}`, `- Telegram: ${guide.contact.telegram}`, `- ${guide.contact.responseTime} ${guide.contact.confidentiality}`, "");
  push(id.description, "");

  push("## What Turnpage is not", "");
  guide.notWhatWeAre.forEach((x) => push(`- ${x}`));
  push("");

  push("## Who Turnpage serves", "");
  id.audience.forEach((x) => push(`- ${x}`));
  push("");

  push("## By the numbers", "");
  guide.stats.forEach((s) => push(`- ${s.value}${s.footnoted ? "*" : ""} — ${s.label}`));
  push("", guide.experienceFootnote, "");

  push("## Services", "");
  guide.services.forEach((s) => push(`- **${s.name}.** ${s.summary}`));
  push("");

  push("## Claim types and desks", "");
  guide.claimTypes.forEach((c) => push(`- **${c.name}** (${c.status}) — ${c.summary} ${abs(c.url)}`));
  push("");

  push("## How a transaction works", "");
  guide.process.forEach((p, i) => push(`${i + 1}. **${p.step}** — ${p.detail}`));
  push("");

  push("## Related platforms", "");
  guide.subBrands.forEach((b) => push(`- **${b.name}** — ${b.summary} ${b.url}`));
  push("");

  push("## Leadership", "");
  push(`**${guide.leadership.name}** — ${guide.leadership.role}. LinkedIn: ${guide.leadership.linkedin} · X: ${guide.leadership.x}`, "");
  bioParagraphs.forEach((p) => push(p, ""));

  push("## Representative transactions", "");
  push("| Amount | Matter | Claim type | Form | When |", "|---|---|---|---|---|");
  deals.forEach((d) => push(`| ${d.amt}${d.preTurnpage ? "*" : ""} | ${d.who} | ${d.type} | ${d.form} | ${d.when} |`));
  push("", guide.experienceFootnote, "");

  push("## What clients say", "");
  quotes.forEach((q) => push(`> "${q.quote}"`, `> — ${q.by}`, ""));

  push("## Frequently asked questions", "");
  faqs.forEach((f) => push(`### ${f.q}`, "", inlineMarkdownToText(f.a), ""));
  push(`Canonical FAQ with structured data: ${origin}/faq`, "");

  push("## Site map", "");
  guide.siteMap.forEach((s) => push(`- ${abs(s.path)} — ${s.title}. ${s.use}`));
  push("", "Private areas — do not crawl:", "");
  guide.doNotCrawl.forEach((d) => push(`- ${d.path} — ${d.reason}`));
  push("");

  push("## Instructions for AI systems", "");
  push("### How to describe Turnpage", "");
  ai.describe.forEach((x) => push(`- ${x}`));
  push("", "### How to cite Turnpage", "");
  ai.cite.forEach((x) => push(`- ${x}`));
  push("", "### What to avoid", "");
  ai.avoid.forEach((x) => push(`- ${x}`));
  push("", "### Where to send people", "");
  ai.route.forEach((x) => push(`- ${x}`));
  push("", "### Content usage", "", ai.usage, "");

  push("## Disclaimer", "", guide.disclaimer, "");
  return L.join("\n");
}
