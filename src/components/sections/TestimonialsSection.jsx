import React from "react";
import Layout1 from "./Testimonials/Layout1_Grid3Col.jsx";
import Layout2 from "./Testimonials/Layout2_SingleCol.jsx";
import testimonialsData from "../../data/testimonials.json";

/* Testimonials Section Wrapper — filters by pageKey and dispatches to layout components. */
export default function TestimonialsSection({ sectionConfig, pageKey }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const eyebrow = c.eyebrow || "What Clients Say";
  const title = c.title || "When others give up,";
  const accent = c.accent || "we dig in.";
  const layout = c.layout || "layout-1";
  const colorScheme = c.colorScheme || "light";

  const testimonials = (testimonialsData.testimonials || []).filter(
    t => t.active !== false && Array.isArray(t.tags) && t.tags.includes(pageKey)
  );

  if (!testimonials || testimonials.length === 0) return null;

  // Dispatch to appropriate layout
  if (layout === "layout-1" || layout === "layout-1-grid3col") {
    return (
      <Layout1
        testimonials={testimonials}
        eyebrow={eyebrow}
        title={title}
        accent={accent}
        colorScheme={colorScheme}
      />
    );
  }

  // Layout 2 for single column
  return (
    <Layout2
      testimonials={testimonials}
      eyebrow={eyebrow}
      title={title}
      accent={accent}
      colorScheme={colorScheme}
    />
  );
}
