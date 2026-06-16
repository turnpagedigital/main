import React from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";
import { useTabData } from "./useTabData.js";

/* ═══════════════════════════════════════════════════════════════════════════
   StructureFooterTab — Footer Link Columns + Footer Bottom Bar

   Extracted from SiteStructureTab. Manages footer.json via /api/admin/footer.
   Self-contained: own state, own load/save, own dirty tracking.
═══════════════════════════════════════════════════════════════════════════ */

// ── Normalizer ─────────────────────────────────────────────────────────
function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeFooter(data) {
  // Backfill missing ids — the server requires them on every column and
  // link, and rejects the whole save otherwise.
  const columns = (Array.isArray(data?.columns) ? data.columns : []).map(col => ({
    ...col,
    id: (typeof col.id === "string" && col.id.trim()) ? col.id : uid("col"),
    links: (Array.isArray(col.links) ? col.links : []).map(link => ({
      ...link,
      id: (typeof link.id === "string" && link.id.trim()) ? link.id : uid("link"),
    })),
  }));
  return {
    columns,
    copyright:    typeof data?.copyright === "string"    ? data.copyright    : "",
    copyrightKey: typeof data?.copyrightKey === "string" ? data.copyrightKey : undefined,
    contactEmail: typeof data?.contactEmail === "string" ? data.contactEmail : "",
  };
}

// ── Empty item factories ────────────────────────────────────────────────
function emptyColumn() {
  return { id: uid("col"), title: "", links: [] };
}

function emptyLink() {
  return { id: uid("link"), label: "", href: "/" };
}

// ── Shared helpers ─────────────────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600,
};

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

