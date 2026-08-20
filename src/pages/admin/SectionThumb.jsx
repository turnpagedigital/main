import React from "react";

/* SectionThumb — fully rendered mini-preview for section templates.
   Each thumb renders a 900×500 px scene that is CSS-scaled to fit the
   requested display size. Uses placeholder copy + real colours so the
   admin can see what the section will look like at a glance. */

// ─── Tokens ──────────────────────────────────────────────────────────────────
const NEON   = "#D4FF00";
const FONT   = "'Archivo', sans-serif";
const INK    = "#0A0A0A";
const INK_60 = "rgba(10,10,10,0.6)";
const INK_30 = "rgba(10,10,10,0.3)";
const PAPER  = "#E5E7EB";
const W = 900;
const H = 500;

// ─── Shared primitives ────────────────────────────────────────────────────────
const Eyebrow = ({ children, color = NEON }) => (
  <p style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, letterSpacing: "0.22em",
    textTransform: "uppercase", color, margin: "0 0 18px" }}>
    {children}
  </p>
);
const Btn = ({ children, style = {} }) => (
  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: NEON, color: INK, fontFamily: FONT, fontWeight: 700, fontSize: 18,
    padding: "14px 34px", borderRadius: 3, ...style }}>
    {children}
  </div>
);
const GhostBtn = ({ children, dark = true }) => (
  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
    border: `1px solid ${dark ? "rgba(255,255,255,0.35)" : INK_30}`,
    color: dark ? "rgba(255,255,255,0.85)" : INK_60, fontFamily: FONT, fontWeight: 600,
    fontSize: 18, padding: "14px 34px", borderRadius: 3 }}>
    {children}
  </div>
);
const QuoteLine = ({ text, size = 24, color = INK, mb = 12 }) => (
  <p style={{ fontFamily: FONT, fontSize: size, color, lineHeight: 1.55, margin: `0 0 ${mb}px`, fontStyle: "italic" }}>
    "{text}"
  </p>
);
const Attribution = ({ by, color = INK_60 }) => (
  <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase", color, margin: 0 }}>
    — {by}
  </p>
);
const AccRow = ({ q, borderColor = INK_30 }) => (
  <div style={{ borderTop: `1px solid ${borderColor}`, padding: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ fontFamily: FONT, fontSize: 17, color: INK_60 }}>{q}</span>
    <span style={{ fontFamily: FONT, fontSize: 20, color: INK_30, flexShrink: 0 }}>+</span>
  </div>
);
const ImgPlaceholder = ({ style = {} }) => (
  <div style={{ background: "linear-gradient(135deg,#CBD5E1 0%,#94A3B8 100%)", ...style }} />
);

// ─── Section thumbnails ───────────────────────────────────────────────────────

function HomeHeroThumb() {
  return (
    <div style={{ width: W, height: H, background: "#000", position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 80px 60px" }}>
      <ImgPlaceholder style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: FONT, fontSize: 86, fontWeight: 800, color: "#fff", lineHeight: 1.02, letterSpacing: "-0.03em" }}>
          Strategic guidance.
        </div>
        <div style={{ fontFamily: FONT, fontSize: 86, fontWeight: 800, color: NEON, fontStyle: "italic", lineHeight: 1.02, letterSpacing: "-0.03em", marginBottom: 28 }}>
          Turn-key liquidity.
        </div>
        <div style={{ fontFamily: FONT, fontSize: 21, color: "rgba(255,255,255,0.6)", maxWidth: 560, marginBottom: 32, lineHeight: 1.5 }}>
          For rights holders entitled to compensation.
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <Btn>Get in Touch</Btn>
          <GhostBtn dark>What we cover</GhostBtn>
        </div>
      </div>
    </div>
  );
}

