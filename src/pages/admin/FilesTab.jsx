import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   FilesTab — centralised image / logo library + per-environment favicon picker
   + an index of every other media file in the repo's public/ directory.

   Four sections:
     1. Add new file (upload OR by URL)
     2. Library — tracked entries from src/data/file-library.json
     3. Site assets — every other image/video in public/ that isn't already in
        the library. Each row has Replace (overwrites the file in place) and
        Add to library (adopts it into the library above).
     4. Favicons (production / preview / admin pickers)

   Self-contained: owns its own fetch/save lifecycle and reports dirty state
   via onDirtyChange?.(dirty). Mirrors the DealsTab pattern.
═══════════════════════════════════════════════════════════════════════════ */

const FAVICON_ROWS = [
  { key: "production", label: "Production favicon",   hint: "turnpagedigital.com" },
  { key: "preview",    label: "Preview / dev favicon", hint: "*.pages.dev preview deploys" },
  { key: "admin",      label: "Admin favicon",         hint: "/admin pages (any environment)" },
];

const TYPE_OPTIONS = ["image", "logo", "favicon", "icon"];
const FAVICON_PICKER_TYPES = ["favicon", "icon", "logo"]; // types eligible for the favicon dropdowns

// MIME accept lists used by the various upload widgets.
const UPLOAD_ACCEPT       = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/avif";
const UPLOAD_ACCEPT_VIDEO = "video/mp4,video/webm,video/quicktime";
const UPLOAD_ACCEPT_ALL   = `${UPLOAD_ACCEPT},${UPLOAD_ACCEPT_VIDEO}`;

// Upload size cap (raw bytes). Videos in public/ are 1–4 MB so 25 MB is plenty
// of headroom without making it easy to accidentally commit huge files.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/* Infer a sensible default `type` (category) for a new entry. Filename or URL
 * containing "favicon" → favicon. Otherwise default to "image". Users can change
 * this in the dropdown after adding. */
function inferTypeFromFilename(filename) {
  if (!filename) return "image";
  const f = filename.toLowerCase();
  if (f.includes("favicon") || f.endsWith(".ico")) return "favicon";
  return "image";
}

