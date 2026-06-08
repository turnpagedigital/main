#!/usr/bin/env node
/**
 * fetch-news.js — Daily LLM / AI-copyright news scanner
 *
 * Fetches news articles about IEEPA tariffs from Google News RSS,
 * filters to reputable sources, deduplicates, and writes:
 *   public/news.json         — latest 20 articles (for carousel)
 *   public/news-archive.json — full article repository
 *
 * Usage:  node scripts/fetch-news.js
 * Schedule: run daily via cron or scheduled task
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

/* ─── CONFIG ─── */

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const NEWS_FILE = path.join(PUBLIC_DIR, "news.json");
const ARCHIVE_FILE = path.join(PUBLIC_DIR, "news-archive.json");
const MAX_CAROUSEL = 20;

// Search queries to cover different angles
const SEARCH_QUERIES = [
  "Bartz Anthropic copyright settlement",
  "AI training data copyright lawsuit",
  "OpenAI copyright litigation MDL",
  "Thomson Reuters ROSS fair use appeal",
  "Elsevier Meta copyright Llama",
  "music publisher AI copyright Concord",
  "generative AI fair use ruling",
];

// Only include articles from these reputable domains
const SOURCE_WHITELIST = [
  // Major news
  "reuters.com",
  "apnews.com",
  "bloomberg.com",
  "bloomberglaw.com",
  "wsj.com",
  "washingtonpost.com",
  "npr.org",
  "cnbc.com",
  "bbc.com",
  "politico.com",
  "thehill.com",
  // Trade / legal / industry
  "law360.com",
  "publishersweekly.com",
  "authorsguild.org",
  "theverge.com",
  "arstechnica.com",
  "joc.com",
  "scotusblog.com",
  "freightwaves.com",
  "americanshipper.com",
  "supplychaindive.com",
  "tradewindsnews.com",
  // Think tanks / academic
  "budgetmodel.wharton.upenn.edu",
  "budgetlab.yale.edu",
  "taxfoundation.org",
  "cato.org",
  "cfr.org",
  "brookings.edu",
  "piie.com",
  // Government
  "cbp.gov",
  "uscourts.gov",
  "supremecourt.gov",
  "commerce.gov",
  "trade.gov",
  "usitc.gov",
];

// Map source domain fragments to display names
const SOURCE_NAMES = {
  "reuters.com": "Reuters",
  "apnews.com": "AP News",
  "bloomberg.com": "Bloomberg",
  "bloomberglaw.com": "Bloomberg Law",
  "wsj.com": "Wall Street Journal",
  "washingtonpost.com": "Washington Post",
  "npr.org": "NPR",
  "cnbc.com": "CNBC",
  "bbc.com": "BBC",
  "politico.com": "Politico",
  "thehill.com": "The Hill",
  "law360.com": "Law360",
  "publishersweekly.com": "Publishers Weekly",
  "authorsguild.org": "Authors Guild",
  "theverge.com": "The Verge",
  "arstechnica.com": "Ars Technica",
  "joc.com": "Journal of Commerce",
  "scotusblog.com": "SCOTUSblog",
  "freightwaves.com": "FreightWaves",
  "americanshipper.com": "American Shipper",
  "supplychaindive.com": "Supply Chain Dive",
  "tradewindsnews.com": "TradeWinds",
  "budgetmodel.wharton.upenn.edu": "Penn Wharton",
  "budgetlab.yale.edu": "Yale Budget Lab",
  "taxfoundation.org": "Tax Foundation",
  "cato.org": "Cato Institute",
  "cfr.org": "Council on Foreign Relations",
  "brookings.edu": "Brookings Institution",
  "piie.com": "Peterson Institute",
  "cbp.gov": "U.S. CBP",
  "uscourts.gov": "U.S. Courts",
  "supremecourt.gov": "Supreme Court",
  "commerce.gov": "Dept. of Commerce",
  "trade.gov": "Trade.gov",
  "usitc.gov": "U.S. ITC",
};

