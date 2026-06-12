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
 * Independent of config, captureAttribution() stores utm_* / gclid from the
 * landing URL in sessionStorage so the contact form can attribute leads even
 * before analytics is activated.
 */

import config from "../data/analytics.json";

const GA4_ID = (config.ga4MeasurementId || "").trim();
const ADS_ID = (config.adsConversionId || "").trim();
const ADS_LABEL = (config.adsConversionLabel || "").trim();

const ATTRIBUTION_KEY = "tpdm-attribution";
const ATTRIBUTION_FIELDS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid",
];

let loaded = false;

function gtag(...args) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

/* Load gtag.js once — only when an ID is configured. */
export function initAnalytics() {
  if (!GA4_ID || loaded) return;
  loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  // SPA: we fire page_view manually on route changes via trackPageView.
  gtag("config", GA4_ID, { send_page_view: false });
  if (ADS_ID) gtag("config", ADS_ID);
}

/* Fire a page_view for the current location. Safe to call unconfigured. */
export function trackPageView() {
  if (!GA4_ID) return;
  initAnalytics();
  gtag("event", "page_view", {
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
  });
}

/* Successful contact-form submit: GA4 lead event + Google Ads conversion. */
export function trackLead(source = "") {
  if (!GA4_ID) return;
  initAnalytics();
  gtag("event", "generate_lead", { lead_source: source || "contact" });
  if (ADS_ID && ADS_LABEL) {
    gtag("event", "conversion", { send_to: `${ADS_ID}/${ADS_LABEL}` });
  }
}

/* Capture utm_* + gclid from the landing URL into sessionStorage. First
 * touch wins for the session — a user wandering the site keeps the params
 * they arrived with. Runs unconditionally (no analytics IDs needed). */
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    for (const f of ATTRIBUTION_FIELDS) {
      const v = params.get(f);
      if (v) found[f] = v.slice(0, 200);
    }
    if (Object.keys(found).length === 0) return;
    if (sessionStorage.getItem(ATTRIBUTION_KEY)) return; // first touch wins
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
  } catch {
    /* sessionStorage unavailable (privacy mode) — attribution is best-effort */
  }
}

/* Read captured attribution for the contact form. Returns {} when none. */
export function getAttribution() {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const clean = {};
    for (const f of ATTRIBUTION_FIELDS) {
      if (typeof parsed[f] === "string") clean[f] = parsed[f].slice(0, 200);
    }
    return clean;
  } catch {
    return {};
  }
}
