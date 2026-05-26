import React, { useEffect, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

/* ── Reading-time estimate ────────────────────────────────────────────────── */
function estimateReadTime(html) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").filter(Boolean).length : 0;
  return Math.max(1, Math.round(words / 250));
}

/* ── Type config ─────────────────────────────────────────────────────────── */
const TYPE_CFG = {
  briefing:     { label: "Briefing",     bgDark: NEON,   fgDark: "#000", bgLight: NEON,   fgLight: "#000" },
  article:      { label: "Article",      bgDark: "#fff", fgDark: INK,    bgLight: INK,    fgLight: "#fff" },
  announcement: { label: "Announcement", bgDark: NEON,   fgDark: "#000", bgLight: NEON,   fgLight: "#000" },
};

function TypeBadge({ type, dark = false }) {
  const cfg = TYPE_CFG[type] || TYPE_CFG.briefing;
  return (
    <span style={{
      fontFamily: FONT, fontSize: "0.66rem", fontWeight: 800,
      letterSpacing: "0.2em", textTransform: "uppercase",
      background: dark ? cfg.bgDark : cfg.bgLight,
      color:      dark ? cfg.fgDark : cfg.fgLight,
      padding: "0.32rem 0.7rem", borderRadius: 4,
      display: "inline-block",
    }}>
      {cfg.label}
    </span>
  );
}

