import { INK, INK_60, LINE, NEON } from "../../data/tokens.js";

/* Global color scheme registry for section templates.
   All layouts use these schemes; per-section variants reference subsets. */

export const GLOBAL_COLOR_SCHEMES = {
  // Light background (primary)
  light: {
    name: "light",
    label: "Light Background",
    background: "#E5E7EB",
    text: INK,
    textSecondary: INK_60,
    accent: NEON,
    border: LINE,
    borderStrong: "rgba(10,10,10,0.14)",
  },

  // Light gray background
  "light-gray": {
    name: "light-gray",
    label: "Light Gray Background",
    background: "#F3F4F6",
    text: INK,
    textSecondary: INK_60,
    accent: NEON,
    border: LINE,
    borderStrong: "rgba(10,10,10,0.14)",
  },

  // Light card (white on light)
  "light-card": {
    name: "light-card",
    label: "Light Card",
    background: "#FFFFFF",
    text: INK,
    textSecondary: INK_60,
    accent: NEON,
    border: "rgba(10,10,10,0.08)",
    borderStrong: "rgba(10,10,10,0.14)",
  },

  // Dark background
  dark: {
    name: "dark",
    label: "Dark Background",
    background: "#000",
    text: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.6)",
    accent: NEON,
    border: "rgba(255,255,255,0.12)",
    borderStrong: "rgba(255,255,255,0.2)",
  },

  // Photo background (overlay with text)
  photo: {
    name: "photo",
    label: "Photo Background",
    background: "image", // Image URL provided per section
    text: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.8)",
    accent: NEON,
    border: "transparent",
    overlay: "rgba(0,0,0,0.3)", // Dark overlay for readability on photo
  },
};

/* Section-specific color scheme support.
   Maps section type to allowed schemes. */
export const SECTION_COLOR_SUPPORT = {
  faq: ["light", "light-gray", "light-card"],
  testimonials: ["light", "light-gray", "light-card"],
  cta: ["dark", "light", "photo"],
};

export default GLOBAL_COLOR_SCHEMES;
