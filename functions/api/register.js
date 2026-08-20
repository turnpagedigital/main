/**
 * Cloudflare Pages Function: /api/register
 *
 * Receives multi-step registration-flow submissions (see
 * src/components/sections/RegistrationFlowSection.jsx). The flow definition
 * in src/data/forms.json is the server-side source of truth: unknown flows,
 * unknown fields, missing required answers, and oversized/odd files are all
 * rejected here regardless of what the client sent.
 *
 * Delivery:
 *  1. Notification email via Resend (file answers become attachments) —
 *     always, this is the baseline channel.
 *  2. Google Sheet row via Apps Script (best-effort, same as /api/contact).
 *  3. Attio CRM (best-effort, only when ATTIO_API_KEY is set): asserts the
 *     person by email and attaches a note titled with the flow's attioLabel
 *     so each landing page's registrations are identifiable in the CRM.
 *
 * Environment variables: RESEND_API_KEY, NOTIFY_EMAIL, FROM_EMAIL,
 * GOOGLE_SHEET_URL (all shared with /api/contact), plus optional
 * ATTIO_API_KEY.
 */

import formsData from "../../src/data/forms.json";
import pricing from "./_pricing-config.json";
import { formatOffer, computeOfferBreakdown } from "../../src/lib/flow-compute.js";
import { classifyWork, summarizeWorks, amazonSearchUrl, settlementLookupUrl } from "./_claim-links.js";
import { checkClaimPdf } from "./_pdf-checks.js";
import { findPartnerByCode, partnerReference, stampLeadPerson, DEAL_REFERRED_BY_SLUG } from "./_attio.js";

const ALLOWED_ORIGINS = [
  "https://turnpagedigital.com",
  "https://www.turnpagedigital.com",
];
function corsHeadersFor(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.turnpagedigital\.pages\.dev$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://turnpagedigital.com",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ANSWER_MAX = { textarea: 5000, default: 300 };
const MAX_FILES = 3;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const FILE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const ATTRIBUTION_FIELDS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "ref",
];

/* Mirror of the client's branching rule — answers on hidden steps are not
   required and not accepted. */
function visibleSteps(flow, answers) {
  return (flow.steps || []).filter(
    (s) => !s.showIf || !s.showIf.fieldId || answers[s.showIf.fieldId] === s.showIf.equals,
  );
}

/* Same shape, but for a field-level showIf — lets a branch driver (e.g. role)
   and its branch-specific fields share one step, so a field can be hidden
   even on a step that's otherwise visible. */
function isFieldVisible(field, answers) {
  return !field.showIf || !field.showIf.fieldId || answers[field.showIf.fieldId] === field.showIf.equals;
}

/* The id of the flow's email (or phone) field, whatever an admin has named
   it — there's only ever meaningfully one of each type per flow, so looking
   it up by type instead of a hardcoded id survives an admin renaming the
   field (which has happened more than once). Answers below are read via
   these instead of a literal answers.email / answers.phone. */
