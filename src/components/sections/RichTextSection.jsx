import React, { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { NEON, FONT, INK, INK_60, LINE, PAPER_2 } from "../../data/tokens.js";

/* RichTextSection — standalone formatted text with real heading structure.
   Inline section: content lives in page-compositions.json sectionConfig.content.

   The body is written in Markdown (same renderer the briefings use), so the
   admin gets H1/H2/H3, paragraphs, bullet/numbered lists, bold/italic, links,
   and blockquotes without a bespoke block editor.

   Layouts:
     layout-1-narrow  — centered reading column (~72 chars), best for essays
     layout-2-wide    — full content width, left-aligned
     layout-3-two-col — text flows across two columns on desktop

   Schema:
     eyebrow          — optional small uppercase kicker above the text
     heading1/
     heading1Accent/
     heading1After    — an optional standalone H1, split into three parts so
                        the middle part can get the neon highlight/italic
                        treatment without typing markdown. Independent of any
                        "# " heading inside `markdown` below — use one or the
                        other for the page's main heading, not both.
     markdown         — the body (Markdown)
     colorScheme      — "white" (default) | "light-gray" | "paper-2" | "charcoal" | "dark"
     align            — "left" (default) | "center"
     height           — "auto" (default) | "small" | "medium" | "large" | "full"
     backgroundImage  — optional photo shown behind the text, on top of the
                        colorScheme background
     imageOpacity     — 0-100, how visible the photo is (default 35)
     imageBlur        — 0-40 (px) blur applied to the photo (default 0)
*/

const SCHEMES = {
  "white":      { bg: "#FFFFFF", heading: INK,    body: INK_60,                    eyebrow: INK_60, link: INK,    border: LINE },
  "light-gray": { bg: "#F4F5F7", heading: INK,    body: INK_60,                    eyebrow: INK_60, link: INK,    border: LINE },
  "paper-2":    { bg: PAPER_2,   heading: INK,    body: INK_60,                    eyebrow: INK_60, link: INK,    border: LINE },
  "charcoal":   { bg: "#242528", heading: "#fff", body: "rgba(255,255,255,0.68)", eyebrow: NEON,   link: "#fff", border: "none" },
  "dark":       { bg: "#0A0A0A", heading: "#fff", body: "rgba(255,255,255,0.68)", eyebrow: NEON,   link: "#fff", border: "none" },
};

const HEIGHT_VALUES = {
  auto:   null,
  small:  "clamp(280px, 36vh, 440px)",
  medium: "clamp(420px, 56vh, 640px)",
  large:  "clamp(560px, 78vh, 820px)",
  full:   "calc(100vh - 88px)",
};

export default function RichTextSection({ sectionConfig }) {
  const sc = sectionConfig || {};
  const c = sc.content || {};
  const layout      = sc.layout || c.layout || "layout-1-narrow";
  const colorScheme = sc.colorScheme || c.colorScheme || "white";
  const theme = SCHEMES[colorScheme] || SCHEMES.white;
  const isDark = colorScheme === "dark" || colorScheme === "charcoal";

  const eyebrow  = c.eyebrow || "";
  const markdown = c.markdown || "";
  const align = c.align === "center" ? "center" : "left";
  const minHeight = Object.prototype.hasOwnProperty.call(HEIGHT_VALUES, c.height)
    ? HEIGHT_VALUES[c.height]
    : null;

  const heading1       = c.heading1 || "";
  const heading1Accent = c.heading1Accent || "";
  const heading1After  = c.heading1After || "";
  const hasHeading1 = !!(heading1 || heading1Accent || heading1After);

  const backgroundImage = c.backgroundImage || "";
  const imageOpacity = c.imageOpacity ?? 35;
  const imageBlur = c.imageBlur ?? 0;

  const html = useMemo(() => {
    if (!markdown.trim()) return "";
    marked.setOptions({ mangle: false, headerIds: false, breaks: false });
    return DOMPurify.sanitize(marked.parse(markdown));
  }, [markdown]);

  const isNarrow = layout === "layout-1-narrow";
  const isTwoCol = layout === "layout-3-two-col";
  const schemeClass = `rt-${colorScheme}`;

  return (
    <section style={{
      position: "relative", overflow: "hidden",
      background: theme.bg,
      minHeight: minHeight || undefined,
      display: minHeight ? "flex" : undefined,
      alignItems: minHeight ? "center" : undefined,
      padding: "clamp(3rem, 7vw, 6rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: theme.border === "none" ? "none" : `1px solid ${theme.border}`,
    }}>
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          loading="lazy"
          style={{
            position: "absolute", inset: 0, zIndex: 0,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: imageOpacity / 100,
            // Scaled up so the blurred edges (which sample transparent space
            // beyond the image box) never show inside the section's bounds.
            filter: imageBlur > 0 ? `blur(${imageBlur}px)` : undefined,
            transform: imageBlur > 0 ? `scale(${1 + imageBlur / 150})` : undefined,
            pointerEvents: "none",
          }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%",
        maxWidth: isNarrow ? 760 : 1280,
        margin: "0 auto",
        textAlign: align === "center" ? "center" : undefined,
      }}>
        {eyebrow && (
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: theme.eyebrow, marginBottom: "1.4rem",
          }}>
            {eyebrow}
          </p>
        )}
        {hasHeading1 && (
          <h1 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(2rem, 4vw, 3.2rem)",
            lineHeight: 1.05, letterSpacing: "-0.03em",
            color: theme.heading, margin: "0 0 1.2rem",
          }}>
            {heading1}
            {heading1Accent && (
              <>
                {heading1 ? " " : ""}
                {isDark
                  ? <span style={{ fontStyle: "italic", color: NEON }}>{heading1Accent}</span>
                  : <span className="accent-light">{heading1Accent}</span>}
              </>
            )}
            {heading1After && `${(heading1 || heading1Accent) ? " " : ""}${heading1After}`}
          </h1>
        )}
        <div
          className={`richtext-body ${schemeClass} ${isTwoCol ? "rt-two-col" : ""}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <style>{`
        .richtext-body { font-family: ${FONT}; }
        .richtext-body > :first-child { margin-top: 0 !important; }
        .richtext-body > :last-child { margin-bottom: 0 !important; }

        .richtext-body h1 {
          font-weight: 800; font-size: clamp(2rem, 4vw, 3.2rem);
          line-height: 1.05; letter-spacing: -0.03em; margin: 2.6rem 0 1.2rem;
        }
        .richtext-body h2 {
          font-weight: 800; font-size: clamp(1.5rem, 2.6vw, 2.2rem);
          line-height: 1.12; letter-spacing: -0.02em; margin: 2.2rem 0 1rem;
        }
        .richtext-body h3 {
          font-weight: 700; font-size: clamp(1.15rem, 1.7vw, 1.45rem);
          line-height: 1.25; margin: 1.8rem 0 0.8rem;
        }
        .richtext-body p, .richtext-body li {
          font-size: clamp(1rem, 1.3vw, 1.15rem); line-height: 1.75;
        }
        .richtext-body p { margin: 0 0 1.15rem; }
        .richtext-body ul, .richtext-body ol { margin: 0 0 1.15rem; padding-left: 1.4rem; }
        .richtext-body li { margin-bottom: 0.45rem; }
        .richtext-body a { text-decoration: underline; text-underline-offset: 3px; }
        .richtext-body blockquote {
          margin: 1.6rem 0; padding: 0.4rem 0 0.4rem 1.3rem;
          border-left: 3px solid ${NEON};
        }
        .richtext-body blockquote p { font-style: italic; margin-bottom: 0.6rem; }
        .richtext-body hr { border: none; height: 1px; margin: 2.4rem 0; }

        /* Scheme colors */
        .rt-white h1, .rt-white h2, .rt-white h3, .rt-white strong,
        .rt-light-gray h1, .rt-light-gray h2, .rt-light-gray h3, .rt-light-gray strong,
        .rt-paper-2 h1, .rt-paper-2 h2, .rt-paper-2 h3, .rt-paper-2 strong { color: ${INK}; }
        .rt-white p, .rt-white li, .rt-light-gray p, .rt-light-gray li, .rt-paper-2 p, .rt-paper-2 li { color: ${INK_60}; }
        .rt-white a, .rt-light-gray a, .rt-paper-2 a { color: ${INK}; }
        .rt-white hr, .rt-light-gray hr, .rt-paper-2 hr { background: ${LINE}; }

        .rt-dark h1, .rt-dark h2, .rt-dark h3, .rt-dark strong,
        .rt-charcoal h1, .rt-charcoal h2, .rt-charcoal h3, .rt-charcoal strong { color: #fff; }
        .rt-dark p, .rt-dark li, .rt-charcoal p, .rt-charcoal li { color: rgba(255,255,255,0.68); }
        .rt-dark a, .rt-charcoal a { color: #fff; }
        .rt-dark hr, .rt-charcoal hr { background: rgba(255,255,255,0.15); }

        /* Two-column flow (desktop only) */
        @media (min-width: 881px) {
          .rt-two-col { column-count: 2; column-gap: clamp(2.5rem, 5vw, 5rem); }
          .rt-two-col h1, .rt-two-col h2 { column-span: all; }
          .rt-two-col h3, .rt-two-col p, .rt-two-col li, .rt-two-col blockquote { break-inside: avoid-column; }
        }
      `}</style>
    </section>
  );
}

/* cache-bust 2026-08-18: renames this chunk after an edge colo cached a 404 for the previous sections-*.js URL, blanking the site for affected visitors */
