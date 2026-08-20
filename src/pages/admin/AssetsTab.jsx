import React, { useState, useEffect, useMemo, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, filterSelectStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   AssetsTab — centralised image / logo / document / video library.
   (Renamed from FilesTab; underlying data file is still file-library.json
   because the entries are called "files" in the data model. The "Assets"
   label is purely a UI rename.)

   Two sections:
     1. Add new asset (upload OR by URL)
     2. Asset list (rows: thumbnail, name, type, URL, copy/replace/delete)
        Above the list: type filter + count (search-ready flex container)

   The per-environment favicon picker used to live here too; it has moved to
   the Pages tab (which manages site-level settings). Both tabs talk to the
   same /api/admin/file-library endpoint, which does a partial merge on PUT
   so the tabs can save independently without trampling each other's edits.

   Rename cascade: when the user edits an entry's name AND the URL is a
   library-hosted file (/library/*), Save first POSTs each renamed entry to
   /api/admin/file-rename. That endpoint:
     - moves the binary in the repo to a slugified new path
     - rewrites every reference across admin-managed JSON data files
     - returns the new URL
   We update local state with the new URLs, then PUT file-library to persist
   the new display names + new URLs. External-URL renames stay cosmetic.

   Self-contained: owns its own fetch/save lifecycle and reports dirty state
   via onDirtyChange?.(dirty). Mirrors the DealsTab pattern.
═══════════════════════════════════════════════════════════════════════════ */

const TYPE_OPTIONS = ["image", "logo", "favicon", "icon", "document", "video"];

const UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,application/pdf,video/mp4,video/webm,video/quicktime";

// Filter options for the assets list — first entry is the no-filter sentinel.
const FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  ...TYPE_OPTIONS.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
];

/* Plural noun for the "Library (N foos)" header — keeps the type-filter
 * header readable when a filter is active. */
function pluralForType(type, count) {
  if (type === "all") return count === 1 ? "asset" : "assets";
  // Most types pluralise with simple "s"; "favicon" → "favicons" works too.
  return count === 1 ? type : `${type}s`;
}

/* Infer a sensible default `type` (category) for a new entry. Filename or URL
 * containing "favicon" → favicon, ".pdf" → document, video extensions → video,
 * otherwise default to "image". Users can change this in the dropdown after adding. */
function inferTypeFromFilename(filename) {
  if (!filename) return "image";
  const f = filename.toLowerCase();
  if (f.endsWith(".pdf")) return "document";
  if (f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mov")) return "video";
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
    archived:  f.archived === true,
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

export default function AssetsTab({ onDirtyChange }) {
  const [library, setLibrary]     = useState(null);    // { files: [] }  (favicons live in Pages tab)
  const [original, setOriginal]   = useState(null);
  const [phase, setPhase]         = useState("loading");
  const [error, setError]         = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  // Save-flow progress state — only used during multi-step save (rename cascade)
  const [saveProgress, setSaveProgress] = useState(null); // null | { current, total }
  // Type filter — purely client-side, doesn't affect storage
  const [typeFilter, setTypeFilter] = useState("all");
  // Show archived toggle — when false, archived entries are hidden
  const [showArchived, setShowArchived] = useState(false);

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
      };
      setLibrary(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  /* Detect entries that were renamed (display name changed) AND whose URL
   * points to a /library/ file. These need the cascade-rename endpoint to
   * move the binary + rewrite references before we persist the library. */
  function detectRenames(currentFiles, originalFiles) {
    if (!Array.isArray(currentFiles) || !Array.isArray(originalFiles)) return [];
    const originalById = new Map(originalFiles.map(f => [f.id, f]));
    const renames = [];
    for (const file of currentFiles) {
      const orig = originalById.get(file.id);
      if (!orig) continue; // new entry — no old URL to migrate
      if (orig.name === file.name) continue;
      // Only library-hosted files get the file-rename treatment. External
      // URLs and other paths get their display name updated cosmetically
      // by the regular file-library PUT.
      if (!file.url || !file.url.startsWith("/library/")) continue;
      // Also skip if the URL itself changed (the user edited URL manually)
      // — we'd be renaming against the wrong source path.
      if (orig.url !== file.url) continue;
      renames.push({ id: file.id, oldUrl: orig.url, newName: file.name });
    }
    return renames;
  }

  async function save() {
    if (!library) return;
    setPhase("saving"); setError(""); setSaveProgress(null);

    // ── Step 1: cascade-rename every changed library-hosted entry ──────────
    // Sequential because each rename mutates the same data files; running
    // them in parallel would cause SHA conflicts on the cascade commits.
    const renames = detectRenames(library.files, original?.files || []);
    let workingFiles = library.files;

    if (renames.length > 0) {
      setSaveProgress({ current: 0, total: renames.length });
      for (let i = 0; i < renames.length; i++) {
        const { id, oldUrl, newName } = renames[i];
        setSaveProgress({ current: i + 1, total: renames.length });
        try {
          const r = await fetch("/api/admin/file-rename", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ oldUrl, newName }),
          });
          const body = await r.json().catch(() => ({}));
          if (!r.ok || !body.ok) {
            throw new Error(body.error || `Rename failed (HTTP ${r.status})`);
          }
          // Update local state: swap the URL on this entry to the server's
          // returned newUrl. Keep the rest of the entry intact.
          if (body.newUrl && body.changed) {
            workingFiles = workingFiles.map(f =>
              f.id === id ? { ...f, url: body.newUrl } : f
            );
          }
        } catch (err) {
          // Abort — keep the user's edits in place so they can fix and retry.
          // Apply whatever URL swaps we already did so the user sees them.
          setLibrary(lib => lib ? { ...lib, files: workingFiles } : lib);
          setError(`Rename failed for "${newName}": ${err.message}`);
          setPhase("ready");
          setSaveProgress(null);
          return;
        }
      }
      // Reflect the URL changes locally so the PUT below sees them.
      setLibrary(lib => lib ? { ...lib, files: workingFiles } : lib);
    }

    setSaveProgress(null);

    // ── Step 2: persist the library (display names + any URL swaps) ────────
    // PUT only { files } — the server merges with current favicons[] so any
    // unsaved changes from the Pages tab stay intact. See file-library.js
    // for the partial-merge semantics.
    try {
      const r = await fetch("/api/admin/file-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files: workingFiles }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading asset library…</CenteredMessage>;
  if (phase === "error" && library === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!library) return null;

  const isSaving = phase === "saving";

  // ── Mutations ────────────────────────────────────────────────────────────
  // Uploads commit the binary to the repo immediately (file-upload.js), but
  // the library ENTRY describing it only used to save when the admin clicked
  // the separate Save button below — if that click never happened (tab
  // closed, forgot, error), the file sat in public/library/ with no entry
  // anywhere: no thumbnail in this tab, unusable in AssetPicker. So `addFile`
  // now persists immediately instead of just marking state dirty. On failure
  // the new entry stays in local state (dirty) so the existing Save button
  // is still a working retry path.
  async function addFile(entry) {
    const newEntry = sanitizeFile({
      id:        entry.id || newId(),
      name:      entry.name || "Untitled",
      url:       entry.url || "",
      type:      entry.type || "",
      companies: entry.companies || [],
      source:    entry.source || "url",
      addedAt:   entry.addedAt || new Date().toISOString(),
    });
    const newFiles = [newEntry, ...(library?.files || [])];
    setLibrary(lib => ({ ...lib, files: newFiles }));

    try {
      const r = await fetch("/api/admin/file-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files: newFiles }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      setOriginal(orig => orig ? { ...orig, files: newFiles } : orig);
      setLastSavedAt(new Date());
    } catch (e) {
      setError(`Added "${newEntry.name}" but couldn't auto-save the library entry: ${e.message}. Click Save below to retry.`);
    }
  }
  function updateFile(id, field, value) {
    setLibrary(lib => ({
      ...lib,
      files: lib.files.map(f => f.id === id ? { ...f, [field]: value } : f),
    }));
  }
  // Remove the catalog entry. Both delete modes (library-only and permanent)
  // end here — the row component handles the actual repo-delete API call
  // before invoking us. We just drop the entry from local state and let the
  // dirty indicator nudge the user to Save.
  function deleteFile(id /* , { mode } */) {
    setLibrary(lib => ({
      ...lib,
      files: lib.files.filter(f => f.id !== id),
    }));
  }

  // Soft-delete: toggle archived flag on an entry. Restore is just the same
  // function with archived = false. The entry stays in the library array; it
  // is hidden from pickers and from the default grid view.
  function archiveFile(id, archived) {
    setLibrary(lib => ({
      ...lib,
      files: lib.files.map(f => f.id === id ? { ...f, archived } : f),
    }));
  }

  // Sort newest first, then apply the type filter and archived filter (client-side only)
  const sortedFiles = library.files
    .slice()
    .sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
  const activeFiles   = sortedFiles.filter(f => !f.archived);
  const archivedFiles = sortedFiles.filter(f => f.archived);
  // Files shown in the grid depend on the showArchived toggle
  const filteredBase  = showArchived ? sortedFiles : activeFiles;
  const displayFiles  = typeFilter === "all"
    ? filteredBase
    : filteredBase.filter(f => f.type === typeFilter);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>
      {/* Section header — sticky so the Save button stays visible while the
          user scrolls through the asset grid. The Admin shell's top bar is also
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
          Assets
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: dirty ? "#7a5c00" : INK_60, fontWeight: dirty ? 700 : 400 }}>
          {isSaving && saveProgress && `Renaming: ${saveProgress.current} of ${saveProgress.total}…`}
          {isSaving && !saveProgress && "Saving…"}
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

      <ErrorBanner>{error}</ErrorBanner>

      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1.5rem" }}>
        Centralised library of logos, icons, images, documents, and videos.
        Upload an asset (commits to <code>public/library/</code>) or paste any URL.
        Renaming an entry will rename the underlying file and update every reference
        across data files.
      </p>

      {/* ── Section 1: Add new asset ────────────────────────────────────── */}
      <AddFileSection onAdd={addFile} />

      {/* ── Section 2: Asset list ───────────────────────────────────────── */}
      <FileGrid
        files={displayFiles}
        activeCount={activeFiles.length}
        archivedCount={archivedFiles.length}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
        onUpdate={updateFile}
        onDelete={deleteFile}
        onArchive={archiveFile}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 1 — Add new asset (upload or by URL)
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
        Add an asset
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
        PNG, JPEG, WebP, GIF, SVG, ICO, PDF, MP4, WebM, or MOV. Max 50 MB. File is committed to <code>public/library/</code>.
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
   Section 2 — Asset list (rows + filter header)

   Header row: "Library (N foos — newest first)" on the left, the type filter
   (and a placeholder for a future search input) on the right. The header sits
   in a flex container so a search box can drop in next to the filter later
   without re-laying-out the whole header.

   Each row matches the "As Seen In" Logos pattern from BioTab — compact
   one-row-per-file with thumbnail, name, type, URL, companies (only when
   type === "logo"), and copy/replace/delete actions.
═══════════════════════════════════════════════════════════════════════════ */
function FileGrid({
  files, activeCount, archivedCount,
  typeFilter, onTypeFilterChange,
  showArchived, onShowArchivedChange,
  onUpdate, onDelete, onArchive,
}) {
  const filtering = typeFilter !== "all";
  // The "count" noun is based on what we're showing
  const visibleActiveCount = showArchived
    ? files.filter(f => !f.archived).length
    : files.length;
  const visibleArchivedCount = showArchived
    ? files.filter(f => f.archived).length
    : 0;
  const noun = pluralForType(typeFilter, filtering ? visibleActiveCount : activeCount);

  // Build the header label
  let countLabel;
  if (showArchived) {
    if (filtering) {
      countLabel = `${visibleActiveCount} active + ${visibleArchivedCount} archived ${noun}`;
    } else {
      countLabel = `${activeCount} active + ${archivedCount} archived files`;
    }
  } else {
    if (filtering) {
      countLabel = `${visibleActiveCount} of ${activeCount} active ${noun}`;
    } else {
      countLabel = `${activeCount} active file${activeCount === 1 ? "" : "s"} — newest first`;
    }
  }

  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* Filter + count header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        flexWrap: "wrap", marginBottom: "0.6rem",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, flex: 1 }}>
          Library{" "}
          <span style={{ fontWeight: 400 }}>({countLabel})</span>
        </div>
        {/* Right-aligned filter controls */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Show archived checkbox */}
          <label style={{
            display: "flex", alignItems: "center", gap: "0.35rem",
            fontSize: "0.8rem", color: INK_60, cursor: "pointer", userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => onShowArchivedChange(e.target.checked)}
              style={{ cursor: "pointer", accentColor: NEON }}
            />
            Show archived
            {archivedCount > 0 && (
              <span style={{
                background: "#e0e0e0", color: INK, borderRadius: 10,
                padding: "0 6px", fontSize: "0.72rem", fontWeight: 700,
              }}>
                {archivedCount}
              </span>
            )}
          </label>
          <select
            value={typeFilter}
            onChange={e => onTypeFilterChange(e.target.value)}
            style={filterSelectStyle}
            title="Filter by asset type"
          >
            {FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {files.length === 0 ? (
        <div style={{
          padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`,
          color: INK_60, textAlign: "center", fontSize: "0.88rem",
        }}>
          {filtering
            ? `No ${noun} in the library yet. Try a different filter or upload one above.`
            : showArchived
              ? "No archived assets."
              : "No assets yet. Upload one or paste a URL above to get started."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {files.map(file => (
            <FileRow
              key={file.id}
              file={file}
              onUpdate={(field, value) => onUpdate(file.id, field, value)}
              onDelete={(opts) => onDelete(file.id, opts)}
              onArchive={(archived) => onArchive(file.id, archived)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ file, onUpdate, onDelete, onArchive }) {
  const [nameDraft,      setNameDraft]      = useState(file.name);
  const [urlDraft,       setUrlDraft]       = useState(file.url);
  const [companiesDraft, setCompaniesDraft] = useState((file.companies || []).join(", "));
  const [copied,         setCopied]         = useState(false);
  const [replacing,      setReplacing]      = useState(false);
  const [replaceError,   setReplaceError]   = useState("");
  const replaceInputRef                     = useRef(null);

  // ── Delete-confirmation state (inline expand) ────────────────────────────
  // States: null | "loading" | "ready" | "deleting" | "error"
  //   loading    — dry-run in flight
  //   ready      — dry-run came back, show buttons
  //   deleting   — permanent delete in flight
  //   error      — some step blew up; show msg + a "Cancel" button
  const [delPhase,      setDelPhase]      = useState(null);
  const [delReferences, setDelReferences] = useState([]); // [{file, matches:[]}]
  const [delError,      setDelError]      = useState("");
  // delConfirming: true when user clicked "Delete permanently" with references
  // (cascade path) — requires a second click to confirm.
  const [delConfirming, setDelConfirming] = useState(false);
  // isExternal: external URL (https://…) — we can't delete from repo, only from library
  const isExternal = /^https?:\/\//i.test(file.url);
  // Map the public URL ("/library/foo.png", "/logo.png") → repo path
  // ("public/library/foo.png", "public/logo.png"). Any file under public/ that
  // appears in the library can be permanently deleted.
  const repoPath = !isExternal && file.url.startsWith("/")
    ? "public" + file.url.split("?")[0].split("#")[0]
    : "";

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
    if (f.size > 5 * 1024 * 1024) {
      setReplaceError("File too large — max 5 MB.");
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

  // Open the delete-confirm panel. For local /library/ files we kick off a
  // dry-run to find references; for external URLs (and other non-library
  // paths) we skip the scan since there's nothing to delete from the repo.
  async function openDeleteConfirm() {
    setDelError("");
    setDelReferences([]);
    if (isExternal || !repoPath) {
      // No repo file to scan / delete — show a simple "remove from library" prompt
      setDelPhase("ready");
      return;
    }
    setDelPhase("loading");
    try {
      const r = await fetch("/api/admin/file-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: file.url, repoPath, dryRun: true }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setDelReferences(Array.isArray(body.references) ? body.references : []);
      setDelPhase("ready");
    } catch (err) {
      setDelError(err.message || "Failed to check references");
      setDelPhase("error");
    }
  }

  function cancelDelete() {
    setDelPhase(null);
    setDelReferences([]);
    setDelError("");
    setDelConfirming(false);
  }

  function _removeFromLibrary() {
    // Local state only — caller marks library dirty so the save commits.
    onDelete({ mode: "library-only" });
    cancelDelete();
  }

  async function deletePermanently(cascade = false) {
    if (!repoPath) return;
    setDelError("");
    setDelConfirming(false);
    setDelPhase("deleting");
    try {
      const r = await fetch("/api/admin/file-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: file.url, repoPath, ...(cascade ? { cascade: true } : {}) }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      onDelete({ mode: "permanent" });
      cancelDelete();
    } catch (err) {
      setDelError(err.message || "Delete failed");
      setDelPhase("error");
    }
  }

  const isLogo     = file.type === "logo";
  const isArchived = file.archived === true;

  // For archived rows we show a simplified view with Restore + Delete permanently
  if (isArchived) {
    return (
      <div
        style={{
          display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap",
          opacity: 0.6, position: "relative",
        }}
        className="file-row"
      >
        {/* Archived badge */}
        <div style={{
          position: "absolute", top: 2, left: 2,
          background: "#888", color: "#fff",
          fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.08em",
          padding: "1px 5px", pointerEvents: "none", zIndex: 1,
        }}>
          ARCHIVED
        </div>
        {/* Thumbnail */}
        <div style={{
          width: 64, height: 40, flexShrink: 0,
          background: "#F4F5F7", border: `1px solid ${LINE}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {file.url ? (
            file.type === "document" || /\.pdf($|\?)/i.test(file.url) ? (
              <span style={{ fontSize: "0.62rem", fontWeight: 800, color: INK_60, textTransform: "uppercase" }}>PDF</span>
            ) : /\.(mp4|webm|mov)($|\?)/i.test(file.url) ? (
              <span style={{ fontSize: "0.62rem", fontWeight: 800, color: INK_60, textTransform: "uppercase" }}>VIDEO</span>
            ) : (
              <img
                src={file.url}
                alt={file.name || "preview"}
                style={{ maxWidth: 58, maxHeight: 34, objectFit: "contain", display: "block" }}
                onError={e => { e.currentTarget.style.opacity = "0.25"; }}
              />
            )
          ) : (
            <span style={{ fontSize: "0.62rem", color: INK_60 }}>no url</span>
          )}
        </div>
        {/* Name (read-only in archived state) */}
        <span style={{ fontSize: "0.85rem", color: INK, fontFamily: FONT, width: 180, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name || "Untitled"}
        </span>
        <span style={{ fontSize: "0.78rem", color: INK_60, width: 110, flexShrink: 0 }}>{file.type}</span>
        <span style={{ fontSize: "0.78rem", color: INK_60, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.url}</span>

        {/* Archived-row actions */}
        <button
          type="button"
          onClick={() => onArchive(false)}
          style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.35rem 0.75rem", fontWeight: 700 }}
        >
          Restore
        </button>
        <button
          type="button"
          onClick={openDeleteConfirm}
          disabled={delPhase === "loading" || delPhase === "deleting"}
          style={{
            background: "#c44", border: "none", color: "#fff",
            padding: "0.35rem 0.75rem", fontFamily: FONT, fontSize: "0.78rem",
            fontWeight: 700, borderRadius: 0, letterSpacing: "0.02em",
            opacity: (delPhase === "loading" || delPhase === "deleting") ? 0.6 : 1,
            cursor: (delPhase === "loading" || delPhase === "deleting") ? "wait" : "pointer",
          }}
        >
          Delete permanently
        </button>

        {delPhase && (
          <DeleteConfirmPanel
            file={file}
            isExternal={isExternal}
            repoPath={repoPath}
            phase={delPhase}
            references={delReferences}
            error={delError}
            confirming={delConfirming}
            onArchive={null}          // archived rows don't get Archive button
            onDeletePermanent={deletePermanently}
            onStartConfirm={() => setDelConfirming(true)}
            onCancel={cancelDelete}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
      className="file-row"
    >
      {/* Thumbnail (image preview for images/logos/favicons, a badge for video/pdf) */}
      <div style={{
        width: 64, height: 40, flexShrink: 0,
        background: "#F4F5F7", border: `1px solid ${LINE}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {file.url ? (
          file.type === "document" || /\.pdf($|\?)/i.test(file.url) ? (
            <span style={{
              fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.04em",
              color: INK_60, textTransform: "uppercase",
            }}>PDF</span>
          ) : /\.(mp4|webm|mov)($|\?)/i.test(file.url) ? (
            <span style={{
              fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.04em",
              color: INK_60, textTransform: "uppercase",
            }}>VIDEO</span>
          ) : (
            <img
              src={file.url}
              alt={file.name || "preview"}
              style={{ maxWidth: 58, maxHeight: 34, objectFit: "contain", display: "block" }}
              onError={e => { e.currentTarget.style.opacity = "0.25"; }}
            />
          )
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
        style={{ ...selectStyle, marginTop: 0, width: 110, flexShrink: 0 }}
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
        onClick={openDeleteConfirm}
        title="Archive or delete this asset"
        disabled={delPhase === "loading" || delPhase === "deleting"}
        style={{
          ...iconBtnStyle(false),
          color: "#c44",
          opacity: (delPhase === "loading" || delPhase === "deleting") ? 0.6 : 1,
          cursor:  (delPhase === "loading" || delPhase === "deleting") ? "wait" : "pointer",
        }}
      >
        ×
      </button>

      {replaceError && (
        <div style={{ flexBasis: "100%", fontSize: "0.72rem", color: "#c44", marginTop: "0.2rem" }}>
          {replaceError}
        </div>
      )}

      {delPhase && (
        <DeleteConfirmPanel
          file={file}
          isExternal={isExternal}
          repoPath={repoPath}
          phase={delPhase}
          references={delReferences}
          error={delError}
          confirming={delConfirming}
          onArchive={() => { onArchive(true); cancelDelete(); }}
          onDeletePermanent={deletePermanently}
          onStartConfirm={() => setDelConfirming(true)}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Inline delete-confirm panel — expands below the FileRow when the user
   clicks ×.

   Active rows offer TWO actions:
     1. Archive   — soft-delete: hides from library + pickers, file stays in
                    repo, entry stays in library.json. Restoreable.
     2. Delete permanently — removes binary from repo + cascades references.

   Archived rows skip to the permanent-delete confirmation immediately (no
   Archive button — that path only makes sense on active rows).

   Renders into the same flex container as the row (flexBasis: 100%) so it
   sits on a new line directly under its row.
═══════════════════════════════════════════════════════════════════════════ */
function DeleteConfirmPanel({
  file, isExternal, repoPath,
  phase, references, error,
  confirming,
  onArchive,           // null for archived rows
  onDeletePermanent, onStartConfirm, onCancel,
}) {
  const loading  = phase === "loading";
  const deleting = phase === "deleting";
  const inUse    = references && references.length > 0;
  // "Delete permanently" is available for any library-hosted file — references
  // no longer block it. External URLs and non-library paths can only be archived.
  const canDeletePermanent = !isExternal && !!repoPath && !loading;

  const refFileNames = inUse
    ? references.map(r => r.file.split("/").pop()).join(", ")
    : "";

  return (
    <div style={{
      flexBasis: "100%",
      marginTop: "0.4rem",
      background: "#fff9e6",
      border: "1px solid #e6c200",
      padding: "0.7rem 0.9rem",
      fontSize: "0.8rem",
      color: INK,
    }}>
      <div style={{ fontWeight: 700, marginBottom: "0.45rem" }}>
        {onArchive ? `Archive or delete "${file.name || "this asset"}"?` : `Delete "${file.name || "this asset"}" permanently?`}
      </div>

      {loading && (
        <p style={{ color: INK_60, margin: 0 }}>Checking for references…</p>
      )}

      {error && (
        <p style={{ color: "#c44", margin: "0 0 0.5rem" }}>{error}</p>
      )}

      {phase !== "loading" && !error && (
        <>
          {onArchive && (
            <p style={{ margin: "0 0 0.5rem", color: INK_60 }}>
              <strong>Archive</strong> hides this asset from the library and pickers, but the file stays
              in the repo. You can restore it later.{" "}
              <strong>Delete permanently</strong> removes the file from the repo and clears all references.
            </p>
          )}
          {!onArchive && !isExternal && repoPath && !inUse && (
            <p style={{ margin: "0 0 0.5rem", color: INK_60 }}>
              No other files reference this. The file at <code>{repoPath}</code> will be removed from the repo.
            </p>
          )}
          {!onArchive && !isExternal && repoPath && inUse && !confirming && (
            <p style={{ margin: "0 0 0.5rem", color: INK_60 }}>
              <strong>{references.length} data file{references.length === 1 ? "" : "s"}</strong> reference
              this: <strong>{refFileNames}</strong>.{" "}
              <strong>Delete permanently</strong> will remove the file from the repo AND
              clear those references.
            </p>
          )}
          {!onArchive && !isExternal && repoPath && inUse && confirming && (
            <p style={{ margin: "0 0 0.5rem", color: "#c44", fontWeight: 600 }}>
              This will delete the file AND clear {references.length} reference{references.length === 1 ? "" : "s"}
              from: <strong>{refFileNames}</strong>. Click again to confirm.
            </p>
          )}
          {(isExternal || !repoPath) && (
            <p style={{ margin: "0 0 0.5rem", color: INK_60 }}>
              {isExternal
                ? "This is an external URL — the file isn't stored in the repo."
                : "This file's URL can't be mapped to a repo path."}
              {" "}Only Archive is available.
            </p>
          )}
        </>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
        {/* Archive button — only on active rows */}
        {onArchive && (
          <button
            type="button"
            onClick={onArchive}
            disabled={loading || deleting}
            style={{
              ...btnPrimaryStyle, fontSize: "0.78rem", padding: "0.35rem 0.75rem",
              opacity: (loading || deleting) ? 0.6 : 1,
              cursor:  (loading || deleting) ? "wait" : "pointer",
            }}
          >
            Archive
          </button>
        )}
        {/* Delete permanently — only for library-hosted files */}
        {canDeletePermanent && (
          <button
            type="button"
            onClick={
              deleting      ? undefined
              : !inUse      ? () => onDeletePermanent(false)
              : !confirming ? onStartConfirm
              :               () => onDeletePermanent(true)
            }
            disabled={deleting}
            style={{
              background: confirming ? "#8b0000" : "#c44",
              border: "none", color: "#fff",
              padding: "0.4rem 0.85rem", fontFamily: FONT, fontSize: "0.78rem",
              fontWeight: 700, borderRadius: 0, letterSpacing: "0.02em",
              opacity: deleting ? 0.6 : 1,
              cursor: deleting ? "wait" : "pointer",
            }}
          >
            {deleting
              ? "Deleting…"
              : !inUse
                ? "Delete permanently"
                : confirming
                  ? `Confirm — delete file + clear ${references.length} reference${references.length === 1 ? "" : "s"}`
                  : `Delete file + clear ${references.length} reference${references.length === 1 ? "" : "s"}`
            }
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          style={{
            ...btnStyle, fontSize: "0.78rem", padding: "0.35rem 0.75rem",
            opacity: deleting ? 0.6 : 1,
            cursor: deleting ? "wait" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
