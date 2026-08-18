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
  const [view, setView] = useState("people"); // people | orgs
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | claims | inquiries
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
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
      resetViewState();
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

  function resetViewState() {
    setView("people");
    setQuery("");
    setTypeFilter("all");
    setSort({ key: "date", dir: "desc" });
  }

  async function handleLogout() {
    await fetch("/api/partner/logout", { method: "POST" }).catch(() => {});
    setPartner(null);
    setData(null);
    resetViewState();
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

            <Section
              title="Referred leads"
              subtitle={`${(data.leads || []).length} to date · ${(data.leads || []).filter((l) => l.registered).length} registered claim${(data.leads || []).filter((l) => l.registered).length === 1 ? "" : "s"}`}
              error={data.peopleError}
              aside={<ViewToggle view={view} onChange={setView} />}
            >
              {data.dealsError && (
                <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#C03030", margin: "0 0 0.8rem" }}>
                  Claim details are temporarily unavailable — some leads may show as inquiries.
                </p>
              )}
              <LeadControls
                query={query} onQuery={setQuery}
                typeFilter={typeFilter} onTypeFilter={setTypeFilter}
              />
              {(() => {
                const shown = filterAndSortLeads(data.leads || [], query, typeFilter, sort);
                const empty = (data.leads || []).length
                  ? "No leads match your search."
                  : "No referred leads yet — they appear here as soon as someone uses your link.";
                return view === "people"
                  ? <FlatLeadsTable leads={shown} sort={sort} onSort={setSort} empty={empty} />
                  : <OrgGroupedTable leads={shown} sort={sort} onSort={setSort} empty={empty} />;
              })()}
            </Section>

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

function Section({ title, subtitle, error, aside, children }) {
  return (
    <div style={frostedCard}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem" }}>
        <h3 style={cardTitle}>{title}</h3>
        {aside}
      </div>
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

function ViewToggle({ view, onChange }) {
  const pill = (id, label) => (
    <button
      onClick={() => onChange(id)}
      aria-pressed={view === id}
      style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800,
        letterSpacing: "0.1em", textTransform: "uppercase",
        padding: "0.35rem 0.8rem", borderRadius: 999, cursor: "pointer",
        border: "1px solid rgba(10,10,10,0.25)",
        background: view === id ? INK : "transparent",
        color: view === id ? "#fff" : INK_60,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      {pill("people", "People")}
      {pill("orgs", "Organizations")}
    </div>
  );
}

function TypeCell({ lead }) {
  const badge = (bg, fg, label) => (
    <span style={{
      background: bg, color: fg, fontFamily: FONT, fontSize: "0.6rem",
      fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
      padding: "0.22rem 0.5rem", borderRadius: 3, display: "inline-block",
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
  if (!lead.registered) return badge("rgba(10,10,10,0.08)", INK_60, "Inquiry");
  const stage = STAGE_LABELS[lead.claimStage] || lead.claimStage;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", whiteSpace: "nowrap" }}>
      {badge(NEON, INK, lead.claimCount > 1 ? `Claims ×${lead.claimCount}` : "Claim")}
      {stage && <span style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, color: INK }}>{stage}</span>}
    </span>
  );
}

/* Client-side search / type-filter / sort — the full lead list is already
   loaded, so this is instant and costs no API calls. */
function filterAndSortLeads(leads, query, typeFilter, sort) {
  const q = query.trim().toLowerCase();
  const filtered = leads.filter((l) =>
    (typeFilter === "all" || (typeFilter === "claims" ? l.registered : !l.registered)) &&
    (!q || [l.name, l.email, l.company, l.source, l.comment]
      .some((v) => (v || "").toLowerCase().includes(q))));
  const dir = sort.dir === "asc" ? 1 : -1;
  const val = (l) => {
    if (sort.key === "date") return new Date(l.date || 0).getTime() || 0;
    if (sort.key === "type") return l.registered ? 1 : 0;
    return (l[sort.key] || "").toLowerCase();
  };
  return [...filtered].sort((a, b) => {
    const va = val(a); const vb = val(b);
    return va < vb ? -dir : va > vb ? dir : 0;
  });
}

function LeadControls({ query, onQuery, typeFilter, onTypeFilter }) {
  const pill = (id, label) => (
    <button
      key={id}
      onClick={() => onTypeFilter(id)}
      aria-pressed={typeFilter === id}
      style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800,
        letterSpacing: "0.1em", textTransform: "uppercase",
        padding: "0.35rem 0.8rem", borderRadius: 999, cursor: "pointer",
        border: "1px solid rgba(10,10,10,0.25)",
        background: typeFilter === id ? INK : "transparent",
        color: typeFilter === id ? "#fff" : INK_60,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.6rem", margin: "0 0 1rem" }}>
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search name, email, organization…"
        aria-label="Search leads"
        style={{
          fontFamily: FONT, fontSize: "0.88rem", color: INK,
          background: "#fff", border: "1px solid rgba(10,10,10,0.25)",
          borderRadius: 8, padding: "0.5rem 0.8rem",
          flex: "1 1 220px", maxWidth: 340,
        }}
      />
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {pill("all", "All")}
        {pill("claims", "Claims")}
        {pill("inquiries", "Inquiries")}
      </div>
    </div>
  );
}

function SortableTh({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th
      style={{ ...th, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      onClick={() => onSort({ key: sortKey, dir: active && sort.dir === "desc" ? "asc" : "desc" })}
    >
      {label}
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.25 }}>
        {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </th>
  );
}

const FLAT_COLUMNS = [
  { label: "Date", key: "date" },
  { label: "Name", key: "name" },
  { label: "Email", key: "email" },
  { label: "Organization", key: "company" },
  { label: "Type", key: "type" },
  { label: "Status", key: "comment" },
];

function FlatLeadsTable({ leads, sort, onSort, empty }) {
  if (!leads.length) {
    return <p style={{ fontFamily: FONT, fontSize: "0.97rem", color: INK_60, lineHeight: 1.65, margin: 0 }}>{empty}</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{FLAT_COLUMNS.map((c) => <SortableTh key={c.key} label={c.label} sortKey={c.key} sort={sort} onSort={onSort} />)}</tr>
        </thead>
        <tbody>
          {leads.map((l, i) => (
            <tr key={i}>
              <td style={td}>{fmtDate(l.date)}</td>
              <td style={td}>{l.name || "—"}</td>
              <td style={td}>{l.email || "—"}</td>
              <td style={td}>{l.company || "—"}</td>
              <td style={td}><TypeCell lead={l} /></td>
              <td style={td}>{l.comment || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NO_ORG_LABEL = "Individuals";

/* Group referred leads by organization. Keys are prefixed so a company
   that happens to be NAMED "Individuals" can't collide with the no-org
   bucket; groups are ordered by their most recent submission (max date
   across members — API order is created_at, which can differ), with the
   no-org bucket pinned last. */
function groupByCompany(leads) {
  const groups = new Map();
  for (const l of leads) {
    const key = l.company ? `org:${l.company}` : "none";
    if (!groups.has(key)) groups.set(key, { label: l.company || NO_ORG_LABEL, isOrg: !!l.company, members: [] });
    groups.get(key).members.push(l);
  }
  const maxDate = (g) => Math.max(...g.members.map((m) => new Date(m.date || 0).getTime() || 0));
  return [...groups.values()].sort((a, b) => {
    if (!a.isOrg) return 1;
    if (!b.isOrg) return -1;
    return maxDate(b) - maxDate(a);
  });
}

function OrgGroupedTable({ leads, sort, onSort, empty }) {
  if (!leads.length) {
    return <p style={{ fontFamily: FONT, fontSize: "0.97rem", color: INK_60, lineHeight: 1.65, margin: 0 }}>{empty}</p>;
  }
  const groups = groupByCompany(leads);
  const columns = [
    { label: "Date", key: "date" },
    { label: "Name", key: "name" },
    { label: "Email", key: "email" },
    { label: "Type", key: "type" },
    { label: "Status", key: "comment" },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{columns.map((c) => <SortableTh key={c.key} label={c.label} sortKey={c.key} sort={sort} onSort={onSort} />)}</tr>
        </thead>
        <tbody>
          {groups.map(({ label, isOrg, members }) => (
            <React.Fragment key={(isOrg ? "org:" : "none:") + label}>
              <tr>
                <td colSpan={columns.length} style={{
                  fontFamily: FONT, fontWeight: 800, fontSize: "0.85rem", color: INK,
                  letterSpacing: "0.04em", padding: "0.9rem 0.75rem 0.4rem",
                  borderBottom: "1px solid rgba(10,10,10,0.18)",
                }}>
                  {label}
                  <span style={{ fontWeight: 600, color: INK_60, marginLeft: "0.6rem", fontSize: "0.78rem" }}>
                    {members.length} contact{members.length === 1 ? "" : "s"}
                  </span>
                </td>
              </tr>
              {members.map((p, i) => (
                <tr key={i}>
                  <td style={td}>{fmtDate(p.date)}</td>
                  <td style={td}>{p.name || "—"}</td>
                  <td style={td}>{p.email || "—"}</td>
                  <td style={td}><TypeCell lead={p} /></td>
                  <td style={td}>{p.comment || "—"}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
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
