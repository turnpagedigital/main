import React from "react";
import Layout1 from "./Testimonials/Layout1_Grid3Col.jsx";
import Layout2 from "./Testimonials/Layout2_SingleCol.jsx";
import Layout3 from "./Testimonials/Layout3_LargeFeatured.jsx";
import testimonialsData from "../../data/testimonials.json";
import { useI18n } from "../../lib/i18n.js";

/* Testimonials Section Wrapper — filters by pageKey and dispatches to layout components.
   layout-1-grid3col  : 3-column grid (default for home)
   layout-2-singlecol : stacked single column (subpages)
   layout-3-featured  : large centered pull-quote (1 featured + smaller secondary) */
export default function TestimonialsSection({ sectionConfig, pageKey }) {
  const { t } = useI18n();
  const c = (sectionConfig && sectionConfig.content) || {};
  const sc = sectionConfig || {};
  const eyebrow = c.eyebrow || t("testimonials.eyebrow");
  const title = c.title || t("testimonials.title_1");
  const accent = c.accent || t("testimonials.title_2");
  // layout + colorScheme live at section level (or inside content for legacy)
  const layout = sc.layout || c.layout || "layout-1-grid3col";
  const colorScheme = sc.colorScheme || c.colorScheme || "light";

  const testimonials = (testimonialsData.testimonials || []).filter(
    t => t.active !== false && Array.isArray(t.tags) && t.tags.includes(pageKey)
  );

  if (!testimonials || testimonials.length === 0) return null;

  const shared = { testimonials, eyebrow, title, accent, colorScheme };

  if (layout === "layout-1" || layout === "layout-1-grid3col")  return <Layout1 {...shared} />;
  if (layout === "layout-3" || layout === "layout-3-featured")  return <Layout3 {...shared} />;
  return <Layout2 {...shared} />;
}
