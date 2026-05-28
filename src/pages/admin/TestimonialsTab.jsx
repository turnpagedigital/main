import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   TestimonialsTab — manage testimonials with topic tags.

   Tags map 1-to-1 with marketing page keys:
     home                → shown on the Home page
     ai-copyright        → shown on the AI Copyright page
     crypto              → shown on the Crypto page
     litigation-finance  → shown on the Litigation Finance page

   Data: src/data/testimonials.json  via  /api/admin/testimonials
═══════════════════════════════════════════════════════════════════════════ */

const TAG_OPTIONS = [
  { key: "home",               label: "Home" },
  { key: "ai-copyright",       label: "AI Copyright" },
  { key: "crypto",             label: "Crypto" },
  { key: "litigation-finance", label: "Litigation Finance" },
];

function emptyTestimonial() {
  return {
    id:     `test-${Date.now()}`,
    quote:  "",
    by:     "",
    tags:   [],
    active: true,
  };
}

function sanitize(data) {
  const arr = Array.isArray(data?.testimonials) ? data.testimonials : [];
  return arr.map(t => ({
    id:     typeof t.id     === "string" ? t.id     : `test-${Math.random().toString(36).slice(2, 8)}`,
    quote:  typeof t.quote  === "string" ? t.quote  : "",
    by:     typeof t.by     === "string" ? t.by     : "",
    tags:   Array.isArray(t.tags) ? t.tags : [],
    active: t.active !== false,
  }));
}

