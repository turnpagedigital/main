import React, { useState } from "react";
import { FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";
import { useTabData } from "./useTabData.js";

/* FlowsTab — build multi-step registration flows (src/data/forms.json).
 *
 * A flow = ordered steps, each step = fields. Steps may carry a showIf
 * condition on a choice/select/yesno field from an EARLIER step, which makes
 * the public wizard branch. Drop the "Registration Flow" section onto any
 * Page Builder page and pick a flow to put it live. Submissions land in the
 * notification inbox (and Attio once ATTIO_API_KEY is configured).
 */

const FIELD_TYPES = [
  { value: "text",     label: "Text" },
  { value: "email",    label: "Email" },
  { value: "phone",    label: "Phone" },
  { value: "textarea", label: "Long text" },
  { value: "select",   label: "Dropdown" },
  { value: "choice",   label: "Multiple choice (buttons)" },
  { value: "yesno",    label: "Yes / No" },
  { value: "file",     label: "File upload" },
];

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "item";

function blankField() {
  return { id: "", type: "text", label: "", required: false };
}
function blankStep(n) {
  return { id: `step-${n}`, title: "", fields: [blankField()] };
}
function blankFlow() {
  return {
    id: "", name: "", active: false, attioLabel: "", intro: "",
    submitLabel: "Submit registration",
    successTitle: "Thanks — you're registered.",
    successBody: "We'll be in touch within 48 hours.",
    steps: [blankStep(1)],
  };
}

function sanitizeFlow(f) {
  return {
    id: f.id || "", name: f.name || "", active: f.active !== false,
    attioLabel: f.attioLabel || "", intro: f.intro || "",
    submitLabel: f.submitLabel || "Submit",
    successTitle: f.successTitle || "", successBody: f.successBody || "",
    steps: Array.isArray(f.steps) ? f.steps.map(s => ({
      id: s.id || "", title: s.title || "",
      ...(s.showIf && s.showIf.fieldId ? { showIf: { fieldId: s.showIf.fieldId, equals: s.showIf.equals ?? "" } } : {}),
      fields: Array.isArray(s.fields) ? s.fields.map(fl => ({
        id: fl.id || "", type: fl.type || "text", label: fl.label || "",
        required: Boolean(fl.required),
        ...(fl.options ? { options: fl.options } : {}),
        ...(fl.accept ? { accept: fl.accept } : {}),
        ...(fl.help ? { help: fl.help } : {}),
      })) : [],
    })) : [],
  };
}

export default function FlowsTab({ onDirtyChange }) {
  const { data, setData, phase, error, dirty, lastSavedAt, save } = useTabData({
    endpoint: "/api/admin/forms",
    parse: body => ({ flows: (body.data.flows || []).map(sanitizeFlow) }),
    serialize: data => ({ flows: data.flows }),
    onDirtyChange,
  });
  const [openFlow, setOpenFlow] = useState(null);

  if (phase === "loading" && !data) return <CenteredMessage>Loading flows…</CenteredMessage>;
  if (phase === "error" && !data)   return <CenteredMessage>Couldn't load: {error}</CenteredMessage>;
  if (!data) return null;

  const flows = data.flows;
  const setFlows = (next) => setData({ ...data, flows: next });
  const updateFlow = (i, patch) => setFlows(flows.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  function addFlow() {
    setFlows([...flows, blankFlow()]);
    setOpenFlow(flows.length);
  }
  function removeFlow(i) {
    if (!window.confirm(`Delete flow "${flows[i].name || flows[i].id}"? Pages using it will render nothing until repointed.`)) return;
    setFlows(flows.filter((_, idx) => idx !== i));
    setOpenFlow(null);
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: "0.85rem", color: INK_60, maxWidth: 560 }}>
          Multi-step registration wizards for landing pages. Build the flow here, then add a
          <strong> Registration Flow</strong> section to a page in the Page Builder and pick it.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {lastSavedAt && <span style={{ fontSize: "0.75rem", color: INK_60 }}>Saved {formatTime(lastSavedAt)}</span>}
          <button style={btnStyle} onClick={addFlow}>+ New flow</button>
          <button style={{ ...btnPrimaryStyle, opacity: dirty ? 1 : 0.5 }} disabled={!dirty || phase === "saving"} onClick={save}>
            {phase === "saving" ? "Saving…" : "Save all"}
          </button>
        </div>
      </div>
      {error && data && <ErrorBanner message={error} />}

      {flows.length === 0 && <CenteredMessage>No flows yet — create one.</CenteredMessage>}

      {flows.map((flow, i) => (
        <FlowCard key={i} flow={flow} open={openFlow === i}
          onToggle={() => setOpenFlow(openFlow === i ? null : i)}
          onChange={patch => updateFlow(i, patch)}
          onRemove={() => removeFlow(i)} />
      ))}
    </div>
  );
}

