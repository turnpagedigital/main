#!/usr/bin/env python3
"""
fetch_dockets.py — refresh each tracked case's docket from CourtListener (free REST API v4)
and write the `docket` block of cases/data/<slug>.json. The seeded `claims_administrator`
and `coverage` blocks are preserved; only the docket mirror is replaced.

Runs as part of the daily briefing (called by generate.py after the advisory injection) and
is also runnable standalone:

    COURTLISTENER_TOKEN=xxxx python scripts/fetch_dockets.py
    COURTLISTENER_TOKEN=xxxx python scripts/fetch_dockets.py --slug bartz-anthropic

Get a free token: create an account at courtlistener.com, then copy the token from
Profile → API (https://www.courtlistener.com/profile/api/) and store it as the GitHub
Actions secret COURTLISTENER_TOKEN.

DEGRADES GRACEFULLY: with no token (or on any per-case error) it leaves the seeded JSON
untouched and prints a note — it never crashes the daily run. Federal & bankruptcy only.
Requires Python 3.8+ (stdlib only — urllib).
"""
import os, sys, json, time
import datetime as dt
import urllib.error, urllib.parse, urllib.request

from cases_common import load_cases, DATA_DIR, pretty_date

API = "https://www.courtlistener.com/api/rest/v4"
TOKEN = os.environ.get("COURTLISTENER_TOKEN")
WINDOW_72H = dt.timedelta(hours=72)


def _arg(name, default=None):
    a = sys.argv
    return a[a.index("--" + name) + 1] if ("--" + name) in a and a.index("--" + name) + 1 < len(a) else default


def get_json(url, retries=5):
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, headers={
            "Authorization": "Token " + TOKEN,
            "User-Agent": "turnpage-daily-briefing/1.0",
        })
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8", "replace"))
        except urllib.error.HTTPError as ex:
            # CourtListener throttles bursts (and shared CI egress IPs) with
            # 429s — wait out Retry-After and try again instead of giving up.
            if ex.code == 429 and attempt < retries:
                ra = ex.headers.get("Retry-After", "")
                wait = int(ra) if ra.isdigit() else 20 * (attempt + 1)
                time.sleep(min(wait, 120))
                continue
            raise


def _entry_key(e):
    """Stable identity for merging: docket number when present, else date+text."""
    n = e.get("entry_number")
    if n is not None:
        return "n%s" % n
    return "d%s|%s" % (e.get("date_filed") or "", (e.get("description") or "")[:60])


def _normalize_entry(e, now):
    date_filed = e.get("date_filed") or ""
    is_new = False
    if date_filed:
        try:
            d = dt.datetime.strptime(date_filed[:10], "%Y-%m-%d").replace(tzinfo=dt.timezone.utc)
            is_new = (now - d) <= WINDOW_72H
        except Exception:
            pass
    docs = e.get("recap_documents") or []
    doc_url = ""
    if docs and docs[0].get("filepath_local"):
        fp = docs[0]["filepath_local"]
        doc_url = "https://www.courtlistener.com/" + fp.lstrip("/")
    desc = " ".join((e.get("description") or "").split())
    if desc.lower() == "none":
        desc = ""  # some court RSS feeds literally say "none"
    if not desc:
        # RSS-sourced entries leave the docket text empty; the short
        # description lives on the attached document record instead.
        for d in docs:
            short = " ".join((d.get("description") or "").split())
            if short:
                desc = short
                break
    return {
        "entry_number": e.get("entry_number"),
        "date_filed": date_filed,
        "time_filed": (e.get("time_filed") or "")[:8],
        "date_display": pretty_date(date_filed, fallback=date_filed),
        "description": desc,
        "is_new": is_new,
        "landmark": "",
        "doc_url": doc_url,
    }


def first_page_url(docket_id):
    return (f"{API}/docket-entries/?docket={docket_id}&order_by=-date_filed"
            f"&fields=entry_number,date_filed,time_filed,description,recap_documents")


def fetch_entry_pages(docket_id, existing_keys, max_pages=3):
    """Freshness pass: newest pages, stopping at the first overlap with
    entries we already hold. Fail-fast on throttling (retries=1)."""
    url = first_page_url(docket_id)
    raw, pages = [], 0
    while url and pages < max_pages:
        resp = get_json(url, retries=1)
        results = resp.get("results") or []
        raw.extend(results)
        pages += 1
        overlap = any(_entry_key(r) in existing_keys for r in results)
        url = resp.get("next")
        if overlap or not results:
            break
        if url:
            time.sleep(3.0)
    return raw


def crawl_history(cursor_url, page_budget):
    """Trickle backfill: walk up to page_budget older pages from the stored
    cursor. Returns (raw_entries, next_cursor_or_None, done_bool).
    A 429 that survives one retry just ends this run's crawl — the cursor
    stays put and the next hourly run resumes from the same spot."""
    raw = []
    url = cursor_url
    for _ in range(page_budget):
        if not url:
            return raw, None, True
        try:
            resp = get_json(url, retries=1)
        except Exception as ex:
            print(f"    · history crawl paused ({ex}) — resuming next run")
            return raw, url, False
        raw.extend(resp.get("results") or [])
        url = resp.get("next")
        time.sleep(5.0)
    return raw, url, url is None


