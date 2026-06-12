# Analytics & Ads Setup Checklists — Turnpage Digital Markets

*Step-by-step click paths for Andrew. Written against the Google/Cloudflare UIs as of June 2026 — Google moves buttons around, so where the UI may have drifted, the steps say "look for X or similar." Do these in order: A → B → C → D. A and B feed the IDs into `src/data/analytics.json`; C and D are independent.*

**One Google account for everything.** Use the same Google login (suggest ag@turnpagedigital.com's Google account, or andrewglantz@gmail.com — pick ONE and use it for GA4, Google Ads, and Search Console so the linking steps work without invitations.)

---

## Checklist A — Create the GA4 property and get the G- measurement ID

**Prerequisites:** a Google account, logged in. Nothing else.
**Time:** ~10 minutes.

1. Go to **https://analytics.google.com** and sign in.
2. If this is a brand-new account: you'll see a **Start measuring** button — click it. If you already have an Analytics account: click the **gear icon (Admin)** in the bottom-left corner, then click **+ Create** → **Property**.
3. **Account setup** (new accounts only): Account name = `Turnpage Digital Markets`. Leave the data-sharing checkboxes as they are. Click **Next**.
4. **Property setup:** Property name = `turnpagedigital.com`. Set **Time zone** = United States, Eastern Time. **Currency** = US Dollar. Click **Next**.
5. **Business details:** Industry = "Finance" (or "Law & Government" — it doesn't matter much). Business size = Small. Click **Next**.
6. **Business objectives:** check **Generate leads**. Click **Create**, then accept the Terms of Service.
7. **Choose a platform / Start collecting data:** click **Web**.
8. **Set up your web stream:** Website URL = `https://turnpagedigital.com` (choose https). Stream name = `turnpagedigital.com`. Leave **Enhanced measurement** toggled ON (it auto-tracks page views, scrolls, outbound clicks). Click **Create stream** (button may read "Create and continue").
9. You now see the **Web stream details** panel. In the top-right area, find the **Measurement ID** — it starts with **G-** (e.g. `G-AB12CD34EF`). Click the copy icon next to it. (If you ever lose it: **Admin → Data streams → click your stream** — the G- ID is at the top right. Reference: https://optimizesmart.com/blog/google-analytics-4-measurement-id-and-property-id/)
10. If GA4 shows you a "Set up a Google tag / Install instructions" screen with a code snippet — **ignore it and close it**. The site already has the tag wired in; it just needs the ID.
11. **Paste the ID into the site.** Easiest path: tell Claude in chat — *"Set the GA4 measurement ID in analytics.json to G-XXXXXXXXXX and deploy."* Claude edits `src/data/analytics.json` and pushes; the site rebuilds in ~1–2 minutes. (If an Analytics tab exists in the admin panel at `/admin`, you can paste it there instead — same file either way.)
12. **Verify (after the deploy):** open turnpagedigital.com in a regular browser tab, click around, then in GA4 go to **Reports → Realtime** (left sidebar). You should see yourself as 1 active user within a minute or two. If Realtime shows nothing after 5 minutes, hard-refresh the site (Cmd+Shift+R) and check that the ID was pasted exactly.

---

## Checklist B — Google Ads account + lead conversion action + link to GA4

**Prerequisites:** Checklist A done. A credit card (Ads asks for billing even before campaigns run). The same Google login as Checklist A.
**Time:** ~25 minutes.

### B1. Create the Google Ads account

1. Go to **https://ads.google.com** and sign in. Click **Start now** (or **+ New Google Ads account**).
2. Google will try hard to walk you into creating a campaign immediately. **Don't.** Look for a small link reading **"Skip campaign creation"** / **"Switch to Expert Mode"** / **"Create an account without a campaign"** — it's deliberately subtle, usually at the bottom of the first screen or under a "More options" link. Click it.
3. Confirm business information: country = United States, time zone = Eastern, currency = USD (**currency and time zone cannot be changed later**). Click **Submit**.
4. Add billing when prompted: **Billing** (or the wrench/Admin icon → **Billing settings**) → enter payment details. No money is spent until a campaign is live.

### B2. Create the lead conversion action and get the ID + label

5. In the left navigation, click **Goals** (flag icon) → **Conversions** → **Summary**. (Reference for this path: https://support.google.com/google-ads/answer/12216226)
6. Click the blue **+ Create conversion action** button (may read **+ New conversion action**).
7. Choose **Website** as the kind of conversion.
8. Enter `turnpagedigital.com` when it asks to scan the site, click **Scan**.
9. Google may suggest auto-created conversions — skip those. Look for **"Add a conversion action manually"** or similar and click it.
10. Fill in the manual form:
    - **Goal and action optimization:** category = **Submit lead form**.
    - **Conversion name:** `Contact Form Lead` (this exact name doesn't matter, but write down what you choose).
    - **Value:** "Don't use a value" is fine to start (or assign a placeholder like $100 per lead — can be changed later).
    - **Count:** **One** (one lead per click — recommended for leads).
    - **Click-through conversion window:** 30 days. Leave the rest at defaults.
11. Click **Done**, then **Save and continue**.
12. On the "set up the tag" screen, choose **"Use Google Tag Manager"** or **"Install the tag yourself"** — either path shows you the two values you actually need:
    - **Conversion ID** — the number after `AW-` (e.g. `AW-123456789`)
    - **Conversion label** — a short string of letters/numbers (e.g. `AbC-D_efGhIjKlM`)
    Copy both. If the screen only shows code, the ID and label are inside it on the line that looks like `'AW-123456789/AbC-D_efGhIjKlM'` — everything before the slash is the ID, after the slash is the label. (You can always retrieve them later: **Goals → Conversions → Summary → click the conversion name → Tag setup** or a "Use the API/install yourself" details link.)
13. **Paste into the site:** tell Claude — *"Set the Google Ads conversion ID to AW-XXXXXXXXX and the conversion label to YYYYYYYY in analytics.json and deploy."* Same flow as Checklist A step 11. Once deployed, the contact form fires the `generate_lead` GA4 event AND this Ads conversion on every successful submit.
14. **Verify:** after the deploy, submit a test message through https://turnpagedigital.com/contact (mark it TEST so it's recognizable in the email/Sheet). Within a few hours (sometimes up to a day), **Goals → Conversions → Summary** should show the conversion status move from "Inactive/No recent conversions" to **Recording conversions**. Don't panic before 24 hours.

### B3. Link Google Ads ↔ GA4

15. In **GA4**: gear icon (**Admin**) → under *Product links* click **Google Ads links** → **Link** → **Choose Google Ads accounts** → select the new Ads account → **Confirm** → **Next** → leave "Enable Personalized Advertising" and auto-tagging defaults ON → **Next** → **Submit**.
16. (If the Ads account doesn't appear in the chooser, you're logged into a different Google account in one of the two products — fix that first.)
17. Optional but useful later: in GA4, **Admin → Attribution settings** — confirm the reporting attribution model is the default ("Data-driven"). No change needed; just know where it lives.

### B4. Two settings worth flipping while you're in Ads

18. **Auto-tagging** (should already be on): wrench/**Admin** icon → **Account settings** → **Auto-tagging** → "Tag the URL that people click through from my ad" = **Yes**. This appends the `gclid` the contact form captures.
19. **Enhanced conversions:** **Goals → Conversions → Summary → Settings** (or open the conversion action) → find **Enhanced conversions** → check **Turn on enhanced conversions**, method = Google tag. Note: Google is merging enhanced-conversions settings into a single on/off switch during 2026, so this screen may look simpler than described (https://support.google.com/google-ads/answer/15713840). If anything here is confusing, skip it — it's an optimization, not a requirement, and the site-side wiring can be revisited with Claude once basic conversion tracking is verified.

---

## Checklist C — Google Search Console: verify the domain + submit the sitemap

**Prerequisites:** access to the Cloudflare account that manages turnpagedigital.com DNS. The sitemap exists at `https://turnpagedigital.com/sitemap.xml` (being generated as part of tonight's work — confirm it loads in a browser before step 12).
**Time:** ~15 minutes active + up to a few hours of DNS-propagation waiting.

1. Go to **https://search.google.com/search-console** and sign in (same Google account as A and B).
2. Click the property dropdown (top-left) → **+ Add property**.
3. Two boxes appear. Use the **left one — "Domain"** (covers https/http/www/subdomains in one property). Type `turnpagedigital.com` (no https://, no www). Click **Continue**.
4. Google shows a **TXT verification record** — a string starting with `google-site-verification=`. Click **Copy**. Keep this tab open.
5. In a new tab, go to **https://dash.cloudflare.com** and log in.
6. Click the **turnpagedigital.com** site.
7. In the left sidebar, click **DNS** → **Records**.
8. Click **+ Add record** and fill in:
   - **Type:** `TXT`
   - **Name:** `@` (Cloudflare will display it as turnpagedigital.com)
   - **Content:** paste the `google-site-verification=...` string
   - TXT records have no proxy toggle — if you see one, it should read **DNS only**.
9. Click **Save**.
10. Back in the Search Console tab, click **Verify**. If it fails, wait — Cloudflare DNS changes usually propagate in 10–30 minutes, occasionally a few hours (https://bertey.com/verifying-a-google-search-console-domain-property-with-cloudflare/) — and click Verify again. You can check propagation at https://dnschecker.org (enter turnpagedigital.com, record type TXT, look for your code).
11. **Leave the TXT record in place permanently** — Google rechecks it; deleting it un-verifies the property.
12. **Submit the sitemap:** in Search Console's left sidebar, click **Sitemaps** (under "Indexing"). In the "Add a new sitemap" box, type `sitemap.xml` and click **Submit**. Status should show **Success** within minutes to a day.
13. Nothing else to do — reports (Performance, Indexing) start filling with data over the following days. Worth a weekly glance, not a daily one.

---

## Checklist D — Cloudflare Web Analytics (one-click complement)

Free, privacy-first, no cookies, and it works even when ad-blockers eat the GA4 tag — a good second opinion on traffic. (https://developers.cloudflare.com/web-analytics/)

**Prerequisites:** the Cloudflare account. The site is already a Cloudflare Pages project, which makes this nearly one click.
**Time:** ~3 minutes.

1. Go to **https://dash.cloudflare.com** and log in.
2. In the left sidebar, click **Workers & Pages** (or "Compute (Workers)" → Pages, depending on dashboard version).
3. Click the Pages project for turnpagedigital.com.
4. Click the **Metrics** tab.
5. Under **Web Analytics**, click **Enable**. That's it — Cloudflare injects its snippet automatically **on the next deployment** (https://developers.cloudflare.com/pages/how-to/web-analytics/). Since deploys happen on every git push, it activates with the next change Claude pushes.
6. If the Pages route above doesn't show the Enable button, use the generic path instead: left sidebar → **Analytics & Logs → Web Analytics** → **Add a site** → pick `turnpagedigital.com` from the hostname dropdown → save (https://developers.cloudflare.com/web-analytics/get-started/).
7. **Verify (after the next deploy):** visit the site, then check **Analytics & Logs → Web Analytics** in the Cloudflare dashboard — page views appear within a few minutes.

---

## After all four: the 5-minute confirmation pass

1. GA4 **Reports → Realtime** shows you while browsing the site. ✓ A works.
2. A TEST contact-form submit appears as `generate_lead` in GA4 (Realtime → Event count by Event name) and, within ~24h, in Ads **Goals → Conversions**. ✓ B works.
3. Search Console shows the domain property verified and sitemap **Success**. ✓ C works.
4. Cloudflare Web Analytics shows page views. ✓ D works.
5. Tell Claude the IDs are live so the Google Ads plan (`docs/marketing/google-ads-plan.md`) can move to launch step 2.
