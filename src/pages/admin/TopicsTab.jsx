import React from "react";
import { INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";
import { useTabData } from "./useTabData.js";

/* TopicsTab — the PUBLIC site's topic taxonomy (src/data/topics.json).

   Topics tag press/posts items (their `pages` arrays) and drive the Press
   page's Topics filter. Deliberately independent of the intel themes in
   briefing-generator — those are scan beats, managed at /intel/manage.html.

   Press.jsx and PressTab.jsx read this file at build time, so label/key
   changes go live on the next deploy. */

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sanitizeTopic(t) {
  return {
    key: typeof t?.key === "string" ? t.key : "",
    label: typeof t?.label === "string" ? t.label : "",
  };
}

export default function TopicsTab({ onDirtyChange }) {
  const {
    data: topics, setData: setTopics,
    phase, error, dirty, lastSavedAt, load, save,
  } = useTabData({
    endpoint: "/api/admin/topics",
    parse: body => (body.data.topics || []).map(sanitizeTopic),
    serialize: items => ({ topics: items }),
    onDirtyChange,
  });

  if (phase === "loading") return <CenteredMessage>Loading topics…</CenteredMessage>;
  if (phase === "error" && topics === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (topics === null) return null;

  const setRow = (i, field, value) => {
    setTopics(topics.map((t, j) => (j === i ? { ...t, [field]: value } : t)));
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= topics.length) return;
    const next = topics.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setTopics(next);
  };
  const remove = (i) => setTopics(topics.filter((_, j) => j !== i));
  const add = () => setTopics([...topics, { key: "", label: "" }]);

  const problems = topics.map(t => {
    if (!KEY_RE.test(t.key)) return "key must be kebab-case";
    if (!t.label.trim()) return "label required";
    return null;
  });
  const dupes = new Set(topics.map(t => t.key).filter((k, i, a) => a.indexOf(k) !== i));
  const valid = problems.every(p => !p) && dupes.size === 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem clamp(1rem,3vw,2rem) 3rem", color: INK }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: "0.4rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Topics</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {lastSavedAt && <span style={{ fontSize: "0.72rem", color: INK_60 }}>Saved {formatTime(lastSavedAt)}</span>}
          <button style={btnStyle} onClick={add}>+ Add topic</button>
          <button
            style={{ ...btnPrimaryStyle, opacity: dirty && valid && phase !== "saving" ? 1 : 0.5 }}
            onClick={save}
            disabled={!dirty || !valid || phase === "saving"}
          >
            {phase === "saving" ? "Saving…" : "Save topics"}
          </button>
        </div>
      </div>
      <p style={{ fontSize: "0.82rem", color: INK_60, marginBottom: "1.1rem", lineHeight: 1.5 }}>
        The public site’s topic taxonomy — these tag press &amp; post items and power the Topics filter on /press.
        They are <strong>independent of the intel themes</strong> (scan beats), which are managed on the intel
        dashboard’s ⚙ Manage page. Labels are safe to rename any time; changing or deleting a <em>key</em> orphans
        that tag on already-tagged items (they simply stop matching the filter). Changes go live on the next deploy.
      </p>

      {error && <ErrorBanner message={error} />}

      <div style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
        {topics.length === 0 && (
          <p style={{ padding: "1.2rem", color: INK_60, fontSize: "0.88rem" }}>No topics yet — add the first one.</p>
        )}
        {topics.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "0.55rem 0.8rem", borderBottom: i < topics.length - 1 ? `1px solid ${LINE}` : "none" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <button style={{ ...iconBtnStyle, opacity: i === 0 ? 0.25 : 1 }} onClick={() => move(i, -1)} title="Move up">↑</button>
              <button style={{ ...iconBtnStyle, opacity: i === topics.length - 1 ? 0.25 : 1 }} onClick={() => move(i, 1)} title="Move down">↓</button>
            </div>
            <div style={{ flex: "0 0 220px" }}>
              <input
                style={{ ...inputStyle, marginTop: 0, fontFamily: "monospace", fontSize: "0.8rem" }}
                value={t.key}
                onChange={e => setRow(i, "key", e.target.value.toLowerCase())}
                placeholder="kebab-case-key"
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                style={{ ...inputStyle, marginTop: 0 }}
                value={t.label}
                onChange={e => setRow(i, "label", e.target.value)}
                placeholder="Label shown in filters and tags"
              />
            </div>
            <span style={{ fontSize: "0.72rem", color: "#c0392b", minWidth: 130 }}>
              {problems[i] || (dupes.has(t.key) ? "duplicate key" : "")}
            </span>
            <button style={{ ...btnStyle, color: "#c0392b", borderColor: "#e3b7b1" }} onClick={() => remove(i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
