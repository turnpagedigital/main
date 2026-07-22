import React, { useState, useEffect } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage, ErrorBanner, labelStyle } from "./shared.jsx";
import { useTabData } from "./useTabData.js";

/* ═══════════════════════════════════════════════════════════════════════════
   MarketingPagesTab — edit the AI Copyright Damages chart data
   (src/data/ai-copyright-content.json → damagesData).

   Embedded by SectionEditorModal when editing a "damages" section (the
   Active Docket chart on the AI Copyright page renders damagesData from
   this file). Fetches via GET /api/admin/marketing-pages, saves via PUT.

   Historical note: this tab once also edited crypto-content.json and
   litigation-finance-content.json, but those pages render entirely from
   page-compositions.json — the files were written and never read, so the
   editors were removed (June 2026).

   UI pattern: card-per-item with header row. AudienceCards use a
   PRIORITY/STANDARD pill toggle instead of a checkbox.

   Self-contained — owns its own fetch/save lifecycle.
   Reports dirty state via onDirtyChange?.(dirty).
═══════════════════════════════════════════════════════════════════════════ */

const PAGE_TABS = [
  { key: "aiCopyright", label: "AI Copyright" },
];

/* ── ID generators ──────────────────────────────────────────────────────── */

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyDamage() {
  return { id: uid("dmg"), name: "", amountB: 0, label: "", type: "statutory", badge: "", basis: "", source: "" };
}

/* ── Normalize ──────────────────────────────────────────────────────────── */