export default function TestimonialsTab({ onDirtyChange }) {
  const [testimonials, setTestimonials] = useState([]);
  const [original,     setOriginal]     = useState([]);
  const [phase,        setPhase]        = useState("loading");
  const [error,        setError]        = useState("");
  const [lastSavedAt,  setLastSavedAt]  = useState(null);

  const dirty = useMemo(() => JSON.stringify(testimonials) !== JSON.stringify(original), [testimonials, original]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/testimonials", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const data = sanitize(body.data);
      setTestimonials(data);
      setOriginal(JSON.parse(JSON.stringify(data)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/testimonials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ testimonials }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  function update(i, patch) {
    setTestimonials(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  }

  function moveUp(i) {
    if (i === 0) return;
    setTestimonials(prev => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function moveDown(i) {
    setTestimonials(prev => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  function remove(i) {
    setTestimonials(prev => prev.filter((_, idx) => idx !== i));
  }

  function add() {
    setTestimonials(prev => [...prev, emptyTestimonial()]);
  }

  if (phase === "loading") return <CenteredMessage>Loading testimonials…</CenteredMessage>;
  if (phase === "error") return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );

  const isSaving = phase === "saving";

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: "88px", zIndex: 5,
        background: "#F4F5F7",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        marginBottom: "1.5rem", paddingBottom: "1rem", paddingTop: "0.5rem",
        borderBottom: `2px solid ${dirty ? NEON : LINE}`,
        transition: "border-color 0.15s",
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          Testimonials
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: dirty ? "#7a5c00" : INK_60, fontWeight: dirty ? 700 : 400 }}>
          {isSaving    && "Saving…"}
          {!isSaving && dirty     && "Unsaved changes — click Save to commit"}
          {!isSaving && !dirty    && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty    && !lastSavedAt && "Up to date"}
        </div>
        <button onClick={save} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor:  (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: "0.82rem", color: INK_60, marginBottom: "1.5rem" }}>
        Tag each testimonial with one or more topics to control which pages it appears on.
      </p>

      {/* ── Testimonial list ──────────────────────────────────────── */}
      {testimonials.length === 0 && (
        <div style={{
          padding: "2rem", textAlign: "center", fontSize: "0.9rem", color: INK_60,
          border: `1px dashed ${LINE}`, background: "#fff", marginBottom: "1.5rem",
        }}>
          No testimonials yet. Click "+ Add testimonial" to get started.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
        {testimonials.map((t, i) => (
          <TestimonialRow
            key={t.id}
            test={t}
            index={i}
            total={testimonials.length}
            onUpdate={patch => update(i, patch)}
            onMoveUp={() => moveUp(i)}
            onMoveDown={() => moveDown(i)}
            onRemove={() => {
              if (window.confirm(`Remove testimonial by "${t.by || "this person"}"?`)) remove(i);
            }}
          />
        ))}
      </div>

      <button onClick={add} style={{
        ...btnStyle,
        background: "transparent", border: `1px dashed ${LINE}`,
        color: INK, padding: "0.75rem 1rem", fontWeight: 700, width: "100%",
        fontSize: "0.82rem",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4em",
      }}>
        + Add testimonial
      </button>
    </div>
  );
}

/* ── TestimonialRow ────────────────────────────────────────────────────────── */

function TestimonialRow({ test, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const quoteEmpty = !test.quote.trim();
  const byEmpty    = !test.by.trim();

  function toggleTag(key) {
    const current = test.tags || [];
    const next = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    onUpdate({ tags: next });
  }

  return (
    <div style={{
      border: `1px solid ${test.active ? LINE : "#d4a040"}`,
      background: test.active ? "#fff" : "#fffbf0",
      padding: "1.2rem",
      transition: "border-color 0.15s, background 0.15s",
    }}>
      {/* ── Row header: active toggle + reorder + delete ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
        {/* Active toggle */}
        <button
          type="button"
          onClick={() => onUpdate({ active: !test.active })}
          style={{
            background: test.active ? NEON : "#E5E7EB",
            color: test.active ? "#0A0A0A" : INK_60,
            border: "none", borderRadius: 0,
            padding: "0.25rem 0.65rem",
            fontSize: "0.7rem", fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer", fontFamily: FONT,
            flexShrink: 0, marginTop: "0.15rem",
          }}
        >
          {test.active ? "ON" : "OFF"}
        </button>

        {/* Reorder */}
        <div style={{ display: "flex", gap: "0.25rem", paddingTop: "0.1rem" }}>
          <button type="button" onClick={onMoveUp} disabled={index === 0}
            title="Move up" style={iconBtnStyle(index === 0)}>
            &#9650;
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
            title="Move down" style={iconBtnStyle(index === total - 1)}>
            &#9660;
          </button>
        </div>

        {/* Attribution */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>
            Attribution ("by")
            <input
              type="text"
              value={test.by}
              onChange={e => onUpdate({ by: e.target.value })}
              placeholder="e.g. FTX Trading Ltd. Creditor"
              style={{
                ...inputStyle, marginTop: "0.25rem",
                borderColor: byEmpty ? "#e08080" : undefined,
              }}
            />
            {byEmpty && (
              <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
            )}
          </label>
        </div>

        {/* Delete */}
        <button type="button" onClick={onRemove} title="Delete"
          style={{
            ...iconBtnStyle(false), color: "#c44",
            borderColor: "rgba(180,40,40,0.25)",
            fontSize: "1.1rem", marginTop: "1.55rem",
          }}>
          &times;
        </button>
      </div>

      {/* ── Quote textarea ── */}
      <label style={{ ...labelStyle, display: "block", marginBottom: "1rem" }}>
        Quote
        <textarea
          value={test.quote}
          onChange={e => onUpdate({ quote: e.target.value })}
          placeholder="The testimonial text"
          rows={3}
          style={{
            ...inputStyle, marginTop: "0.25rem", resize: "vertical", minHeight: 80,
            borderColor: quoteEmpty ? "#e08080" : undefined,
          }}
        />
        {quoteEmpty && (
          <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
        )}
      </label>

      {/* ── Tags ── */}
      <div>
        <div style={{ ...labelStyle, marginBottom: "0.5rem" }}>Topics (pages this testimonial appears on)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {TAG_OPTIONS.map(({ key, label }) => {
            const checked = (test.tags || []).includes(key);
            return (
              <label
                key={key}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.35em",
                  padding: "0.3rem 0.65rem",
                  background: checked ? INK : "#f0f0f0",
                  color: checked ? "#fff" : INK_60,
                  border: `1px solid ${checked ? INK : LINE}`,
                  fontSize: "0.78rem", fontWeight: 600,
                  cursor: "pointer", userSelect: "none",
                  transition: "all 0.12s",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTag(key)}
                  style={{ display: "none" }}
                />
                {label}
              </label>
            );
          })}
        </div>
        {(test.tags || []).length === 0 && (
          <p style={{ color: "#a06010", fontSize: "0.72rem", margin: "0.35rem 0 0" }}>
            No topics selected — this testimonial won't appear on any page.
          </p>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600,
};
