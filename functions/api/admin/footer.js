import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

/* Read/write src/data/footer.json — footer columns, links, copyright, email.

   GET  /api/admin/footer  → { ok: true, data: { columns, copyright, copyrightKey, contactEmail }, sha }
   PUT  /api/admin/footer  → { ok: true, commitSha }
   Body for PUT: { columns, copyright, contactEmail }

   Each column: { id, title, titleKey?, hidden?, links: [{ id, label, labelKey?, href, external?, hidden? }] }
   - id: stable key (string)
   - title: display text
   - titleKey: optional i18n key (preserved round-trip)
   - hidden: boolean — true suppresses the column/link on the public footer
     (Footer.jsx filters on this; keep both normalizeColumn/normalizeLink
     preserving it below, or the admin's Hide toggle silently no-ops on save)
   - links[].external: boolean — true opens in new tab
*/

const FOOTER_PATH = "src/data/footer.json";

const MAX_COLS       = 20;
const MAX_LINKS      = 50;
const MAX_ID_LEN     = 80;
const MAX_LABEL_LEN  = 200;
const MAX_HREF_LEN   = 2048;
const MAX_KEY_LEN    = 80;
const MAX_EMAIL_LEN  = 254;
const MAX_COPYRIGHT  = 300;

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const result = await getFileFromGitHub(env, FOOTER_PATH);
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
  if (!Array.isArray(body.columns)) {
    return jsonResponse({ ok: false, error: "'columns' must be an array" }, 400);
  }
  if (body.columns.length > MAX_COLS) {
    return jsonResponse({ ok: false, error: `Too many columns (max ${MAX_COLS})` }, 400);
  }

  const validationError = validateColumns(body.columns);
  if (validationError) return jsonResponse({ ok: false, error: validationError }, 400);

  if (body.copyright !== undefined) {
    if (typeof body.copyright !== "string") {
      return jsonResponse({ ok: false, error: "'copyright' must be a string" }, 400);
    }
    if (body.copyright.trim().length > MAX_COPYRIGHT) {
      return jsonResponse({ ok: false, error: `'copyright' too long (max ${MAX_COPYRIGHT} chars)` }, 400);
    }
  }

  if (body.contactEmail !== undefined && body.contactEmail !== "") {
    if (typeof body.contactEmail !== "string") {
      return jsonResponse({ ok: false, error: "'contactEmail' must be a string" }, 400);
    }
    if (body.contactEmail.trim().length > MAX_EMAIL_LEN) {
      return jsonResponse({ ok: false, error: `'contactEmail' too long (max ${MAX_EMAIL_LEN} chars)` }, 400);
    }
  }

  // Re-fetch latest SHA before committing
  const current = await getFileFromGitHub(env, FOOTER_PATH);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const sanitized = normalizePayload(body, current.data);
  const newContent = JSON.stringify(sanitized, null, 2) + "\n";
  const result = await commitFileToGitHub(
    env, FOOTER_PATH, newContent, current.sha, "Admin: update footer.json",
  );
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

/* ── Validation ──────────────────────────────────────────────────────────────── */

function validateColumns(columns) {
  const seenColIds = new Set();
  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    if (!col || typeof col !== "object") return `columns[${ci}] is not an object`;
    if (typeof col.id !== "string" || !col.id.trim())
      return `columns[${ci}].id is required`;
    if (seenColIds.has(col.id.trim()))
      return `columns[${ci}].id "${col.id}" is duplicated`;
    seenColIds.add(col.id.trim());

    if (typeof col.title !== "string" || !col.title.trim())
      return `columns[${ci}].title is required`;

    if (!Array.isArray(col.links))
      return `columns[${ci}].links must be an array`;
    if (col.links.length > MAX_LINKS)
      return `columns[${ci}].links too many items (max ${MAX_LINKS})`;

    const seenLinkIds = new Set();
    for (let li = 0; li < col.links.length; li++) {
      const link = col.links[li];
      if (!link || typeof link !== "object")
        return `columns[${ci}].links[${li}] is not an object`;
      if (typeof link.id !== "string" || !link.id.trim())
        return `columns[${ci}].links[${li}].id is required`;
      if (seenLinkIds.has(link.id.trim()))
        return `columns[${ci}].links[${li}].id "${link.id}" is duplicated in this column`;
      seenLinkIds.add(link.id.trim());

      if (typeof link.label !== "string" || !link.label.trim())
        return `columns[${ci}].links[${li}].label is required`;
      if (typeof link.href !== "string" || !link.href.trim())
        return `columns[${ci}].links[${li}].href is required`;
      const href = link.href.trim();
      if (!href.startsWith("/") && !/^[a-z]+:/i.test(href))
        return `columns[${ci}].links[${li}].href must start with "/" or be a full URL`;
    }
  }
  return null;
}

/* ── Normalisation ───────────────────────────────────────────────────────────── */

function normalizePayload(body, existing) {
  const out = {
    columns: body.columns.map(col => normalizeColumn(col)),
    copyright: typeof body.copyright === "string"
      ? body.copyright.trim().slice(0, MAX_COPYRIGHT)
      : (existing?.copyright ?? ""),
    contactEmail: typeof body.contactEmail === "string"
      ? body.contactEmail.trim().slice(0, MAX_EMAIL_LEN)
      : (existing?.contactEmail ?? ""),
  };
  // Preserve copyrightKey round-trip
  if (typeof existing?.copyrightKey === "string") {
    out.copyrightKey = existing.copyrightKey;
  }
  return out;
}

function normalizeColumn(col) {
  const out = {
    id:    String(col.id).trim().slice(0, MAX_ID_LEN),
    title: String(col.title).trim().slice(0, MAX_LABEL_LEN),
    links: col.links.map(link => normalizeLink(link)),
  };
  // Preserve titleKey round-trip
  if (typeof col.titleKey === "string" && col.titleKey.trim()) {
    out.titleKey = col.titleKey.trim().slice(0, MAX_KEY_LEN);
  }
  // Preserve hidden flag — was missing entirely, so the admin's Hide/Show
  // toggle silently reverted on every save regardless of what was clicked.
  if (col.hidden === true) out.hidden = true;
  return out;
}

function normalizeLink(link) {
  const out = {
    id:    String(link.id).trim().slice(0, MAX_ID_LEN),
    label: String(link.label).trim().slice(0, MAX_LABEL_LEN),
    href:  String(link.href).trim().slice(0, MAX_HREF_LEN),
  };
  // Preserve labelKey round-trip
  if (typeof link.labelKey === "string" && link.labelKey.trim()) {
    out.labelKey = link.labelKey.trim().slice(0, MAX_KEY_LEN);
  }
  // Preserve external flag
  if (link.external === true) out.external = true;
  // Preserve hidden flag — same bug as the column-level one above.
  if (link.hidden === true) out.hidden = true;
  return out;
}
