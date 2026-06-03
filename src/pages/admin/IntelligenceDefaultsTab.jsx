import React, { useState, useEffect, useMemo } from "react";
import { FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle } from "./shared.jsx";

/* IntelligenceDefaultsTab — global defaults for the Intelligence engine.
   v1 manages a single default voice/tone. external/internal voices are
   reserved (shown disabled) for a later public-vs-internal split. */

const card = { background: SURFACE, border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1.2rem" };
const labelStyle = { display: "block", fontSize: "0.74rem", color: INK_60, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 4 };
const sectionH = { fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.4rem", color: INK };

export default function IntelligenceDefaultsTab({ onDirtyChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [voiceDefault, setVoiceDefault] = useState("");
  const [original, setOriginal] = useState("");

  useEffect(() => { load(); }, []);

  const dirty = useMemo(() => voiceDefault !== original, [voiceDefault, original]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/intelligence-settings", { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load settings");
      const v = (data.settings && data.settings.voice && data.settings.voice.default) || "";
      setVoiceDefault(v); setOriginal(v);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function save() {
    setLoading(true); setError(""); setToast("");
    try {
      const res = await fetch("/api/admin/intelligence-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ voice: { default: voiceDefault } }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save");
      setOriginal(voiceDefault);
      setToast("Voice saved");
      onDirtyChange?.(false);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const wrap = { maxWidth: 820, margin: "0 auto", padding: "1.4rem clamp(1rem,3vw,2rem) 3rem" };

  return (
    <div style={{ fontFamily: FONT, color: INK }}>
      <div style={wrap}>
        <div style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Defaults</h2>
          <p style={{ fontSize: "0.85rem", color: INK_60, marginTop: 2 }}>
            Global settings that apply across every theme and case.
          </p>
        </div>

        {error && <Banner kind="error">{error}</Banner>}
        {toast && <Banner kind="ok">{toast}</Banner>}

        <div style={card}>
          <h3 style={sectionH}>Default voice &amp; tone</h3>
          <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.8rem" }}>
            The house writing style for all briefing output. Applies everywhere unless a per-theme or
            per-case override is added later.
          </p>
          <label style={labelStyle}>Voice</label>
          <textarea
            style={{ ...inputStyle, minHeight: 200 }}
            value={voiceDefault}
            onChange={e => setVoiceDefault(e.target.value)}
            disabled={loading}
            placeholder="Describe the house voice…"
          />
        </div>

        <div style={{ ...card, opacity: 0.6 }}>
          <h3 style={sectionH}>External vs. internal voice <span style={{ fontSize: "0.7rem", fontWeight: 700, color: INK_60, border: `1px solid ${LINE}`, padding: "1px 6px", marginLeft: 6, verticalAlign: "middle" }}>COMING SOON</span></h3>
          <p style={{ fontSize: "0.8rem", color: INK_60 }}>
            Later you’ll be able to set a separate voice for public-facing content vs. internal-use
            briefings, and override the voice per theme or per case. The structure is already in place.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...btnPrimaryStyle, opacity: (loading || !dirty) ? 0.5 : 1 }}
            onClick={save} disabled={loading || !dirty}>
            {loading ? "Saving…" : "Save voice"}
          </button>
        </div>
      </div>
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