/* ── Single post — fetches index + markdown, dispatches by type ──────────── */
export default function Briefing({ slug }) {
  const [meta,     setMeta]     = useState(null);
  const [bodyHtml, setBodyHtml] = useState(null);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMeta(null); setBodyHtml(null); setError(null);

    Promise.all([
      fetch("/briefings/index.json").then(r => r.ok ? r.json() : Promise.reject("index missing")),
      fetch("/briefings/" + slug + ".md").then(r => r.ok ? r.text() : Promise.reject("post not found")),
    ])
      .then(([idx, md]) => {
        if (cancelled) return;
        const list = Array.isArray(idx) ? idx : (idx.items || []);
        const m = list.find(x => x.slug === slug) || { slug, title: slug, date: null, summary: null };
        setMeta(m);
        marked.setOptions({ mangle: false, headerIds: false, breaks: false });
        setBodyHtml(marked.parse(md.replace(/^#\s+.+\n/, "")));
      })
      .catch(e => { if (!cancelled) setError(typeof e === "string" ? e : (e.message || "Failed to load post")); });

    return () => { cancelled = true; };
  }, [slug]);

  if (error) {
    return (
      <section className="surface-paper" style={{ padding: "5rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontFamily: FONT, color: INK_60, marginBottom: "1.2rem" }}>
          We couldn't load this post: {error}
        </p>
        <a href={hashHref("briefings")} className="btn-ghost-ink">← Back to publications</a>
      </section>
    );
  }

  if (!meta || bodyHtml === null) {
    return (
      <section className="surface-paper" style={{ padding: "5rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontFamily: FONT, color: INK_60 }}>Loading…</p>
      </section>
    );
  }

  const type = (meta.type || "briefing").toLowerCase();
  if (type === "article")      return <ArticleTemplate      meta={meta} bodyHtml={bodyHtml} />;
  if (type === "announcement") return <AnnouncementTemplate meta={meta} bodyHtml={bodyHtml} />;
  return <BriefingTemplate meta={meta} bodyHtml={bodyHtml} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1.  BRIEFING  — timely advisory / docket update
       Dark textured header, light markdown body.  (Original style.)
═══════════════════════════════════════════════════════════════════════════ */
function BriefingTemplate({ meta, bodyHtml }) {
  return (
    <article>
      <header style={{
        position: "relative", overflow: "hidden",
        padding: "clamp(3rem,7vw,5rem) clamp(1.5rem,5vw,4rem) clamp(2.5rem,5vw,4rem)",
        background: "#000",
      }}>
        {/* Background texture */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.2) contrast(1.1)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.85))" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "radial-gradient(45% 50% at 90% 0%, rgba(212,255,0,0.08), transparent 60%)" }} />

        <div className="container" style={{ position: "relative", zIndex: 5, maxWidth: 820 }}>
          <a href={hashHref("briefings")} style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: NEON }}>
            ← All publications
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginTop: "1.6rem", flexWrap: "wrap" }}>
            <TypeBadge type="briefing" dark />
            {meta.date && (
              <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                {formatDate(meta.date)}
              </span>
            )}
          </div>
          <h1 style={{ marginTop: "0.8rem", fontFamily: FONT, fontWeight: 900, fontSize: "clamp(1.8rem,4vw,3rem)", color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em", maxWidth: 760 }}>
            {meta.title}
          </h1>
          {meta.summary && (
            <p style={{ marginTop: "1rem", fontFamily: FONT, fontSize: "1.1rem", color: "rgba(255,255,255,0.72)", lineHeight: 1.55, maxWidth: 720 }}>
              {meta.summary}
            </p>
          )}
        </div>
      </header>

      <div className="surface-paper" style={{ padding: "clamp(2.5rem,5vw,4.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="briefing-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }} />
        </div>
      </div>

      <PostFooterCTA />
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2.  ARTICLE  — educational / long-form deep dive
       Clean white editorial header, reading time, topic strip, generous prose.
═══════════════════════════════════════════════════════════════════════════ */
function ArticleTemplate({ meta, bodyHtml }) {
  const readTime = estimateReadTime(bodyHtml);
  const hasTags  = Array.isArray(meta.tags) && meta.tags.length > 0;

  return (
    <article>
      {/* Clean white header */}
      <header style={{
        background: "#fff",
        borderBottom: `1px solid ${LINE}`,
        padding: "clamp(3.5rem,7vw,5.5rem) clamp(1.5rem,5vw,4rem) clamp(2.5rem,5vw,4rem)",
      }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <a href={hashHref("briefings")} style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60,
            display: "inline-block", marginBottom: "2rem",
          }}>
            ← All publications
          </a>

          {/* Type badge + date + read time */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap", marginBottom: "1.3rem" }}>
            <TypeBadge type="article" />
            {meta.date && (
              <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: INK_60 }}>
                {formatDate(meta.date)}
              </span>
            )}
            <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: INK_60 }}>
              · {readTime} min read
            </span>
          </div>

          <h1 style={{
            fontFamily: FONT, fontWeight: 900,
            fontSize: "clamp(2rem,4.5vw,3.4rem)", color: INK,
            lineHeight: 1.08, letterSpacing: "-0.025em", maxWidth: 780,
            marginBottom: "1.4rem",
          }}>
            {meta.title}
          </h1>

          {meta.summary && (
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1.05rem,1.4vw,1.2rem)",
              color: INK_60, lineHeight: 1.65, maxWidth: 700,
              borderLeft: `3px solid ${NEON}`, paddingLeft: "1.1rem",
              margin: 0,
            }}>
              {meta.summary}
            </p>
          )}
        </div>
      </header>

      {/* Topic tags strip */}
      {hasTags && (
        <div style={{ background: "#F8FAF0", borderBottom: `1px solid ${LINE}`, padding: "0.8rem clamp(1.5rem,5vw,4rem)" }}>
          <div className="container" style={{ maxWidth: 820 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: INK_60, marginRight: "0.2rem" }}>
                Topics
              </span>
              {meta.tags.map(t => (
                <span key={t} style={{
                  fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                  background: "rgba(212,255,0,0.22)", color: INK,
                  padding: "0.18rem 0.6rem", borderRadius: 3,
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="surface-paper" style={{ padding: "clamp(2.5rem,5vw,4.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="briefing-body article-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }} />
        </div>
      </div>

      <PostFooterCTA />
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3.  ANNOUNCEMENT  — case milestone, firm news, product launch
       Bold centered dark hero with NEON radial glow. Short-form friendly.
═══════════════════════════════════════════════════════════════════════════ */
function AnnouncementTemplate({ meta, bodyHtml }) {
  const hasBody = bodyHtml.replace(/<[^>]+>/g, "").trim().length > 0;

  return (
    <article>
      {/* Bold centered hero */}
      <header style={{
        position: "relative", overflow: "hidden",
        background: "#000",
        padding: "clamp(5rem,10vw,8rem) clamp(1.5rem,5vw,4rem) clamp(4rem,8vw,7rem)",
        textAlign: "center",
      }}>
        {/* Centered NEON radial glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(55% 65% at 50% -5%, rgba(212,255,0,0.18), transparent 65%)",
        }} />

        <div className="container" style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          <TypeBadge type="announcement" dark />

          {meta.date && (
            <p style={{
              marginTop: "1.2rem",
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
            }}>
              {formatDate(meta.date)}
            </p>
          )}

          <h1 style={{
            marginTop: meta.date ? "0.6rem" : "1.2rem",
            fontFamily: FONT, fontWeight: 900,
            fontSize: "clamp(2.2rem,5vw,4.2rem)", color: "#fff",
            lineHeight: 1.05, letterSpacing: "-0.03em",
          }}>
            {meta.title}
          </h1>

          {meta.summary && (
            <p style={{
              marginTop: "1.5rem",
              fontFamily: FONT, fontSize: "clamp(1.05rem,1.5vw,1.25rem)",
              color: "rgba(255,255,255,0.68)", lineHeight: 1.6,
              maxWidth: 660, margin: "1.5rem auto 0",
            }}>
              {meta.summary}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", marginTop: "2.4rem", flexWrap: "wrap" }}>
            <a href={hashHref("contact") + "?source=briefings"} className="btn-neon">Get in Touch</a>
            <a href={hashHref("briefings")} className="btn-ghost">← All publications</a>
          </div>
        </div>
      </header>

      {/* Optional body */}
      {hasBody && (
        <div className="surface-paper" style={{ padding: "clamp(2.5rem,5vw,4.5rem) clamp(1.5rem,5vw,4rem)" }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="briefing-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }} />
          </div>
        </div>
      )}

      <PostFooterCTA />
    </article>
  );
}

/* ── Shared footer CTA ───────────────────────────────────────────────────── */
function PostFooterCTA() {
  return (
    <div className="surface-paper-2" style={{
      padding: "clamp(2.5rem,5vw,4rem) clamp(1.5rem,5vw,4rem)",
      textAlign: "center", borderTop: `1px solid rgba(10,10,10,0.08)`,
    }}>
      <p style={{ fontFamily: FONT, fontSize: "1rem", color: INK_60, marginBottom: "1.4rem" }}>
        Hold a claim or considering action? Talk to us.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "center" }}>
        <a href={hashHref("contact") + "?source=briefings"} className="btn-neon">Get in Touch</a>
        <a href={hashHref("briefings")} className="btn-ghost-ink">← All publications</a>
      </div>
    </div>
  );
}

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return months[parseInt(m[2], 10) - 1] + " " + parseInt(m[3], 10) + ", " + m[1];
}
