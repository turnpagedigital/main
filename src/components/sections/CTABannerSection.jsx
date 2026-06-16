import React from "react";
import CTABanner from "../CTABanner.jsx";
import { useI18n } from "../../lib/i18n.js";

/* Horizontal photo CTA banner. Content from sectionConfig.content. */
export default function CTABannerSection({ sectionConfig }) {
  const { t } = useI18n();
  const c = (sectionConfig && sectionConfig.content) || {};
  return (
    <CTABanner
      title={c.title || t("ctabanner.title")}
      href={c.href || "/contact"}
      cta={c.cta || t("ctabanner.cta")}
      image={c.image || "/Building_Wide.jpg"}
      external={c.external || false}
      align={c.align || "left"}
    />
  );
}
