import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";
import AssetPicker from "../../components/admin/AssetPicker.jsx";

const FIELD_DEFS = [
  { key: "amt",     label: "Amount",       type: "text",     placeholder: "$270M" },
  { key: "who",     label: "Counterparty", type: "text",     placeholder: "FTX" },
  { key: "type",    label: "Claim type",   type: "text",     placeholder: "Disputed-Ownership Claim" },
  { key: "form",    label: "Form",         type: "text",     placeholder: "Advisory" },
  { key: "when",    label: "When",         type: "text",     placeholder: "Oct 2024 – Aug 2025" },
  { key: "summary",    label: "Summary (back of flip card — leave empty to disable flip)", type: "textarea", placeholder: "Optional 2-4 sentence description." },
  { key: "case_study", label: "Case study (optional — opens a full modal when the card is clicked)", type: "textarea", placeholder: "Full narrative of the deal, strategy, outcome…" },
];

const PAGES = [
  { key: "home",         label: "Home" },
  { key: "crypto",       label: "Crypto" },
  { key: "ai-copyright", label: "AI Copyright" },
];

function blankDeal() {
  return { amt: "", who: "", type: "", form: "", when: "", summary: "", case_study: "", pages: [], preTurnpage: false, logos: [] };
}

function sanitize(d) {
  return {
    amt:         typeof d.amt         === "string" ? d.amt         : "",
    who:         typeof d.who         === "string" ? d.who         : "",
    type:        typeof d.type        === "string" ? d.type        : "",
    form:        typeof d.form        === "string" ? d.form        : "",
    when:        typeof d.when        === "string" ? d.when        : "",
    summary:     typeof d.summary     === "string" ? d.summary     : "",
    case_study:  typeof d.case_study  === "string" ? d.case_study  : "",
    pages:       Array.isArray(d.pages) ? d.pages.filter(p => typeof p === "string") : [],
    preTurnpage: Boolean(d.preTurnpage),
    logos:       Array.isArray(d.logos) ? d.logos.filter(l => typeof l === "string").slice(0, 3) : [],
  };
}

