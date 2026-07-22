import React, { useState, useEffect, useMemo } from "react";
import { FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, labelStyle } from "./shared.jsx";

/* CasesTab — manage tracked cases/situations (stored in the briefing repo as
   cases/<slug>.md + cases/data/<slug>.json). A case can be tagged to multiple
   Themes and carries a freeform scan-guidance prompt. Light admin theme. */

const FALLBACK_THEMES = [
  { slug: "rewind-tariffs", display_name: "Tariffs / Trade", emoji: "⚖️" },
  { slug: "llm-class-action", display_name: "LLM / Copyright", emoji: "🤖" },
  { slug: "crypto-insolvency", display_name: "Crypto Insolvency", emoji: "🪙" },
  { slug: "fraud-recovery", display_name: "Ponzi / Fraud Recovery", emoji: "🕵️" },
  { slug: "billion-dollar-class-actions", display_name: "$1B+ Class Actions & Mass Arb", emoji: "💰" },
  { slug: "bankruptcy-creditor-rights", display_name: "Bankruptcy Creditor Rights", emoji: "📜" },
];

const CASE_STATES = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_CASE = {
  slug: "",
  display_name: "",
  type: "case",
  status: "draft",
  topics: [],
  case: { parties: "", court: "", case_number: "", judge: "" },
  docket_source: { type: "courtlistener", docket_id: null, url: "", awaiting_sync: false },
  claims_administrator: null,
  scan_guidance: "",
};

