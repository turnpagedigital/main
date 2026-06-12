import React, { useState, useEffect, useMemo } from "react";
import { FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";

/* SectionTypesTab — the registered section-type library. The human-facing
   NAME of each type is editable here (saved to section-types.json); the stable
   id and the renderer itself are code. Adding a NEW visual type needs a deploy. */

const DATA_SOURCE_DESCRIPTIONS = {
  "inline":             "Content stored in the page layout (editable in Page Builder)",
  "shared:situations":  "Reads from Home Content → Situations",
  "shared:bio":         "Reads from Content → Bio",
  "shared:deals":       "Reads from Content → Deals (filtered per page)",
  "shared:testimonials":"Reads from Content → Testimonials (filtered per page)",
  "shared:faq":         "Reads from Content → FAQs (filtered per page)",
  "page:audienceCards": "Reads from Pages → Marketing Pages for this page",
  "page:serviceCards":  "Reads from Pages → Marketing Pages for this page",
  "page:comparison":    "Reads from Pages → Marketing Pages for this page",
  "page:howItWorks":    "Reads from Pages → Marketing Pages for this page",
  "page:damagesData":   "Reads from Pages → Marketing Pages for this page",
};

export default function SectionTypesTab({ onDirtyChange }) {
  const [types, setTypes] = useState([]);      // original (server) order + fields
  const [names, setNames] = useState({});       // edited displayName by id
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function load() {
    setLoading(true); setError("");
    fetch("/api/admin/section-types", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const list = data.sectionTypes || [];
          setTypes(list);
          setNames(Object.fromEntries(list.map(t => [t.id, t.displayName || ""])));
        } else setError(data.error || "Failed to load");
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  // Which ids have a changed (non-empty) name vs what the server last returned.
  const changedIds = useMemo(
    () => types.filter(t => (names[t.id] ?? "").trim() && (names[t.id] ?? "").trim() !== (t.displayName || "")).map(t => t.id),
    [types, names]
  );
  const dirty = changedIds.length > 0;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  function setName(id, value) {
    setNames(prev => ({ ...prev, [id]: value }));
    setToast("");
  }

  async function save() {
    // Only send changed ids; trim values.
    const payload = {};
    changedIds.forEach(id => { payload[id] = names[id].trim(); });
    setSaving(true); setError(""); setToast("");
    try {
      const r = await fetch("/api/admin/section-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ names: payload }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) throw new Error(data.error || "Save failed");
      setToast(`Saved ${data.changed ?? changedIds.length} name${(data.changed ?? changedIds.length) === 1 ? "" : "s"}.`);
      onDirtyChange?.(false);
      load(); // reload so original baseline matches the saved file
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  function reset() {
    setNames(Object.fromEntries(types.map(t => [t.id, t.displayName || ""])));
    setError(""); setToast("");
  }

  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "1.4rem clamp(1rem,3vw,2rem) 3rem" };

  return (
    <div style={{ fontFamily: FONT, color: INK }}>
      <div style={wrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1.2rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Section Types</h2>
            <p style={{ fontSize: "0.85rem", color: INK_60, marginTop: 2 }}>
              Rename the section types shown in the Page Builder. The id and the renderer are code —
              adding a new visual type still requires a deploy.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {dirty && <button style={btnStyle} onClick={reset} disabled={saving}>Reset</button>}
            <button
              style={{ ...btnPrimaryStyle, opacity: (saving || !dirty) ? 0.5 : 1 }}
              onClick={save} disabled={saving || !dirty}
            >
              {saving ? "Saving…" : dirty ? `Save ${changedIds.length} change${changedIds.length === 1 ? "" : "s"}` : "Saved"}
            </button>
          </div>
        </div>

        {error && <div style={{ padding: "0.7rem", color: "#c0392b", background: "rgba(192,57,43,0.07)", marginBottom: "1rem" }}>{error}</div>}
        {toast && <div style={{ padding: "0.7rem", color: "#1a7f37", background: "rgba(26,127,55,0.08)", border: "1px solid rgba(26,127,55,0.3)", marginBottom: "1rem", fontSize: "0.86rem" }}>{toast}</div>}
        {loading && <p style={{ color: INK_60 }}>Loading…</p>}

        <div style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
          {types.map((t, i) => {
            const edited = (names[t.id] ?? "").trim() && (names[t.id] ?? "").trim() !== (t.displayName || "");
            return (
              <div key={t.id} style={{
                display: "grid", gridTemplateColumns: "240px 1fr auto",
                gap: "1rem", padding: "0.85rem 1rem", alignItems: "start",
                borderBottom: i < types.length - 1 ? `1px solid ${LINE}` : "none",
              }}>
                <div>
                  <input
                    style={{ ...inputStyle, marginTop: 0, fontWeight: 700, fontSize: "0.9rem",
                      borderColor: edited ? "#1a7f37" : LINE }}
                    value={names[t.id] ?? ""}
                    onChange={e => setName(t.id, e.target.value)}
                    aria-label={`Name for ${t.id}`}
                  />
                  <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: INK_60, marginTop: 4 }}>{t.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", color: INK }}>{t.description}</div>
                  <div style={{ fontSize: "0.78rem", color: INK_60, marginTop: 3 }}>
                    {DATA_SOURCE_DESCRIPTIONS[t.dataSource] || t.dataSource}
                  </div>
                </div>
                <div style={{
                  fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem",
                  background: t.dataSource === "inline" ? "rgba(212,255,0,0.15)" : "rgba(10,10,10,0.05)",
                  color: t.dataSource === "inline" ? "#556200" : INK_60,
                  whiteSpace: "nowrap", alignSelf: "center",
                }}>
                  {t.dataSource === "inline" ? "Editable" : "Data-driven"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
