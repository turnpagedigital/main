#!/usr/bin/env python3
"""
Daily briefing generation orchestrator — runs in GitHub Actions at 10am ET.

For each of 6 topics, calls Claude to produce today's advisory as markdown,
then UPDATES THE EXISTING brand-styled dashboard.html IN PLACE by injecting the
markdown into the center-column advisory body. Also updates the landing page
index.html in place.

NEVER regenerates HTML from scratch — that would strip the brand styling. The
brand-styled chassis lives in the repo (each topic dir has a dashboard.html
with the full CSS + 3-column layout + nav + everything). This script only swaps
text content.
"""
import os, sys, json, subprocess, re, time
import datetime as dt
import urllib.parse, urllib.request
import html as _html
from email.utils import parsedate_to_datetime
from pathlib import Path

try:
    from anthropic import Anthropic, RateLimitError
except ImportError:
    print("ERROR: anthropic package not installed. Run: pip install -r scripts/requirements.txt", file=sys.stderr)
    sys.exit(1)

from scrape_articles import scrape_and_enrich, build_enriched_news_block

REPO_ROOT = Path(__file__).resolve().parent.parent
BRAND_STYLING_FILE = REPO_ROOT / "BRAND_STYLING.md"
SKILL_MD_FILE = REPO_ROOT / "SKILL.md"
SOURCES_FILE = REPO_ROOT / "sources.md"
TICKERS_FILE = REPO_ROOT / "tickers.md"
INDEX_HTML = REPO_ROOT / "index.html"
SCRIPTS_DIR = Path(__file__).resolve().parent

TODAY = dt.date.today()
DATE_ISO = TODAY.isoformat()
DATE_PRETTY = TODAY.strftime("%A, %B %d, %Y")
DATE_STAMP_UPPER = f"{dt.datetime.now().strftime('%-I:%M %p ET').upper()} · {TODAY.strftime('%A, %B %-d, %Y').upper()}"

# 6 topics (Tech Mass Arb consolidated into $1B+ Class Actions on 2026-05-19)
TOPICS = [
    {"slug":"rewind-tariffs",                "display":"Tariffs / Trade",                  "emoji":"⚖️", "voice":"trade-law-grade"},
    {"slug":"llm-class-action",              "display":"LLM / Copyright",                  "emoji":"🤖", "voice":"litigation-grade"},
    {"slug":"crypto-insolvency",             "display":"Crypto Insolvency",                "emoji":"🪙", "voice":"restructuring-grade"},
    {"slug":"fraud-recovery",                "display":"Ponzi / Fraud Recovery",           "emoji":"🕵️", "voice":"recovery-grade"},
    {"slug":"billion-dollar-class-actions",  "display":"$1B+ Class Actions & Mass Arb",    "emoji":"💰", "voice":"litigation-grade"},
    {"slug":"bankruptcy-creditor-rights",    "display":"Bankruptcy Creditor Rights",       "emoji":"📜", "voice":"restructuring-grade"},
]

# ── News scan ──────────────────────────────────────────────────────────────
# Google News RSS queries per topic. The scan grounds each advisory on real
# recent headlines (filtered against sources.md) BEFORE Claude writes, instead
# of relying on model recall. Runs in GitHub Actions where outbound HTTPS is open.
NEWS_QUERIES = {
    "rewind-tariffs": [
        "IEEPA tariff refund", "Section 122 tariff Federal Circuit",
        "CBP CAPE refund", "Court of International Trade tariff",
        "Section 301 investigation USTR tariff",
    ],
    "llm-class-action": [
        "Bartz Anthropic copyright settlement", "AI training data copyright lawsuit",
        "OpenAI copyright litigation", "Thomson Reuters ROSS fair use appeal",
        "Elsevier Meta copyright", "music publisher AI copyright",
    ],
    "crypto-insolvency": [
        "crypto bankruptcy chapter 11", "FTX creditor distribution",
        "Genesis crypto bankruptcy", "Bitcoin Depot bankruptcy",
        "crypto customer property bankruptcy",
    ],
    "fraud-recovery": [
        "SEC Ponzi scheme charges", "receiver clawback Ponzi scheme",
        "SEC asset freeze fraud", "federal receiver appointment fraud",
        "fraudulent conveyance clawback",
    ],
    "billion-dollar-class-actions": [
        "class action settlement billion", "Visa Mastercard interchange settlement",
        "Roundup settlement Bayer", "Google mass arbitration advertisers",
        "securities class action settlement", "Purdue opioid settlement",
    ],
    "bankruptcy-creditor-rights": [
        "Texas Two-Step bankruptcy", "third-party releases Purdue bankruptcy",
        "equitable mootness bankruptcy appeal", "Chapter 15 recognition releases",
        "plan confirmation appeal creditor rights",
    ],
}

