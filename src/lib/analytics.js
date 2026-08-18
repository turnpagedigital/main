/* Analytics + ad attribution. Config-driven from src/data/analytics.json and
 * INERT by default: with an empty ga4MeasurementId nothing loads and no
 * network request is ever made. Paste IDs into analytics.json to activate
 * (see docs/marketing/setup-checklists.md).
 *
 * What it does once configured:
 *  - loads gtag.js and fires a page_view per SPA route change (App.jsx calls
 *    trackPageView from its route effect)
 *  - fires generate_lead + the Google Ads conversion on successful contact
 *    form submits (IntakeForm calls trackLead)
 *
 * Independent of config, captureAttribution() stores utm_* / gclid / ref
 * from the landing URL in localStorage (90-day window) so the contact form
 * and registration flows can attribute leads even before analytics is
 * activated. `ref` is the referral-partner code (?ref=partner-code links).
 */

import config from "../data/analytics.json";

const GA4_ID = (config.ga4MeasurementId || "").trim();
const ADS_ID = (config.adsConversionId || "").trim();
const ADS_LABEL = (config.adsConversionLabel || "").trim();
const ADS_REG_LABEL = (config.adsRegistrationLabel || "").trim();

/* gtag loads when EITHER product is configured — Google Ads conversion
 * tracking must work before GA4 is ever set up. */
const TAG_ID = GA4_ID || ADS_ID;

const ATTRIBUTION_KEY = "tpdm-attribution";
const ATTRIBUTION_FIELDS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "ref",
];
/* How long captured attribution stays valid. Referral partners hand out
 * links that get clicked days or weeks before the visitor actually
 * registers, so this is deliberately long. */
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

let loaded = false;

function gtag(...args) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

/* Load gtag.js once — only when an ID is configured. */
export function initAnalytics() {
  if (!TAG_ID || loaded) return;
  loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(TAG_ID)}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  // SPA: we fire page_view manually on route changes via trackPageView.
  if (GA4_ID) gtag("config", GA4_ID, { send_page_view: false });
  if (ADS_ID) gtag("config", ADS_ID);
}

/* Fire a page_view for the current location. Safe to call unconfigured.
 * Always inits the tag first: with an Ads-only config the tag still must
 * load on landing so it captures the gclid into Google's cookie —
 * otherwise conversions can't be attributed to the ad click. */
export function trackPageView() {
  if (!TAG_ID) return;
  initAnalytics();
  if (!GA4_ID) return; // page_view is a GA4 event; Ads-only configs stop here
  gtag("event", "page_view", {
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
  });
}

/* Successful contact-form submit: GA4 lead event + Google Ads conversion
 * ("TPDM Contact Form" action, secondary — observed, not bid against). */
export function trackLead(source = "") {
  if (!TAG_ID) return;
  initAnalytics();
  if (GA4_ID) gtag("event", "generate_lead", { lead_source: source || "contact" });
  if (ADS_ID && ADS_LABEL) {
    gtag("event", "conversion", { send_to: `${ADS_ID}/${ADS_LABEL}` });
  }
}

/* Completed registration flow: the PRIMARY Google Ads conversion ("TPDM
 * Registration") — the number the Bartz campaign optimizes and bids on. */
export function trackRegistration(source = "") {
  if (!TAG_ID) return;
  initAnalytics();
  if (GA4_ID) gtag("event", "generate_lead", { lead_source: source || "registration" });
  if (ADS_ID && ADS_REG_LABEL) {
    gtag("event", "conversion", { send_to: `${ADS_ID}/${ADS_REG_LABEL}` });
  }
}

/* Capture utm_* / gclid / ref from the landing URL into localStorage.
 * New params merge over anything stored — a referral click doesn't erase an
 * earlier ad click and vice versa; the same key from a newer link wins. Each
 * new touch restarts the 90-day window. Runs unconditionally (no analytics
 * IDs needed). */
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    for (const f of ATTRIBUTION_FIELDS) {
      const v = params.get(f);
      if (v) found[f] = v.slice(0, 200);
    }
    if (Object.keys(found).length === 0) return;
    const stored = readStoredAttribution();
    localStorage.setItem(
      ATTRIBUTION_KEY,
      JSON.stringify({ ...stored, ...found, _ts: Date.now() }),
    );
  } catch {
    /* storage unavailable (privacy mode) — attribution is best-effort */
  }
}

/* Read + validate the stored blob; expires it after ATTRIBUTION_TTL_MS.
 * Throws only if storage itself is unavailable (callers catch). */
function readStoredAttribution() {
  const raw = localStorage.getItem(ATTRIBUTION_KEY);
  if (!raw) return {};
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return {}; }
  if (typeof parsed._ts === "number" && Date.now() - parsed._ts > ATTRIBUTION_TTL_MS) {
    localStorage.removeItem(ATTRIBUTION_KEY);
    return {};
  }
  const clean = {};
  for (const f of ATTRIBUTION_FIELDS) {
    if (typeof parsed[f] === "string") clean[f] = parsed[f].slice(0, 200);
  }
  return clean;
}

/* Read captured attribution for the contact form + registration flows.
 * Returns {} when none. */
export function getAttribution() {
  try {
    return readStoredAttribution();
  } catch {
    return {};
  }
}
