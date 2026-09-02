/* Route-reference detection helpers for cascade updates.
   Used by routes.js to find all references to a path in nav.json. */

/* Hrefs may carry a section bookmark ("/page#section") — a rename of /page
   must catch and rewrite those too, preserving the anchor. */
function matchesPath(href, oldPath) {
  return href === oldPath ||
    (typeof href === "string" && href.startsWith(oldPath + "#"));
}
function rewriteHref(href, oldPath, newPath) {
  if (href === oldPath) return newPath;
  if (typeof href === "string" && href.startsWith(oldPath + "#")) {
    return newPath + href.slice(oldPath.length);
  }
  return href;
}

/**
 * Scan navData for references to oldPath and return a list of changes
 * that would be made if the path were renamed to newPath.
 *
 * @param {string} oldPath  e.g. "/ai-copyright"
 * @param {string} newPath  e.g. "/copyright-claims"
 * @param {object} navData  parsed nav.json { items, microsites }
 * @returns {Array<{ type, location, old, new }>}
 */
export function detectRouteReferences(oldPath, newPath, navData) {
  const refs = [];

  // Nav items
  (navData.items || []).forEach((item, _idx) => {
    if (matchesPath(item.href, oldPath)) {
      refs.push({
        type: "nav-item-href",
        location: `Nav item "${item.label || item.id}"`,
        old: oldPath,
        new: newPath,
      });
    }
    // Dropdown links
    (item.dropdown?.links || []).forEach((link, li) => {
      if (matchesPath(link.href, oldPath)) {
        refs.push({
          type: "nav-dropdown-link",
          location: `Nav "${item.label}" → dropdown link "${link.label || li}"`,
          old: oldPath,
          new: newPath,
        });
      }
    });
    if (matchesPath(item.dropdown?.cta?.href, oldPath)) {
      refs.push({
        type: "nav-dropdown-cta",
        location: `Nav "${item.label}" → dropdown CTA`,
        old: oldPath,
        new: newPath,
      });
    }
  });

  // Microsite navs
  Object.entries(navData.microsites || {}).forEach(([key, microsite]) => {
    if (matchesPath(microsite.brand?.href, oldPath)) {
      refs.push({
        type: "microsite-brand",
        location: `Microsite "${key}" → brand link`,
        old: oldPath,
        new: newPath,
      });
    }
    (microsite.items || []).forEach((item, idx) => {
      if (matchesPath(item.href, oldPath)) {
        refs.push({
          type: "microsite-item",
          location: `Microsite "${key}" → item "${item.label || idx}"`,
          old: oldPath,
          new: newPath,
        });
      }
    });
    if (matchesPath(microsite.cta?.href, oldPath)) {
      refs.push({
        type: "microsite-cta",
        location: `Microsite "${key}" → CTA`,
        old: oldPath,
        new: newPath,
      });
    }
  });

  return refs;
}

/**
 * Apply a set of detected changes to navData, returning a new object.
 *
 * @param {object} navData   parsed nav.json
 * @param {Array}  changes   array from detectRouteReferences
 * @returns {object} updated navData (deep clone, original untouched)
 */
export function applyRouteReferences(navData, changes) {
  const updated = JSON.parse(JSON.stringify(navData));

  for (const change of changes) {
    switch (change.type) {
      case "nav-item-href":
        (updated.items || []).forEach(item => {
          item.href = rewriteHref(item.href, change.old, change.new);
        });
        break;

      case "nav-dropdown-link":
        (updated.items || []).forEach(item => {
          (item.dropdown?.links || []).forEach(link => {
            link.href = rewriteHref(link.href, change.old, change.new);
          });
        });
        break;

      case "nav-dropdown-cta":
        (updated.items || []).forEach(item => {
          if (item.dropdown?.cta) {
            item.dropdown.cta.href = rewriteHref(item.dropdown.cta.href, change.old, change.new);
          }
        });
        break;

      case "microsite-brand":
        Object.values(updated.microsites || {}).forEach(ms => {
          if (ms.brand) ms.brand.href = rewriteHref(ms.brand.href, change.old, change.new);
        });
        break;

      case "microsite-item":
        Object.values(updated.microsites || {}).forEach(ms => {
          (ms.items || []).forEach(item => {
            item.href = rewriteHref(item.href, change.old, change.new);
          });
        });
        break;

      case "microsite-cta":
        Object.values(updated.microsites || {}).forEach(ms => {
          if (ms.cta) ms.cta.href = rewriteHref(ms.cta.href, change.old, change.new);
        });
        break;
    }
  }

  return updated;
}

/* Merge a rename into the _redirects rule list:
   - keep comment lines as-is
   - drop any rule whose source is the path coming back into service (newPath)
   - re-point rules that targeted oldPath at newPath (no redirect chains)
   - replace any stale rule for oldPath with "oldPath newPath 301"
   - keep catch-all rules (/*) LAST: Pages matches top-down, first match wins,
     so a 301 appended below the SPA fallback would never fire. */
export function buildRedirects(existingText, oldPath, newPath) {
  const lines = (existingText || "").split("\n").map(l => l.trim()).filter(Boolean);
  const comments = lines.filter(l => l.startsWith("#"));
  const rules = lines
    .filter(l => !l.startsWith("#"))
    .map(l => l.split(/\s+/))
    .filter(parts => parts.length >= 2)
    .filter(([from]) => from !== newPath && from !== oldPath)
    .map(([from, to, ...rest]) => [from, to === oldPath ? newPath : to, ...rest]);
  rules.push([oldPath, newPath, "301"]);
  const isCatchAll = ([from]) => from.includes("*");
  const ordered = [...rules.filter(r => !isCatchAll(r)), ...rules.filter(isCatchAll)];
  return [...comments, ...ordered.map(p => p.join(" "))].join("\n") + "\n";
}
