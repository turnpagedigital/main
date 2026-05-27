#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────────────────
 * migrate-asset-library.mjs
 *
 * One-shot migration that populates `src/data/file-library.json` with EVERY
 * asset the site uses, and pulls base64-encoded images out of bio.json into
 * real binary files under `public/library/bio/`.
 *
 * Idempotent — running it a second time will not duplicate entries. New
 * library entries are matched by `url`; existing ones are left untouched.
 *
 * What gets indexed:
 *   1. Existing file-library.json entries (preserved as-is)
 *   2. bio.json `media_logos[].url` base64 strings (decoded → /library/bio/…)
 *   3. Everything in public/ except:
 *        - public/library/**  (already managed by the admin uploader)
 *        - .DS_Store, .gitkeep, _redirects, _headers
 *        - briefings/*.md     (text content, not media)
 *   4. deals.json `logos[]` URLs (companies = [deal.who] merged across deals)
 *   5. press.json `logo_url` (companies = [publication_title]) and
 *      `media_url` (type: image)
 *   6. alerts.json — has no image fields today, but the script checks anyway
 *
 * Run with:   node scripts/migrate-asset-library.mjs
 * Pure local file manipulation — no network, no GitHub API.
 * ──────────────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const PUBLIC    = join(ROOT, "public");
const DATA      = join(ROOT, "src", "data");
const BIO_DIR   = join(PUBLIC, "library", "bio");

const FILE_LIBRARY_PATH = join(DATA, "file-library.json");
const BIO_PATH          = join(DATA, "bio.json");
const DEALS_PATH        = join(DATA, "deals.json");
const PRESS_PATH        = join(DATA, "press.json");
const ALERTS_PATH       = join(DATA, "alerts.json");

const MEDIA_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".avif",
  ".mp4", ".webm", ".mov",
  ".pdf",
]);

const NOW = new Date().toISOString();

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

/* Slugify a name into a URL-safe filename stem. Matches functions/api/admin/file-upload.js. */
function slugify(name) {
  return (name || "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "asset";
}

/* Friendly title from a filename / path segment. Strips ext, replaces
 * separators with spaces, preserves wording with light capitalisation. */
function friendlyName(input) {
  const base = basename(input).replace(/\.[^.]+$/, "");
  // Normalise underscores/hyphens to spaces but keep existing spaces
  return base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || base;
}

function inferType(filename) {
  const lower = filename.toLowerCase();
  const ext   = extname(lower);
  if (ext === ".pdf") return "document";
  if ([".mp4", ".webm", ".mov"].includes(ext)) return "video";
  if (lower.includes("favicon") || ext === ".ico") return "favicon";
  if (lower.includes("logo")) return "logo";
  return "image";
}

function newId() {
  return `mig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* Walk a directory recursively, returning absolute file paths. Skips any
 * subtree whose path matches one of the `skipDirs` regexes. */
function walk(dir, skipDirs = []) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === ".DS_Store" || entry === ".gitkeep") continue;
    const full = join(dir, entry);
    const st   = statSync(full);
    if (st.isDirectory()) {
      if (skipDirs.some(re => re.test(full))) continue;
      out.push(...walk(full, skipDirs));
    } else if (st.isFile()) {
      out.push(full);
    }
  }
  return out;
}

/* Add or merge a single entry into the library index keyed by URL. */
function upsert(libByUrl, entry) {
  const key = entry.url;
  if (!key) return;
  const existing = libByUrl.get(key);
  if (!existing) {
    libByUrl.set(key, { ...entry });
    return;
  }
  // Merge companies (dedupe case-insensitively, preserve first-seen casing)
  const seen = new Map();
  for (const c of [...(existing.companies || []), ...(entry.companies || [])]) {
    if (typeof c === "string" && c.trim()) {
      const k = c.trim().toLowerCase();
      if (!seen.has(k)) seen.set(k, c.trim());
    }
  }
  existing.companies = [...seen.values()];
  // Prefer a non-empty / longer name from new entries only if existing name was placeholder
  if ((!existing.name || existing.name === "Untitled") && entry.name) {
    existing.name = entry.name;
  }
  // type: prefer "logo" over "image" if a logo-context discovered it
  if (existing.type === "image" && entry.type === "logo") {
    existing.type = "logo";
  }
}

/* ── Step 1: load existing library ───────────────────────────────────────── */

const library = readJson(FILE_LIBRARY_PATH);
const existingFiles = Array.isArray(library.files) ? library.files : [];
const libByUrl = new Map();

// Seed with existing entries so they survive untouched (unless we discover
// more companies for the same URL later, in which case we merge).
for (const f of existingFiles) {
  if (f && typeof f.url === "string" && f.url) {
    libByUrl.set(f.url, { ...f });
  }
}

const beforeCount = libByUrl.size;
console.log(`[migrate] Loaded ${beforeCount} existing library entries.`);

/* ── Step 2: extract bio.json base64 → /library/bio/<slug>.<ext> ─────────── */

const bio = readJson(BIO_PATH);
let bioExtractedCount = 0;

mkdirSync(BIO_DIR, { recursive: true });

function dataUrlToBytes(dataUrl) {
  // data:image/png;base64,iVBOR...
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const b64  = m[2];
  const buf  = Buffer.from(b64, "base64");
  const extMap = {
    "image/png":  ".png",
    "image/jpeg": ".jpg",
    "image/jpg":  ".jpg",
    "image/webp": ".webp",
    "image/gif":  ".gif",
    "image/svg+xml": ".svg",
  };
  return { ext: extMap[mime] || ".bin", bytes: buf, mime };
}

function extractBioField(obj, key, fallbackName) {
  const val = obj[key];
  if (typeof val !== "string" || !val.startsWith("data:")) return null;
  const decoded = dataUrlToBytes(val);
  if (!decoded) return null;
  const slug = slugify(fallbackName || key) || "bio-image";
  const filename = `${slug}${decoded.ext}`;
  const fullPath = join(BIO_DIR, filename);
  const publicUrl = `/library/bio/${filename}`;
  if (!existsSync(fullPath)) {
    writeFileSync(fullPath, decoded.bytes);
    console.log(`[migrate] Extracted bio asset: ${publicUrl} (${(decoded.bytes.length / 1024).toFixed(1)} KB)`);
  }
  obj[key] = publicUrl;
  bioExtractedCount++;
  return { publicUrl, name: fallbackName || slug };
}

// avatar_url + photo_url may be base64 in some installs
extractBioField(bio, "photo_url",  "Andrew photo");
extractBioField(bio, "avatar_url", "Andrew avatar");

if (Array.isArray(bio.media_logos)) {
  for (const entry of bio.media_logos) {
    if (!entry || typeof entry !== "object") continue;
    const name = entry.name || "media logo";
    const extracted = extractBioField(entry, "url", `media-${name}`);
    if (extracted) {
      upsert(libByUrl, {
        id:        newId(),
        name:      `Logo — ${name}`,
        url:       extracted.publicUrl,
        type:      "logo",
        companies: [name],
        source:    "url",
        addedAt:   NOW,
      });
    } else if (typeof entry.url === "string" && entry.url) {
      // Already a URL (not base64) — index it as a logo with the outlet name
      upsert(libByUrl, {
        id:        newId(),
        name:      `Logo — ${name}`,
        url:       entry.url,
        type:      "logo",
        companies: [name],
        source:    "url",
        addedAt:   NOW,
      });
    }
  }
}

writeJson(BIO_PATH, bio);
console.log(`[migrate] Extracted ${bioExtractedCount} base64 image(s) from bio.json.`);

/* ── Step 3: walk public/ for static media ───────────────────────────────── */

const PUBLIC_SKIP = [
  // Already managed by the admin uploader — its own entries get added
  // through file-library.json directly when the user uploads.
  new RegExp(`${PUBLIC}/library(/|$)`),
];

const publicFiles = walk(PUBLIC, PUBLIC_SKIP);
let publicAdded = 0;
for (const abs of publicFiles) {
  const ext = extname(abs).toLowerCase();
  if (!MEDIA_EXT.has(ext)) continue;
  const rel = "/" + relative(PUBLIC, abs).replace(/\\/g, "/");
  if (libByUrl.has(rel)) continue;
  const name = friendlyName(abs);
  upsert(libByUrl, {
    id:        newId(),
    name,
    url:       rel,
    type:      inferType(rel),
    companies: [],
    source:    "url",
    addedAt:   NOW,
  });
  publicAdded++;
}
console.log(`[migrate] Added ${publicAdded} entries from public/.`);

/* ── Step 4: deals.json logos ────────────────────────────────────────────── */

const dealsJson = readJson(DEALS_PATH);
const deals = Array.isArray(dealsJson.deals) ? dealsJson.deals : [];
let dealsAdded = 0;
for (const deal of deals) {
  const who = (deal.who || "").trim();
  for (const url of (deal.logos || [])) {
    if (typeof url !== "string" || !url) continue;
    const already = libByUrl.has(url);
    upsert(libByUrl, {
      id:        newId(),
      name:      who ? `Logo — ${who}` : friendlyName(url),
      url,
      type:      "logo",
      companies: who ? [who] : [],
      source:    "url",
      addedAt:   NOW,
    });
    if (!already) dealsAdded++;
  }
}
console.log(`[migrate] Added ${dealsAdded} new entries from deals.json.`);

/* ── Step 5: press.json logos + media images ─────────────────────────────── */

const pressJson = readJson(PRESS_PATH);
const items = Array.isArray(pressJson.items) ? pressJson.items : [];
let pressAdded = 0;
for (const item of items) {
  const pub = (item.publication_title || "").trim();
  // logo_url → type: logo, companies: [publication_title]
  if (typeof item.logo_url === "string" && item.logo_url && !item.logo_url.startsWith("data:")) {
    const already = libByUrl.has(item.logo_url);
    upsert(libByUrl, {
      id:        newId(),
      name:      pub ? `Logo — ${pub}` : friendlyName(item.logo_url),
      url:       item.logo_url,
      type:      "logo",
      companies: pub ? [pub] : [],
      source:    "url",
      addedAt:   NOW,
    });
    if (!already) pressAdded++;
  } else if (typeof item.logo_url === "string" && item.logo_url.startsWith("data:")) {
    // press.json had a couple of base64-embedded logos (e.g. ABI Journal).
    // Extract to /library/bio/ alongside the bio assets — same scheme.
    const decoded = dataUrlToBytes(item.logo_url);
    if (decoded) {
      const slug = slugify(`press-${pub || "logo"}`);
      const filename = `${slug}${decoded.ext}`;
      const fullPath = join(BIO_DIR, filename);
      const publicUrl = `/library/bio/${filename}`;
      if (!existsSync(fullPath)) {
        writeFileSync(fullPath, decoded.bytes);
        console.log(`[migrate] Extracted press logo: ${publicUrl} (${(decoded.bytes.length / 1024).toFixed(1)} KB)`);
      }
      item.logo_url = publicUrl;
      const already = libByUrl.has(publicUrl);
      upsert(libByUrl, {
        id:        newId(),
        name:      pub ? `Logo — ${pub}` : "Press logo",
        url:       publicUrl,
        type:      "logo",
        companies: pub ? [pub] : [],
        source:    "url",
        addedAt:   NOW,
      });
      if (!already) pressAdded++;
    }
  }

  // media_url → type: image, no company tag
  if (typeof item.media_url === "string" && item.media_url && !item.media_url.startsWith("data:")) {
    const already = libByUrl.has(item.media_url);
    upsert(libByUrl, {
      id:        newId(),
      name:      pub ? `Press image — ${pub}` : friendlyName(item.media_url),
      url:       item.media_url,
      type:      "image",
      companies: pub ? [pub] : [],
      source:    "url",
      addedAt:   NOW,
    });
    if (!already) pressAdded++;
  }
}
console.log(`[migrate] Added ${pressAdded} new entries from press.json (logos + media).`);

writeJson(PRESS_PATH, pressJson);

/* ── Step 6: alerts.json (no images today, but check defensively) ────────── */

const alertsJson = readJson(ALERTS_PATH);
const alerts = Array.isArray(alertsJson.alerts) ? alertsJson.alerts : [];
let alertsAdded = 0;
for (const alert of alerts) {
  for (const [k, v] of Object.entries(alert)) {
    if (typeof v !== "string") continue;
    if (!/^https?:\/\//.test(v) && !v.startsWith("/")) continue;
    // Only treat fields named like image/thumb/logo/icon as media — alerts'
    // `href` is a link to a post, not an asset.
    if (!/(image|thumb|logo|icon|media|photo|avatar)/i.test(k)) continue;
    if (libByUrl.has(v)) continue;
    upsert(libByUrl, {
      id:        newId(),
      name:      friendlyName(v),
      url:       v,
      type:      inferType(v),
      companies: [],
      source:    "url",
      addedAt:   NOW,
    });
    alertsAdded++;
  }
}
console.log(`[migrate] Added ${alertsAdded} new entries from alerts.json.`);

/* ── Step 7: sort & write ────────────────────────────────────────────────── */

// Preserve original ordering for pre-existing entries, append discovered ones
// after them sorted newest-first. This means the user's curated top-of-list
// items don't get shuffled.
const existingUrls = new Set(existingFiles.map(f => f && f.url).filter(Boolean));
const preserved   = existingFiles
  .filter(f => f && f.url && libByUrl.has(f.url))
  .map(f => libByUrl.get(f.url));

const discovered = [...libByUrl.values()]
  .filter(e => !existingUrls.has(e.url))
  .sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));

library.files = [...preserved, ...discovered];
writeJson(FILE_LIBRARY_PATH, library);

const afterCount = library.files.length;
console.log(`[migrate] Library now has ${afterCount} entries (was ${beforeCount}, +${afterCount - beforeCount}).`);
console.log("[migrate] Done.");
