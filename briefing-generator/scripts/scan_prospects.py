#!/usr/bin/env python3
"""
scan_prospects.py — theme-driven prospecting for NEW cases worth tracking.

Themes no longer produce briefings (that's per-case now — see
generate_case_briefings.py); their keywords instead drive this scan. For each
active theme in ../src/data/themes.json, Claude + web_search hunts for newly
filed or newly prominent legal matters that fit the theme's thesis and are NOT
already tracked. Candidates land in briefing-generator/prospects.json as a
triage list — Andrew promotes one to a tracked case (Track, via
/api/admin/cases) or dismisses it on /intel/prospects.html. No auto-creation.

    {
      "updated": iso,
      "items": [{
        id,               # stable sha1-10 of the normalized case name
        case_name, parties, court, case_number, docket_url,
        why,              # 1-2 sentences: why this fits the desk + recovery angle
        theme,            # suggesting theme slug
        source_url, source_name, date,
        first_seen,       # ISO date this scan first surfaced it
        status            # "new" | "dismissed" | "tracked"
      }]
    }

Dedupe is by normalized case name against (a) tracked cases (cases/*.md
configs), (b) every existing prospect regardless of status — dismissed and
tracked entries stay as tombstones so a dismissed case never resurfaces.
Runs daily from news-scan.yml; needs ANTHROPIC_API_KEY (no-op without it).

Usage:
  python scripts/scan_prospects.py [--theme crypto-insolvency]
"""
import os, sys, json, re, time, hashlib
import datetime as dt

from cases_common import load_cases, REPO_ROOT
from scan_news import verify_url, parse_json_response

try:
    from anthropic import Anthropic, RateLimitError
except ImportError:
    print("ERROR: anthropic package not installed. Run: pip install -r scripts/requirements.txt", file=sys.stderr)
    sys.exit(1)

try:
    import usage_log            # telemetry only — never allowed to break a scan
except Exception:
    usage_log = None

USAGE = None                    # usage_log.Counter for this run, set in main()

MODEL = "claude-sonnet-4-6"
OUT_PATH = REPO_ROOT / "prospects.json"
THEMES_FILE = REPO_ROOT.parent / "src" / "data" / "themes.json"

TODAY = dt.date.today()
MAX_PER_THEME = 5
NEW_TTL_DAYS = 30        # untriaged prospects age out
TOMBSTONE_TTL_DAYS = 120  # dismissed/tracked tombstones kept for dedupe


def _flush_usage(ok=True):
    """Write this run's usage row exactly once. Idempotent and never raises."""
    global USAGE
    u, USAGE = USAGE, None
    try:
        if u:
            if not ok:
                u.fail()
            u.flush()
    except Exception:
        pass


def _arg(name, default=None):
    a = sys.argv
    flag = "--" + name
    return a[a.index(flag) + 1] if flag in a and a.index(flag) + 1 < len(a) else default


def norm_name(name):
    """Case-name key: lowercase alphanumerics, common docket noise removed."""
    s = (name or "").lower()
    s = re.sub(r"\b(in re|in the matter of|et al|llc|inc|corp|ltd|plc|lp|co)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", "", s)[:60]


def prospect_id(name):
    return hashlib.sha1(norm_name(name).encode()).hexdigest()[:10]


def load_themes():
    try:
        data = json.loads(THEMES_FILE.read_text(encoding="utf-8"))
        return [t for t in data.get("themes", []) if t.get("active", True)]
    except Exception as e:
        print(f"! themes.json load failed: {e}", file=sys.stderr)
        return []


def tracked_keys():
    """Normalized name keys + display list for every tracked case."""
    keys, display = set(), []
    for c in load_cases():
        cfg = c["config"]
        names = [cfg.get("display_name") or "", (cfg.get("case") or {}).get("parties") or ""]
        display.append(" / ".join(n for n in names if n) or c["slug"])
        for n in names + [c["slug"].replace("-", " ")]:
            k = norm_name(n)
            if len(k) >= 5:
                keys.add(k)
    return keys, display


def matches_tracked(name, keys):
    k = norm_name(name)
    if not k:
        return False
    if k in keys:
        return True
    return any(len(t) >= 8 and (t in k or k in t) for t in keys)


