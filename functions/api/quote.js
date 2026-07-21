/**
 * Cloudflare Pages Function: /api/quote
 *
 * Prices a computed registration-flow field SERVER-SIDE so the pricing inputs
 * (expected recovery per work + payout %) never ship to the browser. They live
 * in functions/api/_pricing-config.json (edited only in the admin Pricing tab).
 * The flow POSTs the current work counts; we return ONLY the finished price
 * string — never the underlying rates.
 *
 * Body: { flowId, fieldId, answers: { <selfField>: "3", <publisherField>: "2" } }
 * Reply: { display: "$6,000", value: 6000 }
 */

import formsData from "../../src/data/forms.json";
import pricing from "./_pricing-config.json";
import { formatOffer, computeOffer } from "../../src/lib/flow-compute.js";

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

export async function onRequestPost(context) {
  const { request } = context;
  const corsHeaders = corsHeadersFor(request);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Bad request" }, 400); }

  const flow = (formsData.flows || []).find((f) => f.id === body.flowId && f.active !== false);
  if (!flow) return json({ error: "Unknown flow" }, 404);

  let field = null;
  for (const step of flow.steps || []) {
    for (const f of step.fields || []) {
      if (f.id === body.fieldId && f.type === "computed") field = f;
    }
  }
  if (!field) return json({ error: "Unknown field" }, 404);

  // Only read the two count fields this offer references.
  const raw = body.answers && typeof body.answers === "object" ? body.answers : {};
  const answers = {};
  for (const key of [field.selfField, field.publisherField]) {
    if (key && (typeof raw[key] === "string" || typeof raw[key] === "number")) {
      answers[key] = String(raw[key]).slice(0, 20);
    }
  }

  return json({ display: formatOffer(field, answers, pricing), value: computeOffer(field, answers, pricing) });
}

export async function onRequestOptions(context) {
  return new Response(null, { headers: corsHeadersFor(context.request) });
}
