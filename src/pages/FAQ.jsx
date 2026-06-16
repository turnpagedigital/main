import React, { useMemo, useState } from "react";
import { FONT, INK, INK_60, NEON, PAPER } from "../data/tokens.js";
import SectionHeader from "../components/SectionHeader.jsx";
import FAQ from "../components/FAQ.jsx";
import faqs from "../data/faqs.json";
import { MARKETING_PAGES } from "../data/page-keys.js";
import pageCompositions from "../data/page-compositions.json";

// Read header text from page-compositions.json so it's editable in Pages → FAQ.
const _faqPage   = (pageCompositions.pages || []).find(p => p.pageKey === "faq");
const _faqHeader = (_faqPage?.sections || []).find(s => s.type === "hero")?.content || {};

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState(
    () => new URLSearchParams(window.location.search).get("topic"),
  );

  /* Only offer topics that actually have live FAQs tagged to them. */
  const topics = useMemo(() => {
    const tagged = new Set(
      faqs.faqs.filter(f => f.active).flatMap(f => f.pages || []),
    );
    return MARKETING_PAGES.filter(p => tagged.has(p.key));
  }, []);

  /* Chip click: update state + keep the URL shareable (?topic=). */
  function selectTopic(key) {
    setTopicFilter(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set("topic", key);
    else url.searchParams.delete("topic");
    window.history.replaceState({}, "", url);
  }

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

  const displayTopicName = topicFilter
    ? (topics.find(t => t.key === topicFilter)?.label || topicFilter)
    : null;

  const chipStyle = (selected) => ({
    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600,
    padding: "0.45rem 1rem", borderRadius: 999, cursor: "pointer",
    border: `1px solid ${selected ? INK : "#ddd"}`,
    background: selected ? INK : "transparent",
    color: selected ? NEON : INK_60,
    transition: "all 0.15s",
  });

  return (
    <div style={{ background: PAPER, paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="container" style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem)" }}>
        {/* Header */}
        <SectionHeader
          eyebrow={_faqHeader.eyebrow     || "Questions?"}
          title={_faqHeader.title         || "Frequently Asked"}
          accent={_faqHeader.accentTitle  || "Answers."}
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

        {/* Topic filter chips */}
        <div role="group" aria-label="Filter by topic" style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
          <button type="button" onClick={() => selectTopic(null)} aria-pressed={!topicFilter} style={chipStyle(!topicFilter)}>
            All topics
          </button>
          {topics.map(t => (
            <button key={t.key} type="button" onClick={() => selectTopic(t.key)} aria-pressed={topicFilter === t.key} style={chipStyle(topicFilter === t.key)}>
              {t.label}
            </button>
          ))}
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
