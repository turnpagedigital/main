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
import os, re, sys, json, time
import datetime as dt
import urllib.error, urllib.parse, urllib.request

from cases_common import load_cases, DATA_DIR, REPO_ROOT, pretty_date

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
    # Bankruptcy/BNC entries often carry a stub docket text ("BNC Certificate
    # of Notice - Order") while the attached document record holds the real
    # PACER document name — take the richest description available.
    for d in docs:
        doc_desc = " ".join((d.get("description") or "").split())
        if len(doc_desc) > len(desc):
            desc = doc_desc
    # Service affidavits carry entire creditor lists as their description —
    # cap well above any real pleading title but below layout-breaking size.
    if len(desc) > 900:
        desc = desc[:900].rsplit(" ", 1)[0] + "\u2026"
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


def _is_stale(iso_ts, now, days):
    if not iso_ts:
        return True
    try:
        last = dt.datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        return (now - last) > dt.timedelta(days=days)
    except Exception:
        return True


def build_docket_block(docket_id, docket_url, merged, backfilled, backfill_next, now, prior, fetch_meta):
    """Assemble the normalized `docket` sub-object from merged entries.

    The metadata GET (case name, docket number, last-filing date) is the one
    request every case pays on every run regardless of whether anything
    changed — at 21+ live cases x 24 runs/day that's the single biggest
    fixed cost against CourtListener's 600-request rolling-24h budget.
    `fetch_meta` gates it: skip when this run found nothing new AND the
    metadata was fetched recently, carrying the prior values forward instead
    of blanking them out."""
    meta = {}
    meta_fetched_at = prior.get("meta_fetched_at", "")
    if fetch_meta:
        try:
            meta = get_json(
                f"{API}/dockets/{docket_id}/?fields=id,case_name,docket_number,court_id,date_filed,date_last_filing,absolute_url",
                retries=1,
            )
            meta_fetched_at = now.isoformat()
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

    # CourtListener web docket pages 404 without the case-name slug — a bare
    # /docket/<id>/ URL breaks every entry link built from it. Prefer the
    # API's canonical absolute_url (always sluged); else keep an already-
    # sluged stored/config URL; the bare form is a last resort for runs
    # where the metadata fetch was throttled.
    cl_url = (docket_url or "").split("?")[0]
    if not ("courtlistener.com" in cl_url):
        cl_url = ""  # a claims-agent URL in the config must not leak in here
    if meta.get("absolute_url"):
        cl_url = "https://www.courtlistener.com" + meta["absolute_url"]
    elif not re.search(r"/docket/\d+/[^/?#]+", cl_url):
        # CL web pages 404 on a slugless docket URL but accept ANY slug text —
        # "-" keeps links working until the real slug is fetched.
        cl_url = f"https://www.courtlistener.com/docket/{docket_id}/-/"

    block = {
        "source": "courtlistener",
        "awaiting_sync": False,
        "docket_url": cl_url,
        "case_name_api": meta.get("case_name") or "",
        "date_last_filing": meta.get("date_last_filing") or prior.get("date_last_filing") or "",
        "meta_fetched_at": meta_fetched_at,
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


def refresh_case(case, history_pages=0, force=False):
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

    backfilled = bool(prior.get("backfilled")) and not force
    cursor = None if force else prior.get("backfill_next")

    # 1) Freshness: newest entries (cheap, keeps the page current)
    try:
        raw = fetch_entry_pages(ds["docket_id"], set(merged.keys()))
        for r in raw:
            ne = _normalize_entry(r, now)
            cur = merged.get(_entry_key(ne))
            # A title read off an uploaded pleading beats the court stub
            if cur and cur.get("titled_from_upload"):
                ne["description"] = cur.get("description") or ne["description"]
                ne["titled_from_upload"] = True
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
            key = _entry_key(ne)
            cur = merged.get(key)
            if cur and cur.get("titled_from_upload"):
                continue  # uploaded-pleading titles are authoritative
            # Adopt the crawled copy when it's new OR carries a richer
            # description (the doc-name upgrade) — never downgrade.
            if cur is None or len(ne.get("description") or "") > len(cur.get("description") or ""):
                if cur is not None:
                    ne["is_new"] = cur.get("is_new", ne.get("is_new"))
                merged[key] = ne

    # Only spend the metadata request when something actually moved, or the
    # last one is stale — a quiet case's cosmetic fields don't need
    # refreshing every single hourly run.
    need_meta = (len(merged) != len(existing) or crawled > 0
                 or _is_stale(prior.get("meta_fetched_at"), now, days=7))

    try:
        # Prefer the previously healed (sluged) URL over the config's, so a
        # throttled metadata fetch never regresses links to the bare form.
        block = build_docket_block(ds["docket_id"],
                                   prior.get("docket_url") or ds.get("url"), merged,
                                   backfilled, None if backfilled else cursor, now,
                                   prior, need_meta)
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
    meta_tail = "meta fetched" if need_meta else "meta skipped (quiet + fresh)"
    print(f"  ✓ {slug}: {len(block['entries'])} entries "
          f"(+{crawled} history, backfill {tail}), {block['new_in_72h']} new in 72h, {meta_tail}")
    return True


def load_priorities():
    """Slugs starred high-priority on the dashboard (roamed via
    intel-prefs.json — the same file the dashboard's ★ toggle writes to).
    The hourly trickle spends its limited CourtListener budget on these
    first, so a quota-exhausted run always sacrifices a rotating set of
    the REST instead of whichever cases happen to sort first alphabetically."""
    try:
        prefs = json.loads((REPO_ROOT / "intel-prefs.json").read_text(encoding="utf-8"))
        return {slug for slug, on in (prefs.get("priorities") or {}).items() if on}
    except Exception:
        return set()


def main():
    # DOCKET_ONLY_CASE (admin "Sync now" workflow dispatch) or --slug: sync
    # exactly that case regardless of its sync mode — an explicit request.
    only = _arg("slug") or os.environ.get("DOCKET_ONLY_CASE", "").strip()
    cases = [c for c in load_cases() if (not only or c["slug"] == only)]
    if not only:
        # Scheduled runs touch only sync=active cases. "manual" waits for the
        # button; "archived" keeps its saved docket and is never searched.
        skipped = [c["slug"] for c in cases if c["config"].get("sync", "active") != "active"]
        cases = [c for c in cases if c["config"].get("sync", "active") == "active"]
        if skipped:
            print(f"  · skipping {len(skipped)} non-active case(s): {', '.join(skipped)}")
    else:
        print(f"  single-case sync requested: {only}")
    if not cases:
        print("No cases found in cases/*.md" + (f" matching --slug {only}" if only else ""))
        return
    if not TOKEN:
        print("COURTLISTENER_TOKEN not set — running in seed-only mode "
              "(no live docket pulls; seeded JSON is left as-is).")
    history_pages = int(os.environ.get("DOCKET_HISTORY_PAGES", "4") or 0)
    backfill_all = os.environ.get("DOCKET_BACKFILL") == "1"
    # The token's budget is 600 requests per rolling 24h (CL "600/day" 429s,
    # 2026-08-04); a full 13-case history re-pull alone nearly drains it and
    # starves the live endpoint + hourly syncs for the rest of the day. So a
    # backfill run deep-syncs only the first few cases, and both run types
    # order the case list priority-first, then rotate the rest — so the
    # circuit breaker below always sacrifices a DIFFERENT set of non-priority
    # cases when the budget is already spent, instead of whichever cases
    # happen to sort first alphabetically (bartz-anthropic, every time).
    backfill_cap = int(os.environ.get("DOCKET_BACKFILL_CASES", "4") or 0)
    priority = load_priorities()
    pri_cases = [c for c in cases if c["slug"] in priority]
    rest = [c for c in cases if c["slug"] not in priority]
    if rest:
        shift = (dt.date.today().toordinal() if backfill_all
                  else int(dt.datetime.now(dt.timezone.utc).timestamp() // 3600)) % len(rest)
        rest = rest[shift:] + rest[:shift]
    cases = pri_cases + rest
    if pri_cases:
        print(f"  priority-first: {', '.join(c['slug'] for c in pri_cases)}")
    if backfill_all and cases:
        deep = ", ".join(c["slug"] for c in cases[:backfill_cap])
        print(f"  backfill rotation: deep-syncing {deep}; freshness pass for the rest")
    print(f"=== Refreshing {len(cases)} tracked case(s) "
          f"(history trickle: {history_pages} page(s)/case/run) ===")
    throttled_streak = 0
    for i, c in enumerate(cases):
        if i and TOKEN:
            time.sleep(5)
        ds = c["config"].get("docket_source") or {}
        is_live = (ds.get("type") == "courtlistener" and not ds.get("awaiting_sync")
                   and ds.get("docket_id") and TOKEN)
        ok = refresh_case(c, history_pages=history_pages,
                          force=backfill_all and i < backfill_cap)
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
