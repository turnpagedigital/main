import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   HomeContentTab — manage home page situations (6) and testimonials (3).

   Fetches from GET /api/admin/home-content (reads src/data/home-content.json
   via GitHub), saves via PUT /api/admin/home-content. Auth is handled server-side.

   UI sections:
     1. Situations — reorderable rows with no, title, body, details
     2. Testimonials — reorderable rows with quote, by

   Self-contained — owns its own fetch/save lifecycle.
   Reports dirty state via onDirtyChange?.(dirty).
═══════════════════════════════════════════════════════════════════════════ */

function emptySituation() {
  return {
    id:      `sit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    no:      "",
    title:   "",
    body:    "",
    details: "",
  };
}

function emptyTestimonial() {
  return {
    id:    `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    quote: "",
    by:    "",
  };
}

function normalize(data) {
  return {
    situations:   Array.isArray(data?.situations)   ? data.situations   : [],
    testimonials: Array.isArray(data?.testimonials) ? data.testimonials : [],
  };
}

export default function HomeContentTab({ onDirtyChange }) {
  const [data,     setData]     = useState(null);   // null = not yet loaded
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
      const r = await fetch("/api/admin/home-content", { credentials: "include" });
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
      const r = await fetch("/api/admin/home-content", {
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

  if (phase === "loading") return <CenteredMessage>Loading home content…</CenteredMessage>;
  if (phase === "error" && data === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (data === null) return null;

  const isSaving = phase === "saving";

  // ── situation helpers ─────────────────────────────────────────────────────

  function updateSituation(si, patch) {
    setData(prev => ({
      ...prev,
      situations: prev.situations.map((s, i) => i === si ? { ...s, ...patch } : s),
    }));
  }

  function moveSituationUp(si) {
    if (si === 0) return;
    setData(prev => {
      const next = [...prev.situations];
      [next[si - 1], next[si]] = [next[si], next[si - 1]];
      return { ...prev, situations: next };
    });
  }

  function moveSituationDown(si) {
    setData(prev => {
      if (si >= prev.situations.length - 1) return prev;
      const next = [...prev.situations];
      [next[si], next[si + 1]] = [next[si + 1], next[si]];
      return { ...prev, situations: next };
    });
  }

  function removeSituation(si) {
    setData(prev => ({ ...prev, situations: prev.situations.filter((_, i) => i !== si) }));
  }

  function addSituation() {
    setData(prev => ({ ...prev, situations: [...prev.situations, emptySituation()] }));
  }

  // ── testimonial helpers ───────────────────────────────────────────────────

  function updateTestimonial(ti, patch) {
    setData(prev => ({
      ...prev,
      testimonials: prev.testimonials.map((t, i) => i === ti ? { ...t, ...patch } : t),
    }));
  }

  function moveTestimonialUp(ti) {
    if (ti === 0) return;
    setData(prev => {
      const next = [...prev.testimonials];
      [next[ti - 1], next[ti]] = [next[ti], next[ti - 1]];
      return { ...prev, testimonials: next };
    });
  }

  function moveTestimonialDown(ti) {
    setData(prev => {
      if (ti >= prev.testimonials.length - 1) return prev;
      const next = [...prev.testimonials];
      [next[ti], next[ti + 1]] = [next[ti + 1], next[ti]];
      return { ...prev, testimonials: next };
    });
  }

  function removeTestimonial(ti) {
    setData(prev => ({ ...prev, testimonials: prev.testimonials.filter((_, i) => i !== ti) }));
  }

  function addTestimonial() {
    setData(prev => ({ ...prev, testimonials: [...prev.testimonials, emptyTestimonial()] }));
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>

      {/* Sticky header bar */}
      <div style={{
        position: "sticky",
        top: "88px",
        zIndex: 5,
        background: "#F4F5F7",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        marginBottom: "1.5rem", paddingBottom: "1rem", paddingTop: "0.5rem",
        borderBottom: `2px solid ${dirty ? NEON : LINE}`,
        transition: "border-color 0.15s",
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          Home Content
        </div>
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

      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "2rem" }}>
        Manage the situations and testimonials shown on the home page. Use the arrows to reorder. Changes deploy on Save.
      </p>

      {/* ── Situations ──────────────────────────────────────────────── */}
      <SectionHeader>Situations</SectionHeader>

      {data.situations.length === 0 && (
        <EmptyPlaceholder>No situations yet. Click "+ Add situation" to get started.</EmptyPlaceholder>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        {data.situations.map((s, si) => (
          <SituationRow
            key={s.id}
            sit={s}
            index={si}
            total={data.situations.length}
            onUpdate={patch => updateSituation(si, patch)}
            onMoveUp={() => moveSituationUp(si)}
            onMoveDown={() => moveSituationDown(si)}
            onRemove={() => {
              if (window.confirm(`Remove situation "${s.title || s.id}"?`)) removeSituation(si);
            }}
          />
        ))}
      </div>

      <button onClick={addSituation} style={{
        ...btnStyle, fontSize: "0.82rem", marginBottom: "2.5rem",
        display: "inline-flex", alignItems: "center", gap: "0.4em",
      }}>
        + Add situation
      </button>

      {/* ── Testimonials ────────────────────────────────────────────── */}
      <SectionHeader>Testimonials</SectionHeader>

      {data.testimonials.length === 0 && (
        <EmptyPlaceholder>No testimonials yet. Click "+ Add testimonial" to get started.</EmptyPlaceholder>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        {data.testimonials.map((t, ti) => (
          <TestimonialRow
            key={t.id}
            test={t}
            index={ti}
            total={data.testimonials.length}
            onUpdate={patch => updateTestimonial(ti, patch)}
            onMoveUp={() => moveTestimonialUp(ti)}
            onMoveDown={() => moveTestimonialDown(ti)}
            onRemove={() => {
              if (window.confirm(`Remove testimonial by "${t.by || t.id}"?`)) removeTestimonial(ti);
            }}
          />
        ))}
      </div>

      <button onClick={addTestimonial} style={{
        ...btnStyle, fontSize: "0.82rem",
        display: "inline-flex", alignItems: "center", gap: "0.4em",
      }}>
        + Add testimonial
      </button>
    </div>
  );
}

/* ── SituationRow ───────────────────────────────────────────────────────── */

function SituationRow({ sit, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const titleEmpty = !sit.title.trim();
  const bodyEmpty  = !sit.body.trim();

  return (
    <div style={{
      border: `1px solid ${LINE}`,
      background: "#fff",
      padding: "1.25rem",
    }}>
      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
        {/* Reorder */}
        <div style={{ display: "flex", gap: "0.25rem", paddingTop: "0.3rem" }}>
          <button type="button" onClick={onMoveUp} disabled={index === 0}
            title="Move up" style={iconBtnStyle(index === 0)}>
            &#9650;
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
            title="Move down" style={iconBtnStyle(index === total - 1)}>
            &#9660;
          </button>
        </div>

        {/* No field — compact */}
        <div style={{ width: 72 }}>
          <label style={labelStyle}>
            No.
            <input
              type="text"
              value={sit.no}
              onChange={e => onUpdate({ no: e.target.value })}
              placeholder="01"
              style={{ ...inputStyle, marginTop: "0.25rem" }}
            />
          </label>
        </div>

        {/* Title — flex 1 */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>
            Title
            <input
              type="text"
              value={sit.title}
              onChange={e => onUpdate({ title: e.target.value })}
              placeholder="Situation title"
              style={{
                ...inputStyle,
                marginTop: "0.25rem",
                borderColor: titleEmpty ? "#e08080" : undefined,
              }}
            />
            {titleEmpty && (
              <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
            )}
          </label>
        </div>

        {/* Delete */}
        <button type="button" onClick={onRemove} title="Delete situation"
          style={{ ...iconBtnStyle(false), color: "#c44", borderColor: "rgba(180,40,40,0.25)", fontSize: "1.1rem", marginTop: "1.6rem" }}>
          &times;
        </button>
      </div>

      {/* Body textarea */}
      <label style={{ ...labelStyle, display: "block", marginBottom: "0.75rem" }}>
        Short body (always visible)
        <textarea
          value={sit.body}
          onChange={e => onUpdate({ body: e.target.value })}
          placeholder="One-line summary shown collapsed"
          rows={2}
          style={{
            ...inputStyle,
            marginTop: "0.25rem",
            resize: "vertical",
            minHeight: 58,
            borderColor: bodyEmpty ? "#e08080" : undefined,
          }}
        />
        {bodyEmpty && (
          <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
        )}
      </label>

      {/* Details textarea */}
      <label style={{ ...labelStyle, display: "block" }}>
        Details (expanded on click)
        <textarea
          value={sit.details || ""}
          onChange={e => onUpdate({ details: e.target.value })}
          placeholder="Extended description shown when expanded"
          rows={3}
          style={{ ...inputStyle, marginTop: "0.25rem", resize: "vertical", minHeight: 80 }}
        />
      </label>
    </div>
  );
}

/* ── TestimonialRow ─────────────────────────────────────────────────────── */

function TestimonialRow({ test, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const quoteEmpty = !test.quote.trim();
  const byEmpty    = !test.by.trim();

  return (
    <div style={{
      border: `1px solid ${LINE}`,
      background: "#fff",
      padding: "1.25rem",
    }}>
      {/* Controls + delete */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
        {/* Reorder */}
        <div style={{ display: "flex", gap: "0.25rem", paddingTop: "0.3rem" }}>
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
                ...inputStyle,
                marginTop: "0.25rem",
                borderColor: byEmpty ? "#e08080" : undefined,
              }}
            />
            {byEmpty && (
              <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
            )}
          </label>
        </div>

        {/* Delete */}
        <button type="button" onClick={onRemove} title="Delete testimonial"
          style={{ ...iconBtnStyle(false), color: "#c44", borderColor: "rgba(180,40,40,0.25)", fontSize: "1.1rem", marginTop: "1.6rem" }}>
          &times;
        </button>
      </div>

      {/* Quote textarea */}
      <label style={{ ...labelStyle, display: "block" }}>
        Quote
        <textarea
          value={test.quote}
          onChange={e => onUpdate({ quote: e.target.value })}
          placeholder="The testimonial text"
          rows={4}
          style={{
            ...inputStyle,
            marginTop: "0.25rem",
            resize: "vertical",
            minHeight: 96,
            borderColor: quoteEmpty ? "#e08080" : undefined,
          }}
        />
        {quoteEmpty && (
          <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
        )}
      </label>
    </div>
  );
}

/* ── Small helpers ──────────────────────────────────────────────────────── */

const labelStyle = {
  display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600,
};

function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize: "0.78rem", fontWeight: 700, color: INK_60,
      letterSpacing: "0.08em", textTransform: "uppercase",
      borderBottom: `1px solid ${LINE}`, paddingBottom: "0.5rem",
      marginBottom: "1rem",
    }}>
      {children}
    </div>
  );
}

function EmptyPlaceholder({ children }) {
  return (
    <div style={{
      padding: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: INK_60,
      border: `1px dashed ${LINE}`, background: "#fff", marginBottom: "1rem",
    }}>
      {children}
    </div>
  );
}