function HeroThumb() {
  return (
    <div style={{ width: W, height: H, background: "#050810", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", padding: "0 80px" }}>
      <ImgPlaceholder style={{ position: "absolute", right: 0, top: 0, width: "45%", height: "100%", opacity: 0.3 }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 520 }}>
        <Eyebrow>Copyright Claims</Eyebrow>
        <div style={{ fontFamily: FONT, fontSize: 72, fontWeight: 800, color: "#fff", lineHeight: 1.04, letterSpacing: "-0.03em" }}>
          Calling all creators.
        </div>
        <div style={{ fontFamily: FONT, fontSize: 72, fontWeight: 800, color: NEON, fontStyle: "italic", lineHeight: 1.04, letterSpacing: "-0.03em", marginBottom: 24 }}>
          Claim what's yours.
        </div>
        <div style={{ fontFamily: FONT, fontSize: 19, color: "rgba(255,255,255,0.55)", marginBottom: 36, lineHeight: 1.5 }}>
          Competitive capital and advisory for copyright holders.
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <Btn>Talk to Us</Btn>
          <GhostBtn dark>Top Cases</GhostBtn>
        </div>
      </div>
    </div>
  );
}

function StatsBandThumb() {
  const stats = [
    { val: "$1.1B", label: "Monetized*" },
    { val: "5K+",   label: "Traded or advised*" },
    { val: "500+",  label: "Funders on speed dial" },
  ];
  return (
    <div style={{ width: W, height: H, background: "#000", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", width: "100%", gap: 0 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none", padding: "20px" }}>
            <div style={{ fontFamily: FONT, fontSize: 70, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {s.val}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 18, color: "rgba(255,255,255,0.45)", marginTop: 12, letterSpacing: "0.05em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SituationsThumb() {
  return (
    <div style={{ width: W, height: H, background: "#F4F5F7", display: "grid",
      gridTemplateColumns: "320px 1fr", gap: 80, padding: "60px 80px", alignItems: "start" }}>
      <div>
        <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
          textTransform: "uppercase", color: INK_60, marginBottom: 20 }}>Situations</p>
        <h2 style={{ fontFamily: FONT, fontSize: 52, fontWeight: 800, lineHeight: 1.08,
          letterSpacing: "-0.025em", color: INK, margin: "0 0 20px" }}>
          What do you have?
        </h2>
        <p style={{ fontFamily: FONT, fontSize: 18, color: INK_60, lineHeight: 1.55, margin: 0 }}>
          We work across every claim type and recovery right.
        </p>
      </div>
      <div style={{ paddingTop: 8 }}>
        {["Bankruptcy Claims","Crypto & Digital Assets","AI Copyright","Litigation Claims","Tax Refunds","Seized Assets"].map(q => (
          <AccRow key={q} q={q} />
        ))}
      </div>
    </div>
  );
}

function BioThumb() {
  return (
    <div style={{ width: W, height: H, background: "#fff", display: "grid",
      gridTemplateColumns: "300px 1fr", gap: 80, padding: "70px 80px", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 180, height: 180, borderRadius: "50%", background: "linear-gradient(135deg,#CBD5E1,#94A3B8)", margin: "0 auto 24px" }} />
        <p style={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, color: INK, margin: "0 0 6px" }}>Andrew Glantz</p>
        <p style={{ fontFamily: FONT, fontSize: 15, color: INK_60, margin: 0 }}>Founder & Managing Partner</p>
      </div>
      <div>
        <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
          textTransform: "uppercase", color: INK_60, margin: "0 0 18px" }}>About</p>
        <h2 style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, letterSpacing: "-0.025em",
          lineHeight: 1.1, color: INK, margin: "0 0 20px" }}>
          Competitive capital for rights holders.
        </h2>
        <p style={{ fontFamily: FONT, fontSize: 18, color: INK_60, lineHeight: 1.6, margin: "0 0 30px" }}>
          Andrew has structured over $1B in transactions across bankruptcy, crypto, and AI copyright claims over the past decade.
        </p>
        <Btn style={{ fontSize: 16 }}>Get in Touch</Btn>
      </div>
    </div>
  );
}

