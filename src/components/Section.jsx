import React from "react";

/* Generic section wrapper. Theme: "paper" | "paper-2" | "white" | "dark" | "dark-lift" */
export default function Section({ theme = "paper", id, children, padded = true, style = {} }) {
  const cls = {
    "paper": "surface-paper",
    "paper-2": "surface-paper-2",
    "white": "surface-white",
    "dark": "surface-dark",
    "dark-lift": "surface-dark-lift",
  }[theme] || "surface-paper";
  return (
    <section
      id={id}
      className={`${cls}${padded ? " section-pad" : ""}`}
      style={style}
    >
      {children}
    </section>
  );
}
