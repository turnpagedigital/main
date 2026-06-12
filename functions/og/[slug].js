/* Dynamic Open Graph image generator.
 *
 * Cloudflare Pages Function — routes /og/:slug to this handler.
 * Renders a 1200x630 PNG on-demand using workers-og (Satori + resvg-wasm).
 *
 * Supported slugs: home, crypto, ai-copyright, litigation-finance.
 * Any other slug 302-redirects to /og/home so we never serve a broken preview.
 *
 * Images are cached forever (immutable) by Cloudflare's edge and downstream
 * crawlers (LinkedIn, X, Slack). To invalidate, bump a `?v=` query param in
 * functions/_middleware.js or change the slug.
 */

import { ImageResponse, loadGoogleFont } from "workers-og";
import briefingsIndex from "../../public/briefings/index.json";
import { isActiveBriefing, clampText } from "../_meta.js";

const NEON = "#D4FF00";
const BG = "#000000";
const TEXT = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.65)";

/* Page registry — titles/subtitles mirror the actual hero copy on each page
 * (see src/pages/*.jsx and src/data/translations.js). Keep concise: OG previews
 * truncate around 60-90 chars for title and 150-200 chars for description. */
const PAGES = {
  home: {
    title: "Strategic guidance. Turn-key liquidity.",
    subtitle:
      "Capital and advisory for rights holders — across AI copyright class actions, crypto bankruptcies, and complex litigation. Over $1B liquidated.",
  },
  crypto: {
    title: "Liquidity for locked digital assets.",
    subtitle:
      "FTX. Celsius. BlockFi. Voyager. Genesis. Mt. Gox. We quote in fiat and close fast.",
  },
  "ai-copyright": {
    title: "Calling all creators. Claim what's yours.",
    subtitle:
      "Bartz. The OpenAI MDL. Concord. Getty. We buy copyright claims and advise on strategy.",
  },
  "litigation-finance": {
    title: "Power the cases that deserve to win.",
    subtitle:
      "Capital for the best contingency law firms — so merit drives the docket, not client cashflow.",
  },
};

/* HTML escape — workers-og parses our template as HTML, so we need to escape
 * characters that would break the surrounding tag structure (`<`, `>`, `&`).
 * Do NOT escape apostrophes or quotes — Satori does not decode HTML entities
 * in text content, so &#39; would render literally as "&#39;" in the image.
 * Content is hardcoded in this file so there is no XSS risk from text. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Build the HTML template that workers-og (Satori) will rasterize.
 * IMPORTANT: every element needs `display: flex` set explicitly when it has
 * more than one child — Satori is strict about CSS layout. Inline styles only;
 * no class selectors. */
function buildHtml({ title, subtitle }) {
  return `
    <div style="
      display: flex;
      flex-direction: column;
      width: 1200px;
      height: 630px;
      background: ${BG};
      position: relative;
      font-family: 'Archivo', sans-serif;
      color: ${TEXT};
      padding: 88px 88px 64px 96px;
      box-sizing: border-box;
    ">
      <div style="
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 8px;
        background: ${NEON};
        display: flex;
      "></div>

      <div style="display: flex; flex-direction: column; align-items: flex-start;">
        <div style="
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 6px;
          color: ${TEXT};
          display: flex;
        ">TURNPAGE DIGITAL MARKETS</div>
        <div style="
          width: 120px;
          height: 3px;
          background: ${NEON};
          margin-top: 14px;
          display: flex;
        "></div>
      </div>

      <div style="
        display: flex;
        flex-direction: column;
        margin-top: 96px;
        max-width: 1000px;
      ">
        <div style="
          font-size: 80px;
          font-weight: 900;
          line-height: 1.02;
          letter-spacing: -2px;
          color: ${TEXT};
          display: flex;
        ">${esc(title)}</div>
        <div style="
          font-size: 28px;
          font-weight: 400;
          line-height: 1.4;
          color: ${MUTED};
          margin-top: 32px;
          display: flex;
        ">${esc(subtitle)}</div>
      </div>

      <div style="
        position: absolute;
        right: 88px;
        bottom: 56px;
        font-size: 22px;
        font-weight: 600;
        color: ${MUTED};
        display: flex;
      ">turnpagedigital.com</div>
    </div>
  `;
}

/* Briefing OG variant — same brand chassis, briefing title + date + topic tag.
 * Long headlines get a smaller font so they fit the 1200x630 canvas. */
