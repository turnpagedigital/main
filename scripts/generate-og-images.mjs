/* Build-time Open Graph image generator.
 *
 * Renders a 1200x630 PNG per page into public/og/<slug>.png.
 * Uses sharp's SVG renderer — fonts are generic sans-serif (Helvetica/Arial
 * fallback) so this works on any build environment without bundling font files.
 *
 * Run as: `node scripts/generate-og-images.mjs`
 * (hooked into npm run build via package.json)
 */

import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "og");

/* Brand tokens (mirrored from src/data/tokens.js) */
const NEON = "#D4FF00";
const BG   = "#000000";
const TEXT = "#FFFFFF";
const MUTED = "#9CA3AF"; // medium grey

/* Page registry — titles/subtitles are tuned to each page's actual hero copy
 * (see src/pages/*.jsx). Keep concise: OG previews truncate around 60-90 chars
 * for title and 150-200 chars for description. */
const PAGES = [
  {
    slug: "home",
    title: "Strategic guidance. Turn-key liquidity.",
    subtitle: "Capital and advisory for rights holders — across AI copyright class actions, crypto bankruptcies, and complex litigation. Over $1B in claims liquidated.",
  },
  {
    slug: "crypto",
    title: "Liquidity for locked digital assets.",
    subtitle: "FTX. Celsius. BlockFi. Voyager. Genesis. Mt. Gox. We quote in fiat and close fast.",
  },
  {
    slug: "ai-copyright",
    title: "Calling all creators. Claim what's yours.",
    subtitle: "Bartz. The OpenAI MDL. Concord. Getty. We buy copyright claims and advise on strategy.",
  },
  {
    slug: "press",
    title: "Press & Publications.",
    subtitle: "Coverage, briefings, and commentary from the Turnpage desk.",
  },
  {
    slug: "briefings",
    title: "Briefings. Articles. Updates.",
    subtitle: "Analysis, deep dives, and market updates from the Turnpage desk.",
  },
  {
    slug: "contact",
    title: "Tell us about your claim.",
    subtitle: "48-hour response. Confidentiality default. Every inquiry read by a partner.",
  },
  {
    slug: "legal",
    title: "Legal.",
    subtitle: "Privacy policy, terms of use, and disclosures for Turnpage Digital Markets.",
  },
  {
    slug: "litigation-finance",
    title: "Power the cases that deserve to win.",
    subtitle: "Capital for the best contingency law firms — so merit drives the docket, not client cashflow.",
  },
];

/* XML/HTML escape for safe injection into SVG text nodes and attributes. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* Wrap a string into N visual lines by breaking on spaces.
 * `maxChars` is a rough character budget per line (chosen for the font/size). */
function wrap(text, maxChars, maxLines) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? current + " " + w : w;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = w;
      if (lines.length === maxLines - 1) {
        // Last allowed line — dump remaining words into it; truncate with ellipsis if needed.
        const rest = words.slice(words.indexOf(w)).join(" ");
        if (rest.length > maxChars) {
          lines.push(rest.slice(0, maxChars - 1).trimEnd() + "…");
        } else {
          lines.push(rest);
        }
        return lines;
      }
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* Build the SVG. 1200x630 — the standard OG/Twitter large-image aspect. */
function buildSvg({ title, subtitle }) {
  const W = 1200;
  const H = 630;
  const accentBarW = 8;
  const padL = 88; // left padding (after the accent bar)
  const padR = 88;
  const headerY = 110;

  // Title: ~22 chars per line at ~80px, max 3 lines.
  const titleLines = wrap(title, 26, 3);
  // Subtitle: ~58 chars per line at ~28px, max 3 lines.
  const subLines = wrap(subtitle, 60, 3);

  const titleStartY = 260;
  const titleLineH = 92;
  const titleBlockH = titleLines.length * titleLineH;

  const subStartY = titleStartY + titleBlockH + 30;
  const subLineH = 40;

  const titleTspans = titleLines
    .map((l, i) => `<tspan x="${padL}" dy="${i === 0 ? 0 : titleLineH}">${esc(l)}</tspan>`)
    .join("");

  const subTspans = subLines
    .map((l, i) => `<tspan x="${padL}" dy="${i === 0 ? 0 : subLineH}">${esc(l)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Solid black background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Subtle radial glow from top-left to give the slab depth -->
  <defs>
    <radialGradient id="glow" cx="0" cy="0" r="0.9">
      <stop offset="0%" stop-color="${NEON}" stop-opacity="0.10"/>
      <stop offset="60%" stop-color="${NEON}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Left neon accent bar -->
  <rect x="0" y="0" width="${accentBarW}" height="${H}" fill="${NEON}"/>

  <!-- Brand wordmark (header) -->
  <text
    x="${padL}" y="${headerY}"
    font-family="Helvetica, Arial, sans-serif"
    font-size="22" font-weight="700"
    letter-spacing="6"
    fill="${TEXT}">
    TURNPAGE DIGITAL MARKETS
  </text>

  <!-- Thin separator under wordmark -->
  <rect x="${padL}" y="${headerY + 18}" width="120" height="2" fill="${NEON}"/>

  <!-- Title -->
  <text
    x="${padL}" y="${titleStartY}"
    font-family="Helvetica, Arial, sans-serif"
    font-size="80" font-weight="900"
    letter-spacing="-2"
    fill="${TEXT}">
    ${titleTspans}
  </text>

  <!-- Subtitle -->
  <text
    x="${padL}" y="${subStartY}"
    font-family="Helvetica, Arial, sans-serif"
    font-size="28" font-weight="400"
    fill="${MUTED}">
    ${subTspans}
  </text>

  <!-- Bottom-right URL -->
  <text
    x="${W - padR}" y="${H - 50}"
    text-anchor="end"
    font-family="Helvetica, Arial, sans-serif"
    font-size="20" font-weight="600"
    letter-spacing="2"
    fill="${MUTED}">
    turnpagedigital.com
  </text>
</svg>`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`[og] writing to ${OUT_DIR}`);

  for (const page of PAGES) {
    const svg = buildSvg(page);
    const outPath = path.join(OUT_DIR, `${page.slug}.png`);
    const buf = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();
    await fs.writeFile(outPath, buf);
    const kb = (buf.length / 1024).toFixed(1);
    console.log(`[og] ${page.slug.padEnd(20)} ${kb.padStart(7)} kB  ${page.title}`);
  }

  console.log(`[og] generated ${PAGES.length} images`);
}

main().catch((err) => {
  console.error("[og] generation failed:", err);
  process.exit(1);
});
