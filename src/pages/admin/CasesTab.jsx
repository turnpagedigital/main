import React, { useState, useEffect, useMemo } from "react";
import { FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";

/* CasesTab — manage tracked cases/situations (stored in the briefing repo as
   cases/<slug>.md + cases/data/<slug>.json). A case can be tagged to multiple
   Themes and carries a freeform scan-guidance prompt. Light admin theme. */

// Fallback theme options if /api/admin/themes is unavailable.
const FALLBACK_THEMES = [
  { slug: "rewind-tariffs", display_name: "Tariffs / Trade", emoji: "⚖️" },
  { slug: "llm-class-action", display_name: "LLM / Copyright", emoji: "🤖" },
  { slug: "crypto-insolvency", display_name: "Crypto Insolvency", emoji: "🪙" },
  { slug: "fraud-recovery", display_name: "Ponzi / Fraud Recovery", emoji: "🕵️" },
  { slug: "billion-dollar-class-actions", display_name: "$1B+ Class Actions & Mass Arb", emoji: "💰" },
  { slug: "bankruptcy-creditor-rights", display_name: "Bankruptcy Creditor Rights", emoji: "📜" },
];

const DEFAULT_CASE = {
  slug: "",
  display_name: "",
  type: "case",
  emoji: "⚖️",
  status: "",
  topics: [],
  case: { parties: "", court: "", court_id: "", case_number: "", judge: "" },
  docket_source: { type: "manual", docket_id: null, url: "", awaiting_sync: false },
  claims_administrator: null,
  scan_guidance: "",
};

const card = { background: SURFACE, border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1.2rem" };
const labelStyle = { display: "block", fontSize: "0.74rem", color: INK_60, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 4 };
const sectionH = { fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.9rem", color: INK };

function slugify(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function CasesTab({ onDirtyChange }) {
  const [phase, setPhase] = useState("list");
  const [cases, setCases] = useState([]);
  const [themes, setThemes] = useState(FALLBACK_THEMES);
  const [form, setForm] = useState({ ...DEFAULT_CASE });
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleteSlug, setDeleteSlug] = useState(null);

  useEffect(() => { loadCases(); loadThemes(); }, []);

  const original = useMemo(() => {
    if (isNew) return { ...DEFAULT_CASE };
    return cases.find(c => c.slug === form.slug) || { ...DEFAULT_CASE };
  }, [cases, isNew, form.slug]);

  const dirty = useMemo(
    () => phase === "editor" && JSON.stringify(form) !== JSON.stringify(original),
    [phase, form, original]
  );
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function loadCases() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/cases", { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load cases");
      setCases(data.cases || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadThemes() {
    try {
      const res = await fetch("/api/admin/themes", { credentials: "include" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.themes) && data.themes.length) setThemes(data.themes);
    } catch { /* keep fallback */ }
  }

  function openNew() {
    setForm({ ...DEFAULT_CASE }); setIsNew(true); setPhase("editor"); setError(""); setToast("");
  }
  function openEdit(c) {
    setForm({ ...DEFAULT_CASE, ...JSON.parse(JSON.stringify(c)) });
    setIsNew(false); setPhase("editor"); setError(""); setToast("");
  }
  function closeEditor() {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setPhase("list"); setError(""); onDirtyChange?.(false);
  }

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); }
  function setNested(group, key, value) {
    setForm(prev => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }
  function toggleTheme(slug) {
    setForm(prev => ({
      ...prev,
      topics: prev.topics.includes(slug) ? prev.topics.filter(t => t !== slug) : [...prev.topics, slug],
    }));
  }
  function toggleClaims() {
    setForm(prev => ({
      ...prev,
      claims_administrator: prev.claims_administrator ? null : { name: "", url: "", key_dates_url: "" },
    }));
  }

  function validate() {
    const slug = isNew ? slugify(form.slug || form.display_name) : form.slug;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Slug must be kebab-case";
    if (isNew && cases.some(c => c.slug === slug)) return "A case with that slug already exists";
    if (!form.display_name.trim()) return "Display name is required";
    if (form.topics.length === 0) return "Tag at least one Theme";
    if (!form.case.parties.trim()) return "Parties are required";
    if (!form.case.court.trim()) return "Court is required";
    if (!form.case.case_number.trim()) return "Case number is required";
    if (!form.case.judge.trim()) return "Judge is required";
    if (form.docket_source.type === "courtlistener" && !form.docket_source.docket_id) {
      return "Docket ID is required for a CourtListener docket";
    }
    return null;
  }

  async function save() {
    const v = validate();
    if (v) { setError(v); return; }
    const payload = { ...form, slug: isNew ? slugify(form.slug || form.display_name) : form.slug };
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/cases", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save");
      setToast(`Case ${isNew ? "created" : "updated"}`);
      onDirtyChange?.(false);
      await loadCases();
      setPhase("list");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function doDelete(slug) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/cases?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE", credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to delete");
      setToast("Case deleted"); setDeleteSlug(null);
      await loadCases();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "1.4rem clamp(1rem,3vw,2rem) 3rem" };

  /* ── List view ──────────────────────────────────────────────────────── */
  if (phase === "list") {
    return (
      <div style={{ fontFamily: FONT, color: INK }}>
        <div style={wrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Cases &amp; situations</h2>
              <p style={{ fontSize: "0.85rem", color: INK_60, marginTop: 2 }}>
                Specific matters you track. A case can span multiple Themes and carries its own scan guidance.
              </p>
            </div>
            <button style={btnPrimaryStyle} onClick={openNew} disabled={loading}>+ New case</button>
          </div>

          {error && <Banner kind="error">{error}</Banner>}
          {toast && <Banner kind="ok">{toast}</Banner>}
          {loading && <p style={{ color: INK_60, fontSize: "0.9rem" }}>Loading…</p>}

          {!loading && cases.length === 0 ? (
            <p style={{ color: INK_60 }}>No cases yet. Create one to get started.</p>
          ) : (
            <div style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}>
                    <Th>Case</Th><Th>Status</Th><Th>Themes</Th><Th right>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.slug} style={{ borderBottom: `1px solid ${LINE}` }}>
                      <Td><span style={{ marginRight: 6 }}>{c.emoji}</span>{c.display_name}
                        <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: INK_60 }}>{c.slug}</div></Td>
                      <Td>{c.status || <span style={{ color: INK_60 }}>—</span>}</Td>
                      <Td>{(c.topics || []).map(slug => {
                        const t = themes.find(x => x.slug === slug);
                        return <span key={slug} title={t ? t.display_name : slug} style={{ marginRight: 4 }}>{t ? t.emoji : "🏷️"}</span>;
                      })}</Td>
                      <Td right>
                        <button style={{ ...btnStyle, marginRight: 6 }} onClick={() => openEdit(c)} disabled={loading}>Edit</button>
                        <button style={{ ...btnStyle, color: "#c0392b", borderColor: "#e3b7b1" }} onClick={() => setDeleteSlug(c.slug)} disabled={loading}>Delete</button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {deleteSlug && (
          <Modal>
            <p style={{ marginBottom: "1.1rem" }}>Delete case “<strong>{deleteSlug}</strong>”? This removes its files and can’t be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnPrimaryStyle, background: "#c0392b", color: "#fff" }} onClick={() => doDelete(deleteSlug)} disabled={loading}>Delete</button>
              <button style={btnStyle} onClick={() => setDeleteSlug(null)} disabled={loading}>Cancel</button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  /* ── Editor view ────────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: FONT, color: INK }}>
      <div style={wrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>{isNew ? "New case" : `Edit: ${form.display_name || form.slug}`}</h2>
          <button style={btnStyle} onClick={closeEditor} disabled={loading}>← Back to list</button>
        </div>

        {error && <Banner kind="error">{error}</Banner>}

        {/* Basics */}
        <div style={card}>
          <h3 style={sectionH}>Basics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "0.9rem" }}>
            <div>
              <label style={labelStyle}>Display name *</label>
              <input style={inputStyle} value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="e.g. Bartz v. Anthropic" />
            </div>
            <div>
              <label style={labelStyle}>Emoji</label>
              <input style={inputStyle} value={form.emoji} maxLength={3} onChange={e => set("emoji", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Slug {isNew ? "(auto from name if blank)" : "(fixed)"}</label>
              <input style={{ ...inputStyle, opacity: isNew ? 1 : 0.6 }} value={form.slug} disabled={!isNew} onChange={e => set("slug", e.target.value)} placeholder="bartz-anthropic" />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <input style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)} placeholder="e.g. Settlement — final approval pending" />
            </div>
          </div>
        </div>

        {/* Themes */}
        <div style={card}>
          <h3 style={sectionH}>Themes <span style={{ fontWeight: 500, color: INK_60, fontSize: "0.8rem" }}>(tag one or more)</span></h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {themes.map(t => {
              const on = form.topics.includes(t.slug);
              return (
                <label key={t.slug} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 0.7rem", cursor: "pointer",
                  border: `1px solid ${on ? INK : LINE}`, background: on ? "#F4F5F7" : SURFACE, fontSize: "0.86rem",
                }}>
                  <input type="checkbox" checked={on} onChange={() => toggleTheme(t.slug)} />
                  <span>{t.emoji}</span>{t.display_name}
                </label>
              );
            })}
          </div>
        </div>

        {/* Case details */}
        <div style={card}>
          <h3 style={sectionH}>Case details</h3>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Parties *</label>
            <input style={inputStyle} value={form.case.parties} onChange={e => setNested("case", "parties", e.target.value)} placeholder="e.g. Bartz, et al. v. Anthropic PBC" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "0.9rem" }}>
            <div>
              <label style={labelStyle}>Court *</label>
              <input style={inputStyle} value={form.case.court} onChange={e => setNested("case", "court", e.target.value)} placeholder="e.g. U.S. District Court, N.D. Cal." />
            </div>
            <div>
              <label style={labelStyle}>Court ID</label>
              <input style={inputStyle} value={form.case.court_id} onChange={e => setNested("case", "court_id", e.target.value)} placeholder="e.g. cand" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Case number *</label>
              <input style={inputStyle} value={form.case.case_number} onChange={e => setNested("case", "case_number", e.target.value)} placeholder="e.g. 3:24-cv-05417" />
            </div>
            <div>
              <label style={labelStyle}>Judge *</label>
              <input style={inputStyle} value={form.case.judge} onChange={e => setNested("case", "judge", e.target.value)} placeholder="e.g. Hon. Araceli Martínez-Olguín" />
            </div>
          </div>
        </div>

        {/* Docket source */}
        <div style={card}>
          <h3 style={sectionH}>Docket source</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.9rem" }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={selectStyle} value={form.docket_source.type} onChange={e => setNested("docket_source", "type", e.target.value)}>
                <option value="manual">Manual</option>
                <option value="courtlistener">CourtListener</option>
              </select>
            </div>
            {form.docket_source.type === "courtlistener" && (
              <div>
                <label style={labelStyle}>Docket ID *</label>
                <input style={inputStyle} value={form.docket_source.docket_id || ""} onChange={e => setNested("docket_source", "docket_id", e.target.value || null)} placeholder="e.g. 69058235" />
              </div>
            )}
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Docket URL</label>
            <input style={inputStyle} value={form.docket_source.url} onChange={e => setNested("docket_source", "url", e.target.value)} placeholder="https://www.courtlistener.com/docket/…" />
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.88rem", cursor: "pointer" }}>
            <input type="checkbox" checked={form.docket_source.awaiting_sync} onChange={e => setNested("docket_source", "awaiting_sync", e.target.checked)} />
            Awaiting sync (dormant until docket refresh)
          </label>
        </div>

        {/* Scan guidance (NEW) */}
        <div style={card}>
          <h3 style={sectionH}>Scan guidance</h3>
          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.7rem" }}>
            Freeform instruction that steers the scan for <em>this specific case</em> — what to watch for, what to ignore.
          </p>
          <textarea style={{ ...inputStyle, minHeight: 120 }} value={form.scan_guidance}
            onChange={e => set("scan_guidance", e.target.value)}
            placeholder="e.g. Watch the settlement docket for the final-approval order and any objector appeal to the Ninth Circuit; track the distribution calculation date. Prioritize the claims-administrator site for status." />
        </div>

        {/* Claims administrator (optional) */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={toggleClaims}>
            <h3 style={{ ...sectionH, marginBottom: 0 }}>Claims administrator <span style={{ fontWeight: 500, color: INK_60, fontSize: "0.8rem" }}>(optional)</span></h3>
            <span style={{ fontSize: "1.3rem", color: INK_60 }}>{form.claims_administrator ? "−" : "+"}</span>
          </div>
          {form.claims_administrator && (
            <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.9rem" }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={form.claims_administrator.name} onChange={e => setNested("claims_administrator", "name", e.target.value)} placeholder="e.g. Anthropic Copyright Settlement Administrator" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>URL</label>
                  <input style={inputStyle} value={form.claims_administrator.url} onChange={e => setNested("claims_administrator", "url", e.target.value)} placeholder="https://…" />
                </div>
                <div>
                  <label style={labelStyle}>Key dates URL</label>
                  <input style={inputStyle} value={form.claims_administrator.key_dates_url} onChange={e => setNested("claims_administrator", "key_dates_url", e.target.value)} placeholder="https://…/dates" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...btnPrimaryStyle, opacity: (loading || !dirty) ? 0.5 : 1 }} onClick={save} disabled={loading || !dirty}>
            {loading ? "Saving…" : isNew ? "Create case" : "Save changes"}
          </button>
          <button style={btnStyle} onClick={closeEditor} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── presentational helpers ─────────────────────────────────────────────── */
function Th({ children, right }) {
  return <th style={{ padding: "0.7rem 0.9rem", fontSize: "0.72rem", color: INK_60, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", textAlign: right ? "right" : "left" }}>{children}</th>;
}
function Td({ children, right }) {
  return <td style={{ padding: "0.7rem 0.9rem", textAlign: right ? "right" : "left", verticalAlign: "top" }}>{children}</td>;
}
function Banner({ kind, children }) {
  const ok = kind === "ok";
  return (
    <div style={{
      padding: "0.7rem 0.9rem", marginBottom: "1rem", fontSize: "0.86rem",
      background: ok ? "rgba(26,127,55,0.08)" : "rgba(192,57,43,0.07)",
      border: `1px solid ${ok ? "rgba(26,127,55,0.3)" : "rgba(192,57,43,0.3)"}`,
      color: ok ? "#1a7f37" : "#c0392b",
    }}>{children}</div>
  );
}
function Modal({ children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ background: SURFACE, border: `1px solid ${LINE}`, padding: "1.4rem", maxWidth: 440, fontFamily: FONT, color: INK }}>{children}</div>
    </div>
  );
}
