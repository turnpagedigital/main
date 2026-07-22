import React, { useState, useEffect, useCallback } from "react";
import { FONT, INK, INK_60, LINE, SURFACE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, ConfirmDialog, labelStyle } from "./shared.jsx";

const API = "/api/admin/users";

function validate(form, confirmPassword) {
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim())  return "Last name is required.";
  if (!form.email.trim())     return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email address.";
  if (form.password && form.password.length < 8) return "Password must be at least 8 characters.";
  if (form.password && form.password !== confirmPassword) return "Passwords do not match.";
  return null;
}

function UserForm({ initial, requirePassword, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState({
    firstName: initial?.firstName || "",
    lastName:  initial?.lastName  || "",
    email:     initial?.email     || "",
    password:  "",
  });
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  function field(name) {
    return {
      value: form[name],
      onChange: e => setForm(f => ({ ...f, [name]: e.target.value })),
      disabled: saving,
      style: inputStyle,
    };
  }

  async function submit(e) {
    e.preventDefault();
    const err = validate({ ...form, password: requirePassword || form.password ? form.password : undefined }, confirm);
    if (err) { setLocalError(err); return; }
    setLocalError("");
    await onSave(form);
  }

  const displayError = localError || error;

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label style={labelStyle}>
          First Name *
          <input type="text" {...field("firstName")} autoFocus />
        </label>
        <label style={labelStyle}>
          Last Name *
          <input type="text" {...field("lastName")} />
        </label>
      </div>
      <label style={labelStyle}>
        Email *
        <input type="email" {...field("email")} />
      </label>
      <label style={labelStyle}>
        {requirePassword ? "Password *" : "New Password (leave blank to keep current)"}
        <input type="password" {...field("password")} />
      </label>
      {(requirePassword || form.password) && (
        <label style={labelStyle}>
          Confirm Password {requirePassword ? "*" : ""}
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={saving}
            style={inputStyle}
          />
        </label>
      )}
      {displayError && (
        <p style={{ color: "#c0392b", fontSize: "0.84rem", margin: 0 }}>{displayError}</p>
      )}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
        <button type="submit" disabled={saving} style={{
          ...btnPrimaryStyle,
          opacity: saving ? 0.55 : 1,
          cursor: saving ? "default" : "pointer",
        }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} style={btnStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function UsersTab() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [flash, setFlash]     = useState("");
  const [adding, setAdding]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");

  function showFlash(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(API, { credentials: "include" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Failed to load users");
      setUsers(body.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(form) {
    setSaving(true);
    setSaveError("");
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Failed to create user");
      setAdding(false);
      await load();
      showFlash(`User ${form.firstName} ${form.lastName} created.`);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id, form) {
    setSaving(true);
    setSaveError("");
    try {
      const r = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, ...form }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Failed to update user");
      setEditingId(null);
      await load();
      showFlash(`User updated.`);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setSaving(true);
    setDeleteId(null);
    try {
      const r = await fetch(`${API}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Failed to delete user");
      await load();
      showFlash("User removed.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "clamp(1rem, 3vw, 2rem)", maxWidth: 720, fontFamily: FONT, color: INK }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>Admin Users</h2>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setSaveError(""); }}
            style={btnPrimaryStyle}
          >
            + Add User
          </button>
        )}
      </div>

      {/* Flash banner */}
      {flash && (
        <div style={{
          padding: "0.65rem 0.9rem", marginBottom: "1rem",
          background: "rgba(26,127,55,0.08)", border: "1px solid rgba(26,127,55,0.3)",
          color: "#1a7f37", fontSize: "0.86rem",
        }}>
          {flash}
        </div>
      )}

      {/* Add user form */}
      {adding && (
        <div style={{
          background: SURFACE, border: `1px solid ${LINE}`,
          padding: "1.25rem", marginBottom: "1.5rem",
        }}>
          <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 1rem" }}>New User</p>
          <UserForm
            requirePassword
            onSave={handleAdd}
            onCancel={() => { setAdding(false); setSaveError(""); }}
            saving={saving}
            error={saveError}
          />
        </div>
      )}

      {/* User list */}
      {loading ? (
        <p style={{ color: INK_60, fontSize: "0.9rem" }}>Loading…</p>
      ) : error ? (
        <p style={{ color: "#c0392b", fontSize: "0.9rem" }}>{error}</p>
      ) : users.length === 0 ? (
        <p style={{ color: INK_60, fontSize: "0.9rem" }}>
          No additional users yet. Add one above — they can log in with their own email and password.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {users.map(u => (
            <div key={u.id} style={{
              background: SURFACE, border: `1px solid ${LINE}`, padding: "1rem 1.1rem",
            }}>
              {editingId === u.id ? (
                <>
                  <p style={{ fontWeight: 700, fontSize: "0.88rem", margin: "0 0 0.85rem" }}>
                    Editing {u.firstName} {u.lastName}
                  </p>
                  <UserForm
                    initial={u}
                    requirePassword={false}
                    onSave={form => handleEdit(u.id, form)}
                    onCancel={() => { setEditingId(null); setSaveError(""); }}
                    saving={saving}
                    error={saveError}
                  />
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                      {u.firstName} {u.lastName}
                    </span>
                    <span style={{ color: INK_60, fontSize: "0.84rem", marginLeft: "0.75rem" }}>
                      {u.email}
                    </span>
                  </div>
                  <button
                    onClick={() => { setEditingId(u.id); setSaveError(""); }}
                    disabled={saving}
                    style={{ ...btnStyle, fontSize: "0.8rem" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(u.id)}
                    disabled={saving}
                    style={{ ...btnStyle, fontSize: "0.8rem", color: "#c0392b", borderColor: "#c0392b" }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete user?"
        message="This user will no longer be able to log in. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