function buildBriefingHtml(item) {
  const title = clampText(item.title, 120);
  const fontSize = title.length > 70 ? 54 : title.length > 45 ? 64 : 76;
  const dateLabel = formatBriefingDate(item.date);
  const tag = Array.isArray(item.tags) && item.tags.length ? item.tags[0] : "";

  return `
    <div style="
      display: flex;
      flex-direction: column;
      width: 1200px;
      height: 630px;
      background: ${BG};
      position: relative;
      font-family: 'Archivo', sans-serif;
      color: ${TEXT};
      padding: 80px 88px 64px 96px;
      box-sizing: border-box;
    ">
      <div style="
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 8px;
        background: ${NEON};
        display: flex;
      "></div>

      <div style="display: flex; flex-direction: column; align-items: flex-start;">
        <div style="
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 6px;
          color: ${TEXT};
          display: flex;
        ">TURNPAGE DIGITAL MARKETS</div>
        <div style="
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 4px;
          color: ${NEON};
          margin-top: 12px;
          display: flex;
        ">INTELLIGENCE BRIEFING</div>
      </div>

      <div style="
        display: flex;
        flex-direction: column;
        margin-top: 72px;
        max-width: 1010px;
      ">
        <div style="
          font-size: ${fontSize}px;
          font-weight: 900;
          line-height: 1.06;
          letter-spacing: -1.5px;
          color: ${TEXT};
          display: flex;
        ">${esc(title)}</div>
        <div style="
          display: flex;
          flex-direction: row;
          align-items: center;
          margin-top: 36px;
        ">
          <div style="
            background: ${NEON};
            color: ${BG};
            font-size: 22px;
            font-weight: 700;
            padding: 8px 18px;
            display: flex;
          ">${esc(dateLabel)}</div>
          ${tag ? `<div style="
            border: 2px solid rgba(255,255,255,0.35);
            color: ${MUTED};
            font-size: 22px;
            font-weight: 600;
            padding: 6px 18px;
            margin-left: 16px;
            display: flex;
          ">${esc(tag)}</div>` : ""}
        </div>
      </div>

      <div style="
        position: absolute;
        right: 88px;
        bottom: 56px;
        font-size: 22px;
        font-weight: 600;
        color: ${MUTED};
        display: flex;
      ">turnpagedigital.com/briefings</div>
    </div>
  `;
}

function formatBriefingDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[parseInt(m[2], 10) - 1]} ${parseInt(m[3], 10)}, ${m[1]}`;
}

export const onRequest = async (context) => {
  /* Briefing slugs are case-sensitive (date-prefixed); marketing slugs are
   * lowercased as before. */
  const rawSlug = String(context.params.slug || "");
  const slug = rawSlug.toLowerCase();

  let html;
  if (rawSlug.startsWith("briefing--")) {
    const briefingSlug = rawSlug.slice("briefing--".length);
    const item = briefingsIndex.items.find((b) => b.slug === briefingSlug);
    if (!isActiveBriefing(item)) {
      const url = new URL(context.request.url);
      return Response.redirect(`${url.origin}/og/home`, 302);
    }
    html = buildBriefingHtml(item);
  } else if (PAGES[slug]) {
    html = buildHtml(PAGES[slug]);
  } else {
    // Unknown slug → redirect to the home OG so we never serve a broken preview.
    const url = new URL(context.request.url);
    return Response.redirect(`${url.origin}/og/home`, 302);
  }

  // Load Archivo from Google Fonts. If it fails (rare — Cloudflare egress is
  // reliable, but be safe), fall back to Satori's default sans-serif so we
  // still emit a usable image instead of a 500.
  let fonts;
  try {
    const [regular, bold, black] = await Promise.all([
      loadGoogleFont({ family: "Archivo", weight: 400 }),
      loadGoogleFont({ family: "Archivo", weight: 700 }),
      loadGoogleFont({ family: "Archivo", weight: 900 }),
    ]);
    fonts = [
      { name: "Archivo", data: regular, weight: 400, style: "normal" },
      { name: "Archivo", data: bold, weight: 700, style: "normal" },
      { name: "Archivo", data: black, weight: 900, style: "normal" },
    ];
  } catch (err) {
    // Swallow and let workers-og pick a default. The OG image will still
    // render with the same layout, just in a generic sans-serif.
    fonts = undefined;
  }

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
    format: "png",
    ...(fonts ? { fonts } : {}),
    headers: {
      "Content-Type": "image/png",
      // Cache aggressively at the edge and in downstream crawlers.
      // To invalidate, bump a ?v= query param in functions/_middleware.js.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
