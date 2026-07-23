/* Shared math for registration-flow "computed" fields.
 *
 * Imported by BOTH the public renderer (src/components/sections/
 * RegistrationFlowSection.jsx) AND the server submission handler
 * (functions/api/register.js), so the price a visitor sees on screen and the
 * price emailed to the team are always produced by the exact same formula.
 *
 * A computed field looks like:
 *   {
 *     "id": "estimated_offer",
 *     "type": "computed",
 *     "label": "Your estimated offer",
 *     "rate": 1000,                       // dollars per weighted work
 *     "terms": [                          // each term = a Number field × factor
 *       { "field": "self_pub_count",  "factor": 1 },
 *       { "field": "publisher_count", "factor": 0.5 }
 *     ],
 *     "prefix": "$",                      // optional (default "$")
 *     "suffix": "",                       // optional
 *     "gateOn": "email"                   // optional: stay hidden until this
 *                                         //   field has a value
 *   }
 *
 * value = rate × Σ ( factor_i × count(answers[field_i]) )
 */

/* Parse a user-entered count. Blank / non-numeric / negative all read as 0 so
   the total never goes backwards or shows NaN. */
export function toCount(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* The raw dollar (or unit) amount, rounded to a whole number.
 * rateOverride lets the server pass a private rate (from an env var) that is
 * never shipped to the browser; when omitted, falls back to field.rate. */
export function computeValue(field, answers = {}, rateOverride) {
  const rate = (typeof rateOverride === "number" && Number.isFinite(rateOverride) && rateOverride >= 0)
    ? rateOverride
    : (Number(field && field.rate) || 0);
  const terms = Array.isArray(field && field.terms) ? field.terms : [];
  let sum = 0;
  for (const t of terms) {
    if (!t || !t.field) continue;
    const factor = Number(t.factor);
    sum += (Number.isFinite(factor) ? factor : 0) * toCount(answers[t.field]);
  }
  return Math.max(0, Math.round(rate * sum));
}

/* 4000 → "4,000". Manual grouping (no Intl) so it behaves identically in the
   browser and in the Cloudflare Worker. */
function withCommas(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* The display string, e.g. "$4,000". rateOverride is forwarded to computeValue
   so the server can price with a private rate. */
export function formatComputed(field, answers = {}, rateOverride) {
  const prefix = field && field.prefix != null ? field.prefix : "$";
  const suffix = field && field.suffix != null ? field.suffix : "";
  return `${prefix}${withCommas(computeValue(field, answers, rateOverride))}${suffix}`;
}

/* A computed field with gateOn stays hidden until that field has a value —
   used to make people enter an email before the price is revealed. */
export function computedGateSatisfied(field, answers = {}) {
  const gate = field && field.gateOn;
  if (!gate) return true;
  const v = answers[gate];
  return v != null && String(v).trim() !== "";
}

/* ── Server-priced offer (two-bucket + volume premium) ─────────────────────
   The Bartz offer is priced from PRIVATE values that live only on the server
   (functions/api/_pricing-config.json, edited in the admin Pricing tab):
     selfRecovery ............ $/self-published work
     publisherRecovery ....... $/work with a publisher
     payoutRatePct ........... % of expected recovery we pay
     volumePremiumThreshold .. # eligible works above which a premium applies
     volumePremiumPct ........ % premium added when the count clears the threshold

     base  = (payoutRatePct/100) × (selfRecovery × selfWorks
                                    + publisherRecovery × publisherWorks)
     offer = eligibleWorks > threshold ? base × (1 + volumePremiumPct/100) : base
   where eligibleWorks = selfWorks + publisherWorks (the purchased works).

   The field names the two count fields (selfField / publisherField). Because
   the pricing values are never sent to the browser, this runs server-side
   (quote.js, register.js) and the flow fetches the finished number. */
export function computeOffer(field, answers = {}, pricing = {}) {
  const pct = Number(pricing.payoutRatePct);
  const rate = Number.isFinite(pct) && pct >= 0 ? pct / 100 : 0;
  const selfR = Number(pricing.selfRecovery) || 0;
  const pubR = Number(pricing.publisherRecovery) || 0;
  const selfCount = toCount(answers[field && field.selfField]);
  const pubCount = toCount(answers[field && field.publisherField]);
  let offer = rate * (selfR * selfCount + pubR * pubCount);

  // Volume premium: add a % when eligible works clear the threshold.
  const premiumPct = Number(pricing.volumePremiumPct);
  const threshold = Number(pricing.volumePremiumThreshold);
  const eligible = selfCount + pubCount;
  if (Number.isFinite(premiumPct) && premiumPct > 0 &&
      Number.isFinite(threshold) && eligible > threshold) {
    offer *= 1 + premiumPct / 100;
  }
  return Math.max(0, Math.round(offer));
}

/* Offer + the numbers behind it, for display to the registrant:
   recovery = gross estimated recovery (before the payout rate);
   pct = the effective share of recovery the offer represents (payout rate,
   including any volume premium), rounded to a whole percent. */
export function computeOfferBreakdown(field, answers = {}, pricing = {}) {
  const selfR = Number(pricing.selfRecovery) || 0;
  const pubR = Number(pricing.publisherRecovery) || 0;
  const selfCount = toCount(answers[field && field.selfField]);
  const pubCount = toCount(answers[field && field.publisherField]);
  const recovery = Math.max(0, Math.round(selfR * selfCount + pubR * pubCount));
  const offer = computeOffer(field, answers, pricing);
  const pct = recovery > 0
    ? Math.round((offer / recovery) * 10000) / 100
    : Math.round((Number(pricing.payoutRatePct) || 0) * 100) / 100;
  const prefix = field && field.prefix != null ? field.prefix : "$";
  const suffix = field && field.suffix != null ? field.suffix : "";
  return {
    offer,
    recovery,
    pct,
    offerDisplay: `${prefix}${withCommas(offer)}${suffix}`,
    recoveryDisplay: `${prefix}${withCommas(recovery)}${suffix}`,
  };
}

export function formatOffer(field, answers = {}, pricing = {}) {
  const prefix = field && field.prefix != null ? field.prefix : "$";
  const suffix = field && field.suffix != null ? field.suffix : "";
  return `${prefix}${withCommas(computeOffer(field, answers, pricing))}${suffix}`;
}
