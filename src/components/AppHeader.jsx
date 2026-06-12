import React from "react";
import AnnouncementBanner from "./AnnouncementBanner.jsx";
import NavBar from "./NavBar.jsx";

/* Combined sticky header: announcement banner + nav.
   Pages render below; we render an inline-block spacer to push them down. */
export default function AppHeader({ currentPage }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      }}>
        <AnnouncementBanner page={currentPage} />
        <NavBar currentPage={currentPage} />
      </header>
      {/* Spacer — height set wide to accommodate banner + nav.
         If the banner is removed, the page just has a bit of extra top space. */}
      <div aria-hidden style={{ height: 96 }} />
    </>
  );
}
