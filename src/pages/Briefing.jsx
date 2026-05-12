import React, { useEffect, useState } from "react";
import { marked } from "marked";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

/* Single briefing page: fetches /briefings/index.json + the markdown file,
   renders title, date, and body on a light surface. */
export default function Briefing({ slug }) {
  const [meta, setMeta] = useState(null);
  const [bodyHtml, setBodyHtml] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMeta(null); setBodyHtml(null); setError(null);

    Promise.all([
      fetch("/briefings/index.json").then(r => r.ok ? r.json() : Promise.reject("index missing")),
      fetch("/briefings/" + slug + ".md").then(r => r.ok ? r.text() : Promise.reject("briefing not found")),
    ])
      .then(([idx, md]) => {
        if (cancelled) return;
        const list = Array.isArray(idx) ? idx : (idx.items || []);
        const m = list.find(x => x.slug === slug);
        if (!m) {
          setMeta({ slug, title: slug, date: null, summary: null });
        } else {
          setMeta(m);
        }
        marked.setOptions({ mangle: false, headerIds: false, breaks: false });
        const stripped = md.replace(/^#\s+.+\n/, "");
        setBodyHtml(marked.parse(stripped));
      })
      .catch(e => { if (!cancelled) setError(typeof e === "string" ? e : (e.message || "Failed to load briefing")); });

    return () => { cancelled = true; };
  }, [slug]);

  if (error) {
    return (
      <section className="surface-paper" style={{ padding: "5rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontFamily: FONT, color: INK_60, marginBottom: "1.2rem" }}>
          We couldn't load this briefing: {error}
        </p>
        <a href={hashHref("briefings")} className="btn-ghost-ink">← Back to briefings</a>
      </section>
    );
  }

  if (!meta || !bodyHtml) {
    return (
      <section className="surface-paper" style={{ padding: "5rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontFamily: FONT, color: INK_60 }}>Loading briefing…</p>
      </section>
    );
  }

  return (
    <article>
      {/* Dark header */}
      <header style={{
        position: "relative", overflow: "hidden",
        padding: "clamp(3rem,7vw,5rem) clamp(1.5rem,5vw,4rem) clamp(2.5rem,5vw,4rem)",
        background: "#000",
      }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.2) contrast(1.1)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.85))" }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "radial-gradient(45% 50% at 90% 0%, rgba(212,255,0,0.08), transparent 60%)",
        }} />
        <div className="container" style={{ position: "relative", zIndex: 5, maxWidth: 820 }}>
          <a
            href={hashHref("briefings")}
            style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase", color: NEON,
            }}
          >
            ← All briefings
          </a>
          {meta.date && (
            <p style={{
              marginTop: "1.6rem", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
            }}>
              {formatDate(meta.date)}
            </p>
          )}
          <h1 style={{
            marginTop: "0.8rem", fontFamily: FONT, fontWeight: 900,
            fontSize: "clamp(1.8rem,4vw,3rem)", color: "#fff",
            lineHeight: 1.1, letterSpacing: "-0.02em", maxWidth: 760,
          }}>
            {meta.title}
          </h1>
          {meta.summary && (
            <p style={{
              marginTop: "1rem", fontFamily: FONT, fontSize: "1.1rem",
              color: "rgba(255,255,255,0.72)", lineHeight: 1.55, maxWidth: 720,
            }}>
              {meta.summary}
            </p>
          )}
        </div>
      </header>

      {/* Light body — much more readable for long-form */}
      <div className="surface-paper" style={{ padding: "clamp(2.5rem,5vw,4.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="briefing-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>
      </div>

      {/* Footer CTA */}
      <div className="surface-paper-2" style={{
        padding: "clamp(2.5rem,5vw,4rem) clamp(1.5rem,5vw,4rem)",
        textAlign: "center", borderTop: `1px solid rgba(10,10,10,0.08)`,
      }}>
        <p style={{ fontFamily: FONT, fontSize: "1rem", color: INK_60, marginBottom: "1.4rem" }}>
          Hold a claim or considering action? Talk to us.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "center" }}>
          <a href={hashHref("contact") + "?source=briefings"} className="btn-neon">Get in Touch</a>
          <a href={hashHref("briefings")} className="btn-ghost-ink">← Back to briefings</a>
        </div>
      </div>
    </article>
  );
}

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return months[parseInt(m[2], 10) - 1] + " " + parseInt(m[3], 10) + ", " + m[1];
}
