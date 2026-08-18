# Referral Partner Links & Tracking

## How it works

Give each referral partner a unique link by adding `?ref=their-code` to any
page of the site:

```
https://turnpagedigital.com/?ref=smith-agency
https://turnpagedigital.com/ai-copyright?ref=smith-agency
```

Codes are free-form — pick something short and readable (lowercase letters,
numbers, hyphens). The code IS the partner: there is no list to maintain.

When a visitor arrives through such a link:

1. The site stores the code in the visitor's browser for **90 days**
   (`src/lib/analytics.js`). They can leave and come back later — the code
   survives until they submit or 90 days pass.
2. Any contact-form message (`/api/contact`) or completed registration flow
   (`/api/register`) carries the code as a `ref` field alongside the
   existing `utm_*` / `gclid` ad attribution.
3. The code appears in: the notification email's Attribution block, the
   master Google Sheet row, and the Attio note (registrations).
4. The Google Apps Script (below) additionally copies each referred
   submission into a **per-partner spreadsheet** that can be shared
   view-only with the partner for full transparency.

A referral click and an ad click can coexist — `ref` and `gclid`/`utm_*`
are stored side by side; a newer link only overwrites the keys it carries.

## Partner reporting: Attio + the partner portal (chosen approach, Aug 2026)

Attio is the system of record for referral reporting. The per-partner
Google-Sheet/Apps-Script route described in git history was superseded
before it was ever set up.

### How a partner is defined

`src/data/referral-partners.json` — one entry per partner:

```json
{
  "code": "pari-passu",
  "name": "Pari Passu",
  "attio": { "object": "companies", "record_id": "..." },
  "portalKeyHash": "<sha256 hex of their portal access key>",
  "active": true
}
```

- `code` is the public `?ref=` code. The matching Attio record also carries
  it in its cosmetic "Referral link" attribute, but the JSON is the source
  of truth for code → record resolution.
- `portalKeyHash` — generate a key (`openssl rand -hex 24`), give the
  plaintext to the partner ONCE, store only `printf '<key>' | shasum -a 256`.
- `active: false` disables the code, the CRM linking, and the partner's
  portal sessions in one move.

### What happens on a referred submission

Both `/api/contact` and `/api/register` (see `functions/api/_attio.js`):

1. Assert the Person in Attio by email.
2. Set the person's **"Referred by"** attribute (slug `referred_by`) to the
   partner's record.
3. `/api/register` also sets **Deals → "Referred by"** (slug
   `referral_fee`) on the deal it creates — retrying without the link if
   Attio rejects it, so a schema gap never loses a deal.
4. `/api/contact` additionally attaches the message as a note on the person.

All Attio pushes are best-effort: failures log and never block the
email/Sheet delivery.

### The partner portal (/partners)

Unlisted page (not in nav). Partner signs in with just their access key;
the key hash identifies the partner. Sessions are HMAC cookies scoped to
`/api/partner` (signed with ADMIN_SECRET + the partner's key hash, so
rotating a key logs that partner out). Endpoints under
`functions/api/partner/`: `login`, `logout`, `session`, `leads`.

`/api/partner/leads` queries Attio live: people whose `referred_by` points
at the partner (contact inquiries + registrants) and deals whose
`referral_fee` points at them (with pipeline stage, translated to
partner-friendly labels in `src/pages/Partners.jsx`). Deal amounts are
deliberately never exposed to partners.

### Attio schema prerequisites (one-time, Attio UI)

1. "Referral link" text attribute on People + Companies — DONE Aug 2026.
2. **"Referred by"** record-reference attribute (allowed: Companies +
   People) on the **People** object — slug must be `referred_by`.
3. Deals already had "Referred by" (slug `referral_fee`), but it only
   allowed People — edit its allowed record types to include Companies.

## Sharing with a partner

Send them their link (`https://turnpagedigital.com/?ref=their-code`), the
portal URL (`https://turnpagedigital.com/partners`), and their access key.
