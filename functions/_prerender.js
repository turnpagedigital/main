/* Static HTML for non-JS crawlers — every composed marketing page.
 *
 * Why: the site is a client-rendered Vite/React SPA. Before this module the
 * HTML we served was a ~5KB shell — 6-12 words, zero <h1>, one link — on all
 * 21 sitemap URLs, identical for Googlebot and Bingbot. The rendered pages
 * carry ~2,000 words each. This module closes that gap by turning the same
 * page-compositions.json the React PageRenderer reads into semantic HTML that
 * functions/_middleware.js injects into #root. React's createRoot().render()
 * clears the injected markup on mount, so humans still get the styled page.
 *
 * Same contract as functions/_ai-guide.js, which does this for /ai-guide:
 * no JSON imports here — callers pass the data in — so node:test can import
 * this without import attributes. Unit-tested in tests/prerender.test.js.
 *
 * Output is intentionally unstyled and structural: headings, paragraphs,
 * lists and links. It is read by crawlers, never seen by a person.
 */

import { escapeHtml, inlineMarkdownToHtml } from "./_ai-guide.js";

/* Sections whose text lives in a shared data file rather than the
 * composition, keyed by the prop the caller passes in. */
const DATA_DRIVEN = new Set(["bio", "testimonials", "experience", "faq", "damages"]);

/* ---------- small helpers ---------- */

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function h(level, text) {
  const t = clean(text);
  return t ? `<h${level}>${escapeHtml(t)}</h${level}>` : "";
}

/* inlineMarkdownToHtml handles [text](url) and escaping; emphasis markers
 * would otherwise leak into the output as literal asterisks. Applied after
 * escaping, which never introduces a `*`. */
