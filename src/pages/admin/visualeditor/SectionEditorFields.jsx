import React from "react";
import { INK, INK_60, LINE, NEON } from "../../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle } from "../shared.jsx";
import sectionTypesData from "../../../data/section-types.json";
import SectionThumb from "../SectionThumb.jsx";
import { getSchemeVisual } from "./scheme-visuals.js";

/* SectionEditorFields — the actual form fields for each section type.
   Used by both PropertyPanel (inline rail) and SectionEditorModal (overlay).
   Props:
     typeId           string
     form             object  — current form state
     set(key, val)    fn      — update a top-level key in form
*/

export const labelStyle = {
  display: "block", fontSize: "0.74rem", color: INK_60,
  fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 4,
};
export const fieldGroup = { marginBottom: "0.9rem" };

export default function SectionEditorFields({ typeId, form, set }) {
  return (
    <>
      {/* ── Hero (subpage) ── */}
      {typeId === "hero" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent title (italic/neon)</label><input style={inputStyle} value={form.accentTitle || ""} onChange={e => set("accentTitle", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Subtitle</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.subtitle || ""} onChange={e => set("subtitle", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Video URL</label><input style={inputStyle} value={form.video || ""} onChange={e => set("video", e.target.value || null)} placeholder="/video.mp4 or blank" /></div>
          <CTAField label="Primary CTA" value={form.ctaPrimary} onChange={v => set("ctaPrimary", v)} />
          <CTAField label="Secondary CTA (optional)" value={form.ctaSecondary} onChange={v => set("ctaSecondary", v || null)} nullable />
        </>
      )}

      {/* ── Home Hero ── */}
      {typeId === "home-hero" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Title line 1</label><input style={inputStyle} value={form.title1 || ""} onChange={e => set("title1", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title line 2 (italic/neon)</label><input style={inputStyle} value={form.title2 || ""} onChange={e => set("title2", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Subtitle</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.subtitle || ""} onChange={e => set("subtitle", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Video URL</label><input style={inputStyle} value={form.video || ""} onChange={e => set("video", e.target.value || null)} placeholder="/video.mp4 or blank" /></div>
          <CTAField label="Primary CTA" value={form.ctaPrimary} onChange={v => set("ctaPrimary", v)} />
          <CTAField label="Secondary CTA" value={form.ctaSecondary} onChange={v => set("ctaSecondary", v)} />
        </>
      )}

      {/* ── Stats Band ── */}
      {typeId === "stats-band" && (
        <>
          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.9rem" }}>Leave a label blank to use the built-in translated wording.</p>
          {(form.stats || []).map((s, i) => (
            <div key={i} style={{ ...fieldGroup, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <div><label style={labelStyle}>Value</label><input style={inputStyle} value={s.value || ""} onChange={e => { const next=[...(form.stats||[])]; next[i]={...next[i],value:e.target.value}; set("stats",next); }} /></div>
              <div><label style={labelStyle}>Label</label><input style={inputStyle} value={s.label || ""} onChange={e => { const next=[...(form.stats||[])]; next[i]={...next[i],label:e.target.value}; set("stats",next); }} placeholder="e.g. in claims traded" /></div>
            </div>
          ))}
          <div style={fieldGroup}><label style={labelStyle}>Footnote</label><input style={inputStyle} value={form.footnote || ""} onChange={e => set("footnote", e.target.value)} /></div>
        </>
      )}

      {/* ── Our Edge ── */}
      {typeId === "our-edge" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title accent</label><input style={inputStyle} value={form.titleAccent || ""} onChange={e => set("titleAccent", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Intro paragraph</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.intro || ""} onChange={e => set("intro", e.target.value)} /></div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Background Color</label>
            <select style={selectStyle} value={form.colorScheme || "white"} onChange={e => set("colorScheme", e.target.value)}>
              <option value="white">White</option>
              <option value="light-gray">Light Gray</option>
            </select>
          </div>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Points</p>
          {(form.points || []).map((p, i) => (
            <div key={p.id || i} style={{ marginBottom: "0.9rem", padding: "0.75rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
              <div style={fieldGroup}><label style={labelStyle}>Heading</label><input style={inputStyle} value={p.h || ""} onChange={e => { const next=[...(form.points||[])]; next[i]={...next[i],h:e.target.value}; set("points",next); }} /></div>
              <div><label style={labelStyle}>Body</label><textarea style={{ ...inputStyle, minHeight: 60 }} value={p.b || ""} onChange={e => { const next=[...(form.points||[])]; next[i]={...next[i],b:e.target.value}; set("points",next); }} /></div>
            </div>
          ))}
        </>
      )}

      {/* ── Relevant Experience (deal cards header) ── */}
      {typeId === "experience" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} placeholder="Relevant Experience" /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="A track record across…" /></div>
          <div style={fieldGroup}><label style={labelStyle}>Body (right column)</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.body || ""} onChange={e => set("body", e.target.value)} placeholder="A representative slice of deals across…" /></div>
          <p style={{ fontSize: "0.72rem", color: INK_60, margin: "0 0 0.9rem" }}>
            Blank fields fall back to this page's built-in copy. The deal cards themselves are managed in Content → Deals (use each deal's Pages checkboxes).
          </p>
        </>
      )}

      {/* ── Photo Break ── */}
      {typeId === "photo-break" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Image URL</label><input style={inputStyle} value={form.imageUrl || ""} onChange={e => set("imageUrl", e.target.value)} placeholder="/bg-paper.jpg" /></div>
          <div style={fieldGroup}><label style={labelStyle}>Overlay text (optional)</label><input style={inputStyle} value={form.overlayText || ""} onChange={e => set("overlayText", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Overlay accent (italic/neon)</label><input style={inputStyle} value={form.overlayAccent || ""} onChange={e => set("overlayAccent", e.target.value)} /></div>
        </>
      )}

      {/* ── CTA Banner ── */}
      {typeId === "cta-banner" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Button label</label><input style={inputStyle} value={form.cta || ""} onChange={e => set("cta", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Button link (href)</label><input style={inputStyle} value={form.href || ""} onChange={e => set("href", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Background image URL</label><input style={inputStyle} value={form.image || ""} onChange={e => set("image", e.target.value)} placeholder="/Building_Wide.jpg" /></div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Text Alignment</label>
            <select style={selectStyle} value={form.align || "left"} onChange={e => set("align", e.target.value)}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </>
      )}

      {/* ── Bottom CTA ── */}
      {typeId === "bottom-cta" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent (italic/neon)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Kicker</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.kicker || ""} onChange={e => set("kicker", e.target.value)} /></div>
          <CTAField label="Primary button" value={form.primary} onChange={v => set("primary", v)} />
          <CTAField label="Secondary button (optional)" value={form.secondary} onChange={v => set("secondary", v || null)} nullable />
        </>
      )}

      {/* ── Get Quote ── */}
      {typeId === "get-quote" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title accent</label><input style={inputStyle} value={form.titleAccent || ""} onChange={e => set("titleAccent", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Body text</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.body || ""} onChange={e => set("body", e.target.value)} /></div>
          <CTAField label="CTA button" value={form.cta} onChange={v => set("cta", v)} />
        </>
      )}

      {/* ── Unified CTA ── */}
      {typeId === "cta" && (
        <>
          <VisualLayoutColorPicker typeId="cta" form={form} set={set} />
          {(form.layout === "layout-1-getquote" || !form.layout) && (
            <>
              <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Title accent</label><input style={inputStyle} value={form.titleAccent || ""} onChange={e => set("titleAccent", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Body text</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.body || ""} onChange={e => set("body", e.target.value)} /></div>
              <CTAField label="Primary button" value={form.cta} onChange={v => set("cta", v)} />
              <CTAField label="Secondary button (optional)" value={form.secondary} onChange={v => set("secondary", v || null)} nullable />
            </>
          )}
          {form.layout === "layout-2-banner" && (
            <>
              <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Button label</label><input style={inputStyle} value={form.cta || ""} onChange={e => set("cta", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Button link</label><input style={inputStyle} value={form.href || ""} onChange={e => set("href", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Background image URL</label><input style={inputStyle} value={form.image || ""} onChange={e => set("image", e.target.value)} placeholder="/Building_Wide.jpg" /></div>
            </>
          )}
          {form.layout === "layout-3-bottomcta" && (
            <>
              <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Accent</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Kicker</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.kicker || ""} onChange={e => set("kicker", e.target.value)} /></div>
              <CTAField label="Primary button" value={form.primary} onChange={v => set("primary", v)} />
              <CTAField label="Secondary button (optional)" value={form.secondary} onChange={v => set("secondary", v || null)} nullable />
            </>
          )}
        </>
      )}

      {/* ── FAQ ── */}
      {typeId === "faq" && (
        <>
          <ColorSchemePicker typeId="faq" value={form.colorScheme} onChange={v => set("colorScheme", v)} />
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent (italic/neon)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>CTA label (sidebar layout)</label><input style={inputStyle} value={form.ctaLabel || ""} onChange={e => set("ctaLabel", e.target.value)} placeholder="e.g. Ask a Question" /></div>
          <div style={fieldGroup}><label style={labelStyle}>CTA link</label><input style={inputStyle} value={form.ctaHref || ""} onChange={e => set("ctaHref", e.target.value)} placeholder="/contact" /></div>
        </>
      )}

      {/* ── Testimonials ── */}
      {typeId === "testimonials" && (
        <>
          <VisualLayoutColorPicker typeId="testimonials" form={form} set={set} />
          <p style={{ fontSize: "0.78rem", color: INK_60, marginTop: "0.25rem" }}>
            Testimonials content is managed in <strong>Content → Testimonials</strong>.
          </p>
        </>
      )}

      {/* ── Audience Cards ── */}
      {typeId === "audience-cards" && (
        <>
          <ColorSchemePicker typeId="audience-cards" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["light-gray","dark","white"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Layout</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.layout || "grid-2col"} onChange={e => set("layout", e.target.value)}>
                <option value="grid-2col">2-Column Grid</option>
                <option value="grid-3col">3-Column Grid</option>
                <option value="list">List</option>
              </select>
            </div>
            <div><label style={labelStyle}>Card Style</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.cardStyle || "standard"} onChange={e => set("cardStyle", e.target.value)}>
                <option value="standard">Standard</option>
                <option value="white">White</option>
                <option value="black">Black</option>
                <option value="light-gray">Light Gray</option>
                <option value="neon">Neon (Bright Green)</option>
                <option value="dark">Dark Glass</option>
                <option value="light-glass">Light Glass</option>
                <option value="clear-glass">Clear Glass</option>
                <option value="neon-glass">Neon Glass (Green)</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Card Radius</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.cardRadius || "rounded"} onChange={e => set("cardRadius", e.target.value)}>
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
              </select>
            </div>
          </div>
          <div style={fieldGroup}><label style={labelStyle}>Background Image (URL)</label><input style={inputStyle} value={form.backgroundImage || ""} onChange={e => set("backgroundImage", e.target.value)} placeholder="https://..." /></div>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <CardsArrayEditor label="Cards" cards={form.cards || []} onChange={v => set("cards", v)} showPriority />
        </>
      )}

      {/* ── Service Cards ── */}
      {typeId === "service-cards" && (
        <>
          <ColorSchemePicker typeId="service-cards" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["dark","light-gray","white"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Layout</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.layout || "grid-3col"} onChange={e => set("layout", e.target.value)}>
                <option value="grid-3col">3-Column Grid</option>
                <option value="grid-2col">2-Column Grid</option>
                <option value="list">List</option>
              </select>
            </div>
            <div><label style={labelStyle}>Card Style</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.cardStyle || "standard"} onChange={e => set("cardStyle", e.target.value)}>
                <option value="standard">Standard</option>
                <option value="white">White</option>
                <option value="black">Black</option>
                <option value="light-gray">Light Gray</option>
                <option value="neon">Neon (Bright Green)</option>
                <option value="dark">Dark Glass</option>
                <option value="light-glass">Light Glass</option>
                <option value="clear-glass">Clear Glass</option>
                <option value="neon-glass">Neon Glass (Green)</option>
                <option value="liquid-glass">Liquid Glass (Legacy)</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Card Radius</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.cardRadius || "rounded"} onChange={e => set("cardRadius", e.target.value)}>
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
              </select>
            </div>
          </div>
          <div style={fieldGroup}><label style={labelStyle}>Background Image (URL)</label><input style={inputStyle} value={form.backgroundImage || ""} onChange={e => set("backgroundImage", e.target.value)} placeholder="https://..." /></div>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <CardsArrayEditor label="Cards" cards={form.cards || []} onChange={v => set("cards", v)} />
        </>
      )}

      {/* ── Comparison ── */}
      {typeId === "comparison" && (
        <>
          <ColorSchemePicker typeId="comparison" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["light-gray","dark","white"]} />
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <ComparisonColumnEditor label="Old way" col={form.oldWay || { title: "", items: [] }} onChange={v => set("oldWay", v)} />
          <ComparisonColumnEditor label="New way (Turnpage)" col={form.newWay || { title: "", items: [] }} onChange={v => set("newWay", v)} />
        </>
      )}

      {/* ── How It Works ── */}
      {typeId === "how-it-works" && (
        <>
          <ColorSchemePicker typeId="how-it-works" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["dark","light-gray","white"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Card Style</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.cardStyle || "standard"} onChange={e => set("cardStyle", e.target.value)}>
                <option value="standard">Standard</option>
                <option value="white">White</option>
                <option value="black">Black</option>
                <option value="light-gray">Light Gray</option>
                <option value="neon">Neon (Bright Green)</option>
                <option value="dark">Dark Glass</option>
                <option value="light-glass">Light Glass</option>
                <option value="clear-glass">Clear Glass</option>
                <option value="neon-glass">Neon Glass (Green)</option>
              </select>
            </div>
            <div><label style={labelStyle}>Card Radius</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.cardRadius || "rounded"} onChange={e => set("cardRadius", e.target.value)}>
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
              </select>
            </div>
          </div>
          <div style={fieldGroup}><label style={labelStyle}>Background Image (URL)</label><input style={inputStyle} value={form.backgroundImage || ""} onChange={e => set("backgroundImage", e.target.value)} placeholder="https://..." /></div>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Kicker (right column subtitle)</label><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.kicker || ""} onChange={e => set("kicker", e.target.value)} /></div>
          <StepsArrayEditor steps={form.steps || []} onChange={v => set("steps", v)} />
        </>
      )}

      {/* ── Bookmark (optional, all sections) ── */}
      <div style={{ marginTop: "1.2rem", marginBottom: "0.9rem" }}>
        <div style={fieldGroup}>
          <label style={labelStyle}>Section Bookmark (optional)</label>
          <input
            style={inputStyle}
            placeholder="e.g., capital-advisory"
            value={form._bookmark || ""}
            onChange={e => set("_bookmark", e.target.value || null)}
          />
          <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 4, margin: 0 }}>
            Creates a custom URL anchor. E.g., /page#{form._bookmark || 'section-id'}. Leave blank for auto-generated ID.
          </p>
        </div>
      </div>

      {/* ── Spacing & Height (universal) ── */}
      <div style={{ marginTop: "1.4rem", paddingTop: "1.2rem", borderTop: `1px solid ${LINE}` }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_60, marginBottom: "0.8rem" }}>
          Spacing &amp; Height
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Space above</label>
            <select style={{ ...inputStyle, marginTop: 4 }} value={form._spacingTop || "none"} onChange={e => set("_spacingTop", e.target.value)}>
              <option value="none">None</option>
              <option value="small">Small (2rem)</option>
              <option value="medium">Medium (4rem)</option>
              <option value="large">Large (6rem)</option>
              <option value="xlarge">X-Large (10rem)</option>
            </select>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Space below</label>
            <select style={{ ...inputStyle, marginTop: 4 }} value={form._spacingBottom || "none"} onChange={e => set("_spacingBottom", e.target.value)}>
              <option value="none">None</option>
              <option value="small">Small (2rem)</option>
              <option value="medium">Medium (4rem)</option>
              <option value="large">Large (6rem)</option>
              <option value="xlarge">X-Large (10rem)</option>
            </select>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Min height</label>
            <select style={{ ...inputStyle, marginTop: 4 }} value={form._minHeight || "auto"} onChange={e => set("_minHeight", e.target.value)}>
              <option value="auto">Auto</option>
              <option value="50">50vh</option>
              <option value="75">75vh</option>
              <option value="100">Full screen</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Shared visual helpers ─────────────────────────────────────────────── */

/* Swatches/labels come from scheme-visuals.js — palette-registry-driven for
   faq/testimonials/cta (always matches what renders), static for the rest. */

function VisualLayoutColorPicker({ typeId, form, set }) {
  const typeDef = (sectionTypesData.sectionTypes || []).find(t => t.id === typeId);
  if (!typeDef || !typeDef.layouts || typeDef.layouts.length < 2) return null;
  const currentLayout = form.layout || typeDef.defaultLayout || typeDef.layouts[0].id;
  const layoutDef = typeDef.layouts.find(l => l.id === currentLayout) || typeDef.layouts[0];
  const supportedSchemes = layoutDef.supportedColorSchemes || ["light"];
  const currentScheme = form.colorScheme || typeDef.defaultColorScheme || supportedSchemes[0];

  function handleLayoutChange(newLayout) {
    const newLayoutDef = typeDef.layouts.find(l => l.id === newLayout);
    const newSchemes = newLayoutDef?.supportedColorSchemes || [];
    const newScheme = newSchemes.includes(currentScheme) ? currentScheme : (newSchemes[0] || currentScheme);
    set("layout", newLayout);
    set("colorScheme", newScheme);
  }

  return (
    <div style={{ marginBottom: "1.2rem", padding: "0.85rem", background: "#F8F9FA", border: `1px solid ${LINE}`, borderLeft: `3px solid ${NEON}` }}>
      <p style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_60, marginBottom: "0.5rem" }}>Layout</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        {typeDef.layouts.map(l => {
          const active = currentLayout === l.id;
          return (
            <button key={l.id} type="button" onClick={() => handleLayoutChange(l.id)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", padding: "0.4rem", border: `2px solid ${active ? NEON : "#E5E7EB"}`, background: active ? "rgba(212,255,0,0.06)" : "#fff", borderRadius: 5, cursor: "pointer", outline: "none" }}>
              <div style={{ border: "1px solid #E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                <SectionThumb typeId={typeId} layoutId={l.id} width={90} height={54} />
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: active ? 700 : 500, color: active ? "#3a5000" : INK_60 }}>{l.displayName}</span>
            </button>
          );
        })}
      </div>
      {supportedSchemes.length > 1 && (
        <>
          <p style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_60, marginBottom: "0.4rem" }}>Color</p>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {supportedSchemes.map(key => {
              const v = getSchemeVisual(typeId, key);
              const active = currentScheme === key;
              return (
                <button key={key} type="button" onClick={() => set("colorScheme", key)} title={v.label}
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.5rem 0.25rem 0.3rem", border: `2px solid ${active ? NEON : "#E5E7EB"}`, background: active ? "rgba(212,255,0,0.06)" : "#fff", borderRadius: 16, cursor: "pointer", outline: "none" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: v.swatch, border: `1px solid ${v.border}`, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.68rem", fontWeight: active ? 700 : 500, color: active ? "#3a5000" : INK_60 }}>{v.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ColorSchemePicker({ typeId, value, onChange, schemes: schemesProp }) {
  const typeDef = (sectionTypesData.sectionTypes || []).find(t => t.id === typeId);
  const schemes = schemesProp || typeDef?.supportedColorSchemes || ["light", "light-gray", "light-card"];
  const current = value || typeDef?.defaultColorScheme || schemes[0];
  return (
    <div style={{ marginBottom: "1.2rem", padding: "0.85rem", background: "#F8F9FA", border: `1px solid ${LINE}`, borderLeft: `3px solid ${NEON}` }}>
      <p style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_60, marginBottom: "0.5rem" }}>Background</p>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {schemes.map(key => {
          const v = getSchemeVisual(typeId, key);
          const active = current === key;
          return (
            <button key={key} type="button" onClick={() => onChange(key)} title={v.label}
              style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.55rem 0.3rem 0.35rem", border: `2px solid ${active ? NEON : "#E5E7EB"}`, background: active ? "rgba(212,255,0,0.06)" : "#fff", borderRadius: 16, cursor: "pointer", outline: "none" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: v.swatch, border: `1px solid ${v.border}`, flexShrink: 0 }} />
              <span style={{ fontSize: "0.7rem", fontWeight: active ? 700 : 500, color: active ? "#3a5000" : INK_60 }}>{v.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CTAField({ label, value, onChange, nullable }) {
  const v = value || { label: "", href: "" };
  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div><label style={{ fontSize: "0.7rem", color: INK_60 }}>Label</label><input style={{ ...inputStyle, marginTop: 2 }} value={v.label} onChange={e => onChange({ ...v, label: e.target.value })} /></div>
        <div><label style={{ fontSize: "0.7rem", color: INK_60 }}>Href</label><input style={{ ...inputStyle, marginTop: 2 }} value={v.href} onChange={e => onChange({ ...v, href: e.target.value })} /></div>
      </div>
      {nullable && (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem", marginTop: 5, cursor: "pointer" }}>
          <input type="checkbox" checked={!value} onChange={e => onChange(e.target.checked ? null : { label: "", href: "" })} />
          Hide this button
        </label>
      )}
    </div>
  );
}

function CardsArrayEditor({ label, cards, onChange, showPriority }) {
  const handleChange = (i, field, val) => {
    const newCards = [...(cards || [])];
    newCards[i] = { ...newCards[i], [field]: val };
    onChange(newCards);
  };

  const handleAdd = () => {
    onChange([...(cards || []), { id: `card-${Date.now()}`, title: "", body: "", priority: false }]);
  };

  const handleRemove = (i) => {
    onChange((cards || []).filter((_, idx) => idx !== i));
  };

  const handleMoveUp = (i) => {
    if (i <= 0) return;
    const newCards = [...(cards || [])];
    [newCards[i - 1], newCards[i]] = [newCards[i], newCards[i - 1]];
    onChange(newCards);
  };

  const handleMoveDown = (i) => {
    if (i >= (cards || []).length - 1) return;
    const newCards = [...(cards || [])];
    [newCards[i], newCards[i + 1]] = [newCards[i + 1], newCards[i]];
    onChange(newCards);
  };

  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {(cards || []).map((c, i) => (
        <div key={c.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div style={{ flex: 1 }}>
              <input style={{ ...inputStyle, marginBottom: 4 }} placeholder="Title" value={c.title} onChange={e => handleChange(i, "title", e.target.value)} />
              <textarea style={{ ...inputStyle, minHeight: 50, marginBottom: 4 }} placeholder="Body" value={c.body} onChange={e => handleChange(i, "body", e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
              <button type="button" onClick={() => handleMoveUp(i)} disabled={i === 0} aria-label="Move up" title="Move up" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === 0 ? 0.5 : 1, cursor: i === 0 ? "default" : "pointer" }}>↑</button>
              <button type="button" onClick={() => handleMoveDown(i)} disabled={i === (cards || []).length - 1} aria-label="Move down" title="Move down" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === (cards || []).length - 1 ? 0.5 : 1, cursor: i === (cards || []).length - 1 ? "default" : "pointer" }}>↓</button>
            </div>
          </div>
          {showPriority && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem", marginBottom: 4, cursor: "pointer" }}>
              <input type="checkbox" checked={c.priority || false} onChange={e => handleChange(i, "priority", e.target.checked)} />
              Priority
            </label>
          )}
          <button type="button" onClick={() => handleRemove(i)} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", marginLeft: 8 }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={handleAdd} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.3rem 0.5rem" }}>+ Add card</button>
    </div>
  );
}

function ComparisonColumnEditor({ label, col, onChange }) {
  const handleItemChange = (i, val) => {
    const newItems = [...(col.items || [])];
    newItems[i] = val;
    onChange({ ...col, items: newItems });
  };

  const handleAddItem = () => {
    onChange({ ...col, items: [...(col.items || []), ""] });
  };

  const handleRemoveItem = (i) => {
    onChange({ ...col, items: (col.items || []).filter((_, idx) => idx !== i) });
  };

  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Column title" value={col.title} onChange={e => onChange({ ...col, title: e.target.value })} />
      {(col.items || []).map((item, i) => (
        <div key={i} style={{ marginBottom: 6, display: "flex", gap: 4 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Item" value={item} onChange={e => handleItemChange(i, e.target.value)} />
          <button type="button" onClick={() => handleRemoveItem(i)} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", width: 60 }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={handleAddItem} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.3rem 0.5rem" }}>+ Add item</button>
    </div>
  );
}

function StepsArrayEditor({ steps, onChange }) {
  const handleChange = (i, field, val) => {
    const newSteps = [...(steps || [])];
    newSteps[i] = { ...newSteps[i], [field]: val };
    onChange(newSteps);
  };

  const handleAdd = () => {
    const nextNum = ((steps || []).length + 1).toString().padStart(2, "0");
    onChange([...(steps || []), { id: `step-${Date.now()}`, n: nextNum, title: "", body: "" }]);
  };

  const handleRemove = (i) => {
    onChange((steps || []).filter((_, idx) => idx !== i));
  };

  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 8 }}>Steps</div>
      {(steps || []).map((s, i) => (
        <div key={s.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 4, marginBottom: 4 }}>
            <input style={{ ...inputStyle }} placeholder="01" value={s.n} onChange={e => handleChange(i, "n", e.target.value)} />
            <input style={{ ...inputStyle }} placeholder="Step title" value={s.title} onChange={e => handleChange(i, "title", e.target.value)} />
          </div>
          <textarea style={{ ...inputStyle, minHeight: 50, marginBottom: 4 }} placeholder="Step description" value={s.body} onChange={e => handleChange(i, "body", e.target.value)} />
          <button type="button" onClick={() => handleRemove(i)} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={handleAdd} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.3rem 0.5rem" }}>+ Add step</button>
    </div>
  );
}
