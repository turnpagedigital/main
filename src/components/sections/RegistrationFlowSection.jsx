import React, { useMemo, useState } from "react";
import { NEON, FONT, INK, INK_60, LINE, LINE_STRONG } from "../../data/tokens.js";
import formsData from "../../data/forms.json";
import { getAttribution, trackLead } from "../../lib/analytics.js";

/* Registration Flow — multi-step wizard section for marketing landing pages.
 *
 * Drop onto any Page Builder page and pick a flow (defined in
 * src/data/forms.json, edited via /admin/content/flows). Steps with a
 * showIf condition only appear when the named earlier answer matches, so
 * the wizard branches. File fields are read client-side and submitted as
 * base64 (server caps: 8 MB, pdf/png/jpg). Submissions POST to
 * /api/register with the flow id, page key, and ad attribution; a GA4
 * lead event fires on success when analytics is configured.
 */

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const FILE_MIME = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

export default function RegistrationFlowSection({ sectionConfig, pageKey }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const flow = (formsData.flows || []).find(f => f.id === c.flowId && f.active !== false);

  if (!flow) {
    // Misconfigured section (no flow picked, or flow deactivated) — render
    // nothing on the public site rather than a broken wizard.
    return null;
  }
  return <Wizard flow={flow} pageKey={pageKey} eyebrow={c.eyebrow} title={c.title} accent={c.accent} />;
}

