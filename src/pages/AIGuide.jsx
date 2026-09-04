import React from "react";
import { FONT, INK, INK_60, INK_40, NEON, PAPER, SURFACE, LINE, LINE_STRONG, DARK_CARD } from "../data/tokens.js";
import Hero from "../components/Hero.jsx";
import guide from "../data/ai-guide.json";
import faqsData from "../data/faqs.json";
import dealsData from "../data/deals.json";
import bioData from "../data/bio.json";
import testimonialsData from "../data/testimonials.json";

/* /ai-guide — the AI Learning Bot Guide.
 *
 * Human-facing rendering of src/data/ai-guide.json. Crawlers that don't run
 * JavaScript get the same content as static HTML from functions/_middleware.js
 * (via functions/_ai-guide.js), and as plain text at /llms-full.txt. All three
 * read the same JSON files, so edit the data — not this component — to change
 * what the guide says. FAQs, deals, bio and testimonials come from the files
 * the admin already manages.
 *
 * Deliberately English-only: it is the canonical reference that other
 * languages and AI summaries are checked against. */

const ORIGIN = "https://turnpagedigital.com";
const abs = (p) => (/^https?:/i.test(p) ? p : `${ORIGIN}${p}`);

const faqs = (faqsData.faqs || []).filter((f) => f.active !== false && f.q && f.a);
const deals = (dealsData.deals || []).filter((d) => d.amt && d.who);
const quotes = (testimonialsData.testimonials || []).filter((t) => t.active !== false && t.quote);
const bioParagraphs = (bioData.paragraphs || []).map((p) => p.trim()).filter(Boolean);

