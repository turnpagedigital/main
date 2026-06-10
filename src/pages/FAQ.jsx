import React, { useMemo, useState } from "react";
import { FONT, INK, INK_60, PAPER } from "../data/tokens.js";
import SectionHeader from "../components/SectionHeader.jsx";
import FAQ from "../components/FAQ.jsx";
import faqs from "../data/faqs.json";

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const urlParams = new URLSearchParams(window.location.search);
  const topicFilter = urlParams.get("topic");

  // Filter FAQs by active status, topic (if specified), and search term
  const filteredFAQs = useMemo(() => {
    return faqs.faqs.filter(faq => {
      if (!faq.active) return false;
      if (topicFilter && !faq.pages.includes(topicFilter)) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          faq.q.toLowerCase().includes(query) ||
          faq.a.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [searchTerm, topicFilter]);

  // Map topic key to display name
  const topicNames = {
    home: "Home",
    "ai-copyright": "AI Copyright",
    crypto: "Crypto Claims",
    "litigation-finance": "Litigation Funding",
    contact: "Contact",
    briefings: "Briefings",
  };

  const displayTopicName = topicFilter ? topicNames[topicFilter] || topicFilter : null;

  return (
    <div style={{ background: PAPER, paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="container" style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem)" }}>
        {/* Header */}
        <SectionHeader
          eyebrow="Questions?"
          title="Frequently Asked"
          accent="Answers."
          align="left"
          theme="light"
          layout="stack"
          maxWidth={960}
        />

        {/* Search Input */}
        <div style={{ marginBottom: "2rem" }}>
          <input
            type="text"
            placeholder="Search FAQs by question or answer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "1rem",
              fontFamily: FONT,
              border: `1px solid #ddd`,
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Topic Filter Label */}
        {displayTopicName && (
          <div style={{
            fontSize: "0.9rem",
            color: INK_60,
            marginBottom: "1.5rem",
            fontWeight: 500,
          }}>
            Showing FAQs about <strong>{displayTopicName}</strong> ({filteredFAQs.length} question{filteredFAQs.length !== 1 ? "s" : ""})
          </div>
        )}

        {/* FAQ Accordion */}
        {filteredFAQs.length > 0 ? (
          <FAQ items={filteredFAQs} />
        ) : (
          <div style={{
            textAlign: "center",
            padding: "2rem",
            color: INK_60,
            fontSize: "1rem",
          }}>
            No FAQs found. Try a different search term or topic.
          </div>
        )}

        {/* Search results count */}
        {searchTerm && filteredFAQs.length > 0 && (
          <div style={{
            marginTop: "2rem",
            fontSize: "0.85rem",
            color: INK_60,
          }}>
            Found {filteredFAQs.length} matching question{filteredFAQs.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