def parse_source_lists(sources_md):
    """Return (whitelist, blacklist) domain sets parsed from sources.md."""
    parts = re.split(r'(?im)^#+\s*Blacklist.*$', sources_md, maxsplit=1)
    white_region = parts[0]
    black_region = parts[1] if len(parts) > 1 else ""
    dom_re = re.compile(r'\b([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+)\b', re.I)
    def doms(text):
        out = set()
        for line in text.splitlines():
            s = line.strip()
            if not s.startswith('-'):   # only list-item domain lines
                continue
            m = dom_re.search(s)
            if m and not re.search(r'\.(md|html?|json|py|txt|csv|js|cjs)$', m.group(1), re.I):
                out.add(m.group(1).lower())
        return out
    return doms(white_region), doms(black_region)

def _host(url):
    try:
        h = (urllib.parse.urlparse(url).hostname or "").lower()
        return h[4:] if h.startswith("www.") else h
    except Exception:
        return ""

def _domain_match(host, domains):
    return any(host == d or host.endswith("." + d) for d in domains)

def fetch_news(slug, whitelist, blacklist, hours=72, max_items=12):
    """Scan Google News RSS for the topic, keep recent whitelisted (non-blacklisted) items."""
    queries = NEWS_QUERIES.get(slug, [])
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=hours)
    seen, items = set(), []
    for q in queries:
        rss = "https://news.google.com/rss/search?q=%s&hl=en-US&gl=US&ceid=US:en" % urllib.parse.quote(q)
        try:
            req = urllib.request.Request(rss, headers={"User-Agent": "TurnpageBriefing/1.0"})
            xml = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "replace")
        except Exception as e:
            print(f"    ! news fetch failed for {q!r}: {e}", file=sys.stderr)
            continue
        for block in re.split(r'<item>', xml)[1:]:
            block = block.split('</item>')[0]
            def tag(t):
                m = re.search(r'<%s[^>]*>(.*?)</%s>' % (t, t), block, re.S)
                v = m.group(1) if m else ""
                v = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', v, flags=re.S)
                return re.sub(r'<[^>]+>', '', v).strip()
            title, link, pub = _html.unescape(tag('title')), tag('link'), tag('pubDate')
            if not title or not link:
                continue
            sm = re.search(r'<source[^>]*url="([^"]+)"[^>]*>(.*?)</source>', block, re.S)
            src_url = sm.group(1) if sm else link
            src_name = _html.unescape(sm.group(2)).strip() if sm else ""
            host = _host(src_url)
            if _domain_match(host, blacklist):
                continue
            if not _domain_match(host, whitelist):
                continue
            try:
                pd = parsedate_to_datetime(pub) if pub else None
                if pd is not None and pd.tzinfo is None:
                    pd = pd.replace(tzinfo=dt.timezone.utc)
                if pd is not None and pd < cutoff:
                    continue
            except Exception:
                pass
            key = title.lower()[:80]
            if key in seen:
                continue
            seen.add(key)
            clean = re.sub(r'\s+-\s+[^-]+$', '', title) if ' - ' in title else title
            items.append({"title": clean, "source": src_name or host, "date": pub, "url": link})
            if len(items) >= max_items:
                return items
    return items

