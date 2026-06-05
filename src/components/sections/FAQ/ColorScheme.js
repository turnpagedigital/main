import { INK, INK_60, LINE } from "../../../data/tokens.js";

/* Color scheme definitions for FAQ layouts.
   Each scheme defines background, text, eyebrow, and border colors. */
export const FAQ_COLOR_SCHEMES = {
  light: {
    background: "#E5E7EB",
    text: INK,
    eyebrow: INK_60,
    border: LINE,
    label: "Light Background",
  },
  "light-gray": {
    background: "#F3F4F6",
    text: INK,
    eyebrow: INK_60,
    border: LINE,
    label: "Light Gray Background",
  },
  "light-card": {
    background: "#FFFFFF",
    text: INK,
    eyebrow: INK_60,
    border: "rgba(10,10,10,0.08)",
    label: "Light Card",
  },
};

export default FAQ_COLOR_SCHEMES;
