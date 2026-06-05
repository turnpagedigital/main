import React from "react";

/* SectionThumb — CSS wireframe thumbnail for a section type + optional layout.
   160 × 100 px. Each sketch communicates structure, not content.

   Color palette (wireframe standard):
     BG_LIGHT  #F8F9FA  — section background (light)
     BG_DARK   #111827  — section background (dark)
     BG_PHOTO  #C8CDD5  — image/video placeholder fill
     TITLE     #1F2937  — heavy text / large type
     TEXT      #9CA3AF  — body text lines
     DIVIDER   #E5E7EB  — borders, dividers
     CARD      #FFFFFF  — card / elevated surface
     BTN       #D4FF00  — CTA button
     WHITE     rgba(255,255,255,0.85)   — text on dark
     WHITE_DIM rgba(255,255,255,0.35)   — secondary text on dark */

const W = 160;
const H = 100;

const S = { position: "absolute" };

// Primitives
const R = (x, y, w, h, bg, r = 0, extra = {}) =>
  <div key={`${x}${y}${w}${h}`} style={{ ...S, left: x, top: y, width: w, height: h, background: bg, borderRadius: r, ...extra }} />;

const Line   = (x, y, w, c = "#9CA3AF")          => R(x, y, w, 2,  c,  1);
const Title  = (x, y, w, c = "#1F2937")           => R(x, y, w, 4,  c,  1);
const Block  = (x, y, w, h, c = "#D1D5DB", r = 0) => R(x, y, w, h, c, r);
const Btn    = (x, y, w = 36, c = "#D4FF00")       => R(x, y, w, 8,  c,  3);
const Card   = (x, y, w, h, border = "#E5E7EB")    => (
  <div style={{ ...S, left: x, top: y, width: w, height: h, background: "#fff", border: `1px solid ${border}`, borderRadius: 3 }} />
);

// Shared wrappers
const LightWrap = ({ children }) => (
  <div style={{ ...S, inset: 0, background: "#F8F9FA" }}>{children}</div>
);
const DarkWrap = ({ children }) => (
  <div style={{ ...S, inset: 0, background: "#111827" }}>{children}</div>
);
const PhotoWrap = ({ children }) => (
  <div style={{ ...S, inset: 0, background: "linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)" }}>
    <div style={{ ...S, inset: 0, background: "rgba(0,0,0,0.3)" }} />
    {children}
  </div>
);

// ── Accordion row (FAQ / Situations) ────────────────────────────────────────
const AccRow = (y, w = 80) => (
  <React.Fragment key={y}>
    {R(0, y, w, 1, "#E5E7EB")}
    {R(3, y + 4, w - 18, 2, "#9CA3AF", 1)}
    {R(w - 10, y + 3, 6, 4, "#9CA3AF", 1)}
  </React.Fragment>
);

