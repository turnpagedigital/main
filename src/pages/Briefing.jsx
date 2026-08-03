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

/* ── Author badge ────────────────────────────────────────────────────────── */
// dark=true → for use on dark/black header backgrounds
function AuthorBadge({ author, dark = false }) {
  const name = author || "Turnpage Intelligence";
  const isAndrew = name === "Andrew Glantz";
  const bg = isAndrew ? NEON : (dark ? "rgba(255,255,255,0.18)" : "#e5e5e5");
  const fg = isAndrew ? "#000" : (dark ? "rgba(255,255,255,0.8)" : "#555");
  return (
    <span style={{
      fontFamily: FONT, fontSize: "0.66rem", fontWeight: 700,
      letterSpacing: "0.14em", textTransform: "uppercase",
      background: bg, color: fg,
      padding: "0.32rem 0.7rem", borderRadius: 4,
      display: "inline-block",
    }}>
      {name}
    </span>
  );
}

/* ── Share row — LinkedIn / X share intents for the current post ─────────── */
function ShareRow({ meta, dark = false }) {
  const pageUrl = typeof window !== "undefined"
    ? `${window.location.origin}/briefings/${meta.slug}`
    : `https://turnpagedigital.com/briefings/${meta.slug}`;
  const enc = encodeURIComponent;
  const links = [
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(pageUrl)}` },
    { label: "Share on X",        href: `https://twitter.com/intent/tweet?url=${enc(pageUrl)}&text=${enc(meta.title || "")}` },
  ];
  const fg = dark ? "rgba(255,255,255,0.65)" : INK_60;
  const line = dark ? "rgba(255,255,255,0.25)" : LINE;
  return (
    <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.4rem", flexWrap: "wrap" }}>
      {links.map(l => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
          style={{
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: fg, border: `1px solid ${line}`, padding: "0.42rem 0.85rem",
            borderRadius: 4, textDecoration: "none",
          }}>
          {l.label} ↗
        </a>
      ))}
    </div>
  );
}

/* ── Single post — fetches index + markdown, dispatches by type ──────────── */
export default function Briefing({ slug }) {
  const [meta,     setMeta]     = useState(null);
  const [bodyHtml, setBodyHtml] = useState(null);
  const [error,    setError]    = useState(null);
  const [isDraft,  setIsDraft]  = useState(false);

  /* Sync the browser tab + history entry with the loaded post. Crawlers get
     the same values server-side from functions/_middleware.js; this is for
     humans and SPA navigations. App.jsx resets the title on route change. */
  useEffect(() => {
    if (!meta || !meta.title || meta.title === meta.slug) return;
    document.title = `${meta.title} — Turnpage Digital Markets`;
    const descEl = document.querySelector('meta[name="description"]');
    const prevDesc = descEl ? descEl.getAttribute("content") : null;
    if (descEl && meta.summary) descEl.setAttribute("content", meta.summary);
    return () => {
      if (descEl && prevDesc != null) descEl.setAttribute("content", prevDesc);
    };
  }, [meta]);

  useEffect(() => {
    let cancelled = false;
    setMeta(null); setBodyHtml(null); setError(null); setIsDraft(false);

    Promise.all([
      fetch("/briefings/index.json").then(r => r.ok ? r.json() : Promise.reject("index missing")),
      fetch("/briefings/" + slug + ".md").then(r => r.ok ? r.text() : Promise.reject("post not found")),
    ])
      .then(async ([idx, md]) => {
        if (cancelled) return;
        const list = Array.isArray(idx) ? idx : (idx.items || []);
        const m = list.find(x => x.slug === slug);
        if (m && m.active === false) {
          // Draft slug — render only for a logged-in admin (review-by-URL,
          // with a DRAFT banner); everyone else gets not-found. The server
          // already sends X-Robots-Tag: noindex for draft paths.
          const authed = await fetch("/api/admin/session").then(r => r.ok).catch(() => false);
          if (cancelled) return;
          if (!authed) {
            setError("post not found");
            return;
          }
          setIsDraft(true);
        }
        setMeta(m || { slug, title: slug, date: null, summary: null });
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
  const post =
    type === "article"      ? <ArticleTemplate      meta={meta} bodyHtml={bodyHtml} /> :
    type === "announcement" ? <AnnouncementTemplate meta={meta} bodyHtml={bodyHtml} /> :
    <BriefingTemplate meta={meta} bodyHtml={bodyHtml} />;

  return (
    <>
      {isDraft && <DraftBanner />}
      {post}
    </>
  );
}

/* ── Draft banner — shown above draft posts for logged-in admins ─────────── */
function DraftBanner() {
  return (
    <div style={{
      background: NEON, color: "#000", fontFamily: FONT,
      fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.18em",
      textTransform: "uppercase", textAlign: "center", padding: "0.55rem 1rem",
    }}>
      Draft — visible to logged-in admins only · publish in Admin → Content → Posts
    </div>
  );
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
            <AuthorBadge author={meta.author} dark />
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
          <ShareRow meta={meta} dark />
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

          {/* Type badge + author + date + read time */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap", marginBottom: "1.3rem" }}>
            <TypeBadge type="article" />
            <AuthorBadge author={meta.author} dark={false} />
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
          <ShareRow meta={meta} />
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <TypeBadge type="announcement" dark />
            <AuthorBadge author={meta.author} dark />
          </div>

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
