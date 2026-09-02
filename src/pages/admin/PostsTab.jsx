import React, { useState, useEffect, useCallback } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, ErrorBanner, useBriefingTopics } from "./shared.jsx";
import RichEditor from "./RichEditor.jsx";
import AssetPicker from "../../components/admin/AssetPicker.jsx";
import { slugify, retimeSlug } from "../../lib/post-slug.js";

/* ═══════════════════════════════════════════════════════════════════════════
   PostsTab — Posts & Briefings, unified.
   Create / edit / delete posts AND review/publish the daily-briefing queue
   (drafts the pipeline lands via repository_dispatch). Absorbed the former
   Briefings sub-tab June 2026: same /api/admin/posts data, one surface.
═══════════════════════════════════════════════════════════════════════════ */

const POST_TYPES = ["briefing", "article", "announcement"];
const POST_TYPE_LABELS = { briefing: "Briefing", article: "Article", announcement: "Announcement" };
const POST_TYPE_COLORS = { briefing: NEON, article: "#0A0A0A", announcement: NEON };
const POST_TYPE_FG     = { briefing: "#000", article: "#fff",    announcement: "#000" };

const POST_AUTHORS = ["Turnpage Intelligence", "Andrew Glantz"];
const AUTHOR_COLORS = {
  "Turnpage Intelligence": { bg: "#e5e5e5", fg: "#555" },
  "Andrew Glantz":         { bg: NEON,     fg: "#000" },
};

function blankPostForm() {
  return {
    slug: "", date: new Date().toISOString().slice(0, 10),
    type: "briefing", author: "Turnpage Intelligence",
    title: "", summary: "", tags: "", active: true, content: "", hero_image: "",
  };
}

function PostTypeBadge({ type, size = "sm" }) {
  const bg = POST_TYPE_COLORS[type] || NEON;
  const fg = POST_TYPE_FG[type] || "#000";
  const label = POST_TYPE_LABELS[type] || type;
  return (
    <span style={{
      fontFamily: FONT, fontSize: size === "sm" ? "0.64rem" : "0.75rem", fontWeight: 800,
      letterSpacing: "0.18em", textTransform: "uppercase",
      background: bg, color: fg, padding: "0.22rem 0.55rem", borderRadius: 3,
      display: "inline-block", flexShrink: 0,
    }}>{label}</span>
  );
}

