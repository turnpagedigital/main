import React, { useState, useEffect, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import FAQ from "../components/FAQ.jsx";
import BottomCTA from "../components/BottomCTA.jsx";
import DealCard from "../components/DealCard.jsx";
import dealsData from "../data/deals.json";

/* ── Damages exposure data ──────────────────────────────────────────────────
   Only cases with (a) a confirmed settlement or (b) an arithmetic statutory
   ceiling (registered-works count × 17 U.S.C. §504(c)(2) maximum of $150,000)
   are charted. Cases where damages remain formally unquantified are footnoted. */
const DAMAGES_DATA = [
  {
    name: "Bartz v. Anthropic PBC",
    amountB: 1.5,
    label: "$1.5B",
    type: "settled",
    badge: "Settled",
    basis: "482,460 registered works · ~$3,000/work class distribution",
    source: "N.D. Cal. No. 3:23-cv-03223 · Settlement Order (Aug. 2025)",
  },
  {
    name: "Getty Images v. Stability AI",
    amountB: 1.7,
    label: "$1.7B",
    type: "statutory",
    badge: "Statutory ceiling",
    basis: "11,383 registered works × $150,000 · 17 U.S.C. §504(c)(2)",
    source: "D. Del. No. 1:23-cv-00135 · Am. Compl. ¶ 151",
  },
  {
    name: "Concord / UMG v. Anthropic (II)",
    amountB: 3.1,
    label: "$3.1B",
    type: "statutory",
    badge: "Statutory ceiling",
    basis: "20,517 musical compositions × $150,000 · 17 U.S.C. §504(c)(2)",
    source: "N.D. Cal. · Compl. ¶ 12 (filed Jan. 2026)",
  },
  {
    name: "Doe 1 v. GitHub / Microsoft / OpenAI",
    amountB: 9.0,
    label: "$9B+",
    type: "dmca",
    badge: "DMCA §1202 est.",
    basis: "Est. from >1.2B code lines affected · DMCA §1202(b) per-violation ceiling",
    source: "N.D. Cal. No. 4:22-cv-06823 · Compl. ¶ 92",
  },
];
const MAX_B = Math.max(...DAMAGES_DATA.map(c => c.amountB));

const DEALS = (dealsData.deals || []).filter(d => Array.isArray(d.pages) && d.pages.includes("ai-copyright"));

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
        eyebrow="Copyright Claims"
        title="Calling all creators."
        accentTitle="Claim what's yours."
        subtitle="Bartz. The OpenAI MDL. Concord. Getty. We buy claims and advise on strategy."
        size="tall"
        video="/robottypes1.mp4"
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={hashHref("contact") + "?source=ai-copyright"} className="btn-neon">Talk to a Partner</a>
          <a href="#cases-section" className="btn-ghost">See exposure data</a>
        </div>
      </Hero>

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
          <div className="grid-3col">
            <ServiceCard
              title="Capital"
              body="A competitive cash bid from our institutional buyer network. Class-member purchases, opt-out direct purchases, bulk catalogues. Days to close."
            />
            <ServiceCard
              title="Advisory"
              body="Opt-in vs. opt-out economics. Statutory damages modeling. Counsel introductions across U.S., UK, EU, and Germany."
            />
            <ServiceCard
              title="Claim Monitoring"
              body="We track and file claims for you, automatically."
            />
          </div>
        </div>
      </section>

      {/* DAMAGES EXPOSURE */}
      <DamagesSection />

      {/* RELEVANT EXPERIENCE */}
      {DEALS.length > 0 && (
        <section style={{
          background: "#0A0B0E", color: "#fff",
          padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
        }}>
          <div style={{ maxWidth: 1440, margin: "0 auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
              gap: "clamp(2rem, 5vw, 5rem)",
              marginBottom: "clamp(3rem, 6vw, 5rem)",
              alignItems: "end",
            }} className="section-split">
              <div>
                <p style={{
                  fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  color: NEON, marginBottom: "1.2rem",
                }}>
                  Relevant Experience
                </p>
                <h2 style={{
                  fontFamily: FONT, fontWeight: 800,
                  fontSize: "clamp(2rem, 4.5vw, 4rem)",
                  lineHeight: 1.02, letterSpacing: "-0.035em",
                  color: "#fff",
                }}>
                  A track record across other class actions.
                </h2>
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
                color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 640,
              }}>
                A representative selection of our work advising rights holders, class members, and institutional buyers across the emerging AI copyright landscape.
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1px",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8, overflow: "hidden",
            }} className="deals-grid">
              {DEALS.map((d, i) => (
                <DealCard key={i} deal={d} />
              ))}
            </div>

            <style>{`
              @media (max-width: 1000px) {
                .deals-grid { grid-template-columns: repeat(2, 1fr) !important; }
              }
              @media (max-width: 640px) {
                .deals-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </div>
        </section>
      )}

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

function DamagesSection() {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="cases-section" style={{
      background: "#0A0B0E", color: "#fff",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
        <img src="/bg-paper.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5) contrast(1.1)" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.85))" }} />

      <div className="container" style={{ position: "relative", zIndex: 5, maxWidth: 1080 }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
          gap: "clamp(2rem,4vw,4rem)",
          alignItems: "end",
          marginBottom: "clamp(3rem,6vw,5rem)",
        }} className="section-split">
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: NEON, marginBottom: "1rem",
            }}>
              Active Docket
            </p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem,4.5vw,4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em",
              color: "#fff", margin: 0,
            }}>
              Quantified exposure<br />
              <span style={{ color: NEON, fontStyle: "italic" }}>across the docket.</span>
            </h2>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(0.95rem,1.3vw,1.1rem)",
            color: "rgba(255,255,255,0.6)", lineHeight: 1.65, margin: 0,
          }}>
            Cases with a confirmed settlement or an arithmetic statutory ceiling
            (registered-works count&nbsp;×&nbsp;17&nbsp;U.S.C.&nbsp;§504(c)(2) maximum of $150,000 per work).
            Excludes cases where damages remain formally unquantified.
          </p>
        </div>

        {/* Bars */}
        <div ref={ref}>
          {DAMAGES_DATA.map((c, i) => {
            const widthPct = (c.amountB / MAX_B) * 100;
            const isSettled = c.type === "settled";
            const barFill = isSettled ? NEON : "rgba(255,255,255,0.55)";
            const amtColor = isSettled ? NEON : "#fff";
            const badgeBg = isSettled ? "rgba(212,255,0,0.12)" : "rgba(255,255,255,0.07)";
            const badgeBorder = isSettled ? "rgba(212,255,0,0.4)" : "rgba(255,255,255,0.18)";
            const badgeText = isSettled ? NEON : "rgba(255,255,255,0.65)";
            const delay = `${i * 0.28}s`;
            return (
              <div key={c.name} style={{
                padding: "clamp(1.4rem,2.5vw,1.8rem) 0",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}>
                {/* Name + badge + amount */}
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: "1rem",
                  marginBottom: "0.75rem", flexWrap: "wrap",
                }}>
                  <span style={{
                    fontFamily: FONT, fontWeight: 700,
                    fontSize: "clamp(0.95rem,1.4vw,1.05rem)", color: "#fff",
                  }}>
                    {c.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    <span style={{
                      fontFamily: FONT, fontSize: "0.66rem", fontWeight: 700,
                      letterSpacing: "0.09em", textTransform: "uppercase",
                      background: badgeBg, border: `1px solid ${badgeBorder}`,
                      color: badgeText, padding: "0.28rem 0.6rem",
                      borderRadius: 4, whiteSpace: "nowrap",
                    }}>
                      {c.badge}
                    </span>
                    <span style={{
                      fontFamily: FONT, fontWeight: 900,
                      fontSize: "clamp(1.1rem,1.8vw,1.4rem)",
                      color: amtColor, letterSpacing: "-0.03em",
                    }}>
                      {c.label}
                    </span>
                  </div>
                </div>

                {/* Bar track + fill */}
                <div style={{
                  height: 6, background: "rgba(255,255,255,0.07)",
                  borderRadius: 2, overflow: "hidden", marginBottom: "0.55rem",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: barFill,
                    width: animated ? `${widthPct}%` : "0%",
                    transition: `width 1.4s cubic-bezier(0.4,0,0.2,1) ${delay}`,
                  }} />
                </div>

                {/* Basis + source */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  gap: "1rem", flexWrap: "wrap",
                }}>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.42)", lineHeight: 1.5,
                  }}>
                    {c.basis}
                  </span>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.26)", fontStyle: "italic",
                    whiteSpace: "nowrap",
                  }}>
                    {c.source}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Total row */}
          <div style={{
            borderTop: "2px solid rgba(255,255,255,0.18)",
            paddingTop: "clamp(1.4rem,2.5vw,2rem)",
            marginTop: "0.25rem",
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-end", gap: "2rem", flexWrap: "wrap",
          }}>
            <div>
              <p style={{
                fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)", marginBottom: "0.35rem",
              }}>
                Charted total · 4 cases
              </p>
              <p style={{
                fontFamily: FONT, fontWeight: 900,
                fontSize: "clamp(2.2rem,4.5vw,3.6rem)",
                letterSpacing: "-0.045em", color: "#fff", lineHeight: 1,
                margin: 0,
              }}>
                $15.3B<span style={{ color: NEON }}>+</span>
              </p>
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "0.75rem",
              color: "rgba(255,255,255,0.35)", lineHeight: 1.6,
              maxWidth: 500, textAlign: "right", margin: 0,
            }}>
              Excludes <em>In re OpenAI MDL</em> (MDL No. 3143, S.D.N.Y. — exposure described as
              "trillions theoretical"), <em>UMG v. Suno</em> (D. Mass.),{" "}
              <em>Andersen v. Stability AI</em> (N.D. Cal.), and{" "}
              <em>Disney v. Midjourney</em> (C.D. Cal.), among others.
              Statutory ceilings reflect 17&nbsp;U.S.C.&nbsp;§504(c)(2) maximum; actual awards
              may differ. Not legal advice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
