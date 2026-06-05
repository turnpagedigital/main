import React, { useState, useEffect, useMemo, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, filterSelectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

const FAQ_PAGE_VALUES = ["home", "ai-copyright", "crypto", "press", "briefings", "contact"];
const FAQ_PAGE_LABELS = {
  "home":         "Home",
  "ai-copyright": "AI Copyright",
  "crypto":       "Locked Crypto",
  "press":        "Press & Publications",
  "briefings":    "Briefings",
  "contact":      "Contact",
};

function blankFaq() {
  return { active: true, q: "", a: "", pages: ["home"], featured: false };
}

function sanitizeFaq(f) {
  return {
    active:   Boolean(f.active),
    q:        typeof f.q === "string" ? f.q : "",
    a:        typeof f.a === "string" ? f.a : (Array.isArray(f.a) ? f.a.join("\n\n") : ""),
    pages:    Array.isArray(f.pages) ? f.pages.filter(p => FAQ_PAGE_VALUES.includes(p)) : [],
    featured: Boolean(f.featured),
  };
}

/* ── CSV helpers ────────────────────────────────────────────────────────────
   Minimal RFC-4180-compatible parser. Handles quoted fields, embedded commas,
   escaped double-quotes (""), and CRLF / LF line endings.                    */

function parseCSVRows(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"')         { inQ = false; }
      else                        { field += c; }
    } else {
      if      (c === '"')                        { inQ = true; }
      else if (c === ',')                        { row.push(field); field = ""; }
      else if (c === '\n' || (c === '\r' && n === '\n')) {
        if (c === '\r') i++;
        row.push(field); field = "";
        if (row.some(f => f !== "")) rows.push(row);
        row = [];
      } else { field += c; }
    }
  }
  row.push(field);
  if (row.some(f => f !== "")) rows.push(row);
  return rows;
}

function csvToFaqs(text) {
  const rows = parseCSVRows(text.trim());
  if (rows.length < 1) return { ok: false, error: "File appears to be empty." };
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const qIdx      = headers.indexOf("question");
  const aIdx      = headers.indexOf("answer");
  const pIdx      = headers.indexOf("pages");
  const activeIdx = headers.indexOf("active");
  if (qIdx === -1) return { ok: false, error: "CSV must have a 'question' column." };
  if (aIdx === -1) return { ok: false, error: "CSV must have an 'answer' column." };

  const imported = [], skipped = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const q = (row[qIdx] || "").trim();
    const a = (row[aIdx] || "").trim();
    if (!q) { skipped.push(`Row ${i + 1}: missing question — skipped`); continue; }
    let pages = ["home"];
    if (pIdx !== -1 && row[pIdx]) {
      const parsed = row[pIdx].split(",").map(p => p.trim().toLowerCase()).filter(p => FAQ_PAGE_VALUES.includes(p));
      if (parsed.length) pages = parsed;
    }
    const active = activeIdx !== -1 && row[activeIdx]
      ? row[activeIdx].trim().toLowerCase() !== "false"
      : true;
    imported.push({ active, q, a, pages });
  }
  return { ok: true, imported, skipped };
}

