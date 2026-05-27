import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   NavigationTab — manage top nav items (label, href, active, order).

   Fetches from GET /api/admin/navigation (reads src/data/nav.json via
   GitHub), saves via PUT /api/admin/navigation. Auth is handled server-side.

   UI pattern: sticky header bar + list of editable rows with up/down reorder.
   Self-contained — owns its own fetch/save lifecycle.
   Reports dirty state via onDirtyChange?.(dirty).
═══════════════════════════════════════════════════════════════════════════ */

function emptyItem() {
  return {
    id:     `item-${Date.now()}`,
    label:  "",
    href:   "/",
    active: true,
  };
}

export default function NavigationTab({ onDirtyChange }) {
  const [items,    setItems]    = useState(null);   // null = not yet loaded
  const [original, setOriginal] = useState(null);
  const [phase,    setPhase]    = useState("loading");
  const [error,    setError]    = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const dirty = useMemo(() => {
    if (!items || !original) return false;
    return JSON.stringify(items) !== JSON.stringify(original);
  }, [items, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/navigation", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fetched = Array.isArray(body.data?.items) ? body.data.items : [];
      setItems(fetched);
      setOriginal(JSON.parse(JSON.stringify(fetched)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (!items) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading navigation…</CenteredMessage>;
  if (phase === "error" && items === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (items === null) return null;

  const isSaving = phase === "saving";

  // ── item mutation helpers ─────────────────────────────────────────────────

  function update(index, patch) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it));
  }

  function moveUp(index) {
    if (index === 0) return;
    setItems(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index) {
    setItems(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function remove(index) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()]);
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
          Navigation
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

      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "1.5rem" }}>
        Edit the top nav. Use the arrows to reorder. Toggle Active to hide an item without deleting it.
      </p>

      {/* Column header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "64px 32px 200px 1fr 52px",
        gap: "0.5rem",
        alignItems: "center",
        padding: "0 0.5rem 0.4rem",
        fontSize: "0.72rem", fontWeight: 700, color: INK_60,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        <span>Order</span>
        <span>On</span>
        <span>Label</span>
        <span>Href</span>
        <span />
      </div>

      {/* Nav item rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
        {items.length === 0 && (
          <div style={{
            padding: "1.5rem", textAlign: "center",
            fontSize: "0.85rem", color: INK_60,
            border: `1px dashed ${LINE}`, background: "#fff",
          }}>
            No nav items. Click "+ Add nav item" to get started.
          </div>
        )}
        {items.map((item, index) => (
          <NavRow
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            onUpdate={patch => update(index, patch)}
            onMoveUp={() => moveUp(index)}
            onMoveDown={() => moveDown(index)}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <button onClick={addItem} style={{
        ...btnStyle,
        fontSize: "0.82rem",
        display: "inline-flex", alignItems: "center", gap: "0.4em",
      }}>
        + Add nav item
      </button>
    </div>
  );
}

/* ── NavRow ─────────────────────────────────────────────────────────────── */

function NavRow({ item, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const labelEmpty = !item.label.trim();
  const hrefEmpty  = !item.href.trim();

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "64px 32px 200px 1fr 52px",
      gap: "0.5rem",
      alignItems: "center",
      background: "#fff",
      border: `1px solid ${LINE}`,
      padding: "0.5rem",
      opacity: item.active ? 1 : 0.55,
      transition: "opacity 0.15s",
    }}>

      {/* Up/down reorder buttons */}
      <div style={{ display: "flex", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          title="Move up"
          style={iconBtnStyle(index === 0)}
        >
          &#9650;
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          title="Move down"
          style={iconBtnStyle(index === total - 1)}
        >
          &#9660;
        </button>
      </div>

      {/* Active toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <input
          type="checkbox"
          checked={!!item.active}
          onChange={e => onUpdate({ active: e.target.checked })}
          title="Active — uncheck to hide without deleting"
          style={{ width: 16, height: 16, cursor: "pointer", accentColor: INK }}
        />
      </div>

      {/* Label */}
      <div>
        <input
          type="text"
          value={item.label}
          onChange={e => onUpdate({ label: e.target.value })}
          placeholder="Label"
          style={{
            ...inputStyle,
            marginTop: 0,
            borderColor: labelEmpty ? "#e08080" : undefined,
          }}
        />
        {labelEmpty && (
          <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
        )}
      </div>

      {/* Href */}
      <div>
        <input
          type="text"
          value={item.href}
          onChange={e => onUpdate({ href: e.target.value })}
          placeholder="/path or https://…"
          style={{
            ...inputStyle,
            marginTop: 0,
            borderColor: hrefEmpty ? "#e08080" : undefined,
          }}
        />
        {hrefEmpty && (
          <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
        )}
      </div>

      {/* Delete */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Remove "${item.label || item.id}"?`)) onRemove();
          }}
          title="Delete"
          style={{
            ...iconBtnStyle(false),
            color: "#c44", borderColor: "rgba(180,40,40,0.25)",
            fontSize: "1.1rem",
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
