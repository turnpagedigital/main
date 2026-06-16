import React, { useEffect, useState } from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../data/tokens.js";
import Hero from "../components/Hero.jsx";
import IntakeForm from "../components/IntakeForm.jsx";
import SocialLinks from "../components/SocialLinks.jsx";
import contactData from "../data/contact-form.json";

const SOURCE_SUBJECTS = {
  "ai-copyright": "ai-copyright",
  "crypto": "crypto",
  "briefings": "ai-copyright",
};

function readSourceFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search || "");
  return params.get("source") || "";
}

export default function Contact() {
  const [source, setSource] = useState(readSourceFromUrl);

  useEffect(() => {
    const onChange = () => setSource(readSourceFromUrl());
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  const defaultSubject = SOURCE_SUBJECTS[source] || "";

  const cd = contactData;
  const phoneHref = "tel:" + (cd.phone || "").replace(/\s+/g, "");

  return (
    <>
      <Hero
        eyebrow={cd.heading || "Get in Touch"}
        title={cd.titlePrefix || "Tell us about"}
        accentTitle={cd.accentText || "your claim."}
        subtitle={cd.subtitle || "48-hour response. Confidentiality default."}
      />

      <section className="surface-paper" style={{
        padding: "clamp(2.5rem,5vw,4rem) clamp(1.5rem,5vw,4rem) clamp(3rem,6vw,5rem)",
      }}>
        <div className="container contact-grid" style={{
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
                {labelForSource(source)} inquiry
              </div>
            )}
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              lineHeight: 1.1, letterSpacing: "-0.025em", color: INK,
              marginBottom: "1rem",
            }}>
              {cd.sidebarHeading || "Let's talk."}
            </h2>
            <p style={{
              fontFamily: FONT, fontSize: "1rem", color: INK_60,
              lineHeight: 1.65, marginBottom: "2rem",
            }}>
              {cd.sidebarIntro || "Every inquiry is read by a partner. NDA available on request."}
            </p>

            {/* Contact info — flat divider list */}
            <div style={{ borderTop: `1px solid ${LINE_STRONG}` }}>
              {cd.email && (
                <div style={{ padding: "1rem 0", borderBottom: `1px solid ${LINE_STRONG}` }}>
                  <p style={{
                    fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                    letterSpacing: "0.18em", textTransform: "uppercase",
                    color: INK_60, marginBottom: "0.35rem",
                  }}>Email</p>
                  <a href={`mailto:${cd.email}`} style={{
                    fontFamily: FONT, fontSize: "0.98rem", fontWeight: 600,
                    color: INK, borderBottom: `2px solid ${NEON}`, paddingBottom: 1,
                  }}>
                    {cd.email}
                  </a>
                </div>
              )}
              {cd.phone && (
                <div style={{ padding: "1rem 0", borderBottom: `1px solid ${LINE_STRONG}` }}>
                  <p style={{
                    fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                    letterSpacing: "0.18em", textTransform: "uppercase",
                    color: INK_60, marginBottom: "0.35rem",
                  }}>Phone</p>
                  <a href={phoneHref} style={{
                    fontFamily: FONT, fontSize: "0.98rem", fontWeight: 600,
                    color: INK, borderBottom: `2px solid ${NEON}`, paddingBottom: 1,
                  }}>
                    {cd.phone}
                  </a>
                </div>
              )}
              {(() => {
                const waLink = Array.isArray(cd.social_links)
                  ? cd.social_links.find(l => l.url?.includes("wa.me"))
                  : null;
                if (!waLink?.url) return null;
                return (
                  <div style={{ padding: "1rem 0", borderBottom: `1px solid ${LINE_STRONG}` }}>
                    <p style={{
                      fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                      letterSpacing: "0.18em", textTransform: "uppercase",
                      color: INK_60, marginBottom: "0.5rem",
                    }}>WhatsApp</p>
                    <a
                      href={waLink.url}
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
                      Chat on WhatsApp →
                    </a>
                  </div>
                );
              })()}
              {Array.isArray(cd.social_links) && cd.social_links.some(l => l.url) && (
                <div style={{ padding: "1rem 0", borderBottom: `1px solid ${LINE_STRONG}` }}>
                  <SocialLinks links={cd.social_links} dark={false} size={20} gap="0.3rem" />
                </div>
              )}
            </div>

            {cd.disclaimer && (
              <p style={{
                fontFamily: FONT, fontSize: "0.82rem", color: INK_60,
                lineHeight: 1.6, marginTop: "1.4rem",
              }}>
                {cd.disclaimer}
              </p>
            )}
          </div>

          {/* Form */}
          <div style={{
            borderTop: `3px solid ${NEON}`,
            background: "#fff",
            padding: "clamp(1.5rem,3vw,2.5rem)",
          }}>
            <IntakeForm source={source} defaultSubject={defaultSubject} />
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            .contact-grid { grid-template-columns: 1fr !important; }
            .contact-side { position: relative !important; top: 0 !important; }
          }
        `}</style>
      </section>
    </>
  );
}

function labelForSource(s) {
  if (s === "ai-copyright") return "AI Copyright";
  if (s === "crypto") return "Crypto Claims";
  if (s === "briefings") return "Briefings";
  return s;
}
