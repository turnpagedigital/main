#!/usr/bin/env python3
"""
scan_news.py — per-case news & events scan via Claude web search.

For every tracked case (cases/*.md with a data file) this asks Claude, with
the web_search tool, for (a) recent articles from reputable outlets about the
case and (b) upcoming webinars/events tied to it. Results merge into the
case's data JSON:

    coverage: [{headline, url, source, date, summary}]   ← case pages + unified docket
    events:   [{title, date, time, kind, url, source}]   ← unified calendar

Dedupe is by URL (articles) and by url-or-title+date (events); existing
entries are never rewritten, so hand-seeded coverage survives. Runs daily via
.github/workflows/news-scan.yml; needs ANTHROPIC_API_KEY. Degrades to a no-op
without the key — it never breaks the pipeline.
"""
import os, sys, json, re, time
import datetime as dt

from cases_common import load_cases, DATA_DIR

try:
    from anthropic import Anthropic, RateLimitError
except ImportError:
    print("ERROR: anthropic package not installed. Run: pip install -r scripts/requirements.txt", file=sys.stderr)
    sys.exit(1)

MODEL = "claude-sonnet-4-6"
MAX_ARTICLES_STORED = 60
MAX_EVENTS_STORED = 40


def _arg(name, default=None):
    a = sys.argv
    return a[a.index("--" + name) + 1] if ("--" + name) in a and a.index("--" + name) + 1 < len(a) else default


def build_prompt(case):
    cfg = case["config"]
    c = cfg.get("case", {}) or {}
    research = cfg.get("research", {}) or {}
    tiers = research.get("source_tiers", {}) or {}
    trusted = []
    for k in ("tier_1", "tier_2", "tier_3"):
        trusted += [str(s) for s in (tiers.get(k) or [])]
    excluded = [str(s) for s in (tiers.get("exclude") or [])]
    guidance = (cfg.get("scan_guidance") or "").strip()
    today = dt.date.today().isoformat()

    lines = [
        f"Today is {today}. Research recent news coverage and upcoming events for this legal case:",
        "",
        f"Case: {cfg.get('display_name', case['slug'])}",
        f"Parties: {c.get('parties', '')}",
        f"Court: {c.get('court', '')} · Case no. {c.get('case_number', '')} · Judge {c.get('judge', '')}",
    ]
    if guidance:
        lines.append(f"Focus: {guidance}")
    lines += [
        "",
        "Use web_search. Find:",
        "1. ARTICLES from the last 14 days about this case from REPUTABLE outlets only — "
        "major wire services, legal trade press, and national financial press "
        "(e.g. Reuters, Bloomberg/Bloomberg Law, Law360, The Wall Street Journal, "
        "Financial Times, Reorg, The American Lawyer)."
        + (f" Preferred sources for this case: {', '.join(trusted)}." if trusted else "")
        + (f" NEVER include: {', '.join(excluded)}." if excluded else "")
        + " No press releases, no SEO content farms, no anonymous blogs.",
        "2. UPCOMING EVENTS tied to the case: webinars, CLE sessions, conference panels, "
        "claims-deadline reminders, creditor calls. Only events with a specific future date.",
        "",
        "Respond with ONLY a JSON object, no prose, exactly this shape:",
        '{"articles": [{"headline": "...", "url": "https://...", "source": "Outlet Name", '
        '"date": "YYYY-MM-DD", "summary": "1-2 sentence factual summary"}], '
        '"events": [{"title": "...", "date": "YYYY-MM-DD", "time": "HH:MM AM TZ or empty", '
        '"kind": "Webinar|CLE|Panel|Deadline|Call", "url": "https://...", "source": "Host"}]}',
        "",
        "Every url must be a page you actually found via web_search this run — never invent "
        "or guess URLs. If nothing qualifies, return empty arrays. Do not include articles "
        "that merely mention the parties in passing — the case must be the subject.",
    ]
    return "\n".join(lines)


