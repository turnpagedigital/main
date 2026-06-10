import React, { useState, useEffect, useMemo, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   StructureFaviconsTab — Favicons only

   Extracted from StructureMetaTab to run as an independent sub-tab.
   Manages its own data fetching, dirty state, and saving.

   Data source:
     - file-library.json  via /api/admin/file-library  (favicons + file list)
═══════════════════════════════════════════════════════════════════════════ */

// ── Constants ───────────────────────────────────────────────────────────
const FAVICON_ROWS = [
  { key: "production", label: "Production favicon",   hint: "turnpagedigital.com" },
  { key: "preview",    label: "Preview / dev favicon", hint: "*.pages.dev preview deploys" },
  { key: "admin",      label: "Admin favicon",         hint: "/admin pages (any environment)" },
];
const FAVICON_PICKER_TYPES = ["favicon", "icon", "logo"];

// ── Sanitizer ───────────────────────────────────────────────────────────
function sanitizeFavicons(fav) {
  fav = fav || {};
  return {
    production: typeof fav.production === "string" ? fav.production : "",
    preview:    typeof fav.preview    === "string" ? fav.preview    : "",
    admin:      typeof fav.admin      === "string" ? fav.admin      : "",
  };
}

// ── Main Component ──────────────────────────────────────────────────────
export default function StructureFaviconsTab({ onDirtyChange }) {
  // ── State ────────────────────────────────────────────────────────────
  const [favicons,         setFavicons]         = useState(null);
  const [originalFavicons, setOriginalFavicons] = useState(null);
  const [files,            setFiles]            = useState([]);

  const [phase,            setPhase]            = useState("loading");
  const [error,            setError]            = useState("");
  const [lastSavedAt,      setLastSavedAt]      = useState(null);

  // ── Dirty flag ───────────────────────────────────────────────────────
  const dirty = useMemo(() => {
    if (!favicons || !originalFavicons) return false;
    return JSON.stringify(favicons) !== JSON.stringify(originalFavicons);
  }, [favicons, originalFavicons]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { load(); }, []);

  // ── Load ─────────────────────────────────────────────────────────────
  async function load() {
    setPhase("loading"); setError("");
    try {
      const libRes = await fetch("/api/admin/file-library", { credentials: "include" });

      if (libRes.status === 401) return;

      const libBody = await libRes.json();

      if (!libRes.ok || !libBody.ok) throw new Error(libBody.error || `HTTP ${libRes.status}`);

      const fav = sanitizeFavicons(libBody.data.favicons);
      setFavicons(fav);
      setOriginalFavicons(JSON.parse(JSON.stringify(fav)));
      setFiles(Array.isArray(libBody.data.files) ? libBody.data.files : []);

      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  // ── Save ─────────────────────────────────────────────────────────────
  async function save() {
    if (!favicons) return;
    setPhase("saving"); setError("");
    try {
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

  // ── Loading / error gates ────────────────────────────────────────────
  if (phase === "loading") return <CenteredMessage>Loading favicons…</CenteredMessage>;
  if (phase === "error" && favicons === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!favicons) return null;

  const isSaving = phase === "saving";

  // ── Helpers ──────────────────────────────────────────────────────────
  function setFavicon(envKey, url) {
    setFavicons(prev => ({ ...prev, [envKey]: url }));
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
          Favicons
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

      {/* Favicons */}
      <SectionHeader>Favicons</SectionHeader>
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
   Section Components
═══════════════════════════════════════════════════════════════════════════ */

function FaviconSection({ favicons, files, onSelect, onReload }) {
  const eligible = useMemo(() => {
    return files.filter(f => FAVICON_PICKER_TYPES.includes(f.type));
  }, [files]);

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Each environment can show a different favicon. Pick from the file library or paste any URL.
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

function FaviconRow({ envKey: _envKey, label, hint, current, eligible, onSelect, onUploaded }) {
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
  }, [current, eligible]);

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
            style={{ ...selectStyle, marginTop: 0, flex: 1 }}
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
