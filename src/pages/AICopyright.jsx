import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatStrip from "../components/StatStrip.jsx";
import FAQ from "../components/FAQ.jsx";
import BottomCTA from "../components/BottomCTA.jsx";
import { TOP_CASES, FEATURED_NEW, STATUS_COLORS } from "../data/cases.js";

const STATS = [
  { value: "$1.5B",   label: "Bartz settlement" },
  { value: "70+",     label: "Federal lawsuits" },
  { value: "$3.1B",   label: "Concord II ceiling" },
  { value: "91%",     label: "Bartz claim rate" },
];

const FAQS = [
  {
    q: "Bartz class member — sell or wait?",
    a: "It depends on your cash needs and tax posture. We quote in days. We'll also tell you if waiting is the better call.",
  },
  {
    q: "Considering opting out for an independent action?",
    a: "We model the math against the class settlement and introduce you to specialist counsel if independent litigation makes sense.",
  },
  {
    q: "Music publisher with Concord exposure?",
    a: "We work with publishers on settlement architecture, fairness-hearing positioning, and bulk catalogue dispositions.",
  },
  {
    q: "Non-U.S. matters — UK, EU, Germany?",
    a: "Covered. We coordinate counsel across the U.S., UK, EU, and Germany.",
  },
  {
    q: "How do you price a claim?",
    a: "Competitive auction across our buyer network. You see a real bid, not an indication.",
  },
];

export default function AICopyright() {
  return (
    <>
      <Hero
        eyebrow="AI Copyright Desk"
        title="Capital and advisory for"
        accentTitle="rights holders."
        subtitle="Bartz. The OpenAI MDL. Concord. Getty. We buy claims and advise on strategy."
        size="tall"
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={hashHref("contact") + "?source=ai-copyright"} className="btn-neon">Talk to a Partner</a>
          <a href="#cases-section" className="btn-ghost">See active cases</a>
        </div>
      </Hero>

      {/* STAT STRIP */}
      <section className="surface-paper" style={{ padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container">
          <StatStrip items={STATS} theme="light" />
        </div>
      </section>

      {/* WHO WE HELP */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Who We Help"
            title="Authors. Publishers."
            accent="Newsrooms. Artists."
          />

          <div className="grid-2col" style={{ marginBottom: "1.2rem" }}>
            <AudienceCard
              priority
              title="Authors & Writers"
              body="Bartz class members. OpenAI MDL and Kadrey v. Meta plaintiffs. Pre-litigation rights holders."
            />
            <AudienceCard
              priority
              title="Music Publishers & Labels"
              body="Concord plaintiffs, RIAA-coordinated claimants, UMG v. Suno/Udio. Bulk catalogue dispositions."
            />
          </div>
          <div className="grid-2col">
            <AudienceCard
              title="News Organizations"
              body="NYT v. OpenAI, Advance Local v. Cohere, the consolidated MDL."
            />
            <AudienceCard
              title="Visual Artists & Stock"
              body="Andersen v. Stability. Getty v. Stability (US and UK)."
            />
          </div>
        </div>
      </section>

      {/* WHAT WE OFFER */}
      <section className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="What We Offer"
            title="Capital."
            accent="Advisory."
          />
          <div className="grid-2col">
            <ServiceCard
              title="Capital"
              body="A competitive cash bid from our institutional buyer network. Class-member purchases, opt-out direct purchases, bulk catalogues. Days to close."
            />
            <ServiceCard
              title="Advisory"
              body="Opt-in vs. opt-out economics. Statutory damages modeling. Counsel introductions across U.S., UK, EU, and Germany."
            />
          </div>
        </div>
      </section>

      {/* TOP 12 CASES (dark) */}
      <section id="cases-section" className="surface-dark section-pad" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
          <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5) contrast(1.1)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.85))" }} />
        <div className="container" style={{ position: "relative", zIndex: 5 }}>
          <SectionHeader
            eyebrow="Active Docket"
            title="Top 12 cases"
            accent="we track."
            theme="dark"
          />

          {/* New 2026 callout */}
          <div style={{
            marginBottom: "1.6rem", padding: "1.4rem 1.6rem",
            background: "rgba(212,255,0,0.06)", border: "1px solid rgba(212,255,0,0.3)",
            borderRadius: 12,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.9rem", flexWrap: "wrap" }}>
              <span style={{
                fontFamily: FONT, fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "#000", background: NEON,
                padding: "0.32rem 0.7rem", borderRadius: 4, flexShrink: 0,
              }}>
                New for 2026
              </span>
              <div style={{ flex: 1, minWidth: 240 }}>
                <p style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: "0.3rem" }}>
                  {FEATURED_NEW.name} — <span style={{ color: NEON }}>{FEATURED_NEW.damages}</span>
                </p>
                <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
                  {FEATURED_NEW.summary} {FEATURED_NEW.citation}.
                </p>
              </div>
            </div>
          </div>

          <div className="grid-2col" style={{ gap: "1rem" }}>
            {TOP_CASES.map(c => <CaseCard key={c.rank} c={c} />)}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="surface-paper section-pad">
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: "clamp(2rem, 6vw, 5rem)", alignItems: "start",
          }} className="faq-layout">
            <div>
              <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>FAQ</p>
              <h2 className="h-section" style={{ marginBottom: "1rem" }}>
                AI copyright,{" "}
                <span className="accent-light">answered.</span>
              </h2>
              <a href={hashHref("contact") + "?source=ai-copyright"} className="btn-ghost-ink">Ask a Question</a>
            </div>
            <div>
              <FAQ items={FAQS} />
            </div>
          </div>
          <style>{`
            @media (max-width: 880px) {
              .faq-layout { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
            }
          `}</style>
        </div>
      </section>

      <BottomCTA
        eyebrow="AI Copyright Desk"
        title="Hold a claim?"
        accent="Talk to us."
        kicker="48-hour response. Confidentiality default."
        primary={{ label: "Get in Touch", href: hashHref("contact") + "?source=ai-copyright" }}
        secondary={{ label: "Briefings", href: hashHref("briefings") }}
      />
    </>
  );
}

