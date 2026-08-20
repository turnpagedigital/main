import React, { useMemo, useState, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { NEON, FONT, INK, INK_40, INK_60, LINE, LINE_STRONG, PAPER, SURFACE, DARK, TEXT, SECONDARY_BG, MUTED, ERROR, SUCCESS, SUCCESS_BG, WARNING, WARNING_BG } from "../../data/tokens.js";
import { sectionBackground } from "../../lib/section-background.js";
import formsData from "../../data/forms.json";
import { getAttribution, trackRegistration } from "../../lib/analytics.js";
import { formatComputed, computedGateSatisfied } from "../../lib/flow-compute.js";
import QRCode from "qrcode";

/* Registration Flow — multi-step wizard section for marketing landing pages.
 *
 * Drop onto any Page Builder page and pick a flow (defined in
 * src/data/forms.json, edited via /admin/registration/flows). Steps with a
 * showIf condition only appear when the named earlier answer matches, so
 * the wizard branches. A field may set `row: "<any id>"` — consecutive
 * fields sharing the same row id render side by side instead of stacked
 * (e.g. First name + Last name), saving vertical space; a field with no row
 * (or whose neighbor doesn't share it) renders full-width as normal. A step
 * may set `disclaimer` — small print shown just above THAT step's Back/
 * Next/Submit row (e.g. a consent statement right before the final step) —
 * distinct from the registration-flow section's own `disclosure` prop,
 * which shows below the whole card on every step instead of one. File
 * fields are read client-side and submitted as
 * base64 (server caps: 8 MB, pdf/png/jpg). Submissions POST to
 * /api/register with the flow id, page key, and ad attribution; a GA4
 * lead event fires on success when analytics is configured.
 *
 * Layouts (set in Page Builder → registration-flow section):
 *   center  — default; narrow card centered
 *   split   — left column heading + right column form card (wide 2-col layout)
 *   wide    — wider card (880 px) centered
 *   dark    — legacy alias for colorScheme "dark" on the center layout
 *
 * Styling (set in Page Builder → registration-flow section):
 *   colorScheme     — "paper" (default) | "white" | "light-gray" | "neon" | "dark"
 *   backgroundImage + imageFilter + imageFilterStrength — optional photo
 *     background; a "dark" filter switches the outer text to white
 *   cardRadius      — form-card corner radius in px (0–40, default 10)
 *   cardStyle       — "card" (default, white form card) | "float" (no card —
 *     the form sits directly on the section background)
 *   cardColor       — "white" (default) | "light-gray" | "paper" | "neon"
 *     background of the form card (card style only)
 *   disclosure      — small-print paragraph rendered below the form
 *   align           — "left" (default) | "center": the OUTER heading —
 *     eyebrow + title/accent — the flow's intro text (sits under the
 *     heading, above the card, on every layout including split), and the
 *     disclosure below the form.
 *   cardAlign       — "left" (default) | "center": chrome INSIDE the card —
 *     just the step title and step counter. Set independently of `align`
 *     so, e.g., a centered hero heading can sit above a left-aligned,
 *     easy-to-scan form, or vice versa. Either way, the fields themselves —
 *     labels, inputs, choice buttons — always stay left-aligned regardless
 *     of both settings, since the input boxes are always full-width/
 *     left-text; centering only the surrounding chrome avoids a
 *     half-centered, half-left look.
 *   formScale       — form zoom in % (100–150, default 100) for a bigger,
 *     easier-to-read form
 */

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const FILE_MIME = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

export default function RegistrationFlowSection({ sectionConfig, pageKey }) {
  const c = (sectionConfig && sectionConfig.content) || {};
  const flow = (formsData.flows || []).find(f => f.id === c.flowId && f.active !== false);

  if (!flow) return null;
  return (
    <Wizard
      flow={flow}
      pageKey={pageKey}
      eyebrow={c.eyebrow}
      title={c.title}
      accent={c.accent}
      layout={c.layout || "center"}
      colorScheme={c.colorScheme}
      backgroundImage={c.backgroundImage}
      imageFilter={c.imageFilter}
      imageFilterStrength={c.imageFilterStrength}
      cardRadius={c.cardRadius}
      cardStyle={c.cardStyle}
      cardColor={c.cardColor}
      formScale={c.formScale}
      disclosure={c.disclosure}
      align={c.align}
      cardAlign={c.cardAlign}
    />
  );
}

/* Flow intro — written as Markdown in Registration → Flows → Intro (same
   renderer the rich-text section uses: `marked` + DOMPurify). A blank line
   starts a new paragraph; a single line break stays a soft break within the
   same paragraph (so it doesn't change size/weight); **bold** works too.
   The FIRST paragraph renders as the lead line (bigger, bold) and any
   further paragraphs render smaller and muted — same lead/secondary look
   as before, just driven by real paragraphs instead of every newline. */
function IntroText({ text, dark = false, style = {}, scopeClass }) {
  const html = useMemo(() => {
    const t = String(text || "").trim();
    if (!t) return "";
    return DOMPurify.sanitize(marked.parse(t, { mangle: false, headerIds: false, breaks: true }));
  }, [text]);
  if (!html) return null;
  return (
    <>
      <style>{`
        .regflow-intro p {
          font-family: ${FONT}; font-size: 0.92rem; color: ${INK_60};
          line-height: 1.65; margin: 0.7rem 0 0;
        }
        .regflow-intro p:first-child {
          font-size: clamp(1.05rem, 1.5vw, 1.2rem); font-weight: 700; color: ${INK};
          line-height: 1.5; margin-top: 0;
        }
        .regflow-intro strong { font-weight: 800; }
        .regflow-intro a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
        .regflow-intro-dark p:first-child { color: #fff; }
        .regflow-intro-dark p:not(:first-child) { color: ${MUTED}; }
      `}</style>
      <div
        style={style}
        className={`${scopeClass || ""} regflow-intro${dark ? " regflow-intro-dark" : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

// Named export (in addition to the section's default export) so the admin
// Flows editor can render this exact component — same rendering, same
// validation, same behavior a visitor gets — as a live preview of whatever's
// currently in the editor, before it's saved. `previewMode` short-circuits
// the actual submit network call (see submit() below) so clicking through a
// preview can never send a real notification email / Sheet row / Attio push.
export function Wizard({ flow, pageKey, eyebrow, title, accent, layout, colorScheme, backgroundImage, imageFilter, imageFilterStrength, cardRadius, cardStyle, cardColor, formScale, disclosure, align, cardAlign, previewMode = false }) {
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState("");
  const [formState, setFormState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [extraction, setExtraction] = useState(null);   // claim-form read result
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [quotes, setQuotes] = useState({});             // fieldId -> /api/quote payload { display, recoveryDisplay, pct }

  // Neon-on-neon elements (progress bar, Continue button, success check,
  // disclosure text) flip to ink so everything stays visible — whether the
  // neon comes from the card itself, or (for a floating card with no card
  // surface underneath) from the section background directly.
  const floatsOnSection = (cardStyle || "card") === "float";
  const onNeonCard = floatsOnSection
    ? !backgroundImage && colorScheme === "neon"
    : cardColor === "neon";

  const visibleSteps = useMemo(
    () => (flow.steps || []).filter(s => stepVisible(s, answers)),
    [flow.steps, answers],
  );
  const step = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)];
  const isLast = stepIndex >= visibleSteps.length - 1;

  // Server-priced computed fields (field.priced) can't be priced in the
  // browser — the pricing inputs live only on the server. Fetch the finished
  // price from /api/quote whenever the counts on the current step change.
  const privateComputed = (step && step.fields || []).filter(f => f.type === "computed" && f.priced);
  const quoteInputs = JSON.stringify(
    privateComputed.map(f => [answers[f.selfField] ?? "", answers[f.publisherField] ?? ""]),
  );
  useEffect(() => {
    if (!privateComputed.length) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      privateComputed.forEach(f => {
        fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flowId: flow.id, fieldId: f.id, answers }),
          signal: ctrl.signal,
        })
          .then(r => (r.ok ? r.json() : null))
          .then(data => { if (data && data.display != null) setQuotes(prev => ({ ...prev, [f.id]: data })); })
          .catch(() => {});
      });
    }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteInputs, flow.id]);

  function setAnswer(fieldId, value) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    setStepError("");
  }

  async function setFile(field, fileObj) {
    if (!fileObj) {
      setFiles(prev => ({ ...prev, [field.id]: null }));
      if (field.extract) { setExtraction(null); setExtractError(""); }
      return;
    }
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
    const meta = { name: fileObj.name.slice(0, 200), type: FILE_MIME[ext] || fileObj.type, dataBase64 };
    setFiles(prev => ({ ...prev, [field.id]: meta }));
    setStepError("");
    if (field.extract) runExtraction(field, meta);
  }

  /* Send an uploaded claim form to /api/extract-claim, then auto-fill the
     fields named in field.extractMap ({ flowFieldId: "path.into.result" }). */
  async function runExtraction(field, meta) {
    setExtracting(true);
    setExtractError("");
    setExtraction(null);
    try {
      const res = await fetch("/api/extract-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataBase64: meta.dataBase64, type: meta.type, extractor: field.extract }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't read the claim form.");
      setExtraction(data);
      const map = field.extractMap || {};
      setAnswers(prev => {
        const next = { ...prev };
        for (const [target, path] of Object.entries(map)) {
          const val = resolvePath(data, path);
          if (val !== undefined && val !== null && val !== "") next[target] = String(val);
        }
        return next;
      });
    } catch (err) {
      setExtractError(err.message || "Couldn't read the claim form — you can enter your details manually below.");
    } finally {
      setExtracting(false);
    }
  }

  // Accepts an optional answers override so a click handler that just set a
  // new answer (e.g. skipFileField below) can validate and advance against
  // the fresh value immediately, instead of the stale `answers` from closure
  // that setAnswers/setAnswer hasn't finished re-rendering with yet.
  function validateStep(a = answers) {
    for (const f of step.fields || []) {
      if (!fieldVisible(f, a)) continue;
      if (f.type === "computed") continue; // display-only, never blocks
      const v = a[f.id];
      const empty = v === undefined || v === null || String(v).trim() === "";
      if (f.required) {
        if (f.type === "file") {
          const skipped = f.skipLabel && a[skipAnswerKey(f)] === "Yes";
          if (!files[f.id] && !skipped) return `Please attach: ${f.label}`;
        } else if (empty) {
          return `Please answer: ${f.label}`;
        }
      }
      if (f.type === "email" && !empty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
        return "That email address doesn't look right.";
      }
      if (f.type === "number" && !empty) {
        const n = parseFloat(v);
        if (!Number.isFinite(n) || n < 0) return `Please enter a valid number for: ${f.label}`;
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

  // A required file field with `skipLabel` set renders an alternate button
  // next to Next (see skippableFileFields below) reading that label (e.g.
  // "I don't have my claim form"). Clicking it marks the field satisfied
  // without a file and immediately tries to advance — same validation as
  // Next, so any OTHER required field still on this step still blocks.
  function skipFileField(field) {
    const nextAnswers = { ...answers, [skipAnswerKey(field)]: "Yes" };
    setAnswers(nextAnswers);
    const err = validateStep(nextAnswers);
    if (err) { setStepError(err); return; }
    setStepError("");
    if (!isLast) setStepIndex(i => i + 1);
    else submit(nextAnswers);
  }

  function back() {
    setStepError("");
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }

  // Bypasses validateStep() entirely — for a step marked `optional`, so its
  // fields' required flags only bite if the visitor actually engages with
  // the step instead of skipping past it.
  function skip() {
    setStepError("");
    if (!isLast) setStepIndex(i => i + 1);
    else submit();
  }

  async function submit(a = answers) {
    // Preview never actually submits — no notification email, no Sheet row,
    // no Attio push. Fakes the round trip so the success screen is visible
    // (that's real content someone's editing too, worth being able to see).
    if (previewMode) {
      setFormState("submitting");
      setTimeout(() => setFormState("success"), 350);
      return;
    }
    setFormState("submitting");
    setErrorMsg("");
    const visibleFieldIds = new Set(
      visibleSteps.flatMap(s => (s.fields || []).filter(f => fieldVisible(f, a)).map(f => f.id)),
    );
    // The claim-form skip button's answer lives under a synthetic
    // `${fieldId}__skip` key (see skipAnswerKey) — not a real field id, so
    // it's outside visibleFieldIds and needs including explicitly or the
    // server never learns the alternative was taken and rejects a
    // legitimately skipped upload.
    const skipKeys = new Set(
      visibleSteps.flatMap(s => (s.fields || [])
        .filter(f => f.type === "file" && f.skipLabel && fieldVisible(f, a))
        .map(f => skipAnswerKey(f))),
    );
    const cleanAnswers = Object.fromEntries(
      Object.entries(a).filter(([k]) => visibleFieldIds.has(k) || skipKeys.has(k)),
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
          claimWorks: extraction && Array.isArray(extraction.works) ? extraction.works : undefined,
          ...getAttribution(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }
      setFormState("success");
      trackRegistration(flow.attioLabel || flow.id);
    } catch (err) {
      setErrorMsg(err.message);
      setFormState("error");
    }
  }

  const successNode = (
    <div role="status" style={{ textAlign: "center", padding: "3rem 1rem" }}>
      {previewMode && (
        <p aria-hidden="true" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_40, marginBottom: "1.4rem" }}>
          Preview — nothing was submitted
        </p>
      )}
      <div aria-hidden="true" style={{
        width: 56, height: 56, borderRadius: 50,
        background: onNeonCard ? INK : NEON, color: onNeonCard ? NEON : INK,
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
  );

  // The step count is misleading while a branching answer is still unset
  // (picking Author vs Publisher changes which steps exist), so hide the
  // progress bar and "Step X of Y" until every branch driver is answered.
  const stepCountKnown = (flow.steps || [])
    .map(st => st.showIf && st.showIf.fieldId)
    .filter(Boolean)
    .every(fieldId => answers[fieldId]);

  // No step to show — a flow with no steps, or whose only steps are gated
  // behind a branch that no current answer satisfies. Bail gracefully instead
  // of dereferencing an undefined `step` below (which would blank the section).
  if (!step) return null;

  // Live completeness of the CURRENT step, recomputed on every change — drives
  // the Next/Submit button's grayed-out state so it's obvious at a glance
  // whether there's anything left to fill in, instead of only finding out
  // after clicking.
  const stepReady = !validateStep();
  const busy = formState === "submitting" || extracting;

  // Required file fields on this step that offer a skipLabel alternative and
  // don't yet have a file attached — each renders its own secondary button
  // next to Next (see skipFileField above). Once a file's attached, the
  // alternative no longer applies, so it drops out of this list.
  const skippableFileFields = (step.fields || []).filter(
    f => f.required && f.type === "file" && f.skipLabel && fieldVisible(f, answers) && !files[f.id],
  );

  const formNode = (
    <>
      {previewMode && (
        <div aria-hidden="true" style={{
          display: "inline-block", fontFamily: FONT, fontSize: "0.66rem", fontWeight: 800,
          letterSpacing: "0.14em", textTransform: "uppercase", padding: "0.25rem 0.6rem",
          borderRadius: 4, background: WARNING_BG, color: "#7A4B00", marginBottom: "1rem",
        }}>
          Preview — nothing here submits
        </div>
      )}
      {stepCountKnown && (
        <>
          <div aria-hidden="true" style={{ display: "flex", gap: 6, marginBottom: "0.6rem" }}>
            {visibleSteps.map((s, i) => (
              <div key={s.id} style={{
                flex: 1, height: 4,
                background: i <= stepIndex
                  ? (onNeonCard ? INK : NEON)
                  : (onNeonCard ? "rgba(10,10,10,0.2)" : LINE),
              }} />
            ))}
          </div>
          <p className="regflow-card-text" style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 500, color: INK_40, marginBottom: "1rem" }}>
            Step {stepIndex + 1} of {visibleSteps.length}
          </p>
        </>
      )}
      {step.title && (
        <p className="regflow-card-text" style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, color: INK_60, marginBottom: "0.5rem" }}>
          {step.title}
        </p>
      )}
      <h3 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 1.75rem)", color: INK, marginBottom: step.explainer ? "0.7rem" : "2.1rem", letterSpacing: "-0.01em" }}>
        {step.heading}
      </h3>
      {step.explainer && (
        <p className="regflow-card-text" style={{ fontFamily: FONT, fontSize: "0.92rem", color: INK_60, lineHeight: 1.6, marginBottom: "2.1rem" }}>
          {step.explainer}
        </p>
      )}
      <div className="field-light">
        {groupFieldsIntoRows((step.fields || []).filter(f => fieldVisible(f, answers))).map((group, gi) => (
          group.row ? (
            <div key={`row-${gi}`} className="regflow-field-row" style={{ marginBottom: "2.1rem" }}>
              {group.fields.map(f => (
                <div key={f.id} className="regflow-field-row-item">
                  <FieldControl field={f} value={answers[f.id]} file={files[f.id]}
                    answers={answers} quote={quotes[f.id]}
                    extraction={extraction} extracting={extracting} extractError={extractError}
                    onChange={v => setAnswer(f.id, v)} onFile={fl => setFile(f, fl)}
                    noBottomMargin />
                </div>
              ))}
            </div>
          ) : (
            <FieldControl key={group.field.id} field={group.field} value={answers[group.field.id]} file={files[group.field.id]}
              answers={answers} quote={quotes[group.field.id]}
              extraction={extraction} extracting={extracting} extractError={extractError}
              onChange={v => setAnswer(group.field.id, v)} onFile={fl => setFile(group.field, fl)} />
          )
        ))}
        <style>{`
          .regflow-field-row { display: flex; gap: 1rem; }
          .regflow-field-row-item { flex: 1; min-width: 0; }
          @media (max-width: 520px) {
            .regflow-field-row { flex-direction: column; gap: 0; }
            .regflow-field-row-item:not(:last-child) { margin-bottom: 2.1rem; }
          }
        `}</style>
      </div>
      {(stepError || formState === "error") && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.9rem", color: ERROR, marginBottom: "0.9rem" }}>
          {stepError || errorMsg}
        </p>
      )}
      {step.disclaimer && (
        <p className="regflow-card-text" style={{ fontFamily: FONT, fontSize: "0.78rem", color: INK_60, lineHeight: 1.6 }}>
          {step.disclaimer}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.3rem" }}>
        {stepIndex > 0 && (
          <button type="button" onClick={back} className="btn-ghost-ink" style={{ flexShrink: 0 }}>
            ← Back
          </button>
        )}
        {skippableFileFields.map(f => (
          <button key={f.id} type="button" onClick={() => skipFileField(f)} disabled={busy}
            className="btn-ghost-ink" style={{ flexShrink: 0, cursor: busy ? "wait" : "pointer" }}>
            {f.skipLabel}
          </button>
        ))}
        <button
          type="button"
          onClick={next}
          disabled={busy || !stepReady}
          aria-busy={busy}
          aria-disabled={!stepReady || undefined}
          className="btn-neon"
          style={{
            flex: 1,
            opacity: busy ? 0.65 : (!stepReady ? 0.35 : 1),
            cursor: busy ? "wait" : (!stepReady ? "not-allowed" : "pointer"),
            ...(onNeonCard ? { background: INK, color: NEON } : {}),
          }}
        >
          {extracting ? "Reading your claim form…" : formState === "submitting" ? "Sending..." : isLast ? (flow.submitLabel || "Submit") : "Next →"}
        </button>
      </div>
      {step.optional && (
        <button type="button" onClick={skip} disabled={busy} className="regflow-card-text" style={{
          display: "block", width: "100%", marginTop: "0.9rem", background: "none", border: "none", padding: 0,
          cursor: busy ? "wait" : "pointer", fontFamily: FONT, fontSize: "0.85rem", color: INK_60,
          textDecoration: "underline", textUnderlineOffset: "3px",
        }}>
          Skip this step →
        </button>
      )}
    </>
  );

  return (
    <Shell
      eyebrow={eyebrow}
      title={title}
      accent={accent}
      layout={layout}
      colorScheme={colorScheme}
      backgroundImage={backgroundImage}
      imageFilter={imageFilter}
      imageFilterStrength={imageFilterStrength}
      cardRadius={cardRadius}
      cardStyle={cardStyle}
      cardColor={cardColor}
      formScale={formScale}
      disclosure={disclosure}
      align={align}
      cardAlign={cardAlign}
      flowIntro={flow.intro}
    >
      {formState === "success" ? successNode : formNode}
    </Shell>
  );
}

function stepVisible(step, answers) {
  if (!step.showIf || !step.showIf.fieldId) return true;
  return answers[step.showIf.fieldId] === step.showIf.equals;
}

// Same {fieldId, equals} shape as stepVisible, but scoped to one field inside
// a step — lets a branch driver (e.g. role) and its branch-specific fields
// share a single step/page instead of each branch needing its own step.
function fieldVisible(field, answers) {
  if (!field.showIf || !field.showIf.fieldId) return true;
  return answers[field.showIf.fieldId] === field.showIf.equals;
}

// A required file field with `skipLabel` set can also be satisfied by
// clicking an alternate button (e.g. "I don't have my claim form") next to
// Next instead of attaching a file — e.g. not every claimant has their claim
// form handy. That click's answer is stored under this synthetic key; it's
// UI-only bookkeeping (not a real field id in the flow) so it's dropped
// automatically wherever answers are filtered down to known field ids
// (submit, /api/register), same as any other stray key.
function skipAnswerKey(field) {
  return `${field.id}__skip`;
}

// Fields sharing the same non-empty `row` value, consecutively, render side
// by side (e.g. First name + Last name) instead of stacked — saves vertical
// space for short fields. A field with no `row` (or a row no adjacent field
// shares) renders full-width as normal.
function groupFieldsIntoRows(fields) {
  const groups = [];
  for (const f of fields) {
    const last = groups[groups.length - 1];
    if (f.row && last && last.row && last.rowKey === f.row) {
      last.fields.push(f);
    } else if (f.row) {
      groups.push({ row: true, rowKey: f.row, fields: [f] });
    } else {
      groups.push({ row: false, field: f });
    }
  }
  return groups;
}

/* Read "counts.self" style dot-paths out of an extraction result. */
function resolvePath(obj, path) {
  return String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/* ── Layout-aware Shell ─────────────────────────────────────────────────────
   center  — narrow 660px card, gray bg
   wide    — wider 880px card, gray bg
   split   — 2-col: left sticky heading, right form card, gray bg
   dark    — narrow card, dark bg, white outer text
   ─────────────────────────────────────────────────────────────────────── */
/* LinkConfirmField — an external-verification step (e.g. Sumsub KYC):
   a button link, a QR code encoding the same URL for phone hand-off, and a
   required confirmation checkbox. Value is "Yes" once checked. */
function LinkConfirmField({ field, value, onChange, wrap, label }) {
  const [qr, setQr] = useState("");
  const url = (field.url || "").trim();
  useEffect(() => {
    let alive = true;
    if (!url) { setQr(""); return; }
    QRCode.toDataURL(url, { width: 176, margin: 1, color: { dark: "#0A0A0A", light: "#FFFFFF" } })
      .then(d => { if (alive) setQr(d); })
      .catch(() => { if (alive) setQr(""); });
    return () => { alive = false; };
  }, [url]);
  const checked = value === "Yes";
  return (
    <div style={wrap}>
      {label}
      {field.help && <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: INK_60, margin: "0.25rem 0 0.8rem", lineHeight: 1.55 }}>{field.help}</p>}
      {url ? (
        <div style={{ display: "flex", gap: "1.2rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.9rem" }}>
          <div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-neon" style={{ display: "inline-block" }}>
              {field.linkText || "Open verification"} ↗
            </a>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: INK_60, margin: "0.6rem 0 0" }}>
              or scan with your phone:
            </p>
          </div>
          {qr && (
            <img src={qr} alt={`QR code for ${field.linkText || "verification"}`} width={88} height={88}
              style={{ border: `1px solid ${LINE}`, display: "block" }} />
          )}
        </div>
      ) : (
        <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: INK_60, margin: "0 0 0.8rem" }}>
          The verification link isn't set up yet — you can continue and we'll email it to you.
        </p>
      )}
      <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer", fontFamily: FONT, fontSize: "0.92rem", color: INK, lineHeight: 1.5 }}>
        <input type="checkbox" checked={checked}
          onChange={e => onChange(e.target.checked ? "Yes" : "")}
          style={{ accentColor: NEON, width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
        <span>{field.confirmLabel || "I have completed this step"}{field.required && <span aria-hidden="true" style={{ fontWeight: 800 }}> *</span>}</span>
      </label>
    </div>
  );
}

const SHELL_SCHEMES = {
  paper:        { bg: PAPER,     dark: false },
  white:        { bg: SURFACE,      dark: false },
  "light-gray": { bg: SECONDARY_BG, dark: false },
  neon:         { bg: NEON,      dark: false },
  dark:         { bg: DARK,         dark: true },
};

function Shell({ eyebrow, title, accent, layout = "center", colorScheme, backgroundImage, imageFilter, imageFilterStrength, cardRadius, cardStyle: cardStyleOpt, cardColor, formScale, disclosure, align, cardAlign, flowIntro, children }) {
  // layout "dark" predates colorScheme and acts as its alias
  const scheme  = SHELL_SCHEMES[colorScheme] || (layout === "dark" ? SHELL_SCHEMES.dark : SHELL_SCHEMES.paper);
  // On a photo background, a darkening filter implies white outer text
  const isDark  = backgroundImage ? (imageFilter || "dark") === "dark" : scheme.dark;
  const isSplit = layout === "split";
  const isWide  = layout === "wide";

  // Keep the surface-* class for its focus-outline rules; inline bg overrides it
  const surfaceClass = isDark ? "surface-dark" : "surface-paper";
  const sectionStyle = {
    background: backgroundImage
      ? sectionBackground(backgroundImage, imageFilter, imageFilterStrength)
      : scheme.bg,
  };
  const sectionPad = "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,4rem)";
  const radius = Number.isFinite(Number(cardRadius)) && cardRadius !== "" && cardRadius !== null
    ? Math.max(0, Math.min(40, Number(cardRadius)))
    : 10;
  const floating = cardStyleOpt === "float";
  const scale = Number.isFinite(Number(formScale)) && formScale !== "" && formScale !== null
    ? Math.max(100, Math.min(150, Number(formScale)))
    : 100;
  const cardStyle = floating
    ? { ...(scale !== 100 ? { zoom: scale / 100 } : {}) }
    : {
        background: cardColor === "light-gray" ? SECONDARY_BG
          : cardColor === "paper" ? PAPER
          : cardColor === "neon" ? NEON
          : SURFACE,
        border: `1px solid ${LINE}`,
        borderRadius: radius,
        padding: "clamp(2.25rem,5vw,3.5rem)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)", // matches the contact form card
        ...(scale !== 100 ? { zoom: scale / 100 } : {}),
      };

  // "Centered" only ever applies to heading-style chrome, never the actual
  // fields (labels, inputs, choice buttons, help text) — those always stay
  // left-aligned, since the input boxes are always full-width/left-text
  // regardless of either setting below; centering fields themselves would
  // read as inconsistent sitting under a centered label or button row.
  //
  // The chrome splits into two independently controllable groups:
  //   align     — the OUTER heading (eyebrow + h2), the flow's intro text
  //               (sits under the heading, above the card, on every layout),
  //               and the disclosure below the form
  //   cardAlign — chrome INSIDE the card: just the step title (h3) and
  //               step counter
  // scoped via regflow-outer-text / regflow-card-text on the elements that
  // need it (h2/h3 are targeted directly since they're unambiguous).
  const outerCentered = align === "center";
  const cardCentered = cardAlign === "center";
  const centerCss = (outerCentered || cardCentered) ? (
    <style>{`
      ${outerCentered ? `
      .regflow-outer-centered h2, .regflow-outer-centered .regflow-outer-text, .regflow-outer-centered .regflow-disclosure { text-align: center; }
      .regflow-outer-centered .regflow-disclosure { margin-left: auto; margin-right: auto; }
      ` : ""}
      ${cardCentered ? `
      .regflow-card-centered h3, .regflow-card-centered .regflow-card-text { text-align: center; }
      ` : ""}
    `}</style>
  ) : null;
  const alignClasses = [outerCentered && "regflow-outer-centered", cardCentered && "regflow-card-centered"]
    .filter(Boolean).join(" ");
  // The disclosure sits directly on the section background (outside the
  // card), so on neon it needs much darker text than 45% ink gives — that
  // opacity was tuned for white/paper/light-gray, where it still clears
  // AA; on neon's high luminance it doesn't.
  const onNeonSection = !backgroundImage && colorScheme === "neon";
  const disclosureNode = disclosure ? (
    <p className="regflow-disclosure" style={{
      fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.6,
      color: isDark ? "rgba(255,255,255,0.45)" : onNeonSection ? "rgba(10,10,10,0.65)" : "rgba(10,10,10,0.45)",
      marginTop: "1.4rem", maxWidth: 860,
    }}>
      {disclosure}
    </p>
  ) : null;

  const headingBlock = (eyebrow || title) ? (
    <div>
      {eyebrow && (
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: isDark ? MUTED : INK_60,
          marginBottom: "0.7rem",
        }}>
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 style={{
          fontFamily: FONT, fontWeight: 900,
          fontSize: isSplit ? "clamp(2rem,4vw,3.2rem)" : "clamp(1.7rem,3.5vw,2.6rem)",
          color: isDark ? TEXT : INK,
          lineHeight: 1.08, letterSpacing: "-0.02em",
        }}>
          {title}{" "}
          {accent && (
            <span className={isDark ? "accent-neon" : "accent-light"}>{accent}</span>
          )}
        </h2>
      )}
    </div>
  ) : null;

  /* ── Split layout ─────────────────────────────────────────────── */
  if (isSplit) {
    return (
      <section className={[surfaceClass, alignClasses].filter(Boolean).join(" ")} style={{ ...sectionStyle, padding: sectionPad }}>
        {centerCss}
        <div
          className="reg-split-grid"
          style={{
            maxWidth: 1100, margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(0,2fr) minmax(0,3fr)",
            gap: "clamp(3rem,6vw,6rem)",
            alignItems: "start",
          }}
        >
          {/* Left: sticky heading */}
          <div style={{ position: "sticky", top: 110 }}>
            {headingBlock}
            {flowIntro && (
              <IntroText text={flowIntro} dark={isDark} style={{ marginTop: "1.2rem" }} scopeClass="regflow-outer-text" />
            )}
          </div>
          {/* Right: form card */}
          <div>
            <div style={cardStyle}>{children}</div>
            {disclosureNode}
          </div>
        </div>
        <style>{`
          @media (max-width: 860px) {
            .reg-split-grid { grid-template-columns: 1fr !important; }
            .reg-split-grid > div:first-child { position: relative !important; top: 0 !important; }
          }
        `}</style>
      </section>
    );
  }

  /* ── Center (default) + Wide (+ legacy "dark" = center on dark bg) ── */
  const maxWidth = isWide ? 880 : 660;
  return (
    <section className={[surfaceClass, alignClasses].filter(Boolean).join(" ")} style={{ ...sectionStyle, padding: sectionPad }}>
      {centerCss}
      <div className="container" style={{ maxWidth, margin: "0 auto" }}>
        {(headingBlock || flowIntro) && (
          <div style={{ marginBottom: "2rem" }}>
            {headingBlock}
            {flowIntro && (
              <IntroText text={flowIntro} dark={isDark} style={{ marginTop: headingBlock ? "1.2rem" : 0 }} scopeClass="regflow-outer-text" />
            )}
          </div>
        )}
        <div style={cardStyle}>{children}</div>
        {disclosureNode}
      </div>
    </section>
  );
}

// A field's question label is secondary to the field itself — keep it quiet
// (regular case, muted color) so attention lands on the input/button, not the
// caption above it. The required asterisk stays in the error color so
// required-ness is still legible at a glance despite the label being muted.
const FIELD_LABEL_STYLE = {
  display: "block", fontFamily: FONT, fontSize: "0.95rem", fontWeight: 600,
  letterSpacing: "normal", textTransform: "none", color: INK_60, marginBottom: "0.55rem",
};
// Bigger type + more generous padding on every text-style input, so the
// fields themselves — not the labels around them — are what the eye lands on.
const FIELD_INPUT_STYLE = { fontSize: "1.02rem", padding: "1.05rem 1.15rem" };
// Standard "visually hidden" technique: the label stays in the DOM (so
// screen readers still get it, and a radiogroup's aria-label still resolves)
// but takes up no visual space — for when the step title already asks the
// question in a way the label would just repeat (e.g. step title "I am an"
// directly above Author/Publisher buttons; a "Select one" label between
// them reads as a second, disconnected caption instead of completing the
// sentence the title started).
const VISUALLY_HIDDEN_STYLE = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
};

function FieldControl({ field, value, file, answers = {}, quote, extraction = null, extracting = false, extractError = "", onChange, onFile, noBottomMargin = false }) {
  const id = React.useId();
  const label = (
    <label htmlFor={id} style={field.hideLabel ? VISUALLY_HIDDEN_STYLE : FIELD_LABEL_STYLE}>
      {field.label}
      {field.required && <span aria-hidden="true" style={{ color: ERROR, marginLeft: 4, fontWeight: 700 }}>*</span>}
    </label>
  );
  // When paired with another field in a row (see groupFieldsIntoRows), the
  // row wrapper supplies the bottom margin instead, so this field doesn't
  // double it up.
  const wrap = { marginBottom: noBottomMargin ? 0 : "2.1rem" };
  const helpText = (field.help
    ? <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: INK_60, margin: "0.4rem 0 0.7rem", lineHeight: 1.6 }}>{field.help}</p>
    : null);

  if (field.type === "number") {
    return (
      <div style={wrap}>
        {label}
        {helpText}
        <input id={id} type="number" inputMode="numeric" min="0" step="1"
          style={FIELD_INPUT_STYLE}
          value={value ?? ""} placeholder={field.placeholder || ""}
          onChange={e => onChange(e.target.value)}
          aria-required={field.required || undefined} />
      </div>
    );
  }

  if (field.type === "computed") {
    const revealed = computedGateSatisfied(field, answers);
    // Server-priced (field.priced): the price is fetched from /api/quote and
    // arrives via `quote` ({ display, recoveryDisplay, pct }). Otherwise
    // (public rate): compute in the browser.
    const q = field.priced && quote && typeof quote === "object" ? quote : null;
    const priceStr = field.priced
      ? (q && q.display != null ? q.display : (typeof quote === "string" ? quote : "…"))
      : formatComputed(field, answers);
    return (
      <div style={wrap}>
        <div style={{
          background: revealed ? INK : SECONDARY_BG,
          border: `1px solid ${revealed ? INK : LINE}`,
          padding: "1.2rem 1.4rem",
        }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: revealed ? MUTED : INK_60, margin: 0,
          }}>
            {field.label}
          </p>
          {revealed ? (
            <>
              <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: "clamp(2rem,5vw,2.8rem)", color: NEON, lineHeight: 1.1, margin: "0.35rem 0 0", letterSpacing: "-0.02em" }}>
                {priceStr}
              </p>
              {q && q.recoveryDisplay && q.pct > 0 && (
                <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "rgba(255,255,255,0.78)", margin: "0.55rem 0 0", lineHeight: 1.5 }}>
                  Based on an estimated recovery of <strong style={{ color: "#fff" }}>{q.recoveryDisplay}</strong> — this offer is <strong style={{ color: "#fff" }}>{q.pct}%</strong> of that, paid now.
                </p>
              )}
              {field.help && (
                <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: MUTED, margin: "0.55rem 0 0", lineHeight: 1.5 }}>
                  {field.help}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: INK_60, margin: "0.5rem 0 0", lineHeight: 1.5 }}>
              {field.help || "Complete the fields above to see your estimate."}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (field.type === "link-confirm") {
    return (
      <LinkConfirmField field={field} value={value} onChange={onChange} wrap={wrap} label={label} />
    );
  }

  if (field.type === "choice" || field.type === "yesno") {
    const options = field.type === "yesno" ? ["Yes", "No"] : (field.options || []);
    const groupName = `${field.id}-${id}`;
    return (
      <div style={wrap} role="radiogroup" aria-label={field.label}>
        {label}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.5rem" }}>
          {options.map(opt => {
            const selected = value === opt;
            const optId = `${groupName}-${opt}`;
            return (
              <label key={opt} htmlFor={optId} style={{
                display: "flex", alignItems: "center", gap: "0.7rem",
                padding: "0.55rem 0", cursor: "pointer",
              }}>
                <input id={optId} type="radio" name={groupName} value={opt} checked={selected}
                  onChange={() => onChange(opt)}
                  style={{ width: 20, height: 20, flexShrink: 0, margin: 0, accentColor: INK, cursor: "pointer" }} />
                <span style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: selected ? 700 : 500, color: INK }}>
                  {opt}
                </span>
              </label>
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
          style={{ ...FIELD_INPUT_STYLE, appearance: "none", cursor: "pointer", paddingRight: "2.4rem" }}>
          <option value="" disabled>Select…</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt} style={{ background: SURFACE, color: INK }}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div style={wrap}>
        {label}
        {field.help && <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: INK_60, margin: "0.4rem 0 0.7rem", lineHeight: 1.6 }}>{field.help}</p>}
        {field.moreInfo && field.moreInfo.body && (
          <details style={{ margin: "0.35rem 0 0.9rem" }}>
            <summary style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: INK,
              cursor: "pointer", textDecoration: "underline", textDecorationColor: NEON,
              textDecorationThickness: 2, textUnderlineOffset: 3,
            }}>
              {field.moreInfo.label || "More info"}
            </summary>
            <p style={{
              fontFamily: FONT, fontSize: "0.8rem", color: INK_60, lineHeight: 1.6,
              margin: "0.45rem 0 0", padding: "0.7rem 0.9rem", background: SECONDARY_BG,
            }}>
              {field.moreInfo.body}
            </p>
          </details>
        )}
        <label htmlFor={id} style={{
          display: "inline-flex", alignItems: "center", gap: "0.65rem",
          padding: "0.9rem 1.5rem", cursor: "pointer",
          border: `1.5px solid ${file ? INK : LINE_STRONG}`,
          background: file ? INK : SURFACE, color: file ? TEXT : INK,
          fontFamily: FONT, fontWeight: 700, fontSize: "0.95rem",
          transition: "all 0.15s",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          {file ? "Change file" : "Choose file"}
        </label>
        <input id={id} type="file"
          accept={(field.accept || ["pdf", "png", "jpg"]).map(a => "." + a).join(",")}
          onChange={e => onFile(e.target.files && e.target.files[0])}
          aria-required={(field.required && !field.skipLabel) || undefined}
          style={VISUALLY_HIDDEN_STYLE} />
        {file && (
          <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: INK_60, marginTop: "0.3rem" }}>
            Attached: {file.name}{" "}
            <button type="button" onClick={() => onFile(null)}
              style={{ background: "none", border: "none", color: ERROR, cursor: "pointer", fontFamily: FONT, fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}>
              remove
            </button>
          </p>
        )}
        {field.extract && extracting && (
          <p role="status" style={{ fontFamily: FONT, fontSize: "0.85rem", color: INK, marginTop: "0.5rem", fontWeight: 600 }}>
            ⏳ Reading your claim form — this takes a few seconds…
          </p>
        )}
        {field.extract && !extracting && extraction && (
          <p role="status" style={{ fontFamily: FONT, fontSize: "0.85rem", color: SUCCESS, marginTop: "0.5rem", fontWeight: 600 }}>
            ✓ Read {extraction.counts?.total || 0} work{(extraction.counts?.total || 0) === 1 ? "" : "s"} from your claim form.
          </p>
        )}
        {field.extract && !extracting && extractError && (
          <p role="alert" style={{ fontFamily: FONT, fontSize: "0.85rem", color: ERROR, marginTop: "0.5rem" }}>
            {extractError}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "works-summary") {
    const works = (extraction && Array.isArray(extraction.works)) ? extraction.works : [];
    const catMeta = {
      self:      { label: "Self-published — full rate", color: SUCCESS, bg: SUCCESS_BG },
      publisher: { label: "With a publisher — half rate", color: WARNING, bg: WARNING_BG },
      excluded:  { label: "Multi-author — not purchased", color: INK_40, bg: SECONDARY_BG },
    };
    return (
      <div style={wrap}>
        {label}
        {field.help && <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: INK_60, margin: "0.25rem 0 0.6rem", lineHeight: 1.5 }}>{field.help}</p>}
        {works.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: INK_60 }}>
            Upload your claim form above and we'll list your works here.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, border: `1px solid ${LINE}`, overflow: "hidden" }}>
            {works.map((w, i) => {
              const m = catMeta[w.category] || catMeta.excluded;
              return (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", padding: "0.6rem 0.85rem", borderTop: i ? `1px solid ${LINE}` : "none" }}>
                  <span style={{ fontFamily: FONT, fontSize: "0.88rem", color: INK, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.title || "Untitled work"}
                  </span>
                  <span style={{ flexShrink: 0, fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: m.color, background: m.bg, padding: "0.2rem 0.55rem" }}>
                    {m.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div style={wrap}>
        {label}
        {helpText}
        <textarea id={id} value={value || ""} onChange={e => onChange(e.target.value)}
          style={FIELD_INPUT_STYLE}
          aria-required={field.required || undefined} />
      </div>
    );
  }

  const inputType = field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";
  return (
    <div style={wrap}>
      {label}
      <input id={id} type={inputType} value={value || ""} onChange={e => onChange(e.target.value)}
        style={FIELD_INPUT_STYLE}
        aria-required={field.required || undefined} />
    </div>
  );
}
