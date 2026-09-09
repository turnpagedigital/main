import React, { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { NEON, FONT, INK, INK_60, INK_40, LINE, LINE_STRONG } from "../../data/tokens.js";

/* CaseBriefingSection — a long-form, citable reference page for a single case.
   Inline section: content lives in page-compositions.json sectionConfig.content.

   This is the "educational briefing" template: a document a journalist, a
   lawyer or an LLM can cite. It is deliberately NOT a landing page. The
   selling CTA is off by default and is a single toggle (`ctaEnabled`), so the
   same template serves both a pure reference page and, later, one that routes
   to intake.

   The structure encodes the thing that makes these pages survive: background
   is fixed, current figures are dated. `statusAsOf` stamps the status block
   and `updateLog` records what changed, so the page can be refreshed without
   being rewritten — and a reader can see at a glance how stale it is.

   Schema:
     eyebrow        — kicker above the title (e.g. "Crypto Bankruptcy Briefing · Case No. …")
     title          — the H1
     standfirst     — the dek under the H1
     byline         — "Andrew, Turnpage Digital Markets"
     publishedDate  — display string, e.g. "September 1, 2026"
     showContents   — render a table of contents built from `sections`
     statusHeading  — heading for the dated status block
     statusAsOf     — the date the figures below are true as of
     statusIntro    — prose under the status heading (Markdown)
     stats[]        — { id, value, label } big-number tiles
     facts[]        — { id, label, value } the case-facts table (court, judge, …)
     sections[]     — { id, heading, markdown } the body
     updateLog[]    — { id, date, note } what changed and when
     faqs[]         — { id, q, a } common questions
     sources[]      — { id, label, url } where the reader can verify
     ctaEnabled     — false by default; when true renders the closing CTA
     ctaHeading / ctaBody / ctaLabel / ctaHref
     disclaimer     — the non-affiliation note
     colorScheme    — "paper" (default) | "white" | "light-gray"
*/

const SCHEMES = {
  paper:        { bg: "#E5E7EB", surface: "#FFFFFF" },
  white:        { bg: "#FFFFFF", surface: "#F4F5F7" },
  "light-gray": { bg: "#F4F5F7", surface: "#FFFFFF" },
};

/* Stable, readable anchor for a body heading so the contents list can link to
   it and so external citations survive an edit that reorders sections. */
export function slugifyHeading(text, fallback) {
  const s = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return s || fallback;
}

export default function CaseBriefingSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const scheme = SCHEMES[c.colorScheme] || SCHEMES.paper;

  const sections = (c.sections || []).filter((s) => s && (s.heading || s.markdown));
  const stats = (c.stats || []).filter((s) => s && (s.value || s.label));
  const facts = (c.facts || []).filter((f) => f && (f.label || f.value));
  const faqs = (c.faqs || []).filter((f) => f && f.q);
  const sources = (c.sources || []).filter((s) => s && s.label);
  const updates = (c.updateLog || []).filter((u) => u && (u.date || u.note));

  const md = useMemo(() => {
    marked.setOptions({ mangle: false, headerIds: false, breaks: false, gfm: true });
    return (text) => DOMPurify.sanitize(marked.parse(String(text || "")));
  }, []);

  const anchors = sections.map((s, i) => slugifyHeading(s.heading, `section-${i + 1}`));
  const showRail = c.showContents !== false && sections.length > 2;

  return (
    <section
      style={{
        background: scheme.bg,
        color: INK,
        fontFamily: FONT,
        padding: "clamp(3rem, 7vw, 5.5rem) clamp(1.25rem, 5vw, 4rem)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ maxWidth: 820 }}>

        {/* ── masthead ─────────────────────────────────────────── */}
        {c.eyebrow && (
          <p style={{
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: INK_40, margin: "0 0 1rem",
          }}>{c.eyebrow}</p>
        )}

        {c.title && (
          <h1 style={{
            fontSize: "clamp(2rem, 4.6vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em",
            lineHeight: 1.06, margin: 0, textWrap: "balance",
          }}>{c.title}</h1>
        )}

        {c.standfirst && (
          <p style={{
            fontSize: "1.06rem", lineHeight: 1.6, color: INK_60,
            margin: "1.15rem 0 0", maxWidth: "68ch",
          }}>{c.standfirst}</p>
        )}

        {(c.byline || c.publishedDate || c.statusAsOf) && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "0.35rem 1.5rem",
            fontSize: "0.78rem", color: INK_40, margin: "1.5rem 0 0",
            paddingTop: "1.1rem", borderTop: `1px solid ${LINE}`,
          }}>
            {c.byline && <span>By {c.byline}</span>}
            {c.publishedDate && <span>Published {c.publishedDate}</span>}
            {c.statusAsOf && <span>Status current as of {c.statusAsOf}</span>}
          </div>
        )}

        </header>

        {/* Two columns: a sticky contents rail on the left, the document on
            the right. Below 1000px the rail collapses above the text — see
            the .tp-brief-grid rules at the foot of this component. */}
        <div className="tp-brief-grid">
          {showRail ? (
            <nav aria-label="Contents" className="tp-brief-rail">
              <p style={{
                fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: INK_40, margin: "0 0 0.8rem",
                paddingBottom: "0.6rem", borderBottom: `1px solid ${LINE_STRONG}`,
              }}>Contents</p>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.55rem" }}>
                {sections.map((s, i) => (
                  <li key={s.id || i} style={{ fontSize: "0.83rem", lineHeight: 1.4 }}>
                    <a href={`#${anchors[i]}`} style={{ color: INK_60, textDecoration: "none" }}>
                      {s.heading}
                    </a>
                  </li>
                ))}
                {updates.length > 0 && (
                  <li style={{ fontSize: "0.83rem", lineHeight: 1.4 }}>
                    <a href="#update-log" style={{ color: INK_60, textDecoration: "none" }}>Update log</a>
                  </li>
                )}
                {faqs.length > 0 && (
                  <li style={{ fontSize: "0.83rem", lineHeight: 1.4 }}>
                    <a href="#questions" style={{ color: INK_60, textDecoration: "none" }}>{c.faqHeading || "Common questions"}</a>
                  </li>
                )}
                {sources.length > 0 && (
                  <li style={{ fontSize: "0.83rem", lineHeight: 1.4 }}>
                    <a href="#sources" style={{ color: INK_60, textDecoration: "none" }}>Sources</a>
                  </li>
                )}
              </ol>
            </nav>
          ) : <div />}

          <div className="tp-brief-main">

        {/* ── dated status block ───────────────────────────────── */}
        {(stats.length > 0 || c.statusIntro) && (
          <div id="status" style={{ margin: "2.75rem 0 0" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.5rem 1rem" }}>
              <h2 style={{
                fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", fontWeight: 800,
                letterSpacing: "-0.02em", margin: 0,
              }}>{c.statusHeading || "Where the case stands"}</h2>
              {c.statusAsOf && (
                <span style={{
                  fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: INK, background: NEON,
                  padding: "0.2rem 0.5rem",
                }}>As of {c.statusAsOf}</span>
              )}
            </div>

            {stats.length > 0 && (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 1, background: LINE_STRONG, border: `1px solid ${LINE_STRONG}`,
                margin: "1.35rem 0 0",
              }}>
                {stats.map((s, i) => (
                  <div key={s.id || i} style={{
                    background: scheme.surface, padding: "1.15rem 1.1rem",
                    display: "flex", flexDirection: "column", gap: "0.3rem",
                  }}>
                    <span style={{
                      fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em",
                      fontVariantNumeric: "tabular-nums", lineHeight: 1.1,
                    }}>{s.value}</span>
                    <span style={{ fontSize: "0.78rem", color: INK_60, lineHeight: 1.4 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {c.statusIntro && (
              <div
                className="tp-briefing-prose"
                style={{ margin: "1.35rem 0 0" }}
                dangerouslySetInnerHTML={{ __html: md(c.statusIntro) }}
              />
            )}
          </div>
        )}

        {/* ── case facts ───────────────────────────────────────── */}
        {facts.length > 0 && (
          <div style={{
            margin: "2.25rem 0 0", border: `1px solid ${LINE_STRONG}`,
            background: scheme.surface,
          }}>
            {facts.map((f, i) => (
              <div key={f.id || i} style={{
                display: "grid", gridTemplateColumns: "minmax(120px, 200px) 1fr",
                gap: "0.5rem 1.25rem", padding: "0.85rem 1.1rem",
                borderBottom: i === facts.length - 1 ? "none" : `1px solid ${LINE}`,
                fontSize: "0.88rem",
              }}>
                <span style={{
                  fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                  fontSize: "0.7rem", color: INK_40, paddingTop: "0.15rem",
                }}>{f.label}</span>
                <span style={{ color: INK_60, lineHeight: 1.5 }}>{f.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── body ─────────────────────────────────────────────── */}
        {sections.map((s, i) => (
          <div key={s.id || i} id={anchors[i]} style={{ margin: "2.75rem 0 0", scrollMarginTop: "6rem" }}>
            {s.heading && (
              <h2 style={{
                fontSize: "clamp(1.35rem, 2.5vw, 1.8rem)", fontWeight: 800,
                letterSpacing: "-0.02em", margin: "0 0 0.9rem", textWrap: "balance",
              }}>{s.heading}</h2>
            )}
            {s.markdown && (
              <div className="tp-briefing-prose" dangerouslySetInnerHTML={{ __html: md(s.markdown) }} />
            )}
          </div>
        ))}

        {/* ── update log ───────────────────────────────────────── */}
        {updates.length > 0 && (
          <div id="update-log" style={{ margin: "2.75rem 0 0", scrollMarginTop: "2rem" }}>
            <h2 style={{
              fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 0.9rem",
            }}>Update log</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: `1px solid ${LINE_STRONG}` }}>
              {updates.map((u, i) => (
                <li key={u.id || i} style={{
                  display: "grid", gridTemplateColumns: "minmax(96px, 140px) 1fr",
                  gap: "0.4rem 1.1rem", padding: "0.75rem 0",
                  borderBottom: `1px solid ${LINE}`, fontSize: "0.87rem",
                }}>
                  <span style={{ fontWeight: 700, color: INK_40, fontSize: "0.76rem", paddingTop: "0.1rem" }}>{u.date}</span>
                  <span style={{ color: INK_60, lineHeight: 1.5 }}>{u.note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── FAQs ─────────────────────────────────────────────── */}
        {faqs.length > 0 && (
          <div id="questions" style={{ margin: "2.75rem 0 0", scrollMarginTop: "2rem" }}>
            <h2 style={{
              fontSize: "clamp(1.35rem, 2.5vw, 1.8rem)", fontWeight: 800,
              letterSpacing: "-0.02em", margin: "0 0 0.9rem",
            }}>{c.faqHeading || "Common questions"}</h2>
            <div style={{ borderTop: `1px solid ${LINE_STRONG}` }}>
              {faqs.map((f, i) => (
                <details key={f.id || i} style={{ borderBottom: `1px solid ${LINE}`, padding: "1rem 0" }}>
                  <summary style={{
                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                    letterSpacing: "-0.01em", listStyle: "none",
                  }}>{f.q}</summary>
                  {f.a && (
                    <div
                      className="tp-briefing-prose"
                      style={{ marginTop: "0.75rem" }}
                      dangerouslySetInnerHTML={{ __html: md(f.a) }}
                    />
                  )}
                </details>
              ))}
            </div>
          </div>
        )}

        {/* ── sources ──────────────────────────────────────────── */}
        {sources.length > 0 && (
          <div id="sources" style={{ margin: "2.75rem 0 0", scrollMarginTop: "2rem" }}>
            <h2 style={{
              fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 0.9rem",
            }}>Sources</h2>
            <ul style={{ margin: 0, paddingLeft: "1.15rem", display: "grid", gap: "0.4rem" }}>
              {sources.map((s, i) => (
                <li key={s.id || i} style={{ fontSize: "0.87rem", color: INK_60, lineHeight: 1.5 }}>
                  {s.url
                    ? <a href={s.url} rel="noopener noreferrer nofollow" target="_blank" style={{ color: INK }}>{s.label}</a>
                    : s.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── optional CTA — off by default ────────────────────── */}
        {c.ctaEnabled === true && (c.ctaHeading || c.ctaLabel) && (
          <div style={{
            margin: "3rem 0 0", padding: "1.75rem 1.85rem",
            background: scheme.surface, border: `1px solid ${LINE_STRONG}`, borderTop: `3px solid ${NEON}`,
          }}>
            {c.ctaHeading && (
              <h2 style={{
                fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 0.6rem",
              }}>{c.ctaHeading}</h2>
            )}
            {c.ctaBody && (
              <p style={{ fontSize: "0.95rem", color: INK_60, lineHeight: 1.6, margin: "0 0 1.15rem", maxWidth: "62ch" }}>
                {c.ctaBody}
              </p>
            )}
            {c.ctaLabel && (
              <a href={c.ctaHref || "/contact"} style={{
                display: "inline-block", background: NEON, color: INK, fontWeight: 700,
                fontSize: "0.88rem", padding: "0.8rem 1.5rem", textDecoration: "none",
              }}>{c.ctaLabel}</a>
            )}
          </div>
        )}

        {/* ── disclaimer ───────────────────────────────────────── */}
        {c.disclaimer && (
          <p style={{
            margin: "2.5rem 0 0", paddingTop: "1.35rem", borderTop: `1px solid ${LINE}`,
            fontSize: "0.76rem", color: INK_40, lineHeight: 1.6, maxWidth: "78ch",
          }}>{c.disclaimer}</p>
        )}
          </div>
        </div>
      </div>

      <style>{`
        .tp-briefing-prose { font-size: 1rem; line-height: 1.68; color: ${INK_60}; }
        .tp-briefing-prose > *:first-child { margin-top: 0; }
        .tp-briefing-prose > *:last-child { margin-bottom: 0; }
        .tp-briefing-prose p { margin: 0 0 1rem; max-width: 70ch; }
        .tp-briefing-prose h3 { font-size: 1.1rem; font-weight: 800; color: ${INK}; letter-spacing: -0.015em; margin: 1.75rem 0 0.6rem; }
        .tp-briefing-prose h4 { font-size: 0.98rem; font-weight: 700; color: ${INK}; margin: 1.4rem 0 0.5rem; }
        .tp-briefing-prose strong { color: ${INK}; font-weight: 600; }
        .tp-briefing-prose a { color: ${INK}; text-decoration: underline; text-underline-offset: 2px; }
        .tp-briefing-prose ul, .tp-briefing-prose ol { margin: 0 0 1rem; padding-left: 1.3rem; }
        .tp-briefing-prose li { margin-bottom: 0.35rem; max-width: 68ch; }
        .tp-briefing-prose blockquote { margin: 0 0 1rem; padding-left: 1rem; border-left: 3px solid ${LINE_STRONG}; color: ${INK_40}; }
        .tp-briefing-prose code { font-size: 0.9em; background: rgba(10,10,10,0.06); padding: 1px 5px; }
        .tp-briefing-prose table { width: 100%; border-collapse: collapse; margin: 0 0 1.25rem; font-size: 0.87rem; }
        .tp-briefing-prose th { text-align: left; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${INK_40}; padding: 0.6rem 0.7rem; border-bottom: 1.5px solid ${LINE_STRONG}; }
        .tp-briefing-prose td { padding: 0.6rem 0.7rem; border-bottom: 1px solid ${LINE}; vertical-align: top; }
        .tp-briefing-prose tbody tr:last-child td { border-bottom: none; }
        .tp-briefing-prose td:not(:first-child) { font-variant-numeric: tabular-nums; }
        .tp-brief-grid { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 3.5rem; align-items: start; margin-top: 2.75rem; }
        .tp-brief-main { max-width: 760px; }
        .tp-brief-rail { position: sticky; top: 2rem; max-height: calc(100vh - 4rem); overflow-y: auto; }
        .tp-brief-rail a:hover { color: ${INK}; text-decoration: underline; text-underline-offset: 2px; }
        @media (max-width: 1000px) {
          .tp-brief-grid { grid-template-columns: minmax(0, 1fr); gap: 2rem; }
          .tp-brief-rail { position: static; max-height: none; padding: 1.1rem 1.25rem; background: ${scheme.surface}; border: 1px solid ${LINE}; }
          .tp-brief-main { max-width: none; }
        }
      `}</style>
    </section>
  );
}
