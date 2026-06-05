import React, { useState, useEffect, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE, LINE_STRONG, SURFACE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";
import SectionEditorModal from "./SectionEditorModal.jsx";
import PagePreviewOverlay from "./PagePreviewOverlay.jsx";

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

  // Modals
  const [editingSection, setEditingSection] = useState(null);   // { section, sectionType }
  const [addPickerOpen, setAddPickerOpen]   = useState(false);
  const [newPageForm, setNewPageForm]       = useState(null);   // null | { title, pageKey, path }
  const [deleteConfirm, setDeleteConfirm]   = useState(null);   // pageKey to delete
  const [previewOpen, setPreviewOpen]       = useState(false);  // live preview overlay

  useEffect(() => { load(); }, []);

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
      // Select home by default
      const defaultKey = (data.pages && data.pages[0] && data.pages[0].pageKey) || null;
      if (defaultKey) selectPage(data.pages[0], false);
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
    setError(""); setToast("");
    onDirtyChange?.(false);
  }

  async function save() {
    if (!selectedKey) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/page-compositions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pageKey: selectedKey, sections, status: pageStatus }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");
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

  function addSection(type) {
    const st = sectionTypes.find(t => t.id === type);
    const content = st && st.defaultContent ? JSON.parse(JSON.stringify(st.defaultContent)) : undefined;
    const newSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      visible: true,
      ...(content ? { content } : {}),
    };
    setSections([...sections, newSection]);
    setAddPickerOpen(false);
  }

  function updateSectionContent(i, newContent) {
    const next = [...sections];
    // Extract layout/colorScheme from content and also store them at section level
    // (page-compositions.json stores them both places for redundancy)
    const { layout, colorScheme, ...rest } = newContent || {};
    next[i] = {
      ...next[i],
      content: newContent,
      ...(layout !== undefined ? { layout } : {}),
      ...(colorScheme !== undefined ? { colorScheme } : {}),
    };
    setSections(next);
  }

  function sectionTypeLabel(typeId) {
    const st = sectionTypes.find(t => t.id === typeId);
    return st ? st.displayName : typeId;
  }

  function sectionDataSource(typeId) {
    const st = sectionTypes.find(t => t.id === typeId);
    return st ? (DATA_SOURCE_LABELS[st.dataSource] || st.dataSource) : "";
  }

  function sectionIsEditable(typeId) {
    const st = sectionTypes.find(t => t.id === typeId);
    // Inline types are always editable; shared types with layout options are editable for template configuration
    return st && (st.dataSource === "inline" || (st.layouts && st.layouts.length > 1));
  }

  // Short human summary of a section's inline content, so two sections of the
  // same type (e.g. two photo breaks) are distinguishable in the list.
  function sectionSummary(s) {
    const c = s.content || {};
    switch (s.type) {
      case "home-hero":   return [c.title1, c.title2].filter(Boolean).join(" ");
      case "hero":        return c.title || c.eyebrow || "";
      case "stats-band":  return (c.stats || []).map(x => x.value).filter(Boolean).join("  ·  ");
      case "our-edge":    return [c.title, c.titleAccent].filter(Boolean).join(" ");
      case "photo-break": return c.overlayText || c.imageUrl || "";
      case "cta-banner":  return c.title || c.cta || "";
      case "bottom-cta":  return [c.title, c.accent].filter(Boolean).join(" ");
      case "get-quote":   return [c.title, c.titleAccent].filter(Boolean).join(" ");
      default:            return "";
    }
  }

  // Whether a section type may be added to the current page right now.
  // Respects availableOn (page allow-list) and allowMultiple (singletons).
  function typeAvailability(st) {
    if (Array.isArray(st.availableOn) && selectedKey && !st.availableOn.includes(selectedKey)) {
      return { ok: false, reason: `Only on: ${st.availableOn.join(", ")}` };
    }
    if (st.allowMultiple !== true && sections.some(s => s.type === st.id)) {
      return { ok: false, reason: "Already on this page" };
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
  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "1.4rem clamp(1rem,3vw,2rem) 3rem" };

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

        {error && <Banner kind="error">{error}</Banner>}
        {toast && <Banner kind="ok">{toast}</Banner>}
        {loading && <p style={{ color: INK_60 }}>Loading…</p>}

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.5rem" }}>
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
                <button
                  style={{ ...ICON_BTN, color: "#c0392b", borderColor: "#e3b7b1", marginLeft: 4, fontSize: "1rem" }}
                  onClick={() => setDeleteConfirm(p.pageKey)}
                  title="Delete page"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Right: section list */}
          {selectedPage ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>
                  {selectedPage.title}
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: INK_60, marginLeft: 8, fontFamily: "monospace" }}>{selectedPage.path}</span>
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...btnStyle, fontSize: "0.82rem" }} onClick={() => setPreviewOpen(true)} disabled={saving || sections.length === 0} title={sections.length === 0 ? "Add a section to preview" : "Preview this page with your unsaved changes"}>
                    Preview
                  </button>
                  <button style={{ ...btnStyle, fontSize: "0.82rem" }} onClick={() => setAddPickerOpen(true)} disabled={saving}>
                    + Add section
                  </button>
                  <button
                    style={{ ...btnPrimaryStyle, opacity: (!dirty || saving) ? 0.5 : 1, cursor: (!dirty || saving) ? "default" : "pointer" }}
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

              {sections.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", border: `1px dashed ${LINE}`, color: INK_60, fontSize: "0.9rem" }}>
                  No sections yet. Click "+ Add section" to start building this page.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {sections.map((s, i) => {
                    const isInline = sectionIsEditable(s.type);
                    return (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "0.65rem 0.75rem",
                        background: s.visible ? SURFACE : "#F7F7F7",
                        border: `1px solid ${LINE}`,
                        opacity: s.visible ? 1 : 0.55,
                      }}>
                        {/* Reorder */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                          <button style={{ ...ICON_BTN, height: 22, fontSize: "0.65rem" }} onClick={() => moveUp(i)} disabled={i === 0} title="Move up">▲</button>
                          <button style={{ ...ICON_BTN, height: 22, fontSize: "0.65rem" }} onClick={() => moveDown(i)} disabled={i === sections.length - 1} title="Move down">▼</button>
                        </div>

                        {/* Section info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{sectionTypeLabel(s.type)}</span>
                            {/* Layout badge — shown for template-enabled section types */}
                            {s.layout && (
                              <span style={{
                                fontSize: "0.65rem", fontWeight: 700, padding: "0 5px", height: 16,
                                display: "inline-flex", alignItems: "center",
                                background: "rgba(212,255,0,0.15)", color: "#4a6000",
                                border: "1px solid rgba(212,255,0,0.4)", borderRadius: 3,
                                letterSpacing: "0.03em", textTransform: "uppercase",
                              }}>
                                {(() => {
                                  const st = sectionTypes.find(t => t.id === s.type);
                                  const ld = st?.layouts?.find(l => l.id === s.layout);
                                  return ld ? ld.displayName : s.layout;
                                })()}
                              </span>
                            )}
                            {/* Color scheme dot */}
                            {s.colorScheme && (
                              <span title={s.colorScheme} style={{
                                fontSize: "0.65rem", fontWeight: 600, padding: "0 5px", height: 16,
                                display: "inline-flex", alignItems: "center", gap: 4,
                                background: "#F3F4F6", color: INK_60,
                                border: `1px solid ${LINE}`, borderRadius: 3,
                              }}>
                                <span style={{
                                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                                  background: {
                                    light: "#E5E7EB", "light-gray": "#D1D5DB", "light-card": "#fff",
                                    dark: "#0A0A0A", photo: "linear-gradient(135deg,#888 50%,#444)",
                                  }[s.colorScheme] || "#ccc",
                                  border: "1px solid rgba(0,0,0,0.15)",
                                }} />
                                {s.colorScheme}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const summary = sectionSummary(s);
                            return (
                              <div
                                style={{ fontSize: "0.72rem", color: INK_60, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontStyle: summary ? "italic" : "normal" }}
                                title={summary || undefined}
                              >
                                {summary || sectionDataSource(s.type)}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Actions */}
                        {isInline && (
                          <button
                            style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                            onClick={() => setEditingSection({ index: i, section: s, sectionType: sectionTypes.find(t => t.id === s.type) })}
                          >
                            Edit content
                          </button>
                        )}
                        <button
                          style={{ ...ICON_BTN, fontSize: "0.78rem", minWidth: 64 }}
                          onClick={() => toggleVisible(i)}
                          title={s.visible ? "Hide from page" : "Show on page"}
                        >
                          {s.visible ? "Visible" : "Hidden"}
                        </button>
                        <button
                          style={{ ...ICON_BTN, color: "#c0392b", borderColor: "#e3b7b1", fontSize: "1rem", width: 30 }}
                          onClick={() => removeSection(i)}
                          title="Remove section"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: INK_60, fontSize: "0.9rem" }}>
              Select a page on the left to manage its sections.
            </div>
          )}
        </div>
      </div>

      {/* Add Section Picker */}
      {addPickerOpen && (
        <Modal onClose={() => setAddPickerOpen(false)}>
          <h3 style={{ fontWeight: 800, marginBottom: "1rem" }}>Add a section</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
            {sectionTypes.map(st => {
              const avail = typeAvailability(st);
              return (
                <button
                  key={st.id}
                  disabled={!avail.ok}
                  style={{
                    ...btnStyle, textAlign: "left", padding: "0.7rem 0.9rem", display: "block",
                    opacity: avail.ok ? 1 : 0.45, cursor: avail.ok ? "pointer" : "not-allowed",
                  }}
                  onClick={() => { if (avail.ok) addSection(st.id); }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{st.displayName}</span>
                    {!avail.ok && <span style={{ fontSize: "0.68rem", fontWeight: 600, color: INK_60, whiteSpace: "nowrap", flexShrink: 0 }}>{avail.reason}</span>}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: INK_60, marginTop: 2 }}>{st.description}</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <button style={btnStyle} onClick={() => setAddPickerOpen(false)}>Cancel</button>
          </div>
        </Modal>
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

function PageStatusBar({ status, onChange, pageKey, onDelete }) {
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
