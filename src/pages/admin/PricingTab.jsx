import React from "react";
import { FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnPrimaryStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";
import { useTabData } from "./useTabData.js";

/* PricingTab — the PRIVATE inputs behind the Bartz author offer.
 *
 * Stored server-side (functions/api/_pricing-config.json via /api/admin/pricing)
 * and never shipped to the public site. The registration flow fetches the
 * finished price from /api/quote; visitors never see these numbers.
 *
 *   offer = (payoutRatePct / 100) × (selfRecovery × selfWorks
 *                                    + publisherRecovery × publisherWorks)
 */

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const withCommas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const FIELDS = [
  {
    key: "selfRecovery",
    label: "Expected recovery per self-published work",
    prefix: "$", suffix: "",
    help: "What a self-published author is expected to recover from the settlement, per work.",
  },
  {
    key: "publisherRecovery",
    label: "Expected recovery per work with a publisher",
    prefix: "$", suffix: "",
    help: "The author's expected recovery per work that was released through a publisher (their share of the 50/50 split).",
  },
  {
    key: "payoutRatePct",
    label: "Rate paid to the author",
    prefix: "", suffix: "%", max: "100",
    help: "The percentage of expected recovery Turnpage pays the author now.",
  },
  {
    key: "volumePremiumPct",
    label: "Volume premium",
    prefix: "", suffix: "%",
    help: "Extra percentage added to the whole offer when the author has more eligible works than the threshold below. Set to 0 for no premium.",
  },
  {
    key: "volumePremiumThreshold",
    label: "Premium applies above",
    prefix: "", suffix: "works",
    help: "The offer gets the premium when the number of eligible works (self-published + publisher) is greater than this number.",
  },
];

export default function PricingTab({ onDirtyChange }) {
  const { data, setData, phase, error, dirty, lastSavedAt, save, load, conflict } = useTabData({
    endpoint: "/api/admin/pricing",
    parse: (body) => ({
      selfRecovery: num(body.data.selfRecovery),
      publisherRecovery: num(body.data.publisherRecovery),
      payoutRatePct: num(body.data.payoutRatePct),
      volumePremiumThreshold: num(body.data.volumePremiumThreshold),
      volumePremiumPct: num(body.data.volumePremiumPct),
    }),
    serialize: (d) => ({
      selfRecovery: num(d.selfRecovery),
      publisherRecovery: num(d.publisherRecovery),
      payoutRatePct: num(d.payoutRatePct),
      volumePremiumThreshold: num(d.volumePremiumThreshold),
      volumePremiumPct: num(d.volumePremiumPct),
    }),
    onDirtyChange,
  });

  if (phase === "loading" && !data) return <CenteredMessage>Loading pricing…</CenteredMessage>;
  if (phase === "error" && !data) return <CenteredMessage>Couldn't load: {error}</CenteredMessage>;
  if (!data) return null;

  const set = (key, v) => setData({ ...data, [key]: v });

  // Live example so it's clear what the numbers do (3 self + 2 publisher = 5 eligible works).
  const rate = num(data.payoutRatePct) / 100;
  const exSelf = 3, exPub = 2, exEligible = exSelf + exPub;
  const base = rate * (num(data.selfRecovery) * exSelf + num(data.publisherRecovery) * exPub);
  const premiumPct = num(data.volumePremiumPct);
  const threshold = num(data.volumePremiumThreshold);
  const premiumApplies = premiumPct > 0 && exEligible > threshold;
  const example = Math.max(0, Math.round(premiumApplies ? base * (1 + premiumPct / 100) : base));

  return (
    <div style={{ fontFamily: FONT, maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>
      <div style={{ maxWidth: 620 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: "0.4rem" }}>
        <p style={{ fontSize: "0.85rem", color: INK_60, maxWidth: 460, margin: 0 }}>
          The private inputs behind the Bartz author estimate. These are stored on the server and{" "}
          <strong>never shown on the public site</strong> — visitors only ever see the finished offer.
        </p>
        {lastSavedAt && <span style={{ fontSize: "0.75rem", color: INK_60 }}>Saved {formatTime(lastSavedAt)}</span>}
      </div>

      <p style={{ fontSize: "0.72rem", color: "#2D8E47", fontWeight: 700, margin: "0 0 1.2rem" }}>
        🔒 Login-only — safe to change as often as you like. Saves like other admin content: it goes live with your next deploy.
      </p>

      {error && data && <ErrorBanner message={error} action={conflict ? { label: "Load latest version", onClick: load } : undefined} />}

      {FIELDS.map((f) => (
        <div key={f.key} style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: INK, marginBottom: 4 }}>
            {f.label}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: 240 }}>
            {f.prefix && <span style={{ fontSize: "1rem", color: INK_60 }}>{f.prefix}</span>}
            <input
              style={{ ...inputStyle, fontSize: "1rem" }}
              type="number" min="0" step="any"
              max={f.max}
              value={data[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
            {f.suffix && <span style={{ fontSize: "1rem", color: INK_60 }}>{f.suffix}</span>}
          </div>
          <p style={{ fontSize: "0.78rem", color: INK_60, margin: "4px 0 0", lineHeight: 1.5 }}>{f.help}</p>
        </div>
      ))}

      <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "0.9rem 1.1rem", background: "#F9FAFB", marginBottom: "1.2rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: INK_60, margin: "0 0 4px" }}>
          Example offer
        </p>
        <p style={{ fontSize: "0.9rem", color: INK, margin: 0, lineHeight: 1.5 }}>
          An author with <strong>3 self-published</strong> + <strong>2 publisher</strong> works would be offered{" "}
          <strong style={{ color: INK }}>${withCommas(example)}</strong>
          {premiumApplies ? ` (includes the ${premiumPct}% volume premium)` : ""}.
        </p>
        {premiumPct > 0 && !premiumApplies && (
          <p style={{ fontSize: "0.8rem", color: INK_60, margin: "4px 0 0", lineHeight: 1.5 }}>
            The {premiumPct}% premium applies once eligible works exceed {threshold}.
          </p>
        )}
      </div>

      <button
        style={{ ...btnPrimaryStyle, opacity: dirty ? 1 : 0.5 }}
        disabled={!dirty || phase === "saving"}
        onClick={save}
      >
        {phase === "saving" ? "Saving…" : "Save pricing"}
      </button>
      </div>
    </div>
  );
}
