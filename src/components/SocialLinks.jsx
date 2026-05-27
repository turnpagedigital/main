import React from "react";

/* ── Platform registry ──────────────────────────────────────────────────────
   Each entry: { label, match (array of substrings), icon (24×24 SVG path) }
   detectPlatform() returns the key or "link" for an unknown URL.
   ────────────────────────────────────────────────────────────────────────── */

export const PLATFORMS = {
  linkedin: {
    label: "LinkedIn",
    match: ["linkedin.com"],
    color: "#0A66C2",
    // LinkedIn "in" in rounded square
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },

  x: {
    label: "X",
    match: ["twitter.com", "x.com"],
    color: "#000000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },

  instagram: {
    label: "Instagram",
    match: ["instagram.com"],
    color: "#E1306C",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },

  facebook: {
    label: "Facebook",
    match: ["facebook.com", "fb.com"],
    color: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },

  youtube: {
    label: "YouTube",
    match: ["youtube.com", "youtu.be"],
    color: "#FF0000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },

  github: {
    label: "GitHub",
    match: ["github.com"],
    color: "#181717",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },

  threads: {
    label: "Threads",
    match: ["threads.net"],
    color: "#000000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.01c.028-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.062-4.829-.31-.7-.873-1.287-1.653-1.754-.293 1.382-.842 2.508-1.647 3.356-1.024 1.08-2.336 1.638-3.9 1.657-1.24-.022-2.326-.41-3.048-1.086-.823-.77-1.25-1.892-1.231-3.244.019-1.271.463-2.328 1.311-3.063.89-.774 2.156-1.186 3.74-1.206 1.122.011 2.09.258 2.9.738.2.12.39.25.564.39-.07-.26-.148-.512-.237-.76-.563-1.59-1.876-2.527-3.818-2.55-1.306.018-2.372.484-3.111 1.348l-1.606-1.326c1.09-1.296 2.737-2.009 4.716-2.027 1.75.02 3.13.626 4.1 1.8.887 1.077 1.288 2.535 1.17 4.285.39.25.77.52 1.127.813 1.198.967 1.995 2.12 2.37 3.423.67 2.365.064 5.027-1.626 6.693-1.84 1.802-4.24 2.714-7.134 2.733z" />
      </svg>
    ),
  },

  // Generic fallback
  link: {
    label: "Link",
    match: [],
    color: "#555",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
};

/* ── Detect platform from URL ───────────────────────────────────────────── */
export function detectPlatform(url) {
  if (!url) return "link";
  const lower = url.toLowerCase();
  for (const [key, cfg] of Object.entries(PLATFORMS)) {
    if (key === "link") continue;
    if (cfg.match.some(m => lower.includes(m))) return key;
  }
  return "link";
}

/* ── Single icon (for use inside links) ────────────────────────────────── */
export function SocialIcon({ platform, size = 20 }) {
  const cfg = PLATFORMS[platform] || PLATFORMS.link;
  return (
    <span style={{ display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
      {cfg.icon}
    </span>
  );
}

/* ── Row of icon links (public-facing) ─────────────────────────────────── */
/*
  links: [{ url: string }]
  dark:  true = icons are white (for dark backgrounds)
  size:  icon size in px (default 22)
*/
export default function SocialLinks({ links, dark = false, size = 22, gap = "0.75rem" }) {
  if (!Array.isArray(links) || links.length === 0) return null;

  const validLinks = links.filter(l => l && l.url && l.url.trim());
  if (validLinks.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap, flexWrap: "wrap" }}>
      {validLinks.map(({ url }, i) => {
        const platform = detectPlatform(url);
        const cfg = PLATFORMS[platform] || PLATFORMS.link;
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={cfg.label}
            aria-label={cfg.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: size + 8,
              height: size + 8,
              color: dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)",
              textDecoration: "none",
              transition: "color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = dark ? "#fff" : cfg.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)";
            }}
          >
            <span style={{ display: "inline-flex", width: size, height: size }}>
              {cfg.icon}
            </span>
          </a>
        );
      })}
    </div>
  );
}