function ExperienceThumb() {
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "50px 80px" }}>
      <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: INK_60, textAlign: "center", margin: "0 0 16px" }}>
        Track Record
      </p>
      <h2 style={{ fontFamily: FONT, fontSize: 48, fontWeight: 800, letterSpacing: "-0.025em",
        lineHeight: 1.1, color: INK, textAlign: "center", margin: "0 0 40px" }}>
        Proven across every major case.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        {["FTX","Mt. Gox","Celsius","BlockFi","Genesis","Voyager","Bartz","Concord","3AC","Terra"].map(name => (
          <div key={name} style={{ background: "#F4F5F7", borderRadius: 4, padding: "12px",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: INK_60 }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OurEdgeThumb() {
  const pts = [
    { h: "Practically unlimited liquidity", b: "500+ institutions on speed dial." },
    { h: "Lightning-fast settlement",        b: "Automation accelerates diligence." },
    { h: "Relationship builders",            b: "We structure the right deal for you." },
  ];
  return (
    <div style={{ width: W, height: H, background: "#F4F5F7", display: "grid",
      gridTemplateColumns: "380px 1fr", gap: 80, padding: "60px 80px", alignItems: "start" }}>
      <div>
        <Eyebrow color={INK_60}>Our Edge</Eyebrow>
        <h2 style={{ fontFamily: FONT, fontSize: 54, fontWeight: 800, letterSpacing: "-0.025em",
          lineHeight: 1.08, color: INK, margin: 0 }}>
          Built to move fast <span style={{ color: NEON }}>when it counts.</span>
        </h2>
      </div>
      <div style={{ paddingTop: 8 }}>
        {pts.map((p, i) => (
          <div key={i} style={{ marginBottom: 32, paddingLeft: 22, borderLeft: "3px solid " + NEON }}>
            <p style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 6px" }}>{p.h}</p>
            <p style={{ fontFamily: FONT, fontSize: 17, color: INK_60, margin: 0, lineHeight: 1.5 }}>{p.b}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DamagesThumb() {
  const d = [
    { v: "$150K", l: "Per infringing work" },
    { v: "6,000+", l: "Works per plaintiff" },
    { v: "$900M+", l: "Per class member" },
  ];
  return (
    <div style={{ width: W, height: H, background: "#F4F5F7", padding: "60px 80px" }}>
      <Eyebrow color={INK_60}>Potential Damages</Eyebrow>
      <h2 style={{ fontFamily: FONT, fontSize: 48, fontWeight: 800, letterSpacing: "-0.025em",
        lineHeight: 1.1, color: INK, margin: "0 0 40px" }}>
        The numbers are significant.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
        {d.map((item, i) => (
          <div key={i} style={{ background: INK, borderRadius: 4, padding: "32px 28px" }}>
            <div style={{ fontFamily: FONT, fontSize: 60, fontWeight: 800, color: NEON, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {item.v}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 16, color: "rgba(255,255,255,0.5)", marginTop: 12 }}>
              {item.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoBreakThumb() {
  return (
    <div style={{ width: W, height: H, position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ImgPlaceholder style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <h2 style={{ fontFamily: FONT, fontSize: 70, fontWeight: 800, color: "#fff",
          letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0 }}>
          Too hard? Not in
        </h2>
        <h2 style={{ fontFamily: FONT, fontSize: 70, fontWeight: 800, color: NEON,
          fontStyle: "italic", letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0 }}>
          our vocabulary.
        </h2>
      </div>
    </div>
  );
}

function MediaBannerThumb() {
  return (
    <div style={{ width: W, height: H, background: "#000", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", padding: "0 80px" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 560 }}>
        <div style={{ fontFamily: FONT, fontSize: 64, fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 16 }}>
          Headline goes here
        </div>
        <div style={{ fontFamily: FONT, fontSize: 22, color: "rgba(255,255,255,0.75)", marginBottom: 32, lineHeight: 1.5 }}>
          Optional subheading text sits below.
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <Btn>Get in Touch</Btn>
          <GhostBtn dark>Learn More</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials3ColThumb() {
  const qs = [
    { q: "Faster and fairer than any process I expected.", by: "FTX Creditor" },
    { q: "They knew the docket better than my own lawyers.", by: "BlockFi Creditor" },
    { q: "Closed in days. No back and forth.", by: "Celsius Creditor" },
  ];
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "50px 70px" }}>
      <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: INK_60, textAlign: "center", margin: "0 0 14px" }}>
        What Clients Say
      </p>
      <h2 style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, letterSpacing: "-0.025em",
        lineHeight: 1.1, color: INK, textAlign: "center", margin: "0 0 40px" }}>
        When others give up, <span style={{ color: NEON, fontStyle: "italic" }}>we dig in.</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 36 }}>
        {qs.map((t, i) => (
          <div key={i} style={{ borderTop: `2px solid ${INK}`, paddingTop: 20 }}>
            <p style={{ fontFamily: FONT, fontSize: 18, color: INK, lineHeight: 1.55, fontStyle: "italic", margin: "0 0 14px" }}>
              "{t.q}"
            </p>
            <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: INK_60, margin: 0 }}>
              — {t.by}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsSingleColThumb() {
  const qs = [
    { q: "Faster and fairer than any process I expected.", by: "FTX Creditor" },
    { q: "They knew the docket better than my own lawyers.", by: "BlockFi Creditor" },
  ];
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "50px 80px" }}>
      <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: INK_60, margin: "0 0 14px" }}>What Clients Say</p>
      <h2 style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, letterSpacing: "-0.025em",
        lineHeight: 1.1, color: INK, margin: "0 0 40px" }}>
        When others give up, <span style={{ color: NEON, fontStyle: "italic" }}>we dig in.</span>
      </h2>
      {qs.map((t, i) => (
        <div key={i} style={{ borderTop: `2px solid ${INK}`, paddingTop: 20, marginBottom: 24 }}>
          <p style={{ fontFamily: FONT, fontSize: 19, color: INK, fontStyle: "italic", lineHeight: 1.55, margin: "0 0 12px" }}>
            "{t.q}"
          </p>
          <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: INK_60, margin: 0 }}>— {t.by}</p>
        </div>
      ))}
    </div>
  );
}

function TestimonialsFeaturedThumb() {
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "50px 80px", position: "relative" }}>
      <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: INK_60, textAlign: "center", margin: "0 0 10px" }}>
        What Clients Say
      </p>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 100, lineHeight: 0.7,
          color: "rgba(0,0,0,0.07)", userSelect: "none", marginBottom: 16 }}>"</div>
        <p style={{ fontFamily: FONT, fontSize: 34, color: INK, fontStyle: "italic",
          lineHeight: 1.4, maxWidth: 640, margin: "0 auto 24px", letterSpacing: "-0.01em" }}>
          Faster and fairer than any claims process I've ever experienced.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div style={{ width: 40, height: 1, background: INK_30 }} />
          <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: INK_60, margin: 0 }}>FTX Creditor</p>
          <div style={{ width: 40, height: 1, background: INK_30 }} />
        </div>
      </div>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FAQFullWidthThumb() {
  const qs = ["What types of claims do you cover?", "How do you price a claim?", "Are you a broker or a principal buyer?", "How fast can you close?"];
  return (
    <div style={{ width: W, height: H, background: "#F4F5F7", padding: "60px 80px", borderTop: "1px solid rgba(0,0,0,0.1)" }}>
      <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, letterSpacing: "0.22em",
        textTransform: "uppercase", color: INK_60, margin: "0 0 20px" }}>FAQ</p>
      <h2 style={{ fontFamily: FONT, fontSize: 68, fontWeight: 800, letterSpacing: "-0.035em",
        lineHeight: 1.02, color: INK, margin: "0 0 40px", maxWidth: 700 }}>
        Your questions, <span style={{ color: "#1a7f37", fontStyle: "italic" }}>answered.</span>
      </h2>
      <div style={{ maxWidth: 780 }}>
        {qs.map(q => <AccRow key={q} q={q} />)}
      </div>
    </div>
  );
}

