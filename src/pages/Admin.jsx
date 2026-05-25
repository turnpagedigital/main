import React, { useEffect, useState, useCallback, useMemo } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";

/* Admin panel for managing deal cards.
   - One password login, session stored in HttpOnly cookie.
   - Reads + writes src/data/deals.json via Cloudflare Pages Functions
     that commit through the GitHub Contents API.
   - Single source of truth: the JSON file in git.

   When you change the deal schema in deals.json, update both
   src/components/DealCard.jsx AND the FIELD_DEFS array below
   in the same commit so the admin form stays in sync. */

const FIELD_DEFS = [
  { key: "amt",     label: "Amount",       type: "text",     placeholder: "$270M" },
  { key: "who",     label: "Counterparty", type: "text",     placeholder: "FTX" },
  { key: "type",    label: "Claim type",   type: "text",     placeholder: "Disputed-Ownership Claim" },
  { key: "form",    label: "Form",         type: "text",     placeholder: "Advisory" },
  { key: "when",    label: "When",         type: "text",     placeholder: "Oct 2024 – Aug 2025" },
  { key: "summary", label: "Summary (back of flip card — leave empty to disable flip)", type: "textarea", placeholder: "Optional 2-4 sentence description." },
];

const PAGES = [
  { key: "home",         label: "Home" },
  { key: "crypto",       label: "Crypto" },
  { key: "ai-copyright", label: "AI Copyright" },
];

function blankDeal() {
  return { amt: "", who: "", type: "", form: "", when: "", summary: "", pages: [], preTurnpage: false };
}

function sanitize(d) {
  return {
    amt:         typeof d.amt === "string"     ? d.amt     : "",
    who:         typeof d.who === "string"     ? d.who     : "",
    type:        typeof d.type === "string"    ? d.type    : "",
    form:        typeof d.form === "string"    ? d.form    : "",
    when:        typeof d.when === "string"    ? d.when    : "",
    summary:     typeof d.summary === "string" ? d.summary : "",
    pages:       Array.isArray(d.pages) ? d.pages.filter(p => typeof p === "string") : [],
    preTurnpage: Boolean(d.preTurnpage),
  };
}

function sanitizeBio(d) {
  return {
    tagline_before: typeof d.tagline_before === "string" ? d.tagline_before : "A",
    tagline_accent: typeof d.tagline_accent === "string" ? d.tagline_accent : "singular force",
    tagline_after:  typeof d.tagline_after  === "string" ? d.tagline_after  : "",
    paragraphs:     Array.isArray(d.paragraphs) ? d.paragraphs.filter(p => typeof p === "string") : [],
  };
}

// Default suggestions shown in the datalist dropdowns — user can type anything else
const PRESS_TYPE_SUGGESTIONS   = ["publication", "podcast", "article", "social post", "blog post"];
const PRESS_AUTHOR_SUGGESTIONS = ["Andrew", "Other"];

const PRESS_PAGE_VALUES = ["copyright", "crypto", "litigation", "tariffs", "bankruptcy"];
const PRESS_PAGE_LABELS = {
  "copyright":  "Copyright Claims",
  "crypto":     "Locked Crypto",
  "litigation": "Litigation Claims",
  "tariffs":    "Tariff Refunds",
  "bankruptcy": "Bankruptcy Claims",
};

/* Parse freeform date strings into a sortable timestamp (0 = unknown → bottom) */
function parseDateForSort(str) {
  if (!str) return 0;
  const d = new Date(str);
  if (!isNaN(d)) return d.getTime();
  // "March 2025", "Jan 2026", etc.
  const m = str.match(/([A-Za-z]+)\s+(\d{4})/);
  if (m) { const d2 = new Date(`${m[1]} 1, ${m[2]}`); if (!isNaN(d2)) return d2.getTime(); }
  // "2025" bare year
  const y = str.match(/^(\d{4})$/);
  if (y) return new Date(`${y[1]}-01-01`).getTime();
  return 0;
}

function blankPressItem() {
  return { type: "publication", author: "Other", pages: [], date: "", url: "", logo_url: "", excerpt: "", publication_title: "", piece_title: "" };
}

function sanitizePressItem(d) {
  return {
    type:              typeof d.type   === "string" ? d.type   : "publication",
    author:            typeof d.author === "string" ? d.author : "Other",
    pages:             Array.isArray(d.pages) ? d.pages.filter(p => PRESS_PAGE_VALUES.includes(p)) : [],
    date:              typeof d.date              === "string" ? d.date              : "",
    url:               typeof d.url               === "string" ? d.url               : "",
    logo_url:          typeof d.logo_url          === "string" ? d.logo_url          : "",
    excerpt:           typeof d.excerpt           === "string" ? d.excerpt           : "",
    publication_title: typeof d.publication_title === "string" ? d.publication_title : "",
    piece_title:       typeof d.piece_title       === "string" ? d.piece_title       : "",
  };
}

