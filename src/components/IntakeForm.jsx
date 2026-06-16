import React, { useState, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../data/tokens.js";
import { getAttribution, trackLead } from "../lib/analytics.js";
import contactFormData from "../data/contact-form.json";

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
export default function IntakeForm({ source = "", defaultSubject = "" }) {
  const [formState, setFormState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef(null);

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
      // Ad-click attribution captured from the landing URL (hidden fields)
      utm_source: fd.get("utm_source") || "",
      utm_medium: fd.get("utm_medium") || "",
      utm_campaign: fd.get("utm_campaign") || "",
      utm_term: fd.get("utm_term") || "",
      utm_content: fd.get("utm_content") || "",
      gclid: fd.get("gclid") || "",
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
          Message sent.
        </h3>
        <p style={{ fontFamily: FONT, fontSize: "0.95rem", color: INK_60 }}>
          We'll be in touch within 48 hours. Check your inbox for a confirmation.
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

      <div className="form-row-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Field label="First Name" name="firstName" type="text" required />
        <Field label="Last Name" name="lastName" type="text" required />
      </div>
      <Field label="Email" name="email" type="email" required />
      <ContactMethodSelector />
      <Select
        label="Subject"
        name="subject"
        required
        options={SUBJECT_OPTIONS}
        defaultValue={resolvedDefault}
      />
      <Field label="Message" name="message" type="textarea" placeholder="Tell us about your situation. What type of claim, against whom, what stage." required />

      {formState === "error" && (
        <p id="intake-form-error" role="alert" style={{ fontFamily: FONT, fontSize: "0.9rem", color: "#C03030", marginBottom: "0.8rem" }}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={formState === "submitting"}
        aria-busy={formState === "submitting"}
        aria-describedby={formState === "error" ? "intake-form-error" : undefined}
        className="btn-neon"
        style={{
          display: "block", width: "100%", marginTop: "0.4rem",
          opacity: formState === "submitting" ? 0.65 : 1,
          cursor: formState === "submitting" ? "wait" : "pointer",
        }}
      >
        {formState === "submitting" ? "Sending..." : "Send Message →"}
      </button>
    </form>
  );
}

const CONTACT_METHODS = [
  { value: "phone",    label: "Phone / SMS",  inputLabel: "Your phone number",    type: "tel",  placeholder: "+1 234 567 8900" },
  { value: "telegram", label: "Telegram",     inputLabel: "Your Telegram handle",  type: "text", placeholder: "@username" },
  { value: "whatsapp", label: "WhatsApp",     inputLabel: "Your WhatsApp number",  type: "tel",  placeholder: "+1 234 567 8900" },
];

function ContactMethodSelector() {
  const [method, setMethod] = useState("");
  const selectId = React.useId();
  const inputId = React.useId();
  const [inputInvalid, setInputInvalid] = useState(false);
  const cfg = CONTACT_METHODS.find(m => m.value === method);

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor={selectId}>
          How would you like to be contacted?{" "}
          <span style={{ fontWeight: 400, color: INK_60 }}>(optional)</span>
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
          <option value="">No preference</option>
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
