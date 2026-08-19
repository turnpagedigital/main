/* Read/write src/data/forms.json — multi-step registration flows.
 * GET  → { ok, data, sha }
 * PUT  → body { flows: [...] }; validates + normalizes, commits via GitHub.
 * Mirrors the client-side shape used by FlowsTab.jsx and rendered by
 * RegistrationFlowSection.jsx; /api/register validates submissions against
 * the same file. */

import { jsonResponse, isAuthed } from "./_utils.js";
import { sectionsFingerprint } from "../../../src/lib/section-fingerprint.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const FORMS_PATH = "src/data/forms.json";

const FIELD_TYPES = new Set(["text", "email", "phone", "textarea", "select", "choice", "yesno", "file", "number", "computed", "works-summary", "link-confirm"]);
const MAX_TERMS = 10;
const MAX_EXTRACT_MAP = 20;
const FILE_ACCEPT = new Set(["pdf", "png", "jpg"]);
const MAX_FLOWS = 30;
const MAX_STEPS = 12;
const MAX_FIELDS = 15;
const MAX_OPTIONS = 12;
const SHORT = 200;
const LONG = 1000;

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }
  const result = await fetchFile(env);
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

  const { flows } = body || {};
  if (!Array.isArray(flows)) {
    return jsonResponse({ ok: false, error: "Payload must include 'flows' array" }, 400);
  }
  if (flows.length > MAX_FLOWS) {
    return jsonResponse({ ok: false, error: `At most ${MAX_FLOWS} flows` }, 400);
  }

  const err = validateFlows(flows);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const current = await fetchFile(env);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  // Stale-tab guard (same pattern as page-compositions): refuse to overwrite
  // flows that changed since this tab loaded them.
  if (typeof body.baseVersion === "string" && body.baseVersion) {
    const currentVersion = sectionsFingerprint((current.data && current.data.flows) || []);
    if (currentVersion !== body.baseVersion) {
      return jsonResponse({
        ok: false,
        error: "The flows changed after you opened this tab (another tab, or an update pushed via git). Your save was NOT applied. Reload the Flows tab to get the latest, then re-apply your edits.",
      }, 409);
    }
  }

  const merged = {
    _comment: (current.data && current.data._comment) || undefined,
    flows: flows.map(normalizeFlow),
  };
  Object.keys(merged).forEach(k => merged[k] === undefined && delete merged[k]);

  const newContent = JSON.stringify(merged, null, 2) + "\n";
  const result = await commitFileToGitHub(env, FORMS_PATH, newContent, current.sha, "Admin: update forms.json");
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

async function fetchFile(env) {
  const r = await getFileFromGitHub(env, FORMS_PATH);
  if (!r.ok) return { ok: false, error: r.error || "GitHub read failed" };
  return { ok: true, data: r.data, sha: r.sha };
}

// Letters (either case), digits, dashes, underscores. Uppercase must stay legal:
// the contact fields are camelCase ("firstName") and the email/CRM pipeline
// keys on those exact ids.
const slugOk = (s) => typeof s === "string" && /^[a-zA-Z0-9][a-zA-Z0-9-_]{0,79}$/.test(s);

