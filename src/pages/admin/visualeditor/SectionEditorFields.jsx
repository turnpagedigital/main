import React, { useState } from "react";
import { INK, INK_60, LINE, NEON } from "../../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, labelStyle } from "../shared.jsx";
import { hasValue } from "../../../lib/utils.js";
export { labelStyle };
import sectionTypesData from "../../../data/section-types.json";
import formsData from "../../../data/forms.json";
import SectionThumb from "../SectionThumb.jsx";
import AssetPicker from "../../../components/admin/AssetPicker.jsx";
import { getSchemeVisual } from "./scheme-visuals.js";

/* SectionEditorFields — the actual form fields for each section type.
   Used by both PropertyPanel (inline rail) and SectionEditorModal (overlay).
   Props:
     typeId           string
     form             object  — current form state
     set(key, val)    fn      — update a top-level key in form
*/

export const fieldGroup = { marginBottom: "0.9rem" };

const BLUR_STYLES = new Set(["dark", "light-glass", "clear-glass", "neon-glass", "liquid-glass"]);

function CardBrightnessField({ value, onChange }) {
  const pct = value !== "" && value != null ? Number(value) : "";
  const suffix = pct === "" ? " (normal)" : pct > 100 ? ` — ${pct}% (brighter)` : pct < 100 ? ` — ${pct}% (darker)` : " — 100% (normal)";
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <label style={labelStyle}>Card brightness{suffix}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="range" min={50} max={150} step={5}
          value={pct !== "" ? pct : 100}
          style={{ flex: 1, accentColor: NEON }}
          onChange={e => onChange(Number(e.target.value))}
        />
        <button
          style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}
          onClick={() => onChange("")}
          title="Reset to normal"
        >Reset</button>
      </div>
    </div>
  );
}