def parse_json_response(text):
    """Pull the last JSON object out of the response text."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i + 1])
                except Exception:
                    return None
    return None


def _norm_url(u):
    return (u or "").strip().rstrip("/").lower()


def _valid_date(s):
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}$", s or ""))


def merge_articles(existing, fresh):
    seen = {_norm_url(a.get("url")) for a in existing if a.get("url")}
    added = 0
    for a in fresh:
        url = (a.get("url") or "").strip()
        headline = (a.get("headline") or a.get("title") or "").strip()
        if not url or not headline or _norm_url(url) in seen:
            continue
        if not url.startswith("http"):
            continue
        entry = {
            "headline": headline,
            "url": url,
            "source": (a.get("source") or "").strip(),
            "date": a.get("date") if _valid_date(a.get("date")) else "",
            "summary": (a.get("summary") or "").strip(),
        }
        existing.append(entry)
        seen.add(_norm_url(url))
        added += 1
    existing.sort(key=lambda a: a.get("date") or "", reverse=True)
    del existing[MAX_ARTICLES_STORED:]
    return added


def merge_events(existing, fresh):
    def key(e):
        u = _norm_url(e.get("url"))
        return u if u else ((e.get("title") or "").strip().lower() + "|" + (e.get("date") or ""))
    seen = {key(e) for e in existing}
    added = 0
    for e in fresh:
        title = (e.get("title") or "").strip()
        if not title or not _valid_date(e.get("date")):
            continue
        entry = {
            "title": title,
            "date": e["date"],
            "time": (e.get("time") or "").strip(),
            "kind": (e.get("kind") or "Event").strip(),
            "url": (e.get("url") or "").strip(),
            "source": (e.get("source") or "").strip(),
        }
        if key(entry) in seen:
            continue
        existing.append(entry)
        seen.add(key(entry))
        added += 1
    existing.sort(key=lambda e: e.get("date") or "")
    # Drop events that ended more than 30 days ago to keep the file tidy
    cutoff = (dt.date.today() - dt.timedelta(days=30)).isoformat()
    existing[:] = [e for e in existing if (e.get("date") or "") >= cutoff]
    del existing[MAX_EVENTS_STORED:]
    return added


def scan_case(client, case):
    slug = case["slug"]
    data = case["data"]
    if data is None:
        print(f"  · {slug}: no data file — skipped")
        return False

    prompt = build_prompt(case)
    for attempt in range(4):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=4000,
                tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
                messages=[{"role": "user", "content": prompt}],
            )
            break
        except RateLimitError:
            wait = 70
            print(f"  rate-limited (attempt {attempt + 1}/4) — sleeping {wait}s", flush=True)
            time.sleep(wait)
    else:
        print(f"  ! {slug}: rate limit retries exhausted", file=sys.stderr)
        return False

    text = "\n".join(b.text for b in response.content if getattr(b, "type", "") == "text")
    parsed = parse_json_response(text)
    if parsed is None:
        print(f"  ! {slug}: no parseable JSON in response", file=sys.stderr)
        return False

    articles = parsed.get("articles") or []
    events = parsed.get("events") or []
    coverage = data.setdefault("coverage", [])
    ev_list = data.setdefault("events", [])
    a_added = merge_articles(coverage, articles)
    e_added = merge_events(ev_list, events)

    case["data_path"].write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  ✓ {slug}: +{a_added} article(s), +{e_added} event(s) "
          f"({len(coverage)} stored, {len(ev_list)} events)")
    return True


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set — news scan skipped.")
        return
    only = _arg("slug")
    cases = [c for c in load_cases() if (not only or c["slug"] == only)]
    if not cases:
        print("No cases found in cases/*.md" + (f" matching --slug {only}" if only else ""))
        return
    client = Anthropic(api_key=api_key)
    print(f"=== News & events scan: {len(cases)} case(s) ===")
    first = True
    for c in cases:
        if not first:
            time.sleep(20)  # pace under org input-tokens/min limits
        first = False
        try:
            scan_case(client, c)
        except Exception as ex:
            print(f"  ! {c['slug']}: scan failed ({ex})", file=sys.stderr)
    print("=== News scan done. ===")


if __name__ == "__main__":
    main()
