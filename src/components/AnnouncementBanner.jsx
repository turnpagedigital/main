import React from "react";
import LanguageSelector from "./LanguageSelector.jsx";
import alertsData from "../data/alerts.json";

/* Thin promo bar above the nav.
   Reads from src/data/alerts.json — edit via /#/admin → Alerts tab.
   Shows the first active alert whose 'pages' array includes the current page. */

export default function AnnouncementBanner({ page = "home" }) {
  const alert = (alertsData.alerts || []).find(
    a => a.active && Array.isArray(a.pages) && a.pages.includes(page)
  );

  if (!alert) return null;

  return (
    <div className="ann-banner" role="region" aria-label="Latest update">
      <div className="ann-banner-inner">
        <div className="ann-banner-content">
          {alert.pill && <span className="ann-banner-pill">{alert.pill}</span>}
          <span>{alert.text}</span>
          {alert.href && alert.linkText && (
            <a href={alert.href} aria-label={alert.linkText}>
              {alert.linkText} →
            </a>
          )}
        </div>
        <div className="ann-banner-region">
          <LanguageSelector direction="down" fontSize="0.78rem" />
        </div>
      </div>
    </div>
  );
}
