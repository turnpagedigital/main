import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   FooterTab — manage footer columns, links, copyright, and contact email.

   Fetches from GET /api/admin/footer (reads src/data/footer.json via
   GitHub), saves via PUT /api/admin/footer. Auth is handled server-side.

   UI sections:
     1. Link columns — reorderable, each with reorderable links
     2. Copyright line
     3. Contact email (bottom bar)

   Self-contained — owns its own fetch/save lifecycle.
   Reports dirty state via onDirtyChange?.(dirty).
═══════════════════════════════════════════════════════════════════════════ */

function emptyLink() {
  return { id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: "", href: "/" };
}

function emptyColumn() {
  return {
    id:    `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "",
    links: [],
  };
}

function normalize(data) {
  return {
    columns:      Array.isArray(data?.columns) ? data.columns : [],
    copyright:    typeof data?.copyright === "string"    ? data.copyright    : "",
    copyrightKey: typeof data?.copyrightKey === "string" ? data.copyrightKey : undefined,
    contactEmail: typeof data?.contactEmail === "string" ? data.contactEmail : "",
  };
}

export default function FooterTab({ onDirtyChange }) {
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
      const r = await fetch("/api/admin/footer", { credentials: "include" });
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
      const r = await fetch("/api/admin/footer", {
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

  if (phase === "loading") return <CenteredMessage>Loading footer…</CenteredMessage>;
  if (phase === "error" && data === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (data === null) return null;

  const isSaving = phase === "saving";

  // ── top-level field helpers ───────────────────────────────────────────────

  function patchField(key, value) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  // ── column helpers ────────────────────────────────────────────────────────

  function updateColumn(ci, patch) {
    setData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => i === ci ? { ...col, ...patch } : col),
    }));
  }

  function moveColumnUp(ci) {
    if (ci === 0) return;
    setData(prev => {
      const next = [...prev.columns];
      [next[ci - 1], next[ci]] = [next[ci], next[ci - 1]];
      return { ...prev, columns: next };
    });
  }

  function moveColumnDown(ci) {
    setData(prev => {
      if (ci >= prev.columns.length - 1) return prev;
      const next = [...prev.columns];
      [next[ci], next[ci + 1]] = [next[ci + 1], next[ci]];
      return { ...prev, columns: next };
    });
  }

  function removeColumn(ci) {
    setData(prev => ({ ...prev, columns: prev.columns.filter((_, i) => i !== ci) }));
  }

  function addColumn() {
    setData(prev => ({ ...prev, columns: [...prev.columns, emptyColumn()] }));
  }

  // ── link helpers ──────────────────────────────────────────────────────────

  function updateLink(ci, li, patch) {
    setData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        return {
          ...col,
          links: col.links.map((link, j) => j === li ? { ...link, ...patch } : link),
        };
      }),
    }));
  }

  function moveLinkUp(ci, li) {
    if (li === 0) return;
    setData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        const links = [...col.links];
        [links[li - 1], links[li]] = [links[li], links[li - 1]];
        return { ...col, links };
      }),
    }));
  }

  function moveLinkDown(ci, li) {
    setData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        if (li >= col.links.length - 1) return col;
        const links = [...col.links];
        [links[li], links[li + 1]] = [links[li + 1], links[li]];
        return { ...col, links };
      }),
    }));
  }

  function removeLink(ci, li) {
    setData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        return { ...col, links: col.links.filter((_, j) => j !== li) };
      }),
    }));
  }

  function addLink(ci) {
    setData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        return { ...col, links: [...col.links, emptyLink()] };
      }),
    }));
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
          Footer
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
        Manage footer link columns and bottom-bar text. Use the arrows to reorder columns and links. Changes deploy on Save.
      </p>

      {/* ── Link columns ────────────────────────────────────────────── */}
      <SectionHeader>Link columns</SectionHeader>

      {data.columns.length === 0 && (
        <EmptyPlaceholder>No columns yet. Click "+ Add column" to get started.</EmptyPlaceholder>
      )}

      {data.columns.map((col, ci) => (
        <ColumnCard
          key={col.id}
          col={col}
          colIndex={ci}
          totalCols={data.columns.length}
          onUpdateCol={patch => updateColumn(ci, patch)}
          onMoveColUp={() => moveColumnUp(ci)}
          onMoveColDown={() => moveColumnDown(ci)}
          onRemoveCol={() => {
            if (window.confirm(`Delete column "${col.title || col.id}"? This will also remove all its links.`)) {
              removeColumn(ci);
            }
          }}
          onUpdateLink={(li, patch) => updateLink(ci, li, patch)}
          onMoveLinkUp={li => moveLinkUp(ci, li)}
          onMoveLinkDown={li => moveLinkDown(ci, li)}
          onRemoveLink={li => removeLink(ci, li)}
          onAddLink={() => addLink(ci)}
        />
      ))}

      <button onClick={addColumn} style={{
        ...btnStyle, fontSize: "0.82rem", marginBottom: "2.5rem",
        display: "inline-flex", alignItems: "center", gap: "0.4em",
      }}>
        + Add column
      </button>

      {/* ── Bottom-bar fields ──────────────────────────────────────── */}
      <SectionHeader>Bottom bar</SectionHeader>

      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.25rem", marginBottom: "2.5rem" }}>
        <label style={labelStyle}>
          Copyright text
          <input
            type="text"
            value={data.copyright}
            onChange={e => patchField("copyright", e.target.value)}
            placeholder="Turnpage Digital Markets LLC © 2026 · All rights reserved"
            style={{ ...inputStyle, marginTop: "0.3rem" }}
          />
        </label>

        <label style={{ ...labelStyle, marginTop: "1rem" }}>
          Contact email (shown in bottom bar)
          <input
            type="email"
            value={data.contactEmail}
            onChange={e => patchField("contactEmail", e.target.value)}
            placeholder="info@turnpagedigital.com"
            style={{ ...inputStyle, marginTop: "0.3rem" }}
          />
        </label>
      </div>

    </div>
  );
}

/* ── ColumnCard ─────────────────────────────────────────────────────────────── */

function ColumnCard({
  col, colIndex, totalCols,
  onUpdateCol, onMoveColUp, onMoveColDown, onRemoveCol,
  onUpdateLink, onMoveLinkUp, onMoveLinkDown, onRemoveLink, onAddLink,
}) {
  return (
    <div style={{
      border: `1px solid ${LINE}`, background: "#fff",
      marginBottom: "1rem", padding: "1.25rem",
    }}>
      {/* Column header row */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem",
      }}>
        {/* Reorder buttons */}
        <div style={{ display: "flex", gap: "0.25rem", paddingTop: "0.3rem" }}>
          <button type="button" onClick={onMoveColUp} disabled={colIndex === 0}
            title="Move column up" style={iconBtnStyle(colIndex === 0)}>
            &#9650;
          </button>
          <button type="button" onClick={onMoveColDown} disabled={colIndex === totalCols - 1}
            title="Move column down" style={iconBtnStyle(colIndex === totalCols - 1)}>
            &#9660;
          </button>
        </div>

        {/* Column title input */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>
            Column title
            <input
              type="text"
              value={col.title}
              onChange={e => onUpdateCol({ title: e.target.value })}
              placeholder="Column heading"
              style={{
                ...inputStyle,
                marginTop: "0.25rem",
                borderColor: !col.title.trim() ? "#e08080" : undefined,
              }}
            />
            {!col.title.trim() && (
              <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
            )}
          </label>
        </div>

        {/* Delete column */}
        <button type="button" onClick={onRemoveCol} title="Delete column"
          style={{ ...iconBtnStyle(false), color: "#c44", borderColor: "rgba(180,40,40,0.25)", fontSize: "1.1rem", marginTop: "1.6rem" }}>
          &times;
        </button>
      </div>

      {/* Links sub-section */}
      <div style={{
        fontSize: "0.72rem", fontWeight: 700, color: INK_60,
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: "0.5rem",
      }}>
        Links
      </div>

      {col.links.length === 0 && (
        <div style={{
          padding: "1rem", textAlign: "center", fontSize: "0.82rem", color: INK_60,
          border: `1px dashed ${LINE}`, marginBottom: "0.75rem",
        }}>
          No links yet.
        </div>
      )}

      {/* Link column header */}
      {col.links.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "64px 1fr 1fr 52px",
          gap: "0.5rem", alignItems: "center",
          padding: "0 0.5rem 0.35rem",
          fontSize: "0.72rem", fontWeight: 700, color: INK_60,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          <span>Order</span>
          <span>Label</span>
          <span>Href</span>
          <span />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.75rem" }}>
        {col.links.map((link, li) => (
          <LinkRow
            key={link.id}
            link={link}
            linkIndex={li}
            totalLinks={col.links.length}
            onUpdate={patch => onUpdateLink(li, patch)}
            onMoveUp={() => onMoveLinkUp(li)}
            onMoveDown={() => onMoveLinkDown(li)}
            onRemove={() => {
              if (window.confirm(`Remove link "${link.label || link.id}"?`)) onRemoveLink(li);
            }}
          />
        ))}
      </div>

      <button onClick={onAddLink} style={{
        ...btnStyle, fontSize: "0.78rem",
        display: "inline-flex", alignItems: "center", gap: "0.35em",
      }}>
        + Add link
      </button>
    </div>
  );
}

/* ── LinkRow ────────────────────────────────────────────────────────────────── */

function LinkRow({ link, linkIndex, totalLinks, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const labelEmpty = !link.label.trim();
  const hrefEmpty  = !link.href.trim();

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "64px 1fr 1fr 52px",
      gap: "0.5rem", alignItems: "center",
      background: "#F8F8F9", border: `1px solid ${LINE}`,
      padding: "0.4rem 0.5rem",
    }}>
      {/* Up/down */}
      <div style={{ display: "flex", gap: "0.25rem" }}>
        <button type="button" onClick={onMoveUp} disabled={linkIndex === 0}
          title="Move up" style={iconBtnStyle(linkIndex === 0)}>
          &#9650;
        </button>
        <button type="button" onClick={onMoveDown} disabled={linkIndex === totalLinks - 1}
          title="Move down" style={iconBtnStyle(linkIndex === totalLinks - 1)}>
          &#9660;
        </button>
      </div>

      {/* Label */}
      <div>
        <input
          type="text"
          value={link.label}
          onChange={e => onUpdate({ label: e.target.value })}
          placeholder="Link label"
          style={{ ...inputStyle, marginTop: 0, borderColor: labelEmpty ? "#e08080" : undefined }}
        />
        {labelEmpty && (
          <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.15rem 0 0" }}>Required</p>
        )}
      </div>

      {/* Href */}
      <div>
        <input
          type="text"
          value={link.href}
          onChange={e => onUpdate({ href: e.target.value })}
          placeholder="/path or https://…"
          style={{ ...inputStyle, marginTop: 0, borderColor: hrefEmpty ? "#e08080" : undefined }}
        />
        {hrefEmpty && (
          <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.15rem 0 0" }}>Required</p>
        )}
      </div>

      {/* Delete */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button type="button" onClick={onRemove} title="Delete link"
          style={{ ...iconBtnStyle(false), color: "#c44", borderColor: "rgba(180,40,40,0.25)", fontSize: "1.1rem" }}>
          &times;
        </button>
      </div>
    </div>
  );
}

/* ── Small helpers ──────────────────────────────────────────────────────────── */

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