// ── Wireframe library ────────────────────────────────────────────────────────
const THUMBS = {

  /* ── Hero ──────────────────────────────────────────────────────────────── */
  "home-hero": () => (
    <PhotoWrap>
      {R(0, 0, W, H, "transparent")}
      {/* nav hint */}
      {R(10, 8, 30, 2, "rgba(255,255,255,0.3)", 1)}
      {R(50, 8, 16, 2, "rgba(255,255,255,0.3)", 1)}
      {R(72, 8, 16, 2, "rgba(255,255,255,0.3)", 1)}
      {/* big title */}
      {R(10, 40, 90, 6, "rgba(255,255,255,0.9)", 1)}
      {R(10, 51, 70, 6, "rgba(255,255,255,0.9)", 1)}
      {/* subtitle */}
      {R(10, 63, 80, 2, "rgba(255,255,255,0.45)", 1)}
      {R(10, 68, 60, 2, "rgba(255,255,255,0.45)", 1)}
      {/* CTAs */}
      {Btn(10, 78, 40, "#D4FF00")}
      {R(56, 78, 34, 8, "rgba(255,255,255,0.18)", 3)}
    </PhotoWrap>
  ),

  "hero": () => (
    <DarkWrap>
      {/* eyebrow */}
      {R(10, 18, 28, 2, "rgba(212,255,0,0.7)", 1)}
      {/* title */}
      {R(10, 26, 80, 5, "rgba(255,255,255,0.9)", 1)}
      {R(10, 36, 60, 5, "rgba(255,255,255,0.9)", 1)}
      {/* subtitle */}
      {R(10, 47, 100, 2, "rgba(255,255,255,0.35)", 1)}
      {R(10, 52, 85,  2, "rgba(255,255,255,0.35)", 1)}
      {/* CTAs */}
      {Btn(10, 64, 38, "#D4FF00")}
      {R(54, 64, 30, 8, "rgba(255,255,255,0.2)", 3)}
    </DarkWrap>
  ),

  /* ── Content ────────────────────────────────────────────────────────────── */
  "stats-band": () => (
    <DarkWrap>
      {[0, 1, 2].map(i => {
        const x = 10 + i * 48;
        return (
          <React.Fragment key={i}>
            {R(x, 22, 34, 10, "rgba(255,255,255,0.85)", 1)}
            {R(x + 4, 38, 24, 2, "rgba(255,255,255,0.35)", 1)}
            {i < 2 && R(x + 40, 20, 1, 28, "rgba(255,255,255,0.12)")}
          </React.Fragment>
        );
      })}
      {R(10, 58, 110, 1, "rgba(255,255,255,0.1)")}
      {R(30, 65, 60, 2, "rgba(255,255,255,0.2)", 1)}
    </DarkWrap>
  ),

  "situations": () => (
    <LightWrap>
      {/* left: title */}
      {Title(8, 18, 42)}
      {R(8, 26, 32, 2, "#9CA3AF", 1)}
      {R(8, 31, 36, 2, "#9CA3AF", 1)}
      {R(8, 36, 26, 2, "#9CA3AF", 1)}
      {/* right: accordion */}
      {[18, 32, 46, 60, 74].map(y => (
        <React.Fragment key={y}>
          {R(60, y, 88, 1, "#E5E7EB")}
          {R(62, y + 4, 72, 2, "#9CA3AF", 1)}
          {R(142, y + 3, 5, 4, "#9CA3AF", 1)}
        </React.Fragment>
      ))}
    </LightWrap>
  ),

  "bio": () => (
    <LightWrap>
      {/* avatar */}
      {Block(10, 15, 36, 36, "#D1D5DB", 4)}
      {R(20, 56, 16, 2, "#9CA3AF", 1)}
      {/* text side */}
      {Title(58, 15, 50)}
      {R(58, 24, 40, 2, "#9CA3AF", 1)}
      {R(58, 30, 80, 2, "#9CA3AF", 1)}
      {R(58, 35, 75, 2, "#9CA3AF", 1)}
      {R(58, 40, 70, 2, "#9CA3AF", 1)}
      {R(58, 45, 65, 2, "#9CA3AF", 1)}
      {Btn(58, 56, 36)}
    </LightWrap>
  ),

  "experience": () => (
    <LightWrap>
      {Title(40, 10, 60)}
      {R(48, 18, 44, 2, "#9CA3AF", 1)}
      {/* logo grid 3×2 */}
      {[0, 1, 2].map(col =>
        [0, 1].map(row => (
          Block(12 + col * 46, 30 + row * 24, 38, 16, "#E5E7EB", 3)
        ))
      )}
    </LightWrap>
  ),

  "our-edge": () => (
    <LightWrap>
      {/* left col: title */}
      {Title(8, 20, 50)}
      {R(8, 29, 42, 3, "#1F2937", 1)}
      {R(8, 37, 35, 2, "#9CA3AF", 1)}
      {R(8, 42, 50, 2, "#9CA3AF", 1)}
      {/* right col: bullet points */}
      {[22, 42, 62].map(y => (
        <React.Fragment key={y}>
          {R(80, y, 4, 4, "#D4FF00", 2)}
          {Title(88, y, 40)}
          {R(88, y + 8, 56, 2, "#9CA3AF", 1)}
          {R(88, y + 13, 48, 2, "#9CA3AF", 1)}
        </React.Fragment>
      ))}
    </LightWrap>
  ),

  "damages": () => (
    <LightWrap>
      {Title(18, 10, 60)}
      {R(22, 18, 44, 2, "#9CA3AF", 1)}
      {[0, 1, 2].map(i => {
        const x = 8 + i * 50;
        return (
          <React.Fragment key={i}>
            {R(x, 28, 42, 12, "#1F2937", 2)}
            {R(x + 4, 44, 32, 2, "#9CA3AF", 1)}
          </React.Fragment>
        );
      })}
    </LightWrap>
  ),

  "photo-break": () => (
    <PhotoWrap>
      {R(22, 32, 80, 6, "rgba(255,255,255,0.9)", 1)}
      {R(34, 43, 56, 3, "rgba(255,255,255,0.5)", 1)}
      {R(46, 50, 32, 2, "rgba(255,255,255,0.35)", 1)}
    </PhotoWrap>
  ),

  /* ── Testimonials ─────────────────────────────────────────────────────── */
  "testimonials/layout-1-grid3col": () => (
    <LightWrap>
      {Title(44, 8, 50)}
      {R(54, 15, 30, 2, "#9CA3AF", 1)}
      {[0, 1, 2].map(i => {
        const x = 6 + i * 52;
        return (
          <React.Fragment key={i}>
            {R(x, 26, 44, 2, "#1F2937")}
            {R(x, 33, 44, 2, "#9CA3AF", 1)}
            {R(x, 38, 36, 2, "#9CA3AF", 1)}
            {R(x, 43, 40, 2, "#9CA3AF", 1)}
            {R(x, 50, 26, 2, "#C0C8D4", 1)}
          </React.Fragment>
        );
      })}
    </LightWrap>
  ),

  "testimonials/layout-2-singlecol": () => (
    <LightWrap>
      {Title(10, 8, 50)}
      {R(10, 16, 36, 2, "#9CA3AF", 1)}
      {[28, 54, 78].map(y => (
        <React.Fragment key={y}>
          {R(10, y, 108, 2, "#1F2937")}
          {R(10, y + 6, 108, 2, "#9CA3AF", 1)}
          {R(10, y + 11, 80, 2, "#9CA3AF", 1)}
        </React.Fragment>
      ))}
    </LightWrap>
  ),

  "testimonials/layout-3-featured": () => (
    <LightWrap>
      {/* large quote mark */}
      <div style={{ ...S, left: 50, top: 6, fontFamily: "Georgia, serif", fontSize: 32, lineHeight: 1, color: "rgba(0,0,0,0.1)", userSelect: "none" }}>"</div>
      {R(16, 36, 110, 4, "#1F2937", 1)}
      {R(22, 45, 96, 3, "#1F2937", 1)}
      {R(28, 53, 82, 3, "#9CA3AF", 1)}
      {/* attribution */}
      {R(36, 64, 28, 1, "#D1D5DB")}
      {R(72, 64, 28, 1, "#D1D5DB")}
      {R(50, 62, 36, 2, "#C0C8D4", 1)}
      {/* secondary */}
      {R(8,  80, 44, 1, "#E5E7EB")}
      {R(60, 80, 44, 1, "#E5E7EB")}
      {R(8,  84, 44, 2, "#9CA3AF", 1)}
      {R(60, 84, 44, 2, "#9CA3AF", 1)}
    </LightWrap>
  ),

  /* ── FAQ ──────────────────────────────────────────────────────────────── */
  "faq/layout-1-fullwidth": () => (
    <LightWrap>
      {R(8, 12, 24, 2, "#9CA3AF", 1)}
      {R(8, 20, 90, 6, "#1F2937", 1)}
      {R(8, 30, 70, 4, "#1F2937", 1)}
      {/* accordion rows */}
      {[42, 56, 70, 84].map(y => (
        <React.Fragment key={y}>
          {R(8, y, 132, 1, "#E5E7EB")}
          {R(8, y + 4, 100, 2, "#9CA3AF", 1)}
          {R(138, y + 3, 6, 4, "#9CA3AF", 1)}
        </React.Fragment>
      ))}
    </LightWrap>
  ),

  "faq/layout-2-sidebar": () => (
    <LightWrap>
      {/* left: title block */}
      {R(8, 18, 18, 2, "#9CA3AF", 1)}
      {R(8, 24, 42, 5, "#1F2937", 1)}
      {R(8, 33, 36, 4, "#1F2937", 1)}
      {Btn(8, 44, 28)}
      {/* right: accordion */}
      {[14, 30, 46, 62, 78].map(y => (
        <React.Fragment key={y}>
          {R(62, y, 88, 1, "#E5E7EB")}
          {R(62, y + 4, 72, 2, "#9CA3AF", 1)}
          {R(144, y + 3, 6, 4, "#9CA3AF", 1)}
        </React.Fragment>
      ))}
    </LightWrap>
  ),

  /* ── CTA ─────────────────────────────────────────────────────────────── */
  "cta/layout-1-getquote": () => (
    <DarkWrap>
      {/* rounded card */}
      <div style={{ ...S, left: 12, top: 8, right: 12, bottom: 8, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5 }} />
      {R(42, 18, 54, 2, "rgba(212,255,0,0.7)", 1)}
      {R(30, 26, 78, 5, "rgba(255,255,255,0.9)", 1)}
      {R(36, 36, 66, 4, "rgba(255,255,255,0.9)", 1)}
      {R(38, 46, 62, 2, "rgba(255,255,255,0.35)", 1)}
      {R(44, 51, 50, 2, "rgba(255,255,255,0.35)", 1)}
      {Btn(54, 62, 30, "#D4FF00")}
    </DarkWrap>
  ),

  "cta/layout-2-banner": () => (
    <PhotoWrap>
      {R(28, 28, 82, 5, "rgba(255,255,255,0.9)", 1)}
      {R(36, 38, 66, 3, "rgba(255,255,255,0.6)", 1)}
      {Btn(54, 52, 30)}
    </PhotoWrap>
  ),

  /* ── Marketing ───────────────────────────────────────────────────────── */
  "audience-cards": () => (
    <LightWrap>
      {Title(36, 8, 66)}
      {R(44, 16, 50, 2, "#9CA3AF", 1)}
      {[0, 1, 2].map(i => {
        const x = 6 + i * 50;
        return (
          <React.Fragment key={i}>
            {Block(x, 26, 44, 60, "#FFFFFF", 3)}
            {Block(x + 14, 31, 16, 16, "#E5E7EB", 8)}
            {R(x + 6, 52, 32, 3, "#1F2937", 1)}
            {R(x + 8, 59, 28, 2, "#9CA3AF", 1)}
            {R(x + 10, 64, 24, 2, "#9CA3AF", 1)}
            {R(x + 6, 72, 18, 2, "#D4FF00", 1)}
          </React.Fragment>
        );
      })}
    </LightWrap>
  ),

  "service-cards": () => (
    <LightWrap>
      {Title(36, 8, 66)}
      {R(44, 16, 50, 2, "#9CA3AF", 1)}
      {[0, 1, 2].map(i => {
        const x = 6 + i * 50;
        return (
          <React.Fragment key={i}>
            {Block(x, 26, 44, 60, "#FFFFFF", 3)}
            {/* icon left-aligned */}
            {Block(x + 4, 31, 12, 12, "#E5E7EB", 2)}
            {R(x + 20, 32, 20, 3, "#1F2937", 1)}
            {R(x + 4, 49, 36, 2, "#9CA3AF", 1)}
            {R(x + 4, 54, 30, 2, "#9CA3AF", 1)}
            {R(x + 4, 59, 34, 2, "#9CA3AF", 1)}
          </React.Fragment>
        );
      })}
    </LightWrap>
  ),

  "comparison": () => (
    <LightWrap>
      {Title(10, 8, 60)}
      {/* header row */}
      {R(10, 20, 130, 10, "#1F2937", 2)}
      {R(55, 22, 28, 6, "rgba(255,255,255,0.8)", 1)}
      {R(90, 22, 28, 6, "rgba(255,255,255,0.8)", 1)}
      {R(120, 22, 20, 6, "rgba(255,255,255,0.8)", 1)}
      {/* rows */}
      {[35, 50, 65, 80].map(y => (
        <React.Fragment key={y}>
          {R(10, y, 130, 1, "#E5E7EB")}
          {R(12, y + 4, 38, 2, "#9CA3AF", 1)}
          {/* check marks */}
          {R(63, y + 3, 8, 4, "#1F2937", 2)}
          {R(98, y + 3, 8, 4, "#1F2937", 2)}
          {R(126, y + 3, 4, 4, "#D1D5DB", 2)}
        </React.Fragment>
      ))}
    </LightWrap>
  ),

  "how-it-works": () => (
    <LightWrap>
      {Title(40, 8, 60)}
      {R(50, 16, 40, 2, "#9CA3AF", 1)}
      {[0, 1, 2].map(i => {
        const x = 8 + i * 50;
        return (
          <React.Fragment key={i}>
            {/* number circle */}
            <div style={{ ...S, left: x + 12, top: 28, width: 18, height: 18, borderRadius: "50%", background: "#1F2937", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 6, height: 6, background: "#D4FF00", borderRadius: 1 }} />
            </div>
            {R(x + 4, 50, 32, 3, "#1F2937", 1)}
            {R(x + 6, 57, 28, 2, "#9CA3AF", 1)}
            {R(x + 8, 62, 24, 2, "#9CA3AF", 1)}
            {/* connector */}
            {i < 2 && R(x + 44, 36, 14, 1, "#E5E7EB")}
          </React.Fragment>
        );
      })}
    </LightWrap>
  ),

};

// Fallback for unrecognized types
const DefaultThumb = () => (
  <LightWrap>
    {R(20, 38, 100, 4,  "#D1D5DB", 1)}
    {R(30, 47, 80,  3,  "#D1D5DB", 1)}
    {R(40, 55, 60,  3,  "#D1D5DB", 1)}
  </LightWrap>
);

/* ── Public component ────────────────────────────────────────────────────── */
export default function SectionThumb({ typeId, layoutId, width = W, height = H }) {
  const key   = layoutId ? `${typeId}/${layoutId}` : typeId;
  const Inner = THUMBS[key] || THUMBS[typeId] || DefaultThumb;

  const scaleX = width  / W;
  const scaleY = height / H;
  const scale  = Math.min(scaleX, scaleY);

  return (
    <div style={{
      width, height, overflow: "hidden", borderRadius: 4,
      position: "relative", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute",
        width: W, height: H,
        transformOrigin: "top left",
        transform: `scale(${scale})`,
      }}>
        <Inner />
      </div>
    </div>
  );
}
