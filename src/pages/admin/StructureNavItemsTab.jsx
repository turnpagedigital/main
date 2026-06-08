import React, { useState, useEffect, useMemo, useCallback } from "react";
import { NEON, FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, btnStyle, iconBtnStyle, formatTime } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   StructureNavItemsTab — CRUD for top nav items (brand menu).

   Extracted from StructureNavTab. Manages ONLY main nav items (not microsite
   nav links, which are sub-items of a brand's microsite config).

   URL: /admin/structure/nav-items

   Data structure:
     { items: [{ id, label, href, dropdown: boolean, dropdownItems: [...] }],
       microsites: { "brand-key": { brand: {...}, items: [...], cta: {...} } } }

   Microsite config is stored separately under each brand's ID as the key.
═══════════════════════════════════════════════════════════════════════════ */

export default function StructureNavItemsTab({ onDirtyChange }) {
  const [phase,        setPhase]        = useState("loading");
  const [error,        setError]        = useState("");
  const [items,        setItems]        = useState(null);
  const [originalItems, setOriginalItems] = useState(null);
  const [lastSavedAt,  setLastSavedAt]  = useState(null);

  // ── Dirty flag — compare items AND microsites ──────
  const [originalMicrosites, setOriginalMicrosites] = useState(null);
  const [passThroughMicrosites, setPassThroughMicrosites] = useState(null);

  const dirty = useMemo(() => {
    if (!items || !originalItems) return false;
    const itemsDirty = JSON.stringify(items) !== JSON.stringify(originalItems);
    const micrositesDirty = JSON.stringify(passThroughMicrosites) !== JSON.stringify(originalMicrosites);
    return itemsDirty || micrositesDirty;
  }, [items, originalItems, passThroughMicrosites, originalMicrosites]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const res = await fetch("/api/admin/navigation", { credentials: "include" });

      if (res.status === 401) return;

      const body = await res.json();

      if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);

      const fetchedItems      = Array.isArray(body.data?.items) ? body.data.items : [];
      const fetchedMicrosites = body.data?.microsites && typeof body.data.microsites === "object"
        ? body.data.microsites : {};

      setItems(fetchedItems);
      setOriginalItems(JSON.parse(JSON.stringify(fetchedItems)));
      setPassThroughMicrosites(fetchedMicrosites);
      setOriginalMicrosites(JSON.parse(JSON.stringify(fetchedMicrosites)));

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
        body: JSON.stringify({ items, microsites: passThroughMicrosites }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");

      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>Loading navigation...</div>;
  if (phase === "error" && items === null) return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>
      <div style={{ color: "#c44", background: "#fce8e8", padding: "1rem", borderRadius: 4 }}>
        {error}
        <button onClick={load} style={{ ...btnStyle, marginTop: "0.5rem" }}>Retry</button>
      </div>
    </div>
  );

  const update        = useCallback((i, patch) => { setItems(prev => prev.map((it, ii) => ii === i ? { ...it, ...patch } : it)); }, []);
  const moveUp        = useCallback((i) => { if (i > 0) setItems(prev => { const arr = [...prev]; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; return arr; }); }, []);
  const moveDown      = useCallback((i) => { if (i < items.length - 1) setItems(prev => { const arr = [...prev]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; return arr; }); }, []);
  const remove        = useCallback((i) => { setItems(prev => prev.filter((_, ii) => ii !== i)); }, []);
  const toggleDropdown = useCallback((i, val) => { setItems(prev => prev.map((it, ii) => ii === i ? { ...it, dropdown: val } : it)); }, []);
  const updateDropdown = useCallback((i, patch) => { setItems(prev => prev.map((it, ii) => ii === i ? { ...it, ...patch } : it)); }, []);
  const updateDropdownLink = useCallback((i, li, patch) => {
    setItems(prev => prev.map((it, ii) => ii === i ? { ...it, dropdownItems: (it.dropdownItems || []).map((link, lli) => lli === li ? { ...link, ...patch } : link) } : it));
  }, []);
  const addDropdownLink = useCallback((i) => {
    setItems(prev => prev.map((it, ii) => ii === i ? { ...it, dropdownItems: [...(it.dropdownItems || []), { label: "", href: "/" }] } : it));
  }, []);
  const moveDropdownLink = useCallback((i, li, dir) => {
    setItems(prev => prev.map((it, ii) => {
      if (ii !== i) return it;
      const links = [...(it.dropdownItems || [])];
      const target = dir === "up" ? li - 1 : li + 1;
      if (target < 0 || target >= links.length) return it;
      [links[li], links[target]] = [links[target], links[li]];
      return { ...it, dropdownItems: links };
    }));
  }, []);
  const removeDropdownLink = useCallback((i, li) => {
    setItems(prev => prev.map((it, ii) => ii === i ? { ...it, dropdownItems: (it.dropdownItems || []).filter((_, lli) => lli !== li) } : it));
  }, []);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 3rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: `2px solid ${LINE}` }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>Navigation Items</h2>
          <p style={{ fontSize: "0.8rem", color: INK_60, margin: "0.3rem 0 0" }}>Top nav menu + brand microsite nav</p>
        </div>
        {lastSavedAt && <span style={{ fontSize: "0.8rem", color: "#2a6e2a" }}>Saved · {formatTime(lastSavedAt)}</span>}
        <button onClick={save} disabled={!dirty} style={{ ...btnStyle, opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "default" }}>Save changes</button>
      </div>

      {error && <div style={{ color: "#c44", background: "#fce8e8", padding: "1rem", marginBottom: "1.5rem", borderRadius: 4 }}>{error}</div>}

      {/* Items list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.map((item, index) => (
          <NavRow
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            microsite={passThroughMicrosites?.[item.id] || null}
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
            onUpdateMicrosite={(brandId, patch) => {
              setPassThroughMicrosites(prev => {
                if (patch === null) {
                  // Delete the microsite entry
                  const next = { ...prev };
                  delete next[brandId];
                  return next;
                } else {
                  // Merge the patch
                  return { ...prev, [brandId]: { ...(prev[brandId] || {}), ...patch } };
                }
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* NavRow — a single nav item with optional dropdown + microsite ────────────── */
function NavRow({
  item, index, total,
  onUpdate, onMoveUp, onMoveDown, onRemove,
  onToggleDropdown, onUpdateDropdown, onUpdateDropdownLink, onAddDropdownLink, onMoveDropdownLink, onRemoveDropdownLink,
  microsite, onUpdateMicrosite,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [micrositeOpen, setMicrositeOpen] = useState(Boolean(microsite)); // Open if microsite already exists
  const [micrositeEnabled, setMicrositeEnabled] = useState(Boolean(microsite));

  return (
    <div style={{ background: SURFACE, border: `1px solid ${LINE}`, padding: "1.2rem", borderRadius: 4 }}>
      {/* Main nav item row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem", marginBottom: "0.8rem" }}>
        {/* Label + href inputs */}
        <div style={{ flex: 1, display: "flex", gap: "0.5rem" }}>
          <label style={{ flex: 0.4 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", marginBottom: "0.2rem" }}>Label</div>
            <input type="text" value={item.label} onChange={e => onUpdate({ label: e.target.value })} style={inputStyle} />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", marginBottom: "0.2rem" }}>URL</div>
            <input type="text" value={item.href} onChange={e => onUpdate({ href: e.target.value })} style={inputStyle} />
          </label>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.3rem", alignItems: "flex-start", paddingTop: "1.35rem" }}>
          <button onClick={onMoveUp} disabled={index === 0} style={{ ...iconBtnStyle(index === 0), title: "Move up" }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={{ ...iconBtnStyle(index === total - 1), title: "Move down" }}>↓</button>
          <button onClick={onRemove} style={{ ...iconBtnStyle(false), title: "Delete" }}>🗑</button>
        </div>
      </div>

      {/* Dropdown toggle + microsite toggle */}
      <div style={{ display: "flex", gap: "1.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem" }}>
        {/* Dropdown checkbox + expand button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", margin: 0 }}>
            <input type="checkbox" checked={item.dropdown} onChange={e => onToggleDropdown(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            <span style={{ fontWeight: 600 }}>Dropdown</span>
          </label>
          {item.dropdown && (
            <button
              type="button"
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600,
                background: "none", border: "none", color: INK_60, cursor: "pointer",
                padding: "0.2rem 0.4rem", display: "inline-flex", alignItems: "center", gap: "0.25rem",
              }}
            >
              <span style={{ display: "inline-block", transition: "transform 0.2s", transform: dropdownOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
              {dropdownOpen ? "Hide items" : "Edit items"}
            </button>
          )}
        </div>

        {/* Microsite nav checkbox + expand button */}
        <div style={{
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          {/* Checkbox to enable/disable */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, margin: 0 }}>
            <input
              type="checkbox"
              checked={micrositeEnabled}
              onChange={e => {
                setMicrositeEnabled(e.target.checked);
                if (e.target.checked && onUpdateMicrosite) {
                  onUpdateMicrosite(item.id, {
                    brand: { label: item.label, href: item.href },
                    items: [],
                    cta: { label: "Contact", href: "/contact" },
                  });
                } else {
                  setMicrositeOpen(false);
                  onUpdateMicrosite?.(item.id, null);
                }
              }}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Enable microsite nav
          </label>

          {/* Expand/collapse button (like dropdown) */}
          {micrositeEnabled && (
            <>
              <button
                type="button"
                onClick={() => setMicrositeOpen(o => !o)}
                style={{
                  fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600,
                  background: "none", border: "none", color: INK_60, cursor: "pointer",
                  padding: "0.2rem 0.4rem", display: "inline-flex", alignItems: "center", gap: "0.25rem",
                }}
              >
                <span style={{ display: "inline-block", transition: "transform 0.2s", transform: micrositeOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                {micrositeOpen ? "Hide microsite nav" : "Edit microsite nav"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dropdown items editor */}
      {item.dropdown && dropdownOpen && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${LINE}` }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: INK_60, marginBottom: "0.5rem" }}>Dropdown Items</div>
          {(item.dropdownItems || []).map((link, li) => (
            <div key={li} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
              <input type="text" placeholder="Label" value={link.label} onChange={e => onUpdateDropdownLink(li, { label: e.target.value })} style={{ ...inputStyle, marginTop: 0, flex: 0.3 }} />
              <input type="text" placeholder="URL" value={link.href} onChange={e => onUpdateDropdownLink(li, { href: e.target.value })} style={{ ...inputStyle, marginTop: 0, flex: 1 }} />
              <button onClick={() => onMoveDropdownLink(li, "up")} disabled={li === 0} style={{ ...iconBtnStyle(li === 0) }}>↑</button>
              <button onClick={() => onMoveDropdownLink(li, "down")} disabled={li === (item.dropdownItems || []).length - 1} style={{ ...iconBtnStyle(li === (item.dropdownItems || []).length - 1) }}>↓</button>
              <button onClick={() => onRemoveDropdownLink(li)} style={iconBtnStyle(false)}>✕</button>
            </div>
          ))}
          <button onClick={onAddDropdownLink} style={{ ...btnStyle, fontSize: "0.75rem", marginTop: "0.5rem" }}>+ Add item</button>
        </div>
      )}

      {/* Microsite nav editor */}
      {micrositeEnabled && micrositeOpen && onUpdateMicrosite && (
        <MicrositeEditor
          ms={microsite || {}}
          onUpdate={(patch) => {
            const items = (microsite?.items || []).map((it, i) => i === patch.idx ? { ...it, ...patch } : it);
            onUpdateMicrosite(item.id, { items });
          }}
          onAddItem={() => {
            const items = [...(microsite?.items || []), { label: "", href: "/" }];
            onUpdateMicrosite(item.id, { items });
          }}
          onDeleteItems={() => {
            const items = [...(microsite?.items || [])];
            onUpdateMicrosite(item.id, { items });
          }}
          onRemoveItem={(idx) => {
            const items = (microsite?.items || []).filter((_, i) => i !== idx);
            onUpdateMicrosite(item.id, { items });
          }}
        />
      )}
    </div>
  );
}

function MicrositeEditor({ ms, onUpdate, onAddItem, onRemoveItem }) {
  return (
    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${LINE}` }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: INK_60, marginBottom: "0.5rem" }}>Microsite Nav Links</div>
      {(ms.items || []).map((link, i) => (
        <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
          <input type="text" placeholder="Label" value={link.label} onChange={e => onUpdate({ idx: i, label: e.target.value })} style={{ ...inputStyle, marginTop: 0, flex: 0.3 }} />
          <input type="text" placeholder="URL" value={link.href} onChange={e => onUpdate({ idx: i, href: e.target.value })} style={{ ...inputStyle, marginTop: 0, flex: 1 }} />
          <button onClick={() => onRemoveItem(i)} style={iconBtnStyle(false)}>✕</button>
        </div>
      ))}
      <button onClick={onAddItem} style={{ ...btnStyle, fontSize: "0.75rem", marginTop: "0.5rem" }}>+ Add link</button>
    </div>
  );
}
