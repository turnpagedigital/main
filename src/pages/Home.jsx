import React, { useState } from "react";
import { NEON, FONT, INK, INK_60, INK_40, LINE, LINE_STRONG } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import { useI18n } from "../lib/i18n.js";
import FAQ from "../components/FAQ.jsx";
import CTABanner from "../components/CTABanner.jsx";
import DealCard from "../components/DealCard.jsx";
import dealsData from "../data/deals.json";

/* Content sourced from the May 2026 brand deck (TPDM_Overview).
   Home page focuses on the situations TPDM covers and the credibility of
   the team — not trade strategies. */

const SITUATIONS = [
  {
    no: "01",
    title: "Litigation Claims",
    body: "Complex disputes, contested matters, and judgments awaiting recovery.",
    details: "We work with plaintiffs, defendants, and investors across pre-judgment, post-judgment, and appellate stages. Our network includes institutional buyers who specialize in contested matters across federal and state courts.",
  },
  {
    no: "02",
    title: "Class Action Claims",
    body: "Class-member positions in the largest collective actions post-settlement.",
    details: "From antitrust and securities fraud to data breach settlements, we connect class members to competitive bids. We handle large individual positions as well as portfolios of smaller positions aggregated for efficiency.",
  },
  {
    no: "03",
    title: "Bankruptcy Claims",
    body: "Chapter 11 trade claims, customer claims, and creditor positions in major estates.",
    details: "Whether your claim is scheduled or unscheduled, secured or unsecured, we price it against our network of institutional buyers. We've traded claims in the largest Chapter 11 cases of the past decade.",
  },
  {
    no: "04",
    title: "Locked Assets",
    body: "Locked digital assets, frozen accounts, and deposits trapped in restructurings.",
    details: "Digital assets locked on exchange platforms, frozen bank accounts, and deposits trapped in restructurings are all addressable. Our team has deep expertise in the major crypto estate cases that defined this asset class.",
  },
  {
    no: "05",
    title: "Refund Rights",
    body: "Government refunds, including tariff refund rights and customs recoveries.",
    details: "We were among the first to build a market for IEEPA tariff refund rights. We work with importers, exporters, and counsel to structure assignments and participations on pending and anticipated refund claims.",
  },
  {
    no: "06",
    title: "Other Illiquid Assets",
    body: "Trade receivables, seized property, and one-off complex matters by conversation.",
    details: "If your situation doesn't fit a standard category, reach out. We've structured solutions for seized property, legacy receivables, and novel asset classes that most intermediaries won't touch.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Andrew is always thinking about how to structure trades in the most elegant way to allocate risk among the parties. When others give up, Andrew digs in.",
    by: "Locked Crypto Interest Holder",
  },
  {
    quote: "Andrew is extremely professional and easy to work with. His negotiating style is collaborative rather than confrontational, but he knows how to dial it up for a client when the situation demands.",
    by: "FTX Trading Ltd. Creditor",
  },
  {
    quote: "Andrew has deep knowledge about bankruptcy and restructuring that gives his clients a major advantage in negotiations.",
    by: "Genesis Global Creditor",
  },
];

const DEALS = dealsData.home;

const FAQS = [
  {
    q: "What types of claims do you cover?",
    a: "Bankruptcy claims, litigation claims, class action claims, trade receivables, judgments, locked digital assets, frozen accounts, government refunds, and seized property.",
  },
  {
    q: "What services do you offer?",
    a: "Capital solutions (assignments, participations, litigation financing, advances, contingency arrangements), trading strategies (OTC brokerage, auctions, private pools, structured portfolios), and advisory (claim analysis, price discovery, complex recovery strategies, expert testimony).",
  },
  {
    q: "How does pricing work?",
    a: "Competitive auction across our network of 500+ institutional buyers. No upfront retainers; we earn a spread on what closes.",
  },
  {
    q: "How fast can you close?",
    a: "Days on simple matters, longer when the docket requires it. Automation enables lightning-fast settlement in the largest cases.",
  },
  {
    q: "Is this legal or financial advice?",
    a: "No. Information is general in nature. We introduce you to counsel and tax specialists when a matter calls for it.",
  },
];

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsBand />
      <SituationsSection />
      <LeadershipSection />
      <TestimonialsSection />
      <FullBleedPhoto />
      <ExperienceSection />
      <EdgeSection />
      <FAQSection />
      <CTABanner
        title="Stay current on the docket."
        cta="Read the briefings"
        href={hashHref("briefings")}
      />
      <ClosingSection />
    </>
  );
}

