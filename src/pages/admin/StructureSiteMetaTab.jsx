import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   StructureSiteMetaTab — Site Metadata and Per-page Meta (no favicons)

   Focused sub-tab extracted from StructureMetaTab. Manages its own data
   fetching, dirty state, and saving for site defaults and per-page meta only.

   Data source:
     - page-meta.json  via /api/admin/page-meta  (site defaults + per-page)
═══════════════════════════════════════════════════════════════════════════ */

// ── Constants ───────────────────────────────────────────────────────────
const OG_SLUGS = ["home", "crypto", "ai-copyright", "litigation-finance"];

// ── Sanitizers ──────────────────────────────────────────────────────────
function sanitizeSite(s) {
  s = s || {};
  return {
    name:               typeof s.name               === "string" ? s.name               : "",
    defaultTitle:       typeof s.defaultTitle       === "string" ? s.defaultTitle       : "",
    defaultDescription: typeof s.defaultDescription === "string" ? s.defaultDescription : "",
  };
}

function sanitizePages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(p => ({
    path:        typeof p.path        === "string"  ? p.path        : "/",
    title:       typeof p.title       === "string"  ? p.title       : "",
    description: typeof p.description === "string"  ? p.description : "",
    og:          typeof p.og          === "string"  ? p.og          : "home",
    active:      typeof p.active      === "boolean" ? p.active      : true,
  }));
}

// ── Empty item factory ──────────────────────────────────────────────────
function emptyPage() {
  return { path: "/", title: "", description: "", og: "home", active: true };
}

