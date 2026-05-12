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
  { value: "$1.5B",   label: "Bartz v. Anthropic — largest U.S. copyright settlement" },
  { value: "70+",     label: "Federal AI copyright lawsuits filed" },
  { value: "$3.1B",   label: "Statutory ceiling in the Concord II music-publisher complaint" },
  { value: "91%",     label: "Bartz claim rate — 9× the typical class take-up" },
];

const FAQS = [
  {
    q: "I'm a Bartz class member. Should I sell my claim or wait for distribution?",
    a: [
      "It depends on your tax posture, cash needs, and risk tolerance. The Bartz settlement is paying ~$3,000 per work in two installments; the second installment is due April 30, 2026, with distributions to claimants following the May 14, 2026 fairness hearing.",
      "If you'd prefer immediate liquidity, an all-cash bid removes timeline risk and locks in value at today's discount to face. We can quote in days. If you'd rather wait, we'll also tell you that — we won't push a sale that doesn't make sense.",
    ],
  },
  {
    q: "I'm thinking about opting out for an independent action. Can you help?",
    a: "Yes. Opt-out economics depend on the strength of your specific registrations, your statutory-damages ceiling, and the leverage you bring to negotiations. We analyze the math against the class settlement — and introduce you to specialist counsel if independent litigation makes sense.",
  },
  {
    q: "We're a music publisher. What about Concord and the Concord II complaint?",
    a: "Concord v. Anthropic is in cross-MSJ briefing in the Northern District. The Concord II complaint (January 2026) adds $3.1B in statutory exposure on alleged BitTorrent piracy of 20,517 compositions and names Dario Amodei and Benjamin Mann as individual defendants. We work with publishers on settlement architecture, fairness-hearing positioning, and bulk catalogue dispositions.",
  },
  {
    q: "What about non-U.S. matters — UK, EU, Germany?",
    a: "We cover them. GEMA v. OpenAI is the first European AI copyright ruling on the merits (Munich, November 2025). Getty v. Stability is in UK appeal. We have counsel relationships across the U.S., UK, EU, and Germany and routinely coordinate cross-jurisdictional strategy.",
  },
  {
    q: "How do you price an AI copyright claim?",
    a: "Inputs include registered-vs-unregistered status, statutory damages ceiling, the docket and judge, comparable settlements, counterparty appetite, and timing risk. We run a competitive process across our buyer network and come back with a real bid — not an indication.",
  },
  {
    q: "Do you publish briefings?",
    a: "Yes. The briefings library is a continuously updated set of analyses on the cases, settlements, and rulings shaping the docket. Written for rights holders, counsel, and dealmakers.",
  },
];