function findFieldIdByType(flow, type) {
  for (const step of flow.steps || []) {
    for (const f of step.fields || []) {
      if (f.type === type) return f.id;
    }
  }
  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = corsHeadersFor(request);
  const fail = (msg, status = 400) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!env.RESEND_API_KEY) return fail("Registration service not configured", 500);

    let body;
    try { body = await request.json(); }
    catch { return fail("Bad request"); }
    if (!body || typeof body !== "object") return fail("Bad request");

    const flow = (formsData.flows || []).find(
      (f) => f.id === body.flowId && f.active !== false,
    );
    if (!flow) return fail("Unknown registration flow");

    const rawAnswers = body.answers && typeof body.answers === "object" ? body.answers : {};

    // Field map for the flow; validate answers against it
    const fieldById = {};
    for (const step of flow.steps || []) {
      for (const f of step.fields || []) fieldById[f.id] = f;
    }

    const answers = {};
    for (const [k, v] of Object.entries(rawAnswers)) {
      const field = fieldById[k];
      if (!field || field.type === "file") continue; // unknown/file ids: ignore
      if (typeof v !== "string") return fail(`Answer "${k}" must be a string`);
      const cap = ANSWER_MAX[field.type] || ANSWER_MAX.default;
      if (v.length > cap) return fail(`Answer "${k}" exceeds maximum length`);
      answers[k] = v.trim();
    }

    // A required file field with skipLabel can be satisfied by a "I don't
    // have it" checkbox instead of an attachment (see RegistrationFlowSection.jsx
    // skipAnswerKey). That checkbox's answer travels under a synthetic
    // `${fieldId}__skip` key — not a real field id, so it's read directly
    // here rather than through the fieldById-driven loop above, and kept out
    // of `answers` so it can never leak into the notification email/Attio
    // note (those iterate by defined field, not by raw answer key).
    const skipFlags = {};
    for (const step of flow.steps || []) {
      for (const f of step.fields || []) {
        if (f.type === "file" && f.skipLabel && rawAnswers[`${f.id}__skip`] === "Yes") {
          skipFlags[f.id] = true;
        }
      }
    }

    // Enforce required fields on the steps (and, within a step, the fields)
    // actually visible for these answers
    const steps = visibleSteps(flow, answers);
    const visibleFieldIds = new Set(
      steps.flatMap((s) => (s.fields || []).filter((f) => isFieldVisible(f, answers)).map((f) => f.id)),
    );
    const files = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES) : [];
    for (const step of steps) {
      if (step.optional) continue; // visitor may have skipped this step entirely
      for (const f of step.fields || []) {
        if (!isFieldVisible(f, answers)) continue;
        if (!f.required) continue;
        if (f.type === "file") {
          if (!skipFlags[f.id] && !files.some((x) => x && x.fieldId === f.id)) return fail(`Missing required file: ${f.label}`);
        } else if (!answers[f.id]) {
          return fail(`Missing required answer: ${f.label}`);
        }
      }
    }
    // Drop answers that belong to steps hidden under the final branch state
    for (const k of Object.keys(answers)) {
      if (!visibleFieldIds.has(k)) delete answers[k];
    }

    // Fill in computed fields server-side from the number answers, so the
    // value we email is authoritative regardless of what the browser sent.
    // Pricing inputs come from the private config — never from the client.
    let offerBreakdown = null;
    for (const step of steps) {
      for (const f of step.fields || []) {
        if (f.type === "computed") {
          answers[f.id] = formatOffer(f, answers, pricing);
          if (f.priced) offerBreakdown = computeOfferBreakdown(f, answers, pricing);
        }
      }
    }

    // Validate files
    const attachments = [];
    for (const file of files) {
      if (!file || typeof file !== "object") continue;
      const field = fieldById[file.fieldId];
      if (!field || field.type !== "file" || !visibleFieldIds.has(file.fieldId)) continue;
      if (typeof file.dataBase64 !== "string" || typeof file.name !== "string") continue;
      if (!FILE_TYPES.has(file.type)) return fail(`File type not accepted for "${field.label}"`);
      if (!/^[A-Za-z0-9+/=]+$/.test(file.dataBase64)) return fail("Malformed file payload");
      const approxBytes = (file.dataBase64.length * 3) / 4;
      if (approxBytes > MAX_FILE_BYTES) return fail(`"${file.name}" is over the 8 MB limit`);
      attachments.push({
        filename: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120),
        content: file.dataBase64,
      });
    }

    // Advisory tamper checks on uploaded PDFs (internal email only)
    let pdfChecks = null;
    try {
      const pdfFile = files.find((x) => x && x.type === "application/pdf" && typeof x.dataBase64 === "string");
      if (pdfFile) pdfChecks = checkClaimPdf(atob(pdfFile.dataBase64));
    } catch (err) {
      console.error("pdf-checks error:", err.message);
    }

    const emailFieldId = findFieldIdByType(flow, "email");
    const email = (emailFieldId && answers[emailFieldId]) || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("A valid email is required");
    const phoneFieldId = findFieldIdByType(flow, "phone");
    const phone = (phoneFieldId && answers[phoneFieldId]) || "";
    // First/last name aren't a distinct field type (any "text" field could be
    // one), so — unlike email/phone above — these still rely on the flow
    // using one of these recognized ids for its name fields. This list has
    // already had to grow twice as the admin renamed these fields; if it
    // grows again, the fix belongs here, not by chasing the latest id.
    const firstName = answers.first_name || answers.firstName || answers.first || "";
    const lastName = answers.last_name || answers.lastName || answers.last || "";

    const attribution = {};
    for (const f of ATTRIBUTION_FIELDS) {
      if (typeof body[f] === "string" && body[f].trim()) {
        attribution[f] = body[f].trim().slice(0, 200);
      }
    }
    const pageKey = typeof body.pageKey === "string" ? body.pageKey.slice(0, 80) : "";

    const notifyEmail = env.NOTIFY_EMAIL || "info@turnpagedigital.com";
    const fromEmail = env.FROM_EMAIL || "Turnpage Digital Markets <noreply@turnpagedigital.com>";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || email;

    // Ordered answer rows following the flow's own step/field order
    const answerRows = steps
      .flatMap((s) => s.fields || [])
      .filter((f) => f.type !== "file" && answers[f.id])
      .map((f) =>
        `<tr><td style="padding:6px 8px 6px 0;color:#666;vertical-align:top;width:45%;">${escapeHtml(f.label)}</td>` +
        `<td style="padding:6px 0;font-weight:600;white-space:pre-wrap;">${escapeHtml(answers[f.id])}</td></tr>`)
      .join("");
    const attributionRows = Object.entries(attribution)
      .map(([k, v]) => `<tr><td style="padding:4px 8px 4px 0;color:#666;">${escapeHtml(k)}</td><td style="padding:4px 0;font-family:monospace;font-size:12px;">${escapeHtml(v)}</td></tr>`)
      .join("");

    // Extracted claim-form works (authors) — re-classified here, with one-click
    // verification links for pre-payout due diligence.
    const CAT_LABEL = { self: "Self (full)", publisher: "Publisher (½)", excluded: "Multi-author (excluded)" };
    const claimWorks = (Array.isArray(body.claimWorks) ? body.claimWorks : [])
      .slice(0, 300)
      .filter((w) => w && typeof w === "object")
      .map((w) => {
        const work = {
          title: String(w.title || "").slice(0, 300),
          author: String(w.author || "").slice(0, 200),
          publisher: String(w.publisher || "").slice(0, 200),
          isbn: String(w.isbn || "").slice(0, 60),
          soleOwner: w.soleOwner === true,
          hasCoAuthor: w.hasCoAuthor === true,
        };
        work.category = classifyWork(work);
        return work;
      })
      .filter((w) => w.title || w.isbn);
    const worksCounts = summarizeWorks(claimWorks);
    const worksRows = claimWorks
      .map((w) =>
        `<tr>` +
        `<td style="padding:5px 8px 5px 0;vertical-align:top;">${escapeHtml(w.title || "—")}${w.isbn ? `<br><span style="color:#999;font-size:12px;">${escapeHtml(w.isbn)}</span>` : ""}</td>` +
        `<td style="padding:5px 8px;color:#666;vertical-align:top;white-space:nowrap;">${escapeHtml(CAT_LABEL[w.category] || "")}</td>` +
        `<td style="padding:5px 0;vertical-align:top;white-space:nowrap;"><a href="${amazonSearchUrl(w)}">Amazon</a> · <a href="${settlementLookupUrl(w)}">Works List</a></td>` +
        `</tr>`)
      .join("");

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h2 style="color:#D4FF00;margin:0;font-size:18px;">New Registration — ${escapeHtml(flow.name)}</h2>
          <p style="color:rgba(255,255,255,0.65);margin:6px 0 0;font-size:12px;">Landing page: ${escapeHtml(pageKey || "unknown")} · Label: ${escapeHtml(flow.attioLabel || flow.id)}${attachments.length ? ` · ${attachments.length} file(s) attached` : ""}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">${answerRows}</table>
          ${worksRows ? `
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;" />
          <strong style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Claimed works — ${worksCounts.self} full · ${worksCounts.publisher} half · ${worksCounts.excluded} excluded</strong>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;">${worksRows}</table>
          <p style="font-size:11px;color:#999;margin:6px 0 0;">Verify each work against the Works List and Amazon before payout. Claim-form PDF attached.</p>` : ""}
          ${pdfChecks ? `
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;" />
          <strong style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Claim PDF checks (advisory)</strong>
          ${pdfChecks.flags.length
            ? `<ul style="font-size:13px;color:#B00020;margin:6px 0 0;padding-left:18px;">${pdfChecks.flags.map((f) => `<li style="margin-bottom:4px;">⚠️ ${escapeHtml(f)}</li>`).join("")}</ul>`
            : `<p style="font-size:13px;color:#2D8E47;margin:6px 0 0;">✓ No tamper flags detected.</p>`}
          <p style="font-size:12px;color:#999;margin:6px 0 0;">Producer: ${escapeHtml(pdfChecks.info.producer || "—")} · Creator: ${escapeHtml(pdfChecks.info.creator || "—")} · Created: ${escapeHtml(pdfChecks.info.created || "—")}${pdfChecks.info.modified && pdfChecks.info.modified !== pdfChecks.info.created ? ` · Modified: ${escapeHtml(pdfChecks.info.modified)}` : ""}${pdfChecks.info.signed ? " · Digitally signed" : ""}</p>
          <p style="font-size:11px;color:#999;margin:4px 0 0;">Note: claimants print these PDFs from their own browser, so metadata can't prove origin — flags are hints for manual review, absence of flags is not proof of authenticity.</p>` : ""}
          ${attributionRows ? `
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;" />
          <strong style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Attribution</strong>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;">${attributionRows}</table>` : ""}
        </div>
        <p style="font-size:11px;color:#999;margin-top:16px;text-align:center;">Sent via turnpagedigital.com registration flow</p>
      </div>`;

    // Google Sheet (best-effort)
    if (env.GOOGLE_SHEET_URL) {
      try {
        const sheetRes = await fetch(env.GOOGLE_SHEET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            subject: `Registration: ${flow.name}`,
            message: steps.flatMap((s) => s.fields || [])
              .filter((f) => f.type !== "file" && answers[f.id])
              .map((f) => `${f.label}: ${answers[f.id]}`).join("\n"),
            source: flow.attioLabel || flow.id,
            ...attribution,
            timestamp: new Date().toISOString(),
          }),
        });
        if (!sheetRes.ok) console.error("Sheet error:", sheetRes.status);
      } catch (err) {
        console.error("Sheet error:", err.message);
      }
    }

    // Attio (best-effort, only when configured)
    if (env.ATTIO_API_KEY) {
      try {
        await pushToAttio(env, { flow, answers, email, firstName, lastName, phone, fullName, pageKey, attribution, steps, offerBreakdown });
      } catch (err) {
        console.error("Attio error:", err.message);
      }
    }

    // Notification email — the one channel that must succeed
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notifyEmail],
        reply_to: email,
        subject: `New registration: ${fullName} — ${flow.name}`,
        html,
        ...(attachments.length ? { attachments } : {}),
      }),
    });
    if (!resendRes.ok) {
      console.error("Resend error:", resendRes.status, (await resendRes.text()).slice(0, 300));
      throw new Error("Failed to send email");
    }

    // Confirmation email to the registrant with their submitted info and quote.
    // Best-effort: the registration already succeeded, so a failure here only logs.
    try {
      const quote = answers.estimated_offer || "";
      const confirmHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;">
          <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h2 style="color:#D4FF00;margin:0;font-size:18px;">We received your registration</h2>
            <p style="color:rgba(255,255,255,0.65);margin:6px 0 0;font-size:12px;">${escapeHtml(flow.name)} · Turnpage Digital Markets</p>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
            <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Hi ${escapeHtml(firstName || "there")},</p>
            <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Thanks for registering. Here's a copy of what you submitted${attachments.length ? " (we also received your claim form)" : ""}:</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">${answerRows}</table>
            ${worksCounts.total ? `
            <p style="font-size:13px;color:#666;margin:16px 0 0;">Claimed works we read from your claim form: <strong>${worksCounts.self}</strong> at the full rate, <strong>${worksCounts.publisher}</strong> at the half rate, <strong>${worksCounts.excluded}</strong> not purchased.</p>` : ""}
            ${quote ? `
            <div style="background:#1a1a1a;border-radius:10px;padding:20px 24px;margin:20px 0 0;">
              <p style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Your estimated offer</p>
              <p style="color:#D4FF00;font-size:30px;font-weight:800;margin:0;">${escapeHtml(quote)}</p>
              ${offerBreakdown && offerBreakdown.pct > 0 ? `
              <p style="color:rgba(255,255,255,0.75);font-size:13px;line-height:1.6;margin:10px 0 0;">Based on an estimated recovery of <strong style="color:#fff;">${escapeHtml(offerBreakdown.recoveryDisplay)}</strong> — this offer is <strong style="color:#fff;">${offerBreakdown.pct}%</strong> of that, paid now.</p>` : ""}
            </div>` : ""}
            <p style="font-size:14px;line-height:1.6;margin:20px 0 0;">We'll review everything and get back to you shortly with next steps. Just reply to this email if anything above needs correcting.</p>
            <p style="font-size:11px;color:#999;line-height:1.6;margin:20px 0 0;">Any figure shown is a preliminary estimate, not a final offer — we confirm your final offer after reviewing your claim details. Turnpage Digital Markets is not affiliated with Anthropic, the claims administrator, class counsel, or the Court, and does not provide legal or financial advice.</p>
          </div>
          <p style="font-size:11px;color:#999;margin-top:16px;text-align:center;">Sent by turnpagedigital.com because you registered on our site</p>
        </div>`;
      const confirmRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          reply_to: notifyEmail,
          subject: `We received your registration — Turnpage Digital Markets`,
          html: confirmHtml,
        }),
      });
      if (!confirmRes.ok) {
        console.error("Confirmation email error:", confirmRes.status, (await confirmRes.text()).slice(0, 300));
      }
    } catch (err) {
      console.error("Confirmation email error:", err.message);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Register API error:", err.message);
    return fail("Failed to submit. Please email us directly at info@turnpagedigital.com.", 500);
  }
}