function AudienceCard({ title, body, priority }) {
  return (
    <div className="card-light" style={{
      background: priority ? "#0A0A0A" : "#fff",
      color: priority ? "#fff" : INK,
      borderColor: priority ? "rgba(255,255,255,0.14)" : LINE,
      position: priority ? "relative" : undefined,
      overflow: priority ? "hidden" : undefined,
    }}>
      {priority && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(60% 70% at 0% 0%, rgba(212,255,0,0.08), transparent 60%)",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontSize: "1.3rem", fontWeight: 800,
          color: priority ? "#fff" : INK,
          marginBottom: "0.7rem", letterSpacing: "-0.01em", lineHeight: 1.2,
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.97rem",
          color: priority ? "rgba(255,255,255,0.78)" : INK_60,
          lineHeight: 1.6,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function ServiceCard({ title, body }) {
  return (
    <div className="card-light" style={{
      background: "#0A0A0A", color: "#fff",
      borderColor: "rgba(255,255,255,0.14)",
      padding: "2rem 1.8rem", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(60% 60% at 100% 0%, rgba(212,255,0,0.08), transparent 60%)",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontSize: "1.6rem", fontWeight: 800, color: NEON,
          marginBottom: "0.9rem", letterSpacing: "-0.01em",
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "1rem", color: "rgba(255,255,255,0.82)",
          lineHeight: 1.65,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function CaseCard({ c }) {
  const colors = STATUS_COLORS[c.statusColor] || STATUS_COLORS.active;
  return (
    <div style={{
      padding: "1.4rem 1.4rem", background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
      display: "flex", flexDirection: "column", gap: "0.7rem",
      transition: "border-color 0.25s, background 0.25s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,255,0,0.3)"; e.currentTarget.style.background = "rgba(212,255,0,0.03)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.8rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, color: NEON,
            letterSpacing: "0.18em", marginBottom: "0.35rem",
          }}>
            #{c.rank} · {c.citation}
          </p>
          <h3 style={{
            fontFamily: FONT, fontSize: "1.1rem", fontWeight: 700, color: "#fff",
            lineHeight: 1.25, letterSpacing: "-0.01em",
          }}>
            {c.name}
          </h3>
        </div>
        <span style={{
          flexShrink: 0, fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
          padding: "0.3rem 0.6rem", borderRadius: 4, whiteSpace: "nowrap",
        }}>
          {c.status}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1.2rem" }}>
        <Meta label="Defendants" value={c.defendants} />
        <Meta label="Court" value={c.court} />
        <Meta label="Damages" value={c.damages} />
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.92rem", color: "rgba(255,255,255,0.72)",
        lineHeight: 1.6,
      }}>
        {c.summary}
      </p>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)" }}>
      <span style={{ color: "rgba(255,255,255,0.4)", marginRight: 4 }}>{label}:</span>
      <span style={{ color: "rgba(255,255,255,0.8)" }}>{value}</span>
    </p>
  );
}
