import React from "react";
import Hero from "../Hero.jsx";

/* Standard subpage hero wrapper — reads props from sectionConfig.content. */
export default function HeroSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const ctaPrimary   = c.ctaPrimary   || null;
  const ctaSecondary = c.ctaSecondary || null;

  return (
    <Hero
      eyebrow={c.eyebrow || ""}
      title={c.title || ""}
      accentTitle={c.accentTitle || ""}
      subtitle={c.subtitle || ""}
      size={c.size || "tall"}
      video={c.video || null}
    >
      {(ctaPrimary || ctaSecondary) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          {ctaPrimary  && <a href={ctaPrimary.href}  className="btn-neon">{ctaPrimary.label}</a>}
          {ctaSecondary && <a href={ctaSecondary.href} className="btn-ghost">{ctaSecondary.label}</a>}
        </div>
      )}
    </Hero>
  );
}
