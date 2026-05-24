import { useState, useEffect } from "react";

/* Hash-based router. URL fragments look like:
     #/                       → home
     #/ai-copyright           → AI Copyright sub-brand
     #/crypto                 → Crypto Claims sub-brand
     #/briefings              → Briefings index
     #/briefings/SLUG         → single briefing
     #/contact                → Contact
     #/privacy                → Privacy
     #/terms                  → Terms
*/

export function parseHash(hash) {
  // Strip leading "#" and optional leading "/"
  let h = (hash || "").replace(/^#/, "").replace(/^\/+/, "");
  // Drop query string for routing purposes (we still expose it via the hash)
  h = h.split("?")[0];
  if (!h) return { page: "home", slug: null };

  const parts = h.split("/").filter(Boolean);
  if (parts[0] === "briefings" && parts[1]) {
    return { page: "briefing", slug: parts.slice(1).join("/") };
  }
  return { page: parts[0], slug: null };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(typeof window !== "undefined" ? window.location.hash : ""));

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash(window.location.hash));
      // Scroll to top on every navigation (unless the hash includes a section anchor)
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(path) {
    // Accept both "ai-copyright" and "/ai-copyright"
    const cleaned = (path || "").replace(/^\/+/, "");
    window.location.hash = "/" + cleaned;
  }

  return { route, navigate };
}

/* Helper for href="#/foo" links */
export function hashHref(path) {
  return "#/" + (path || "").replace(/^\/+/, "");
}