export default function AICopyright() {
  return (
    <>
      <Hero
        eyebrow="AI Copyright Desk"
        title="The largest copyright settlement in U.S. history is"
        accentTitle="just the beginning."
        subtitle="Bartz v. Anthropic. The OpenAI MDL. Concord Music v. Anthropic. Getty v. Stability. We help authors, music publishers, news organizations, and visual artists navigate this landscape — with capital today and advisory across the lifecycle of every claim."
        size="tall"
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={hashHref("contact") + "?source=ai-copyright"} className="btn-neon">Talk to a Partner</a>
          <a href="#cases-section" className="btn-ghost">See active cases</a>
        </div>
      </Hero>

      {/* ─── STAT STRIP ON LIGHT ─── */}
      <section className="surface-paper" style={{ padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,4rem)" }}>
        <div className="container">
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: "1.4rem" }}>The Numbers</p>
          <StatStrip items={STATS} theme="light" />
        </div>
      </section>

      {/* ─── WHY NOW ─── */}
      <section className="surface-paper section-pad" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHeader
            eyebrow="Why Now"
            title="The AI copyright docket is bigger"
            accent="than any single case."
            kicker="Seventy-plus federal lawsuits. Two confirmed settlements above the billion-dollar line. A 91% claim rate in the Bartz class — more than nine times typical class take-up. Rights holders are at an inflection point: the legal infrastructure for compensation is finally being built, and the question is no longer whether to act but how, when, and with what counterparties."
          />
        </div>
      </section>

      {/* ─── WHO WE HELP ─── */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Who We Help"
            title="From individual authors"
            accent="to global music groups."
          />

          {/* Primary audience */}
          <div className="grid-2col" style={{ marginBottom: "1.2rem" }}>
            <AudienceCard
              priority
              title="Authors & Writers"
              body="Class members in Bartz v. Anthropic. Plaintiffs and putative class members in the OpenAI MDL (Authors Guild, Grisham, Martin, Baldacci, et al.) and Kadrey v. Meta. Whether you're holding a claim or considering opting out for an independent action, we structure capital and advise on strategy."
              audience="Class members · Plaintiffs · Pre-litigation rights holders"
            />
            <AudienceCard
              priority
              title="Music Publishers & Labels"
              body="Plaintiffs in Concord Music v. Anthropic, UMG v. Suno, UMG v. Udio, and the new $3.1B Concord II complaint. RIAA-coordinated claimants and individual publishers alike — we underwrite claims and advise on settlement architecture as the music docket matures."
              audience="Major labels · Independent publishers · Rights societies"
            />
          </div>

          {/* Secondary audience */}
          <div className="grid-3col">
            <AudienceCard
              title="News Organizations"
              body="Plaintiffs in NYT v. OpenAI, Advance Local v. Cohere, and the consolidated MDL. We've tracked the substitutive-summaries doctrine since the Cohere MTD denial."
              audience="Newsroom plaintiffs · Publisher coalitions"
            />
            <AudienceCard
              title="Visual Artists & Stock Libraries"
              body="Class members in Andersen v. Stability AI; plaintiffs in Getty v. Stability (US and UK). We work with photographers, illustrators, and stock libraries on both classed and direct claims."
              audience="Image-training claimants · DMCA plaintiffs"
            />
            <AudienceCard
              title="Rights Holders Considering Action"
              body="Holding a copyrighted catalogue but not yet in court? We can advise on registration posture, statutory-damages exposure analysis, and counsel introductions before you file."
              audience="Pre-litigation strategy"
            />
          </div>
        </div>
      </section>

      {/* ─── WHAT WE OFFER ─── */}
      <section className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="What We Offer"
            title="Capital today."
            accent="Advisory across the lifecycle."
          />
          <div className="grid-2col">
            <ServiceCard
              title="Capital Solutions"
              body="A competitive cash bid for your claim, sourced from our network of 500+ institutional buyers. Exit the timeline. Convert a contingent recovery into immediate liquidity. Use the proceeds to fund operations, distribute to authors, or simply de-risk."
              bullets={[
                "Class-member claim purchases (Bartz, Concord, OpenAI MDL)",
                "Direct claim purchases for opt-outs and independent actions",
                "Bulk catalogue acquisitions for publishers and societies",
                "Days to close, not years to wait for distributions",
              ]}
            />
            <ServiceCard
              title="Advisory"
              body="Settlement strategy when the playbook is being written in real time. Opt-in vs. opt-out analysis. Claim valuation against the statutory damages ceiling. Counsel introductions across the U.S., UK, EU, and beyond."
              bullets={[
                "Settlement architecture and fairness-hearing positioning",
                "Statutory damages exposure modeling ($150K/work scenarios)",
                "Opt-out economics and independent-action feasibility",
                "Cross-jurisdictional coordination (CJEU, UK, U.S.)",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ─── TOP 12 CASES (dark for contrast) ─── */}
      <section id="cases-section" className="surface-dark section-pad" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
          <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5) contrast(1.1)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.85))" }} />
        <div className="container" style={{ position: "relative", zIndex: 5 }}>
          <SectionHeader
            eyebrow="Active Docket"
            title="The top 12 cases"
            accent="we track."
            theme="dark"
          />
          <p style={{
            fontFamily: FONT, fontSize: "0.95rem", color: "rgba(255,255,255,0.55)",
            maxWidth: 640, margin: "-1.6rem auto 2.8rem", lineHeight: 1.6, textAlign: "center",
          }}>
            Ranked by alleged damages. Click through to{" "}
            <a href={hashHref("briefings")} style={{ color: NEON, textDecoration: "underline", textUnderlineOffset: 3 }}>
              our briefings
            </a>{" "}
            for ongoing analysis.
          </p>

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

      {/* ─── FAQ ─── */}
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
              <p style={{
                fontFamily: FONT, fontSize: "1rem", color: INK_60,
                lineHeight: 1.65, marginBottom: "1.4rem",
              }}>
                The most common questions we hear from class members, plaintiffs, and counsel. Send anything we missed.
              </p>
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
        title="Hold a claim — or considering action?"
        accent="Talk to us."
        kicker="Confidentiality assured. We respond to every inquiry within 48 hours."
        primary={{ label: "Get in Touch", href: hashHref("contact") + "?source=ai-copyright" }}
        secondary={{ label: "Read the Briefings", href: hashHref("briefings") }}
      />
    </>
  );
}

function AudienceCard({ title, body, audience, priority }) {
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
          fontFamily: FONT, fontSize: "0.95rem",
          color: priority ? "rgba(255,255,255,0.78)" : INK_60,
          lineHeight: 1.65, marginBottom: "1.1rem",
        }}>
          {body}
        </p>
        <p style={{
          fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: priority ? NEON : INK_60,
        }}>
          {audience}
        </p>
      </div>
    </div>
  );
}

function ServiceCard({ title, body, bullets }) {
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
          fontFamily: FONT, fontSize: "1.5rem", fontWeight: 800, color: NEON,
          marginBottom: "0.9rem", letterSpacing: "-0.01em",
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "1rem", color: "rgba(255,255,255,0.82)",
          lineHeight: 1.65, marginBottom: "1.4rem",
        }}>
          {body}
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {bullets.map((b, i) => (
            <li key={i} style={{
              fontFamily: FONT, fontSize: "0.93rem", color: "rgba(255,255,255,0.7)",
              paddingLeft: "1.3rem", position: "relative", lineHeight: 1.5,
            }}>
              <span style={{ position: "absolute", left: 0, top: 0, color: NEON, fontWeight: 700 }}>›</span>
              {b}
            </li>
          ))}
        </ul>
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
