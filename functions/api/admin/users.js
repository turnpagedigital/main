import { jsonResponse, isAuthed, generateSalt, hashUserPassword } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const USERS_PATH = "src/data/admin-users.json";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Strip sensitive fields before sending to the client. */
function publicUser(u) {
  return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email };
}

async function loadUsers(env) {
  const result = await getFileFromGitHub(env, USERS_PATH);
  if (!result.ok) return { users: [], sha: null };
  const users = Array.isArray(result.data?.users) ? result.data.users : [];
  return { users, sha: result.sha };
}

async function saveUsers(env, users, sha, message) {
  const content = JSON.stringify({ users }, null, 2);
  return commitFileToGitHub(env, USERS_PATH, content, sha, message);
}

/* GET /api/admin/users — list all users (no hashes). */
export async function onRequestGet({ request, env }) {
  if (!await isAuthed(request, env)) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  const { users } = await loadUsers(env);
  return jsonResponse({ ok: true, users: users.map(publicUser) });
}

/* POST /api/admin/users — create a user. */
export async function onRequestPost({ request, env }) {
  if (!await isAuthed(request, env)) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const firstName = String(body.firstName || "").trim();
  const lastName  = String(body.lastName  || "").trim();
  const email     = String(body.email     || "").trim().toLowerCase();
  const password  = String(body.password  || "");

  if (!firstName) return jsonResponse({ ok: false, error: "First name is required" }, 400);
  if (!lastName)  return jsonResponse({ ok: false, error: "Last name is required" }, 400);
  if (!email || !EMAIL_RE.test(email)) return jsonResponse({ ok: false, error: "Valid email is required" }, 400);
  if (!password || password.length < 8) return jsonResponse({ ok: false, error: "Password must be at least 8 characters" }, 400);

  const { users, sha } = await loadUsers(env);
  if (users.some(u => u.email?.toLowerCase() === email)) {
    return jsonResponse({ ok: false, error: "A user with that email already exists" }, 409);
  }

  const salt         = generateSalt();
  const passwordHash = await hashUserPassword(password, salt, env.ADMIN_SECRET);
  const id           = `user-${Date.now()}`;

  const newUser = { id, firstName, lastName, email, salt, passwordHash };
  const result  = await saveUsers(env, [...users, newUser], sha, `Admin: add user ${email}`);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error || "Failed to save" }, 500);

  return jsonResponse({ ok: true, user: publicUser(newUser) }, 201);
}

/* PUT /api/admin/users — update a user. */
export async function onRequestPut({ request, env }) {
  if (!await isAuthed(request, env)) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  const id = String(body.id || "").trim();
  if (!id) return jsonResponse({ ok: false, error: "User id is required" }, 400);

  const { users, sha } = await loadUsers(env);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return jsonResponse({ ok: false, error: "User not found" }, 404);

  const updated = { ...users[idx] };
  if (body.firstName !== undefined) updated.firstName = String(body.firstName).trim();
  if (body.lastName  !== undefined) updated.lastName  = String(body.lastName).trim();

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return jsonResponse({ ok: false, error: "Valid email is required" }, 400);
    if (users.some((u, i) => i !== idx && u.email?.toLowerCase() === email)) {
      return jsonResponse({ ok: false, error: "A user with that email already exists" }, 409);
    }
    updated.email = email;
  }

  if (body.password) {
    if (body.password.length < 8) return jsonResponse({ ok: false, error: "Password must be at least 8 characters" }, 400);
    updated.salt         = generateSalt();
    updated.passwordHash = await hashUserPassword(body.password, updated.salt, env.ADMIN_SECRET);
  }

  const newUsers = [...users];
  newUsers[idx] = updated;
  const result = await saveUsers(env, newUsers, sha, `Admin: update user ${updated.email}`);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error || "Failed to save" }, 500);

  return jsonResponse({ ok: true, user: publicUser(updated) });
}

/* DELETE /api/admin/users?id=xxx */
export async function onRequestDelete({ request, env }) {
  if (!await isAuthed(request, env)) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const id  = url.searchParams.get("id");
  if (!id) return jsonResponse({ ok: false, error: "User id is required" }, 400);

  const { users, sha } = await loadUsers(env);
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return jsonResponse({ ok: false, error: "User not found" }, 404);

  const deleted = users.find(u => u.id === id);
  const result  = await saveUsers(env, filtered, sha, `Admin: remove user ${deleted?.email || id}`);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error || "Failed to save" }, 500);

  return jsonResponse({ ok: true });
}
