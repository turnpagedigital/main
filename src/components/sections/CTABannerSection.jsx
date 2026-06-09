import React from "react";
import CTABanner from "../CTABanner.jsx";

/* Horizontal photo CTA banner. Content from sectionConfig.content. */
export default function CTABannerSection({ sectionConfig }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  return (
    <CTABanner
      title={c.title || ""}
      href={c.href || "/contact"}
      cta={c.cta || "Learn more"}
      image={c.image || "/Building_Wide.jpg"}
      external={c.external || false}
      align={c.align || "left"}
    />
  );
}
