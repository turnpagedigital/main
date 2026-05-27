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

/* HTML escape — workers-og parses our template as HTML, so untrusted strings
 * (in practice, our own copy, but be defensive) need escaping. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export const onRequest = async (context) => {
  const slug = String(context.params.slug || "").toLowerCase();

  // Unknown slug → redirect to the home OG so we never serve a broken preview.
  if (!PAGES[slug]) {
    const url = new URL(context.request.url);
    return Response.redirect(`${url.origin}/og/home`, 302);
  }

  const page = PAGES[slug];
  const html = buildHtml(page);

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
