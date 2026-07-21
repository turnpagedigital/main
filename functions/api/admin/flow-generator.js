import { isAuthed, jsonResponse } from "./_utils.js";

/* POST /api/admin/flow-generator
   Body: { prompt: string }
   Calls the Anthropic API to generate a registration flow JSON from a plain-
   English description. The returned flow is always active:false so the admin
   can review it before publishing.

   Requires ANTHROPIC_API_KEY in Cloudflare environment variables.
*/

const SYSTEM_PROMPT = `You are a registration flow designer for Turnpage Digital Markets, a legal finance platform that buys claims from rights holders — copyright, bankruptcy, crypto, litigation, and similar.

Given a plain-English description of what information to collect, output a complete multi-step registration flow JSON. Design it to feel conversational and efficient: 3–5 steps, 1–3 fields per step. Front-load branching questions so later steps can be conditional.

FIELD TYPES:
  text      — single-line text input
  email     — email address (auto-validated on submit)
  phone     — phone number
  number    — numeric input (use for exact counts you want to add up in a price)
  textarea  — paragraph / longer freeform answer
  select    — dropdown (best for 5+ choices); needs "options" array
  choice    — pill-button group (best for 2–5 choices, more scannable than a dropdown); needs "options" array
  yesno     — Yes / No buttons; no options needed
  file      — file upload; add "accept": ["pdf","png","jpg"] and "help": "hint text shown under the label"
  computed  — a live, display-only price. Not a question. Add "rate": <number>, "terms": [{ "field": "<id of an earlier number field>", "factor": <number> }] (price = rate × Σ factor×count), optional "prefix" (default "$"), "suffix", "gateOn": "<earlier field id>" to hide it until that field is filled, and "help" for a note under the price. Never mark computed fields required.

BRANCHING: Any step (except the first) may include "showIf": { "fieldId": "<id of an earlier field>", "equals": "<exact option text>" } to only appear when that earlier answer matches. Only choice / select / yesno fields from strictly earlier steps are valid targets.

FIELD IDs: use snake_case (e.g. "claim_size"). STEP IDs and FLOW IDS: use kebab-case.

RULES:
- Keep each step title short (2–4 words).
- Keep question labels concise and conversational.
- Always end with a contact-details step (firstName, lastName, email, and optionally phone).
- Set active: false (admin reviews before publishing).
- The "attioLabel" should be a short kebab-case CRM tag matching the flow's topic.

Respond with ONLY the raw JSON object — no markdown fences, no explanation, no commentary before or after.

SCHEMA:
{
  "id": "kebab-case-slug",
  "name": "Human-readable flow name",
  "active": false,
  "attioLabel": "crm-label",
  "intro": "2–3 sentence intro shown above step 1. Explain what the form is for and how long it takes.",
  "submitLabel": "Submit registration",
  "successTitle": "Thank you — we're on it.",
  "successBody": "We'll review your details and reach out within 48 hours.",
  "steps": [
    {
      "id": "step-slug",
      "title": "Step title",
      "fields": [
        {
          "id": "snake_case_id",
          "type": "choice",
          "label": "Conversational question?",
          "required": true,
          "options": ["Option A", "Option B", "Option C"]
        }
      ]
    },
    {
      "id": "conditional-step",
      "title": "Conditional step",
      "showIf": { "fieldId": "snake_case_id", "equals": "Option A" },
      "fields": [...]
    },
    {
      "id": "contact",
      "title": "Contact details",
      "fields": [
        { "id": "firstName", "type": "text",  "label": "First name", "required": true },
        { "id": "lastName",  "type": "text",  "label": "Last name",  "required": true },
        { "id": "email",     "type": "email", "label": "Email",      "required": true },
        { "id": "phone",     "type": "phone", "label": "Phone (optional)", "required": false }
      ]
    }
  ]
}`;

export async function onRequestPost({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({
      ok: false,
      error: "ANTHROPIC_API_KEY is not configured. Add it in the Cloudflare Pages environment variables for this project.",
    }, 500);
  }

  let prompt;
  try {
    const body = await request.json();
    prompt = (body?.prompt || "").trim().slice(0, 2000);
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (!prompt) {
    return jsonResponse({ ok: false, error: "prompt is required" }, 400);
  }

  let apiResp;
  try {
    apiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: `Network error calling Anthropic: ${err.message}` }, 502);
  }

  if (!apiResp.ok) {
    const errText = await apiResp.text().catch(() => "");
    return jsonResponse({ ok: false, error: `Anthropic API error ${apiResp.status}: ${errText.slice(0, 300)}` }, 502);
  }

  const apiBody = await apiResp.json();
  const rawText = (apiBody?.content?.[0]?.text || "").trim();

  // Strip accidental markdown fences
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let flow;
  try {
    flow = JSON.parse(cleaned);
  } catch {
    return jsonResponse({
      ok: false,
      error: "The AI returned something that couldn't be parsed as JSON. Try rephrasing your description.",
      raw: rawText.slice(0, 500),
    }, 422);
  }

  // Ensure it's always a draft
  flow.active = false;

  return jsonResponse({ ok: true, flow });
}