def build_news_block(items):
    if not items:
        return ("# Live news scan (last 72h)\n\nNo fresh whitelisted headlines retrieved. "
                "Fall back to incremental carry-forward per SKILL.md and mark any unverified "
                "claim with `(__[Source — needs verification](URL)__)`.\n\n")
    lines = ["# Live news scan (last 72h — whitelisted sources only)\n",
             "Ground today's lede and DELTA sections on these real, recent headlines. "
             "Cite the underlying primary source where possible; verify each link before relying on it.\n"]
    for it in items:
        lines.append(f"- {it['title']} — {it['source']} — {it['date']}\n  {it['url']}")
    return "\n".join(lines) + "\n\n"

def read_text(p):
    return p.read_text(encoding="utf-8") if p.exists() else ""

def build_case_truth_block(topic_slug):
    """Compact authoritative block from the repo's tracked-case data so the
    model can't drift on cases we already track (e.g. settlement posture)."""
    cases_dir = REPO_ROOT / "cases"
    if not cases_dir.exists():
        return ""
    blocks = []
    for md_file in sorted(cases_dir.glob("*.md")):
        if md_file.name == "README.md":
            continue
        try:
            head = md_file.read_text(encoding="utf-8")[:2000]
        except Exception:
            continue
        if topic_slug not in head:
            continue
        slug = md_file.stem
        data_file = cases_dir / "data" / f"{slug}.json"
        entry = f"## {slug}\n{head[:900]}"
        if data_file.exists():
            try:
                entry += "\n### live data\n" + data_file.read_text(encoding="utf-8")[:900]
            except Exception:
                pass
        blocks.append(entry)
        if len(blocks) >= 3:
            break
    if not blocks:
        return ""
    return ("# Tracked-case ground truth (AUTHORITATIVE — overrides anything "
            "you believe from memory; never contradict this)\n\n" + "\n\n".join(blocks) + "\n\n")

def build_prompt_docs(brand_styling, skill_md, sources_md):
    """Static reference docs — identical for every topic, sent as a cached
    prompt block so search-loop iterations and later topics read it from
    cache instead of burning input-tokens-per-minute budget."""
    return f"""# SKILL.md (authoritative workflow)

{skill_md[:8000]}

# BRAND_STYLING.md (citation + voice spec)

{brand_styling[:4000]}

# sources.md (whitelist/blacklist)

{sources_md[:4000]}
"""

def build_prompt(topic, news_block="", case_truth_block=""):
    return f"""You are producing today's daily-briefing advisory for {topic['display']} for Andrew at Turnpage Digital Markets.

TODAY: {DATE_PRETTY}

You must follow the SKILL.md spec verbatim (provided above). The output is **MARKDOWN ONLY** — no commentary outside the markdown, no JSON wrapper.

{case_truth_block}{news_block}# Your task

Produce the FULL rich advisory in markdown format per the SKILL.md output spec. Sections:

```
# {topic['emoji']} {topic['display']} | {DATE_PRETTY}

## Analysis & Developments

[lede paragraph naming today's deltas]

[2-4 more substantive sections in prose, each with case captions, docket numbers, judges, dollar figures, percentages, statutory citations]

## Recommended Actions

[one dense paragraph for creditors/claimants/rights-holders]

## Proposed Articles for the Briefing Site (5 Selections)

- **Title 1** — Publisher, Date
  - URL
  - One-line description

## Sources

- [Title](URL) — Publisher, Date
- (one entry per inline citation)
```

Inline citations must use the format `(__[Source Name](https://url)__)` for every factual proposition. Voice: {topic['voice']}. Length: 1,500–2,500 words. Density at the Bartz-passage level (full case caption + docket + judge + courtroom + dollar figures + percentages + statutory citations). Apply incremental-focus rules from SKILL.md — carry forward prior advisory's analytical content; today's lede surfaces NEW + DELTA matters; STALE matters stay in body, do not strip.

VERIFICATION RULES (hard requirements):
- You have a web_search tool. USE IT to verify every case posture, docket number, judge, dollar figure, percentage, and date before asserting it, and to find the specific article or primary-source page for each citation.
- Every factual proposition must cite a specific URL you confirmed THIS run: from the news scan above, your web_search results, or the tracked-case ground truth. Cite the article/filing page itself — never a bare outlet homepage.
- The tracked-case ground truth block is authoritative. If your memory of a case conflicts with it, the block wins.
- If you cannot verify a claim, OMIT it entirely. Do not write "plausible" developments. Never use the phrase "needs verification".

Output: markdown only. Start with `# {topic['emoji']}`. End with the "informational purposes" disclaimer line. No prose outside the markdown.
"""