function CardBlurField({ cardStyle, value, onChange }) {
  if (!BLUR_STYLES.has(cardStyle)) return null;
  const px = value !== "" && value != null ? Number(value) : "";
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <label style={labelStyle}>Card blur{px !== "" ? ` — ${px}px` : " (style default)"}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="range" min={0} max={80} step={1}
          value={px !== "" ? px : 20}
          style={{ flex: 1, accentColor: NEON }}
          onChange={e => onChange(Number(e.target.value))}
        />
        <button
          style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}
          onClick={() => onChange("")}
          title="Reset to style default"
        >Reset</button>
      </div>
    </div>
  );
}

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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div>
              <label style={labelStyle}>Height</label>
              <select style={{ ...selectStyle, marginTop: 4 }} value={form.size || "tall"} onChange={e => set("size", e.target.value)}>
                <option value="short">Short (half-height)</option>
                <option value="medium">Medium</option>
                <option value="tall">Tall (default)</option>
                <option value="full">Full viewport</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Headline size</label>
              <select style={{ ...selectStyle, marginTop: 4 }} value={form.titleSize || "xl"} onChange={e => set("titleSize", e.target.value)}>
                <option value="xl">XL — home-page scale</option>
                <option value="large">Large</option>
                <option value="medium">Medium</option>
                <option value="standard">Standard</option>
              </select>
            </div>
          </div>
          <HeroMediaFields form={form} set={set} defaultLabel="Black paper texture (default)" />
          <CTAField label="Primary CTA" value={form.ctaPrimary} onChange={v => set("ctaPrimary", v)} />
          <CTAField label="Secondary CTA (optional)" value={form.ctaSecondary} onChange={v => set("ctaSecondary", v || null)} nullable />
        </>
      )}

      {/* ── Registration Flow ── */}
      {typeId === "registration-flow" && (
        <>
          <ColorSchemePicker typeId="registration-flow" value={form.colorScheme} onChange={v => set("colorScheme", v)} />
          <BackgroundImageFields form={form} set={set} />
          <div style={fieldGroup}>
            <label style={labelStyle}>Form card</label>
            <select style={selectStyle} value={form.cardStyle || "card"} onChange={e => set("cardStyle", e.target.value)}>
              <option value="card">Boxed card — pick its color below</option>
              <option value="float">No card — form floats on the section background</option>
            </select>
          </div>
          {(form.cardStyle || "card") === "card" && (
            <div style={fieldGroup}>
              <label style={labelStyle}>Card color</label>
              <select style={selectStyle} value={form.cardColor || "white"} onChange={e => set("cardColor", e.target.value)}>
                <option value="white">White</option>
                <option value="light-gray">Light gray</option>
                <option value="paper">Paper</option>
                <option value="neon">Neon</option>
              </select>
            </div>
          )}
          {(form.cardStyle || "card") === "card" && (
            <div style={{ marginBottom: "0.9rem" }}>
              <label style={labelStyle}>Card corner radius — {hasValue(form.cardRadius) ? form.cardRadius : 10}px</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min={0} max={40} step={1} value={hasValue(form.cardRadius) ? form.cardRadius : 10} style={{ flex: 1, accentColor: NEON }} onChange={e => set("cardRadius", Number(e.target.value))} />
                <button type="button" style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("cardRadius", "")}>Reset</button>
              </div>
              <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>0 = square corners. Default 10.</p>
            </div>
          )}
          <div style={fieldGroup}>
            <label style={labelStyle}>Text alignment</label>
            <select style={selectStyle} value={form.align || "left"} onChange={e => set("align", e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centered — heading, intro, step titles, choices, disclosure</option>
            </select>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Disclosure (small print below the form)</label>
            <textarea style={{ ...inputStyle, minHeight: 90 }} value={form.disclosure || ""} onChange={e => set("disclosure", e.target.value)} placeholder="e.g. Turnpage is not affiliated with Anthropic, JND (the claims administrator)…" />
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Form size — {hasValue(form.formScale) ? form.formScale : 100}%</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={100} max={150} step={5} value={hasValue(form.formScale) ? form.formScale : 100} style={{ flex: 1, accentColor: NEON }} onChange={e => set("formScale", Number(e.target.value))} />
              <button type="button" style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("formScale", "")}>Reset</button>
            </div>
            <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>Scales the whole form up for easier reading. Default 100%.</p>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Flow</label>
            <select style={selectStyle} value={form.flowId || ""} onChange={e => set("flowId", e.target.value)}>
              <option value="">— pick a flow —</option>
              {(formsData.flows || []).map(f => (
                <option key={f.id} value={f.id}>{f.name}{f.active === false ? " (inactive)" : ""}</option>
              ))}
            </select>
            <p style={{ fontSize: "0.74rem", color: INK_60, marginTop: 4 }}>
              Flows are built in Registration → Flows. An inactive or unpicked flow renders nothing on the public page.
            </p>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Layout</label>
            <select style={selectStyle} value={form.layout || "center"} onChange={e => set("layout", e.target.value)}>
              <option value="center">Center — narrow card on gray (default)</option>
              <option value="wide">Wide — wider card on gray</option>
              <option value="split">Split — heading left, form right</option>
              <option value="dark">Dark — narrow card on black background</option>
            </select>
          </div>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title accent (italic/neon)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
        </>
      )}

      {/* ── Home Hero ── */}
      {typeId === "home-hero" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Title line 1</label><input style={inputStyle} value={form.title1 || ""} onChange={e => set("title1", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title line 2 (italic/neon)</label><input style={inputStyle} value={form.title2 || ""} onChange={e => set("title2", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Subtitle</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.subtitle || ""} onChange={e => set("subtitle", e.target.value)} /></div>
          <HeroMediaFields form={form} set={set} defaultLabel="Plain dark gradient (no media)" />
          <CTAField label="Primary CTA" value={form.ctaPrimary} onChange={v => set("ctaPrimary", v)} />
          <CTAField label="Secondary CTA" value={form.ctaSecondary} onChange={v => set("ctaSecondary", v)} />
        </>
      )}

      {/* ── Stats Band ── */}
      {typeId === "stats-band" && (
        <>
          <ColorSchemePicker typeId="stats-band" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["dark","neon","white","light-gray","paper"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Layout</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.layout || "band"} onChange={e => set("layout", e.target.value)}>
                <option value="band">Band — flush, dividers</option>
                <option value="cards">Cards — boxed</option>
                <option value="minimal">Minimal — open</option>
              </select>
            </div>
            <div><label style={labelStyle}>Alignment</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.align || "left"} onChange={e => set("align", e.target.value)}>
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </div>
            <div><label style={labelStyle}>Number color</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.valueColor || "auto"} onChange={e => set("valueColor", e.target.value)}>
                <option value="auto">Auto</option>
                <option value="neon">Neon</option>
              </select>
            </div>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Vertical spacing</label>
            <select style={selectStyle} value={form.density || "normal"} onChange={e => set("density", e.target.value)}>
              <option value="normal">Normal (current height)</option>
              <option value="compact">Compact — about 60% of normal</option>
              <option value="tight">Tight — slim strip</option>
            </select>
          </div>
          {(form.layout || "band") === "cards" && (
            <div style={{ marginBottom: "0.9rem" }}>
              <label style={labelStyle}>Card corner radius — {hasValue(form.cardRadius) ? form.cardRadius : 0}px</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min={0} max={40} step={1} value={hasValue(form.cardRadius) ? form.cardRadius : 0} style={{ flex: 1, accentColor: NEON }} onChange={e => set("cardRadius", Number(e.target.value))} />
                <button type="button" style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("cardRadius", "")}>Reset</button>
              </div>
              <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>0 = square corners.</p>
            </div>
          )}
          <BackgroundImageFields form={form} set={set} />
          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.9rem" }}>Leave a label blank to use the built-in translated wording.</p>
          {(form.stats || []).map((s, i) => (
            <div key={i} style={{ ...fieldGroup, display: "grid", gridTemplateColumns: "1fr 2fr auto auto auto", gap: 8, alignItems: "end" }}>
              <div><label style={labelStyle}>Value</label><input style={inputStyle} value={s.value || ""} onChange={e => { const next=[...(form.stats||[])]; next[i]={...next[i],value:e.target.value}; set("stats",next); }} /></div>
              <div><label style={labelStyle}>Label</label><input style={inputStyle} value={s.label || ""} onChange={e => { const next=[...(form.stats||[])]; next[i]={...next[i],label:e.target.value}; set("stats",next); }} placeholder="e.g. in claims traded" /></div>
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { const next=[...(form.stats||[])]; [next[i-1],next[i]]=[next[i],next[i-1]]; set("stats",next); }} style={{ ...btnStyle, padding: "0.45rem 0.5rem", opacity: i === 0 ? 0.5 : 1 }}>↑</button>
              <button type="button" aria-label="Move down" disabled={i === (form.stats||[]).length-1} onClick={() => { const next=[...(form.stats||[])]; [next[i],next[i+1]]=[next[i+1],next[i]]; set("stats",next); }} style={{ ...btnStyle, padding: "0.45rem 0.5rem", opacity: i === (form.stats||[]).length-1 ? 0.5 : 1 }}>↓</button>
              <button type="button" aria-label="Remove" onClick={() => set("stats", (form.stats||[]).filter((_, idx) => idx !== i))} style={{ ...btnStyle, padding: "0.45rem 0.5rem" }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={() => set("stats", [...(form.stats||[]), { value: "", label: "" }])} style={{ ...btnStyle, fontSize: "0.72rem", padding: "0.3rem 0.5rem", marginBottom: "0.9rem" }}>+ Add stat</button>
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
          <ColorSchemePicker typeId="our-edge" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["white","light-gray"]} />
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
          <div style={fieldGroup}><label style={labelStyle}>Footnote (below the cards)</label><input style={inputStyle} value={form.footnote !== undefined ? form.footnote : ""} onChange={e => set("footnote", e.target.value)} placeholder="* Experience prior to Turnpage" /></div>
          <p style={{ fontSize: "0.72rem", color: INK_60, margin: "0 0 0.9rem" }}>
            Blank fields fall back to this page's built-in copy — except the footnote: once you edit it,
            clearing it removes the note from the page entirely. Deal cards themselves are managed in
            Content → Deals (use each deal's Pages checkboxes).
          </p>
        </>
      )}

      {/* ── Image + Text ── */}
      {typeId === "image-text" && (
        <>
          <VisualLayoutColorPicker typeId="image-text" form={form} set={set} />
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent (italic/neon)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Paragraph</label><textarea style={{ ...inputStyle, minHeight: 110 }} value={form.body || ""} onChange={e => set("body", e.target.value)} /></div>
          <ImageField label="Image" value={form.image || ""} onChange={v => set("image", v)} placeholder="/bg-paper.jpg or https://…" />
          <div style={fieldGroup}><label style={labelStyle}>Image alt text</label><input style={inputStyle} value={form.imageAlt || ""} onChange={e => set("imageAlt", e.target.value)} placeholder="Describe the image for accessibility" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div>
              <label style={labelStyle}>Image treatment</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.imageTone || "none"} onChange={e => set("imageTone", e.target.value)}>
                <option value="none">Original colors</option>
                <option value="mono">Black &amp; white</option>
                <option value="neon">Neon duotone (ink → neon)</option>
                <option value="paper">Paper mono (ink → paper gray)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Overlay</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.imageOverlay || "none"} onChange={e => set("imageOverlay", e.target.value)}>
                <option value="none">None</option>
                <option value="dark">Darken</option>
                <option value="light">Lighten</option>
              </select>
            </div>
          </div>
          {(form.imageOverlay || "none") !== "none" && (
            <div style={{ marginBottom: "0.9rem" }}>
              <label style={labelStyle}>Overlay strength — {hasValue(form.imageOverlayStrength) ? form.imageOverlayStrength : 30}%</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min={0} max={100} step={5} value={hasValue(form.imageOverlayStrength) ? form.imageOverlayStrength : 30} style={{ flex: 1, accentColor: NEON }} onChange={e => set("imageOverlayStrength", Number(e.target.value))} />
                <button type="button" style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("imageOverlayStrength", "")}>Reset</button>
              </div>
            </div>
          )}
          <CTAField label="Button (optional)" value={form.cta} onChange={v => set("cta", v || null)} nullable />
        </>
      )}

      {/* ── Text Block (rich text / markdown) ── */}
      {typeId === "rich-text" && (
        <>
          <VisualLayoutColorPicker typeId="rich-text" form={form} set={set} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div>
              <label style={labelStyle}>Text alignment</label>
              <select style={{ ...selectStyle, marginTop: 4 }} value={form.align || "left"} onChange={e => set("align", e.target.value)}>
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Height</label>
              <select style={{ ...selectStyle, marginTop: 4 }} value={form.height || "auto"} onChange={e => set("height", e.target.value)}>
                <option value="auto">Auto (fits content)</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="full">Full screen</option>
              </select>
            </div>
          </div>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow (optional)</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} placeholder="Small uppercase kicker above the text" /></div>

          <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 5 }}>
              Heading (H1, optional)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: INK_60 }}>Before</label>
                <input style={{ ...inputStyle, marginTop: 2 }} value={form.heading1 || ""} onChange={e => set("heading1", e.target.value)} placeholder="A $1.5 billion" />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: INK_60 }}>Highlight</label>
                <input style={{ ...inputStyle, marginTop: 2 }} value={form.heading1Accent || ""} onChange={e => set("heading1Accent", e.target.value)} placeholder="win" />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: INK_60 }}>After</label>
                <input style={{ ...inputStyle, marginTop: 2 }} value={form.heading1After || ""} onChange={e => set("heading1After", e.target.value)} placeholder="for authors and publishers" />
              </div>
            </div>
            <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
              "Highlight" gets the neon underline (light schemes) or neon italic (dark scheme). Separate from any <code># </code>heading typed in the markdown below — use one or the other, not both.
            </p>
          </div>

          <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 5 }}>
              Background photo (optional)
            </div>
            <ImageField label="Image, shown behind the text" value={form.backgroundImage || ""} onChange={v => set("backgroundImage", v)} placeholder="https://…" />
            {form.backgroundImage && (
              <>
                <div style={{ marginBottom: "0.7rem" }}>
                  <label style={labelStyle}>Opacity — {form.imageOpacity ?? 35}%</label>
                  <input type="range" min={0} max={100} step={5} value={form.imageOpacity ?? 35} style={{ width: "100%", accentColor: NEON }} onChange={e => set("imageOpacity", Number(e.target.value))} />
                </div>
                <div>
                  <label style={labelStyle}>Blur — {form.imageBlur ?? 0}px</label>
                  <input type="range" min={0} max={40} step={1} value={form.imageBlur ?? 0} style={{ width: "100%", accentColor: NEON }} onChange={e => set("imageBlur", Number(e.target.value))} />
                </div>
              </>
            )}
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Text (Markdown)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 280, fontFamily: "monospace", fontSize: "0.82rem", lineHeight: 1.55 }}
              value={form.markdown || ""}
              onChange={e => set("markdown", e.target.value)}
              placeholder={"A paragraph of text…\n\n## Section heading\n\n- Bullet one\n- Bullet two"}
            />
            <p style={{ fontSize: "0.72rem", color: INK_60, marginTop: 5, lineHeight: 1.6 }}>
              <code># </code>H1 &nbsp;·&nbsp; <code>## </code>H2 &nbsp;·&nbsp; <code>### </code>H3 &nbsp;·&nbsp;
              blank line = new paragraph &nbsp;·&nbsp; <code>- </code>bullet &nbsp;·&nbsp;
              <code>**bold**</code> &nbsp;·&nbsp; <code>*italic*</code> &nbsp;·&nbsp; <code>[label](/link)</code>
            </p>
          </div>
        </>
      )}

      {/* ── Photo Break ── */}
      {typeId === "photo-break" && (
        <>
          <ImageField label="Image" value={form.imageUrl || ""} onChange={v => set("imageUrl", v)} placeholder="/bg-paper.jpg" />
          <div style={fieldGroup}><label style={labelStyle}>Overlay text (optional)</label><input style={inputStyle} value={form.overlayText || ""} onChange={e => set("overlayText", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Overlay accent (italic/neon)</label><input style={inputStyle} value={form.overlayAccent || ""} onChange={e => set("overlayAccent", e.target.value)} /></div>
        </>
      )}

      {/* ── Media Banner ── */}
      {typeId === "media-banner" && (
        <>
          <div style={fieldGroup}>
            <label style={labelStyle}>Background</label>
            <select style={selectStyle} value={form.backgroundType || "color"} onChange={e => set("backgroundType", e.target.value)}>
              <option value="color">Solid color</option>
              <option value="image">Photo</option>
            </select>
          </div>
          {(form.backgroundType || "color") === "color" && (
            <ColorSchemePicker typeId="media-banner" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["dark", "light", "light-gray"]} />
          )}
          {form.backgroundType === "image" && (
            <BackgroundImageFields form={form} set={set} />
          )}
          <div style={fieldGroup}><label style={labelStyle}>H1 heading</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>H2 subheading (optional)</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.subtitle || ""} onChange={e => set("subtitle", e.target.value)} /></div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Text alignment</label>
            <select style={selectStyle} value={form.align || "left"} onChange={e => set("align", e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Height</label>
            <select style={selectStyle} value={form.height || "medium"} onChange={e => set("height", e.target.value)}>
              <option value="auto">Auto (fits content)</option>
              <option value="small">Small</option>
              <option value="medium">Medium (default)</option>
              <option value="large">Large</option>
              <option value="full">Full screen</option>
            </select>
          </div>
          <CTAField label="Primary button (optional)" value={form.ctaPrimary} onChange={v => set("ctaPrimary", v || null)} nullable />
          <CTAField label="Secondary button (optional)" value={form.ctaSecondary} onChange={v => set("ctaSecondary", v || null)} nullable />
        </>
      )}

      {/* ── CTA Banner ── */}
      {typeId === "cta-banner" && (
        <>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Button label</label><input style={inputStyle} value={form.cta || ""} onChange={e => set("cta", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Button link (href)</label><input style={inputStyle} value={form.href || ""} onChange={e => set("href", e.target.value)} /></div>
          <ImageField label="Background image" value={form.image || ""} onChange={v => set("image", v)} placeholder="/Building_Wide.jpg" />
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
              <ImageField label="Background image" value={form.image || ""} onChange={v => set("image", v)} placeholder="/Building_Wide.jpg" />
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
                <option value="liquid-glass">Liquid Glass (refractive)</option>
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
          <CardBlurField cardStyle={form.cardStyle || "standard"} value={form.cardBlur ?? ""} onChange={v => set("cardBlur", v)} />
          <CardBrightnessField value={form.cardBrightness ?? ""} onChange={v => set("cardBrightness", v)} />
          <ImageField label="Background image" value={form.backgroundImage || ""} onChange={v => set("backgroundImage", v)} placeholder="https://…" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Image filter</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.imageFilter || "dark"} onChange={e => set("imageFilter", e.target.value)}>
                <option value="dark">Darken</option>
                <option value="light">Lighten</option>
                <option value="none">None</option>
              </select>
            </div>
            <div><label style={labelStyle}>Filter strength %</label>
              <input type="number" min="0" max="100" style={{ ...inputStyle, marginTop: 4 }} value={form.imageFilterStrength ?? 30} onChange={e => set("imageFilterStrength", e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))))} disabled={form.imageFilter === "none"} />
            </div>
          </div>
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
                <option value="grid-4col">4-Column Grid</option>
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
                <option value="liquid-glass">Liquid Glass (refractive)</option>
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
          <CardBlurField cardStyle={form.cardStyle || "standard"} value={form.cardBlur ?? ""} onChange={v => set("cardBlur", v)} />
          <CardBrightnessField value={form.cardBrightness ?? ""} onChange={v => set("cardBrightness", v)} />
          <ImageField label="Background image" value={form.backgroundImage || ""} onChange={v => set("backgroundImage", v)} placeholder="https://…" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Image filter</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.imageFilter || "dark"} onChange={e => set("imageFilter", e.target.value)}>
                <option value="dark">Darken</option>
                <option value="light">Lighten</option>
                <option value="none">None</option>
              </select>
            </div>
            <div><label style={labelStyle}>Filter strength %</label>
              <input type="number" min="0" max="100" style={{ ...inputStyle, marginTop: 4 }} value={form.imageFilterStrength ?? 30} onChange={e => set("imageFilterStrength", e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))))} disabled={form.imageFilter === "none"} />
            </div>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Card title color</label>
            <select style={selectStyle} value={form.cardTitleColor || "default"} onChange={e => set("cardTitleColor", e.target.value)}>
              <option value="default">Default (follows card style)</option>
              <option value="neon">Neon</option>
            </select>
          </div>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <CardsArrayEditor label="Cards" cards={form.cards || []} onChange={v => set("cards", v)} showIconSubtitle />
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
                <option value="liquid-glass">Liquid Glass (refractive)</option>
              </select>
            </div>
            <div><label style={labelStyle}>Card Radius</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.cardRadius || "rounded"} onChange={e => set("cardRadius", e.target.value)}>
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
              </select>
            </div>
          </div>
          <CardBlurField cardStyle={form.cardStyle || "standard"} value={form.cardBlur ?? ""} onChange={v => set("cardBlur", v)} />
          <CardBrightnessField value={form.cardBrightness ?? ""} onChange={v => set("cardBrightness", v)} />
          <ImageField label="Background image" value={form.backgroundImage || ""} onChange={v => set("backgroundImage", v)} placeholder="https://…" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <div><label style={labelStyle}>Image filter</label>
              <select style={{ ...inputStyle, marginTop: 4 }} value={form.imageFilter || "dark"} onChange={e => set("imageFilter", e.target.value)}>
                <option value="dark">Darken</option>
                <option value="light">Lighten</option>
                <option value="none">None</option>
              </select>
            </div>
            <div><label style={labelStyle}>Filter strength %</label>
              <input type="number" min="0" max="100" style={{ ...inputStyle, marginTop: 4 }} value={form.imageFilterStrength ?? 30} onChange={e => set("imageFilterStrength", e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))))} disabled={form.imageFilter === "none"} />
            </div>
          </div>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Kicker (right column subtitle)</label><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.kicker || ""} onChange={e => set("kicker", e.target.value)} /></div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Steps layout</label>
            <select style={selectStyle} value={form.stepsLayout || "auto"} onChange={e => set("stepsLayout", e.target.value)}>
              <option value="auto">Auto — up to 3 across, extra steps wrap</option>
              <option value="2">2 across</option>
              <option value="3">3 across</option>
              <option value="4">4 across</option>
              <option value="5">5 across</option>
              <option value="vertical">Vertical list — number beside the text</option>
            </select>
          </div>
          <StepsArrayEditor steps={form.steps || []} onChange={v => set("steps", v)} />
        </>
      )}

      {/* ── Process Flow ── */}
      {typeId === "process-flow" && (
        <>
          <ColorSchemePicker typeId="process-flow" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["neon","white","light-gray","dark"]} />
          <div style={fieldGroup}>
            <label style={labelStyle}>Pill style</label>
            <select style={selectStyle} value={form.pillStyle || "white"} onChange={e => set("pillStyle", e.target.value)}>
              <option value="white">White</option>
              <option value="black">Black</option>
              <option value="neon">Neon</option>
              <option value="outline">Outline</option>
            </select>
          </div>
          <BackgroundImageFields form={form} set={set} />
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow (optional)</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent (italic)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <ProcessStepsEditor steps={form.steps || []} onChange={v => set("steps", v)} />
        </>
      )}

      {/* ── Timeline ── */}
      {typeId === "timeline" && (
        <>
          <ColorSchemePicker typeId="timeline" value={form.colorScheme} onChange={v => set("colorScheme", v)} />
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent (italic, neon highlight)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <TimelineStepsEditor steps={form.steps || []} onChange={v => set("steps", v)} />
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: INK_60, margin: "1rem 0 0.5rem" }}>Scenario cards below the timeline (optional)</p>
          <div style={fieldGroup}>
            <label style={{ fontSize: "0.74rem", color: INK_60, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={form.showKicker !== false} onChange={e => set("showKicker", e.target.checked)} style={{ accentColor: NEON }} />
              Show card kickers (the small label at the top of each card)
            </label>
          </div>
          {form.showKicker !== false && (
            <div style={fieldGroup}>
              <label style={labelStyle}>Default kicker</label>
              <input style={inputStyle} value={form.kicker ?? "Scenario"} onChange={e => set("kicker", e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Card corner radius — {hasValue(form.cardRadius) ? form.cardRadius : 14}px</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={0} max={40} step={1} value={hasValue(form.cardRadius) ? form.cardRadius : 14} style={{ flex: 1, accentColor: NEON }} onChange={e => set("cardRadius", Number(e.target.value))} />
              <button type="button" style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("cardRadius", "")}>Reset</button>
            </div>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Card text alignment</label>
            <select style={selectStyle} value={form.cardAlign || "left"} onChange={e => set("cardAlign", e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centered — tag, figure, title, note</option>
            </select>
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Card max width — {hasValue(form.cardMaxWidth) ? `${form.cardMaxWidth}px` : "fills column"}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={200} max={900} step={10} value={hasValue(form.cardMaxWidth) ? form.cardMaxWidth : 900} style={{ flex: 1, accentColor: NEON }} onChange={e => set("cardMaxWidth", Number(e.target.value))} />
              <button type="button" style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("cardMaxWidth", "")}>Reset</button>
            </div>
            <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>Shrinks and centers each card within its column. Leave at full to fill the column width.</p>
          </div>
          <ScenarioCardsEditor cards={form.cards || []} onChange={v => set("cards", v)} />
          <div style={fieldGroup}><label style={labelStyle}>Footnote (small print under the cards)</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.footnote || ""} onChange={e => set("footnote", e.target.value)} /></div>
        </>
      )}

      {/* ── Scenario Cards ── */}
      {typeId === "scenario-cards" && (
        <>
          <ColorSchemePicker typeId="scenario-cards" value={form.colorScheme} onChange={v => set("colorScheme", v)} />
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title (optional)</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent (italic, neon highlight)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <div style={fieldGroup}>
            <label style={{ fontSize: "0.74rem", color: INK_60, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={form.showKicker !== false} onChange={e => set("showKicker", e.target.checked)} style={{ accentColor: NEON }} />
              Show card kickers (the small label at the top of each card)
            </label>
          </div>
          {form.showKicker !== false && (
            <div style={fieldGroup}>
              <label style={labelStyle}>Default kicker</label>
              <input style={inputStyle} value={form.kicker ?? "Scenario"} onChange={e => set("kicker", e.target.value)} />
              <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>Used for every card unless a card sets its own kicker below.</p>
            </div>
          )}
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Card corner radius — {hasValue(form.cardRadius) ? form.cardRadius : 14}px</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={0} max={40} step={1} value={hasValue(form.cardRadius) ? form.cardRadius : 14} style={{ flex: 1, accentColor: NEON }} onChange={e => set("cardRadius", Number(e.target.value))} />
              <button type="button" style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("cardRadius", "")}>Reset</button>
            </div>
            <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>0 = square corners. Default 14.</p>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Card text alignment</label>
            <select style={selectStyle} value={form.cardAlign || "left"} onChange={e => set("cardAlign", e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centered — tag, figure, title, note</option>
            </select>
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Card max width — {hasValue(form.cardMaxWidth) ? `${form.cardMaxWidth}px` : "fills column"}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={200} max={900} step={10} value={hasValue(form.cardMaxWidth) ? form.cardMaxWidth : 900} style={{ flex: 1, accentColor: NEON }} onChange={e => set("cardMaxWidth", Number(e.target.value))} />
              <button type="button" style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("cardMaxWidth", "")}>Reset</button>
            </div>
            <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>Shrinks and centers each card within its column. Leave at full to fill the column width.</p>
          </div>
          <ScenarioCardsEditor cards={form.cards || []} onChange={v => set("cards", v)} />
          <div style={fieldGroup}><label style={labelStyle}>Footnote (small print under the cards)</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.footnote || ""} onChange={e => set("footnote", e.target.value)} /></div>
        </>
      )}

      {/* ── Bullet Columns ── */}
      {typeId === "bullet-columns" && (
        <>
          <ColorSchemePicker typeId="bullet-columns" value={form.colorScheme} onChange={v => set("colorScheme", v)} schemes={["neon","white","light-gray","dark"]} />
          <BackgroundImageFields form={form} set={set} />
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow (optional)</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
          <div style={fieldGroup}><label style={labelStyle}>Accent (italic)</label><input style={inputStyle} value={form.accent || ""} onChange={e => set("accent", e.target.value)} /></div>
          <BulletColumnsEditor columns={form.columns || []} onChange={v => set("columns", v)} />
        </>
      )}

      {/* ── Contact Form ── */}
      {typeId === "contact-form" && (
        <>
          {/* Contact info — inline overrides */}
          <div style={{ borderBottom: `1px solid ${LINE}`, marginBottom: "0.9rem", paddingBottom: "0.9rem" }}>
            <p style={{ fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: INK_60, marginBottom: "0.6rem" }}>Contact Info</p>
            <div style={fieldGroup}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={form.email || ""} onChange={e => set("email", e.target.value)} placeholder="info@turnpagedigital.com" />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>WhatsApp number</label>
              <input style={inputStyle} value={form.whatsapp || ""} onChange={e => set("whatsapp", e.target.value)} placeholder="16468600068 (digits only)" />
              <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>Digits only — no spaces, dashes, or +. Leave blank to hide.</p>
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Telegram</label>
              <input style={inputStyle} value={form.telegram || ""} onChange={e => set("telegram", e.target.value)} placeholder="@yourhandle" />
              <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>@handle or full t.me URL. Leave blank to hide.</p>
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Sidebar heading</label>
              <input style={inputStyle} value={form.sidebarHeading || ""} onChange={e => set("sidebarHeading", e.target.value)} placeholder="Let's connect." />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Sidebar intro</label>
              <textarea style={{ ...inputStyle, minHeight: 64 }} value={form.sidebarIntro || ""} onChange={e => set("sidebarIntro", e.target.value)} placeholder="Talk to us for a quote or to discuss your specific situation." />
            </div>
            <p style={{ fontSize: "0.7rem", color: INK_60, lineHeight: 1.5 }}>
              These override the global defaults in <strong>Content → Contact Form</strong>. Leave any field blank to use the global value.
            </p>
          </div>

          {/* Section background */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Section style</label>
            <select style={selectStyle} value={form.variant || "paper"} onChange={e => set("variant", e.target.value)}>
              <option value="paper">Paper — cool gray background</option>
              <option value="white">White — clean white background</option>
              <option value="image">Image — photo background</option>
              <option value="glass">Glass — gray background, glass form card</option>
            </select>
          </div>
          <ImageField label="Background image" value={form.backgroundImage || ""} onChange={v => set("backgroundImage", v)} placeholder="https://…" />
          {form.backgroundImage && (
            <div style={{ marginBottom: "0.9rem" }}>
              <label style={labelStyle}>Background brightness — {hasValue(form.backgroundBrightness) ? form.backgroundBrightness : 35}%</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min={5} max={100} step={5} value={hasValue(form.backgroundBrightness) ? form.backgroundBrightness : 35} style={{ flex: 1, accentColor: NEON }} onChange={e => set("backgroundBrightness", Number(e.target.value))} />
                <button style={{ fontSize: "0.72rem", color: INK_60, background: "none", border: `1px solid ${INK_60}`, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => set("backgroundBrightness", "")}>Reset</button>
              </div>
            </div>
          )}

          {/* Form card design */}
          <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: "0.9rem", marginBottom: "0.9rem" }}>
            <p style={{ fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: INK_60, marginBottom: "0.6rem" }}>Form Card Design</p>
            <div style={fieldGroup}>
              <label style={labelStyle}>Card style</label>
              <select style={selectStyle} value={form.formCardStyle || ""} onChange={e => set("formCardStyle", e.target.value)}>
                <option value="">Auto — follows section style</option>
                <option value="paper">Paper — white, solid</option>
                <option value="white">White — white with border</option>
                <option value="glass">Glass — frosted light</option>
                <option value="clear">Clear — very transparent</option>
                <option value="dark">Dark — dark glass</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <div><label style={labelStyle}>Corner style</label>
                <select style={{ ...inputStyle, marginTop: 4 }} value={form.formCardRadius || "rounded"} onChange={e => set("formCardRadius", e.target.value)}>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                </select>
              </div>
            </div>
            <CardBlurField cardStyle={["glass","clear","dark","light-glass","neon-glass"].includes(form.formCardStyle) ? "dark" : "standard"} value={form.formCardBlur ?? ""} onChange={v => set("formCardBlur", v)} />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Default source / subject context</label>
            <select style={selectStyle} value={form.defaultSource || ""} onChange={e => set("defaultSource", e.target.value || "")}>
              <option value="">None — let URL ?source= param decide</option>
              <option value="ai-copyright">AI Copyright</option>
              <option value="crypto">Crypto Claims</option>
              <option value="briefings">Briefings</option>
            </select>
            <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 4 }}>
              Sets the inquiry badge and pre-selects a subject on the form. Useful when embedding this section on a sub-brand page. The URL ?source= param always takes precedence.
            </p>
          </div>
        </>
      )}

      {/* ── What We Cover (situations) ── */}
      {typeId === "situations" && (
        <>
          <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.9rem" }}>
            The expandable claim rows are managed in <strong>Content → Home Content</strong>. Edit the section header here.
          </p>
          <div style={fieldGroup}><label style={labelStyle}>Eyebrow</label><input style={inputStyle} value={form.eyebrow || ""} onChange={e => set("eyebrow", e.target.value)} placeholder="What we cover" /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="The toughest claims" /></div>
          <div style={fieldGroup}><label style={labelStyle}>Title accent (italic/neon)</label><input style={inputStyle} value={form.titleAccent || ""} onChange={e => set("titleAccent", e.target.value)} placeholder="on the docket." /></div>
          <div style={fieldGroup}><label style={labelStyle}>Body paragraph</label><textarea style={{ ...inputStyle, minHeight: 100 }} value={form.body || ""} onChange={e => set("body", e.target.value)} placeholder="We handle every kind of compensation claim…" /></div>
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

/* ImageField — an image URL input with a Browse button that opens the shared
   asset library (AssetPicker). Pasting a URL still works; Browse lets the
   admin pick/upload without leaving the editor. Shows a small live preview. */
export function ImageField({ label, value, onChange, placeholder }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div style={fieldGroup}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {value ? (
          <img src={value} alt="" style={{ width: 42, height: 30, objectFit: "cover", border: `1px solid ${LINE}`, borderRadius: 3, flexShrink: 0, background: "#F4F5F7" }}
            onError={e => { e.currentTarget.style.visibility = "hidden"; }} />
        ) : null}
        <input style={{ ...inputStyle, marginTop: 0, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        <button type="button" style={{ ...btnStyle, whiteSpace: "nowrap" }} onClick={() => setPickerOpen(true)}>Browse…</button>
      </div>
      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => { onChange(url); setPickerOpen(false); }}
        defaultType="image"
        acceptTypes={["image", "logo"]}
      />
    </div>
  );
}

/* BackgroundImageFields — optional section background image + overlay filter,
   the same trio of controls the cards-family sections use. */
function BackgroundImageFields({ form, set }) {
  return (
    <>
      <ImageField label="Background image (optional)" value={form.backgroundImage || ""} onChange={v => set("backgroundImage", v)} placeholder="https://…" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
        <div><label style={labelStyle}>Image filter</label>
          <select style={{ ...inputStyle, marginTop: 4 }} value={form.imageFilter || "dark"} onChange={e => set("imageFilter", e.target.value)}>
            <option value="dark">Darken</option>
            <option value="light">Lighten</option>
            <option value="none">None</option>
          </select>
        </div>
        <div><label style={labelStyle}>Filter strength %</label>
          <input type="number" min="0" max="100" style={{ ...inputStyle, marginTop: 4 }} value={form.imageFilterStrength ?? 30} onChange={e => set("imageFilterStrength", e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))))} disabled={form.imageFilter === "none"} />
        </div>
      </div>
    </>
  );
}

/* VideoField — like ImageField, but for video assets. Browse opens the asset
   library filtered to videos; the thumb shows the video's first frame. */
export function VideoField({ label, value, onChange, placeholder }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div style={fieldGroup}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {value ? (
          <video src={value} muted preload="metadata"
            style={{ width: 42, height: 30, objectFit: "cover", border: `1px solid ${LINE}`, borderRadius: 3, flexShrink: 0, background: "#F4F5F7" }}
            onError={e => { e.currentTarget.style.visibility = "hidden"; }} />
        ) : null}
        <input style={{ ...inputStyle, marginTop: 0, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        <button type="button" style={{ ...btnStyle, whiteSpace: "nowrap" }} onClick={() => setPickerOpen(true)}>Browse…</button>
      </div>
      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => { onChange(url); setPickerOpen(false); }}
        defaultType="video"
        acceptTypes={["video"]}
      />
    </div>
  );
}

/* HeroMediaFields — the background chooser shared by the hero and home-hero
   editors: default backdrop, static image, or looping video. The image/video
   URL fields only show for the matching choice; the renderers ignore the
   other one, so switching back and forth never loses what was entered. */
function HeroMediaFields({ form, set, defaultLabel }) {
  const mediaType = form.mediaType || (form.video ? "video" : "default");
  return (
    <>
      <div style={fieldGroup}>
        <label style={labelStyle}>Background</label>
        <select style={selectStyle} value={mediaType} onChange={e => set("mediaType", e.target.value)}>
          <option value="default">{defaultLabel}</option>
          <option value="image">Static image</option>
          <option value="video">Video (autoplays, muted, loops)</option>
        </select>
      </div>
      {mediaType === "image" && (
        <ImageField label="Background image" value={form.image || ""} onChange={v => set("image", v || null)} placeholder="/bg-paper.jpg or https://…" />
      )}
      {mediaType === "video" && (
        <VideoField label="Background video" value={form.video || ""} onChange={v => set("video", v || null)} placeholder="/robotpages1.mp4 or https://…" />
      )}
    </>
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

/* ProcessStepsEditor — steps for the Process Flow section. Bullets are edited
   as a textarea, one bullet per line. */
function ProcessStepsEditor({ steps, onChange }) {
  const handleChange = (i, field, val) => {
    const next = [...(steps || [])];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= (steps || []).length) return;
    const next = [...(steps || [])];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 8 }}>Steps</div>
      {(steps || []).map((s, i) => (
        <div key={s.id || i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Pill label (e.g. Partner)" value={s.label || ""} onChange={e => handleChange(i, "label", e.target.value)} />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === 0 ? 0.5 : 1 }}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === (steps || []).length - 1} aria-label="Move down" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === (steps || []).length - 1 ? 0.5 : 1 }}>↓</button>
          </div>
          <input style={{ ...inputStyle, marginBottom: 4 }} placeholder="Heading" value={s.heading || ""} onChange={e => handleChange(i, "heading", e.target.value)} />
          <textarea
            style={{ ...inputStyle, minHeight: 70, marginBottom: 4 }}
            placeholder={"One bullet per line"}
            value={(s.bullets || []).join("\n")}
            onChange={e => handleChange(i, "bullets", e.target.value.split("\n"))}
            onBlur={e => handleChange(i, "bullets", e.target.value.split("\n").map(b => b.trim()).filter(Boolean))}
          />
          <button type="button" onClick={() => onChange((steps || []).filter((_, idx) => idx !== i))} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...(steps || []), { id: `step-${(steps || []).length + 1}-${(steps || []).length}`, label: "", heading: "", bullets: [] }])} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.3rem 0.5rem" }}>+ Add step</button>
    </div>
  );
}

/* TimelineStepsEditor — milestones for the Timeline section. Each step has a
   date label, heading, body text, a dot state, and an optional status pill. */
function TimelineStepsEditor({ steps, onChange }) {
  const handleChange = (i, field, val) => {
    const next = [...(steps || [])];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= (steps || []).length) return;
    const next = [...(steps || [])];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 8 }}>Timeline steps</div>
      {(steps || []).map((s, i) => (
        <div key={s.id || i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Date label (e.g. August 2026)" value={s.when || ""} onChange={e => handleChange(i, "when", e.target.value)} />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === 0 ? 0.5 : 1 }}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === (steps || []).length - 1} aria-label="Move down" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === (steps || []).length - 1 ? 0.5 : 1 }}>↓</button>
          </div>
          <input style={{ ...inputStyle, marginBottom: 4 }} placeholder="Heading" value={s.heading || ""} onChange={e => handleChange(i, "heading", e.target.value)} />
          <textarea style={{ ...inputStyle, minHeight: 70, marginBottom: 4 }} placeholder="Body text" value={s.body || ""} onChange={e => handleChange(i, "body", e.target.value)} />
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <select style={{ ...selectStyle, flex: 1 }} value={s.state || ""} onChange={e => handleChange(i, "state", e.target.value)}>
              <option value="">Upcoming (hollow dot)</option>
              <option value="here">Current — neon dot with glow</option>
              <option value="done">Done (filled dot)</option>
            </select>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Pill label (optional)" value={s.pillLabel || ""} onChange={e => handleChange(i, "pillLabel", e.target.value)} />
            <select style={{ ...selectStyle, flex: 1 }} value={s.pillStyle || "neon"} onChange={e => handleChange(i, "pillStyle", e.target.value)}>
              <option value="neon">Neon pill</option>
              <option value="ink">Black pill</option>
              <option value="white">White pill (for gray/dark backgrounds)</option>
              <option value="light-gray">Light gray pill (for white background)</option>
            </select>
          </div>
          <button type="button" onClick={() => onChange((steps || []).filter((_, idx) => idx !== i))} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...(steps || []), { id: `tl-${Date.now().toString(36)}`, when: "", heading: "", body: "", state: "", pillLabel: "", pillStyle: "neon" }])} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.3rem 0.5rem" }}>+ Add step</button>
    </div>
  );
}

