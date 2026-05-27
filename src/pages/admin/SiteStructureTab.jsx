import React, { useState, useEffect, useMemo, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage } from "./shared.jsx";

/* ═══════════════════════════════════════════════════════════════════════════
   SiteStructureTab — consolidated view for Pages, Navigation, and Footer

   Consolidates three admin tabs into one organized interface:
     1. Favicons (from file-library.json)
     2. Site Metadata (from page-meta.json)
     3. Per-page Meta (from page-meta.json)
     4. Navigation items (from nav.json)
     5. Microsite Navs (from nav.json)
     6. Footer columns (from footer.json)
     7. Footer bottom bar (from footer.json)

   Fetches all 4 endpoints in parallel on mount. On save, only dirty
   endpoints are committed. Reports combined dirty state.
═══════════════════════════════════════════════════════════════════════════ */

// ── Constants ───────────────────────────────────────────────────────────
const OG_SLUGS = ["home", "crypto", "ai-copyright", "litigation-finance"];
const FAVICON_ROWS = [
  { key: "production", label: "Production favicon",   hint: "turnpagedigital.com" },
  { key: "preview",    label: "Preview / dev favicon", hint: "*.pages.dev preview deploys" },
  { key: "admin",      label: "Admin favicon",         hint: "/admin pages (any environment)" },
];
const FAVICON_PICKER_TYPES = ["favicon", "icon", "logo"];

// ── Sanitizers ──────────────────────────────────────────────────────────
function sanitizeFavicons(fav) {
  fav = fav || {};
  return {
    production: typeof fav.production === "string" ? fav.production : "",
    preview:    typeof fav.preview    === "string" ? fav.preview    : "",
    admin:      typeof fav.admin      === "string" ? fav.admin      : "",
  };
}

function sanitizeSite(s) {
  s = s || {};
  return {
    name:               typeof s.name               === "string" ? s.name               : "",
    defaultTitle:       typeof s.defaultTitle       === "string" ? s.defaultTitle       : "",
    defaultDescription: typeof s.defaultDescription === "string" ? s.defaultDescription : "",
  };
}

function sanitizePages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(p => ({
    path:        typeof p.path        === "string" ? p.path        : "/",
    title:       typeof p.title       === "string" ? p.title       : "",
    description: typeof p.description === "string" ? p.description : "",
    og:          typeof p.og          === "string" ? p.og          : "home",
    active:      typeof p.active      === "boolean" ? p.active     : true,
  }));
}

function normalizeFooter(data) {
  return {
    columns:      Array.isArray(data?.columns) ? data.columns : [],
    copyright:    typeof data?.copyright === "string"    ? data.copyright    : "",
    copyrightKey: typeof data?.copyrightKey === "string" ? data.copyrightKey : undefined,
    contactEmail: typeof data?.contactEmail === "string" ? data.contactEmail : "",
  };
}

// ── Empty item factories ────────────────────────────────────────────────
function emptyPage() {
  return { path: "/", title: "", description: "", og: "home", active: true };
}

function emptyItem() {
  return { id: `item-${Date.now()}`, label: "", href: "/", active: true };
}

function emptyDropdown() {
  return { title: "", body: "", links: [], cta: { label: "", href: "/" } };
}

function emptyLink() {
  return { label: "", href: "/" };
}

