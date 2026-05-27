import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   NavigationTab — manage top nav items (label, href, active, order),
   per-item dropdown previews, and sub-brand microsite navs.

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

function emptyDropdown() {
  return { title: "", body: "", links: [], cta: { label: "", href: "/" } };
}

function emptyLink() {
  return { label: "", href: "/" };
}

export default function NavigationTab({ onDirtyChange }) {
  const [items,      setItems]      = useState(null);   // null = not yet loaded
  const [microsites, setMicrosites] = useState(null);
  const [original,   setOriginal]   = useState(null);
  const [phase,      setPhase]      = useState("loading");
  const [error,      setError]      = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // dirty compares the full payload (items + microsites)
  const dirty = useMemo(() => {
    if (!items || !original) return false;
    const current = JSON.stringify({ items, microsites });
    return current !== JSON.stringify(original);
  }, [items, microsites, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/navigation", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fetchedItems      = Array.isArray(body.data?.items) ? body.data.items : [];
      const fetchedMicrosites = body.data?.microsites && typeof body.data.microsites === "object"
        ? body.data.microsites : {};
      setItems(fetchedItems);
      setMicrosites(fetchedMicrosites);
      setOriginal(JSON.parse(JSON.stringify({ items: fetchedItems, microsites: fetchedMicrosites })));
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
        body: JSON.stringify({ items, microsites }),
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

  function updateDropdown(index, patch) {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const existing = it.dropdown || emptyDropdown();
      return { ...it, dropdown: { ...existing, ...patch } };
    }));
  }

  function toggleDropdown(index, hasDropdown) {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      if (hasDropdown) {
        // Remove dropdown field
        const { dropdown: _, ...rest } = it;
        return rest;
      } else {
        return { ...it, dropdown: emptyDropdown() };
      }
    }));
  }

  function updateDropdownLink(itemIndex, linkIndex, patch) {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIndex) return it;
      const dd = it.dropdown || emptyDropdown();
      const links = (dd.links || []).map((l, j) => j === linkIndex ? { ...l, ...patch } : l);
      return { ...it, dropdown: { ...dd, links } };
    }));
  }

  function addDropdownLink(itemIndex) {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIndex) return it;
      const dd = it.dropdown || emptyDropdown();
      return { ...it, dropdown: { ...dd, links: [...(dd.links || []), emptyLink()] } };
    }));
  }

  function moveDropdownLink(itemIndex, linkIndex, dir) {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIndex) return it;
      const dd = it.dropdown || emptyDropdown();
      const links = [...(dd.links || [])];
      const target = linkIndex + dir;
      if (target < 0 || target >= links.length) return it;
      [links[linkIndex], links[target]] = [links[target], links[linkIndex]];
      return { ...it, dropdown: { ...dd, links } };
    }));
  }

  function removeDropdownLink(itemIndex, linkIndex) {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIndex) return it;
      const dd = it.dropdown || emptyDropdown();
      const links = (dd.links || []).filter((_, j) => j !== linkIndex);
      return { ...it, dropdown: { ...dd, links } };
    }));
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

  // ── microsite mutation helpers ────────────────────────────────────────────

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
        Expand "Edit dropdown" to manage the hover dropdown content for each item.
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
            onToggleDropdown={hasDropdown => toggleDropdown(index, hasDropdown)}
            onUpdateDropdown={patch => updateDropdown(index, patch)}
            onUpdateDropdownLink={(li, patch) => updateDropdownLink(index, li, patch)}
            onAddDropdownLink={() => addDropdownLink(index)}
            onMoveDropdownLink={(li, dir) => moveDropdownLink(index, li, dir)}
            onRemoveDropdownLink={li => removeDropdownLink(index, li)}
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

      {/* ── Sub-brand microsite navs ────────────────────────────────────────── */}
      <div style={{ marginTop: "3rem" }}>
        <div style={{
          fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em",
          marginBottom: "0.4rem",
        }}>
          Sub-brand microsite navs
        </div>
        <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "1.5rem" }}>
          Each sub-brand page has its own simplified nav. Edit the brand link, section items, and CTA here.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {Object.entries(microsites || {}).map(([brandId, ms]) => (
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
      </div>
    </div>
  );
}

/* ── NavRow ─────────────────────────────────────────────────────────────── */

function NavRow({
  item, index, total,
  onUpdate, onMoveUp, onMoveDown, onRemove,
  onToggleDropdown, onUpdateDropdown,
  onUpdateDropdownLink, onAddDropdownLink, onMoveDropdownLink, onRemoveDropdownLink,
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const labelEmpty = !item.label.trim();
  const hrefEmpty  = !item.href.trim();
  const hasDropdown = Boolean(item.dropdown);

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${LINE}`,
      opacity: item.active ? 1 : 0.55,
      transition: "opacity 0.15s",
    }}>
      {/* Main row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "64px 32px 200px 1fr 52px",
        gap: "0.5rem",
        alignItems: "center",
        padding: "0.5rem",
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

      {/* Dropdown toggle strip */}
      <div style={{
        borderTop: `1px solid ${LINE}`,
        padding: "0.3rem 0.5rem",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <button
          type="button"
          onClick={() => {
            if (!hasDropdown) {
              onToggleDropdown(false); // add dropdown
              setDropOpen(true);
            } else {
              setDropOpen(o => !o);
            }
          }}
          style={{
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600,
            background: "none", border: "none", padding: "0.2rem 0",
            cursor: "pointer", color: INK_60,
            display: "inline-flex", alignItems: "center", gap: "0.3em",
          }}
        >
          <span style={{
            display: "inline-block",
            transform: (hasDropdown && dropOpen) ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}>&#9658;</span>
          {hasDropdown ? "Edit dropdown" : "Add dropdown"}
        </button>
        {hasDropdown && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Remove the dropdown from this nav item?")) {
                onToggleDropdown(true); // remove dropdown
                setDropOpen(false);
              }
            }}
            style={{
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 500,
              background: "none", border: "none", padding: 0,
              cursor: "pointer", color: "#c44",
            }}
          >
            Remove dropdown
          </button>
        )}
      </div>

      {/* Dropdown editor (expanded) */}
      {hasDropdown && dropOpen && (
        <DropdownEditor
          dd={item.dropdown}
          onUpdate={onUpdateDropdown}
          onUpdateLink={onUpdateDropdownLink}
          onAddLink={onAddDropdownLink}
          onMoveLink={onMoveDropdownLink}
          onRemoveLink={onRemoveDropdownLink}
        />
      )}
    </div>
  );
}

/* ── DropdownEditor ─────────────────────────────────────────────────────── */

function DropdownEditor({ dd, onUpdate, onUpdateLink, onAddLink, onMoveLink, onRemoveLink }) {
  const panelStyle = {
    borderTop: `1px solid ${LINE}`,
    background: "#fafafa",
    padding: "1rem 0.75rem 1rem",
    display: "flex", flexDirection: "column", gap: "0.75rem",
  };

  const subLabel = {
    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
    color: INK_60, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: "0.35rem", display: "block",
  };

  return (
    <div style={panelStyle}>
      {/* Title */}
      <div>
        <span style={subLabel}>Dropdown title</span>
        <input
          type="text"
          value={dd.title || ""}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="e.g. Copyright Claims"
          style={{ ...inputStyle, marginTop: 0 }}
        />
      </div>

      {/* Body */}
      <div>
        <span style={subLabel}>Dropdown body</span>
        <textarea
          value={dd.body || ""}
          onChange={e => onUpdate({ body: e.target.value })}
          placeholder="Short description shown in the dropdown…"
          rows={3}
          style={{
            ...inputStyle, marginTop: 0,
            resize: "vertical", minHeight: 64,
          }}
        />
      </div>

      {/* Quick links */}
      <div>
        <span style={subLabel}>Quick links</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {(dd.links || []).map((link, li) => (
            <div key={li} style={{
              display: "grid",
              gridTemplateColumns: "64px 1fr 1fr 100px",
              gap: "0.4rem", alignItems: "center",
            }}>
              {/* Up/down */}
              <div style={{ display: "flex", gap: "0.2rem" }}>
                <button
                  type="button"
                  onClick={() => onMoveLink(li, -1)}
                  disabled={li === 0}
                  title="Move up"
                  style={iconBtnStyle(li === 0)}
                >
                  &#9650;
                </button>
                <button
                  type="button"
                  onClick={() => onMoveLink(li, 1)}
                  disabled={li === (dd.links || []).length - 1}
                  title="Move down"
                  style={iconBtnStyle(li === (dd.links || []).length - 1)}
                >
                  &#9660;
                </button>
              </div>
              {/* Label */}
              <input
                type="text"
                value={link.label}
                onChange={e => onUpdateLink(li, { label: e.target.value })}
                placeholder="Link label"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              {/* Href */}
              <input
                type="text"
                value={link.href}
                onChange={e => onUpdateLink(li, { href: e.target.value })}
                placeholder="/path or https://…"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              {/* External toggle + delete */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  fontSize: "0.72rem", color: INK_60, cursor: "pointer",
                  userSelect: "none",
                }}>
                  <input
                    type="checkbox"
                    checked={!!link.external}
                    onChange={e => onUpdateLink(li, { external: e.target.checked || undefined })}
                    style={{ width: 13, height: 13, accentColor: INK }}
                  />
                  Ext
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveLink(li)}
                  title="Remove link"
                  style={{
                    ...iconBtnStyle(false),
                    color: "#c44", borderColor: "rgba(180,40,40,0.25)",
                    fontSize: "1rem",
                  }}
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddLink}
          style={{
            ...btnStyle,
            fontSize: "0.78rem", marginTop: "0.5rem",
            display: "inline-flex", alignItems: "center", gap: "0.3em",
          }}
        >
          + Add link
        </button>
      </div>

      {/* CTA */}
      <div>
        <span style={subLabel}>CTA button</span>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 80px",
          gap: "0.4rem", alignItems: "center",
        }}>
          <input
            type="text"
            value={dd.cta?.label || ""}
            onChange={e => onUpdate({ cta: { ...(dd.cta || {}), label: e.target.value } })}
            placeholder="Button label"
            style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
          />
          <input
            type="text"
            value={dd.cta?.href || ""}
            onChange={e => onUpdate({ cta: { ...(dd.cta || {}), href: e.target.value } })}
            placeholder="/path or https://…"
            style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
          />
          <label style={{
            display: "inline-flex", alignItems: "center", gap: "0.25rem",
            fontSize: "0.72rem", color: INK_60, cursor: "pointer",
            userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={!!dd.cta?.external}
              onChange={e => onUpdate({ cta: { ...(dd.cta || {}), external: e.target.checked || undefined } })}
              style={{ width: 13, height: 13, accentColor: INK }}
            />
            External
          </label>
        </div>
      </div>
    </div>
  );
}

/* ── MicrositePanel ─────────────────────────────────────────────────────── */

function MicrositePanel({ brandId, ms, onUpdate, onUpdateItem, onAddItem, onMoveItem, onRemoveItem }) {
  const [open, setOpen] = useState(false);

  const subLabel = {
    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
    color: INK_60, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: "0.35rem", display: "block",
  };

  return (
    <div style={{ border: `1px solid ${LINE}`, background: "#fff" }}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left",
          background: "none", border: "none", padding: "0.65rem 0.75rem",
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
          padding: "1rem 0.75rem",
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          {/* Brand link */}
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

          {/* Section items */}
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

          {/* CTA */}
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
