import React from "react";
import { NEON, FONT, INK, INK_60, INK_40, LINE } from "../data/tokens.js";

/* Privacy & Terms — rendered as a proper legal document.
   Content is unchanged; only the layout and typography have been redesigned. */

const LAST_UPDATED = "May 12, 2026";

/* ─── Privacy Policy ─── */
const PRIVACY = {
  title: "Privacy Policy",
  subtitle: "How Turnpage Digital Markets LLC collects, uses, discloses, and safeguards your personal information when you visit our website or use our claims services.",
  sections: [
    {
      n: "1", h: "Introduction",
      body: [
        "Turnpage Digital Markets LLC (\"we,\" \"us,\" or \"our\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our website or engage with our claims liquidation and advisory services.",
        "By using our services, you consent to the practices described in this policy. If you do not agree, please discontinue use of our services.",
      ],
    },
    {
      n: "2", h: "Information We Collect",
    },
    {
      n: "2.1", h: "Information you provide",
      body: [
        "When you submit our contact form or share details about a claim, we may collect:",
      ],
      bullets: [
        "Contact information: name, email address, phone number, optional messaging handles (Telegram, WhatsApp).",
        "Business information: company name, role, institutional affiliation, professional advisors.",
        "Claim details: type of claim, counterparty, court or proceeding, claim status, supporting documentation, estimated value, and related materials needed to evaluate a potential transaction.",
        "Role information: whether you are a claimant, creditor, plaintiff, fund, trustee, counsel, or other party.",
        "Any additional details you voluntarily provide in form fields or correspondence.",
      ],
    },
    {
      n: "2.2", h: "Information collected automatically",
      body: [
        "When you visit our website, we may automatically collect certain technical data, including your IP address, browser type and version, operating system, referring URL, pages visited, and the dates and times of your visits. We use this information for analytics and to improve our services.",
      ],
    },
    {
      n: "3", h: "Legal Basis for Processing (GDPR)",
      body: [
        "If you are located in the European Economic Area, the United Kingdom, or another jurisdiction with similar data protection laws, we process your personal data on the following legal bases:",
      ],
      bullets: [
        "Consent: When you submit a form or opt in to communications, you provide consent for us to process your data for the stated purposes.",
        "Legitimate interest: We may process data to respond to inquiries, improve our services, and ensure security, where such processing does not override your fundamental rights.",
        "Contractual necessity: Processing may be necessary to perform a contract or take steps at your request prior to entering a contract.",
        "Legal obligation: We may process data to comply with applicable laws and regulations.",
      ],
    },
    {
      n: "4", h: "How We Use Your Information",
      body: [
        "We use the information we collect to:",
      ],
      bullets: [
        "Evaluate your claim and the feasibility of a transaction or advisory engagement.",
        "Contact you regarding your inquiry, potential terms, and related matters.",
        "Provide, maintain, and improve our services.",
        "Communicate with you about updates to our services, briefings, or industry developments (with your consent).",
        "Comply with legal obligations and protect our legal rights.",
        "Analyze website usage to improve user experience.",
      ],
    },
    {
      n: "5", h: "Data Sharing and Disclosure",
      body: [
        "We do not sell, rent, or trade your personal information. We may share your data with:",
      ],
      bullets: [
        "Service providers: Trusted third parties that help us operate our business (e.g., hosting, analytics, email delivery), bound by confidentiality obligations.",
        "Counterparties and professional partners: Institutional buyers, counsel, customs brokers, tax specialists, or other professionals who may assist with your matter — only with your consent.",
        "Legal requirements: When required by law, regulation, legal process, or governmental request.",
        "Business transfers: In connection with a merger, acquisition, or sale of assets, with notice to you.",
      ],
    },
    {
      n: "6", h: "Data Retention",
      body: [
        "We retain your personal data only as long as necessary to fulfill the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements. Inquiry and transaction data are typically retained for seven years from the date of your last interaction, after which the data is securely deleted or anonymized, except where a longer retention period is required by law.",
      ],
    },
    {
      n: "7", h: "Your Rights",
      body: [
        "Depending on your jurisdiction, you may have the following rights regarding your personal data:",
      ],
      bullets: [
        "Access: Request a copy of the personal data we hold about you.",
        "Rectification: Request correction of inaccurate or incomplete data.",
        "Erasure: Request deletion of your personal data (\"right to be forgotten\").",
        "Restriction: Request restriction of processing in certain circumstances.",
        "Portability: Request transfer of your data in a structured, machine-readable format.",
        "Objection: Object to processing based on legitimate interests or for direct marketing.",
        "Withdraw consent: Withdraw consent at any time where processing is based on consent.",
      ],
      trailing: "To exercise any of these rights, please contact us at privacy@turnpagedigital.com. We will respond within 30 days (or as required by applicable law).",
    },
    {
      n: "8", h: "Cookies and Tracking",
      body: [
        "Our website may use essential cookies to ensure proper functionality. We do not use advertising or third-party tracking cookies without your explicit consent. You can manage cookie preferences through your browser settings.",
      ],
    },
    {
      n: "9", h: "Data Security",
      body: [
        "We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These include encryption in transit (TLS/SSL), access controls, and regular security assessments. However, no method of transmission over the internet is 100% secure.",
      ],
    },
    {
      n: "10", h: "International Transfers",
      body: [
        "Your data may be transferred to and processed in the United States. If you are located outside the United States, we ensure appropriate safeguards are in place (such as Standard Contractual Clauses) to protect your data in compliance with applicable data protection laws.",
      ],
    },
    {
      n: "11", h: "Children's Privacy",
      body: [
        "Our services are not directed to individuals under the age of 16. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child, we will promptly delete it.",
      ],
    },
    {
      n: "12", h: "Changes to This Policy",
      body: [
        "We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website with a new \"Last updated\" date. Your continued use of our services after changes constitutes acceptance of the updated policy.",
      ],
    },
    {
      n: "13", h: "Contact Us",
      body: [
        "If you have questions about this Privacy Policy or wish to exercise your data rights, please contact:",
      ],
      contact: true,
    },
  ],
};

