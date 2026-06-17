import React, { useState, useEffect } from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../../data/tokens.js";
import IntakeForm from "../IntakeForm.jsx";
import contactData from "../../data/contact-form.json";
import { useI18n } from "../../lib/i18n.js";

function readSourceFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search || "");
  return params.get("source") || "";
}

function labelForSource(s) {
  if (s === "ai-copyright") return "AI Copyright";
  if (s === "crypto") return "Crypto Claims";
  if (s === "briefings") return "Briefings";
  return s;
}

/* ── Variant definitions ──────────────────────────────────────────────────
   paper  (default) — cool gray section, white form card
   white             — white section, white form card with border
   image             — full-bleed background photo, sidebar text inverted,
                       form card is frosted-glass (light) so inputs stay readable
   glass             — cool gray section, form card is liquid glass
   ─────────────────────────────────────────────────────────────────────── */

function getSectionStyle(variant, bgImage) {
  const base = { padding: "clamp(2.5rem,5vw,4rem) clamp(1.5rem,5vw,4rem) clamp(3rem,6vw,5rem)" };
  if (variant === "image") {
    return { ...base, position: "relative", overflow: "hidden", background: "#000" };
  }
  return base;
}

function getSectionClass(variant) {
  if (variant === "white") return "surface-white";
  if (variant === "image") return "";
  return "surface-paper"; // paper + glass both use paper bg
}

