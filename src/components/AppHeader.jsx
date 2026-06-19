import React, { useState, useEffect, useRef } from "react";
import AnnouncementBanner from "./AnnouncementBanner.jsx";
import NavBar from "./NavBar.jsx";

/* Combined sticky header: announcement banner + nav.
   Pages render below; we render an inline-block spacer to push them down. */
export default function AppHeader({ currentPage }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const openRef = useRef(false);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { if (open) setHidden(false); }, [open]);

  useEffect(() => {
    function onScroll() {
      if (openRef.current) return;
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) < 4) return;
      setHidden(y > lastY.current && y > 80);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header
        className={hidden ? "app-header app-header--hidden" : "app-header"}
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100 }}
      >
        <AnnouncementBanner page={currentPage} />
        <NavBar currentPage={currentPage} open={open} onOpenChange={setOpen} />
      </header>
      {/* Spacer — height set wide to accommodate banner + nav.
         If the banner is removed, the page just has a bit of extra top space. */}
      <div aria-hidden style={{ height: 96 }} />
      <style>{`
        .app-header { transition: transform 0.3s ease; }
        @media (max-width: 768px) {
          .app-header--hidden { transform: translateY(-100%); }
        }
      `}</style>
    </>
  );
}