function FAQSidebarThumb() {
  const qs = ["What is a claim?", "How do you price a claim?", "How fast can you close?", "Are you a broker or principal?"];
  return (
    <div style={{ width: W, height: H, background: "#F4F5F7", display: "grid",
      gridTemplateColumns: "320px 1fr", gap: 80, padding: "60px 80px", alignItems: "start" }}>
      <div>
        <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, letterSpacing: "0.22em",
          textTransform: "uppercase", color: INK_60, margin: "0 0 18px" }}>FAQ</p>
        <h2 style={{ fontFamily: FONT, fontSize: 50, fontWeight: 800, letterSpacing: "-0.025em",
          lineHeight: 1.1, color: INK, margin: "0 0 24px" }}>
          Your questions, <span style={{ fontStyle: "italic" }}>answered.</span>
        </h2>
        <GhostBtn dark={false}>Ask a Question</GhostBtn>
      </div>
      <div style={{ paddingTop: 8 }}>
        {qs.map(q => <AccRow key={q} q={q} />)}
        <div style={{ marginTop: 28 }}>
          <span style={{ fontFamily: FONT, fontSize: 17, color: INK_60 }}>More Questions? See all FAQs →</span>
        </div>
      </div>
    </div>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTAGetQuoteThumb() {
  return (
    <div style={{ width: W, height: H, background: "#000", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
        padding: "48px 60px", textAlign: "center", width: "100%", maxWidth: 680 }}>
        <Eyebrow>Get a Quote</Eyebrow>
        <h2 style={{ fontFamily: FONT, fontSize: 60, fontWeight: 800, letterSpacing: "-0.025em",
          lineHeight: 1.1, color: "#fff", margin: "0 0 16px" }}>
          Why wait?{" "}
          <span style={{ color: NEON, fontStyle: "italic" }}>Talk to us.</span>
        </h2>
        <p style={{ fontFamily: FONT, fontSize: 19, color: "rgba(255,255,255,0.55)",
          lineHeight: 1.55, margin: "0 0 32px" }}>
          Contact us for a quote. 48-hour response. Confidentiality default.
        </p>
        <Btn>Get in Touch</Btn>
      </div>
    </div>
  );
}

