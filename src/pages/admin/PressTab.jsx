import React, { useState, useEffect, useMemo, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, filterSelectStyle, formatTime, CenteredMessage } from "./shared.jsx";
import AssetPicker from "../../components/admin/AssetPicker.jsx";

// Default suggestions shown in the datalist dropdowns — user can type anything else
const PRESS_TYPE_SUGGESTIONS   = ["publication", "podcast", "article", "social post", "blog post", "news"];
const PRESS_AUTHOR_SUGGESTIONS = ["Andrew", "Other"];

const PRESS_PAGE_VALUES = ["copyright", "crypto", "litigation", "tariffs", "bankruptcy"];
const PRESS_PAGE_LABELS = {
  "copyright":  "Copyright Claims",
  "crypto":     "Locked Crypto",
  "litigation": "Litigation Claims",
  "tariffs":    "Tariff Refunds",
  "bankruptcy": "Bankruptcy Claims",
};

/* Parse freeform date strings into a sortable timestamp (0 = unknown → bottom) */
function parseDateForSort(str) {
  if (!str) return 0;
  const d = new Date(str);
  if (!isNaN(d)) return d.getTime();
  // "March 2025", "Jan 2026", etc.
  const m = str.match(/([A-Za-z]+)\s+(\d{4})/);
  if (m) { const d2 = new Date(`${m[1]} 1, ${m[2]}`); if (!isNaN(d2)) return d2.getTime(); }
  // "2025" bare year
  const y = str.match(/^(\d{4})$/);
  if (y) return new Date(`${y[1]}-01-01`).getTime();
  return 0;
}

function blankPressItem() {
  return { type: "publication", author: "Other", pages: [], date: "", url: "", logo_url: "", excerpt: "", publication_title: "", piece_title: "", media_url: "", pdf_url: "" };
}

function sanitizePressItem(d) {
  return {
    type:              typeof d.type   === "string" ? d.type   : "publication",
    author:            typeof d.author === "string" ? d.author : "Other",
    pages:             Array.isArray(d.pages) ? d.pages.filter(p => PRESS_PAGE_VALUES.includes(p)) : [],
    date:              typeof d.date              === "string" ? d.date              : "",
    url:               typeof d.url               === "string" ? d.url               : "",
    logo_url:          typeof d.logo_url          === "string" ? d.logo_url          : "",
    excerpt:           typeof d.excerpt           === "string" ? d.excerpt           : "",
    publication_title: typeof d.publication_title === "string" ? d.publication_title : "",
    piece_title:       typeof d.piece_title       === "string" ? d.piece_title       : "",
    media_url:         typeof d.media_url         === "string" ? d.media_url         : "",
    pdf_url:           typeof d.pdf_url           === "string" ? d.pdf_url           : "",
  };
}

