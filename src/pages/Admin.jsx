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
  { key: "summary",    label: "Summary (back of flip card — leave empty to disable flip)", type: "textarea", placeholder: "Optional 2-4 sentence description." },
  { key: "case_study", label: "Case study (optional — opens a full modal when the card is clicked)", type: "textarea", placeholder: "Full narrative of the deal, strategy, outcome…" },
];

const PAGES = [
  { key: "home",         label: "Home" },
  { key: "crypto",       label: "Crypto" },
  { key: "ai-copyright", label: "AI Copyright" },
];

function blankDeal() {
  return { amt: "", who: "", type: "", form: "", when: "", summary: "", case_study: "", pages: [], preTurnpage: false, logos: [] };
}

function sanitize(d) {
  return {
    amt:         typeof d.amt         === "string" ? d.amt         : "",
    who:         typeof d.who         === "string" ? d.who         : "",
    type:        typeof d.type        === "string" ? d.type        : "",
    form:        typeof d.form        === "string" ? d.form        : "",
    when:        typeof d.when        === "string" ? d.when        : "",
    summary:     typeof d.summary     === "string" ? d.summary     : "",
    case_study:  typeof d.case_study  === "string" ? d.case_study  : "",
    pages:       Array.isArray(d.pages) ? d.pages.filter(p => typeof p === "string") : [],
    preTurnpage: Boolean(d.preTurnpage),
    logos:       Array.isArray(d.logos) ? d.logos.filter(l => typeof l === "string").slice(0, 3) : [],
  };
}

function sanitizeBio(d) {
  return {
    tagline_before: typeof d.tagline_before === "string" ? d.tagline_before : "A",
    tagline_accent: typeof d.tagline_accent === "string" ? d.tagline_accent : "singular force",
    tagline_after:  typeof d.tagline_after  === "string" ? d.tagline_after  : "",
    paragraphs:     Array.isArray(d.paragraphs) ? d.paragraphs.filter(p => typeof p === "string") : [],
    media_logos:    Array.isArray(d.media_logos)
      ? d.media_logos.filter(l => l && typeof l === "object").map(l => ({
          name: typeof l.name === "string" ? l.name : "",
          url:  typeof l.url  === "string" ? l.url  : "",
        }))
      : [],
  };
}

// Default suggestions shown in the datalist dropdowns — user can type anything else
const PRESS_TYPE_SUGGESTIONS   = ["publication", "podcast", "article", "social post", "blog post", "news"];
const PRESS_AUTHOR_SUGGESTIONS = ["Andrew", "Other"];

const PRESS_PAGE_VALUES = ["copyright", "crypto", "litigation", "tariffs", "bankruptcy"];
const PRESS_PAGE_LABELS = {
  "copyright":  "Copyright Claims",
  "crypto":     "Locked Crypto",
  "litigation": "Litigation Claims",
  "tariffs":    "Tariff Refunds",
  "bankruptcy": "Bankruptcy Claims",
};

const ALERT_PAGE_VALUES = ["home", "ai-copyright", "crypto", "press", "briefings", "contact"];
const ALERT_PAGE_LABELS = {
  "home":         "Home",
  "ai-copyright": "AI Copyright",
  "crypto":       "Locked Crypto",
  "press":        "Press & Publications",
  "briefings":    "Briefings",
  "contact":      "Contact",
};

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

const FAQ_PAGE_VALUES = ["home", "ai-copyright", "crypto", "press", "briefings", "contact"];
const FAQ_PAGE_LABELS = {
  "home":         "Home",
  "ai-copyright": "AI Copyright",
  "crypto":       "Locked Crypto",
  "press":        "Press & Publications",
  "briefings":    "Briefings",
  "contact":      "Contact",
};

function blankFaq() {
  return { active: true, q: "", a: "", pages: ["home"] };
}

