import React from "react";
import Layout1 from "./CTA/Layout1_GetQuote.jsx";
import Layout2 from "./CTA/Layout2_Banner.jsx";
import Layout3 from "./CTA/Layout3_BottomCTA.jsx";

/* Unified CTA Section Wrapper — dispatches to Layout1, Layout2, or Layout3 based on layout prop.
   Supports three styles: Get Quote card, Banner with image, and Bottom CTA panel.
   Props: { sectionConfig, pageKey } */
export default function CTASection({ sectionConfig, pageKey }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const layout = c.layout || "layout-1";
  const colorScheme = c.colorScheme || "dark";

  // Layout 1: Get Quote card
  if (layout === "layout-1" || layout === "layout-1-getquote") {
    return (
      <Layout1
        eyebrow={c.eyebrow || "Get a Quote"}
        title={c.title || "Why wait?"}
        titleAccent={c.titleAccent || "Talk to us."}
        body={c.body || "Contact us for a quote or to learn more. 48-hour response. Confidentiality default."}
        cta={c.cta || { label: "Get in Touch", href: "/contact" }}
        secondary={c.secondary || null}
        colorScheme={colorScheme}
      />
    );
  }

  // Layout 2: Banner with image
  if (layout === "layout-2" || layout === "layout-2-banner") {
    return (
      <Layout2
        title={c.title || "Stay current on the cases we cover."}
        cta={c.cta || "Read the briefings"}
        href={c.href || "/contact"}
        image={c.image || "/Building_Wide.jpg"}
        external={c.external || false}
        colorScheme={colorScheme}
      />
    );
  }

  // Layout 3: Bottom CTA panel (default for subpages)
  return (
    <Layout3
      eyebrow={c.eyebrow}
      title={c.title}
      accent={c.accent}
      kicker={c.kicker}
      primary={c.primary}
      secondary={c.secondary || null}
      colorScheme={colorScheme}
    />
  );
}
