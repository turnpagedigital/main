/* GET /api/admin/attio-test — admin-only health check for the Attio
   integration. Reports whether ATTIO_API_KEY is present and what Attio says
   about it: token validity + workspace (catches a token from the wrong
   workspace), record-read access, and note-read access. Never echoes the key.

   Open it logged-in at https://turnpagedigital.com/api/admin/attio-test */

import { isAuthed, jsonResponse } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const out = { keyPresent: Boolean(env.ATTIO_API_KEY) };
  if (!out.keyPresent) {
    out.diagnosis = "ATTIO_API_KEY is not set in this deployment's environment — add it as a Secret on Production and Retry deployment.";
    return jsonResponse({ ok: true, ...out });
  }
  const headers = {
    Authorization: `Bearer ${env.ATTIO_API_KEY}`,
    "Content-Type": "application/json",
  };

  // 1. Token identity — validity + which workspace it belongs to
  try {
    const r = await fetch("https://api.attio.com/v2/self", { headers });
    out.tokenStatus = r.status;
    if (r.ok) {
      const body = await r.json();
      out.workspaceName = body?.workspace_name || body?.data?.workspace_name || null;
      out.workspaceId = body?.workspace_id || body?.data?.workspace_id || null;
      out.scopes = body?.scope || body?.data?.scope || undefined;
    } else {
      out.tokenError = (await r.text()).slice(0, 300);
    }
  } catch (err) {
    out.tokenStatus = "network-error";
    out.tokenError = err.message;
  }

  // 2. Record access — try reading one person
  try {
    const r = await fetch("https://api.attio.com/v2/objects/people/records/query", {
      method: "POST",
      headers,
      body: JSON.stringify({ limit: 1 }),
    });
    out.recordReadStatus = r.status;
    if (!r.ok) out.recordReadError = (await r.text()).slice(0, 300);
  } catch (err) {
    out.recordReadStatus = "network-error";
    out.recordReadError = err.message;
  }

  // 3. Note access — try listing one note (needs parent filters? plain list works)
  try {
    const r = await fetch("https://api.attio.com/v2/notes?limit=1", { headers });
    out.noteReadStatus = r.status;
    if (!r.ok) out.noteReadError = (await r.text()).slice(0, 300);
  } catch (err) {
    out.noteReadStatus = "network-error";
    out.noteReadError = err.message;
  }

  out.diagnosis =
    out.tokenStatus !== 200 ? "The token is invalid or expired — recreate it in Attio and update the Cloudflare secret."
    : out.recordReadStatus !== 200 ? "Token is valid but lacks Record permissions — edit the token's scopes in Attio (Record: Read-write)."
    : out.noteReadStatus !== 200 ? "Token is valid but lacks Note permissions — edit the token's scopes in Attio (Note: Read-write)."
    : "Token looks healthy. If registrations still don't appear, check the workspaceName above matches the workspace you're looking at.";

  return jsonResponse({ ok: true, ...out });
}