function buildFormCardStyle(variant, styleOverride, radius, blurAmount) {
  const r = radius === "square" ? 2 : 12;
  const blur = blurAmount != null ? blurAmount : null;
  const basePad = { padding: "clamp(1.5rem,3vw,2.5rem)" };
  const effective = styleOverride || variant;

  if (effective === "glass" || effective === "liquid-glass") {
    const b = blur != null ? blur : 28;
    return { ...basePad, background: "rgba(255,255,255,0.38)", backdropFilter: `blur(${b}px) saturate(180%) brightness(1.08)`, WebkitBackdropFilter: `blur(${b}px) saturate(180%) brightness(1.08)`, border: "1px solid rgba(255,255,255,0.72)", borderRadius: r, boxShadow: "0 8px 40px rgba(0,0,0,0.09), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.04)" };
  }
  if (effective === "clear") {
    const b = blur != null ? blur : 30;
    return { ...basePad, background: "rgba(255,255,255,0.20)", backdropFilter: `blur(${b}px) saturate(160%)`, WebkitBackdropFilter: `blur(${b}px) saturate(160%)`, border: "1px solid rgba(255,255,255,0.45)", borderRadius: r, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" };
  }
  if (effective === "dark") {
    const b = blur != null ? blur : 20;
    return { ...basePad, background: "rgba(15,15,15,0.82)", backdropFilter: `blur(${b}px) saturate(150%)`, WebkitBackdropFilter: `blur(${b}px) saturate(150%)`, border: "1px solid rgba(255,255,255,0.1)", borderRadius: r, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" };
  }
  if (effective === "image") {
    const b = blur != null ? blur : 24;
    return { ...basePad, background: "rgba(255,255,255,0.88)", backdropFilter: `blur(${b}px) saturate(160%)`, WebkitBackdropFilter: `blur(${b}px) saturate(160%)`, border: "1px solid rgba(255,255,255,0.6)", borderRadius: r, boxShadow: "0 12px 48px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.95)" };
  }
  if (effective === "white") {
    return { ...basePad, background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: r, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" };
  }
  // paper (default)
  return { ...basePad, background: "#fff", borderRadius: r, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" };
}

/* Sidebar text colors adapt for dark (image) vs light (all others) */
function getSidebarColors(variant) {
  if (variant === "image") {
    return {
      heading: "#fff",
      body: "rgba(255,255,255,0.75)",
      divider: "rgba(255,255,255,0.15)",
      label: "rgba(255,255,255,0.55)",
      emailText: "#fff",
      emailUnderline: NEON,
      disclaimer: "rgba(255,255,255,0.5)",
    };
  }
  return {
    heading: INK,
    body: INK_60,
    divider: LINE_STRONG,
    label: INK_60,
    emailText: INK,
    emailUnderline: NEON,
    disclaimer: INK_60,
  };
}

export default function ContactSection({ sectionConfig }) {
  const { t, lang } = useI18n();
  const en = lang === "en";
  const c = (sectionConfig && sectionConfig.content) || {};
  const variant = c.variant || "paper";
  const bgImage = c.backgroundImage || "";
  const bgBrightness = c.backgroundBrightness != null && c.backgroundBrightness !== "" ? Number(c.backgroundBrightness) / 100 : 0.35;
  const formCardStyleOverride = c.formCardStyle || "";
  const formCardRadius = c.formCardRadius || "rounded";
  const formCardBlur = c.formCardBlur != null && c.formCardBlur !== "" ? Number(c.formCardBlur) : null;

  const [urlSource, setUrlSource] = useState(readSourceFromUrl);
  useEffect(() => {
    const onChange = () => setUrlSource(readSourceFromUrl());
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  const source = urlSource || c.defaultSource || "";

  const cd = contactData;
  // Section content overrides take priority over global contact-form.json values
  const email = c.email || cd.email || "";
  const sidebarHeading = en
    ? (c.sidebarHeading || cd.sidebarHeading || t("contact.heading"))
    : t("contact.heading");
  const sidebarIntro = en
    ? (c.sidebarIntro || cd.sidebarIntro || t("contact.intro"))
    : t("contact.intro");
  // WhatsApp: section override → global field → social_links fallback
  const waPhone = c.whatsapp || cd.whatsapp || "";
  const tgRaw = c.telegram || cd.telegram || "";
  const waLinkFallback = Array.isArray(cd.social_links) ? cd.social_links.find(l => l.url?.includes("wa.me"))?.url || "" : "";
  const tgLinkFallback = Array.isArray(cd.social_links) ? cd.social_links.find(l => l.url?.includes("t.me"))?.url || "" : "";
  const waUrl = waPhone ? `https://wa.me/${waPhone.replace(/\D/g, "")}` : waLinkFallback;
  const tgUrl = tgRaw ? (tgRaw.startsWith("http") ? tgRaw : `https://t.me/${tgRaw.replace(/^@/, "")}`) : tgLinkFallback;

  const sc = getSidebarColors(variant);
  const formCardStyle = buildFormCardStyle(variant, formCardStyleOverride, formCardRadius, formCardBlur);

  return (
    <section className={getSectionClass(variant)} style={getSectionStyle(variant, bgImage)}>

      {/* Background image layer (image variant only) */}
      {variant === "image" && bgImage && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: `brightness(${bgBrightness}) contrast(1.1)`,
        }} />
      )}
      {/* Fallback dark overlay when no image is set */}
      {variant === "image" && !bgImage && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#111" }} />
      )}

      <div className="container contact-grid" style={{
        position: "relative", zIndex: 1,
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr)",
        gap: "clamp(3rem,6vw,6rem)",
        alignItems: "start",
        maxWidth: 1100,
      }}>

        {/* Sidebar */}
        <div style={{ position: "sticky", top: 130 }} className="contact-side">
          {source && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.35rem 0.75rem", marginBottom: "1.4rem",
              background: NEON, color: INK,
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
            }}>
              {labelForSource(source)}{t("contact.inquiry_suffix")}
            </div>
          )}
          <h2 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            lineHeight: 1.1, letterSpacing: "-0.025em", color: sc.heading,
            marginBottom: "1rem",
          }}>
            {sidebarHeading}
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "1rem", color: sc.body,
            lineHeight: 1.65, marginBottom: "2rem",
          }}>
            {sidebarIntro}
          </p>

          {/* Contact info — flat divider list */}
          <div style={{ borderTop: `1px solid ${sc.divider}` }}>
            {email && (
              <div style={{ padding: "1rem 0", borderBottom: `1px solid ${sc.divider}` }}>
                <p style={{
                  fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: sc.label, marginBottom: "0.35rem",
                }}>{t("contact.email_label")}</p>
                <a href={`mailto:${email}`} style={{
                  fontFamily: FONT, fontSize: "0.98rem", fontWeight: 600,
                  color: sc.emailText, borderBottom: `2px solid ${sc.emailUnderline}`, paddingBottom: 1,
                }}>
                  {email}
                </a>
              </div>
            )}
            {tgUrl && (
              <div style={{ padding: "1rem 0", borderBottom: `1px solid ${sc.divider}` }}>
                <p style={{
                  fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: sc.label, marginBottom: "0.5rem",
                }}>Telegram</p>
                <a
                  href={tgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.55rem",
                    fontFamily: FONT, fontSize: "1rem", fontWeight: 700,
                    color: "#229ED9", textDecoration: "none",
                  }}
                >
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  {t("contact.telegram_action")}
                </a>
              </div>
            )}
            {waUrl && (
              <div style={{ padding: "1rem 0", borderBottom: `1px solid ${sc.divider}` }}>
                <p style={{
                  fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: sc.label, marginBottom: "0.5rem",
                }}>WhatsApp</p>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.55rem",
                    fontFamily: FONT, fontSize: "1rem", fontWeight: 700,
                    color: "#25D366", textDecoration: "none",
                  }}
                >
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.557 4.116 1.529 5.843L.057 23.404a.5.5 0 0 0 .539.545l5.686-1.453A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.802 9.802 0 0 1-4.964-1.348l-.354-.21-3.673.938.975-3.553-.232-.367A9.806 9.806 0 0 1 2.182 12c0-5.414 4.404-9.818 9.818-9.818 5.414 0 9.818 4.404 9.818 9.818 0 5.414-4.404 9.818-9.818 9.818z"/>
                  </svg>
                  {t("contact.whatsapp_action")}
                </a>
              </div>
            )}
          </div>

          {cd.disclaimer && (
            <p style={{
              fontFamily: FONT, fontSize: "0.82rem", color: sc.disclaimer,
              lineHeight: 1.6, marginTop: "1.4rem",
            }}>
              {cd.disclaimer}
            </p>
          )}
        </div>

        {/* Form card */}
        <div style={formCardStyle}>
          <IntakeForm source={source} />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .contact-grid { grid-template-columns: 1fr !important; }
          .contact-side { position: relative !important; top: 0 !important; }
        }
      `}</style>
    </section>
  );
}
