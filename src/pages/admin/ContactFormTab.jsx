import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   ContactFormTab — manage the Contact Us page: heading copy, subject
   dropdown options, and form field configuration.

   Fetches from GET /api/admin/contact-form, saves via PUT.
   Self-contained — owns its own fetch/save lifecycle.
   Reports dirty state via onDirtyChange?.(dirty).
═══════════════════════════════════════════════════════════════════════════ */

function normalize(d) {
  return {
    heading:        typeof d?.heading === "string"        ? d.heading        : "",
    accentText:     typeof d?.accentText === "string"     ? d.accentText     : "",
    subtitle:       typeof d?.subtitle === "string"       ? d.subtitle       : "",
    sidebarHeading: typeof d?.sidebarHeading === "string" ? d.sidebarHeading : "",
    sidebarIntro:   typeof d?.sidebarIntro === "string"   ? d.sidebarIntro   : "",
    email:          typeof d?.email === "string"          ? d.email          : "",
    phone:          typeof d?.phone === "string"          ? d.phone          : "",
    disclaimer:     typeof d?.disclaimer === "string"     ? d.disclaimer     : "",
    subjects: Array.isArray(d?.subjects) ? d.subjects : [],
    fields:   Array.isArray(d?.fields)   ? d.fields   : [],
  };
}

function emptySubject() {
  return { id: `subj-${Date.now()}`, label: "", active: true };
}

function emptyField() {
  return { name: "", label: "", type: "text", required: false, halfWidth: false };
}

