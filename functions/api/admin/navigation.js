import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

/* Read/write src/data/nav.json — the top navigation items list, dropdown
   previews, and sub-brand microsite navs.

   GET  /api/admin/navigation  → { ok: true, data: { items: [...], microsites: {...} }, sha }
   PUT  /api/admin/navigation  → { ok: true, commitSha }
   Body for PUT: { items: [...], microsites?: {...} }

   Each item: { id, label, href, labelKey?, active, external?, dropdown? }
   - id: stable key (string)
   - label: display text
   - href: path or full URL
   - labelKey: optional i18n key (preserved round-trip, not edited here)
   - active: boolean — false hides without deleting
   - external: boolean — true opens in new tab with rel noopener
   - dropdown: optional { title, body, links: [{label, href, external?}], cta: {label, href, external?} }

   microsites: map of brandId -> { brand: {label, href}, items: [{label, href}], cta: {label, href} }
*/

const NAV_PATH = "src/data/nav.json";

const MAX_ITEMS    = 50;
const MAX_ID_LEN   = 80;
const MAX_LABEL_LEN = 120;
const MAX_HREF_LEN  = 2048;
const MAX_KEY_LEN   = 80;

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const result = await getFileFromGitHub(env, NAV_PATH);
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
  if (!Array.isArray(body.items)) {
    return jsonResponse({ ok: false, error: "'items' must be an array" }, 400);
  }
  if (body.items.length > MAX_ITEMS) {
    return jsonResponse({ ok: false, error: `Too many items (max ${MAX_ITEMS})` }, 400);
  }

  const validationError = validateItems(body.items);
  if (validationError) return jsonResponse({ ok: false, error: validationError }, 400);

  // Re-fetch the latest SHA before committing — single source of truth.
  const current = await getFileFromGitHub(env, NAV_PATH);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  const sanitized = {
    items: body.items.map(normalizeItem),
  };
  // Preserve microsites if present — basic shape check, no deep validation.
  if (body.microsites && typeof body.microsites === "object" && !Array.isArray(body.microsites)) {
    sanitized.microsites = normalizeMicrosites(body.microsites);
  }
  const newContent = JSON.stringify(sanitized, null, 2) + "\n";
  const result = await commitFileToGitHub(
    env, NAV_PATH, newContent, current.sha, "Admin: update nav.json",
  );
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

/* ── Validation / normalisation ───────────────────────────────────────────── */

function validateItems(items) {
  const seenIds = new Set();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== "object") return `items[${i}] is not an object`;
    if (typeof item.id !== "string" || !item.id.trim())
      return `items[${i}].id is required`;
    if (typeof item.label !== "string" || !item.label.trim())
      return `items[${i}].label is required`;
    if (typeof item.href !== "string" || !item.href.trim())
      return `items[${i}].href is required`;
    const href = item.href.trim();
    if (!href.startsWith("/") && !/^[a-z]+:/i.test(href)) {
      return `items[${i}].href must start with "/" or be a full URL`;
    }
    if (seenIds.has(item.id.trim())) {
      return `items[${i}].id "${item.id}" is duplicated`;
    }
    seenIds.add(item.id.trim());
  }
  return null;
}

function normalizeItem(item) {
  const out = {
    id:     String(item.id).trim().slice(0, MAX_ID_LEN),
    label:  String(item.label).trim().slice(0, MAX_LABEL_LEN),
    href:   String(item.href).trim().slice(0, MAX_HREF_LEN),
    active: item.active !== false, // default true
  };
  // Preserve labelKey round-trip (used for i18n in the front-end)
  if (typeof item.labelKey === "string" && item.labelKey.trim()) {
    out.labelKey = item.labelKey.trim().slice(0, MAX_KEY_LEN);
  }
  // Preserve external flag
  if (item.external === true) out.external = true;
  // Preserve dropdown if present and well-shaped
  if (item.dropdown && typeof item.dropdown === "object") {
    out.dropdown = normalizeDropdown(item.dropdown);
  }
  return out;
}

function normalizeLink(link) {
  if (!link || typeof link !== "object") return null;
  const out = {
    label: String(link.label || "").trim().slice(0, MAX_LABEL_LEN),
    href:  String(link.href  || "").trim().slice(0, MAX_HREF_LEN),
  };
  if (link.external === true) out.external = true;
  return out;
}

function normalizeDropdown(dd) {
  const out = {
    title: String(dd.title || "").trim().slice(0, MAX_LABEL_LEN),
    body:  String(dd.body  || "").trim().slice(0, 2000),
    links: Array.isArray(dd.links)
      ? dd.links.map(normalizeLink).filter(Boolean)
      : [],
  };
  if (dd.cta && typeof dd.cta === "object") {
    out.cta = normalizeLink(dd.cta) || { label: "", href: "/" };
  } else {
    out.cta = { label: "", href: "/" };
  }
  return out;
}

function normalizeMicrosites(microsites) {
  const out = {};
  for (const [brandId, ms] of Object.entries(microsites)) {
    if (!ms || typeof ms !== "object") continue;
    out[String(brandId).trim().slice(0, MAX_ID_LEN)] = {
      brand: ms.brand && typeof ms.brand === "object"
        ? { label: String(ms.brand.label || "").trim().slice(0, MAX_LABEL_LEN),
            href:  String(ms.brand.href  || "").trim().slice(0, MAX_HREF_LEN) }
        : { label: "", href: "/" },
      items: Array.isArray(ms.items)
        ? ms.items.map(normalizeLink).filter(Boolean)
        : [],
      cta: ms.cta && typeof ms.cta === "object"
        ? { label: String(ms.cta.label || "").trim().slice(0, MAX_LABEL_LEN),
            href:  String(ms.cta.href  || "").trim().slice(0, MAX_HREF_LEN) }
        : { label: "", href: "/" },
    };
  }
  return out;
}
