/* ─── Design tokens ───
   Hybrid system: dark hero / footer, light body sections.
   Inspired by offdeal.io's clean light surfaces, but with TPDM's
   black + neon green brand DNA preserved everywhere it matters. */

/* Accent */
export const NEON = "#D4FF00";
export const NEON_HOVER = "#E2FF4D";
export const NEON_SOFT = "rgba(212,255,0,0.12)";   // tint on light surfaces
export const NEON_SOFT_DARK = "rgba(212,255,0,0.06)";

/* Dark surfaces (hero / footer / dark CTAs) */
export const DARK = "#000";
export const DARK_CARD = "#0A0A0A";
export const LIFT_1 = "#16161B";
export const LIFT_2 = "#1F1F25";
export const DARK_BORDER = "rgba(255,255,255,0.12)";

/* Light surfaces (body of subpages — OffDeal vibe).
   Cool slate-gray palette: neutral, modern, no beige warmth.
   These are noticeably gray (not just off-white) so the white cards on top
   lift clearly off the background. */
export const PAPER = "#E5E7EB";       // primary light background — clear cool gray
export const PAPER_2 = "#D5D9DF";     // deeper cool gray for alt sections
export const SURFACE = "#FFFFFF";     // pure white card surface
export const INK = "#0A0A0A";         // ink text on light
export const INK_60 = "rgba(10,10,10,0.6)";
export const INK_40 = "rgba(10,10,10,0.4)";
export const INK_20 = "rgba(10,10,10,0.18)";
export const LINE = "rgba(10,10,10,0.08)";       // soft borders on light
export const LINE_STRONG = "rgba(10,10,10,0.14)";

/* Text on dark */
export const TEXT = "#FFFFFF";
export const MUTED = "rgba(255,255,255,0.6)";
export const MUTED_2 = "rgba(255,255,255,0.4)";

/* Status colors (audit findings — consolidating scattered hardcodes) */
export const ERROR = "#c44";
export const ERROR_BG = "#fce8e8";
export const ERROR_TEXT = "#7a1a1a";
export const WARNING = "#7a5c00";
export const WARNING_BG = "#fdf6e3";
export const SUCCESS = "#05a173";
export const SUCCESS_BG = "#dafef4";
export const SECONDARY_BG = "#F4F5F7";

/* Corner radii — box/card components. Edit via /admin/css → Colors & Tokens.
   CARD = the standard Card styles (white/black/glass/…); GLASS = LiquidGlassCard. */
export const RADIUS_CARD = "clamp(0.2rem, 1.2vw, 0.3125rem)";
export const RADIUS_CARD_SQUARE = "0.2rem";
export const RADIUS_GLASS = ".05rem";
export const RADIUS_GLASS_SQUARE = "1px";

/* Typography */
export const FONT = "'Archivo', sans-serif";

export const FONT_SIZES = {
  caption: "0.72rem",    // hints, secondary text
  label: "0.78rem",      // field labels
  body: "0.85rem",       // body text
  bodyMedium: "0.9rem",  // larger body
  heading: "1.2rem",     // h2/h3
};

export const SPACING = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
};
