/**
 * Shared Attio helpers for the public API endpoints (/api/contact,
 * /api/register) and the partner portal (/api/partner/*).
 *
 * Everything here is best-effort by design: Attio being down or a schema
 * attribute not existing yet must never break a lead submission. Callers
 * wrap these in try/catch; helpers that tolerate partial schema (e.g. the
 * "Referred by" attribute not created yet) degrade internally and log.
 *
 * Attio schema this touches:
 *  - people.referred_by   (record-reference → Companies/People) — set on every
 *    referred lead; the partner portal queries it. Created manually in the
 *    Attio UI; until it exists, setReferredBy logs and moves on.
 *  - deals.referred_by    ("Referred by" on Deals, created Aug 2026 to
 *    replace the legacy locked attribute at slug referral_fee; historical
 *    values were migrated) — set on registration deals; creation retries
 *    without it if Attio rejects.
 *  - companies/people.referral_link — the partner's public ?ref= code,
 *    cosmetic in the CRM; the source of truth for code→record mapping is
 *    src/data/referral-partners.json.
 */

import partnersData from "../../src/data/referral-partners.json";

export const PERSON_REFERRED_BY_SLUG = "referred_by";
export const DEAL_REFERRED_BY_SLUG = "referred_by";

export function attioHeaders(env) {
  return {
    Authorization: `Bearer ${env.ATTIO_API_KEY}`,
    "Content-Type": "application/json",
  };
}

/* Resolve a ?ref= code to the partner registry entry, or null. */
export function findPartnerByCode(code) {
  if (!code || typeof code !== "string") return null;
  const norm = code.trim().toLowerCase();
  return (
    (partnersData.partners || []).find(
      (p) => p.active !== false && p.code === norm && p.attio && p.attio.record_id,
    ) || null
  );
}

export function partnerReference(partner) {
  return {
    target_object: partner.attio.object,
    target_record_id: partner.attio.record_id,
  };
}

/* Assert (find-or-create by email) a Person record. Returns record_id. */
export async function assertPerson(env, { email, firstName, lastName, phone }) {
  const values = { email_addresses: [{ email_address: email }] };
  if (firstName || lastName) {
    values.name = [{
      first_name: firstName || "",
      last_name: lastName || "",
      full_name: [firstName, lastName].filter(Boolean).join(" ") || email,
    }];
  }
  if (phone) values.phone_numbers = [{ original_phone_number: phone }];

  const res = await fetch(
    "https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses",
    { method: "PUT", headers: attioHeaders(env), body: JSON.stringify({ data: { values } }) },
  );
  if (!res.ok) {
    throw new Error(`person assert ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const person = await res.json();
  const recordId = person?.data?.id?.record_id;
  if (!recordId) throw new Error("person assert returned no record id");
  return recordId;
}

/* Attach a plaintext note to a record. */
export async function createNote(env, parentObject, parentRecordId, title, content) {
  const res = await fetch("https://api.attio.com/v2/notes", {
    method: "POST",
    headers: attioHeaders(env),
    body: JSON.stringify({
      data: {
        parent_object: parentObject,
        parent_record_id: parentRecordId,
        title,
        format: "plaintext",
        content,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`note ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

/* Link a lead person to the referring partner. Best-effort internally: if
 * the referred_by attribute doesn't exist yet (schema pending), Attio
 * returns 400 — we log and continue rather than failing the submission. */
export async function setReferredBy(env, personRecordId, partner) {
  const res = await fetch(
    `https://api.attio.com/v2/objects/people/records/${personRecordId}`,
    {
      method: "PATCH",
      headers: attioHeaders(env),
      body: JSON.stringify({
        data: { values: { [PERSON_REFERRED_BY_SLUG]: [partnerReference(partner)] } },
      }),
    },
  );
  if (!res.ok) {
    console.error(
      `Attio referred_by set failed (${res.status}) — is the "Referred by" attribute on People created?`,
      (await res.text()).slice(0, 200),
    );
  }
}

/* Query records referred by a partner. Object is "people" or "deals";
 * slug is the referred-by attribute slug on that object. Paginates up to
 * `max` records, newest first by created_at. */
export async function queryReferredRecords(env, object, slug, partner, max = 500) {
  const out = [];
  const pageSize = 100;
  for (let offset = 0; offset < max; offset += pageSize) {
    const res = await fetch(`https://api.attio.com/v2/objects/${object}/records/query`, {
      method: "POST",
      headers: attioHeaders(env),
      body: JSON.stringify({
        filter: { [slug]: partnerReference(partner) },
        sorts: [{ attribute: "created_at", direction: "desc" }],
        limit: pageSize,
        offset,
      }),
    });
    if (!res.ok) {
      throw new Error(`${object} query ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const body = await res.json();
    const page = body?.data || [];
    out.push(...page);
    if (page.length < pageSize) break;
  }
  return out;
}

/* Convenience readers for Attio's values format. */
export function attioTextValue(record, slug) {
  const v = record?.values?.[slug];
  return Array.isArray(v) && v[0] ? (v[0].value ?? v[0].full_name ?? "") : "";
}
export function attioCreatedAt(record) {
  const v = record?.values?.created_at;
  return Array.isArray(v) && v[0] ? v[0].value || "" : "";
}
