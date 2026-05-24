import React, { useEffect } from "react";
import { GLOBAL_CSS } from "./data/css.js";
import { useHashRoute } from "./lib/router.js";
import { I18nProvider } from "./lib/i18n.js";
import AppHeader from "./components/AppHeader.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import AICopyright from "./pages/AICopyright.jsx";
import Crypto from "./pages/Crypto.jsx";
import Briefings from "./pages/Briefings.jsx";
import Briefing from "./pages/Briefing.jsx";
import Contact from "./pages/Contact.jsx";
import Legal from "./pages/Legal.jsx";
import NotFound from "./pages/NotFound.jsx";
import Admin from "./pages/Admin.jsx";

const TITLES = {
  "home": "Turnpage Digital Markets — The OTC Desk for Rights Holders",
  "ai-copyright": "AI Copyright — Turnpage Digital Markets",
  "crypto": "Crypto Claims — Turnpage Digital Markets",
  "briefings": "Briefings — Turnpage Digital Markets",
  "briefing": "Briefing — Turnpage Digital Markets",
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

  const Page = renderPage(route);
  const standalone = STANDALONE_PAGES.has(route.page);

  return (
    <I18nProvider>
      {!standalone && <AppHeader currentPage={route.page} />}
      <main>{Page}</main>
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
    case "admin":          return <Admin />;
    default:               return <NotFound />;
  }
}
