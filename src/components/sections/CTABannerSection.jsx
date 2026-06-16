import React from "react";
import CTABanner from "../CTABanner.jsx";
import { useI18n } from "../../lib/i18n.js";

/* Horizontal photo CTA banner. Content from sectionConfig.content. */
export default function CTABannerSection({ sectionConfig }) {
  const { t, lang } = useI18n();
  const c = (sectionConfig && sectionConfig.content) || {};
  const en = lang === "en";
  return (
    <CTABanner
      title={en ? (c.title || t("ctabanner.title")) : t("ctabanner.title")}
      href={c.href || "/contact"}
      cta={en ? (c.cta || t("ctabanner.cta")) : t("ctabanner.cta")}
      image={c.image || "/Building_Wide.jpg"}
      external={c.external || false}
      align={c.align || "left"}
    />
  );
}
