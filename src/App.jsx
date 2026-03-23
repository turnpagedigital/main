import React, { useState, useRef, useEffect } from "react";

/* ─── Design tokens ─── */
const NEON = "#D4FF00";
const DARK = "#000";
const FONT = "'Archivo', sans-serif";

/* ─── Scroll-reveal hook ─── */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─── Global CSS (injected once) ─── */
const GLOBAL_CSS = `
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
html { height:100%; scroll-behavior:smooth; }
body { font-family: ${FONT}; background:#000; color:#fff; min-height:100%; }
::selection { background: rgba(212,255,0,0.3); }
input:focus, textarea:focus, select:focus { outline:none; }
@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { to { opacity:1; } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@media(max-width:640px) {
  .form-row-2col { grid-template-columns:1fr !important; }
  .contact-info-grid { grid-template-columns:1fr !important; }
  .hero-content { padding-left:clamp(1.5rem,5vw,4rem) !important; padding-right:clamp(1.5rem,5vw,4rem) !important; }
}
`;

export default function App() {
  const [formState, setFormState] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef(null);
  const contactReveal = useScrollReveal();

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => style.remove();
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
      phone: fd.get("phone") || "",
      subject: fd.get("subject"),
      message: fd.get("message"),
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
    } catch (err) {
      setErrorMsg(err.message);
      setFormState("error");
    }
  }

  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section style={{
        position: "relative", width: "100%", height: "100vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* BG image */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img
            src="/bg-paper.jpg"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.3) contrast(1.1)" }}
          />
        </div>

        {/* Grain */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, opacity: 0.06, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }} />

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.95) 100%)",
        }} />

        {/* Content */}
        <div className="hero-content" style={{
          position: "relative", zIndex: 10, display: "flex", flexDirection: "column",
          height: "100%", padding: "clamp(1.5rem,3vh,2.5rem) clamp(1.5rem,5vw,4rem)",
        }}>
          {/* Center block */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeUp 1.8s cubic-bezier(0.22,1,0.36,1) forwards", opacity: 0,
          }}>
            <div style={{ maxWidth: 760, width: "100%", textAlign: "left" }}>
              {/* Logo */}
              <div style={{ marginBottom: "clamp(1.5rem,3vh,2.5rem)" }}>
                <img
                  src="/TPDM Logo Green on Black.png"
                  alt="Turnpage Digital Markets"
                  style={{ width: "clamp(140px,19vw,260px)", height: "auto" }}
                />
              </div>

              <h2 style={{
                fontWeight: 900, fontSize: "clamp(2rem,4vw,3.2rem)", lineHeight: 1.1,
                color: NEON, marginBottom: "clamp(0.8rem,1.5vh,1.2rem)",
              }}>
                Your world class OTC claims desk.
              </h2>

              <p style={{
                fontWeight: 500, fontSize: "clamp(1.1rem,1.8vw,1.35rem)", lineHeight: 1.5,
                color: "rgba(255,255,255,0.9)", marginBottom: "clamp(1.2rem,2.5vh,1.8rem)",
              }}>
                Turnpage offers <strong style={{ fontWeight: 700, color: "#fff" }}>strategic guidance</strong> and{" "}
                <strong style={{ fontWeight: 700, color: "#fff" }}>turn-key liquidity solutions</strong> for rights holders entitled to compensation.
              </p>

              <p style={{
                fontWeight: 400, fontSize: "clamp(0.9rem,1.4vw,1.1rem)", lineHeight: 1.65,
                color: "rgba(255,255,255,0.55)", marginBottom: "clamp(1rem,2vh,1.5rem)",
              }}>
                Our experts have helped customers, creditors and other claimants liquidate over{" "}
                <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>$1 billion</strong> in claims across the largest class actions, bankruptcies and complex litigation matters.
              </p>

              <p style={{
                fontWeight: 400, fontSize: "clamp(0.9rem,1.4vw,1.1rem)", lineHeight: 1.65,
                color: "rgba(255,255,255,0.55)",
              }}>
                We partner with leading asset managers to offer competitive rates and frictionless solutions. With over{" "}
                <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>500 financial institutions</strong> on speed dial, we save you countless hours identifying the right counterparty to meet your needs.
              </p>

              <div style={{ marginTop: "clamp(1.8rem,3.5vh,2.8rem)" }}>
                <a
                  href="#contact"
                  style={{
                    display: "inline-block", fontFamily: FONT, fontWeight: 700,
                    fontSize: "clamp(0.85rem,1.3vw,1rem)", color: "#000", background: NEON,
                    textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase",
                    padding: "0.9em 2.8em", borderRadius: 50,
                    transition: "background 0.3s, transform 0.3s, box-shadow 0.3s",
                  }}
                  onMouseEnter={(e) => { e.target.style.background = "#e2ff4d"; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 4px 20px rgba(212,255,0,0.25)"; }}
                  onMouseLeave={(e) => { e.target.style.background = NEON; e.target.style.transform = ""; e.target.style.boxShadow = ""; }}
                >
                  Get in Touch
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════════ CONTACT ═══════════════════ */}
      <section
        id="contact"
        ref={contactReveal}
        style={{
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "clamp(3rem,6vw,5rem) clamp(1.5rem,5vw,4rem)", overflow: "hidden",
          opacity: 0, transform: "translateY(20px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}
      >
        {/* BG image */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img
            src="/sebastian-schuster-_i6LPp_mu38-unsplash.jpg"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.28) contrast(1.05)" }}
          />
        </div>
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 20%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.4) 100%)",
        }} />

        {/* Form card */}
        <div style={{
          position: "relative", zIndex: 2,
          background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16,
          padding: "clamp(1.5rem,3vw,2.5rem)", width: "100%", maxWidth: 640,
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          {formState === "success" ? (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.8rem", color: NEON }}>&#10003;</div>
              <h3 style={{ fontWeight: 700, fontSize: "1.2rem", color: "#fff", marginBottom: "0.5rem" }}>
                Message Sent
              </h3>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
                We'll be in touch shortly.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1.4rem", color: NEON }}>
                  Get In Touch
                </h3>
                <img src="/Logotype green.png" alt="Turnpage" style={{ height: 28, opacity: 0.85 }} />
              </div>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginBottom: "1.5rem" }}>
                Fill out the form below and our team will respond within 48 hours.
              </p>

              <form ref={formRef} onSubmit={handleSubmit}>
                <div className="form-row-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <FormField label="First Name" name="firstName" type="text" required />
                  <FormField label="Last Name" name="lastName" type="text" required />
                </div>
                <div className="form-row-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <FormField label="Email" name="email" type="email" required />
                  <FormField label="Phone" name="phone" type="tel" />
                </div>
                <FormSelect label="Subject" name="subject" required options={[
                  { value: "", label: "Select a subject", disabled: true },
                  { value: "quote", label: "Request a Quote" },
                  { value: "claims", label: "Claims Inquiry" },
                  { value: "partnership", label: "Partnership" },
                  { value: "other", label: "Other" },
                ]} />
                <FormField label="Message" name="message" type="textarea" placeholder="Tell us about your situation..." required />

                {formState === "error" && (
                  <p style={{ fontSize: "0.85rem", color: "#ff6b5a", marginBottom: "0.5rem" }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={formState === "submitting"}
                  style={{
                    display: "block", width: "100%", fontFamily: FONT, fontWeight: 700,
                    fontSize: "clamp(0.85rem,1.3vw,1rem)", color: "#000", background: NEON,
                    border: "none", letterSpacing: "0.12em", textTransform: "uppercase",
                    padding: "0.9em", borderRadius: 50, cursor: formState === "submitting" ? "wait" : "pointer",
                    transition: "background 0.3s, transform 0.3s, box-shadow 0.3s",
                    marginTop: "0.5rem", opacity: formState === "submitting" ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => { if (formState !== "submitting") { e.target.style.background = "#e2ff4d"; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 4px 20px rgba(212,255,0,0.3)"; } }}
                  onMouseLeave={(e) => { e.target.style.background = NEON; e.target.style.transform = ""; e.target.style.boxShadow = ""; }}
                >
                  {formState === "submitting" ? "Sending..." : "Send Message \u2192"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer style={{
        background: "#000", textAlign: "center", padding: "2rem 0",
        fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.18)",
      }}>
        &copy; 2026 Turnpage Digital Markets LLC
      </footer>
    </>
  );
}

/* ─── Form field components ─── */
const inputStyle = {
  width: "100%", background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
  padding: "0.7rem 0.9rem", fontFamily: FONT, fontSize: "0.95rem",
  color: "#fff", outline: "none",
  transition: "border-color 0.3s, background 0.3s",
};

function FormField({ label, name, type, placeholder, required }) {
  const isTextarea = type === "textarea";
  const Tag = isTextarea ? "textarea" : "input";
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.35rem" }}>
        {label}
      </label>
      <Tag
        name={name}
        type={isTextarea ? undefined : type}
        placeholder={placeholder}
        required={required}
        style={{
          ...inputStyle,
          ...(isTextarea ? { resize: "vertical", minHeight: 100 } : {}),
        }}
        onFocus={(e) => { e.target.style.borderColor = NEON; e.target.style.background = "rgba(255,255,255,0.12)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
      />
    </div>
  );
}

function FormSelect({ label, name, required, options }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.35rem" }}>
        {label}
      </label>
      <select
        name={name}
        required={required}
        defaultValue=""
        style={{
          ...inputStyle,
          appearance: "none", cursor: "pointer",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 0.9rem center",
        }}
        onFocus={(e) => { e.target.style.borderColor = NEON; e.target.style.background = "rgba(255,255,255,0.12)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled} style={{ background: "#1a1a1a", color: "#fff" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
