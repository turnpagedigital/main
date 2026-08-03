import React, { useState, useEffect } from "react";
import { INK, INK_60 } from "../../data/tokens.js";
import {
  inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle,
  CenteredMessage, Banner, cardStyle, labelStyle, wrapStyle, formatTime,
} from "./shared.jsx";
import { useTabData } from "./useTabData.js";

/* XSourcesTab — followed X (Twitter) accounts that feed the daily briefings.

   Each account: @handle, the themes its posts inform, reply/retweet filters.
   The daily pipeline reads these via scripts/scan_x.py using the
   X_BEARER_TOKEN secret (X API, paid read tier required) — without the
   secret the pipeline skips X quietly and briefings run as before. */

function blankAccount() {
  return { handle: "", themes: [], exclude_replies: true, exclude_retweets: true, active: true, note: "" };
}

export default function XSourcesTab({ onDirtyChange }) {
  const {
    data, setData, phase, error, dirty, lastSavedAt, save,
  } = useTabData({
    endpoint: "/api/admin/x-sources",
    parse: body => ({ accounts: (body.data && body.data.accounts) || [] }),
    serialize: d => ({ accounts: d.accounts }),
    onDirtyChange,
  });

  const [themes, setThemes] = useState([]);
  useEffect(() => {
    fetch("/api/admin/themes", { credentials: "include" })
      .then(r => r.json())
      .then(b => {
        const list = (b && b.data && b.data.themes) || b.themes || [];
        setThemes(list.filter(t => t && t.slug));
      })
      .catch(() => {});
  }, []);

  if (phase === "loading") return <CenteredMessage>Loading…</CenteredMessage>;
  if (phase === "error" && !data) return <CenteredMessage>{error || "Failed to load."}</CenteredMessage>;
  if (!data) return null;

  const accounts = data.accounts;
  const set = (i, patch) => {
    const next = accounts.slice();
    next[i] = { ...next[i], ...patch };
    setData({ accounts: next });
  };

  return (
    <div style={wrapStyle}>
      <p style={{ fontSize: "0.85rem", color: INK_60, margin: "0 0 1rem", lineHeight: 1.55 }}>
        Posts from these accounts (last 24 hours) are handed to the briefing writer for the
        themes you map them to. Requires an X API key with read access saved as the
        <code style={{ margin: "0 4px" }}>X_BEARER_TOKEN</code> secret — until that's set,
        this list is stored but not pulled.
      </p>

      {error && <Banner kind="error">{error}</Banner>}

      {accounts.map((a, i) => (
        <div key={i} style={{ ...cardStyle, marginBottom: "0.9rem", opacity: a.active ? 1 : 0.55 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, color: INK }}>@</span>
            <input
              style={{ ...inputStyle, width: 180 }}
              placeholder="handle"
              value={a.handle}
              onChange={e => set(i, { handle: e.target.value.replace(/^@/, "") })}
            />
            <input
              style={{ ...inputStyle, flex: 1, minWidth: 160 }}
              placeholder="Note (who is this?)"
              value={a.note}
              onChange={e => set(i, { note: e.target.value })}
            />
            <label style={{ fontSize: "0.8rem", color: INK_60, display: "flex", gap: 5, alignItems: "center" }}>
              <input type="checkbox" checked={a.active} onChange={e => set(i, { active: e.target.checked })} />
              Active
            </label>
            <button
              type="button"
              style={iconBtnStyle}
              title="Remove account"
              onClick={() => setData({ accounts: accounts.filter((_, j) => j !== i) })}
            >
              ×
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={labelStyle}>Feeds these themes</div>
            <div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap" }}>
              {themes.map(t => (
                <label key={t.slug} style={{ fontSize: "0.82rem", display: "flex", gap: 5, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={a.themes.includes(t.slug)}
                    onChange={e => set(i, {
                      themes: e.target.checked
                        ? [...a.themes, t.slug]
                        : a.themes.filter(s => s !== t.slug),
                    })}
                  />
                  {t.emoji ? t.emoji + " " : ""}{t.display_name || t.slug}
                </label>
              ))}
              {!themes.length && <span style={{ fontSize: "0.8rem", color: INK_60 }}>No themes loaded.</span>}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
            <label style={{ fontSize: "0.8rem", color: INK_60, display: "flex", gap: 5, alignItems: "center" }}>
              <input type="checkbox" checked={a.exclude_replies} onChange={e => set(i, { exclude_replies: e.target.checked })} />
              Skip replies
            </label>
            <label style={{ fontSize: "0.8rem", color: INK_60, display: "flex", gap: 5, alignItems: "center" }}>
              <input type="checkbox" checked={a.exclude_retweets} onChange={e => set(i, { exclude_retweets: e.target.checked })} />
              Skip reposts
            </label>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: "1rem" }}>
        <button type="button" style={btnStyle} onClick={() => setData({ accounts: [...accounts, blankAccount()] })}>
          + Add account
        </button>
        <button
          type="button"
          style={btnPrimaryStyle}
          disabled={!dirty || phase === "saving"}
          onClick={save}
        >
          {phase === "saving" ? "Saving…" : "Save X accounts"}
        </button>
        {lastSavedAt && <span style={{ fontSize: "0.78rem", color: INK_60 }}>Saved {formatTime(lastSavedAt)}</span>}
      </div>
    </div>
  );
}
