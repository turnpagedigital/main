import React from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";
import Hero from "../components/Hero.jsx";

/* Generic Privacy + Terms boilerplate. Counsel should review before launch.
   Renders the right page based on the `kind` prop ("privacy" | "terms"). */

const PRIVACY = {
  eyebrow: "Privacy",
  title: "Privacy",
  accentTitle: "Policy.",
  subtitle: "How Turnpage Digital Markets LLC collects, uses, and protects information you share with us through this site.",
  body: [
    {
      h: "Information we collect",
      p: "When you submit our contact form, we collect the information you provide — your name, email, phone number, optional messaging handles (Telegram, WhatsApp), the subject of your inquiry, and the contents of your message. We also receive standard server log data when you visit the site (IP address, user agent, referrer, timestamps).",
    },
    {
      h: "How we use it",
      p: "We use the information you submit to respond to your inquiry, evaluate potential transactions, and follow up where appropriate. Server log data is used to operate, secure, and improve the site. We do not sell your information.",
    },
    {
      h: "Service providers",
      p: "We use third-party services to run this site and process your submissions, including Cloudflare (hosting and CDN), Resend (transactional email), and Google (Apps Script for submission logging). Each of these providers may process the information you submit on our behalf, subject to their own terms and security practices.",
    },
    {
      h: "Retention",
      p: "We retain submitted contact information for as long as is necessary to respond to your inquiry and maintain a record of the relationship. You may request deletion of your data by writing to info@turnpagedigital.com.",
    },
    {
      h: "Cookies",
      p: "This site does not set advertising or analytics cookies. We do not track you across other websites.",
    },
    {
      h: "Updates",
      p: "We may update this policy from time to time. The current version is always available at this URL. If you have questions, write us at info@turnpagedigital.com.",
    },
  ],
};

const TERMS = {
  eyebrow: "Terms",
  title: "Terms",
  accentTitle: "of Use.",
  subtitle: "The terms governing your use of turnpagedigital.com and the information you find here.",
  body: [
    {
      h: "Information, not advice",
      p: "Information on this site is general in nature and is intended for informational purposes only. It is not legal, tax, or investment advice, and it is not an offer to buy or sell any security, claim, or instrument. You should consult qualified counsel before making any decision involving your claims or rights.",
    },
    {
      h: "No client relationship",
      p: "Use of this site or submission of the contact form does not create an attorney-client, fiduciary, advisory, or other professional relationship with Turnpage Digital Markets LLC, its principals, or its affiliates. A relationship is formed only by a separately executed written agreement.",
    },
    {
      h: "Forward-looking statements",
      p: "Some of the information on this site discusses pending litigation, settlements, regulatory matters, and market conditions. Outcomes are uncertain. Past performance is not indicative of future results, and no representation is made that any particular result can be obtained.",
    },
    {
      h: "Third-party content",
      p: "We may link to or reference third-party content, court filings, news reports, and other publicly available materials. We do not endorse, control, or guarantee the accuracy of any third-party content.",
    },
    {
      h: "Changes",
      p: "We may update these terms from time to time. The current version is always available at this URL.",
    },
  ],
};

export default function Legal({ kind }) {
  const data = kind === "terms" ? TERMS : PRIVACY;

  return (
    <>
      <Hero
        eyebrow={data.eyebrow}
        title={data.title}
        accentTitle={data.accentTitle}
        subtitle={data.subtitle}
      />

      <section className="surface-paper section-pad">
        <div className="container-narrow" style={{ maxWidth: 760 }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: INK_60,
            marginBottom: "2.2rem", letterSpacing: "0.16em",
            textTransform: "uppercase", fontWeight: 700,
          }}>
            Last updated: April 2026
          </p>
          {data.body.map((s, i) => (
            <div key={i} style={{
              marginBottom: "2.2rem",
              paddingBottom: "2.2rem",
              borderBottom: i < data.body.length - 1 ? `1px solid rgba(10,10,10,0.08)` : "none",
            }}>
              <h2 style={{
                fontFamily: FONT, fontSize: "1.25rem", fontWeight: 800,
                color: INK, marginBottom: "0.7rem",
                letterSpacing: "-0.01em",
              }}>
                {s.h}
              </h2>
              <p style={{
                fontFamily: FONT, fontSize: "1.02rem",
                color: INK_60, lineHeight: 1.7,
              }}>
                {s.p}
              </p>
            </div>
          ))}
          <p style={{
            fontFamily: FONT, fontSize: "0.95rem", color: INK_60,
            marginTop: "2rem",
          }}>
            Questions? Write to{" "}
            <a href="mailto:info@turnpagedigital.com" style={{
              color: INK, fontWeight: 600,
              borderBottom: `2px solid ${NEON}`, paddingBottom: 1,
            }}>
              info@turnpagedigital.com
            </a>.
          </p>
        </div>
      </section>
    </>
  );
}