// Tag assignment based on keywords in title/description
const TAG_RULES = [
  { keywords: ["supreme court", "scotus", "ruling", "decision", "opinion"], tag: "Breaking" },
  { keywords: ["cbp", "customs", "guidance", "regulation", "rule", "policy"], tag: "Policy" },
  { keywords: ["litigation", "lawsuit", "court", "judge", "cit", "legal", "attorney"], tag: "Legal" },
  { keywords: ["billion", "revenue", "data", "estimate", "budget", "study", "report"], tag: "Data" },
  { keywords: ["refund", "protest", "psc", "correction", "filing", "claim"], tag: "Urgent" },
  { keywords: ["importer", "business", "company", "industry", "manufacturer"], tag: "Industry" },
  { keywords: ["research", "analysis", "paper", "model", "academic"], tag: "Research" },
  { keywords: ["trade", "shipping", "freight", "port", "cargo", "supply chain"], tag: "Trade" },
  { keywords: ["trump", "biden", "congress", "senate", "house", "white house"], tag: "Politics" },
];

// Unsplash fallback images themed around trade/shipping/law
const FALLBACK_IMGS = [
  "https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=400&h=240&fit=crop",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=400&h=240&fit=crop",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=240&fit=crop",
  "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=240&fit=crop",
  "https://images.unsplash.com/photo-1605732562742-3023a888e56e?w=400&h=240&fit=crop",
  "https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&h=240&fit=crop",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=240&fit=crop",
  "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=400&h=240&fit=crop",
];

/* ─── HELPERS ─── */

/** Fetch a URL and return the response body as a string */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, { headers: { "User-Agent": "RewindTariffs-NewsFetcher/1.0" } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/** Minimal XML tag content extractor (no dependencies) */
function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
}

/** Extract all occurrences of a tag */
function extractAllTags(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
  }
  return results;
}

/** Extract items from RSS XML */
function parseRssItems(xml) {
  const items = [];
  const itemBlocks = xml.split(/<item>/i).slice(1);
  for (const block of itemBlocks) {
    const endIdx = block.indexOf("</item>");
    const itemXml = endIdx > -1 ? block.substring(0, endIdx) : block;

    const title = extractTag(itemXml, "title")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "");

    const link = extractTag(itemXml, "link").replace(/&amp;/g, "&");
    const description = extractTag(itemXml, "description")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    const pubDate = extractTag(itemXml, "pubDate");
    const source = extractTag(itemXml, "source");

    if (title && link) {
      items.push({ title, link, description, pubDate, source });
    }
  }
  return items;
}

/** Check if a URL belongs to a whitelisted source */
function isWhitelisted(url) {
  const lower = url.toLowerCase();
  return SOURCE_WHITELIST.some((domain) => lower.includes(domain));
}

/** Get display name for a source URL */
function getSourceName(url, rssSource) {
  const lower = url.toLowerCase();
  for (const [domain, name] of Object.entries(SOURCE_NAMES)) {
    if (lower.includes(domain)) return name;
  }
  // Fall back to RSS source field
  if (rssSource) return rssSource.replace(/<[^>]+>/g, "").trim();
  // Extract domain
  try {
    const u = new URL(url);
    return u.hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}

/** Assign a tag based on title + description keywords */
function assignTag(title, description) {
  const text = (title + " " + description).toLowerCase();
  for (const rule of TAG_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.tag;
    }
  }
  return "Analysis";
}

/** Format a date string to "Mon DD, YYYY" */
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/** Follow Google News redirect to get the actual article URL */
async function resolveGoogleUrl(url) {
  // Google News URLs redirect to the actual article
  // We'll just return the URL as-is since Google News links work for clicking
  // But try to extract the actual URL if it's in the query params
  try {
    const u = new URL(url);
    // Google News RSS sometimes has URLs like https://news.google.com/rss/articles/...
    // These redirect, but we can't easily follow them without a full HTTP client
    // Just return the original — it will redirect in browser
    return url;
  } catch {
    return url;
  }
}

