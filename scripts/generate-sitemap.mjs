/* generate-sitemap.mjs — write dist/sitemap.xml after the Vite build.
 *
 * Sources:
 *  - src/data/routes.json      → static public routes (skips /admin*, dynamic
 *                                ":slug" patterns, and legal boilerplate gets
 *                                lower priority)
 *  - public/briefings/index.json → every ACTIVE briefing as
 *                                /briefings/<slug> with lastmod from its date
 *
 * The daily briefing pipeline commits to the repo → Cloudflare rebuilds →
 * the sitemap stays current with zero manual steps. public/robots.txt points
 * crawlers here.
 */

import { readFile, writeFile } from "node:fs/promises";

const ORIGIN = "https://turnpagedigital.com";
const OUT = "dist/sitemap.xml";

const routes = JSON.parse(await readFile("src/data/routes.json", "utf8")).routes;
const briefings = JSON.parse(await readFile("public/briefings/index.json", "utf8")).items;

const urls = [];

for (const route of routes) {
  const path = route.path;
  if (path.startsWith("/admin")) continue; // never index the admin panel
  if (route.dynamic || path.includes(":")) continue; // expanded separately
  const isLegal = path === "/privacy" || path === "/terms";
  urls.push({
    loc: `${ORIGIN}${path}`,
    priority: path === "/" ? "1.0" : isLegal ? "0.3" : "0.8",
    changefreq: path === "/briefings" ? "daily" : "weekly",
  });
}

let newestBriefing = null;
for (const item of briefings) {
  if (item.active === false) continue; // drafts stay out of the index
  urls.push({
    loc: `${ORIGIN}/briefings/${item.slug}`,
    lastmod: item.date,
    priority: "0.7",
    changefreq: "monthly",
  });
  if (!newestBriefing || item.date > newestBriefing) newestBriefing = item.date;
}

// The /briefings list page changes whenever a briefing publishes
const listEntry = urls.find((u) => u.loc === `${ORIGIN}/briefings`);
if (listEntry && newestBriefing) listEntry.lastmod = newestBriefing;

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map((u) =>
      [
        "  <url>",
        `    <loc>${u.loc}</loc>`,
        u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
        `    <changefreq>${u.changefreq}</changefreq>`,
        `    <priority>${u.priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n") +
  `\n</urlset>\n`;

await writeFile(OUT, xml);
console.log(`sitemap: ${urls.length} URLs → ${OUT}`);
