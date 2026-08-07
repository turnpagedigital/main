#!/usr/bin/env python3
"""
generate_case_briefings.py — per-CASE daily briefings (the cases-not-themes model).

For every tracked case (cases/*.md with sync=active) this decides whether the
case MOVED since its last briefing — new docket entries or new press coverage
inside the lookback window whose latest-activity signature changed — and only
then calls Claude to write a 24-hour-delta briefing scoped to that one case.
Quiet cases get NO model call: their previous briefing carries forward with
moved=false and a "no change since <date>" marker the dashboard renders.

Output is briefing-generator/case-briefings.json:

    {
      "generated_at": iso,
      "items": [{
        slug, case_name, short_name, themes, court, emoji,
        date,            # date of the briefing text currently shown
        updated,         # last date the text actually changed
        moved,           # did this run regenerate the briefing?
        no_change_since, # when quiet: ISO date of the last activity
        activity: {filings, articles, latest},
        signature,       # latest-activity fingerprint (gates regeneration)
        lede, body_md, sources: [{title, url}],
        checked          # iso datetime of this run
      }]
    }

Git history is the archive — every prior day's briefing text lives in the
previous commits of this file. Runs in daily-briefing.yml after fetch_dockets
(fresh docket first) and after the 12:40 UTC news scan (fresh coverage).

Usage:
  python scripts/generate_case_briefings.py [--slug bartz-anthropic] [--force]
"""
import os, sys, json, re, time, hashlib
import datetime as dt
from pathlib import Path

from cases_common import load_cases, REPO_ROOT

try:
    from anthropic import Anthropic, RateLimitError
except ImportError:
    print("ERROR: anthropic package not installed. Run: pip install -r scripts/requirements.txt", file=sys.stderr)
    sys.exit(1)

MODEL = "claude-sonnet-4-6"
OUT_PATH = REPO_ROOT / "case-briefings.json"
INDEX_HTML = REPO_ROOT / "index.html"
SITE_ROOT = REPO_ROOT.parent
INTELLIGENCE_FILE = SITE_ROOT / "src" / "data" / "intelligence-settings.json"

TODAY = dt.date.today()
DATE_ISO = TODAY.isoformat()
DATE_PRETTY = TODAY.strftime("%A, %B %-d, %Y")

# Activity inside this many days can trigger a briefing (the signature check
# still prevents re-briefing the same filings two days running).
LOOKBACK_DAYS = int(os.environ.get("CASE_BRIEFING_LOOKBACK_DAYS", "2"))
# Hard cap on model calls per run — cost containment as the case list grows.
MAX_GENERATIONS = int(os.environ.get("CASE_BRIEFING_MAX_GENERATIONS", "10"))


def _arg(name):
    return ("--" + name) in sys.argv

def _arg_value(name, default=None):
    a = sys.argv
    flag = "--" + name
    return a[a.index(flag) + 1] if flag in a and a.index(flag) + 1 < len(a) else default


# ── Small markdown/text helpers (mirrors generate.py's card extraction) ──────
_NON_TERMINAL = {
    "v.", "vs.", "no.", "nos.", "inc.", "corp.", "co.", "ltd.", "llc.", "l.p.",
    "ch.", "sec.", "secs.", "cir.", "bankr.", "fed.", "dist.", "op.", "slip",
    "mr.", "ms.", "mrs.", "dr.", "jr.", "sr.", "hon.", "j.", "jj.",
    "jan.", "feb.", "mar.", "apr.", "jun.", "jul.", "aug.", "sep.", "sept.",
    "oct.", "nov.", "dec.", "approx.", "est.", "dept.", "div.", "stat.",
    "vol.", "art.", "para.", "p.", "pp.", "ex.", "exh.", "doc.", "dkt.",
}