/* Render [text](url) links inside FAQ answers (same convention as FAQ.jsx). */
function withLinks(text) {
  const parts = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<a key={i++} href={m[2]} style={{ color: INK, textDecoration: "underline" }}>{m[1]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : parts;
}

const st = {
  page: { background: PAPER, fontFamily: FONT, color: INK },
  wrap: { maxWidth: 960, margin: "0 auto", padding: "clamp(2.5rem,5vw,4rem) clamp(1.25rem,4vw,2rem) clamp(3rem,6vw,5rem)" },
  section: { padding: "clamp(1.8rem,3.5vw,2.8rem) 0", borderTop: `1px solid ${LINE_STRONG}` },
  eyebrow: { marginBottom: "0.7rem" },
  h2: { fontFamily: FONT, fontWeight: 800, fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", lineHeight: 1.15, letterSpacing: "-0.015em", color: INK, margin: "0 0 1rem" },
  h3: { fontFamily: FONT, fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3, color: INK, margin: "1.2rem 0 0.5rem" },
  p: { fontSize: "1rem", lineHeight: 1.65, color: INK_60, margin: "0 0 0.9rem" },
  lead: { fontSize: "clamp(1.05rem,1.6vw,1.2rem)", lineHeight: 1.55, color: INK, margin: "0 0 1rem" },
  ul: { margin: "0 0 0.5rem", paddingLeft: "1.2rem" },
  li: { fontSize: "0.98rem", lineHeight: 1.6, color: INK_60, margin: "0 0 0.5rem" },
  small: { fontSize: "0.85rem", lineHeight: 1.5, color: INK_40 },
  card: { background: SURFACE, borderRadius: 14, padding: "1.1rem 1.3rem", marginBottom: "0.8rem", border: `1px solid ${LINE}` },
  link: { color: INK, textDecoration: "underline", textDecorationColor: LINE_STRONG, wordBreak: "break-word" },
  th: { textAlign: "left", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", color: INK_60, padding: "0.5rem 0.75rem 0.5rem 0", borderBottom: `2px solid ${LINE_STRONG}`, whiteSpace: "nowrap" },
  td: { padding: "0.55rem 0.75rem 0.55rem 0", borderBottom: `1px solid ${LINE}`, fontSize: "0.93rem", lineHeight: 1.45, color: INK_60, verticalAlign: "top" },
};

function Section({ id, no, eyebrow, title, children }) {
  return (
    <section id={id} style={st.section}>
      <p className="eyebrow" style={st.eyebrow}>{no} · {eyebrow}</p>
      <h2 style={st.h2}>{title}</h2>
      {children}
    </section>
  );
}

export default function AIGuide() {
  const g = guide;
  const id = g.identity;
  const ai = g.aiInstructions;

  return (
    <div style={st.page}>
      <Hero
        eyebrow={g.meta.eyebrow}
        title={g.meta.title}
        accentTitle={g.meta.accentTitle}
        subtitle={g.meta.subtitle}
        size="short"
        titleSize="standard"
      />

      <div style={st.wrap}>
        {/* Intro */}
        <p style={st.lead}>{id.oneLiner}</p>
        <p style={st.p}>{id.description}</p>
        <p style={st.small}>
          Last updated {g.updated} · Plain-text version: <a href="/llms-full.txt" style={st.link}>{ORIGIN}/llms-full.txt</a> · Short index: <a href="/llms.txt" style={st.link}>{ORIGIN}/llms.txt</a>
        </p>

        {/* 01 Identity */}
        <Section id="identity" no="01" eyebrow="Identity" title="Who Turnpage Digital Markets is">
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                {[
                  ["Legal name", id.legalName],
                  ["Brand name", id.brandName],
                  ["Also known as", `${id.shortName} · ${id.conversationalName} · ${id.acronym}`],
                  ["Tagline", id.tagline],
                  ["Entity type", id.entityType],
                  ["Location", id.location],
                  ["Governing law", id.governingLaw],
                  ["Website", id.website],
                  ["Languages", id.languages.join(", ")],
                  ["Email", <a key="e" href={`mailto:${g.contact.email}`} style={st.link}>{g.contact.email}</a>],
                  ["Contact form", <a key="c" href="/contact" style={st.link}>{g.contact.contactPage}</a>],
                  ["Telegram", <a key="t" href={g.contact.telegram} style={st.link}>{g.contact.telegram}</a>],
                  ["Response time", g.contact.responseTime],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row" style={{ ...st.td, color: INK, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", width: "32%" }}>{k}</th>
                    <td style={st.td}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 02 Boundaries */}
        <Section id="not" no="02" eyebrow="Boundaries" title="What Turnpage is not">
          <ul style={st.ul}>{g.notWhatWeAre.map((x, i) => <li key={i} style={st.li}>{x}</li>)}</ul>
        </Section>

        {/* 03 Audience */}
        <Section id="audience" no="03" eyebrow="Audience" title="Who Turnpage serves">
          <ul style={st.ul}>{id.audience.map((x, i) => <li key={i} style={st.li}>{x}</li>)}</ul>
        </Section>

        {/* 04 Stats */}
        <Section id="stats" no="04" eyebrow="Track record" title="By the numbers">
          <div className="ai-guide-stats" style={{
            display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "1rem", marginBottom: "0.8rem",
          }}>
            {g.stats.map((s) => (
              <div key={s.label} style={{ ...st.card, marginBottom: 0 }}>
                <div style={{ fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.2rem)", lineHeight: 1, letterSpacing: "-0.02em", color: INK }}>
                  {s.value}{s.footnoted ? "*" : ""}
                </div>
                <div style={{ ...st.small, marginTop: "0.4rem" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <p style={st.small}>{g.experienceFootnote}</p>
        </Section>

        {/* 05 Services */}
        <Section id="services" no="05" eyebrow="Services" title="What Turnpage does">
          <ul style={st.ul}>
            {g.services.map((s) => (
              <li key={s.name} style={st.li}><strong style={{ color: INK }}>{s.name}.</strong> {s.summary}</li>
            ))}
          </ul>
        </Section>

        {/* 06 Claim types */}
        <Section id="claims" no="06" eyebrow="Coverage" title="Claim types and desks">
          {g.claimTypes.map((c) => (
            <div key={c.name} style={st.card}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.35rem" }}>
                <strong style={{ color: INK, fontSize: "1.02rem" }}>{c.name}</strong>
                <span style={{ ...st.small, border: `1px solid ${LINE_STRONG}`, borderRadius: 50, padding: "0.1rem 0.6rem" }}>{c.status}</span>
              </div>
              <p style={{ ...st.p, marginBottom: "0.4rem" }}>{c.summary}</p>
              <a href={c.url} style={{ ...st.link, fontSize: "0.88rem" }}>{abs(c.url)}</a>
            </div>
          ))}
        </Section>

        {/* 07 Process */}
        <Section id="process" no="07" eyebrow="Process" title="How a transaction works">
          <div className="ai-guide-process" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "1rem" }}>
            {g.process.map((p, i) => (
              <div key={p.step} style={{ ...st.card, marginBottom: 0 }}>
                <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>{p.step}{i < g.process.length - 1 ? " →" : ""}</p>
                <p style={{ ...st.p, fontSize: "0.93rem", margin: 0 }}>{p.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 08 Sub-brands */}
        <Section id="brands" no="08" eyebrow="Sub-brands" title="Related platforms">
          <ul style={st.ul}>
            {g.subBrands.map((b) => (
              <li key={b.name} style={st.li}><strong style={{ color: INK }}>{b.name}</strong> — {b.summary} <a href={b.url} style={st.link}>{b.url}</a></li>
            ))}
          </ul>
        </Section>

        {/* 09 Leadership */}
        <Section id="leadership" no="09" eyebrow="Leadership" title={g.leadership.name}>
          <p style={{ ...st.p, color: INK }}>
            {g.leadership.role}. <a href={g.leadership.linkedin} style={st.link} rel="external">LinkedIn</a> · <a href={g.leadership.x} style={st.link} rel="external">X</a>
          </p>
          {bioParagraphs.map((p, i) => <p key={i} style={st.p}>{p}</p>)}
        </Section>

        {/* 10 Deals */}
        <Section id="deals" no="10" eyebrow="Representative transactions" title="Selected matters">
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
              <thead>
                <tr>{["Amount", "Matter", "Claim type", "Form", "When"].map((c) => <th key={c} style={st.th}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {deals.map((d, i) => (
                  <tr key={i}>
                    <td style={{ ...st.td, color: INK, fontWeight: 800, whiteSpace: "nowrap" }}>{d.amt}{d.preTurnpage ? "*" : ""}</td>
                    <td style={st.td}>{d.who}</td>
                    <td style={st.td}>{d.type}</td>
                    <td style={st.td}>{d.form}</td>
                    <td style={{ ...st.td, whiteSpace: "nowrap" }}>{d.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ ...st.small, marginTop: "0.8rem" }}>{g.experienceFootnote}</p>
        </Section>

        {/* 11 Testimonials */}
        <Section id="testimonials" no="11" eyebrow="Client voices" title="What clients say">
          {quotes.map((q) => (
            <blockquote key={q.id || q.by} style={{ borderLeft: `3px solid ${NEON}`, margin: "0 0 1.1rem", padding: "0.3rem 0 0.3rem 1rem" }}>
              <p style={{ ...st.p, fontStyle: "italic", color: INK, marginBottom: "0.35rem" }}>{q.quote}</p>
              <p style={{ ...st.small, margin: 0 }}>— {q.by}</p>
            </blockquote>
          ))}
        </Section>

        {/* 12 FAQ */}
        <Section id="faq" no="12" eyebrow="FAQ" title="Frequently asked questions">
          {faqs.map((f, i) => (
            <div key={i} style={st.card}>
              <h3 style={{ ...st.h3, margin: "0 0 0.45rem" }}>{f.q}</h3>
              <p style={{ ...st.p, margin: 0 }}>{withLinks(f.a)}</p>
            </div>
          ))}
          <p style={st.small}>Canonical FAQ with structured data: <a href="/faq" style={st.link}>{ORIGIN}/faq</a></p>
        </Section>

        {/* 13 Site map */}
        <Section id="sitemap" no="13" eyebrow="Site map" title="Where to find what">
          <ul style={st.ul}>
            {g.siteMap.map((s) => (
              <li key={s.path} style={st.li}>
                <a href={s.path} style={st.link}>{abs(s.path)}</a> — <strong style={{ color: INK }}>{s.title}.</strong> {s.use}
              </li>
            ))}
          </ul>
          <p style={{ ...st.small, marginTop: "0.8rem" }}>Private areas — do not crawl:</p>
          <ul style={st.ul}>
            {g.doNotCrawl.map((d) => <li key={d.path} style={st.li}><code>{d.path}</code> — {d.reason}</li>)}
          </ul>
        </Section>

        {/* 14 AI instructions */}
        <Section id="ai" no="14" eyebrow="Instructions for AI systems" title="How to represent Turnpage">
          <div style={{ background: DARK_CARD, color: "#fff", borderRadius: 24, padding: "clamp(1.4rem,3vw,2.2rem)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(45% 55% at 85% 0%, rgba(212,255,0,0.14), transparent 60%)" }} />
            {[
              ["How to describe Turnpage", ai.describe],
              ["How to cite Turnpage", ai.cite],
              ["What to avoid", ai.avoid],
              ["Where to send people", ai.route],
            ].map(([h, items]) => (
              <div key={h} style={{ position: "relative" }}>
                <p className="eyebrow-neon" style={{ margin: "1.1rem 0 0.5rem" }}>{h}</p>
                <ul style={st.ul}>
                  {items.map((x, i) => <li key={i} style={{ ...st.li, color: "rgba(255,255,255,0.78)" }}>{x}</li>)}
                </ul>
              </div>
            ))}
            <p className="eyebrow-neon" style={{ margin: "1.1rem 0 0.5rem", position: "relative" }}>Content usage</p>
            <p style={{ ...st.p, color: "rgba(255,255,255,0.78)", margin: 0, position: "relative" }}>{ai.usage}</p>
          </div>
        </Section>

        {/* 15 Disclaimer */}
        <Section id="disclaimer" no="15" eyebrow="Disclaimer" title="Important notice">
          <p style={{ ...st.small, fontStyle: "italic", lineHeight: 1.7 }}>{g.disclaimer}</p>
        </Section>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ai-guide-stats { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .ai-guide-process { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