/* ─── HERO ─── */
function HeroSection() {
  const { t } = useI18n();
  return (
    <section style={{
      position: "relative", overflow: "hidden",
      minHeight: "calc(100vh - 88px)",
      display: "flex", alignItems: "flex-end",
      padding: "0 clamp(1.5rem,5vw,4rem) clamp(3rem,6vh,5rem)",
      background: "#06070A",
    }}>
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #0A0C10 0%, #06070A 100%)",
      }} />
      <video
        autoPlay muted loop playsInline
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        style={{
          position: "absolute", inset: 0, zIndex: 1,
          width: "100%", height: "100%", objectFit: "cover",
          opacity: 0.85, filter: "saturate(0.85) contrast(1.05)",
          pointerEvents: "none",
        }}
      >
        <source src="/robotpages1.mp4" type="video/mp4" />
      </video>
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, transparent 30%, transparent 45%, rgba(0,0,0,0.70) 100%)",
      }} />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1440, width: "100%", margin: "0 auto" }}>
        <h1 style={{
          fontFamily: FONT, fontWeight: 900,
          fontSize: "clamp(2.6rem, 8vw, 7.5rem)",
          lineHeight: 0.96, letterSpacing: "-0.04em",
          color: "#FFFFFF", marginBottom: "1.8rem",
          maxWidth: 1200,
        }}>
          {t("hero.title_1")}<br />
          <span style={{ fontStyle: "italic", fontWeight: 800, color: NEON }}>{t("hero.title_2")}</span>
        </h1>
        <p style={{
          fontFamily: FONT, fontSize: "clamp(1rem, 1.5vw, 1.3rem)",
          color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
          maxWidth: 720, marginBottom: "2.4rem",
        }}>
          {t("hero.subtitle")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={hashHref("contact")} className="btn-neon">{t("hero.cta_primary")}</a>
          <a
            href="#situations"
            style={{
              fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600,
              color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em",
              padding: "1em 0", borderBottom: "1px solid rgba(255,255,255,0.4)",
              transition: "color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
          >
            {t("hero.cta_secondary")} →
          </a>
        </div>
      </div>

      <div style={{
        position: "absolute", right: "clamp(1.5rem,5vw,4rem)", bottom: "2rem", zIndex: 10,
        fontFamily: FONT, fontSize: "0.7rem", fontWeight: 600,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.5)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
      }} className="hide-on-mobile">
        <span>{t("hero.scroll")}</span>
        <span style={{ width: 1, height: 36, background: "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)" }} />
      </div>
    </section>
  );
}

/* ─── STATS BAND — three big numbers right below the hero ───
   Plain flat 3-column strip sitting on a darkened architectural BG image.
   The dark layer is partially transparent so the image bleeds through,
   giving the panel a glass-over-photo feel without any cards, eyebrow,
   rank numbers, or neon corner accents. */
