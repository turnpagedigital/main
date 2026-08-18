import React, { useState } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import {
  inputStyle, selectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle,
  formatTime, CenteredMessage, ErrorBanner, Modal, ConfirmDialog,
  cardStyle, labelStyle,
} from "./shared.jsx";
import { useTabData } from "./useTabData.js";

/* ReferralPartnersTab — manage referral partners + their portal access keys.

   Keys are generated HERE in the browser: 24 random bytes → hex plaintext,
   SHA-256 hex stored as portalKeyHash. The plaintext is shown exactly once
   (copy it into the partner's hands); only the hash is ever saved. Resetting
   a key replaces the hash, which also invalidates the partner's existing
   portal sessions (the session signature binds to the hash).

   IMPORTANT operational note surfaced in the UI: this file is read at BUILD
   time by the site + functions, so changes (including key resets) take
   effect on the next production deploy, not instantly. */

function sanitizePartner(p) {
  return {
    code: typeof p.code === "string" ? p.code : "",
    name: typeof p.name === "string" ? p.name : "",
    attio: {
      object: p.attio && p.attio.object === "people" ? "people" : "companies",
      record_id: (p.attio && p.attio.record_id) || "",
    },
    portalKeyHash: typeof p.portalKeyHash === "string" ? p.portalKeyHash : "",
    active: p.active !== false,
    aliases: Array.isArray(p.aliases) ? p.aliases : [],
  };
}

function blankPartner() {
  return sanitizePartner({ active: true });
}

