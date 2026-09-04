import React, { useEffect, Suspense } from "react";
import { GLOBAL_CSS } from "./data/css.js";
import { FONT, DARK, TEXT } from "./data/tokens.js";
import { useRoute, navigate } from "./lib/router.js";
import { I18nProvider } from "./lib/i18n.js";
import { captureAttribution, trackPageView } from "./lib/analytics.js";
import AppHeader from "./components/AppHeader.jsx";
import Footer from "./components/Footer.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import pageMeta from "./data/page-meta.json";
import pageCompositions from "./data/page-compositions.json";
import routesData from "./data/routes.json";
import PageRenderer from "./components/PageRenderer.jsx";

// Page components are lazy-loaded so each route becomes its own chunk.
// Only downloaded when the user first navigates to that page.
const Home             = React.lazy(() => import("./pages/Home.jsx"));
const Copyright        = React.lazy(() => import("./pages/Copyright.jsx"));
const Crypto           = React.lazy(() => import("./pages/Crypto.jsx"));
const Briefings        = React.lazy(() => import("./pages/Briefings.jsx"));
const Briefing         = React.lazy(() => import("./pages/Briefing.jsx"));
const Contact          = React.lazy(() => import("./pages/Contact.jsx"));
const Legal            = React.lazy(() => import("./pages/Legal.jsx"));
const FAQ              = React.lazy(() => import("./pages/FAQ.jsx"));
const NotFound         = React.lazy(() => import("./pages/NotFound.jsx"));
const Partners         = React.lazy(() => import("./pages/Partners.jsx"));
const Admin            = React.lazy(() => import("./pages/Admin.jsx"));
const Press            = React.lazy(() => import("./pages/Press.jsx"));
const LitigationFunding = React.lazy(() => import("./pages/LitigationFunding.jsx"));
const AIGuide          = React.lazy(() => import("./pages/AIGuide.jsx"));

function LoadingFallback() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      fontFamily: FONT,
      fontSize: "0.9rem",
      color: TEXT,
      background: DARK,
    }}>
      Loading…
    </div>
  );
}

const TITLES = {
  "home": "Turnpage Digital Markets — The OTC Desk for Rights Holders",
  "ai-copyright": "AI Copyright — Turnpage Digital Markets",
  "crypto": "Crypto Claims — Turnpage Digital Markets",
  "briefings": "Briefings — Turnpage Digital Markets",
  "briefing": "Briefing — Turnpage Digital Markets",
  "press": "Press & Publications — Turnpage Digital Markets",
  "litigation-finance": "Litigation Funding — Turnpage Digital Markets",
  "contact": "Get in Touch — Turnpage Digital Markets",
  "faq": "FAQ — Turnpage Digital Markets",
  "privacy": "Privacy Policy — Turnpage Digital Markets",
  "terms": "Terms of Use — Turnpage Digital Markets",
  "ai-guide": "AI Learning Bot Guide — Turnpage Digital Markets",
  "admin": "Admin — Turnpage Digital Markets",
};

// Pages that should NOT render the public marketing chrome (announcement
// bar, nav, footer). Admin is a standalone app shell.
const STANDALONE_PAGES = new Set(["admin"]);

/* Scroll to a section anchor, retrying while the target page mounts —
   lazy-loaded route chunks can take well over one tick on cold loads. */
function scrollToAnchor(id, attempt = 0) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (attempt < 30) setTimeout(() => scrollToAnchor(id, attempt + 1), 100);
}

