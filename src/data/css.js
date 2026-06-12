import { NEON, FONT, PAPER, PAPER_2, SURFACE, INK, INK_60, INK_40, LINE, LINE_STRONG } from "./tokens.js";

/* Global CSS string injected once at app boot. */
export const GLOBAL_CSS = `
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
html { height:100%; scroll-behavior:smooth; }
body { font-family: ${FONT}; background:#000; color:#fff; min-height:100%; -webkit-font-smoothing:antialiased; }
::selection { background: rgba(212,255,0,0.3); }
a { color: inherit; text-decoration: none; }
input:focus, textarea:focus, select:focus { outline:none; }
button { font-family: inherit; }

/* ─── Keyboard focus indicators (public site) ───
   :focus-visible only fires for keyboard navigation, so mouse users see no
   change. Neon ring on dark surfaces; ink ring on light "paper" surfaces. */
input:focus-visible, textarea:focus-visible, select:focus-visible,
button:focus-visible, a:focus-visible {
  outline: 2px solid ${NEON};
  outline-offset: 2px;
}
.surface-paper input:focus-visible, .surface-paper textarea:focus-visible,
.surface-paper select:focus-visible, .surface-paper button:focus-visible,
.surface-paper a:focus-visible,
.surface-paper-2 input:focus-visible, .surface-paper-2 textarea:focus-visible,
.surface-paper-2 select:focus-visible, .surface-paper-2 button:focus-visible,
.surface-paper-2 a:focus-visible {
  outline-color: ${INK};
}

/* Skip-to-content link: visually hidden until keyboard-focused. */
.skip-link {
  position: absolute; left: -9999px; top: 0; z-index: 10000;
  background: ${NEON}; color: #000; font-family: ${FONT};
  font-weight: 800; font-size: 0.85rem; letter-spacing: 0.06em;
  padding: 0.85rem 1.4rem; text-decoration: none;
}
.skip-link:focus { left: 0; }

/* ─── Reduced motion ───
   Mirrors the LiquidGlassCard pattern site-wide: collapse all ambient
   animation (hero mesh drift, sweeps, tickers, reveals, card flips) for
   users who ask for less motion. */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { to { opacity:1; } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@keyframes slideDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
@keyframes ticker { from { transform:translateX(0); } to { transform:translateX(-50%); } }

/* Slow gradient-mesh drift for the home hero. Three radial glows reposition
   over 30s, creating a subtle ambient "living surface" feel. */
@keyframes heroMeshDrift {
  0%   { background-position:   0%   0%, 100% 100%, 50% 50%; }
  25%  { background-position:  60%  20%,  20%  80%, 70% 30%; }
  50%  { background-position:  20%  60%,  80%  10%, 30% 70%; }
  75%  { background-position:  80%  40%,  40%  60%, 60% 20%; }
  100% { background-position:   0%   0%, 100% 100%, 50% 50%; }
}

/* Vertical drift for the ticker overlay — slow upward bleed of case names. */
@keyframes heroTicker {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}

/* Diagonal sweep — a slow neon-tinted spotlight passes across the hero every 18s. */
@keyframes heroSweep {
  0%   { transform: translate(-30%, -30%) rotate(20deg); opacity: 0; }
  20%  { opacity: 0.35; }
  50%  { transform: translate(40%, 30%) rotate(20deg); opacity: 0.35; }
  80%  { opacity: 0; }
  100% { transform: translate(80%, 60%) rotate(20deg); opacity: 0; }
}

.hero-mesh {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    radial-gradient(45% 55% at 25% 30%, rgba(212,255,0,0.10), transparent 65%),
    radial-gradient(50% 60% at 75% 65%, rgba(70,110,180,0.18), transparent 65%),
    radial-gradient(40% 50% at 50% 50%, rgba(40,40,55,0.30), transparent 60%);
  background-repeat: no-repeat;
  background-size: 220% 220%, 220% 220%, 220% 220%;
  animation: heroMeshDrift 30s ease-in-out infinite;
}

.hero-sweep {
  position: absolute; top: 0; left: 0;
  width: 80%; height: 200%; pointer-events: none;
  background: linear-gradient(
    100deg,
    transparent 30%,
    rgba(212,255,0,0.04) 45%,
    rgba(212,255,0,0.10) 50%,
    rgba(212,255,0,0.04) 55%,
    transparent 70%
  );
  animation: heroSweep 18s ease-in-out infinite;
  mix-blend-mode: screen;
}

.hero-ticker {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  opacity: 0.10; mask-image: linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent);
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent);
}
.hero-ticker-track {
  display: flex; flex-direction: column; gap: 0.4em;
  animation: heroTicker 70s linear infinite;
  font-family: ${FONT}; font-weight: 800;
  font-size: clamp(2rem, 4vw, 3.5rem);
  letter-spacing: -0.02em; line-height: 1.05;
  color: #fff;
  white-space: nowrap;
  padding-left: clamp(1.5rem, 5vw, 4rem);
}


/* ─── Utility classes ─── */
.reveal-hidden { opacity:0; transform:translateY(20px); }
.reveal-visible { opacity:1; transform:translateY(0); transition: opacity 0.8s ease, transform 0.8s ease; }

.section-pad { padding: clamp(3rem,7vw,6rem) clamp(1.5rem,5vw,4rem); }
.section-pad-tight { padding: clamp(2rem,5vw,4rem) clamp(1.5rem,5vw,4rem); }
.container-narrow { max-width: 760px; margin: 0 auto; }
.container { max-width: 1180px; margin: 0 auto; }
.container-wide { max-width: 1320px; margin: 0 auto; }

/* ─── Light surface utilities ─── */
.surface-paper { background: ${PAPER}; color: ${INK}; }
.surface-paper-2 { background: ${PAPER_2}; color: ${INK}; }
.surface-white { background: ${SURFACE}; color: ${INK}; }
.surface-dark { background: #000; color: #fff; }
.surface-dark-lift { background: #16161B; color: #fff; }

/* Eyebrow tag (uppercase tiny label above headlines).
   Default eyebrow is INK black — high contrast on cream paper.
   Includes a small neon bar before the text for brand presence.
   For dark surfaces, use the .eyebrow-neon variant. */
.eyebrow {
  font-family: ${FONT};
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: ${INK};
}
.eyebrow-neon {
  font-family: ${FONT};
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: ${NEON};
}
.eyebrow-ink {
  font-family: ${FONT};
  font-size: 0.74rem; font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: ${INK};
  background: ${NEON};
  display: inline-block; padding: 0.32rem 0.7rem; border-radius: 4px;
}

/* Highlighter accent — for italic accent phrases on LIGHT surfaces.
   Black text with a neon-yellow highlighter bar across the lower portion.
   Brand pops while contrast stays excellent. */
.accent-light {
  color: ${INK};
  font-style: italic;
  font-weight: 800;
  background-image: linear-gradient(180deg, transparent 58%, ${NEON} 58%, ${NEON} 94%, transparent 94%);
  padding: 0 0.12em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

/* Section headings */
.h-section {
  font-family: ${FONT}; font-weight: 800;
  font-size: clamp(1.7rem, 3.4vw, 2.6rem);
  line-height: 1.15; letter-spacing: -0.02em;
  color: ${INK};
}
.h-section-dark { color: #fff; }

/* ─── Buttons — rectangular, Polestar-style ─── */
.btn-neon {
  display: inline-flex; align-items: center; gap: 0.6em;
  font-family: ${FONT}; font-weight: 700;
  font-size: clamp(0.85rem,1.2vw,0.95rem); color: #000; background: ${NEON};
  text-decoration: none; letter-spacing: 0.02em;
  padding: 0.95em 1.6em; border-radius: 0; border: none; cursor: pointer;
  transition: background 0.2s, transform 0.2s, gap 0.2s;
}
.btn-neon:hover { background: #E2FF4D; gap: 0.85em; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 0.6em;
  font-family: ${FONT}; font-weight: 600;
  font-size: clamp(0.85rem,1.2vw,0.95rem); color: #fff;
  background: transparent; border: 1px solid rgba(255,255,255,0.5);
  text-decoration: none; letter-spacing: 0.02em;
  padding: calc(0.95em - 1px) calc(1.6em - 1px); border-radius: 0; cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s, gap 0.2s;
}
.btn-ghost:hover { background: rgba(255,255,255,0.08); border-color: #fff; color: #fff; gap: 0.85em; }

/* Light ghost button (on cream / paper surfaces) */
.btn-ghost-ink {
  display: inline-flex; align-items: center; gap: 0.6em;
  font-family: ${FONT}; font-weight: 600;
  font-size: clamp(0.85rem,1.2vw,0.95rem); color: ${INK};
  background: transparent; border: 1px solid ${INK};
  text-decoration: none; letter-spacing: 0.02em;
  padding: calc(0.95em - 1px) calc(1.6em - 1px); border-radius: 0; cursor: pointer;
  transition: background 0.2s, color 0.2s, gap 0.2s;
}
.btn-ghost-ink:hover { background: ${INK}; color: #fff; gap: 0.85em; }

/* Inline arrow link */
.link-arrow {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-family: ${FONT}; font-weight: 700; font-size: 0.92rem;
  color: ${INK}; letter-spacing: 0.02em;
  transition: gap 0.25s, color 0.25s;
}
.link-arrow:hover { gap: 0.7rem; }
.link-arrow-neon { color: ${NEON}; }
.link-arrow-neon:hover { color: ${NEON}; }

/* ─── Layout ─── */
/* Polestar-style split section header — title/eyebrow column on the left,
   body paragraph column on the right. Collapses to a single column on
   narrow viewports. */
.section-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: clamp(2rem, 5vw, 5rem);
}
@media (max-width: 880px) {
  .section-split { grid-template-columns: 1fr !important; gap: 1.2rem !important; }
}

.grid-3col { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(1rem,2vw,1.5rem); }
.grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1rem,2vw,1.5rem); }
.grid-4col { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(1rem,2vw,1.5rem); }

/* ─── Stat strip (light) — glassmorphism ───
   Frosted glass over the cool gray paper background.
   Single rounded container with subtle internal dividers between cells. */
.stat-strip {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 0;
  background: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 18px; overflow: hidden;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 10px 36px rgba(10, 10, 10, 0.06);
}
.stat-strip > div {
  padding: 1.5rem 1.5rem; background: transparent; text-align: left;
  border-right: 1px solid rgba(10, 10, 10, 0.07);
}
.stat-strip > div:last-child { border-right: none; }
@media (max-width: 980px) {
  .stat-strip > div { border-right: none; border-bottom: 1px solid rgba(10,10,10,0.07); }
  .stat-strip > div:nth-last-child(-n+2) { border-bottom: none; }
}
@media (max-width: 600px) {
  .stat-strip > div { border-bottom: 1px solid rgba(10,10,10,0.07); }
  .stat-strip > div:last-child { border-bottom: none; }
}
.stat-strip .stat-value {
  font-family: ${FONT}; font-weight: 900;
  font-size: clamp(1.6rem, 3vw, 2.4rem); line-height: 1;
  letter-spacing: -0.02em; color: ${INK}; margin-bottom: 0.45rem;
}
.stat-strip .stat-label {
  font-family: ${FONT}; font-size: 0.82rem; line-height: 1.45;
  color: ${INK_60};
}

/* Stat strip (dark variant — used on hero/dark sections).
   Independent glass boxes with gaps between them — frosted, translucent,
   slight inner highlight, soft drop shadow. Auto-fits to item count. */
.stat-strip-dark {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: clamp(0.6rem, 1.2vw, 1rem);
  background: transparent; border: none; border-radius: 0; overflow: visible;
}
.stat-strip-dark > div {
  padding: 1.5rem 1.5rem;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.20);
  border-radius: 16px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 10px 32px rgba(0, 0, 0, 0.22);
  text-align: left;
}
.stat-strip-dark .stat-value {
  font-family: ${FONT}; font-weight: 900;
  font-size: clamp(1.6rem, 3vw, 2.4rem); line-height: 1;
  letter-spacing: -0.02em; color: ${NEON}; margin-bottom: 0.45rem;
}
.stat-strip-dark .stat-label {
  font-family: ${FONT}; font-size: 0.82rem; line-height: 1.45;
  color: rgba(255, 255, 255, 0.78);
}

/* ─── Card on light surface ─── */
.card-light {
  background: ${SURFACE};
  border: 1px solid ${LINE};
  border-radius: 14px;
  padding: 1.8rem 1.7rem;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}
.card-light:hover {
  border-color: ${INK};
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(10,10,10,0.06);
}
.card-light-link { display: block; cursor: pointer; }

/* ─── FAQ accordion — Polestar-style: thin lines, simple + / − ─── */
.faq-item { border-top: 1px solid ${LINE}; }
.faq-item:last-child { border-bottom: 1px solid ${LINE}; }
.faq-toggle {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding: 1.7rem 0; background: transparent; border: 0; cursor: pointer;
  text-align: left;
  font-family: ${FONT}; font-size: clamp(1.05rem, 1.5vw, 1.2rem); font-weight: 500;
  color: ${INK}; letter-spacing: -0.005em;
  transition: opacity 0.2s;
}
.faq-toggle:hover { opacity: 0.55; }
.faq-icon {
  width: 24px; height: 24px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  color: ${INK}; font-weight: 400; font-size: 1.6rem; line-height: 1;
}
.faq-body {
  max-height: 0; overflow: hidden;
  transition: max-height 0.35s ease, padding 0.35s ease, opacity 0.35s ease;
  opacity: 0; padding: 0 0;
}
.faq-item.open .faq-body {
  max-height: 800px; opacity: 1; padding: 0 0 1.4rem;
}
.faq-body p {
  font-family: ${FONT}; font-size: 1rem; line-height: 1.65;
  color: ${INK_60}; max-width: 760px;
}
.faq-body p + p { margin-top: 0.8rem; }

/* ─── Announcement banner — quiet light-gray strip above the white nav.
   Polestar-style restraint: thin, low-contrast, with a tiny neon dot for
   "Latest" instead of a heavy pill. ─── */
.ann-banner {
  background: #F4F5F7; color: ${INK_60};
  border-bottom: 1px solid rgba(10,10,10,0.05);
}
.ann-banner-inner {
  max-width: 1440px; margin: 0 auto;
  padding: 0.5rem clamp(1.25rem,3vw,2.5rem);
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  font-family: ${FONT}; font-size: 0.78rem; font-weight: 500;
  color: ${INK_60};
}
.ann-banner-content {
  grid-column: 2;
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  flex-wrap: wrap;
}
.ann-banner-region {
  grid-column: 3; justify-self: end;
  display: flex; align-items: center;
}
.ann-banner-pill {
  display: inline-flex; align-items: center; gap: 0.4em;
  font-family: ${FONT};
  font-size: 0.66rem; font-weight: 700; letter-spacing: 0.16em;
  text-transform: uppercase; color: ${INK}; flex-shrink: 0;
}
.ann-banner-pill::before {
  content: ""; display: inline-block;
  width: 0.5em; height: 0.5em; border-radius: 50%; background: ${NEON};
}
.ann-banner a {
  color: ${INK}; font-weight: 600;
  text-decoration: underline; text-decoration-color: rgba(10,10,10,0.2);
  text-underline-offset: 3px; text-decoration-thickness: 1px;
  transition: text-decoration-color 0.2s;
}
.ann-banner a:hover { text-decoration-color: ${INK}; }

/* ─── Deal card flip — used in the Relevant Experience grid on Home + Crypto.
   Front face shows the headline + meta. Back face shows a longer summary,
   revealed on hover (desktop) or tap (touch). Sharp 90° corners to match
   the rest of the dark-section styling. */
.deal-card-flip {
  position: relative;
  perspective: 1400px;
  background: #0A0B0E;
  outline: none;
}
.deal-card-flip:focus-visible {
  box-shadow: inset 0 0 0 2px ${NEON};
}
.deal-card-inner {
  position: relative;
  width: 100%;
  min-height: 100%;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  transform-style: preserve-3d;
}
.deal-card-face {
  position: relative;
  width: 100%;
  padding: clamp(1.4rem, 2.5vw, 2rem);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  flex-direction: column;
}
.deal-card-back {
  position: absolute;
  inset: 0;
  transform: rotateY(180deg);
  background: ${NEON};
}
.deal-card-flip.is-flipped .deal-card-inner {
  transform: rotateY(180deg);
}
@media (hover: hover) {
  .deal-card-flip.has-summary:hover .deal-card-inner {
    transform: rotateY(180deg);
  }
}

/* ─── Case study modal ───────────────────────────────────────────────────── */
.cs-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.cs-modal-panel {
  position: relative;
  background: #fff;
  width: min(680px, 100%);
  max-height: 82vh;
  overflow-y: auto;
  padding: clamp(1.75rem, 4vw, 3rem);
}
.cs-modal-close {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;
  transition: opacity 0.15s;
}
.cs-modal-close:hover { opacity: 1; }

/* ─── Chips ─── */
.chip-row {
  display: flex; flex-wrap: wrap; gap: 0.55rem 0.7rem;
  justify-content: center;
}
.chip {
  font-family: ${FONT}; font-size: 0.82rem; font-weight: 600;
  color: ${INK}; background: transparent;
  border: 1px solid ${LINE_STRONG};
  padding: 0.45rem 0.95rem; border-radius: 50px;
  white-space: nowrap;
  transition: border-color 0.25s, background 0.25s;
}
.chip:hover { border-color: ${INK}; background: ${SURFACE}; }
.chip-dark {
  font-family: ${FONT}; font-size: 0.82rem; font-weight: 600;
  color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.18);
  padding: 0.45rem 0.95rem; border-radius: 50px;
  white-space: nowrap;
}

/* ─── Comparison block (Old way / TPDM way) ─── */
.compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1rem, 2vw, 1.5rem); }
.compare-card {
  background: ${SURFACE}; border: 1px solid ${LINE};
  border-radius: 14px; padding: 1.9rem 1.7rem;
}
.compare-card.tpdm {
  background: #0A0A0A; color: #fff; border-color: rgba(255,255,255,0.12);
  position: relative; overflow: hidden;
}
.compare-card.tpdm::after {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(120% 70% at 0% 0%, rgba(212,255,0,0.10), transparent 50%);
  pointer-events: none;
}
.compare-title {
  font-family: ${FONT}; font-weight: 800; font-size: 1.3rem;
  letter-spacing: -0.01em; margin-bottom: 1.3rem;
  display: flex; align-items: center; gap: 0.6rem;
}
.compare-title .tag {
  font-size: 0.66rem; font-weight: 800; letter-spacing: 0.18em;
  text-transform: uppercase; padding: 0.22rem 0.55rem; border-radius: 4px;
}
.compare-card.tpdm .compare-title .tag { background: ${NEON}; color: #000; }
.compare-card:not(.tpdm) .compare-title .tag { background: ${INK}; color: #fff; }
.compare-list { list-style: none; padding: 0; margin: 0; position: relative; z-index: 1; }
.compare-list li {
  font-family: ${FONT}; font-size: 0.95rem; line-height: 1.55;
  padding: 0.75rem 0 0.75rem 1.7rem;
  position: relative;
  border-top: 1px solid ${LINE};
}
.compare-card.tpdm .compare-list li {
  border-top-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85);
}
.compare-list li:first-child { border-top: 0; }
.compare-list li::before {
  content: ""; position: absolute; left: 0; top: 1.1rem;
  width: 8px; height: 8px; border-radius: 50%;
}
.compare-card:not(.tpdm) .compare-list li::before { background: ${INK_40}; }
.compare-card.tpdm .compare-list li::before { background: ${NEON}; box-shadow: 0 0 12px rgba(212,255,0,0.5); }

/* ─── Bottom CTA panel ─── */
.bottom-cta {
  background: #0A0A0A; color: #fff;
  border-radius: 24px; padding: clamp(2.5rem,5vw,4rem);
  position: relative; overflow: hidden; text-align: center;
}
.bottom-cta::before {
  content: ""; position: absolute; inset: 0;
  background:
    radial-gradient(60% 80% at 50% -20%, rgba(212,255,0,0.18), transparent 60%),
    radial-gradient(80% 60% at 100% 100%, rgba(212,255,0,0.08), transparent 60%);
  pointer-events: none;
}
.bottom-cta > * { position: relative; z-index: 2; }

/* ─── Briefing markdown styling (light surface) ─── */
.briefing-body { color: ${INK}; font-size: 1.05rem; line-height: 1.7; }
.briefing-body h1 { font-size: clamp(1.7rem,3vw,2.4rem); font-weight: 800; color: ${INK}; margin: 0 0 1rem; line-height: 1.15; letter-spacing: -0.02em; }
.briefing-body h2 { font-size: clamp(1.25rem,2.2vw,1.6rem); font-weight: 800; color: ${INK}; margin: 2.2rem 0 0.8rem; letter-spacing: -0.01em; }
.briefing-body h3 { font-size: 1.1rem; font-weight: 700; color: ${INK}; margin: 1.5rem 0 0.6rem; }
.briefing-body p { margin: 0 0 1.1rem; color: ${INK_60}; }
.briefing-body strong { color: ${INK}; font-weight: 700; }
.briefing-body em { color: ${INK_60}; font-style: italic; }
.briefing-body a { color: ${INK}; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: ${NEON}; text-decoration-thickness: 2px; }
.briefing-body a:hover { background: ${NEON}; color: ${INK}; text-decoration: none; padding: 0 2px; }
.briefing-body ul, .briefing-body ol { margin: 0 0 1.1rem 1.5rem; padding-left: 0.5rem; color: ${INK_60}; }
.briefing-body li { margin-bottom: 0.4rem; }
.briefing-body blockquote { border-left: 3px solid ${NEON}; padding: 0.2rem 0 0.2rem 1.2rem; margin: 1.2rem 0; color: ${INK_60}; font-style: italic; }
.briefing-body code { font-family: ui-monospace, "SF Mono", Menlo, monospace; background: ${LINE}; color: ${INK}; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.92em; }
.briefing-body hr { border: none; border-top: 1px solid ${LINE}; margin: 2rem 0; }

/* ─── Article-body overrides (long-form editorial) ─── */
/* Applied alongside .briefing-body for type="article" posts */
.article-body { font-size: 1.08rem; line-height: 1.75; }
.article-body p { color: ${INK}; margin-bottom: 1.35rem; }
.article-body h2 { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid ${LINE}; }
.article-body h3 { margin-top: 2rem; }
.article-body blockquote {
  border-left: 4px solid ${NEON};
  background: rgba(212,255,0,0.06);
  padding: 1rem 1.4rem;
  margin: 2rem 0;
  border-radius: 0 6px 6px 0;
}
.article-body blockquote p { color: ${INK}; font-style: normal; font-size: 1.05rem; font-weight: 600; margin: 0; }

/* ─── Form fields (light surface) ─── */
.field-light input,
.field-light textarea,
.field-light select {
  width: 100%;
  background: ${SURFACE};
  border: 1px solid ${LINE_STRONG};
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-family: ${FONT}; font-size: 0.98rem;
  color: ${INK};
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
}
.field-light input:focus,
.field-light textarea:focus,
.field-light select:focus {
  border-color: ${INK};
  background: #FFFEF5;
  box-shadow: 0 0 0 4px rgba(212,255,0,0.18);
}
.field-light label {
  display: block;
  font-family: ${FONT}; font-size: 0.74rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: ${INK}; margin-bottom: 0.4rem;
}
.field-light textarea { resize: vertical; min-height: 120px; }

/* ─── Admin panel accessibility & focus indicators ─── */
/* Ensure keyboard users can see which form field is focused in the admin panel.
   Targets inputs/textareas/selects that have inline outline:none styling. */
.tpdm-admin input:focus-visible,
.tpdm-admin textarea:focus-visible,
.tpdm-admin select:focus-visible {
  outline: 2px solid ${NEON} !important;
  outline-offset: 2px !important;
}

/* Icon buttons in admin (move, delete, etc.) need focus indicators too */
.tpdm-admin button:focus-visible {
  outline: 2px solid ${NEON} !important;
  outline-offset: 2px !important;
}

/* ─── Responsive ─── */
@media (max-width: 980px) {
  .grid-4col { grid-template-columns: repeat(2, 1fr); }
  .stat-strip { grid-template-columns: repeat(2, 1fr); }
  /* .stat-strip-dark uses auto-fit so it adapts on its own */
}
@media (max-width: 768px) {
  .grid-3col { grid-template-columns: 1fr; }
  .grid-2col { grid-template-columns: 1fr; }
  .compare-grid { grid-template-columns: 1fr; }
  .form-row-2col { grid-template-columns: 1fr !important; }
  .form-row-3col { grid-template-columns: 1fr !important; }
  .nav-desktop { display: none !important; }
  .nav-mobile-toggle { display: flex !important; }
  .hero-title-xl { font-size: clamp(1.9rem, 7vw, 2.8rem) !important; }
  .hero-sub-xl { font-size: 1.05rem !important; }
  .hide-on-mobile { display: none !important; }
  .ann-banner-inner { font-size: 0.74rem; grid-template-columns: 1fr; }
  .ann-banner-content { grid-column: 1; }
  .ann-banner-region { display: none; }
}
@media (min-width: 769px) {
  .nav-desktop { display: flex !important; }
  .nav-mobile-toggle { display: none !important; }
  .nav-mobile-menu { display: none !important; }
}
`;
