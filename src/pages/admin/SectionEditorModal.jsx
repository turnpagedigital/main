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
            <LayoutColorPicker typeId="cta" form={form} set={set} sectionTypes={sectionTypesData.sectionTypes} />
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

        {/* ── FAQ (layout + color pickers) ── */}
        {typeId === "faq" && (
          <>
            <LayoutColorPicker typeId="faq" form={form} set={set} sectionTypes={sectionTypesData.sectionTypes} />
            <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>Accent (italic/neon)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
            <div style={fieldGroup}><label style={labelStyle}>CTA button label (sidebar layout only)</label><input style={inputStyle} value={form.ctaLabel || ""} onChange={e => set("ctaLabel", e.target.value)} placeholder="e.g. Ask a Question" /></div>
            <div style={fieldGroup}><label style={labelStyle}>CTA button link</label><input style={inputStyle} value={form.ctaHref || ""} onChange={e => set("ctaHref", e.target.value)} placeholder="/contact" /></div>
          </>
        )}

        {/* ── Testimonials (layout + color pickers) ── */}
        {typeId === "testimonials" && (
          <>
            <LayoutColorPicker typeId="testimonials" form={form} set={set} sectionTypes={sectionTypesData.sectionTypes} />
            <p style={{ fontSize: "0.8rem", color: INK_60, marginTop: "0.5rem" }}>
              Testimonials content is managed in the Testimonials tab. Layout and color scheme are set here.
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

/* Layout + Color Scheme picker — renders dropdowns for sections that support templates */
function LayoutColorPicker({ typeId, form, set, sectionTypes }) {
  const typeDef = (sectionTypes || []).find(t => t.id === typeId);
  if (!typeDef || !typeDef.layouts || typeDef.layouts.length < 2) return null;

  const currentLayout = form.layout || typeDef.defaultLayout || typeDef.layouts[0].id;
  const layoutDef = typeDef.layouts.find(l => l.id === currentLayout) || typeDef.layouts[0];
  const supportedSchemes = layoutDef.supportedColorSchemes || Object.keys(GLOBAL_COLOR_SCHEMES);
  const currentScheme = form.colorScheme || typeDef.defaultColorScheme || supportedSchemes[0];

  function handleLayoutChange(newLayout) {
    const newLayoutDef = typeDef.layouts.find(l => l.id === newLayout);
    const newSchemes = newLayoutDef?.supportedColorSchemes || [];
    // If current scheme isn't supported by new layout, reset to first available
    const newScheme = newSchemes.includes(currentScheme) ? currentScheme : (newSchemes[0] || currentScheme);
    set("layout", newLayout);
    set("colorScheme", newScheme);
  }

  return (
    <div style={{ marginBottom: "1rem", padding: "0.85rem", background: "#F8F9FA", border: `1px solid ${LINE}`, borderLeft: `3px solid ${NEON}` }}>
      <p style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_60, marginBottom: "0.75rem" }}>
        Template Options
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {/* Layout selector */}
        <div>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Layout</label>
          <select
            value={currentLayout}
            onChange={e => handleLayoutChange(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {typeDef.layouts.map(l => (
              <option key={l.id} value={l.id}>{l.displayName}</option>
            ))}
          </select>
          {layoutDef && (
            <p style={{ fontSize: "0.72rem", color: INK_60, marginTop: 4 }}>{layoutDef.description}</p>
          )}
        </div>

        {/* Color scheme selector */}
        <div>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Color Scheme</label>
          <select
            value={currentScheme}
            onChange={e => set("colorScheme", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {supportedSchemes.map(schemeKey => {
              const scheme = GLOBAL_COLOR_SCHEMES[schemeKey];
              return (
                <option key={schemeKey} value={schemeKey}>
                  {scheme ? scheme.label : schemeKey}
                </option>
              );
            })}
          </select>
          {/* Color preview swatch */}
          {GLOBAL_COLOR_SCHEMES[currentScheme] && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 2,
                background: GLOBAL_COLOR_SCHEMES[currentScheme].background === "image"
                  ? "linear-gradient(135deg, #888 50%, #555)"
                  : GLOBAL_COLOR_SCHEMES[currentScheme].background,
                border: "1px solid rgba(0,0,0,0.15)",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "0.72rem", color: INK_60 }}>
                {GLOBAL_COLOR_SCHEMES[currentScheme].label}
              </span>
            </div>
          )}
        </div>
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