function StatsBand() {
  const { t } = useI18n();
  const items = [
    { v: "$1B+", l: t("stats.claims_traded") },
    { v: "5K+",  l: t("stats.claims_advised") },
    { v: "500+", l: t("stats.institutions") },
  ];
  return (
    <section style={{
      background: "#0A0B0E", color: "#fff",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }} className="stats-band-grid">
          {items.map((it, i) => (
            <div key={i} style={{
              padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,3vw,2.5rem)",
              borderRight: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{
                fontFamily: FONT, fontWeight: 900,
                fontSize: "clamp(2.4rem, 5vw, 4rem)",
                lineHeight: 0.95, letterSpacing: "-0.04em",
                color: "#fff", marginBottom: "0.6rem",
              }}>
                {it.v}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.92rem",
                color: "rgba(255,255,255,0.78)",
                letterSpacing: "0.01em",
              }}>
                {it.l}
              </div>
            </div>
          ))}
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.5)",
          padding: "0.9rem clamp(1.5rem,3vw,2.5rem)",
          fontStyle: "italic",
        }}>
          {t("stats.footnote")}
        </p>
        <style>{`
          @media (max-width: 720px) {
            .stats-band-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ─── SITUATIONS WE COVER ─── */
function SituationsSection() {
  const [openIdx, setOpenIdx] = useState(null);

  function toggle(idx) {
    setOpenIdx(prev => prev === idx ? null : idx);
  }

  return (
    <section id="situations" style={{
      background: "#FFFFFF",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: "clamp(2rem, 5vw, 5rem)",
          marginBottom: "clamp(3rem, 7vw, 6rem)",
          alignItems: "end",
        }} className="section-split">
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: INK_60, marginBottom: "1.2rem",
            }}>
              What we cover
            </p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem, 4.5vw, 4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em",
              color: INK,
            }}>
              The toughest claims<br/>
              <span className="accent-light">on the docket.</span>
            </h2>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1.05rem, 1.4vw, 1.25rem)",
            color: INK_60, lineHeight: 1.6, maxWidth: 640,
          }}>
            We handle every kind of compensation claim — from class action settlements and Chapter 11 customer positions to refund rights and locked digital assets. Whatever the situation, if there's a path to liquidity, we've got it covered.
          </p>
        </div>

        <div style={{ borderTop: `1px solid ${LINE_STRONG}` }}>
          {SITUATIONS.map((s, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={s.no} style={{
                borderBottom: `1px solid ${LINE_STRONG}`,
                background: isOpen ? "#FAFAFA" : "transparent",
                transition: "background 0.25s",
              }}>
                {/* Trigger row */}
                <button
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "2.8rem 1fr",
                    gap: "clamp(1rem, 2.5vw, 2.5rem)",
                    alignItems: "center",
                    padding: "clamp(1.6rem, 2.8vw, 2.2rem) 0",
                    background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{
                    fontFamily: FONT, fontWeight: 700,
                    fontSize: "1.6rem", lineHeight: 1,
                    color: isOpen ? INK : INK_40,
                    display: "inline-block",
                    transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), color 0.2s",
                    userSelect: "none",
                  }}>
                    +
                  </span>
                  <h3 style={{
                    fontFamily: FONT, fontWeight: 800,
                    fontSize: "clamp(1.5rem, 3vw, 2.4rem)",
                    color: INK, letterSpacing: "-0.02em", lineHeight: 1.05,
                    margin: 0,
                  }}>
                    {s.title}
                  </h3>
                </button>

                {/* Expandable content */}
                <div style={{
                  overflow: "hidden",
                  maxHeight: isOpen ? "500px" : "0",
                  transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
                }}>
                  <div style={{
                    paddingLeft: "calc(2.8rem + clamp(1rem, 2.5vw, 2.5rem))",
                    paddingBottom: "clamp(1.6rem, 2.8vw, 2.4rem)",
                  }}>
                    <p style={{
                      fontFamily: FONT,
                      fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
                      color: INK_60, lineHeight: 1.65,
                      marginBottom: "0.75rem", marginTop: 0,
                    }}>
                      {s.body}
                    </p>
                    <p style={{
                      fontFamily: FONT,
                      fontSize: "clamp(0.9rem, 1.1vw, 1rem)",
                      color: INK_40, lineHeight: 1.7,
                      margin: 0,
                    }}>
                      {s.details}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          @media (max-width: 720px) {
            .section-split { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ─── LEADERSHIP ─── */
function LeadershipSection() {
  return (
    <section style={{
      background: "#F4F5F7",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${LINE}`,
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: INK_60, marginBottom: "1.5rem",
        }}>
          Leadership
        </p>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(2.4rem, 6vw, 5rem)",
          lineHeight: 0.98, letterSpacing: "-0.04em",
          color: INK, marginBottom: "clamp(3rem,6vw,5rem)",
        }}>
          Andrew Glantz
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
          gap: "clamp(2.5rem, 6vw, 6rem)",
          alignItems: "start",
        }} className="leadership-grid">
          <div>
            <div style={{
              aspectRatio: "4/5", width: "100%", maxWidth: 480,
              borderRadius: 8, overflow: "hidden",
              background: "#0A0A0A", border: `1px solid ${LINE_STRONG}`,
            }}>
              <img
                src="/andrew.png"
                alt="Andrew Glantz, Founder & Managing Partner"
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }}
              />
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700,
              color: INK, marginTop: "1.2rem",
              letterSpacing: "0.01em",
            }}>
              Andrew Glantz
            </p>
            <p style={{
              fontFamily: FONT, fontSize: "0.85rem",
              color: INK_60, marginTop: "0.2rem",
            }}>
              Founder & Managing Partner
            </p>
          </div>

          <div>
            <p style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
              lineHeight: 1.2, letterSpacing: "-0.02em",
              color: INK, marginBottom: "2rem",
            }}>
              A <span className="accent-light">singular force</span> in the claims market for the toughest situations that demand tenacity, creativity, flexibility, and finesse.
            </p>
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
              color: INK_60, lineHeight: 1.7, marginBottom: "1.2rem",
            }}>
              Andrew has facilitated some of the largest claim trades in FTX, Genesis, Mt. Gox, Celsius, and BlockFi, and was one of the early pioneers of crypto loss claims trading.
            </p>
            <p style={{
              fontFamily: FONT, fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
              color: INK_60, lineHeight: 1.7,
            }}>
              Trained as a bankruptcy lawyer, Andrew has over a decade of experience in Chapter 11 restructuring, special situations investments, and asset recovery strategies — seamlessly bridging traditional and digital assets.
            </p>
          </div>
        </div>

        <style>{`
          @media (max-width: 880px) {
            .leadership-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ─── TESTIMONIALS ─── */
function TestimonialsSection() {
  return (
    <section style={{
      background: "#FFFFFF",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${LINE}`,
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: INK_60, marginBottom: "1.5rem",
        }}>
          What clients say
        </p>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(2.4rem, 6vw, 5rem)",
          lineHeight: 0.98, letterSpacing: "-0.04em",
          color: INK, marginBottom: "clamp(3rem,6vw,5rem)",
          maxWidth: 1000,
        }}>
          When others give up,<br />
          <span className="accent-light">we dig in.</span>
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "clamp(1.5rem, 3vw, 2.5rem)",
        }} className="testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} style={{
              borderTop: `2px solid ${INK}`,
              padding: "1.6rem 0 0",
              margin: 0,
            }}>
              <blockquote style={{
                fontFamily: FONT, fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
                color: INK, lineHeight: 1.55,
                margin: 0, marginBottom: "1.4rem",
              }}>
                “{t.quote}”
              </blockquote>
              <figcaption style={{
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: INK_60,
              }}>
                — {t.by}
              </figcaption>
            </figure>
          ))}
        </div>

        <style>{`
          @media (max-width: 900px) {
            .testimonials-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ─── FULL-BLEED PHOTO — Polestar editorial breathing moment ─── */
/* Drop a different file into /public/ and update the src below to swap.
   Recommended aspect: wide (16:6 or wider) so the image reads as a horizontal
   pause between sections. Falls back to bg-paper.jpg if hero-break.jpg
   doesn't exist. */
function FullBleedPhoto() {
  return (
    <section style={{
      position: "relative",
      width: "100%",
      height: "clamp(320px, 50vw, 720px)",
      overflow: "hidden",
      background: "#0A0B0E",
    }}>
      <img
        src="/Paper.jpg"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          filter: "saturate(0.7) contrast(1.05)",
        }}
        onError={(e) => { e.currentTarget.src = "/bg-paper.jpg"; }}
      />
    </section>
  );
}

/* ─── RELEVANT EXPERIENCE — deal track record ─── */
function ExperienceSection() {
  return (
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
              A track record across the largest claims trades.
            </h2>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
            color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 640,
          }}>
            A representative slice of recent deals across crypto insolvencies, pension claims, antitrust settlements, and complex litigation matters.
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

        <p style={{
          fontFamily: FONT, fontSize: "0.78rem",
          color: "rgba(255,255,255,0.4)", marginTop: "1.2rem",
          fontStyle: "italic",
        }}>
          Additional matters covered by conversation. See our <a href={hashHref("crypto")} style={{ color: "inherit", textDecoration: "underline" }}>locked crypto desk</a> for a full track record across major crypto insolvencies.
        </p>

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
  );
}

/* ─── OUR EDGE ─── */
function EdgeSection() {
  const points = [
    { h: "Practically unlimited liquidity", b: "We partner with major asset managers — over 500 institutions on speed dial." },
    { h: "Lightning-fast settlement",       b: "Automation accelerates diligence and closing in the largest cases." },
    { h: "Relationship builders, not just dealmakers", b: "We're built to move fast when it counts — and every other day." },
  ];
  return (
    <section style={{
      background: "#FFFFFF",
      padding: "clamp(5rem, 12vw, 11rem) clamp(1.5rem, 5vw, 4rem)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div className="section-split" style={{
          alignItems: "end",
          marginBottom: "clamp(3rem, 6vw, 5rem)",
        }}>
          <div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: INK_60, marginBottom: "1.2rem",
            }}>
              Our Edge
            </p>
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(2rem, 4.5vw, 4rem)",
              lineHeight: 1.02, letterSpacing: "-0.035em",
              color: INK,
            }}>
              Built to move fast<br />
              <span className="accent-light">when it counts.</span>
            </h2>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1.05rem, 1.4vw, 1.25rem)",
            color: INK_60, lineHeight: 1.6, maxWidth: 640,
          }}>
            Three structural advantages let us close trades that others can't: scale on the buy side, automation in diligence, and counterparty relationships built over a decade in the market.
          </p>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "clamp(1.5rem, 3vw, 3rem)",
        }} className="edge-grid">
          {points.map((p, i) => (
            <div key={i} style={{ borderTop: `2px solid ${INK}`, paddingTop: "1.4rem" }}>
              <h3 style={{
                fontFamily: FONT, fontSize: "clamp(1.2rem, 1.8vw, 1.45rem)",
                fontWeight: 800, color: INK, letterSpacing: "-0.015em",
                marginBottom: "0.7rem", lineHeight: 1.2,
              }}>
                {p.h}
              </h3>
              <p style={{
                fontFamily: FONT, fontSize: "clamp(0.95rem,1.2vw,1.05rem)",
                color: INK_60, lineHeight: 1.55,
              }}>
                {p.b}
              </p>
            </div>
          ))}
        </div>
        <style>{`
          @media (max-width: 900px) { .edge-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQSection() {
  return (
    <section style={{
      background: "#F4F5F7",
      padding: "clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${LINE}`,
    }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: INK_60, marginBottom: "1.5rem",
        }}>
          Frequently asked
        </p>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)",
          lineHeight: 1.02, letterSpacing: "-0.035em",
          color: INK, marginBottom: "clamp(2.5rem, 5vw, 4rem)",
          maxWidth: 880,
        }}>
          Questions, <span className="accent-light">answered.</span>
        </h2>
        <div style={{ maxWidth: 880 }}>
          <FAQ items={FAQS} openFirst={false} />
        </div>
      </div>
    </section>
  );
}

