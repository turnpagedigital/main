import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   StructureNavTab — Navigation Items & Microsite Navs

   Extracted from SiteStructureTab. Manages:
     1. Navigation items (from nav.json)
     2. Microsite Navs (from nav.json)

   Data source: /api/admin/navigation
═══════════════════════════════════════════════════════════════════════════ */

// ── Empty item factories ────────────────────────────────────────────────
function emptyItem() {
  return { id: `item-${Date.now()}`, label: "", href: "/", active: true };
}

function emptyDropdown() {
  return { title: "", body: "", links: [], cta: { label: "", href: "/" } };
}

function emptyLink() {
  return { label: "", href: "/" };
}

// ── Main Component ──────────────────────────────────────────────────────
export default function StructureNavTab({ onDirtyChange }) {
  // ── NAVIGATION state ──────────────────────────────────────────────────
  const [items,           setItems]           = useState(null);
  const [microsites,      setMicrosites]      = useState(null);
  const [originalNav,     setOriginalNav]     = useState(null);

  // ── Shared ────────────────────────────────────────────────────────────
  const [phase,           setPhase]           = useState("loading");
  const [error,           setError]           = useState("");
  const [lastSavedAt,     setLastSavedAt]     = useState(null);

  // ── Dirty flag ────────────────────────────────────────────────────────
  const navDirty = useMemo(() => {
    if (!items || !originalNav) return false;
    const current = JSON.stringify({ items, microsites });
    return current !== JSON.stringify(originalNav);
  }, [items, microsites, originalNav]);

  const dirty = navDirty;

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
      setItems(fetchedItems);
      setMicrosites(fetchedMicrosites);
      setOriginalNav(JSON.parse(JSON.stringify({ items: fetchedItems, microsites: fetchedMicrosites })));

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

  if (phase === "loading") return <CenteredMessage>Loading navigation...</CenteredMessage>;
  if (phase === "error" && items === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!items) return null;

  const isSaving = phase === "saving";

  // ── NAVIGATION helpers ───────────────────────────────────────────────
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

      {/* NAVIGATION ITEMS */}
      <SectionHeader>Navigation Items</SectionHeader>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1rem" }}>
        {!items || items.length === 0 && (
          <div style={{
            padding: "1.5rem", textAlign: "center",
            fontSize: "0.85rem", color: INK_60,
            border: `1px dashed ${LINE}`, background: "#fff",
          }}>
            No nav items. Click "+ Add nav item" to get started.
          </div>
        )}
        {items && items.map((item, index) => (
          <NavRow
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            microsite={microsites?.[item.id] || null}
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
            onUpdateMicrosite={(patch) => updateMicrosite(item.id, patch)}
            onUpdateMicrositeItem={(idx, patch) => updateMicrositeItem(item.id, idx, patch)}
            onAddMicrositeItem={() => addMicrositeItem(item.id)}
            onMoveMicrositeItem={(idx, dir) => moveMicrositeItem(item.id, idx, dir)}
            onRemoveMicrositeItem={idx => removeMicrositeItem(item.id, idx)}
          />
        ))}
      </div>

      {items && (
        <button onClick={addItem} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "0.75rem 1rem", fontWeight: 700, width: "100%",
          fontSize: "0.82rem", marginBottom: "2rem",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4em",
        }}>
          + Add nav item
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Navigation Components
═══════════════════════════════════════════════════════════════════════════ */

function NavRow({
  item, index, total,
  microsite,
  onUpdate, onMoveUp, onMoveDown, onRemove,
  onToggleDropdown, onUpdateDropdown,
  onUpdateDropdownLink, onAddDropdownLink, onMoveDropdownLink, onRemoveDropdownLink,
  onUpdateMicrosite, onUpdateMicrositeItem, onAddMicrositeItem, onMoveMicrositeItem, onRemoveMicrositeItem,
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const [micrositeOpen, setMicrositeOpen] = useState(false);
  const labelEmpty = !item.label.trim();
  const hrefEmpty  = !item.href.trim();
  const hasDropdown = Boolean(item.dropdown);
  const hasMicrosite = Boolean(microsite);

  const summary = item.label
    ? `"${item.label}"${item.href ? ` — ${item.href}` : ""}`
    : <em>No label set</em>;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${item.active ? LINE : "#e0e0e0"}`,
      opacity: item.active ? 1 : 0.72,
      transition: "opacity 0.15s",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.7rem 1rem",
        borderBottom: `1px solid ${LINE}`,
        flexWrap: "wrap",
      }}>
        <button
          type="button"
          onClick={() => onUpdate({ active: !item.active })}
          style={{
            background: item.active ? NEON : "#E5E7EB",
            color: item.active ? "#0A0A0A" : INK_60,
            border: "none", borderRadius: 0,
            padding: "0.25rem 0.65rem",
            fontSize: "0.7rem", fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer", fontFamily: FONT,
            flexShrink: 0,
          }}
        >
          {item.active ? "ACTIVE" : "INACTIVE"}
        </button>

        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontStyle: "italic", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {summary}
        </div>

        <button onClick={onMoveUp}  disabled={index === 0}          style={iconBtnStyle(index === 0)}          title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} title="Move down">↓</button>
        <button
          onClick={() => { if (window.confirm(`Remove "${item.label || item.id}"?`)) onRemove(); }}
          style={{ ...iconBtnStyle(false), color: "#c44" }}
          title="Delete"
        >×</button>
      </div>

      <div style={{ padding: "0.95rem 1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }} className="nav-grid">
        <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
          Label
          <input
            type="text"
            value={item.label}
            onChange={e => onUpdate({ label: e.target.value })}
            placeholder="Label"
            style={{
              ...inputStyle,
              marginTop: "0.25rem",
              borderColor: labelEmpty ? "#e08080" : undefined,
            }}
          />
          {labelEmpty && (
            <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
          )}
        </label>

        <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
          Href
          <input
            type="text"
            value={item.href}
            onChange={e => onUpdate({ href: e.target.value })}
            placeholder="/path or https://…"
            style={{
              ...inputStyle,
              marginTop: "0.25rem",
              borderColor: hrefEmpty ? "#e08080" : undefined,
            }}
          />
          {hrefEmpty && (
            <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
          )}
        </label>
      </div>

      {/* TEST: Microsite nav toggle */}
      <div style={{ borderTop: `1px solid ${LINE}`, padding: "0.5rem 1rem", background: "#fff9e6" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={hasMicrosite}
            onChange={e => {
              if (e.target.checked) {
                onUpdateMicrosite({
                  brand: { label: item.label, href: item.href },
                  items: [],
                  cta: { label: "Contact", href: "/contact" },
                });
                setMicrositeOpen(true);
              } else {
                setMicrositeOpen(false);
              }
            }}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          ☑️ Enable microsite nav for this page
        </label>
      </div>

      <div style={{
        borderTop: `1px solid ${LINE}`,
        padding: "0.3rem 1rem",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <button
          type="button"
          onClick={() => {
            if (!hasDropdown) {
              onToggleDropdown(false);
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
                onToggleDropdown(true);
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

      {micrositeOpen && (
        <MicrositeAccordion
          ms={microsite || {}}
          onUpdate={onUpdateMicrosite}
          onUpdateItem={onUpdateMicrositeItem}
          onAddItem={onAddMicrositeItem}
          onMoveItem={onMoveMicrositeItem}
          onRemoveItem={onRemoveMicrositeItem}
        />
      )}
    </div>
  );
}

function DropdownEditor({ dd, onUpdate, onUpdateLink, onAddLink, onMoveLink, onRemoveLink }) {
  const panelStyle = {
    borderTop: `1px solid ${LINE}`,
    background: "#fafafa",
    padding: "1rem 1rem 1rem",
    display: "flex", flexDirection: "column", gap: "0.75rem",
  };

  const subLabel = {
    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
    color: INK_60, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: "0.35rem", display: "block",
  };

  return (
    <div style={panelStyle}>
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

      <div>
        <span style={subLabel}>Quick links</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {(dd.links || []).map((link, li) => (
            <div key={li} style={{
              display: "grid",
              gridTemplateColumns: "64px 1fr 1fr 100px",
              gap: "0.4rem", alignItems: "center",
            }}>
              <div style={{ display: "flex", gap: "0.2rem" }}>
                <button
                  type="button"
                  onClick={() => onMoveLink(li, -1)}
                  disabled={li === 0}
                  title="Move up"
                  style={iconBtnStyle(li === 0)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMoveLink(li, 1)}
                  disabled={li === (dd.links || []).length - 1}
                  title="Move down"
                  style={iconBtnStyle(li === (dd.links || []).length - 1)}
                >
                  ↓
                </button>
              </div>
              <input
                type="text"
                value={link.label}
                onChange={e => onUpdateLink(li, { label: e.target.value })}
                placeholder="Link label"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              <input
                type="text"
                value={link.href}
                onChange={e => onUpdateLink(li, { href: e.target.value })}
                placeholder="/path or https://…"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
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

function MicrositeAccordion({ ms, onUpdate, onUpdateItem, onAddItem, onMoveItem, onRemoveItem }) {
  const subLabel = {
    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
    color: INK_60, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: "0.35rem", display: "block",
  };

  return (
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
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveItem(idx, 1)}
                      disabled={idx === (ms?.items || []).length - 1}
                      title="Move down"
                      style={iconBtnStyle(idx === (ms?.items || []).length - 1)}
                    >
                      ↓
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helper Components
═══════════════════════════════════════════════════════════════════════════ */

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