function CTABottomThumb() {
  return (
    <div style={{ width: W, height: H, background: "#000", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14, padding: "48px 60px", textAlign: "center", width: "100%", maxWidth: 760 }}>
        <Eyebrow>Get in Touch</Eyebrow>
        <h2 style={{ fontFamily: FONT, fontSize: 56, fontWeight: 800, letterSpacing: "-0.025em",
          lineHeight: 1.1, color: "#fff", margin: "0 0 14px" }}>
          Hold a claim?{" "}
          <span style={{ color: NEON, fontStyle: "italic" }}>Talk to us.</span>
        </h2>
        <p style={{ fontFamily: FONT, fontSize: 18, color: "rgba(255,255,255,0.55)",
          lineHeight: 1.5, margin: "0 0 28px" }}>
          Confidentiality assured. We respond within 48 hours.
        </p>
        <Btn>Get in Touch</Btn>
      </div>
    </div>
  );
}

function CTABannerThumb() {
  return (
    <div style={{ width: W, height: H, position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ImgPlaceholder style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <h2 style={{ fontFamily: FONT, fontSize: 58, fontWeight: 800, color: "#fff",
          letterSpacing: "-0.025em", lineHeight: 1.1, margin: "0 0 28px" }}>
          Stay current on the cases we cover.
        </h2>
        <Btn>Read the briefings</Btn>
      </div>
    </div>
  );
}

// ── Marketing ─────────────────────────────────────────────────────────────────

function AudienceCardsThumb() {
  const cards = [
    { icon: "⚖️", title: "Trade Creditors",   body: "Owed money by a bankrupt company." },
    { icon: "₿",  title: "Crypto Creditors",   body: "FTX, Celsius, BlockFi and beyond." },
    { icon: "✍️", title: "Copyright Holders", body: "Authors, artists, and publishers." },
  ];
  return (
    <div style={{ width: W, height: H, background: "#F4F5F7", padding: "50px 70px" }}>
      <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: INK_60, textAlign: "center", margin: "0 0 14px" }}>Who We Help</p>
      <h2 style={{ fontFamily: FONT, fontSize: 46, fontWeight: 800, letterSpacing: "-0.025em",
        lineHeight: 1.1, color: INK, textAlign: "center", margin: "0 0 36px" }}>
        If you're owed money, we can help.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 6, padding: "28px 24px" }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>{c.icon}</div>
            <p style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 10px" }}>{c.title}</p>
            <p style={{ fontFamily: FONT, fontSize: 16, color: INK_60, margin: 0, lineHeight: 1.5 }}>{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceCardsThumb() {
  const cards = [
    { title: "Capital Solutions",   body: "Assignments, participations, advances." },
    { title: "Trading Strategies",  body: "OTC brokerage, auctions, private pools." },
    { title: "Advisory",            body: "Claim analysis and price discovery." },
  ];
  return (
    <div style={{ width: W, height: H, background: "#F4F5F7", padding: "50px 70px" }}>
      <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: INK_60, textAlign: "center", margin: "0 0 14px" }}>What We Offer</p>
      <h2 style={{ fontFamily: FONT, fontSize: 46, fontWeight: 800, letterSpacing: "-0.025em",
        lineHeight: 1.1, color: INK, textAlign: "center", margin: "0 0 36px" }}>
        Every path to liquidity, covered.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 6, padding: "28px 24px", borderLeft: `3px solid ${NEON}` }}>
            <p style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 10px" }}>{c.title}</p>
            <p style={{ fontFamily: FONT, fontSize: 16, color: INK_60, margin: 0, lineHeight: 1.5 }}>{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonThumb() {
  const rows = ["Claim types covered","Principal buyer option","Brokered process","Advisory services","No upfront fees"];
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "50px 70px" }}>
      <h2 style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, letterSpacing: "-0.025em",
        lineHeight: 1.1, color: INK, margin: "0 0 30px" }}>
        How we compare.
      </h2>
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px 140px",
          background: INK, color: "#fff", padding: "14px 24px",
          fontFamily: FONT, fontSize: 16, fontWeight: 700 }}>
          <span>Feature</span>
          <span style={{ textAlign: "center" }}>Turnpage</span>
          <span style={{ textAlign: "center" }}>Marketplace</span>
          <span style={{ textAlign: "center" }}>Principal</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px 140px",
            padding: "13px 24px", borderTop: "1px solid #E5E7EB",
            background: i % 2 === 0 ? "#FAFAFA" : "#fff",
            fontFamily: FONT, fontSize: 15, alignItems: "center" }}>
            <span style={{ color: INK_60 }}>{r}</span>
            <span style={{ textAlign: "center", color: "#1a7f37", fontWeight: 700 }}>✓</span>
            <span style={{ textAlign: "center", color: "#9CA3AF" }}>–</span>
            <span style={{ textAlign: "center", color: "#9CA3AF" }}>–</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorksThumb() {
  const steps = [
    { n: "01", title: "Submit your claim", body: "Tell us about your recovery right." },
    { n: "02", title: "Get a quote",       body: "Indicative price within 48 hours." },
    { n: "03", title: "Close & get paid",  body: "Wire in days. We handle the rest." },
  ];
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "50px 80px" }}>
      <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: INK_60, textAlign: "center", margin: "0 0 14px" }}>How It Works</p>
      <h2 style={{ fontFamily: FONT, fontSize: 46, fontWeight: 800, letterSpacing: "-0.025em",
        lineHeight: 1.1, color: INK, textAlign: "center", margin: "0 0 48px" }}>
        Three steps to liquidity.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, position: "relative" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: INK,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontFamily: FONT, fontSize: 18, fontWeight: 800,
              color: NEON }}>
              {s.n}
            </div>
            <p style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 10px" }}>{s.title}</p>
            <p style={{ fontFamily: FONT, fontSize: 16, color: INK_60, margin: 0, lineHeight: 1.5 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Image + Text ─────────────────────────────────────────────────────────────
function ImageTextSplitThumb({ imageLeft = false }) {
  const text = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
      <div style={{ width: 110, height: 10, background: "rgba(10,10,10,0.35)" }} />
      <p style={{ fontFamily: FONT, fontSize: 38, fontWeight: 800, color: INK, margin: 0, lineHeight: 1.1 }}>
        Headline goes here.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ width: "92%", height: 9, background: "rgba(10,10,10,0.18)" }} />
        <div style={{ width: "84%", height: 9, background: "rgba(10,10,10,0.18)" }} />
        <div style={{ width: "60%", height: 9, background: "rgba(10,10,10,0.18)" }} />
      </div>
    </div>
  );
  const img = (
    <div style={{ flex: 1, position: "relative", borderRadius: 10, overflow: "hidden" }}>
      <ImgPlaceholder style={{ position: "absolute", inset: 0 }} />
    </div>
  );
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "60px 70px", display: "flex", gap: 50 }}>
      {imageLeft ? img : text}
      {imageLeft ? text : img}
    </div>
  );
}
function ImageTextRightThumb() { return <ImageTextSplitThumb imageLeft={false} />; }
function ImageTextLeftThumb()  { return <ImageTextSplitThumb imageLeft={true} />; }
function ImageTextTopThumb() {
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "50px 70px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ position: "relative", height: "46%", borderRadius: 10, overflow: "hidden" }}>
        <ImgPlaceholder style={{ position: "absolute", inset: 0 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <p style={{ fontFamily: FONT, fontSize: 32, fontWeight: 800, color: INK, margin: 0 }}>Headline goes here.</p>
        <div style={{ width: "62%", height: 9, background: "rgba(10,10,10,0.18)" }} />
        <div style={{ width: "48%", height: 9, background: "rgba(10,10,10,0.18)" }} />
      </div>
    </div>
  );
}

// ─── Rich Text (Text Block) ───────────────────────────────────────────────────
const TextLine = ({ w, h = 9 }) => (
  <div style={{ width: w, height: h, background: "rgba(10,10,10,0.18)" }} />
);
function RichTextNarrowThumb() {
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "60px 230px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontFamily: FONT, fontSize: 38, fontWeight: 800, color: INK, margin: "0 0 8px" }}>Heading goes here.</p>
      <TextLine w="100%" /><TextLine w="94%" /><TextLine w="97%" /><TextLine w="62%" />
      <p style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: INK, margin: "18px 0 4px" }}>Subheading</p>
      <TextLine w="100%" /><TextLine w="88%" /><TextLine w="40%" />
    </div>
  );
}
function RichTextMediumThumb() {
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "60px 155px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontFamily: FONT, fontSize: 39, fontWeight: 800, color: INK, margin: "0 0 8px" }}>Heading goes here.</p>
      <TextLine w="100%" /><TextLine w="95%" /><TextLine w="98%" /><TextLine w="58%" />
      <p style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: INK, margin: "18px 0 4px" }}>Subheading</p>
      <TextLine w="100%" /><TextLine w="80%" /><TextLine w="45%" />
    </div>
  );
}
function RichTextWideThumb() {
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "60px 80px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, color: INK, margin: "0 0 8px" }}>Heading goes here.</p>
      <TextLine w="100%" /><TextLine w="96%" /><TextLine w="99%" /><TextLine w="93%" /><TextLine w="55%" />
      <p style={{ fontFamily: FONT, fontSize: 27, fontWeight: 800, color: INK, margin: "18px 0 4px" }}>Subheading</p>
      <TextLine w="100%" /><TextLine w="72%" />
    </div>
  );
}
function RichTextTwoColThumb() {
  const col = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 13 }}>
      <TextLine w="100%" /><TextLine w="95%" /><TextLine w="98%" /><TextLine w="91%" />
      <TextLine w="97%" /><TextLine w="60%" />
    </div>
  );
  return (
    <div style={{ width: W, height: H, background: "#fff", padding: "60px 80px", display: "flex", flexDirection: "column", gap: 26 }}>
      <p style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, color: INK, margin: 0 }}>Heading goes here.</p>
      <div style={{ display: "flex", gap: 56 }}>
        {col}{col}
      </div>
    </div>
  );
}

