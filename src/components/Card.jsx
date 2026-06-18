import React from "react";
import { hasValue } from "../lib/utils.js";
import { INK, INK_60, RADIUS_CARD, RADIUS_CARD_SQUARE } from "../data/tokens.js";

/**
 * Card — Flexible card component supporting multiple styles and corner radii
 *
 * Supports 8 card styles:
 *   - white: solid white background
 *   - black: solid black background
 *   - light-gray: solid light gray background
 *   - neon: bright green (#D4FF00) with black text
 *   - dark: semi-transparent dark glass
 *   - light-glass: subtle frosted glass
 *   - clear-glass: minimal frosted glass (most transparent)
 *   - neon-glass: bright green glass with black text
 *
 * And 2 corner styles:
 *   - rounded: smooth 5-10px corners (size-responsive)
 *   - square: no rounding
 *
 * Props:
 *   children: ReactNode       — Card content
 *   style?: "white" | "black" | "light-gray" | "neon" | "dark" | "light-glass" | "clear-glass" | "neon-glass" (default: "white")
 *   radius?: "rounded" | "square" (default: "rounded")
 *   isDarkMode?: boolean      — Adjust text colors for dark backgrounds (default: auto-detect)
 *   className?: string        — Additional CSS classes
 */
function applyBlurOverride(backdropStr, blurPx) {
  if (blurPx == null || blurPx === "" || !backdropStr) return backdropStr;
  return backdropStr.replace(/blur\([\d.]+px\)/, `blur(${Number(blurPx)}px)`);
}

export default function Card({
  children,
  style = "white",
  radius = "rounded",
  isDarkMode,
  blurAmount,
  brightness,
  className = "",
}) {
  // Auto-detect if we need light text (for dark card styles)
  // Neon styles always use black text, so exclude them from auto-detection
  const needsLightText =
    isDarkMode !== undefined
      ? isDarkMode
      : ["black", "dark"].includes(style) && !style.includes("neon");

  const cornerRadius = radius === "rounded" ? RADIUS_CARD : RADIUS_CARD_SQUARE;

  const styleConfigs = {
    white: {
      bg: "#ffffff",
      border: "rgba(0, 0, 0, 0.08)",
      textColor: INK,
      secondaryText: INK_60,
      shadow: "0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04)",
      hoverShadow: "0 4px 16px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)",
    },
    black: {
      bg: "#0a0a0a",
      border: "rgba(255, 255, 255, 0.08)",
      textColor: "#ffffff",
      secondaryText: "rgba(255, 255, 255, 0.65)",
      shadow: "0 2px 8px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)",
      hoverShadow: "0 4px 16px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3)",
    },
    "light-gray": {
      bg: "#f3f4f6",
      border: "rgba(0, 0, 0, 0.06)",
      textColor: INK,
      secondaryText: INK_60,
      shadow: "0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.02)",
      hoverShadow: "0 4px 16px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.05)",
    },
    dark: {
      bg: "rgba(15, 15, 15, 0.6)",
      border: "rgba(255, 255, 255, 0.1)",
      textColor: "#ffffff",
      secondaryText: "rgba(255, 255, 255, 0.7)",
      backdrop: "blur(20px) saturate(150%)",
      shadow: "0 2px 8px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)",
      hoverShadow: "0 4px 16px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2)",
    },
    "light-glass": {
      bg: "rgba(255, 255, 255, 0.45)",
      border: "rgba(180, 180, 200, 0.4)",
      textColor: INK,
      secondaryText: INK_60,
      backdrop: "blur(25px)",
      shadow: "0 2px 8px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
      hoverShadow: "0 4px 16px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
    },
    "clear-glass": {
      bg: "rgba(255, 255, 255, 0.25)",
      border: "rgba(200, 200, 220, 0.3)",
      textColor: "#000000",
      secondaryText: "rgba(0, 0, 0, 0.75)",
      backdrop: "blur(30px) saturate(200%)",
      shadow: "0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
      hoverShadow: "0 4px 16px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
    },
    neon: {
      bg: "#D4FF00",
      border: "rgba(0, 0, 0, 0.15)",
      textColor: "#0A0A0A",
      secondaryText: "rgba(10, 10, 10, 0.7)",
      shadow: "0 2px 8px rgba(212, 255, 0, 0.2), 0 4px 16px rgba(212, 255, 0, 0.12)",
      hoverShadow: "0 4px 16px rgba(212, 255, 0, 0.3), 0 8px 24px rgba(212, 255, 0, 0.18)",
    },
    "neon-glass": {
      bg: "rgba(212, 255, 0, 0.55)",
      border: "rgba(212, 255, 0, 0.6)",
      textColor: "#0A0A0A",
      secondaryText: "rgba(10, 10, 10, 0.75)",
      backdrop: "blur(25px)",
      shadow: "0 2px 8px rgba(212, 255, 0, 0.15), 0 4px 16px rgba(212, 255, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
      hoverShadow: "0 4px 16px rgba(212, 255, 0, 0.25), 0 8px 24px rgba(212, 255, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
    },
  };

  const baseConfig = styleConfigs[style] || styleConfigs.white;
  const config = {
    ...baseConfig,
    backdrop: applyBlurOverride(baseConfig.backdrop, blurAmount),
  };

  // Context-aware text colors for dark backgrounds
  const textColor = needsLightText
    ? config.textColor === INK
      ? "#ffffff"
      : config.textColor
    : config.textColor;

  const secondaryText = needsLightText
    ? config.secondaryText === INK_60
      ? "rgba(255, 255, 255, 0.7)"
      : config.secondaryText
    : config.secondaryText;

  return (
    <div
      className={`card-component ${className}`}
      style={{
        position: "relative",
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: cornerRadius,
        padding: "clamp(1.5rem, 2.5vw, 2.2rem)",
        backdropFilter: config.backdrop,
        WebkitBackdropFilter: config.backdrop,
        overflow: "hidden",
        transition: "all 0.3s ease-out",
        willChange: "transform, box-shadow",
        filter: hasValue(brightness) ? `brightness(${brightness}%)` : undefined,
        boxShadow: config.shadow,
        color: textColor,
        display: "flex",
        flexDirection: "column",
        minHeight: "clamp(180px, 18vw, 280px)",
      }}
    >
      {/* Provide color context via CSS variables for children */}
      <style>{`
        .card-component {
          --card-text-color: ${textColor};
          --card-secondary-text: ${secondaryText};
        }
        .card-component:hover {
          transform: translateY(-2px);
          box-shadow: ${config.hoverShadow};
        }
        @media (max-width: 768px) {
          .card-component:hover {
            transform: translateY(-1px);
          }
        }
      `}</style>

      {children}
    </div>
  );
}
