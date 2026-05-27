import React, { useState, useEffect, useMemo, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   PagesTab — site-level settings that live outside any single page.

   Three sections, one Save button:
     1. Favicons       — picks from file-library.json (existing)
     2. Site Metadata  — name, defaultTitle, defaultDescription (new)
     3. Per-page Meta  — title/description/OG per path (new)

   Data sources:
     - Favicons live in src/data/file-library.json  → GET/PUT /api/admin/file-library
     - Page meta lives in src/data/page-meta.json   → GET/PUT /api/admin/page-meta

   On mount both endpoints are fetched in parallel. On save, only endpoints
   with dirty state are PUT (favicons dirty → PUT file-library; meta dirty →
   PUT page-meta). After save both are re-fetched to sync.

   Reports combined dirty state via onDirtyChange?.(dirty).
═══════════════════════════════════════════════════════════════════════════ */

/* OG slugs supported by functions/og/[slug].js */
const OG_SLUGS = ["home", "crypto", "ai-copyright", "litigation-finance"];

const FAVICON_ROWS = [
  { key: "production", label: "Production favicon",   hint: "turnpagedigital.com" },
  { key: "preview",    label: "Preview / dev favicon", hint: "*.pages.dev preview deploys" },
  { key: "admin",      label: "Admin favicon",         hint: "/admin pages (any environment)" },
];

const FAVICON_PICKER_TYPES = ["favicon", "icon", "logo"];

function sanitizeFavicons(fav) {
  fav = fav || {};
  return {
    production: typeof fav.production === "string" ? fav.production : "",
    preview:    typeof fav.preview    === "string" ? fav.preview    : "",
    admin:      typeof fav.admin      === "string" ? fav.admin      : "",
  };
}

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
    path:        typeof p.path        === "string" ? p.path        : "/",
    title:       typeof p.title       === "string" ? p.title       : "",
    description: typeof p.description === "string" ? p.description : "",
    og:          typeof p.og          === "string" ? p.og          : "home",
  }));
}

function emptyPage() {
  return { path: "/", title: "", description: "", og: "home" };
}

export default function PagesTab({ onDirtyChange }) {
  /* ── Favicons state ─────────────────────────────────────────────────── */
  const [favicons,         setFavicons]         = useState(null);
  const [originalFavicons, setOriginalFavicons] = useState(null);
  const [files,            setFiles]            = useState([]);

  /* ── Site meta state ────────────────────────────────────────────────── */
  const [site,         setSite]         = useState(null);
  const [originalSite, setOriginalSite] = useState(null);

  /* ── Per-page meta state ────────────────────────────────────────────── */
  const [pages,         setPages]         = useState(null);
  const [originalPages, setOriginalPages] = useState(null);

  /* ── Shared phase / error ───────────────────────────────────────────── */
  const [phase,       setPhase]       = useState("loading");
  const [error,       setError]       = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  /* Dirty flags per section */
  const faviconsDirty = useMemo(() => {
    if (!favicons || !originalFavicons) return false;
    return JSON.stringify(favicons) !== JSON.stringify(originalFavicons);
  }, [favicons, originalFavicons]);

  const siteDirty = useMemo(() => {
    if (!site || !originalSite) return false;
    return JSON.stringify(site) !== JSON.stringify(originalSite);
  }, [site, originalSite]);

  const pagesDirty = useMemo(() => {
    if (!pages || !originalPages) return false;
    return JSON.stringify(pages) !== JSON.stringify(originalPages);
  }, [pages, originalPages]);

  const dirty = faviconsDirty || siteDirty || pagesDirty;

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const [libRes, metaRes] = await Promise.all([
        fetch("/api/admin/file-library", { credentials: "include" }),
        fetch("/api/admin/page-meta",    { credentials: "include" }),
      ]);

      if (libRes.status === 401) return;

      const libBody  = await libRes.json();
      const metaBody = await metaRes.json();

      if (!libRes.ok  || !libBody.ok)  throw new Error(libBody.error  || `HTTP ${libRes.status}`);
      if (!metaRes.ok || !metaBody.ok) throw new Error(metaBody.error || `HTTP ${metaRes.status}`);

      const fav = sanitizeFavicons(libBody.data.favicons);
      setFavicons(fav);
      setOriginalFavicons(JSON.parse(JSON.stringify(fav)));
      setFiles(Array.isArray(libBody.data.files) ? libBody.data.files : []);

      const s = sanitizeSite(metaBody.data?.site);
      setSite(s);
      setOriginalSite(JSON.parse(JSON.stringify(s)));

      const pg = sanitizePages(metaBody.data?.pages);
      setPages(pg);
      setOriginalPages(JSON.parse(JSON.stringify(pg)));

      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (!favicons && !site && !pages) return;
    setPhase("saving"); setError("");
    try {
      const puts = [];
      if (faviconsDirty) {
        puts.push(
          fetch("/api/admin/file-library", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ favicons }),
          }),
        );
      }
      if (siteDirty || pagesDirty) {
        puts.push(
          fetch("/api/admin/page-meta", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ site, pages }),
          }),
        );
      }

      const results = await Promise.all(puts);
      for (const r of results) {
        const body = await r.json().catch(() => ({}));
        if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      }

      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading page settings…</CenteredMessage>;
  if (phase === "error" && favicons === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!favicons) return null;

  const isSaving = phase === "saving";

  function setFavicon(envKey, url) {
    setFavicons(prev => ({ ...prev, [envKey]: url }));
  }

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
          Pages
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
        Pages settings — site-level metadata and per-page SEO/OG configuration.
      </p>

      {/* Section 1: Favicons */}
      <FaviconSection
        favicons={favicons}
        files={files}
        onSelect={setFavicon}
        onReload={load}
      />

      {/* Section 2: Site Metadata */}
      {site && (
        <SiteMetaSection site={site} onUpdate={updateSite} />
      )}

      {/* Section 3: Per-page Meta */}
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
   Favicon section (unchanged from Phase 3a)
