import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE, LINE_STRONG, SURFACE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";
import SectionEditorModal from "./SectionEditorModal.jsx";
import PagePreviewOverlay from "./PagePreviewOverlay.jsx";
import TemplatePicker from "./TemplatePicker.jsx";
import CenterPreview from "./visualeditor/CenterPreview.jsx";
import PropertyPanel from "./visualeditor/PropertyPanel.jsx";
import { sectionsFingerprint } from "../../lib/section-fingerprint.js";

/* PageBuilderTab — view and manage the section composition of every page.

   Left panel: list of pages (built-in + custom).
   Right panel: ordered section list for the selected page.
     - Reorder with ↑/↓ buttons
     - Toggle visible/hidden per section
     - Edit inline content (hero, stats, edge, CTAs, photo)
     - Add a section from the section type library
     - Remove a section

   New Page button → create a custom page (path + title → POST creates route + composition). */

const ICON_BTN = {
  border: `1px solid ${LINE}`, background: SURFACE,
  color: INK, fontFamily: FONT, cursor: "pointer",
  width: 30, height: 30, fontSize: "0.85rem", fontWeight: 700,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: 0, flexShrink: 0,
};

const DATA_SOURCE_LABELS = {
  "inline":           "Inline content",
  "shared:situations":"→ Home Content",
  "shared:bio":       "→ Bio",
  "shared:deals":     "→ Deals",
  "shared:testimonials":"→ Testimonials",
  "shared:faq":       "→ FAQs",
  "page:audienceCards":"→ Marketing Pages",
  "page:serviceCards": "→ Marketing Pages",
  "page:comparison":   "→ Marketing Pages",
  "page:howItWorks":   "→ Marketing Pages",
  "page:damagesData":  "→ Marketing Pages",
};

