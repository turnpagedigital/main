import React from "react";
import CTABanner from "../../CTABanner.jsx";

/* CTA Layout 2 — Banner (Full-bleed image with overlay)
   Props: { title, cta, href, image, external, colorScheme } */
export default function CTALayout2Banner({
  title = "Stay current on the cases we cover.",
  cta = "Read the briefings",
  href = "/contact",
  image = "/Building_Wide.jpg",
  external = false,
  colorScheme = "photo",
}) {
  return (
    <CTABanner
      title={title}
      href={href}
      cta={cta}
      image={image}
      external={external}
    />
  );
}
