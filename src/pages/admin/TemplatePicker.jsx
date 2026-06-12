import React, { useState } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";
import SectionThumb from "./SectionThumb.jsx";

/* TemplatePicker — visual wireframe template browser.
   Groups all available section types (+ per-layout variants) into categories.
   User clicks a card → onAdd(typeId, layoutId) is called.
   Unavailable templates are dimmed with a reason tooltip.

   Props:
     sectionTypes  Array   — from section-types.json
     sections      Array   — current page sections (for singleton checks)
     selectedKey   string  — current pageKey (for availableOn checks)
     onAdd(typeId, layoutId?) — called when user picks a template
     onClose       fn      — close the picker */

// Template groups define the visual grid sections and which type+layout combos appear.
// Layout-specific entries have the shape { typeId, layoutId, label, description }.
// Plain string entries use the section type's displayName/description.
const TEMPLATE_GROUPS = [
  {
    label: "Hero",
    items: [
      "home-hero",
      "hero",
    ],
  },
  {
    label: "Content",
    items: [
      "stats-band",
      "situations",
      "bio",
      "experience",
      "our-edge",
      "photo-break",
      "damages",
    ],
  },
  {
    label: "Text & Media",
    items: [
      { typeId: "rich-text",  layoutId: "layout-1-narrow",      label: "Text — Narrow",     description: "Centered reading column with H1/H2/H3 headings, paragraphs, lists, links (Markdown)." },
      { typeId: "rich-text",  layoutId: "layout-2-wide",        label: "Text — Wide",       description: "Full-width formatted text with heading structure (Markdown)." },
      { typeId: "rich-text",  layoutId: "layout-3-two-col",     label: "Text — Two Column", description: "Formatted text flowing across two columns on desktop (Markdown)." },
      { typeId: "image-text", layoutId: "layout-1-image-right", label: "Image Right",       description: "Headline + paragraph on the left, image on the right." },
      { typeId: "image-text", layoutId: "layout-2-image-left",  label: "Image Left",        description: "Image on the left, headline + paragraph on the right." },
      { typeId: "image-text", layoutId: "layout-3-image-top",   label: "Image Top",         description: "Wide image above centered headline + paragraph." },
    ],
  },
  {
    label: "Social Proof",
    items: [
      { typeId: "testimonials", layoutId: "layout-1-grid3col",  label: "3-Column Grid",  description: "Three equal columns. Best for 3+ testimonials." },
      { typeId: "testimonials", layoutId: "layout-2-singlecol", label: "Single Column",  description: "Stacked column. Best for 2–4 longer quotes." },
      { typeId: "testimonials", layoutId: "layout-3-featured",  label: "Large Featured", description: "One hero quote + smaller secondary quotes." },
    ],
  },
  {
    label: "FAQ",
    items: [
      { typeId: "faq", layoutId: "layout-1-fullwidth", label: "Full Width", description: "Large headline, full-width accordion below." },
      { typeId: "faq", layoutId: "layout-2-sidebar",   label: "Split Sidebar", description: "Title left, accordion right. Standard subpage style." },
    ],
  },
  {
    label: "Call to Action",
    items: [
      { typeId: "cta", layoutId: "layout-1-getquote", label: "Quote Card",   description: "Dark centered card with headline, body, and button." },
      { typeId: "cta", layoutId: "layout-2-banner",   label: "Photo Banner", description: "Full-bleed photo with overlay text and button." },
    ],
  },
  {
    label: "Marketing Pages",
    items: [
      "audience-cards",
      "service-cards",
      "comparison",
      "how-it-works",
      "process-flow",
      "bullet-columns",
    ],
  },
  {
    label: "Forms",
    items: [
      "registration-flow",
    ],
  },
];

