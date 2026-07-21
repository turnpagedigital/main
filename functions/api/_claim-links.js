/* Server-side helpers for Bartz claim-form works: classify each work for
 * pricing and build one-click verification links for the review inbox.
 *
 * Used by /api/extract-claim (returns classified works to the browser) and
 * /api/register (renders the works + links into the notification email).
 *
 * Classification (per Andrew's rule, mirroring the settlement's own splits):
 *   sole owner ............................ "self"      → full rate
 *   not sole owner, publisher co-owner .... "publisher" → half rate
 *   not sole owner, has a co-author ....... "excluded"  → not purchased (multi-author)
 */

export function classifyWork(work) {
  if (!work || typeof work !== "object") return "excluded";
  if (work.hasCoAuthor === true) return "excluded";
  if (work.soleOwner === true) return "self";
  return "publisher";
}

/* Roll a list of works up into counts by category. */
export function summarizeWorks(works) {
  const counts = { self: 0, publisher: 0, excluded: 0, total: 0 };
  for (const w of Array.isArray(works) ? works : []) {
    const cat = w.category || classifyWork(w);
    if (cat === "self") counts.self += 1;
    else if (cat === "publisher") counts.publisher += 1;
    else counts.excluded += 1;
    counts.total += 1;
  }
  return counts;
}

/* Amazon search for a work — prefer the ISBN/ASIN, else title + author. */
export function amazonSearchUrl(work) {
  const q = (work && work.isbn && String(work.isbn).trim())
    || [work && work.title, work && work.author].filter(Boolean).join(" ");
  return "https://www.amazon.com/s?k=" + encodeURIComponent(String(q || "").trim());
}

/* Official Bartz settlement Works List lookup. The tool is an interactive
   search with no public query API, so we link to the lookup page — staff paste
   the ISBN/title shown alongside. */
export function settlementLookupUrl() {
  return "https://secure.anthropiccopyrightsettlement.com/lookup/";
}
