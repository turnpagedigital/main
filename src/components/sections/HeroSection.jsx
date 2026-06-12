import React from "react";
import Hero from "../Hero.jsx";

/* Standard subpage hero wrapper — reads props from sectionConfig.content. */
export default function HeroSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const ctaPrimary   = c.ctaPrimary   || null;
  const ctaSecondary = c.ctaSecondary || null;
  // Background choice: "default" (black paper), "image", or "video".
  // Older compositions have no mediaType — infer from whether a video was set.
  const mediaType = c.mediaType || (c.video ? "video" : "default");

  return (
    <Hero
      eyebrow={c.eyebrow || ""}
      title={c.title || ""}
      accentTitle={c.accentTitle || ""}
      subtitle={c.subtitle || ""}
      size={c.size || "tall"}
      video={mediaType === "video" ? (c.video || null) : null}
      image={mediaType === "image" ? (c.image || null) : null}
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
