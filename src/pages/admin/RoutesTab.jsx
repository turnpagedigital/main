import React, { useState, useEffect } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";

const inputStyle = {
  width: "100%",
  padding: "0.7rem",
  fontFamily: FONT,
  fontSize: "0.95rem",
  color: INK,
  background: "#fafbfc",
  border: `1px solid ${LINE}`,
  borderRadius: "4px",
  boxSizing: "border-box",
};

const btnStyle = {
  padding: "0.6rem 1.2rem",
  fontFamily: FONT,
  fontSize: "0.9rem",
  color: INK,
  background: "transparent",
  border: `1px solid ${LINE}`,
  borderRadius: "4px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const btnPrimaryStyle = {
  ...btnStyle,
  color: "#000",
  background: NEON,
  border: `1px solid ${NEON}`,
  fontWeight: 600,
};

export default function RoutesTab({ onDirtyChange }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingRoute, setEditingRoute] = useState(null);
  const [newPath, setNewPath] = useState("");
  const [previewChanges, setPreviewChanges] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [approveChanges, setApproveChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/routes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load routes");
      setRoutes(data.routes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(route) {
    setEditingRoute(route);
    setNewPath(route.path);
    setPreviewChanges(null);
    setApproveChanges(false);
  }

  async function handlePreviewChanges() {
    if (!editingRoute || !newPath || newPath === editingRoute.path) {
      setError("Please enter a different path");
      return;
    }

    try {
      setPreviewLoading(true);
      setError("");
      const res = await fetch(
        `/api/admin/routes?oldPath=${encodeURIComponent(editingRoute.path)}&newPath=${encodeURIComponent(newPath)}`,
        { method: "PUT" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to preview changes");
      setPreviewChanges(data.changes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function applyChanges() {
    if (!editingRoute || !newPath || !previewChanges) {
      setError("Invalid state");
      return;
    }

    if (!approveChanges && previewChanges.length > 0) {
      setError("You must confirm the changes");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const updatedRoutes = routes.map(r =>
        r.key === editingRoute.key ? { ...r, path: newPath } : r
      );

      const res = await fetch("/api/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routes: updatedRoutes,
          oldPath: editingRoute.path,
          newPath: newPath,
          applyChanges: previewChanges,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply changes");

      setRoutes(updatedRoutes);
      setEditingRoute(null);
      setNewPath("");
      setPreviewChanges(null);
      setApproveChanges(false);
      onDirtyChange?.(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditingRoute(null);
    setNewPath("");
    setPreviewChanges(null);
    setApproveChanges(false);
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: INK_60 }}>
        Loading routes…
      </div>
    );
  }

  if (error && !editingRoute) {
    return (
      <div style={{ padding: "2rem", color: "#d32f2f" }}>
        <p>{error}</p>
        <button onClick={loadRoutes} style={btnPrimaryStyle}>
          Retry
        </button>
      </div>
    );
  }

  if (editingRoute) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={() => !previewChanges && cancelEdit()}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "2rem",
            maxWidth: "600px",
            maxHeight: "80vh",
            overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <h2 style={{ marginTop: 0, marginBottom: "1.5rem", fontFamily: FONT }}>
            {previewChanges ? "Review Changes" : "Edit Route"}
          </h2>

          {error && (
            <div
              style={{
                padding: "1rem",
                background: "#ffebee",
                color: "#d32f2f",
                borderRadius: "4px",
                marginBottom: "1rem",
                fontFamily: FONT,
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          {!previewChanges ? (
            <>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontFamily: FONT, fontSize: "0.9rem" }}>
                  Current path:
                </label>
                <div style={{ ...inputStyle, background: "#f5f5f5", cursor: "default" }}>
                  {editingRoute.path}
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontFamily: FONT, fontSize: "0.9rem" }}>
                  New path:
                </label>
                <input
                  type="text"
                  value={newPath}
                  onChange={e => setNewPath(e.target.value)}
                  style={inputStyle}
                  placeholder="/new-path"
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button onClick={cancelEdit} style={btnStyle}>
                  Cancel
                </button>
                <button
                  onClick={handlePreviewChanges}
                  disabled={previewLoading || !newPath || newPath === editingRoute.path}
                  style={{
                    ...btnPrimaryStyle,
                    opacity: previewLoading || !newPath || newPath === editingRoute.path ? 0.5 : 1,
                    cursor: previewLoading || !newPath || newPath === editingRoute.path ? "not-allowed" : "pointer",
                  }}
                >
                  {previewLoading ? "Loading…" : "Preview Changes"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  padding: "1rem",
                  background: "#e3f2fd",
                  borderRadius: "4px",
                  marginBottom: "1.5rem",
                  fontFamily: FONT,
                  fontSize: "0.9rem",
                  color: "#1565c0",
                }}
              >
                <strong>Route change:</strong> {editingRoute.path} → {newPath}
              </div>

              {previewChanges.length === 0 ? (
                <div
                  style={{
                    padding: "1rem",
                    background: "#f5f5f5",
                    borderRadius: "4px",
                    textAlign: "center",
                    marginBottom: "1.5rem",
                    fontFamily: FONT,
                    color: INK_60,
                  }}
                >
                  No internal references found.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "1.5rem", fontFamily: FONT, fontSize: "0.9rem" }}>
                    <strong style={{ display: "block", marginBottom: "1rem" }}>
                      References that will be updated:
                    </strong>
                    <div style={{ border: `1px solid ${LINE}`, borderRadius: "4px", overflow: "hidden" }}>
                      {previewChanges.map((change, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "0.8rem",
                            borderBottom: idx < previewChanges.length - 1 ? `1px solid ${LINE}` : "none",
                            background: idx % 2 === 0 ? "#fafbfc" : "#fff",
                          }}
                        >
                          <div style={{ marginBottom: "0.4rem", color: INK }}>
                            <strong>{change.location}</strong>
                          </div>
                          <div style={{ color: INK_60, fontSize: "0.85rem" }}>
                            {change.old} → {change.new}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "1.5rem",
                      fontFamily: FONT,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={approveChanges}
                      onChange={e => setApproveChanges(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    I understand and approve these changes
                  </label>
                </>
              )}

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button onClick={() => setPreviewChanges(null)} style={btnStyle}>
                  Back
                </button>
                <button
                  onClick={applyChanges}
                  disabled={saving || (previewChanges.length > 0 && !approveChanges)}
                  style={{
                    ...btnPrimaryStyle,
                    opacity: saving || (previewChanges.length > 0 && !approveChanges) ? 0.5 : 1,
                    cursor: saving || (previewChanges.length > 0 && !approveChanges) ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Applying…" : "Apply Changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.5rem", fontFamily: FONT }}>Routes</h2>
        <p style={{ color: INK_60, marginBottom: "1.5rem", fontFamily: FONT, fontSize: "0.9rem" }}>
          Manage page URLs. Click edit to rename a route. Changes cascade to navigation and microsites.
        </p>

        <div
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontFamily: FONT,
            fontSize: "0.9rem",
            border: `1px solid ${LINE}`,
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.8fr",
              gap: 0,
              padding: "1rem",
              background: "#f5f5f5",
              borderBottom: `1px solid ${LINE}`,
              fontWeight: 600,
              color: INK,
            }}
          >
            <div>Path</div>
            <div>Component</div>
            <div>Dynamic?</div>
            <div>Title</div>
            <div></div>
          </div>

          {routes.map((route, idx) => (
            <div
              key={route.key}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.8fr",
                gap: 0,
                padding: "1rem",
                borderBottom: idx < routes.length - 1 ? `1px solid ${LINE}` : "none",
                background: idx % 2 === 0 ? "#fafbfc" : "#fff",
                alignItems: "center",
              }}
            >
              <div style={{ color: INK }}>
                <code style={{ background: "#f0f0f0", padding: "0.2rem 0.4rem", borderRadius: "2px" }}>
                  {route.path}
                </code>
              </div>
              <div style={{ color: INK }}>
                <code style={{ background: "#f0f0f0", padding: "0.2rem 0.4rem", borderRadius: "2px", fontSize: "0.85rem" }}>
                  {route.component}
                </code>
              </div>
              <div style={{ color: INK_60 }}>{route.dynamic ? "Yes" : "No"}</div>
              <div style={{ color: INK_60, fontSize: "0.9rem" }}>{route.title}</div>
              <button onClick={() => startEdit(route)} style={{ ...btnStyle, padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
