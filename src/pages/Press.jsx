import React, { useState, useMemo, useEffect } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import BottomCTA from "../components/BottomCTA.jsx";
import pressData from "../data/press.json";

/* ── Outlet name → domain (used for Google favicon fallback) ────────────── */
const OUTLET_DOMAINS = {
  "wall street journal": "wsj.com",
  "wsj": "wsj.com",
  "bloomberg": "bloomberg.com",
  "bloomberg law": "bloomberg.com",
  "bloomberg businessweek": "bloomberg.com",
  "new york times": "nytimes.com",
  "the new york times": "nytimes.com",
  "nyt": "nytimes.com",
  "financial times": "ft.com",
  "the financial times": "ft.com",
  "ft": "ft.com",
  "reuters": "reuters.com",
  "npr": "npr.org",
  "bbc": "bbc.com",
  "bbc news": "bbc.com",
  "forbes": "forbes.com",
  "fortune": "fortune.com",
  "axios": "axios.com",
  "coindesk": "coindesk.com",
  "coin desk": "coindesk.com",
  "cointelegraph": "cointelegraph.com",
  "coin telegraph": "cointelegraph.com",
  "the block": "theblock.co",
  "decrypt": "decrypt.co",
  "law360": "law360.com",
  "abi journal": "abi.org",
  "american bankruptcy institute": "abi.org",
  "american bankruptcy institute newsletter": "abi.org",
  "grant's": "grantspub.com",
  "grant's interest rate observer": "grantspub.com",
  "politico": "politico.com",
  "the information": "theinformation.com",
  "techcrunch": "techcrunch.com",
  "wired": "wired.com",
  "the verge": "theverge.com",
  "variety": "variety.com",
  "hollywood reporter": "hollywoodreporter.com",
  "the hollywood reporter": "hollywoodreporter.com",
  "guardian": "theguardian.com",
  "the guardian": "theguardian.com",
  "washington post": "washingtonpost.com",
  "the washington post": "washingtonpost.com",
  "cnbc": "cnbc.com",
  "cnn": "cnn.com",
  "barron's": "barrons.com",
  "barrons": "barrons.com",
  "seeking alpha": "seekingalpha.com",
  "yahoo finance": "finance.yahoo.com",
  "the atlantic": "theatlantic.com",
  "new yorker": "newyorker.com",
  "the new yorker": "newyorker.com",
  "slate": "slate.com",
  "vox": "vox.com",
  "business insider": "businessinsider.com",
  "insider": "businessinsider.com",
  "morning brew": "morningbrew.com",
  "the economist": "economist.com",
};

/* ── Sub-page label map ─────────────────────────────────────────────────── */
const PAGE_LABELS = {
  "copyright":  "Copyright Claims",
  "crypto":     "Locked Crypto",
  "litigation": "Litigation Claims",
  "tariffs":    "Tariff Refunds",
  "bankruptcy": "Bankruptcy Claims",
};

/* ── Media type labels for filter pills ─────────────────────────────────── */
const TYPE_OPTS = [
  { key: "all",     label: "All" },
  { key: "press",   label: "Press" },
  { key: "article", label: "Publications" },
  { key: "podcast", label: "Podcasts" },
  { key: "social",  label: "Posts" },
];

