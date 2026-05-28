import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

/* Read/write src/data/contact-form.json — contact page form fields,
   subject dropdown options, and page copy.

   GET  /api/admin/contact-form  → { ok, data, sha }
   PUT  /api/admin/contact-form  → { ok, commitSha }
*/

const FILE_PATH = "src/data/contact-form.json";

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const result = await getFileFromGitHub(env, FILE_PATH);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);
  return jsonResponse({ ok: true, data: result.data, sha: result.sha });
}

export async function onRequestPut({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: "Bad request" }, 400); }

  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, error: "Invalid payload" }, 400);
  }
  if (!Array.isArray(body.subjects)) {
    return jsonResponse({ ok: false, error: "'subjects' must be an array" }, 400);
  }
  if (!Array.isArray(body.fields)) {
    return jsonResponse({ ok: false, error: "'fields' must be an array" }, 400);
  }

  // Re-fetch latest SHA
  const current = await getFileFromGitHub(env, FILE_PATH);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const payload = {
    _comment: "Contact form configuration. Managed via /admin/pages/contact. Fields define the form layout; subjects populate the dropdown.",
    heading:        typeof body.heading === "string"        ? body.heading        : "",
    accentText:     typeof body.accentText === "string"     ? body.accentText     : "",
    subtitle:       typeof body.subtitle === "string"       ? body.subtitle       : "",
    sidebarHeading: typeof body.sidebarHeading === "string" ? body.sidebarHeading : "",
    sidebarIntro:   typeof body.sidebarIntro === "string"   ? body.sidebarIntro   : "",
    email:          typeof body.email === "string"          ? body.email          : "",
    phone:          typeof body.phone === "string"          ? body.phone          : "",
    disclaimer:     typeof body.disclaimer === "string"     ? body.disclaimer     : "",
    subjects: body.subjects.map(s => ({
      id:     typeof s.id === "string"      ? s.id     : "",
      label:  typeof s.label === "string"   ? s.label  : "",
      active: typeof s.active === "boolean" ? s.active : true,
    })),
    fields: body.fields.map(f => ({
      name:        typeof f.name === "string"        ? f.name        : "",
      label:       typeof f.label === "string"       ? f.label       : "",
      type:        typeof f.type === "string"        ? f.type        : "text",
      required:    typeof f.required === "boolean"   ? f.required    : false,
      halfWidth:   typeof f.halfWidth === "boolean"  ? f.halfWidth   : false,
      ...(f.placeholder ? { placeholder: String(f.placeholder) } : {}),
      ...(f.rows         ? { rows: Number(f.rows) }              : {}),
    })),
  };

  const content = JSON.stringify(payload, null, 2) + "\n";
  const result = await commitFileToGitHub(
    env, FILE_PATH, content, current.sha,
    "Admin: update contact-form.json",
  );
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);
  return jsonResponse({ ok: true, commitSha: result.sha });
}
