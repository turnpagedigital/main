import React, { useEffect, useState } from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../data/tokens.js";
import Hero from "../components/Hero.jsx";
import IntakeForm from "../components/IntakeForm.jsx";
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
          gap: "clamp(2rem,5vw,4rem)",
          alignItems: "start",
          maxWidth: 1100,
        }}>
          <div style={{ position: "sticky", top: 130 }} className="contact-side">
            {source && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.4rem 0.8rem", marginBottom: "1.2rem",
                background: NEON, color: INK,
                borderRadius: 50, fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
              }}>
                {labelForSource(source)} inquiry
              </div>
            )}
            <h2 style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              lineHeight: 1.15, letterSpacing: "-0.02em", color: INK,
              marginBottom: "1rem",
            }}>
              {cd.sidebarHeading || "Let's talk."}
            </h2>
            <p style={{
              fontFamily: FONT, fontSize: "1.02rem", color: INK_60,
              lineHeight: 1.65, marginBottom: "1.6rem",
            }}>
              {cd.sidebarIntro || "Every inquiry is read by a partner. NDA available on request."}
            </p>
            <div style={{
              padding: "1.2rem 1.4rem",
              background: "#fff",
              border: `1px solid ${LINE_STRONG}`, borderRadius: 14,
              marginBottom: "1.2rem",
            }}>
              {cd.email && (<>
                <p style={{
                  fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: INK_60, marginBottom: "0.5rem",
                }}>
                  Email
                </p>
                <a href={`mailto:${cd.email}`} style={{
                  fontFamily: FONT, fontSize: "1.05rem", fontWeight: 700,
                  color: INK, borderBottom: `2px solid ${NEON}`, paddingBottom: 2,
                }}>
                  {cd.email}
                </a>
              </>)}
              {cd.phone && (<>
                <p style={{
                  fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: INK_60, marginBottom: "0.5rem", marginTop: "1.2rem",
                }}>
                  Phone
                </p>
                <a href={phoneHref} style={{
                  fontFamily: FONT, fontSize: "1.05rem", fontWeight: 700,
                  color: INK, borderBottom: `2px solid ${NEON}`, paddingBottom: 2,
                }}>
                  {cd.phone}
                </a>
              </>)}
            </div>
            {cd.disclaimer && (
              <p style={{
                fontFamily: FONT, fontSize: "0.85rem", color: INK_60,
                lineHeight: 1.55,
              }}>
                {cd.disclaimer}
              </p>
            )}
          </div>

          <div style={{
            background: "#fff", border: `1px solid ${LINE_STRONG}`,
            borderRadius: 18, padding: "clamp(1.5rem,3vw,2.5rem)",
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