function normalize(data) {
  const aiCopyright = data?.aiCopyright || {};
  return {
    aiCopyright: {
      damagesData: Array.isArray(aiCopyright.damagesData) ? aiCopyright.damagesData : [],
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════════ */

export default function MarketingPagesTab({ onDirtyChange, controlledPage }) {
  const {
    data, setData,
    phase, error, dirty, lastSavedAt, load, save,
  } = useTabData({
    endpoint: "/api/admin/marketing-pages",
    parse: body => normalize(body.data),
    serialize: data => data,
    onDirtyChange,
  });
  const [activePage, setActivePage] = useState(controlledPage || "aiCopyright");

  // Sync activePage when controlled externally
  useEffect(() => {
    if (controlledPage) setActivePage(controlledPage);
  }, [controlledPage]);

  if (phase === "loading") return <CenteredMessage>Loading marketing page content…</CenteredMessage>;
  if (phase === "error" && data === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (data === null) return null;

  const isSaving = phase === "saving";

  /* ── Generic array helpers ─────────────────────────────────────────────── */

  function _setPageKey(page, key, value) {
    setData(prev => ({ ...prev, [page]: { ...prev[page], [key]: value } }));
  }

  function updateItem(page, key, idx, patch) {
    setData(prev => {
      const arr = [...prev[page][key]];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [page]: { ...prev[page], [key]: arr } };
    });
  }

  function moveItem(page, key, idx, dir) {
    setData(prev => {
      const arr = [...prev[page][key]];
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...prev, [page]: { ...prev[page], [key]: arr } };
    });
  }

  function removeItem(page, key, idx) {
    setData(prev => {
      const arr = prev[page][key].filter((_, i) => i !== idx);
      return { ...prev, [page]: { ...prev[page], [key]: arr } };
    });
  }

  function addItem(page, key, emptyFn) {
    setData(prev => ({
      ...prev,
      [page]: { ...prev[page], [key]: [...prev[page][key], emptyFn()] },
    }));
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

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
          {PAGE_TABS.find(t => t.key === activePage)?.label ?? "Marketing Pages"}
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

      <ErrorBanner>{error}</ErrorBanner>

      {/* Inner page tab strip — hidden when controlled externally */}
      {!controlledPage && (
        <div style={{
          display: "flex", gap: 0, borderBottom: `1px solid ${LINE}`,
          marginBottom: "2rem",
        }}>
          {PAGE_TABS.map(({ key, label }) => {
            const active = activePage === key;
            return (
              <button
                key={key}
                onClick={() => setActivePage(key)}
                style={{
                  fontFamily: FONT, fontSize: "0.88rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? INK : INK_60,
                  background: "transparent", border: "none",
                  borderBottom: active ? `2px solid ${INK}` : "2px solid transparent",
                  padding: "0.6rem 1.2rem 0.6rem 0",
                  marginRight: "1.4rem",
                  cursor: "pointer",
                  marginBottom: "-1px",
                  transition: "color 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Page sections */}
      {activePage === "aiCopyright" && (
        <CopyrightSection
          page="aiCopyright"
          d={data.aiCopyright}
          updateItem={updateItem}
          moveItem={moveItem}
          removeItem={removeItem}
          addItem={addItem}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Page sections
══════════════════════════════════════════════════════════════════════════ */

function CopyrightSection({ page, d, updateItem, moveItem, removeItem, addItem }) {
  return (
    <>
      <SectionHeader>Damages Data (Active Docket Chart)</SectionHeader>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Cases shown in the animated bar chart. amountB is the dollar amount in billions (e.g. 1.5 for $1.5B).
        Type: "settled" (neon bar), "statutory" (white bar), "dmca" (grey bar).
      </p>
      <CardList
        items={d.damagesData}
        page={page}
        sectionKey="damagesData"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "damagesData", emptyDamage)}
        renderRow={(c, i, total) => (
          <DamagesRow
            key={c.id} item={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "damagesData", i, patch)}
            onMoveUp={() => moveItem(page, "damagesData", i, -1)}
            onMoveDown={() => moveItem(page, "damagesData", i, 1)}
            onRemove={() => { if (window.confirm(`Remove "${c.name || c.id}"?`)) removeItem(page, "damagesData", i); }}
          />
        )}
        addLabel="+ Add case"
      />
    </>
  );
}

function CardList({ items, renderRow, addItem, addLabel }) {
  return (
    <>
      {items.length === 0 && (
        <EmptyPlaceholder>No items yet. Click "{addLabel.replace("+ ", "")}" to get started.</EmptyPlaceholder>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1rem" }}>
        {items.map((item, i) => renderRow(item, i, items.length))}
      </div>
      <button onClick={addItem} style={{
        ...btnStyle,
        background: "transparent", border: `1px dashed ${LINE}`,
        color: INK, padding: "0.75rem 1rem", fontWeight: 700, width: "100%",
        fontSize: "0.82rem", marginBottom: "2.5rem",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4em",
      }}>
        {addLabel}
      </button>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Row components — card-per-item pattern with header row
══════════════════════════════════════════════════════════════════════════ */

function DamagesRow({ item, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const nameEmpty = !String(item.name || "").trim();
  const summary   = item.name ? `"${item.name.slice(0, 60)}${item.name.length > 60 ? "…" : ""}"` : null;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${LINE}`,
    }}>
      {/* Card header row */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.7rem 1rem",
        borderBottom: `1px solid ${LINE}`,
        flexWrap: "wrap",
      }}>
        {/* Summary text */}
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontStyle: "italic", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {summary || <em>No case name set</em>}
        </div>

        {/* Action buttons */}
        <button onClick={onMoveUp}   disabled={index === 0}         style={iconBtnStyle(index === 0)}         aria-label="Move up" title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} aria-label="Move down" title="Move down">↓</button>
        <button onClick={onRemove}   style={{ ...iconBtnStyle(false), color: "#c44" }}                        aria-label="Delete" title="Delete">×</button>
      </div>

      {/* Card body */}
      <div style={{ padding: "0.95rem 1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <label style={labelStyle}>
            Case Name
            <input
              type="text" value={item.name || ""}
              onChange={e => onUpdate({ name: e.target.value })}
              placeholder="e.g. Bartz v. Anthropic PBC"
              style={{ ...inputStyle, marginTop: "0.25rem", borderColor: nameEmpty ? "#e08080" : undefined }}
            />
            {nameEmpty && <p style={reqStyle}>Required</p>}
          </label>
          <label style={labelStyle}>
            Amount (B)
            <input
              type="number" step="0.1" value={item.amountB ?? ""}
              onChange={e => onUpdate({ amountB: parseFloat(e.target.value) || 0 })}
              placeholder="1.5"
              style={{ ...inputStyle, marginTop: "0.25rem" }}
            />
          </label>
          <label style={labelStyle}>
            Label
            <input
              type="text" value={item.label || ""}
              onChange={e => onUpdate({ label: e.target.value })}
              placeholder="$1.5B"
              style={{ ...inputStyle, marginTop: "0.25rem" }}
            />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <label style={labelStyle}>
            Type
            <select value={item.type || "statutory"} onChange={e => onUpdate({ type: e.target.value })} style={{ ...selectStyle, marginTop: "0.25rem" }}>
              <option value="settled">settled</option>
              <option value="statutory">statutory</option>
              <option value="dmca">dmca</option>
            </select>
          </label>
          <label style={{ ...labelStyle, gridColumn: "2 / -1" }}>
            Badge Label
            <input
              type="text" value={item.badge || ""}
              onChange={e => onUpdate({ badge: e.target.value })}
              placeholder="e.g. Settled"
              style={{ ...inputStyle, marginTop: "0.25rem" }}
            />
          </label>
        </div>
        <label style={{ ...labelStyle, display: "block", marginBottom: "0.75rem" }}>
          Basis (footnote below bar)
          <input
            type="text" value={item.basis || ""}
            onChange={e => onUpdate({ basis: e.target.value })}
            placeholder="Works count × amount…"
            style={{ ...inputStyle, marginTop: "0.25rem" }}
          />
        </label>
        <label style={{ ...labelStyle, display: "block" }}>
          Source (italic citation)
          <input
            type="text" value={item.source || ""}
            onChange={e => onUpdate({ source: e.target.value })}
            placeholder="e.g. N.D. Cal. No. …"
            style={{ ...inputStyle, marginTop: "0.25rem" }}
          />
        </label>
      </div>
    </div>
  );
}

const reqStyle = { color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" };

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
