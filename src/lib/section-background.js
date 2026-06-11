/* sectionBackground — background-image CSS for sections, with an adjustable
   dark/light overlay filter.

   filter:   "dark" (default) | "light" | "none"
   strength: 0–100 (% opacity of the overlay; default 30 — the site's
             long-standing rgba(0,0,0,0.3) darken)

   Used by the cards-family sections (service-cards, audience-cards,
   how-it-works); the matching editor controls live in SectionEditorFields. */
export function sectionBackground(imageUrl, filter = "dark", strength = 30) {
  if (!imageUrl) return null;
  const n = Number(strength);
  const s = Math.max(0, Math.min(100, Number.isFinite(n) ? n : 30)) / 100;
  if (filter === "none" || s === 0) {
    return `url('${imageUrl}') center/cover no-repeat`;
  }
  const overlay = filter === "light" ? `rgba(255,255,255,${s})` : `rgba(0,0,0,${s})`;
  return `linear-gradient(${overlay}, ${overlay}), url('${imageUrl}') center/cover no-repeat`;
}