/* Swap the favicon to the original (favicon.png) while admin is mounted,
   then restore the main site favicon (favicon1.png) on unmount. */
function useFaviconSwap(adminHref, restoreHref) {
  useEffect(() => {
    const icons = document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']");
    icons.forEach(el => { el.href = adminHref; });
    return () => {
      icons.forEach(el => { el.href = restoreHref; });
    };
  }, [adminHref, restoreHref]);
}

export default function Admin() {
  useFaviconSwap("/favicon.png", "/favicon1.png");

  const [phase, setPhase] = useState("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [deals, setDeals] = useState(null);
  const [original, setOriginal] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [tab, setTab] = useState("bio");

  // Bio state — independent of deals
  const [bio, setBio] = useState(null);
  const [originalBio, setOriginalBio] = useState(null);
  const [bioPhase, setBioPhase] = useState("idle"); // "idle"|"loading"|"ready"|"saving"|"error"
  const [bioError, setBioError] = useState("");
  const [bioLastSavedAt, setBioLastSavedAt] = useState(null);

  // Press state — independent of deals and bio
  const [pressItems, setPressItems] = useState(null);
  const [originalPressItems, setOriginalPressItems] = useState(null);
  const [pressPhase, setPressPhase] = useState("idle"); // "idle"|"loading"|"ready"|"saving"|"error"
  const [pressError, setPressError] = useState("");
  const [pressLastSavedAt, setPressLastSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/session", { credentials: "include" });
        if (cancelled) return;
        if (r.ok) { loadDeals(); loadBio(); loadPress(); } else { setPhase("login"); }
      } catch {
        if (cancelled) return;
        setPhase("login");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadDeals = useCallback(async () => {
    setPhase("loading");
    setErrorMsg("");
    try {
      const r = await fetch("/api/admin/deals", { credentials: "include" });
      if (r.status === 401) { setPhase("login"); return; }
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = { deals: (body.data.deals || []).map(sanitize) };
      setDeals(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));
      setPhase("ready");
    } catch (e) {
      setErrorMsg(e.message);
      setPhase("error");
    }
  }, []);

  const loadBio = useCallback(async () => {
    setBioPhase("loading");
    setBioError("");
    try {
      const r = await fetch("/api/admin/bio", { credentials: "include" });
      if (r.status === 401) return; // deals handler shows login screen
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = sanitizeBio(body.data);
      setBio(fresh);
      setOriginalBio(JSON.parse(JSON.stringify(fresh)));
      setBioPhase("ready");
    } catch (e) {
      setBioError(e.message);
      setBioPhase("error");
    }
  }, []);

  const loadPress = useCallback(async () => {
    setPressPhase("loading");
    setPressError("");
    try {
      const r = await fetch("/api/admin/press", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = (body.data.items || []).map(sanitizePressItem);
      fresh.sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));
      setPressItems(fresh);
      setOriginalPressItems(JSON.parse(JSON.stringify(fresh)));
      setPressPhase("ready");
    } catch (e) {
      setPressError(e.message);
      setPressPhase("error");
    }
  }, []);

  const isDirty = useMemo(() => {
    if (!deals || !original) return false;
    return JSON.stringify(deals) !== JSON.stringify(original);
  }, [deals, original]);

  const bioDirty = useMemo(() => {
    if (!bio || !originalBio) return false;
    return JSON.stringify(bio) !== JSON.stringify(originalBio);
  }, [bio, originalBio]);

  const pressDirty = useMemo(() => {
    if (pressItems === null || originalPressItems === null) return false;
    return JSON.stringify(pressItems) !== JSON.stringify(originalPressItems);
  }, [pressItems, originalPressItems]);

  async function handleLogin(password) {
    setErrorMsg("");
    setPhase("checking");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Login failed");
      loadDeals();
      loadBio();
      loadPress();
    } catch (e) {
      setErrorMsg(e.message);
      setPhase("login");
    }
  }

  async function handleLogout() {
    try { await fetch("/api/admin/logout", { method: "POST", credentials: "include" }); } catch {}
    setDeals(null);
    setOriginal(null);
    setBio(null);
    setOriginalBio(null);
    setPressItems(null);
    setOriginalPressItems(null);
    setPhase("login");
  }

  async function handleSave() {
    if (!deals) return;
    setPhase("saving");
    setErrorMsg("");
    try {
      const r = await fetch("/api/admin/deals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ deals: deals.deals }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await loadDeals();
      setLastSavedAt(new Date());
    } catch (e) {
      setErrorMsg(e.message);
      setPhase("ready");
    }
  }

  async function handleSaveBio() {
    if (!bio) return;
    setBioPhase("saving");
    setBioError("");
    try {
      const r = await fetch("/api/admin/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bio }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await loadBio();
      setBioLastSavedAt(new Date());
    } catch (e) {
      setBioError(e.message);
      setBioPhase("ready");
    }
  }

  async function handleSavePress() {
    if (pressItems === null) return;
    setPressPhase("saving");
    setPressError("");
    try {
      const r = await fetch("/api/admin/press", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: pressItems }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await loadPress();
      setPressLastSavedAt(new Date());
    } catch (e) {
      setPressError(e.message);
      setPressPhase("ready");
    }
  }

  // --- Rendering -----------------------------------------------------------

  if (phase === "checking" || phase === "loading") {
    return <CenteredMessage>Loading admin…</CenteredMessage>;
  }
  if (phase === "login") {
    return <LoginForm onSubmit={handleLogin} error={errorMsg} />;
  }
  if (phase === "error") {
    return (
      <CenteredMessage>
        <p style={{ color: "#c44", marginBottom: "1rem" }}>{errorMsg}</p>
        <button onClick={loadDeals} style={btnStyle}>Retry</button>
      </CenteredMessage>
    );
  }
  if (!deals) return null;

  const list = deals.deals;

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

  const TAB_DEFS = [
    { key: "bio",   label: "Bio",    dirty: bioDirty },
    { key: "deals", label: "Deals",  dirty: isDirty  },
    { key: "press", label: "Press",  dirty: pressDirty },
  ];

  return (
    <div style={{ background: "#F4F5F7", minHeight: "100vh", fontFamily: FONT, color: INK }}>

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#FFFFFF", borderBottom: `1px solid ${LINE}`,
      }}>
        {/* Title row */}
        <div style={{
          padding: "0.75rem clamp(1rem, 3vw, 2rem)",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em", flex: 1 }}>
            Turnpage Admin
          </div>
          <button onClick={handleLogout} style={btnStyle}>Log out</button>
        </div>

        {/* Tab row */}
        <div style={{
          display: "flex", alignItems: "stretch",
          padding: "0 clamp(1rem, 3vw, 2rem)",
          gap: 0, borderTop: `1px solid ${LINE}`,
        }}>
          {TAB_DEFS.map(({ key, label, dirty }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  fontFamily: FONT, fontSize: "0.88rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? INK : INK_60,
                  background: "transparent", border: "none",
                  borderBottom: active ? `2px solid ${INK}` : "2px solid transparent",
                  padding: "0.7rem 1.4rem 0.7rem 0",
                  marginRight: "1.8rem",
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: "0.45em",
                  transition: "color 0.15s",
                }}
              >
                {label}
                {dirty && (
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: NEON, display: "inline-block", flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global deals error banner */}
      {errorMsg && (
        <div style={{
          background: "#fce8e8", color: "#7a1a1a",
          padding: "0.75rem clamp(1rem, 3vw, 2rem)",
          borderBottom: `1px solid #f4caca`, fontSize: "0.9rem",
        }}>
          {errorMsg}
        </div>
      )}

      {/* ── Bio tab ───────────────────────────────────────────────── */}
      {tab === "bio" && (
        (bioPhase === "ready" || bioPhase === "saving") && bio ? (
          <BioSection
            bio={bio}
            onChangeBio={(field, value) => setBio(b => ({ ...b, [field]: value }))}
            onSave={handleSaveBio}
            dirty={bioDirty}
            phase={bioPhase}
            error={bioError}
            lastSavedAt={bioLastSavedAt}
          />
        ) : bioPhase === "loading" ? (
          <CenteredMessage>Loading bio…</CenteredMessage>
        ) : bioPhase === "error" ? (
          <div style={{ maxWidth: 1080, margin: "2rem auto", padding: "0 clamp(1rem, 3vw, 2rem)" }}>
            <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span>{bioError}</span>
              <button onClick={loadBio} style={btnStyle}>Retry</button>
            </div>
          </div>
        ) : null
      )}

      {/* ── Deals tab ─────────────────────────────────────────────── */}
      {tab === "deals" && (
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
              {phase === "saving" && "Saving…"}
              {phase !== "saving" && isDirty && "Unsaved changes"}
              {phase !== "saving" && !isDirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
              {phase !== "saving" && !isDirty && !lastSavedAt && "Up to date"}
            </div>
            <button onClick={handleSave} disabled={!isDirty || phase === "saving"} style={{
              ...btnPrimaryStyle,
              opacity: (!isDirty || phase === "saving") ? 0.5 : 1,
              cursor: (!isDirty || phase === "saving") ? "default" : "pointer",
            }}>
              {phase === "saving" ? "Saving…" : "Save Deals"}
            </button>
          </div>

          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "1.5rem" }}>
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
      )}

      {/* ── Press tab ─────────────────────────────────────────────── */}
      {tab === "press" && (
        (pressPhase === "ready" || pressPhase === "saving") && pressItems !== null ? (
          <PressSection
            items={pressItems}
            onChangeItems={setPressItems}
            onSave={handleSavePress}
            dirty={pressDirty}
            phase={pressPhase}
            error={pressError}
            lastSavedAt={pressLastSavedAt}
          />
        ) : pressPhase === "loading" ? (
          <CenteredMessage>Loading press…</CenteredMessage>
        ) : pressPhase === "error" ? (
          <div style={{ maxWidth: 1080, margin: "2rem auto", padding: "0 clamp(1rem, 3vw, 2rem)" }}>
            <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span>{pressError}</span>
              <button onClick={loadPress} style={btnStyle}>Retry</button>
            </div>
          </div>
        ) : null
      )}
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
    </div>
  );
}

function BioSection({ bio, onChangeBio, onSave, dirty, phase, error, lastSavedAt }) {
  const isSaving = phase === "saving";
  const paragraphs = bio.paragraphs || [];

  // Photo upload state (independent of bio text)
  const [photoFile,     setPhotoFile]     = useState(null);   // File object selected by user
  const [photoPreview,  setPhotoPreview]  = useState(null);   // data URL for new-photo preview
  const [photoPhase,    setPhotoPhase]    = useState("idle"); // idle | uploading | done | error
  const [photoError,    setPhotoError]    = useState("");
  const [photoCacheBust, setPhotoCacheBust] = useState("");   // appended to current-photo URL after upload

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Please select an image file."); return; }
    if (file.size > 4.5 * 1024 * 1024) { setPhotoError("Image must be under 4.5 MB."); return; }
    setPhotoFile(file);
    setPhotoError("");
    setPhotoPhase("idle");
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handlePhotoUpload() {
    if (!photoFile || !photoPreview) return;
    setPhotoPhase("uploading");
    setPhotoError("");
    try {
      const base64 = photoPreview.split(",")[1]; // strip data:<mime>;base64, prefix
      const r = await fetch("/api/admin/photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: base64, mime_type: photoFile.type }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      setPhotoPhase("done");
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoCacheBust(`?v=${Date.now()}`);
    } catch (e) {
      setPhotoError(e.message);
      setPhotoPhase("error");
    }
  }

  function updateParagraph(i, val) {
    const next = [...paragraphs];
    next[i] = val;
    onChangeBio("paragraphs", next);
  }
  function moveParagraph(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= paragraphs.length) return;
    const next = [...paragraphs];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeBio("paragraphs", next);
  }
  function deleteParagraph(i) {
    if (!confirm("Delete this paragraph?")) return;
    onChangeBio("paragraphs", paragraphs.filter((_, idx) => idx !== i));
  }
  function addParagraph() {
    onChangeBio("paragraphs", [...paragraphs, ""]);
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
          Bio — Andrew Glantz
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
          {isSaving ? "Saving…" : "Save Bio"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {/* Photo */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.8rem" }}>
          Profile Photo
        </div>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* Current photo */}
          <div>
            <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.4rem", fontWeight: 600 }}>Current</p>
            <img
              src={`/andrew.png${photoCacheBust}`}
              alt="Andrew Glantz"
              style={{ width: 90, height: 112, objectFit: "cover", border: `1px solid ${LINE}`, filter: "grayscale(100%)", display: "block" }}
            />
          </div>

          {/* Upload controls */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.5rem" }}>
              Replace with a new photo — JPEG or PNG, max 4.5 MB:
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.65rem", fontFamily: FONT }}
            />
            {photoPreview && (
              <div style={{ marginBottom: "0.65rem" }}>
                <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.3rem", fontWeight: 600 }}>Preview</p>
                <img
                  src={photoPreview}
                  alt="preview"
                  style={{ width: 90, height: 112, objectFit: "cover", border: `1px solid ${LINE}`, display: "block" }}
                />
              </div>
            )}
            {photoError && (
              <p style={{ color: "#c44", fontSize: "0.82rem", marginBottom: "0.5rem" }}>{photoError}</p>
            )}
            {photoPhase === "done" && (
              <p style={{ color: "#2a7a2a", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                ✓ Uploaded — live on the site in ~1–2 min.
              </p>
            )}
            <button
              type="button"
              onClick={handlePhotoUpload}
              disabled={!photoFile || photoPhase === "uploading"}
              style={{
                ...btnPrimaryStyle,
                opacity: (!photoFile || photoPhase === "uploading") ? 0.5 : 1,
                cursor: (!photoFile || photoPhase === "uploading") ? "default" : "pointer",
              }}
            >
              {photoPhase === "uploading" ? "Uploading…" : "Upload Photo"}
            </button>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.8rem" }}>
          Tagline
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }} className="bio-tagline-grid">
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Before accent
            <input
              type="text"
              value={bio.tagline_before || ""}
              onChange={e => onChangeBio("tagline_before", e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Accent (neon italic on page)
            <input
              type="text"
              value={bio.tagline_accent || ""}
              onChange={e => onChangeBio("tagline_accent", e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
            After accent
            <textarea
              value={bio.tagline_after || ""}
              onChange={e => onChangeBio("tagline_after", e.target.value)}
              rows={2}
              style={inputStyle}
            />
          </label>
        </div>
        <p style={{ marginTop: "0.8rem", fontSize: "0.8rem", color: INK_60 }}>
          Preview: <em>{bio.tagline_before} <strong style={{ color: NEON }}>{bio.tagline_accent}</strong> {bio.tagline_after}</em>
        </p>
      </div>

      {/* Paragraphs */}
      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.75rem" }}>
        Bio paragraphs ({paragraphs.length}) — rendered in order on the home page.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2.5rem" }}>
        {paragraphs.map((para, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: "0.85rem", color: INK_60 }}>
                Paragraph {i + 1}
              </div>
              <button onClick={() => moveParagraph(i, -1)} disabled={i === 0}                    style={iconBtnStyle(i === 0)}                    title="Move up">↑</button>
              <button onClick={() => moveParagraph(i, 1)}  disabled={i === paragraphs.length - 1} style={iconBtnStyle(i === paragraphs.length - 1)} title="Move down">↓</button>
              <button onClick={() => deleteParagraph(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }}             title="Delete">×</button>
            </div>
            <textarea
              value={para}
              onChange={e => updateParagraph(i, e.target.value)}
              rows={4}
              placeholder="Enter paragraph text…"
              style={inputStyle}
            />
          </div>
        ))}
        {paragraphs.length === 0 && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No paragraphs yet.
          </div>
        )}
        <button onClick={addParagraph} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "1rem", fontWeight: 700,
        }}>
          + Add paragraph
        </button>
      </div>

      <style>{`
        @media (max-width: 540px) {
          .bio-tagline-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function PressSection({ items, onChangeItems, onSave, dirty, phase, error, lastSavedAt }) {
  const isSaving = phase === "saving";
  const [filterType,   setFilterType]   = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [filterPage,   setFilterPage]   = useState("");

  // Managed option lists — initialised from defaults + any values already in the loaded items
  const [typeOptions, setTypeOptions] = useState(() => {
    const extra = items.map(it => it.type).filter(Boolean)
      .filter(t => !PRESS_TYPE_SUGGESTIONS.includes(t));
    return [...new Set([...PRESS_TYPE_SUGGESTIONS, ...extra])];
  });
  const [authorOptions, setAuthorOptions] = useState(() => {
    const extra = items.map(it => it.author).filter(Boolean)
      .filter(a => !PRESS_AUTHOR_SUGGESTIONS.includes(a));
    return [...new Set([...PRESS_AUTHOR_SUGGESTIONS, ...extra])];
  });

  function addTypeOption(val)    { const v = val.trim(); if (!v) return; setTypeOptions(prev => prev.includes(v) ? prev : [...prev, v]); }
  function removeTypeOption(val) { setTypeOptions(prev => prev.filter(t => t !== val)); }
  function addAuthorOption(val)    { const v = val.trim(); if (!v) return; setAuthorOptions(prev => prev.includes(v) ? prev : [...prev, v]); }
  function removeAuthorOption(val) { setAuthorOptions(prev => prev.filter(a => a !== val)); }

  const isFiltered = !!(filterType || filterAuthor || filterPage);

  // Derive unique type/author values from current items for the filter dropdowns
  const liveTypes   = [...new Set(items.map(it => it.type).filter(Boolean))].sort();
  const liveAuthors = [...new Set(items.map(it => it.author).filter(Boolean))].sort();

  const displayItems = isFiltered ? items.filter(item => {
    if (filterType   && item.type   !== filterType)   return false;
    if (filterAuthor && item.author !== filterAuthor) return false;
    if (filterPage   && !(Array.isArray(item.pages) && item.pages.includes(filterPage))) return false;
    return true;
  }) : items;

  function updateItem(i, field, value) {
    const next = items.slice();
    next[i] = { ...next[i], [field]: value };
    onChangeItems(next);
  }
  function moveItem(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChangeItems(next);
  }
  function deleteItem(i) {
    if (!confirm("Delete this press item?")) return;
    onChangeItems(items.filter((_, idx) => idx !== i));
  }
  function addItem() {
    // Insert at the top so the new (undated) item is immediately visible
    onChangeItems([blankPressItem(), ...items]);
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
          Press &amp; Publications
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
          {isSaving ? "Saving…" : "Save Press"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap",
        marginBottom: "0.9rem", padding: "0.7rem 0.9rem",
        background: "#fff", border: `1px solid ${LINE}`,
      }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: "0.2rem" }}>
          Filter
        </span>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={filterSelectStyle}>
          <option value="">All types</option>
          {liveTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)} style={filterSelectStyle}>
          <option value="">All authors</option>
          {liveAuthors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterPage} onChange={e => setFilterPage(e.target.value)} style={filterSelectStyle}>
          <option value="">All sub-pages</option>
          {PRESS_PAGE_VALUES.map(v => <option key={v} value={v}>{PRESS_PAGE_LABELS[v]}</option>)}
        </select>
        {isFiltered && (
          <button
            onClick={() => { setFilterType(""); setFilterAuthor(""); setFilterPage(""); }}
            style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem", color: "#c44", borderColor: "#f4caca" }}
          >
            Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: INK_60 }}>
          {isFiltered ? `${displayItems.length} of ${items.length}` : `${items.length}`} item{items.length !== 1 ? "s" : ""}
          {!isFiltered && <span style={{ color: "rgba(0,0,0,0.3)", marginLeft: "0.4em" }}>· sorted newest first</span>}
        </span>
      </div>

      {/* Option management strips */}
      <div style={{
        background: "#fff", border: `1px solid ${LINE}`,
        padding: "0.65rem 0.9rem", marginBottom: "0.85rem",
        display: "flex", flexDirection: "column", gap: "0.45rem",
      }}>
        <OptionChips label="Types"   options={typeOptions}   onRemove={removeTypeOption} />
        <OptionChips label="Authors" options={authorOptions} onRemove={removeAuthorOption} />
      </div>

      <div style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.75rem" }}>
        <strong>Publications</strong> &amp; <strong>Podcasts</strong> → "In the press" · <strong>Articles</strong> &amp; <strong>Blog posts</strong> → "Articles &amp; Commentary" · <strong>Social posts</strong> → "On the feed" (set Platform field to LinkedIn, X, etc.)
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2.5rem" }}>
        <button onClick={addItem} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "0.7rem", fontWeight: 700,
        }}>
          + Add press item
        </button>

        {displayItems.map((item) => {
          const i = items.indexOf(item);
          return (
          <div key={i} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem" }}>
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: "0.85rem", color: INK_60 }}>
                {item.date ? <span style={{ color: INK, marginRight: "0.4em" }}>{item.date}</span> : null}
                <span style={{ textTransform: "capitalize" }}>{item.type}</span>
                {Array.isArray(item.pages) && item.pages.map(p => (
                  <span key={p} style={{
                    marginLeft: "0.3rem", background: "#0A0A0A", color: NEON,
                    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", padding: "0.1em 0.45em",
                  }}>
                    {PRESS_PAGE_LABELS[p] || p}
                  </span>
                ))}
                {item.publication_title && ` · ${item.publication_title}`}
                {item.piece_title && ` — "${item.piece_title}"`}
              </div>
              {!isFiltered && <>
                <button onClick={() => moveItem(i, -1)} disabled={i === 0}                style={iconBtnStyle(i === 0)}               title="Move up">↑</button>
                <button onClick={() => moveItem(i, 1)}  disabled={i === items.length - 1} style={iconBtnStyle(i === items.length - 1)} title="Move down">↓</button>
              </>}
              <button onClick={() => deleteItem(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }} title="Delete">×</button>
            </div>

            {/* Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }} className="press-item-grid">
              {/* Type */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Type
                <EditableSelect
                  value={item.type}
                  options={typeOptions}
                  onChange={v => updateItem(i, "type", v)}
                  onAddOption={addTypeOption}
                  addPlaceholder="e.g. interview"
                />
              </label>

              {/* Author */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Author <span style={{ fontWeight: 400 }}>("Andrew" → Articles &amp; Commentary · anything else → In the press)</span>
                <EditableSelect
                  value={item.author || ""}
                  options={authorOptions}
                  onChange={v => updateItem(i, "author", v)}
                  onAddOption={addAuthorOption}
                  addPlaceholder="e.g. John Smith"
                />
              </label>

              {/* Sub-page / brand association — multi-select checkboxes */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.4rem" }}>
                  Sub-pages (select all that apply)
                </div>
                <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                  {PRESS_PAGE_VALUES.map(v => {
                    const checked = Array.isArray(item.pages) && item.pages.includes(v);
                    return (
                      <label key={v} style={{
                        display: "flex", alignItems: "center", gap: "0.35rem",
                        cursor: "pointer", fontSize: "0.88rem", color: INK, fontWeight: 400,
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const cur = Array.isArray(item.pages) ? item.pages : [];
                            updateItem(i, "pages", e.target.checked
                              ? [...cur, v]
                              : cur.filter(x => x !== v));
                          }}
                          style={{ accentColor: NEON, width: 14, height: 14 }}
                        />
                        {PRESS_PAGE_LABELS[v]}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Date */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Date (optional, e.g. "March 2025")
                <input
                  type="text"
                  value={item.date}
                  onChange={e => updateItem(i, "date", e.target.value)}
                  placeholder="March 2025"
                  style={inputStyle}
                />
              </label>

              {/* Publication title / platform */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                {item.type === "social post" ? "Platform (e.g. LinkedIn, X, Substack)" : "Publication / outlet name"}
                <input
                  type="text"
                  value={item.publication_title}
                  onChange={e => updateItem(i, "publication_title", e.target.value)}
                  placeholder={item.type === "social post" ? "LinkedIn" : "The Wall Street Journal"}
                  style={inputStyle}
                />
              </label>

              {/* Logo URL (non-social only) */}
              {item.type !== "social post" && (
                <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                  Logo URL <span style={{ fontWeight: 400 }}>(optional — paste a direct image link)</span>
                  <input
                    type="text"
                    value={item.logo_url || ""}
                    onChange={e => updateItem(i, "logo_url", e.target.value)}
                    placeholder="https://upload.wikimedia.org/wikipedia/commons/..."
                    style={inputStyle}
                  />
                  {item.logo_url && (
                    <img
                      src={item.logo_url}
                      alt="logo preview"
                      style={{ marginTop: "0.4rem", height: 24, maxWidth: 120, objectFit: "contain", display: "block", border: `1px solid ${LINE}`, padding: "0.2rem" }}
                      onError={e => { e.currentTarget.style.opacity = "0.3"; }}
                    />
                  )}
                </label>
              )}

              {/* Piece title */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Title of the piece / headline
                <input
                  type="text"
                  value={item.piece_title}
                  onChange={e => updateItem(i, "piece_title", e.target.value)}
                  placeholder="Andrew Glantz on AI copyright claims"
                  style={inputStyle}
                />
              </label>

              {/* URL */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
                URL (leave blank if not available)
                <input
                  type="text"
                  value={item.url}
                  onChange={e => updateItem(i, "url", e.target.value)}
                  placeholder="https://wsj.com/articles/..."
                  style={inputStyle}
                />
              </label>

              {/* Excerpt */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
                Excerpt / quote (optional — shown as a pull quote on the card)
                <textarea
                  value={item.excerpt}
                  onChange={e => updateItem(i, "excerpt", e.target.value)}
                  rows={3}
                  placeholder="Short quote or summary from the article…"
                  style={inputStyle}
                />
              </label>
            </div>
          </div>
          );
        })}

        {displayItems.length === 0 && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            {isFiltered ? "No items match the current filters." : "No press items yet. Click \"+ Add press item\" to get started."}
          </div>
        )}

        <button onClick={addItem} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "1rem", fontWeight: 700,
        }}>
          + Add press item
        </button>
      </div>

      <style>{`
        @media (max-width: 540px) {
          .press-item-grid { grid-template-columns: 1fr !important; }
          .press-item-grid label { grid-column: auto !important; }
        }
      `}</style>
    </div>
  );
}

/* A <select> with a sentinel "— Add new… —" option.
   When the sentinel is chosen, an inline text input appears so the user can
   type a new value; confirming adds it to the shared options list via onAddOption. */
function EditableSelect({ value, options, onChange, onAddOption, addPlaceholder = "New value…" }) {
  const [adding, setAdding] = useState(false);
  const [draft,  setDraft]  = useState("");

  function confirm() {
    const v = draft.trim();
    if (v) { onAddOption(v); onChange(v); }
    setAdding(false);
    setDraft("");
  }

  if (adding) {
    return (
      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirm(); } if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
          placeholder={addPlaceholder}
          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        />
        <button type="button" onClick={confirm}
          style={{ ...btnPrimaryStyle, padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}>
          Add
        </button>
        <button type="button" onClick={() => { setAdding(false); setDraft(""); }}
          style={{ ...btnStyle, padding: "0.45rem 0.55rem", fontSize: "0.9rem" }}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === "__add_new__") { setAdding(true); setDraft(""); }
        else onChange(e.target.value);
      }}
      style={{ ...inputStyle, cursor: "pointer" }}
    >
      {options.map(o => (
        <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
      ))}
      <option disabled style={{ color: "#aaa" }}>──────────</option>
      <option value="__add_new__">— Add new… —</option>
    </select>
  );
}

/* Renders a labelled row of removable chips — used to manage the type/author option lists. */
function OptionChips({ label, options, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
      <span style={{
        fontSize: "0.68rem", fontWeight: 700, color: INK_60,
        textTransform: "uppercase", letterSpacing: "0.1em",
        minWidth: "3.8rem", flexShrink: 0,
      }}>
        {label}:
      </span>
      {options.map(o => (
        <span key={o} style={{
          display: "inline-flex", alignItems: "center", gap: "0.2rem",
          background: "#F4F5F7", border: `1px solid ${LINE}`,
          padding: "0.15rem 0.35rem 0.15rem 0.55rem",
          fontFamily: FONT, fontSize: "0.78rem", color: INK,
        }}>
          {o}
          <button
            type="button"
            onClick={() => onRemove(o)}
            title={`Remove "${o}" from list`}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#c44", padding: "0 0.1rem", lineHeight: 1,
              fontSize: "1rem", fontWeight: 700, fontFamily: FONT,
            }}
          >×</button>
        </span>
      ))}
    </div>
  );
}

function LoginForm({ onSubmit, error }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    await onSubmit(password);
    setSubmitting(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#F4F5F7", fontFamily: FONT, color: INK,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
    }}>
      <form onSubmit={submit} style={{
        background: "#fff", border: `1px solid ${LINE}`,
        padding: "2rem", width: "100%", maxWidth: 380,
      }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.4rem", letterSpacing: "-0.01em" }}>
          Turnpage Admin
        </h1>
        <p style={{ fontSize: "0.85rem", color: INK_60, marginBottom: "1.5rem" }}>
          Enter the admin password to continue.
        </p>
        <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={submitting}
            style={inputStyle}
          />
        </label>
        {error && <p style={{ color: "#c44", fontSize: "0.85rem", marginTop: "0.6rem" }}>{error}</p>}
        <button type="submit" disabled={!password || submitting} style={{
          ...btnPrimaryStyle, width: "100%", marginTop: "1.2rem",
          opacity: (!password || submitting) ? 0.5 : 1,
          cursor: (!password || submitting) ? "default" : "pointer",
        }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function CenteredMessage({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#F4F5F7", fontFamily: FONT, color: INK_60,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem", flexDirection: "column",
    }}>
      {children}
    </div>
  );
}

function formatTime(d) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// --- Styles ------------------------------------------------------------------

const filterSelectStyle = {
  padding: "0.32rem 0.6rem", border: `1px solid ${LINE}`, borderRadius: 0,
  fontFamily: FONT, fontSize: "0.82rem", color: INK,
  background: "#fff", cursor: "pointer", outline: "none",
};

const inputStyle = {
  display: "block", width: "100%", marginTop: "0.3rem",
  padding: "0.55rem 0.7rem", border: `1px solid ${LINE}`, borderRadius: 0,
  fontFamily: FONT, fontSize: "0.92rem", color: INK,
  background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box",
};
const btnStyle = {
  background: "transparent", border: `1px solid ${LINE}`, color: INK,
  padding: "0.5rem 0.9rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600,
  cursor: "pointer", borderRadius: 0,
};
const btnPrimaryStyle = {
  background: NEON, border: "none", color: "#000",
  padding: "0.55rem 1.1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700,
  cursor: "pointer", borderRadius: 0, letterSpacing: "0.02em",
};
function iconBtnStyle(disabled) {
  return {
    width: 32, height: 32, padding: 0, lineHeight: 1,
    border: `1px solid ${LINE}`, background: "#fff", color: INK,
    fontFamily: FONT, fontSize: "1rem", fontWeight: 700,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1,
    borderRadius: 0,
  };
}
