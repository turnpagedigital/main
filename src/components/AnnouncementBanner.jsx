import React, { useState, useEffect } from "react";
import LanguageSelector from "./LanguageSelector.jsx";
import alertsData from "../data/alerts.json";

/* Thin promo bar above the nav.
   Reads from src/data/alerts.json — edit via /admin → Alerts tab.
   When multiple active alerts match the current page they rotate every 10 s
   with a short fade transition. Single alerts show statically. */

/* Legacy alert hrefs may use hash-style paths ("#/briefings/foo"). Rewrite
   them to clean paths so SPA click interception can pick them up. */
function normalizeHref(u) {
  if (!u) return u;
  const s = String(u).trim();
  if (s.startsWith("#/")) return s.slice(1) || "/";
  return s;
}

const ROTATE_MS  = 10_000; // time each alert is shown
const FADE_MS    = 300;    // fade-out duration before swapping

export default function AnnouncementBanner({ page = "home" }) {
  const alerts = (alertsData.alerts || []).filter(
    a => a.active && Array.isArray(a.pages) && a.pages.includes(page)
  );

  const [idx,    setIdx]    = useState(0);
  const [fading, setFading] = useState(false);

  // Rotation — only runs when there are multiple alerts for this page
  useEffect(() => {
    if (alerts.length <= 1) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % alerts.length);
        setFading(false);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [alerts.length]); // alerts is a static import — length never changes at runtime

  if (alerts.length === 0) return null;

  const alert = alerts[Math.min(idx, alerts.length - 1)];

  return (
    <div className="ann-banner" role="region" aria-label="Latest update">
      <div className="ann-banner-inner">
        <div
          className="ann-banner-content"
          style={{ opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
        >
          {alert.pill && <span className="ann-banner-pill">{alert.pill}</span>}
          <span>{alert.text}</span>
          {alert.href && alert.linkText && (
            <a href={normalizeHref(alert.href)} aria-label={alert.linkText}>
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