def _strip_md(text):
    text = re.sub(r'\(__\[[^\]]+\]\([^)]+\)__\)', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'(\*\*|__)(.+?)\1', r'\2', text)
    text = re.sub(r'(?<!\w)([*_])(.+?)\1(?!\w)', r'\2', text)
    text = re.sub(r'`([^`]*)`', r'\1', text)
    text = re.sub(r'\s+', ' ', text)
    return re.sub(r'\s+([.,;:!?])', r'\1', text).strip()

def _truncate_words(text, max_len):
    if len(text) <= max_len:
        return text
    return text[:max_len].rsplit(" ", 1)[0].rstrip(",;:—-") + "…"

def _first_sentences(text, max_len=420):
    """Lede: up to ~2 sentences, refusing to break after legal abbreviations."""
    ends = []
    for m in re.finditer(r'(?<=[.!?])\s+', text):
        last_word = text[:m.start()].rsplit(" ", 1)[-1]
        bare = last_word.strip("()\"'*_").lower()
        if bare in _NON_TERMINAL or re.fullmatch(r"(?:[a-z]\.)+", bare):
            continue
        ends.append(m.start())
        if len(ends) >= 2:
            break
    # Fewer than 2 mid-text breaks → the paragraph IS the lede (capped below).
    cut = ends[1] if len(ends) >= 2 else len(text)
    return _truncate_words(text[:cut].strip(), max_len)


# ── Activity gate ────────────────────────────────────────────────────────────
def latest_entry_key(entries):
    best = ("", 0)
    for e in entries or []:
        d = (e.get("date_filed") or "")[:10]
        n = e.get("entry_number") or 0
        try:
            n = int(n)
        except Exception:
            n = 0
        if (d, n) > best:
            best = (d, n)
    return best

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}")

def _iso(d):
    """ISO date or '' — seeded coverage carries pretty dates ('May 14, 2026')
    that would corrupt string comparison against ISO dates."""
    d = (d or "")[:10]
    return d if _ISO_DATE.match(d) else ""

def latest_coverage_key(coverage):
    best = ("", "")
    for a in coverage or []:
        d = _iso(a.get("date"))
        u = (a.get("url") or "")[:120]
        if d and (d, u) > best:
            best = (d, u)
    return best

def activity_of(data):
    """(signature, latest_iso_date, filings_in_window, articles_in_window)."""
    entries = ((data or {}).get("docket") or {}).get("entries") or []
    coverage = (data or {}).get("coverage") or []
    since = (TODAY - dt.timedelta(days=LOOKBACK_DAYS)).isoformat()
    led, len_ = latest_entry_key(entries)
    lcd, lcu = latest_coverage_key(coverage)
    sig = hashlib.sha1(f"{led}|{len_}|{lcd}|{lcu}".encode()).hexdigest()[:12]
    latest = max(led, lcd) or ""
    filings = [e for e in entries if _iso(e.get("date_filed")) >= since and _iso(e.get("date_filed"))]
    articles = [a for a in coverage if _iso(a.get("date")) >= since and _iso(a.get("date"))]
    return sig, latest, filings, articles


# ── Prompt assembly ──────────────────────────────────────────────────────────
STYLE_SPEC = """# Style spec (authoritative — the house per-case briefing voice)

- ONE flowing narrative in markdown. NO bullets, NO numbered lists, NO subheadings
  inside the body. Dense paragraphs of five to seven sentences.
- This is a DELTA briefing for a reader who read yesterday's edition: cover ONLY what
  moved since the previous briefing (docket filings, rulings, coverage, deadlines that
  newly ripened), tie it to the running arc in a clause — never a backgrounder.
- Density: full case caption, docket numbers, judge, courtroom, dollar figures,
  percentages, statutory citations wherever they bear on the point. Precise figures
  ("$187.5 million", "91.3 percent"), never rounded shorthand.
- Every factual proposition closes with an inline citation in the exact format
  (__[Source Name](https://url)__). Chain multiple sources where needed. The docket
  ground truth below needs no citation; everything from the press or the web does.
- Urgency through factual circumstance — dates, counts, mechanisms — never alarm
  adjectives, never hype, never hedging ("may", "could", "likely") unless the
  uncertainty is itself the point. Complete sentences. Em-dashes rare.
- Creditor/claimant orientation: frame every implication to the recovery posture of
  claimants, creditors, and rights-holders — not the defendant.
- Length proportional to the movement: a single filing of consequence may need only
  150-300 words; a heavy day 400-800. NO padding, NO length floor, NO restating the
  case posture the reader already knows.
- Close the body on the next concrete milestone (date + what happens) when one exists.
"""

