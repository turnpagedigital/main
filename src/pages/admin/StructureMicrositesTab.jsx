import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   StructureMicrositesTab — Microsite Navs only

   Extracted from StructureNavTab. Manages ONLY the microsites section.
   Uses a pass-through pattern: nav items are loaded and sent back on save
   unchanged, so this tab never overwrites main nav data.

   Data source: /api/admin/navigation
═══════════════════════════════════════════════════════════════════════════ */

// ── Empty item factory ──────────────────────────────────────────────────
function emptyLink() {
  return { label: "", href: "/" };
}

// ── Main Component ──────────────────────────────────────────────────────
export default function StructureMicrositesTab({ onDirtyChange }) {
  // ── MICROSITES state ──────────────────────────────────────────────────
  const [microsites,         setMicrosites]         = useState(null);
  const [originalMicrosites, setOriginalMicrosites] = useState(null);

  // ── Pass-through: loaded but never edited here ────────────────────────
  const [passThroughItems,   setPassThroughItems]   = useState(null);

  // ── Shared ────────────────────────────────────────────────────────────
  const [phase,              setPhase]              = useState("loading");
  const [error,              setError]              = useState("");
  const [lastSavedAt,        setLastSavedAt]        = useState(null);

  // ── Dirty flag — compare microsites only, not passThroughItems ────────
  const dirty = useMemo(() => {
    if (!microsites || !originalMicrosites) return false;
    return JSON.stringify(microsites) !== JSON.stringify(originalMicrosites);
  }, [microsites, originalMicrosites]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const navRes = await fetch("/api/admin/navigation", { credentials: "include" });

      if (navRes.status === 401) return;

      const navBody = await navRes.json();

      if (!navRes.ok || !navBody.ok) throw new Error(navBody.error || `HTTP ${navRes.status}`);

      const fetchedItems      = Array.isArray(navBody.data?.items) ? navBody.data.items : [];
      const fetchedMicrosites = navBody.data?.microsites && typeof navBody.data.microsites === "object"
        ? navBody.data.microsites : {};

      setPassThroughItems(fetchedItems);
      setMicrosites(fetchedMicrosites);
      setOriginalMicrosites(JSON.parse(JSON.stringify(fetchedMicrosites)));

      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (!microsites) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: passThroughItems, microsites }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");

      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading microsites...</CenteredMessage>;
  if (phase === "error" && microsites === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!microsites) return null;

  const isSaving = phase === "saving";

  // ── Microsite helpers ────────────────────────────────────────────────
  function updateMicrosite(brandId, patch) {
    setMicrosites(prev => ({ ...prev, [brandId]: { ...(prev[brandId] || {}), ...patch } }));
  }

  function updateMicrositeItem(brandId, itemIndex, patch) {
    setMicrosites(prev => {
      const ms = prev[brandId] || {};
      const items2 = (ms.items || []).map((it, i) => i === itemIndex ? { ...it, ...patch } : it);
      return { ...prev, [brandId]: { ...ms, items: items2 } };
    });
  }

  function addMicrositeItem(brandId) {
    setMicrosites(prev => {
      const ms = prev[brandId] || {};
      return { ...prev, [brandId]: { ...ms, items: [...(ms.items || []), emptyLink()] } };
    });
  }

  function moveMicrositeItem(brandId, itemIndex, dir) {
    setMicrosites(prev => {
      const ms = prev[brandId] || {};
      const arr = [...(ms.items || [])];
      const target = itemIndex + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[itemIndex], arr[target]] = [arr[target], arr[itemIndex]];
      return { ...prev, [brandId]: { ...ms, items: arr } };
    });
  }

  function removeMicrositeItem(brandId, itemIndex) {
    setMicrosites(prev => {
      const ms = prev[brandId] || {};
      return { ...prev, [brandId]: { ...ms, items: (ms.items || []).filter((_, i) => i !== itemIndex) } };
    });
  }

  const micrositeEntries = Object.entries(microsites || {});

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
          Microsites
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

      {/* MICROSITE PANELS */}
      {micrositeEntries.length === 0 ? (
        <div style={{
          padding: "1.5rem", textAlign: "center",
          fontSize: "0.85rem", color: INK_60,
          border: `1px dashed ${LINE}`, background: "#fff",
        }}>
          No microsites found in navigation data.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {micrositeEntries.map(([brandId, ms]) => (
            <MicrositePanel
              key={brandId}
              brandId={brandId}
              ms={ms}
              onUpdate={patch => updateMicrosite(brandId, patch)}
              onUpdateItem={(idx, patch) => updateMicrositeItem(brandId, idx, patch)}
              onAddItem={() => addMicrositeItem(brandId)}
              onMoveItem={(idx, dir) => moveMicrositeItem(brandId, idx, dir)}
              onRemoveItem={idx => removeMicrositeItem(brandId, idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════════════════ */

function MicrositePanel({ brandId, ms, onUpdate, onUpdateItem, onAddItem, onMoveItem, onRemoveItem }) {
  const [open, setOpen] = useState(false);

  const subLabel = {
    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
    color: INK_60, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: "0.35rem", display: "block",
  };

  return (
    <div style={{ border: `1px solid ${LINE}`, background: "#fff" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left",
          background: "none", border: "none", padding: "0.65rem 1rem",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: INK,
        }}
      >
        <span style={{
          display: "inline-block",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
          color: INK_60,
        }}>&#9658;</span>
        <span>{ms?.brand?.label || brandId}</span>
        <span style={{ fontSize: "0.72rem", color: INK_60, fontWeight: 400 }}>({brandId})</span>
      </button>

      {open && (
        <div style={{
          borderTop: `1px solid ${LINE}`,
          background: "#fafafa",
          padding: "1rem",
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          <div>
            <span style={subLabel}>Brand link</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              <input
                type="text"
                value={ms?.brand?.label || ""}
                onChange={e => onUpdate({ brand: { ...(ms?.brand || {}), label: e.target.value } })}
                placeholder="Brand label"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              <input
                type="text"
                value={ms?.brand?.href || ""}
                onChange={e => onUpdate({ brand: { ...(ms?.brand || {}), href: e.target.value } })}
                placeholder="/path or https://…"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
            </div>
          </div>

          <div>
            <span style={subLabel}>Section links</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {(ms?.items || []).map((item, idx) => (
                <div key={idx} style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr 1fr 36px",
                  gap: "0.4rem", alignItems: "center",
                }}>
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    <button
                      type="button"
                      onClick={() => onMoveItem(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                      style={iconBtnStyle(idx === 0)}
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveItem(idx, 1)}
                      disabled={idx === (ms?.items || []).length - 1}
                      title="Move down"
                      style={iconBtnStyle(idx === (ms?.items || []).length - 1)}
                    >
                      &#9660;
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.label}
                    onChange={e => onUpdateItem(idx, { label: e.target.value })}
                    placeholder="Label"
                    style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
                  />
                  <input
                    type="text"
                    value={item.href}
                    onChange={e => onUpdateItem(idx, { href: e.target.value })}
                    placeholder="/path or https://…"
                    style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remove "${item.label || "this item"}"?`)) onRemoveItem(idx);
                    }}
                    title="Delete"
                    style={{
                      ...iconBtnStyle(false),
                      color: "#c44", borderColor: "rgba(180,40,40,0.25)",
                      fontSize: "1rem",
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onAddItem}
              style={{
                ...btnStyle,
                fontSize: "0.78rem", marginTop: "0.5rem",
                display: "inline-flex", alignItems: "center", gap: "0.3em",
              }}
            >
              + Add item
            </button>
          </div>

          <div>
            <span style={subLabel}>CTA button</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              <input
                type="text"
                value={ms?.cta?.label || ""}
                onChange={e => onUpdate({ cta: { ...(ms?.cta || {}), label: e.target.value } })}
                placeholder="CTA label"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              <input
                type="text"
                value={ms?.cta?.href || ""}
                onChange={e => onUpdate({ cta: { ...(ms?.cta || {}), href: e.target.value } })}
                placeholder="/path or https://…"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children, style }) {
  return (
    <div style={{
      fontSize: "0.78rem", fontWeight: 700, color: INK_60,
      letterSpacing: "0.08em", textTransform: "uppercase",
      borderBottom: `1px solid ${LINE}`, paddingBottom: "0.5rem",
      marginBottom: "1rem",
      ...style,
    }}>
      {children}
    </div>
  );
}
