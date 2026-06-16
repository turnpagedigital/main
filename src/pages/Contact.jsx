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
