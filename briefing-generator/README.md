# Turnpage Daily Briefing — hosted site

Live at: **https://intel.turnpagedigital.com** (Cloudflare Access gated to ag@turnpagedigital.com)

Daily briefing across 7 legal/regulatory topics — tariffs/trade, LLM copyright, crypto insolvency, ponzi/fraud, tech mass arbitration, $1B+ class actions, bankruptcy creditor rights.

## How it works

1. GitHub Actions runs `scripts/generate.py` daily at 10am ET.
2. The script calls the Anthropic Claude API for each topic, asking it to scan today's developments and produce structured JSON.
3. JSON gets rendered to HTML using the brand-styling spec in `BRAND_STYLING.md`.
4. The workflow commits the generated files back to `main`.
5. Cloudflare Pages auto-deploys on push.
6. You log in via Cloudflare Access magic-link and read the briefing.

## Setup

See **DEPLOY.md** for step-by-step setup instructions.

## Local development

```bash
# Install Python deps
pip install -r scripts/requirements.txt

# Set the API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run a one-off generation
python scripts/generate.py

# Run a single topic only (comma-separate for several)
python scripts/generate.py --topics crypto-insolvency
```

The script will produce HTML files in each topic dir (`rewind-tariffs/`, `llm-class-action/`, etc.).

## Running one topic at a time

Three ways to run a single topic instead of all six:

1. **Admin panel** — on `/admin/content/posts` (or the Briefings tab), pick the topic in the dropdown next to the Run button, then click Run. Leave it on "All topics" for the full daily run.
2. **GitHub Actions** — Actions → Daily Briefing Generation → Run workflow → put the topic slug (e.g. `crypto-insolvency`) in the `topics` field.
3. **Locally** — `python scripts/generate.py --topics <slug>` (or set `BRIEFING_TOPICS=<slug>`).

A single-topic run updates only that topic's advisory, dashboard, landing-page card, and queued draft; everything else is left as-is. The scheduled 10am ET run still covers all topics.

## Brand styling

Canonical reference: `BRAND_STYLING.md`. When the styling iterates, update that file. The next run reads the latest spec.

## Tracked topics

| # | Slug | Display | Voice |
|---|---|---|---|
| 01 | `rewind-tariffs` | Tariffs / Trade | trade-law-grade |
| 02 | `llm-class-action` | LLM / Copyright | litigation-grade |
| 03 | `crypto-insolvency` | Crypto Insolvency | restructuring-grade |
| 04 | `fraud-recovery` | Ponzi / Fraud Recovery | recovery-grade |
| 05 | `tech-mass-arbitration` | Tech Mass Arbitration | litigation-grade |
| 06 | `billion-dollar-class-actions` | $1B+ Class Actions | litigation-grade |
| 07 | `bankruptcy-creditor-rights` | Bankruptcy Creditor Rights | restructuring-grade |

## Add / remove a topic

Edit `TOPICS` in `scripts/generate.py`. The list controls which dirs get generated and what's in the nav. Each entry needs `slug`, `display`, `emoji`, `voice`, `themes`, `tier_1_sources`, `tier_3_sources`, `excludes`.

## Logs

GitHub Actions → Daily Briefing Generation workflow → most recent run. The log shows per-topic generation status and any JSON parse failures (saved to `<topic>/_debug-YYYY-MM-DD.txt`).

## Costs

- Cloudflare Pages: free
- Cloudflare Access: free (≤ 50 users)
- GitHub Actions: free for private repo (≤ 2000 min/month)
- Anthropic API: ~$1-3/day = ~$30-90/month
