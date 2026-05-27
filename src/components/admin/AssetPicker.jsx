import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import {
  inputStyle,
  btnStyle,
  btnPrimaryStyle,
  filterSelectStyle,
} from "../../pages/admin/shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   AssetPicker — shared admin modal for picking an asset from the library,
   or uploading / adding a new one that auto-syncs back into the library.

   Props:
     open            boolean              controls visibility
     onClose         () => void           user cancelled / closed
     onPick          (url, entry) => void user confirmed a selection

     defaultType     string | null        pre-selects the type filter
     defaultCompany  string | null        pre-fills the company filter
     acceptTypes     string[] | null      whitelist: only show/upload these types
     title           string               modal heading (default: "Pick an asset")

   Usage:
     <AssetPicker
       open={pickerOpen}
       onClose={() => setPickerOpen(false)}
       onPick={(url, entry) => { setHeroImage(url); setPickerOpen(false); }}
       defaultType="image"
       title="Pick a hero image"
     />
═══════════════════════════════════════════════════════════════════════════ */

const TYPE_OPTIONS = ["image", "logo", "favicon", "icon", "document", "video"];

const UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,application/pdf";

// Map type → MIME types for the file input when acceptTypes is set
const TYPE_TO_MIME = {
  image:    "image/png,image/jpeg,image/webp,image/gif,image/svg+xml",
  logo:     "image/png,image/jpeg,image/webp,image/gif,image/svg+xml",
  favicon:  "image/x-icon,image/vnd.microsoft.icon,image/png",
  icon:     "image/png,image/jpeg,image/webp,image/gif,image/svg+xml",
  document: "application/pdf",
  video:    "video/mp4,video/webm,video/quicktime",
};

function mimeForAcceptTypes(acceptTypes) {
  if (!acceptTypes || acceptTypes.length === 0) return UPLOAD_ACCEPT;
  const mimes = new Set();
  for (const t of acceptTypes) {
    const m = TYPE_TO_MIME[t] || UPLOAD_ACCEPT;
    m.split(",").forEach(x => mimes.add(x.trim()));
  }
  return [...mimes].join(",");
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function deriveNameFromUrl(url) {
  try {
    const u = new URL(url, "https://placeholder.example");
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last) return last.replace(/\.[^.]+$/, "");
    return u.hostname;
  } catch {
    return url.split("/").filter(Boolean).pop() || url;
  }
}