export default function App() {
  const { route } = useRoute();

  // Inject global CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Update document title on route change
  useEffect(() => {
    const t = TITLES[route.page] || TITLES["home"];
    document.title = t;
  }, [route.page]);

  // Hide the Brevo chat bubble on admin pages (CSS rule in GLOBAL_CSS keys
  // off this class, so it applies even if the widget mounts later).
  useEffect(() => {
    document.documentElement.classList.toggle("tp-no-chat", route.page === "admin");
  }, [route.page]);

  // Ad-click attribution (utm_*/gclid → sessionStorage) — captured once at
  // boot; runs with or without analytics IDs configured.
  useEffect(() => {
    captureAttribution();
  }, []);

  // SPA page_view per route change. Inert until src/data/analytics.json has
  // a GA4 measurement ID. Runs after the title effect so GA sees the right
  // page_title.
  useEffect(() => {
    trackPageView();
  }, [route.page, route.slug]);

  // Site-wide <a> click interception. Any internal anchor with an href like
  // "/foo" triggers pushState instead of a full page reload, preserving SPA
  // behaviour without requiring a custom <Link> component at every call site.
  useEffect(() => {
    function onClick(e) {
      // Respect modifier keys, non-left clicks, default-prevented events
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Walk up to find an <a>
      let el = e.target;
      while (el && el !== document.body) {
        if (el.tagName === "A") break;
        el = el.parentNode;
      }
      if (!el || el.tagName !== "A") return;

      // Skip if the anchor opts out or targets a new window/download
      if (el.target && el.target !== "" && el.target !== "_self") return;
      if (el.hasAttribute("download")) return;
      if (el.getAttribute("rel") === "external") return;

      const href = el.getAttribute("href");
      if (!href) return;

      // External URLs (http://, https://, mailto:, tel:, etc.) — let browser handle
      if (/^[a-z]+:/i.test(href)) return;
      if (href.startsWith("//")) return;

      // Pure in-page anchors (#section) — let browser handle native scroll
      if (href.startsWith("#")) return;

      // Resolve relative paths against the current origin, then check same-origin
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      // Same-page anchor change (only hash differs) — let browser handle
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash &&
        url.hash !== window.location.hash
      ) {
        return;
      }

      // Intercept and navigate via pushState
      e.preventDefault();
      const path = url.pathname + url.search + url.hash;
      navigate(path);

      // If the URL has a #section anchor, scroll to it after the route renders
      // (retries while lazy page chunks load).
      if (url.hash) scrollToAnchor(url.hash.slice(1));
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Direct loads of an anchored URL (e.g. a shared /crypto#section link):
  // the browser can't scroll to an element React hasn't mounted yet.
  useEffect(() => {
    if (window.location.hash) scrollToAnchor(window.location.hash.slice(1));
  }, []);

  const standalone = STANDALONE_PAGES.has(route.page);

  return (
    <I18nProvider>
      {!standalone && <AppHeader currentPage={route.page} />}
      {/* Keyed by route so navigating away from a crashed page resets the
          boundary and clears the error instead of staying stuck on the fallback. */}
      <ErrorBoundary key={route.page + (route.slug || "")}>
        <Suspense fallback={<LoadingFallback />}>
          <main id="main-content">{renderPage(route)}</main>
        </Suspense>
      </ErrorBoundary>
      {!standalone && <Footer />}
    </I18nProvider>
  );
}

// Component registry — maps component names from routes.json to actual components
const COMPONENT_MAP = {
  "Home":               Home,
  "Copyright":          Copyright,
  "Crypto":             Crypto,
  "Briefings":          Briefings,
  "Briefing":           Briefing,
  "Contact":            Contact,
  "Legal":              Legal,
  "FAQ":                FAQ,
  "NotFound":           NotFound,
  "Partners":           Partners,
  "Admin":              Admin,
  "Press":              Press,
  "LitigationFunding":  LitigationFunding,
  "AIGuide":            AIGuide,
};

// Build PAGE_MAP dynamically from routes.json at import time.
// This makes routes admin-editable without changing this file.
// component: "DynamicPage" is a special sentinel that renders PageRenderer
// with the route key — used for pages created via admin without a code deploy.
const PAGE_MAP = {};
for (const route of routesData.routes) {
  if (route.component === "DynamicPage") {
    // Capture the key in the closure
    const key = route.key;
    PAGE_MAP[key] = () => <PageRenderer pageKey={key} />;
    continue;
  }

  const Comp = COMPONENT_MAP[route.component];
  if (!Comp) {
    console.error(`Component not found for route ${route.path}: ${route.component}`);
    continue;
  }

  // Handle routes that need special props (e.g., Legal component's legalkind prop)
  if (route.legalkind) {
    PAGE_MAP[route.key] = () => <Comp kind={route.legalkind} />;
  } else {
    PAGE_MAP[route.key] = () => <Comp />;
  }
}

// Build a set of page-keys whose active flag is false (from page-meta.json legacy system).
// Path "/" maps to page-key "home"; all other paths strip the leading "/".
const HIDDEN_PAGES = new Set(
  pageMeta.pages
    .filter(p => p.active === false)
    .map(p => (p.path === "/" ? "home" : p.path.replace(/^\//, ""))),
);

// Build a lookup of page-key → status from page-compositions.json.
// Draft and Archive both render 404. Active and missing entries are allowed through.
const COMPOSITION_STATUS = {};
for (const p of (pageCompositions.pages || [])) {
  if (p.pageKey && p.status) COMPOSITION_STATUS[p.pageKey] = p.status;
}

function renderPage(route) {
  // Dynamic route — briefing detail page receives a slug prop
  if (route.page === "briefing") return <Briefing slug={route.slug} />;

  // page-meta.json hidden pages → 404
  if (HIDDEN_PAGES.has(route.page)) return <NotFound />;

  // page-compositions.json status check — Draft and Archive render 404
  const compositionStatus = COMPOSITION_STATUS[route.page];
  if (compositionStatus === "draft" || compositionStatus === "archive") return <NotFound />;

  const factory = PAGE_MAP[route.page];
  if (factory) return factory();

  return <NotFound />;
}