function faqsToCsvString(faqs) {
  const esc = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const header = "question,answer,pages,active";
  const rows   = faqs.map(f => [
    esc(f.q),
    esc(f.a),
    esc((f.pages || []).join(",")),
    f.active !== false ? "true" : "false",
  ].join(","));
  return [header, ...rows].join("\r\n");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function FAQsTab({ onDirtyChange }) {
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
      const r = await fetch("/api/admin/faqs", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = (body.data.faqs || []).map(sanitizeFaq);
      setItems(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (items === null) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/faqs", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ faqs: items }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading FAQs…</CenteredMessage>;
  if (phase === "error" && items === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (items === null) return null;

  return <FaqsSectionInner
    faqs={items}
    onChangeFaqs={setItems}
    onSave={save}
    dirty={dirty}
    isSaving={phase === "saving"}
    error={error}
    lastSavedAt={lastSavedAt}
  />;
}

function FaqsSectionInner({ faqs, onChangeFaqs, onSave, dirty, isSaving, error, lastSavedAt }) {
  const csvRef    = useRef(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvError,   setCsvError]   = useState("");

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filterActive, setFilterActive] = useState(""); // "" | "true" | "false"
  const [filterPage,   setFilterPage]   = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const isFiltered = !!(filterActive || filterPage || filterSearch);
  const displayFaqs = isFiltered ? faqs.filter(f => {
    if (filterActive === "true"  && !f.active)  return false;
    if (filterActive === "false" &&  f.active)  return false;
    if (filterPage && !(Array.isArray(f.pages) && f.pages.includes(filterPage))) return false;
    if (filterSearch && !f.q.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  }) : faqs;
  function clearFilters() { setFilterActive(""); setFilterPage(""); setFilterSearch(""); }

  // ── CRUD helpers ────────────────────────────────────────────────────────
  function updateFaq(i, field, value) {
    const next = faqs.slice(); next[i] = { ...next[i], [field]: value }; onChangeFaqs(next);
  }
  function moveFaq(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= faqs.length) return;
    const next = faqs.slice(); [next[i], next[j]] = [next[j], next[i]]; onChangeFaqs(next);
  }
  function deleteFaq(i) {
    if (!confirm("Delete this FAQ?")) return;
    onChangeFaqs(faqs.filter((_, idx) => idx !== i));
  }
  function addFaq() { onChangeFaqs([...faqs, blankFaq()]); }

  // ── CSV export ──────────────────────────────────────────────────────────
  function handleExport() {
    downloadText("faqs.csv", faqsToCsvString(faqs));
  }
  function handleTemplateDownload() {
    const sample = [
      { active: true,  q: "How does pricing work?", a: "Competitive auction across our buyer network.", pages: ["home"] },
      { active: false, q: "Sample inactive FAQ",    a: "Set active to false to hide this FAQ.",          pages: ["home", "crypto"] },
    ];
    downloadText("faqs-template.csv", faqsToCsvString(sample));
  }

  // ── CSV import ──────────────────────────────────────────────────────────
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setCsvError("Please select a .csv file."); return;
    }
    setCsvError("");
    const reader = new FileReader();
    reader.onload = ev => {
      const result = csvToFaqs(ev.target.result);
      if (!result.ok) { setCsvError(result.error); return; }
      setCsvPreview(result);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = ""; // reset so same file can be re-selected
  }

  function applyImport(mode) {
    if (!csvPreview) return;
    onChangeFaqs(mode === "replace" ? csvPreview.imported : [...faqs, ...csvPreview.imported]);
    setCsvPreview(null);
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 0" }}>

      {/* ── Section header ────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap",
        marginBottom: "1rem", paddingBottom: "1rem",
        borderBottom: `2px solid ${LINE}`,
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          FAQs
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "Unsaved changes"}
          {!isSaving && !dirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty && !lastSavedAt && "Up to date"}
        </div>

        {/* CSV actions */}
        <button onClick={handleTemplateDownload} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}>
          ↓ Template
        </button>
        <button onClick={handleExport} disabled={faqs.length === 0} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.4rem 0.75rem", opacity: faqs.length === 0 ? 0.4 : 1 }}>
          ↓ Export CSV
        </button>
        <button onClick={() => csvRef.current && csvRef.current.click()} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}>
          ↑ Import CSV
        </button>
        <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFileSelect} />

        <button onClick={onSave} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor: (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving…" : "Save FAQs"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "1rem" }}>
        Use the <strong>Pages</strong> checkboxes to control which pages each FAQ appears on.
        Inactive FAQs are hidden everywhere. Order here = order on the page.
        Use <code style={{ background: "#F4F5F7", padding: "0.1em 0.3em" }}>[link text](https://...)</code> in answers for hyperlinks.
      </p>

      {/* ── CSV import preview ────────────────────────────────────────── */}
      {csvError && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <span>{csvError}</span>
          <button onClick={() => setCsvError("")} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.2rem 0.55rem" }}>✕</button>
        </div>
      )}

      {csvPreview && (
        <div style={{
          background: "#fff", border: `2px solid ${NEON}`,
          padding: "1.2rem", marginBottom: "1.2rem",
        }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.6rem" }}>
            CSV preview — {csvPreview.imported.length} row{csvPreview.imported.length !== 1 ? "s" : ""} ready to import
          </div>

          {/* Skipped rows */}
          {csvPreview.skipped.length > 0 && (
            <div style={{ marginBottom: "0.7rem" }}>
              {csvPreview.skipped.map((msg, i) => (
                <p key={i} style={{ color: "#b45309", fontSize: "0.78rem", margin: "0.15rem 0" }}>⚠ {msg}</p>
              ))}
            </div>
          )}

          {/* Row list */}
          <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: "0.9rem", border: `1px solid ${LINE}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: "#F4F5F7" }}>
                  <th style={{ padding: "0.35rem 0.6rem", textAlign: "left", fontWeight: 700, color: INK_60, borderBottom: `1px solid ${LINE}`, width: "40%" }}>Question</th>
                  <th style={{ padding: "0.35rem 0.6rem", textAlign: "left", fontWeight: 700, color: INK_60, borderBottom: `1px solid ${LINE}`, width: "35%" }}>Answer (preview)</th>
                  <th style={{ padding: "0.35rem 0.6rem", textAlign: "left", fontWeight: 700, color: INK_60, borderBottom: `1px solid ${LINE}` }}>Pages</th>
                  <th style={{ padding: "0.35rem 0.6rem", textAlign: "left", fontWeight: 700, color: INK_60, borderBottom: `1px solid ${LINE}` }}>Active</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.imported.map((f, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${LINE}` }}>
                    <td style={{ padding: "0.3rem 0.6rem", verticalAlign: "top" }}>{f.q.slice(0, 60)}{f.q.length > 60 ? "…" : ""}</td>
                    <td style={{ padding: "0.3rem 0.6rem", color: INK_60, verticalAlign: "top" }}>{f.a.slice(0, 60)}{f.a.length > 60 ? "…" : ""}</td>
                    <td style={{ padding: "0.3rem 0.6rem", color: INK_60, verticalAlign: "top" }}>{(f.pages || []).join(", ") || "—"}</td>
                    <td style={{ padding: "0.3rem 0.6rem", verticalAlign: "top" }}>{f.active ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import action buttons */}
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => applyImport("append")} style={btnPrimaryStyle}>
              + Append to existing ({faqs.length + csvPreview.imported.length} total)
            </button>
            <button
              onClick={() => { if (confirm(`Replace all ${faqs.length} existing FAQs with the ${csvPreview.imported.length} imported rows?`)) applyImport("replace"); }}
              style={{ ...btnStyle, color: "#c44", borderColor: "#f4caca" }}
            >
              Replace all ({csvPreview.imported.length} rows)
            </button>
            <button onClick={() => setCsvPreview(null)} style={btnStyle}>Cancel</button>
            <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: INK_60 }}>
              Hit <strong>Save FAQs</strong> after importing to publish changes.
            </span>
          </div>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap",
        marginBottom: "0.9rem", padding: "0.7rem 0.9rem",
        background: "#fff", border: `1px solid ${LINE}`,
      }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: "0.2rem" }}>Filter</span>
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          style={{ ...filterSelectStyle, minWidth: 110 }}
        >
          <option value="">All status</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <select
          value={filterPage}
          onChange={e => setFilterPage(e.target.value)}
          style={{ ...filterSelectStyle, minWidth: 130 }}
        >
          <option value="">All pages</option>
          {FAQ_PAGE_VALUES.map(v => <option key={v} value={v}>{FAQ_PAGE_LABELS[v]}</option>)}
        </select>
        <input
          type="text"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          placeholder="Search question…"
          style={{ ...inputStyle, padding: "0.3rem 0.55rem", fontSize: "0.82rem", marginTop: 0, minWidth: 160, flex: 1 }}
        />
        {isFiltered && (
          <button onClick={clearFilters} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem", color: "#c44", borderColor: "#f4caca" }}>Clear</button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: INK_60 }}>
          {isFiltered ? `${displayFaqs.length} of ${faqs.length}` : `${faqs.length}`} FAQ{faqs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── FAQ rows ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2.5rem" }}>
        {!isFiltered && (
          <button onClick={addFaq} style={{
            ...btnStyle, background: "transparent", border: `1px dashed ${LINE}`,
            color: INK, padding: "0.7rem", fontWeight: 700,
          }}>
            + Add FAQ
          </button>
        )}

        {displayFaqs.map((faq) => {
          const i = faqs.indexOf(faq);
          return (
          <div key={i} style={{
            background: "#fff", border: `1px solid ${faq.active ? LINE : "#e0e0e0"}`,
            padding: "1.2rem", opacity: faq.active ? 1 : 0.6,
          }}>
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox" checked={Boolean(faq.active)}
                  onChange={e => updateFaq(i, "active", e.target.checked)}
                  style={{ accentColor: NEON, width: 16, height: 16 }}
                />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: faq.active ? "#1a7a1a" : INK_60, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {faq.active ? "Active" : "Inactive"}
                </span>
              </label>
              <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontWeight: 600, marginLeft: "0.5rem" }}>
                {faq.q ? faq.q.slice(0, 80) + (faq.q.length > 80 ? "…" : "") : <em>No question set</em>}
              </div>
              <button onClick={() => moveFaq(i, -1)} disabled={isFiltered || i === 0}               style={iconBtnStyle(isFiltered || i === 0)}              title={isFiltered ? "Clear filters to reorder" : "Move up"}>↑</button>
              <button onClick={() => moveFaq(i, 1)}  disabled={isFiltered || i === faqs.length - 1} style={iconBtnStyle(isFiltered || i === faqs.length - 1)} title={isFiltered ? "Clear filters to reorder" : "Move down"}>↓</button>
              <button onClick={() => deleteFaq(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }} title="Delete">×</button>
            </div>

            {/* Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.7rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Question
                <input type="text" value={faq.q} onChange={e => updateFaq(i, "q", e.target.value)} placeholder="How does pricing work?" style={inputStyle} />
              </label>
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Answer
                <span style={{ fontWeight: 400, marginLeft: "0.4em" }}>
                  — <code style={{ background: "#F4F5F7", padding: "0.1em 0.3em", fontSize: "0.9em" }}>[text](url)</code> for links · blank line = new paragraph
                </span>
                <textarea
                  value={faq.a} onChange={e => updateFaq(i, "a", e.target.value)}
                  rows={4}
                  placeholder={"We run a competitive auction across our buyer network.\n\nLearn more at [our website](https://turnpagedigital.com)."}
                  style={inputStyle}
                />
              </label>
              <div>
                <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.4rem" }}>Show on pages</div>
                <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                  {FAQ_PAGE_VALUES.map(v => {
                    const checked = Array.isArray(faq.pages) && faq.pages.includes(v);
                    return (
                      <label key={v} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.88rem", color: INK, fontWeight: 400 }}>
                        <input
                          type="checkbox" checked={checked}
                          onChange={e => {
                            const cur = Array.isArray(faq.pages) ? faq.pages : [];
                            updateFaq(i, "pages", e.target.checked ? [...cur, v] : cur.filter(x => x !== v));
                          }}
                          style={{ accentColor: NEON, width: 14, height: 14 }}
                        />
                        {FAQ_PAGE_LABELS[v]}
                      </label>
                    );
                  })}
                </div>
                {Array.isArray(faq.pages) && faq.pages.length > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.88rem", color: INK, fontWeight: 400, marginTop: "0.6rem" }}>
                    <input
                      type="checkbox" checked={Boolean(faq.featured)}
                      onChange={e => updateFaq(i, "featured", e.target.checked)}
                      style={{ accentColor: NEON, width: 14, height: 14 }}
                    />
                    <span title="Featured FAQs appear on their pages. Non-featured FAQs only appear on the generic /faq page.">Featured on page</span>
                  </label>
                )}
              </div>
            </div>
          </div>
          );
        })}

        {faqs.length === 0 && !isFiltered && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No FAQs yet. Click "+ Add FAQ" or import a CSV above.
          </div>
        )}
        {isFiltered && displayFaqs.length === 0 && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No FAQs match the current filters.
          </div>
        )}

        <button onClick={addFaq} style={{ ...btnStyle, background: "transparent", border: `1px dashed ${LINE}`, color: INK, padding: "1rem", fontWeight: 700 }}>
          + Add FAQ
        </button>
      </div>
    </div>
  );
}
