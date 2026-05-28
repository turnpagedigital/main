/* Route-reference detection helpers for cascade updates.
   Used by routes.js to find all references to a path in nav.json. */

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
  (navData.items || []).forEach((item, idx) => {
    if (item.href === oldPath) {
      refs.push({
        type: "nav-item-href",
        location: `Nav item "${item.label || item.id}"`,
        old: oldPath,
        new: newPath,
      });
    }
    // Dropdown links
    (item.dropdown?.links || []).forEach((link, li) => {
      if (link.href === oldPath) {
        refs.push({
          type: "nav-dropdown-link",
          location: `Nav "${item.label}" → dropdown link "${link.label || li}"`,
          old: oldPath,
          new: newPath,
        });
      }
    });
    if (item.dropdown?.cta?.href === oldPath) {
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
    if (microsite.brand?.href === oldPath) {
      refs.push({
        type: "microsite-brand",
        location: `Microsite "${key}" → brand link`,
        old: oldPath,
        new: newPath,
      });
    }
    (microsite.items || []).forEach((item, idx) => {
      if (item.href === oldPath) {
        refs.push({
          type: "microsite-item",
          location: `Microsite "${key}" → item "${item.label || idx}"`,
          old: oldPath,
          new: newPath,
        });
      }
    });
    if (microsite.cta?.href === oldPath) {
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
          if (item.href === change.old) item.href = change.new;
        });
        break;

      case "nav-dropdown-link":
        (updated.items || []).forEach(item => {
          (item.dropdown?.links || []).forEach(link => {
            if (link.href === change.old) link.href = change.new;
          });
        });
        break;

      case "nav-dropdown-cta":
        (updated.items || []).forEach(item => {
          if (item.dropdown?.cta?.href === change.old) {
            item.dropdown.cta.href = change.new;
          }
        });
        break;

      case "microsite-brand":
        Object.values(updated.microsites || {}).forEach(ms => {
          if (ms.brand?.href === change.old) ms.brand.href = change.new;
        });
        break;

      case "microsite-item":
        Object.values(updated.microsites || {}).forEach(ms => {
          (ms.items || []).forEach(item => {
            if (item.href === change.old) item.href = change.new;
          });
        });
        break;

      case "microsite-cta":
        Object.values(updated.microsites || {}).forEach(ms => {
          if (ms.cta?.href === change.old) ms.cta.href = change.new;
        });
        break;
    }
  }

  return updated;
}