function inline(text) {
  return inlineMarkdownToHtml(clean(text))
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

function p(text) {
  const t = clean(text);
  return t ? `<p>${inline(t)}</p>` : "";
}

/* Eyebrows are kickers above a heading, not headings themselves — emitting
 * them as <h2> put an h2 before the page's h1. */
const eyebrow = (text) => p(text);

/* Joins a split headline ("Built to move fast" + "when it counts.") back into
 * the single line a reader sees, so the heading isn't fragmented for crawlers. */
function joinTitle(...parts) {
  return parts.map(clean).filter(Boolean).join(" ");
}

function link(label, href) {
  const l = clean(label);
  const u = clean(href);
  if (!l) return "";
  if (!u) return `<span>${escapeHtml(l)}</span>`;
  return `<a href="${escapeHtml(u)}">${escapeHtml(l)}</a>`;
}

function ctaList(...ctas) {
  const items = ctas
    .filter((c) => c && clean(c.label))
    .map((c) => `<li>${link(c.label, c.href)}</li>`)
    .join("");
  return items ? `<ul>${items}</ul>` : "";
}

function list(items, render) {
  const body = (items || []).map(render).filter(Boolean).join("");
  return body ? `<ul>${body}</ul>` : "";
}

/* Minimal markdown for rich-text blocks: ATX headings, list items, bold and
 * paragraphs. Deliberately not the full `marked` grammar — pulling that into
 * the Worker for a handful of blocks isn't worth the bundle. */
export function miniMarkdownToHtml(src, baseLevel = 3) {
  const lines = String(src ?? "").split(/\r?\n/);
  const out = [];
  let para = [];
  let bullets = [];

  const flushPara = () => {
    if (para.length) {
      out.push(p(para.join(" ")));
      para = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length) {
      out.push(`<ul>${bullets.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`);
      bullets = [];
    }
  };

  /* GitHub-style pipe tables. Case briefings carry claim-reconciliation and
   * docket figures; flattening those to prose loses the association between
   * a label and its number, which is exactly what a crawler should read. */
  const splitRow = (line) =>
    line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  const isDivider = (line) => /^\|?[\s:-]*-[\s|:-]*\|?$/.test(line) && line.includes("-");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      flushBullets();
      flushPara();
      continue;
    }

    const next = (lines[i + 1] || "").trim();
    if (line.includes("|") && isDivider(next)) {
      flushBullets();
      flushPara();
      const head = splitRow(line);
      const body = [];
      i += 2;
      while (i < lines.length && lines[i].trim().includes("|")) {
        body.push(splitRow(lines[i].trim()));
        i++;
      }
      i--;
      const thead = `<thead><tr>${head.map((h2) => `<th>${inline(h2)}</th>`).join("")}</tr></thead>`;
      const tbody = body.length
        ? `<tbody>${body.map((r) => `<tr>${r.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`
        : "";
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushBullets();
      flushPara();
      const level = Math.min(6, Math.max(baseLevel, heading[1].length));
      out.push(h(level, heading[2].replace(/\*+/g, "")));
      continue;
    }
    const bullet = line.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      flushPara();
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();
    para.push(line);
  }
  flushBullets();
  flushPara();
  return out.filter(Boolean).join("\n");
}

/* ---------- per-section renderers ---------- */
/* Each returns the section's readable text. `lvl` is the heading level for
 * the section's own title: 1 for the page's first hero, 2 everywhere else. */

const RENDERERS = {
  "home-hero": (c, lvl) =>
    [
      h(lvl, joinTitle(c.title1, c.title2)),
      p(c.subtitle),
      ctaList(c.ctaPrimary, c.ctaSecondary),
    ].join(""),

  hero: (c, lvl) =>
    [
      eyebrow(c.eyebrow),
      h(lvl, joinTitle(c.title, c.accentTitle)),
      p(c.subtitle),
      ctaList(c.ctaPrimary, c.ctaSecondary),
    ].join(""),

  "stats-band": (c) =>
    [
      list(c.stats, (s) => `<li>${escapeHtml(clean(s.value))} — ${escapeHtml(clean(s.label))}</li>`),
      p(c.footnote),
    ].join(""),

  situations: (c, lvl) =>
    [eyebrow(c.eyebrow), h(lvl, joinTitle(c.title, c.titleAccent)), p(c.body)].join(""),

  "service-cards": (c, lvl) =>
    [
      h(lvl, joinTitle(c.title, c.accent)),
      (c.cards || [])
        .map((card) =>
          [h(lvl + 1, card.title), p(card.subtitle), p(card.body)].join(""),
        )
        .join(""),
    ].join(""),

  "audience-cards": (c, lvl) =>
    [
      h(lvl, joinTitle(c.title, c.accent)),
      (c.cards || []).map((card) => [h(lvl + 1, card.title), p(card.body)].join("")).join(""),
    ].join(""),

  "photo-break": (c, lvl) => h(lvl, joinTitle(c.overlayText, c.overlayAccent)),

  "our-edge": (c, lvl) =>
    [
      h(lvl, joinTitle(c.title, c.titleAccent)),
      p(c.intro),
      (c.points || []).map((pt) => [h(lvl + 1, pt.h), p(pt.b)].join("")).join(""),
    ].join(""),

  "cta-banner": (c, lvl) => [h(lvl, c.title), ctaList({ label: c.cta, href: c.href })].join(""),

  "get-quote": (c, lvl) =>
    [h(lvl, joinTitle(c.title, c.titleAccent)), p(c.body), ctaList(c.cta)].join(""),

  cta: (c, lvl) =>
    [
      h(lvl, joinTitle(c.title, c.accent)),
      p(c.kicker),
      ctaList(c.primary, c.secondary, { label: c.cta, href: c.href }),
    ].join(""),

  "bottom-cta": (c, lvl) =>
    [h(lvl, joinTitle(c.title, c.accent)), p(c.kicker), ctaList(c.primary, c.secondary)].join(""),

  "rich-text": (c, lvl) =>
    [
      h(lvl, joinTitle(c.heading1, c.heading1Accent, c.heading1After)),
      miniMarkdownToHtml(c.markdown, lvl + 1),
    ].join(""),

  timeline: (c, lvl) =>
    [
      eyebrow(c.eyebrow),
      h(lvl, joinTitle(c.title, c.accent)),
      (c.steps || [])
        .map((s) =>
          [h(lvl + 1, joinTitle(s.when, s.heading)), p(s.body)].join(""),
        )
        .join(""),
      (c.cards || [])
        .map((card) => [h(lvl + 1, joinTitle(card.tag, card.figure)), p(card.title), p(card.note)].join(""))
        .join(""),
      p(c.footnote),
    ].join(""),

  "how-it-works": (c, lvl) =>
    [
      h(lvl, joinTitle(c.title, c.accent)),
      p(c.kicker),
      (c.steps || [])
        .map((s) => [h(lvl + 1, joinTitle(s.n, s.title)), p(s.body)].join(""))
        .join(""),
    ].join(""),

  comparison: (c, lvl) =>
    [
      h(lvl, joinTitle(c.title, c.accent)),
      [c.oldWay, c.newWay]
        .filter(Boolean)
        .map((col) =>
          [
            h(lvl + 1, col.title),
            list(col.items, (i) => `<li>${inlineMarkdownToHtml(clean(typeof i === "string" ? i : i && (i.text || i.label)))}</li>`),
          ].join(""),
        )
        .join(""),
    ].join(""),

  "registration-flow": (c, lvl) =>
    [h(lvl, joinTitle(c.title, c.accent)), p(c.disclosure)].join(""),

  /* The contact page is the form; its only prose is the sidebar plus the
   * direct contact handles. Thin by design — don't pad it. */
  /* Long-form reference page for a single case. Owns the page's <h1>; every
   * body section becomes a real heading so the document has an outline a
   * crawler and a citing model can follow. The CTA is emitted only when the
   * author switched it on. */
  "case-briefing": (c, lvl) => {
    const out = [
      eyebrow(c.eyebrow),
      h(lvl, c.title),
      p(c.standfirst),
      p([clean(c.byline) && `By ${clean(c.byline)}`, clean(c.publishedDate) && `Published ${clean(c.publishedDate)}`]
        .filter(Boolean).join(" · ")),
    ];

    if ((c.stats || []).length || clean(c.statusIntro)) {
      out.push(h(lvl + 1, joinTitle(c.statusHeading || "Where the case stands",
        clean(c.statusAsOf) && `— as of ${clean(c.statusAsOf)}`)));
      out.push(list(c.stats, (s) =>
        clean(s.value) || clean(s.label)
          ? `<li>${escapeHtml(clean(s.value))} — ${escapeHtml(clean(s.label))}</li>`
          : ""));
      out.push(miniMarkdownToHtml(c.statusIntro, lvl + 2));
    }

    if ((c.facts || []).length) {
      out.push(list(c.facts, (f) =>
        clean(f.label) || clean(f.value)
          ? `<li>${escapeHtml(clean(f.label))}: ${inline(f.value)}</li>`
          : ""));
    }

    for (const sec of c.sections || []) {
      if (!sec) continue;
      out.push(h(lvl + 1, sec.heading));
      out.push(miniMarkdownToHtml(sec.markdown, lvl + 2));
    }

    if ((c.updateLog || []).length) {
      out.push(h(lvl + 1, "Update log"));
      out.push(list(c.updateLog, (u) =>
        clean(u.date) || clean(u.note)
          ? `<li>${escapeHtml(clean(u.date))} — ${escapeHtml(clean(u.note))}</li>`
          : ""));
    }

    if ((c.faqs || []).length) {
      out.push(h(lvl + 1, c.faqHeading || "Common questions"));
      for (const f of c.faqs) {
        if (!f || !clean(f.q)) continue;
        out.push(h(lvl + 2, f.q));
        out.push(miniMarkdownToHtml(f.a, lvl + 3));
      }
    }

    if ((c.sources || []).length) {
      out.push(h(lvl + 1, "Sources"));
      out.push(list(c.sources, (s) =>
        clean(s.label) ? `<li>${link(s.label, s.url) || escapeHtml(clean(s.label))}</li>` : ""));
    }

    if (c.ctaEnabled === true) {
      out.push(h(lvl + 1, c.ctaHeading));
      out.push(p(c.ctaBody));
      out.push(ctaList({ label: c.ctaLabel, href: c.ctaHref }));
    }

    out.push(p(c.disclaimer));
    return out.filter(Boolean).join("");
  },

  "contact-form": (c, lvl) =>
    [
      h(lvl, c.sidebarHeading),
      p(c.sidebarIntro),
      list(
        [
          clean(c.telegram) && { label: `Telegram: ${clean(c.telegram)}`, href: `https://t.me/${clean(c.telegram).replace(/^@/, "")}` },
          clean(c.whatsapp) && { label: `WhatsApp: ${clean(c.whatsapp)}`, href: `https://wa.me/${clean(c.whatsapp).replace(/\D/g, "")}` },
        ].filter(Boolean),
        (i) => `<li>${link(i.label, i.href)}</li>`,
      ),
    ].join(""),
};

