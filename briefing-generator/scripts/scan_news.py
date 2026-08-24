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
import hashlib
import os, sys, json, re, time
import datetime as dt
import urllib.error, urllib.request

from cases_common import load_cases, DATA_DIR, REPO_ROOT

try:
    import usage_log                      # API-usage telemetry; never fatal
except Exception:
    usage_log = None

try:
    from anthropic import Anthropic, RateLimitError
except ImportError:
    Anthropic = RateLimitError = None
    if "--cap-only" not in sys.argv:
        print("ERROR: anthropic package not installed. Run: pip install -r scripts/requirements.txt", file=sys.stderr)
        sys.exit(1)

MODEL = "claude-sonnet-4-6"
USAGE = None                              # usage_log.Counter for this run
MAX_ARTICLES_STORED = 60
MAX_EVENTS_STORED = 40

# ── Same-day duplicate coverage cap (Andrew, Aug 2026): when several outlets
# file basically the same story on the same day, keep at most 3 — favorite
# outlets (Manage → Sources ★) first, then the most robust write-ups, with
# distinct outlets preferred — and drop the rest. "Same story" = connected
# components over token overlap of headline + summary lead.
SAME_DAY_CLUSTER_CAP = 3
_CAP_STOP = {"the", "a", "an", "of", "to", "in", "on", "for", "and", "or",
             "by", "with", "at", "as", "is", "are", "its", "v", "vs", "et",
             "al", "after", "over", "from", "gets", "says", "say", "amid"}


def _load_blocked():
    """Outlets deleted in Manage → Sources. Their articles are never merged in,
    so a delete stays deleted across scans."""
    try:
        from cases_common import REPO_ROOT
        blocked = json.loads((REPO_ROOT / "feed-sources.json").read_text(
            encoding="utf-8")).get("blocked", [])
        return {b.strip().lower() for b in blocked if isinstance(b, str) and b.strip()}
    except Exception:
        return set()


def _load_favorites():
    try:
        from cases_common import REPO_ROOT
        favs = json.loads((REPO_ROOT / "feed-sources.json").read_text(
            encoding="utf-8")).get("favorites", [])
        return {f.strip().lower() for f in favs if isinstance(f, str)}
    except Exception:
        return set()


def _cap_tokens(a):
    text = ((a.get("headline") or "") + " " + (a.get("summary") or "")[:160]).lower()
    return {w for w in re.findall(r"[a-z0-9$€£]{3,}", text) if w not in _CAP_STOP}


def _same_story(ta, tb):
    if not ta or not tb:
        return False
    return len(ta & tb) / max(1, min(len(ta), len(tb))) >= 0.3