def vote_bias(items):
    """Reader up/down-votes on prospects steer the next scan's taste — same
    idea as the news scan's headline votes."""
    more = [i["case_name"] for i in items if i.get("vote") == 1][:8]
    less = [i["case_name"] for i in items if i.get("vote") == -1][:8]
    return more, less


def build_prompt(theme, tracked_display, existing_names, vote_more=(), vote_less=()):
    kws = theme.get("keywords") or []
    guidance = (theme.get("guidance_prompt") or "").strip()
    lines = [
        f"Today is {TODAY.isoformat()}. You are the prospecting scout for the "
        f"\"{theme.get('display_name', theme['slug'])}\" desk at Turnpage Digital Markets, "
        "which buys and brokers legal claims. Your job: surface NEW legal matters "
        "(newly filed cases, newly appointed receiverships, newly prominent proceedings) "
        "from roughly the LAST 10 DAYS that this desk should consider tracking.",
        "",
        "Desk thesis:",
        guidance[:900] if guidance else "(general coverage of the beats below)",
        "",
        "Search beats (use web_search along these lines, plus your judgment):",
        *[f"- {k}" for k in kws[:12]],
        "",
        "ALREADY TRACKED — exclude these matters and their related proceedings entirely:",
        *[f"- {d}" for d in tracked_display],
    ]
    if existing_names:
        lines += [
            "",
            "ALREADY SURFACED as prospects — exclude these too:",
            *[f"- {n}" for n in existing_names[:40]],
        ]
    if vote_more:
        lines += ["", "The reader UPVOTED these recent candidates — surface MORE matters like them:",
                  *[f"- {n}" for n in vote_more]]
    if vote_less:
        lines += ["", "The reader DOWNVOTED these recent candidates — steer AWAY from matters like them:",
                  *[f"- {n}" for n in vote_less]]
    lines += [
        "",
        f"Return up to {MAX_PER_THEME} candidates as ONLY a JSON object, no prose, exactly this shape:",
        '{"candidates": [{"case_name": "Short recognizable name (e.g. \'In re Acme Corp\' or \'Doe v. Acme\')", '
        '"parties": "Full party caption", "court": "Court (e.g. Bankr. D. Del.)", '
        '"case_number": "docket number or empty", '
        '"docket_url": "CourtListener docket URL ONLY if you actually found one this run, else empty", '
        '"why": "1-2 sentences: what just happened, why it fits this desk, and the claims/recovery angle", '
        '"source_url": "https://... (the article or filing page you found via web_search)", '
        '"source_name": "Outlet or court", "date": "YYYY-MM-DD of the development"}]}',
        "",
        "Rules: every candidate must be a REAL matter you found via web_search THIS run, with the "
        "case as the subject of the source page — never invent or guess URLs or docket numbers. "
        "Prefer matters with a concrete recovery/claims angle (estate assets, settlement fund, "
        "receivership, class fund) over policy stories. Reputable sources only (wires, legal trade "
        "press, national financial press, court/agency sites). If nothing qualifies, return "
        '{"candidates": []}.',
    ]
    return "\n".join(lines)


def clean_candidate(raw, theme_slug):
    name = (raw.get("case_name") or "").strip()[:140]
    src = (raw.get("source_url") or "").strip()
    if not name or not src.startswith("http"):
        return None
    date = (raw.get("date") or "").strip()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        date = ""
    docket_url = (raw.get("docket_url") or "").strip()
    if docket_url and "courtlistener.com/docket/" not in docket_url:
        docket_url = ""
    return {
        "id": prospect_id(name),
        "case_name": name,
        "parties": (raw.get("parties") or "").strip()[:220],
        "court": (raw.get("court") or "").strip()[:120],
        "case_number": (raw.get("case_number") or "").strip()[:60],
        "docket_url": docket_url[:300],
        "why": (raw.get("why") or "").strip()[:500],
        "theme": theme_slug,
        "source_url": src[:300],
        "source_name": (raw.get("source_name") or "").strip()[:80],
        "date": date,
        "first_seen": TODAY.isoformat(),
        "status": "new",
    }


