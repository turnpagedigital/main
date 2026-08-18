import React, { useEffect, useState } from "react";
import { NEON, FONT, INK, INK_60, PAPER } from "../data/tokens.js";
import Hero from "../components/Hero.jsx";

/* Referral partner portal (/partners). Unlisted page — partners get the URL
   directly. Login is a single access key (no username); sessions are
   HMAC cookies scoped to /api/partner. English-only by design, like the
   admin panel. */

const wrap = { maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem 5rem" };
const card = {
  background: "#fff", border: "1px solid rgba(10,10,10,0.12)",
  borderRadius: 10, padding: "2rem",
};
const th = {
  fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800, color: INK_60,
  letterSpacing: "0.14em", textTransform: "uppercase",
  textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: `2px solid ${INK}`,
};
const td = {
  fontFamily: FONT, fontSize: "0.9rem", color: INK,
  padding: "0.55rem 0.75rem", borderBottom: "1px solid rgba(10,10,10,0.1)",
  verticalAlign: "top",
};

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* Deal pipeline stages translated to partner-friendly wording. */
const STAGE_LABELS = {
  "Lead": "Received",
  "Prospect": "In review",
  "On Hold": "On hold",
  "Engaged_Soliciting": "In progress",
  "Confirmed": "Confirmed",
  "Signed_Performing": "Signed",
  "Closed_Invoiced": "Closing",
  "Closed_Paid": "Completed",
  "Closed_Testimonial": "Completed",
  "Lost": "Not completed",
  "Pass": "Not pursued",
};

export default function Partners() {
  const [phase, setPhase] = useState("checking"); // checking | login | loading | ready
  const [partner, setPartner] = useState(null);
  const [data, setData] = useState(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  async function loadLeads() {
    setPhase("loading");
    try {
      const res = await fetch("/api/partner/leads");
      if (!res.ok) throw new Error(res.status === 401 ? "Session expired — sign in again." : "Could not load your report.");
      const body = await res.json();
      setData(body);
      setPartner(body.partner);
      setPhase("ready");
    } catch (err) {
      setError(err.message);
      setPhase("login");
    }
  }

  useEffect(() => {
    fetch("/api/partner/session")
      .then((res) => (res.ok ? loadLeads() : setPhase("login")))
      .catch(() => setPhase("login"));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/partner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Sign-in failed.");
      setKey("");
      await loadLeads();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    await fetch("/api/partner/logout", { method: "POST" }).catch(() => {});
    setPartner(null);
    setData(null);
    setPhase("login");
  }

  return (
    <div style={{ background: PAPER, minHeight: "60vh" }}>
      <Hero
        eyebrow="Turnpage Digital Markets"
        title="Referral Partner"
        accentTitle="Portal"
        subtitle="A live view of every lead your referral link has sent us."
      />
      <div style={wrap}>
        {phase === "checking" && (
          <p style={{ fontFamily: FONT, color: INK_60, textAlign: "center" }}>Checking session…</p>
        )}

        {phase === "login" && (
          <form onSubmit={handleLogin} style={{ ...card, maxWidth: 440, margin: "0 auto" }} className="field-light">
            <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1.2rem", color: INK, marginBottom: "0.4rem" }}>
              Partner sign-in
            </h2>
            <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: INK_60, marginBottom: "1.2rem" }}>
              Enter the access key Turnpage provided. Lost it? Email{" "}
              <a href="mailto:info@turnpagedigital.com" style={{ color: INK }}>info@turnpagedigital.com</a>.
            </p>
            <label htmlFor="partner-key" style={{ fontFamily: FONT }}>Access key</label>
            <input
              id="partner-key" type="password" value={key} autoComplete="off"
              onChange={(e) => setKey(e.target.value)} required
            />
            {error && (
              <p role="alert" style={{ fontFamily: FONT, fontSize: "0.88rem", color: "#C03030", margin: "0.6rem 0 0" }}>{error}</p>
            )}
            <button type="submit" className="btn-neon" style={{ display: "block", width: "100%", marginTop: "1.2rem" }}>
              Sign in
            </button>
          </form>
        )}

        {phase === "loading" && (
          <p style={{ fontFamily: FONT, color: INK_60, textAlign: "center" }}>Loading your report…</p>
        )}

        {phase === "ready" && data && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.4rem" }}>
              <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1.35rem", color: INK }}>
                {partner?.name}
                <span style={{ background: NEON, color: INK, fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", padding: "0.25rem 0.6rem", borderRadius: 3, marginLeft: "0.7rem", verticalAlign: "middle" }}>
                  Partner
                </span>
              </h2>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={loadLeads} style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, background: "none", border: "none", color: INK_60, cursor: "pointer", textDecoration: "underline" }}>
                  Refresh
                </button>
                <button onClick={handleLogout} style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, background: "none", border: "none", color: INK_60, cursor: "pointer", textDecoration: "underline" }}>
                  Sign out
                </button>
              </div>
            </div>

            <Section title={`Registrations (${(data.deals || []).length})`} error={data.dealsError}>
              <LeadsTable
                columns={["Date", "Registration", "Status"]}
                rows={(data.deals || []).map((d) => [fmtDate(d.date), d.name || "—", STAGE_LABELS[d.stage] || d.stage || "—"])}
                empty="No registrations yet."
              />
            </Section>

            <Section title={`Referred contacts (${(data.people || []).length})`} error={data.peopleError}>
              <LeadsTable
                columns={["Date", "Name", "Email"]}
                rows={(data.people || []).map((p) => [fmtDate(p.date), p.name || "—", p.email || "—"])}
                empty="No referred contacts yet — leads appear here as soon as someone uses your link."
              />
            </Section>

            <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: INK_60, marginTop: "1.5rem" }}>
              Live from our CRM · generated {new Date(data.generatedAt).toLocaleString()} · your referral link:{" "}
              <code style={{ background: "#fff", padding: "0.1rem 0.4rem", borderRadius: 3 }}>
                https://turnpagedigital.com/?ref={partner?.code}
              </code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, error, children }) {
  return (
    <div style={{ ...card, marginBottom: "1.5rem", padding: "1.5rem" }}>
      <h3 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1rem", color: INK, marginBottom: "0.9rem" }}>{title}</h3>
      {error
        ? <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "#C03030" }}>{error}</p>
        : children}
    </div>
  );
}

function LeadsTable({ columns, rows, empty }) {
  if (!rows.length) {
    return <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: INK_60 }}>{empty}</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{columns.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>{cells.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
