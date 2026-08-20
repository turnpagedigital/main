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
    if (!f || typeof f !== "object") return `Flow ${i + 1} isn't a valid object — try reloading the tab.`;
    if (!slugOk(f.id)) return `Flow ${i + 1}'s ID must be a lowercase slug (letters, numbers, dashes).`;
    if (seen.has(f.id)) return `Two flows both use the ID "${f.id}" — flow IDs must be unique.`;
    seen.add(f.id);
    if (typeof f.name !== "string" || !f.name.trim()) return `Flow ${i + 1} needs a name before it can be saved.`;
    const flowRef = `"${f.name.trim()}"`;
    if (!Array.isArray(f.steps) || f.steps.length === 0) return `${flowRef} needs at least one step.`;
    if (f.steps.length > MAX_STEPS) return `${flowRef}: at most ${MAX_STEPS} steps are allowed.`;

    const fieldIds = new Set();
    const fieldTypes = {}; // id -> type, for validating computed-field references
    const fieldLabels = {}; // id -> label, so error messages can name the field a broken reference points at
    const fieldChoices = {}; // id -> valid values, for choice/select/yesno fields — catches a showIf left pointing at a renamed/removed option
    for (let j = 0; j < f.steps.length; j++) {
      const s = f.steps[j];
      const stepNum = j + 1;
      if (!s || typeof s !== "object") return `${flowRef}, step ${stepNum} isn't a valid object — try reloading the tab.`;
      if (!slugOk(s.id)) return `${flowRef}, step ${stepNum}: internal ID must be a lowercase slug — try retyping its question/heading.`;
      if (typeof s.heading !== "string" || !s.heading.trim()) return `${flowRef}, step ${stepNum}: needs a question/heading before you can save.`;
      const stepRef = `${flowRef}, step "${s.heading.trim()}"`;
      if (s.title !== undefined && typeof s.title !== "string") return `${stepRef}: the optional title must be text.`;
      if (s.explainer !== undefined && typeof s.explainer !== "string") return `${stepRef}: the optional explainer must be text.`;
      if (s.optional !== undefined && typeof s.optional !== "boolean") return `${stepRef}: the "optional step" setting got corrupted — try re-toggling its checkbox.`;
      if (!Array.isArray(s.fields) || s.fields.length === 0) return `${stepRef}: add at least one field, or delete the step.`;
      if (s.fields.length > MAX_FIELDS) return `${stepRef}: at most ${MAX_FIELDS} fields per step.`;
      if (s.showIf !== undefined && s.showIf !== null) {
        if (typeof s.showIf !== "object" || !s.showIf.fieldId || typeof s.showIf.equals !== "string") {
          return `${stepRef}: its "Only show this step when…" condition is incomplete — pick both a field and a value, or turn the condition off.`;
        }
        if (!fieldIds.has(s.showIf.fieldId)) {
          const targetLabel = fieldLabels[s.showIf.fieldId];
          return `${stepRef}: its "Only show this step when…" condition points at ${targetLabel ? `"${targetLabel}"` : `a field ("${s.showIf.fieldId}")`} that no longer comes before this step in the list — either that field was moved after this step, renamed, or deleted. Re-pick the field in that dropdown, or move this step later.`;
        }
        if (fieldChoices[s.showIf.fieldId] && !fieldChoices[s.showIf.fieldId].includes(s.showIf.equals)) {
          return `${stepRef}: its "Only show this step when…" condition expects "${fieldLabels[s.showIf.fieldId] || s.showIf.fieldId}" to equal "${s.showIf.equals}", but that's no longer one of its options (current options: ${fieldChoices[s.showIf.fieldId].join(", ")}) — this step would never show. Re-pick the value in that condition.`;
        }
      }
      for (let k = 0; k < s.fields.length; k++) {
        const fld = s.fields[k];
        const fieldNum = k + 1;
        if (!fld || typeof fld !== "object") return `${stepRef}, field ${fieldNum} isn't a valid object — try reloading the tab.`;
        if (!slugOk(fld.id)) return `${stepRef}, field ${fieldNum}: internal ID must be a lowercase slug — try retyping its label.`;
        if (fieldIds.has(fld.id)) return `${stepRef}: two fields share the same internal ID ("${fld.id}") — rename one of their labels so they generate different IDs.`;
        if (typeof fld.label !== "string" || !fld.label.trim()) return `${stepRef}, field ${fieldNum}: needs a label before you can save.`;
        const fieldRef = `${stepRef} → "${fld.label.trim()}"`;
        if (!FIELD_TYPES.has(fld.type)) return `${fieldRef}: "${fld.type}" isn't a recognized field type.`;
        if (fld.row !== undefined && typeof fld.row !== "string") return `${fieldRef}: the row-pairing value must be text.`;
        if ((fld.type === "select" || fld.type === "choice")) {
          if (!Array.isArray(fld.options) || fld.options.length < 2) return `${fieldRef}: needs at least 2 options.`;
          if (fld.options.length > MAX_OPTIONS) return `${fieldRef}: at most ${MAX_OPTIONS} options.`;
          if (!fld.options.every(o => typeof o === "string" && o.trim())) return `${fieldRef}: options can't be blank.`;
        }
        if (fld.showIf !== undefined && fld.showIf !== null) {
          if (typeof fld.showIf !== "object" || !fld.showIf.fieldId || typeof fld.showIf.equals !== "string") {
            return `${fieldRef}: its "Only show this field when…" condition is incomplete — pick both a field and a value, or turn the condition off.`;
          }
          if (!fieldIds.has(fld.showIf.fieldId)) {
            const targetLabel = fieldLabels[fld.showIf.fieldId];
            return `${fieldRef}: its "Only show this field when…" condition points at ${targetLabel ? `"${targetLabel}"` : `a field ("${fld.showIf.fieldId}")`} that no longer comes before it — either that field was moved, renamed, or deleted. Re-pick the field in that dropdown.`;
          }
          if (fieldChoices[fld.showIf.fieldId] && !fieldChoices[fld.showIf.fieldId].includes(fld.showIf.equals)) {
            return `${fieldRef}: its "Only show this field when…" condition expects "${fieldLabels[fld.showIf.fieldId] || fld.showIf.fieldId}" to equal "${fld.showIf.equals}", but that's no longer one of its options (current options: ${fieldChoices[fld.showIf.fieldId].join(", ")}) — this field would never show. Re-pick the value in that condition.`;
          }
        }
        if (fld.type === "file" && fld.accept !== undefined) {
          if (!Array.isArray(fld.accept) || !fld.accept.every(a => FILE_ACCEPT.has(a))) {
            return `${fieldRef}: accepted file types may only include ${[...FILE_ACCEPT].join(", ")}.`;
          }
        }
        if (fld.type === "file" && fld.extractMap !== undefined) {
          if (typeof fld.extractMap !== "object" || fld.extractMap === null || Array.isArray(fld.extractMap)) {
            return `${fieldRef}: auto-fill mapping got corrupted — try clearing and redoing it.`;
          }
          if (Object.keys(fld.extractMap).length > MAX_EXTRACT_MAP) return `${fieldRef}: too many auto-fill mappings.`;
          if (!Object.values(fld.extractMap).every(v => typeof v === "string")) return `${fieldRef}: auto-fill mapping values must be text.`;
        }
        if (fld.type === "computed") {
          if (fld.priced !== undefined && typeof fld.priced !== "boolean") {
            return `${fieldRef}: the "priced on server" setting got corrupted — try re-toggling it.`;
          }
          for (const key of ["selfField", "publisherField"]) {
            if (fld[key] !== undefined && fld[key] !== "" && fieldTypes[fld[key]] !== "number") {
              return `${fieldRef}: its ${key === "selfField" ? "self-published count" : "publisher count"} field must be a Number field defined earlier in the flow — re-pick it.`;
            }
          }
          if (fld.rate !== undefined && (typeof fld.rate !== "number" || !Number.isFinite(fld.rate) || fld.rate < 0)) {
            return `${fieldRef}: the rate must be a number of 0 or more.`;
          }
          if (fld.terms !== undefined) {
            if (!Array.isArray(fld.terms)) return `${fieldRef}: its pricing terms got corrupted — try removing and re-adding them.`;
            if (fld.terms.length > MAX_TERMS) return `${fieldRef}: at most ${MAX_TERMS} pricing terms.`;
            for (const t of fld.terms) {
              if (!t || typeof t !== "object" || typeof t.field !== "string" || !t.field) return `${fieldRef}: every pricing term needs a field.`;
              if (fieldTypes[t.field] !== "number") return `${fieldRef}: a pricing term references "${fieldLabels[t.field] || t.field}", which must be a Number field defined earlier in the flow.`;
              if (t.factor !== undefined && (typeof t.factor !== "number" || !Number.isFinite(t.factor))) return `${fieldRef}: a pricing term's factor must be a number.`;
            }
          }
          if (fld.gateOn !== undefined && fld.gateOn !== "" && !fieldTypes[fld.gateOn]) {
            return `${fieldRef}: the field it waits on ("${fld.gateOn}") isn't defined earlier in the flow — re-pick it.`;
          }
        }
        fieldIds.add(fld.id);
        fieldTypes[fld.id] = fld.type;
        fieldLabels[fld.id] = fld.label.trim();
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
      heading: String(s.heading).trim().slice(0, SHORT),
      ...(s.title && String(s.title).trim() ? { title: String(s.title).trim().slice(0, SHORT) } : {}),
      ...(s.explainer && String(s.explainer).trim() ? { explainer: String(s.explainer).trim().slice(0, LONG) } : {}),
      ...(s.optional ? { optional: true } : {}),
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
  if (fld.row && String(fld.row).trim()) out.row = String(fld.row).trim().slice(0, 60);
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