function inferTypeFromFilename(filename) {
  if (!filename) return "image";
  const f = filename.toLowerCase();
  if (f.endsWith(".pdf")) return "document";
  if (f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mov")) return "video";
  if (f.includes("favicon") || f.endsWith(".ico")) return "favicon";
  return "image";
}

function sanitizeEntry(f) {
  let type = typeof f.type === "string" ? f.type : "image";
  if (type.includes("/")) type = "image";
  if (!TYPE_OPTIONS.includes(type)) type = "image";
  return {
    id:        typeof f.id   === "string" ? f.id   : newId(),
    name:      typeof f.name === "string" ? f.name : "",
    url:       typeof f.url  === "string" ? f.url  : "",
    type,
    companies: Array.isArray(f.companies) ? f.companies.filter(c => typeof c === "string") : [],
    source:    f.source === "upload" ? "upload" : "url",
    addedAt:   typeof f.addedAt === "string" ? f.addedAt : new Date().toISOString(),
    archived:  f.archived === true,
  };
}

/* ── Thumbnail helper (same logic as AssetsTab's FileRow) ───────────────── */
function Thumb({ url, type, name }) {
  if (!url) return <span style={{ fontSize: "0.6rem", color: INK_60 }}>–</span>;
  if (type === "document" || /\.pdf($|\?)/i.test(url)) {
    return <span style={{ fontSize: "0.6rem", fontWeight: 800, color: INK_60, textTransform: "uppercase" }}>PDF</span>;
  }
  if (type === "video" || /\.(mp4|webm|mov)($|\?)/i.test(url)) {
    return <span style={{ fontSize: "0.6rem", fontWeight: 800, color: INK_60, textTransform: "uppercase" }}>VIDEO</span>;
  }
  return (
    <img
      src={url}
      alt={name || "preview"}
      style={{ maxWidth: 58, maxHeight: 34, objectFit: "contain", display: "block" }}
      onError={e => { e.currentTarget.style.opacity = "0.2"; }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
export default function AssetPicker({
  open,
  onClose,
  onPick,
  defaultType    = null,
  defaultCompany = null,
  acceptTypes    = null,
  title          = "Pick an asset",
}) {
  // Library state
  const [entries,    setEntries]    = useState([]);
  const [loadPhase,  setLoadPhase]  = useState("idle"); // idle | loading | ready | error
  const [loadError,  setLoadError]  = useState("");

  // Filter state — initialised from props each time modal opens
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState(defaultType || "all");
  const [compFilter,  setCompFilter]  = useState(defaultCompany || "");

  // Selection
  const [selected, setSelected] = useState(null); // entry or null

  // Bottom tabs
  const [addTab, setAddTab] = useState("upload"); // "upload" | "url"

  // Upload pane
  const [uploadPhase, setUploadPhase] = useState("idle"); // idle | uploading | done | error
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // URL pane
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlAdding, setUrlAdding] = useState(false);

  // Save-to-library progress after new asset added
  const [saveError, setSaveError] = useState("");

  // ── Keyboard / scroll lock ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // ── Load library on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    // Reset filters to prop defaults each time the picker opens
    setSearch("");
    setTypeFilter(defaultType || "all");
    setCompFilter(defaultCompany || "");
    setSelected(null);
    setAddTab("upload");
    setUploadPhase("idle");
    setUploadError("");
    setUrlValue("");
    setUrlError("");
    setSaveError("");
    setLoadPhase("loading");
    setLoadError("");

    fetch("/api/admin/file-library", { credentials: "include" })
      .then(r => r.json())
      .then(body => {
        if (!body.ok) throw new Error(body.error || "Failed to load library");
        const all = (body.data?.files || []).map(sanitizeEntry);
        setEntries(all);
        setLoadPhase("ready");
      })
      .catch(err => {
        setLoadError(err.message);
        setLoadPhase("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const allCompanies = useMemo(() => {
    const s = new Set();
    entries.forEach(e => (e.companies || []).forEach(c => c && s.add(c)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (e.archived) return false;
      // acceptTypes whitelist
      if (acceptTypes && acceptTypes.length > 0 && !acceptTypes.includes(e.type)) return false;
      // type filter
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      // company filter
      if (compFilter && !(e.companies || []).some(c => c.toLowerCase() === compFilter.toLowerCase())) return false;
      // search
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = [e.name, e.url, ...(e.companies || [])].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, search, typeFilter, compFilter, acceptTypes]);

  // ── Add new entry to local state + sync to library ───────────────────────
  const addAndSelect = useCallback(async (newEntry) => {
    const entry = sanitizeEntry(newEntry);
    // Optimistically prepend
    setEntries(prev => [entry, ...prev]);
    setSelected(entry);

    // Persist to library
    setSaveError("");
    try {
      // Fetch current list first so we can pass the merged array
      const r = await fetch("/api/admin/file-library", { credentials: "include" });
      const body = await r.json();
      if (!body.ok) throw new Error(body.error || "Failed to fetch library");
      const current = (body.data?.files || []).map(sanitizeEntry);
      const merged = [entry, ...current.filter(f => f.id !== entry.id)];
      const pr = await fetch("/api/admin/file-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files: merged }),
      });
      const pbody = await pr.json();
      if (!pr.ok || !pbody.ok) throw new Error(pbody.error || "Failed to save to library");
    } catch (err) {
      // Surface the error but keep the optimistic state so the user doesn't lose work
      setSaveError(`Library sync failed: ${err.message}. The asset is still selected.`);
    }
  }, []);

  // ── Upload handler ────────────────────────────────────────────────────────
  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large — max 5 MB.");
      setUploadPhase("error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadPhase("uploading");
    setUploadError("");

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

      const inferredType = inferTypeFromFilename(file.name);
      const resolvedType = (acceptTypes && acceptTypes.length === 1)
        ? acceptTypes[0]
        : (defaultType || inferredType);

      await addAndSelect({
        id:        newId(),
        name:      file.name.replace(/\.[^.]+$/, ""),
        url:       body.url,
        type:      resolvedType,
        companies: defaultCompany ? [defaultCompany] : [],
        source:    "upload",
        addedAt:   new Date().toISOString(),
        archived:  false,
      });

      setUploadPhase("done");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err.message);
      setUploadPhase("error");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── URL add handler ───────────────────────────────────────────────────────
  async function handleAddUrl() {
    const url = urlValue.trim();
    if (!url) { setUrlError("Paste a URL first."); return; }
    if (!/^https?:\/\//i.test(url)) { setUrlError("URL must start with http:// or https://"); return; }

    setUrlAdding(true);
    setUrlError("");

    const inferredType = inferTypeFromFilename(url.split("/").pop() || "");
    const resolvedType = (acceptTypes && acceptTypes.length === 1)
      ? acceptTypes[0]
      : (defaultType || inferredType);

    await addAndSelect({
      id:        newId(),
      name:      deriveNameFromUrl(url),
      url,
      type:      resolvedType,
      companies: defaultCompany ? [defaultCompany] : [],
      source:    "url",
      addedAt:   new Date().toISOString(),
      archived:  false,
    });

    setUrlValue("");
    setUrlAdding(false);
  }

  // ── Confirm pick ──────────────────────────────────────────────────────────
  function confirmPick() {
    if (!selected) return;
    onPick(selected.url, selected);
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!open) return null;

  const uploadAccept = mimeForAcceptTypes(acceptTypes);

  // Build the type dropdown options — respect acceptTypes whitelist
  const typeOpts = [
    { value: "all", label: "All types" },
    ...(acceptTypes && acceptTypes.length > 0 ? acceptTypes : TYPE_OPTIONS)
      .map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
  ];

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#F4F5F7",
          width: "100%", maxWidth: 700,
          maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          fontFamily: FONT,
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: "1rem 1.2rem 0.75rem",
          borderBottom: `1px solid ${LINE}`,
          background: "#fff",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}>
            <div style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em" }}>
              {title}
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...btnStyle, padding: "0.2rem 0.6rem", fontSize: "1rem",
                lineHeight: 1, color: INK_60,
              }}
            >
              ×
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, URL, or company…"
            style={{ ...inputStyle, marginTop: 0, marginBottom: "0.6rem" }}
            autoFocus
          />

          {/* Filter row */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={filterSelectStyle}
            >
              {typeOpts.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* Company filter — only rendered when there are companies in the library */}
            {allCompanies.length > 0 && (
              <select
                value={compFilter}
                onChange={e => setCompFilter(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="">All companies</option>
                {allCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            {(search || typeFilter !== "all" || compFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setTypeFilter(defaultType || "all"); setCompFilter(defaultCompany || ""); }}
                style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.28rem 0.65rem", color: INK_60 }}
              >
                Clear filters
              </button>
            )}
            <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: INK_60 }}>
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* ── Asset grid (scrollable) ─────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "0.75rem 1.2rem",
          minHeight: 0,
        }}>
          {loadPhase === "loading" && (
            <div style={{ color: INK_60, fontSize: "0.88rem", padding: "1.5rem 0", textAlign: "center" }}>
              Loading library…
            </div>
          )}
          {loadPhase === "error" && (
            <div style={{ color: "#c44", fontSize: "0.88rem", padding: "1.5rem 0", textAlign: "center" }}>
              {loadError}
            </div>
          )}
          {loadPhase === "ready" && filtered.length === 0 && (
            <div style={{
              color: INK_60, fontSize: "0.88rem", padding: "2rem 0",
              textAlign: "center", border: `1px dashed ${LINE}`,
              background: "#fff",
            }}>
              No matching assets. Upload one below.
            </div>
          )}
          {loadPhase === "ready" && filtered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {filtered.map(entry => {
                const isSelected = selected?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : entry)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.5rem 0.65rem",
                      background: isSelected ? "rgba(212,255,0,0.12)" : "#fff",
                      border: isSelected ? `2px solid ${NEON}` : `1px solid ${LINE}`,
                      cursor: "pointer",
                      textAlign: "left", width: "100%",
                      fontFamily: FONT,
                      transition: "border-color 0.1s, background 0.1s",
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 64, height: 40, flexShrink: 0,
                      background: "#F4F5F7", border: `1px solid ${LINE}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      <Thumb url={entry.url} type={entry.type} name={entry.name} />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "0.85rem", fontWeight: 700, color: INK,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {entry.name || entry.url}
                      </div>
                      {entry.companies && entry.companies.length > 0 && (
                        <div style={{ fontSize: "0.72rem", color: INK_60, marginTop: 1 }}>
                          {entry.companies.join(", ")}
                        </div>
                      )}
                    </div>
                    {/* Type badge */}
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.06em",
                      textTransform: "uppercase", color: INK_60,
                      background: "#F4F5F7", border: `1px solid ${LINE}`,
                      padding: "2px 6px", flexShrink: 0,
                    }}>
                      {entry.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Add new — tabs ──────────────────────────────────────────────── */}
        <div style={{
          borderTop: `1px solid ${LINE}`,
          background: "#fff",
          flexShrink: 0,
        }}>
          {/* Tab strip */}
          <div style={{ display: "flex", borderBottom: `1px solid ${LINE}` }}>
            {["upload", "url"].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setAddTab(tab)}
                style={{
                  background: addTab === tab ? "#F4F5F7" : "#fff",
                  border: "none",
                  borderBottom: addTab === tab ? "2px solid #000" : "2px solid transparent",
                  padding: "0.55rem 1rem",
                  fontFamily: FONT, fontSize: "0.8rem", fontWeight: addTab === tab ? 700 : 400,
                  color: addTab === tab ? INK : INK_60,
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                }}
              >
                {tab === "upload" ? "Upload new" : "Add URL"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: "0.9rem 1.2rem" }}>
            {saveError && (
              <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.5rem 0.75rem", marginBottom: "0.6rem", fontSize: "0.78rem" }}>
                {saveError}
              </div>
            )}

            {addTab === "upload" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.78rem", color: INK_60 }}>
                  PNG, JPEG, WebP, GIF, SVG, ICO, or PDF. Max 5 MB. Committed to{" "}
                  <code>public/library/</code>.
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={uploadAccept}
                    onChange={handleUpload}
                    disabled={uploadPhase === "uploading"}
                    style={{ fontSize: "0.85rem", fontFamily: FONT, flex: 1 }}
                  />
                  {uploadPhase === "uploading" && (
                    <span style={{ fontSize: "0.78rem", color: INK_60 }}>Uploading…</span>
                  )}
                  {uploadPhase === "done" && (
                    <span style={{ fontSize: "0.78rem", color: "#2a7a2a" }}>Uploaded — selected above.</span>
                  )}
                  {uploadPhase === "error" && uploadError && (
                    <span style={{ fontSize: "0.78rem", color: "#c44" }}>{uploadError}</span>
                  )}
                </div>
              </div>
            )}

            {addTab === "url" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.78rem", color: INK_60 }}>
                  No upload happens — the URL is stored as-is. The remote host must keep it available.
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={urlValue}
                    onChange={e => { setUrlValue(e.target.value); setUrlError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
                    placeholder="https://example.com/logo.png"
                    style={{ ...inputStyle, marginTop: 0, flex: 1 }}
                    disabled={urlAdding}
                  />
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    disabled={!urlValue.trim() || urlAdding}
                    style={{
                      ...btnPrimaryStyle,
                      opacity: (!urlValue.trim() || urlAdding) ? 0.5 : 1,
                      cursor: (!urlValue.trim() || urlAdding) ? "default" : "pointer",
                    }}
                  >
                    {urlAdding ? "Adding…" : "Add"}
                  </button>
                </div>
                {urlError && (
                  <span style={{ fontSize: "0.78rem", color: "#c44" }}>{urlError}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: "0.65rem",
          padding: "0.75rem 1.2rem",
          borderTop: `1px solid ${LINE}`,
          background: "#fff",
          flexShrink: 0,
        }}>
          {selected && (
            <span style={{
              fontSize: "0.78rem", color: INK_60,
              alignSelf: "center", flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              Selected: <strong style={{ color: INK }}>{selected.name || selected.url}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            style={btnStyle}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmPick}
            disabled={!selected}
            style={{
              ...btnPrimaryStyle,
              opacity: !selected ? 0.4 : 1,
              cursor: !selected ? "default" : "pointer",
            }}
          >
            Use selected
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