// ── Main Component ──────────────────────────────────────────────────────
export default function StructureSiteMetaTab({ onDirtyChange }) {
  // ── State ────────────────────────────────────────────────────────────
  const [site,          setSite]          = useState(null);
  const [originalSite,  setOriginalSite]  = useState(null);
  const [pages,         setPages]         = useState(null);
  const [originalPages, setOriginalPages] = useState(null);

  const [phase,         setPhase]         = useState("loading");
  const [error,         setError]         = useState("");
  const [lastSavedAt,   setLastSavedAt]   = useState(null);

  // ── Dirty flag ───────────────────────────────────────────────────────
  const dirty = useMemo(() => {
    if (!site || !pages || !originalSite || !originalPages) return false;
    return JSON.stringify({ site, pages }) !== JSON.stringify({ site: originalSite, pages: originalPages });
  }, [site, pages, originalSite, originalPages]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { load(); }, []);

  // ── Load ─────────────────────────────────────────────────────────────
  async function load() {
    setPhase("loading"); setError("");
    try {
      const metaRes = await fetch("/api/admin/page-meta", { credentials: "include" });

      if (metaRes.status === 401) return;

      const metaBody = await metaRes.json();

      if (!metaRes.ok || !metaBody.ok) throw new Error(metaBody.error || `HTTP ${metaRes.status}`);

      const s = sanitizeSite(metaBody.data?.site);
      setSite(s);
      setOriginalSite(JSON.parse(JSON.stringify(s)));

      const pg = sanitizePages(metaBody.data?.pages);
      setPages(pg);
      setOriginalPages(JSON.parse(JSON.stringify(pg)));

      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  // ── Save ─────────────────────────────────────────────────────────────
  async function save() {
    if (!site && !pages) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/page-meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ site, pages }),
      });

      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");

      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  // ── Loading / error gates ────────────────────────────────────────────
  if (phase === "loading") return <CenteredMessage>Loading metadata…</CenteredMessage>;
  if (phase === "error" && site === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!site) return null;

  const isSaving = phase === "saving";

  // ── Helpers ──────────────────────────────────────────────────────────
  function updateSite(patch) {
    setSite(prev => ({ ...prev, ...patch }));
  }

  function updatePage(index, patch) {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
  }

  function removePage(index) {
    setPages(prev => prev.filter((_, i) => i !== index));
  }

  function addPage() {
    setPages(prev => [...prev, emptyPage()]);
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
          Site Meta
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

      {/* Site Defaults */}
      <SectionHeader>Site Defaults</SectionHeader>
      {site && <SiteMetaSection site={site} onUpdate={updateSite} />}

      {/* Per-page Meta */}
      <SectionHeader>Per-page Meta</SectionHeader>
      {pages && (
        <PageMetaSection
          pages={pages}
          onUpdate={updatePage}
          onRemove={removePage}
          onAdd={addPage}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section Components — Site Meta, Page Meta
═══════════════════════════════════════════════════════════════════════════ */

function SiteMetaSection({ site, onUpdate }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Fallback values used when a page does not have its own title or description set.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <LabeledField label="Site name" hint="Used in og:site_name">
          <input
            type="text"
            value={site.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Turnpage Digital Markets"
            style={{ ...inputStyle, marginTop: 0 }}
          />
        </LabeledField>

        <LabeledField label="Default title" hint="<title> and og:title for pages without a custom title">
          <input
            type="text"
            value={site.defaultTitle}
            onChange={e => onUpdate({ defaultTitle: e.target.value })}
            placeholder="Site name — tagline"
            style={{ ...inputStyle, marginTop: 0 }}
          />
        </LabeledField>

        <LabeledField label="Default description" hint="meta description and og:description for pages without a custom description">
          <textarea
            value={site.defaultDescription}
            onChange={e => onUpdate({ defaultDescription: e.target.value })}
            placeholder="Short description of the site…"
            rows={3}
            style={{ ...inputStyle, marginTop: 0, resize: "vertical" }}
          />
        </LabeledField>
      </div>
    </div>
  );
}

function PageMetaSection({ pages, onUpdate, onRemove, onAdd }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Custom title, description, and OG image for each URL path. Unknown paths fall back to the site defaults above.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", marginBottom: "1rem" }}>
        {pages.length === 0 && (
          <div style={{
            padding: "1.5rem", textAlign: "center",
            fontSize: "0.85rem", color: INK_60,
            border: `1px dashed ${LINE}`,
          }}>
            No per-page overrides. Click "+ Add page meta" to get started.
          </div>
        )}
        {pages.map((page, index) => (
          <PageMetaRow
            key={index}
            page={page}
            index={index}
            onUpdate={patch => onUpdate(index, patch)}
            onRemove={() => {
              if (window.confirm(`Remove meta for "${page.path}"?`)) onRemove(index);
            }}
          />
        ))}
      </div>

      <button onClick={onAdd} style={{
        ...btnStyle,
        fontSize: "0.82rem",
        display: "inline-flex", alignItems: "center", gap: "0.4em",
      }}>
        + Add page meta
      </button>
    </div>
  );
}

function PageMetaRow({ page, index, onUpdate, onRemove }) {
  const pathEmpty  = !page.path.trim();
  const titleEmpty = !page.title.trim();
  const descEmpty  = !page.description.trim();
  const isHome     = page.path.trim() === "/";
  const isHidden   = page.active === false;

  return (
    <div style={{
      border: `1px solid ${isHidden ? "#d4a040" : LINE}`,
      padding: "0.85rem",
      background: isHidden ? "#fffbf0" : "#FAFAFA",
      position: "relative",
      transition: "border-color 0.15s, background 0.15s",
    }}>
      <button
        type="button"
        onClick={onRemove}
        title="Remove this page"
        style={{
          position: "absolute", top: "0.6rem", right: "0.6rem",
          background: "none", border: "none",
          fontSize: "1.1rem", color: "#c44", cursor: "pointer",
          lineHeight: 1, padding: "0.1rem 0.3rem",
        }}
      >
        &times;
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", paddingRight: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <label
            title={isHome ? "Home page can't be hidden" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: "0.4em",
              cursor: isHome ? "not-allowed" : "pointer",
              userSelect: "none",
              opacity: isHome ? 0.5 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={page.active !== false}
              disabled={isHome}
              onChange={e => onUpdate({ active: e.target.checked })}
              style={{ accentColor: NEON, cursor: isHome ? "not-allowed" : "pointer" }}
            />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60 }}>
              Active
            </span>
          </label>
          {isHidden && (
            <span style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "#a06010",
              background: "#fdecc8",
              border: `1px solid #d4a040`,
              padding: "0.1rem 0.4rem",
            }}>
              HIDDEN
            </span>
          )}
        </div>

        <LabeledField label="Path" hint="Exact pathname, e.g. /crypto">
          <input
            type="text"
            value={page.path}
            onChange={e => onUpdate({ path: e.target.value })}
            placeholder="/crypto"
            style={{
              ...inputStyle,
              marginTop: 0,
              borderColor: pathEmpty ? "#e08080" : undefined,
              fontFamily: "monospace",
            }}
          />
          {pathEmpty && <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>}
        </LabeledField>

        <LabeledField label="OG image" hint="Slug for the dynamic OG image">
          <select
            value={page.og}
            onChange={e => onUpdate({ og: e.target.value })}
            style={{ ...selectStyle, marginTop: 0 }}
          >
            {OG_SLUGS.map(slug => (
              <option key={slug} value={slug}>{slug}</option>
            ))}
          </select>
        </LabeledField>

        <LabeledField label="Title" hint="<title> and og:title">
          <input
            type="text"
            value={page.title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Page title"
            style={{
              ...inputStyle,
              marginTop: 0,
              borderColor: titleEmpty ? "#e08080" : undefined,
            }}
          />
          {titleEmpty && <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>}
        </LabeledField>

        <LabeledField label="Description" hint="meta description and og:description">
          <textarea
            value={page.description}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Short description for search engines and social previews…"
            rows={2}
            style={{
              ...inputStyle,
              marginTop: 0,
              resize: "vertical",
              borderColor: descEmpty ? "#e08080" : undefined,
            }}
          />
          {descEmpty && <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>}
        </LabeledField>
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

function LabeledField({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5em", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60 }}>{label}</span>
        {hint && <span style={{ fontSize: "0.72rem", color: INK_60 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600,
};