const card = { background: SURFACE, border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1.2rem" };
const sectionH = { fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.9rem", color: INK };
const hint = { fontSize: "0.72rem", color: INK_60, marginTop: 4 };

function slugify(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function deriveClaimsName(url) {
  if (!url) return "";
  try {
    const host = String(url).replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./i, "");
    const parts = host.split(".");
    const sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return sld.replace(/[-_]+/g, " ").trim().split(" ").filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  } catch { return ""; }
}

const STATE_COLORS = { active: "#1a7f37", draft: "#9a6700", archived: INK_60 };

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
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");

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
    setForm({ ...DEFAULT_CASE }); setIsNew(true); setPhase("editor");
    setError(""); setToast(""); setLookupMsg("");
  }
  function openEdit(c) {
    setForm({ ...DEFAULT_CASE, ...JSON.parse(JSON.stringify(c)) });
    setIsNew(false); setPhase("editor"); setError(""); setToast(""); setLookupMsg("");
  }
  function closeEditor() {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setPhase("list"); setError(""); onDirtyChange?.(false);
  }

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); }
  function setNested(group, key, value) {
    setForm(prev => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }
  function setClaims(key, value) {
    setForm(prev => ({
      ...prev,
      claims_administrator: { ...(prev.claims_administrator || { name: "", url: "", key_dates_url: "" }), [key]: value },
    }));
  }
  function setDocketType(type) {
    setForm(prev => {
      const next = { ...prev, docket_source: { ...prev.docket_source, type } };
      if (type === "claims_agent" && !next.claims_administrator) {
        next.claims_administrator = { name: "", url: "", key_dates_url: "" };
      }
      return next;
    });
    setLookupMsg("");
  }
  function toggleTheme(slug) {
    setForm(prev => ({
      ...prev,
      topics: prev.topics.includes(slug) ? prev.topics.filter(t => t !== slug) : [...prev.topics, slug],
    }));
  }
  function toggleClaimsMirror() {
    setForm(prev => ({
      ...prev,
      claims_administrator: prev.claims_administrator ? null : { name: "", url: "", key_dates_url: "" },
    }));
  }

  async function lookupDocket() {
    const id = form.docket_source.docket_id;
    if (!id) { setLookupMsg("Enter a docket ID first."); return; }
    setLookupBusy(true); setLookupMsg("Looking up…");
    try {
      const res = await fetch(`/api/admin/courtlistener-lookup?docket_id=${encodeURIComponent(id)}`, { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Lookup failed");
      setForm(prev => ({
        ...prev,
        case: {
          ...prev.case,
          parties: data.case_name || prev.case.parties,
          court: data.court || prev.case.court,
          case_number: data.docket_number || prev.case.case_number,
          judge: data.judge || prev.case.judge,
        },
        docket_source: { ...prev.docket_source, url: data.docket_url || prev.docket_source.url },
      }));
      setLookupMsg("Filled from CourtListener ✓");
    } catch (e) { setLookupMsg(e.message); }
    finally { setLookupBusy(false); }
  }

  function validate() {
    const slug = isNew ? slugify(form.slug || form.display_name) : form.slug;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Slug must be kebab-case";
    if (isNew && cases.some(c => c.slug === slug)) return "A case with that slug already exists";
    if (!form.display_name.trim()) return "Display name is required";
    if (form.topics.length === 0) return "Tag at least one Theme";
    if (!form.case.parties.trim()) return "Parties are required";
    if (form.docket_source.type === "courtlistener") {
      if (!form.docket_source.docket_id) return "Docket ID is required for a CourtListener docket";
      if (!form.case.court.trim()) return "Court is required";
      if (!form.case.case_number.trim()) return "Case number is required";
      if (!form.case.judge.trim()) return "Judge is required";
    }
    if (form.docket_source.type === "claims_agent") {
      if (!form.claims_administrator || !(form.claims_administrator.url || "").trim()) {
        return "A claims-agent URL is required";
      }
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
  const isCL = form.docket_source.type === "courtlistener";
  const derivedClaimsName = deriveClaimsName(form.claims_administrator && form.claims_administrator.url);

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
                      <Td>{c.display_name}
                        <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: INK_60 }}>{c.slug}</div></Td>
                      <Td><span style={{ color: STATE_COLORS[c.status] || INK_60, fontWeight: 700, textTransform: "capitalize" }}>{c.status || "—"}</span></Td>
                      <Td>{(c.topics || []).map(slug => {
                        const t = themes.find(x => x.slug === slug);
                        return <span key={slug} title={t ? t.display_name : slug} style={{ marginRight: 4 }}>{t ? t.emoji : "🏷️"}</span>;
                      })}</Td>
                      <Td right>
                        {(c.docket_source?.url || c.claims_administrator?.url) && (
                          <a
                            href={c.docket_source?.url || c.claims_administrator?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...btnStyle, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none", marginRight: 6 }}
                          >
                            Docket ↗
                          </a>
                        )}
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
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Display name *</label>
            <input style={inputStyle} value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="e.g. Bartz v. Anthropic" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Slug {isNew ? "(auto from name if blank)" : "(fixed)"}</label>
              <input style={{ ...inputStyle, opacity: isNew ? 1 : 0.6 }} value={form.slug} disabled={!isNew} onChange={e => set("slug", e.target.value)} placeholder="bartz-anthropic" />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={selectStyle} value={form.status} onChange={e => set("status", e.target.value)}>
                {CASE_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
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

        {/* Tracking source */}
        <div style={card}>
          <h3 style={sectionH}>Tracking source</h3>
          <div style={{ maxWidth: 360, marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Source type</label>
            <select style={selectStyle} value={form.docket_source.type} onChange={e => setDocketType(e.target.value)}>
              <option value="courtlistener">Court docket (CourtListener)</option>
              <option value="claims_agent">Claims agent</option>
            </select>
          </div>

          {isCL ? (
            <>
              <label style={labelStyle}>Docket ID *</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <input style={{ ...inputStyle, marginTop: 0 }} value={form.docket_source.docket_id || ""}
                  onChange={e => setNested("docket_source", "docket_id", e.target.value || null)} placeholder="e.g. 69058235" />
                <button type="button" style={btnStyle} onClick={lookupDocket} disabled={lookupBusy}>
                  {lookupBusy ? "Looking…" : "Look up"}
                </button>
              </div>
              <p style={hint}>{lookupMsg || "Enter the CourtListener docket ID and click Look up to auto-fill parties, court, case number, and judge."}</p>
              <div style={{ marginTop: "0.9rem" }}>
                <label style={labelStyle}>Docket URL</label>
                <input style={inputStyle} value={form.docket_source.url} onChange={e => setNested("docket_source", "url", e.target.value)} placeholder="https://www.courtlistener.com/docket/…" />
              </div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.88rem", cursor: "pointer", marginTop: "0.9rem" }}>
                <input type="checkbox" checked={form.docket_source.awaiting_sync} onChange={e => setNested("docket_source", "awaiting_sync", e.target.checked)} />
                Awaiting sync (dormant until docket refresh)
              </label>
            </>
          ) : (
            <>
              <label style={labelStyle}>Claims-agent URL *</label>
              <input style={inputStyle} value={(form.claims_administrator && form.claims_administrator.url) || ""}
                onChange={e => setClaims("url", e.target.value)} placeholder="https://www.examplesettlement.com/" />
              {derivedClaimsName && <p style={hint}>Name (auto from URL): <strong>{derivedClaimsName}</strong></p>}
              <div style={{ marginTop: "0.9rem" }}>
                <label style={labelStyle}>Key dates URL</label>
                <input style={inputStyle} value={(form.claims_administrator && form.claims_administrator.key_dates_url) || ""}
                  onChange={e => setClaims("key_dates_url", e.target.value)} placeholder="https://…/dates" />
              </div>
            </>
          )}
        </div>

        {/* Case details */}
        <div style={card}>
          <h3 style={sectionH}>Case details {!isCL && <span style={{ fontWeight: 500, color: INK_60, fontSize: "0.8rem" }}>(optional for a claims-agent matter)</span>}</h3>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelStyle}>Parties *</label>
            <input style={inputStyle} value={form.case.parties} onChange={e => setNested("case", "parties", e.target.value)} placeholder="e.g. Bartz, et al. v. Anthropic PBC" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Court {isCL && "*"}</label>
              <input style={inputStyle} value={form.case.court} onChange={e => setNested("case", "court", e.target.value)} placeholder="N.D. Cal." />
            </div>
            <div>
              <label style={labelStyle}>Case number {isCL && "*"}</label>
              <input style={inputStyle} value={form.case.case_number} onChange={e => setNested("case", "case_number", e.target.value)} placeholder="3:24-cv-05417" />
            </div>
            <div>
              <label style={labelStyle}>Judge {isCL && "*"}</label>
              <input style={inputStyle} value={form.case.judge} onChange={e => setNested("case", "judge", e.target.value)} placeholder="Hon. …" />
            </div>
          </div>
        </div>

        {/* Scan guidance */}
        <div style={card}>
          <h3 style={sectionH}>Scan guidance</h3>
          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.7rem" }}>
            Freeform instruction that steers the scan for <em>this specific case</em> — what to watch for, what to ignore.
          </p>
          <textarea style={{ ...inputStyle, minHeight: 120 }} value={form.scan_guidance}
            onChange={e => set("scan_guidance", e.target.value)}
            placeholder="e.g. Watch the settlement docket for the final-approval order and any objector appeal to the Ninth Circuit; track the distribution calculation date." />
        </div>

        {/* Optional claims-agent mirror (only when primary source is a court docket) */}
        {isCL && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={toggleClaimsMirror}>
              <h3 style={{ ...sectionH, marginBottom: 0 }}>Claims-agent mirror <span style={{ fontWeight: 500, color: INK_60, fontSize: "0.8rem" }}>(optional)</span></h3>
              <span style={{ fontSize: "1.3rem", color: INK_60 }}>{form.claims_administrator ? "−" : "+"}</span>
            </div>
            {form.claims_administrator && (
              <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.9rem" }}>
                <div>
                  <label style={labelStyle}>Claims-agent URL</label>
                  <input style={inputStyle} value={form.claims_administrator.url} onChange={e => setClaims("url", e.target.value)} placeholder="https://…" />
                  {derivedClaimsName && <p style={hint}>Name (auto from URL): <strong>{derivedClaimsName}</strong></p>}
                </div>
                <div>
                  <label style={labelStyle}>Key dates URL</label>
                  <input style={inputStyle} value={form.claims_administrator.key_dates_url} onChange={e => setClaims("key_dates_url", e.target.value)} placeholder="https://…/dates" />
                </div>
              </div>
            )}
          </div>
        )}

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
