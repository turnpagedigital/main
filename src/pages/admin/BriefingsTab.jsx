import React, { useState, useEffect, useCallback } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { btnStyle, btnPrimaryStyle, formatTime } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   BriefingsTab — Queue and publish daily briefings.

   Shows only posts with type === "briefing". Two sections:
     Queue     — draft briefings awaiting review + publish
     Published — live briefings (can be unpublished)

   The daily-briefing skill creates drafts via POST /api/admin/posts
   (action: "save-post", active: false). They appear here automatically.

   Full editing is done via Content → Posts tab.
═══════════════════════════════════════════════════════════════════════════ */

export default function BriefingsTab({ onDirtyChange }) {
  const [phase, setPhase]         = useState("loading"); // loading|ready|error
  const [error, setError]         = useState("");
  const [briefings, setBriefings] = useState([]);        // type=briefing only
  const [toggling, setToggling]   = useState(null);      // slug being toggled
  const [lastAction, setLastAction] = useState(null);    // { slug, at, label }
  const [running, setRunning]     = useState(false);     // run-now in progress
  const [runStatus, setRunStatus] = useState(null);      // { at, message, type: "ok"|"error" }

  // ── Load briefings ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setPhase("loading");
    setError("");
    try {
      const r = await fetch("/api/admin/posts", { credentials: "include" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const all = Array.isArray(body.data?.items) ? body.data.items : [];
      setBriefings(all.filter(p => p.type === "briefing"));
      setPhase("ready");
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Run briefing generation now ───────────────────────────────────────────
  async function runNow() {
    setRunning(true);
    setRunStatus(null);
    try {
      const r = await fetch("/api/admin/generate-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      setRunStatus({
        at: new Date(),
        message: body.message || "Briefing generation triggered. Refreshing…",
        type: "ok",
      });
      // Refresh briefings after a short delay to let the generation complete
      setTimeout(load, 2000);
    } catch (e) {
      setRunStatus({
        at: new Date(),
        message: e.message,
        type: "error",
      });
    } finally {
      setRunning(false);
    }
  }

  // ── Publish / Unpublish ───────────────────────────────────────────────────
  async function toggleActive(slug, currentlyLive) {
    setToggling(slug);
    try {
      const r = await fetch("/api/admin/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "toggle-active", slug }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Toggle failed");
      setBriefings(prev => prev.map(p =>
        p.slug === slug
          ? (body.active ? { ...p, active: undefined } : { ...p, active: false })
          : p
      ));
      setLastAction({ slug, at: new Date(), label: currentlyLive ? "Unpublished" : "Published" });
    } catch (e) {
      alert("Action failed: " + e.message);
    } finally {
      setToggling(null);
    }
  }

  // ── Navigate to Posts tab for full edit ───────────────────────────────────
  function goToPostsTab() {
    const next = "/admin/content/posts";
    window.history.pushState(null, "", next);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  // ── Split into queue (draft) + published ─────────────────────────────────
  const queue     = briefings.filter(p => p.active === false);
  const published = briefings.filter(p => p.active !== false);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 3rem" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap",
        marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: `2px solid ${LINE}`,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Briefings</div>
          {phase === "ready" && (
            <div style={{ fontSize: "0.8rem", color: INK_60, marginTop: "0.1rem" }}>
              {queue.length > 0
                ? `${queue.length} queued · ${published.length} published`
                : `${published.length} published`}
            </div>
          )}
        </div>
        {lastAction && (
          <span style={{ fontSize: "0.8rem", color: "#2a6e2a" }}>
            {lastAction.label} · {formatTime(lastAction.at)}
          </span>
        )}
        <button
          onClick={runNow}
          disabled={running}
          style={{
            ...btnPrimaryStyle,
            fontSize: "0.78rem",
            padding: "0.45rem 1rem",
            opacity: running ? 0.6 : 1,
            cursor: running ? "default" : "pointer",
          }}
        >
          {running ? "Running…" : "Run Now"}
        </button>
        <button onClick={load} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.8rem" }}>
          Refresh
        </button>
      </div>

      {/* ── Run Status Message ────────────────────────────────────── */}
      {runStatus && (
        <div style={{
          background: runStatus.type === "ok" ? "rgba(26,127,55,0.08)" : "rgba(192,57,43,0.07)",
          color: runStatus.type === "ok" ? "#1a7f37" : "#c0392b",
          border: `1px solid ${runStatus.type === "ok" ? "rgba(26,127,55,0.3)" : "rgba(192,57,43,0.3)"}`,
          padding: "0.75rem",
          marginBottom: "1rem",
          fontSize: "0.9rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span>{runStatus.message}</span>
          <button
            onClick={() => setRunStatus(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "1.2rem",
              padding: "0 0.5rem",
              opacity: 0.6,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <span>{error}</span>
          <button onClick={load} style={btnStyle}>Retry</button>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {phase === "loading" && (
        <div style={{ padding: "3rem", textAlign: "center", color: INK_60, fontSize: "0.9rem" }}>
          Loading briefings…
        </div>
      )}

      {phase === "ready" && (
        <>
          {/* ── Queue ─────────────────────────────────────────────── */}
          <section style={{ marginBottom: "2.5rem" }}>
            <div style={{
              fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em",
              textTransform: "uppercase", color: INK_60, marginBottom: "0.65rem",
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}>
              Queue
              {queue.length > 0 && (
                <span style={{
                  background: NEON, color: "#000", fontWeight: 900,
                  fontSize: "0.65rem", padding: "0.1rem 0.45rem", borderRadius: 10,
                }}>
                  {queue.length}
                </span>
              )}
            </div>

            {queue.length === 0 ? (
              <div style={{
                padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`,
                color: INK_60, textAlign: "center", fontSize: "0.88rem",
              }}>
                No drafts in queue. New briefings from the daily skill will appear here automatically.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {queue.map(post => (
                  <BriefingRow
                    key={post.slug}
                    post={post}
                    isLive={false}
                    toggling={toggling === post.slug}
                    onToggle={() => toggleActive(post.slug, false)}
                    onEdit={goToPostsTab}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Published ─────────────────────────────────────────── */}
          <section>
            <div style={{
              fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em",
              textTransform: "uppercase", color: INK_60, marginBottom: "0.65rem",
            }}>
              Published
            </div>

            {published.length === 0 ? (
              <div style={{
                padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`,
                color: INK_60, textAlign: "center", fontSize: "0.88rem",
              }}>
                No published briefings yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {published.map(post => (
                  <BriefingRow
                    key={post.slug}
                    post={post}
                    isLive={true}
                    toggling={toggling === post.slug}
                    onToggle={() => toggleActive(post.slug, true)}
                    onEdit={goToPostsTab}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Footer note ───────────────────────────────────────── */}
          <div style={{ marginTop: "2rem", padding: "1rem", background: "#fff", border: `1px solid ${LINE}`, fontSize: "0.8rem", color: INK_60 }}>
            <strong style={{ color: INK }}>Full editing</strong> (title, content, tags) is available in the{" "}
            <button
              onClick={goToPostsTab}
              style={{ fontFamily: FONT, fontSize: "0.8rem", color: INK, fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
            >
              Content → Posts tab
            </button>
            . This tab is for reviewing and publishing queued briefings.
          </div>
        </>
      )}
    </div>
  );
}

/* ── BriefingRow ─────────────────────────────────────────────────────────── */
function BriefingRow({ post, isLive, toggling, onToggle, onEdit }) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${isLive ? LINE : "#e8e0d0"}`,
      padding: "0.9rem 1rem",
      display: "flex", alignItems: "flex-start", gap: "0.85rem", flexWrap: "wrap",
    }}>
      {/* Left: date + title + summary */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: INK_60, marginBottom: "0.2rem" }}>
          {post.date}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: INK, marginBottom: "0.25rem" }}>
          {post.title || <em style={{ color: INK_60 }}>Untitled</em>}
        </div>
        {post.summary && (
          <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: INK_60, lineHeight: 1.5 }}>
            {post.summary}
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0, paddingTop: "0.1rem" }}>
        <button
          onClick={onEdit}
          style={{ ...btnStyle, fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}
        >
          Edit
        </button>
        <button
          onClick={onToggle}
          disabled={toggling}
          style={{
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700,
            padding: "0.3rem 0.9rem",
            border: `1px solid ${isLive ? "#d4c090" : "#b8e0b8"}`,
            borderRadius: 3,
            background: isLive ? "#fdf6e3" : "#e8f5e8",
            color: isLive ? "#8a6200" : "#2a6e2a",
            cursor: toggling ? "default" : "pointer",
            opacity: toggling ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {toggling ? "…" : isLive ? "Unpublish" : "Publish"}
        </button>
      </div>
    </div>
  );
}