/* ScenarioCardsEditor — outcome cards for the Scenario Cards section. Each has
   a big figure, title, note, optional neon tag, and a featured (dark) variant. */
function ScenarioCardsEditor({ cards, onChange }) {
  const handleChange = (i, field, val) => {
    const next = [...(cards || [])];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= (cards || []).length) return;
    const next = [...(cards || [])];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 8 }}>Cards</div>
      {(cards || []).map((sc, i) => (
        <div key={sc.id || i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Big figure (e.g. Sept 2026, $3,000)" value={sc.figure || ""} onChange={e => handleChange(i, "figure", e.target.value)} />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === 0 ? 0.5 : 1 }}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === (cards || []).length - 1} aria-label="Move down" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === (cards || []).length - 1 ? 0.5 : 1 }}>↓</button>
          </div>
          <input style={{ ...inputStyle, marginBottom: 4 }} placeholder="Kicker (optional — overrides the default kicker)" value={sc.kicker || ""} onChange={e => handleChange(i, "kicker", e.target.value)} />
          <input style={{ ...inputStyle, marginBottom: 4 }} placeholder="Title" value={sc.title || ""} onChange={e => handleChange(i, "title", e.target.value)} />
          <textarea style={{ ...inputStyle, minHeight: 50, marginBottom: 4 }} placeholder="Note (small text under the title)" value={sc.note || ""} onChange={e => handleChange(i, "note", e.target.value)} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Neon tag (optional, e.g. Most likely)" value={sc.tag || ""} onChange={e => handleChange(i, "tag", e.target.value)} />
            <select
              style={{ ...selectStyle, flex: 1 }}
              value={sc.cardStyle || (sc.highlight ? "dark" : "white")}
              onChange={e => {
                const v = e.target.value;
                const next = [...(cards || [])];
                next[i] = { ...next[i], cardStyle: v, highlight: v === "dark" };
                onChange(next);
              }}
            >
              <option value="white">White card</option>
              <option value="light-gray">Light gray card</option>
              <option value="dark">Dark featured card (neon figure)</option>
            </select>
          </div>
          <button type="button" onClick={() => onChange((cards || []).filter((_, idx) => idx !== i))} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...(cards || []), { id: `sc-${Date.now().toString(36)}`, tag: "", figure: "", title: "", note: "", highlight: false }])} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.3rem 0.5rem" }}>+ Add card</button>
    </div>
  );
}

