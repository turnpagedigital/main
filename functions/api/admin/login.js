import {
  jsonResponse,
  constantTimeEqual,
  createSessionCookieValue,
  buildSetCookieHeader,
  SESSION_TTL_SECONDS,
} from "./_utils.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SECRET) {
    return jsonResponse({ ok: false, error: "Admin is not configured (missing env vars)" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Bad request" }, 400);
  }

  const provided = String((body && body.password) || "");
  if (!provided) {
    return jsonResponse({ ok: false, error: "Password required" }, 400);
  }

  if (!constantTimeEqual(provided, env.ADMIN_PASSWORD)) {
    return jsonResponse({ ok: false, error: "Invalid password" }, 401);
  }

  const cookieValue = await createSessionCookieValue(env.ADMIN_SECRET);
  return jsonResponse({ ok: true }, 200, {
    "Set-Cookie": buildSetCookieHeader(cookieValue, SESSION_TTL_SECONDS),
  });
}
