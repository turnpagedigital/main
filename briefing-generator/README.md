# Briefing Generator

Daily legal/regulatory briefing generation system for Turnpage Digital Markets.

Generates 6 topic-specific dashboards covering:
- Tariffs / Trade
- LLM / Copyright
- Crypto Insolvency
- Fraud Recovery / Ponzi
- $1B+ Class Actions & Mass Arbitration
- Bankruptcy Creditor Rights

## How it Works

1. **Scheduled run** — GitHub Actions runs daily at 10am ET (configurable)
2. **Generation** — Python script calls Anthropic Claude API for each topic
3. **Output** — Generates static HTML dashboards to `public/briefing-dashboard/`
4. **Deploy** — Cloudflare Pages auto-deploys on git push
5. **Live** — Accessible at `turnpagedigital.com/briefing-dashboard/`

## Structure

```
briefing-generator/
├── scripts/
│   ├── generate.py          # Main generation script
│   └── requirements.txt     # Python dependencies
├── config/
│   ├── topics.yaml          # Topic definitions
│   ├── sources.md           # Whitelisted/blacklisted news sources
│   └── prompts.yaml         # Claude prompts (per topic)
├── templates/
│   ├── dashboard.html       # Dashboard template
│   └── components/          # Reusable HTML components
├── BRAND_STYLING.md         # Design system reference
└── README.md                # This file
```

## Configuration

### Topics (`config/topics.yaml`)
Define which topics to generate and their voice/tone.

### Sources (`config/sources.md`)
Whitelist preferred news sources, blacklist unreliable sources.

### Prompts (`config/prompts.yaml`)
Claude system prompts for each topic. Controls depth, density, and voice.

## Running Manually

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run generation
python briefing-generator/scripts/generate.py
```

## Outputs

Generated files appear in:
- `public/briefing-dashboard/index.html` — Main landing page
- `public/briefing-dashboard/<topic>/dashboard.html` — Per-topic pages

Individual briefing posts go in:
- `public/briefings/YYYY-MM-DD-slug.md` — Briefing markdown

## Triggering from Admin

The admin panel "Run Now" button triggers the GitHub Actions workflow:
- **Endpoint**: `POST /api/admin/generate-briefing`
- **Handler**: `functions/api/admin/generate-briefing.js`
- **Result**: Workflow runs and commits generated files back to repo

## Costs

- GitHub Actions: Free (~2000 min/month included)
- Anthropic API: ~$1-3/day (~$30-90/month)
- Cloudflare Pages: Free

## Development

To iterate on the generation logic locally:
1. Edit `scripts/generate.py` or config files
2. Run `python briefing-generator/scripts/generate.py`
3. Review output in `public/briefing-dashboard/`
4. Commit and push when ready

The GitHub Actions workflow will use the same script, so local testing verifies production behavior.
