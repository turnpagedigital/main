import React, { useState, useEffect } from "react";
import { NEON, INK, INK_60, LINE } from "../../data/tokens.js";
import { btnStyle } from "./shared.jsx";

/**
 * RollbackButton — Dropdown to select and rollback to a previous commit.
 *
 * Props:
 *   deployState — "idle" | "done" | "error" (shared with deploy buttons for UI sync)
 *   deployMsg — Status message to display
 *   onRollbackStart — Callback when rollback begins
 *   onRollbackDone — Callback when rollback completes
 */
export default function RollbackButton({ deployState, deployMsg: _deployMsg, onRollbackStart, onRollbackDone }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [commits, setCommits] = useState([]);
  const [expandedCommits, setExpandedCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("dev");
  const [confirmState, setConfirmState] = useState(null); // { sha, message, branch }

  // Fetch commit history when dropdown opens
  useEffect(() => {
    if (dropdownOpen && !commits.length) {
      fetchCommits("dev", 3);
    }
  }, [dropdownOpen, commits.length]);

  // Fetch expanded list when "More..." is clicked
  async function handleShowMore() {
    setExpandedOpen(true);
    if (!expandedCommits.length) {
      await fetchCommits(selectedBranch, 20);
    }
  }

  async function fetchCommits(branch, limit) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rollback?branch=${branch}&limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch commits");
      const data = await res.json();
      if (limit === 3) {
        setCommits(data.commits || []);
      } else {
        setExpandedCommits(data.commits || []);
      }
    } catch (e) {
      console.error("Fetch commits error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRollback() {
    if (!confirmState) return;
    onRollbackStart?.();

    try {
      const res = await fetch("/api/admin/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          branch: confirmState.branch,
          commitSha: confirmState.sha,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rollback failed");

      // Success
      onRollbackDone?.(data);
      setConfirmState(null);
      setDropdownOpen(false);
      setExpandedOpen(false);
      setCommits([]);
      setExpandedCommits([]);
    } catch (e) {
      alert(`Rollback failed: ${e.message}`);
    }
  }

  const displayCommits = expandedOpen ? expandedCommits : commits;
  const isRollingBack = deployState === "deploying"; // Reuse deploy state for UI

  return (
    <div style={{ position: "relative" }}>
      {/* Button */}
      <button
        disabled={isRollingBack || deployState === "deploying"}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          ...btnStyle,
          fontSize: "0.78rem",
          fontWeight: 700,
          opacity: isRollingBack ? 0.5 : 1,
          cursor: isRollingBack ? "default" : "pointer",
        }}
        title="Rollback to a previous commit"
      >
        {isRollingBack ? "Rolling back…" : "↻ Rollback"}
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.25rem",
            background: "#fff",
            border: `1px solid ${LINE}`,
            borderRadius: "0.4rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 100,
            minWidth: "280px",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {/* Header with branch selector */}
          <div
            style={{
              padding: "0.75rem",
              borderBottom: `1px solid ${LINE}`,
              background: "#f9f9f9",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: INK_60,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Rollback to:
          </div>

          {/* Branch selector */}
          <div
            style={{
              padding: "0.5rem 0.75rem",
              borderBottom: `1px solid ${LINE}`,
              display: "flex",
              gap: "0.5rem",
              fontSize: "0.78rem",
            }}
          >
            {["dev", "main"].map((b) => (
              <label key={b} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="rollback-branch"
                  value={b}
                  checked={selectedBranch === b}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setCommits([]);
                    setExpandedCommits([]);
                    fetchCommits(e.target.value, 3);
                  }}
                  style={{ cursor: "pointer" }}
                />
                {b === "dev" ? "Preview (dev)" : "Production (main)"}
              </label>
            ))}
          </div>

          {/* Commits list */}
          {loading ? (
            <div style={{ padding: "1rem", textAlign: "center", fontSize: "0.8rem", color: INK_60 }}>
              Loading…
            </div>
          ) : displayCommits.length === 0 ? (
            <div style={{ padding: "1rem", textAlign: "center", fontSize: "0.8rem", color: INK_60 }}>
              No commits found
            </div>
          ) : (
            <>
              {displayCommits.map((commit, idx) => (
                <CommitRow
                  key={commit.sha}
                  commit={commit}
                  branch={selectedBranch}
                  onSelect={() => setConfirmState({ sha: commit.sha, message: commit.message, branch: selectedBranch })}
                  idx={idx}
                />
              ))}

              {/* "More..." button if showing initial 3 */}
              {!expandedOpen && commits.length >= 3 && (
                <button
                  onClick={handleShowMore}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    border: "none",
                    background: "#f9f9f9",
                    borderTop: `1px solid ${LINE}`,
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    color: INK_60,
                    fontWeight: 500,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#f0f0f0")}
                  onMouseLeave={(e) => (e.target.style.background = "#f9f9f9")}
                >
                  View more (up to 20)…
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmState && (
        <ConfirmDialog
          commit={confirmState}
          onConfirm={handleRollback}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}

/**
 * CommitRow — Single commit in the dropdown list
 */
function CommitRow({ commit, branch: _branch, onSelect, idx }) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%",
        padding: "0.75rem",
        border: idx === 0 ? "none" : `1px solid ${LINE}`,
        borderTop: idx > 0 ? `1px solid ${LINE}` : "none",
        background: "transparent",
        textAlign: "left",
        cursor: "pointer",
        transition: "background 0.15s",
        fontSize: "0.8rem",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ fontFamily: "monospace", fontWeight: 600, color: INK, fontSize: "0.78rem" }}>
        {commit.hash}
      </div>
      <div style={{ color: INK, fontSize: "0.78rem", marginTop: "0.2rem", fontWeight: 500 }}>
        {commit.message}
      </div>
      <div style={{ color: INK_60, fontSize: "0.7rem", marginTop: "0.3rem" }}>
        {new Date(commit.timestamp).toLocaleString()} by {commit.author}
      </div>
    </button>
  );
}

/**
 * ConfirmDialog — Confirmation dialog before rolling back
 */
function ConfirmDialog({ commit, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem", color: INK }}>
          Rollback {commit.branch === "dev" ? "Preview (dev)" : "Production (main)"}?
        </h3>
        <p style={{ fontSize: "0.85rem", color: INK_60, marginBottom: "1rem" }}>
          This will reset the branch to:
        </p>
        <div
          style={{
            background: "#f9f9f9",
            border: `1px solid ${LINE}`,
            borderRadius: "0.3rem",
            padding: "0.75rem",
            marginBottom: "1.5rem",
            fontFamily: "monospace",
            fontSize: "0.78rem",
          }}
        >
          <div style={{ fontWeight: 600, color: INK }}>
            {commit.sha.slice(0, 7)}
          </div>
          <div style={{ color: INK, marginTop: "0.25rem" }}>
            {commit.message}
          </div>
        </div>

        <p style={{ fontSize: "0.78rem", color: "#c44", marginBottom: "1.5rem" }}>
          ⚠️ This cannot be undone. Cloudflare will redeploy in 1-2 minutes.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              ...btnStyle,
              fontSize: "0.78rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...btnStyle,
              background: "#c44",
              color: "#fff",
              border: "1px solid #c44",
              fontWeight: 700,
              fontSize: "0.78rem",
            }}
          >
            Yes, rollback
          </button>
        </div>
      </div>
    </div>
  );
}
