import React, { useEffect, Suspense } from "react";
import { GLOBAL_CSS } from "./data/css.js";
import { FONT, DARK, TEXT } from "./data/tokens.js";
import { useHashRoute } from "./lib/router.js";
import { I18nProvider } from "./lib/i18n.js";
import AppHeader from "./components/AppHeader.jsx";
import Footer from "./components/Footer.jsx";

// Page components are lazy-loaded so each route becomes its own chunk.
// Only downloaded when the user first navigates to that page.
const Home             = React.lazy(() => import("./pages/Home.jsx"));
const AICopyright      = React.lazy(() => import("./pages/AICopyright.jsx"));
const Crypto           = React.lazy(() => import("./pages/Crypto.jsx"));
const Briefings        = React.lazy(() => import("./pages/Briefings.jsx"));
const Briefing         = React.lazy(() => import("./pages/Briefing.jsx"));
const Contact          = React.lazy(() => import("./pages/Contact.jsx"));
const Legal            = React.lazy(() => import("./pages/Legal.jsx"));
const NotFound         = React.lazy(() => import("./pages/NotFound.jsx"));
const Admin            = React.lazy(() => import("./pages/Admin.jsx"));
const Press            = React.lazy(() => import("./pages/Press.jsx"));
const LitigationFinance = React.lazy(() => import("./pages/LitigationFinance.jsx"));

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
  "litigation-finance": "Litigation Finance — Turnpage Digital Markets",
  "contact": "Get in Touch — Turnpage Digital Markets",
  "privacy": "Privacy Policy — Turnpage Digital Markets",
  "terms": "Terms of Use — Turnpage Digital Markets",
  "admin": "Admin — Turnpage Digital Markets",
};

// Pages that should NOT render the public marketing chrome (announcement
// bar, nav, footer). Admin is a standalone app shell.
const STANDALONE_PAGES = new Set(["admin"]);

export default function App() {
  const { route } = useHashRoute();

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

  const standalone = STANDALONE_PAGES.has(route.page);

  return (
    <I18nProvider>
      {!standalone && <AppHeader currentPage={route.page} />}
      <Suspense fallback={<LoadingFallback />}>
        <main>{renderPage(route)}</main>
      </Suspense>
      {!standalone && <Footer />}
    </I18nProvider>
  );
}

function renderPage(route) {
  switch (route.page) {
    case "home":           return <Home />;
    case "ai-copyright":   return <AICopyright />;
    case "crypto":         return <Crypto />;
    case "briefings":      return <Briefings />;
    case "briefing":       return <Briefing slug={route.slug} />;
    case "contact":        return <Contact />;
    case "privacy":        return <Legal kind="privacy" />;
    case "terms":          return <Legal kind="terms" />;
    case "press":               return <Press />;
    case "litigation-finance":  return <LitigationFinance />;
    case "admin":               return <Admin />;
    default:               return <NotFound />;
  }
}
