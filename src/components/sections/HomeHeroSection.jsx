import React from "react";
import { NEON, FONT } from "../../data/tokens.js";
import { useI18n } from "../../lib/i18n.js";

/* Full-screen video hero — Home page only.
   Content driven by sectionConfig.content from page-compositions.json.
   Text fields fall back to translation keys so multi-language support is preserved. */
export default function HomeHeroSection({ sectionConfig }) {
  const { t, lang } = useI18n();
  const c = (sectionConfig && sectionConfig.content) || {};
  // English: admin content wins so the page builder controls the copy.
  // Other languages: always use translations so switching language takes effect.
  const en = lang === "en";
  const title1       = en ? (c.title1    || t("hero.title_1"))   : t("hero.title_1");
  const title2       = en ? (c.title2    || t("hero.title_2"))   : t("hero.title_2");
  const subtitle     = en ? (c.subtitle  || t("hero.subtitle"))  : t("hero.subtitle");
  const ctaPrimary   = en
    ? (c.ctaPrimary  || { label: t("hero.cta_primary"),  href: "/contact" })
    : { ...(c.ctaPrimary  || { href: "/contact"    }), label: t("hero.cta_primary") };
  const ctaSecondary = en
    ? (c.ctaSecondary|| { label: t("hero.cta_secondary"), href: "#situations" })
    : { ...(c.ctaSecondary|| { href: "#situations" }), label: t("hero.cta_secondary") };
  // Background choice: "video", "image", or "default" (plain dark gradient).
  // Older compositions have no mediaType — infer from whether a video was set.
  const mediaType   = c.mediaType   || (c.video ? "video" : "default");
  const video       = mediaType === "video" ? (c.video || null) : null;
  const image       = mediaType === "image" ? (c.image || null) : null;

  return (
    <section className="home-hero" style={{
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
      padding: "0 clamp(1.5rem,5vw,4rem)",
      background: "#06070A",
    }}>
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #0A0C10 0%, #06070A 100%)",
      }} />
      {image && (
        <img
          src={image}
          alt=""
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{
            position: "absolute", inset: 0, zIndex: 1,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: 0.85, filter: "saturate(0.85) contrast(1.05)",
            pointerEvents: "none",
          }}
        />
      )}
      {video && (
        <video
          autoPlay muted loop playsInline preload="none"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{
            position: "absolute", inset: 0, zIndex: 1,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: 0.85, filter: "saturate(0.85) contrast(1.05)",
            pointerEvents: "none",
          }}
        >
          <source src={video} type="video/mp4" />
        </video>
      )}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, transparent 30%, transparent 45%, rgba(0,0,0,0.70) 100%)",
      }} />

      {/* Spacer that fills all available space above the content. flex-basis:0 always
          resolves; minHeight enforces the 25%-of-hero-height floor using svh units
          (25svh ≈ 25% of the hero's viewport-relative min-height, capped at 230px
          which is 25% of the 920px hero maximum). */}
      <div aria-hidden="true" style={{ flex: "1 0 0", minHeight: "min(25svh, 230px)" }} />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1440, width: "100%", margin: "0 auto", paddingBottom: "clamp(3rem,6vh,5rem)" }}>
        <h1 style={{
          fontFamily: FONT, fontWeight: 900,
          fontSize: "clamp(2.6rem, 7vw, 7rem)",
          lineHeight: 0.96, letterSpacing: "-0.04em",
          color: "#FFFFFF", marginBottom: "1.8rem",
          maxWidth: 1200,
        }}>
          {title1}<br />
          <span style={{ fontStyle: "italic", fontWeight: 800, color: NEON }}>{title2}</span>
        </h1>
        <p style={{
          fontFamily: FONT, fontSize: "clamp(1rem, 1.5vw, 1.3rem)",
          color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
          maxWidth: 720, marginBottom: "2.4rem",
        }}>
          {subtitle}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
          <a href={ctaPrimary.href} className="btn-neon">{ctaPrimary.label}</a>
          <a
            href={ctaSecondary.href}
            style={{
              fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600,
              color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em",
              padding: "1em 0", borderBottom: "1px solid rgba(255,255,255,0.4)",
              transition: "color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
          >
            {ctaSecondary.label} →
          </a>
        </div>
      </div>

      <div style={{
        position: "absolute", right: "clamp(1.5rem,5vw,4rem)", bottom: "2rem", zIndex: 10,
        fontFamily: FONT, fontSize: "0.7rem", fontWeight: 600,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.5)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
      }} className="hide-on-mobile">
        <span>{t("hero.scroll")}</span>
        <span style={{ width: 1, height: 36, background: "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)" }} />
      </div>

      <style>{`
        /* Desktop: fill the fold, but never balloon past 920px — on tall or
           portrait windows an uncapped viewport-based hero turns into a wall
           of empty video. The cap is what keeps resizing feeling smooth:
           every window shape converges to a bounded hero. */
        .home-hero { min-height: min(calc(100vh - 88px), 920px); }
        @supports (height: 1svh) {
          .home-hero { min-height: min(calc(100svh - 88px), 920px); }
        }
        /* Wide-landscape desktops (typical monitors/laptops): end the hero
           ~120px short of the fold so the stats band peeks in. */
        @media (min-aspect-ratio: 7/5) {
          .home-hero { min-height: min(calc(100vh - 208px), 920px); }
          @supports (height: 1svh) {
            .home-hero { min-height: min(calc(100svh - 208px), 920px); }
          }
        }
        /* In-between (tablets / narrow windows): these are often portrait,
           where viewport-based heights leave a wall of empty video above the
           bottom-anchored headline — cap harder. */
        @media (max-width: 1180px) {
          .home-hero { min-height: min(76vh, 720px); }
          @supports (height: 1svh) {
            .home-hero { min-height: min(76svh, 720px); }
          }
        }
        /* Phones: ~70% of the screen. The section still grows if translated
           copy needs more room. */
        @media (max-width: 760px) {
          .home-hero { min-height: min(70vh, 640px); }
          @supports (height: 1svh) {
            .home-hero { min-height: min(70svh, 640px); }
          }
        }
      `}</style>
    </section>
  );
}
