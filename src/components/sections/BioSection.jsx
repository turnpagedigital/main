import React from "react";
import { FONT, INK, INK_60, LINE, LINE_STRONG } from "../../data/tokens.js";
import SocialLinks from "../SocialLinks.jsx";
import bioData from "../../data/bio.json";

/* Leadership section. Content managed in Content → Bio. */
export default function BioSection() {
  return (
    <section id="team" style={{
      background: "#F4F5F7",
      padding: "clamp(4rem, 10vw, 10rem) clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${LINE}`,
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: INK_60, marginBottom: "1.5rem",
        }}>
          Leadership
        </p>
        <h2 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(2rem, 5vw, 4.4rem)",
          lineHeight: 0.98, letterSpacing: "-0.04em",
          color: INK, marginBottom: "clamp(3rem,6vw,5rem)",
        }}>
          Andrew Glantz
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
          gap: "clamp(2.5rem, 6vw, 6rem)",
          alignItems: "start",
        }} className="leadership-grid">
          <div>
            <div style={{
              aspectRatio: "4/5", width: "100%", maxWidth: 480,
              borderRadius: 8, overflow: "hidden",
              background: "#0A0A0A", border: `1px solid ${LINE_STRONG}`,
            }}>
              <img
                src={bioData.photo_url || "/andrew.png"}
                alt="Andrew Glantz, Founder & Managing Partner"
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }}
              />
            </div>

            {/* Name + title row with social icons right-aligned */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginTop: "1.2rem" }}>
              <div>
                <p style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: INK, letterSpacing: "0.01em" }}>
                  Andrew Glantz
                </p>
                <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: INK_60, marginTop: "0.2rem" }}>
                  Founder & Managing Partner
                </p>
              </div>
              {Array.isArray(bioData.social_links) && bioData.social_links.length > 0 && (
                <SocialLinks links={bioData.social_links} dark={false} size={20} gap="0.55rem" />
              )}
            </div>

            {/* Media logos below the name row */}
            {Array.isArray(bioData.media_logos) && bioData.media_logos.some(l => l.url) && (
              <div style={{ marginTop: "1.8rem" }}>
                <p style={{
                  fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  color: "rgba(10,10,10,0.55)", marginBottom: "1.1rem",
                }}>
                  As seen in
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "clamp(1rem, 2.5vw, 1.8rem)" }}>
                  {bioData.media_logos.filter(l => l.url).map((logo, i) => (
                    <img key={i} src={logo.url} alt={logo.name || ""} loading="lazy"
                      style={{ maxHeight: 24, height: "auto", maxWidth: 120, width: "auto", objectFit: "contain", filter: "grayscale(1)", opacity: 0.42, display: "block", flexShrink: 0 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <p style={{
              fontFamily: FONT, fontWeight: 800,
              fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
              lineHeight: 1.2, letterSpacing: "-0.02em",
              color: INK, marginBottom: "2rem",
            }}>
              {bioData.tagline_before}{" "}
              <span className="accent-light">{bioData.tagline_accent}</span>{" "}
              {bioData.tagline_after}
            </p>
            {(bioData.paragraphs || []).map((para, i, arr) => (
              <p key={i} style={{
                fontFamily: FONT, fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
                color: INK_60, lineHeight: 1.7,
                marginBottom: i < arr.length - 1 ? "1.2rem" : 0,
              }}>
                {para}
              </p>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 880px) {
            .leadership-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
          }
        `}</style>
      </div>
    </section>
  );
}
