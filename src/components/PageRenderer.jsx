import React from "react";
import pageCompositions from "../data/page-compositions.json";

import HomeHeroSection    from "./sections/HomeHeroSection.jsx";
import HeroSection        from "./sections/HeroSection.jsx";
import StatsBandSection   from "./sections/StatsBandSection.jsx";
import SituationsSection  from "./sections/SituationsSection.jsx";
import BioSection         from "./sections/BioSection.jsx";
import TestimonialsSection from "./sections/TestimonialsSection.jsx";
import PhotoBreakSection  from "./sections/PhotoBreakSection.jsx";
import ExperienceSection  from "./sections/ExperienceSection.jsx";
import OurEdgeSection     from "./sections/OurEdgeSection.jsx";
import FAQSection         from "./sections/FAQSection.jsx";
import CTABannerSection   from "./sections/CTABannerSection.jsx";
import BottomCTASection   from "./sections/BottomCTASection.jsx";
import GetQuoteSection    from "./sections/GetQuoteSection.jsx";
import AudienceCardsSection from "./sections/AudienceCardsSection.jsx";
import ServiceCardsSection  from "./sections/ServiceCardsSection.jsx";
import ComparisonSection    from "./sections/ComparisonSection.jsx";
import HowItWorksSection    from "./sections/HowItWorksSection.jsx";
import DamagesSection       from "./sections/DamagesSection.jsx";

/* Registry: section type id → React component. */
const SECTION_MAP = {
  "home-hero":       HomeHeroSection,
  "hero":            HeroSection,
  "stats-band":      StatsBandSection,
  "situations":      SituationsSection,
  "bio":             BioSection,
  "testimonials":    TestimonialsSection,
  "photo-break":     PhotoBreakSection,
  "experience":      ExperienceSection,
  "our-edge":        OurEdgeSection,
  "faq":             FAQSection,
  "cta-banner":      CTABannerSection,
  "bottom-cta":      BottomCTASection,
  "get-quote":       GetQuoteSection,
  "audience-cards":  AudienceCardsSection,
  "service-cards":   ServiceCardsSection,
  "comparison":      ComparisonSection,
  "how-it-works":    HowItWorksSection,
  "damages":         DamagesSection,
};

/* PageRenderer — renders a page by its composition.
   Usage: <PageRenderer pageKey="home" />
   Reads page-compositions.json, filters visible sections, renders each in order.
   Unknown section types are silently skipped (degrade gracefully). */
export default function PageRenderer({ pageKey }) {
  const page = (pageCompositions.pages || []).find(p => p.pageKey === pageKey);
  if (!page) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[PageRenderer] No composition found for pageKey: "${pageKey}"`);
    }
    return null;
  }

  const visible = (page.sections || []).filter(s => s.visible !== false);

  return (
    <>
      {visible.map(section => {
        const Component = SECTION_MAP[section.type];
        if (!Component) return null;
        return (
          <Component
            key={section.id}
            sectionConfig={section}
            pageKey={pageKey}
          />
        );
      })}
    </>
  );
}