function validateFlows(flows) {
  const seen = new Set();
  for (let i = 0; i < flows.length; i++) {
    const f = flows[i];
    if (!f || typeof f !== "object") return `flows[${i}] is not an object`;
    if (!slugOk(f.id)) return `flows[${i}].id must be a lowercase slug`;
    if (seen.has(f.id)) return `duplicate flow id "${f.id}"`;
    seen.add(f.id);
    if (typeof f.name !== "string" || !f.name.trim()) return `flows[${i}].name is required`;
    if (!Array.isArray(f.steps) || f.steps.length === 0) return `flows[${i}].steps must be a non-empty array`;
    if (f.steps.length > MAX_STEPS) return `flows[${i}]: at most ${MAX_STEPS} steps`;

    const fieldIds = new Set();
    const fieldTypes = {}; // id -> type, for validating computed-field references
    const fieldChoices = {}; // id -> valid values, for choice/select/yesno fields — catches a showIf left pointing at a renamed/removed option
    for (let j = 0; j < f.steps.length; j++) {
      const s = f.steps[j];
      if (!s || typeof s !== "object") return `flows[${i}].steps[${j}] is not an object`;
      if (!slugOk(s.id)) return `flows[${i}].steps[${j}].id must be a lowercase slug`;
      if (typeof s.title !== "string" || !s.title.trim()) return `flows[${i}].steps[${j}].title is required`;
      if (!Array.isArray(s.fields) || s.fields.length === 0) return `flows[${i}].steps[${j}].fields must be non-empty`;
      if (s.fields.length > MAX_FIELDS) return `flows[${i}].steps[${j}]: at most ${MAX_FIELDS} fields`;
      if (s.showIf !== undefined && s.showIf !== null) {
        if (typeof s.showIf !== "object" || !s.showIf.fieldId || typeof s.showIf.equals !== "string") {
          return `flows[${i}].steps[${j}].showIf needs fieldId + equals`;
        }
        if (!fieldIds.has(s.showIf.fieldId)) {
          return `flows[${i}].steps[${j}].showIf references "${s.showIf.fieldId}" which is not a field on an EARLIER step`;
        }
        if (fieldChoices[s.showIf.fieldId] && !fieldChoices[s.showIf.fieldId].includes(s.showIf.equals)) {
          return `flows[${i}].steps[${j}].showIf: "${s.showIf.equals}" is not a current option of "${s.showIf.fieldId}" (options are: ${fieldChoices[s.showIf.fieldId].join(", ")}) — this step would never show. Update the condition or the field's options together.`;
        }
      }
      for (let k = 0; k < s.fields.length; k++) {
        const fld = s.fields[k];
        if (!fld || typeof fld !== "object") return `flows[${i}].steps[${j}].fields[${k}] is not an object`;
        if (!slugOk(fld.id)) return `flows[${i}].steps[${j}].fields[${k}].id must be a lowercase slug`;
        if (fieldIds.has(fld.id)) return `duplicate field id "${fld.id}" in flow "${f.id}"`;
        if (typeof fld.label !== "string" || !fld.label.trim()) return `field "${fld.id}" needs a label`;
        if (!FIELD_TYPES.has(fld.type)) return `field "${fld.id}": unknown type "${fld.type}"`;
        if ((fld.type === "select" || fld.type === "choice")) {
          if (!Array.isArray(fld.options) || fld.options.length < 2) return `field "${fld.id}" needs at least 2 options`;
          if (fld.options.length > MAX_OPTIONS) return `field "${fld.id}": at most ${MAX_OPTIONS} options`;
          if (!fld.options.every(o => typeof o === "string" && o.trim())) return `field "${fld.id}": options must be non-empty strings`;
        }
        if (fld.showIf !== undefined && fld.showIf !== null) {
          if (typeof fld.showIf !== "object" || !fld.showIf.fieldId || typeof fld.showIf.equals !== "string") {
            return `field "${fld.id}".showIf needs fieldId + equals`;
          }
          if (!fieldIds.has(fld.showIf.fieldId)) {
            return `field "${fld.id}".showIf references "${fld.showIf.fieldId}" which is not an earlier field`;
          }
          if (fieldChoices[fld.showIf.fieldId] && !fieldChoices[fld.showIf.fieldId].includes(fld.showIf.equals)) {
            return `field "${fld.id}".showIf: "${fld.showIf.equals}" is not a current option of "${fld.showIf.fieldId}" (options are: ${fieldChoices[fld.showIf.fieldId].join(", ")}) — this field would never show. Update the condition or the field's options together.`;
          }
        }
        if (fld.type === "file" && fld.accept !== undefined) {
          if (!Array.isArray(fld.accept) || !fld.accept.every(a => FILE_ACCEPT.has(a))) {
            return `field "${fld.id}": accept may only contain ${[...FILE_ACCEPT].join(", ")}`;
          }
        }
        if (fld.type === "file" && fld.extractMap !== undefined) {
          if (typeof fld.extractMap !== "object" || fld.extractMap === null || Array.isArray(fld.extractMap)) {
            return `field "${fld.id}": extractMap must be an object of { fieldId: path }`;
          }
          if (Object.keys(fld.extractMap).length > MAX_EXTRACT_MAP) return `field "${fld.id}": too many extractMap entries`;
          if (!Object.values(fld.extractMap).every(v => typeof v === "string")) return `field "${fld.id}": extractMap values must be strings`;
        }
        if (fld.type === "computed") {
          if (fld.priced !== undefined && typeof fld.priced !== "boolean") {
            return `field "${fld.id}": priced must be true/false`;
          }
          for (const key of ["selfField", "publisherField"]) {
            if (fld[key] !== undefined && fld[key] !== "" && fieldTypes[fld[key]] !== "number") {
              return `field "${fld.id}": ${key} must reference a Number field defined on an earlier step`;
            }
          }
          if (fld.rate !== undefined && (typeof fld.rate !== "number" || !Number.isFinite(fld.rate) || fld.rate < 0)) {
            return `field "${fld.id}": rate must be a non-negative number`;
          }
          if (fld.terms !== undefined) {
            if (!Array.isArray(fld.terms)) return `field "${fld.id}": terms must be an array`;
            if (fld.terms.length > MAX_TERMS) return `field "${fld.id}": at most ${MAX_TERMS} terms`;
            for (const t of fld.terms) {
              if (!t || typeof t !== "object" || typeof t.field !== "string" || !t.field) return `field "${fld.id}": each term needs a field`;
              if (fieldTypes[t.field] !== "number") return `field "${fld.id}": term "${t.field}" must be a Number field defined on an earlier step`;
              if (t.factor !== undefined && (typeof t.factor !== "number" || !Number.isFinite(t.factor))) return `field "${fld.id}": term factor must be a number`;
            }
          }
          if (fld.gateOn !== undefined && fld.gateOn !== "" && !fieldTypes[fld.gateOn]) {
            return `field "${fld.id}": gateOn references "${fld.gateOn}" which is not an earlier field`;
          }
        }
        fieldIds.add(fld.id);
        fieldTypes[fld.id] = fld.type;
        if (fld.type === "select" || fld.type === "choice") fieldChoices[fld.id] = fld.options;
        if (fld.type === "yesno") fieldChoices[fld.id] = ["Yes", "No"];
      }
    }
  }
  return null;
}