def update_card_in_landing(slug, card_stat, card_body):
    """Update the .card-stat and .card-body for a topic on the landing page."""
    if not INDEX_HTML.exists():
        print(f"  ! index.html missing — skipping landing update for {slug}")
        return
    # Map slug → card id
    card_id = {
        "rewind-tariffs": "tariffs",
        "llm-class-action": "llm",
        "crypto-insolvency": "crypto",
        "fraud-recovery": "fraud",
        "billion-dollar-class-actions": "settlements",
        "bankruptcy-creditor-rights": "bankruptcy",
    }.get(slug, slug)

    html = INDEX_HTML.read_text(encoding="utf-8")
    pat_stat = re.compile(
        r'(<div class="card" id="' + card_id + r'">.*?<div class="card-stat">\s*).*?(\s*</div>)',
        re.DOTALL
    )
    html = pat_stat.sub(lambda m: m.group(1) + card_stat + m.group(2), html, count=1)
    pat_body = re.compile(
        r'(<div class="card" id="' + card_id + r'">.*?<div class="card-body">\s*).*?(\s*</div>)',
        re.DOTALL
    )
    html = pat_body.sub(lambda m: m.group(1) + card_body + m.group(2), html, count=1)
    INDEX_HTML.write_text(html, encoding="utf-8")
    print(f"  ✓ updated landing card for {slug}")

def update_landing_stamp():
    if not INDEX_HTML.exists(): return
    html = INDEX_HTML.read_text(encoding="utf-8")
    html = re.sub(
        r'\d{1,2}:\d{2}\s*[AP]M\s*ET\s*[·•]\s*'
        r'(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*,\s*'
        r'(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{1,2},\s*\d{4}',
        DATE_STAMP_UPPER, html, flags=re.IGNORECASE
    )
    INDEX_HTML.write_text(html, encoding="utf-8")
    print(f"  ✓ landing stamp → {DATE_STAMP_UPPER}")

# Trailing tokens that end with "." but do NOT end a sentence (legal prose is
# dense with these — "U.S.", "*Bartz v.*", "Bankr. D. Del.", "No. 25-00595").
_NON_TERMINAL = {
    "v.", "vs.", "no.", "nos.", "inc.", "corp.", "co.", "ltd.", "llc.", "l.p.",
    "ch.", "sec.", "secs.", "cir.", "bankr.", "fed.", "dist.", "op.", "slip",
    "mr.", "ms.", "mrs.", "dr.", "jr.", "sr.", "hon.", "j.", "jj.",
    "jan.", "feb.", "mar.", "apr.", "jun.", "jul.", "aug.", "sep.", "sept.",
    "oct.", "nov.", "dec.", "approx.", "est.", "dept.", "div.", "stat.",
    "vol.", "art.", "para.", "p.", "pp.", "ex.", "exh.", "doc.", "dkt.",
}

