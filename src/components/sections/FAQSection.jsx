import React from "react";
import faqsData from "../../data/faqs.json";
import Layout1 from "./FAQ/Layout1_FullWidth.jsx";
import Layout2 from "./FAQ/Layout2_SplitSidebar.jsx";

/* FAQ Section Wrapper — dispatches to Layout1 or Layout2 based on pageKey.
   Handles data filtering and passes props to layout components. */
export default function FAQSection({ sectionConfig, pageKey }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const title    = c.title    || "Your questions,";
  const accent   = c.accent   || "answered.";
  const ctaLabel = c.ctaLabel || null;
  const ctaHref  = c.ctaHref  || "/contact";
  const layout   = c.layout   || (pageKey === "home" ? "layout-1" : "layout-2");
  const colorScheme = c.colorScheme || "light";

  // Filter featured FAQs for this page
  const faqs = (faqsData.faqs || []).filter(
    f => f.active !== false && Array.isArray(f.pages) && f.pages.includes(pageKey) && f.featured !== false
  );

  // Check if there are additional FAQs beyond featured ones
  const allFaqsForPage = (faqsData.faqs || []).filter(
    f => f.active !== false && Array.isArray(f.pages) && f.pages.includes(pageKey)
  );
  const hasMoreFaqs = allFaqsForPage.length > faqs.length;

  // Dispatch to appropriate layout
  if (layout === "layout-1" || layout === "layout-1-fullwidth") {
    return (
      <Layout1
        faqs={faqs}
        title={title}
        accent={accent}
        colorScheme={colorScheme}
      />
    );
  }

  // Default to layout 2 for subpages
  return (
    <Layout2
      faqs={faqs}
      title={title}
      accent={accent}
      ctaLabel={ctaLabel}
      ctaHref={ctaHref}
      hasMoreFaqs={hasMoreFaqs}
      pageKey={pageKey}
      colorScheme={colorScheme}
    />
  );
}