function normalizeFlow(f) {
  return {
    id: String(f.id),
    name: String(f.name).trim().slice(0, SHORT),
    active: Boolean(f.active ?? true),
    attioLabel: String(f.attioLabel || "").trim().slice(0, SHORT),
    attioProject: String(f.attioProject || "").trim().slice(0, SHORT),
    intro: String(f.intro || "").trim().slice(0, LONG),
    submitLabel: String(f.submitLabel || "Submit").trim().slice(0, SHORT),
    successTitle: String(f.successTitle || "Thanks — you're registered.").trim().slice(0, SHORT),
    successBody: String(f.successBody || "We'll be in touch shortly.").trim().slice(0, LONG),
    steps: f.steps.map(s => ({
      id: String(s.id),
      title: String(s.title).trim().slice(0, SHORT),
      ...(s.showIf && s.showIf.fieldId
        ? { showIf: { fieldId: String(s.showIf.fieldId), equals: String(s.showIf.equals) } }
        : {}),
      fields: s.fields.map(normalizeField),
    })),
  };
}

function normalizeField(fld) {
  const out = {
    id: String(fld.id),
    type: String(fld.type),
    label: String(fld.label).trim().slice(0, SHORT),
    required: Boolean(fld.required),
  };
  if (fld.hideLabel) out.hideLabel = true;
  if (fld.showIf && fld.showIf.fieldId) {
    out.showIf = { fieldId: String(fld.showIf.fieldId), equals: String(fld.showIf.equals) };
  }
  if (fld.type === "select" || fld.type === "choice") {
    out.options = fld.options.map(o => String(o).trim().slice(0, SHORT));
  }
  if (fld.type === "number" && fld.placeholder) {
    out.placeholder = String(fld.placeholder).trim().slice(0, SHORT);
  }
  if (fld.type === "computed") {
    if (fld.priced) {
      out.priced = true;
      if (fld.selfField) out.selfField = String(fld.selfField).slice(0, 60);
      if (fld.publisherField) out.publisherField = String(fld.publisherField).slice(0, 60);
    } else {
      out.rate = typeof fld.rate === "number" && Number.isFinite(fld.rate) ? fld.rate : 0;
      out.terms = Array.isArray(fld.terms)
        ? fld.terms
            .filter(t => t && typeof t.field === "string" && t.field)
            .slice(0, MAX_TERMS)
            .map(t => ({ field: String(t.field), factor: typeof t.factor === "number" && Number.isFinite(t.factor) ? t.factor : 0 }))
        : [];
    }
    if (typeof fld.prefix === "string") out.prefix = fld.prefix.slice(0, 8);
    if (typeof fld.suffix === "string") out.suffix = fld.suffix.slice(0, 8);
    if (fld.gateOn) out.gateOn = String(fld.gateOn).slice(0, 80);
  }
  if (fld.type === "file") {
    out.accept = Array.isArray(fld.accept) && fld.accept.length ? fld.accept : ["pdf", "png", "jpg"];
    if (fld.help) out.help = String(fld.help).trim().slice(0, SHORT);
    if (fld.skipLabel) out.skipLabel = String(fld.skipLabel).trim().slice(0, SHORT);
    if (fld.extract) out.extract = String(fld.extract).trim().slice(0, 60);
    if (fld.extractMap && typeof fld.extractMap === "object" && !Array.isArray(fld.extractMap)) {
      const map = {};
      for (const [k, v] of Object.entries(fld.extractMap).slice(0, MAX_EXTRACT_MAP)) {
        if (typeof v === "string" && v.trim()) map[String(k).slice(0, 60)] = v.trim().slice(0, 120);
      }
      if (Object.keys(map).length) out.extractMap = map;
    }
  } else if (fld.help) {
    out.help = String(fld.help).trim().slice(0, SHORT);
  }
  if (fld.type === "link-confirm") {
    if (fld.url) out.url = String(fld.url).trim().slice(0, 300);
    if (fld.linkText) out.linkText = String(fld.linkText).trim().slice(0, SHORT);
    if (fld.confirmLabel) out.confirmLabel = String(fld.confirmLabel).trim().slice(0, SHORT);
  }
  // Optional expandable explainer under the field (label + body text)
  if (fld.moreInfo && typeof fld.moreInfo === "object" && String(fld.moreInfo.body || "").trim()) {
    out.moreInfo = {
      label: String(fld.moreInfo.label || "More info").trim().slice(0, SHORT),
      body: String(fld.moreInfo.body).trim().slice(0, 1000),
    };
  }
  return out;
}
