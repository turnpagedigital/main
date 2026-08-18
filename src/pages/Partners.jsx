import React, { useEffect, useState } from "react";
import { NEON, FONT, INK, INK_60 } from "../data/tokens.js";
import { sectionBackground } from "../lib/section-background.js";

/* Referral partner portal (/partners). Unlisted page — partners get the URL
   directly. Login is a single access key (no username); sessions are
   HMAC cookies scoped to /api/partner. English-only by design, like the
   admin panel.

   Visual language mirrors the home "Our Services" section: the Czerwinski
   ripple background with a light overlay, uppercase eyebrow, big title with
   the neon accent-light highlight, and frosted white cards. */

const BG_IMAGE = "/pawel-czerwinski-T5VUBvCYqKk-unsplash.jpg";

const frostedCard = {
  background: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(10,10,10,0.08)",
  borderRadius: 12,
  boxShadow: "0 8px 30px rgba(10,10,10,0.06)",
  padding: "clamp(1.5rem, 2.5vw, 2.2rem)",
};
const cardTitle = {
  fontFamily: FONT, fontWeight: 800,
  fontSize: "clamp(1.3rem, 2vw, 1.7rem)",
  letterSpacing: "-0.015em", lineHeight: 1.1,
  color: INK, margin: 0,
};
const divider = { height: 1, background: "rgba(0,0,0,0.18)", margin: "1.1rem 0" };
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
const linkBtn = {
  fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700,
  background: "none", border: "none", color: INK_60,
  cursor: "pointer", textDecoration: "underline", padding: 0,
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
    <section style={{
      background: sectionBackground(BG_IMAGE, "light", 15),
      minHeight: "100vh",
      padding: "clamp(7.5rem, 14vw, 10rem) clamp(1.5rem, 5vw, 4rem) clamp(3.5rem, 8vw, 8rem)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header — mirrors the Services section */}
        <div style={{ marginBottom: "clamp(2.5rem, 5vw, 4rem)" }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: INK_60, marginBottom: "1.1rem",
          }}>Partner Program</p>
          <h1 style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "clamp(1.8rem, 3.8vw, 3.4rem)",
            lineHeight: 1.02, letterSpacing: "-0.035em",
            color: INK, margin: 0,
          }}>
            Referral <span className="accent-light">Portal.</span>
          </h1>
        </div>

        {phase === "checking" && (
          <p style={{ fontFamily: FONT, color: INK_60 }}>Checking session…</p>
        )}

        {phase === "login" && (
          <form onSubmit={handleLogin} style={{ ...frostedCard, maxWidth: 460 }} className="field-light">
            <h2 style={cardTitle}>Partner sign-in</h2>
            <div style={divider} />
            <p style={{ fontFamily: FONT, fontSize: "0.97rem", color: INK_60, lineHeight: 1.65, margin: "0 0 1.2rem" }}>
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
          <p style={{ fontFamily: FONT, color: INK_60 }}>Loading your report…</p>
        )}

        {phase === "ready" && data && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.4rem" }}>
              <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1.35rem", color: INK, margin: 0 }}>
                {partner?.name}
                <span style={{ background: NEON, color: INK, fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", padding: "0.25rem 0.6rem", borderRadius: 3, marginLeft: "0.7rem", verticalAlign: "middle" }}>
                  Partner
                </span>
              </h2>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={loadLeads} style={linkBtn}>Refresh</button>
                <button onClick={handleLogout} style={linkBtn}>Sign out</button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "clamp(1rem, 2vw, 1.5rem)" }}>
              <Section
                title="Registrations"
                subtitle={`${(data.deals || []).length} to date`}
                error={data.dealsError}
              >
                <LeadsTable
                  columns={["Date", "Registration", "Status"]}
                  rows={(data.deals || []).map((d) => [fmtDate(d.date), d.name || "—", STAGE_LABELS[d.stage] || d.stage || "—"])}
                  empty="No registrations yet."
                />
              </Section>

              <Section
                title="Referred contacts"
                subtitle={`${(data.people || []).length} to date`}
                error={data.peopleError}
              >
                <LeadsTable
                  columns={["Date", "Name", "Email", "Source", "Status"]}
                  rows={(data.people || []).map((p) => [fmtDate(p.date), p.name || "—", p.email || "—", p.source || "—", p.comment || "—"])}
                  empty="No referred contacts yet — leads appear here as soon as someone uses your link."
                />
              </Section>
            </div>

            <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: INK_60, marginTop: "1.5rem" }}>
              Live from our CRM · generated {new Date(data.generatedAt).toLocaleString()} · your referral link:{" "}
              <code style={{ background: "rgba(255,255,255,0.85)", padding: "0.1rem 0.4rem", borderRadius: 3 }}>
                https://turnpagedigital.com/{partner?.code}
              </code>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Section({ title, subtitle, error, children }) {
  return (
    <div style={frostedCard}>
      <h3 style={cardTitle}>{title}</h3>
      <div style={divider} />
      {subtitle && (
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.08rem", color: INK, lineHeight: 1.4, margin: "0 0 1.1rem" }}>
          {subtitle}
        </p>
      )}
      {error
        ? <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "#C03030", margin: 0 }}>{error}</p>
        : children}
    </div>
  );
}

function LeadsTable({ columns, rows, empty }) {
  if (!rows.length) {
    return <p style={{ fontFamily: FONT, fontSize: "0.97rem", color: INK_60, lineHeight: 1.65, margin: 0 }}>{empty}</p>;
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
