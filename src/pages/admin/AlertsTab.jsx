import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, filterSelectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";
import { MARKETING_PAGES } from "../../data/page-keys.js";

// Derived from routes.json via page-keys.js — add/rename pages there, not here
const ALERT_PAGE_VALUES = MARKETING_PAGES.map(p => p.key);
const ALERT_PAGE_LABELS = Object.fromEntries(MARKETING_PAGES.map(p => [p.key, p.label]));

function blankAlert() {
  return { active: true, pill: "Latest", text: "", linkText: "", href: "", pages: ["home"] };
}

function sanitizeAlert(a) {
  return {
    active:   Boolean(a.active),
    pill:     typeof a.pill     === "string" ? a.pill     : "Latest",
    text:     typeof a.text     === "string" ? a.text     : "",
    linkText: typeof a.linkText === "string" ? a.linkText : "",
    href:     typeof a.href     === "string" ? a.href     : "",
    pages:    Array.isArray(a.pages) ? a.pages.filter(p => ALERT_PAGE_VALUES.includes(p)) : [],
  };
}

export default function AlertsTab({ onDirtyChange }) {
  const [items, setItems] = useState(null);
  const [original, setOriginal] = useState(null);
  const [phase, setPhase] = useState("loading"); // "loading"|"ready"|"saving"|"error"
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
      const r = await fetch("/api/admin/alerts", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = (body.data.alerts || []).map(sanitizeAlert);
      setItems(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));
      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (items === null) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch("/api/admin/alerts", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ alerts: items }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading alerts…</CenteredMessage>;
  if (phase === "error" && items === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (items === null) return null;

  const alerts = items;
  const onChangeAlerts = setItems;
  const onSave = save;
  const isSaving = phase === "saving";

  // ── Filters ──────────────────────────────────────────────────────────────
  return <AlertsSectionInner
    alerts={alerts}
    onChangeAlerts={onChangeAlerts}
    onSave={onSave}
    dirty={dirty}
    isSaving={isSaving}
    error={error}
    lastSavedAt={lastSavedAt}
  />;
}

function AlertsSectionInner({ alerts, onChangeAlerts, onSave, dirty, isSaving, error, lastSavedAt }) {
  // ── Filters ──────────────────────────────────────────────────────────────
  const [filterActive, setFilterActive] = useState(""); // "" | "true" | "false"
  const [filterPage,   setFilterPage]   = useState("");

  const isFiltered = !!(filterActive || filterPage);
  const displayAlerts = isFiltered ? alerts.filter(a => {
    if (filterActive === "true"  && !a.active)  return false;
    if (filterActive === "false" &&  a.active)  return false;
    if (filterPage && !(Array.isArray(a.pages) && a.pages.includes(filterPage))) return false;
    return true;
  }) : alerts;
  function clearFilters() { setFilterActive(""); setFilterPage(""); }

  function updateAlert(i, field, value) {
    const next = alerts.slice();
    next[i] = { ...next[i], [field]: value };
    onChangeAlerts(next);
  }
  function moveAlert(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= alerts.length) return;
    const next = alerts.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChangeAlerts(next);
  }
  function deleteAlert(i) {
    if (!confirm("Delete this alert?")) return;
    onChangeAlerts(alerts.filter((_, idx) => idx !== i));
  }
  function addAlert() {
    onChangeAlerts([...alerts, blankAlert()]);
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
          Announcement Alerts
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
          {isSaving ? "Saving…" : "Save Alerts"}
        </button>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "1rem" }}>
        The first <strong>active</strong> alert that includes a given page is shown in the top bar.
        Inactive alerts are hidden site-wide. Order matters — drag or use arrows to re-rank.
      </p>

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
          {ALERT_PAGE_VALUES.map(v => <option key={v} value={v}>{ALERT_PAGE_LABELS[v]}</option>)}
        </select>
        {isFiltered && (
          <button onClick={clearFilters} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem", color: "#c44", borderColor: "#f4caca" }}>Clear</button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: INK_60 }}>
          {isFiltered ? `${displayAlerts.length} of ${alerts.length}` : `${alerts.length}`} alert{alerts.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2.5rem" }}>
        {displayAlerts.map((alert) => {
          const i = alerts.indexOf(alert);
          return (
          <div key={i} style={{
            background: "#fff", border: `1px solid ${alert.active ? LINE : "#e0e0e0"}`,
            padding: "1.2rem",
            opacity: alert.active ? 1 : 0.6,
          }}>
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>

              {/* Active toggle */}
              <label style={{
                display: "flex", alignItems: "center", gap: "0.45rem",
                cursor: "pointer", userSelect: "none",
              }}>
                <input
                  type="checkbox"
                  checked={Boolean(alert.active)}
                  onChange={e => updateAlert(i, "active", e.target.checked)}
                  style={{ accentColor: NEON, width: 16, height: 16 }}
                />
                <span style={{
                  fontSize: "0.78rem", fontWeight: 700,
                  color: alert.active ? "#1a7a1a" : INK_60,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {alert.active ? "Active" : "Inactive"}
                </span>
              </label>

              <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontWeight: 600, marginLeft: "0.5rem" }}>
                {alert.text ? `"${alert.text.slice(0, 60)}${alert.text.length > 60 ? "…" : ""}"` : <em>No text set</em>}
              </div>

              <button onClick={() => moveAlert(i, -1)} disabled={isFiltered || i === 0}                  style={iconBtnStyle(isFiltered || i === 0)}                 title={isFiltered ? "Clear filters to reorder" : "Move up"}>↑</button>
              <button onClick={() => moveAlert(i, 1)}  disabled={isFiltered || i === alerts.length - 1}  style={iconBtnStyle(isFiltered || i === alerts.length - 1)} title={isFiltered ? "Clear filters to reorder" : "Move down"}>↓</button>
              <button onClick={() => deleteAlert(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }} title="Delete">×</button>
            </div>

            {/* Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }} className="alert-grid">

              {/* Pill label */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Pill label <span style={{ fontWeight: 400 }}>(e.g. "Latest", "Update", "New")</span>
                <input
                  type="text"
                  value={alert.pill}
                  onChange={e => updateAlert(i, "pill", e.target.value)}
                  placeholder="Latest"
                  style={inputStyle}
                />
              </label>

              {/* CTA link text */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                CTA link text <span style={{ fontWeight: 400 }}>(leave blank to hide the link)</span>
                <input
                  type="text"
                  value={alert.linkText}
                  onChange={e => updateAlert(i, "linkText", e.target.value)}
                  placeholder="Read the briefing"
                  style={inputStyle}
                />
              </label>

              {/* Alert text */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
                Alert text
                <input
                  type="text"
                  value={alert.text}
                  onChange={e => updateAlert(i, "text", e.target.value)}
                  placeholder="Bartz v. Anthropic fairness hearing — May 14, 2026"
                  style={inputStyle}
                />
              </label>

              {/* Link URL */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
                Link URL
                <input
                  type="text"
                  value={alert.href}
                  onChange={e => updateAlert(i, "href", e.target.value)}
                  placeholder="/briefings/2026-04-29-advisory  or  https://..."
                  style={inputStyle}
                />
              </label>

              {/* Link validation warning */}
              {((alert.href && !alert.linkText) || (alert.linkText && !alert.href)) && (
                <div style={{
                  gridColumn: "1 / -1",
                  fontSize: "0.75rem",
                  color: "rgba(184, 134, 11, 0.75)",
                  fontWeight: 500,
                  padding: "0.5rem 0.7rem",
                  background: "rgba(184, 134, 11, 0.08)",
                  borderLeft: `2px solid rgba(184, 134, 11, 0.4)`,
                }}>
                ⚠ Both link URL and link text are needed for the CTA to appear.
                </div>
              )}

              {/* Pages */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.4rem" }}>
                  Show on pages
                </div>
                <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                  {ALERT_PAGE_VALUES.map(v => {
                    const checked = Array.isArray(alert.pages) && alert.pages.includes(v);
                    return (
                      <label key={v} style={{
                        display: "flex", alignItems: "center", gap: "0.35rem",
                        cursor: "pointer", fontSize: "0.88rem", color: INK, fontWeight: 400,
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const cur = Array.isArray(alert.pages) ? alert.pages : [];
                            updateAlert(i, "pages", e.target.checked
                              ? [...cur, v]
                              : cur.filter(x => x !== v));
                          }}
                          style={{ accentColor: NEON, width: 14, height: 14 }}
                        />
                        {ALERT_PAGE_LABELS[v]}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Preview */}
            {alert.active && alert.text && (
              <div style={{
                marginTop: "0.9rem", paddingTop: "0.75rem",
                borderTop: `1px solid ${LINE}`,
                display: "flex", alignItems: "center", gap: "0.6rem",
                fontSize: "0.8rem", color: INK_60,
              }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: INK_60 }}>Preview:</span>
                {alert.pill && (
                  <span style={{ background: NEON, color: "#000", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.15em 0.55em" }}>
                    {alert.pill}
                  </span>
                )}
                <span style={{ color: INK }}>{alert.text}</span>
                {alert.linkText && (
                  <span style={{ fontWeight: 700, textDecoration: "underline", color: INK }}>
                    {alert.linkText} →
                  </span>
                )}
              </div>
            )}
          </div>
          );
        })}

        {alerts.length === 0 && !isFiltered && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No alerts yet. Click "+ Add alert" to create one.
          </div>
        )}
        {isFiltered && displayAlerts.length === 0 && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No alerts match the current filters.
          </div>
        )}

        <button onClick={addAlert} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "1rem", fontWeight: 700,
        }}>
          + Add alert
        </button>
      </div>

      <style>{`
        @media (max-width: 540px) {
          .alert-grid { grid-template-columns: 1fr !important; }
          .alert-grid label, .alert-grid div { grid-column: auto !important; }
        }
      `}</style>
    </div>
  );
}