/* BulletColumnsEditor — columns for the Bullet Columns section. Items are
   edited as a textarea, one item per line. */
function BulletColumnsEditor({ columns, onChange }) {
  const handleChange = (i, field, val) => {
    const next = [...(columns || [])];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= (columns || []).length) return;
    const next = [...(columns || [])];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div style={{ marginBottom: "0.9rem", padding: "0.6rem 0.7rem", border: `1px solid ${LINE}`, background: "#F9FAFB" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 8 }}>Columns</div>
      {(columns || []).map((col, i) => (
        <div key={col.id || i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Column heading" value={col.heading || ""} onChange={e => handleChange(i, "heading", e.target.value)} />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move left" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === 0 ? 0.5 : 1 }}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === (columns || []).length - 1} aria-label="Move right" style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem", opacity: i === (columns || []).length - 1 ? 0.5 : 1 }}>↓</button>
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 90, marginBottom: 4 }}
            placeholder={"One item per line"}
            value={(col.items || []).join("\n")}
            onChange={e => handleChange(i, "items", e.target.value.split("\n"))}
            onBlur={e => handleChange(i, "items", e.target.value.split("\n").map(t => t.trim()).filter(Boolean))}
          />
          <button type="button" onClick={() => onChange((columns || []).filter((_, idx) => idx !== i))} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...(columns || []), { id: `col-${(columns || []).length + 1}-${(columns || []).length}`, heading: "", items: [] }])} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.3rem 0.5rem" }}>+ Add column</button>
    </div>
  );
}

