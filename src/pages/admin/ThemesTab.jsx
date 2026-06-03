import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";
import routesData from "../../data/routes.json";

/* ThemesTab — manage the standing "beats" Andrew covers.
   List view + per-theme editor. Saves to /api/admin/themes (themes.json in the
   main repo). Input layer only — nothing triggers scraping yet. */

const SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "manual", label: "Manual only" },
];

// Public pages a theme can publish to (its output home). Excludes utility routes.
const PAGE_OPTIONS = (routesData.routes || []).filter(
  r => !r.dynamic && !["admin", "privacy", "terms", "contact"].includes(r.key)
);

const DEFAULT_THEME = {
  slug: "",
  display_name: "",
  emoji: "⚖️",
  active: true,
  page: null,
  schedule: "daily",
  keywords: [],
  sources: { whitelist: [], blacklist: [] },
  guidance_prompt: "",
};

const card = {
  background: SURFACE, border: `1px solid ${LINE}`,
  padding: "1.2rem", marginBottom: "1.2rem",
};
const labelStyle = {
  display: "block", fontSize: "0.74rem", color: INK_60,
  fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 4,
};
const sectionH = { fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.9rem", color: INK };

function slugify(s) {
  return (s || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function ThemesTab({ onDirtyChange }) {
  const [phase, setPhase] = useState("list"); // list | editor
  const [themes, setThemes] = useState([]);
  const [form, setForm] = useState({ ...DEFAULT_THEME });
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleteSlug, setDeleteSlug] = useState(null);
  const [kwInput, setKwInput] = useState("");

  useEffect(() => { loadThemes(); }, []);

  const original = useMemo(() => {
    if (isNew) return { ...DEFAULT_THEME };
    return themes.find(t => t.slug === form.slug) || { ...DEFAULT_THEME };
  }, [themes, isNew, form.slug]);

  const dirty = useMemo(
    () => phase === "editor" && JSON.stringify(form) !== JSON.stringify(original),
    [phase, form, original]
  );
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function loadThemes() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/themes", { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load themes");
      setThemes(data.themes || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function openNew() {
    setForm({ ...DEFAULT_THEME }); setIsNew(true); setPhase("editor");
    setError(""); setToast(""); setKwInput("");
  }
  function openEdit(theme) {
    setForm(JSON.parse(JSON.stringify(theme))); setIsNew(false); setPhase("editor");
    setError(""); setToast(""); setKwInput("");
  }
  function closeEditor() {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setPhase("list"); setError(""); onDirtyChange?.(false);
  }

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); }
  function setSources(key, value) {
    setForm(prev => ({ ...prev, sources: { ...prev.sources, [key]: value } }));
  }
  function linesToList(text) {
    return text.split("\n").map(s => s.trim()).filter(Boolean);
  }

  function addKeyword() {
    const k = kwInput.trim();
    if (!k) return;
    if (!form.keywords.includes(k)) set("keywords", [...form.keywords, k]);
    setKwInput("");
  }
  function removeKeyword(k) { set("keywords", form.keywords.filter(x => x !== k)); }

  function validate() {
    if (!form.display_name.trim()) return "Display name is required";
    const slug = isNew ? slugify(form.slug || form.display_name) : form.slug;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Slug must be kebab-case";
    if (isNew && themes.some(t => t.slug === slug)) return "A theme with that slug already exists";
    return null;
  }

  async function save() {
    const v = validate();
    if (v) { setError(v); return; }
    const payload = { ...form, slug: isNew ? slugify(form.slug || form.display_name) : form.slug };
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/themes", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save");
      setToast(`Theme ${isNew ? "created" : "updated"}`);
      onDirtyChange?.(false);
      await loadThemes();
      setPhase("list");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function doDelete(slug) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/themes?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE", credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to delete");
      setToast("Theme deleted"); setDeleteSlug(null);
      await loadThemes();
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
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Themes</h2>
              <p style={{ fontSize: "0.85rem", color: INK_60, marginTop: 2 }}>
                The standing beats you track. Settings here will drive scraping &amp; briefings later.
              </p>
            </div>
            <button style={btnPrimaryStyle} onClick={openNew} disabled={loading}>+ New theme</button>
          </div>

          {error && <Banner kind="error">{error}</Banner>}
          {toast && <Banner kind="ok">{toast}</Banner>}
          {loading && <p style={{ color: INK_60, fontSize: "0.9rem" }}>Loading…</p>}

          {!loading && themes.length === 0 ? (
            <p style={{ color: INK_60 }}>No themes yet. Create one to get started.</p>
          ) : (
            <div style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}>
                    <Th>Theme</Th><Th>Slug</Th><Th>Output page</Th><Th>Schedule</Th><Th>Status</Th><Th right>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {themes.map(t => {
                    const page = PAGE_OPTIONS.find(p => p.key === t.page);
                    return (
                      <tr key={t.slug} style={{ borderBottom: `1px solid ${LINE}` }}>
                        <Td><span style={{ marginRight: 6 }}>{t.emoji}</span>{t.display_name}</Td>
                        <Td mono>{t.slug}</Td>
                        <Td>{page ? page.title : <span style={{ color: INK_60 }}>—</span>}</Td>
                        <Td style={{ textTransform: "capitalize" }}>{t.schedule}</Td>
                        <Td>{t.active
                          ? <span style={{ color: "#1a7f37", fontWeight: 700 }}>Active</span>
                          : <span style={{ color: INK_60 }}>Paused</span>}</Td>
                        <Td right>
                          <button style={{ ...btnStyle, marginRight: 6 }} onClick={() => openEdit(t)} disabled={loading}>Edit</button>
                          <button style={{ ...btnStyle, color: "#c0392b", borderColor: "#e3b7b1" }} onClick={() => setDeleteSlug(t.slug)} disabled={loading}>Delete</button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {deleteSlug && (
          <Modal>
            <p style={{ marginBottom: "1.1rem" }}>
              Delete theme “<strong>{deleteSlug}</strong>”? Cases tagged to it keep their tag but it
              will no longer appear here. This can’t be undone.
            </p>
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
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
            {isNew ? "New theme" : `Edit: ${form.display_name || form.slug}`}
          </h2>
          <button style={btnStyle} onClick={closeEditor} disabled={loading}>← Back to list</button>
        </div>

        {error && <Banner kind="error">{error}</Banner>}

        {/* Basics */}
        <div style={card}>
          <h3 style={sectionH}>Basics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "0.9rem" }}>
            <div>
              <label style={labelStyle}>Display name *</label>
              <input style={inputStyle} value={form.display_name}
                onChange={e => set("display_name", e.target.value)} placeholder="e.g. LLM / Copyright" />
            </div>
            <div>
              <label style={labelStyle}>Emoji</label>
              <input style={inputStyle} value={form.emoji} maxLength={3}
                onChange={e => set("emoji", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Slug {isNew ? "(auto from name if blank)" : "(fixed)"}</label>
              <input style={{ ...inputStyle, opacity: isNew ? 1 : 0.6 }} value={form.slug}
                disabled={!isNew}
                onChange={e => set("slug", e.target.value)} placeholder="llm-class-action" />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)} />
                {form.active ? "Active" : "Paused"}
              </label>
            </div>
          </div>
        </div>

        {/* Output + schedule */}
        <div style={card}>
          <h3 style={sectionH}>Output &amp; schedule</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Linked public page (output home)</label>
              <select style={selectStyle} value={form.page || ""}
                onChange={e => set("page", e.target.value || null)}>
                <option value="">— None yet —</option>
                {PAGE_OPTIONS.map(p => <option key={p.key} value={p.key}>{p.title} ({p.path})</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Schedule</label>
              <select style={selectStyle} value={form.schedule}
                onChange={e => set("schedule", e.target.value)}>
                {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <p style={{ fontSize: "0.72rem", color: INK_60, marginTop: 4 }}>Stored only — nothing runs on this yet.</p>
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div style={card}>
          <h3 style={sectionH}>Search keywords / phrases</h3>
          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.7rem" }}>
            What Claude will search the news for. Press Enter or “Add” to add each phrase.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: "0.8rem" }}>
            <input style={{ ...inputStyle, marginTop: 0 }} value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
              placeholder="e.g. Bartz Anthropic settlement" />
            <button style={btnStyle} onClick={addKeyword} type="button">Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {form.keywords.length === 0 && <span style={{ color: INK_60, fontSize: "0.85rem" }}>No keywords yet.</span>}
            {form.keywords.map(k => (
              <span key={k} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#F4F5F7", border: `1px solid ${LINE}`, padding: "0.3rem 0.5rem", fontSize: "0.82rem",
              }}>
                {k}
                <button onClick={() => removeKeyword(k)} type="button"
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: INK_60, fontWeight: 700, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Sources */}
        <div style={card}>
          <h3 style={sectionH}>Trusted &amp; blocked sources</h3>
          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.7rem" }}>One domain per line (e.g. <code>reuters.com</code>).</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Trusted (whitelist)</label>
              <textarea style={{ ...inputStyle, minHeight: 150, fontFamily: "monospace", fontSize: "0.8rem" }}
                value={form.sources.whitelist.join("\n")}
                onChange={e => setSources("whitelist", linesToList(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Blocked (blacklist)</label>
              <textarea style={{ ...inputStyle, minHeight: 150, fontFamily: "monospace", fontSize: "0.8rem" }}
                value={form.sources.blacklist.join("\n")}
                onChange={e => setSources("blacklist", linesToList(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Guidance */}
        <div style={card}>
          <h3 style={sectionH}>Guidance prompt</h3>
          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.7rem" }}>
            Freeform instruction for how Claude should approach this beat (angle, what matters, what to ignore).
          </p>
          <textarea style={{ ...inputStyle, minHeight: 120 }} value={form.guidance_prompt}
            onChange={e => set("guidance_prompt", e.target.value)}
            placeholder="e.g. Focus on settlement mechanics, claims administration, and appellate risk. Prioritize primary docket activity over secondary commentary." />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...btnPrimaryStyle, opacity: (loading || !dirty) ? 0.5 : 1 }}
            onClick={save} disabled={loading || !dirty}>
            {loading ? "Saving…" : isNew ? "Create theme" : "Save changes"}
          </button>
          <button style={btnStyle} onClick={closeEditor} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── small presentational helpers ───────────────────────────────────────── */
function Th({ children, right }) {
  return <th style={{ padding: "0.7rem 0.9rem", fontSize: "0.72rem", color: INK_60, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", textAlign: right ? "right" : "left" }}>{children}</th>;
}
function Td({ children, right, mono, style }) {
  return <td style={{ padding: "0.7rem 0.9rem", textAlign: right ? "right" : "left", fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? "0.8rem" : "inherit", ...style }}>{children}</td>;
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
      <div style={{ background: SURFACE, border: `1px solid ${LINE}`, padding: "1.4rem", maxWidth: 440, fontFamily: FONT, color: INK }}>
        {children}
      </div>
    </div>
  );
}