export default function PageBuilderTab({ onDirtyChange }) {
  const [pages, setPages]             = useState([]);
  const [sectionTypes, setSectionTypes] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [toast, setToast]             = useState("");

  // Editor state for the selected page
  const [sections, setSections]           = useState([]);
  const [originalSections, setOriginalSections] = useState([]);
  const [pageStatus, setPageStatus]       = useState("active");
  const [originalStatus, setOriginalStatus] = useState("active");
  // Visual editor: which section in the live preview is currently selected
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  // Preview mode: show hidden sections (with overlay) or hide them entirely
  const [showHidden, setShowHidden] = useState(true);

  // Modals
  const [editingSection, setEditingSection] = useState(null);   // { section, sectionType }
  const [addPickerOpen, setAddPickerOpen]   = useState(false);
  const [newPageForm, setNewPageForm]       = useState(null);   // null | { title, pageKey, path }
  const [deleteConfirm, setDeleteConfirm]   = useState(null);   // pageKey to delete
  const [copyTarget, setCopyTarget]         = useState(null);   // { index, section } — "Copy to page…" picker
  const [previewOpen, setPreviewOpen]       = useState(false);  // live preview overlay
  const [conflict, setConflict]             = useState(false);  // save refused: newer layout on server

  useEffect(() => { load(); }, []);

  // Auto-resync on return to the tab when there are no unsaved edits, so a
  // save from another door (other tab, git push) can't leave this tab stale.
  const dirtyRef = React.useRef(false);
  const lastLoadRef = React.useRef(0);
  useEffect(() => { dirtyRef.current = dirty; });
  useEffect(() => {
    const maybeReload = () => {
      if (document.visibilityState !== "visible") return;
      if (dirtyRef.current) return;
      if (Date.now() - lastLoadRef.current < 15000) return;
      lastLoadRef.current = Date.now();
      load();
    };
    window.addEventListener("focus", maybeReload);
    document.addEventListener("visibilitychange", maybeReload);
    return () => {
      window.removeEventListener("focus", maybeReload);
      document.removeEventListener("visibilitychange", maybeReload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() =>
    JSON.stringify(sections) !== JSON.stringify(originalSections) ||
    pageStatus !== originalStatus,
    [sections, originalSections, pageStatus, originalStatus]
  );
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/page-compositions", { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load");
      setPages(data.pages || []);
      setSectionTypes(data.sectionTypes || []);
      // Preserve currently selected page (don't jump to home)
      if (selectedKey && data.pages) {
        const pageToKeep = data.pages.find(p => p.pageKey === selectedKey);
        if (pageToKeep) {
          selectPage(pageToKeep, false);
        }
      } else if (data.pages && data.pages[0]) {
        // Only select home by default if no page is currently selected
        selectPage(data.pages[0], false);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function selectPage(page, checkDirty = true) {
    if (checkDirty && dirty) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    setSelectedKey(page.pageKey);
    const s = JSON.parse(JSON.stringify(page.sections || []));
    setSections(s);
    setOriginalSections(s);
    const st = page.status || "active";
    setPageStatus(st);
    setOriginalStatus(st);
    setSelectedSectionId(null);  // clear preview selection when switching pages
    setError(""); setToast("");
    onDirtyChange?.(false);
  }

  async function handlePathChange(newPath) {
    if (!newPath.startsWith("/")) newPath = "/" + newPath;
    if (newPath === selectedPage.path) return;

    const proceed = window.confirm(
      `Change path from "${selectedPage.path}" to "${newPath}"?\n\n` +
      `This will update:\n` +
      `• routes.json\n` +
      `• Navigation links\n` +
      `• Footer links\n` +
      `• Internal CTAs and links\n\n` +
      `A 301 redirect from the old path will go live on the next deploy.`
    );
    if (!proceed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/page-path", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pageKey: selectedKey,
          oldPath: selectedPage.path,
          newPath: newPath,
        }),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok || !updated.ok) throw new Error(updated.error || `HTTP ${res.status}`);
      setPages(updated.pages);
      alert("✓ Page path updated and all references cascaded.");
    } catch (err) {
      alert("✗ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!selectedKey) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/page-compositions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pageKey: selectedKey,
          sections,
          status: pageStatus,
          // Layout version this tab loaded — lets the server refuse the save
          // (409) if the stored layout changed since, instead of overwriting.
          baseVersion: sectionsFingerprint(originalSections),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (res.status === 409) setConflict(true);
        throw new Error(data.error || "Save failed");
      }
      setConflict(false);
      setOriginalSections(JSON.parse(JSON.stringify(sections)));
      setOriginalStatus(pageStatus);
      onDirtyChange?.(false);
      setToast("Layout saved");
      // Refresh page list to keep in sync
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  // ── Section list manipulation ──────────────────────────────────────────

  function moveUp(i) {
    if (i === 0) return;
    const next = [...sections];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setSections(next);
  }

  function moveDown(i) {
    if (i >= sections.length - 1) return;
    const next = [...sections];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setSections(next);
  }

  function toggleVisible(i) {
    const next = [...sections];
    next[i] = { ...next[i], visible: !next[i].visible };
    setSections(next);
  }

  function removeSection(i) {
    const s = sections[i];
    if (!confirm(`Remove "${sectionTypeLabel(s.type)}" section from this page?`)) return;
    setSections(sections.filter((_, idx) => idx !== i));
  }

  function duplicateSection(i) {
    const copy = JSON.parse(JSON.stringify(sections[i]));
    copy.id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next = [...sections];
    next.splice(i + 1, 0, copy);
    setSections(next);
    setSelectedSectionId(copy.id); // jump straight into editing the copy
  }

  // Copy one section (with its current content) to the bottom of another
  // page. Writes directly to that page via the API — it isn't the page
  // currently open for editing, so there's nothing to "Save layout" on.
  // Updates local `pages` state only (no load()) so any unsaved edits on
  // the page currently being edited are left untouched.
  async function copySectionToPage(index, targetPageKey) {
    const section = sections[index];
    const targetPage = pages.find(p => p.pageKey === targetPageKey);
    if (!section || !targetPage) return;

    const copy = JSON.parse(JSON.stringify(section));
    copy.id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const updatedSections = [...(targetPage.sections || []), copy];

    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/page-compositions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pageKey: targetPageKey, sections: updatedSections, status: targetPage.status || "active" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || `Failed to copy to ${targetPage.title}`);
      setPages(prev => prev.map(p => p.pageKey === targetPageKey ? { ...p, sections: updatedSections } : p));
      setToast(`Copied "${sectionTypeLabel(section.type)}" to ${targetPage.title}`);
      setCopyTarget(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function addSection(typeId, layoutId) {
    const st = sectionTypes.find(t => t.id === typeId);
    // Determine layout/colorScheme defaults when a specific layout was picked
    const layoutDef = layoutId && st?.layouts?.find(l => l.id === layoutId);
    const colorScheme = layoutDef?.supportedColorSchemes?.[0] || st?.defaultColorScheme || null;
    // Build content: start with defaultContent, then layer in layout/colorScheme
    const baseContent = st?.defaultContent ? JSON.parse(JSON.stringify(st.defaultContent)) : {};
    const content = {
      ...baseContent,
      ...(layoutId    ? { layout: layoutId }      : {}),
      ...(colorScheme ? { colorScheme }            : {}),
    };
    const newSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: typeId,
      visible: true,
      ...(layoutId    ? { layout: layoutId }      : {}),
      ...(colorScheme ? { colorScheme }            : {}),
      ...(Object.keys(content).length > 0 ? { content } : {}),
    };
    setSections([...sections, newSection]);
    setAddPickerOpen(false);
  }

  function updateSectionContentById(sectionId, newContent) {
    const i = sections.findIndex(s => s.id === sectionId);
    if (i < 0) return;
    updateSectionContent(i, newContent);
  }

  function updateSectionContent(i, newContent) {
    const next = [...sections];
    // Extract layout/colorScheme from content and also store them at section level
    // (page-compositions.json stores them both places for redundancy)
    const { layout, colorScheme } = newContent || {};
    next[i] = {
      ...next[i],
      content: newContent,
      ...(layout !== undefined ? { layout } : {}),
      ...(colorScheme !== undefined ? { colorScheme } : {}),
    };
    setSections(next);
  }

  async function applyToAllPages(sectionId, sectionType, newContent) {
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx < 0) return;

    const { layout, colorScheme } = newContent || {};
    function patchSection(s) {
      return {
        ...s,
        content: newContent,
        ...(layout !== undefined ? { layout } : {}),
        ...(colorScheme !== undefined ? { colorScheme } : {}),
      };
    }

    const updatedCurrentSections = sections.map((s, i) => i === idx ? patchSection(s) : s);

    const otherPages = pages.filter(p =>
      p.pageKey !== selectedKey &&
      (p.sections || []).some(s => s.type === sectionType)
    );

    if (otherPages.length > 0) {
      const pageList = otherPages.map(p => `  • ${p.title}`).join("\n");
      const proceed = window.confirm(
        `⚠ Apply to all ${otherPages.length + 1} pages?\n\n` +
        `"${sectionTypeLabel(sectionType)}" will also be updated on:\n${pageList}\n\n` +
        `This overwrites content on those pages and cannot be undone.`
      );
      if (!proceed) return;
    }

    setSaving(true); setError("");
    try {
      const res0 = await fetch("/api/admin/page-compositions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pageKey: selectedKey, sections: updatedCurrentSections, status: pageStatus }),
      });
      const d0 = await res0.json();
      if (!d0.ok) throw new Error(d0.error || "Failed to save current page");

      for (const page of otherPages) {
        const updatedSections = (page.sections || []).map(s =>
          s.type === sectionType ? patchSection(s) : s
        );
        const res = await fetch("/api/admin/page-compositions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pageKey: page.pageKey, sections: updatedSections, status: page.status || "active" }),
        });
        const d = await res.json();
        if (!d.ok) throw new Error(d.error || `Failed to save ${page.title}`);
      }

      setSections(updatedCurrentSections);
      setOriginalSections(JSON.parse(JSON.stringify(updatedCurrentSections)));
      setOriginalStatus(pageStatus);
      onDirtyChange?.(false);
      setToast(otherPages.length > 0
        ? `Applied to ${otherPages.length + 1} pages`
        : "Saved to this page"
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function sectionTypeLabel(typeId) {
    const st = sectionTypes.find(t => t.id === typeId);
    return st ? st.displayName : typeId;
  }

  function _sectionDataSource(typeId) {
    const st = sectionTypes.find(t => t.id === typeId);
    return st ? (DATA_SOURCE_LABELS[st.dataSource] || st.dataSource) : "";
  }

  function sectionIsEditable(typeId) {
    const st = sectionTypes.find(t => t.id === typeId);
    if (!st) return false;
    // Inline types have content editors; shared:situations and page:* data-driven
    // sections also have editors (they load from their own API endpoints).
    return (
      st.dataSource === "inline" ||
      (st.layouts && st.layouts.length > 1) ||
      st.dataSource === "shared:situations" ||
      (typeof st.dataSource === "string" && st.dataSource.startsWith("page:"))
    );
  }

  // Short human summary of a section's inline content, so two sections of the
  // same type (e.g. two photo breaks) are distinguishable in the list.
  function _sectionSummary(s) {
    const c = s.content || {};
    switch (s.type) {
      case "home-hero":   return [c.title1, c.title2].filter(Boolean).join(" ");
      case "hero":        return c.title || c.eyebrow || "";
      case "stats-band":  return (c.stats || []).map(x => x.value).filter(Boolean).join("  ·  ");
      case "our-edge":    return [c.title, c.titleAccent].filter(Boolean).join(" ");
      case "photo-break": return c.overlayText || c.imageUrl || "";
      case "media-banner": return [c.title, c.subtitle].filter(Boolean).join(" — ");
      case "rich-text":    return [c.heading1, c.heading1Accent].filter(Boolean).join(" ") || c.eyebrow || "";
      case "cta-banner":  return c.title || c.cta || "";
      case "bottom-cta":  return [c.title, c.accent].filter(Boolean).join(" ");
      case "get-quote":   return [c.title, c.titleAccent].filter(Boolean).join(" ");
      default:            return "";
    }
  }

  // Whether a section type may be added to the current page right now.
  // Respects availableOn (page allow-list). Removed allowMultiple check — sections can now be added multiple times.
  function _typeAvailability(st) {
    if (Array.isArray(st.availableOn) && selectedKey && !st.availableOn.includes(selectedKey)) {
      return { ok: false, reason: `Only on: ${st.availableOn.join(", ")}` };
    }
    return { ok: true, reason: "" };
  }

  // ── New page ────────────────────────────────────────────────────────────

  function slugifyKey(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  async function createPage() {
    if (!newPageForm) return;
    const { title, pageKey, path } = newPageForm;
    if (!title.trim() || !pageKey.trim() || !path.trim()) {
      setError("Title, key, and path are all required"); return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/page-compositions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), pageKey: pageKey.trim(), path: path.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to create page");
      setNewPageForm(null);
      setToast(`Page "${title}" created`);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deletePage(pageKey) {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/page-compositions?pageKey=${encodeURIComponent(pageKey)}`, {
        method: "DELETE", credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to delete");
      setDeleteConfirm(null);
      setToast("Page deleted");
      if (selectedKey === pageKey) setSelectedKey(null);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const selectedPage = pages.find(p => p.pageKey === selectedKey);
  const wrap = { maxWidth: 1440, margin: "0 auto", padding: "1.4rem clamp(1rem,2vw,1.5rem) 3rem" };

  return (
    <div style={{ fontFamily: FONT, color: INK }}>
      <div style={wrap}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Page Builder</h2>
            <p style={{ fontSize: "0.85rem", color: INK_60, marginTop: 2 }}>
              Reorder, hide, and manage sections on each page. Add new pages without a code deploy.
            </p>
          </div>
          <button style={btnPrimaryStyle} onClick={() => setNewPageForm({ title: "", pageKey: "", path: "/" })} disabled={saving}>
            + New page
          </button>
        </div>

        {error && (
          <Banner kind="error">
            {error}
            {conflict && (
              <button type="button" onClick={() => { setConflict(false); load(); }} style={{
                marginLeft: 12, fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 700,
                background: "#7a1a1a", color: "#fff", border: "none", borderRadius: 4,
                padding: "0.35rem 0.8rem", cursor: "pointer",
              }}>
                Load latest version
              </button>
            )}
          </Banner>
        )}
        {toast && <Banner kind="ok">{toast}</Banner>}
        {loading && <p style={{ color: INK_60 }}>Loading…</p>}

        <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0, 1fr) 360px", gap: "1rem", alignItems: "start" }}>
          {/* Left: page list */}
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: INK_60, marginBottom: "0.6rem" }}>
              Pages
            </div>
            {pages.map(p => (
              <div
                key={p.pageKey}
                style={{
                  display: "flex", alignItems: "center",
                  padding: "0.55rem 0.7rem",
                  marginBottom: 2,
                  cursor: "pointer",
                  background: p.pageKey === selectedKey ? "#F0F1F3" : "transparent",
                  border: `1px solid ${p.pageKey === selectedKey ? LINE_STRONG : "transparent"}`,
                  userSelect: "none",
                }}
              >
                <span
                  style={{ flex: 1, fontSize: "0.88rem", fontWeight: p.pageKey === selectedKey ? 700 : 500 }}
                  onClick={() => selectPage(p)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {p.title}
                    {p.status && p.status !== "active" && (() => {
                      const cfg = { draft: { label: "Draft", color: "#9a6700", bg: "rgba(154,103,0,0.12)" }, archive: { label: "Archive", color: "#57606a", bg: "rgba(87,96,106,0.12)" } }[p.status];
                      return cfg ? (
                        <span style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", padding: "0 4px", borderRadius: 2, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      ) : null;
                    })()}
                  </span>
                  <span style={{ display: "block", fontSize: "0.7rem", color: INK_60, fontFamily: "monospace", marginTop: 1 }}>{p.path}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Center: live page preview */}
          {selectedPage ? (
            <div>
              {/* ── Path Editor ────────────────────────── */}
              <PathEditor pageKey={selectedKey} currentPath={selectedPage.path} onPathChange={handlePathChange} />

              {/* ── Header row above the preview ────────────────────────── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>
                  {selectedPage.title}
                  <span style={{ fontSize: "0.72rem", fontWeight: 500, color: INK_60, marginLeft: 8, fontFamily: "monospace" }}>{selectedPage.path}</span>
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {sections.some(s => s.visible === false) && (
                    <button
                      style={{
                        ...btnStyle, fontSize: "0.78rem",
                        background: showHidden ? "rgba(212,255,0,0.12)" : "transparent",
                        borderColor: showHidden ? NEON : undefined,
                        color: showHidden ? INK : INK_60,
                      }}
                      onClick={() => setShowHidden(v => !v)}
                      title={showHidden ? "Click to hide hidden sections from preview (see published view)" : "Click to show hidden sections in preview"}
                    >
                      {showHidden ? "Showing hidden" : "Show hidden"}
                    </button>
                  )}
                  <button style={{ ...btnStyle, fontSize: "0.78rem" }} onClick={() => setPreviewOpen(true)} disabled={saving || sections.length === 0} title={sections.length === 0 ? "Add a section to preview" : "Open in full screen"}>
                    Full preview
                  </button>
                  <button style={{ ...btnStyle, fontSize: "0.78rem" }} onClick={() => setAddPickerOpen(true)} disabled={saving}>
                    + Add section
                  </button>
                  <button
                    style={{ ...btnPrimaryStyle, fontSize: "0.78rem", opacity: (!dirty || saving) ? 0.5 : 1, cursor: (!dirty || saving) ? "default" : "pointer" }}
                    onClick={save}
                    disabled={!dirty || saving}
                  >
                    {saving ? "Saving…" : "Save layout"}
                  </button>
                </div>
              </div>

              {/* ── Page Status Bar ───────────────────────────────────── */}
              <PageStatusBar
                status={pageStatus}
                onChange={setPageStatus}
                pageKey={selectedKey}
                onDelete={() => setDeleteConfirm(selectedKey)}
              />

              {/* ── Section action toolbar (for the selected section) ─── */}
              {selectedSectionId && (() => {
                const idx = sections.findIndex(s => s.id === selectedSectionId);
                if (idx < 0) return null;
                const s = sections[idx];
                const st = sectionTypes.find(t => t.id === s.type);
                const _isInline = sectionIsEditable(s.type);
                return (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "0.45rem 0.75rem",
                    background: "rgba(212,255,0,0.10)",
                    border: `1px solid ${NEON}`,
                    marginBottom: "0.6rem",
                    fontSize: "0.78rem",
                  }}>
                    <span style={{ fontWeight: 700 }}>
                      Editing: {st ? st.displayName : s.type}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button style={{ ...ICON_BTN, fontSize: "0.7rem", height: 26 }} onClick={() => moveUp(idx)} disabled={idx === 0} aria-label="Move up" title="Move up">▲ Up</button>
                    <button style={{ ...ICON_BTN, fontSize: "0.7rem", height: 26 }} onClick={() => moveDown(idx)} disabled={idx === sections.length - 1} aria-label="Move down" title="Move down">▼ Down</button>
                    <button style={{ ...ICON_BTN, fontSize: "0.7rem", height: 26 }} onClick={() => duplicateSection(idx)} title="Duplicate this section (copy appears below)">⧉ Duplicate</button>
                    <button style={{ ...ICON_BTN, fontSize: "0.7rem", height: 26, width: "auto", padding: "0 0.55rem" }} onClick={() => setCopyTarget({ index: idx, section: s })} title="Copy this section (with its content) to another page">⇥ Copy to page…</button>
                    <button style={{ ...ICON_BTN, fontSize: "0.7rem", height: 26 }} onClick={() => toggleVisible(idx)} title={s.visible ? "Hide" : "Show"}>
                      {s.visible ? "Hide" : "Show"}
                    </button>
                    {/* Data-driven sections (situations, audience-cards, etc.) need
                        the wide modal. Inline sections are edited in the right panel. */}
                    {st && (st.dataSource === "shared:situations" || (typeof st.dataSource === "string" && st.dataSource.startsWith("page:"))) && (
                      <button
                        style={{ ...btnStyle, fontSize: "0.74rem", padding: "0.22rem 0.55rem" }}
                        onClick={() => setEditingSection({ index: idx, section: s, sectionType: st })}
                      >
                        Edit content
                      </button>
                    )}
                    <button
                      style={{ ...ICON_BTN, color: "#c0392b", borderColor: "#e3b7b1", fontSize: "0.95rem", width: 26, height: 26 }}
                      onClick={() => removeSection(idx)}
                      title="Remove section"
                    >
                      ×
                    </button>
                  </div>
                );
              })()}

              {/* ── Live page preview ─────────────────────────────────── */}
              <CenterPreview
                sections={sections}
                pageKey={selectedKey}
                pagePath={selectedPage.path}
                pageTitle={selectedPage.title}
                selectedSectionId={selectedSectionId}
                onSelectSection={setSelectedSectionId}
                sectionTypes={sectionTypes}
                showHidden={showHidden}
              />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: INK_60, fontSize: "0.9rem", padding: "3rem 1rem" }}>
              Select a page on the left to manage its sections.
            </div>
          )}

          {/* Right: property panel — live editor for the selected section */}
          {selectedPage && (
            <PropertyPanel
              pageTitle={selectedPage.title}
              selectedSection={sections.find(s => s.id === selectedSectionId) || null}
              sectionTypeDef={(() => {
                const s = sections.find(s => s.id === selectedSectionId);
                if (!s) return null;
                return sectionTypes.find(t => t.id === s.type);
              })()}
              sections={sections}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onUpdateContent={updateSectionContentById}
              onApplyToAllPages={applyToAllPages}
              onToggleVisible={i => toggleVisible(i)}
              onMoveUp={i => moveUp(i)}
              onMoveDown={i => moveDown(i)}
            />
          )}
        </div>
      </div>

      {/* Add Section — Visual Template Picker */}
      {addPickerOpen && (
        <TemplatePicker
          sectionTypes={sectionTypes}
          sections={sections}
          selectedKey={selectedKey}
          onAdd={(typeId, layoutId) => addSection(typeId, layoutId)}
          onClose={() => setAddPickerOpen(false)}
        />
      )}

      {/* Live Preview */}
      {previewOpen && selectedPage && (
        <PagePreviewOverlay
          sections={sections}
          pageKey={selectedPage.pageKey}
          title={selectedPage.title}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* Section Content Editor */}
      {editingSection && (
        <SectionEditorModal
          section={editingSection.section}
          sectionType={editingSection.sectionType}
          pageKey={selectedKey}
          onSave={newContent => {
            updateSectionContent(editingSection.index, newContent);
            setEditingSection(null);
          }}
          onClose={() => setEditingSection(null)}
        />
      )}

      {/* New Page Form */}
      {newPageForm && (
        <Modal onClose={() => setNewPageForm(null)}>
          <h3 style={{ fontWeight: 800, marginBottom: "1rem" }}>New page</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.74rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Page Title *</label>
              <input style={inputStyle} value={newPageForm.title}
                onChange={e => {
                  const title = e.target.value;
                  const pageKey = slugifyKey(title);
                  const path = pageKey ? `/${pageKey}` : "/";
                  setNewPageForm(prev => ({ ...prev, title, pageKey, path }));
                }}
                placeholder="e.g. Mass Arbitration" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.74rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>URL Path *</label>
              <input style={inputStyle} value={newPageForm.path}
                onChange={e => setNewPageForm(prev => ({ ...prev, path: e.target.value }))}
                placeholder="/mass-arbitration" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.74rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Page Key (slug)</label>
              <input style={{ ...inputStyle, opacity: 0.6 }} value={newPageForm.pageKey} disabled />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: "1.2rem" }}>
            <button style={{ ...btnPrimaryStyle, opacity: (!newPageForm.title.trim() || saving) ? 0.5 : 1 }}
              onClick={createPage} disabled={!newPageForm.title.trim() || saving}>
              {saving ? "Creating…" : "Create page"}
            </button>
            <button style={btnStyle} onClick={() => setNewPageForm(null)} disabled={saving}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (() => {
        const target = pages.find(p => p.pageKey === deleteConfirm);
        const isBuiltIn = target && target.builtIn;
        return (
          <Modal onClose={() => setDeleteConfirm(null)}>
            <h3 style={{ fontWeight: 800, marginBottom: "0.75rem", color: "#c0392b" }}>
              {isBuiltIn ? "⚠ Delete built-in page?" : "Delete page?"}
            </h3>
            <p style={{ marginBottom: "0.75rem" }}>
              Delete <strong>{target ? target.title : deleteConfirm}</strong>?
              The route and all section data will be permanently removed. This can't be undone.
            </p>
            {isBuiltIn && (
              <p style={{ marginBottom: "1rem", padding: "0.6rem 0.75rem", background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.3)", fontSize: "0.85rem", color: "#9a3020" }}>
                This is a core site page. If you delete it, the route will be broken and the page can't be recovered from the admin. You'd need to restore it via code. Consider setting it to <strong>Archive</strong> instead.
              </p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnPrimaryStyle, background: "#c0392b", color: "#fff" }} onClick={() => deletePage(deleteConfirm)} disabled={saving}>
                {saving ? "Deleting…" : "Delete permanently"}
              </button>
              <button style={btnStyle} onClick={() => setDeleteConfirm(null)} disabled={saving}>Cancel</button>
            </div>
          </Modal>
        );
      })()}

      {/* Copy Section to Page */}
      {copyTarget && (() => {
        const st = sectionTypes.find(t => t.id === copyTarget.section.type);
        const eligiblePages = pages.filter(p => {
          if (p.pageKey === selectedKey) return false;
          if (st && Array.isArray(st.availableOn) && !st.availableOn.includes(p.pageKey)) return false;
          return true;
        });
        return (
          <Modal onClose={() => setCopyTarget(null)}>
            <h3 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>
              Copy "{sectionTypeLabel(copyTarget.section.type)}" to…
            </h3>
            <p style={{ fontSize: "0.82rem", color: INK_60, marginBottom: "1rem" }}>
              Adds this section — with its current content — to the bottom of the page you pick. That page saves immediately; your edits here are untouched.
            </p>
            {eligiblePages.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: INK_60 }}>No other eligible pages.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
                {eligiblePages.map(p => (
                  <button
                    key={p.pageKey}
                    style={{ ...btnStyle, textAlign: "left", justifyContent: "flex-start", fontSize: "0.85rem" }}
                    onClick={() => copySectionToPage(copyTarget.index, p.pageKey)}
                    disabled={saving}
                  >
                    {p.title}
                    <span style={{ color: INK_60, fontFamily: "monospace", fontSize: "0.72rem", marginLeft: 8 }}>{p.path}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: "1rem" }}>
              <button style={btnStyle} onClick={() => setCopyTarget(null)} disabled={saving}>Cancel</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
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

function Modal({ children, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: SURFACE, border: `1px solid ${LINE}`, padding: "1.5rem", maxWidth: 480, width: "100%", fontFamily: FONT, color: INK, maxHeight: "80vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

/* ── Page Status Bar ──────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  active:  { label: "Active",  color: "#1a7f37", bg: "rgba(26,127,55,0.10)",  border: "rgba(26,127,55,0.35)",  dot: "#2da44e", desc: "Live on the site, visible in nav." },
  draft:   { label: "Draft",   color: "#9a6700", bg: "rgba(154,103,0,0.10)",  border: "rgba(154,103,0,0.35)",  dot: "#d4a017", desc: "Hidden from nav, returns 404 to visitors." },
  archive: { label: "Archive", color: "#57606a", bg: "rgba(87,96,106,0.10)",  border: "rgba(87,96,106,0.35)", dot: "#8c959f", desc: "Taken offline. URL returns 404." },
};

function PageStatusBar({ status, onChange, pageKey: _pageKey, onDelete }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      padding: "0.6rem 0.9rem",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      marginBottom: "0.9rem",
    }}>
      {/* Status dot + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
        <span style={{ fontWeight: 800, fontSize: "0.82rem", color: cfg.color, letterSpacing: "0.03em" }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: "0.78rem", color: cfg.color, opacity: 0.8 }}>— {cfg.desc}</span>
      </div>

      {/* Status selector */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
        {Object.entries(STATUS_CONFIG).map(([key, c]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
              padding: "0.25rem 0.65rem", border: `1px solid`,
              borderColor: status === key ? c.dot : "rgba(0,0,0,0.15)",
              background: status === key ? c.bg : "transparent",
              color: status === key ? c.color : INK_60,
              cursor: "pointer", borderRadius: 3,
              transition: "all 0.15s",
            }}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={onDelete}
          title="Permanently delete this page"
          style={{
            fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
            padding: "0.25rem 0.65rem",
            border: "1px solid rgba(192,57,43,0.3)",
            background: "rgba(192,57,43,0.06)",
            color: "#c0392b", cursor: "pointer", borderRadius: 3,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function PathEditor({ pageKey: _pageKey, currentPath, onPathChange }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [newPath, setNewPath] = React.useState(currentPath);

  function handleSave() {
    onPathChange(newPath);
    setIsEditing(false);
  }

  function handleCancel() {
    setNewPath(currentPath);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        marginBottom: "0.9rem", padding: "0.6rem 0.8rem",
        background: "#F9FAFB", border: `1px solid ${LINE}`, borderRadius: 4,
      }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", letterSpacing: "0.05em" }}>Page URL</span>
        <code style={{ fontFamily: "monospace", fontSize: "0.85rem", flex: 1, color: INK }}>{currentPath}</code>
        <button
          onClick={() => setIsEditing(true)}
          style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: "0.9rem", padding: "0.8rem",
      background: "rgba(212,255,0,0.06)", border: `1px solid ${NEON}`, borderRadius: 4,
    }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        Change page URL
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          type="text"
          value={newPath}
          onChange={e => setNewPath(e.target.value)}
          style={{
            flex: 1, fontFamily: "monospace", fontSize: "0.85rem",
            padding: "0.45rem 0.6rem", border: `1px solid ${LINE}`, borderRadius: 3,
          }}
          placeholder="/new-path"
        />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={handleSave} style={{ ...btnPrimaryStyle, fontSize: "0.7rem", padding: "0.3rem 0.6rem", flex: 1 }}>
          Update & Cascade
        </button>
        <button onClick={handleCancel} style={{ ...btnStyle, fontSize: "0.7rem", padding: "0.3rem 0.6rem" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