def cap_same_day_articles(coverage, favorites, label="", dry=False):
    """Within each publication day, cluster near-duplicate stories and keep at
    most SAME_DAY_CLUSTER_CAP of each cluster. Mutates coverage (unless dry).
    Returns the number of duplicates dropped."""
    from collections import defaultdict
    byday = defaultdict(list)
    for a in coverage:
        byday[(a.get("date") or "")[:10]].append(a)
    drop_ids = set()
    for day, arts in sorted(byday.items()):
        if len(arts) <= SAME_DAY_CLUSTER_CAP:
            continue
        toks = [_cap_tokens(a) for a in arts]
        parent = list(range(len(arts)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        for i in range(len(arts)):
            for j in range(i + 1, len(arts)):
                if _same_story(toks[i], toks[j]):
                    parent[find(i)] = find(j)
        clusters = defaultdict(list)
        for i, a in enumerate(arts):
            clusters[find(i)].append(a)
        for group in clusters.values():
            if len(group) <= SAME_DAY_CLUSTER_CAP:
                continue

            def rank(a):
                fav = (a.get("source") or "").strip().lower() in favorites
                return (0 if fav else 1,
                        -len(a.get("summary") or ""),
                        -len(a.get("headline") or ""))

            ordered = sorted(group, key=rank)
            picked, seen_src = [], set()
            for a in ordered:               # distinct outlets first
                src = (a.get("source") or "").strip().lower()
                if src in seen_src:
                    continue
                picked.append(a)
                seen_src.add(src)
                if len(picked) == SAME_DAY_CLUSTER_CAP:
                    break
            seen_pair = {((a.get("source") or "").strip().lower(),
                          (a.get("headline") or "").strip().lower()) for a in picked}
            for a in ordered:               # backfill if outlets repeated —
                if len(picked) == SAME_DAY_CLUSTER_CAP:  # but never an exact copy
                    break
                pair = ((a.get("source") or "").strip().lower(),
                        (a.get("headline") or "").strip().lower())
                if a not in picked and pair not in seen_pair:
                    picked.append(a)
                    seen_pair.add(pair)
            for a in group:
                if a not in picked:
                    drop_ids.add(id(a))
                    print(f"    - dup capped ({label} {day}): "
                          f"{(a.get('source') or '?')[:22]} — "
                          f"{(a.get('headline') or '')[:64]}")
    if drop_ids and not dry:
        coverage[:] = [a for a in coverage if id(a) not in drop_ids]
    return len(drop_ids)



def _arg(name, default=None):
    a = sys.argv
    return a[a.index("--" + name) + 1] if ("--" + name) in a and a.index("--" + name) + 1 < len(a) else default


def load_vote_bias():
    """Votes are topic feedback, not source feedback: return the recent
    up/down-voted HEADLINES so the scan can steer toward or away from those
    topics regardless of which outlet covers them."""
    try:
        raw = json.loads((DATA_DIR.parent.parent / "intel-votes.json").read_text(encoding="utf-8"))
    except Exception:
        return [], []
    votes = sorted(
        (raw.get("votes") or {}).values(),
        key=lambda v: v.get("at") or "", reverse=True,
    )[:60]
    more = [v["title"].strip() for v in votes if v.get("v") == 1 and (v.get("title") or "").strip()]
    less = [v["title"].strip() for v in votes if v.get("v") == -1 and (v.get("title") or "").strip()]
    return more[:10], less[:10]


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
    vote_pref, vote_excl = load_vote_bias()
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
        + (" The reader upvoted these recent headlines — find MORE coverage on topics like these: "
           + "; ".join('"' + h + '"' for h in vote_pref) + "." if vote_pref else "")
        + (" The reader downvoted these recent headlines — steer AWAY from topics like these "
           "(the outlet does not matter, only the topic): "
           + "; ".join('"' + h + '"' for h in vote_excl) + "." if vote_excl else "")
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


VERIFY_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
             "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

def verify_url(url, timeout=10):
    """True if the URL resolves to a live page. Paywalls and bot walls answer
    401/403/429 — those pages exist, so they pass. Dead links (404/410/5xx,
    DNS failures, timeouts) fail."""
    if not (url or "").startswith("http"):
        return False
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method, headers={"User-Agent": VERIFY_UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                if 200 <= r.status < 400:
                    return True
        except urllib.error.HTTPError as ex:
            if ex.code in (401, 403, 429):
                return True          # exists but gated
            if ex.code == 405 and method == "HEAD":
                continue             # server dislikes HEAD — retry with GET
            return False
        except Exception:
            if method == "HEAD":
                continue             # some servers reset on HEAD — try GET
            return False
    return False


def prune_dead(items, label, slug):
    """Drop stored items whose URLs have died since we saved them."""
    kept = []
    for it in items:
        u = (it.get("url") or "").strip()
        if not u or verify_url(u):
            kept.append(it)
        else:
            print(f"    - {slug}: pruned dead {label}: {u[:80]}")
    return kept


def _norm_url(u):
    return (u or "").strip().rstrip("/").lower()


def _valid_date(s):
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}$", s or ""))


def merge_articles(existing, fresh):
    seen = {_norm_url(a.get("url")) for a in existing if a.get("url")}
    blocked = _load_blocked()
    added = 0
    for a in fresh:
        if (a.get("source") or "").strip().lower() in blocked:
            continue                      # outlet deleted in Manage → Sources
        url = (a.get("url") or "").strip()
        headline = (a.get("headline") or a.get("title") or "").strip()
        if not url or not headline or _norm_url(url) in seen:
            continue
        if not _valid_date(a.get("date")):
            continue  # undated articles can't sort — skip
        if not verify_url(url):
            print(f"    - unreachable article dropped: {url[:80]}")
            continue
        entry = {
            "headline": headline,
            "url": url,
            "source": (a.get("source") or "").strip(),
            "date": a.get("date"),
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
        if entry["url"] and not verify_url(entry["url"]):
            print(f"    - unreachable event dropped: {entry['url'][:80]}")
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
            if USAGE is not None:
                USAGE.add_tokens(response)
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
    coverage[:] = prune_dead(coverage, "article", slug)
    ev_list[:] = prune_dead(ev_list, "event", slug)
    a_added = merge_articles(coverage, articles)
    cap_same_day_articles(coverage, _load_favorites(), slug)
    e_added = merge_events(ev_list, events)

    case["data_path"].write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  ✓ {slug}: +{a_added} article(s), +{e_added} event(s) "
          f"({len(coverage)} stored, {len(ev_list)} events)")
    return True


def load_priorities():
    """Slugs starred high-priority on the dashboard (roamed via
    intel-prefs.json — the same file the dashboard's ★ toggle writes to)."""
    try:
        prefs = json.loads((REPO_ROOT / "intel-prefs.json").read_text(encoding="utf-8"))
        return {slug for slug, on in (prefs.get("priorities") or {}).items() if on}
    except Exception:
        return set()


def _weekly_slot(slug):
    """Stable 0-4 (Mon-Fri) bucket for a case slug (md5-based, so it doesn't
    reshuffle when other cases are added or removed) — used to spread
    non-priority cases' once-a-week scan across the weekdays this workflow
    actually runs on, instead of piling them onto one day."""
    return int(hashlib.md5(slug.encode()).hexdigest(), 16) % 5


def main():
    if "--cap-only" in sys.argv:
        # Retroactive pass over every case data file — no API needed.
        favs = _load_favorites()
        dry = "--dry-run" in sys.argv
        total = 0
        for case in load_cases():
            data = case["data"]
            if data is None:
                continue
            cov = data.get("coverage") or []
            n = cap_same_day_articles(cov, favs, case["slug"], dry=dry)
            if n and not dry:
                data["coverage"] = cov
                case["data_path"].write_text(
                    json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            total += n
        print(f"=== Same-day cap {'(dry run) ' if dry else ''}done: "
              f"{total} duplicate article(s) {'would be ' if dry else ''}removed ===")
        return
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set — news scan skipped.")
        return
    only = _arg("slug")
    cases = [c for c in load_cases() if (not only or c["slug"] == only)]
    if not only:
        # Only sync=active cases are news-searched — manual and archived
        # cases keep their saved coverage but cost no scan budget.
        cases = [c for c in cases if c["config"].get("sync", "active") == "active"]
        # ⭐ priority cases scan every run (1x/day); everything else scans
        # once a week, on a slug-stable rotating day, so the daily call
        # volume doesn't scale with total tracked cases.
        priority = load_priorities()
        pri_cases = [c for c in cases if c["slug"] in priority]
        rest = [c for c in cases if c["slug"] not in priority]
        # Workflow only runs Mon-Fri, so weekday() (0=Mon..4=Fri) lines up
        # 1:1 with _weekly_slot's 0-4 buckets — a weekend manual dispatch
        # (weekday 5/6) just runs nobody's slot, which is fine.
        today_slot = dt.date.today().weekday()
        rest_today = [c for c in rest if _weekly_slot(c["slug"]) == today_slot]
        skipped = [c["slug"] for c in rest if c not in rest_today]
        if skipped:
            print(f"  · non-priority, not today's weekly slot — skipped: {', '.join(skipped)}")
        cases = pri_cases + rest_today
    if not cases:
        print("No cases found in cases/*.md" + (f" matching --slug {only}" if only else ""))
        return
    client = Anthropic(api_key=api_key)
    global USAGE
    if usage_log is not None:
        try:
            USAGE = usage_log.Counter("news-scan", "anthropic", model=MODEL)
        except Exception:
            USAGE = None          # telemetry must never stop a scan
    print(f"=== News & events scan: {len(cases)} case(s) ===")
    first = True
    try:
        for c in cases:
            if not first:
                time.sleep(20)  # pace under org input-tokens/min limits
            first = False
            try:
                scan_case(client, c)
            except Exception as ex:
                if USAGE is not None:
                    USAGE.fail()
                print(f"  ! {c['slug']}: scan failed ({ex})", file=sys.stderr)
    finally:
        if USAGE is not None:
            try:
                USAGE.flush()
            except Exception:
                pass
    print("=== News scan done. ===")


if __name__ == "__main__":
    main()