export default function PressTab({ onDirtyChange }) {
  const [items, setItems] = useState(null);
  const [original, setOriginal] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const dirty = useMemo(() => {
    if (items === null || original === null) return false;
    return JSON.stringify(items) !== JSON.stringify(original);
  }, [items, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/press", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = (body.data.items || []).map(sanitizePressItem);
      fresh.sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));
      setItems(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (items === null) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/press", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ items }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading press…</CenteredMessage>;
  if (phase === "error" && items === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (items === null) return null;

  return <PressSectionInner
    items={items}
    onChangeItems={setItems}
    onSave={save}
    dirty={dirty}
    isSaving={phase === "saving"}
    error={error}
    lastSavedAt={lastSavedAt}
  />;
}

function PressSectionInner({ items, onChangeItems, onSave, dirty, isSaving, error, lastSavedAt }) {
  const [filterType,   setFilterType]   = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [filterPage,   setFilterPage]   = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Managed option lists — initialised from defaults + any values already in the loaded items
  const [typeOptions, setTypeOptions] = useState(() => {
    const extra = items.map(it => it.type).filter(Boolean)
      .filter(t => !PRESS_TYPE_SUGGESTIONS.includes(t));
    return [...new Set([...PRESS_TYPE_SUGGESTIONS, ...extra])];
  });
  const [authorOptions, setAuthorOptions] = useState(() => {
    const extra = items.map(it => it.author).filter(Boolean)
      .filter(a => !PRESS_AUTHOR_SUGGESTIONS.includes(a));
    return [...new Set([...PRESS_AUTHOR_SUGGESTIONS, ...extra])];
  });

  function addTypeOption(val)    { const v = val.trim(); if (!v) return; setTypeOptions(prev => prev.includes(v) ? prev : [...prev, v]); }
  function removeTypeOption(val) { setTypeOptions(prev => prev.filter(t => t !== val)); }
  function addAuthorOption(val)    { const v = val.trim(); if (!v) return; setAuthorOptions(prev => prev.includes(v) ? prev : [...prev, v]); }
  function removeAuthorOption(val) { setAuthorOptions(prev => prev.filter(a => a !== val)); }

  const isFiltered = !!(filterType || filterAuthor || filterPage || filterSearch);

  // Derive unique type/author values from current items for the filter dropdowns
  const liveTypes   = [...new Set(items.map(it => it.type).filter(Boolean))].sort();
  const liveAuthors = [...new Set(items.map(it => it.author).filter(Boolean))].sort();

  const displayItems = isFiltered ? items.filter(item => {
    if (filterType   && item.type   !== filterType)   return false;
    if (filterAuthor && item.author !== filterAuthor) return false;
    if (filterPage   && !(Array.isArray(item.pages) && item.pages.includes(filterPage))) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!(
        (item.piece_title        || "").toLowerCase().includes(q) ||
        (item.publication_title  || "").toLowerCase().includes(q) ||
        (item.excerpt            || "").toLowerCase().includes(q)
      )) return false;
    }
    return true;
  }) : items;

  function updateItem(i, field, value) {
    const next = items.slice();
    next[i] = { ...next[i], [field]: value };
    onChangeItems(next);
  }
  function moveItem(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChangeItems(next);
  }
  function deleteItem(i) {
    if (!confirm("Delete this press item?")) return;
    onChangeItems(items.filter((_, idx) => idx !== i));
  }
  function addItem() {
    // Insert at the top so the new (undated) item is immediately visible
    onChangeItems([blankPressItem(), ...items]);
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 0" }}>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        marginBottom: "1rem", paddingBottom: "1rem",
        borderBottom: `2px solid ${LINE}`,
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          Press &amp; Publications
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "Unsaved changes"}
          {!isSaving && !dirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty && !lastSavedAt && "Up to date"}
        </div>
        <button onClick={onSave} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor: (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving…" : "Save Press"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap",
        marginBottom: "0.9rem", padding: "0.7rem 0.9rem",
        background: "#fff", border: `1px solid ${LINE}`,
      }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: "0.2rem" }}>
          Filter
        </span>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={filterSelectStyle}>
          <option value="">All types</option>
          {liveTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)} style={filterSelectStyle}>
          <option value="">All authors</option>
          {liveAuthors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterPage} onChange={e => setFilterPage(e.target.value)} style={filterSelectStyle}>
          <option value="">All sub-pages</option>
          {PRESS_PAGE_VALUES.map(v => <option key={v} value={v}>{PRESS_PAGE_LABELS[v]}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search title / outlet / excerpt…"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          style={{
            ...filterSelectStyle,
            flex: "1 1 180px", minWidth: 140,
            fontFamily: "inherit",
          }}
        />
        {isFiltered && (
          <button
            onClick={() => { setFilterType(""); setFilterAuthor(""); setFilterPage(""); setFilterSearch(""); }}
            style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem", color: "#c44", borderColor: "#f4caca" }}
          >
            Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: INK_60 }}>
          {isFiltered ? `${displayItems.length} of ${items.length}` : `${items.length}`} item{items.length !== 1 ? "s" : ""}
          {!isFiltered && <span style={{ color: "rgba(0,0,0,0.3)", marginLeft: "0.4em" }}>· sorted newest first</span>}
        </span>
      </div>

      {/* Option management strips */}
      <div style={{
        background: "#fff", border: `1px solid ${LINE}`,
        padding: "0.65rem 0.9rem", marginBottom: "0.85rem",
        display: "flex", flexDirection: "column", gap: "0.45rem",
      }}>
        <OptionChips label="Types"   options={typeOptions}   onRemove={removeTypeOption} />
        <OptionChips label="Authors" options={authorOptions} onRemove={removeAuthorOption} />
      </div>

      <div style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.75rem" }}>
        <strong>Publications</strong> &amp; <strong>Podcasts</strong> → "In the press" · <strong>Articles</strong> &amp; <strong>Blog posts</strong> → "Articles &amp; Commentary" · <strong>Social posts</strong> → "On the feed" (set Platform field to LinkedIn, X, etc.)
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2.5rem" }}>
        <button onClick={addItem} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "0.7rem", fontWeight: 700,
        }}>
          + Add press item
        </button>

        {displayItems.map((item) => {
          const i = items.indexOf(item);
          return (
          <div key={i} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem" }}>
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: "0.85rem", color: INK_60 }}>
                {item.date ? <span style={{ color: INK, marginRight: "0.4em" }}>{item.date}</span> : null}
                <span style={{ textTransform: "capitalize" }}>{item.type}</span>
                {Array.isArray(item.pages) && item.pages.map(p => (
                  <span key={p} style={{
                    marginLeft: "0.3rem", background: "#0A0A0A", color: NEON,
                    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", padding: "0.1em 0.45em",
                  }}>
                    {PRESS_PAGE_LABELS[p] || p}
                  </span>
                ))}
                {item.publication_title && ` · ${item.publication_title}`}
                {item.piece_title && ` — "${item.piece_title}"`}
              </div>
              {!isFiltered && <>
                <button onClick={() => moveItem(i, -1)} disabled={i === 0}                style={iconBtnStyle(i === 0)}               title="Move up">↑</button>
                <button onClick={() => moveItem(i, 1)}  disabled={i === items.length - 1} style={iconBtnStyle(i === items.length - 1)} title="Move down">↓</button>
              </>}
              <button onClick={() => deleteItem(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }} title="Delete">×</button>
            </div>

            {/* Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }} className="press-item-grid">
              {/* Type */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Type
                <EditableSelect
                  value={item.type}
                  options={typeOptions}
                  onChange={v => updateItem(i, "type", v)}
                  onAddOption={addTypeOption}
                  addPlaceholder="e.g. interview"
                />
              </label>

              {/* Author */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Author <span style={{ fontWeight: 400 }}>("Andrew" → Articles &amp; Commentary · anything else → In the press)</span>
                <EditableSelect
                  value={item.author || ""}
                  options={authorOptions}
                  onChange={v => updateItem(i, "author", v)}
                  onAddOption={addAuthorOption}
                  addPlaceholder="e.g. John Smith"
                />
              </label>

              {/* Sub-page / brand association — multi-select checkboxes */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.4rem" }}>
                  Sub-pages (select all that apply)
                </div>
                <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                  {PRESS_PAGE_VALUES.map(v => {
                    const checked = Array.isArray(item.pages) && item.pages.includes(v);
                    return (
                      <label key={v} style={{
                        display: "flex", alignItems: "center", gap: "0.35rem",
                        cursor: "pointer", fontSize: "0.88rem", color: INK, fontWeight: 400,
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const cur = Array.isArray(item.pages) ? item.pages : [];
                            updateItem(i, "pages", e.target.checked
                              ? [...cur, v]
                              : cur.filter(x => x !== v));
                          }}
                          style={{ accentColor: NEON, width: 14, height: 14 }}
                        />
                        {PRESS_PAGE_LABELS[v]}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Date */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Date (optional, e.g. "March 2025")
                <input
                  type="text"
                  value={item.date}
                  onChange={e => updateItem(i, "date", e.target.value)}
                  placeholder="March 2025"
                  style={inputStyle}
                />
              </label>

              {/* Publication title / platform */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                {item.type === "social post" ? "Platform (e.g. LinkedIn, X, Substack)" : "Publication / outlet name"}
                <input
                  type="text"
                  value={item.publication_title}
                  onChange={e => updateItem(i, "publication_title", e.target.value)}
                  placeholder={item.type === "social post" ? "LinkedIn" : "The Wall Street Journal"}
                  style={inputStyle}
                />
              </label>

              {/* Logo URL (non-social only) */}
              {item.type !== "social post" && (
                <div style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                  Logo URL <span style={{ fontWeight: 400 }}>(optional — paste a link or pick from library)</span>
                  <PressAssetField
                    value={item.logo_url || ""}
                    onChange={val => updateItem(i, "logo_url", val)}
                    assetType="logo"
                    contextCompany={item.publication_title || null}
                    acceptTypes={["logo", "image"]}
                    pickerTitle="Pick an outlet logo"
                    placeholder="https://… or pick →"
                  />
                </div>
              )}

              {/* Piece title */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Title of the piece / headline
                <input
                  type="text"
                  value={item.piece_title}
                  onChange={e => updateItem(i, "piece_title", e.target.value)}
                  placeholder="Andrew Glantz on AI copyright claims"
                  style={inputStyle}
                />
              </label>

              {/* URL */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
                URL (leave blank if not available)
                <input
                  type="text"
                  value={item.url}
                  onChange={e => updateItem(i, "url", e.target.value)}
                  placeholder="https://wsj.com/articles/..."
                  style={inputStyle}
                />
              </label>

              {/* PDF URL — for paywalled articles or document attachments */}
              <div style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
                PDF attachment <span style={{ fontWeight: 400 }}>(optional — for paywalled articles; shows a "Read full PDF" link on the press page)</span>
                <PressAssetField
                  value={item.pdf_url || ""}
                  onChange={val => updateItem(i, "pdf_url", val)}
                  assetType="document"
                  contextCompany={item.publication_title || null}
                  acceptTypes={["document"]}
                  pickerTitle="Pick or upload PDF"
                  placeholder="/library/… or upload a PDF →"
                  isDocument
                />
              </div>

              {/* Excerpt / Abstract */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
                {item.type === "blog post" ? "Abstract / summary (shown on the card below the title)" : "Excerpt / quote (optional — shown as a pull quote on the card)"}
                <textarea
                  value={item.excerpt}
                  onChange={e => updateItem(i, "excerpt", e.target.value)}
                  rows={3}
                  placeholder={item.type === "blog post" ? "2–4 sentence abstract describing what the post covers…" : "Short quote or summary from the article…"}
                  style={inputStyle}
                />
              </label>

              {/* Media URL + upload */}
              <MediaUploadField
                value={item.media_url || ""}
                onChange={val => updateItem(i, "media_url", val)}
                inputStyle={inputStyle}
                contextCompany={item.publication_title || null}
              />
            </div>
          </div>
          );
        })}

        {displayItems.length === 0 && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            {isFiltered ? "No items match the current filters." : "No press items yet. Click \"+ Add press item\" to get started."}
          </div>
        )}

        <button onClick={addItem} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "1rem", fontWeight: 700,
        }}>
          + Add press item
        </button>
      </div>

      <style>{`
        @media (max-width: 540px) {
          .press-item-grid { grid-template-columns: 1fr !important; }
          .press-item-grid label { grid-column: auto !important; }
        }
      `}</style>
    </div>
  );
}

/* ── PressAssetField — URL input + thumbnail + AssetPicker button ──────────
   Used for logo_url and pdf_url in each press item.
   isDocument=true shows a PDF badge instead of img preview.               */
function PressAssetField({ value, onChange, assetType, contextCompany, acceptTypes, pickerTitle, placeholder, isDocument }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div style={{ marginTop: "0.3rem" }}>
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        {/* Thumbnail / doc badge */}
        <div style={{
          width: 64, height: 40, flexShrink: 0,
          background: isDocument ? "#F4F5F7" : "#F4F5F7",
          border: `1px solid ${LINE}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {value ? (
            isDocument ? (
              <span style={{ fontSize: "0.58rem", fontWeight: 800, color: INK_60, textTransform: "uppercase" }}>PDF</span>
            ) : (
              <img
                src={value}
                alt="preview"
                style={{ maxWidth: 60, maxHeight: 36, objectFit: "contain", display: "block" }}
                onError={e => { e.currentTarget.style.opacity = "0.2"; }}
              />
            )
          ) : (
            <span style={{ fontSize: "0.55rem", color: INK_60 }}>—</span>
          )}
        </div>

        {/* URL input */}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        />

        {/* Pick button */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.45rem 0.75rem", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          Pick
        </button>

        {/* Clear */}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ ...iconBtnStyle(false) }}
            title="Clear"
          >×</button>
        )}
      </div>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => { onChange(url); setPickerOpen(false); }}
        defaultType={assetType}
        defaultCompany={contextCompany}
        acceptTypes={acceptTypes}
        title={pickerTitle}
      />
    </div>
  );
}

/* ── Media upload field — URL entry + optional file upload + AssetPicker ─── */
function MediaUploadField({ value, onChange, inputStyle, contextCompany }) {
  const [phase,   setPhase]   = useState("idle"); // idle | uploading | done | error
  const [errMsg,  setErrMsg]  = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = ["video/mp4", "video/webm"].includes(file.type);
    if (!isImage && !isVideo) {
      setErrMsg("Unsupported type. Use JPEG, PNG, WebP, GIF, MP4, or WebM.");
      return;
    }
    if (file.size > 11 * 1024 * 1024) {
      setErrMsg("File too large — max 11 MB. For longer videos paste a YouTube or Vimeo URL instead.");
      return;
    }

    setPhase("uploading");
    setErrMsg("");

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = ev => res(ev.target.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const r = await fetch("/api/admin/press-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: base64, mime_type: file.type, filename: file.name }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");

      onChange(body.url);
      setPhase("done");
    } catch (err) {
      setErrMsg(err.message);
      setPhase("error");
    } finally {
      // reset file input so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.35rem" }}>
        Image or video (optional — shown as a thumbnail below the excerpt)
      </span>

      {/* URL input + upload button + picker row */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setPhase("idle"); setErrMsg(""); }}
          placeholder="Paste a URL (image or YouTube link) — or upload/pick →"
          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        />

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          style={{ display: "none" }}
          onChange={handleFile}
        />

        {/* Pick from library */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            padding: "0 0.75rem", whiteSpace: "nowrap",
            background: "transparent",
            color: INK,
            border: `1px solid ${LINE}`,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Pick
        </button>

        {/* Upload trigger button */}
        <button
          type="button"
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={phase === "uploading"}
          style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            padding: "0 1rem", whiteSpace: "nowrap",
            background: phase === "done" ? "#22c55e" : INK,
            color: "#fff",
            border: "none", cursor: phase === "uploading" ? "wait" : "pointer",
            opacity: phase === "uploading" ? 0.6 : 1,
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          {phase === "uploading" ? "Uploading…" : phase === "done" ? "Uploaded" : "Upload file"}
        </button>
      </div>

      {/* Error */}
      {errMsg && (
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#ef4444", margin: "0.3rem 0 0" }}>
          {errMsg}
        </p>
      )}

      {/* Preview thumbnail if there's a URL */}
      {value && (
        <div style={{ marginTop: "0.5rem" }}>
          {/\.(mp4|webm)$/i.test(value) ? (
            <video src={value} style={{ maxHeight: 80, maxWidth: 160, display: "block", background: "#000" }} />
          ) : (
            <img
              src={value}
              alt=""
              style={{ maxHeight: 80, maxWidth: 160, objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          )}
        </div>
      )}

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => { onChange(url); setPhase("idle"); setPickerOpen(false); }}
        defaultType="image"
        defaultCompany={contextCompany}
        acceptTypes={["image"]}
        title="Pick an image or thumbnail"
      />
    </div>
  );
}

/* A <select> with a sentinel "— Add new… —" option.
   When the sentinel is chosen, an inline text input appears so the user can
   type a new value; confirming adds it to the shared options list via onAddOption. */
function EditableSelect({ value, options, onChange, onAddOption, addPlaceholder = "New value…" }) {
  const [adding, setAdding] = useState(false);
  const [draft,  setDraft]  = useState("");

  function confirm() {
    const v = draft.trim();
    if (v) { onAddOption(v); onChange(v); }
    setAdding(false);
    setDraft("");
  }

  if (adding) {
    return (
      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirm(); } if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
          placeholder={addPlaceholder}
          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        />
        <button type="button" onClick={confirm}
          style={{ ...btnPrimaryStyle, padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}>
          Add
        </button>
        <button type="button" onClick={() => { setAdding(false); setDraft(""); }}
          style={{ ...btnStyle, padding: "0.45rem 0.55rem", fontSize: "0.9rem" }}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === "__add_new__") { setAdding(true); setDraft(""); }
        else onChange(e.target.value);
      }}
      style={{ ...inputStyle, cursor: "pointer" }}
    >
      {options.map(o => (
        <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
      ))}
      <option disabled style={{ color: "#aaa" }}>──────────</option>
      <option value="__add_new__">— Add new… —</option>
    </select>
  );
}

/* Renders a labelled row of removable chips — used to manage the type/author option lists. */
function OptionChips({ label, options, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
      <span style={{
        fontSize: "0.68rem", fontWeight: 700, color: INK_60,
        textTransform: "uppercase", letterSpacing: "0.1em",
        minWidth: "3.8rem", flexShrink: 0,
      }}>
        {label}:
      </span>
      {options.map(o => (
        <span key={o} style={{
          display: "inline-flex", alignItems: "center", gap: "0.2rem",
          background: "#F4F5F7", border: `1px solid ${LINE}`,
          padding: "0.15rem 0.35rem 0.15rem 0.55rem",
          fontFamily: FONT, fontSize: "0.78rem", color: INK,
        }}>
          {o}
          <button
            type="button"
            onClick={() => onRemove(o)}
            title={`Remove "${o}" from list`}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#c44", padding: "0 0.1rem", lineHeight: 1,
              fontSize: "1rem", fontWeight: 700, fontFamily: FONT,
            }}
          >×</button>
        </span>
      ))}
    </div>
  );
}
