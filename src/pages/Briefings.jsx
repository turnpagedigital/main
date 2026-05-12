import React, { useEffect, useState } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../data/tokens.js";
import { hashHref } from "../lib/router.js";
import Hero from "../components/Hero.jsx";
import BottomCTA from "../components/BottomCTA.jsx";

export default function Briefings() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/briefings/index.json")
      .then(r => {
        if (!r.ok) throw new Error("Failed to load briefings");
        return r.json();
      })
      .then(d => {
        const list = Array.isArray(d) ? d : (d.items || []);
        // Newest first
        list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        setItems(list);
      })
      .catch(e => setError(e.message || "Failed to load briefings"));
  }, []);

  return (
    <>
      <Hero
        eyebrow="Briefings"
        title="Analysis from the AI copyright"
        accentTitle="frontier."
        subtitle="Daily-grade analysis on the cases, settlements, and rulings shaping the AI copyright landscape — written for rights holders, counsel, and dealmakers."
      />

      <section className="surface-paper section-pad">
        <div className="container" style={{ maxWidth: 920 }}>
          {error && <Empty msg={"We couldn't load the briefings library: " + error} />}
          {!error && items === null && <Empty msg="Loading briefings…" />}
          {!error && items && items.length === 0 && <Empty msg="No briefings published yet." />}
          {!error && items && items.length > 0 && (
            <>
              {/* Featured (first/newest) */}
              <FeaturedBriefing item={items[0]} />
              {items.length > 1 && (
                <div style={{
                  marginTop: "2rem",
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }} className="briefing-grid">
                  {items.slice(1).map(item => <BriefingCard key={item.slug} item={item} />)}
                </div>
              )}
              <style>{`
                @media (max-width: 720px) {
                  .briefing-grid { grid-template-columns: 1fr !important; }
                }
              `}</style>
            </>
          )}
        </div>
      </section>

      <BottomCTA
        eyebrow="Subscribe"
        title="Want these by email?"
        accent="Just ask."
        kicker="We send the most important briefings directly to counterparties and counsel. Reach out to be added."
        primary={{ label: "Get in Touch", href: hashHref("contact") + "?source=briefings" }}
        secondary={null}
      />
    </>
  );
}

function FeaturedBriefing({ item }) {
  const dateStr = item.date ? formatDate(item.date) : "";
  return (
    <a
      href={hashHref("briefings/" + item.slug)}
      style={{
        display: "block", background: "#0A0A0A", color: "#fff",
        border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18,
        padding: "clamp(1.8rem, 3vw, 2.6rem)",
        position: "relative", overflow: "hidden",
        transition: "transform 0.25s, box-shadow 0.25s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(10,10,10,0.18)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(60% 70% at 100% 0%, rgba(212,255,0,0.10), transparent 60%)",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "1.2rem" }}>
          <span style={{
            fontFamily: FONT, fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "#000", background: NEON,
            padding: "0.32rem 0.7rem", borderRadius: 4,
          }}>
            Latest
          </span>
          <span style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}>
            {dateStr}
          </span>
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)", fontWeight: 800,
          color: "#fff", lineHeight: 1.15, letterSpacing: "-0.02em",
          marginBottom: "1rem", maxWidth: 800,
        }}>
          {item.title}
        </h2>
        {item.summary && (
          <p style={{
            fontFamily: FONT, fontSize: "1.05rem", color: "rgba(255,255,255,0.78)",
            lineHeight: 1.65, marginBottom: "1.4rem", maxWidth: 720,
          }}>
            {item.summary}
          </p>
        )}
        <span style={{
          fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700,
          color: NEON, letterSpacing: "0.02em",
        }}>
          Read the briefing →
        </span>
      </div>
    </a>
  );
}

function BriefingCard({ item }) {
  const dateStr = item.date ? formatDate(item.date) : "";
  return (
    <a
      href={hashHref("briefings/" + item.slug)}
      className="card-light card-light-link"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.18em",
        textTransform: "uppercase", color: INK_60, marginBottom: "0.6rem",
      }}>
        {dateStr}
      </p>
      <h3 style={{
        fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, color: INK,
        lineHeight: 1.25, marginBottom: "0.7rem", letterSpacing: "-0.01em",
      }}>
        {item.title}
      </h3>
      {item.summary && (
        <p style={{
          fontFamily: FONT, fontSize: "0.95rem", color: INK_60,
          lineHeight: 1.6, marginBottom: "1rem", flex: 1,
        }}>
          {item.summary}
        </p>
      )}
      <span style={{
        fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700,
        color: INK, letterSpacing: "0.02em", marginTop: "auto",
      }}>
        Read briefing →
      </span>
    </a>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <p style={{ fontFamily: FONT, fontSize: "1rem", color: INK_60 }}>
        {msg}
      </p>
    </div>
  );
}

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return months[parseInt(m[2], 10) - 1] + " " + parseInt(m[3], 10) + ", " + m[1];
}
