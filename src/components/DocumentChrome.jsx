import React from "react";
import { NEON, FONT, INK, INK_40, INK_60, LINE_STRONG } from "../data/tokens.js";

/* DocumentChrome — the minimal frame around a reference page.
 *
 * Case briefings exist to be read and cited, not to convert. Wrapping one in
 * the marketing header and footer puts "Copyright Claims", "Locked Crypto"
 * and "Talk to Us" around a document whose credibility depends on reading as
 * a record rather than a pitch — so those pages get this instead.
 *
 * What survives is attribution, not navigation: who published this, and the
 * legal pages any published document carries. There is deliberately no link
 * to a desk, a claim type, or an intake form.
 */
export default function DocumentChrome({ children }) {
  const link = {
    color: INK_60, textDecoration: "none", fontSize: "0.78rem",
  };

  return (
    <div style={{ fontFamily: FONT, background: "#E5E7EB", minHeight: "100vh" }}>
      <header style={{
        borderBottom: `1px solid ${LINE_STRONG}`,
        padding: "1.1rem clamp(1.25rem, 5vw, 4rem)",
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, background: NEON, display: "inline-block" }} />
            <span style={{
              fontSize: "0.9rem", fontWeight: 800, letterSpacing: "-0.01em", color: INK,
            }}>Turnpage Digital Markets</span>
          </a>
        </div>
      </header>

      {children}

      <footer style={{
        borderTop: `1px solid ${LINE_STRONG}`,
        padding: "1.6rem clamp(1.25rem, 5vw, 4rem) 2.4rem",
      }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto", display: "flex", flexWrap: "wrap",
          gap: "0.6rem 1.5rem", alignItems: "baseline", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "0.78rem", color: INK_40 }}>
            © {new Date().getFullYear()} Turnpage Digital Markets LLC
          </span>
          <nav style={{ display: "flex", gap: "1.25rem" }}>
            <a href="/privacy" style={link}>Privacy</a>
            <a href="/terms" style={link}>Terms</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
