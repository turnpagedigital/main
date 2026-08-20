import React, { useState } from "react";
import { FONT, INK, INK_60, LINE, NEON } from "../../data/tokens.js";
import { inputStyle, selectStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";
import { useTabData } from "./useTabData.js";
import { sectionsFingerprint } from "../../lib/section-fingerprint.js";
import { Wizard } from "../../components/sections/RegistrationFlowSection.jsx";
import pageCompositionsData from "../../data/page-compositions.json";

// Where a flow is actually placed (a registration-flow section pointing at
// this flow id), read from the last-deployed page-compositions.json — same
// staleness tradeoff as the "Flow" picker in Page Builder's own section
// fields, which reads this same file the same way. Used to preview a flow
// with its REAL page styling (colors, layout, headline) instead of a
// generic placeholder — a flow can be placed on more than one page, so this
// returns every match and lets the admin pick.
function findFlowPlacements(flowId) {
  const out = [];
  for (const p of pageCompositionsData.pages || []) {
    for (const s of p.sections || []) {
      if (s.type === "registration-flow" && s.content && s.content.flowId === flowId) {
        out.push({ pageKey: p.pageKey, pageTitle: p.title || p.pageKey, path: p.path, sectionId: s.id, content: s.content });
      }
    }
  }
  return out;
}

/* FlowsTab — build multi-step registration flows (src/data/forms.json).
 *
 * A flow = ordered steps, each step = fields. Steps may carry a showIf
 * condition on a choice/select/yesno field from an EARLIER step, which makes
 * the public wizard branch. A FIELD may also carry its own showIf, targeting
 * an earlier choice/select/yesno field on the same step (or an earlier step)
 * — this is what lets a branch driver (e.g. Author/Publisher) and its
 * branch-specific fields render together on one page instead of each branch
 * needing its own step. Renaming a choice/select field's options does NOT
 * update any showIf that pointed at the old option text — the server
 * rejects a save that would leave a condition stale (see forms.js), and the
 * "Only show this X when…" controls flag it inline so it's fixable in place.
 * Drop the "Registration Flow" section onto any Page Builder page and pick a
 * flow to put it live. Submissions land in the notification inbox (and
 * Attio once ATTIO_API_KEY is configured).
 *
 * "Live preview" (per flow, while its card is open) renders the exact same
 * Wizard component the public site uses, fed straight from this tab's
 * in-progress (unsaved) edit state — so it updates as you type, before you
 * hit Save. It runs in previewMode: clicking through to the end fakes the
 * success screen instead of actually POSTing to /api/register, so it can
 * never send a real notification email, Sheet row, or Attio push.
 *
 * Includes an AI flow generator (POST /api/admin/flow-generator) that
 * creates a complete flow from a plain-English description. Requires
 * ANTHROPIC_API_KEY in Cloudflare environment variables.
 */

const FIELD_TYPES = [
  { value: "text",     label: "Text" },
  { value: "email",    label: "Email" },
  { value: "phone",    label: "Phone" },
  { value: "number",   label: "Number" },
  { value: "textarea", label: "Long text" },
  { value: "select",   label: "Dropdown" },
  { value: "choice",   label: "Multiple choice (buttons)" },
  { value: "yesno",    label: "Yes / No" },
  { value: "file",     label: "File upload" },
  { value: "computed", label: "Computed price" },
  { value: "works-summary", label: "Works summary (from claim form)" },
  { value: "link-confirm", label: "External link + QR + confirm checkbox (e.g. KYC)" },
];

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "item";

function blankField() {
  return { id: "", type: "text", label: "", required: false };
}
function blankStep(n) {
  return { id: `step-${n}`, heading: "", fields: [blankField()] };
}
function blankFlow() {
  return {
    id: "", name: "", active: false, attioLabel: "", attioProject: "", intro: "",
    submitLabel: "Submit registration",
    successTitle: "Thanks — you're registered.",
    successBody: "We'll be in touch within 48 hours.",
    steps: [blankStep(1)],
  };
}

function sanitizeFlow(f) {
  return {
    id: f.id || "", name: f.name || "", active: f.active !== false,
    attioLabel: f.attioLabel || "", attioProject: f.attioProject || "", intro: f.intro || "",
    submitLabel: f.submitLabel || "Submit",
    successTitle: f.successTitle || "", successBody: f.successBody || "",
    steps: Array.isArray(f.steps) ? f.steps.map(s => ({
      id: s.id || "", heading: s.heading || "", title: s.title || "", explainer: s.explainer || "",
      disclaimer: s.disclaimer || "",
      optional: Boolean(s.optional),
      ...(s.showIf && s.showIf.fieldId ? { showIf: { fieldId: s.showIf.fieldId, equals: s.showIf.equals ?? "" } } : {}),
      fields: Array.isArray(s.fields) ? s.fields.map(fl => ({
        id: fl.id || "", type: fl.type || "text", label: fl.label || "",
        required: Boolean(fl.required),
        ...(fl.hideLabel ? { hideLabel: true } : {}),
        ...(fl.row ? { row: fl.row } : {}),
        ...(fl.showIf && fl.showIf.fieldId ? { showIf: { fieldId: fl.showIf.fieldId, equals: fl.showIf.equals ?? "" } } : {}),
        ...(fl.options ? { options: fl.options } : {}),
        ...(fl.accept ? { accept: fl.accept } : {}),
        ...(fl.help ? { help: fl.help } : {}),
        ...(fl.moreInfo && fl.moreInfo.body ? { moreInfo: { label: fl.moreInfo.label || "More info", body: fl.moreInfo.body } } : {}),
        ...(fl.type === "link-confirm" ? {
          ...(fl.url ? { url: fl.url } : {}),
          ...(fl.linkText ? { linkText: fl.linkText } : {}),
          ...(fl.confirmLabel ? { confirmLabel: fl.confirmLabel } : {}),
        } : {}),
        ...(fl.type === "file" && fl.extract ? { extract: fl.extract } : {}),
        ...(fl.type === "file" && fl.extractMap && typeof fl.extractMap === "object" ? { extractMap: fl.extractMap } : {}),
        ...(fl.type === "file" && fl.skipLabel ? { skipLabel: fl.skipLabel } : {}),
        ...(fl.type === "number" && fl.placeholder ? { placeholder: fl.placeholder } : {}),
        ...(fl.type === "computed" ? {
          ...(fl.priced ? { priced: true } : {}),
          ...(fl.selfField ? { selfField: fl.selfField } : {}),
          ...(fl.publisherField ? { publisherField: fl.publisherField } : {}),
          ...(!fl.priced && fl.rate != null ? { rate: typeof fl.rate === "number" ? fl.rate : Number(fl.rate) || 0 } : {}),
          ...(!fl.priced && Array.isArray(fl.terms) ? { terms: fl.terms.map(t => ({ field: t.field || "", factor: typeof t.factor === "number" ? t.factor : Number(t.factor) || 0 })) } : {}),
          ...(fl.prefix != null ? { prefix: fl.prefix } : {}),
          ...(fl.suffix != null ? { suffix: fl.suffix } : {}),
          ...(fl.gateOn ? { gateOn: fl.gateOn } : {}),
        } : {}),
      })) : [],
    })) : [],
  };
}

// Field ids must be unique within a flow (the server rejects duplicates, and
// showIf / computed fields reference them by id). Keep every id that's already
// unique — so existing references stay valid — and re-mint only blank or
// duplicated ids from the field's own label. Safety net over per-field id
// generation: two fields that both ended up "p" become "phone" and
// "publisher_name" on save.
function dedupeFieldIds(flow) {
  const counts = {};
  (flow.steps || []).forEach(s => (s.fields || []).forEach(f => {
    if (f && f.id) counts[f.id] = (counts[f.id] || 0) + 1;
  }));
  const used = new Set(Object.keys(counts).filter(id => counts[id] === 1));
  const mint = (base) => {
    const root = base || "field";
    let id = root, n = 2;
    while (used.has(id)) id = `${root}_${n++}`;
    used.add(id);
    return id;
  };
  return {
    ...flow,
    steps: (flow.steps || []).map(s => ({
      ...s,
      fields: (s.fields || []).map(f => {
        if (f && f.id && counts[f.id] === 1) return f; // unique → keep (preserves references)
        return { ...f, id: mint(slugify((f && f.label) || (f && f.id) || "field").replace(/-/g, "_")) };
      }),
    })),
  };
}

export default function FlowsTab({ onDirtyChange }) {
  const { data, setData, phase, error, dirty, lastSavedAt, save, load, conflict } = useTabData({
    endpoint: "/api/admin/forms",
    parse: body => ({ flows: (body.data.flows || []).map(sanitizeFlow), _baseVersion: sectionsFingerprint(body.data.flows || []) }),
    serialize: data => ({ flows: data.flows.map(dedupeFieldIds), baseVersion: data._baseVersion }),
    onDirtyChange,
  });
  const [openFlow, setOpenFlow] = useState(null);

  // AI generator state
  const [showGen, setShowGen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genPhase, setGenPhase] = useState("idle"); // idle | loading | error
  const [genError, setGenError] = useState("");

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

  async function generateFlow() {
    if (!genPrompt.trim()) return;
    setGenPhase("loading");
    setGenError("");
    try {
      const res = await fetch("/api/admin/flow-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: genPrompt }),
      });
      const body = await res.json();
      if (!res.ok || body.error) throw new Error(body.error || "Unknown error");
      const newFlow = sanitizeFlow({ ...body.flow, active: false });
      const newFlows = [...flows, newFlow];
      setFlows(newFlows);
      setOpenFlow(newFlows.length - 1);
      setShowGen(false);
      setGenPrompt("");
      setGenPhase("idle");
    } catch (err) {
      setGenError(err.message || "Something went wrong.");
      setGenPhase("error");
    }
  }

  return (
    <div style={{ fontFamily: FONT, maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem)" }}>

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: "0.85rem", color: INK_60, maxWidth: 560 }}>
          Multi-step registration wizards for landing pages. Build the flow here, then add a
          <strong> Registration Flow</strong> section to a page in the Page Builder and pick it.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {lastSavedAt && <span style={{ fontSize: "0.75rem", color: INK_60 }}>Saved {formatTime(lastSavedAt)}</span>}
          <button style={btnStyle} onClick={() => { setShowGen(g => !g); setGenPhase("idle"); setGenError(""); }}>
            {showGen ? "Cancel" : "✦ Generate with AI"}
          </button>
          <button style={btnStyle} onClick={addFlow}>+ New flow</button>
          <button style={{ ...btnPrimaryStyle, opacity: dirty ? 1 : 0.5 }} disabled={!dirty || phase === "saving"} onClick={save}>
            {phase === "saving" ? "Saving…" : "Save all"}
          </button>
        </div>
      </div>

      {/* AI generator panel */}
      {showGen && (
        <div style={{
          border: `1.5px solid ${NEON}`,
          borderRadius: 8,
          padding: "1.1rem 1.2rem",
          background: "#FAFFF0",
          marginBottom: "1.2rem",
        }}>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, color: INK, marginBottom: "0.25rem" }}>
            ✦ Generate a flow with AI
          </p>
          <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.75rem", lineHeight: 1.6 }}>
            Describe what you want to collect and who the registrant is. The AI will draft steps, fields, and branching logic — you review and save.
          </p>
          <textarea
            style={{
              ...inputStyle,
              minHeight: 90,
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
            placeholder={'e.g. “3-step intake for crypto claim holders — find out which exchange, claim size range, whether they’ve already filed, then collect contact info. Branch to an extra step about legal representation if the claim is over $50k.”'}
            value={genPrompt}
            onChange={e => setGenPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generateFlow(); }}
          />
          {genError && (
            <p style={{ color: "#C03030", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
              {genError}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              style={{
                ...btnPrimaryStyle,
                opacity: genPhase === "loading" || !genPrompt.trim() ? 0.55 : 1,
                cursor: genPhase === "loading" || !genPrompt.trim() ? "default" : "pointer",
              }}
              disabled={genPhase === "loading" || !genPrompt.trim()}
              onClick={generateFlow}
            >
              {genPhase === "loading" ? "Generating…" : "Generate flow"}
            </button>
            <span style={{ fontSize: "0.75rem", color: INK_60 }}>⌘↵ to generate</span>
            {genPhase === "loading" && (
              <span style={{ fontSize: "0.78rem", color: INK_60 }}>Calling Claude — usually 5–10 seconds…</span>
            )}
          </div>
        </div>
      )}

      {error && data && <ErrorBanner message={error} action={conflict ? { label: "Load latest version", onClick: load } : undefined} />}
      {flows.length === 0 && !showGen && <CenteredMessage>No flows yet — create one or generate with AI.</CenteredMessage>}

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
  const [previewOpen, setPreviewOpen] = useState(false);
  // Bumping this remounts the preview Wizard from step 1 with fresh answers
  // (the "Restart" button) — otherwise it keeps whatever step/answers state
  // it already had as you keep editing elsewhere, which is usually what you
  // want (a field's label changing shouldn't kick you back to step 1).
  const [previewKey, setPreviewKey] = useState(0);
  const [previewWide, setPreviewWide] = useState(false);
  const placements = findFlowPlacements(flow.id);
  const [placementIdx, setPlacementIdx] = useState(0);
  const activePlacement = placements[Math.min(placementIdx, placements.length - 1)];

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
        }}>{flow.active ? "ACTIVE" : "DRAFT"}</span>
        {open && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setPreviewOpen(v => !v); }}
            style={{
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.7rem",
              borderRadius: 4, border: `1px solid ${previewOpen ? INK : NEON}`,
              background: previewOpen ? INK : "transparent", color: previewOpen ? NEON : INK,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {previewOpen ? "✕ Close preview" : "▶ Live preview"}
          </button>
        )}
        <span style={{ color: INK_60 }}>{open ? "▾" : "▸"}</span>
      </div>

      {open && previewOpen && (() => {
        const c = activePlacement ? activePlacement.content : {};
        return (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: previewWide ? "min(900px, 96vw)" : "min(440px, 100vw)",
          background: "#F4F5F7", borderLeft: `1px solid ${LINE}`, boxShadow: "-6px 0 28px rgba(0,0,0,0.16)",
          zIndex: 50, display: "flex", flexDirection: "column",
          transition: "width 0.15s ease",
        }}>
          <div style={{ background: "#fff", borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.8rem 1rem", gap: 8,
            }}>
              <strong style={{ fontFamily: FONT, fontSize: "0.85rem", color: INK }}>
                Live preview — {flow.name || "Untitled flow"}
              </strong>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" onClick={() => setPreviewWide(w => !w)} title={previewWide ? "Narrow the preview panel" : "Widen the preview panel"}
                  style={{ ...btnStyle, fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>
                  {previewWide ? "⤡ Narrow" : "⤢ Widen"}
                </button>
                <button type="button" onClick={() => setPreviewKey(k => k + 1)} title="Restart from step 1"
                  style={{ ...btnStyle, fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>
                  ↺ Restart
                </button>
                <button type="button" onClick={() => setPreviewOpen(false)} title="Close preview"
                  style={{ ...btnStyle, fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>
                  ✕
                </button>
              </div>
            </div>
            {placements.length > 1 && (
              <div style={{ padding: "0 1rem 0.7rem" }}>
                <label style={{ ...label, marginBottom: 3 }}>This flow is placed on {placements.length} pages — preview which one?</label>
                <select style={selectStyle} value={placementIdx} onChange={e => setPlacementIdx(Number(e.target.value))}>
                  {placements.map((p, i) => <option key={p.pageKey + p.sectionId} value={i}>{p.pageTitle} ({p.path})</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Wizard key={`${previewKey}-${activePlacement ? activePlacement.sectionId : "none"}`} flow={flow} previewMode
              pageKey={activePlacement ? activePlacement.pageKey : undefined}
              eyebrow={c.eyebrow} title={c.title} accent={c.accent}
              layout={c.layout || "center"} colorScheme={c.colorScheme}
              backgroundImage={c.backgroundImage} imageFilter={c.imageFilter} imageFilterStrength={c.imageFilterStrength}
              cardRadius={c.cardRadius} cardStyle={c.cardStyle} cardColor={c.cardColor}
              formScale={c.formScale} disclosure={c.disclosure} align={c.align} cardAlign={c.cardAlign} />
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: INK_60, lineHeight: 1.6, padding: "0 1.25rem 1.5rem" }}>
              {activePlacement
                ? <>Matches how this flow actually looks on <strong>{activePlacement.pageTitle}</strong> ({activePlacement.path}) as last deployed — colors, layout, and headline included. Fields/steps reflect your unsaved edits live. Exact spacing can differ slightly from the full site since this panel isn't full browser width. It never submits for real — clicking through fakes the success screen.</>
                : <>This flow isn't placed on any page yet, so there's no real styling to match — showing a generic layout. Fields/steps reflect your unsaved edits live. It never submits for real — clicking through fakes the success screen.</>}
            </p>
          </div>
        </div>
        );
      })()}

      {open && (
        <div style={{ padding: "0 1rem 1rem", borderTop: `1px solid ${LINE}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginTop: "0.9rem" }}>
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
            <div style={group}>
              <label style={label}>Attio project (deal prefix)</label>
              <input style={inputStyle} value={flow.attioProject || ""} placeholder="e.g. Bartz"
                onChange={e => onChange({ attioProject: e.target.value })} />
            </div>
          </div>

          <div style={group}>
            <label style={label}>Intro (shown above step 1)</label>
            <textarea style={{ ...inputStyle, minHeight: 50 }} value={flow.intro} onChange={e => onChange({ intro: e.target.value })} />
            <p style={{ fontSize: "0.72rem", color: INK_60, marginTop: 3 }}>
              Markdown — press Enter once for a line break within the same line, leave a blank line to start a new (smaller, muted) paragraph, **bold** works. The first paragraph is the bold lead line.
            </p>
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
              priorStepFields={flow.steps.slice(0, j).flatMap(s => s.fields || [])}
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

function StepCard({ step, index, total, conditionTargets, priorStepFields = [], onChange, onRemove, onMove }) {
  const label = { display: "block", fontSize: "0.72rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 };
  const [collapsed, setCollapsed] = useState(false);
  const conditioned = Boolean(step.showIf && step.showIf.fieldId);
  const target = conditioned ? conditionTargets.find(f => f.id === step.showIf.fieldId) : null;
  const targetOptions = target
    ? (target.type === "yesno" ? ["Yes", "No"] : target.options || [])
    : [];
  const staleCondition = conditioned && target && !targetOptions.includes(step.showIf.equals);

  const setField = (k, patch) =>
    onChange({ fields: step.fields.map((f, idx) => idx === k ? { ...f, ...patch } : f) });
  const removeField = (k) => {
    if (step.fields.length === 1) return;
    onChange({ fields: step.fields.filter((_, idx) => idx !== k) });
  };
  function moveField(k, dir) {
    const next = [...step.fields];
    const t = k + dir;
    if (t < 0 || t >= next.length) return;
    [next[k], next[t]] = [next[t], next[k]];
    onChange({ fields: next });
  }

  const fieldCount = (step.fields || []).length;
  const badges = [
    conditioned && !staleCondition && "conditional",
    staleCondition && "⚠ broken condition",
    step.optional && "skippable",
  ].filter(Boolean);

  return (
    <div style={{ border: `1.5px solid ${LINE}`, borderRadius: 8, marginBottom: "0.9rem", background: "#fff", overflow: "hidden" }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.7rem 0.8rem", background: "#EEF0F3", cursor: "pointer" }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          width: 26, height: 26, borderRadius: "50%", background: INK, color: "#fff",
          fontSize: "0.78rem", fontWeight: 800,
        }}>{index + 1}</span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontWeight: 700, fontSize: "0.9rem", color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {step.heading || <em style={{ color: INK_60, fontWeight: 400 }}>Untitled step</em>}
          <span style={{ fontWeight: 400, color: INK_60, fontSize: "0.76rem", marginLeft: 8 }}>
            {fieldCount} field{fieldCount !== 1 ? "s" : ""}{badges.length ? ` · ${badges.join(" · ")}` : ""}
          </span>
        </span>
        <button style={iconBtnStyle(index === 0)} title="Move up" disabled={index === 0} onClick={e => { e.stopPropagation(); onMove(-1); }}>↑</button>
        <button style={iconBtnStyle(index === total - 1)} title="Move down" disabled={index === total - 1} onClick={e => { e.stopPropagation(); onMove(1); }}>↓</button>
        <button style={{ ...iconBtnStyle(total === 1), color: "#C03030" }} title="Delete step" disabled={total === 1} onClick={e => { e.stopPropagation(); onRemove(); }}>✕</button>
        <span style={{ color: INK_60, flexShrink: 0, width: 14, textAlign: "center" }}>{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
      <div style={{ padding: "0.9rem", background: "#F9FAFB" }}>
      <div style={{ marginBottom: "0.6rem" }}>
        <label style={label}>Title (optional, small text shown above the question)</label>
        <input style={inputStyle} placeholder="e.g. Almost there" value={step.title || ""}
          onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div style={{ marginBottom: "0.6rem" }}>
        <label style={label}>Question / heading (required — this is the big text people actually see)</label>
        <input style={inputStyle} value={step.heading || ""}
          onChange={e => onChange({ heading: e.target.value, id: step.id || slugify(e.target.value) })} />
      </div>
      <div style={{ marginBottom: "0.6rem" }}>
        <label style={label}>Explainer (optional, small text shown below the question)</label>
        <textarea style={{ ...inputStyle, minHeight: 44 }} placeholder="e.g. This helps us confirm you're the rights holder."
          value={step.explainer || ""} onChange={e => onChange({ explainer: e.target.value })} />
      </div>
      <div style={{ marginBottom: "0.6rem" }}>
        <label style={label}>Disclaimer (optional, small print shown just above this step's Back/Next button)</label>
        <textarea style={{ ...inputStyle, minHeight: 44 }} placeholder='e.g. By clicking "submit" below, you confirm the accuracy of the information provided…'
          value={step.disclaimer || ""} onChange={e => onChange({ disclaimer: e.target.value })} />
        <p style={{ fontSize: "0.7rem", color: INK_60, marginTop: 3 }}>
          Different from the section's own "Disclosure" setting in Page Builder, which shows below the whole form on every step — this only shows on this one step, right before its button.
        </p>
      </div>
      <div style={{ marginBottom: "0.7rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.82rem", color: INK, cursor: "pointer" }}>
          <input type="checkbox" checked={Boolean(step.optional)} onChange={e => onChange({ optional: e.target.checked })} />
          Optional step — show a "Skip this step" link so people can move on without answering anything here
        </label>
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
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select style={selectStyle} value={step.showIf.fieldId}
              onChange={e => {
                const t = conditionTargets.find(f => f.id === e.target.value);
                onChange({ showIf: { fieldId: e.target.value, equals: t ? (t.type === "yesno" ? "Yes" : (t.options || [""])[0]) : "" } });
              }}>
              {conditionTargets.map(f => <option key={f.id} value={f.id}>{f.label || f.id}</option>)}
            </select>
            <span style={{ fontSize: "0.82rem", color: INK_60 }}>equals</span>
            <select style={selectStyle} value={staleCondition ? "" : step.showIf.equals}
              onChange={e => onChange({ showIf: { ...step.showIf, equals: e.target.value } })}>
              {staleCondition && <option value="" disabled>{step.showIf.equals} (no longer an option)</option>}
              {targetOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {staleCondition && (
              <span style={{ fontSize: "0.72rem", color: "#C03030" }}>
                ⚠ Points at an option that was renamed or removed — pick the current one.
              </span>
            )}
          </div>
        )}
      </div>

      {(step.fields || []).map((field, k) => (
        <FieldRow key={k} field={field}
          index={k}
          total={step.fields.length}
          priorFields={[...priorStepFields, ...step.fields.slice(0, k)]}
          onChange={patch => setField(k, patch)}
          onRemove={() => removeField(k)}
          onMove={dir => moveField(k, dir)}
          removable={step.fields.length > 1} />
      ))}
      <button style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.35rem 0.7rem" }}
        onClick={() => onChange({ fields: [...step.fields, blankField()] })}>+ Add field</button>
      </div>
      )}
    </div>
  );
}

function FieldRow({ field, index, total, priorFields = [], onChange, onRemove, onMove, removable }) {
  const hasOptions = field.type === "select" || field.type === "choice";
  const isComputed = field.type === "computed";
  const isNumber = field.type === "number";
  const miniLabel = { display: "block", fontSize: "0.68rem", color: INK_60, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 };
  const smallInput = { ...inputStyle, fontSize: "0.82rem" };

  // Number fields the server-priced offer can use as its work counts.
  const numberFields = priorFields.filter(f => f.type === "number" && f.id);

  // Fields this field can branch on — any earlier choice/select/yes-no field,
  // whether on a prior step or earlier in this same step (the latter is what
  // lets a branch driver like Author/Publisher and its branch-specific fields
  // share one step/page instead of each needing its own step).
  const conditionTargets = priorFields.filter(f => f.type === "choice" || f.type === "select" || f.type === "yesno");
  const conditioned = Boolean(field.showIf && field.showIf.fieldId);
  const target = conditioned ? conditionTargets.find(f => f.id === field.showIf.fieldId) : null;
  const targetOptions = target ? (target.type === "yesno" ? ["Yes", "No"] : target.options || []) : [];
  // A showIf left pointing at an option that no longer exists (e.g. someone
  // renamed "Authored" to "Author" without updating this) — the server
  // rejects saves like that, but flag it inline too so it's obvious why.
  const staleCondition = conditioned && target && !targetOptions.includes(field.showIf.equals);

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 5, padding: "0.6rem", marginBottom: "0.55rem", background: "#fff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto auto 6.5rem auto auto auto", gap: 8, alignItems: "center" }}>
        <input style={inputStyle} placeholder="Question / label" value={field.label}
          onChange={e => onChange({ label: e.target.value })}
          onBlur={e => { if (!field.id) onChange({ id: slugify(e.target.value).replace(/-/g, "_") }); }} />
        <select style={selectStyle} value={field.type} onChange={e => onChange({ type: e.target.value })}>
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: INK_60, cursor: isComputed ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: isComputed ? 0.4 : 1 }}>
          <input type="checkbox" checked={field.required} disabled={isComputed} onChange={e => onChange({ required: e.target.checked })} />
          Req
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: INK_60, cursor: "pointer", whiteSpace: "nowrap" }}
          title="Keeps the label for screen readers, just hides it visually — use when the step title already asks the question (e.g. a step titled 'I am an' directly above an Author/Publisher choice)">
          <input type="checkbox" checked={Boolean(field.hideLabel)} onChange={e => onChange({ hideLabel: e.target.checked })} />
          Hide label
        </label>
        <input style={{ ...inputStyle, fontSize: "0.78rem" }} placeholder="Row"
          title={'Give two adjacent fields the same row value (e.g. "name") to sit them side by side instead of stacked — useful for First/Last name or Email/Phone'}
          value={field.row || ""} onChange={e => onChange({ row: e.target.value })} />
        <button style={iconBtnStyle(index === 0)} title="Move up" disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
        <button style={iconBtnStyle(index === total - 1)} title="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>↓</button>
        <button style={{ ...iconBtnStyle(false), color: "#C03030", visibility: removable ? "visible" : "hidden" }} title="Delete field" onClick={onRemove}>✕</button>
      </div>

      {conditionTargets.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.78rem", color: INK, cursor: "pointer" }}>
            <input type="checkbox" checked={conditioned}
              onChange={e => onChange({ showIf: e.target.checked ? { fieldId: conditionTargets[0].id, equals: (conditionTargets[0].type === "yesno" ? "Yes" : (conditionTargets[0].options || [""])[0]) } : undefined })} />
            Only show this field when…
          </label>
          {conditioned && (
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
              <select style={selectStyle} value={field.showIf.fieldId}
                onChange={e => {
                  const t = conditionTargets.find(f => f.id === e.target.value);
                  onChange({ showIf: { fieldId: e.target.value, equals: t ? (t.type === "yesno" ? "Yes" : (t.options || [""])[0]) : "" } });
                }}>
                {conditionTargets.map(f => <option key={f.id} value={f.id}>{f.label || f.id}</option>)}
              </select>
              <span style={{ fontSize: "0.78rem", color: INK_60 }}>equals</span>
              <select style={selectStyle} value={staleCondition ? "" : field.showIf.equals}
                onChange={e => onChange({ showIf: { ...field.showIf, equals: e.target.value } })}>
                {staleCondition && <option value="" disabled>{field.showIf.equals} (no longer an option)</option>}
                {targetOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {staleCondition && (
                <span style={{ fontSize: "0.72rem", color: "#C03030" }}>
                  ⚠ Points at an option that was renamed or removed — pick the current one.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {hasOptions && (
        <textarea style={{ ...inputStyle, minHeight: 56, marginTop: 6, fontSize: "0.82rem" }}
          placeholder={"One option per line"}
          value={(field.options || []).join("\n")}
          onChange={e => onChange({ options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })} />
      )}

      {field.type === "file" && (
        <div style={{ marginTop: 6 }}>
          <input style={{ ...inputStyle, fontSize: "0.82rem" }}
            placeholder="Helper text, e.g. PDF or image, up to 8 MB"
            value={field.help || ""}
            onChange={e => onChange({ help: e.target.value })} />
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
            <label style={{ fontSize: "0.72rem", color: INK_60, fontWeight: 700, whiteSpace: "nowrap" }}>Auto-read</label>
            <input style={{ ...inputStyle, fontSize: "0.82rem" }}
              placeholder="Extractor name (e.g. bartz-claim) — leave blank for a plain upload"
              value={field.extract || ""}
              onChange={e => onChange({ extract: e.target.value.trim() })} />
          </div>
          {field.extract && (
            <p style={{ fontSize: "0.72rem", color: INK_60, margin: "4px 0 0", lineHeight: 1.5 }}>
              On upload, this file is read by the <strong>{field.extract}</strong> reader and auto-fills{" "}
              {field.extractMap ? Object.keys(field.extractMap).join(", ") : "no fields yet"}.
            </p>
          )}
          <input style={{ ...inputStyle, fontSize: "0.82rem", marginTop: 6 }}
            placeholder="Can't-upload button text (e.g. I don't have my claim form) — leave blank to require the file with no alternative"
            value={field.skipLabel || ""}
            onChange={e => onChange({ skipLabel: e.target.value })} />
          {field.skipLabel && !field.required && (
            <p style={{ fontSize: "0.72rem", color: "#B4700F", margin: "4px 0 0" }}>
              This button only appears when the field is also marked <strong>Req</strong> above — check that too, or the file stays fully optional.
            </p>
          )}
          {field.skipLabel && field.required && (
            <p style={{ fontSize: "0.72rem", color: INK_60, margin: "4px 0 0" }}>
              Renders as a button next to "Next" — clicking it satisfies this field without a file, then advances (any other required field on this step still has to be answered).
            </p>
          )}
          <input style={{ ...inputStyle, fontSize: "0.82rem", marginTop: 6 }}
            placeholder='Expandable explainer — link text (e.g. "Where do I get my claim form?")'
            value={(field.moreInfo && field.moreInfo.label) || ""}
            onChange={e => onChange({ moreInfo: { ...(field.moreInfo || {}), label: e.target.value } })} />
          <textarea style={{ ...inputStyle, fontSize: "0.82rem", marginTop: 6, minHeight: 60 }}
            placeholder="Expandable explainer — body text shown when opened"
            value={(field.moreInfo && field.moreInfo.body) || ""}
            onChange={e => onChange({ moreInfo: { ...(field.moreInfo || {}), body: e.target.value } })} />
        </div>
      )}

      {field.type === "link-confirm" && (
        <div style={{ marginTop: 6 }}>
          <input style={{ ...inputStyle, fontSize: "0.82rem" }}
            placeholder="Verification URL (e.g. your Sumsub link) — shown as button + QR code"
            value={field.url || ""}
            onChange={e => onChange({ url: e.target.value.trim() })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
            <input style={{ ...inputStyle, fontSize: "0.82rem" }}
              placeholder='Button text (e.g. "Start verification")'
              value={field.linkText || ""}
              onChange={e => onChange({ linkText: e.target.value })} />
            <input style={{ ...inputStyle, fontSize: "0.82rem" }}
              placeholder='Checkbox label (e.g. "I completed verification")'
              value={field.confirmLabel || ""}
              onChange={e => onChange({ confirmLabel: e.target.value })} />
          </div>
          <input style={{ ...inputStyle, fontSize: "0.82rem", marginTop: 6 }}
            placeholder="Helper text shown above the link (optional)"
            value={field.help || ""}
            onChange={e => onChange({ help: e.target.value })} />
        </div>
      )}

      {isNumber && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
          <input style={smallInput} placeholder="Placeholder, e.g. 0"
            value={field.placeholder || ""} onChange={e => onChange({ placeholder: e.target.value })} />
          <input style={smallInput} placeholder="Helper text (optional)"
            value={field.help || ""} onChange={e => onChange({ help: e.target.value })} />
        </div>
      )}

      {isComputed && (
        <div style={{ marginTop: 8, padding: "0.7rem 0.8rem", border: `1px dashed ${LINE}`, borderRadius: 6, background: "#FAFAF7" }}>
          <p style={{ fontSize: "0.72rem", color: "#2D8E47", margin: "0 0 0.7rem", lineHeight: 1.5 }}>
            🔒 <strong>Priced on the server.</strong> The dollar amounts and payout % live in the{" "}
            <strong>Pricing</strong> tab (Admin → Registration → Pricing) and never ship to the browser. Here you only
            choose which Number fields hold the two work counts. This field is display-only.
          </p>

          {numberFields.length === 0 && (
            <p style={{ fontSize: "0.75rem", color: "#B4700F", margin: "2px 0 6px" }}>
              Add <strong>Number</strong> fields for the work counts on an earlier step first.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={miniLabel}>Self-published count field</label>
              <select style={selectStyle} value={field.selfField || ""} onChange={e => onChange({ selfField: e.target.value, priced: true })}>
                <option value="" disabled>Select a number field…</option>
                {numberFields.map(nf => <option key={nf.id} value={nf.id}>{nf.label || nf.id}</option>)}
              </select>
            </div>
            <div>
              <label style={miniLabel}>Works-with-publisher count field</label>
              <select style={selectStyle} value={field.publisherField || ""} onChange={e => onChange({ publisherField: e.target.value, priced: true })}>
                <option value="" disabled>Select a number field…</option>
                {numberFields.map(nf => <option key={nf.id} value={nf.id}>{nf.label || nf.id}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 8, marginBottom: 8, alignItems: "end" }}>
            <div>
              <label style={miniLabel}>Prefix</label>
              <input style={{ ...smallInput, width: 60 }} placeholder="$" value={field.prefix ?? "$"} onChange={e => onChange({ prefix: e.target.value })} />
            </div>
            <div>
              <label style={miniLabel}>Suffix</label>
              <input style={{ ...smallInput, width: 60 }} placeholder="(none)" value={field.suffix ?? ""} onChange={e => onChange({ suffix: e.target.value })} />
            </div>
            <div>
              <label style={miniLabel}>Note under the price</label>
              <input style={smallInput} placeholder="e.g. Estimate — confirmed after review"
                value={field.help || ""} onChange={e => onChange({ help: e.target.value })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
