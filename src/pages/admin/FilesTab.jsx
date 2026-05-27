import React, { useState, useEffect, useMemo, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   FilesTab — centralised image / logo library + per-environment favicon picker.

   Three sections:
     1. Add new file (upload OR by URL)
     2. File grid (cards: thumbnail, name, companies chips, copy/delete)
     3. Favicons (production / preview / admin pickers)

   Self-contained: owns its own fetch/save lifecycle and reports dirty state
   via onDirtyChange?.(dirty). Mirrors the DealsTab pattern.
═══════════════════════════════════════════════════════════════════════════ */

const FAVICON_ROWS = [
  { key: "production", label: "Production favicon",   hint: "turnpagedigital.com" },
  { key: "preview",    label: "Preview / dev favicon", hint: "*.pages.dev preview deploys" },
  { key: "admin",      label: "Admin favicon",         hint: "/admin pages (any environment)" },
];

const FAVICON_MIME_TYPES = ["image/png", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon", "image/webp"];

const UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon";

function sanitizeFile(f) {
  return {
    id:        typeof f.id   === "string" ? f.id   : "",
    name:      typeof f.name === "string" ? f.name : "",
    url:       typeof f.url  === "string" ? f.url  : "",
    type:      typeof f.type === "string" ? f.type : "",
    companies: Array.isArray(f.companies) ? f.companies.filter(c => typeof c === "string") : [],
    source:    f.source === "upload" ? "upload" : "url",
    addedAt:   typeof f.addedAt === "string" ? f.addedAt : "",
  };
}

function sanitizeFavicons(fav) {
  fav = fav || {};
  return {
    production: typeof fav.production === "string" ? fav.production : "",
    preview:    typeof fav.preview    === "string" ? fav.preview    : "",
    admin:      typeof fav.admin      === "string" ? fav.admin      : "",
  };
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function inferMimeFromUrl(url) {
  const u = url.toLowerCase();
  if (u.endsWith(".png"))  return "image/png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".gif"))  return "image/gif";
  if (u.endsWith(".svg"))  return "image/svg+xml";
  if (u.endsWith(".ico"))  return "image/x-icon";
  return "";
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

export default function FilesTab({ onDirtyChange }) {
  const [library, setLibrary]     = useState(null);    // { files: [], favicons: {} }
  const [original, setOriginal]   = useState(null);
  const [phase, setPhase]         = useState("loading");
  const [error, setError]         = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const dirty = useMemo(() => {
    if (!library || !original) return false;
    return JSON.stringify(library) !== JSON.stringify(original);
  }, [library, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/file-library", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = {
        files: (body.data.files || []).map(sanitizeFile),
        favicons: sanitizeFavicons(body.data.favicons),
      };
      setLibrary(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (!library) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/file-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files: library.files, favicons: library.favicons }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading file library…</CenteredMessage>;
  if (phase === "error" && library === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!library) return null;

  const isSaving = phase === "saving";

  // ── Mutations ────────────────────────────────────────────────────────────
  function addFile(entry) {
    setLibrary(lib => ({
      ...lib,
      files: [
        sanitizeFile({
          id:        entry.id || newId(),
          name:      entry.name || "Untitled",
          url:       entry.url || "",
          type:      entry.type || "",
          companies: entry.companies || [],
          source:    entry.source || "url",
          addedAt:   entry.addedAt || new Date().toISOString(),
        }),
        ...lib.files,
      ],
    }));
  }
  function updateFile(id, field, value) {
    setLibrary(lib => ({
      ...lib,
      files: lib.files.map(f => f.id === id ? { ...f, [field]: value } : f),
    }));
  }
  function deleteFile(id) {
    if (!confirm("Remove this file from the library? (The file in the repo stays — this just removes the catalog entry.)")) return;
    setLibrary(lib => ({
      ...lib,
      files: lib.files.filter(f => f.id !== id),
    }));
  }
  function setFavicon(envKey, url) {
    setLibrary(lib => ({
      ...lib,
      favicons: { ...lib.favicons, [envKey]: url },
    }));
  }

  // Sort newest first for the grid display
  const displayFiles = library.files
    .slice()
    .sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        marginBottom: "1.5rem", paddingBottom: "1rem",
        borderBottom: `2px solid ${LINE}`,
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          Files
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "Unsaved changes"}
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
        Centralised library of logos, icons, and images. Upload a file (commits to <code>public/library/</code>) or paste any image URL.
        Tag each entry with company names so you can reuse them when tagging press items and deals.
      </p>

      {/* ── Section 1: Add new file ─────────────────────────────────────── */}
      <AddFileSection onAdd={addFile} />

      {/* ── Section 2: File grid ────────────────────────────────────────── */}
      <FileGrid
        files={displayFiles}
        onUpdate={updateFile}
        onDelete={deleteFile}
      />

      {/* ── Section 3: Favicons ─────────────────────────────────────────── */}
      <FaviconSection
        favicons={library.favicons}
        files={library.files}
        onSelect={setFavicon}
        onAdd={addFile}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 1 — Add new file (upload or by URL)
═══════════════════════════════════════════════════════════════════════════ */
function AddFileSection({ onAdd }) {
  const [urlValue, setUrlValue]   = useState("");
  const [urlError, setUrlError]   = useState("");

  function handleUrlAdd() {
    const url = urlValue.trim();
    if (!url) { setUrlError("Paste a URL first."); return; }
    if (!/^https?:\/\//i.test(url)) { setUrlError("URL must start with http:// or https://"); return; }
    onAdd({
      url,
      name:   deriveNameFromUrl(url),
      type:   inferMimeFromUrl(url),
      source: "url",
    });
    setUrlValue("");
    setUrlError("");
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1.5rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.8rem" }}>
        Add a file
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem",
      }} className="files-add-grid">
        {/* Upload */}
        <UploadDropzone
          onUploaded={({ url, filename, type }) => {
            onAdd({
              url,
              name:   filename.replace(/\.[^.]+$/, ""),
              type:   type || inferMimeFromUrl(url),
              source: "upload",
            });
          }}
        />

        {/* Add by URL */}
        <div style={{
          background: "#F4F5F7", border: `1px solid ${LINE}`, padding: "1rem",
          display: "flex", flexDirection: "column", gap: "0.55rem",
        }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: INK_60 }}>
            Or paste a URL
          </div>
          <input
            type="text"
            value={urlValue}
            onChange={e => { setUrlValue(e.target.value); setUrlError(""); }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleUrlAdd(); } }}
            placeholder="https://example.com/logo.png"
            style={{ ...inputStyle, marginTop: 0 }}
          />
          {urlError && (
            <p style={{ color: "#c44", fontSize: "0.78rem", margin: 0 }}>{urlError}</p>
          )}
          <button
            type="button"
            onClick={handleUrlAdd}
            style={{ ...btnPrimaryStyle, alignSelf: "flex-start" }}
          >
            Add URL
          </button>
          <p style={{ fontSize: "0.72rem", color: INK_60, margin: 0 }}>
            No upload happens — we store the URL as-is. The remote host must keep the image available.
          </p>
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .files-add-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* Reusable dropzone — also exposed for the favicon "upload new" shortcut. */
function UploadDropzone({ onUploaded, accept = UPLOAD_ACCEPT, compact = false }) {
  const [phase,  setPhase]  = useState("idle"); // idle | uploading | done | error
  const [error,  setError]  = useState("");
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
      onUploaded({ url: body.url, filename: body.filename, type: file.type });
      // Reset after a moment so the next upload re-enables the button
      setTimeout(() => setPhase("idle"), 1500);
    } catch (err) {
      setError(err.message);
      setPhase("error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (compact) {
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
          {phase === "uploading" ? "Uploading…" : phase === "done" ? "✓ Uploaded" : "Upload new favicon"}
        </button>
        {error && <p style={{ color: "#c44", fontSize: "0.75rem", margin: "0.35rem 0 0" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{
      background: "#F4F5F7", border: `1px dashed ${LINE}`, padding: "1rem",
      display: "flex", flexDirection: "column", gap: "0.55rem",
    }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: INK_60 }}>
        Upload a file
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        disabled={phase === "uploading"}
        style={{ fontSize: "0.85rem", fontFamily: FONT }}
      />
      <p style={{ fontSize: "0.72rem", color: INK_60, margin: 0 }}>
        PNG, JPEG, WebP, GIF, SVG, or ICO. Max 5 MB. File is committed to <code>public/library/</code>.
      </p>
      {phase === "uploading" && (
        <p style={{ color: INK_60, fontSize: "0.78rem", margin: 0 }}>Uploading…</p>
      )}
      {phase === "done" && (
        <p style={{ color: "#2a7a2a", fontSize: "0.78rem", margin: 0 }}>✓ Uploaded — added to the library below.</p>
      )}
      {phase === "error" && error && (
        <p style={{ color: "#c44", fontSize: "0.78rem", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 2 — File grid
═══════════════════════════════════════════════════════════════════════════ */
function FileGrid({ files, onUpdate, onDelete }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.6rem" }}>
        Library <span style={{ fontWeight: 400 }}>({files.length} file{files.length !== 1 ? "s" : ""} — newest first)</span>
      </div>
      {files.length === 0 ? (
        <div style={{
          padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`,
          color: INK_60, textAlign: "center", fontSize: "0.88rem",
        }}>
          No files yet. Upload one or paste a URL above to get started.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "0.85rem",
        }} className="files-grid">
          {files.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onUpdate={(field, value) => onUpdate(file.id, field, value)}
              onDelete={() => onDelete(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileCard({ file, onUpdate, onDelete }) {
  const [nameDraft,      setNameDraft]      = useState(file.name);
  const [companiesDraft, setCompaniesDraft] = useState((file.companies || []).join(", "));
  const [copied,         setCopied]         = useState(false);

  // Reset drafts when underlying file changes (e.g., after save/load)
  useEffect(() => { setNameDraft(file.name); }, [file.name]);
  useEffect(() => { setCompaniesDraft((file.companies || []).join(", ")); }, [file.companies]);

  function commitName() {
    const v = nameDraft.trim();
    if (v !== file.name) onUpdate("name", v || "Untitled");
  }
  function commitCompanies() {
    const next = companiesDraft
      .split(",")
      .map(c => c.trim())
      .filter(Boolean);
    // Dedupe (case-insensitive)
    const seen = new Set();
    const deduped = next.filter(c => {
      const k = c.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (JSON.stringify(deduped) !== JSON.stringify(file.companies || [])) {
      onUpdate("companies", deduped);
    }
    setCompaniesDraft(deduped.join(", "));
  }

  async function copyUrl() {
    try {
      // Build absolute URL for relative paths so the copied value is usable everywhere
      const absolute = /^https?:\/\//i.test(file.url)
        ? file.url
        : (typeof window !== "undefined" ? window.location.origin + file.url : file.url);
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Fallback for older browsers / non-HTTPS contexts
      const ta = document.createElement("textarea");
      ta.value = file.url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <div style={{
      background: "#fff", border: `1px solid ${LINE}`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Thumbnail */}
      <div style={{
        height: 140, background: "#F4F5F7",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: `1px solid ${LINE}`, overflow: "hidden", padding: "0.6rem",
      }}>
        {file.url ? (
          <img
            src={file.url}
            alt={file.name}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
            onError={e => { e.currentTarget.style.opacity = "0.25"; }}
          />
        ) : (
          <span style={{ fontSize: "0.78rem", color: INK_60 }}>no preview</span>
        )}
      </div>

      {/* Source badge + actions */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        padding: "0.45rem 0.7rem", borderBottom: `1px solid ${LINE}`,
        background: "#FAFAFB",
      }}>
        <span style={{
          fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
          background: file.source === "upload" ? "#0A0A0A" : "#E5E7EB",
          color: file.source === "upload" ? NEON : INK_60,
          padding: "0.15em 0.45em",
        }}>
          {file.source === "upload" ? "Uploaded" : "URL"}
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={copyUrl}
          title="Copy URL"
          style={{ ...iconBtnStyle(false), width: "auto", padding: "0 0.55rem", fontSize: "0.72rem", fontWeight: 700 }}
        >
          {copied ? "✓ Copied" : "Copy URL"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete from library"
          style={{ ...iconBtnStyle(false), color: "#c44" }}
        >
          ×
        </button>
      </div>

      {/* Editable fields */}
      <div style={{ padding: "0.7rem 0.7rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        <label style={{ display: "block", fontSize: "0.7rem", color: INK_60, fontWeight: 600 }}>
          Name
          <input
            type="text"
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
            placeholder="Logo name"
            style={{ ...inputStyle, marginTop: "0.2rem", padding: "0.4rem 0.55rem", fontSize: "0.85rem" }}
          />
        </label>

        <label style={{ display: "block", fontSize: "0.7rem", color: INK_60, fontWeight: 600 }}>
          Companies <span style={{ fontWeight: 400 }}>(comma-separated)</span>
          <input
            type="text"
            value={companiesDraft}
            onChange={e => setCompaniesDraft(e.target.value)}
            onBlur={commitCompanies}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
            placeholder="Anthropic, OpenAI"
            style={{ ...inputStyle, marginTop: "0.2rem", padding: "0.4rem 0.55rem", fontSize: "0.85rem" }}
          />
        </label>

        {file.companies && file.companies.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {file.companies.map(c => (
              <span key={c} style={{
                background: "#F4F5F7", border: `1px solid ${LINE}`,
                fontSize: "0.7rem", color: INK, padding: "0.15rem 0.45rem",
                fontFamily: FONT,
              }}>{c}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 3 — Favicons
═══════════════════════════════════════════════════════════════════════════ */
function FaviconSection({ favicons, files, onSelect, onAdd }) {
  // Eligible favicon files: filter to icon-friendly mime types, but always
  // include the currently-selected URL even if it isn't in the library
  // (so the user can see what's set without surprises).
  const eligible = useMemo(() => {
    return files.filter(f => !f.type || FAVICON_MIME_TYPES.includes(f.type));
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
          />
        ))}
      </div>

      <div style={{
        marginTop: "1.1rem", paddingTop: "0.85rem", borderTop: `1px solid ${LINE}`,
        display: "flex", gap: "0.7rem", alignItems: "center", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: "0.78rem", color: INK_60 }}>
          Need a new icon?
        </span>
        <UploadDropzone
          compact
          accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp"
          onUploaded={({ url, filename, type }) => {
            onAdd({
              url,
              name:   filename.replace(/\.[^.]+$/, ""),
              type:   type || inferMimeFromUrl(url),
              source: "upload",
            });
          }}
        />
        <span style={{ fontSize: "0.72rem", color: INK_60 }}>
          Uploaded file appears in the library above — select it in the dropdowns to assign.
        </span>
      </div>
    </div>
  );
}

function FaviconRow({ envKey, label, hint, current, eligible, onSelect }) {
  // Sentinel select values: "" = none, "__custom__" = paste a URL, anything else = library URL
  const inLibrary = current && eligible.some(f => f.url === current);
  const isCustomBootstrap = current && !inLibrary;
  const [mode, setMode] = useState(isCustomBootstrap ? "custom" : "library");
  const [customUrl, setCustomUrl] = useState(isCustomBootstrap ? current : "");

  // Sync if outer current changes (e.g., load after save)
  useEffect(() => {
    const stillInLibrary = current && eligible.some(f => f.url === current);
    if (current && !stillInLibrary) {
      setMode("custom");
      setCustomUrl(current);
    } else if (mode === "custom" && !current) {
      // keep custom mode, just clear the URL
      setCustomUrl("");
    } else if (stillInLibrary && mode !== "library") {
      setMode("library");
    }
  }, [current, eligible]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectChange(e) {
    const v = e.target.value;
    if (v === "__custom__") {
      setMode("custom");
      // don't clear — keep the previous selection until user pastes
    } else {
      setMode("library");
      onSelect(v);
    }
  }

  function commitCustom() {
    const v = customUrl.trim();
    onSelect(v);
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "56px 1fr 1.4fr", gap: "0.85rem",
      alignItems: "center",
    }} className="favicon-row">
      {/* Preview swatch */}
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

      {/* Label */}
      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: INK }}>
          {label}
        </div>
        <div style={{ fontSize: "0.72rem", color: INK_60 }}>
          {hint}
        </div>
      </div>

      {/* Picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <select
          value={mode === "custom" ? "__custom__" : current}
          onChange={handleSelectChange}
          style={{ ...inputStyle, marginTop: 0, cursor: "pointer" }}
        >
          <option value="">— None —</option>
          {eligible.map(f => (
            <option key={f.id} value={f.url}>
              {f.name}{f.type ? ` (${f.type.replace("image/", "")})` : ""}
            </option>
          ))}
          <option disabled style={{ color: "#aaa" }}>──────────</option>
          <option value="__custom__">— Custom URL —</option>
        </select>

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