export default function TemplatePicker({ sectionTypes, sections: _sections, selectedKey, onAdd, onClose }) {
  const [hovered, setHovered] = useState(null);

  // Resolve a group item (string or object) into a card descriptor
  function resolveItem(item) {
    if (typeof item === "string") {
      const st = sectionTypes.find(t => t.id === item);
      if (!st) return null;
      return { typeId: item, layoutId: null, label: st.displayName, description: st.description };
    }
    return item;
  }

  // Whether a type can be added right now
  function availability(typeId, _layoutId) {
    const st = sectionTypes.find(t => t.id === typeId);
    if (!st) return { ok: false, reason: "Unknown type" };
    if (Array.isArray(st.availableOn) && selectedKey && !st.availableOn.includes(selectedKey)) {
      return { ok: false, reason: `Only on: ${st.availableOn.join(", ")}` };
    }
    // Note: allowMultiple check removed — sections can now be added multiple times on a page
    return { ok: true, reason: "" };
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        zIndex: 1000, padding: "3rem 1.5rem 2rem",
        overflowY: "auto",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 760,
        fontFamily: FONT, color: INK,
        borderRadius: 6, overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.1rem 1.5rem",
          borderBottom: `1px solid ${LINE}`,
          position: "sticky", top: 0, background: "#fff", zIndex: 2,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>Add a section</div>
            <div style={{ fontSize: "0.75rem", color: INK_60, marginTop: 2 }}>
              Click a template to add it to the page
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: FONT, fontSize: "1.3rem", fontWeight: 400, lineHeight: 1,
              background: "none", border: "none", cursor: "pointer",
              color: INK_60, padding: "0.25rem 0.5rem",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Groups */}
        <div style={{ padding: "0 1.5rem 2rem", overflowY: "auto", maxHeight: "calc(85vh - 72px)" }}>
          {TEMPLATE_GROUPS.map(group => {
            const resolvedItems = group.items.map(resolveItem).filter(Boolean);
            // Hide groups that have no available items (all missing from sectionTypes)
            const knownItems = resolvedItems.filter(item => sectionTypes.some(t => t.id === item.typeId));
            if (knownItems.length === 0) return null;

            return (
              <div key={group.label} style={{ marginTop: "1.5rem" }}>
                {/* Group label */}
                <div style={{
                  fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: INK_60,
                  paddingBottom: "0.6rem",
                  borderBottom: `1px solid ${LINE}`,
                  marginBottom: "0.9rem",
                }}>
                  {group.label}
                </div>

                {/* Template card grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "0.75rem",
                }}>
                  {knownItems.map(item => {
                    const { typeId, layoutId, label, description } = item;
                    const cardKey = layoutId ? `${typeId}/${layoutId}` : typeId;
                    const avail   = availability(typeId, layoutId);
                    const isHov   = hovered === cardKey && avail.ok;

                    return (
                      <div
                        key={cardKey}
                        onClick={() => { if (avail.ok) onAdd(typeId, layoutId); }}
                        onMouseEnter={() => setHovered(cardKey)}
                        onMouseLeave={() => setHovered(null)}
                        title={avail.ok ? description : avail.reason}
                        style={{
                          cursor: avail.ok ? "pointer" : "not-allowed",
                          opacity: avail.ok ? 1 : 0.42,
                          border: `2px solid ${isHov ? NEON : LINE}`,
                          borderRadius: 6,
                          background: isHov ? "rgba(212,255,0,0.04)" : "#fff",
                          overflow: "hidden",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        {/* Wireframe thumbnail */}
                        <div style={{
                          borderBottom: `1px solid ${isHov ? "rgba(212,255,0,0.3)" : LINE}`,
                          transition: "border-color 0.15s",
                        }}>
                          <SectionThumb
                            typeId={typeId}
                            layoutId={layoutId}
                            width={180}
                            height={100}
                          />
                        </div>

                        {/* Card label */}
                        <div style={{ padding: "0.55rem 0.7rem" }}>
                          <div style={{
                            fontWeight: 700, fontSize: "0.8rem",
                            color: isHov ? "#3a5000" : INK,
                            marginBottom: 2,
                          }}>
                            {label}
                          </div>
                          {!avail.ok && (
                            <div style={{ fontSize: "0.68rem", color: "#9a6700", fontWeight: 600 }}>
                              {avail.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