def load_house_voice():
    try:
        intel = json.loads(INTELLIGENCE_FILE.read_text(encoding="utf-8"))
        return ((intel.get("voice") or {}).get("default") or "").strip()
    except Exception:
        return ""

def fmt_entry(e):
    desc = re.sub(r"\s+", " ", (e.get("description") or "")).strip()[:420]
    num = e.get("entry_number")
    return f"- Dkt. {num if num is not None else '—'} · filed {e.get('date_filed', '?')} · {desc}"

def fmt_article(a):
    s = f"- {a.get('headline', '')} — {a.get('source', '')}, {a.get('date', '')} · {a.get('url', '')}"
    if a.get("summary"):
        s += f"\n  {a['summary'][:240]}"
    return s

def build_tagged_block(slug):
    """Articles Andrew hand-tagged to this case on the News page."""
    path = REPO_ROOT / "bondoro.json"
    try:
        items = json.loads(path.read_text(encoding="utf-8")).get("items", [])
    except Exception:
        return ""
    cutoff = (TODAY - dt.timedelta(days=4)).isoformat()
    mine = [i for i in items
            if i.get("case_slug") == slug and (i.get("date") or "") >= cutoff][:10]
    if not mine:
        return ""
    lines = ["# Reader-tagged articles for this case (priority source material)", ""]
    for i in mine:
        lines.append(f"- {i.get('title', '')} ({i.get('source', '')}, {i.get('date', '')}) {i.get('url', '')}")
    return "\n".join(lines) + "\n\n"

def build_x_block(cfg, short):
    """Posts from followed X accounts that mention this case by name."""
    path = REPO_ROOT / "x-posts.json"
    try:
        posts = json.loads(path.read_text(encoding="utf-8")).get("posts", [])
    except Exception:
        return ""
    topics = set(cfg.get("topics") or [])
    needles = [n.lower() for n in (short, cfg.get("display_name") or "") if n]
    mine = []
    for p in posts:
        if topics and not (set(p.get("themes") or []) & topics):
            continue
        text = (p.get("text") or "").lower()
        if any(n in text for n in needles):
            mine.append(p)
    if not mine:
        return ""
    lines = ["# Followed X accounts mentioning this case (last 24h — verify before repeating)", ""]
    for p in mine[:12]:
        stamp = (p.get("created_at") or "")[:16].replace("T", " ")
        lines.append(f"- @{p.get('handle', '')} {stamp} UTC — \"{p.get('text', '')}\" ({p.get('url', '')})")
    return "\n".join(lines) + "\n\n"

