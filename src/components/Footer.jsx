import React from "react";
import { NEON, FONT } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";

const COL_DESKS = [
  { key: "ai-copyright", label: "AI Copyright" },
  { key: "crypto", label: "Crypto Claims" },
  { key: "contact", label: "Bankruptcy & Litigation" },
];
const COL_RESOURCES = [
  { key: "briefings", label: "Briefings" },
  { key: "ai-copyright", label: "Top 12 Cases", hashSuffix: "#cases-section" },
];
const COL_FIRM = [
  { key: "about", label: "About Turnpage" },
  { key: "contact", label: "Get in Touch" },
];
const COL_LEGAL = [
  { key: "privacy", label: "Privacy Policy" },
  { key: "terms", label: "Terms of Use" },
];

export default function Footer() {
  return (
    <footer style={{
      background: "#000",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      color: "#fff",
    }}>
      <div className="container" style={{ padding: "clamp(3rem,5vw,4.5rem) clamp(1.5rem,5vw,4rem) 2rem" }}>
        {/* Big brand row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) repeat(4, minmax(0,1fr))",
          gap: "clamp(1.5rem,3vw,2.4rem)",
          marginBottom: "3rem",
        }} className="footer-grid">
          {/* Brand */}
          <div>
            <img
              src="/Logotype green.png"
              alt="Turnpage Digital Markets"
              style={{ height: 32, marginBottom: "1.2rem" }}
            />
            <p style={{
              fontFamily: FONT, fontSize: "0.92rem", lineHeight: 1.65,
              color: "rgba(255,255,255,0.6)", maxWidth: 340, marginBottom: "1.4rem",
            }}>
              The OTC desk for rights holders. Capital and advisory across the largest class actions, bankruptcies, and complex litigation in the world.
            </p>
            <a
              href="mailto:info@turnpagedigital.com"
              style={{
                display: "inline-block",
                fontFamily: FONT, fontSize: "0.88rem",
                color: NEON, fontWeight: 600,
                borderBottom: `1px solid rgba(212,255,0,0.3)`, paddingBottom: 2,
              }}
            >
              info@turnpagedigital.com
            </a>
          </div>

          <FooterCol title="Desks" items={COL_DESKS} />
          <FooterCol title="Resources" items={COL_RESOURCES} />
          <FooterCol title="Firm" items={COL_FIRM} />
          <FooterCol title="Legal" items={COL_LEGAL} />
        </div>

        {/* Big tagline word — wordmark style flourish */}
        <div style={{
          padding: "1.5rem 0 2rem", borderTop: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "1.5rem",
        }}>
          <p style={{
            fontFamily: FONT, fontWeight: 900,
            fontSize: "clamp(2.2rem,6.5vw,5rem)",
            color: "rgba(255,255,255,0.06)",
            letterSpacing: "-0.04em", lineHeight: 1,
            textTransform: "uppercase", textAlign: "center",
          }}>
            Turnpage Digital Markets
          </p>
        </div>

        {/* Bottom row */}
        <div style={{
          paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexWrap: "wrap", gap: "1rem",
          justifyContent: "space-between", alignItems: "center",
        }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", letterSpacing: "0.18em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
          }}>
            &copy; 2026 Turnpage Digital Markets LLC
          </p>
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem",
            color: "rgba(255,255,255,0.4)", maxWidth: 560, textAlign: "right",
          }}>
            Information on this site is general in nature and is not legal, tax, or investment advice.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-grid > div:first-child { grid-column: 1 / -1; }
        }
      `}</style>
    </footer>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
        letterSpacing: "0.2em", textTransform: "uppercase",
        color: NEON, marginBottom: "1.1rem",
      }}>
        {title}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {items.map(item => (
          <li key={item.key + (item.hashSuffix || "")}>
            <a
              href={hashHref(item.key) + (item.hashSuffix || "")}
              style={{
                fontFamily: FONT, fontSize: "0.92rem",
                color: "rgba(255,255,255,0.72)", transition: "color 0.2s",
              }}
              onMouseEnter={e => { e.target.style.color = NEON; }}
              onMouseLeave={e => { e.target.style.color = "rgba(255,255,255,0.72)"; }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
