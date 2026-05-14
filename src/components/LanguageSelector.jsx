import React from "react";
import { FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { LANGUAGES, useI18n } from "../lib/i18n.js";

/* Globe + current language label. Click to open a menu and switch.
   Choice persists to localStorage via the I18n context.

   Props:
   - direction: "up" (default, for footer) opens the menu above the trigger;
                "down" (for top-of-page placements like the announcement bar)
                opens it below.
   - fontSize:  optional font-size override for the trigger label. */
export default function LanguageSelector({ direction = "up", fontSize = "0.82rem" }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const menuPosition = direction === "down"
    ? { top: "calc(100% + 0.6rem)" }
    : { bottom: "calc(100% + 0.6rem)" };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          background: "transparent", border: 0, padding: 0, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: "0.5em",
          fontFamily: FONT, fontSize,
          color: INK, transition: "opacity 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span>{t("footer.region_label")} · {current.nativeLabel}</span>
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", right: 0, ...menuPosition,
            background: "#FFFFFF",
            border: `1px solid ${LINE}`,
            boxShadow: "0 12px 28px rgba(10,10,10,0.08)",
            minWidth: 220,
            zIndex: 20,
            maxHeight: "60vh", overflowY: "auto",
          }}
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between",
                padding: "0.8rem 1rem",
                background: "transparent", border: 0, cursor: "pointer",
                fontFamily: FONT, fontSize: "0.92rem",
                fontWeight: l.code === lang ? 700 : 500,
                color: INK, textAlign: "left",
                transition: "background 0.15s",
                borderTop: l.code === LANGUAGES[0].code ? "none" : `1px solid ${LINE}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#F4F5F7"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <span>{l.nativeLabel}</span>
              <span style={{ color: INK_60, fontSize: "0.78rem" }}>{l.englishLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
