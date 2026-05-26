import React, { useState, useEffect } from "react";
import LanguageSelector from "./LanguageSelector.jsx";
import alertsData from "../data/alerts.json";

/* Thin promo bar above the nav.
   Reads from src/data/alerts.json — edit via /#/admin → Alerts tab.
   When multiple active alerts match the current page they rotate every 10 s
   with a short fade transition. Single alerts show statically. */

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
            <a href={alert.href} aria-label={alert.linkText}>
              {alert.linkText} →
            </a>
          )}
        </div>
        {alerts.length > 1 && (
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0, marginRight: "0.5rem" }}>
            {alerts.map((_, i) => (
              <button
                key={i}
                onClick={() => { setFading(false); setIdx(i); }}
                aria-label={`Alert ${i + 1}`}
                style={{
                  width: i === idx ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === idx ? "#D4FF00" : "rgba(255,255,255,0.35)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transition: "width 0.3s ease, background 0.3s ease",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
        <div className="ann-banner-region">
          <LanguageSelector direction="down" fontSize="0.78rem" />
        </div>
      </div>
    </div>
  );
}