// ── Sub-components ─────────────────────────────────────────────────────
function ColumnCard({
  col, colIndex, totalCols,
  onUpdateCol, onMoveColUp, onMoveColDown, onRemoveCol,
  onUpdateLink, onMoveLinkUp, onMoveLinkDown, onRemoveLink, onAddLink,
}) {
  const titleEmpty = !col.title.trim();
  const colHidden = col.hidden === true;
  const colSummary = col.title || <em>Untitled column</em>;

  return (
    <div style={{
      border: `1px solid ${LINE}`,
      background: colHidden ? "#F9FAFB" : "#fff",
      opacity: colHidden ? 0.65 : 1,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.7rem 1rem",
        borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontStyle: "italic", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {colSummary}
          {colHidden && <span style={{ marginLeft: "0.5em", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF", fontStyle: "normal" }}>Hidden</span>}
        </div>

        <button type="button" onClick={() => onUpdateCol({ hidden: !colHidden })}
          title={colHidden ? "Show column" : "Hide column"}
          style={{ ...iconBtnStyle(false), fontSize: "0.68rem", padding: "0.15rem 0.4rem", color: colHidden ? "#2563EB" : INK_60 }}>
          {colHidden ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={onMoveColUp} disabled={colIndex === 0}
          title="Move column up" style={iconBtnStyle(colIndex === 0)}>↑</button>
        <button type="button" onClick={onMoveColDown} disabled={colIndex === totalCols - 1}
          title="Move column down" style={iconBtnStyle(colIndex === totalCols - 1)}>↓</button>
        <button type="button" onClick={onRemoveCol} title="Delete column"
          style={{ ...iconBtnStyle(false), color: "#c44" }}>×</button>
      </div>

      <div style={{ padding: "0.95rem 1rem" }}>
        <label style={labelStyle}>
          Column title
          <input
            type="text"
            value={col.title}
            onChange={e => onUpdateCol({ title: e.target.value })}
            placeholder="Column heading"
            style={{
              ...inputStyle,
              marginTop: "0.3rem",
              borderColor: titleEmpty ? "#e08080" : undefined,
            }}
          />
          {titleEmpty && (
            <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
          )}
        </label>

        <div style={{
          fontSize: "0.72rem", fontWeight: 700, color: INK_60,
          letterSpacing: "0.08em", textTransform: "uppercase",
          marginTop: "1rem", marginBottom: "0.5rem",
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

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
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
    </div>
  );
}

function LinkRow({ link, linkIndex, totalLinks, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const labelEmpty = !link.label.trim();
  const hrefEmpty  = !link.href.trim();
  const hidden = link.hidden === true;
  const linkSummary = link.label || <em>No label</em>;

  return (
    <div style={{
      background: hidden ? "#F9FAFB" : "#fff",
      border: `1px solid ${LINE}`,
      opacity: hidden ? 0.65 : 1,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem",
        padding: "0.5rem 0.75rem",
        borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ flex: 1, fontSize: "0.82rem", color: INK_60, fontStyle: "italic", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {linkSummary}
          {hidden && <span style={{ marginLeft: "0.5em", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF", fontStyle: "normal" }}>Hidden</span>}
        </div>

        <button type="button" onClick={() => onUpdate({ hidden: !hidden })}
          title={hidden ? "Show link" : "Hide link"}
          style={{ ...iconBtnStyle(false), fontSize: "0.68rem", padding: "0.15rem 0.4rem", color: hidden ? "#2563EB" : INK_60 }}>
          {hidden ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={onMoveUp} disabled={linkIndex === 0}
          aria-label="Move up" title="Move up" style={iconBtnStyle(linkIndex === 0)}>↑</button>
        <button type="button" onClick={onMoveDown} disabled={linkIndex === totalLinks - 1}
          aria-label="Move down" title="Move down" style={iconBtnStyle(linkIndex === totalLinks - 1)}>↓</button>
        <button type="button" onClick={onRemove} title="Delete link"
          style={{ ...iconBtnStyle(false), color: "#c44" }}>×</button>
      </div>

      <div style={{ padding: "0.65rem 0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 0.75rem" }} className="link-grid">
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: INK_60, fontWeight: 600 }}>
            Label
            <input
              type="text"
              value={link.label}
              onChange={e => onUpdate({ label: e.target.value })}
              placeholder="Link label"
              style={{ ...inputStyle, marginTop: "0.2rem", borderColor: labelEmpty ? "#e08080" : undefined }}
            />
            {labelEmpty && (
              <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.15rem 0 0" }}>Required</p>
            )}
          </label>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: INK_60, fontWeight: 600 }}>
            Href
            <input
              type="text"
              value={link.href}
              onChange={e => onUpdate({ href: e.target.value })}
              placeholder="/path or https://..."
              style={{ ...inputStyle, marginTop: "0.2rem", borderColor: hrefEmpty ? "#e08080" : undefined }}
            />
            {hrefEmpty && (
              <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.15rem 0 0" }}>Required</p>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function StructureFooterTab({ onDirtyChange }) {
  // ── State ────────────────────────────────────────────────────────────
  const {
    data: footer, setData: setFooter,
    phase, error, dirty, lastSavedAt, load, save,
  } = useTabData({
    endpoint: "/api/admin/footer",
    parse: body => normalizeFooter(body.data),
    serialize: footer => footer,
    onDirtyChange,
  });

  // ── Early returns ────────────────────────────────────────────────────
  if (phase === "loading") return <CenteredMessage>Loading footer...</CenteredMessage>;
  if (phase === "error" && footer === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!footer) return null;

  const isSaving = phase === "saving";

  // ── Footer helpers ───────────────────────────────────────────────────
  function patchFooterField(key, value) {
    setFooter(prev => ({ ...prev, [key]: value }));
  }

  function updateColumn(ci, patch) {
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => i === ci ? { ...col, ...patch } : col),
    }));
  }

  function moveColumnUp(ci) {
    if (ci === 0) return;
    setFooter(prev => {
      const next = [...prev.columns];
      [next[ci - 1], next[ci]] = [next[ci], next[ci - 1]];
      return { ...prev, columns: next };
    });
  }

  function moveColumnDown(ci) {
    setFooter(prev => {
      if (ci >= prev.columns.length - 1) return prev;
      const next = [...prev.columns];
      [next[ci], next[ci + 1]] = [next[ci + 1], next[ci]];
      return { ...prev, columns: next };
    });
  }

  function removeColumn(ci) {
    setFooter(prev => ({ ...prev, columns: prev.columns.filter((_, i) => i !== ci) }));
  }

  function addColumn() {
    setFooter(prev => ({ ...prev, columns: [...prev.columns, emptyColumn()] }));
  }

  function updateLink(ci, li, patch) {
    setFooter(prev => ({
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
    setFooter(prev => ({
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
    setFooter(prev => ({
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
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        return { ...col, links: col.links.filter((_, j) => j !== li) };
      }),
    }));
  }

  function addLink(ci) {
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        return { ...col, links: [...col.links, emptyLink()] };
      }),
    }));
  }

  // ── Render ───────────────────────────────────────────────────────────
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
          {isSaving && "Saving..."}
          {!isSaving && dirty && "Unsaved changes — click Save to commit"}
          {!isSaving && !dirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty && !lastSavedAt && "Up to date"}
        </div>
        <button onClick={save} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor: (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      {/* Footer Link Columns */}
      <SectionHeader>Footer Link Columns</SectionHeader>

      {footer.columns.length === 0 && (
        <EmptyPlaceholder>No columns yet. Click "+ Add column" to get started.</EmptyPlaceholder>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.5rem" }}>
        {footer.columns.map((col, ci) => (
          <ColumnCard
            key={col.id}
            col={col}
            colIndex={ci}
            totalCols={footer.columns.length}
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
      </div>

      <button onClick={addColumn} style={{
        ...btnStyle,
        background: "transparent", border: `1px dashed ${LINE}`,
        color: INK, padding: "0.75rem 1rem", fontWeight: 700, width: "100%",
        fontSize: "0.82rem", marginBottom: "2rem",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4em",
      }}>
        + Add column
      </button>

      {/* Footer Bottom Bar */}
      <SectionHeader style={{ marginTop: "2rem" }}>Footer Bottom Bar</SectionHeader>

      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
        <label style={labelStyle}>
          Copyright text
          <input
            type="text"
            value={footer.copyright}
            onChange={e => patchFooterField("copyright", e.target.value)}
            placeholder="Turnpage Digital Markets LLC © 2026 · All rights reserved"
            style={{ ...inputStyle, marginTop: "0.3rem" }}
          />
        </label>

        <label style={{ ...labelStyle, marginTop: "1rem" }}>
          Contact email (shown in bottom bar)
          <input
            type="email"
            value={footer.contactEmail}
            onChange={e => patchFooterField("contactEmail", e.target.value)}
            placeholder="info@turnpagedigital.com"
            style={{ ...inputStyle, marginTop: "0.3rem" }}
          />
        </label>
      </div>
    </div>
  );
}