def scan_theme(client, theme, tracked, tracked_display, existing):
    slug = theme["slug"]
    existing_names = [i["case_name"] for i in existing]
    more, less = vote_bias(existing)
    prompt = build_prompt(theme, tracked_display, existing_names, more, less)
    for attempt in range(4):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=3000,
                tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
                messages=[{"role": "user", "content": prompt}],
            )
            if USAGE:
                USAGE.add_tokens(response)
            break
        except RateLimitError:
            print(f"  rate-limited (attempt {attempt + 1}/4) — sleeping 70s", flush=True)
            time.sleep(70)
    else:
        print(f"  ! {slug}: rate limit retries exhausted", file=sys.stderr)
        if USAGE:
            USAGE.fail()
        return []

    text = "\n".join(b.text for b in response.content if getattr(b, "type", "") == "text")
    parsed = parse_json_response(text)
    if parsed is None:
        print(f"  ! {slug}: no parseable JSON in response", file=sys.stderr)
        return []

    seen_ids = {i["id"] for i in existing}
    added = []
    for raw in (parsed.get("candidates") or [])[:MAX_PER_THEME]:
        cand = clean_candidate(raw, slug)
        if cand is None:
            continue
        if cand["id"] in seen_ids:
            continue
        if matches_tracked(cand["case_name"], tracked) or matches_tracked(cand["parties"], tracked):
            print(f"    - {slug}: '{cand['case_name']}' matches a tracked case — skipped")
            continue
        if not verify_url(cand["source_url"]):
            print(f"    - {slug}: unreachable source dropped: {cand['source_url'][:80]}")
            continue
        seen_ids.add(cand["id"])
        added.append(cand)
    return added


def prune(items):
    keep = []
    new_cutoff = (TODAY - dt.timedelta(days=NEW_TTL_DAYS)).isoformat()
    tomb_cutoff = (TODAY - dt.timedelta(days=TOMBSTONE_TTL_DAYS)).isoformat()
    for i in items:
        first_seen = i.get("first_seen") or ""
        if i.get("status") == "new" and first_seen and first_seen < new_cutoff:
            continue
        if i.get("status") in ("dismissed", "tracked") and first_seen and first_seen < tomb_cutoff:
            continue
        keep.append(i)
    return keep


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set — prospect scan skipped.")
        return

    only = _arg("theme")
    themes = [t for t in load_themes() if (not only or t["slug"] == only)]
    if not themes:
        print("No active themes found" + (f" matching --theme {only}" if only else ""))
        return

    try:
        store = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    except Exception:
        store = {"items": []}
    items = prune(store.get("items") or [])

    tracked, tracked_display = tracked_keys()
    # A prospect promoted to a tracked case since the last scan flips to a
    # tombstone here even if the PUT that marked it was lost.
    for i in items:
        if i.get("status") == "new" and matches_tracked(i.get("case_name"), tracked):
            i["status"] = "tracked"

    global USAGE
    if usage_log:
        USAGE = usage_log.Counter("prospect-scan", "anthropic", model=MODEL)

    client = Anthropic(api_key=api_key)
    print(f"=== Prospect scan: {len(themes)} theme(s), {len(items)} existing prospect(s) ===")
    total = 0
    first = True
    for t in themes:
        if not first:
            time.sleep(20)  # pace under org input-tokens/min limits
        first = False
        try:
            added = scan_theme(client, t, tracked, tracked_display, items)
        except Exception as ex:
            print(f"  ! {t['slug']}: scan failed ({ex})", file=sys.stderr)
            if USAGE:
                USAGE.fail()
            continue
        items.extend(added)
        total += len(added)
        print(f"  ✓ {t['slug']}: +{len(added)} candidate(s)")

    # New first, freshest first (stable two-pass sort)
    items.sort(key=lambda i: (i.get("first_seen") or "", i.get("date") or ""), reverse=True)
    items.sort(key=lambda i: i.get("status") != "new")

    OUT_PATH.write_text(json.dumps(
        {"updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
         "items": items}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"=== Prospect scan done: +{total} new, {len(items)} total in prospects.json ===")
    _flush_usage()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        _flush_usage(ok=False)   # no-op if main() already flushed
        raise