function ProcessFlowThumb() {
  const steps = [
    { label: "PARTNER",  lines: 3 },
    { label: "PREPARE",  lines: 4 },
    { label: "SOLICIT",  lines: 2 },
    { label: "TRANSACT", lines: 3 },
  ];
  return (
    <div style={{ width: W, height: H, background: NEON, padding: "44px 60px" }}>
      <h2 style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em",
        color: INK, margin: "0 0 40px" }}>
        How the typical sales process works
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
        {steps.map((s, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: "0.1em",
                background: "#fff", color: INK, border: `2px solid ${INK}`, borderRadius: 999,
                padding: "8px 20px", boxShadow: "0 3px 0 rgba(0,0,0,0.35)", whiteSpace: "nowrap" }}>
                {s.label}
              </span>
              {i < steps.length - 1 && <span style={{ flex: 1, height: 2, background: INK }} />}
            </div>
            <div style={{ width: "90%", height: 12, background: INK, opacity: 0.85, marginBottom: 14, borderRadius: 2 }} />
            {Array.from({ length: s.lines }).map((_, j) => (
              <div key={j} style={{ width: `${82 - j * 9}%`, height: 8, background: INK, opacity: 0.45, marginBottom: 9, borderRadius: 2 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BulletColumnsThumb() {
  const cols = [
    { heading: "Covered Assets",     lines: 6 },
    { heading: "Capital Solutions",  lines: 4 },
    { heading: "Trading Strategies", lines: 4 },
    { heading: "Advisory",           lines: 5 },
  ];
  return (
    <div style={{ width: W, height: H, background: NEON, padding: "44px 60px" }}>
      <h2 style={{ fontFamily: FONT, fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em",
        color: INK, margin: "0 0 40px" }}>
        Our services
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 34 }}>
        {cols.map((c, i) => (
          <div key={i}>
            <p style={{ fontFamily: FONT, fontSize: 21, fontWeight: 800, color: INK, margin: "0 0 16px" }}>{c.heading}</p>
            {Array.from({ length: c.lines }).map((_, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: INK, flexShrink: 0 }} />
                <div style={{ width: `${78 - (j % 3) * 12}%`, height: 8, background: INK, opacity: 0.5, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineThumb() {
  const steps = [
    { state: "here", lines: 3 },
    { state: "",     lines: 3 },
    { state: "",     lines: 2 },
    { state: "",     lines: 3 },
    { state: "",     lines: 2 },
  ];
  return (
    <div style={{ width: W, height: H, background: PAPER, padding: "40px 60px" }}>
      <div style={{ width: 90, height: 8, background: INK_30, borderRadius: 2, marginBottom: 18 }} />
      <h2 style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em",
        color: INK, margin: "0 0 44px" }}>
        Five steps to <span style={{ fontStyle: "italic", background: NEON, padding: "0 6px" }}>the payout.</span>
      </h2>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 24 }}>
        <div style={{ position: "absolute", left: 0, right: 127, top: 9, height: 3, background: "rgba(10,10,10,0.18)" }} />
        {steps.map((s, i) => (
          <div key={i} style={{ position: "relative", paddingTop: 36 }}>
            <span style={{ position: "absolute", top: 0, left: 0, width: 20, height: 20, borderRadius: "50%",
              boxSizing: "border-box",
              background: s.state === "here" ? NEON : PAPER,
              border: `3px solid ${s.state === "here" ? INK : "rgba(10,10,10,0.4)"}`,
              boxShadow: s.state === "here" ? "0 0 0 7px rgba(212,255,0,0.25)" : "none" }} />
            <div style={{ width: "70%", height: 8, background: INK, opacity: 0.5, marginBottom: 12, borderRadius: 2 }} />
            <div style={{ width: "92%", height: 11, background: INK, opacity: 0.85, marginBottom: 12, borderRadius: 2 }} />
            {Array.from({ length: s.lines }).map((_, j) => (
              <div key={j} style={{ width: `${84 - j * 10}%`, height: 7, background: INK, opacity: 0.4, marginBottom: 8, borderRadius: 2 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenarioCardsThumb() {
  const cards = [
    { figure: "2026",  dark: false },
    { figure: "2027",  dark: true },
    { figure: "2028+", dark: false },
  ];
  return (
    <div style={{ width: W, height: H, background: "#D5D9DF", padding: "44px 60px" }}>
      <div style={{ width: 90, height: 8, background: INK_30, borderRadius: 2, marginBottom: 36 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            background: c.dark ? "#0A0A0A" : "#fff", borderRadius: 14, padding: "26px 24px",
            border: `1px solid ${c.dark ? "rgba(255,255,255,0.12)" : "rgba(10,10,10,0.08)"}` }}>
            {c.dark && <div style={{ display: "inline-block", background: NEON, borderRadius: 4, padding: "4px 10px", fontFamily: FONT, fontSize: 12, fontWeight: 800, color: "#000", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>Most likely</div>}
            <div style={{ width: "45%", height: 8, background: c.dark ? "rgba(255,255,255,0.5)" : INK_30, borderRadius: 2, marginBottom: 16 }} />
            <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 900, letterSpacing: "-0.02em", color: c.dark ? NEON : INK, marginBottom: 14 }}>{c.figure}</div>
            {[0, 1, 2].map(j => (
              <div key={j} style={{ width: `${88 - j * 14}%`, height: 8, background: c.dark ? "#fff" : INK, opacity: c.dark ? 0.65 : 0.5, marginBottom: 8, borderRadius: 2 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fallback ─────────────────────────────────────────────────────────────────
function DefaultThumb() {
  return (
    <div style={{ width: W, height: H, background: "#F4F5F7", display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: FONT, fontSize: 22, color: INK_60 }}>Section preview</p>
    </div>
  );
}

// ─── Registry ─────────────────────────────────────────────────────────────────
const THUMBS = {
  "home-hero":                       HomeHeroThumb,
  "hero":                            HeroThumb,
  "stats-band":                      StatsBandThumb,
  "situations":                      SituationsThumb,
  "bio":                             BioThumb,
  "experience":                      ExperienceThumb,
  "our-edge":                        OurEdgeThumb,
  "damages":                         DamagesThumb,
  "photo-break":                     PhotoBreakThumb,
  "media-banner":                    MediaBannerThumb,
  "testimonials/layout-1-grid3col":  Testimonials3ColThumb,
  "testimonials/layout-2-singlecol": TestimonialsSingleColThumb,
  "testimonials/layout-3-featured":  TestimonialsFeaturedThumb,
  "faq/layout-1-fullwidth":          FAQFullWidthThumb,
  "faq/layout-2-sidebar":            FAQSidebarThumb,
  "cta/layout-1-getquote":           CTAGetQuoteThumb,
  "cta/layout-2-banner":             CTABannerThumb,
  "cta/layout-3-bottomcta":          CTABottomThumb,
  "bottom-cta":                      CTABottomThumb,
  "audience-cards":                  AudienceCardsThumb,
  "service-cards":                   ServiceCardsThumb,
  "comparison":                      ComparisonThumb,
  "how-it-works":                    HowItWorksThumb,
  "process-flow":                    ProcessFlowThumb,
  "timeline":                        TimelineThumb,
  "scenario-cards":                  ScenarioCardsThumb,
  "bullet-columns":                  BulletColumnsThumb,
  "image-text":                          ImageTextRightThumb,
  "image-text/layout-1-image-right":     ImageTextRightThumb,
  "image-text/layout-2-image-left":      ImageTextLeftThumb,
  "image-text/layout-3-image-top":       ImageTextTopThumb,
  "rich-text":                           RichTextNarrowThumb,
  "rich-text/layout-1-narrow":           RichTextNarrowThumb,
  "rich-text/layout-4-medium":           RichTextMediumThumb,
  "rich-text/layout-2-wide":             RichTextWideThumb,
  "rich-text/layout-3-two-col":          RichTextTwoColThumb,
};

// ─── Public component ─────────────────────────────────────────────────────────
export default function SectionThumb({ typeId, layoutId, width = 160, height = 100 }) {
  const key   = layoutId ? `${typeId}/${layoutId}` : typeId;
  const Inner = THUMBS[key] || THUMBS[typeId] || DefaultThumb;
  const scale = Math.min(width / W, height / H);

  return (
    <div style={{ width, height, overflow: "hidden", borderRadius: 4, position: "relative", flexShrink: 0 }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: W, height: H,
        transformOrigin: "top left",
        transform: `scale(${scale})`,
        pointerEvents: "none",
      }}>
        <Inner />
      </div>
    </div>
  );
}
