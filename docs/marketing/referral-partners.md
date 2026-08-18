# Referral Partner Links & Tracking

## How it works

Give each referral partner a unique link by adding `?ref=their-code` to any
page of the site:

```
https://turnpagedigital.com/smith-agency          ← vanity form (preferred)
https://turnpagedigital.com/?ref=smith-agency
https://turnpagedigital.com/ai-copyright?ref=smith-agency
```

The vanity form works automatically for every active partner in the
registry: `functions/_middleware.js` 302-redirects `/<code>` to
`/?ref=<code>`. Because of this, never pick a code that matches a real
page path (`/crypto`, `/press`, …) — such a code is ignored as a vanity
URL (the page wins), though the `?ref=` form still works.

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

### Managing partners (Admin → Content → Partners)

The admin tab at `/admin/content/partners` manages everything below:
add/deactivate partners, edit codes/aliases/Attio record, and the
authorized-email allowlist that gates portal sign-in. NOTE: the registry
is read at build time, so admin changes (including email removals) take
effect on the next production deploy.

### How a partner is defined

`src/data/referral-partners.json` — one entry per partner:

```json
{
  "code": "pari-passu",
  "name": "Pari Passu",
  "attio": { "object": "companies", "record_id": "..." },
  "authorizedEmails": ["partner@example.com"],
  "active": true
}
```

- `code` is the public `?ref=` code. The matching Attio record also carries
  it in its cosmetic "Referral link" attribute, but the JSON is the source
  of truth for code → record resolution.
- `authorizedEmails` — the only addresses that can request a portal
  sign-in link. An email may appear on ONE partner's list only.
- `active: false` disables the code, the CRM linking, and the partner's
  portal sessions in one move.

### What happens on a referred submission

Both `/api/contact` and `/api/register` (see `functions/api/_attio.js`):

1. Assert the Person in Attio by email.
2. Set the person's **"Referred by"** attribute (slug `referred_by`) to the
   partner's record.
3. `/api/register` also sets **Deals → "Referred by"** (slug
   `referred_by`; the legacy locked attribute at slug `referral_fee` was
   migrated and archived Aug 2026) on the deal it creates — retrying
   without the link if Attio rejects it, so a schema gap never loses a deal.
4. `/api/contact` additionally attaches the message as a note on the person.

All Attio pushes are best-effort: failures log and never block the
email/Sheet delivery.

### The partner portal (/partners)

Unlisted page (not in nav). Sign-in is an emailed magic link: the partner
enters their address, and if it's on their `authorizedEmails` list in the
registry they receive a 15-minute sign-in link (`/partners#t=<token>` —
HMAC-signed, stateless, multi-use within its window by design). Sessions
are 12h HMAC cookies bound to partner + email; both tokens and sessions
re-verify the email against the CURRENT allowlist, so removing an address
in Admin → Content → Partners revokes access on the next production
deploy (there is no instant kill switch — for an emergency, deploy
immediately after the edit). Unknown addresses get the identical response
(no enumeration), and link-sending is rate-limited per IP and address.
Endpoints under `functions/api/partner/`: `request-link`, `login`
(token redemption), `logout`, `session`, `leads`, `message`.

### Attio schema prerequisites (one-time, Attio UI)

1. "Referral link" text attribute on People + Companies — DONE Aug 2026.
2. **"Referred by"** record-reference attribute (allowed: Companies +
   People) on the **People** object — slug must be `referred_by`.
3. "Referred by" on Deals (slug `referred_by`, Companies + People) — the
   original locked attribute (slug `referral_fee`) couldn't be widened, so
   a replacement was created and all 27 historical values migrated
   (Aug 2026); the old attribute is archived.

## Sharing with a partner

Send them their referral link (`turnpagedigital.com/<code>`) and the
portal address (`turnpagedigital.com/partners`) — nothing secret to
transmit. They sign in with their authorized email; manage the allowlist
in Admin → Content → Partners.
