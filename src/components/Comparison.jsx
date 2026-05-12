import React from "react";

/* Old way vs. TPDM way comparison block.
   Props: oldWay = { title, items: string[] }, newWay = same shape. */
export default function Comparison({ oldWay, newWay }) {
  return (
    <div className="compare-grid">
      <div className="compare-card">
        <h3 className="compare-title">
          <span className="tag">Without Turnpage</span>
        </h3>
        <p style={{
          fontFamily: "'Archivo', sans-serif", fontWeight: 800,
          fontSize: "1.3rem", color: "#0A0A0A", letterSpacing: "-0.01em",
          marginBottom: "1.1rem", marginTop: "-0.3rem",
        }}>
          {oldWay.title}
        </p>
        <ul className="compare-list">
          {oldWay.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>
      <div className="compare-card tpdm">
        <h3 className="compare-title">
          <span className="tag">The Turnpage Way</span>
        </h3>
        <p style={{
          fontFamily: "'Archivo', sans-serif", fontWeight: 800,
          fontSize: "1.3rem", color: "#fff", letterSpacing: "-0.01em",
          marginBottom: "1.1rem", marginTop: "-0.3rem",
          position: "relative", zIndex: 2,
        }}>
          {newWay.title}
        </p>
        <ul className="compare-list">
          {newWay.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    </div>
  );
}