function randomHex(bytes) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ReferralPartnersTab({ onDirtyChange }) {
  const {
    data: partners, setData: setPartners,
    phase, error, dirty, lastSavedAt, load, save,
  } = useTabData({
    endpoint: "/api/admin/referral-partners",
    parse: (body) => ((body.data && body.data.partners) || []).map(sanitizePartner),
    serialize: (items) => ({
      partners: items.map((p) => ({
        ...p,
        aliases: p.aliases.filter(Boolean),
      })),
    }),
    onDirtyChange,
  });

  const [newKey, setNewKey] = useState(null); // { name, plaintext } — shown once
  const [confirmReset, setConfirmReset] = useState(null); // index pending reset
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copied, setCopied] = useState(false);

  if (phase === "loading") return <CenteredMessage>Loading partners…</CenteredMessage>;
  if (phase === "error" && partners === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (partners === null) return null;

  function update(i, patch) {
    const next = partners.slice();
    next[i] = { ...next[i], ...patch };
    setPartners(next);
  }

  async function generateKey(i) {
    const plaintext = randomHex(24);
    const hash = await sha256Hex(plaintext);
    update(i, { portalKeyHash: hash });
    setCopied(false);
    setNewKey({ name: partners[i].name || partners[i].code || "partner", plaintext });
  }

  return (
    <div>
      <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: INK_60, margin: "0 0 1.2rem", lineHeight: 1.6 }}>
        Referral partners get a vanity link (turnpagedigital.com/<b>code</b>) and portal access at /partners.
        Keys are shown <b>once</b> when generated — only a fingerprint is stored.{" "}
        <b>Changes here (including key resets) go live on the next production deploy.</b>
      </p>

      {partners.map((p, i) => (
        <div key={i} style={{ ...cardStyle, marginBottom: "1rem", opacity: p.active ? 1 : 0.6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 180px" }}>
              <label style={labelStyle}>Partner name</label>
              <input style={inputStyle} value={p.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Pari Passu" />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label style={labelStyle}>Code (their link)</label>
              <input style={inputStyle} value={p.code}
                onChange={(e) => update(i, { code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="pari-passu" />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={labelStyle}>Aliases (comma-separated)</label>
              <input style={inputStyle} value={p.aliases.join(", ")}
                onChange={(e) => update(i, { aliases: e.target.value.split(",").map((a) => a.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")) })}
                placeholder="paripassu" />
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginTop: "0.9rem" }}>
            <div style={{ flex: "0 0 140px" }}>
              <label style={labelStyle}>Attio record type</label>
              <select style={selectStyle} value={p.attio.object}
                onChange={(e) => update(i, { attio: { ...p.attio, object: e.target.value } })}>
                <option value="companies">Company</option>
                <option value="people">Person</option>
              </select>
            </div>
            <div style={{ flex: "1 1 280px" }}>
              <label style={labelStyle}>Attio record ID (from the record's URL)</label>
              <input style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.78rem" }} value={p.attio.record_id}
                onChange={(e) => update(i, { attio: { ...p.attio, record_id: e.target.value.trim() } })}
                placeholder="8dcefad1-08e1-499a-85d9-68dff9ab9cce" />
            </div>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.55rem", cursor: "pointer" }}>
              <input type="checkbox" checked={p.active} onChange={(e) => update(i, { active: e.target.checked })} />
              Active
            </label>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", alignItems: "center", marginTop: "1rem", paddingTop: "0.9rem", borderTop: `1px solid ${LINE}` }}>
            <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: p.portalKeyHash ? INK : "#c44" }}>
              {p.portalKeyHash ? "✓ Portal key set" : "✕ No portal key — partner can't sign in"}
            </span>
            <button
              style={btnStyle}
              onClick={() => (p.portalKeyHash ? setConfirmReset(i) : generateKey(i))}
            >
              {p.portalKeyHash ? "Reset key…" : "Generate key"}
            </button>
            <span style={{ flex: 1 }} />
            <button style={{ ...iconBtnStyle, color: "#c44" }} title="Remove partner" onClick={() => setConfirmDelete(i)}>✕ Remove</button>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", marginTop: "1rem" }}>
        <button style={btnStyle} onClick={() => setPartners([...partners, blankPartner()])}>+ Add partner</button>
        <span style={{ flex: 1 }} />
        {lastSavedAt && <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: INK_60 }}>Saved {formatTime(lastSavedAt)}</span>}
        <button
          style={{ ...btnPrimaryStyle, opacity: dirty && phase !== "saving" ? 1 : 0.5 }}
          disabled={!dirty || phase === "saving"}
          onClick={save}
        >
          {phase === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
      {error && partners !== null && <ErrorBanner message={error} />}

      {newKey && (
        <Modal onClose={() => setNewKey(null)}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.8rem", color: INK }}>
            New access key for {newKey.name}
          </h3>
          <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: INK_60, lineHeight: 1.6, marginBottom: "0.8rem" }}>
            Copy this now and send it to the partner — <b>it will not be shown again</b> (only a
            fingerprint is stored). It starts working after the next production deploy.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <code style={{ background: "#f4f4f4", border: `1px solid ${LINE}`, borderRadius: 4, padding: "0.55rem 0.7rem", fontSize: "0.78rem", wordBreak: "break-all", flex: 1 }}>
              {newKey.plaintext}
            </code>
            <button
              style={btnPrimaryStyle}
              onClick={() => { navigator.clipboard.writeText(newKey.plaintext).then(() => setCopied(true)).catch(() => {}); }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <div style={{ marginTop: "1rem", textAlign: "right" }}>
            <button style={btnStyle} onClick={() => setNewKey(null)}>Done</button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirmReset !== null}
        title="Reset this partner's key?"
        message="Their current key stops working on the next production deploy and any signed-in portal sessions end. You'll get a new key to send them."
        confirmLabel="Reset key"
        onConfirm={() => { const i = confirmReset; setConfirmReset(null); generateKey(i); }}
        onCancel={() => setConfirmReset(null)}
      />
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remove this partner?"
        message="Their vanity link, referral tracking, and portal access all stop on the next production deploy. CRM history in Attio is untouched. (Consider unchecking Active instead — that keeps the row for later.)"
        confirmLabel="Remove partner"
        onConfirm={() => { setPartners(partners.filter((_, j) => j !== confirmDelete)); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
