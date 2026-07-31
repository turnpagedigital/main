#!/usr/bin/env python3
"""
scan_feeds.py — pull general news-source RSS feeds into the docket feed.

Sources are managed from the docket page (Sources button → feed-sources.json):
each has a name, an RSS url, a tag label (Alert / Summary / News / anything),
and an enabled flag. Items merge into bondoro.json (the general feed-item
store — name kept for continuity) by URL; existing entries keep their fields,
in particular the case_slug assignment made on the docket page.

Runs daily from .github/workflows/news-scan.yml. Stdlib only.
"""
import json, re, sys
import datetime as dt
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCES = REPO_ROOT / "feed-sources.json"
OUT = REPO_ROOT / "bondoro.json"

UA = "turnpage-daily-briefing/1.0 (+https://turnpagedigital.com)"
MAX_STORED = 300


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def parse_feed(xml_text, source):
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
            "kind": (source.get("kind") or "News").lower(),
            "source": source.get("name") or "",
            "title": title,
            "url": url,
            "date": date,
            "excerpt": desc[:300],
        })
    return items


def load_sources():
    try:
        data = json.loads(SOURCES.read_text(encoding="utf-8"))
        srcs = [s for s in data.get("sources", [])
                if s.get("url", "").startswith("http") and s.get("enabled", True)]
        if srcs:
            return srcs
    except Exception:
        pass
    # Fallback: the built-in Bondoro pair
    return [
        {"name": "Bondoro", "url": "https://bondoro.com/tag/chapter-11-filing-alerts/rss/", "kind": "Alert"},
        {"name": "Bondoro", "url": "https://bondoro.com/tag/case-summaries/rss/", "kind": "Summary"},
    ]


def main():
    try:
        data = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"items": []}
    except Exception:
        data = {"items": []}
    existing = {i.get("url"): i for i in data.get("items", []) if i.get("url")}

    added = 0
    for source in load_sources():
        label = f"{source.get('name', '?')} ({source.get('kind', 'News')})"
        try:
            xml_text = fetch(source["url"])
            fresh = parse_feed(xml_text, source)
        except Exception as ex:
            print(f"  ! {label}: feed failed ({ex}) — keeping stored items", file=sys.stderr)
            continue
        for f in fresh:
            cur = existing.get(f["url"])
            if cur:
                for k in ("title", "date", "excerpt", "kind", "source", "id"):
                    cur[k] = f[k]
            else:
                f["case_slug"] = None
                existing[f["url"]] = f
                added += 1
        print(f"  ✓ {label}: {len(fresh)} item(s) in feed")

    items = sorted(existing.values(), key=lambda i: i.get("date") or "", reverse=True)
    del items[MAX_STORED:]
    OUT.write_text(json.dumps({"items": items}, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"=== Feed scan done: +{added} new, {len(items)} stored ===")


if __name__ == "__main__":
    main()
