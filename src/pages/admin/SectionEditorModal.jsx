import React, { useState } from "react";
import { FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";

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

        {/* Fallback for unrecognized inline types — raw JSON */}
        {!["hero","home-hero","stats-band","our-edge","photo-break","cta-banner","bottom-cta","get-quote"].includes(typeId) && (
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