function sanitizeFaq(f) {
  return {
    active: Boolean(f.active),
    q:      typeof f.q === "string" ? f.q : "",
    a:      typeof f.a === "string" ? f.a : (Array.isArray(f.a) ? f.a.join("\n\n") : ""),
    pages:  Array.isArray(f.pages) ? f.pages.filter(p => FAQ_PAGE_VALUES.includes(p)) : [],
  };
}

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
  return { type: "publication", author: "Other", pages: [], date: "", url: "", logo_url: "", excerpt: "", publication_title: "", piece_title: "", media_url: "" };
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
    media_url:         typeof d.media_url         === "string" ? d.media_url         : "",
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

  // Alerts state
  const [alertItems, setAlertItems] = useState(null);
  const [originalAlertItems, setOriginalAlertItems] = useState(null);
  const [alertsPhase, setAlertsPhase] = useState("idle"); // "idle"|"loading"|"ready"|"saving"|"error"
  const [alertsError, setAlertsError] = useState("");
  const [alertsLastSavedAt, setAlertsLastSavedAt] = useState(null);

  // FAQs state
  const [faqItems, setFaqItems] = useState(null);
  const [originalFaqItems, setOriginalFaqItems] = useState(null);
  const [faqsPhase, setFaqsPhase] = useState("idle"); // "idle"|"loading"|"ready"|"saving"|"error"
  const [faqsError, setFaqsError] = useState("");
  const [faqsLastSavedAt, setFaqsLastSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/session", { credentials: "include" });
        if (cancelled) return;
        if (r.ok) { loadDeals(); loadBio(); loadPress(); loadAlerts(); loadFaqs(); } else { setPhase("login"); }
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

  const loadAlerts = useCallback(async () => {
    setAlertsPhase("loading");
    setAlertsError("");
    try {
      const r = await fetch("/api/admin/alerts", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = (body.data.alerts || []).map(sanitizeAlert);
      setAlertItems(fresh);
      setOriginalAlertItems(JSON.parse(JSON.stringify(fresh)));
      setAlertsPhase("ready");
    } catch (e) {
      setAlertsError(e.message);
      setAlertsPhase("error");
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

  const alertsDirty = useMemo(() => {
    if (alertItems === null || originalAlertItems === null) return false;
    return JSON.stringify(alertItems) !== JSON.stringify(originalAlertItems);
  }, [alertItems, originalAlertItems]);

  const faqsDirty = useMemo(() => {
    if (faqItems === null || originalFaqItems === null) return false;
    return JSON.stringify(faqItems) !== JSON.stringify(originalFaqItems);
  }, [faqItems, originalFaqItems]);

  const loadFaqs = useCallback(async () => {
    setFaqsPhase("loading");
    setFaqsError("");
    try {
      const r = await fetch("/api/admin/faqs", { credentials: "include" });
      if (r.status === 401) return;
      const body = await r.json();
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = (body.data.faqs || []).map(sanitizeFaq);
      setFaqItems(fresh);
      setOriginalFaqItems(JSON.parse(JSON.stringify(fresh)));
      setFaqsPhase("ready");
    } catch (e) {
      setFaqsError(e.message);
      setFaqsPhase("error");
    }
  }, []);

  async function handleSaveFaqs() {
    if (faqItems === null) return;
    setFaqsPhase("saving");
    setFaqsError("");
    try {
      const r = await fetch("/api/admin/faqs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ faqs: faqItems }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await loadFaqs();
      setFaqsLastSavedAt(new Date());
    } catch (e) {
      setFaqsError(e.message);
      setFaqsPhase("ready");
    }
  }

  async function handleSaveAlerts() {
    if (alertItems === null) return;
    setAlertsPhase("saving");
    setAlertsError("");
    try {
      const r = await fetch("/api/admin/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ alerts: alertItems }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      await loadAlerts();
      setAlertsLastSavedAt(new Date());
    } catch (e) {
      setAlertsError(e.message);
      setAlertsPhase("ready");
    }
  }

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
      loadAlerts();
      loadFaqs();
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
    setAlertItems(null);
    setOriginalAlertItems(null);
    setFaqItems(null);
    setOriginalFaqItems(null);
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
    { key: "bio",    label: "Bio",         dirty: bioDirty    },
    { key: "posts",  label: "Posts",       dirty: false       },
    { key: "deals",  label: "Deals",       dirty: isDirty     },
    { key: "press",  label: "Press",       dirty: pressDirty  },
    { key: "alerts", label: "Alerts",      dirty: alertsDirty },
    { key: "faqs",   label: "FAQs",        dirty: faqsDirty   },
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

      {/* ── Posts tab ─────────────────────────────────────────────── */}
      {tab === "posts" && <PostsSection />}

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

      {/* ── FAQs tab ──────────────────────────────────────────────── */}
      {tab === "faqs" && (
        (faqsPhase === "ready" || faqsPhase === "saving") && faqItems !== null ? (
          <FaqsSection
            faqs={faqItems}
            onChangeFaqs={setFaqItems}
            onSave={handleSaveFaqs}
            dirty={faqsDirty}
            phase={faqsPhase}
            error={faqsError}
            lastSavedAt={faqsLastSavedAt}
          />
        ) : faqsPhase === "loading" ? (
          <CenteredMessage>Loading FAQs…</CenteredMessage>
        ) : faqsPhase === "error" ? (
          <div style={{ maxWidth: 1080, margin: "2rem auto", padding: "0 clamp(1rem, 3vw, 2rem)" }}>
            <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span>{faqsError}</span>
              <button onClick={loadFaqs} style={btnStyle}>Retry</button>
            </div>
          </div>
        ) : null
      )}

      {/* ── Alerts tab ────────────────────────────────────────────── */}
      {tab === "alerts" && (
        (alertsPhase === "ready" || alertsPhase === "saving") && alertItems !== null ? (
          <AlertsSection
            alerts={alertItems}
            onChangeAlerts={setAlertItems}
            onSave={handleSaveAlerts}
            dirty={alertsDirty}
            phase={alertsPhase}
            error={alertsError}
            lastSavedAt={alertsLastSavedAt}
          />
        ) : alertsPhase === "loading" ? (
          <CenteredMessage>Loading alerts…</CenteredMessage>
        ) : alertsPhase === "error" ? (
          <div style={{ maxWidth: 1080, margin: "2rem auto", padding: "0 clamp(1rem, 3vw, 2rem)" }}>
            <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span>{alertsError}</span>
              <button onClick={loadAlerts} style={btnStyle}>Retry</button>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

/* ── CSV helpers ────────────────────────────────────────────────────────────
   Minimal RFC-4180-compatible parser. Handles quoted fields, embedded commas,
   escaped double-quotes (""), and CRLF / LF line endings.                    */

function parseCSVRows(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"')         { inQ = false; }
      else                        { field += c; }
    } else {
      if      (c === '"')                        { inQ = true; }
      else if (c === ',')                        { row.push(field); field = ""; }
      else if (c === '\n' || (c === '\r' && n === '\n')) {
        if (c === '\r') i++;
        row.push(field); field = "";
        if (row.some(f => f !== "")) rows.push(row);
        row = [];
      } else { field += c; }
    }
  }
  row.push(field);
  if (row.some(f => f !== "")) rows.push(row);
  return rows;
}

function csvToFaqs(text) {
  const rows = parseCSVRows(text.trim());
  if (rows.length < 1) return { ok: false, error: "File appears to be empty." };
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const qIdx      = headers.indexOf("question");
  const aIdx      = headers.indexOf("answer");
  const pIdx      = headers.indexOf("pages");
  const activeIdx = headers.indexOf("active");
  if (qIdx === -1) return { ok: false, error: "CSV must have a 'question' column." };
  if (aIdx === -1) return { ok: false, error: "CSV must have an 'answer' column." };

  const imported = [], skipped = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const q = (row[qIdx] || "").trim();
    const a = (row[aIdx] || "").trim();
    if (!q) { skipped.push(`Row ${i + 1}: missing question — skipped`); continue; }
    let pages = ["home"];
    if (pIdx !== -1 && row[pIdx]) {
      const parsed = row[pIdx].split(",").map(p => p.trim().toLowerCase()).filter(p => FAQ_PAGE_VALUES.includes(p));
      if (parsed.length) pages = parsed;
    }
    const active = activeIdx !== -1 && row[activeIdx]
      ? row[activeIdx].trim().toLowerCase() !== "false"
      : true;
    imported.push({ active, q, a, pages });
  }
  return { ok: true, imported, skipped };
}

function faqsToCsvString(faqs) {
  const esc = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const header = "question,answer,pages,active";
  const rows   = faqs.map(f => [
    esc(f.q),
    esc(f.a),
    esc((f.pages || []).join(",")),
    f.active !== false ? "true" : "false",
  ].join(","));
  return [header, ...rows].join("\r\n");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── FaqsSection ──────────────────────────────────────────────────────────── */
function FaqsSection({ faqs, onChangeFaqs, onSave, dirty, phase, error, lastSavedAt }) {
  const isSaving  = phase === "saving";
  const csvRef    = React.useRef(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvError,   setCsvError]   = useState("");

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filterActive, setFilterActive] = useState(""); // "" | "true" | "false"
  const [filterPage,   setFilterPage]   = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const isFiltered = !!(filterActive || filterPage || filterSearch);
  const displayFaqs = isFiltered ? faqs.filter(f => {
    if (filterActive === "true"  && !f.active)  return false;
    if (filterActive === "false" &&  f.active)  return false;
    if (filterPage && !(Array.isArray(f.pages) && f.pages.includes(filterPage))) return false;
    if (filterSearch && !f.q.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  }) : faqs;
  function clearFilters() { setFilterActive(""); setFilterPage(""); setFilterSearch(""); }

  // ── CRUD helpers ────────────────────────────────────────────────────────
  function updateFaq(i, field, value) {
    const next = faqs.slice(); next[i] = { ...next[i], [field]: value }; onChangeFaqs(next);
  }
  function moveFaq(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= faqs.length) return;
    const next = faqs.slice(); [next[i], next[j]] = [next[j], next[i]]; onChangeFaqs(next);
  }
  function deleteFaq(i) {
    if (!confirm("Delete this FAQ?")) return;
    onChangeFaqs(faqs.filter((_, idx) => idx !== i));
  }
  function addFaq() { onChangeFaqs([...faqs, blankFaq()]); }

  // ── CSV export ──────────────────────────────────────────────────────────
  function handleExport() {
    downloadText("faqs.csv", faqsToCsvString(faqs));
  }
  function handleTemplateDownload() {
    const sample = [
      { active: true,  q: "How does pricing work?", a: "Competitive auction across our buyer network.", pages: ["home"] },
      { active: false, q: "Sample inactive FAQ",    a: "Set active to false to hide this FAQ.",          pages: ["home", "crypto"] },
    ];
    downloadText("faqs-template.csv", faqsToCsvString(sample));
  }

  // ── CSV import ──────────────────────────────────────────────────────────
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setCsvError("Please select a .csv file."); return;
    }
    setCsvError("");
    const reader = new FileReader();
    reader.onload = ev => {
      const result = csvToFaqs(ev.target.result);
      if (!result.ok) { setCsvError(result.error); return; }
      setCsvPreview(result);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = ""; // reset so same file can be re-selected
  }

  function applyImport(mode) {
    if (!csvPreview) return;
    onChangeFaqs(mode === "replace" ? csvPreview.imported : [...faqs, ...csvPreview.imported]);
    setCsvPreview(null);
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 0" }}>

      {/* ── Section header ────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap",
        marginBottom: "1rem", paddingBottom: "1rem",
        borderBottom: `2px solid ${LINE}`,
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          FAQs
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "Unsaved changes"}
          {!isSaving && !dirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty && !lastSavedAt && "Up to date"}
        </div>

        {/* CSV actions */}
        <button onClick={handleTemplateDownload} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}>
          ↓ Template
        </button>
        <button onClick={handleExport} disabled={faqs.length === 0} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.4rem 0.75rem", opacity: faqs.length === 0 ? 0.4 : 1 }}>
          ↓ Export CSV
        </button>
        <button onClick={() => csvRef.current && csvRef.current.click()} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}>
          ↑ Import CSV
        </button>
        <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFileSelect} />

        <button onClick={onSave} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor: (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving…" : "Save FAQs"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "1rem" }}>
        Use the <strong>Pages</strong> checkboxes to control which pages each FAQ appears on.
        Inactive FAQs are hidden everywhere. Order here = order on the page.
        Use <code style={{ background: "#F4F5F7", padding: "0.1em 0.3em" }}>[link text](https://...)</code> in answers for hyperlinks.
      </p>

      {/* ── CSV import preview ────────────────────────────────────────── */}
      {csvError && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <span>{csvError}</span>
          <button onClick={() => setCsvError("")} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.2rem 0.55rem" }}>✕</button>
        </div>
      )}

      {csvPreview && (
        <div style={{
          background: "#fff", border: `2px solid ${NEON}`,
          padding: "1.2rem", marginBottom: "1.2rem",
        }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.6rem" }}>
            CSV preview — {csvPreview.imported.length} row{csvPreview.imported.length !== 1 ? "s" : ""} ready to import
          </div>

          {/* Skipped rows */}
          {csvPreview.skipped.length > 0 && (
            <div style={{ marginBottom: "0.7rem" }}>
              {csvPreview.skipped.map((msg, i) => (
                <p key={i} style={{ color: "#b45309", fontSize: "0.78rem", margin: "0.15rem 0" }}>⚠ {msg}</p>
              ))}
            </div>
          )}

          {/* Row list */}
          <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: "0.9rem", border: `1px solid ${LINE}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: "#F4F5F7" }}>
                  <th style={{ padding: "0.35rem 0.6rem", textAlign: "left", fontWeight: 700, color: INK_60, borderBottom: `1px solid ${LINE}`, width: "40%" }}>Question</th>
                  <th style={{ padding: "0.35rem 0.6rem", textAlign: "left", fontWeight: 700, color: INK_60, borderBottom: `1px solid ${LINE}`, width: "35%" }}>Answer (preview)</th>
                  <th style={{ padding: "0.35rem 0.6rem", textAlign: "left", fontWeight: 700, color: INK_60, borderBottom: `1px solid ${LINE}` }}>Pages</th>
                  <th style={{ padding: "0.35rem 0.6rem", textAlign: "left", fontWeight: 700, color: INK_60, borderBottom: `1px solid ${LINE}` }}>Active</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.imported.map((f, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${LINE}` }}>
                    <td style={{ padding: "0.3rem 0.6rem", verticalAlign: "top" }}>{f.q.slice(0, 60)}{f.q.length > 60 ? "…" : ""}</td>
                    <td style={{ padding: "0.3rem 0.6rem", color: INK_60, verticalAlign: "top" }}>{f.a.slice(0, 60)}{f.a.length > 60 ? "…" : ""}</td>
                    <td style={{ padding: "0.3rem 0.6rem", color: INK_60, verticalAlign: "top" }}>{(f.pages || []).join(", ") || "—"}</td>
                    <td style={{ padding: "0.3rem 0.6rem", verticalAlign: "top" }}>{f.active ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import action buttons */}
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => applyImport("append")} style={btnPrimaryStyle}>
              + Append to existing ({faqs.length + csvPreview.imported.length} total)
            </button>
            <button
              onClick={() => { if (confirm(`Replace all ${faqs.length} existing FAQs with the ${csvPreview.imported.length} imported rows?`)) applyImport("replace"); }}
              style={{ ...btnStyle, color: "#c44", borderColor: "#f4caca" }}
            >
              Replace all ({csvPreview.imported.length} rows)
            </button>
            <button onClick={() => setCsvPreview(null)} style={btnStyle}>Cancel</button>
            <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: INK_60 }}>
              Hit <strong>Save FAQs</strong> after importing to publish changes.
            </span>
          </div>
        </div>
      )}

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
          style={{ ...inputStyle, padding: "0.3rem 0.55rem", fontSize: "0.82rem", marginTop: 0, minWidth: 110 }}
        >
          <option value="">All status</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <select
          value={filterPage}
          onChange={e => setFilterPage(e.target.value)}
          style={{ ...inputStyle, padding: "0.3rem 0.55rem", fontSize: "0.82rem", marginTop: 0, minWidth: 130 }}
        >
          <option value="">All pages</option>
          {FAQ_PAGE_VALUES.map(v => <option key={v} value={v}>{FAQ_PAGE_LABELS[v]}</option>)}
        </select>
        <input
          type="text"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          placeholder="Search question…"
          style={{ ...inputStyle, padding: "0.3rem 0.55rem", fontSize: "0.82rem", marginTop: 0, minWidth: 160, flex: 1 }}
        />
        {isFiltered && (
          <button onClick={clearFilters} style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem", color: "#c44", borderColor: "#f4caca" }}>Clear</button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: INK_60 }}>
          {isFiltered ? `${displayFaqs.length} of ${faqs.length}` : `${faqs.length}`} FAQ{faqs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── FAQ rows ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2.5rem" }}>
        {!isFiltered && (
          <button onClick={addFaq} style={{
            ...btnStyle, background: "transparent", border: `1px dashed ${LINE}`,
            color: INK, padding: "0.7rem", fontWeight: 700,
          }}>
            + Add FAQ
          </button>
        )}

        {displayFaqs.map((faq) => {
          const i = faqs.indexOf(faq);
          return (
          <div key={i} style={{
            background: "#fff", border: `1px solid ${faq.active ? LINE : "#e0e0e0"}`,
            padding: "1.2rem", opacity: faq.active ? 1 : 0.6,
          }}>
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox" checked={Boolean(faq.active)}
                  onChange={e => updateFaq(i, "active", e.target.checked)}
                  style={{ accentColor: NEON, width: 16, height: 16 }}
                />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: faq.active ? "#1a7a1a" : INK_60, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {faq.active ? "Active" : "Inactive"}
                </span>
              </label>
              <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60, fontWeight: 600, marginLeft: "0.5rem" }}>
                {faq.q ? faq.q.slice(0, 80) + (faq.q.length > 80 ? "…" : "") : <em>No question set</em>}
              </div>
              <button onClick={() => moveFaq(i, -1)} disabled={isFiltered || i === 0}               style={iconBtnStyle(isFiltered || i === 0)}              title={isFiltered ? "Clear filters to reorder" : "Move up"}>↑</button>
              <button onClick={() => moveFaq(i, 1)}  disabled={isFiltered || i === faqs.length - 1} style={iconBtnStyle(isFiltered || i === faqs.length - 1)} title={isFiltered ? "Clear filters to reorder" : "Move down"}>↓</button>
              <button onClick={() => deleteFaq(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }} title="Delete">×</button>
            </div>

            {/* Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.7rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Question
                <input type="text" value={faq.q} onChange={e => updateFaq(i, "q", e.target.value)} placeholder="How does pricing work?" style={inputStyle} />
              </label>
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
                Answer
                <span style={{ fontWeight: 400, marginLeft: "0.4em" }}>
                  — <code style={{ background: "#F4F5F7", padding: "0.1em 0.3em", fontSize: "0.9em" }}>[text](url)</code> for links · blank line = new paragraph
                </span>
                <textarea
                  value={faq.a} onChange={e => updateFaq(i, "a", e.target.value)}
                  rows={4}
                  placeholder={"We run a competitive auction across our buyer network.\n\nLearn more at [our website](https://turnpagedigital.com)."}
                  style={inputStyle}
                />
              </label>
              <div>
                <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.4rem" }}>Show on pages</div>
                <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                  {FAQ_PAGE_VALUES.map(v => {
                    const checked = Array.isArray(faq.pages) && faq.pages.includes(v);
                    return (
                      <label key={v} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.88rem", color: INK, fontWeight: 400 }}>
                        <input
                          type="checkbox" checked={checked}
                          onChange={e => {
                            const cur = Array.isArray(faq.pages) ? faq.pages : [];
                            updateFaq(i, "pages", e.target.checked ? [...cur, v] : cur.filter(x => x !== v));
                          }}
                          style={{ accentColor: NEON, width: 14, height: 14 }}
                        />
                        {FAQ_PAGE_LABELS[v]}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          );
        })}

        {faqs.length === 0 && !isFiltered && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No FAQs yet. Click "+ Add FAQ" or import a CSV above.
          </div>
        )}
        {isFiltered && displayFaqs.length === 0 && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No FAQs match the current filters.
          </div>
        )}

        <button onClick={addFaq} style={{ ...btnStyle, background: "transparent", border: `1px dashed ${LINE}`, color: INK, padding: "1rem", fontWeight: 700 }}>
          + Add FAQ
        </button>
      </div>
    </div>
  );
}

function AlertsSection({ alerts, onChangeAlerts, onSave, dirty, phase, error, lastSavedAt }) {
  const isSaving = phase === "saving";

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

      {error && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

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
          style={{ ...inputStyle, padding: "0.3rem 0.55rem", fontSize: "0.82rem", marginTop: 0, minWidth: 110 }}
        >
          <option value="">All status</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <select
          value={filterPage}
          onChange={e => setFilterPage(e.target.value)}
          style={{ ...inputStyle, padding: "0.3rem 0.55rem", fontSize: "0.82rem", marginTop: 0, minWidth: 130 }}
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
                  placeholder="#/briefings/2026-04-29-advisory  or  https://..."
                  style={inputStyle}
                />
              </label>

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

      {/* Logos */}
      <div style={{ borderTop: `1px solid ${LINE}`, marginTop: "1rem", paddingTop: "0.9rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: INK_60, marginBottom: "0.6rem" }}>
          Logos <span style={{ fontWeight: 400 }}>(optional — up to 3, shown as white icons on the card)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.7rem 1rem" }} className="deal-logos-grid">
          {[0, 1, 2].map(idx => {
            const url = (Array.isArray(deal.logos) && typeof deal.logos[idx] === "string") ? deal.logos[idx] : "";
            return (
              <label key={idx} style={{ display: "block", fontSize: "0.75rem", color: INK_60, fontWeight: 600 }}>
                Logo {idx + 1}
                <input
                  type="text"
                  value={url}
                  onChange={e => {
                    const slots = [0, 1, 2].map(i =>
                      (Array.isArray(deal.logos) && typeof deal.logos[i] === "string") ? deal.logos[i] : ""
                    );
                    slots[idx] = e.target.value;
                    // Compact: drop trailing empty slots
                    let end = 2;
                    while (end > 0 && !slots[end]) end--;
                    onChange("logos", slots.slice(0, end + 1).filter((_, i) => i <= end));
                  }}
                  placeholder="https://..."
                  style={inputStyle}
                />
                {url && (
                  <div style={{ marginTop: "0.35rem", background: "#111", padding: "0.3rem 0.5rem", display: "inline-flex", alignItems: "center" }}>
                    <img
                      src={url}
                      alt="logo preview"
                      style={{ height: 18, maxWidth: 80, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7, display: "block" }}
                      onError={e => { e.currentTarget.style.opacity = "0.2"; }}
                    />
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 540px) {
          .deal-logos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── CropTool ───────────────────────────────────────────────────────────────
   A simple drag-to-pan + zoom-slider crop widget.
   - src: data URL of the image to crop
   - circular: if true, the crop viewport is shown as a circle (for avatars)
   - onApply(base64png): called with the cropped PNG as base64 (no data: prefix)
   - onCancel(): called when user clicks Cancel
*/
const CROP_SIZE   = 280;   // viewport display px
const OUTPUT_SIZE = 400;   // exported image px

function CropTool({ src, circular, onApply, onCancel }) {
  const imgRef  = React.useRef(null);
  const [zoom,   setZoomState] = useState(1);
  const [offset, setOffset]    = useState({ x: 0, y: 0 }); // img top-left in container
  const dragRef = React.useRef(null); // { startX, startY, origX, origY }

  // After image loads, centre it in the viewport
  function handleLoad() {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const h = CROP_SIZE * img.naturalHeight / img.naturalWidth;
    setOffset({ x: 0, y: (CROP_SIZE - h) / 2 });
    setZoomState(1);
  }

  // Zoom while keeping the viewport centre anchored to the same image pixel
  function handleZoom(newZoom) {
    const ratio = newZoom / zoom;
    setOffset(prev => ({
      x: CROP_SIZE / 2 - (CROP_SIZE / 2 - prev.x) * ratio,
      y: CROP_SIZE / 2 - (CROP_SIZE / 2 - prev.y) * ratio,
    }));
    setZoomState(newZoom);
  }

  // Pointer-capture drag (works for mouse + touch, stays captured outside element)
  function handlePointerDown(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  }
  function handlePointerUp(e) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  function handleApply() {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const displayW = CROP_SIZE * zoom;           // px wide the img is drawn
    const scale    = nw / displayW;              // natural px per display px

    // Crop window top-left in display-image coords
    const cropDX = -offset.x;
    const cropDY = -offset.y;

    // Clamp to image bounds
    const srcX = Math.max(0, cropDX * scale);
    const srcY = Math.max(0, cropDY * scale);
    const srcW = Math.min(CROP_SIZE * scale, nw - srcX);
    const srcH = Math.min(CROP_SIZE * scale, nh - srcY);

    const canvas = document.createElement("canvas");
    canvas.width  = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");

    if (circular) {
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onApply(canvas.toDataURL("image/png").split(",")[1]);
  }

  return (
    <div>
      {/* Viewport */}
      <div
        style={{
          width: CROP_SIZE, height: CROP_SIZE,
          overflow: "hidden", position: "relative",
          cursor: "move",
          background: "#888",
          borderRadius: circular ? "50%" : 0,
          border: `2px solid ${LINE}`,
          touchAction: "none",
          flexShrink: 0,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={src}
          onLoad={handleLoad}
          draggable={false}
          style={{
            position: "absolute",
            width: `${zoom * 100}%`,
            height: "auto",
            left: offset.x,
            top: offset.y,
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
        {/* Guide overlay */}
        {!circular && (
          <div style={{
            position: "absolute", inset: 0,
            border: "1px dashed rgba(255,255,255,0.5)",
            pointerEvents: "none",
          }} />
        )}
      </div>

      {/* Zoom */}
      <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ fontSize: "0.72rem", color: INK_60, fontWeight: 600, flexShrink: 0 }}>Zoom</span>
        <input
          type="range" min={1} max={4} step={0.01} value={zoom}
          onChange={e => handleZoom(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: NEON, cursor: "pointer" }}
        />
        <span style={{ fontSize: "0.72rem", color: INK_60, minWidth: "2.5rem" }}>{zoom.toFixed(2)}×</span>
      </div>

      <p style={{ fontSize: "0.72rem", color: INK_60, margin: "0.3rem 0 0.6rem" }}>
        Drag to reposition · scroll slider to zoom
      </p>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={handleApply} style={btnPrimaryStyle}>Apply Crop</button>
        <button type="button" onClick={onCancel} style={btnStyle}>Cancel</button>
      </div>
    </div>
  );
}

function BioSection({ bio, onChangeBio, onSave, dirty, phase, error, lastSavedAt }) {
  const isSaving = phase === "saving";
  const paragraphs = bio.paragraphs || [];

  // ── Profile photo upload + crop state ──────────────────────────────────────
  // phases: idle | cropping | cropped | uploading | done | error
  const [photoRaw,       setPhotoRaw]       = useState(null);  // raw data URL → shown in CropTool
  const [photoCropped,   setPhotoCropped]   = useState(null);  // base64 PNG from CropTool
  const [photoPhase,     setPhotoPhase]     = useState("idle");
  const [photoError,     setPhotoError]     = useState("");
  const [photoCacheBust, setPhotoCacheBust] = useState("");

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setPhotoError("Image must be under 10 MB."); return; }
    setPhotoError("");
    const reader = new FileReader();
    reader.onload = ev => { setPhotoRaw(ev.target.result); setPhotoPhase("cropping"); };
    reader.readAsDataURL(file);
    e.target.value = "";   // reset so same file can be re-selected
  }

  async function handlePhotoUpload() {
    if (!photoCropped) return;
    setPhotoPhase("uploading");
    setPhotoError("");
    try {
      const r = await fetch("/api/admin/photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: photoCropped, mime_type: "image/png" }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      setPhotoPhase("done");
      setPhotoCropped(null);
      setPhotoRaw(null);
      setPhotoCacheBust(`?v=${Date.now()}`);
    } catch (e) {
      setPhotoError(e.message);
      setPhotoPhase("error");
    }
  }

  // ── Avatar upload + crop state ───────────────────────────────────────────
  // The avatar is a separate circular crop used in social post cards
  const [avatarRaw,       setAvatarRaw]       = useState(null);
  const [avatarCropped,   setAvatarCropped]   = useState(null);
  const [avatarPhase,     setAvatarPhase]     = useState("idle");
  const [avatarError,     setAvatarError]     = useState("");
  const [avatarCacheBust, setAvatarCacheBust] = useState("");

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setAvatarError("Image must be under 10 MB."); return; }
    setAvatarError("");
    const reader = new FileReader();
    reader.onload = ev => { setAvatarRaw(ev.target.result); setAvatarPhase("cropping"); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleAvatarUpload() {
    if (!avatarCropped) return;
    setAvatarPhase("uploading");
    setAvatarError("");
    try {
      const r = await fetch("/api/admin/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: avatarCropped, mime_type: "image/png" }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      setAvatarPhase("done");
      setAvatarCropped(null);
      setAvatarRaw(null);
      setAvatarCacheBust(`?v=${Date.now()}`);
    } catch (e) {
      setAvatarError(e.message);
      setAvatarPhase("error");
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

  // ── Media logo helpers ──────────────────────────────────────────────────
  const logos = Array.isArray(bio.media_logos) ? bio.media_logos : [];

  function updateLogo(i, field, val) {
    const next = logos.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
    onChangeBio("media_logos", next);
  }
  function moveLogo(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= logos.length) return;
    const next = [...logos];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeBio("media_logos", next);
  }
  function deleteLogo(i) {
    if (!confirm("Remove this logo?")) return;
    onChangeBio("media_logos", logos.filter((_, idx) => idx !== i));
  }
  function addLogo() {
    onChangeBio("media_logos", [...logos, { name: "", url: "" }]);
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

      {/* ── Profile Photo ─────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.8rem" }}>
          Profile Photo
        </div>

        {photoPhase === "cropping" ? (
          /* ── Crop step ── */
          <div>
            <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.7rem" }}>
              Drag to reposition · use the slider to zoom · click <strong>Apply Crop</strong> when ready.
            </p>
            <CropTool
              src={photoRaw}
              circular={false}
              onApply={b64 => { setPhotoCropped(b64); setPhotoPhase("cropped"); }}
              onCancel={() => { setPhotoRaw(null); setPhotoPhase("idle"); }}
            />
          </div>
        ) : (
          /* ── Idle / cropped / uploading / done ── */
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
              {photoCropped ? (
                <div style={{ marginBottom: "0.65rem" }}>
                  <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.3rem", fontWeight: 600 }}>
                    Cropped preview
                  </p>
                  <img
                    src={`data:image/png;base64,${photoCropped}`}
                    alt="cropped preview"
                    style={{ width: 90, height: 90, objectFit: "cover", border: `1px solid ${LINE}`, display: "block" }}
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoPhase("cropping"); }}
                    style={{ ...btnStyle, fontSize: "0.75rem", padding: "0.25rem 0.6rem", marginTop: "0.4rem" }}
                  >
                    Re-crop
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.5rem" }}>
                  Replace with a new photo — JPEG, PNG, or WebP, max 10 MB:
                </p>
              )}

              {!photoCropped && (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.65rem", fontFamily: FONT }}
                />
              )}

              {photoError && (
                <p style={{ color: "#c44", fontSize: "0.82rem", marginBottom: "0.5rem" }}>{photoError}</p>
              )}
              {photoPhase === "done" && (
                <p style={{ color: "#2a7a2a", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                  ✓ Uploaded — live on the site in ~1–2 min.
                </p>
              )}

              {photoCropped && (
                <button
                  type="button"
                  onClick={handlePhotoUpload}
                  disabled={photoPhase === "uploading"}
                  style={{
                    ...btnPrimaryStyle,
                    opacity: photoPhase === "uploading" ? 0.5 : 1,
                    cursor: photoPhase === "uploading" ? "default" : "pointer",
                  }}
                >
                  {photoPhase === "uploading" ? "Uploading…" : "Upload Photo"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Avatar (circular crop — used in social post cards) ────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.3rem" }}>
          Avatar <span style={{ fontWeight: 400, color: INK_60 }}>(circle crop)</span>
        </div>
        <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.8rem" }}>
          This cropped headshot appears in the social post cards on the Press page.
          Upload a separate tightly-cropped face photo, or re-use the profile photo.
        </p>

        {avatarPhase === "cropping" ? (
          <div>
            <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.7rem" }}>
              Centre your face in the circle · drag to reposition · zoom in as needed.
            </p>
            <CropTool
              src={avatarRaw}
              circular={true}
              onApply={b64 => { setAvatarCropped(b64); setAvatarPhase("cropped"); }}
              onCancel={() => { setAvatarRaw(null); setAvatarPhase("idle"); }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>

            {/* Current avatar */}
            <div>
              <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.4rem", fontWeight: 600 }}>Current</p>
              <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: `1px solid ${LINE}`, background: "#eee" }}>
                <img
                  src={`/andrew-avatar.png${avatarCacheBust}`}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <p style={{ fontSize: "0.65rem", color: INK_60, marginTop: "0.3rem", maxWidth: 72 }}>
                (blank until first upload)
              </p>
            </div>

            {/* Upload controls */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {avatarCropped ? (
                /* ── Post-crop: preview + action buttons side-by-side ── */
                <div>
                  <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.4rem", fontWeight: 600 }}>
                    Cropped preview
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: `1px solid ${LINE}`, flexShrink: 0 }}>
                      <img
                        src={`data:image/png;base64,${avatarCropped}`}
                        alt="avatar preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={avatarPhase === "uploading"}
                        style={{
                          ...btnPrimaryStyle,
                          opacity: avatarPhase === "uploading" ? 0.5 : 1,
                          cursor: avatarPhase === "uploading" ? "default" : "pointer",
                        }}
                      >
                        {avatarPhase === "uploading" ? "Uploading…" : "Upload Avatar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarPhase("cropping")}
                        style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem" }}
                      >
                        Re-crop
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Idle: file picker ── */
                <div>
                  <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.5rem" }}>
                    Upload a photo — JPEG, PNG, or WebP, max 10 MB:
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.65rem", fontFamily: FONT }}
                  />
                </div>
              )}

              {avatarError && (
                <p style={{ color: "#c44", fontSize: "0.82rem", marginTop: "0.5rem" }}>{avatarError}</p>
              )}
              {avatarPhase === "done" && (
                <p style={{ color: "#2a7a2a", fontSize: "0.82rem", marginTop: "0.5rem" }}>
                  ✓ Avatar uploaded — live in ~1–2 min.
                </p>
              )}
            </div>
          </div>
        )}
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

      {/* ── "As Seen In" Logos ─────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.35rem" }}>
          "As Seen In" Logos
        </div>
        <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.9rem" }}>
          Logos appear as grayscale images in the Team section. Paste any public image URL (PNG, SVG, WebP). Name is used for accessibility only.
        </p>

        {logos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "0.75rem" }}>
            {logos.map((logo, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {/* Live preview */}
                <div style={{
                  width: 64, height: 32, flexShrink: 0,
                  background: "#F4F5F7", border: `1px solid ${LINE}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {logo.url ? (
                    <img
                      src={logo.url}
                      alt={logo.name || "preview"}
                      style={{ maxWidth: 60, maxHeight: 28, objectFit: "contain", filter: "grayscale(1)", opacity: 0.55 }}
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <span style={{ fontSize: "0.62rem", color: INK_60 }}>no url</span>
                  )}
                </div>

                {/* Name */}
                <input
                  type="text"
                  value={logo.name}
                  onChange={e => updateLogo(i, "name", e.target.value)}
                  placeholder="Name (e.g. Bloomberg)"
                  style={{ ...inputStyle, marginTop: 0, width: 160, flexShrink: 0 }}
                />

                {/* URL */}
                <input
                  type="text"
                  value={logo.url}
                  onChange={e => updateLogo(i, "url", e.target.value)}
                  placeholder="https://example.com/logo.png"
                  style={{ ...inputStyle, marginTop: 0, flex: 1, minWidth: 200 }}
                />

                {/* Actions */}
                <button onClick={() => moveLogo(i, -1)} disabled={i === 0}              style={iconBtnStyle(i === 0)}              title="Move up">↑</button>
                <button onClick={() => moveLogo(i, 1)}  disabled={i === logos.length - 1} style={iconBtnStyle(i === logos.length - 1)} title="Move down">↓</button>
                <button onClick={() => deleteLogo(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}

        {logos.length === 0 && (
          <p style={{ fontSize: "0.82rem", color: INK_60, fontStyle: "italic", marginBottom: "0.75rem" }}>
            No logos yet — add one below.
          </p>
        )}

        <button onClick={addLogo} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "0.55rem 1rem", fontWeight: 700,
        }}>
          + Add logo
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

/* ── Media upload field — URL entry + optional file upload ──────────────── */
function MediaUploadField({ value, onChange, inputStyle }) {
  const [phase,   setPhase]   = useState("idle"); // idle | uploading | done | error
  const [errMsg,  setErrMsg]  = useState("");
  const fileRef = React.useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = ["video/mp4", "video/webm"].includes(file.type);
    if (!isImage && !isVideo) {
      setErrMsg("Unsupported type. Use JPEG, PNG, WebP, GIF, MP4, or WebM.");
      return;
    }
    if (file.size > 11 * 1024 * 1024) {
      setErrMsg("File too large — max 11 MB. For longer videos paste a YouTube or Vimeo URL instead.");
      return;
    }

    setPhase("uploading");
    setErrMsg("");

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = ev => res(ev.target.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const r = await fetch("/api/admin/press-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: base64, mime_type: file.type, filename: file.name }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");

      onChange(body.url);
      setPhase("done");
    } catch (err) {
      setErrMsg(err.message);
      setPhase("error");
    } finally {
      // reset file input so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.35rem" }}>
        Image or video (optional — shown as a thumbnail below the excerpt)
      </span>

      {/* URL input + upload button row */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setPhase("idle"); setErrMsg(""); }}
          placeholder="Paste a URL (image or YouTube link) — or upload a file →"
          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        />

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          style={{ display: "none" }}
          onChange={handleFile}
        />

        {/* Upload trigger button */}
        <button
          type="button"
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={phase === "uploading"}
          style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            padding: "0 1rem", whiteSpace: "nowrap",
            background: phase === "done" ? "#22c55e" : INK,
            color: "#fff",
            border: "none", cursor: phase === "uploading" ? "wait" : "pointer",
            opacity: phase === "uploading" ? 0.6 : 1,
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          {phase === "uploading" ? "Uploading…" : phase === "done" ? "✓ Uploaded" : "Upload file"}
        </button>
      </div>

      {/* Error */}
      {errMsg && (
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#ef4444", margin: "0.3rem 0 0" }}>
          {errMsg}
        </p>
      )}

      {/* Preview thumbnail if there's a URL */}
      {value && (
        <div style={{ marginTop: "0.5rem" }}>
          {/\.(mp4|webm)$/i.test(value) ? (
            <video src={value} style={{ maxHeight: 80, maxWidth: 160, display: "block", background: "#000" }} />
          ) : (
            <img
              src={value}
              alt=""
              style={{ maxHeight: 80, maxWidth: 160, objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          )}
        </div>
      )}
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

              {/* Excerpt / Abstract */}
              <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
                {item.type === "blog post" ? "Abstract / summary (shown on the card below the title)" : "Excerpt / quote (optional — shown as a pull quote on the card)"}
                <textarea
                  value={item.excerpt}
                  onChange={e => updateItem(i, "excerpt", e.target.value)}
                  rows={3}
                  placeholder={item.type === "blog post" ? "2–4 sentence abstract describing what the post covers…" : "Short quote or summary from the article…"}
                  style={inputStyle}
                />
              </label>

              {/* Media URL + upload */}
              <MediaUploadField
                value={item.media_url || ""}
                onChange={val => updateItem(i, "media_url", val)}
                inputStyle={inputStyle}
              />
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

/* ═══════════════════════════════════════════════════════════════════════════
   PostsSection — create / edit / delete briefings, articles, announcements
   Self-contained: manages its own state and hits /api/admin/posts directly.
═══════════════════════════════════════════════════════════════════════════ */

const POST_TYPES = ["briefing", "article", "announcement"];
const POST_TYPE_LABELS = { briefing: "Briefing", article: "Article", announcement: "Announcement" };
const POST_TYPE_COLORS = { briefing: NEON, article: "#0A0A0A", announcement: NEON };
const POST_TYPE_FG     = { briefing: "#000", article: "#fff",    announcement: "#000" };

function slugify(title, date) {
  const d = date || new Date().toISOString().slice(0, 10);
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
    .replace(/-$/, "");
  return s ? `${d}-${s}` : d;
}

function blankPostForm() {
  return {
    slug: "", date: new Date().toISOString().slice(0, 10),
    type: "briefing", title: "", summary: "", tags: "", active: true, content: "",
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

function PostsSection() {
  const [listPhase, setListPhase]  = useState("loading"); // loading|ready|error
  const [listError, setListError]  = useState("");
  const [posts, setPosts]          = useState([]);         // metadata array

  const [view, setView]            = useState("list");     // "list" | "editor"
  const [form, setForm]            = useState(blankPostForm());
  const [isNew, setIsNew]          = useState(false);
  const [editorPhase, setEditorPhase] = useState("idle"); // idle|loading-content|saving|error
  const [editorError, setEditorError] = useState("");
  const [savedAt, setSavedAt]      = useState(null);

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

  // ── Open editor for existing post ───────────────────────────────────────
  async function openEdit(meta) {
    setView("editor");
    setIsNew(false);
    setEditorPhase("loading-content");
    setEditorError("");
    setForm({
      slug:    meta.slug    || "",
      date:    meta.date    || "",
      type:    meta.type    || "briefing",
      title:   meta.title   || "",
      summary: meta.summary || "",
      tags:    Array.isArray(meta.tags) ? meta.tags.join(", ") : "",
      active:  meta.active !== false,
      content: "",
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
      }
      return next;
    });
  }

  // ── Save post ───────────────────────────────────────────────────────────
  async function savePost() {
    setEditorPhase("saving");
    setEditorError("");
    const item = {
      slug:    form.slug.trim(),
      date:    form.date.trim(),
      type:    form.type,
      title:   form.title.trim(),
      summary: form.summary.trim(),
      tags:    form.tags.split(",").map(t => t.trim()).filter(Boolean),
      active:  form.active,
    };
    try {
      const r = await fetch("/api/admin/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "save-post", item, content: form.content, isNew }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Save failed");
      setSavedAt(new Date());
      setEditorPhase("idle");
      setIsNew(false); // it now exists
      await loadPosts();
    } catch (e) {
      setEditorError(e.message);
      setEditorPhase("error");
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
      await loadPosts();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  }

  // ── LIST VIEW ───────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 0" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap",
          marginBottom: "1rem", paddingBottom: "1rem", borderBottom: `2px solid ${LINE}`,
        }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Posts</div>
          <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60 }}>
            {listPhase === "loading" && "Loading…"}
            {listPhase === "ready"   && `${posts.length} post${posts.length !== 1 ? "s" : ""}`}
          </div>
          <button onClick={openNew} style={btnPrimaryStyle}>+ New Post</button>
        </div>

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
                No posts yet. Click "+ New Post" to create one.
              </div>
            )}
            {posts.map(post => (
              <div key={post.slug} style={{
                background: "#fff", border: `1px solid ${post.active === false ? "#e0e0e0" : LINE}`,
                padding: "0.85rem 1rem",
                display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap",
                opacity: post.active === false ? 0.6 : 1,
              }}>
                <PostTypeBadge type={post.type || "briefing"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {post.title || <em style={{ color: INK_60 }}>Untitled</em>}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: INK_60, marginTop: "0.15rem" }}>
                    {post.date}
                    {post.active === false && <span style={{ marginLeft: "0.5rem", color: "#b45309" }}>· Draft</span>}
                  </div>
                </div>
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
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR VIEW ─────────────────────────────────────────────────────────
  const isSaving = editorPhase === "saving";
  const isLoadingContent = editorPhase === "loading-content";

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

      {editorError && (
        <div style={{ background: "#fce8e8", color: "#7a1a1a", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {editorError}
        </div>
      )}

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
                style={{ ...inputStyle, marginTop: "0.3rem" }}
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
              Slug {isNew ? <span style={{ fontWeight: 400 }}>(auto-generated, editable)</span> : <span style={{ fontWeight: 400 }}>(read-only after publish)</span>}
              <input
                type="text"
                value={form.slug}
                onChange={e => isNew && setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                readOnly={!isNew}
                placeholder="2026-05-26-my-post-title"
                style={{ ...inputStyle, background: isNew ? "#fff" : "#F4F5F7", color: isNew ? INK : INK_60 }}
              />
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

          {/* Row 5: Tags */}
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

          {/* Row 6: Markdown content */}
          <div>
            <div style={{ fontSize: "0.78rem", color: INK_60, fontWeight: 600, marginBottom: "0.4rem" }}>
              Content <span style={{ fontWeight: 400 }}>— Markdown</span>
            </div>
            {/* Markdown quick-reference */}
            <div style={{
              display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center",
              padding: "0.45rem 0.7rem", background: "#F4F5F7", border: `1px solid ${LINE}`,
              borderBottom: "none", fontSize: "0.73rem", color: INK_60, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            }}>
              <span style={{ fontFamily: FONT, fontWeight: 700, color: INK_60, fontStyle: "normal", marginRight: "0.2rem" }}>Syntax:</span>
              {["# H1", "## H2", "**bold**", "*italic*", "[text](url)", "> quote", "---"].map(hint => (
                <code key={hint} style={{ background: "#E5E7EB", padding: "0.1em 0.35em", borderRadius: 2, fontSize: "0.78rem" }}>{hint}</code>
              ))}
            </div>
            <textarea
              value={form.content}
              onChange={e => setField("content", e.target.value)}
              rows={24}
              placeholder={"## Introduction\n\nStart writing your post here...\n\n## Section heading\n\nMore content...\n\n> A pull quote or key takeaway\n\nFinal thoughts."}
              style={{ ...inputStyle, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: "0.88rem", lineHeight: 1.6 }}
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
