import React from "react";
import { FONT, INK, INK_60 } from "../data/tokens.js";

/**
 * LiquidGlassCard — Minimal, refined glassmorphism (Apple neumorphism style)
 *
 * A clean, understated card component featuring:
 * - Subtle, transparent glass (very clear, minimal opacity)
 * - Thin, neutral borders (gray/white, no color accents)
 * - Smooth rounded corners with soft shadow depth
 * - Minimal, refined aesthetic
 * - Light and dark mode support
 * - Works beautifully over any background
 *
 * Props:
 *   title: string          — Main heading
 *   description: string    — Body text
 *   subtitle?: string      — Optional secondary text
 *   icon?: React.ReactNode — Optional icon/image to display
 *   variant?: "light" | "dark" — Theme variant (default: "light")
 *   className?: string     — Additional CSS classes
 */
export default function LiquidGlassCard({
  title,
  description,
  subtitle,
  icon,
  variant = "light",
  className = "",
}) {
  const isDark = variant === "dark";

  const colors = isDark
    ? {
        bg: "rgba(255, 255, 255, 0.08)",
        border: "rgba(255, 255, 255, 0.15)",
        title: "#fff",
        text: "rgba(255, 255, 255, 0.75)",
        subtitle: "rgba(255, 255, 255, 0.55)",
        shadow: "rgba(0, 0, 0, 0.2)",
      }
    : {
        bg: "rgba(255, 255, 255, 0.45)",
        border: "rgba(180, 180, 200, 0.4)",
        title: INK,
        text: INK_60,
        subtitle: "rgba(10, 10, 10, 0.45)",
        shadow: "rgba(0, 0, 0, 0.08)",
      };

  return (
    <div className={`liquid-glass-card ${className}`}>
      {/* Card container */}
      <div
        style={{
          position: "relative",
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: "2rem",
          padding: "clamp(1.8rem, 3vw, 2.5rem)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          overflow: "hidden",
          transition: "all 0.3s ease-out",
          willChange: "transform, box-shadow",
          boxShadow: `
            0 2px 8px ${colors.shadow},
            0 8px 24px ${colors.shadow},
            inset 0 1px 0 rgba(255, 255, 255, ${isDark ? 0.08 : 0.3})
          `,
        }}
        className="glass-card-base"
      >
        {/* Content container */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem",
          }}
        >
          {/* Icon if provided */}
          {icon && (
            <div
              style={{
                fontSize: "2.5rem",
                opacity: 0.85,
                marginBottom: "0.2rem",
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
                opacity: 0.8,
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
              lineHeight: 1.65,
              margin: 0,
              marginTop: subtitle ? "-0.1rem" : "0.1rem",
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .liquid-glass-card:hover .glass-card-base {
          transform: translateY(-4px);
          box-shadow:
            0 4px 12px ${colors.shadow},
            0 12px 32px ${colors.shadow},
            inset 0 1px 0 rgba(255, 255, 255, ${isDark ? 0.12 : 0.4});
        }

        @media (max-width: 768px) {
          .liquid-glass-card:hover .glass-card-base {
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
}
