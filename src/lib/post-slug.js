/* Slug rules for posts & briefings (public/briefings/index.json).

   A slug is "YYYY-MM-DD-title-derived-tail". The date prefix is part of the
   public URL (/briefings/<slug>), so it has to stay in step with the post's
   publication date — see retimeSlug. */

/* Build a fresh slug from a title + date. Used for new posts only. */
export function slugify(title, date) {
  const d = date || new Date().toISOString().slice(0, 10);
  const s = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
    .replace(/-$/, "");
  return s ? `${d}-${s}` : d;
}

/* Swap the YYYY-MM-DD prefix of an existing slug for a new date, leaving the
   title-derived tail alone — so changing a published post's date moves its URL
   by exactly one field instead of re-deriving the whole slug from a title that
   may have been edited since. A slug with no date prefix gets one. */
const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}(?=-|$)/;

export function retimeSlug(slug, date) {
  if (!date) return slug;
  if (!slug) return date;
  return DATE_PREFIX_RE.test(slug)
    ? slug.replace(DATE_PREFIX_RE, date)
    : `${date}-${slug}`;
}
