import React, { useId } from "react";
import { FONT, INK, INK_60, RADIUS_GLASS, RADIUS_GLASS_SQUARE } from "../data/tokens.js";

/**
 * LiquidGlassCard — Apple "Liquid Glass" style card.
 *
 * Not uniform frosted blur: behaves like a lens —
 * - edge ring REFRACTS the backdrop (SVG displacement via backdrop-filter,
 *   Chromium; Safari falls back to a clean frosted ring)
 * - clearer, color-boosted center (light blur + saturate)
 * - specular rim highlights top/bottom + a soft diagonal glare
 * - slow internal "liquid" drift so the card stays alive on flat
 *   backgrounds where backdrop blur has nothing to grab
 * - hover: lift + glare sweep (disabled under prefers-reduced-motion)
 *
 * Props:
 *   title: string          — Main heading
 *   description: string    — Body text
 *   subtitle?: string      — Optional secondary text
 *   icon?: React.ReactNode — Optional icon/image to display
 *   variant?: "light" | "dark" — Theme variant (default: "light")
 *   radius?: "rounded" | "square" — Corner style (default: "rounded"; square = 1px)
 *   className?: string     — Additional CSS classes
 */
export default function LiquidGlassCard({
  title,
  description,
  subtitle,
  icon,
  variant = "light",
  radius = "rounded",
  blurAmount,
  className = "",
}) {
  const isDark = variant === "dark";
  // useId emits ":r1:" — strip the colons so url(#id) stays valid
  const filterId = "lg-refract-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const colors = isDark
    ? {
        tint: "rgba(255, 255, 255, 0.055)",
        border: "rgba(255, 255, 255, 0.22)",
        title: "#fff",
        text: "rgba(255, 255, 255, 0.78)",
        subtitle: "rgba(255, 255, 255, 0.55)",
        shadow: "rgba(0, 0, 0, 0.35)",
        rimTop: "rgba(255, 255, 255, 0.38)",
        rimBottom: "rgba(255, 255, 255, 0.10)",
      }
    : {
        tint: "rgba(255, 255, 255, 0.28)",
        border: "rgba(255, 255, 255, 0.65)",
        title: INK,
        text: INK_60,
        subtitle: "rgba(10, 10, 10, 0.45)",
        shadow: "rgba(10, 10, 30, 0.16)",
        rimTop: "rgba(255, 255, 255, 0.85)",
        rimBottom: "rgba(255, 255, 255, 0.35)",
      };

  const variantClass = isDark ? "lg-card--dark" : "lg-card--light";
  const layer = {
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    pointerEvents: "none",
  };

  return (
    <div className={`liquid-glass-card ${variantClass} ${className}`} style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: "clamp(180px, 18vw, 280px)" }}>
      {/* Displacement filter for the refractive edge ring (Chromium).
          Browsers that can't use SVG filters in backdrop-filter ignore the
          inline declaration and keep the frosted fallback from CSS. */}
      <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="2" seed="92" />
          <feGaussianBlur stdDeviation="1.6" />
          <feDisplacementMap in="SourceGraphic" scale="72" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div
        className="glass-card-base"
        style={{
          position: "relative",
          isolation: "isolate",
          overflow: "hidden",
          borderRadius: radius === "square" ? RADIUS_GLASS_SQUARE : RADIUS_GLASS,
          border: `1px solid ${colors.border}`,
          padding: "clamp(1.8rem, 3vw, 2.5rem)",
          transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease",
          boxShadow: `0 2px 8px ${colors.shadow}, 0 14px 34px ${colors.shadow}`,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 1 — internal liquid drift (life on flat backgrounds) */}
        <div className="lg-drift" style={{ ...layer, zIndex: 0 }} />

        {/* 2 — lens center: light blur, boosted color */}
        <div className="lg-frost" style={{
          ...layer, zIndex: 1, background: colors.tint,
          ...(blurAmount != null && blurAmount !== "" && {
            backdropFilter: `blur(${Math.round(Number(blurAmount) * 0.45)}px) saturate(1.7) brightness(1.04)`,
            WebkitBackdropFilter: `blur(${Math.round(Number(blurAmount) * 0.45)}px) saturate(1.7) brightness(1.04)`,
          })
        }} />

        {/* 3 — refractive edge ring (masked to the rim) */}
        <div
          className="lg-bend"
          style={{
            ...layer,
            zIndex: 2,
            backdropFilter: `blur(${(blurAmount != null && blurAmount !== "") ? Number(blurAmount) : 5}px) saturate(1.8) url(#${filterId})`,
          }}
        />

        {/* 4 — specular rims + diagonal glare */}
        <div
          className="lg-shine"
          style={{
            ...layer,
            zIndex: 3,
            boxShadow: `inset 0 1px 0 ${colors.rimTop}, inset 0 -1px 0 ${colors.rimBottom}`,
          }}
        />

        {/* 5 — content */}
        <div style={{ position: "relative", zIndex: 4, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {icon && (
            <div style={{ fontSize: "2.5rem", opacity: 0.85, marginBottom: "0.2rem" }}>
              {icon}
            </div>
          )}

          <h3 style={{
            fontFamily: FONT,
            fontSize: "clamp(1.3rem, 2.2vw, 1.6rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: colors.title,
            margin: 0,
            lineHeight: 1.15,
          }}>
            {title}
          </h3>

          {subtitle && (
            <p style={{
              fontFamily: FONT,
              fontSize: "0.85rem",
              color: colors.subtitle,
              margin: 0,
              fontWeight: 500,
              opacity: 0.8,
            }}>
              {subtitle}
            </p>
          )}

          <p style={{
            fontFamily: FONT,
            fontSize: "0.95rem",
            color: colors.text,
            lineHeight: 1.65,
            margin: 0,
            marginTop: subtitle ? "-0.1rem" : "0.1rem",
          }}>
            {description}
          </p>
        </div>
      </div>

      <style>{`
        /* Lens center — light blur so the middle stays readable/clear */
        .liquid-glass-card .lg-frost {
          backdrop-filter: blur(3px) saturate(1.7) brightness(1.04);
          -webkit-backdrop-filter: blur(6px) saturate(1.7) brightness(1.04);
        }

        /* Edge ring — frosted fallback; the inline url() declaration upgrades
           this to true refraction in Chromium. Masked to the rim so the
           center stays lens-clear. */
        .liquid-glass-card .lg-bend {
          backdrop-filter: blur(6px) saturate(1.8);
          -webkit-backdrop-filter: blur(10px) saturate(1.8);
          mask-image: radial-gradient(140% 140% at 50% 50%, transparent 52%, black 78%);
          -webkit-mask-image: radial-gradient(140% 140% at 50% 50%, transparent 52%, black 78%);
        }

        /* Diagonal glare strip, swept on hover */
        .liquid-glass-card .lg-shine::before {
          content: "";
          position: absolute;
          inset: -40% -60%;
          background: linear-gradient(115deg,
            transparent 38%,
            rgba(255, 255, 255, 0.16) 47%,
            rgba(255, 255, 255, 0.30) 50%,
            rgba(255, 255, 255, 0.16) 53%,
            transparent 62%);
          transform: translateX(-36%);
          transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .liquid-glass-card:hover .lg-shine::before { transform: translateX(30%); }

        /* Corner glints */
        .liquid-glass-card .lg-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(38% 26% at 12% 0%, rgba(255, 255, 255, 0.28), transparent 70%),
            radial-gradient(30% 22% at 92% 104%, rgba(255, 255, 255, 0.14), transparent 70%);
        }

        /* Internal liquid drift — oversized blurred blobs, clipped by the card */
        .liquid-glass-card .lg-drift {
          inset: -35%;
          filter: blur(28px);
          animation: lgDrift 16s ease-in-out infinite alternate;
        }
        .lg-card--dark .lg-drift {
          background:
            radial-gradient(42% 36% at 22% 18%, rgba(212, 255, 0, 0.10), transparent 70%),
            radial-gradient(38% 42% at 82% 86%, rgba(130, 190, 255, 0.09), transparent 70%);
        }
        .lg-card--light .lg-drift {
          background:
            radial-gradient(42% 36% at 22% 18%, rgba(255, 255, 255, 0.55), transparent 70%),
            radial-gradient(38% 42% at 82% 86%, rgba(212, 255, 0, 0.10), transparent 70%);
        }

        @keyframes lgDrift {
          0%   { transform: translate(0%, 0%) rotate(0deg); }
          50%  { transform: translate(7%, -5%) rotate(4deg); }
          100% { transform: translate(-6%, 6%) rotate(-4deg); }
        }

        /* Hover lift */
        .liquid-glass-card:hover .glass-card-base { transform: translateY(-5px) scale(1.012); }
        .lg-card--dark:hover .glass-card-base {
          box-shadow: 0 4px 14px rgba(0,0,0,0.4), 0 22px 48px rgba(0,0,0,0.45);
        }
        .lg-card--light:hover .glass-card-base {
          box-shadow: 0 4px 14px rgba(10,10,30,0.18), 0 22px 48px rgba(10,10,30,0.22);
        }

        @media (max-width: 768px) {
          .liquid-glass-card:hover .glass-card-base { transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .liquid-glass-card .lg-drift { animation: none; }
          .liquid-glass-card .lg-shine::before { transition: none; }
          .liquid-glass-card:hover .glass-card-base { transform: none; }
        }
      `}</style>
    </div>
  );
}