def _strip_md(text):
    """Flatten markdown to plain text for card display."""
    text = re.sub(r'\(__\[[^\]]+\]\([^)]+\)__\)', '', text)   # (__[cite](url)__)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)       # [text](url) → text
    text = re.sub(r'(\*\*|__)(.+?)\1', r'\2', text)             # bold
    text = re.sub(r'(?<!\w)([*_])(.+?)\1(?!\w)', r'\2', text)   # italics
    text = re.sub(r'`([^`]*)`', r'\1', text)                    # inline code
    return re.sub(r'\s+', ' ', text).strip()

def _truncate_words(text, max_len):
    """Cut at a word boundary with an ellipsis instead of mid-word."""
    if len(text) <= max_len:
        return text
    return text[:max_len].rsplit(" ", 1)[0].rstrip(",;:—-") + "…"

def _first_sentence(text, max_len=300):
    """First sentence, refusing to break after abbreviations like U.S. or v."""
    for m in re.finditer(r'(?<=[.!?])\s+', text):
        last_word = text[:m.start()].rsplit(" ", 1)[-1]
        bare = last_word.strip("()\"'*_").lower()
        if bare in _NON_TERMINAL:
            continue
        if re.fullmatch(r"(?:[a-z]\.)+", bare):  # initials: U.S., E.D.N.Y., D.
            continue
        return _truncate_words(text[:m.start()].strip(), max_len)
    return _truncate_words(text.strip(), max_len)

def extract_card_summary(advisory_md, topic):
    """Pull a 1-sentence delta + short stat anchor from the new advisory."""
    m = re.search(r'## Analysis & Developments\s*\n+(.+?)(?=\n## |\Z)', advisory_md, re.DOTALL)
    if not m:
        return f"{topic['display']} — see briefing", "See per-topic dashboard for full advisory."
    blocks = [b.strip() for b in m.group(1).strip().split("\n\n") if b.strip()]
    # A "### DELTA: …" headline makes the best stat anchor when present; the
    # heading may sit in its own block or share one with the lede paragraph.
    heading = ""
    body_text = ""
    for block in blocks[:4]:
        prose_lines = []
        for line in block.splitlines():
            if line.lstrip().startswith("#"):
                if not heading:
                    heading = _strip_md(re.sub(r'^#+\s*(DELTA[S]?:\s*|Today.s Delta[s]?:\s*)?', '', line.lstrip(), flags=re.I))
            else:
                prose_lines.append(line)
        if prose_lines:
            body_text = _strip_md(" ".join(prose_lines))
            break
    if not body_text:
        body_text = _strip_md(blocks[0])
    first_sentence = _first_sentence(body_text)
    if heading:
        stat = _truncate_words(heading, 80)
    else:
        stat = " ".join(first_sentence.split()[:6]) + "…"
    return _html.escape(stat, quote=False), _html.escape(first_sentence, quote=False)