═══════════════════════════════════════════════════════════════════════════ */
function FaviconSection({ favicons, files, onSelect, onReload }) {
  const eligible = useMemo(() => {
    return files.filter(f => FAVICON_PICKER_TYPES.includes(f.type));
  }, [files]);

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.3rem" }}>
        Favicons
      </div>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Each environment can show a different favicon. Pick from the file library or paste any URL.
        Changes take effect on the next page load after you save.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {FAVICON_ROWS.map(({ key, label, hint }) => (
          <FaviconRow
            key={key}
            envKey={key}
            label={label}
            hint={hint}
            current={favicons[key] || ""}
            eligible={eligible}
            onSelect={url => onSelect(key, url)}
            onUploaded={async ({ url }) => {
              await onReload();
              onSelect(key, url);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FaviconRow({ envKey, label, hint, current, eligible, onSelect, onUploaded }) {
  const inLibrary = current && eligible.some(f => f.url === current);
  const isCustomBootstrap = current && !inLibrary;
  const [mode, setMode] = useState(isCustomBootstrap ? "custom" : "library");
  const [customUrl, setCustomUrl] = useState(isCustomBootstrap ? current : "");

  useEffect(() => {
    const stillInLibrary = current && eligible.some(f => f.url === current);
    if (current && !stillInLibrary) {
      setMode("custom");
      setCustomUrl(current);
    } else if (mode === "custom" && !current) {
      setCustomUrl("");
    } else if (stillInLibrary && mode !== "library") {
      setMode("library");
    }
  }, [current, eligible]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectChange(e) {
    const v = e.target.value;
    if (v === "__custom__") {
      setMode("custom");
    } else {
      setMode("library");
      onSelect(v);
    }
  }

  function commitCustom() {
    onSelect(customUrl.trim());
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "56px 1fr 1.4fr", gap: "0.85rem",
      alignItems: "center",
    }} className="favicon-row">
      <div style={{
        width: 48, height: 48,
        border: `1px solid ${LINE}`, background: "#F4F5F7",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {current ? (
          <img
            src={current}
            alt={`${label} preview`}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            onError={e => { e.currentTarget.style.opacity = "0.25"; }}
          />
        ) : (
          <span style={{ fontSize: "0.6rem", color: INK_60 }}>none</span>
        )}
      </div>

      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: INK }}>{label}</div>
        <div style={{ fontSize: "0.72rem", color: INK_60 }}>{hint}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <select
            value={mode === "custom" ? "__custom__" : current}
            onChange={handleSelectChange}
            style={{ ...inputStyle, marginTop: 0, cursor: "pointer", flex: 1 }}
          >
            <option value="">— None —</option>
            {eligible.map(f => (
              <option key={f.id} value={f.url}>
                {f.name}{f.type ? ` (${f.type})` : ""}
              </option>
            ))}
            <option disabled style={{ color: "#aaa" }}>──────────</option>
            <option value="__custom__">— Custom URL —</option>
          </select>
          <CompactUpload
            label="Upload"
            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp"
            onUploaded={onUploaded}
          />
        </div>

        {mode === "custom" && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <input
              type="text"
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              onBlur={commitCustom}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitCustom(); } }}
              placeholder="/favicon.png or https://…"
              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
            />
            <button
              type="button"
              onClick={commitCustom}
              style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.35rem 0.7rem" }}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .favicon-row { grid-template-columns: 48px 1fr !important; }
          .favicon-row > div:last-child { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Site Metadata section — name, defaultTitle, defaultDescription
═══════════════════════════════════════════════════════════════════════════ */
function SiteMetaSection({ site, onUpdate }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.3rem" }}>
        Site Metadata
      </div>
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

/* ═══════════════════════════════════════════════════════════════════════════
   Per-page Meta section — list of { path, title, description, og }
═══════════════════════════════════════════════════════════════════════════ */
function PageMetaSection({ pages, onUpdate, onRemove, onAdd }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.3rem" }}>
        Per-page Meta
      </div>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Custom title, description, and OG image for each URL path. Unknown paths fall back to the site defaults above.
        OG image slugs correspond to the dynamic OG image function.
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

  return (
    <div style={{
      border: `1px solid ${LINE}`,
      padding: "0.85rem",
      background: "#FAFAFA",
      position: "relative",
    }}>
      {/* Delete button top-right */}
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
        {/* Path */}
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

        {/* OG slug */}
        <LabeledField label="OG image" hint="Slug for the dynamic OG image — must match a registered slug">
          <select
            value={page.og}
            onChange={e => onUpdate({ og: e.target.value })}
            style={{ ...inputStyle, marginTop: 0, cursor: "pointer" }}
          >
            {OG_SLUGS.map(slug => (
              <option key={slug} value={slug}>{slug}</option>
            ))}
          </select>
        </LabeledField>

        {/* Title */}
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

        {/* Description */}
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

/* ── Shared small helpers ─────────────────────────────────────────────────── */

function LabeledField({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5em", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: INK }}>{label}</span>
        {hint && <span style={{ fontSize: "0.72rem", color: INK_60 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CompactUpload — inline upload button used by favicon rows
═══════════════════════════════════════════════════════════════════════════ */
function CompactUpload({ onUploaded, accept, label = "Upload" }) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large — max 5 MB.");
      setPhase("error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPhase("uploading");
    setError("");
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = ev => res(ev.target.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const r = await fetch("/api/admin/file-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename:      file.name,
          contentBase64: base64,
          contentType:   file.type,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      setPhase("done");
      await onUploaded({ url: body.url, filename: body.filename });
      setTimeout(() => setPhase("idle"), 1500);
    } catch (err) {
      setError(err.message);
      setPhase("error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => fileRef.current && fileRef.current.click()}
        disabled={phase === "uploading"}
        style={{
          ...btnStyle,
          fontSize: "0.78rem", padding: "0.35rem 0.75rem",
          opacity: phase === "uploading" ? 0.6 : 1,
          cursor:  phase === "uploading" ? "wait" : "pointer",
        }}
      >
        {phase === "uploading" ? "Uploading…" : phase === "done" ? "Uploaded" : label}
      </button>
      {error && <p style={{ color: "#c44", fontSize: "0.75rem", margin: "0.35rem 0 0" }}>{error}</p>}
    </div>
  );
}