function sanitizeFile(f) {
  // Migrate: older entries stored a MIME type (e.g. "image/png") in `type`.
  // Normalise to the new category enum.
  let type = typeof f.type === "string" ? f.type : "image";
  if (type.includes("/")) type = "image";        // legacy MIME → default to "image"
  if (!TYPE_OPTIONS.includes(type)) type = "image";
  return {
    id:        typeof f.id   === "string" ? f.id   : "",
    name:      typeof f.name === "string" ? f.name : "",
    url:       typeof f.url  === "string" ? f.url  : "",
    type,
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

/* Try to extract the last path segment from a URL (or raw filename). Used
 * for type inference when the user adds by URL. */
function lastPathSegment(urlOrName) {
  try {
    const u = new URL(urlOrName, "https://placeholder.example");
    return u.pathname.split("/").filter(Boolean).pop() || urlOrName;
  } catch {
    return urlOrName;
  }
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

/* Human-friendly byte size — "12 KB", "1.4 MB", etc. */
function formatBytes(n) {
  if (typeof n !== "number" || !isFinite(n) || n <= 0) return "—";
  if (n < 1024)            return `${n} B`;
  if (n < 1024 * 1024)     return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 10) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(n / (1024 * 1024))} MB`;
}

/* Group an array of indexed files by a coarse category for the section
 * headings. We use extension class (Images / Videos / Icons) — simpler than
 * inferring by filename ("favicon", "hero", "bg") and the user can scan
 * thumbnails to find what they want anyway. */
function groupIndexed(files) {
  const groups = { Images: [], Videos: [], Icons: [] };
  for (const f of files) {
    if (f.type === "video")     groups.Videos.push(f);
    else if (f.type === "icon") groups.Icons.push(f);
    else                        groups.Images.push(f);
  }
  // Drop empty groups
  return Object.entries(groups).filter(([, arr]) => arr.length > 0);
}

export default function FilesTab({ onDirtyChange }) {
  const [library, setLibrary]     = useState(null);    // { files: [], favicons: {} }
  const [original, setOriginal]   = useState(null);
  const [phase, setPhase]         = useState("loading");
  const [error, setError]         = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Indexed site assets — every media file in public/. Fetched once on mount
  // and again after each Save (in case a Replace landed). Independent from
  // dirty/save lifecycle so the user can still edit the library while the
  // index is loading or revalidating.
  const [indexedFiles, setIndexedFiles]   = useState(null);   // null = loading
  const [indexedError, setIndexedError]   = useState("");

  const dirty = useMemo(() => {
    if (!library || !original) return false;
    return JSON.stringify(library) !== JSON.stringify(original);
  }, [library, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      // Fetch the library and the indexed site assets in parallel.
      const [libRes, idxRes] = await Promise.all([
        fetch("/api/admin/file-library", { credentials: "include" }),
        fetch("/api/admin/file-index",   { credentials: "include" }),
      ]);
      if (libRes.status === 401 || idxRes.status === 401) return;

      const libBody = await libRes.json();
      if (!libRes.ok || !libBody.ok) throw new Error(libBody.error || `HTTP ${libRes.status}`);
      const fresh = {
        files: (libBody.data.files || []).map(sanitizeFile),
        favicons: sanitizeFavicons(libBody.data.favicons),
      };
      setLibrary(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));

      // Index is best-effort — a failure here doesn't block library edits.
      const idxBody = await idxRes.json().catch(() => ({}));
      if (idxRes.ok && idxBody.ok) {
        setIndexedFiles(Array.isArray(idxBody.files) ? idxBody.files : []);
        setIndexedError("");
      } else {
        setIndexedFiles([]);
        setIndexedError(idxBody.error || `Index fetch failed (${idxRes.status})`);
      }

      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  // Reload just the indexed files — used after a Replace so the user sees
  // the updated size/thumbnail without nuking unsaved library edits.
  const reloadIndex = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/file-index", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.ok) {
        setIndexedFiles(Array.isArray(body.files) ? body.files : []);
        setIndexedError("");
      }
    } catch { /* swallow — keep the previous index visible */ }
  }, []);

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

  // Dedupe the indexed files against the library — any indexed file whose URL
  // already appears in a library entry shouldn't show in "Site assets" since
  // it's already controllable from the Library section above.
  const librarySet = useMemoSet(library.files.map(f => f.url));
  const indexedUnclaimed = (indexedFiles || []).filter(f => !librarySet.has(f.url));

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>
      {/* Section header — sticky so the Save button stays visible while the
          user scrolls through the file grid. The Admin shell's top bar is also
          sticky at top: 0, so we offset enough to sit below it. */}
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
          Files
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: dirty ? "#7a5c00" : INK_60, fontWeight: dirty ? 700 : 400 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "⚠ Unsaved changes — click Save to commit"}
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
        The <strong>Site assets</strong> section below lists every other media file already in the repo so you can replace or adopt them.
      </p>

      {/* ── Section 1: Add new file ─────────────────────────────────────── */}
      <AddFileSection onAdd={addFile} />

      {/* ── Section 2: File grid ────────────────────────────────────────── */}
      <FileGrid
        files={displayFiles}
        onUpdate={updateFile}
        onDelete={deleteFile}
      />

      {/* ── Section 3: Site assets (indexed media in public/) ───────────── */}
      <SiteAssetsSection
        indexedFiles={indexedUnclaimed}
        loading={indexedFiles === null}
        error={indexedError}
        onReplaced={reloadIndex}
        onAdopt={(idx) => {
          // Adopt an indexed file into the library. The dedupe filter above
          // means this row will disappear from "Site assets" once added.
          addFile({
            url:    idx.url,
            name:   deriveNameFromUrl(idx.url),
            type:   inferTypeFromFilename(idx.url),
            source: idx.type === "video" ? "url" : "url",  // not an "upload" event — they're pre-existing
          });
        }}
      />

      {/* ── Section 4: Favicons ─────────────────────────────────────────── */}
      <FaviconSection
        favicons={library.favicons}
        files={library.files}
        indexedFiles={indexedFiles || []}
        onSelect={setFavicon}
        onAdd={addFile}
      />
    </div>
  );
}

/* Stable Set built from an array of strings. useMemo against the joined-key
 * so reordering or in-place edits don't churn the Set identity. */
function useMemoSet(items) {
  return useMemo(() => new Set(items), [items.join("\n")]); // eslint-disable-line react-hooks/exhaustive-deps
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
      type:   inferTypeFromFilename(lastPathSegment(url)),
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
          onUploaded={({ url, filename }) => {
            onAdd({
              url,
              name:   filename.replace(/\.[^.]+$/, ""),
              type:   inferTypeFromFilename(filename),
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
function UploadDropzone({ onUploaded, accept = UPLOAD_ACCEPT, compact = false, label = "Upload new favicon" }) {
  const [phase,  setPhase]  = useState("idle"); // idle | uploading | done | error
  const [error,  setError]  = useState("");
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File too large — max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
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
          {phase === "uploading" ? "Uploading…" : phase === "done" ? "✓ Uploaded" : label}
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
        PNG, JPEG, WebP, GIF, SVG, AVIF, or ICO. Max 25 MB. File is committed to <code>public/library/</code>.
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
   Section 2 — File list (rows)

   Matches the "As Seen In" Logos pattern from BioTab — compact one-row-per-file
   with thumbnail, name, type, URL, companies (only when type === "logo"),
   and copy/delete actions.
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {files.map(file => (
            <FileRow
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

function FileRow({ file, onUpdate, onDelete }) {
  const [nameDraft,      setNameDraft]      = useState(file.name);
  const [urlDraft,       setUrlDraft]       = useState(file.url);
  const [companiesDraft, setCompaniesDraft] = useState((file.companies || []).join(", "));
  const [copied,         setCopied]         = useState(false);
  const [replacing,      setReplacing]      = useState(false);
  const [replaceError,   setReplaceError]   = useState("");
  const replaceInputRef                     = useRef(null);

  // Reset drafts when underlying file changes (e.g., after save/load)
  useEffect(() => { setNameDraft(file.name); }, [file.name]);
  useEffect(() => { setUrlDraft(file.url); }, [file.url]);
  useEffect(() => { setCompaniesDraft((file.companies || []).join(", ")); }, [file.companies]);

  function commitName() {
    const v = nameDraft.trim();
    if (v !== file.name) onUpdate("name", v || "Untitled");
  }
  function commitUrl() {
    const v = urlDraft.trim();
    if (v !== file.url) onUpdate("url", v);
  }
  function commitCompanies() {
    const next = companiesDraft.split(",").map(c => c.trim()).filter(Boolean);
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

  async function handleReplace(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setReplaceError(`File too large — max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
      return;
    }
    setReplaceError("");
    setReplacing(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = ev => res(ev.target.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(f);
      });
      const r = await fetch("/api/admin/file-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename:      f.name,
          contentBase64: base64,
          contentType:   f.type,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      // Swap the URL and flip the source to "upload" — keep name/type/companies
      onUpdate("url", body.url);
      onUpdate("source", "upload");
    } catch (err) {
      setReplaceError(err.message);
    } finally {
      setReplacing(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  async function copyUrl() {
    try {
      const absolute = /^https?:\/\//i.test(file.url)
        ? file.url
        : (typeof window !== "undefined" ? window.location.origin + file.url : file.url);
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
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

  const isLogo = file.type === "logo";

  return (
    <div
      style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
      className="file-row"
    >
      {/* Thumbnail */}
      <div style={{
        width: 64, height: 40, flexShrink: 0,
        background: "#F4F5F7", border: `1px solid ${LINE}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {file.url ? (
          <img
            src={file.url}
            alt={file.name || "preview"}
            style={{ maxWidth: 58, maxHeight: 34, objectFit: "contain", display: "block" }}
            onError={e => { e.currentTarget.style.opacity = "0.25"; }}
          />
        ) : (
          <span style={{ fontSize: "0.62rem", color: INK_60 }}>no url</span>
        )}
      </div>

      {/* Name */}
      <input
        type="text"
        value={nameDraft}
        onChange={e => setNameDraft(e.target.value)}
        onBlur={commitName}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        placeholder="Name"
        style={{ ...inputStyle, marginTop: 0, width: 180, flexShrink: 0 }}
      />

      {/* Type */}
      <select
        value={file.type}
        onChange={e => onUpdate("type", e.target.value)}
        style={{ ...inputStyle, marginTop: 0, width: 110, flexShrink: 0, cursor: "pointer" }}
      >
        {TYPE_OPTIONS.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* URL */}
      <input
        type="text"
        value={urlDraft}
        onChange={e => setUrlDraft(e.target.value)}
        onBlur={commitUrl}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        placeholder="https://… or /library/…"
        style={{ ...inputStyle, marginTop: 0, flex: 1, minWidth: 200 }}
      />

      {/* Company (only when type === "logo") */}
      {isLogo && (
        <input
          type="text"
          value={companiesDraft}
          onChange={e => setCompaniesDraft(e.target.value)}
          onBlur={commitCompanies}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
          placeholder="Company (e.g. Anthropic)"
          style={{ ...inputStyle, marginTop: 0, width: 180, flexShrink: 0 }}
          title="Comma-separated for multiple companies"
        />
      )}

      {/* Actions */}
      <input
        ref={replaceInputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        style={{ display: "none" }}
        onChange={handleReplace}
      />
      <button
        type="button"
        onClick={() => replaceInputRef.current && replaceInputRef.current.click()}
        disabled={replacing}
        title="Replace this file with a new upload"
        style={{
          ...iconBtnStyle(false),
          width: "auto", padding: "0 0.55rem", fontSize: "0.72rem", fontWeight: 700,
          opacity: replacing ? 0.6 : 1, cursor: replacing ? "wait" : "pointer",
        }}
      >
        {replacing ? "…" : "Replace"}
      </button>
      <button
        type="button"
        onClick={copyUrl}
        title="Copy URL"
        style={{ ...iconBtnStyle(false), width: "auto", padding: "0 0.55rem", fontSize: "0.72rem", fontWeight: 700 }}
      >
        {copied ? "✓" : "Copy"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Remove from library"
        style={{ ...iconBtnStyle(false), color: "#c44" }}
      >
        ×
      </button>

      {replaceError && (
        <div style={{ flexBasis: "100%", fontSize: "0.72rem", color: "#c44", marginTop: "0.2rem" }}>
          {replaceError}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 3 — Site assets

   Read-only index of every media file in public/ that isn't already tracked
   by the library above. Each row offers:
     - Replace — overwrites the file in place via /api/admin/file-upload
       with a `targetPath` matching the original path. References elsewhere on
       the site continue to resolve because the URL didn't change.
     - Add to library — adopts the file into the library so the user can give
       it a name, type, and company tags. After adoption + Save, the row
       disappears from this section (handled by the dedupe in the parent).

   No edit fields here — the path is the source of truth. If you want to
   rename or recategorise, adopt it into the library first.
═══════════════════════════════════════════════════════════════════════════ */
function SiteAssetsSection({ indexedFiles, loading, error, onReplaced, onAdopt }) {
  const groups = useMemo(() => groupIndexed(indexedFiles), [indexedFiles]);
  const total = indexedFiles.length;

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.3rem" }}>
        Site assets{" "}
        <span style={{ fontWeight: 400 }}>
          ({loading ? "scanning repo…" : `${total} file${total !== 1 ? "s" : ""} in public/ not yet in the library`})
        </span>
      </div>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.8rem" }}>
        Every image and video already in the repo. Use <strong>Replace</strong> to swap a file out in place (keeps the same URL, so anywhere on the site that points at it picks up the new content) or <strong>Add to library</strong> to track it with a name and company tags.
      </p>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.6rem 0.75rem", marginBottom: "0.8rem", fontSize: "0.82rem" }}>
          Couldn't load the site asset index: {error}
        </div>
      )}

      {loading && (
        <div style={{
          padding: "1.5rem", background: "#fff", border: `1px dashed ${LINE}`,
          color: INK_60, textAlign: "center", fontSize: "0.85rem",
        }}>
          Scanning repo for media files…
        </div>
      )}

      {!loading && total === 0 && !error && (
        <div style={{
          padding: "1.5rem", background: "#fff", border: `1px dashed ${LINE}`,
          color: INK_60, textAlign: "center", fontSize: "0.85rem",
        }}>
          Every media file in <code>public/</code> is already in the library above.
        </div>
      )}

      {!loading && groups.map(([groupLabel, items]) => (
        <div key={groupLabel} style={{ marginBottom: "1rem" }}>
          <div style={{
            fontSize: "0.72rem", fontWeight: 700, color: INK_60,
            textTransform: "uppercase", letterSpacing: "0.06em",
            margin: "0.6rem 0 0.4rem",
          }}>
            {groupLabel} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({items.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {items.map(file => (
              <SiteAssetRow
                key={file.path}
                file={file}
                onReplaced={onReplaced}
                onAdopt={() => onAdopt(file)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SiteAssetRow({ file, onReplaced, onAdopt }) {
  const [replacing,    setReplacing]    = useState(false);
  const [replaceError, setReplaceError] = useState("");
  const [replaceOk,    setReplaceOk]    = useState(false);
  const [copied,       setCopied]       = useState(false);
  const replaceInputRef                 = useRef(null);

  // Accept type matches the file extension class so the picker shows the right
  // kinds. The server-side validator will reject any mismatched payload too.
  const accept = file.type === "video"
    ? UPLOAD_ACCEPT_VIDEO
    : file.type === "icon"
      ? "image/x-icon,image/vnd.microsoft.icon,image/png"
      : UPLOAD_ACCEPT;

  async function handleReplace(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setReplaceError(`File too large — max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
      return;
    }
    setReplaceError("");
    setReplaceOk(false);
    setReplacing(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = ev => res(ev.target.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(f);
      });
      const r = await fetch("/api/admin/file-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename:      f.name,
          contentBase64: base64,
          contentType:   f.type,
          targetPath:    file.path,   // key bit — overwrite in place
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      setReplaceOk(true);
      setTimeout(() => setReplaceOk(false), 2500);
      // Refresh the indexed-files list so the new size shows up
      onReplaced?.();
    } catch (err) {
      setReplaceError(err.message);
    } finally {
      setReplacing(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  async function copyUrl() {
    try {
      const absolute = typeof window !== "undefined" ? window.location.origin + file.url : file.url;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <div
      style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
      className="file-row"
    >
      {/* Thumbnail (image) or video badge */}
      <div style={{
        width: 64, height: 40, flexShrink: 0,
        background: "#F4F5F7", border: `1px solid ${LINE}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {file.type === "video" ? (
          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: INK_60, letterSpacing: "0.04em" }}>
            VIDEO
          </span>
        ) : (
          <img
            src={file.url}
            alt={file.path}
            style={{ maxWidth: 58, maxHeight: 34, objectFit: "contain", display: "block" }}
            onError={e => { e.currentTarget.style.opacity = "0.25"; }}
          />
        )}
      </div>

      {/* Path + meta */}
      <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: "0.15rem" }}>
        <code style={{
          fontFamily: "ui-monospace, Menlo, monospace", fontSize: "0.78rem",
          color: INK, overflowWrap: "anywhere",
        }}>
          {file.url}
        </code>
        <div style={{ fontSize: "0.7rem", color: INK_60 }}>
          {file.ext.toUpperCase()} · {formatBytes(file.size)}
        </div>
      </div>

      {/* Actions */}
      <input
        ref={replaceInputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleReplace}
      />
      <button
        type="button"
        onClick={() => replaceInputRef.current && replaceInputRef.current.click()}
        disabled={replacing}
        title={`Overwrite ${file.path} with a new upload`}
        style={{
          ...iconBtnStyle(false),
          width: "auto", padding: "0 0.55rem", fontSize: "0.72rem", fontWeight: 700,
          opacity: replacing ? 0.6 : 1, cursor: replacing ? "wait" : "pointer",
        }}
      >
        {replacing ? "…" : replaceOk ? "✓ Replaced" : "Replace"}
      </button>
      <button
        type="button"
        onClick={onAdopt}
        title="Add this file to the library above (lets you give it a name and tags)"
        style={{
          ...iconBtnStyle(false),
          width: "auto", padding: "0 0.55rem", fontSize: "0.72rem", fontWeight: 700,
        }}
      >
        + Library
      </button>
      <button
        type="button"
        onClick={copyUrl}
        title="Copy URL"
        style={{ ...iconBtnStyle(false), width: "auto", padding: "0 0.55rem", fontSize: "0.72rem", fontWeight: 700 }}
      >
        {copied ? "✓" : "Copy"}
      </button>

      {replaceError && (
        <div style={{ flexBasis: "100%", fontSize: "0.72rem", color: "#c44", marginTop: "0.2rem" }}>
          {replaceError}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 4 — Favicons
═══════════════════════════════════════════════════════════════════════════ */
function FaviconSection({ favicons, files, indexedFiles, onSelect, onAdd }) {
  // Eligible favicon files come from two places:
  //   1. The library — any entry whose `type` is favicon, icon, or logo.
  //   2. Site assets — any indexed .ico or any image whose filename contains
  //      "favicon". This lets the user pick e.g. /favicon1.png without first
  //      having to adopt it into the library.
  // We dedupe by URL (library entries win — they have a name/type the user
  // chose).
  const eligible = useMemo(() => {
    const fromLibrary = files.filter(f => FAVICON_PICKER_TYPES.includes(f.type));
    const seen = new Set(fromLibrary.map(f => f.url));
    const fromIndexed = (indexedFiles || [])
      .filter(f => {
        if (seen.has(f.url)) return false;
        if (f.type === "icon") return true;
        const base = f.url.split("/").pop().toLowerCase();
        return base.startsWith("favicon");
      })
      .map(f => ({
        id:   `idx:${f.path}`,
        name: f.url.split("/").pop().replace(/\.[^.]+$/, ""),
        url:  f.url,
        type: f.type === "icon" ? "icon" : "favicon",
      }));
    return [...fromLibrary, ...fromIndexed];
  }, [files, indexedFiles]);

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
            onUpload={({ url, filename }) => {
              // Add to library AND auto-assign to this row's environment
              onAdd({
                url,
                name:   filename.replace(/\.[^.]+$/, ""),
                type:   "favicon",
                source: "upload",
              });
              onSelect(key, url);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FaviconRow({ envKey, label, hint, current, eligible, onSelect, onUpload }) {
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

      {/* Picker — dropdown + inline upload button (uploads to library AND auto-assigns) */}
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
          <UploadDropzone
            compact
            label="Upload"
            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp"
            onUploaded={onUpload}
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