/* ─── CLOSING — Why wait? ─── */
function ClosingSection() {
  return (
    <section style={{
      background: "#0A0B0E",
      padding: "clamp(6rem, 14vw, 12rem) clamp(1.5rem, 5vw, 4rem)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(60% 70% at 50% 0%, rgba(212,255,0,0.06), transparent 60%)",
      }} />
      <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: NEON, marginBottom: "2rem",
        }}>
          Get a quote
        </p>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(3.5rem, 10vw, 9rem)",
          lineHeight: 0.92, letterSpacing: "-0.05em",
          color: "#FFFFFF", marginBottom: "2.2rem",
        }}>
          Why wait?
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
          color: "rgba(255,255,255,0.7)", lineHeight: 1.55,
          maxWidth: 540, margin: "0 auto 3rem",
        }}>
          Contact us for a quote or to learn more.
        </p>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: "2.5rem 4rem",
          justifyContent: "center", alignItems: "center",
          marginBottom: "3rem",
        }}>
          <div style={{ textAlign: "left" }}>
            <p style={{
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem",
            }}>
              Email
            </p>
            <a href="mailto:info@turnpagedigital.com" style={{
              fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
              fontWeight: 700, color: "#fff",
              borderBottom: `2px solid ${NEON}`, paddingBottom: 2,
            }}>
              info@turnpagedigital.com
            </a>
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem",
            }}>
              Phone
            </p>
            <a href="tel:+16468600068" style={{
              fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.2rem)",
              fontWeight: 700, color: "#fff",
              borderBottom: `2px solid ${NEON}`, paddingBottom: 2,
            }}>
              +1 646 860 0068
            </a>
          </div>
        </div>

        <a href={hashHref("contact")} className="btn-neon">Get in Touch</a>
      </div>
    </section>
  );
}