/* Sections that carry no readable text of their own. */
const SILENT = new Set(["media-banner", "image-text", "process-flow"]);

/* ---------- data-driven sections ---------- */

function renderBio(bio, lvl) {
  if (!bio) return "";
  return [
    h(lvl, joinTitle(bio.tagline_before, bio.tagline_accent, bio.tagline_after)),
    (bio.paragraphs || []).map(p).join(""),
  ].join("");
}

function renderTestimonials(testimonials, pageKey, lvl) {
  const items = (testimonials || []).filter(
    (t) => t.active !== false && Array.isArray(t.tags) && t.tags.includes(pageKey),
  );
  if (!items.length) return "";
  return [
    h(lvl, "What clients say"),
    items
      .map((t) => `<blockquote><p>${escapeHtml(clean(t.quote))}</p><cite>${escapeHtml(clean(t.by))}</cite></blockquote>`)
      .join(""),
  ].join("");
}

function renderExperience(deals, pageKey, content, lvl) {
  const items = (deals || []).filter((d) => Array.isArray(d.pages) && d.pages.includes(pageKey));
  if (!items.length) return "";
  const c = content || {};
  return [
    h(lvl, c.title || "Relevant experience"),
    p(c.body),
    items
      .map((d) =>
        [
          h(lvl + 1, joinTitle(d.amt, d.who)),
          p([d.type, d.form, d.when].map(clean).filter(Boolean).join(" · ")),
          p(d.summary),
        ].join(""),
      )
      .join(""),
    p(c.footnote),
  ].join("");
}