/* ─── MAIN ─── */

async function main() {
  console.log("🔍 Fetching IEEPA tariff news...\n");

  // Load existing archive
  let archive = [];
  try {
    if (fs.existsSync(ARCHIVE_FILE)) {
      archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, "utf-8"));
      console.log(`  Loaded ${archive.length} existing archived articles`);
    }
  } catch (e) {
    console.warn("  Could not load archive, starting fresh:", e.message);
  }

  const seenUrls = new Set(archive.map((a) => a.url));
  let newCount = 0;

  // Fetch from each search query
  for (const query of SEARCH_QUERIES) {
    const encoded = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;

    try {
      console.log(`  Searching: "${query}"`);
      const xml = await fetchUrl(rssUrl);
      const items = parseRssItems(xml);
      console.log(`    Found ${items.length} results`);

      for (const item of items) {
        // Google News links — use the link directly
        const url = item.link;

        // Skip if already in archive
        if (seenUrls.has(url)) continue;

        // Check if from a whitelisted source
        // Google News RSS includes source in title like "Title - Source Name"
        // and sometimes in the source tag
        const sourceHint = item.source || "";
        const titleParts = item.title.split(" - ");
        const extractedSource = titleParts.length > 1 ? titleParts[titleParts.length - 1].trim() : "";
        const cleanTitle = titleParts.length > 1 ? titleParts.slice(0, -1).join(" - ").trim() : item.title;

        // Check source against whitelist — check both URL and source name
        const sourceNameLower = (extractedSource + " " + sourceHint).toLowerCase();
        const isFromWhitelist =
          isWhitelisted(url) ||
          SOURCE_WHITELIST.some((domain) => {
            const domainBase = domain.split(".")[0];
            return sourceNameLower.includes(domainBase);
          });

        if (!isFromWhitelist) continue;

        const sourceName = extractedSource || getSourceName(url, item.source);
        const tag = assignTag(cleanTitle, item.description);
        const imgIdx = (archive.length + newCount) % FALLBACK_IMGS.length;

        const article = {
          title: cleanTitle,
          desc: item.description.substring(0, 300) + (item.description.length > 300 ? "..." : ""),
          source: sourceName,
          date: formatDate(item.pubDate),
          tag,
          img: FALLBACK_IMGS[imgIdx],
          url,
          // Metadata for archive
          fetchedAt: new Date().toISOString(),
          pubDateRaw: item.pubDate,
        };

        archive.push(article);
        seenUrls.add(url);
        newCount++;
        console.log(`    ✓ ${sourceName}: ${cleanTitle.substring(0, 60)}...`);
      }
    } catch (e) {
      console.warn(`    ⚠ Failed to fetch "${query}":`, e.message);
    }

    // Small delay between requests to be polite
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n📰 Found ${newCount} new articles (${archive.length} total in archive)`);

  // Sort archive by date (newest first)
  archive.sort((a, b) => {
    const da = new Date(a.pubDateRaw || a.date);
    const db = new Date(b.pubDateRaw || b.date);
    return db - da;
  });

  // Write full archive
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2));
  console.log(`  ✓ Wrote ${archive.length} articles to ${path.relative(process.cwd(), ARCHIVE_FILE)}`);

  // Write latest N for carousel (strip metadata fields)
  const carousel = archive.slice(0, MAX_CAROUSEL).map(({ fetchedAt, pubDateRaw, ...rest }) => rest);
  fs.writeFileSync(NEWS_FILE, JSON.stringify(carousel, null, 2));
  console.log(`  ✓ Wrote ${carousel.length} articles to ${path.relative(process.cwd(), NEWS_FILE)}`);

  console.log("\n✅ Done!");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
