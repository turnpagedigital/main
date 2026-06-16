import React, { useState, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE_STRONG } from "../data/tokens.js";
import { getAttribution, trackLead } from "../lib/analytics.js";

const SUBJECT_OPTIONS = [
  { value: "", label: "Select a subject", disabled: true },
  { value: "ai-copyright", label: "AI Copyright Inquiry" },
  { value: "crypto", label: "Crypto Claims Inquiry" },
  { value: "quote", label: "Request a Quote" },
  { value: "claims", label: "General Claims Inquiry" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

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
      phone: fd.get("phone") || "",
      telegram: fd.get("telegram") || "",
      whatsapp: fd.get("whatsapp") || "",
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
      <div className="form-row-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <Field label="Phone" name="phone" type="tel" />
        <Field label="Telegram" name="telegram" type="text" />
        <Field label="WhatsApp" name="whatsapp" type="tel" />
      </div>
      <Select
        label="Subject"
        name="subject"
        required
        options={SUBJECT_OPTIONS}
        defaultValue={defaultSubject || ""}
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
