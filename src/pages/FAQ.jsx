import React, { useState, useMemo } from "react";
import { FONT, INK, INK_60, NEON, LINE } from "../data/tokens.js";
import faqsData from "../data/faqs.json";
import FAQ from "../components/FAQ.jsx";

/* Generic FAQ page with search and topic filtering.
   Query params:
     ?topic=crypto   — Show only FAQs tagged for "crypto" page
     ?search=...     — Filter by text in question/answer
*/

const TOPIC_LABELS = {
  "home": "Home",
  "ai-copyright": "AI Copyright",
  "crypto": "Crypto Claims",
  "litigation-finance": "Litigation Finance",
  "contact": "Contact",
};

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Parse query params
  const params = useMemo(() => {
    if (typeof window === "undefined") return { topic: null };
    const sp = new URLSearchParams(window.location.search);
    return {
      topic: sp.get("topic"),
    };
  }, []);

  // Filter FAQs
  const filteredFaqs = useMemo(() => {
    let items = (faqsData.faqs || []).filter(f => f.active !== false);

    // Filter by topic if specified
    if (params.topic) {
      items = items.filter(f => Array.isArray(f.pages) && f.pages.includes(params.topic));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(f =>
        (f.q && f.q.toLowerCase().includes(term)) ||
        (f.a && f.a.toLowerCase().includes(term))
      );
    }

    return items;
  }, [params.topic, searchTerm]);

  const topicLabel = params.topic ? TOPIC_LABELS[params.topic] || params.topic : null;
  const pageTitle = topicLabel ? `${topicLabel} FAQs` : "Frequently Asked Questions";

  return (
    <div>
      {/* Hero section */}
      <section style={{
        background: "#F4F5F7",
        padding: "clamp(4rem, 10vw, 7rem) clamp(1.5rem, 5vw, 4rem)",
        borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: INK_60, marginBottom: "1rem",
          }}>
            FAQ
          </p>
          <h1 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            lineHeight: 1.1, letterSpacing: "-0.02em",
            color: INK, marginBottom: "0.5rem", maxWidth: 880,
          }}>
            {pageTitle}
          </h1>
          {topicLabel && (
            <p style={{
              fontFamily: FONT, fontSize: "0.95rem", color: INK_60,
              marginTop: "0.5rem",
            }}>
              Showing FAQs about: <strong>{topicLabel}</strong>
            </p>
          )}
        </div>
      </section>

      {/* Search and results */}
      <section style={{
        background: "#fff",
        padding: "clamp(3rem, 8vw, 5rem) clamp(1.5rem, 5vw, 4rem)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* Search input */}
          <div style={{ marginBottom: "2.5rem" }}>
            <input
              type="text"
              placeholder="Search questions and answers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: "100%", maxWidth: 600,
                padding: "0.75rem 1rem",
                fontFamily: FONT, fontSize: "0.95rem",
                border: `1px solid ${LINE}`,
                borderRadius: "2px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* FAQ count */}
          <p style={{
            fontFamily: FONT, fontSize: "0.88rem", color: INK_60,
            marginBottom: "2rem",
          }}>
            {filteredFaqs.length} question{filteredFaqs.length !== 1 ? "s" : ""} answered
            {searchTerm.trim() && ` matching "${searchTerm}"`}
          </p>

          {/* FAQ accordion */}
          {filteredFaqs.length > 0 ? (
            <div style={{ maxWidth: 880 }}>
              <FAQ items={filteredFaqs} openFirst={false} />
            </div>
          ) : (
            <div style={{
              padding: "2rem",
              textAlign: "center",
              color: INK_60,
              fontSize: "0.95rem",
            }}>
              <p>No FAQs match your search. Try different keywords.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
