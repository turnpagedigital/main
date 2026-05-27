import React, { useState, useEffect, useMemo, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   PagesTab — site-level settings that live outside any single page.

   Currently hosts only the per-environment favicon picker (production /
   preview / admin). Future fields (titles, OG defaults, robots directives,
   etc.) will live here too — hence the broader "Pages" name.

   Data architecture: favicons live inside src/data/file-library.json (the
   favicon picker needs the file list to populate its dropdowns, so keeping
   both in one file avoids cross-file fetches). PagesTab fetches the library
   read-only to render dropdowns, but only ever PUTs `{ favicons }`. The
   /api/admin/file-library PUT does a partial merge, so PagesTab and AssetsTab
   can save independently without trampling each other's edits.

   Self-contained: owns its own fetch/save lifecycle and reports dirty state
   via onDirtyChange?.(dirty).
═══════════════════════════════════════════════════════════════════════════ */

const FAVICON_ROWS = [
  { key: "production", label: "Production favicon",   hint: "turnpagedigital.com" },
  { key: "preview",    label: "Preview / dev favicon", hint: "*.pages.dev preview deploys" },
  { key: "admin",      label: "Admin favicon",         hint: "/admin pages (any environment)" },
];

const FAVICON_PICKER_TYPES = ["favicon", "icon", "logo"]; // types eligible for the favicon dropdowns

function sanitizeFavicons(fav) {
  fav = fav || {};
  return {
    production: typeof fav.production === "string" ? fav.production : "",
    preview:    typeof fav.preview    === "string" ? fav.preview    : "",
    admin:      typeof fav.admin      === "string" ? fav.admin      : "",
  };
}

export default function PagesTab({ onDirtyChange }) {
  const [favicons, setFavicons]   = useState(null);    // { production, preview, admin }
  const [original, setOriginal]   = useState(null);
  const [files,    setFiles]      = useState([]);      // read-only — for the dropdowns
  const [phase,    setPhase]      = useState("loading");
  const [error,    setError]      = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const dirty = useMemo(() => {
    if (!favicons || !original) return false;
    return JSON.stringify(favicons) !== JSON.stringify(original);
  }, [favicons, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/file-library", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fav = sanitizeFavicons(body.data.favicons);
      setFavicons(fav);
      setOriginal(JSON.parse(JSON.stringify(fav)));
      setFiles(Array.isArray(body.data.files) ? body.data.files : []);
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (!favicons) return;
    setPhase("saving"); setError("");
    try {
      // PUT only { favicons } — server merges with current files[] so any
      // unsaved changes in AssetsTab stay intact.
      const r = await fetch("/api/admin/file-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ favicons }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
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

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>
      {/* Sticky header bar — matches AssetsTab */}
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
        Pages settings — site-level configuration that lives outside any single page.
        More fields coming soon.
      </p>

      <FaviconSection
        favicons={favicons}
        files={files}
        onSelect={setFavicon}
        onReload={load}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Favicon section — picker for production / preview / admin favicons.

   Sources the eligible-favicon list from the (read-only here) file library.
   Uploads route to /api/admin/file-upload (same endpoint as AssetsTab); after
   a successful upload we trigger a library reload so the new file appears in
   the dropdown, then auto-assign it to whichever row the user uploaded from.
═══════════════════════════════════════════════════════════════════════════ */
function FaviconSection({ favicons, files, onSelect, onReload }) {
  // Eligible favicon files: any entry whose `type` is favicon, icon, or logo.
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
              // After upload, reload the library so the new file shows up in
              // dropdowns, then auto-assign it to this row's environment.
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

      {/* Picker — dropdown + inline upload button */}
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

/* Compact upload button — uploads to /api/admin/file-upload, surfaces the new
   URL via onUploaded. Used for the inline "Upload" button on each favicon row
   so the user doesn't have to round-trip through the Files tab. */
function CompactUpload({ onUploaded, accept, label = "Upload" }) {
  const [phase, setPhase] = useState("idle"); // idle | uploading | done | error
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
        {phase === "uploading" ? "Uploading…" : phase === "done" ? "✓ Uploaded" : label}
      </button>
      {error && <p style={{ color: "#c44", fontSize: "0.75rem", margin: "0.35rem 0 0" }}>{error}</p>}
    </div>
  );
}
