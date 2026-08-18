import React, { useState, useRef, useEffect } from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../data/tokens.js";
import { getAttribution, trackLead } from "../lib/analytics.js";
import contactFormData from "../data/contact-form.json";
import { useI18n } from "../lib/i18n.js";

function buildSubjectOptions() {
  const active = (contactFormData.subjects || []).filter(s => s.active !== false);
  return [
    { value: "", label: "Select a subject", disabled: true },
    ...active.map(s => ({ value: s.id, label: s.label })),
  ];
}

const SUBJECT_OPTIONS = buildSubjectOptions();

/* source→subject ID map — keeps the source pre-selection in sync with the
   IDs actually stored in contact-form.json subjects. */
const SOURCE_SUBJECTS = {
  "ai-copyright": "Copyright claims",
  "crypto":       "Digital asset claims",
  "briefings":    "Copyright claims",
};

/* Reusable contact form, light-theme styled. `source` is the sub-brand the
   lead came from (e.g. "ai-copyright"); sent as a hidden field so
   submissions can be attributed to the page that drove them. */
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export default function IntakeForm({ source = "", defaultSubject = "" }) {
  const { t, td } = useI18n();
  const subjectOptions = SUBJECT_OPTIONS.slice(1).map(o => ({ ...o, label: td("subject", o.label) }));
  const [formState, setFormState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  // If the Turnstile widget fails to load or render (bad key, CSP, network,
  // outage), we degrade instead of trapping the visitor behind a disabled
  // button — the server + honeypot + rate limiting still guard the endpoint.
  const [turnstileError, setTurnstileError] = useState(false);
  const formRef = useRef(null);
  const turnstileRef = useRef(null);
  const turnstileWidgetId = useRef(null);
  const gotTurnstileToken = useRef(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;
    let interval = null;
    let failTimer = null;
    const tryRender = () => {
      if (!window.turnstile || turnstileWidgetId.current != null) return;
      try {
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => { gotTurnstileToken.current = true; setTurnstileToken(token); setTurnstileError(false); },
          "expired-callback": () => setTurnstileToken(""),
          // Bad sitekey / domain (e.g. Turnstile error 400020), network, etc.
          "error-callback": () => { setTurnstileToken(""); setTurnstileError(true); },
          theme: "light",
        });
      } catch {
        setTurnstileError(true);
      }
    };
    // Script may still be loading — retry until turnstile is available
    if (window.turnstile) { tryRender(); } else {
      interval = setInterval(() => { if (window.turnstile) { clearInterval(interval); interval = null; tryRender(); } }, 200);
    }
    // Safety net: if no token has arrived in 8s (script blocked by CSP/adblock,
    // widget never rendered), stop blocking the form and fall back to the
    // server-side honeypot + rate limiting.
    failTimer = setTimeout(() => { if (!gotTurnstileToken.current) setTurnstileError(true); }, 8000);
    // Single cleanup covers both paths: clear a pending poll AND remove the
    // widget so a late-loading script can't leave an orphaned iframe on unmount.
    return () => {
      if (interval) clearInterval(interval);
      if (failTimer) clearTimeout(failTimer);
      if (turnstileWidgetId.current != null) {
        window.turnstile?.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormState("submitting");
    setErrorMsg("");
    const fd = new FormData(e.target);
    const payload = {
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      contactMethod: fd.get("contactMethod") || "",
      contactHandle: fd.get("contactHandle") || "",
      subject: fd.get("subject"),
      message: fd.get("message"),
      source: fd.get("source") || "",
      website: fd.get("website") || "",   // honeypot — server silently drops if filled
      turnstileToken,
      // Ad-click + referral-partner attribution captured from the landing
      // URL (hidden fields)
      utm_source: fd.get("utm_source") || "",
      utm_medium: fd.get("utm_medium") || "",
      utm_campaign: fd.get("utm_campaign") || "",
      utm_term: fd.get("utm_term") || "",
      utm_content: fd.get("utm_content") || "",
      gclid: fd.get("gclid") || "",
      ref: fd.get("ref") || "",
    };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }
      setFormState("success");
      trackLead(payload.source); // GA4 generate_lead + Ads conversion (inert without IDs)
    } catch (err) {
      setErrorMsg(err.message);
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <div role="status" style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <div aria-hidden="true" style={{
          width: 56, height: 56, borderRadius: 50, background: NEON,
          color: INK, fontWeight: 900, fontSize: "1.5rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.2rem",
        }}>✓</div>
        <h3 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1.4rem", color: INK, marginBottom: "0.6rem", letterSpacing: "-0.01em" }}>
          {t("form.success_title")}
        </h3>
        <p style={{ fontFamily: FONT, fontSize: "0.95rem", color: INK_60 }}>
          {t("form.success_body")}
        </p>
      </div>
    );
  }

  const attribution = getAttribution();
  const resolvedDefault = defaultSubject || SOURCE_SUBJECTS[source] || "";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="field-light">
      <input type="hidden" name="source" value={source} />
      {Object.entries(attribution).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {/* Honeypot — invisible to humans, bots fill it in and get silently rejected */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} />

      <div className="form-row-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Field label={t("form.first_name")} name="firstName" type="text" required />
        <Field label={t("form.last_name")} name="lastName" type="text" required />
      </div>
      <Field label={t("form.email")} name="email" type="email" required />
      <ContactMethodSelector t={t} />
      <Select
        label={t("form.subject")}
        name="subject"
        required
        options={[{ value: "", label: t("form.select_subject"), disabled: true }, ...subjectOptions]}
        defaultValue={resolvedDefault}
      />
      <Field label={t("form.message")} name="message" type="textarea" placeholder={t("form.message_placeholder")} required />

      {TURNSTILE_SITE_KEY && (
        <div ref={turnstileRef} style={{ margin: "0.5rem 0", display: turnstileError ? "none" : "block" }} />
      )}

      {formState === "error" && (
        <p id="intake-form-error" role="alert" style={{ fontFamily: FONT, fontSize: "0.9rem", color: "#C03030", marginBottom: "0.8rem" }}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={formState === "submitting" || (TURNSTILE_SITE_KEY && !turnstileToken && !turnstileError)}
        aria-busy={formState === "submitting"}
        aria-describedby={formState === "error" ? "intake-form-error" : undefined}
        className="btn-neon"
        style={{
          display: "block", width: "100%", marginTop: "0.4rem",
          opacity: formState === "submitting" ? 0.65 : 1,
          cursor: formState === "submitting" ? "wait" : "pointer",
        }}
      >
        {formState === "submitting" ? t("form.submitting") : t("form.submit")}
      </button>
    </form>
  );
}

function ContactMethodSelector({ t }) {
  const [method, setMethod] = useState("");
  const selectId = React.useId();
  const inputId = React.useId();
  const [inputInvalid, setInputInvalid] = useState(false);
  const CONTACT_METHODS = [
    { value: "phone",    label: t("form.phone_label"),    inputLabel: t("form.phone_input_label"),    type: "tel",  placeholder: t("form.phone_placeholder") },
    { value: "telegram", label: t("form.telegram_label"), inputLabel: t("form.telegram_input_label"), type: "text", placeholder: t("form.telegram_placeholder") },
    { value: "whatsapp", label: t("form.whatsapp_label"), inputLabel: t("form.whatsapp_input_label"), type: "tel",  placeholder: t("form.whatsapp_placeholder") },
  ];
  const cfg = CONTACT_METHODS.find(m => m.value === method);

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor={selectId}>
          {t("form.contact_method_label")}{" "}
          <span style={{ fontWeight: 400, color: INK_60 }}>{t("form.contact_optional")}</span>
        </label>
        <select
          id={selectId}
          name="contactMethod"
          value={method}
          onChange={e => { setMethod(e.target.value); setInputInvalid(false); }}
          style={{
            appearance: "none", cursor: "pointer",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%230A0A0A' stroke-width='1.6' fill='none'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center",
            paddingRight: "2.4rem",
          }}
        >
          <option value="">{t("form.no_preference")}</option>
          {CONTACT_METHODS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      {cfg ? (
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor={inputId}>{cfg.inputLabel}</label>
          <input
            id={inputId}
            name="contactHandle"
            type={cfg.type}
            placeholder={cfg.placeholder}
            aria-invalid={inputInvalid || undefined}
            onInvalid={() => setInputInvalid(true)}
            onInput={() => inputInvalid && setInputInvalid(false)}
          />
        </div>
      ) : (
        <input type="hidden" name="contactHandle" value="" />
      )}
    </div>
  );
}

function Field({ label, name, type, placeholder, required }) {
  const id = React.useId();
  const [invalid, setInvalid] = useState(false);
  const isTextarea = type === "textarea";
  const Tag = isTextarea ? "textarea" : "input";
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label htmlFor={id}>{label}{required && <span aria-hidden="true" style={{ color: INK, marginLeft: 4, fontWeight: 800 }}>*</span>}</label>
      <Tag
        id={id}
        name={name}
        type={isTextarea ? undefined : type}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        onInvalid={() => setInvalid(true)}
        onInput={() => invalid && setInvalid(false)}
      />
    </div>
  );
}

function Select({ label, name, required, options, defaultValue }) {
  const id = React.useId();
  const [invalid, setInvalid] = useState(false);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label htmlFor={id}>{label}{required && <span aria-hidden="true" style={{ color: INK, marginLeft: 4, fontWeight: 800 }}>*</span>}</label>
      <select
        id={id}
        name={name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        onInvalid={() => setInvalid(true)}
        onInput={() => invalid && setInvalid(false)}
        defaultValue={defaultValue || ""}
        style={{
          appearance: "none", cursor: "pointer",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%230A0A0A' stroke-width='1.6' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center",
          paddingRight: "2.4rem",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled} style={{ background: "#fff", color: INK }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
