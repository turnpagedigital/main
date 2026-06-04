import React from "react";
import TestimonialsBlock from "../TestimonialsBlock.jsx";
import testimonialsData from "../../data/testimonials.json";

/* Testimonials section — filters by pageKey. Content managed in Content → Testimonials. */
export default function TestimonialsSection({ pageKey }) {
  const testimonials = (testimonialsData.testimonials || []).filter(
    t => t.active !== false && Array.isArray(t.tags) && t.tags.includes(pageKey)
  );
  return <TestimonialsBlock testimonials={testimonials} />;
}
