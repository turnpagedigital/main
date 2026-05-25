import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import FAQ from "../components/FAQ.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

const OLD_WAY = {
  title: "Traditional litigation.",
  items: [
    "Cases declined — capital constraints, not merit.",
    "Settlements driven by client cashflow, not case value.",
    "Overhead costs limit the size of your docket.",
  ],
};
const NEW_WAY = {
  title: "Powered by Turnpage.",
  items: [
    "Capital deployed against the merit of the case.",
    "Clients hold out for full value.",
    "Grow your contingency docket without diluting equity.",
  ],
};

const FAQS = [
  {
    q: "What types of cases do you fund?",
    a: "Commercial litigation, IP and patent disputes, antitrust, class actions, mass torts, and breach of contract. We evaluate each case on its merits — size, counsel quality, and clear damages theory are the primary factors.",
  },
  {
    q: "Who is eligible — law firms only, or claimants too?",
    a: "Both. We work directly with law firms looking to expand their contingency docket and with individual claimants whose counsel requires case financing. Talk to us about your situation.",
  },
  {
    q: "What does Turnpage receive in return?",
    a: "A pre-negotiated share of the recovery. If the case does not result in a recovery, Turnpage bears the loss — there is no recourse to the firm or the client.",
  },
  {
    q: "How long does the underwriting process take?",
    a: "We respond to initial inquiries within 48 hours. Full underwriting — including case review, opposing counsel analysis, and damages modeling — typically takes two to four weeks depending on the complexity of the matter.",
  },
  {
    q: "Is there a minimum case size?",
    a: "We generally look for matters with damages exposure of $5M or more. Smaller cases with compelling facts are considered on a case-by-case basis.",
  },
];

