#!/usr/bin/env python3
"""
scan_bondoro.py — pull Chapter 11 filing alerts and case summaries from
Bondoro's RSS feeds into briefing-generator/bondoro.json.

Feeds (Ghost, stable RSS):
    https://bondoro.com/tag/chapter-11-filing-alerts/rss/   → kind "alert"
    https://bondoro.com/tag/case-summaries/rss/             → kind "summary"

Items merge by URL; existing entries keep their fields — in particular the
case_slug assignment made on the docket page survives every re-scrape.
Runs daily from .github/workflows/news-scan.yml. Stdlib only.
"""
import json, re, sys
import datetime as dt
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT = REPO_ROOT / "bondoro.json"

FEEDS = [
    ("alert", "https://bondoro.com/tag/chapter-11-filing-alerts/rss/"),
    ("summary", "https://bondoro.com/tag/case-summaries/rss/"),
]

UA = "turnpage-daily-briefing/1.0 (+https://turnpagedigital.com)"
MAX_STORED = 200


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def parse_feed(xml_text, kind):
    items = []
    root = ET.fromstring(xml_text)
    for item in root.iter("item"):
        def text(tag):
            el = item.find(tag)
            return (el.text or "").strip() if el is not None and el.text else ""
        url = text("link")
        title = text("title")
        if not url or not title:
            continue
        desc = re.sub(r"<[^>]+>", " ", text("description"))
        desc = " ".join(desc.split())
        date = ""
        pub = text("pubDate")
        if pub:
            try:
                date = dt.datetime.strptime(pub[:16], "%a, %d %b %Y").date().isoformat()
            except ValueError:
                pass
        items.append({
            "id": url.rstrip("/").rsplit("/", 1)[-1][:80],
            "kind": kind,
            "title": title,
            "url": url,
            "date": date,
            "excerpt": desc[:300],
        })
    return items


def main():
    try:
        data = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"items": []}
    except Exception:
        data = {"items": []}
    existing = {i.get("url"): i for i in data.get("items", []) if i.get("url")}

    added = 0
    for kind, feed in FEEDS:
        try:
            xml_text = fetch(feed)
        except Exception as ex:
            print(f"  ! {kind} feed failed ({ex}) — keeping stored items", file=sys.stderr)
            continue
        try:
            fresh = parse_feed(xml_text, kind)
        except ET.ParseError as ex:
            print(f"  ! {kind} feed unparseable ({ex})", file=sys.stderr)
            continue
        for f in fresh:
            cur = existing.get(f["url"])
            if cur:
                # Refresh scraped fields; keep the docket-page case assignment
                for k in ("title", "date", "excerpt", "kind", "id"):
                    cur[k] = f[k]
            else:
                f["case_slug"] = None
                existing[f["url"]] = f
                added += 1
        print(f"  ✓ {kind}: {len(fresh)} item(s) in feed")

    items = sorted(existing.values(), key=lambda i: i.get("date") or "", reverse=True)
    del items[MAX_STORED:]
    OUT.write_text(json.dumps({"items": items}, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"=== Bondoro scan done: +{added} new, {len(items)} stored ===")


if __name__ == "__main__":
    main()