function renderFaq(faqs, pageKey, content, lvl) {
  /* src/pages/FAQ.jsx lists every active FAQ (the page filter is a UI chip,
   * not a data slice), so the /faq route prerenders the whole set. Every
   * other page takes the slice tagged for it. */
  const items = (faqs || []).filter((f) =>
    f.active === false
      ? false
      : pageKey === "faq" || (Array.isArray(f.pages) && f.pages.includes(pageKey)),
  );
  if (!items.length) return "";
  const c = content || {};
  return [
    h(lvl, joinTitle(c.title || "Your questions,", c.accent || "answered.")),
    items.map((f) => [h(lvl + 1, f.q), p(f.a)].join("")).join(""),
  ].join("");
}

function renderDamages(damages, lvl) {
  const rows = damages || [];
  if (!rows.length) return "";
  return [
    h(lvl, "Reported damages by case"),
    list(rows, (d) => {
      const label = clean(d.case || d.name || d.label);
      const amt = d.amountB != null ? `$${d.amountB}B` : clean(d.amount);
      return label ? `<li>${escapeHtml(label)}${amt ? ` — ${escapeHtml(amt)}` : ""}</li>` : "";
    }),
  ].join("");
}

/* ---------- page assembly ---------- */

export function buildSectionHtml(section, ctx, lvl) {
  if (!section || section.visible === false) return "";
  const type = section.type;
  const content = section.content || {};

  if (SILENT.has(type)) return "";

  if (DATA_DRIVEN.has(type)) {
    if (type === "bio") return renderBio(ctx.bio, lvl);
    if (type === "testimonials") return renderTestimonials(ctx.testimonials, ctx.pageKey, lvl);
    if (type === "experience") return renderExperience(ctx.deals, ctx.pageKey, content, lvl);
    if (type === "faq") return renderFaq(ctx.faqs, ctx.pageKey, content, lvl);
    if (type === "damages") {
      return ctx.pageKey === "ai-copyright" ? renderDamages(ctx.damages, lvl) : "";
    }
  }

  const render = RENDERERS[type];
  if (!render) return "";
  return render(content, lvl);
}

/* The page's crawlable link graph. Before this, the served HTML carried a
 * single href (the self-canonical), so no authority flowed between pages. */
export function buildLinkGraphHtml(nav, footer) {
  const seen = new Set();
  const items = [];
  const push = (label, href) => {
    const l = clean(label);
    const u = clean(href);
    if (!l || !u || seen.has(u)) return;
    seen.add(u);
    items.push(`<li>${link(l, u)}</li>`);
  };

  for (const item of (nav && nav.items) || []) {
    if (item.active === false) continue;
    push(item.label, item.href);
    const dd = item.dropdown;
    if (dd) {
      for (const l of dd.links || []) push(l.label, l.href);
      if (dd.cta) push(dd.cta.label, dd.cta.href);
    }
  }
  for (const col of (footer && footer.columns) || []) {
    for (const l of col.links || []) {
      if (l.hidden) continue;
      push(l.label, l.href);
    }
  }
  return items.length ? `<nav aria-label="Site"><ul>${items.join("")}</ul></nav>` : "";
}