export default function LitigationFinance() {
  return (
    <>
      <Hero
        eyebrow="Litigation Finance"
        title="Power the cases that"
        accentTitle="deserve to win."
        subtitle="Turnpage helps the best law firms pursue cases on contingency — providing capital so merit drives the docket, not client cashflow."
        size="tall"
        video="/robotobriefcase1.mp4"
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={hashHref("contact") + "?source=litigation-finance"} className="btn-neon">Talk to a Partner</a>
          <a href="#how-litfin" className="btn-ghost">How it works</a>
        </div>
      </Hero>

      {/* WHO WE HELP */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Who We Help"
            title="Firms. Claimants."
            accent="Cases."
          />
          <div className="grid-2col" style={{ marginBottom: "1.2rem" }}>
            <AudienceCard
              priority
              title="Contingency Law Firms"
              body="Boutique litigation shops and BigLaw contingency practices looking to grow their docket without tying up equity or taking on overhead risk."
            />
            <AudienceCard
              priority
              title="Elite Plaintiffs' Practices"
              body="Class action, antitrust, and IP litigation teams pursuing high-stakes matters that require patient, long-duration capital."
            />
          </div>
          <div className="grid-2col">
            <AudienceCard
              title="Individual Claimants"
              body="Plaintiffs whose counsel needs funding to take a meritorious case to trial. We work with you or your attorney directly."
            />
            <AudienceCard
              title="Solo & Small Firm Practitioners"
              body="High-quality litigators with strong cases who need capital to level the playing field against well-resourced defendants."
            />
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="how-litfin" className="surface-paper section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="Why Turnpage"
            title="Merit drives"
            accent="the docket."
          />
          <Comparison oldWay={OLD_WAY} newWay={NEW_WAY} />
        </div>
      </section>

      {/* WHAT WE FUND */}
      <section className="surface-paper-2 section-pad">
        <div className="container">
          <SectionHeader
            eyebrow="What We Fund"
            title="High-stakes."
            accent="Meritorious."
          />
          <div className="grid-2col" style={{ marginBottom: "1.2rem" }}>
            <ServiceCard
              title="Commercial Litigation"
              body="Breach of contract, business torts, fraud, and complex commercial disputes with clear damages theories and credible counsel."
            />
            <ServiceCard
              title="IP & Patent"
              body="Patent infringement, trade secret misappropriation, and trademark disputes. We understand IP damages and appeals risk."
            />
          </div>
          <div className="grid-2col">
            <ServiceCard
              title="Antitrust & Class Actions"
              body="Multi-plaintiff and class action matters where early capital determines whether a case gets to trial or settles below value."
            />
            <ServiceCard
              title="Bankruptcy & Litigation Claims"
              body="Claims asserted in or arising out of bankruptcy proceedings — adversary actions, fraudulent transfer, and preference recovery."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — dark 3-step */}
      <section style={{
        background: "#0A0B0E", color: "#fff",
        padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.12 }}>
          <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5) contrast(1.1)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.9))" }} />
        <div style={{ position: "relative", zIndex: 5, maxWidth: 1440, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: "clamp(2rem,5vw,5rem)",
            marginBottom: "clamp(3rem,6vw,5rem)",
            alignItems: "end",
          }} className="section-split">
            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: NEON, marginBottom: "1.2rem",
              }}>
                How It Works
              </p>
              <h2 style={{
                fontFamily: FONT, fontWeight: 800,
                fontSize: "clamp(2rem,4.5vw,4rem)",
                lineHeight: 1.02, letterSpacing: "-0.035em",
                color: "#fff", margin: 0,
              }}>
                Three steps to a funded case.
              </h2>
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
              color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 600, margin: 0,
            }}>
              We underwrite quickly and move capital decisively. No committees, no endless diligence loops.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.08)",
          }} className="steps-grid">
            {[
              {
                n: "01",
                title: "Submit your case",
                body: "Share a case summary — claims, defendants, damages theory, and stage of litigation. NDA available on request.",
              },
              {
                n: "02",
                title: "Underwriting",
                body: "Our team reviews merits, damages, counsel quality, and opposing party resources. We respond with a term sheet within two to four weeks.",
              },
              {
                n: "03",
                title: "Capital deployed",
                body: "Once terms are agreed, capital is available to cover case costs — experts, discovery, depositions, and trial preparation.",
              },
            ].map(step => (
              <div key={step.n} style={{ padding: "clamp(1.8rem,3vw,2.4rem)", background: "rgba(255,255,255,0.02)" }}>
                <p style={{
                  fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                  letterSpacing: "0.2em", color: NEON, marginBottom: "1rem",
                }}>
                  {step.n}
                </p>
                <h3 style={{
                  fontFamily: FONT, fontWeight: 800, fontSize: "1.15rem",
                  letterSpacing: "-0.01em", color: "#fff",
                  marginBottom: "0.65rem", lineHeight: 1.2,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontFamily: FONT, fontSize: "0.95rem",
                  color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0,
                }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <style>{`
            @media (max-width: 720px) {
              .steps-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>

      {/* FAQ */}
      <section className="surface-paper section-pad">
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: "clamp(2rem,6vw,5rem)", alignItems: "start",
          }} className="faq-layout">
            <div>
              <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>FAQ</p>
              <h2 className="h-section" style={{ marginBottom: "1rem" }}>
                Litigation finance,{" "}
                <span className="accent-light">answered.</span>
              </h2>
              <a href={hashHref("contact") + "?source=litigation-finance"} className="btn-ghost-ink">Talk to a Partner</a>
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
        eyebrow="Litigation Finance"
        title="Have a case worth funding?"
        accent="Talk to us."
        kicker="48-hour response. Confidentiality default."
        primary={{ label: "Talk to a Partner", href: hashHref("contact") + "?source=litigation-finance" }}
        secondary={null}
      />
    </>
  );
}

/* ── Card components ──────────────────────────────────────────────────────── */

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
        background: "radial-gradient(55% 60% at 100% 100%, rgba(212,255,0,0.06), transparent 60%)",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800,
          color: NEON, marginBottom: "0.7rem",
          letterSpacing: "-0.01em", lineHeight: 1.2,
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.97rem",
          color: "rgba(255,255,255,0.72)", lineHeight: 1.6,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}

/* ── Comparison (inline — mirrors Crypto's import of the shared component) ── */
function Comparison({ oldWay, newWay }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px",
      background: LINE, border: `1px solid ${LINE}`,
    }} className="comparison-grid">
      {[oldWay, newWay].map((col, ci) => {
        const isNew = ci === 1;
        return (
          <div key={ci} style={{
            background: isNew ? "#0A0A0A" : "#fff",
            padding: "clamp(1.8rem,3vw,2.4rem)",
            position: "relative", overflow: "hidden",
          }}>
            {isNew && (
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(60% 55% at 0% 0%, rgba(212,255,0,0.08), transparent 60%)",
              }} />
            )}
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={{
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: isNew ? NEON : INK_60, marginBottom: "1rem",
              }}>
                {col.title}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {col.items.map((item, ii) => (
                  <li key={ii} style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                    <span style={{
                      flexShrink: 0, width: 18, height: 18,
                      borderRadius: "50%",
                      background: isNew ? NEON : "rgba(10,10,10,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 2,
                    }}>
                      {isNew
                        ? <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke={INK_60} strokeWidth="1.4" strokeLinecap="round"/></svg>
                      }
                    </span>
                    <span style={{
                      fontFamily: FONT, fontSize: "0.97rem",
                      color: isNew ? "rgba(255,255,255,0.82)" : INK_60,
                      lineHeight: 1.55,
                    }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
      <style>{`
        @media (max-width: 600px) {
          .comparison-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
