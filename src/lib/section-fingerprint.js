/* section-fingerprint — stable fingerprint of a page's section layout, used
   for optimistic-concurrency checks on Page Builder saves. The client
   fingerprints the layout it loaded; the server compares against what's
   currently stored and rejects the save (409) on mismatch, so a stale tab
   can't silently overwrite a newer layout.

   Shared by src/pages/admin/PageBuilderTab.jsx and
   functions/api/admin/page-compositions.js — both sides must hash the same
   JSON.stringify output, so keep this dependency-free and deterministic. */

export function sectionsFingerprint(sections) {
  const str = JSON.stringify(sections ?? []);
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; // djb2-xor, kept in uint32
  }
  return h.toString(36) + ":" + str.length;
}