/* ─── Terms of Use ─── */
const TERMS = {
  title: "Terms of Use",
  subtitle: "The terms governing your use of turnpagedigital.com and the services offered by Turnpage Digital Markets LLC.",
  sections: [
    {
      n: "1", h: "Acceptance of Terms",
      body: [
        "By accessing or using the website and services of Turnpage Digital Markets LLC (\"we,\" \"us,\" or \"our\"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.",
      ],
    },
    {
      n: "2", h: "Description of Services",
      body: [
        "Turnpage Digital Markets provides strategic guidance and turn-key liquidity solutions for rights holders entitled to compensation. Our services include OTC claim brokerage, capital solutions (assignments, participations, advances, contingency arrangements), and advisory across bankruptcy claims, litigation claims, class action claims, locked digital assets, government refunds, judgments, seized property, and other illiquid assets.",
      ],
    },
    {
      n: "3", h: "No Legal, Tax, or Financial Advice",
      body: [
        "The information provided on this website and through our services is for general informational purposes only and does not constitute legal, tax, financial, investment, or brokerage advice. Content on this site, including references to court decisions, claim values, settlement data, and recovery estimates, should not be relied upon as a substitute for professional advice. We recommend consulting with qualified counsel, tax professionals, or other licensed professionals before making decisions regarding your claims.",
      ],
    },
    {
      n: "4", h: "No Client Relationship",
      body: [
        "Use of this site or submission of the contact form does not create an attorney-client, fiduciary, advisory, or other professional relationship with Turnpage Digital Markets LLC, its principals, employees, or affiliates. A relationship is formed only by a separately executed written agreement.",
      ],
    },
    {
      n: "5", h: "No Guarantees",
      body: [
        "While we strive to provide accurate and up-to-date information, we make no representations or warranties regarding the accuracy, completeness, or timeliness of any information on our website. Claim values, eligibility, timelines, recovery amounts, and outcomes vary based on individual circumstances. Past results do not guarantee future outcomes. Statistics and figures cited on our website are based on publicly available data sources and reasonable estimates.",
      ],
    },
    {
      n: "6", h: "User Obligations",
      body: [
        "When using our services, you agree to:",
      ],
      bullets: [
        "Provide accurate and complete information in any forms or correspondence.",
        "Use the website and services only for lawful purposes.",
        "Not attempt to interfere with the proper functioning of the website.",
        "Not impersonate any person or entity, or misrepresent your affiliation.",
        "Not use automated systems (bots, scrapers) to access our services without written permission.",
      ],
    },
    {
      n: "7", h: "Intellectual Property",
      body: [
        "All content on this website — including text, graphics, logos, icons, images, data compilations, charts, briefings, and software — is the property of Turnpage Digital Markets LLC or its content suppliers and is protected by U.S. and international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from our content without prior written consent.",
      ],
    },
    {
      n: "8", h: "Third-Party Links and Content",
      body: [
        "Our website may contain links to third-party websites and references to third-party content, court filings, news reports, and other publicly available materials. We are not responsible for the content, accuracy, or privacy practices of third-party sites. Links and citations are provided for informational convenience only and do not imply endorsement.",
      ],
    },
    {
      n: "9", h: "Forward-Looking Statements",
      body: [
        "Some of the information on this site discusses pending litigation, settlements, regulatory matters, and market conditions. Outcomes are uncertain. Past performance is not indicative of future results, and no representation is made that any particular result can be obtained.",
      ],
    },
    {
      n: "10", h: "Limitation of Liability",
      body: [
        "To the maximum extent permitted by law, Turnpage Digital Markets LLC, its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of profits, data, or business opportunities — arising from your use of or inability to use our services, even if we have been advised of the possibility of such damages. Our total liability for any claim arising from these terms or our services shall not exceed the amount you paid to us (if any) in the twelve months preceding the claim.",
      ],
    },
    {
      n: "11", h: "Indemnification",
      body: [
        "You agree to indemnify and hold harmless Turnpage Digital Markets LLC and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses (including reasonable attorneys' fees) arising from your use of our services, your violation of these Terms, or your violation of any third-party rights.",
      ],
    },
    {
      n: "12", h: "Privacy",
      body: [
        "Your use of our services is also governed by our Privacy Policy, which is incorporated into these Terms by reference.",
      ],
    },
    {
      n: "13", h: "Modifications",
      body: [
        "We reserve the right to modify these Terms of Use at any time. Changes will be posted on this page with an updated \"Last updated\" date. Your continued use of our services after any modifications constitutes acceptance of the revised terms. We encourage you to review these Terms periodically.",
      ],
    },
    {
      n: "14", h: "Termination",
      body: [
        "We reserve the right to suspend or terminate your access to our services at any time, without notice, for conduct that we believe violates these Terms or is harmful to other users, our business, or third parties.",
      ],
    },
    {
      n: "15", h: "Governing Law",
      body: [
        "These Terms of Use are governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles. Any disputes arising from these Terms or your use of our services shall be resolved in the state or federal courts located in Delaware.",
      ],
    },
    {
      n: "16", h: "Severability",
      body: [
        "If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.",
      ],
    },
    {
      n: "17", h: "Contact",
      body: [
        "For questions about these Terms of Use, please contact:",
      ],
      contact: true,
      contactEmail: "legal@turnpagedigital.com",
    },
  ],
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function linkifyEmail(text) {
  return text.split(/(privacy@turnpagedigital\.com|legal@turnpagedigital\.com|info@turnpagedigital\.com)/).map((part, k) =>
    part.includes("@turnpagedigital.com")
      ? <a key={k} href={`mailto:${part}`} style={{ color: INK, fontWeight: 600, borderBottom: `1px solid ${INK}`, paddingBottom: 1 }}>{part}</a>
      : <React.Fragment key={k}>{part}</React.Fragment>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function Legal({ kind }) {
  const data = kind === "terms" ? TERMS : PRIVACY;

  // Build TOC: all sections, with sub-sections indented
  const toc = data.sections.map(s => ({
    n: s.n,
    h: s.h,
    isSub: s.n.includes("."),
    anchor: `#sec-${s.n.replace(".", "-")}`,
  }));

  return (
    <div style={{
      background: "#F2F2F0",
      minHeight: "100vh",
      padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 4vw, 2rem)",
      fontFamily: FONT,
    }}>
      {/* Document card */}
      <div style={{
        maxWidth: 780,
        margin: "0 auto",
        background: "#FFFFFF",
        boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)",
        padding: "clamp(2.5rem, 7vw, 5rem) clamp(2rem, 6vw, 4.5rem)",
      }}>

        {/* ── Document header ─────────────────────────────────────── */}
        <header style={{ marginBottom: "2.5rem" }}>
          <p style={{
            fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", color: INK_60, marginBottom: "1.1rem",
          }}>
            Turnpage Digital Markets LLC
          </p>
          <h1 style={{
            fontSize: "clamp(1.7rem, 3.5vw, 2.3rem)", fontWeight: 800,
            letterSpacing: "-0.025em", color: INK,
            lineHeight: 1.1, margin: "0 0 1.1rem",
          }}>
            {data.title}
          </h1>
          <div style={{
            display: "flex", gap: "2rem", flexWrap: "wrap",
            fontSize: "0.82rem", color: INK_60, fontWeight: 500,
          }}>
            <span>Last Updated: {LAST_UPDATED}</span>
            <span>Turnpage Digital Markets LLC</span>
          </div>
        </header>

        <hr style={{ border: "none", borderTop: `2px solid ${INK}`, margin: "0 0 2rem" }} />

        {/* ── Preamble ────────────────────────────────────────────── */}
        <p style={{
          fontSize: "0.96rem", color: INK_60, lineHeight: 1.75,
          marginBottom: "2.5rem",
        }}>
          {data.subtitle}
        </p>

        {/* ── Table of Contents ───────────────────────────────────── */}
        <div style={{
          background: "#F7F7F5",
          border: `1px solid rgba(0,0,0,0.08)`,
          borderLeft: `3px solid ${INK}`,
          padding: "1.5rem 1.75rem",
          marginBottom: "3rem",
        }}>
          <p style={{
            fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", color: INK_60, marginBottom: "1.1rem",
          }}>
            Table of Contents
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {toc.map(item => (
              <li key={item.n} style={{
                paddingLeft: item.isSub ? "1.75rem" : "0",
                marginBottom: item.isSub ? "0.3rem" : "0.45rem",
              }}>
                <a
                  href={item.anchor}
                  style={{
                    fontSize: item.isSub ? "0.83rem" : "0.88rem",
                    fontWeight: item.isSub ? 400 : 500,
                    color: INK,
                    display: "inline-flex", gap: "0.6rem", alignItems: "baseline",
                    textDecoration: "none",
                    opacity: item.isSub ? 0.75 : 1,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.textDecoration = "underline"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = item.isSub ? "0.75" : "1"; e.currentTarget.style.textDecoration = "none"; }}
                >
                  <span style={{ color: INK_40, minWidth: item.isSub ? "2.4em" : "1.4em", fontWeight: 600, flexShrink: 0, fontSize: "0.78rem" }}>
                    {item.n}.
                  </span>
                  <span>{item.h}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Sections ────────────────────────────────────────────── */}
        <div>
          {data.sections.map((s, i) => {
            const isSub   = s.n.includes(".");
            const isEmpty = !s.body && !s.bullets && !s.contact; // header-only sections like §2
            const anchor  = `sec-${s.n.replace(".", "-")}`;

            // Separate top-level sections with a rule
            const prevSec      = data.sections[i - 1];
            const _prevIsSub    = prevSec ? prevSec.n.includes(".") : false;
            const addTopBorder = !isSub && i > 0;

            return (
              <section
                key={s.n}
                id={anchor}
                style={{
                  marginTop: addTopBorder ? "2.8rem" : (isSub ? "1.8rem" : "0"),
                  paddingTop: addTopBorder ? "2.8rem" : "0",
                  borderTop: addTopBorder ? `1px solid rgba(0,0,0,0.1)` : "none",
                  scrollMarginTop: 110,
                }}
              >
                {/* Section heading */}
                <div style={{
                  display: "flex", gap: "0.8rem", alignItems: "baseline",
                  marginBottom: isEmpty ? 0 : "0.9rem",
                }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 700, color: INK_40,
                    letterSpacing: "0.06em", minWidth: isSub ? "2.5em" : "1.6em",
                    flexShrink: 0, paddingTop: "0.1em",
                  }}>
                    {s.n}.
                  </span>
                  <h2 style={{
                    fontSize: isSub ? "0.93rem" : "0.88rem",
                    fontWeight: isSub ? 700 : 800,
                    letterSpacing: isSub ? "-0.005em" : "0.1em",
                    textTransform: isSub ? "none" : "uppercase",
                    color: INK,
                    margin: 0,
                    lineHeight: 1.3,
                  }}>
                    {s.h}
                  </h2>
                </div>

                {/* Section body */}
                {!isEmpty && (
                  <div style={{ paddingLeft: "calc(0.8rem + " + (isSub ? "2.5em" : "1.6em") + ")" }}>

                    {s.body && s.body.map((p, j) => (
                      <p key={j} style={{
                        fontSize: "0.96rem", color: INK, lineHeight: 1.8,
                        marginBottom: j < s.body.length - 1 || s.bullets ? "0.85rem" : 0,
                      }}>
                        {p}
                      </p>
                    ))}

                    {s.bullets && (
                      <ul style={{
                        margin: "0 0 0 0.25rem",
                        paddingLeft: "1.1rem",
                        display: "flex", flexDirection: "column", gap: "0.55rem",
                      }}>
                        {s.bullets.map((b, j) => (
                          <li key={j} style={{
                            fontSize: "0.96rem", color: INK, lineHeight: 1.75,
                            listStyleType: "disc",
                          }}>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}

                    {s.trailing && (
                      <p style={{
                        fontSize: "0.96rem", color: INK, lineHeight: 1.8,
                        marginTop: "0.85rem",
                      }}>
                        {linkifyEmail(s.trailing)}
                      </p>
                    )}

                    {s.contact && (
                      <address style={{ fontStyle: "normal", marginTop: "0.85rem" }}>
                        <p style={{ fontSize: "0.96rem", fontWeight: 700, color: INK, marginBottom: "0.25rem" }}>
                          Turnpage Digital Markets LLC
                        </p>
                        <p style={{ fontSize: "0.96rem", color: INK }}>
                          Email:{" "}
                          <a
                            href={`mailto:${s.contactEmail || "privacy@turnpagedigital.com"}`}
                            style={{ color: INK, fontWeight: 600, borderBottom: `1px solid ${INK}`, paddingBottom: 1 }}
                          >
                            {s.contactEmail || "privacy@turnpagedigital.com"}
                          </a>
                        </p>
                      </address>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* ── Footer disclaimer ───────────────────────────────────── */}
        <div style={{
          marginTop: "3.5rem", paddingTop: "2rem",
          borderTop: `1px solid rgba(0,0,0,0.1)`,
        }}>
          <p style={{
            fontSize: "0.8rem", color: INK_60, lineHeight: 1.75, fontStyle: "italic",
          }}>
            Disclaimer: Turnpage Digital Markets LLC is not a law firm, investment advisor, or broker-dealer. We do not provide legal, tax, or professional advice. Consult with qualified counsel and tax professionals before making decisions regarding your claims.
          </p>
        </div>

      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: #fff !important; }
          nav, footer, .announcement-banner { display: none !important; }
        }
        @media (max-width: 540px) {
          #sec-1, #sec-2, #sec-3 { scroll-margin-top: 80px; }
        }
      `}</style>
    </div>
  );
}