function CardsArrayEditor({ label, cards, onChange, showPriority, showIconSubtitle }) {
  const [pickerOpenIdx, setPickerOpenIdx] = React.useState(null);

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
              {showIconSubtitle ? (
                <div style={{ marginBottom: 4 }}>
                  <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="Title" value={c.title} onChange={e => handleChange(i, "title", e.target.value)} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {c.icon
                      ? <img src={c.icon} alt="" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4, border: `1px solid ${LINE}`, background: "#f3f4f6", flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, border: `1px dashed ${LINE}`, borderRadius: 4, background: "#f9fafb", flexShrink: 0 }} />
                    }
                    <button type="button" style={{ ...btnStyle, fontSize: "0.75rem" }} onClick={() => setPickerOpenIdx(i)}>
                      {c.icon ? "Change icon" : "Pick icon"}
                    </button>
                    {c.icon && (
                      <button type="button" style={{ ...btnStyle, fontSize: "0.75rem", color: "#C03030", borderColor: "#E5B5B5" }} onClick={() => handleChange(i, "icon", "")}>Remove</button>
                    )}
                  </div>
                </div>
              ) : (
                <input style={{ ...inputStyle, marginBottom: 4 }} placeholder="Title" value={c.title} onChange={e => handleChange(i, "title", e.target.value)} />
              )}
              {showIconSubtitle && (
                <select style={{ ...inputStyle, marginBottom: 4 }} value={c.cardStyle || ""} onChange={e => handleChange(i, "cardStyle", e.target.value)}>
                  <option value="">Card color — inherit from section</option>
                  <option value="white">White</option>
                  <option value="black">Black</option>
                  <option value="light-gray">Light Gray</option>
                  <option value="neon">Neon (bright green)</option>
                  <option value="dark">Dark Glass</option>
                  <option value="light-glass">Light Glass</option>
                  <option value="clear-glass">Clear Glass</option>
                  <option value="neon-glass">Neon Glass</option>
                </select>
              )}
              {showIconSubtitle && (
                <input style={{ ...inputStyle, marginBottom: 4 }} placeholder="Subtitle (optional — bold line under a neon divider)" value={c.subtitle || ""} onChange={e => handleChange(i, "subtitle", e.target.value)} />
              )}
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
      <AssetPicker
        open={pickerOpenIdx !== null}
        onClose={() => setPickerOpenIdx(null)}
        onPick={(url) => { if (pickerOpenIdx !== null) { handleChange(pickerOpenIdx, "icon", url); setPickerOpenIdx(null); } }}
        acceptTypes={["logo", "image"]}
      />
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
