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

## Google Apps Script setup (one-time, ~5 minutes)

The Sheet logging runs through the Apps Script web app behind
`GOOGLE_SHEET_URL`. Add this function to that script, then call it from
`doPost` (steps below).

```javascript
/* ── Referral partner routing ────────────────────────────────────────
 * When a submission carries a ref code, also append it to a per-partner
 * spreadsheet in the "TPDM Referral Partners" Drive folder. The
 * spreadsheet is auto-created on the partner's first lead — share it
 * view-only with the partner. */
var REFERRAL_FOLDER_NAME = "TPDM Referral Partners";

function logReferral(data) {
  if (!data || !data.ref) return;
  // Sanitize the code so a hostile ?ref= value can't produce a weird filename
  var code = String(data.ref).replace(/[^a-zA-Z0-9 _.-]/g, "").slice(0, 60).trim();
  if (!code) return;

  // Find or create the partners folder
  var folders = DriveApp.getFoldersByName(REFERRAL_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(REFERRAL_FOLDER_NAME);

  // Find or create this partner's spreadsheet inside it
  var name = "Referrals — " + code;
  var files = folder.getFilesByName(name);
  var ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(name);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    ss.getSheets()[0].appendRow(["Date", "Type", "First name", "Last name", "Email", "Subject / flow"]);
    ss.getSheets()[0].getRange("A1:F1").setFontWeight("bold");
  }

  var isRegistration = String(data.subject || "").indexOf("Registration:") === 0;
  ss.getSheets()[0].appendRow([
    new Date(),
    isRegistration ? "Registration" : "Contact form",
    data.firstName || "",
    data.lastName || "",
    data.email || "",
    data.subject || "",
  ]);
}
```

Wire-up inside the existing `doPost(e)`: right after the line that parses
the payload (it looks like `var data = JSON.parse(e.postData.contents);`),
add:

```javascript
try { logReferral(data); } catch (err) { /* never block the main log */ }
```

(If the parsed variable has a different name, pass that name instead of
`data`.)

Then **Deploy → Manage deployments → Edit (pencil) → Version: New version →
Deploy**. The web app URL does not change, so no Cloudflare env var update
is needed.

Deliberate scope of the partner sheet: date, type, name, email, and
subject/flow — NOT the message body or any claim details, so sharing the
sheet with a partner never exposes what the lead actually wrote.

## Sharing with a partner

Open Drive → "TPDM Referral Partners" → the partner's spreadsheet →
Share → partner's email → **Viewer**. New leads append automatically.
