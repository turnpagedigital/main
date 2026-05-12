import React from "react";

/* Light/dark stat strip — 4 metrics in a row.
   Pass `theme="dark"` for the dark variant. */
export default function StatStrip({ items = [], theme = "light" }) {
  const cls = theme === "dark" ? "stat-strip-dark" : "stat-strip";
  return (
    <div className={cls}>
      {items.map((it, i) => (
        <div key={i}>
          <div className="stat-value">{it.value}</div>
          <div className="stat-label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