def build_docket_block(docket_id, docket_url, merged, backfilled, backfill_next, now):
    """Assemble the normalized `docket` sub-object from merged entries."""
    try:
        meta = get_json(
            f"{API}/dockets/{docket_id}/?fields=id,case_name,docket_number,court_id,date_filed,date_last_filing",
            retries=1,
        )
    except Exception:
        meta = {}  # cosmetic fields only — never discard a successful crawl over these
    for e in merged.values():
        if e.get("is_new") and e.get("date_filed"):
            try:
                d = dt.datetime.strptime(e["date_filed"][:10], "%Y-%m-%d").replace(tzinfo=dt.timezone.utc)
                e["is_new"] = (now - d) <= WINDOW_72H
            except Exception:
                e["is_new"] = False

    def sort_key(e):
        n = e.get("entry_number")
        return (e.get("date_filed") or "", n if n is not None else -1)
    entries = sorted(merged.values(), key=sort_key, reverse=True)

    block = {
        "source": "courtlistener",
        "awaiting_sync": False,
        # Entry links need the CourtListener docket URL — a claims-agent URL
        # in the config must not leak in here (it lives in claims_administrator).
        "docket_url": ((docket_url or "").split("?")[0]
                       if docket_url and "courtlistener.com" in docket_url
                       else f"https://www.courtlistener.com/docket/{docket_id}/"),
        "case_name_api": meta.get("case_name") or "",
        "date_last_filing": meta.get("date_last_filing") or "",
        "fetched_at": now.isoformat(),
        "as_of": pretty_date(now.date().isoformat()),
        "backfilled": bool(backfilled),
        "new_in_72h": sum(1 for e in entries if e["is_new"]),
        "recent": entries[:3],
        "entries": entries,
    }
    if backfill_next:
        block["backfill_next"] = backfill_next
    return block


def refresh_case(case, history_pages=0):
    cfg = case["config"]
    slug = case["slug"]
    ds = cfg["docket_source"]
    if ds["type"] != "courtlistener" or ds.get("awaiting_sync") or not ds.get("docket_id"):
        print(f"  · {slug}: not a live CourtListener case (seed kept)")
        return False
    if not TOKEN:
        print(f"  · {slug}: COURTLISTENER_TOKEN not set — seed kept")
        return False

    now = dt.datetime.now(dt.timezone.utc)
    data = case["data"] or {}
    prior = (data.get("docket") or {})
    existing = prior.get("entries") or []
    merged = {_entry_key(e): e for e in existing}

    force = os.environ.get("DOCKET_BACKFILL") == "1"
    backfilled = bool(prior.get("backfilled")) and not force
    cursor = None if force else prior.get("backfill_next")

    # 1) Freshness: newest entries (cheap, keeps the page current)
    try:
        raw = fetch_entry_pages(ds["docket_id"], set(merged.keys()))
        for r in raw:
            ne = _normalize_entry(r, now)
            merged[_entry_key(ne)] = ne
    except Exception as ex:
        print(f"  ! {slug}: fetch failed ({ex}); seed kept", file=sys.stderr)
        return False

    # 2) History trickle: a few older pages per run until the docket is walked
    crawled = 0
    if not backfilled and history_pages > 0:
        url = cursor or first_page_url(ds["docket_id"])
        raw, cursor, backfilled = crawl_history(url, history_pages)
        crawled = len(raw)
        for r in raw:
            ne = _normalize_entry(r, now)
            merged.setdefault(_entry_key(ne), ne)  # never clobber fresher data

    try:
        block = build_docket_block(ds["docket_id"], ds.get("url"), merged,
                                   backfilled, None if backfilled else cursor, now)
    except Exception as ex:
        print(f"  ! {slug}: metadata fetch failed ({ex}); seed kept", file=sys.stderr)
        return False

    # Merge: replace `docket`, preserve everything else (claims_administrator, coverage, case).
    data.setdefault("case", {}).update({
        "slug": slug,
        "display_name": cfg["display_name"],
        "case_name": block.pop("case_name_api", "") or data.get("case", {}).get("case_name", ""),
        "court": cfg["case"]["court"],
        "court_id": cfg["case"]["court_id"],
        "case_number": cfg["case"]["case_number"],
        "judge": cfg["case"]["judge"],
        "docket_id": ds["docket_id"],
        "status": cfg["status"],
    })
    data["docket"] = block
    data.setdefault("claims_administrator", None)
    data.setdefault("coverage", [])

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    case["data_path"].write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tail = "complete" if block["backfilled"] else "in progress"
    print(f"  ✓ {slug}: {len(block['entries'])} entries "
          f"(+{crawled} history, backfill {tail}), {block['new_in_72h']} new in 72h")
    return True


def main():
    only = _arg("slug")
    cases = [c for c in load_cases() if (not only or c["slug"] == only)]
    if not cases:
        print("No cases found in cases/*.md" + (f" matching --slug {only}" if only else ""))
        return
    if not TOKEN:
        print("COURTLISTENER_TOKEN not set — running in seed-only mode "
              "(no live docket pulls; seeded JSON is left as-is).")
    history_pages = int(os.environ.get("DOCKET_HISTORY_PAGES", "4") or 0)
    print(f"=== Refreshing {len(cases)} tracked case(s) "
          f"(history trickle: {history_pages} page(s)/case/run) ===")
    throttled_streak = 0
    for i, c in enumerate(cases):
        if i and TOKEN:
            time.sleep(5)
        ds = c["config"].get("docket_source") or {}
        is_live = (ds.get("type") == "courtlistener" and not ds.get("awaiting_sync")
                   and ds.get("docket_id") and TOKEN)
        ok = refresh_case(c, history_pages=history_pages)
        if is_live:
            throttled_streak = 0 if ok else throttled_streak + 1
            if throttled_streak >= 3:
                # Circuit breaker: CourtListener is stonewalling — burning the
                # remaining cases just feeds the cool-down and wastes CI time.
                print("  ! CourtListener fully throttled — aborting this run; "
                      "the next hourly run resumes where the cursors left off.")
                break
    print("=== Docket refresh done. ===")


if __name__ == "__main__":
    main()