export default function DealsTab({ onDirtyChange }) {
  const [deals, setDeals] = useState(null);
  const [original, setOriginal] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const dirty = useMemo(() => {
    if (!deals || !original) return false;
    return JSON.stringify(deals) !== JSON.stringify(original);
  }, [deals, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const r = await fetch("/api/admin/deals", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = { deals: (body.data.deals || []).map(sanitize) };
      setDeals(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (!deals) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/deals", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ deals: deals.deals }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading deals…</CenteredMessage>;
  if (phase === "error" && deals === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!deals) return null;

  const list = deals.deals;
  const isSaving = phase === "saving";

  function updateList(updater) {
    setDeals((d) => ({ ...d, deals: updater(d.deals) }));
  }
  function updateDeal(idx, field, value) {
    updateList((list) => {
      const next = list.slice();
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }
  function moveDeal(idx, dir) {
    updateList((list) => {
      const j = idx + dir;
      if (j < 0 || j >= list.length) return list;
      const next = list.slice();
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function deleteDeal(idx) {
    if (!confirm("Delete this deal?")) return;
    updateList((list) => list.filter((_, i) => i !== idx));
  }
  function addDeal() {
    updateList((list) => [...list, blankDeal()]);
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>
      {/* Deals section header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        marginBottom: "1.5rem", paddingBottom: "1rem",
        borderBottom: `2px solid ${LINE}`,
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          Deals
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "Unsaved changes"}
          {!isSaving && !dirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty && !lastSavedAt && "Up to date"}
        </div>
        <button onClick={save} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor: (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving…" : "Save Deals"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1.5rem" }}>
        {list.length} deal{list.length !== 1 ? "s" : ""} — use the <strong>Pages</strong> checkboxes on each card to control where it appears. Order here = order on each page.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {list.map((deal, i) => (
          <DealRow
            key={i}
            index={i}
            deal={deal}
            onChange={(field, value) => updateDeal(i, field, value)}
            onMoveUp={() => moveDeal(i, -1)}
            onMoveDown={() => moveDeal(i, 1)}
            onDelete={() => deleteDeal(i)}
            isFirst={i === 0}
            isLast={i === list.length - 1}
          />
        ))}
        {list.length === 0 && (
          <div style={{
            padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`,
            color: INK_60, textAlign: "center",
          }}>
            No deals yet.
          </div>
        )}
        <button onClick={addDeal} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "1rem", fontWeight: 700,
        }}>
          + Add deal
        </button>
      </div>
    </div>
  );
}

function DealRow({ index, deal, onChange, onMoveUp, onMoveDown, onDelete, isFirst, isLast }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem", gap: "0.5rem" }}>
        <div style={{ flex: 1, fontWeight: 700, fontSize: "0.85rem", color: INK_60 }}>
          #{index + 1} — {deal.amt || "—"}{deal.who ? ` · ${deal.who}` : ""}
          {deal.pages && deal.pages.length > 0 && (
            <span style={{ marginLeft: "0.5rem", fontWeight: 400 }}>
              [{deal.pages.join(", ")}]
            </span>
          )}
          {deal.preTurnpage && (
            <span style={{ marginLeft: "0.5rem", color: "#888", fontWeight: 400 }}>pre-Turnpage *</span>
          )}
        </div>
        <button onClick={onMoveUp}   disabled={isFirst} style={iconBtnStyle(isFirst)}              title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={isLast}  style={iconBtnStyle(isLast)}               title="Move down">↓</button>
        <button onClick={onDelete}   style={{ ...iconBtnStyle(false), color: "#c44" }}             title="Delete">×</button>
      </div>

      {/* Text fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }}>
        {FIELD_DEFS.map((f) => (
          <label key={f.key} style={{
            display: "block",
            gridColumn: f.type === "textarea" ? "1 / -1" : "auto",
            fontSize: "0.78rem", color: INK_60, fontWeight: 600,
          }}>
            {f.label}
            {f.type === "textarea" ? (
              <textarea
                value={deal[f.key] || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={4}
                style={inputStyle}
              />
            ) : (
              <input
                type="text"
                value={deal[f.key] || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={inputStyle}
              />
            )}
          </label>
        ))}
      </div>

      {/* Pages + Pre-Turnpage */}
      <div style={{
        borderTop: `1px solid ${LINE}`, marginTop: "1rem", paddingTop: "0.9rem",
        display: "flex", flexWrap: "wrap", gap: "1rem 2rem", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: INK_60, marginBottom: "0.4rem" }}>
            Pages
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {PAGES.map((p) => {
              const checked = Array.isArray(deal.pages) && deal.pages.includes(p.key);
              return (
                <label key={p.key} style={{
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  cursor: "pointer", fontSize: "0.88rem", color: INK,
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const cur = Array.isArray(deal.pages) ? deal.pages : [];
                      onChange("pages", e.target.checked
                        ? [...cur, p.key]
                        : cur.filter((x) => x !== p.key));
                    }}
                    style={{ accentColor: NEON, width: 14, height: 14 }}
                  />
                  {p.label}
                </label>
              );
            })}
          </div>
        </div>

        <label style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          cursor: "pointer", fontSize: "0.88rem", color: INK, marginLeft: "auto",
        }}>
          <input
            type="checkbox"
            checked={Boolean(deal.preTurnpage)}
            onChange={(e) => onChange("preTurnpage", e.target.checked)}
            style={{ accentColor: NEON, width: 14, height: 14 }}
          />
          Pre-Turnpage experience
          <span style={{ color: INK_60, fontSize: "0.8rem" }}>(shows * on card)</span>
        </label>
      </div>

      {/* Logos */}
      <div style={{ borderTop: `1px solid ${LINE}`, marginTop: "1rem", paddingTop: "0.9rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: INK_60, marginBottom: "0.6rem" }}>
          Logos <span style={{ fontWeight: 400 }}>(optional — up to 3, shown as white icons on the card)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.7rem 1rem" }} className="deal-logos-grid">
          {[0, 1, 2].map(idx => {
            const url = (Array.isArray(deal.logos) && typeof deal.logos[idx] === "string") ? deal.logos[idx] : "";
            function setLogoSlot(val) {
              const slots = [0, 1, 2].map(i =>
                (Array.isArray(deal.logos) && typeof deal.logos[i] === "string") ? deal.logos[i] : ""
              );
              slots[idx] = val;
              let end = 2;
              while (end > 0 && !slots[end]) end--;
              onChange("logos", slots.slice(0, end + 1).filter((_, i) => i <= end));
            }
            return (
              <DealLogoSlot
                key={idx}
                label={`Logo ${idx + 1}`}
                url={url}
                contextCompany={deal.who || null}
                onChange={setLogoSlot}
              />
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 540px) {
          .deal-logos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── DealLogoSlot — one logo slot with inline picker ──────────────────────── */
function DealLogoSlot({ label, url, contextCompany, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <span style={{ fontSize: "0.75rem", color: INK_60, fontWeight: 600 }}>{label}</span>

      {/* Preview */}
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        <div style={{
          width: 64, height: 40, flexShrink: 0,
          background: "#111", border: `1px solid ${LINE}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {url ? (
            <img
              src={url}
              alt="logo preview"
              style={{ height: 22, maxWidth: 58, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.8, display: "block" }}
              onError={e => { e.currentTarget.style.opacity = "0.15"; }}
            />
          ) : (
            <span style={{ fontSize: "0.55rem", color: "#555" }}>empty</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{ ...btnStyle, fontSize: "0.75rem", padding: "0.35rem 0.65rem", flexShrink: 0 }}
        >
          Pick
        </button>
        {url && (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ ...iconBtnStyle(false) }}
            title="Clear"
          >×</button>
        )}
      </div>

      {/* URL input — direct edit fallback */}
      <input
        type="text"
        value={url}
        onChange={e => onChange(e.target.value)}
        placeholder="https://… or pick above"
        style={{ ...inputStyle, marginTop: 0, fontSize: "0.8rem" }}
      />

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(pickedUrl) => { onChange(pickedUrl); setPickerOpen(false); }}
        defaultType="logo"
        defaultCompany={contextCompany}
        acceptTypes={["logo", "image"]}
        title={`Pick ${label}`}
      />
    </div>
  );
}
