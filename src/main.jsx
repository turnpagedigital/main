import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