def build_prompt(case, prev_item, filings, articles, house_voice):
    cfg = case["config"]
    data = case["data"] or {}
    c = cfg.get("case", {}) or {}
    short = (cfg.get("display_name") or case["slug"]).split(" v.")[0].strip()
    emoji = cfg.get("emoji", "⚖️")

    voice_block = ""
    if house_voice:
        voice_block = ("# House voice (admin-managed — authoritative for tone; "
                       "follow it exactly)\n\n" + house_voice[:5000] + "\n\n")

    # Ground truth: config + status + claims stats + upcoming events
    gt = [f"Case: {cfg.get('display_name', case['slug'])}",
          f"Parties: {c.get('parties', '')}",
          f"Court: {c.get('court', '')} · Case no. {c.get('case_number', '')} · Judge {c.get('judge', '')}",
          f"Status: {cfg.get('status', '')}"]
    if cfg.get("scan_guidance"):
        gt.append(f"Desk guidance: {cfg['scan_guidance']}")
    ca = data.get("claims_administrator") or {}
    if ca.get("stat_big") or ca.get("stat_sub"):
        gt.append(f"Claims administration: {ca.get('stat_big', '')} — {ca.get('stat_sub', '')}")
    for dte in (ca.get("dates") or [])[:8]:
        gt.append(f"  · {dte.get('date', '')}: {dte.get('label', '')}" + (" (done)" if dte.get("done") else ""))
    upcoming = [ev for ev in (data.get("events") or []) if (ev.get("date") or "") >= DATE_ISO][:6]
    if upcoming:
        gt.append("Upcoming events:")
        for ev in upcoming:
            gt.append(f"  · {ev.get('date', '')} — {ev.get('kind', '')}: {ev.get('title', '')}")

    entries = (data.get("docket") or {}).get("entries") or []
    new_keys = {(e.get("entry_number"), e.get("date_filed")) for e in filings}
    context_entries = [e for e in entries
                       if (e.get("entry_number"), e.get("date_filed")) not in new_keys][:10]

    new_urls = {a.get("url") for a in articles}
    context_articles = [a for a in (data.get("coverage") or []) if a.get("url") not in new_urls][:5]

    prev_block = ""
    if prev_item and prev_item.get("body_md"):
        prev_block = (
            f"# Your previous briefing for this case ({prev_item.get('date', 'earlier')}) — "
            "the reader has read this; do NOT repeat it, cover what changed since\n\n"
            + prev_item["body_md"][:6000] + "\n\n")

    moved_lines = []
    if filings:
        moved_lines.append("New docket entries (ground truth — the docket is authoritative):")
        moved_lines += [fmt_entry(e) for e in sorted(
            filings, key=lambda e: ((e.get("date_filed") or ""), e.get("entry_number") or 0), reverse=True)[:15]]
    if articles:
        moved_lines.append("")
        moved_lines.append("New press coverage (verified URLs from the news scan):")
        moved_lines += [fmt_article(a) for a in articles[:10]]

    return f"""You are the case desk covering {cfg.get('display_name', case['slug'])} for Andrew at Turnpage Digital Markets, writing today's per-case briefing at the standard of a specialist firm writing to sophisticated clients who pay for judgment rather than summary.

TODAY: {DATE_PRETTY}

{voice_block}{STYLE_SPEC}

# Case ground truth (AUTHORITATIVE — overrides anything you believe from memory)

{chr(10).join(gt)}

# What moved in the lookback window (the reason for today's briefing)

{chr(10).join(moved_lines)}

# Recent docket context (already covered — for orientation only)

{chr(10).join(fmt_entry(e) for e in context_entries) or '(none)'}

# Recent coverage context (already covered — for orientation only)

{chr(10).join(fmt_article(a) for a in context_articles) or '(none)'}

{build_tagged_block(case['slug'])}{build_x_block(cfg, short)}{prev_block}# Your task

Write TODAY's briefing for this one case — what moved, why it matters to the recovery posture, and the next milestone. Output MARKDOWN ONLY in exactly this shape:

```
# {emoji} {cfg.get('display_name', case['slug'])} | {DATE_PRETTY}

[1-3 flowing paragraphs per the style spec — only the delta, with inline (__[Source](url)__) citations for every press-sourced proposition]

## Sources

- [Title](URL) — Publisher, Date
```

VERIFICATION RULES (hard requirements):
- You have a web_search tool; use it (sparingly — at most 3 searches) to confirm any fact you would otherwise assert from memory and to find the primary-source page for anything the materials above don't already source.
- Every press-sourced proposition must cite a URL you confirmed this run — from the materials above or your searches. Never a bare outlet homepage. The docket ground truth needs no citation.
- If your memory of the case conflicts with the ground truth block, the block wins.
- If you cannot verify a claim, omit it. Never write "needs verification".

End with the line: *This briefing is provided for informational purposes by Turnpage Digital Markets and does not constitute legal advice.*
No prose outside the markdown. Start with `# {emoji}`.
"""


