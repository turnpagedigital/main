import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import fileLibrary from './data/file-library.json'

// ─── Legacy hash-route shim ────────────────────────────────────────────────
// Earlier versions of the site used hash routing (e.g. /#/crypto). External
// links shared on LinkedIn etc. still point to those URLs. Rewrite them to
// the new clean paths BEFORE React mounts so the app boots on the correct
// route. Runs only on first load; subsequent navigations use pushState.
//
// Lives in this module (not as an inline <script>) because the site's CSP
// is `script-src 'self'` — inline scripts would be blocked, but same-origin
// modules are allowed.
if (typeof window !== "undefined" && window.location.hash.startsWith("#/")) {
  const hashTail = window.location.hash.slice(1); // strip the leading "#"
  // hashTail is something like "/crypto" or "/briefings/foo?source=x"
  // Preserve any existing real search/hash, but the hash itself becomes path.
  const newUrl =
    (hashTail || "/") +
    (window.location.search || "");
  window.history.replaceState(null, "", newUrl);
}

// ─── Environment-aware favicon ─────────────────────────────────────────────
// Picks the right favicon for the current environment from file-library.json:
//   /admin/*           → favicons.admin
//   *.pages.dev hosts  → favicons.preview
//   everything else    → favicons.production
// The static <link rel="icon"> in index.html is the build-time fallback.
// Edit /admin/files to change which icon is used per environment.
if (typeof window !== "undefined") {
  try {
    const favicons = (fileLibrary && fileLibrary.favicons) || {};
    const isAdmin   = window.location.pathname.startsWith("/admin");
    const isPreview = window.location.hostname.endsWith(".pages.dev");
    const href = isAdmin   ? favicons.admin
              : isPreview ? favicons.preview
                          : favicons.production;
    if (href) {
      const icons = document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']");
      icons.forEach(el => { el.href = href; });
    }
  } catch {
    // Fall back to whatever was set in index.html — better to do nothing than crash boot.
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
