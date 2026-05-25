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

const PRESS_TYPE_VALUES = ["publication", "podcast", "article", "social post", "blog post"];

function blankPressItem() {
  return { type: "publication", date: "", url: "", excerpt: "", publication_title: "", piece_title: "" };
}

function sanitizePressItem(d) {
  return {
    type:              PRESS_TYPE_VALUES.includes(d.type) ? d.type : "publication",
    date:              typeof d.date              === "string" ? d.date              : "",
    url:               typeof d.url               === "string" ? d.url               : "",
    excerpt:           typeof d.excerpt           === "string" ? d.excerpt           : "",
    publication_title: typeof d.publication_title === "string" ? d.publication_title : "",
    piece_title:       typeof d.piece_title       === "string" ? d.piece_title       : "",
  };
}

export default function Admin() {
  const [phase, setPhase] = useState("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [deals, setDeals] = useState(null);
  const [original, setOriginal] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

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

  return (
    <div style={{ background: "#F4F5F7", minHeight: "100vh", fontFamily: FONT, color: INK }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#FFFFFF", borderBottom: `1px solid ${LINE}`,
        padding: "0.9rem clamp(1rem, 3vw, 2rem)",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
      }}>
        <div style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em" }}>
          Admin · Deals, Bio &amp; Press
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
          {phase === "saving" ? "Saving…" : "Save"}
        </button>
        <button onClick={handleLogout} style={btnStyle}>Log out</button>
      </div>

      {errorMsg && (
        <div style={{
          background: "#fce8e8", color: "#7a1a1a",
          padding: "0.75rem clamp(1rem, 3vw, 2rem)",
          borderBottom: `1px solid #f4caca`, fontSize: "0.9rem",
        }}>
          {errorMsg}
        </div>
      )}

      {/* ── Bio section ───────────────────────────────────────────── */}
      {(bioPhase === "ready" || bioPhase === "saving") && bio ? (
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
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "1.5rem clamp(1rem, 3vw, 2rem)", fontSize: "0.85rem", color: INK_60 }}>
          Loading bio…
        </div>
      ) : bioPhase === "error" ? (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) 1rem" }}>
          <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <span>Bio: {bioError}</span>
            <button onClick={loadBio} style={btnStyle}>Retry</button>
          </div>
        </div>
      ) : null}

      {/* ── Press section ─────────────────────────────────────────── */}
      {(pressPhase === "ready" || pressPhase === "saving") && pressItems !== null ? (
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
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "1.5rem clamp(1rem, 3vw, 2rem)", fontSize: "0.85rem", color: INK_60 }}>
          Loading press…
        </div>
      ) : pressPhase === "error" ? (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) 1rem" }}>
          <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <span>Press: {pressError}</span>
            <button onClick={loadPress} style={btnStyle}>Retry</button>
          </div>
        </div>
      ) : null}

      {/* ── Deals section ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>
        <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "1.5rem" }}>
          All deals ({list.length}) — use the <strong>Pages</strong> checkboxes on each card to control where it appears. Order here = order on each page.
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
    onChangeItems([...items, blankPressItem()]);
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

      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.75rem" }}>
        {items.length} item{items.length !== 1 ? "s" : ""} — <strong>Publications</strong> and <strong>Podcasts</strong> appear under "In the press". <strong>Articles</strong>, <strong>Social posts</strong>, and <strong>Blog posts</strong> appear under "By Andrew".
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2.5rem" }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem" }}>
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: "0.85rem", color: INK_60 }}>
                #{i + 1} — <span style={{ textTransform: "capitalize" }}>{item.type}</span>
                {item.publication_title && ` · ${item.publication_title}`}
                {item.piece_title && ` — "${item.piece_title}"`}
              </div>
              <button onClick={() => moveItem(i, -1)} disabled={i === 0}                style={iconBtnStyle(i === 0)}               title="Move up">↑</button>
              <button onClick={() => moveItem(i, 1)}  disabled={i === items.length - 1} style={iconBtnStyle(i === items.length - 1)} title="Move down">↓</button>
              <button onClick={() => deleteItem(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }}                               title="Delete">×</button>
            </div>

            {/* Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }} className="press-item-grid">
              {/* Type */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Type
                <select
                  value={item.type}
                  onChange={e => updateItem(i, "type", e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {PRESS_TYPE_VALUES.map(t => (
                    <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </label>

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

              {/* Publication title */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Publication / outlet name
                <input
                  type="text"
                  value={item.publication_title}
                  onChange={e => updateItem(i, "publication_title", e.target.value)}
                  placeholder="The Wall Street Journal"
                  style={inputStyle}
                />
              </label>

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
        ))}

        {items.length === 0 && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No press items yet. Click "+ Add press item" to get started.
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
