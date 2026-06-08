import React from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";

/**
 * LiquidGlassCard — Premium glassmorphism component with liquid glass effect
 *
 * A high-end card component featuring:
 * - Heavy backdrop blur for glassmorphism
 * - Realistic liquid glass qualities (refraction, iridescence, caustics)
 * - Smooth hover animations
 * - Light and dark mode support
 * - Responsive and works over any background
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
        bg: "rgba(15, 15, 15, 0.4)",
        border: "rgba(255, 255, 255, 0.15)",
        title: "#fff",
        text: "rgba(255, 255, 255, 0.85)",
        subtitle: "rgba(255, 255, 255, 0.65)",
        glowColor: "rgba(212, 255, 0, 0.4)",
      }
    : {
        bg: "rgba(255, 255, 255, 0.65)",
        border: "rgba(255, 255, 255, 0.95)",
        title: INK,
        text: INK_60,
        subtitle: "rgba(10, 10, 10, 0.55)",
        glowColor: "rgba(212, 255, 0, 0.25)",
      };

  return (
    <div className={`liquid-glass-card ${className}`}>
      {/* Outer container with blur backdrop */}
      <div
        style={{
          position: "relative",
          background: colors.bg,
          border: `1.5px solid ${colors.border}`,
          borderRadius: "1.2rem",
          padding: "clamp(1.8rem, 3vw, 2.5rem)",
          backdropFilter: "blur(20px) saturate(200%)",
          WebkitBackdropFilter: "blur(20px) saturate(200%)",
          overflow: "hidden",
          transition: "all 0.5s cubic-bezier(0.23, 1, 0.320, 1)",
          willChange: "transform, box-shadow",
        }}
        className="glass-card-base"
      >
        {/* Animated background layers for liquid effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.6,
            background: `linear-gradient(135deg, ${colors.glowColor} 0%, transparent 50%, rgba(255,255,255,0.1) 100%)`,
            pointerEvents: "none",
            animation: "liquidShift 8s ease-in-out infinite",
          }}
        />

        {/* Inner glow refraction layer */}
        <div
          style={{
            position: "absolute",
            top: "-40%",
            right: "-20%",
            width: "60%",
            height: "60%",
            background: `radial-gradient(circle, ${colors.glowColor}, transparent 70%)`,
            opacity: 0,
            pointerEvents: "none",
            transition: "opacity 0.6s ease-out",
          }}
          className="glass-inner-glow"
        />

        {/* Subtle caustic effect lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            )`,
            pointerEvents: "none",
            opacity: 0.5,
          }}
        />

        {/* Content container */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {/* Icon if provided */}
          {icon && (
            <div
              style={{
                fontSize: "2.5rem",
                opacity: 0.9,
                marginBottom: "0.5rem",
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
              lineHeight: 1.7,
              margin: 0,
              marginTop: subtitle ? "-0.2rem" : "0.3rem",
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
            borderRadius: "1.2rem",
            background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)`,
            opacity: 0,
            pointerEvents: "none",
            transition: "opacity 0.6s ease-out",
          }}
          className="glass-shine"
        />
      </div>

      {/* Styles */}
      <style>{`
        .liquid-glass-card:hover .glass-card-base {
          transform: translateY(-8px) scale(1.02);
          box-shadow:
            0 25px 50px rgba(0, 0, 0, 0.15),
            0 0 40px ${colors.glowColor},
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .liquid-glass-card:hover .glass-inner-glow {
          opacity: 1;
          animation: glowPulse 1.5s ease-in-out infinite;
        }

        .liquid-glass-card:hover .glass-shine {
          opacity: 1;
        }

        @keyframes liquidShift {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(5px, -5px) rotate(1deg);
          }
          50% {
            transform: translate(-3px, 3px) rotate(-0.5deg);
          }
          75% {
            transform: translate(4px, 2px) rotate(0.5deg);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .liquid-glass-card:hover .glass-card-base {
            transform: translateY(-4px) scale(1.01);
          }
        }
      `}</style>
    </div>
  );
}