function Wizard({ flow, pageKey, eyebrow, title, accent }) {
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});       // fieldId → { name, type, dataBase64 } | null
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState("");
  const [formState, setFormState] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");

  /* Steps visible given current answers — branching happens here. */
  const visibleSteps = useMemo(
    () => (flow.steps || []).filter(s => stepVisible(s, answers)),
    [flow.steps, answers],
  );
  const step = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)];
  const isLast = stepIndex >= visibleSteps.length - 1;

  function setAnswer(fieldId, value) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    setStepError("");
  }

  async function setFile(field, fileObj) {
    if (!fileObj) { setFiles(prev => ({ ...prev, [field.id]: null })); return; }
    const ext = (fileObj.name.split(".").pop() || "").toLowerCase();
    const allowed = (field.accept || ["pdf", "png", "jpg"]).map(a => a.toLowerCase());
    if (!allowed.includes(ext === "jpeg" ? "jpg" : ext)) {
      setStepError(`"${fileObj.name}" isn't an accepted type (${allowed.join(", ")}).`);
      return;
    }
    if (fileObj.size > MAX_FILE_BYTES) {
      setStepError(`"${fileObj.name}" is over the 8 MB limit.`);
      return;
    }
    const dataBase64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",", 2)[1] || "");
      r.onerror = reject;
      r.readAsDataURL(fileObj);
    });
    setFiles(prev => ({
      ...prev,
      [field.id]: { name: fileObj.name.slice(0, 200), type: FILE_MIME[ext] || fileObj.type, dataBase64 },
    }));
    setStepError("");
  }

  function validateStep() {
    for (const f of step.fields || []) {
      if (!f.required) continue;
      if (f.type === "file") {
        if (!files[f.id]) return `Please attach: ${f.label}`;
        continue;
      }
      const v = answers[f.id];
      if (v === undefined || v === null || String(v).trim() === "") {
        return `Please answer: ${f.label}`;
      }
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
        return "That email address doesn't look right.";
      }
    }
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) { setStepError(err); return; }
    setStepError("");
    if (!isLast) setStepIndex(i => i + 1);
    else submit();
  }

  function back() {
    setStepError("");
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }

  async function submit() {
    setFormState("submitting");
    setErrorMsg("");
    // Only submit answers belonging to currently-visible steps — answers
    // given on a branch the user later backed out of stay behind.
    const visibleFieldIds = new Set(visibleSteps.flatMap(s => (s.fields || []).map(f => f.id)));
    const cleanAnswers = Object.fromEntries(
      Object.entries(answers).filter(([k]) => visibleFieldIds.has(k)),
    );
    const cleanFiles = Object.entries(files)
      .filter(([k, v]) => v && visibleFieldIds.has(k))
      .map(([fieldId, v]) => ({ fieldId, ...v }));
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: flow.id,
          pageKey: pageKey || "",
          answers: cleanAnswers,
          files: cleanFiles,
          ...getAttribution(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }
      setFormState("success");
      trackLead(flow.attioLabel || flow.id);
    } catch (err) {
      setErrorMsg(err.message);
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <Shell eyebrow={eyebrow} title={title} accent={accent}>
        <div role="status" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div aria-hidden="true" style={{
            width: 56, height: 56, borderRadius: 50, background: NEON, color: INK,
            fontWeight: 900, fontSize: "1.5rem", display: "flex",
            alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem",
          }}>✓</div>
          <h3 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1.4rem", color: INK, marginBottom: "0.6rem" }}>
            {flow.successTitle || "Thanks — you're registered."}
          </h3>
          <p style={{ fontFamily: FONT, fontSize: "0.95rem", color: INK_60, maxWidth: 480, margin: "0 auto" }}>
            {flow.successBody || "We'll be in touch shortly."}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell eyebrow={eyebrow} title={title} accent={accent}>
      {flow.intro && stepIndex === 0 && (
        <p style={{ fontFamily: FONT, fontSize: "0.95rem", color: INK_60, marginBottom: "1.6rem", lineHeight: 1.6 }}>
          {flow.intro}
        </p>
      )}

      {/* Progress */}
      <div aria-hidden="true" style={{ display: "flex", gap: 6, marginBottom: "0.7rem" }}>
        {visibleSteps.map((s, i) => (
          <div key={s.id} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= stepIndex ? NEON : LINE,
          }} />
        ))}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_60, marginBottom: "0.5rem" }}>
        Step {stepIndex + 1} of {visibleSteps.length}
      </p>
      <h3 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1.35rem", color: INK, marginBottom: "1.4rem", letterSpacing: "-0.01em" }}>
        {step.title}
      </h3>

      <div className="field-light">
        {(step.fields || []).map(f => (
          <FieldControl key={f.id} field={f} value={answers[f.id]} file={files[f.id]}
            onChange={v => setAnswer(f.id, v)} onFile={fl => setFile(f, fl)} />
        ))}
      </div>

      {(stepError || formState === "error") && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.9rem", color: "#C03030", marginBottom: "0.9rem" }}>
          {stepError || errorMsg}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.4rem" }}>
        {stepIndex > 0 && (
          <button type="button" onClick={back} className="btn-ghost-ink" style={{ flexShrink: 0 }}>
            ← Back
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={formState === "submitting"}
          aria-busy={formState === "submitting"}
          className="btn-neon"
          style={{ flex: 1, opacity: formState === "submitting" ? 0.65 : 1, cursor: formState === "submitting" ? "wait" : "pointer" }}
        >
          {formState === "submitting" ? "Sending..." : isLast ? (flow.submitLabel || "Submit") : "Continue →"}
        </button>
      </div>
    </Shell>
  );
}

/* A step is visible when it has no condition, or the referenced answer
   matches. yesno answers are stored as "Yes"/"No" strings. */
function stepVisible(step, answers) {
  if (!step.showIf || !step.showIf.fieldId) return true;
  return answers[step.showIf.fieldId] === step.showIf.equals;
}

function FieldControl({ field, value, file, onChange, onFile }) {
  const id = React.useId();
  const label = (
    <label htmlFor={id} style={{ display: "block" }}>
      {field.label}
      {field.required && <span aria-hidden="true" style={{ color: INK, marginLeft: 4, fontWeight: 800 }}>*</span>}
    </label>
  );
  const wrap = { marginBottom: "1.1rem" };

  if (field.type === "choice" || field.type === "yesno") {
    const options = field.type === "yesno" ? ["Yes", "No"] : (field.options || []);
    return (
      <div style={wrap} role="radiogroup" aria-label={field.label}>
        {label}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "0.45rem" }}>
          {options.map(opt => {
            const selected = value === opt;
            return (
              <button key={opt} type="button" role="radio" aria-checked={selected}
                onClick={() => onChange(opt)}
                style={{
                  fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600,
                  padding: "0.6rem 1.05rem", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${selected ? INK : LINE_STRONG}`,
                  background: selected ? INK : "#fff",
                  color: selected ? NEON : INK,
                  transition: "all 0.15s",
                }}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div style={wrap}>
        {label}
        <select id={id} value={value || ""} onChange={e => onChange(e.target.value)}
          aria-required={field.required || undefined}
          style={{ appearance: "none", cursor: "pointer", paddingRight: "2.4rem" }}>
          <option value="" disabled>Select…</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt} style={{ background: "#fff", color: INK }}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div style={wrap}>
        {label}
        {field.help && <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: INK_60, margin: "0.25rem 0 0.45rem" }}>{field.help}</p>}
        <input id={id} type="file"
          accept={(field.accept || ["pdf", "png", "jpg"]).map(a => "." + a).join(",")}
          onChange={e => onFile(e.target.files && e.target.files[0])}
          aria-required={field.required || undefined}
          style={{ fontFamily: FONT, fontSize: "0.88rem", padding: "0.5rem 0" }} />
        {file && (
          <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: INK_60, marginTop: "0.3rem" }}>
            Attached: {file.name}{" "}
            <button type="button" onClick={() => onFile(null)}
              style={{ background: "none", border: "none", color: "#C03030", cursor: "pointer", fontFamily: FONT, fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}>
              remove
            </button>
          </p>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div style={wrap}>
        {label}
        <textarea id={id} value={value || ""} onChange={e => onChange(e.target.value)}
          aria-required={field.required || undefined} />
      </div>
    );
  }

  // text / email / phone
  const inputType = field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";
  return (
    <div style={wrap}>
      {label}
      <input id={id} type={inputType} value={value || ""} onChange={e => onChange(e.target.value)}
        aria-required={field.required || undefined} />
    </div>
  );
}

/* Section chrome — light card on the page, consistent with IntakeForm pages. */
function Shell({ eyebrow, title, accent, children }) {
  return (
    <section className="surface-paper" style={{ padding: "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,4rem)" }}>
      <div className="container" style={{ maxWidth: 660, margin: "0 auto" }}>
        {(eyebrow || title) && (
          <div style={{ marginBottom: "2rem" }}>
            {eyebrow && (
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: INK_60, marginBottom: "0.7rem" }}>
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 style={{ fontFamily: FONT, fontWeight: 900, fontSize: "clamp(1.7rem,3.5vw,2.6rem)", color: INK, lineHeight: 1.08, letterSpacing: "-0.02em" }}>
                {title} {accent && <span className="accent-light">{accent}</span>}
              </h2>
            )}
          </div>
        )}
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "clamp(1.5rem,3.5vw,2.5rem)" }}>
          {children}
        </div>
      </div>
    </section>
  );
}