/* The crawlable counterpart to DocumentChrome: a reference page ships
 * attribution and legal links, never the marketing nav. Keeps the promise the
 * rendered page makes — no link to sell a claim — in the HTML a crawler and a
 * citing model actually read. */
export const DOCUMENT_LINKS = `<nav aria-label="Site"><ul>${[
  ["Turnpage Digital Markets", "/"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
].map(([l, u]) => `<li>${link(l, u)}</li>`).join("")}</ul></nav>`;

export function isDocumentPage(page) {
  return ((page && page.sections) || []).some((s) => s.type === "case-briefing");
}

export function buildPageHtml(page, ctx) {
  const sections = (page && page.sections) || [];
  let usedH1 = false;
  const out = [];

  for (const section of sections) {
    /* The first hero on the page owns the single <h1>. */
    /* A case briefing is the page's document, so it claims the <h1> the way
     * a hero does on a marketing page. */
    const isHero =
      section.type === "hero" ||
      section.type === "home-hero" ||
      section.type === "case-briefing";
    const lvl = isHero && !usedH1 ? 1 : 2;
    const html = buildSectionHtml(section, ctx, lvl);
    if (!html) continue;
    if (lvl === 1) usedH1 = true;
    out.push(`<section>${html}</section>`);
  }
  const html = out.join("\n");
  /* Pages whose hero is hidden (/contact) or absent (/press) would ship no
   * <h1> at all; promote their first heading so every page has exactly one.
   * ctx.h1Claimed lets a caller that already emitted the <h1> (e.g. /press,
   * whose list is prepended) keep the page to a single one. */
  if (usedH1 || ctx.h1Claimed) return html;
  return html.replace(/<h2>([\s\S]*?)<\/h2>/, "<h1>$1</h1>");
}

/* /press — the media list, from the same press.json the Press page reads. */
export function buildPressListHtml(items, lvl = 1) {
  const live = (items || []).filter((i) => i && (i.piece_title || i.excerpt));
  if (!live.length) return "";
  return [
    h(lvl, "Press & Publications"),
    live
      .map((i) =>
        [
          h(lvl + 1, i.piece_title || i.publication_title),
          p([i.author, i.publication_title, i.date].map(clean).filter(Boolean).join(" · ")),
          p(i.excerpt),
          clean(i.url) ? `<p>${link("Read more", i.url)}</p>` : "",
        ].join(""),
      )
      .join(""),
  ].join("");
}

/* /briefings — the library index. Gives crawlers a path to every briefing;
 * drafts (active: false) are excluded, matching the middleware's noindex. */
export function buildBriefingsListHtml(items, lvl = 1) {
  const live = (items || []).filter((b) => b.active !== false);
  if (!live.length) return "";
  return [
    h(lvl, "Briefings. Articles. Updates."),
    p("Analysis, deep dives, and market updates from the Turnpage desk."),
    live
      .map((b) =>
        [
          h(lvl + 1, b.title),
          p(b.summary),
          `<p><a href="/briefings/${escapeHtml(clean(b.slug))}">Read the briefing</a></p>`,
          b.date ? `<p><time datetime="${escapeHtml(clean(b.date))}">${escapeHtml(clean(b.date))}</time></p>` : "",
        ].join(""),
      )
      .join(""),
  ].join("");
}

/* /briefings/:slug — title and summary always; the markdown body when the
 * caller managed to fetch it (see _middleware.js). The article's own leading
 * H1 is stripped, matching the React renderer. */
export function buildBriefingHtml(item, markdown) {
  if (!item) return "";
  const body = markdown
    ? miniMarkdownToHtml(String(markdown).replace(/^\s*#\s+.*$/m, ""), 2)
    : "";
  return [
    h(1, item.title),
    item.date ? `<p><time datetime="${escapeHtml(clean(item.date))}">${escapeHtml(clean(item.date))}</time></p>` : "",
    p(item.summary),
    body,
    Array.isArray(item.tags) && item.tags.length
      ? `<p>${item.tags.map((t) => escapeHtml(clean(t))).filter(Boolean).join(", ")}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("");
}