function FlowCard({ flow, open, onToggle, onChange, onRemove }) {
  const card = { border: `1px solid ${LINE}`, borderRadius: 8, marginBottom: "0.8rem", background: "#fff" };
  const head = { display: "flex", alignItems: "center", gap: 10, padding: "0.8rem 1rem", cursor: "pointer" };
  const label = { display: "block", fontSize: "0.72rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 };
  const group = { marginBottom: "0.8rem" };

  /* All choice-like fields from earlier steps — legal showIf targets. */
  function conditionTargets(stepIndex) {
    const out = [];
    flow.steps.slice(0, stepIndex).forEach(s =>
      (s.fields || []).forEach(f => {
        if (f.type === "choice" || f.type === "select" || f.type === "yesno") out.push(f);
      }));
    return out;
  }

  const setStep = (j, patch) =>
    onChange({ steps: flow.steps.map((s, idx) => idx === j ? { ...s, ...patch } : s) });

  function addStep() {
    onChange({ steps: [...flow.steps, blankStep(flow.steps.length + 1)] });
  }
  function removeStep(j) {
    if (flow.steps.length === 1) return;
    onChange({ steps: flow.steps.filter((_, idx) => idx !== j) });
  }
  function moveStep(j, dir) {
    const next = [...flow.steps];
    const t = j + dir;
    if (t < 0 || t >= next.length) return;
    [next[j], next[t]] = [next[t], next[j]];
    onChange({ steps: next });
  }

  return (
    <div style={card}>
      <div style={head} onClick={onToggle}>
        <span style={{ fontWeight: 800, color: INK, flex: 1 }}>
          {flow.name || <em style={{ color: INK_60 }}>Untitled flow</em>}
          <span style={{ fontWeight: 400, color: INK_60, fontSize: "0.8rem", marginLeft: 8 }}>
            {flow.steps.length} step{flow.steps.length !== 1 ? "s" : ""}
          </span>
        </span>
        <span style={{
          fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 4,
          background: flow.active ? "#E7F7E2" : "#F3F4F6", color: flow.active ? "#2D8E47" : INK_60,
        }}>{flow.active ? "ACTIVE" : "INACTIVE"}</span>
        <span style={{ color: INK_60 }}>{open ? "▾" : "▸"}</span>
      </div>

      {open && (
        <div style={{ padding: "0 1rem 1rem", borderTop: `1px solid ${LINE}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginTop: "0.9rem" }}>
            <div style={group}>
              <label style={label}>Flow name</label>
              <input style={inputStyle} value={flow.name}
                onChange={e => onChange({ name: e.target.value, id: flow.id || slugify(e.target.value) })} />
            </div>
            <div style={group}>
              <label style={label}>ID (slug)</label>
              <input style={inputStyle} value={flow.id} onChange={e => onChange({ id: slugify(e.target.value) })} />
            </div>
            <div style={group}>
              <label style={label}>Attio / source label</label>
              <input style={inputStyle} value={flow.attioLabel} placeholder="e.g. bartz-landing"
                onChange={e => onChange({ attioLabel: e.target.value })} />
            </div>
          </div>

          <div style={group}>
            <label style={label}>Intro (shown above step 1)</label>
            <textarea style={{ ...inputStyle, minHeight: 50 }} value={flow.intro} onChange={e => onChange({ intro: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={group}>
              <label style={label}>Submit button label</label>
              <input style={inputStyle} value={flow.submitLabel} onChange={e => onChange({ submitLabel: e.target.value })} />
            </div>
            <div style={group}>
              <label style={label}>Success title</label>
              <input style={inputStyle} value={flow.successTitle} onChange={e => onChange({ successTitle: e.target.value })} />
            </div>
            <div style={group}>
              <label style={label}>Success body</label>
              <input style={inputStyle} value={flow.successBody} onChange={e => onChange({ successBody: e.target.value })} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0.2rem 0 1rem", fontSize: "0.85rem", color: INK, cursor: "pointer" }}>
            <input type="checkbox" checked={flow.active} onChange={e => onChange({ active: e.target.checked })} />
            Active — inactive flows render nothing on the public site
          </label>

          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: INK_60, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.6rem" }}>Steps</p>
          {flow.steps.map((step, j) => (
            <StepCard key={j} step={step} index={j} total={flow.steps.length}
              conditionTargets={conditionTargets(j)}
              onChange={patch => setStep(j, patch)}
              onRemove={() => removeStep(j)}
              onMove={dir => moveStep(j, dir)} />
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.6rem" }}>
            <button style={btnStyle} onClick={addStep}>+ Add step</button>
            <button style={{ ...btnStyle, color: "#C03030", borderColor: "#E5B5B5" }} onClick={onRemove}>Delete flow</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({ step, index, total, conditionTargets, onChange, onRemove, onMove }) {
  const label = { display: "block", fontSize: "0.72rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 };
  const conditioned = Boolean(step.showIf && step.showIf.fieldId);
  const target = conditioned ? conditionTargets.find(f => f.id === step.showIf.fieldId) : null;
  const targetOptions = target
    ? (target.type === "yesno" ? ["Yes", "No"] : target.options || [])
    : [];

  const setField = (k, patch) =>
    onChange({ fields: step.fields.map((f, idx) => idx === k ? { ...f, ...patch } : f) });
  const removeField = (k) => {
    if (step.fields.length === 1) return;
    onChange({ fields: step.fields.filter((_, idx) => idx !== k) });
  };

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: "0.8rem", marginBottom: "0.7rem", background: "#F9FAFB" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: "0.6rem" }}>
        <div style={{ flex: 1 }}>
          <label style={label}>Step {index + 1} title</label>
          <input style={inputStyle} value={step.title}
            onChange={e => onChange({ title: e.target.value, id: step.id || slugify(e.target.value) })} />
        </div>
        <button style={iconBtnStyle} title="Move up" disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
        <button style={iconBtnStyle} title="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>↓</button>
        <button style={{ ...iconBtnStyle, color: "#C03030" }} title="Delete step" disabled={total === 1} onClick={onRemove}>✕</button>
      </div>

      {/* Branching condition */}
      <div style={{ marginBottom: "0.7rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.82rem", color: INK, cursor: conditionTargets.length ? "pointer" : "not-allowed", opacity: conditionTargets.length ? 1 : 0.55 }}>
          <input type="checkbox" disabled={!conditionTargets.length} checked={conditioned}
            onChange={e => onChange({ showIf: e.target.checked && conditionTargets.length ? { fieldId: conditionTargets[0].id, equals: (conditionTargets[0].type === "yesno" ? "Yes" : (conditionTargets[0].options || [""])[0]) } : undefined })} />
          Only show this step when…
          {!conditionTargets.length && <em style={{ color: INK_60 }}>(needs a choice/dropdown/yes-no field on an earlier step)</em>}
        </label>
        {conditioned && (
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <select style={selectStyle} value={step.showIf.fieldId}
              onChange={e => {
                const t = conditionTargets.find(f => f.id === e.target.value);
                onChange({ showIf: { fieldId: e.target.value, equals: t ? (t.type === "yesno" ? "Yes" : (t.options || [""])[0]) : "" } });
              }}>
              {conditionTargets.map(f => <option key={f.id} value={f.id}>{f.label || f.id}</option>)}
            </select>
            <span style={{ alignSelf: "center", fontSize: "0.82rem", color: INK_60 }}>equals</span>
            <select style={selectStyle} value={step.showIf.equals}
              onChange={e => onChange({ showIf: { ...step.showIf, equals: e.target.value } })}>
              {targetOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
      </div>

      {(step.fields || []).map((field, k) => (
        <FieldRow key={k} field={field}
          onChange={patch => setField(k, patch)}
          onRemove={() => removeField(k)}
          removable={step.fields.length > 1} />
      ))}
      <button style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.35rem 0.7rem" }}
        onClick={() => onChange({ fields: [...step.fields, blankField()] })}>+ Add field</button>
    </div>
  );
}

function FieldRow({ field, onChange, onRemove, removable }) {
  const hasOptions = field.type === "select" || field.type === "choice";
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 5, padding: "0.6rem", marginBottom: "0.55rem", background: "#fff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto auto", gap: 8, alignItems: "center" }}>
        <input style={inputStyle} placeholder="Question / label" value={field.label}
          onChange={e => onChange({ label: e.target.value, id: field.id || slugify(e.target.value).replace(/-/g, "_") })} />
        <select style={selectStyle} value={field.type} onChange={e => onChange({ type: e.target.value })}>
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: INK_60, cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={field.required} onChange={e => onChange({ required: e.target.checked })} />
          Required
        </label>
        <button style={{ ...iconBtnStyle, color: "#C03030", visibility: removable ? "visible" : "hidden" }} title="Delete field" onClick={onRemove}>✕</button>
      </div>
      {hasOptions && (
        <textarea style={{ ...inputStyle, minHeight: 56, marginTop: 6, fontSize: "0.82rem" }}
          placeholder={"One option per line"}
          value={(field.options || []).join("\n")}
          onChange={e => onChange({ options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })} />
      )}
      {field.type === "file" && (
        <input style={{ ...inputStyle, marginTop: 6, fontSize: "0.82rem" }}
          placeholder="Helper text, e.g. PDF or image, up to 8 MB"
          value={field.help || ""}
          onChange={e => onChange({ help: e.target.value })} />
      )}
    </div>
  );
}