/* Assert the person by email, then attach a note labeled with the flow's
   attioLabel. Uses Attio's standard People object; the label travels in the
   note title + content so it works in any workspace without custom-attribute
   setup. */
/* Default owner for auto-created deals: Andrew's Attio workspace membership.
   Override with the ATTIO_DEAL_OWNER env var (a workspace_member_id) if the
   owner should ever change without a code deploy. */
const ATTIO_DEFAULT_DEAL_OWNER = "4802a3c8-c7d8-46fb-9384-b7c4effc8f3c";

async function pushToAttio(env, { flow, answers, email, firstName, lastName, phone, fullName, pageKey, attribution, steps, offerBreakdown }) {
  const headers = {
    Authorization: `Bearer ${env.ATTIO_API_KEY}`,
    "Content-Type": "application/json",
  };

  const personValues = {
    email_addresses: [{ email_address: email }],
  };
  if (firstName || lastName) {
    personValues.name = [{
      first_name: firstName || "",
      last_name: lastName || "",
      full_name: fullName,
    }];
  }
  if (phone) {
    personValues.phone_numbers = [{ original_phone_number: phone }];
  }

  const assertRes = await fetch(
    "https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses",
    { method: "PUT", headers, body: JSON.stringify({ data: { values: personValues } }) },
  );
  if (!assertRes.ok) {
    throw new Error(`person assert ${assertRes.status}: ${(await assertRes.text()).slice(0, 200)}`);
  }
  const person = await assertRes.json();
  const recordId = person?.data?.id?.record_id;
  if (!recordId) throw new Error("person assert returned no record id");

  // Referral partner link + submission tracking (source, first/last
  // submission timestamps). Logs-and-continues on any schema gap.
  const partner = findPartnerByCode(attribution.ref);
  await stampLeadPerson(env, recordId, {
    partner,
    source: `Registration — ${flow.attioLabel || flow.name || flow.id}`,
    existingValues: person?.data?.values,
  });

  const lines = steps.flatMap((s) => s.fields || [])
    .filter((f) => f.type !== "file" && answers[f.id])
    .map((f) => `${f.label}: ${answers[f.id]}`);
  if (pageKey) lines.push(`Landing page: ${pageKey}`);
  for (const [k, v] of Object.entries(attribution)) lines.push(`${k}: ${v}`);

  const noteRes = await fetch("https://api.attio.com/v2/notes", {
    method: "POST",
    headers,
    body: JSON.stringify({
      data: {
        parent_object: "people",
        parent_record_id: recordId,
        title: `Registration [${flow.attioLabel || flow.id}] — ${flow.name}`,
        format: "plaintext",
        content: lines.join("\n"),
      },
    }),
  });
  if (!noteRes.ok) {
    throw new Error(`note ${noteRes.status}: ${(await noteRes.text()).slice(0, 200)}`);
  }

  // Resolve the flow's Attio project (e.g. "Bartz") to a record in the
  // custom Projects object so the deal's Project field links automatically.
  // Best-effort: an unmatched name just leaves Project unset.
  let projectRef = null;
  if (flow.attioProject) {
    try {
      const q = await fetch("https://api.attio.com/v2/objects/project/records/query", {
        method: "POST",
        headers,
        body: JSON.stringify({ filter: { project_name: flow.attioProject }, limit: 1 }),
      });
      if (q.ok) {
        const qb = await q.json();
        const rid = qb?.data?.[0]?.id?.record_id;
        if (rid) projectRef = [{ target_object: "project", target_record_id: rid }];
      } else {
        console.error("Attio project lookup:", q.status, (await q.text()).slice(0, 150));
      }
    } catch (err) {
      console.error("Attio project lookup error:", err.message);
    }
  }

  // One Deal per submission, pre-filled for the claim-purchase pipeline:
  // stage Lead, Asset = class-action claim, Deal type = Buying, the person as
  // Seller, and (when the flow priced an offer) Face Amount = estimated
  // recovery, Deal value = our offer, Purchase rate = payout %.
  const personRef = [{ target_object: "people", target_record_id: recordId }];
  const dealValues = {
    name: `${flow.attioProject || flow.name || flow.id} | ${fullName}`,
    stage: "Lead",
    matter_type: "Claim (Class Action)",
    transaction_type: "Buying",
    owner: [{
      referenced_actor_type: "workspace-member",
      referenced_actor_id: env.ATTIO_DEAL_OWNER || ATTIO_DEFAULT_DEAL_OWNER,
    }],
    seller: personRef,
    associated_people: personRef,
    ...(projectRef ? { project: projectRef } : {}),
  };
  if (offerBreakdown && offerBreakdown.offer > 0) {
    dealValues.headline_amount = offerBreakdown.recovery; // face = est. recovery
    dealValues.value = offerBreakdown.offer;              // what we'd pay now
    dealValues.purchase_rate = offerBreakdown.pct;        // payout %
  }
  if (partner) dealValues[DEAL_REFERRED_BY_SLUG] = [partnerReference(partner)];
  const createDeal = () => fetch("https://api.attio.com/v2/objects/deals/records", {
    method: "POST",
    headers,
    body: JSON.stringify({ data: { values: dealValues } }),
  });
  let dealRes = await createDeal();
  if (!dealRes.ok && partner && dealValues[DEAL_REFERRED_BY_SLUG]) {
    // The Deals "Referred by" attribute may not accept this record type
    // (e.g. company partners before the allowed-objects edit) — retry the
    // deal without the link rather than losing the deal entirely.
    console.error(`Attio deal with referral link failed (${dealRes.status}), retrying without:`, (await dealRes.text()).slice(0, 200));
    delete dealValues[DEAL_REFERRED_BY_SLUG];
    dealRes = await createDeal();
  }
  if (!dealRes.ok) {
    throw new Error(`deal ${dealRes.status}: ${(await dealRes.text()).slice(0, 200)}`);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { headers: corsHeadersFor(context.request) });
}
