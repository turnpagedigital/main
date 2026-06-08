import React from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";

/**
 * LiquidGlassCard — Apple-style frosted glassmorphism with gradient accents
 *
 * A premium card component featuring:
 * - Thick frosted glass appearance with high opacity
 * - Colored gradient accent borders (neon glow)
 * - Smooth rounded corners with subtle depth
 * - Minimal animation, premium static feel
 * - Light and dark mode support
 * - Works over any background
 *
 * Props:
 *   title: string          — Main heading
 *   description: string    — Body text
 *   subtitle?: string      — Optional secondary text
 *   icon?: React.ReactNode — Optional icon/image to display
 *   variant?: "light" | "dark" — Theme variant (default: "light")
 *   accentColor?: string   — Gradient accent color (default: NEON)
 *   className?: string     — Additional CSS classes
 */
export default function LiquidGlassCard({
  title,
  description,
  subtitle,
  icon,
  variant = "light",
  accentColor = NEON,
  className = "",
}) {
  const isDark = variant === "dark";

  const colors = isDark
    ? {
        bg: "rgba(30, 30, 35, 0.75)",
        border: "rgba(255, 255, 255, 0.12)",
        title: "#fff",
        text: "rgba(255, 255, 255, 0.8)",
        subtitle: "rgba(255, 255, 255, 0.6)",
      }
    : {
        bg: "rgba(255, 255, 255, 0.75)",
        border: "rgba(255, 255, 255, 0.9)",
        title: INK,
        text: INK_60,
        subtitle: "rgba(10, 10, 10, 0.5)",
      };

  return (
    <div className={`liquid-glass-card ${className}`}>
      {/* Outer container with frosted glass effect */}
      <div
        style={{
          position: "relative",
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: "1.6rem",
          padding: "clamp(1.8rem, 3vw, 2.5rem)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          overflow: "hidden",
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          willChange: "transform, box-shadow",
          boxShadow: `0 8px 32px rgba(0, 0, 0, ${isDark ? 0.3 : 0.08}),
                      inset 0 1px 0 rgba(255, 255, 255, ${isDark ? 0.1 : 0.4})`,
        }}
        className="glass-card-base"
      >
        {/* Colored gradient accent — top-right corner glow */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            background: `radial-gradient(circle, ${accentColor}, transparent 70%)`,
            opacity: 0.25,
            pointerEvents: "none",
            filter: "blur(40px)",
          }}
        />

        {/* Subtle top accent bar with gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />

        {/* Frosted glass texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1), transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05), transparent 50%)
            `,
            pointerEvents: "none",
          }}
        />

        {/* Content container */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          {/* Icon if provided */}
          {icon && (
            <div
              style={{
                fontSize: "2.5rem",
                opacity: 0.9,
                marginBottom: "0.3rem",
              }}
            >
              {icon}
            </div>
          )}

          {/* Title */}
          <h3
            style={{
              fontFamily: FONT,
              fontSize: "clamp(1.3rem, 2.2vw, 1.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: colors.title,
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {title}
          </h3>

          {/* Subtitle if provided */}
          {subtitle && (
            <p
              style={{
                fontFamily: FONT,
                fontSize: "0.85rem",
                color: colors.subtitle,
                margin: 0,
                fontWeight: 500,
                opacity: 0.85,
              }}
            >
              {subtitle}
            </p>
          )}

          {/* Description */}
          <p
            style={{
              fontFamily: FONT,
              fontSize: "0.95rem",
              color: colors.text,
              lineHeight: 1.7,
              margin: 0,
              marginTop: subtitle ? "-0.1rem" : "0.2rem",
            }}
          >
            {description}
          </p>
        </div>

        {/* Hover shine effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "1.6rem",
            background: `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)`,
            opacity: 0,
            pointerEvents: "none",
            transition: "opacity 0.4s ease-out",
          }}
          className="glass-shine"
        />
      </div>

      {/* Styles */}
      <style>{`
        .liquid-glass-card:hover .glass-card-base {
          transform: translateY(-6px);
          box-shadow:
            0 16px 40px rgba(0, 0, 0, ${isDark ? 0.4 : 0.12}),
            inset 0 1px 0 rgba(255, 255, 255, ${isDark ? 0.15 : 0.5}),
            0 0 30px ${accentColor}40;
        }

        .liquid-glass-card:hover .glass-shine {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .liquid-glass-card:hover .glass-card-base {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}
