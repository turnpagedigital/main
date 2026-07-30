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
import os, sys, json
import datetime as dt
import urllib.parse, urllib.request

from cases_common import load_cases, DATA_DIR, pretty_date

API = "https://www.courtlistener.com/api/rest/v4"
TOKEN = os.environ.get("COURTLISTENER_TOKEN")
WINDOW_72H = dt.timedelta(hours=72)


def _arg(name, default=None):
    a = sys.argv
    return a[a.index("--" + name) + 1] if ("--" + name) in a and a.index("--" + name) + 1 < len(a) else default


def get_json(url):
    req = urllib.request.Request(url, headers={
        "Authorization": "Token " + TOKEN,
        "User-Agent": "turnpage-daily-briefing/1.0",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def build_docket_block(docket_id, docket_url):
    """Hit CourtListener and return the normalized `docket` sub-object."""
    meta = get_json(
        f"{API}/dockets/{docket_id}/?fields=id,case_name,docket_number,court_id,date_filed,date_last_filing"
    )
    resp = get_json(
        f"{API}/docket-entries/?docket={docket_id}&order_by=-date_filed"
        f"&fields=entry_number,date_filed,description,recap_documents"
    )
    now = dt.datetime.now(dt.timezone.utc)
    entries = []
    for e in (resp.get("results") or []):
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
        entries.append({
            "entry_number": e.get("entry_number"),
            "date_filed": date_filed,
            "date_display": pretty_date(date_filed, fallback=date_filed),
            "description": desc,
            "is_new": is_new,
            "landmark": "",
            "doc_url": doc_url,
        })
    new_in_72h = sum(1 for e in entries if e["is_new"])
    return {
        "source": "courtlistener",
        "awaiting_sync": False,
        "docket_url": docket_url or f"https://www.courtlistener.com/docket/{docket_id}/",
        "case_name_api": meta.get("case_name") or "",
        "date_last_filing": meta.get("date_last_filing") or "",
        "fetched_at": now.isoformat(),
        "as_of": pretty_date(now.date().isoformat()),
        "new_in_72h": new_in_72h,
        "recent": entries[:3],
        "entries": entries,
    }


def refresh_case(case):
    cfg = case["config"]
    slug = case["slug"]
    ds = cfg["docket_source"]
    if ds["type"] != "courtlistener" or ds.get("awaiting_sync") or not ds.get("docket_id"):
        print(f"  · {slug}: not a live CourtListener case (seed kept)")
        return False
    if not TOKEN:
        print(f"  · {slug}: COURTLISTENER_TOKEN not set — seed kept")
        return False
    try:
        block = build_docket_block(ds["docket_id"], ds.get("url"))
    except Exception as ex:
        print(f"  ! {slug}: fetch failed ({ex}); seed kept", file=sys.stderr)
        return False

    # Merge: replace `docket`, preserve everything else (claims_administrator, coverage, case).
    data = case["data"] or {}
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
    print(f"  ✓ {slug}: {len(block['entries'])} entries, {block['new_in_72h']} new in 72h "
          f"→ data/{slug}.json")
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
    print(f"=== Refreshing {len(cases)} tracked case(s) ===")
    for c in cases:
        refresh_case(c)
    print("=== Docket refresh done. ===")


if __name__ == "__main__":
    main()