export default function PostsTab({ onDirtyChange: _onDirtyChange }) {
  // Posts use a save-immediately pattern — no bulk dirty state to track.
  // onDirtyChange is accepted for API parity with the other tabs but unused.
  const [listPhase, setListPhase]  = useState("loading"); // loading|ready|error
  const [listError, setListError]  = useState("");
  const [posts, setPosts]          = useState([]);         // metadata array

  const [view, setView]            = useState("list");     // "list" | "editor"
  const [filter, setFilter]        = useState("all");      // "all" | "queue" | "published"
  const [running, setRunning]      = useState(false);      // briefing generation in flight
  const [runMsg, setRunMsg]        = useState(null);       // { ok, text } banner
  const [runTopic, setRunTopic]    = useState("");         // "" = all topics
  const briefingTopics = useBriefingTopics();
  const [form, setForm]            = useState(blankPostForm());
  const [isNew, setIsNew]          = useState(false);
  const [editorPhase, setEditorPhase] = useState("idle"); // idle|loading-content|saving|error
  const [editorError, setEditorError] = useState("");
  const [savedAt, setSavedAt]      = useState(null);
  const [savedSlug, setSavedSlug]       = useState("");   // slug the open post is live under
  const [togglingSlug, setTogglingSlug] = useState(null); // slug currently being toggled
  const [selected, setSelected]         = useState(new Set()); // slugs checked for bulk ops
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkError, setBulkError]       = useState("");

  // ── Load post list ──────────────────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    setListPhase("loading");
    setListError("");
    try {
      const r = await fetch("/api/admin/posts", { credentials: "include" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setPosts(Array.isArray(body.data?.items) ? body.data.items : []);
      setListPhase("ready");
    } catch (e) {
      setListError(e.message);
      setListPhase("error");
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // ── Trigger the daily-briefing pipeline (absorbed from BriefingsTab) ────
  async function runBriefing() {
    setRunning(true);
    setRunMsg(null);
    try {
      const r = await fetch("/api/admin/generate-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(runTopic ? { topics: [runTopic] } : {}),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setRunMsg({ ok: true, text: body.message || "Briefing generation triggered." });
    } catch (e) {
      setRunMsg({ ok: false, text: e.message });
    } finally {
      setRunning(false);
    }
  }

  // ── Open editor for existing post ───────────────────────────────────────
  async function openEdit(meta) {
    setView("editor");
    setIsNew(false);
    setEditorPhase("loading-content");
    setEditorError("");
    setSavedSlug(meta.slug || "");
    setForm({
      slug:       meta.slug       || "",
      date:       meta.date       || "",
      type:       meta.type       || "briefing",
      author:     meta.author     || "Turnpage Intelligence",
      title:      meta.title      || "",
      summary:    meta.summary    || "",
      tags:       Array.isArray(meta.tags) ? meta.tags.join(", ") : "",
      active:     meta.active !== false,
      content:    "",
      hero_image: meta.hero_image || "",
    });
    try {
      const r = await fetch(`/api/admin/posts?slug=${encodeURIComponent(meta.slug)}`, { credentials: "include" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setForm(f => ({ ...f, content: body.content || "" }));
      setEditorPhase("idle");
    } catch (e) {
      setEditorError(e.message);
      setEditorPhase("error");
    }
  }

  // ── Open editor for new post ────────────────────────────────────────────
  function openNew() {
    setView("editor");
    setIsNew(true);
    setEditorPhase("idle");
    setEditorError("");
    setSavedSlug("");
    setForm(blankPostForm());
    setSavedAt(null);
  }

  // ── Update form fields ──────────────────────────────────────────────────
  function setField(key, value) {
    setForm(f => {
      const next = { ...f, [key]: value };
      // Auto-update slug when title or date changes on a new post
      if (isNew && (key === "title" || key === "date")) {
        const title = key === "title" ? value : f.title;
        const date  = key === "date"  ? value : f.date;
        next.slug = slugify(title, date);
      } else if (key === "date") {
        // Published post: the date prefix follows the publication date. The
        // save renames the markdown file and 301s the old URL.
        next.slug = retimeSlug(f.slug, value);
      }
      return next;
    });
  }

  // ── Save post ───────────────────────────────────────────────────────────
  async function savePost() {
    setEditorPhase("saving");
    setEditorError("");
    const item = {
      slug:       form.slug.trim(),
      date:       form.date.trim(),
      type:       form.type,
      author:     form.author || "Turnpage Intelligence",
      title:      form.title.trim(),
      summary:    form.summary.trim(),
      tags:       form.tags.split(",").map(t => t.trim()).filter(Boolean),
      active:     form.active,
      hero_image: form.hero_image ? form.hero_image.trim() : "",
    };
    try {
      const r = await fetch("/api/admin/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "save-post", item, content: form.content, isNew, prevSlug: savedSlug }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      setSavedAt(new Date());
      setEditorPhase("idle");
      setIsNew(false); // it now exists
      setSavedSlug(item.slug);
      await loadPosts();
    } catch (e) {
      setEditorError(e.message);
      setEditorPhase("error");
    }
  }

  // ── Toggle active (publish / unpublish) — updates index.json only ──────
  async function toggleActive(post) {
    setTogglingSlug(post.slug);
    try {
      const r = await fetch("/api/admin/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "toggle-active", slug: post.slug }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Toggle failed");
      // Update local state without a full re-fetch
      setPosts(prev => prev.map(p =>
        p.slug === post.slug
          ? (body.active ? { ...p, active: undefined } : { ...p, active: false })
          : p
      ));
    } catch (e) {
      alert("Toggle failed: " + e.message);
    } finally {
      setTogglingSlug(null);
    }
  }

  // ── Delete post ─────────────────────────────────────────────────────────
  async function deletePost(slug, title) {
    if (!confirm(`Delete "${title || slug}"? This removes the post and its markdown file permanently.`)) return;
    try {
      const r = await fetch("/api/admin/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete-post", slug }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Delete failed");
      setSelected(prev => { const next = new Set(prev); next.delete(slug); return next; });
      await loadPosts();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  }

  // ── Bulk delete ──────────────────────────────────────────────────────────
  const [bulkProgress, setBulkProgress] = useState(null); // "3/6" or null

  async function bulkDelete() {
    const slugs = [...selected];
    if (slugs.length === 0) return;
    if (!confirm(`Permanently delete ${slugs.length} post${slugs.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    setBulkError("");
    setBulkProgress(null);
    const CHUNK = 20;
    const total = Math.ceil(slugs.length / CHUNK);
    try {
      for (let i = 0; i < slugs.length; i += CHUNK) {
        const batch = slugs.slice(i, i + CHUNK);
        const batchNum = Math.floor(i / CHUNK) + 1;
        if (total > 1) setBulkProgress(`${batchNum}/${total}`);
        const r = await fetch("/api/admin/posts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "bulk-delete", slugs: batch }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok || !body.ok) throw new Error(body.error || `Batch ${batchNum} failed`);
      }
      setSelected(new Set());
      await loadPosts();
    } catch (e) {
      setBulkError(e.message);
    } finally {
      setBulkDeleting(false);
      setBulkProgress(null);
    }
  }

  // ── Selection helpers ────────────────────────────────────────────────────
  function toggleOne(slug) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  function toggleAllVisible() {
    const visibleSlugs = visiblePosts.map(p => p.slug);
    const allChecked = visibleSlugs.length > 0 && visibleSlugs.every(s => selected.has(s));
    if (allChecked) {
      setSelected(prev => { const next = new Set(prev); visibleSlugs.forEach(s => next.delete(s)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); visibleSlugs.forEach(s => next.add(s)); return next; });
    }
  }

  // ── LIST VIEW ───────────────────────────────────────────────────────────
  const queueCount     = posts.filter(p => p.active === false).length;
  const publishedCount = posts.length - queueCount;
  const visiblePosts = filter === "queue"     ? posts.filter(p => p.active === false)
                     : filter === "published" ? posts.filter(p => p.active !== false)
                     : posts;
  const allVisibleSelected = visiblePosts.length > 0 && visiblePosts.every(p => selected.has(p.slug));
  const someVisibleSelected = visiblePosts.some(p => selected.has(p.slug));

  if (view === "list") {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 0" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap",
          marginBottom: "1rem", paddingBottom: "1rem", borderBottom: `2px solid ${LINE}`,
        }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Posts & Briefings</div>
          <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60 }}>
            {listPhase === "loading" && "Loading…"}
            {listPhase === "ready" && (queueCount > 0
              ? `${queueCount} queued · ${publishedCount} published`
              : `${posts.length} post${posts.length !== 1 ? "s" : ""}`)}
          </div>
          <select
            value={runTopic}
            onChange={e => setRunTopic(e.target.value)}
            disabled={running}
            title="Choose one topic to run by itself, or leave on All topics"
            style={{ ...selectStyle, width: "auto", marginTop: 0, fontSize: "0.8rem", padding: "0.45rem 1.6rem 0.45rem 0.6rem" }}
          >
            <option value="">All topics</option>
            {briefingTopics.map(t => (
              <option key={t.slug} value={t.slug}>{t.label}</option>
            ))}
          </select>
          <button
            onClick={runBriefing}
            disabled={running}
            title="Trigger the daily-briefing pipeline — new drafts land in the Queue (one topic: ~3–5 min, all topics: ~10–15 min)"
            style={{ ...btnStyle, opacity: running ? 0.6 : 1, cursor: running ? "default" : "pointer" }}
          >
            {running ? "Running…" : "Run Briefing"}
          </button>
          <button onClick={loadPosts} style={btnStyle}>Refresh</button>
          <button onClick={openNew} style={btnPrimaryStyle}>+ New Post</button>
        </div>

        {/* Briefing-run result banner */}
        {runMsg && (
          <div style={{
            background: runMsg.ok ? "#dafef4" : "#fce8e8",
            color:      runMsg.ok ? "#05674a" : "#7a1a1a",
            padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.85rem",
            display: "flex", gap: "1rem", alignItems: "center",
          }}>
            <span style={{ flex: 1 }}>{runMsg.text}</span>
            <button onClick={() => setRunMsg(null)} style={{ ...btnStyle, padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}>×</button>
          </div>
        )}

        {/* Status filter pills + select-all */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {[["all", `All (${posts.length})`], ["queue", `Queue (${queueCount})`], ["published", `Published (${publishedCount})`]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
                letterSpacing: "0.05em", textTransform: "uppercase",
                padding: "0.35rem 0.8rem",
                background: filter === key ? INK : "transparent",
                color: filter === key ? "#fff" : INK_60,
                border: `1px solid ${filter === key ? INK : LINE}`,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
          {/* Select-all for visible rows */}
          {visiblePosts.length > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginLeft: "0.4rem", cursor: "pointer", userSelect: "none", fontSize: "0.78rem", color: INK_60 }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={el => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
                onChange={toggleAllVisible}
                style={{ accentColor: INK, width: 14, height: 14, cursor: "pointer" }}
              />
              Select all
            </label>
          )}
          <span style={{ fontSize: "0.75rem", color: INK_60, marginLeft: "0.25rem" }}>
            Daily briefings land in the Queue as drafts — review or edit, then flip to ● Live to publish.
          </span>
        </div>

        {/* Bulk-actions bar */}
        {selected.size > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            background: "#fff8e6", border: `1px solid #e8cc6a`,
            padding: "0.6rem 1rem", marginBottom: "0.75rem", borderRadius: 4,
          }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: INK, flex: 1 }}>
              {selected.size} selected
            </span>
            {bulkError && (
              <span style={{ fontSize: "0.82rem", color: "#c44" }}>{bulkError}</span>
            )}
            <button
              onClick={() => setSelected(new Set())}
              style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem" }}
            >
              Clear
            </button>
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              style={{
                ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.8rem",
                color: "#c44", borderColor: "#f4caca",
                opacity: bulkDeleting ? 0.5 : 1,
                cursor: bulkDeleting ? "default" : "pointer",
              }}
            >
              {bulkDeleting ? (bulkProgress ? `Deleting… ${bulkProgress}` : "Deleting…") : `Delete ${selected.size}`}
            </button>
          </div>
        )}

        {listError && (
          <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <span>{listError}</span>
            <button onClick={loadPosts} style={btnStyle}>Retry</button>
          </div>
        )}

        {listPhase === "loading" && (
          <div style={{ padding: "3rem", textAlign: "center", color: INK_60, fontSize: "0.9rem" }}>Loading posts…</div>
        )}

        {/* Post rows */}
        {listPhase === "ready" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2.5rem" }}>
            {posts.length === 0 && (
              <div style={{ padding: "3rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
                No posts yet. Click "+ New Post" to create one — daily briefings from the pipeline appear here automatically.
              </div>
            )}
            {posts.length > 0 && visiblePosts.length === 0 && (
              <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
                {filter === "queue" ? "Queue is empty — nothing awaiting review." : "No published posts."}
              </div>
            )}
            {visiblePosts.map(post => {
              const isLive    = post.active !== false;
              const toggling  = togglingSlug === post.slug;
              const isSelected = selected.has(post.slug);
              return (
                <div key={post.slug} style={{
                  background: isSelected ? "#fffbee" : "#fff",
                  border: `1px solid ${isSelected ? "#e8cc6a" : isLive ? LINE : "#e8e0d0"}`,
                  padding: "0.85rem 1rem",
                  display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap",
                  opacity: isLive ? 1 : 0.75,
                }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(post.slug)}
                    style={{ accentColor: INK, width: 14, height: 14, flexShrink: 0, cursor: "pointer" }}
                    aria-label={`Select ${post.title || post.slug}`}
                  />
                  <PostTypeBadge type={post.type || "briefing"} />
                  <AuthorChip author={post.author || "Turnpage Intelligence"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {post.title || <em style={{ color: INK_60 }}>Untitled</em>}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: INK_60, marginTop: "0.15rem" }}>
                      {post.date}
                    </div>
                  </div>
                  {/* Publish / Unpublish toggle */}
                  <button
                    onClick={() => toggleActive(post)}
                    disabled={toggling}
                    title={isLive ? "Click to unpublish" : "Click to publish"}
                    style={{
                      fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                      padding: "0.28rem 0.65rem",
                      border: `1px solid ${isLive ? "#b8e0b8" : "#d4c090"}`,
                      borderRadius: 3,
                      background: isLive ? "#e8f5e8" : "#fdf6e3",
                      color: isLive ? "#2a6e2a" : "#8a6200",
                      cursor: toggling ? "default" : "pointer",
                      opacity: toggling ? 0.5 : 1,
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {toggling ? "…" : isLive ? "● Live" : "○ Draft"}
                  </button>
                  <button
                    onClick={() => openEdit(post)}
                    style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.8rem" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePost(post.slug, post.title)}
                    style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.8rem", color: "#c44", borderColor: "#f4caca" }}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR VIEW ─────────────────────────────────────────────────────────
  const isSaving = editorPhase === "saving";
  const isLoadingContent = editorPhase === "loading-content";
  const slugRenaming = !isNew && Boolean(savedSlug) && form.slug !== savedSlug;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 0" }}>

      {/* Editor header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap",
        marginBottom: "1rem", paddingBottom: "1rem", borderBottom: `2px solid ${LINE}`,
      }}>
        <button
          onClick={() => setView("list")}
          style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem" }}
        >
          ← All posts
        </button>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em", flex: 1 }}>
          {isNew ? "New Post" : (form.title || "Edit Post")}
        </div>
        {savedAt && !isSaving && (
          <span style={{ fontSize: "0.82rem", color: INK_60 }}>Saved {formatTime(savedAt)}</span>
        )}
        <button
          onClick={savePost}
          disabled={isSaving || isLoadingContent}
          style={{
            ...btnPrimaryStyle,
            opacity: (isSaving || isLoadingContent) ? 0.5 : 1,
            cursor:  (isSaving || isLoadingContent) ? "default" : "pointer",
          }}
        >
          {isSaving ? "Saving…" : isNew ? "Publish Post" : "Save Changes"}
        </button>
      </div>

      <ErrorBanner>{editorError}</ErrorBanner>

      {isLoadingContent ? (
        <div style={{ padding: "3rem", textAlign: "center", color: INK_60 }}>Loading post content…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>

          {/* Row 1: Type + Active */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="post-editor-row">
            <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
              Post type
              <select
                value={form.type}
                onChange={e => setField("type", e.target.value)}
                style={{ ...selectStyle, marginTop: "0.3rem" }}
              >
                {POST_TYPES.map(t => (
                  <option key={t} value={t}>{POST_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", cursor: "pointer", userSelect: "none", paddingTop: "1.4rem" }}>
              <input
                type="checkbox" checked={form.active}
                onChange={e => setField("active", e.target.checked)}
                style={{ accentColor: NEON, width: 16, height: 16 }}
              />
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: form.active ? "#1a7a1a" : INK_60 }}>
                {form.active ? "Published" : "Draft (hidden from site)"}
              </span>
            </label>
          </div>

          {/* Row 1b: Author */}
          <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Author
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
              {POST_AUTHORS.map(a => {
                const selected = (form.author || "Turnpage Intelligence") === a;
                const cfg = AUTHOR_COLORS[a];
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setField("author", a)}
                    style={{
                      fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      padding: "0.38rem 0.85rem", borderRadius: 4, cursor: "pointer",
                      border: selected ? `2px solid ${cfg.bg === "#e5e5e5" ? "#aaa" : cfg.bg}` : `2px solid ${LINE}`,
                      background: selected ? cfg.bg : "transparent",
                      color:      selected ? cfg.fg : INK_60,
                      transition: "all 0.12s",
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Title */}
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Title <span style={{ color: "#c44" }}>*</span>
            <input
              type="text"
              value={form.title}
              onChange={e => setField("title", e.target.value)}
              placeholder="Bartz Settlement Enters Its Most Consequential Week"
              style={inputStyle}
            />
          </label>

          {/* Row 3: Date + Slug */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="post-editor-row">
            <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
              Date <span style={{ color: "#c44" }}>*</span>
              <input
                type="date"
                value={form.date}
                onChange={e => setField("date", e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
              Slug {isNew
                ? <span style={{ fontWeight: 400 }}>(auto-generated, editable)</span>
                : <span style={{ fontWeight: 400 }}>(date follows the Date field)</span>}
              <input
                type="text"
                value={form.slug}
                onChange={e => isNew && setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                readOnly={!isNew}
                placeholder="2026-05-26-my-post-title"
                style={{ ...inputStyle, background: isNew ? "#fff" : "#F4F5F7", color: isNew ? INK : INK_60 }}
              />
              {slugRenaming && (
                <span style={{ display: "block", marginTop: "0.35rem", fontWeight: 400, fontSize: "0.72rem", color: "#8a6d00" }}>
                  URL changes on save: <code>/briefings/{savedSlug}</code> → <code>/briefings/{form.slug}</code>.
                  The old link 301-redirects to the new one after the next deploy.
                </span>
              )}
            </label>
          </div>

          {/* Row 4: Summary */}
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Summary <span style={{ fontWeight: 400 }}>(shown on the Publications list card)</span>
            <textarea
              value={form.summary}
              onChange={e => setField("summary", e.target.value)}
              rows={3}
              placeholder="1–3 sentences summarising the post for the index card."
              style={inputStyle}
            />
          </label>

          {/* Row 5: Hero image */}
          <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Hero image <span style={{ fontWeight: 400 }}>(optional — shown at the top of the post page)</span>
            <PostHeroImageField
              value={form.hero_image || ""}
              onChange={val => setField("hero_image", val)}
            />
          </div>

          {/* Row 6: Tags */}
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Tags <span style={{ fontWeight: 400 }}>(comma-separated — shown as topic pills on article posts)</span>
            <input
              type="text"
              value={form.tags}
              onChange={e => setField("tags", e.target.value)}
              placeholder="Bartz, Anthropic, Settlement"
              style={inputStyle}
            />
          </label>

          {/* Row 7: Content — WYSIWYG */}
          <div>
            <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.4rem" }}>
              Content
            </div>
            <RichEditor
              value={form.content}
              onChange={val => setField("content", val)}
              disabled={isLoadingContent || isSaving}
              minHeight={480}
            />
          </div>

          {/* Bottom save row */}
          <div style={{ display: "flex", gap: "0.7rem", paddingTop: "0.5rem", borderTop: `1px solid ${LINE}` }}>
            <button
              onClick={savePost}
              disabled={isSaving}
              style={{ ...btnPrimaryStyle, opacity: isSaving ? 0.5 : 1, cursor: isSaving ? "default" : "pointer" }}
            >
              {isSaving ? "Saving…" : isNew ? "Publish Post" : "Save Changes"}
            </button>
            <button onClick={() => setView("list")} style={btnStyle}>Cancel</button>
          </div>

        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .post-editor-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── PostHeroImageField — hero image URL + thumbnail + AssetPicker ──────── */
function PostHeroImageField({ value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div style={{ marginTop: "0.3rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {/* Thumbnail */}
        <div style={{
          width: 64, height: 40, flexShrink: 0,
          background: "#F4F5F7", border: `1px solid ${LINE}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {value ? (
            <img
              src={value}
              alt="hero preview"
              style={{ maxWidth: 60, maxHeight: 36, objectFit: "cover", display: "block" }}
              onError={e => { e.currentTarget.style.opacity = "0.2"; }}
            />
          ) : (
            <span style={{ fontSize: "0.6rem", color: INK_60 }}>—</span>
          )}
        </div>

        {/* URL input */}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://… or pick →"
          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        />

        {/* Pick button */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.45rem 0.75rem", flexShrink: 0 }}
        >
          Pick
        </button>

        {/* Clear */}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ ...iconBtnStyle(false) }}
            aria-label="Clear" title="Clear"
          >×</button>
        )}
      </div>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => { onChange(url); setPickerOpen(false); }}
        defaultType="image"
        acceptTypes={["image"]}
        title="Pick a hero image"
      />
    </div>
  );
}

/* ── AuthorChip — compact author badge used in list rows ────────────────── */
function AuthorChip({ author }) {
  const name = author || "Turnpage Intelligence";
  const cfg  = AUTHOR_COLORS[name] || AUTHOR_COLORS["Turnpage Intelligence"];
  return (
    <span style={{
      fontFamily: FONT, fontSize: "0.64rem", fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      background: cfg.bg, color: cfg.fg,
      padding: "0.2rem 0.5rem", borderRadius: 3,
      display: "inline-block", flexShrink: 0,
    }}>
      {name}
    </span>
  );
}
