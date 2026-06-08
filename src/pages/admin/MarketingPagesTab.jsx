import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   MarketingPagesTab — manage content arrays for Crypto, AI Copyright, and
   Litigation Finance marketing pages.

   Fetches all three from GET /api/admin/marketing-pages (reads the three
   src/data/*-content.json files via GitHub), saves via PUT.

   Inner tab strip: Crypto | AI Copyright | Litigation Finance
   Each page shows its content sections — audience cards, service cards,
   damages data (AI Copyright only), how-it-works steps (Lit Finance only),
   FAQs (Lit Finance only), comparison (Crypto + Lit Finance).

   UI pattern: card-per-item with header row. AudienceCards use a
   PRIORITY/STANDARD pill toggle instead of a checkbox.

   Self-contained — owns its own fetch/save lifecycle.
   Reports dirty state via onDirtyChange?.(dirty).
═══════════════════════════════════════════════════════════════════════════ */

const PAGE_TABS = [
  { key: "crypto",            label: "Crypto" },
  { key: "aiCopyright",       label: "AI Copyright" },
  { key: "litigationFinance", label: "Litigation Funding" },
];

/* ── ID generators ──────────────────────────────────────────────────────── */

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyAudienceCard() {
  return { id: uid("aud"), title: "", body: "", priority: false };
}

function emptyServiceCard() {
  return { id: uid("svc"), title: "", body: "" };
}

function emptyDamage() {
  return { id: uid("dmg"), name: "", amountB: 0, label: "", type: "statutory", badge: "", basis: "", source: "" };
}

function emptyStep() {
  return { id: uid("step"), n: "", title: "", body: "" };
}

function emptyFAQ() {
  return { id: uid("faq"), q: "", a: "" };
}

function emptyComparisonItem() {
  return "";
}

/* ── Normalize ──────────────────────────────────────────────────────────── */

function normalize(data) {
  const crypto = data?.crypto || {};
  const aiCopyright = data?.aiCopyright || {};
  const litFin = data?.litigationFinance || {};
  return {
    crypto: {
      audienceCards: Array.isArray(crypto.audienceCards) ? crypto.audienceCards : [],
      serviceCards:  Array.isArray(crypto.serviceCards)  ? crypto.serviceCards  : [],
      comparison:    crypto.comparison || { oldWay: { title: "", items: [] }, newWay: { title: "", items: [] } },
    },
    aiCopyright: {
      audienceCards: Array.isArray(aiCopyright.audienceCards) ? aiCopyright.audienceCards : [],
      serviceCards:  Array.isArray(aiCopyright.serviceCards)  ? aiCopyright.serviceCards  : [],
      damagesData:   Array.isArray(aiCopyright.damagesData)   ? aiCopyright.damagesData   : [],
    },
    litigationFinance: {
      audienceCards: Array.isArray(litFin.audienceCards) ? litFin.audienceCards : [],
      serviceCards:  Array.isArray(litFin.serviceCards)  ? litFin.serviceCards  : [],
      howItWorks:    Array.isArray(litFin.howItWorks)    ? litFin.howItWorks    : [],
      faqs:          Array.isArray(litFin.faqs)          ? litFin.faqs          : [],
      comparison:    litFin.comparison || { oldWay: { title: "", items: [] }, newWay: { title: "", items: [] } },
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════════ */

export default function MarketingPagesTab({ onDirtyChange, controlledPage }) {
  const [data,     setData]     = useState(null);
  const [original, setOriginal] = useState(null);
  const [phase,    setPhase]    = useState("loading");
  const [error,    setError]    = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [activePage, setActivePage] = useState(controlledPage || "crypto");

  const dirty = useMemo(() => {
    if (!data || !original) return false;
    return JSON.stringify(data) !== JSON.stringify(original);
  }, [data, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { load(); }, []);

  // Sync activePage when controlled externally
  useEffect(() => {
    if (controlledPage) setActivePage(controlledPage);
  }, [controlledPage]);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/marketing-pages", { credentials: "include" });
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
      const r = await fetch("/api/admin/marketing-pages", {
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

  function setPageKey(page, key, value) {
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

  /* ── Comparison helpers ─────────────────────────────────────────────────── */

  function updateComparison(page, side, field, value) {
    setData(prev => ({
      ...prev,
      [page]: {
        ...prev[page],
        comparison: {
          ...prev[page].comparison,
          [side]: { ...prev[page].comparison[side], [field]: value },
        },
      },
    }));
  }

  function updateComparisonItem(page, side, idx, value) {
    setData(prev => {
      const items = [...prev[page].comparison[side].items];
      items[idx] = value;
      return {
        ...prev,
        [page]: {
          ...prev[page],
          comparison: {
            ...prev[page].comparison,
            [side]: { ...prev[page].comparison[side], items },
          },
        },
      };
    });
  }

  function addComparisonItem(page, side) {
    setData(prev => {
      const items = [...prev[page].comparison[side].items, emptyComparisonItem()];
      return {
        ...prev,
        [page]: {
          ...prev[page],
          comparison: {
            ...prev[page].comparison,
            [side]: { ...prev[page].comparison[side], items },
          },
        },
      };
    });
  }

  function removeComparisonItem(page, side, idx) {
    setData(prev => {
      const items = prev[page].comparison[side].items.filter((_, i) => i !== idx);
      return {
        ...prev,
        [page]: {
          ...prev[page],
          comparison: {
            ...prev[page].comparison,
            [side]: { ...prev[page].comparison[side], items },
          },
        },
      };
    });
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

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

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
      {activePage === "crypto" && (
        <CryptoSection
          page="crypto"
          d={data.crypto}
          updateItem={updateItem}
          moveItem={moveItem}
          removeItem={removeItem}
          addItem={addItem}
          updateComparison={updateComparison}
          updateComparisonItem={updateComparisonItem}
          addComparisonItem={addComparisonItem}
          removeComparisonItem={removeComparisonItem}
        />
      )}
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
      {activePage === "litigationFinance" && (
        <LitFinSection
          page="litigationFinance"
          d={data.litigationFinance}
          updateItem={updateItem}
          moveItem={moveItem}
          removeItem={removeItem}
          addItem={addItem}
          updateComparison={updateComparison}
          updateComparisonItem={updateComparisonItem}
          addComparisonItem={addComparisonItem}
          removeComparisonItem={removeComparisonItem}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Page sections
══════════════════════════════════════════════════════════════════════════ */

function CryptoSection({ page, d, updateItem, moveItem, removeItem, addItem, updateComparison, updateComparisonItem, addComparisonItem, removeComparisonItem }) {
  return (
    <>
      <SectionHeader>Audience Cards (Who We Help)</SectionHeader>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Cards shown in the "Who We Help" section. Items with the <em>PRIORITY</em> pill active render with dark background.
      </p>
      <CardList
        items={d.audienceCards}
        page={page}
        sectionKey="audienceCards"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "audienceCards", emptyAudienceCard)}
        renderRow={(c, i, total) => (
          <AudienceCardRow
            key={c.id} card={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "audienceCards", i, patch)}
            onMoveUp={() => moveItem(page, "audienceCards", i, -1)}
            onMoveDown={() => moveItem(page, "audienceCards", i, 1)}
            onRemove={() => { if (window.confirm(`Remove card "${c.title || c.id}"?`)) removeItem(page, "audienceCards", i); }}
          />
        )}
        addLabel="+ Add audience card"
      />

      <SectionHeader>Service Cards (What We Offer)</SectionHeader>
      <CardList
        items={d.serviceCards}
        page={page}
        sectionKey="serviceCards"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "serviceCards", emptyServiceCard)}
        renderRow={(c, i, total) => (
          <ServiceCardRow
            key={c.id} card={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "serviceCards", i, patch)}
            onMoveUp={() => moveItem(page, "serviceCards", i, -1)}
            onMoveDown={() => moveItem(page, "serviceCards", i, 1)}
            onRemove={() => { if (window.confirm(`Remove card "${c.title || c.id}"?`)) removeItem(page, "serviceCards", i); }}
          />
        )}
        addLabel="+ Add service card"
      />

      <SectionHeader>Comparison (Old Way / New Way)</SectionHeader>
      <ComparisonEditor
        cmp={d.comparison}
        page={page}
        updateComparison={updateComparison}
        updateComparisonItem={updateComparisonItem}
        addComparisonItem={addComparisonItem}
        removeComparisonItem={removeComparisonItem}
      />
    </>
  );
}

function CopyrightSection({ page, d, updateItem, moveItem, removeItem, addItem }) {
  return (
    <>
      <SectionHeader>Audience Cards (Who We Help)</SectionHeader>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Cards shown in the "Who We Help" section. Items with the <em>PRIORITY</em> pill active render with dark background.
      </p>
      <CardList
        items={d.audienceCards}
        page={page}
        sectionKey="audienceCards"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "audienceCards", emptyAudienceCard)}
        renderRow={(c, i, total) => (
          <AudienceCardRow
            key={c.id} card={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "audienceCards", i, patch)}
            onMoveUp={() => moveItem(page, "audienceCards", i, -1)}
            onMoveDown={() => moveItem(page, "audienceCards", i, 1)}
            onRemove={() => { if (window.confirm(`Remove card "${c.title || c.id}"?`)) removeItem(page, "audienceCards", i); }}
          />
        )}
        addLabel="+ Add audience card"
      />

      <SectionHeader>Service Cards (What We Offer)</SectionHeader>
      <CardList
        items={d.serviceCards}
        page={page}
        sectionKey="serviceCards"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "serviceCards", emptyServiceCard)}
        renderRow={(c, i, total) => (
          <ServiceCardRow
            key={c.id} card={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "serviceCards", i, patch)}
            onMoveUp={() => moveItem(page, "serviceCards", i, -1)}
            onMoveDown={() => moveItem(page, "serviceCards", i, 1)}
            onRemove={() => { if (window.confirm(`Remove card "${c.title || c.id}"?`)) removeItem(page, "serviceCards", i); }}
          />
        )}
        addLabel="+ Add service card"
      />

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

function LitFinSection({ page, d, updateItem, moveItem, removeItem, addItem, updateComparison, updateComparisonItem, addComparisonItem, removeComparisonItem }) {
  return (
    <>
      <SectionHeader>Audience Cards (Who We Help)</SectionHeader>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Cards shown in the "Who We Help" section. Items with the <em>PRIORITY</em> pill active render with dark background.
      </p>
      <CardList
        items={d.audienceCards}
        page={page}
        sectionKey="audienceCards"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "audienceCards", emptyAudienceCard)}
        renderRow={(c, i, total) => (
          <AudienceCardRow
            key={c.id} card={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "audienceCards", i, patch)}
            onMoveUp={() => moveItem(page, "audienceCards", i, -1)}
            onMoveDown={() => moveItem(page, "audienceCards", i, 1)}
            onRemove={() => { if (window.confirm(`Remove card "${c.title || c.id}"?`)) removeItem(page, "audienceCards", i); }}
          />
        )}
        addLabel="+ Add audience card"
      />

      <SectionHeader>Service Cards (What We Fund)</SectionHeader>
      <CardList
        items={d.serviceCards}
        page={page}
        sectionKey="serviceCards"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "serviceCards", emptyServiceCard)}
        renderRow={(c, i, total) => (
          <ServiceCardRow
            key={c.id} card={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "serviceCards", i, patch)}
            onMoveUp={() => moveItem(page, "serviceCards", i, -1)}
            onMoveDown={() => moveItem(page, "serviceCards", i, 1)}
            onRemove={() => { if (window.confirm(`Remove card "${c.title || c.id}"?`)) removeItem(page, "serviceCards", i); }}
          />
        )}
        addLabel="+ Add service card"
      />

      <SectionHeader>How It Works (3 Steps)</SectionHeader>
      <CardList
        items={d.howItWorks}
        page={page}
        sectionKey="howItWorks"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "howItWorks", emptyStep)}
        renderRow={(c, i, total) => (
          <StepRow
            key={c.id} step={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "howItWorks", i, patch)}
            onMoveUp={() => moveItem(page, "howItWorks", i, -1)}
            onMoveDown={() => moveItem(page, "howItWorks", i, 1)}
            onRemove={() => { if (window.confirm(`Remove step "${c.title || c.id}"?`)) removeItem(page, "howItWorks", i); }}
          />
        )}
        addLabel="+ Add step"
      />

      <SectionHeader>FAQs</SectionHeader>
      <CardList
        items={d.faqs}
        page={page}
        sectionKey="faqs"
        updateItem={updateItem}
        moveItem={moveItem}
        removeItem={removeItem}
        addItem={() => addItem(page, "faqs", emptyFAQ)}
        renderRow={(c, i, total) => (
          <FAQRow
            key={c.id} faq={c} index={i} total={total}
            onUpdate={patch => updateItem(page, "faqs", i, patch)}
            onMoveUp={() => moveItem(page, "faqs", i, -1)}
            onMoveDown={() => moveItem(page, "faqs", i, 1)}
            onRemove={() => { if (window.confirm(`Remove FAQ "${c.q || c.id}"?`)) removeItem(page, "faqs", i); }}
          />
        )}
        addLabel="+ Add FAQ"
      />

      <SectionHeader>Comparison (Old Way / New Way)</SectionHeader>
      <ComparisonEditor
        cmp={d.comparison}
        page={page}
        updateComparison={updateComparison}
        updateComparisonItem={updateComparisonItem}
        addComparisonItem={addComparisonItem}
        removeComparisonItem={removeComparisonItem}
      />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Reusable list container
