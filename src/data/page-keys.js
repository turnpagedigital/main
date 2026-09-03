/**
 * page-keys.js — Single source of truth for page key/label pairs.
 *
 * Derived directly from routes.json so that adding or renaming a route
 * in routes.json automatically propagates to every admin tab, validator,
 * and utility that imports from here.
 *
 * IMPORTANT: "Press topics" (copyright, crypto, litigation, tariffs,
 * bankruptcy) are a SEPARATE taxonomy used only in the Press tab.
 * Do NOT merge those with these page keys.
 */

import routesData from "./routes.json";

// Keys that should never appear in "tag this FAQ/alert to a page" lists
const EXCLUDE_FROM_MARKETING = new Set([
  "admin",
  "briefing",   // dynamic route
  "privacy",
  "terms",
  "faq",        // the FAQ page itself doesn't get tagged
  "ai-guide",   // machine-facing reference page — nothing gets tagged to it
]);

// Keys that should never appear in the nav href page picker
const EXCLUDE_FROM_NAV = new Set(["admin"]);

/**
 * Pages that can be tagged in FAQs, alerts, testimonials, OG images, etc.
 * Shape: [{ key, label, path }, ...]
 */
export const MARKETING_PAGES = routesData.routes
  .filter(r => !r.dynamic && !EXCLUDE_FROM_MARKETING.has(r.key))
  .map(r => ({ key: r.key, label: r.title, path: r.path }));

/**
 * All non-admin internal pages — for the nav href page picker.
 * Shape: [{ key, label, path }, ...]
 */
export const INTERNAL_PAGES = routesData.routes
  .filter(r => !r.dynamic && !EXCLUDE_FROM_NAV.has(r.key))
  .map(r => ({ key: r.key, label: r.title, path: r.path }));

/**
 * Convenience: a Set of all valid marketing page keys — for backend-style
 * validation on the client side.
 */
export const MARKETING_PAGE_KEYS = new Set(MARKETING_PAGES.map(p => p.key));