export default function ContactFormTab({ onDirtyChange }) {
  const [data,     setData]     = useState(null);
  const [original, setOriginal] = useState(null);
  const [phase,    setPhase]    = useState("loading");
  const [error,    setError]    = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const dirty = useMemo(() => {
    if (!data || !original) return false;
    return JSON.stringify(data) !== JSON.stringify(original);
  }, [data, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/contact-form", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const normalized = normalize(body.data);
      setData(normalized);
      setOriginal(JSON.parse(JSON.stringify(normalized)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (!data) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/contact-form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading contact form settings…</CenteredMessage>;
  if (phase === "error" && data === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (data === null) return null;

  const isSaving = phase === "saving";

  function patch(key, value) { setData(prev => ({ ...prev, [key]: value })); }

  // Subject helpers
  function updateSubject(idx, p) {
    setData(prev => ({ ...prev, subjects: prev.subjects.map((s, i) => i === idx ? { ...s, ...p } : s) }));
  }
  function moveSubject(idx, dir) {
    setData(prev => {
      const arr = [...prev.subjects]; const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...prev, subjects: arr };
    });
  }
  function removeSubject(idx) { setData(prev => ({ ...prev, subjects: prev.subjects.filter((_, i) => i !== idx) })); }
  function addSubject() { setData(prev => ({ ...prev, subjects: [...prev.subjects, emptySubject()] })); }

  // Field helpers
  function updateField(idx, p) {
    setData(prev => ({ ...prev, fields: prev.fields.map((f, i) => i === idx ? { ...f, ...p } : f) }));
  }
  function moveField(idx, dir) {
    setData(prev => {
      const arr = [...prev.fields]; const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...prev, fields: arr };
    });
  }
  function removeField(idx) { setData(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== idx) })); }
  function addField() { setData(prev => ({ ...prev, fields: [...prev.fields, emptyField()] })); }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>

      {/* Sticky header */}
      <div style={{
        position: "sticky", top: "88px", zIndex: 5, background: "#F4F5F7",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        marginBottom: "1.5rem", paddingBottom: "1rem", paddingTop: "0.5rem",
        borderBottom: `2px solid ${dirty ? NEON : LINE}`, transition: "border-color 0.15s",
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Contact Us</div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: dirty ? "#7a5c00" : INK_60, fontWeight: dirty ? 700 : 400 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "Unsaved changes — click Save to commit"}
          {!isSaving && !dirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty && !lastSavedAt && "Up to date"}
        </div>
        <button onClick={save} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor: (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {/* ── Page Copy ──────────────────────────────────────────────── */}
      <SectionHeader>Page Copy</SectionHeader>
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <LabeledInput label="Heading" value={data.heading} onChange={v => patch("heading", v)} placeholder="Get in Touch" />
          <LabeledInput label="Accent text" value={data.accentText} onChange={v => patch("accentText", v)} placeholder="your claim." hint="Highlighted text in the hero" />
          <LabeledInput label="Subtitle" value={data.subtitle} onChange={v => patch("subtitle", v)} placeholder="48-hour response. Confidentiality default." />
          <LabeledInput label="Sidebar heading" value={data.sidebarHeading} onChange={v => patch("sidebarHeading", v)} placeholder="Let's talk." />
          <LabeledInput label="Sidebar intro" value={data.sidebarIntro} onChange={v => patch("sidebarIntro", v)} placeholder="Every inquiry is read by a partner." multiline />
          <LabeledInput label="Email" value={data.email} onChange={v => patch("email", v)} placeholder="info@turnpagedigital.com" />
          <LabeledInput label="Phone" value={data.phone} onChange={v => patch("phone", v)} placeholder="+1 646 860 0068" />
          <LabeledInput label="Disclaimer" value={data.disclaimer} onChange={v => patch("disclaimer", v)} multiline placeholder="All submissions are confidential…" />
        </div>
      </div>

      {/* ── Subject Options ────────────────────────────────────────── */}
      <SectionHeader>Subject Options</SectionHeader>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Options shown in the subject dropdown. Toggle active/inactive to hide without deleting. Drag to reorder.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
        {data.subjects.length === 0 && (
          <div style={{ padding: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: INK_60, border: `1px dashed ${LINE}`, background: "#fff" }}>
            No subject options. Click "+ Add subject" to get started.
          </div>
        )}
        {data.subjects.map((subj, idx) => (
          <div key={subj.id || idx} style={{
            display: "grid", gridTemplateColumns: "auto 56px 1fr 1fr auto",
            gap: "0.4rem", alignItems: "center",
            background: "#fff", border: `1px solid ${LINE}`, padding: "0.5rem 0.75rem",
            opacity: subj.active ? 1 : 0.6,
          }}>
            <button type="button" onClick={() => updateSubject(idx, { active: !subj.active })} style={{
              background: subj.active ? NEON : "#E5E7EB", color: subj.active ? "#0A0A0A" : INK_60,
              border: "none", borderRadius: 0, padding: "0.2rem 0.5rem",
              fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: "pointer", fontFamily: FONT, flexShrink: 0,
            }}>
              {subj.active ? "ACTIVE" : "OFF"}
            </button>
            <div style={{ display: "flex", gap: "0.2rem" }}>
              <button type="button" onClick={() => moveSubject(idx, -1)} disabled={idx === 0} style={iconBtnStyle(idx === 0)} title="Move up">↑</button>
              <button type="button" onClick={() => moveSubject(idx, 1)} disabled={idx === data.subjects.length - 1} style={iconBtnStyle(idx === data.subjects.length - 1)} title="Move down">↓</button>
            </div>
            <input type="text" value={subj.id} onChange={e => updateSubject(idx, { id: e.target.value })} placeholder="id-slug" style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem", fontFamily: "monospace" }} />
            <input type="text" value={subj.label} onChange={e => updateSubject(idx, { label: e.target.value })} placeholder="Display label" style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }} />
            <button type="button" onClick={() => { if (window.confirm(`Remove "${subj.label || subj.id}"?`)) removeSubject(idx); }}
              style={{ ...iconBtnStyle(false), color: "#c44" }} title="Delete">×</button>
          </div>
        ))}
      </div>
      <button onClick={addSubject} style={{ ...btnStyle, fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.4em", marginBottom: "2.5rem" }}>
        + Add subject
      </button>

      {/* ── Form Fields ────────────────────────────────────────────── */}
      <SectionHeader>Form Fields</SectionHeader>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Define which fields appear on the contact form. The subject dropdown is always present (configured above).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1rem" }}>
        {data.fields.length === 0 && (
          <div style={{ padding: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: INK_60, border: `1px dashed ${LINE}`, background: "#fff" }}>
            No fields. Click "+ Add field" to get started.
          </div>
        )}
        {data.fields.map((field, idx) => (
          <FieldRow key={field.name || idx} field={field} idx={idx} total={data.fields.length}
            onUpdate={p => updateField(idx, p)} onMove={dir => moveField(idx, dir)}
            onRemove={() => { if (window.confirm(`Remove field "${field.label || field.name}"?`)) removeField(idx); }}
          />
        ))}
      </div>
      <button onClick={addField} style={{ ...btnStyle, fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.4em" }}>
        + Add field
      </button>
    </div>
  );
}

/* ── FieldRow ──────────────────────────────────────────────────────────── */

function FieldRow({ field, idx, total, onUpdate, onMove, onRemove }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem",
        padding: "0.5rem 0.75rem", borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ flex: 1, fontSize: "0.82rem", color: INK_60, fontStyle: "italic" }}>
          {field.label || field.name || <em>New field</em>}
          {field.required && <span style={{ color: "#c44", marginLeft: "0.3em" }}>*</span>}
        </div>
        <button type="button" onClick={() => onMove(-1)} disabled={idx === 0} style={iconBtnStyle(idx === 0)} title="Move up">↑</button>
        <button type="button" onClick={() => onMove(1)} disabled={idx === total - 1} style={iconBtnStyle(idx === total - 1)} title="Move down">↓</button>
        <button type="button" onClick={onRemove} style={{ ...iconBtnStyle(false), color: "#c44" }} title="Delete">×</button>
      </div>
      <div style={{ padding: "0.65rem 0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem 0.75rem" }}>
        <label style={labelSt}>
          Name (key)
          <input type="text" value={field.name} onChange={e => onUpdate({ name: e.target.value })}
            placeholder="fieldName" style={{ ...inputStyle, marginTop: "0.2rem", fontFamily: "monospace" }} />
        </label>
        <label style={labelSt}>
          Label
          <input type="text" value={field.label} onChange={e => onUpdate({ label: e.target.value })}
            placeholder="Display label" style={{ ...inputStyle, marginTop: "0.2rem" }} />
        </label>
        <label style={labelSt}>
          Type
          <select value={field.type} onChange={e => onUpdate({ type: e.target.value })}
            style={{ ...inputStyle, marginTop: "0.2rem", cursor: "pointer" }}>
            <option value="text">text</option>
            <option value="email">email</option>
            <option value="tel">tel</option>
            <option value="textarea">textarea</option>
          </select>
        </label>
        <label style={{ ...labelSt, display: "flex", alignItems: "center", gap: "0.4em", marginTop: "0.3rem" }}>
          <input type="checkbox" checked={field.required} onChange={e => onUpdate({ required: e.target.checked })}
            style={{ accentColor: NEON }} />
          Required
        </label>
        <label style={{ ...labelSt, display: "flex", alignItems: "center", gap: "0.4em", marginTop: "0.3rem" }}>
          <input type="checkbox" checked={field.halfWidth} onChange={e => onUpdate({ halfWidth: e.target.checked })}
            style={{ accentColor: NEON }} />
          Half width
        </label>
        {(field.type === "textarea" || field.placeholder) && (
          <label style={labelSt}>
            Placeholder
            <input type="text" value={field.placeholder || ""} onChange={e => onUpdate({ placeholder: e.target.value })}
              placeholder="Placeholder text" style={{ ...inputStyle, marginTop: "0.2rem" }} />
          </label>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const labelSt = { display: "block", fontSize: "0.75rem", color: INK_60, fontWeight: 600 };

function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize: "0.78rem", fontWeight: 700, color: INK_60,
      letterSpacing: "0.08em", textTransform: "uppercase",
      borderBottom: `1px solid ${LINE}`, paddingBottom: "0.5rem",
      marginBottom: "1rem",
    }}>{children}</div>
  );
}

function LabeledInput({ label, hint, value, onChange, placeholder, multiline }) {
  const common = { ...inputStyle, marginTop: 0 };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5em", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60 }}>{label}</span>
        {hint && <span style={{ fontSize: "0.72rem", color: INK_60 }}>{hint}</span>}
      </div>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            rows={3} style={{ ...common, resize: "vertical" }} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={common} />
      }
    </div>
  );
}
