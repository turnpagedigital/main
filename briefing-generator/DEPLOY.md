# Deploy Guide — intel.turnpagedigital.com

Step-by-step. Should take 30-45 minutes start to finish.

## Architecture

```
                                        ┌───────────────────────────────┐
                                        │ GitHub Actions (daily 10am ET) │
                                        │  ↓ runs scripts/generate.py    │
                                        │  ↓ calls Anthropic API         │
                                        │  ↓ writes HTML files           │
                                        │  ↓ commits + pushes            │
                                        └────────────┬──────────────────┘
                                                     │
                                                     ▼
┌──────────────────┐    auto-deploys     ┌──────────────────────────────┐
│ GitHub repo:     │ ───────────────────▶│ Cloudflare Pages              │
│ daily-briefing-  │                     │ intel.turnpagedigital.com│
│ site             │                     │ (gated by CF Access)         │
└──────────────────┘                     └──────────────────────────────┘
                                                     │
                                                     ▼
                                          ag@turnpagedigital.com
                                          (logs in via email magic-link)
```

---

## Step 1 — Create the GitHub repo

1. Go to https://github.com/new
2. Repo name: `daily-briefing-site`
3. Private. No README. Just create.
4. On your Mac, in Terminal:
   ```bash
   cd ~/Library/CloudStorage/Dropbox/Career/Current\ Roles/Turnpage/Development/daily-briefing-site
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:YOURUSER/daily-briefing-site.git
   git push -u origin main
   ```

## Step 2 — Add ANTHROPIC_API_KEY to GitHub secrets

1. Go to `https://github.com/YOURUSER/daily-briefing-site/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: your Anthropic API key (from https://console.anthropic.com/settings/keys)
5. Save

## Step 3 — Set up Cloudflare Pages

1. Go to https://dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git
2. Authorize GitHub if needed, select `daily-briefing-site` repo
3. Configuration:
   - **Production branch:** `main`
   - **Build command:** *(leave empty — pure static)*
   - **Build output directory:** `/` *(or leave empty)*
   - **Root directory:** `/` *(default)*
4. Save and deploy. Wait for first build (should be ~30 sec).
5. Note the assigned `*.pages.dev` URL — e.g. `daily-briefing-site.pages.dev`.

## Step 4 — Add custom domain `intel.turnpagedigital.com`

1. In the Pages project, click **Custom domains** → **Set up a custom domain**.
2. Enter: `intel.turnpagedigital.com`
3. Cloudflare will validate that `turnpagedigital.com` is on your account; it auto-adds the CNAME record.
4. SSL provisioning takes 1-5 minutes. Wait for green checkmark.

## Step 5 — Configure Cloudflare Access (single-user gate)

1. Go to https://one.dash.cloudflare.com → **Access** → **Applications**.
2. Click **Add an application** → **Self-hosted**.
3. Configuration:
   - **Application name:** `Turnpage Daily Briefing`
   - **Session duration:** 24 hours (so you don't re-auth daily — adjust to taste)
   - **Application domain:** `intel.turnpagedigital.com`
4. Click **Next**.
5. **Add a policy:**
   - Policy name: `Andrew only`
   - Action: `Allow`
   - Include rule: **Emails** → `ag@turnpagedigital.com`
6. Save the policy and the application.
7. Test: open `https://intel.turnpagedigital.com` in an incognito window. You should see the Cloudflare login screen, enter your email, get a magic-link, sign in, then land on the briefing.

## Step 6 — Run the first generation manually (to confirm GHA works)

In your repo on GitHub:
1. Go to **Actions** tab
2. Click "Daily Briefing Generation" workflow on the left
3. Click **Run workflow** → **Run workflow** (manually trigger)
4. Wait ~2-3 minutes for it to complete
5. Once green, check the repo — you should see a new commit "Daily briefing 2026-MM-DD" with updated HTML files
6. Cloudflare Pages auto-deploys; refresh `intel.turnpagedigital.com` to see it

## Step 7 — Verify the daily schedule

The workflow runs at **14:00 UTC daily** (= 10:00 AM ET during DST, 9:00 AM ET in winter). Adjust the cron in `.github/workflows/daily-briefing.yml` if needed:

```yaml
on:
  schedule:
    - cron: '0 14 * * *'   # 10am ET DST / 9am ET standard time
```

Cron syntax: `minute hour day-of-month month day-of-week`. UTC time.

---

## Costs

- **Cloudflare Pages:** Free (unlimited static requests on the Free plan).
- **Cloudflare Access:** Free up to 50 users.
- **GitHub Actions:** Free for public repos; 2,000 minutes/month for private repos (a daily 5-minute run = ~150 min/month, well under the cap).
- **Anthropic API:** Variable. A daily 7-topic briefing using Claude Sonnet runs ~10-25k input tokens + ~20-40k output tokens, ≈ **$1-3 per day**. Budget ~$30-90/month.

## Operational

- **To pause the daily run:** Settings → Actions → disable the workflow.
- **To change schedule:** Edit `cron:` in `.github/workflows/daily-briefing.yml` and push.
- **To trigger a one-off run:** Actions tab → Run workflow.
- **To rotate API key:** Settings → Secrets → update `ANTHROPIC_API_KEY`.
- **To add a user:** Cloudflare One → Access → Applications → edit policy → add email.

---

## Files in this repo

```
daily-briefing-site/
├── .github/workflows/daily-briefing.yml   # GHA cron job
├── scripts/generate.py                    # Daily generation orchestrator (calls Anthropic API)
├── scripts/requirements.txt               # Python deps
├── BRAND_STYLING.md                       # Canonical brand-styling reference
├── assets/turnpage-logo.jpeg              # Logo
├── index.html                             # Root redirect → /rewind-tariffs/dashboard.html
├── _headers                               # Cloudflare Pages custom headers
├── _redirects                             # Cloudflare Pages redirects
├── rewind-tariffs/
│   ├── dashboard.html
│   ├── posts.html
│   ├── refine.html
│   ├── advisory-approval-YYYY-MM-DD.html
│   └── references/background.html
├── llm-class-action/  (same structure)
├── crypto-insolvency/
├── fraud-recovery/
├── tech-mass-arbitration/
├── billion-dollar-class-actions/
└── bankruptcy-creditor-rights/
```

Each topic dir is a self-contained slice. Add or remove a topic by editing `scripts/generate.py` and the `tabs/` config files referenced inside it.

---

## Troubleshooting

- **CF Access shows "Forbidden"**: Confirm the policy email matches your Anthropic-account email exactly. Check that the application is "Self-hosted" (not "SaaS").
- **GHA failing**: Check Actions log. Likely API key missing/wrong, or rate limit. Bump API tier or add retry logic.
- **Pages not updating**: Verify the GHA commit landed on `main`. Pages only deploys from `main` by default.
- **Local Mac still running 10am job**: Disable the Cowork scheduled task so it doesn't conflict.