══════════════════════════════════════════════════════════════════════════ */

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

function AudienceCardRow({ card, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const titleEmpty = !String(card.title || "").trim();
  const bodyEmpty  = !String(card.body  || "").trim();
  const summary    = card.title ? `"${card.title.slice(0, 60)}${card.title.length > 60 ? "…" : ""}"` : null;

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
        {/* PRIORITY/STANDARD pill toggle */}
        <button
          type="button"
          onClick={() => onUpdate({ priority: !card.priority })}
          style={{
            background: card.priority ? NEON : "#E5E7EB",
            color: card.priority ? "#0A0A0A" : INK_60,
            border: "none", borderRadius: 0,
            padding: "0.25rem 0.65rem",
            fontSize: "0.7rem", fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer", fontFamily: FONT,
            flexShrink: 0,
          }}
        >
          {card.priority ? "PRIORITY" : "STANDARD"}
        </button>

        {/* Summary text */}
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontStyle: "italic", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {summary || <em>No title set</em>}
        </div>

        {/* Action buttons */}
        <button onClick={onMoveUp}   disabled={index === 0}         style={iconBtnStyle(index === 0)}         title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} title="Move down">↓</button>
        <button onClick={onRemove}   style={{ ...iconBtnStyle(false), color: "#c44" }}                        title="Delete">×</button>
      </div>

      {/* Card body */}
      <div style={{ padding: "0.95rem 1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <label style={labelStyle}>
          Title
          <input
            type="text" value={card.title || ""}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Card title"
            style={{ ...inputStyle, marginTop: "0.25rem", borderColor: titleEmpty ? "#e08080" : undefined }}
          />
          {titleEmpty && <p style={reqStyle}>Required</p>}
        </label>

        <label style={{ ...labelStyle, display: "block" }}>
          Body
          <textarea
            value={card.body || ""}
            onChange={e => onUpdate({ body: e.target.value })}
            placeholder="Card body text"
            rows={2}
            style={{ ...inputStyle, marginTop: "0.25rem", resize: "vertical", minHeight: 58, borderColor: bodyEmpty ? "#e08080" : undefined }}
          />
          {bodyEmpty && <p style={reqStyle}>Required</p>}
        </label>
      </div>
    </div>
  );
}

function ServiceCardRow({ card, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const titleEmpty = !String(card.title || "").trim();
  const bodyEmpty  = !String(card.body  || "").trim();
  const summary    = card.title ? `"${card.title.slice(0, 60)}${card.title.length > 60 ? "…" : ""}"` : null;

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
          {summary || <em>No title set</em>}
        </div>

        {/* Action buttons */}
        <button onClick={onMoveUp}   disabled={index === 0}         style={iconBtnStyle(index === 0)}         title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} title="Move down">↓</button>
        <button onClick={onRemove}   style={{ ...iconBtnStyle(false), color: "#c44" }}                        title="Delete">×</button>
      </div>

      {/* Card body */}
      <div style={{ padding: "0.95rem 1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <label style={labelStyle}>
          Title
          <input
            type="text" value={card.title || ""}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Service card title"
            style={{ ...inputStyle, marginTop: "0.25rem", borderColor: titleEmpty ? "#e08080" : undefined }}
          />
          {titleEmpty && <p style={reqStyle}>Required</p>}
        </label>

        <label style={{ ...labelStyle, display: "block" }}>
          Body
          <textarea
            value={card.body || ""}
            onChange={e => onUpdate({ body: e.target.value })}
            placeholder="Description of this service"
            rows={3}
            style={{ ...inputStyle, marginTop: "0.25rem", resize: "vertical", minHeight: 72, borderColor: bodyEmpty ? "#e08080" : undefined }}
          />
          {bodyEmpty && <p style={reqStyle}>Required</p>}
        </label>
      </div>
    </div>
  );
}

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
        <button onClick={onMoveUp}   disabled={index === 0}         style={iconBtnStyle(index === 0)}         title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} title="Move down">↓</button>
        <button onClick={onRemove}   style={{ ...iconBtnStyle(false), color: "#c44" }}                        title="Delete">×</button>
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

function StepRow({ step, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const titleEmpty = !String(step.title || "").trim();
  const bodyEmpty  = !String(step.body  || "").trim();
  const summary    = step.title ? `"${step.title.slice(0, 60)}${step.title.length > 60 ? "…" : ""}"` : null;

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
          {summary || <em>No title set</em>}
        </div>

        {/* Action buttons */}
        <button onClick={onMoveUp}   disabled={index === 0}         style={iconBtnStyle(index === 0)}         title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} title="Move down">↓</button>
        <button onClick={onRemove}   style={{ ...iconBtnStyle(false), color: "#c44" }}                        title="Delete">×</button>
      </div>

      {/* Card body */}
      <div style={{ padding: "0.95rem 1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "0.75rem" }}>
          <label style={labelStyle}>
            No.
            <input
              type="text" value={step.n || ""}
              onChange={e => onUpdate({ n: e.target.value })}
              placeholder="01"
              style={{ ...inputStyle, marginTop: "0.25rem" }}
            />
          </label>
          <label style={labelStyle}>
            Title
            <input
              type="text" value={step.title || ""}
              onChange={e => onUpdate({ title: e.target.value })}
              placeholder="Step title"
              style={{ ...inputStyle, marginTop: "0.25rem", borderColor: titleEmpty ? "#e08080" : undefined }}
            />
            {titleEmpty && <p style={reqStyle}>Required</p>}
          </label>
        </div>
        <label style={{ ...labelStyle, display: "block" }}>
          Body
          <textarea
            value={step.body || ""}
            onChange={e => onUpdate({ body: e.target.value })}
            placeholder="Step description"
            rows={3}
            style={{ ...inputStyle, marginTop: "0.25rem", resize: "vertical", minHeight: 72, borderColor: bodyEmpty ? "#e08080" : undefined }}
          />
          {bodyEmpty && <p style={reqStyle}>Required</p>}
        </label>
      </div>
    </div>
  );
}

function FAQRow({ faq, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const qEmpty = !String(faq.q || "").trim();
  const aEmpty = !String(faq.a || "").trim();
  const summary = faq.q ? `"${faq.q.slice(0, 70)}${faq.q.length > 70 ? "…" : ""}"` : null;

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
          {summary || <em>No question set</em>}
        </div>

        {/* Action buttons */}
        <button onClick={onMoveUp}   disabled={index === 0}         style={iconBtnStyle(index === 0)}         title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} title="Move down">↓</button>
        <button onClick={onRemove}   style={{ ...iconBtnStyle(false), color: "#c44" }}                        title="Delete">×</button>
      </div>

      {/* Card body */}
      <div style={{ padding: "0.95rem 1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <label style={labelStyle}>
          Question
          <input
            type="text" value={faq.q || ""}
            onChange={e => onUpdate({ q: e.target.value })}
            placeholder="FAQ question"
            style={{ ...inputStyle, marginTop: "0.25rem", borderColor: qEmpty ? "#e08080" : undefined }}
          />
          {qEmpty && <p style={reqStyle}>Required</p>}
        </label>

        <label style={{ ...labelStyle, display: "block" }}>
          Answer
          <textarea
            value={faq.a || ""}
            onChange={e => onUpdate({ a: e.target.value })}
            placeholder="FAQ answer"
            rows={3}
            style={{ ...inputStyle, marginTop: "0.25rem", resize: "vertical", minHeight: 72, borderColor: aEmpty ? "#e08080" : undefined }}
          />
          {aEmpty && <p style={reqStyle}>Required</p>}
        </label>
      </div>
    </div>
  );
}

/* ── Comparison editor ───────────────────────────────────────────────────── */

function ComparisonEditor({ cmp, page, updateComparison, updateComparisonItem, addComparisonItem, removeComparisonItem }) {
  if (!cmp) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2.5rem" }}>
      {["oldWay", "newWay"].map(side => {
        const col = cmp[side] || { title: "", items: [] };
        const label = side === "oldWay" ? "Old Way" : "New Way (Through Turnpage)";
        return (
          <div key={side} style={{ border: `1px solid ${LINE}`, background: "#fff", padding: "1.2rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
              {label}
            </div>
            <label style={{ ...labelStyle, display: "block", marginBottom: "0.75rem" }}>
              Column title
              <input
                type="text" value={col.title || ""}
                onChange={e => updateComparison(page, side, "title", e.target.value)}
                placeholder="e.g. Wait for the docket."
                style={{ ...inputStyle, marginTop: "0.25rem" }}
              />
            </label>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: INK_60, marginBottom: "0.5rem" }}>Items</div>
            {(col.items || []).map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                <input
                  type="text" value={item}
                  onChange={e => updateComparisonItem(page, side, idx, e.target.value)}
                  placeholder="Item text"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button"
                  onClick={() => removeComparisonItem(page, side, idx)}
                  style={{ ...iconBtnStyle(false), color: "#c44", borderColor: "rgba(180,40,40,0.25)", fontSize: "1.1rem" }}>
                  &times;
                </button>
              </div>
            ))}
            <button onClick={() => addComparisonItem(page, side)} style={{ ...btnStyle, fontSize: "0.78rem", marginTop: "0.25rem" }}>
              + Add item
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Shared small pieces
══════════════════════════════════════════════════════════════════════════ */

const labelStyle = { display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 };
const reqStyle   = { color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" };

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
