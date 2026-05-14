import React from "react";
import LanguageSelector from "./LanguageSelector.jsx";

/* Thin promo bar above the nav. Like OffDeal's Series A banner — used to
   feature the latest briefing, settlement, or news item.
   Edit the LATEST constant below to update. Set show=false to hide it. */

const LATEST = {
  show: true,
  pill: "Latest",
  text: "Bartz v. Anthropic fairness hearing — May 14, 2026",
  linkText: "Read the briefing",
  href: "#/briefings/2026-04-29-advisory",
};

export default function AnnouncementBanner() {
  if (!LATEST.show) return null;
  return (
    <div className="ann-banner" role="region" aria-label="Latest update">
      <div className="ann-banner-inner">
        <div className="ann-banner-content">
          <span className="ann-banner-pill">{LATEST.pill}</span>
          <span>{LATEST.text}</span>
          <a href={LATEST.href} aria-label={LATEST.linkText}>
            {LATEST.linkText} →
          </a>
        </div>
        <div className="ann-banner-region">
          <LanguageSelector direction="down" fontSize="0.78rem" />
        </div>
      </div>
    </div>
  );
}
