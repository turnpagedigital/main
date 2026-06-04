import React, { useState, useEffect } from "react";
import { FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";

/* SectionTypesTab — read-only view of the registered section type library.
   Adding a new visual renderer requires a code deploy. This tab lets admins
   see what's available to add to pages. */

const DATA_SOURCE_DESCRIPTIONS = {
  "inline":             "Content stored in the page layout (editable in Page Builder)",
  "shared:situations":  "Reads from Home Content → Situations",
  "shared:bio":         "Reads from Content → Bio",
  "shared:deals":       "Reads from Content → Deals (filtered per page)",
  "shared:testimonials":"Reads from Content → Testimonials (filtered per page)",
  "shared:faq":         "Reads from Content → FAQs (filtered per page)",
  "page:audienceCards": "Reads from Pages → Marketing Pages for this page",
  "page:serviceCards":  "Reads from Pages → Marketing Pages for this page",
  "page:comparison":    "Reads from Pages → Marketing Pages for this page",
  "page:howItWorks":    "Reads from Pages → Marketing Pages for this page",
  "page:damagesData":   "Reads from Pages → Marketing Pages for this page",
};

export default function SectionTypesTab() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/section-types", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.ok) setTypes(data.sectionTypes || []);
        else setError(data.error || "Failed to load");
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "1.4rem clamp(1rem,3vw,2rem) 3rem" };

  return (
    <div style={{ fontFamily: FONT, color: INK }}>
      <div style={wrap}>
        <div style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Section Types</h2>
          <p style={{ fontSize: "0.85rem", color: INK_60, marginTop: 2 }}>
            Pre-built section renderers available for pages. Adding a new visual type requires a code deploy.
          </p>
        </div>

        {error && <div style={{ padding: "0.7rem", color: "#c0392b", background: "rgba(192,57,43,0.07)", marginBottom: "1rem" }}>{error}</div>}
        {loading && <p style={{ color: INK_60 }}>Loading…</p>}

        <div style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
          {types.map((t, i) => (
            <div key={t.id} style={{
              display: "grid", gridTemplateColumns: "180px 1fr auto",
              gap: "1rem", padding: "0.85rem 1rem", alignItems: "start",
              borderBottom: i < types.length - 1 ? `1px solid ${LINE}` : "none",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t.displayName}</div>
                <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: INK_60, marginTop: 2 }}>{t.id}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: INK }}>{t.description}</div>
                <div style={{ fontSize: "0.78rem", color: INK_60, marginTop: 3 }}>
                  {DATA_SOURCE_DESCRIPTIONS[t.dataSource] || t.dataSource}
                </div>
              </div>
              <div style={{
                fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem",
                background: t.dataSource === "inline" ? "rgba(212,255,0,0.15)" : "rgba(10,10,10,0.05)",
                color: t.dataSource === "inline" ? "#556200" : INK_60,
                whiteSpace: "nowrap", alignSelf: "center",
              }}>
                {t.dataSource === "inline" ? "Editable" : "Data-driven"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
