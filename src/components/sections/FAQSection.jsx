import React from "react";
import faqsData from "../../data/faqs.json";
import Layout1 from "./FAQ/Layout1_FullWidth.jsx";
import Layout2 from "./FAQ/Layout2_SplitSidebar.jsx";
import { useI18n } from "../../lib/i18n.js";

/* FAQ Section Wrapper — dispatches to Layout1 or Layout2 based on pageKey.
   Handles data filtering and passes props to layout components. */
export default function FAQSection({ sectionConfig, pageKey }) {
  const { t, lang } = useI18n();
  const c  = (sectionConfig && sectionConfig.content) || {};
  const sc = sectionConfig || {};
  const en = lang === "en";
  const title  = en ? (c.title  || t("faq.title_1")) : t("faq.title_1");
  const accent = en ? (c.accent || t("faq.title_2")) : t("faq.title_2");
  const ctaLabel    = c.ctaLabel || null;
  const ctaHref     = c.ctaHref  || "/contact";
  // layout auto-selects by page; colorScheme is user-controlled via admin
  const layout      = sc.layout      || c.layout      || (pageKey === "home" ? "layout-1" : "layout-2");
  const colorScheme = sc.colorScheme || c.colorScheme || "light";

  // Filter featured FAQs for this page, localized for non-English
  const localizeItem = f => en ? f : {
    ...f,
    q: f.translations?.[lang]?.q || f.q,
    a: f.translations?.[lang]?.a || f.a,
  };
  const faqs = (faqsData.faqs || [])
    .filter(f => f.active !== false && Array.isArray(f.pages) && f.pages.includes(pageKey) && f.featured !== false)
    .map(localizeItem);

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
        hasMoreFaqs={hasMoreFaqs}
        pageKey={pageKey}
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
