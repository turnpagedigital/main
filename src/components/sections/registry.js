/* Section registry — single source of truth mapping a section type id to its
   React renderer. Shared by the public PageRenderer and the admin Page Builder
   preview so both stay in sync as section types are added. */

import HomeHeroSection     from "./HomeHeroSection.jsx";
import HeroSection         from "./HeroSection.jsx";
import StatsBandSection    from "./StatsBandSection.jsx";
import SituationsSection   from "./SituationsSection.jsx";
import BioSection          from "./BioSection.jsx";
import TestimonialsSection from "./TestimonialsSection.jsx";
import PhotoBreakSection   from "./PhotoBreakSection.jsx";
import ExperienceSection   from "./ExperienceSection.jsx";
import OurEdgeSection      from "./OurEdgeSection.jsx";
import FAQSection          from "./FAQSection.jsx";
import CTABannerSection    from "./CTABannerSection.jsx";
import BottomCTASection    from "./BottomCTASection.jsx";
import GetQuoteSection     from "./GetQuoteSection.jsx";
import AudienceCardsSection from "./AudienceCardsSection.jsx";
import ServiceCardsSection  from "./ServiceCardsSection.jsx";
import ComparisonSection    from "./ComparisonSection.jsx";
import HowItWorksSection    from "./HowItWorksSection.jsx";
import DamagesSection       from "./DamagesSection.jsx";

export const SECTION_MAP = {
  "home-hero":      HomeHeroSection,
  "hero":           HeroSection,
  "stats-band":     StatsBandSection,
  "situations":     SituationsSection,
  "bio":            BioSection,
  "testimonials":   TestimonialsSection,
  "photo-break":    PhotoBreakSection,
  "experience":     ExperienceSection,
  "our-edge":       OurEdgeSection,
  "faq":            FAQSection,
  "cta-banner":     CTABannerSection,
  "bottom-cta":     BottomCTASection,
  "get-quote":      GetQuoteSection,
  "audience-cards": AudienceCardsSection,
  "service-cards":  ServiceCardsSection,
  "comparison":     ComparisonSection,
  "how-it-works":   HowItWorksSection,
  "damages":        DamagesSection,
};
