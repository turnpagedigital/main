#!/usr/bin/env python3
"""
scan_x.py — pull the last 24h of posts from followed X accounts.

Reads the admin-managed follow list (src/data/x-sources.json), fetches each
active handle's recent posts through the X API v2 (X_BEARER_TOKEN env — a
read-capable paid tier is required), and writes x-posts.json for the briefing
writer (generate.py folds the mapped themes' posts into each prompt).

No token, no accounts, or API errors → writes nothing / keeps the previous
file; the briefing run continues unaffected.
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = os.path.join(os.path.dirname(REPO_ROOT), "src", "data", "x-sources.json")
OUT = os.path.join(REPO_ROOT, "x-posts.json")
API = "https://api.x.com/2"
MAX_POSTS_PER_ACCOUNT = 25


def bearer():
    return (os.environ.get("X_BEARER_TOKEN") or "").strip()


def get_json(url):
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {bearer()}",
        "User-Agent": "tpdm-intel-briefings",
    })
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))


def get_json_retry(url):
    try:
        return get_json(url)
    except urllib.error.HTTPError as ex:
        if ex.code == 429:
            wait = int(ex.headers.get("Retry-After") or 30)
            print(f"  rate-limited — waiting {min(wait, 120)}s", flush=True)
            time.sleep(min(wait, 120))
            return get_json(url)
        raise


def load_accounts():
    try:
        with open(SOURCES, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []
    return [a for a in data.get("accounts", [])
            if a.get("active", True) and a.get("handle")]


def main():
    accounts = load_accounts()
    if not accounts:
        print("no active X accounts configured — skipping")
        return
    if not bearer():
        print("X_BEARER_TOKEN not set — skipping X scan "
              f"({len(accounts)} account(s) configured)")
        return

    # Resolve handles → ids in one call
    handles = ",".join(a["handle"] for a in accounts[:100])
    try:
        users = get_json_retry(f"{API}/users/by?usernames={urllib.parse.quote(handles)}"
                               "&user.fields=name")
    except Exception as ex:
        print(f"  ! user lookup failed: {ex}", file=sys.stderr)
        return
    by_handle = {u["username"].lower(): u for u in users.get("data", [])}
    for e in users.get("errors", []):
        print(f"  ! @{e.get('value')}: {e.get('detail', 'not found')}", file=sys.stderr)

    start = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=25)) \
        .strftime("%Y-%m-%dT%H:%M:%SZ")
    posts = []
    for a in accounts:
        u = by_handle.get(a["handle"].lower())
        if not u:
            continue
        exclude = []
        if a.get("exclude_replies", True):
            exclude.append("replies")
        if a.get("exclude_retweets", True):
            exclude.append("retweets")
        qs = (f"start_time={start}&max_results={MAX_POSTS_PER_ACCOUNT}"
              "&tweet.fields=created_at,public_metrics")
        if exclude:
            qs += "&exclude=" + ",".join(exclude)
        try:
            tl = get_json_retry(f"{API}/users/{u['id']}/tweets?{qs}")
        except Exception as ex:
            print(f"  ! @{a['handle']}: timeline failed ({ex})", file=sys.stderr)
            continue
        got = 0
        for t in tl.get("data", []) or []:
            m = t.get("public_metrics") or {}
            posts.append({
                "handle": a["handle"],
                "name": u.get("name", a["handle"]),
                "themes": a.get("themes", []),
                "url": f"https://x.com/{a['handle']}/status/{t['id']}",
                "text": " ".join((t.get("text") or "").split())[:600],
                "created_at": t.get("created_at", ""),
                "likes": m.get("like_count", 0),
                "reposts": m.get("retweet_count", 0),
            })
            got += 1
        print(f"  ✓ @{a['handle']}: {got} post(s) in the last 24h")
        time.sleep(1.2)

    posts.sort(key=lambda p: p["created_at"], reverse=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({
            "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "posts": posts,
        }, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"=== X scan done: {len(posts)} post(s) from {len(accounts)} account(s) ===")


if __name__ == "__main__":
    main()
