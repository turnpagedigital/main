/* copy-intel.mjs — mount the briefing dashboards at /intel on the main site.
 *
 * Runs after `vite build`: copies briefing-generator/ (the consolidated
 * intel.turnpagedigital.com site) into dist/intel, excluding pipeline
 * internals AND the legacy Supabase auth layer (auth/, login.html) — /intel
 * is gated server-side by functions/intel/_middleware.js (admin session).
 *
 * Link repairs for the subpath mount:
 *  - Root-level files (index.html) used "../topic/…" links that worked when
 *    the site was served at a domain root (browsers clamp ".." there) but
 *    escape the mount under /intel — rewritten to "/intel/topic/…".
 *  - Dashboards link to a "../daily-briefing/…" directory that doesn't exist
 *    in this repo — those map to the /intel landing page (and its assets).
 *  - The Supabase <script src="/auth/…"> gate tags are removed from every
 *    copied HTML file; the briefing-generator/ source stays untouched so the
 *    generator pipeline keeps working as-is.
 */

import { cp, rm, readFile, writeFile, readdir } from "node:fs/promises";
import { join, sep } from "node:path";

const SRC = "briefing-generator";
const DEST = "dist/intel";

// Pipeline internals + docs + the legacy Supabase auth layer
const EXCLUDE = new Set([
  "scripts", "supabase", "config", "__pycache__",
  "auth", "login.html",
  ".gitignore", "_headers", "_redirects",
  "SKILL.md", "BRAND_STYLING.md", "DEPLOY.md", "README.md",
  "sources.md", "tickers.md", "index.canonical.html",
]);

await rm(DEST, { recursive: true, force: true });
const JUNK = /\.bak|^\d{4}-\d{2}-\d{2}$/; // local scratch: *.bak*, dated dirs
await cp(SRC, DEST, {
  recursive: true,
  filter: (src) =>
    !src.split(sep).some((part) => EXCLUDE.has(part) || JUNK.test(part)),
});

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

// Matches the Supabase gate tags whether or not earlier runs prefixed them
const AUTH_SCRIPT_RE =
  /[ \t]*<script[^>]*src="\/(?:intel\/)?(?:auth\/[^"]+|login\.html)"[^>]*>\s*<\/script>\n?/g;

let rewritten = 0;
for await (const file of walk(DEST)) {
  if (!/\.(html|js)$/.test(file)) continue;
  const isRootFile = !file.slice(DEST.length + 1).includes(sep);
  const before = await readFile(file, "utf8");
  let after = before
    .replace(AUTH_SCRIPT_RE, "")
    // Phantom daily-briefing/ dir → the /intel landing page + its assets
    .replaceAll("../daily-briefing/assets/", "/intel/assets/")
    .replaceAll("../daily-briefing/dashboard-latest.html", "/intel/")
    .replaceAll("../daily-briefing/index.html", "/intel/")
    .replaceAll("../daily-briefing/", "/intel/");
  if (isRootFile) {
    // "../topic/…" from the mount root escapes /intel — pin it back
    after = after
      .replaceAll('href="../', 'href="/intel/')
      .replaceAll('src="../', 'src="/intel/');
  }
  if (after !== before) {
    await writeFile(file, after);
    rewritten++;
  }
}

console.log(
  `intel dashboards mounted at dist/intel (${rewritten} files link-repaired, Supabase auth layer excluded)`
);
