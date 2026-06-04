import React from "react";
import ComparisonComponent from "../Comparison.jsx";
import cryptoContent        from "../../data/crypto-content.json";
import litFinContent        from "../../data/litigation-finance-content.json";

const PAGE_CONTENT = {
  "crypto":             cryptoContent,
  "litigation-finance": litFinContent,
};

/* Old way vs. Turnpage way comparison. Content managed via Pages → Marketing Pages. */
export default function ComparisonSection({ pageKey }) {
  const content = PAGE_CONTENT[pageKey];
  if (!content || !content.comparison) return null;
  const { oldWay, newWay } = content.comparison;
  return (
    <section className="surface-paper section-pad">
      <div className="container">
        <ComparisonComponent oldWay={oldWay} newWay={newWay} />
      </div>
    </section>
  );
}
