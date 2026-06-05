import React, { useState } from "react";
import { FONT, INK, INK_60, LINE, SURFACE, NEON } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";
import { GLOBAL_COLOR_SCHEMES, SECTION_COLOR_SUPPORT } from "../../components/sections/ColorSchemes.js";
import sectionTypesData from "../../data/section-types.json";

/* SectionEditorModal — edit the inline content of a section.
   Only section types with dataSource:"inline" have editable content here.
   The editor adapts based on section type (hero, stats-band, our-edge, etc.) */

const labelStyle = { display: "block", fontSize: "0.74rem", color: INK_60, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 4 };
const fieldGroup = { marginBottom: "0.9rem" };

export default function SectionEditorModal({ section, sectionType, onSave, onClose }) {
  const [form, setForm] = useState(JSON.parse(JSON.stringify(section.content || {})));

  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })); }
  function setNested(key, subkey, value) { setForm(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [subkey]: value } })); }

  function save() { onSave(form); }

  const typeId = section.type;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "2rem 1rem", overflowY: "auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: SURFACE, border: `1px solid ${LINE}`, padding: "1.5rem", maxWidth: 560, width: "100%", fontFamily: FONT, color: INK }}>
        <h3 style={{ fontWeight: 800, marginBottom: "1.2rem" }}>
          Edit: {sectionType ? sectionType.displayName : section.type}
        </h3>

        {/* ── Hero (subpage) ── */}
        {(typeId === "hero") && (
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
            <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.9rem" }}>Edit the three headline statistics. Leave a label or footnote blank to use the site's built-in translated wording (recommended for multi-language support).</p>
            {(form.stats || []).map((s, i) => (
              <div key={i} style={{ ...fieldGroup, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <div><label style={labelStyle}>Value</label><input style={inputStyle} value={s.value || ""} onChange={e => { const next=[...(form.stats||[])]; next[i]={...next[i],value:e.target.value}; set("stats",next); }} /></div>
                <div><label style={labelStyle}>Label (English)</label><input style={inputStyle} value={s.label || ""} onChange={e => { const next=[...(form.stats||[])]; next[i]={...next[i],label:e.target.value}; set("stats",next); }} placeholder="e.g. in claims traded" /></div>
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
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Points</p>
            {(form.points || []).map((p, i) => (
              <div key={p.id || i} style={{ marginBottom: "0.9rem", padding: "0.75rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
                <div style={fieldGroup}><label style={labelStyle}>Heading</label><input style={inputStyle} value={p.h || ""} onChange={e => { const next=[...(form.points||[])]; next[i]={...next[i],h:e.target.value}; set("points",next); }} /></div>
                <div><label style={labelStyle}>Body</label><textarea style={{ ...inputStyle, minHeight: 60 }} value={p.b || ""} onChange={e => { const next=[...(form.points||[])]; next[i]={...next[i],b:e.target.value}; set("points",next); }} /></div>
              </div>
            ))}
          </>
        )}

        {/* ── Photo Break ── */}
        {typeId === "photo-break" && (
          <>
            <div style={fieldGroup}><label style={labelStyle}>Image URL</label><input style={inputStyle} value={form.imageUrl || ""} onChange={e => set("imageUrl", e.target.value)} placeholder="/bg-paper.jpg" /></div>
            <div style={fieldGroup}><label style={labelStyle}>Overlay text (optional)</label><input style={inputStyle} value={form.overlayText || ""} onChange={e => set("overlayText", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Overlay accent (italic/neon, optional)</label><input style={inputStyle} value={form.overlayAccent || ""} onChange={e => set("overlayAccent", e.target.value)} /></div>
          </>
        )}

        {/* ── CTA Banner ── */}
        {typeId === "cta-banner" && (
          <>
            <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Button label</label><input style={inputStyle} value={form.cta || ""} onChange={e => set("cta", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Button link (href)</label><input style={inputStyle} value={form.href || ""} onChange={e => set("href", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Background image URL</label><input style={inputStyle} value={form.image || ""} onChange={e => set("image", e.target.value)} placeholder="/Building_Wide.jpg" /></div>
          </>
        )}

        {/* ── Bottom CTA ── */}
        {typeId === "bottom-cta" && (
          <>
            <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Accent (italic/neon)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Kicker (small body text)</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.kicker || ""} onChange={e => set("kicker", e.target.value)} /></div>
            <CTAField label="Primary button" value={form.primary} onChange={v => set("primary", v)} />
            <CTAField label="Secondary button (optional)" value={form.secondary} onChange={v => set("secondary", v || null)} nullable />
          </>
        )}

        {/* ── Get Quote ── */}
        {typeId === "get-quote" && (
          <>
            <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Title accent (italic/neon)</label><input style={inputStyle} value={form.titleAccent || ""} onChange={e => set("titleAccent", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Body text</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.body || ""} onChange={e => set("body", e.target.value)} /></div>
            <CTAField label="CTA button" value={form.cta} onChange={v => set("cta", v)} />
          </>
        )}

        {/* ── Unified CTA (new template-based type) ── */}
        {typeId === "cta" && (
          <>
            <VisualLayoutColorPicker typeId="cta" form={form} set={set} sectionTypes={sectionTypesData.sectionTypes} />
            {/* Layout-specific fields */}
            {(form.layout === "layout-1-getquote" || !form.layout) && (
              <>
                <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Title accent (italic/neon)</label><input style={inputStyle} value={form.titleAccent || ""} onChange={e => set("titleAccent", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Body text</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.body || ""} onChange={e => set("body", e.target.value)} /></div>
                <CTAField label="CTA button" value={form.cta} onChange={v => set("cta", v)} />
              </>
            )}
            {form.layout === "layout-2-banner" && (
              <>
                <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Button label</label><input style={inputStyle} value={form.cta || ""} onChange={e => set("cta", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Button link (href)</label><input style={inputStyle} value={form.href || ""} onChange={e => set("href", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Background image URL</label><input style={inputStyle} value={form.image || ""} onChange={e => set("image", e.target.value)} placeholder="/Building_Wide.jpg" /></div>
              </>
            )}
            {form.layout === "layout-3-bottomcta" && (
              <>
                <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Accent (italic/neon)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
                <div style={fieldGroup}><label style={labelStyle}>Kicker (small body text)</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.kicker || ""} onChange={e => set("kicker", e.target.value)} /></div>
                <CTAField label="Primary button" value={form.primary} onChange={v => set("primary", v)} />
                <CTAField label="Secondary button (optional)" value={form.secondary} onChange={v => set("secondary", v || null)} nullable />
              </>
            )}
          </>
        )}

        {/* ── FAQ (color only — layout is auto-selected by page) ── */}
        {typeId === "faq" && (
          <>
            <ColorSchemePicker
              typeId="faq"
              value={form.colorScheme}
              onChange={v => set("colorScheme", v)}
              sectionTypes={sectionTypesData.sectionTypes}
            />
            <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Accent (italic/neon)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>CTA button label (sidebar layout only)</label><input style={inputStyle} value={form.ctaLabel || ""} onChange={e => set("ctaLabel", e.target.value)} placeholder="e.g. Ask a Question" /></div>
            <div style={fieldGroup}><label style={labelStyle}>CTA button link</label><input style={inputStyle} value={form.ctaHref || ""} onChange={e => set("ctaHref", e.target.value)} placeholder="/contact" /></div>
          </>
        )}

        {/* ── Testimonials (visual layout + color picker) ── */}
        {typeId === "testimonials" && (
          <>
            <VisualLayoutColorPicker
              typeId="testimonials"
              form={form}
              set={set}
              sectionTypes={sectionTypesData.sectionTypes}
            />
            <p style={{ fontSize: "0.78rem", color: INK_60, marginTop: "0.25rem" }}>
              Testimonials content is managed in the <strong>Content → Testimonials</strong> tab.
            </p>
          </>
        )}

        {/* Fallback for unrecognized inline types — raw JSON */}
        {!["hero","home-hero","stats-band","our-edge","photo-break","cta-banner","bottom-cta","get-quote","cta","faq","testimonials"].includes(typeId) && (
          <div>
            <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.5rem" }}>
              This section type doesn't have a custom editor yet. Raw JSON:
            </p>
            <textarea
              style={{ ...inputStyle, minHeight: 200, fontFamily: "monospace", fontSize: "0.8rem" }}
              value={JSON.stringify(form, null, 2)}
              onChange={e => { try { setForm(JSON.parse(e.target.value)); } catch {} }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: "1.2rem" }}>
          <button style={btnPrimaryStyle} onClick={save}>Apply changes</button>
          <button style={btnStyle} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Visual color scheme definitions (for swatches) ────────────────────── */
const SCHEME_VISUALS = {
  "light":       { label: "White",      swatch: "#FFFFFF",      text: "#0A0A0A", border: "#E0E0E0" },
  "light-gray":  { label: "Light Gray", swatch: "#F4F5F7",      text: "#0A0A0A", border: "#E0E0E0" },
  "light-card":  { label: "Card",       swatch: "#FFFFFF",      text: "#0A0A0A", border: "#E0E0E0" },
  "dark":        { label: "Dark",       swatch: "#0A0A0A",      text: "#FFFFFF", border: "#333"    },
  "photo":       { label: "Photo",      swatch: "linear-gradient(135deg,#6b7280 0%,#374151 100%)", text: "#FFFFFF", border: "#555" },
};

/* ── Layout thumbnail sketches (drawn with CSS divs) ─────────────────────
   Each returns a tiny 96×60 pixel schematic of the layout.               */
function LayoutThumb({ layoutId }) {
  const s = { position: "absolute" };
  const line = (t, l, w, h, bg = "#0A0A0A") => (
    <div style={{ ...s, top: t, left: l, width: w, height: h, background: bg, borderRadius: 1 }} />
  );

  const sketches = {
    // FAQ: full-width stacked lines
    "layout-1-fullwidth": (
      <>
        {line(8,  10, 76, 4)}
        {line(16, 10, 55, 3, "rgba(0,0,0,0.25)")}
        {line(24, 10, 76, 1, "rgba(0,0,0,0.12)")}
        {line(29, 10, 72, 3, "rgba(0,0,0,0.25)")}
        {line(36, 10, 76, 1, "rgba(0,0,0,0.12)")}
        {line(41, 10, 68, 3, "rgba(0,0,0,0.25)")}
        {line(48, 10, 76, 1, "rgba(0,0,0,0.12)")}
      </>
    ),
    // FAQ: split sidebar
    "layout-2-sidebar": (
      <>
        {line(8,  10, 30, 4)}
        {line(16, 10, 24, 3, "rgba(0,0,0,0.25)")}
        {line(22, 10, 20, 2, "rgba(0,0,0,0.25)")}
        {line(8,  48, 34, 1, "rgba(0,0,0,0.12)")}
        {line(13, 48, 34, 3, "rgba(0,0,0,0.25)")}
        {line(20, 48, 34, 1, "rgba(0,0,0,0.12)")}
        {line(25, 48, 34, 3, "rgba(0,0,0,0.25)")}
        {line(32, 48, 34, 1, "rgba(0,0,0,0.12)")}
      </>
    ),
    // Testimonials: 3-col grid
    "layout-1-grid3col": (
      <>
        {[10, 38, 66].map(x => (
          <div key={x} style={{ ...s, top: 6, left: x, width: 22, height: 50, border: "1.5px solid rgba(0,0,0,0.18)", borderTop: "2.5px solid #0A0A0A" }}>
            {line(4,  3, 16, 2, "rgba(0,0,0,0.2)")}
            {line(9,  3, 16, 2, "rgba(0,0,0,0.2)")}
            {line(14, 3, 12, 2, "rgba(0,0,0,0.2)")}
            {line(20, 3, 10, 2, "rgba(0,0,0,0.4)")}
          </div>
        ))}
      </>
    ),
    // Testimonials: single column
    "layout-2-singlecol": (
      <>
        {[10, 30, 48].map(t => (
          <div key={t} style={{ ...s, top: t, left: 20, right: 20, borderTop: "2px solid #0A0A0A", paddingTop: 3 }}>
            {line(3,  0, 56, 2, "rgba(0,0,0,0.2)")}
            {line(8,  0, 40, 2, "rgba(0,0,0,0.2)")}
          </div>
        ))}
      </>
    ),
    // Testimonials: large featured
    "layout-3-featured": (
      <>
        <div style={{ ...s, top: 4, left: 28, fontSize: 28, lineHeight: 1, color: "rgba(0,0,0,0.12)", fontFamily: "Georgia,serif" }}>"</div>
        {line(22, 12, 72, 3)}
        {line(29, 16, 64, 2, "rgba(0,0,0,0.25)")}
        {line(36, 12, 72, 2, "rgba(0,0,0,0.25)")}
        {line(46, 30, 36, 1, "rgba(0,0,0,0.15)")}
        {line(50, 24, 48, 2, "rgba(0,0,0,0.3)")}
      </>
    ),
    // CTA: dark card (get-quote)
    "layout-1-getquote": (
      <div style={{ ...s, inset: 5, background: "#0A0A0A", borderRadius: 3, overflow: "hidden" }}>
        {line(8,  20, 56, 3, "rgba(212,255,0,0.8)")}
        {line(16, 14, 68, 4, "#fff")}
        {line(25, 20, 56, 2, "rgba(255,255,255,0.4)")}
        <div style={{ ...s, bottom: 10, left: "50%", transform: "translateX(-50%)", width: 36, height: 7, background: "#D4FF00", borderRadius: 2 }} />
      </div>
    ),
    // CTA: photo banner
    "layout-2-banner": (
      <div style={{ ...s, inset: 5, background: "linear-gradient(135deg,#6b7280 0%,#374151 100%)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ ...s, inset: 0, background: "rgba(0,0,0,0.35)" }} />
        {line(14, 12, 72, 4, "#fff")}
        {line(23, 20, 56, 2, "rgba(255,255,255,0.6)")}
        <div style={{ ...s, bottom: 8, left: "50%", transform: "translateX(-50%)", width: 36, height: 7, background: "#D4FF00", borderRadius: 2 }} />
      </div>
    ),
  };

  return (
    <div style={{ position: "relative", width: 96, height: 60, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
      {sketches[layoutId] || <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#999" }}>—</div>}
    </div>
  );
}

/* ── Visual Layout + Color Picker ────────────────────────────────────────
   Shows clickable layout cards (with thumbnail sketches) + color swatches. */
function VisualLayoutColorPicker({ typeId, form, set, sectionTypes }) {
  const typeDef = (sectionTypes || []).find(t => t.id === typeId);
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
    <div style={{ marginBottom: "1.2rem", padding: "1rem", background: "#F8F9FA", border: `1px solid ${LINE}`, borderLeft: `3px solid ${NEON}` }}>
      {/* Layout cards */}
      <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_60, marginBottom: "0.6rem" }}>
        Layout
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {typeDef.layouts.map(l => {
          const active = currentLayout === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => handleLayoutChange(l.id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
                padding: "0.5rem",
                border: `2px solid ${active ? NEON : "#E5E7EB"}`,
                background: active ? "rgba(212,255,0,0.06)" : "#fff",
                borderRadius: 6, cursor: "pointer",
                outline: "none", transition: "border-color 0.15s",
              }}
            >
              <LayoutThumb layoutId={l.id} />
              <span style={{
                fontSize: "0.72rem", fontWeight: active ? 700 : 500,
                color: active ? "#3a5000" : INK_60,
                letterSpacing: "0.01em",
              }}>
                {l.displayName}
              </span>
            </button>
          );
        })}
      </div>
      {layoutDef?.description && (
        <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.9rem", marginTop: "-0.5rem" }}>
          {layoutDef.description}
        </p>
      )}

      {/* Color swatches */}
      {supportedSchemes.length > 1 && (
        <>
          <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_60, marginBottom: "0.5rem" }}>
            Color Scheme
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {supportedSchemes.map(key => {
              const v = SCHEME_VISUALS[key] || { label: key, swatch: "#eee", text: "#000", border: "#ccc" };
              const active = currentScheme === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("colorScheme", key)}
                  title={v.label}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.3rem 0.6rem 0.3rem 0.4rem",
                    border: `2px solid ${active ? NEON : "#E5E7EB"}`,
                    background: active ? "rgba(212,255,0,0.06)" : "#fff",
                    borderRadius: 20, cursor: "pointer", outline: "none",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: v.swatch,
                    border: `1px solid ${v.border}`,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: "0.72rem", fontWeight: active ? 700 : 500, color: active ? "#3a5000" : INK_60 }}>
                    {v.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Color-only picker (for FAQ — layout is auto, just pick background) ──*/
function ColorSchemePicker({ typeId, value, onChange, sectionTypes }) {
  const typeDef = (sectionTypes || []).find(t => t.id === typeId);
  const schemes = typeDef?.supportedColorSchemes || ["light", "light-gray", "light-card"];
  const current = value || typeDef?.defaultColorScheme || schemes[0];

  return (
    <div style={{ marginBottom: "1.2rem", padding: "1rem", background: "#F8F9FA", border: `1px solid ${LINE}`, borderLeft: `3px solid ${NEON}` }}>
      <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_60, marginBottom: "0.6rem" }}>
        Background Color
      </p>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        {schemes.map(key => {
          const v = SCHEME_VISUALS[key] || { label: key, swatch: "#eee", text: "#000", border: "#ccc" };
          const active = current === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              title={v.label}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.35rem 0.75rem 0.35rem 0.45rem",
                border: `2px solid ${active ? NEON : "#E5E7EB"}`,
                background: active ? "rgba(212,255,0,0.06)" : "#fff",
                borderRadius: 20, cursor: "pointer", outline: "none",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: v.swatch, border: `1px solid ${v.border}`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "0.75rem", fontWeight: active ? 700 : 500, color: active ? "#3a5000" : INK_60 }}>
                {v.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Reusable CTA { label, href } editor */
function CTAField({ label, value, onChange, nullable }) {
  const v = value || { label: "", href: "" };
  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.7rem 0.8rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><label style={{ fontSize: "0.72rem", color: INK_60 }}>Label</label><input style={{ ...inputStyle, marginTop: 2 }} value={v.label} onChange={e => onChange({ ...v, label: e.target.value })} /></div>
        <div><label style={{ fontSize: "0.72rem", color: INK_60 }}>Href</label><input style={{ ...inputStyle, marginTop: 2 }} value={v.href} onChange={e => onChange({ ...v, href: e.target.value })} /></div>
      </div>
      {nullable && (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem", marginTop: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={!value} onChange={e => onChange(e.target.checked ? null : { label: "", href: "" })} />
          Hide this button
        </label>
      )}
    </div>
  );
}