# ── Response parsing ─────────────────────────────────────────────────────────
def parse_briefing_md(md):
    """(body_md_without_h1, lede, sources). Tolerant of preamble/code fences."""
    md = md.strip()
    if md.startswith("```"):
        md = md.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    if not md.startswith("#"):
        h1 = md.find("# ")
        if h1 != -1:
            md = md[h1:]
    # Drop the H1 line — the UI renders the case name itself
    lines = md.split("\n")
    if lines and lines[0].lstrip().startswith("# "):
        lines = lines[1:]
    body = "\n".join(lines).strip()

    sources = []
    src = re.search(r'(?ms)^## Sources\s*\n(.*?)(?=^## |\Z)', body)
    if src:
        for m in re.finditer(r'-\s*\[([^\]]+)\]\((https?://[^)\s]+)\)([^\n]*)', src.group(1)):
            sources.append({"title": m.group(1).strip(),
                            "url": m.group(2).strip(),
                            "note": m.group(3).strip(" —·-")})
    lede_para = ""
    for para in body.split("\n\n"):
        p = para.strip()
        if not p or p.startswith("#") or p.startswith("*This briefing"):
            continue
        lede_para = _strip_md(p)
        break
    return body, _first_sentences(lede_para) if lede_para else "", sources


def update_landing_stamp():
    """Refresh the dashboard's date stamp (same regex as generate.py)."""
    if not INDEX_HTML.exists():
        return
    stamp = f"{dt.datetime.now().strftime('%-I:%M %p ET').upper()} · {TODAY.strftime('%A, %B %-d, %Y').upper()}"
    html = INDEX_HTML.read_text(encoding="utf-8")
    html = re.sub(
        r'\d{1,2}:\d{2}\s*[AP]M\s*ET\s*[·•]\s*'
        r'(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*,\s*'
        r'(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{1,2},\s*\d{4}',
        stamp, html, flags=re.IGNORECASE)
    INDEX_HTML.write_text(html, encoding="utf-8")
    print(f"  ✓ landing stamp → {stamp}")


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set — case briefings skipped.")
        return

    only = _arg_value("slug")
    force = _arg("force")

    try:
        prev = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    except Exception:
        prev = {"items": []}
    prev_by_slug = {i.get("slug"): i for i in prev.get("items", [])}

    cases = load_cases()
    if only:
        cases = [c for c in cases if c["slug"] == only]
    active = [c for c in cases
              if c["config"].get("sync", "active") == "active" and c["data"] is not None]
    if not active:
        print("No active cases with data files found.")
        return

    client = Anthropic(api_key=api_key)
    house_voice = load_house_voice()
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")

    # Decide who moved, then cap the generation list by freshest activity.
    plan = []
    for case in active:
        sig, latest, filings, articles = activity_of(case["data"])
        prev_item = prev_by_slug.get(case["slug"])
        since = (TODAY - dt.timedelta(days=LOOKBACK_DAYS)).isoformat()
        moved = bool((filings or articles) and latest >= since
                     and (force or not prev_item or prev_item.get("signature") != sig))
        plan.append({"case": case, "sig": sig, "latest": latest,
                     "filings": filings, "articles": articles,
                     "prev": prev_item, "moved": moved})

    movers = [p for p in plan if p["moved"]]
    movers.sort(key=lambda p: p["latest"], reverse=True)
    if len(movers) > MAX_GENERATIONS:
        for p in movers[MAX_GENERATIONS:]:
            p["moved"] = False
            print(f"  ! {p['case']['slug']}: over the {MAX_GENERATIONS}-generation cap — deferred to tomorrow")
        movers = movers[:MAX_GENERATIONS]
    print(f"=== Case briefings: {len(active)} active case(s), {len(movers)} moved ===")

    def create_with_retry(**kwargs):
        for attempt in range(4):
            try:
                return client.messages.create(**kwargs)
            except RateLimitError:
                print(f"  rate-limited (attempt {attempt + 1}/4) — sleeping 70s", flush=True)
                time.sleep(70)
        raise RuntimeError("rate limit retries exhausted")

    items = []
    first = True
    for p in plan:
        case, cfg = p["case"], p["case"]["config"]
        slug = case["slug"]
        prev_item = p["prev"] or {}
        short = (cfg.get("display_name") or slug).split(" v.")[0].strip()
        base = {
            "slug": slug,
            "case_name": cfg.get("display_name") or slug,
            "short_name": short,
            "emoji": cfg.get("emoji", "⚖️"),
            "themes": cfg.get("topics") or [],
            "court": (cfg.get("case") or {}).get("court", ""),
            "status": cfg.get("status", ""),
            "signature": p["sig"],
            "activity": {"filings": len(p["filings"]), "articles": len(p["articles"]),
                         "latest": p["latest"]},
            "checked": now_iso,
        }

        if not p["moved"]:
            items.append({
                **base,
                "date": prev_item.get("date", ""),
                "updated": prev_item.get("updated", prev_item.get("date", "")),
                "moved": False,
                "no_change_since": p["latest"] or prev_item.get("date", "") or None,
                "lede": prev_item.get("lede", ""),
                "body_md": prev_item.get("body_md", ""),
                "sources": prev_item.get("sources", []),
            })
            print(f"  · {slug}: quiet (no change since {p['latest'] or 'seed'})")
            continue

        if not first:
            time.sleep(20)  # pace under org input-tokens/min limits
        first = False
        print(f"=== Generating {slug} ===", flush=True)
        try:
            response = create_with_retry(
                model=MODEL,
                max_tokens=3000,
                tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
                messages=[{"role": "user",
                           "content": build_prompt(case, prev_item, p["filings"], p["articles"], house_voice)}],
            )
            text = "\n".join(b.text for b in response.content
                             if getattr(b, "type", "") == "text").strip()
            body, lede, sources = parse_briefing_md(text)
            if not body:
                raise ValueError("empty briefing body")
            nv = body.lower().count("needs verification")
            if nv:
                print(f"  ! WARNING: {nv} 'needs verification' markers remain", file=sys.stderr)
            items.append({
                **base,
                "date": DATE_ISO,
                "updated": DATE_ISO,
                "moved": True,
                "no_change_since": None,
                "lede": lede,
                "body_md": body,
                "sources": sources,
            })
            print(f"  ✓ {slug}: briefed ({len(body)} chars, {len(sources)} source(s), "
                  f"{len(p['filings'])} filing(s), {len(p['articles'])} article(s))")
        except Exception as ex:
            print(f"  ! {slug}: generation failed ({ex}) — carrying previous briefing", file=sys.stderr)
            items.append({
                **base,
                "signature": prev_item.get("signature", ""),  # retry next run
                "date": prev_item.get("date", ""),
                "updated": prev_item.get("updated", prev_item.get("date", "")),
                "moved": False,
                "no_change_since": p["latest"] or None,
                "lede": prev_item.get("lede", ""),
                "body_md": prev_item.get("body_md", ""),
                "sources": prev_item.get("sources", []),
            })

    # moved first (freshest activity first), then quiet by most recent activity
    items.sort(key=lambda i: (i["moved"], i["activity"]["latest"] or i.get("updated") or ""), reverse=True)

    OUT_PATH.write_text(json.dumps({"generated_at": now_iso, "items": items},
                                   indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"✓ wrote {OUT_PATH.relative_to(REPO_ROOT)} ({len(items)} case(s), "
          f"{sum(1 for i in items if i['moved'])} regenerated)")
    update_landing_stamp()


if __name__ == "__main__":
    main()