def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY env var not set", file=sys.stderr)
        sys.exit(1)

    client = Anthropic(api_key=api_key)
    brand_styling = read_text(BRAND_STYLING_FILE)
    skill_md = read_text(SKILL_MD_FILE)
    sources_md = read_text(SOURCES_FILE)

    update_landing_stamp()

    whitelist, blacklist = parse_source_lists(sources_md)
    print(f"Source lists: {len(whitelist)} whitelisted, {len(blacklist)} blacklisted domains")

    docs_block = build_prompt_docs(brand_styling, skill_md, sources_md)

    def create_with_retry(**kwargs):
        for attempt in range(5):
            try:
                return client.messages.create(**kwargs)
            except RateLimitError:
                wait = 70
                print(f"  rate-limited (attempt {attempt + 1}/5) — sleeping {wait}s", flush=True)
                time.sleep(wait)
        raise RuntimeError("rate limit retries exhausted")

    first_topic = True
    for topic in TOPICS:
        if not first_topic:
            time.sleep(25)  # pace topics under the org input-tokens/min limit
        first_topic = False
        print(f"=== Generating {topic['slug']} ===", flush=True)
        try:
            news_items = fetch_news(topic['slug'], whitelist, blacklist)
        except Exception as e:
            print(f"  ! news scan error: {e}", file=sys.stderr)
            news_items = []
        print(f"  scan: {len(news_items)} whitelisted headlines (72h)")
        # Enrich headlines with extracted updates via Haiku
        if news_items:
            print(f"  extracting updates with Haiku...", flush=True)
            enriched_items = scrape_and_enrich(news_items, client, max_articles=6)
            news_block = build_enriched_news_block(enriched_items)
        else:
            news_block = build_news_block([])  # fallback for no headlines
        case_truth_block = build_case_truth_block(topic['slug'])
        if case_truth_block:
            print(f"  ground truth: tracked-case block included")
        prompt = build_prompt(topic, news_block, case_truth_block)

        response = create_with_retry(
            model="claude-sonnet-4-6",
            max_tokens=16000,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": docs_block, "cache_control": {"type": "ephemeral"}},
                    {"type": "text", "text": prompt},
                ],
            }],
        )
        # With server-side tools the content list interleaves search blocks
        # with text blocks — join every text block.
        advisory_md = "".join(
            b.text for b in response.content if getattr(b, "type", "") == "text"
        ).strip()
        # Strip code fences if present
        if advisory_md.startswith("```"):
            advisory_md = advisory_md.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        # The search loop can leak conversational preamble ("I'll verify...")
        # ahead of the advisory — keep only from the first markdown H1 on.
        if not advisory_md.startswith("#"):
            h1 = advisory_md.find("\n# ")
            if h1 != -1:
                advisory_md = advisory_md[h1 + 1:]

        # Save advisory.md
        topic_dir = REPO_ROOT / topic['slug']
        public_dir = topic_dir / "public"
        public_dir.mkdir(parents=True, exist_ok=True)
        # Grounding guards — loud warnings if the model slipped
        nv = advisory_md.lower().count("needs verification")
        if nv:
            print(f"  ! WARNING: {nv} 'needs verification' markers remain", file=sys.stderr)
        homepage_cites = len(re.findall(r"\]\(https?://[^/)]+/?\)", advisory_md))
        if homepage_cites:
            print(f"  ! WARNING: {homepage_cites} homepage-only citations", file=sys.stderr)

        advisory_path = public_dir / f"advisory-{DATE_ISO}.md"
        advisory_path.write_text(advisory_md, encoding="utf-8")
        print(f"  ✓ wrote {advisory_path.relative_to(REPO_ROOT)} ({len(advisory_md)} chars)")

        # Update landing card with the day's delta
        stat, body = extract_card_summary(advisory_md, topic)
        update_card_in_landing(topic['slug'], stat, body)

    # Call inject_dashboard.py to push the new advisories into existing brand-styled dashboards
    print("\n=== Injecting advisories into brand-styled dashboards (in place) ===", flush=True)
    result = subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "inject_dashboard.py")],
        capture_output=True, text=True
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f"  ! inject_dashboard.py failed: {result.stderr}", file=sys.stderr)

    # Tracked cases: refresh each case's docket from CourtListener, then render the case
    # pages and inject the per-topic "Tracked Cases" summary boxes. Best-effort — a docket
    # fetch or render hiccup must never fail the daily advisory run. fetch_dockets.py
    # degrades gracefully when COURTLISTENER_TOKEN is unset (seeded JSON is left as-is).
    print("\n=== Tracked cases: refresh dockets + inject summary boxes ===", flush=True)
    for case_script in ("fetch_dockets.py", "inject_cases.py"):
        r = subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / case_script)],
            capture_output=True, text=True
        )
        print(r.stdout)
        if r.returncode != 0:
            print(f"  ! {case_script} failed: {r.stderr}", file=sys.stderr)

    print(f"\n=== Done. Briefing for {DATE_PRETTY}. ===", flush=True)

if __name__ == "__main__":
    main()