/* ── Media helpers ───────────────────────────────────────────────────────── */
function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function getVimeoId(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
function isVideoUrl(url) {
  if (!url) return false;
  return /youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm|\.mov/i.test(url);
}
function getVideoThumbnail(url) {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null; // Vimeo needs API; direct video has no thumbnail
}

/* ── Date parser (handles "May 2026", "Apr 15, 2023", ISO, etc.) ─────────── */
function parseDate(str) {
  if (!str) return null;
  const s = str.trim().replace(/\s+/g, " ");
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // "Month YYYY" with no day
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(s);
  if (m) {
    d = new Date(`${m[1]} 1, ${m[2]}`);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/* ── Normalise every press.json item into a unified shape ───────────────── */
const UNIFIED_ITEMS = (pressData.items || []).map((d, i) => ({
  _key:     i,
  mediaType: (d.type || "").toLowerCase() === "podcast" ? "podcast"
           : d.author !== "Andrew" ? "press"
           : d.type === "social post" ? "social"
           : "article",
  type:     d.type || "",
  outlet:   d.publication_title || "",
  logoUrl:  d.logo_url || null,
  date:     d.date || null,
  dateSort: parseDate(d.date),
  headline: d.piece_title || "",
  excerpt:  d.excerpt || null,
  href:      d.url || null,
  pages:     Array.isArray(d.pages) ? d.pages : [],
  mediaUrl:  d.media_url || null,
}));

/* ── Derived filter option lists (computed once from static data) ─────────── */
const ALL_TOPICS  = [...new Set(UNIFIED_ITEMS.flatMap(d => d.pages).filter(Boolean))].sort();
const ALL_OUTLETS = [...new Set(UNIFIED_ITEMS.map(d => d.outlet).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b));

/* ── Sort helper ─────────────────────────────────────────────────────────── */
function sortByDate(items, dir) {
  return [...items].sort((a, b) => {
    const da = a.dateSort, db = b.dateSort;
    if (da && db) return dir === "desc" ? db - da : da - db;
    if (da) return dir === "desc" ? -1 : 1;
    if (db) return dir === "desc" ? 1 : -1;
    return 0;
  });
}

/* ── Read ?type= from the current hash URL ───────────────────────────────── */
function getTypeFromHash() {
  if (typeof window === "undefined") return "all";
  const qi = window.location.hash.indexOf("?");
  if (qi === -1) return "all";
  const params = new URLSearchParams(window.location.hash.slice(qi + 1));
  const t = params.get("type");
  return ["press", "article", "social", "podcast"].includes(t) ? t : "all";
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRESS PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function Press() {
  const [filterType,   setFilterType]   = useState(getTypeFromHash);
  const [filterTopic,  setFilterTopic]  = useState("all");
  const [filterOutlet, setFilterOutlet] = useState("all");
  const [sortDir,      setSortDir]      = useState("desc");

  /* Keep filterType in sync when user clicks a nav dropdown link */
  useEffect(() => {
    function onHashChange() {
      setFilterType(getTypeFromHash());
      setFilterTopic("all");
      setFilterOutlet("all");
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  /* Single filtered + sorted list across all item types */
  const visibleItems = useMemo(() => {
    let items = UNIFIED_ITEMS;
    if (filterType   !== "all") items = items.filter(d => d.mediaType === filterType);
    if (filterTopic  !== "all") items = items.filter(d => d.pages.includes(filterTopic));
    if (filterOutlet !== "all") items = items.filter(d => d.outlet === filterOutlet);
    return sortByDate(items, sortDir);
  }, [filterType, filterTopic, filterOutlet, sortDir]);

  const hasFilters = filterType !== "all" || filterTopic !== "all" || filterOutlet !== "all";
  function clearFilters() {
    setFilterType("all");
    setFilterTopic("all");
    setFilterOutlet("all");
  }

  return (
    <>
      {/* ── Hero image ──────────────────────────────────────────────────── */}
      <div style={{
        width: "100%", height: "clamp(126px, 19vw, 231px)",
        overflow: "hidden", display: "block",
      }}>
        <img
          src="/metal-folds.jpg" alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
      </div>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section style={{
        background: "#FFFFFF",
        padding: "clamp(1.5rem, 3vw, 2.5rem) clamp(1.5rem, 5vw, 4rem)",
        borderTop: `1px solid ${LINE}`,
      }}>
        <div style={{
          maxWidth: 1440, margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: "clamp(2rem,5vw,5rem)",
          alignItems: "center",
        }} className="press-header">
          {/* Left: heading */}
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(2rem,4.5vw,4rem)",
            lineHeight: 1.02, letterSpacing: "-0.04em",
            color: INK, margin: 0,
          }}>
            Press &<br />
            <span className="accent-light">Publications.</span>
          </h2>
          {/* Right: description */}
          <p style={{
            fontFamily: FONT, fontSize: "clamp(1rem,1.4vw,1.15rem)",
            color: INK_60, lineHeight: 1.6, margin: 0,
          }}>
            Andrew Glantz in the Wall Street Journal, Bloomberg, New York Times, CoinDesk, NPR, BBC, Grant's, and the ABI Journal — plus articles and commentary authored by Andrew.
          </p>
        </div>
      </section>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <FilterBar
        filterType={filterType}    onFilterType={setFilterType}
        filterTopic={filterTopic}   onFilterTopic={setFilterTopic}
        filterOutlet={filterOutlet} onFilterOutlet={setFilterOutlet}
        sortDir={sortDir}           onSortDir={setSortDir}
        hasFilters={hasFilters}     onClear={clearFilters}
        count={visibleItems.length}
      />

      {/* ── Unified grid ────────────────────────────────────────────────── */}
      <section style={{
        background: "#F4F5F7",
        padding: "clamp(2.5rem, 5vw, 4.5rem) clamp(1.5rem, 5vw, 4rem) clamp(5rem, 12vw, 11rem)",
        borderTop: `1px solid ${LINE}`,
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          {visibleItems.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "clamp(1.5rem, 3vw, 2.5rem)",
              alignItems: "start",
            }} className="press-grid">
              {visibleItems.map(item => <UnifiedCard key={item._key} item={item} />)}
            </div>
          )}
        </div>
      </section>

      <BottomCTA
        eyebrow="Get in Touch"
        title="Have a claim?"
        accent="Talk to us."
        kicker="48-hour response. Confidentiality default."
        primary={{ label: "Get in Touch", href: hashHref("contact") }}
      />

      <style>{`
        /* Filter bar selects */
        .press-filter-select {
          font-family: ${FONT};
          font-size: 0.78rem;
          color: ${INK};
          background: #fff;
          border: 1px solid ${LINE};
          padding: 0.38rem 0.65rem;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          padding-right: 1.8rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.55rem center;
          min-width: 130px;
        }
        .press-filter-select:focus { outline: 2px solid ${NEON}; outline-offset: 1px; }

        /* Responsive grid */
        @media (max-width: 880px) {
          .press-header { grid-template-columns: 1fr !important; }
          .press-grid   { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .press-grid  { grid-template-columns: 1fr !important; }
        }

        /* Filter bar responsive */
        @media (max-width: 760px) {
          .press-filter-bar   { flex-direction: column !important; align-items: flex-start !important; }
          .press-filter-right { margin-left: 0 !important; }
        }
      `}</style>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER BAR
═══════════════════════════════════════════════════════════════════════════ */
function FilterBar({
  filterType, onFilterType,
  filterTopic, onFilterTopic,
  filterOutlet, onFilterOutlet,
  sortDir, onSortDir,
  hasFilters, onClear,
  count,
}) {
  return (
    <div style={{
      background: "#F4F5F7",
      borderTop: `1px solid ${LINE}`,
      borderBottom: `1px solid ${LINE}`,
      padding: "0.75rem clamp(1.5rem, 5vw, 4rem)",
    }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        display: "flex", flexWrap: "wrap",
        gap: "0.5rem", alignItems: "center",
      }} className="press-filter-bar">

        {/* ── Type pills ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {TYPE_OPTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onFilterType(key)}
              style={{
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase",
                padding: "0.38rem 0.8rem",
                background: filterType === key ? INK : "transparent",
                color: filterType === key ? "#fff" : INK_60,
                border: `1px solid ${filterType === key ? INK : LINE}`,
                cursor: "pointer", transition: "background 0.15s, color 0.15s, border-color 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Vertical divider ─────────────────────────────────────── */}
        <div style={{ width: 1, height: 22, background: LINE, flexShrink: 0, margin: "0 0.15rem" }} />

        {/* ── Topic dropdown ────────────────────────────────────────── */}
        <div style={{ position: "relative" }}>
          <select
            className="press-filter-select"
            value={filterTopic}
            onChange={e => onFilterTopic(e.target.value)}
          >
            <option value="all">All Topics</option>
            {ALL_TOPICS.map(t => (
              <option key={t} value={t}>{PAGE_LABELS[t] || t}</option>
            ))}
          </select>
        </div>

        {/* ── Publication dropdown ──────────────────────────────────── */}
        <div style={{ position: "relative" }}>
          <select
            className="press-filter-select"
            value={filterOutlet}
            onChange={e => onFilterOutlet(e.target.value)}
          >
            <option value="all">All Publications</option>
            {ALL_OUTLETS.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* ── Sort + clear (pushed right) ───────────────────────────── */}
        <div style={{
          display: "flex", gap: "0.3rem", alignItems: "center",
          marginLeft: "auto",
        }} className="press-filter-right">
          {[["desc", "Newest ↓"], ["asc", "Oldest ↑"]].map(([dir, label]) => (
            <button
              key={dir}
              onClick={() => onSortDir(dir)}
              style={{
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "0.38rem 0.8rem",
                background: sortDir === dir ? NEON : "transparent",
                color: sortDir === dir ? "#000" : INK_60,
                border: `1px solid ${sortDir === dir ? NEON : LINE}`,
                cursor: "pointer", transition: "background 0.15s, color 0.15s, border-color 0.15s",
              }}
            >
              {label}
            </button>
          ))}

          {hasFilters && (
            <button
              onClick={onClear}
              style={{
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                color: INK_60, background: "none", border: "none",
                cursor: "pointer", padding: "0.38rem 0.4rem",
                textDecoration: "underline", marginLeft: "0.2rem",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Item count ───────────────────────────────────────────── */}
        {count != null && (
          <span style={{
            fontFamily: FONT, fontSize: "0.72rem", color: INK_60,
            marginLeft: "0.5rem", whiteSpace: "nowrap",
          }}>
            {count} item{count === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════════════════ */
function EmptyState({ hasFilters, onClear, dark = false }) {
  const textColor = dark ? "rgba(255,255,255,0.45)" : INK_60;
  const borderColor = dark ? "rgba(255,255,255,0.12)" : LINE;
  return (
    <div style={{
      padding: "3rem", border: `1px dashed ${borderColor}`,
      color: textColor, fontFamily: FONT, fontSize: "0.92rem",
      fontStyle: "italic", textAlign: "center",
    }}>
      No items match the selected filters.
      {hasFilters && (
        <button
          onClick={onClear}
          style={{
            fontFamily: FONT, fontSize: "0.92rem",
            color: dark ? "#fff" : INK,
            background: "none", border: "none", cursor: "pointer",
            textDecoration: "underline", marginLeft: "0.5em",
            fontStyle: "normal",
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/* ── Sub-page tags ───────────────────────────────────────────────────────── */
function PageTags({ pages, dark = false }) {
  if (!pages || pages.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.9rem" }}>
      {pages.map(p => (
        <span key={p} style={{
          fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800,
          letterSpacing: "0.1em", textTransform: "uppercase",
          background: NEON, color: "#000",
          padding: "0.2em 0.5em",
        }}>
          {PAGE_LABELS[p] || p}
        </span>
      ))}
    </div>
  );
}

/* ── Outlet logo ─────────────────────────────────────────────────────────────
   Fixed 140 × 32 bounding box with objectFit: contain so every logo —
   square favicon or wide wordmark — displays at the same optical height
   without distortion or clipping.                                           */
function OutletLogo({ name, logoUrl, style = {} }) {
  const [failed, setFailed] = useState(false);
  const domain = name ? OUTLET_DOMAINS[name.toLowerCase().trim()] : null;
  const src    = logoUrl || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null);

  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={name || ""}
      style={{
        width: 140, height: 32,
        objectFit: "contain",
        objectPosition: "left center",
        display: "block",
        marginBottom: "0.9rem",
        ...style,
      }}
      onError={() => setFailed(true)}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE INDICATOR ICONS
═══════════════════════════════════════════════════════════════════════════ */

/* Newspaper icon — for press features */
const NewsIcon = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
    <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>
  </svg>
);

/* Quill / feather icon — for authored publications */
const QuillIcon = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {/* Feather body */}
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
    {/* Shaft running through */}
    <line x1="16" y1="8" x2="2" y2="22"/>
    {/* Barb */}
    <line x1="17.5" y1="15" x2="9" y2="15"/>
  </svg>
);

/* Microphone icon — for podcasts */
const MicIcon = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

/* Platform icons — for social posts */
const PlatformIcon = ({ platform, size = 13, color = "currentColor" }) => {
  const key = (platform || "").toLowerCase().trim();
  if (key === "linkedin") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
  if (key === "x" || key === "twitter") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
  if (key === "substack") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
    </svg>
  );
  /* Generic speech-bubble fallback */
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
};

function getPlatformAccent(platform) {
  const key = (platform || "").toLowerCase().trim();
  if (key === "linkedin") return "#0A66C2";
  if (key === "x" || key === "twitter") return "#1a1a1a";
  if (key === "substack") return "#FF6719";
  return INK_60;
}

function getPlatformLabel(platform) {
  const key = (platform || "").toLowerCase().trim();
  if (key === "x") return "X";
  if (key === "twitter") return "X (Twitter)";
  if (!platform) return "Social";
  return platform;
}

/* ── Type indicator strip at the top of every card ───────────────────────── */
function TypeIndicator({ item }) {
  const base = {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "0.85rem",
    marginBottom: "0.95rem",
    borderBottom: `1px solid ${LINE}`,
  };
  const labelStyle = {
    fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase",
  };
  const dateStyle = {
    fontFamily: FONT, fontSize: "0.68rem",
    color: INK_60, letterSpacing: "0.02em",
  };

  if (item.mediaType === "podcast") {
    return (
      <div style={base}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4em" }}>
          <MicIcon size={13} color={INK_60} />
          <span style={{ ...labelStyle, color: INK_60 }}>Podcast</span>
        </div>
        {item.date && <span style={dateStyle}>{item.date}</span>}
      </div>
    );
  }

  if (item.mediaType === "social") {
    const accent = getPlatformAccent(item.outlet);
    return (
      <div style={base}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4em" }}>
          <PlatformIcon platform={item.outlet} size={13} color={accent} />
          <span style={{ ...labelStyle, color: accent }}>Post</span>
        </div>
        {item.date && <span style={dateStyle}>{item.date}</span>}
      </div>
    );
  }

  if (item.mediaType === "article") {
    return (
      <div style={base}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4em" }}>
          <QuillIcon size={13} color={INK_60} />
          <span style={{ ...labelStyle, color: INK_60 }}>Publication</span>
        </div>
        {item.date && <span style={dateStyle}>{item.date}</span>}
      </div>
    );
  }

  /* press */
  return (
    <div style={base}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4em" }}>
        <NewsIcon size={13} color={INK_60} />
        <span style={{ ...labelStyle, color: INK_60 }}>Press</span>
      </div>
      {item.date && <span style={dateStyle}>{item.date}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MEDIA THUMBNAIL — image or video (with play overlay)
═══════════════════════════════════════════════════════════════════════════ */
function MediaThumb({ url, href }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!url) return null;

  const isVid   = isVideoUrl(url) || isVideoUrl(href); // play icon if media OR link is a video
  const ytThumb = getVideoThumbnail(url) || getVideoThumbnail(href);
  const imgSrc  = isVideoUrl(url) ? ytThumb : url; // use YouTube thumb only when media_url is YT

  return (
    <div style={{
      marginTop: "1rem",
      position: "relative",
      width: "100%",
      aspectRatio: "16 / 9",
      background: "#111",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Background image (or color block if no thumbnail) */}
      {imgSrc && !imgFailed && (
        <img
          src={imgSrc}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}

      {/* Play button overlay for videos */}
      {isVid && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.28)",
        }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {/* Triangle play icon, offset right slightly to centre optically */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" style={{ marginLeft: 3 }}>
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   UNIFIED CARD  — all three media types, one white card design
═══════════════════════════════════════════════════════════════════════════ */
function UnifiedCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const isSocial  = item.mediaType === "social";
  const isArticle = item.mediaType === "article";
  const lifted    = hovered && item.href;
  const hasMedia  = Boolean(item.mediaUrl);

  const inner = (
    <div style={{
      background: "#fff",
      border: `1px solid ${LINE}`,
      padding: "clamp(1.4rem, 2.5vw, 1.8rem)",
      height: "100%", boxSizing: "border-box",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Type indicator ─────────────────────────────────────────── */}
      <TypeIndicator item={item} />

      {/* ── Outlet logo (press + article only) ─────────────────────── */}
      {!isSocial && (
        <OutletLogo
          name={item.outlet} logoUrl={item.logoUrl}
          style={isArticle ? { filter: "grayscale(1)", opacity: 0.55 } : {}}
        />
      )}

      {/* ── Meta: outlet only (date lives in TypeIndicator) ────────── */}
      {!isSocial && item.outlet && (
        <p style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: INK_60, margin: "0 0 0.65rem",
        }}>
          {item.outlet}
        </p>
      )}

      {/* ── Headline ────────────────────────────────────────────────── */}
      {item.headline && (
        <h3 style={{
          fontFamily: FONT, fontWeight: isSocial ? 700 : 800,
          fontSize: isSocial ? "0.85rem" : "clamp(1rem, 1.4vw, 1.15rem)",
          lineHeight: 1.3, letterSpacing: isSocial ? "0.05em" : "-0.01em",
          textTransform: isSocial ? "uppercase" : "none",
          color: isSocial ? INK_60 : INK,
          margin: `0 0 ${isArticle ? "0.3rem" : item.excerpt ? "0.7rem" : "0"}`,
        }}>
          {item.headline}
        </h3>
      )}

      {/* ── Byline — publications only ──────────────────────────────── */}
      {isArticle && (
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: INK_60, margin: `0 0 ${item.excerpt ? "0.7rem" : "0"}`,
        }}>
          By Andrew Glantz
        </p>
      )}

      {/* ── Excerpt ─────────────────────────────────────────────────── */}
      {item.excerpt && (
        <p style={{
          fontFamily: FONT, fontSize: "0.95rem",
          color: INK_60, lineHeight: 1.65,
          margin: 0, flex: 1,
          fontStyle: isSocial ? "italic" : "normal",
          ...(item.mediaType === "press" ? {
            borderLeft: `3px solid ${NEON}`,
            paddingLeft: "0.8rem",
          } : {}),
          display: "-webkit-box", WebkitLineClamp: hasMedia ? 3 : 8,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {(item.mediaType === "press" || isSocial) ? `"${item.excerpt}"` : item.excerpt}
        </p>
      )}

      {/* ── Media (image or video thumbnail) ───────────────────────── */}
      {hasMedia && <MediaThumb url={item.mediaUrl} href={item.href} />}

      {/* ── Topic tags ──────────────────────────────────────────────── */}
      <PageTags pages={item.pages} />

      {/* ── Social CTA ──────────────────────────────────────────────── */}
      {isSocial && item.href && (
        <span style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
          color: getPlatformAccent(item.outlet),
          letterSpacing: "0.04em", marginTop: "0.8rem",
        }}>
          View post →
        </span>
      )}
    </div>
  );

  const liftStyle = {
    display: "block", textDecoration: "none", height: "100%",
    transform: lifted ? "translateY(-5px)" : "translateY(0)",
    boxShadow: lifted
      ? "0 10px 28px rgba(10,10,10,0.13)"
      : "0 1px 3px rgba(10,10,10,0.04)",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  };

  if (item.href) {
    return (
      <a
        href={item.href} target="_blank" rel="noopener noreferrer"
        style={liftStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner}
      </a>
    );
  }
  return <div style={{ height: "100%", boxShadow: "0 1px 3px rgba(10,10,10,0.04)" }}>{inner}</div>;
}