function emptyColumn() {
  return {
    id:    `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "",
    links: [],
  };
}

// ── Main Component ──────────────────────────────────────────────────────
export default function SiteStructureTab({ onDirtyChange }) {
  // ── PAGES state ──────────────────────────────────────────────────────
  const [favicons,         setFavicons]         = useState(null);
  const [originalFavicons, setOriginalFavicons] = useState(null);
  const [files,            setFiles]            = useState([]);
  const [site,             setSite]             = useState(null);
  const [originalSite,     setOriginalSite]     = useState(null);
  const [pages,            setPages]            = useState(null);
  const [originalPages,    setOriginalPages]    = useState(null);

  // ── NAVIGATION state ──────────────────────────────────────────────────
  const [items,           setItems]           = useState(null);
  const [microsites,      setMicrosites]      = useState(null);
  const [originalNav,     setOriginalNav]     = useState(null);

  // ── FOOTER state ──────────────────────────────────────────────────────
  const [footer,          setFooter]          = useState(null);
  const [originalFooter,  setOriginalFooter]  = useState(null);

  // ── Shared ────────────────────────────────────────────────────────────
  const [phase,           setPhase]           = useState("loading");
  const [error,           setError]           = useState("");
  const [lastSavedAt,     setLastSavedAt]     = useState(null);

  // ── Dirty flags ───────────────────────────────────────────────────────
  const pagesDirty = useMemo(() => {
    if (!favicons || !site || !pages || !originalFavicons || !originalSite || !originalPages) return false;
    return JSON.stringify({ favicons, site, pages }) !== JSON.stringify({ favicons: originalFavicons, site: originalSite, pages: originalPages });
  }, [favicons, site, pages, originalFavicons, originalSite, originalPages]);

  const navDirty = useMemo(() => {
    if (!items || !originalNav) return false;
    const current = JSON.stringify({ items, microsites });
    return current !== JSON.stringify(originalNav);
  }, [items, microsites, originalNav]);

  const footerDirty = useMemo(() => {
    if (!footer || !originalFooter) return false;
    return JSON.stringify(footer) !== JSON.stringify(originalFooter);
  }, [footer, originalFooter]);

  const dirty = pagesDirty || navDirty || footerDirty;

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { load(); }, []);

  async function load() {
    setPhase("loading"); setError("");
    try {
      const [libRes, metaRes, navRes, footerRes] = await Promise.all([
        fetch("/api/admin/file-library", { credentials: "include" }),
        fetch("/api/admin/page-meta",    { credentials: "include" }),
        fetch("/api/admin/navigation",   { credentials: "include" }),
        fetch("/api/admin/footer",       { credentials: "include" }),
      ]);

      if (libRes.status === 401) return;

      const libBody    = await libRes.json();
      const metaBody   = await metaRes.json();
      const navBody    = await navRes.json();
      const footerBody = await footerRes.json();

      if (!libRes.ok || !libBody.ok)     throw new Error(libBody.error || `HTTP ${libRes.status}`);
      if (!metaRes.ok || !metaBody.ok)   throw new Error(metaBody.error || `HTTP ${metaRes.status}`);
      if (!navRes.ok || !navBody.ok)     throw new Error(navBody.error || `HTTP ${navRes.status}`);
      if (!footerRes.ok || !footerBody.ok) throw new Error(footerBody.error || `HTTP ${footerRes.status}`);

      // Load pages data
      const fav = sanitizeFavicons(libBody.data.favicons);
      setFavicons(fav);
      setOriginalFavicons(JSON.parse(JSON.stringify(fav)));
      setFiles(Array.isArray(libBody.data.files) ? libBody.data.files : []);

      const s = sanitizeSite(metaBody.data?.site);
      setSite(s);
      setOriginalSite(JSON.parse(JSON.stringify(s)));

      const pg = sanitizePages(metaBody.data?.pages);
      setPages(pg);
      setOriginalPages(JSON.parse(JSON.stringify(pg)));

      // Load nav data
      const fetchedItems      = Array.isArray(navBody.data?.items) ? navBody.data.items : [];
      const fetchedMicrosites = navBody.data?.microsites && typeof navBody.data.microsites === "object"
        ? navBody.data.microsites : {};
      setItems(fetchedItems);
      setMicrosites(fetchedMicrosites);
      setOriginalNav(JSON.parse(JSON.stringify({ items: fetchedItems, microsites: fetchedMicrosites })));

      // Load footer data
      const normalized = normalizeFooter(footerBody.data);
      setFooter(normalized);
      setOriginalFooter(JSON.parse(JSON.stringify(normalized)));

      setPhase("ready");
    } catch (e) { setError(e.message); setPhase("error"); }
  }

  async function save() {
    if (!favicons && !site && !pages && !items && !footer) return;
    setPhase("saving"); setError("");
    try {
      const puts = [];
      if (pagesDirty) {
        puts.push(
          fetch("/api/admin/file-library", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ favicons }),
          }),
          fetch("/api/admin/page-meta", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ site, pages }),
          }),
        );
      }
      if (navDirty) {
        puts.push(
          fetch("/api/admin/navigation", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ items, microsites }),
          }),
        );
      }
      if (footerDirty) {
        puts.push(
          fetch("/api/admin/footer", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(footer),
          }),
        );
      }

      const results = await Promise.all(puts);
      for (const r of results) {
        const body = await r.json().catch(() => ({}));
        if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      }

      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }

  if (phase === "loading") return <CenteredMessage>Loading site structure…</CenteredMessage>;
  if (phase === "error" && favicons === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!favicons) return null;

  const isSaving = phase === "saving";

  // ── PAGES helpers ────────────────────────────────────────────────────
  function setFavicon(envKey, url) {
    setFavicons(prev => ({ ...prev, [envKey]: url }));
  }

  function updateSite(patch) {
    setSite(prev => ({ ...prev, ...patch }));
  }

  function updatePage(index, patch) {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
  }

  function removePage(index) {
    setPages(prev => prev.filter((_, i) => i !== index));
  }

  function addPage() {
    setPages(prev => [...prev, emptyPage()]);
  }

  // ── NAVIGATION helpers ───────────────────────────────────────────────
  function update(index, patch) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it));
  }

  function updateDropdown(index, patch) {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const existing = it.dropdown || emptyDropdown();
      return { ...it, dropdown: { ...existing, ...patch } };
    }));
  }

  function toggleDropdown(index, hasDropdown) {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      if (hasDropdown) {
        const { dropdown: _, ...rest } = it;
        return rest;
      } else {
        return { ...it, dropdown: emptyDropdown() };
      }
    }));
  }

  function updateDropdownLink(itemIndex, linkIndex, patch) {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIndex) return it;
      const dd = it.dropdown || emptyDropdown();
      const links = (dd.links || []).map((l, j) => j === linkIndex ? { ...l, ...patch } : l);
      return { ...it, dropdown: { ...dd, links } };
    }));
  }

  function addDropdownLink(itemIndex) {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIndex) return it;
      const dd = it.dropdown || emptyDropdown();
      return { ...it, dropdown: { ...dd, links: [...(dd.links || []), emptyLink()] } };
    }));
  }

  function moveDropdownLink(itemIndex, linkIndex, dir) {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIndex) return it;
      const dd = it.dropdown || emptyDropdown();
      const links = [...(dd.links || [])];
      const target = linkIndex + dir;
      if (target < 0 || target >= links.length) return it;
      [links[linkIndex], links[target]] = [links[target], links[linkIndex]];
      return { ...it, dropdown: { ...dd, links } };
    }));
  }

  function removeDropdownLink(itemIndex, linkIndex) {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIndex) return it;
      const dd = it.dropdown || emptyDropdown();
      const links = (dd.links || []).filter((_, j) => j !== linkIndex);
      return { ...it, dropdown: { ...dd, links } };
    }));
  }

  function moveUp(index) {
    if (index === 0) return;
    setItems(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index) {
    setItems(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function remove(index) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()]);
  }

  function updateMicrosite(brandId, patch) {
    setMicrosites(prev => ({ ...prev, [brandId]: { ...(prev[brandId] || {}), ...patch } }));
  }

  function updateMicrositeItem(brandId, itemIndex, patch) {
    setMicrosites(prev => {
      const ms = prev[brandId] || {};
      const items2 = (ms.items || []).map((it, i) => i === itemIndex ? { ...it, ...patch } : it);
      return { ...prev, [brandId]: { ...ms, items: items2 } };
    });
  }

  function addMicrositeItem(brandId) {
    setMicrosites(prev => {
      const ms = prev[brandId] || {};
      return { ...prev, [brandId]: { ...ms, items: [...(ms.items || []), emptyLink()] } };
    });
  }

  function moveMicrositeItem(brandId, itemIndex, dir) {
    setMicrosites(prev => {
      const ms = prev[brandId] || {};
      const arr = [...(ms.items || [])];
      const target = itemIndex + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[itemIndex], arr[target]] = [arr[target], arr[itemIndex]];
      return { ...prev, [brandId]: { ...ms, items: arr } };
    });
  }

  function removeMicrositeItem(brandId, itemIndex) {
    setMicrosites(prev => {
      const ms = prev[brandId] || {};
      return { ...prev, [brandId]: { ...ms, items: (ms.items || []).filter((_, i) => i !== itemIndex) } };
    });
  }

  // ── FOOTER helpers ───────────────────────────────────────────────────
  function patchFooterField(key, value) {
    setFooter(prev => ({ ...prev, [key]: value }));
  }

  function updateColumn(ci, patch) {
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => i === ci ? { ...col, ...patch } : col),
    }));
  }

  function moveColumnUp(ci) {
    if (ci === 0) return;
    setFooter(prev => {
      const next = [...prev.columns];
      [next[ci - 1], next[ci]] = [next[ci], next[ci - 1]];
      return { ...prev, columns: next };
    });
  }

  function moveColumnDown(ci) {
    setFooter(prev => {
      if (ci >= prev.columns.length - 1) return prev;
      const next = [...prev.columns];
      [next[ci], next[ci + 1]] = [next[ci + 1], next[ci]];
      return { ...prev, columns: next };
    });
  }

  function removeColumn(ci) {
    setFooter(prev => ({ ...prev, columns: prev.columns.filter((_, i) => i !== ci) }));
  }

  function addColumn() {
    setFooter(prev => ({ ...prev, columns: [...prev.columns, emptyColumn()] }));
  }

  function updateLink(ci, li, patch) {
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        return {
          ...col,
          links: col.links.map((link, j) => j === li ? { ...link, ...patch } : link),
        };
      }),
    }));
  }

  function moveLinkUp(ci, li) {
    if (li === 0) return;
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        const links = [...col.links];
        [links[li - 1], links[li]] = [links[li], links[li - 1]];
        return { ...col, links };
      }),
    }));
  }

  function moveLinkDown(ci, li) {
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        if (li >= col.links.length - 1) return col;
        const links = [...col.links];
        [links[li], links[li + 1]] = [links[li + 1], links[li]];
        return { ...col, links };
      }),
    }));
  }

  function removeLink(ci, li) {
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        return { ...col, links: col.links.filter((_, j) => j !== li) };
      }),
    }));
  }

  function addLink(ci) {
    setFooter(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => {
        if (i !== ci) return col;
        return { ...col, links: [...col.links, emptyLink()] };
      }),
    }));
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>

      {/* Sticky header bar */}
      <div style={{
        position: "sticky",
        top: "88px",
        zIndex: 5,
        background: "#F4F5F7",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        marginBottom: "1.5rem", paddingBottom: "1rem", paddingTop: "0.5rem",
        borderBottom: `2px solid ${dirty ? NEON : LINE}`,
        transition: "border-color 0.15s",
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          Site Structure
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: dirty ? "#7a5c00" : INK_60, fontWeight: dirty ? 700 : 400 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "Unsaved changes — click Save to commit"}
          {!isSaving && !dirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty && !lastSavedAt && "Up to date"}
        </div>
        <button onClick={save} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor: (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {/* PAGES SECTION */}
      <SectionHeader>Favicons</SectionHeader>
      <FaviconSection
        favicons={favicons}
        files={files}
        onSelect={setFavicon}
        onReload={load}
      />

      <SectionHeader>Site Metadata</SectionHeader>
      {site && <SiteMetaSection site={site} onUpdate={updateSite} />}

      <SectionHeader>Per-page Meta</SectionHeader>
      {pages && (
        <PageMetaSection
          pages={pages}
          onUpdate={updatePage}
          onRemove={removePage}
          onAdd={addPage}
        />
      )}

      {/* NAVIGATION SECTION */}
      <SectionHeader style={{ marginTop: "2rem" }}>Navigation Items</SectionHeader>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1rem" }}>
        {!items || items.length === 0 && (
          <div style={{
            padding: "1.5rem", textAlign: "center",
            fontSize: "0.85rem", color: INK_60,
            border: `1px dashed ${LINE}`, background: "#fff",
          }}>
            No nav items. Click "+ Add nav item" to get started.
          </div>
        )}
        {items && items.map((item, index) => (
          <NavRow
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            onUpdate={patch => update(index, patch)}
            onMoveUp={() => moveUp(index)}
            onMoveDown={() => moveDown(index)}
            onRemove={() => remove(index)}
            onToggleDropdown={hasDropdown => toggleDropdown(index, hasDropdown)}
            onUpdateDropdown={patch => updateDropdown(index, patch)}
            onUpdateDropdownLink={(li, patch) => updateDropdownLink(index, li, patch)}
            onAddDropdownLink={() => addDropdownLink(index)}
            onMoveDropdownLink={(li, dir) => moveDropdownLink(index, li, dir)}
            onRemoveDropdownLink={li => removeDropdownLink(index, li)}
          />
        ))}
      </div>

      {items && (
        <button onClick={addItem} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "0.75rem 1rem", fontWeight: 700, width: "100%",
          fontSize: "0.82rem", marginBottom: "2rem",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4em",
        }}>
          + Add nav item
        </button>
      )}

      <SectionHeader style={{ marginTop: "2rem" }}>Microsite Navs</SectionHeader>
      {microsites && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {Object.entries(microsites || {}).map(([brandId, ms]) => (
            <MicrositePanel
              key={brandId}
              brandId={brandId}
              ms={ms}
              onUpdate={patch => updateMicrosite(brandId, patch)}
              onUpdateItem={(idx, patch) => updateMicrositeItem(brandId, idx, patch)}
              onAddItem={() => addMicrositeItem(brandId)}
              onMoveItem={(idx, dir) => moveMicrositeItem(brandId, idx, dir)}
              onRemoveItem={idx => removeMicrositeItem(brandId, idx)}
            />
          ))}
        </div>
      )}

      {/* FOOTER SECTION */}
      <SectionHeader style={{ marginTop: "2rem" }}>Footer Link Columns</SectionHeader>

      {footer && footer.columns.length === 0 && (
        <EmptyPlaceholder>No columns yet. Click "+ Add column" to get started.</EmptyPlaceholder>
      )}

      {footer && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.5rem" }}>
          {footer.columns.map((col, ci) => (
            <ColumnCard
              key={col.id}
              col={col}
              colIndex={ci}
              totalCols={footer.columns.length}
              onUpdateCol={patch => updateColumn(ci, patch)}
              onMoveColUp={() => moveColumnUp(ci)}
              onMoveColDown={() => moveColumnDown(ci)}
              onRemoveCol={() => {
                if (window.confirm(`Delete column "${col.title || col.id}"? This will also remove all its links.`)) {
                  removeColumn(ci);
                }
              }}
              onUpdateLink={(li, patch) => updateLink(ci, li, patch)}
              onMoveLinkUp={li => moveLinkUp(ci, li)}
              onMoveLinkDown={li => moveLinkDown(ci, li)}
              onRemoveLink={li => removeLink(ci, li)}
              onAddLink={() => addLink(ci)}
            />
          ))}
        </div>
      )}

      {footer && (
        <button onClick={addColumn} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "0.75rem 1rem", fontWeight: 700, width: "100%",
          fontSize: "0.82rem", marginBottom: "2rem",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4em",
        }}>
          + Add column
        </button>
      )}

      <SectionHeader style={{ marginTop: "2rem" }}>Footer Bottom Bar</SectionHeader>

      {footer && (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
          <label style={labelStyle}>
            Copyright text
            <input
              type="text"
              value={footer.copyright}
              onChange={e => patchFooterField("copyright", e.target.value)}
              placeholder="Turnpage Digital Markets LLC © 2026 · All rights reserved"
              style={{ ...inputStyle, marginTop: "0.3rem" }}
            />
          </label>

          <label style={{ ...labelStyle, marginTop: "1rem" }}>
            Contact email (shown in bottom bar)
            <input
              type="email"
              value={footer.contactEmail}
              onChange={e => patchFooterField("contactEmail", e.target.value)}
              placeholder="info@turnpagedigital.com"
              style={{ ...inputStyle, marginTop: "0.3rem" }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section Components — Favicons, Site Meta, Page Meta
═══════════════════════════════════════════════════════════════════════════ */

function FaviconSection({ favicons, files, onSelect, onReload }) {
  const eligible = useMemo(() => {
    return files.filter(f => FAVICON_PICKER_TYPES.includes(f.type));
  }, [files]);

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Each environment can show a different favicon. Pick from the file library or paste any URL.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {FAVICON_ROWS.map(({ key, label, hint }) => (
          <FaviconRow
            key={key}
            envKey={key}
            label={label}
            hint={hint}
            current={favicons[key] || ""}
            eligible={eligible}
            onSelect={url => onSelect(key, url)}
            onUploaded={async ({ url }) => {
              await onReload();
              onSelect(key, url);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FaviconRow({ envKey, label, hint, current, eligible, onSelect, onUploaded }) {
  const inLibrary = current && eligible.some(f => f.url === current);
  const isCustomBootstrap = current && !inLibrary;
  const [mode, setMode] = useState(isCustomBootstrap ? "custom" : "library");
  const [customUrl, setCustomUrl] = useState(isCustomBootstrap ? current : "");

  useEffect(() => {
    const stillInLibrary = current && eligible.some(f => f.url === current);
    if (current && !stillInLibrary) {
      setMode("custom");
      setCustomUrl(current);
    } else if (mode === "custom" && !current) {
      setCustomUrl("");
    } else if (stillInLibrary && mode !== "library") {
      setMode("library");
    }
  }, [current, eligible]);

  function handleSelectChange(e) {
    const v = e.target.value;
    if (v === "__custom__") {
      setMode("custom");
    } else {
      setMode("library");
      onSelect(v);
    }
  }

  function commitCustom() {
    onSelect(customUrl.trim());
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "56px 1fr 1.4fr", gap: "0.85rem",
      alignItems: "center",
    }} className="favicon-row">
      <div style={{
        width: 48, height: 48,
        border: `1px solid ${LINE}`, background: "#F4F5F7",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {current ? (
          <img
            src={current}
            alt={`${label} preview`}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            onError={e => { e.currentTarget.style.opacity = "0.25"; }}
          />
        ) : (
          <span style={{ fontSize: "0.6rem", color: INK_60 }}>none</span>
        )}
      </div>

      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: INK }}>{label}</div>
        <div style={{ fontSize: "0.72rem", color: INK_60 }}>{hint}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <select
            value={mode === "custom" ? "__custom__" : current}
            onChange={handleSelectChange}
            style={{ ...inputStyle, marginTop: 0, cursor: "pointer", flex: 1 }}
          >
            <option value="">— None —</option>
            {eligible.map(f => (
              <option key={f.id} value={f.url}>
                {f.name}{f.type ? ` (${f.type})` : ""}
              </option>
            ))}
            <option disabled style={{ color: "#aaa" }}>──────────</option>
            <option value="__custom__">— Custom URL —</option>
          </select>
          <CompactUpload
            label="Upload"
            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp"
            onUploaded={onUploaded}
          />
        </div>

        {mode === "custom" && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <input
              type="text"
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              onBlur={commitCustom}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitCustom(); } }}
              placeholder="/favicon.png or https://…"
              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
            />
            <button
              type="button"
              onClick={commitCustom}
              style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.35rem 0.7rem" }}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .favicon-row { grid-template-columns: 48px 1fr !important; }
          .favicon-row > div:last-child { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}

function SiteMetaSection({ site, onUpdate }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Fallback values used when a page does not have its own title or description set.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <LabeledField label="Site name" hint="Used in og:site_name">
          <input
            type="text"
            value={site.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Turnpage Digital Markets"
            style={{ ...inputStyle, marginTop: 0 }}
          />
        </LabeledField>

        <LabeledField label="Default title" hint="<title> and og:title for pages without a custom title">
          <input
            type="text"
            value={site.defaultTitle}
            onChange={e => onUpdate({ defaultTitle: e.target.value })}
            placeholder="Site name — tagline"
            style={{ ...inputStyle, marginTop: 0 }}
          />
        </LabeledField>

        <LabeledField label="Default description" hint="meta description and og:description for pages without a custom description">
          <textarea
            value={site.defaultDescription}
            onChange={e => onUpdate({ defaultDescription: e.target.value })}
            placeholder="Short description of the site…"
            rows={3}
            style={{ ...inputStyle, marginTop: 0, resize: "vertical" }}
          />
        </LabeledField>
      </div>
    </div>
  );
}

function PageMetaSection({ pages, onUpdate, onRemove, onAdd }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
      <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "1rem" }}>
        Custom title, description, and OG image for each URL path. Unknown paths fall back to the site defaults above.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", marginBottom: "1rem" }}>
        {pages.length === 0 && (
          <div style={{
            padding: "1.5rem", textAlign: "center",
            fontSize: "0.85rem", color: INK_60,
            border: `1px dashed ${LINE}`,
          }}>
            No per-page overrides. Click "+ Add page meta" to get started.
          </div>
        )}
        {pages.map((page, index) => (
          <PageMetaRow
            key={index}
            page={page}
            index={index}
            onUpdate={patch => onUpdate(index, patch)}
            onRemove={() => {
              if (window.confirm(`Remove meta for "${page.path}"?`)) onRemove(index);
            }}
          />
        ))}
      </div>

      <button onClick={onAdd} style={{
        ...btnStyle,
        fontSize: "0.82rem",
        display: "inline-flex", alignItems: "center", gap: "0.4em",
      }}>
        + Add page meta
      </button>
    </div>
  );
}

function PageMetaRow({ page, index, onUpdate, onRemove }) {
  const pathEmpty  = !page.path.trim();
  const titleEmpty = !page.title.trim();
  const descEmpty  = !page.description.trim();
  const isHome     = page.path.trim() === "/";
  const isHidden   = page.active === false;

  return (
    <div style={{
      border: `1px solid ${isHidden ? "#d4a040" : LINE}`,
      padding: "0.85rem",
      background: isHidden ? "#fffbf0" : "#FAFAFA",
      position: "relative",
      transition: "border-color 0.15s, background 0.15s",
    }}>
      <button
        type="button"
        onClick={onRemove}
        title="Remove this page"
        style={{
          position: "absolute", top: "0.6rem", right: "0.6rem",
          background: "none", border: "none",
          fontSize: "1.1rem", color: "#c44", cursor: "pointer",
          lineHeight: 1, padding: "0.1rem 0.3rem",
        }}
      >
        &times;
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", paddingRight: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <label
            title={isHome ? "Home page can't be hidden" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: "0.4em",
              cursor: isHome ? "not-allowed" : "pointer",
              userSelect: "none",
              opacity: isHome ? 0.5 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={page.active !== false}
              disabled={isHome}
              onChange={e => onUpdate({ active: e.target.checked })}
              style={{ accentColor: NEON, cursor: isHome ? "not-allowed" : "pointer" }}
            />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60 }}>
              Active
            </span>
          </label>
          {isHidden && (
            <span style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "#a06010",
              background: "#fdecc8",
              border: `1px solid #d4a040`,
              padding: "0.1rem 0.4rem",
            }}>
              HIDDEN
            </span>
          )}
        </div>

        <LabeledField label="Path" hint="Exact pathname, e.g. /crypto">
          <input
            type="text"
            value={page.path}
            onChange={e => onUpdate({ path: e.target.value })}
            placeholder="/crypto"
            style={{
              ...inputStyle,
              marginTop: 0,
              borderColor: pathEmpty ? "#e08080" : undefined,
              fontFamily: "monospace",
            }}
          />
          {pathEmpty && <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>}
        </LabeledField>

        <LabeledField label="OG image" hint="Slug for the dynamic OG image">
          <select
            value={page.og}
            onChange={e => onUpdate({ og: e.target.value })}
            style={{ ...inputStyle, marginTop: 0, cursor: "pointer" }}
          >
            {OG_SLUGS.map(slug => (
              <option key={slug} value={slug}>{slug}</option>
            ))}
          </select>
        </LabeledField>

        <LabeledField label="Title" hint="<title> and og:title">
          <input
            type="text"
            value={page.title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Page title"
            style={{
              ...inputStyle,
              marginTop: 0,
              borderColor: titleEmpty ? "#e08080" : undefined,
            }}
          />
          {titleEmpty && <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>}
        </LabeledField>

        <LabeledField label="Description" hint="meta description and og:description">
          <textarea
            value={page.description}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Short description for search engines and social previews…"
            rows={2}
            style={{
              ...inputStyle,
              marginTop: 0,
              resize: "vertical",
              borderColor: descEmpty ? "#e08080" : undefined,
            }}
          />
          {descEmpty && <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>}
        </LabeledField>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Navigation Components
═══════════════════════════════════════════════════════════════════════════ */

function NavRow({
  item, index, total,
  onUpdate, onMoveUp, onMoveDown, onRemove,
  onToggleDropdown, onUpdateDropdown,
  onUpdateDropdownLink, onAddDropdownLink, onMoveDropdownLink, onRemoveDropdownLink,
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const labelEmpty = !item.label.trim();
  const hrefEmpty  = !item.href.trim();
  const hasDropdown = Boolean(item.dropdown);

  const summary = item.label
    ? `"${item.label}"${item.href ? ` — ${item.href}` : ""}`
    : <em>No label set</em>;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${item.active ? LINE : "#e0e0e0"}`,
      opacity: item.active ? 1 : 0.72,
      transition: "opacity 0.15s",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.7rem 1rem",
        borderBottom: `1px solid ${LINE}`,
        flexWrap: "wrap",
      }}>
        <button
          type="button"
          onClick={() => onUpdate({ active: !item.active })}
          style={{
            background: item.active ? NEON : "#E5E7EB",
            color: item.active ? "#0A0A0A" : INK_60,
            border: "none", borderRadius: 0,
            padding: "0.25rem 0.65rem",
            fontSize: "0.7rem", fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer", fontFamily: FONT,
            flexShrink: 0,
          }}
        >
          {item.active ? "ACTIVE" : "INACTIVE"}
        </button>

        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontStyle: "italic", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {summary}
        </div>

        <button onClick={onMoveUp}  disabled={index === 0}          style={iconBtnStyle(index === 0)}          title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} title="Move down">↓</button>
        <button
          onClick={() => { if (window.confirm(`Remove "${item.label || item.id}"?`)) onRemove(); }}
          style={{ ...iconBtnStyle(false), color: "#c44" }}
          title="Delete"
        >×</button>
      </div>

      <div style={{ padding: "0.95rem 1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }} className="nav-grid">
        <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
          Label
          <input
            type="text"
            value={item.label}
            onChange={e => onUpdate({ label: e.target.value })}
            placeholder="Label"
            style={{
              ...inputStyle,
              marginTop: "0.25rem",
              borderColor: labelEmpty ? "#e08080" : undefined,
            }}
          />
          {labelEmpty && (
            <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
          )}
        </label>

        <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
          Href
          <input
            type="text"
            value={item.href}
            onChange={e => onUpdate({ href: e.target.value })}
            placeholder="/path or https://…"
            style={{
              ...inputStyle,
              marginTop: "0.25rem",
              borderColor: hrefEmpty ? "#e08080" : undefined,
            }}
          />
          {hrefEmpty && (
            <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
          )}
        </label>
      </div>

      <div style={{
        borderTop: `1px solid ${LINE}`,
        padding: "0.3rem 1rem",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <button
          type="button"
          onClick={() => {
            if (!hasDropdown) {
              onToggleDropdown(false);
              setDropOpen(true);
            } else {
              setDropOpen(o => !o);
            }
          }}
          style={{
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600,
            background: "none", border: "none", padding: "0.2rem 0",
            cursor: "pointer", color: INK_60,
            display: "inline-flex", alignItems: "center", gap: "0.3em",
          }}
        >
          <span style={{
            display: "inline-block",
            transform: (hasDropdown && dropOpen) ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}>&#9658;</span>
          {hasDropdown ? "Edit dropdown" : "Add dropdown"}
        </button>
        {hasDropdown && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Remove the dropdown from this nav item?")) {
                onToggleDropdown(true);
                setDropOpen(false);
              }
            }}
            style={{
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 500,
              background: "none", border: "none", padding: 0,
              cursor: "pointer", color: "#c44",
            }}
          >
            Remove dropdown
          </button>
        )}
      </div>

      {hasDropdown && dropOpen && (
        <DropdownEditor
          dd={item.dropdown}
          onUpdate={onUpdateDropdown}
          onUpdateLink={onUpdateDropdownLink}
          onAddLink={onAddDropdownLink}
          onMoveLink={onMoveDropdownLink}
          onRemoveLink={onRemoveDropdownLink}
        />
      )}
    </div>
  );
}

function DropdownEditor({ dd, onUpdate, onUpdateLink, onAddLink, onMoveLink, onRemoveLink }) {
  const panelStyle = {
    borderTop: `1px solid ${LINE}`,
    background: "#fafafa",
    padding: "1rem 1rem 1rem",
    display: "flex", flexDirection: "column", gap: "0.75rem",
  };

  const subLabel = {
    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
    color: INK_60, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: "0.35rem", display: "block",
  };

  return (
    <div style={panelStyle}>
      <div>
        <span style={subLabel}>Dropdown title</span>
        <input
          type="text"
          value={dd.title || ""}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="e.g. Copyright Claims"
          style={{ ...inputStyle, marginTop: 0 }}
        />
      </div>

      <div>
        <span style={subLabel}>Dropdown body</span>
        <textarea
          value={dd.body || ""}
          onChange={e => onUpdate({ body: e.target.value })}
          placeholder="Short description shown in the dropdown…"
          rows={3}
          style={{
            ...inputStyle, marginTop: 0,
            resize: "vertical", minHeight: 64,
          }}
        />
      </div>

      <div>
        <span style={subLabel}>Quick links</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {(dd.links || []).map((link, li) => (
            <div key={li} style={{
              display: "grid",
              gridTemplateColumns: "64px 1fr 1fr 100px",
              gap: "0.4rem", alignItems: "center",
            }}>
              <div style={{ display: "flex", gap: "0.2rem" }}>
                <button
                  type="button"
                  onClick={() => onMoveLink(li, -1)}
                  disabled={li === 0}
                  title="Move up"
                  style={iconBtnStyle(li === 0)}
                >
                  &#9650;
                </button>
                <button
                  type="button"
                  onClick={() => onMoveLink(li, 1)}
                  disabled={li === (dd.links || []).length - 1}
                  title="Move down"
                  style={iconBtnStyle(li === (dd.links || []).length - 1)}
                >
                  &#9660;
                </button>
              </div>
              <input
                type="text"
                value={link.label}
                onChange={e => onUpdateLink(li, { label: e.target.value })}
                placeholder="Link label"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              <input
                type="text"
                value={link.href}
                onChange={e => onUpdateLink(li, { href: e.target.value })}
                placeholder="/path or https://…"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  fontSize: "0.72rem", color: INK_60, cursor: "pointer",
                  userSelect: "none",
                }}>
                  <input
                    type="checkbox"
                    checked={!!link.external}
                    onChange={e => onUpdateLink(li, { external: e.target.checked || undefined })}
                    style={{ width: 13, height: 13, accentColor: INK }}
                  />
                  Ext
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveLink(li)}
                  title="Remove link"
                  style={{
                    ...iconBtnStyle(false),
                    color: "#c44", borderColor: "rgba(180,40,40,0.25)",
                    fontSize: "1rem",
                  }}
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddLink}
          style={{
            ...btnStyle,
            fontSize: "0.78rem", marginTop: "0.5rem",
            display: "inline-flex", alignItems: "center", gap: "0.3em",
          }}
        >
          + Add link
        </button>
      </div>

      <div>
        <span style={subLabel}>CTA button</span>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 80px",
          gap: "0.4rem", alignItems: "center",
        }}>
          <input
            type="text"
            value={dd.cta?.label || ""}
            onChange={e => onUpdate({ cta: { ...(dd.cta || {}), label: e.target.value } })}
            placeholder="Button label"
            style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
          />
          <input
            type="text"
            value={dd.cta?.href || ""}
            onChange={e => onUpdate({ cta: { ...(dd.cta || {}), href: e.target.value } })}
            placeholder="/path or https://…"
            style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
          />
          <label style={{
            display: "inline-flex", alignItems: "center", gap: "0.25rem",
            fontSize: "0.72rem", color: INK_60, cursor: "pointer",
            userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={!!dd.cta?.external}
              onChange={e => onUpdate({ cta: { ...(dd.cta || {}), external: e.target.checked || undefined } })}
              style={{ width: 13, height: 13, accentColor: INK }}
            />
            External
          </label>
        </div>
      </div>
    </div>
  );
}

function MicrositePanel({ brandId, ms, onUpdate, onUpdateItem, onAddItem, onMoveItem, onRemoveItem }) {
  const [open, setOpen] = useState(false);

  const subLabel = {
    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
    color: INK_60, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: "0.35rem", display: "block",
  };

  return (
    <div style={{ border: `1px solid ${LINE}`, background: "#fff" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left",
          background: "none", border: "none", padding: "0.65rem 1rem",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: INK,
        }}
      >
        <span style={{
          display: "inline-block",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
          color: INK_60,
        }}>&#9658;</span>
        <span>{ms?.brand?.label || brandId}</span>
        <span style={{ fontSize: "0.72rem", color: INK_60, fontWeight: 400 }}>({brandId})</span>
      </button>

      {open && (
        <div style={{
          borderTop: `1px solid ${LINE}`,
          background: "#fafafa",
          padding: "1rem",
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          <div>
            <span style={subLabel}>Brand link</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              <input
                type="text"
                value={ms?.brand?.label || ""}
                onChange={e => onUpdate({ brand: { ...(ms?.brand || {}), label: e.target.value } })}
                placeholder="Brand label"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              <input
                type="text"
                value={ms?.brand?.href || ""}
                onChange={e => onUpdate({ brand: { ...(ms?.brand || {}), href: e.target.value } })}
                placeholder="/path or https://…"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
            </div>
          </div>

          <div>
            <span style={subLabel}>Section links</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {(ms?.items || []).map((item, idx) => (
                <div key={idx} style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr 1fr 36px",
                  gap: "0.4rem", alignItems: "center",
                }}>
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    <button
                      type="button"
                      onClick={() => onMoveItem(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                      style={iconBtnStyle(idx === 0)}
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveItem(idx, 1)}
                      disabled={idx === (ms?.items || []).length - 1}
                      title="Move down"
                      style={iconBtnStyle(idx === (ms?.items || []).length - 1)}
                    >
                      &#9660;
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.label}
                    onChange={e => onUpdateItem(idx, { label: e.target.value })}
                    placeholder="Label"
                    style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
                  />
                  <input
                    type="text"
                    value={item.href}
                    onChange={e => onUpdateItem(idx, { href: e.target.value })}
                    placeholder="/path or https://…"
                    style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remove "${item.label || "this item"}"?`)) onRemoveItem(idx);
                    }}
                    title="Delete"
                    style={{
                      ...iconBtnStyle(false),
                      color: "#c44", borderColor: "rgba(180,40,40,0.25)",
                      fontSize: "1rem",
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onAddItem}
              style={{
                ...btnStyle,
                fontSize: "0.78rem", marginTop: "0.5rem",
                display: "inline-flex", alignItems: "center", gap: "0.3em",
              }}
            >
              + Add item
            </button>
          </div>

          <div>
            <span style={subLabel}>CTA button</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              <input
                type="text"
                value={ms?.cta?.label || ""}
                onChange={e => onUpdate({ cta: { ...(ms?.cta || {}), label: e.target.value } })}
                placeholder="CTA label"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
              <input
                type="text"
                value={ms?.cta?.href || ""}
                onChange={e => onUpdate({ cta: { ...(ms?.cta || {}), href: e.target.value } })}
                placeholder="/path or https://…"
                style={{ ...inputStyle, marginTop: 0, fontSize: "0.82rem" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Footer Components
═══════════════════════════════════════════════════════════════════════════ */

function ColumnCard({
  col, colIndex, totalCols,
  onUpdateCol, onMoveColUp, onMoveColDown, onRemoveCol,
  onUpdateLink, onMoveLinkUp, onMoveLinkDown, onRemoveLink, onAddLink,
}) {
  const titleEmpty = !col.title.trim();
  const colSummary = col.title || <em>Untitled column</em>;

  return (
    <div style={{
      border: `1px solid ${LINE}`,
      background: "#fff",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.7rem 1rem",
        borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontStyle: "italic", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {colSummary}
        </div>

        <button type="button" onClick={onMoveColUp} disabled={colIndex === 0}
          title="Move column up" style={iconBtnStyle(colIndex === 0)}>↑</button>
        <button type="button" onClick={onMoveColDown} disabled={colIndex === totalCols - 1}
          title="Move column down" style={iconBtnStyle(colIndex === totalCols - 1)}>↓</button>
        <button type="button" onClick={onRemoveCol} title="Delete column"
          style={{ ...iconBtnStyle(false), color: "#c44" }}>×</button>
      </div>

      <div style={{ padding: "0.95rem 1rem" }}>
        <label style={labelStyle}>
          Column title
          <input
            type="text"
            value={col.title}
            onChange={e => onUpdateCol({ title: e.target.value })}
            placeholder="Column heading"
            style={{
              ...inputStyle,
              marginTop: "0.3rem",
              borderColor: titleEmpty ? "#e08080" : undefined,
            }}
          />
          {titleEmpty && (
            <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>Required</p>
          )}
        </label>

        <div style={{
          fontSize: "0.72rem", fontWeight: 700, color: INK_60,
          letterSpacing: "0.08em", textTransform: "uppercase",
          marginTop: "1rem", marginBottom: "0.5rem",
        }}>
          Links
        </div>

        {col.links.length === 0 && (
          <div style={{
            padding: "1rem", textAlign: "center", fontSize: "0.82rem", color: INK_60,
            border: `1px dashed ${LINE}`, marginBottom: "0.75rem",
          }}>
            No links yet.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {col.links.map((link, li) => (
            <LinkRow
              key={link.id}
              link={link}
              linkIndex={li}
              totalLinks={col.links.length}
              onUpdate={patch => onUpdateLink(li, patch)}
              onMoveUp={() => onMoveLinkUp(li)}
              onMoveDown={() => onMoveLinkDown(li)}
              onRemove={() => {
                if (window.confirm(`Remove link "${link.label || link.id}"?`)) onRemoveLink(li);
              }}
            />
          ))}
        </div>

        <button onClick={onAddLink} style={{
          ...btnStyle, fontSize: "0.78rem",
          display: "inline-flex", alignItems: "center", gap: "0.35em",
        }}>
          + Add link
        </button>
      </div>
    </div>
  );
}

function LinkRow({ link, linkIndex, totalLinks, onUpdate, onMoveUp, onMoveDown, onRemove }) {
  const labelEmpty = !link.label.trim();
  const hrefEmpty  = !link.href.trim();
  const linkSummary = link.label || <em>No label</em>;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${LINE}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem",
        padding: "0.5rem 0.75rem",
        borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ flex: 1, fontSize: "0.82rem", color: INK_60, fontStyle: "italic", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {linkSummary}
        </div>

        <button type="button" onClick={onMoveUp} disabled={linkIndex === 0}
          title="Move up" style={iconBtnStyle(linkIndex === 0)}>↑</button>
        <button type="button" onClick={onMoveDown} disabled={linkIndex === totalLinks - 1}
          title="Move down" style={iconBtnStyle(linkIndex === totalLinks - 1)}>↓</button>
        <button type="button" onClick={onRemove} title="Delete link"
          style={{ ...iconBtnStyle(false), color: "#c44" }}>×</button>
      </div>

      <div style={{ padding: "0.65rem 0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 0.75rem" }} className="link-grid">
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: INK_60, fontWeight: 600 }}>
            Label
            <input
              type="text"
              value={link.label}
              onChange={e => onUpdate({ label: e.target.value })}
              placeholder="Link label"
              style={{ ...inputStyle, marginTop: "0.2rem", borderColor: labelEmpty ? "#e08080" : undefined }}
            />
            {labelEmpty && (
              <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.15rem 0 0" }}>Required</p>
            )}
          </label>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: INK_60, fontWeight: 600 }}>
            Href
            <input
              type="text"
              value={link.href}
              onChange={e => onUpdate({ href: e.target.value })}
              placeholder="/path or https://…"
              style={{ ...inputStyle, marginTop: "0.2rem", borderColor: hrefEmpty ? "#e08080" : undefined }}
            />
            {hrefEmpty && (
              <p style={{ color: "#c44", fontSize: "0.72rem", margin: "0.15rem 0 0" }}>Required</p>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helper Components
═══════════════════════════════════════════════════════════════════════════ */

function SectionHeader({ children, style }) {
  return (
    <div style={{
      fontSize: "0.78rem", fontWeight: 700, color: INK_60,
      letterSpacing: "0.08em", textTransform: "uppercase",
      borderBottom: `1px solid ${LINE}`, paddingBottom: "0.5rem",
      marginBottom: "1rem",
      ...style,
    }}>
      {children}
    </div>
  );
}

function LabeledField({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5em", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60 }}>{label}</span>
        {hint && <span style={{ fontSize: "0.72rem", color: INK_60 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600,
};

function EmptyPlaceholder({ children }) {
  return (
    <div style={{
      padding: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: INK_60,
      border: `1px dashed ${LINE}`, background: "#fff", marginBottom: "1rem",
    }}>
      {children}
    </div>
  );
}

function CompactUpload({ onUploaded, accept, label = "Upload" }) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large — max 5 MB.");
      setPhase("error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPhase("uploading");
    setError("");
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = ev => res(ev.target.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const r = await fetch("/api/admin/file-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename:      file.name,
          contentBase64: base64,
          contentType:   file.type,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      setPhase("done");
      await onUploaded({ url: body.url, filename: body.filename });
      setTimeout(() => setPhase("idle"), 1500);
    } catch (err) {
      setError(err.message);
      setPhase("error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => fileRef.current && fileRef.current.click()}
        disabled={phase === "uploading"}
        style={{
          ...btnStyle,
          fontSize: "0.78rem", padding: "0.35rem 0.75rem",
          opacity: phase === "uploading" ? 0.6 : 1,
          cursor:  phase === "uploading" ? "wait" : "pointer",
        }}
      >
        {phase === "uploading" ? "Uploading…" : phase === "done" ? "Uploaded" : label}
      </button>
      {error && <p style={{ color: "#c44", fontSize: "0.75rem", margin: "0.35rem 0 0" }}>{error}</p>}
    </div>
  );
}
