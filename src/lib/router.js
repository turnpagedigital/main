import { useState, useEffect } from "react";

/* HTML5 history-based router. URLs look like:
     /                       → home
     /ai-copyright           → AI Copyright sub-brand
     /crypto                 → Crypto Claims sub-brand
     /briefings              → Briefings index
     /briefings/SLUG         → single briefing
     /contact                → Contact
     /privacy                → Privacy
     /terms                  → Terms
     /admin                  → Admin (default tab)
     /admin/posts            → Admin posts tab

   This module previously used hash fragments (#/foo). It was migrated to
   pushState/popstate so that the server (and social-media crawlers) can see
   the actual page path — a prerequisite for per-page Open Graph tags.

   A legacy shim in src/main.jsx rewrites incoming /#/foo URLs to /foo before
   React mounts, so old shared links keep working. A Cloudflare Pages
   _redirects rule serves index.html for any path that doesn't match a static
   file, so deep links on first load also work. */

export function parsePath(pathname) {
  // Strip leading "/" and trailing "/"
  let p = (pathname || "/").split("?")[0].split("#")[0];
  p = p.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!p) return { page: "home", slug: null };

  const parts = p.split("/").filter(Boolean);
  if (parts[0] === "briefings" && parts[1]) {
    return { page: "briefing", slug: parts.slice(1).join("/") };
  }
  return { page: parts[0], slug: null };
}

/* Back-compat alias — older code may import parseHash. */
export const parseHash = parsePath;

/* Read the current path including query and hash, suitable for routing. */
function readLocation() {
  if (typeof window === "undefined") return { pathname: "/", search: "", hash: "" };
  return {
    pathname: window.location.pathname,
    search:   window.location.search,
    hash:     window.location.hash,
  };
}

/* Manually emit a popstate so other listeners (Admin, Contact, Press) can
   re-read window.location without us coupling them to a shared store. */
function emitPopstate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

/* useRoute — primary hook used by App.jsx. */
export function useRoute() {
  const [loc, setLoc] = useState(readLocation);

  useEffect(() => {
    function onChange() {
      setLoc(readLocation());
      // Scroll to top on path change (skip if URL has a #section anchor)
      if (!window.location.hash) {
        window.scrollTo({
          top: 0,
          behavior: "instant" in window ? "instant" : "auto",
        });
      }
    }
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  const route = parsePath(loc.pathname);

  function navigate(path) {
    // Accept "ai-copyright", "/ai-copyright", or "/ai-copyright?source=x#anchor"
    const cleaned = (path || "").startsWith("/")
      ? path
      : "/" + (path || "").replace(/^\/+/, "");
    if (cleaned === window.location.pathname + window.location.search + window.location.hash) return;
    window.history.pushState(null, "", cleaned);
    emitPopstate();
  }

  return { route, navigate, location: loc };
}

/* Back-compat alias — older code may import useHashRoute. Returns the same
   shape as before: { route, navigate }. */
export function useHashRoute() {
  const { route, navigate } = useRoute();
  return { route, navigate };
}

/* href("contact") → "/contact"
   href("briefings/foo") → "/briefings/foo"
   Pass-through for full URLs and #anchors. */
export function href(path) {
  if (path == null) return "/";
  const s = String(path);
  // Pass through fully-qualified URLs, mailto:, tel:, and pure #anchor links
  if (/^[a-z]+:/i.test(s) || s.startsWith("//") || s.startsWith("#")) return s;
  if (s.startsWith("/")) return s;
  return "/" + s.replace(/^\/+/, "");
}

/* Back-compat alias — older code imports hashHref. Now returns a clean path
   instead of "#/foo". Any caller appending "?..." or "#..." to the result
   still produces a valid URL. */
export const hashHref = href;

/* Programmatic navigation helper for code that doesn't have access to the
   useRoute hook (e.g. event handlers in plain functions). */
export function navigate(path) {
  if (typeof window === "undefined") return;
  const cleaned = (path || "").startsWith("/")
    ? path
    : "/" + (path || "").replace(/^\/+/, "");
  if (cleaned === window.location.pathname + window.location.search + window.location.hash) return;
  window.history.pushState(null, "", cleaned);
  emitPopstate();
}
