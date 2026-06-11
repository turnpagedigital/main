/* copy-intel.mjs — mount the briefing dashboards at /intel on the main site.
 *
 * Runs after `vite build`: copies briefing-generator/ (the consolidated
 * intel.turnpagedigital.com site) into dist/intel, excluding pipeline
 * internals, and rewrites the auth layer's root-absolute paths
 * ("/auth/…", "/login.html") to their /intel-prefixed equivalents so the
 * Supabase login gate works under the subpath.
 */

import { cp, rm, readFile, writeFile, readdir } from "node:fs/promises";
import { join, sep } from "node:path";

const SRC = "briefing-generator";
const DEST = "dist/intel";

// Pipeline internals + docs that have no business being served
const EXCLUDE = new Set([
  "scripts", "supabase", "config", "__pycache__",
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

// Rewrite root-absolute auth references for the subpath mount
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let rewritten = 0;
for await (const file of walk(DEST)) {
  if (!/\.(html|js)$/.test(file)) continue;
  const before = await readFile(file, "utf8");
  const after = before
    .replaceAll('"/auth/', '"/intel/auth/')
    .replaceAll("'/auth/", "'/intel/auth/")
    .replaceAll("`/auth/", "`/intel/auth/")
    .replaceAll('"/login.html', '"/intel/login.html')
    .replaceAll("'/login.html", "'/intel/login.html")
    .replaceAll("`/login.html", "`/intel/login.html");
  if (after !== before) {
    await writeFile(file, after);
    rewritten++;
  }
}

console.log(`intel dashboards mounted at dist/intel (${rewritten} files path-rewritten)`);
