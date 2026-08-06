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
        published_at = ""
        pub = text("pubDate")
        if pub:
            try:
                from email.utils import parsedate_to_datetime
                pdt = parsedate_to_datetime(pub)
                date = pdt.date().isoformat()
                published_at = pdt.isoformat()
            except Exception:
                try:
                    date = dt.datetime.strptime(pub[:16], "%a, %d %b %Y").date().isoformat()
                except ValueError:
                    pass
        kind = (source.get("kind") or "News").lower()
        # Title-based reclassification: sale notices get their own tag
        if re.search(r"ucc\s+article\s*9\s+sale|notice\s+of\s+public\s+sale|public\s+notice\s+of\s+.{0,20}?sale", title, re.I):
            kind = "Asset Sale"
        items.append({
            "id": url.rstrip("/").rsplit("/", 1)[-1][:80],
            "kind": kind,
            "source": source.get("name") or "",
            "source_id": source.get("id") or "",
            "title": title,
            "url": url,
            "date": date,
            "published_at": published_at,
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


def load_case_names():
    """[(slug, [name variants])] from the generated manifest — for auto-matching
    feed items to tracked cases by name."""
    try:
        manifest = json.loads((SOURCES.parent / "cases" / "data" / "_manifest.json")
                              .read_text(encoding="utf-8"))
    except Exception:
        return []
    out = []
    for m in manifest:
        names = set()
        for key in ("display_name", "short_name"):
            n = (m.get(key) or "").strip().lower()
            if len(n) >= 4:
                names.add(n)
        if m.get("slug") and names:
            out.append((m["slug"], sorted(names)))
    return out


def auto_match_cases(items):
    """Assign case_slug to unassigned items whose text names exactly ONE
    tracked case. Manual assignments are never touched."""
    cases = load_case_names()
    if not cases:
        return 0
    matched = 0
    for it in items:
        if it.get("case_slug") or it.get("group_name"):
            continue
        hay = ((it.get("title") or "") + " " + (it.get("excerpt") or "")).lower()
        hits = [slug for slug, names in cases if any(n in hay for n in names)]
        if len(hits) == 1:
            it["case_slug"] = hits[0]
            it["auto_matched"] = True
            matched += 1
    return matched




THEMES_PATH = Path(__file__).resolve().parents[2] / "src" / "data" / "themes.json"
_STOP = {"the", "and", "for", "with", "from", "that", "this", "case", "court",
         "lawsuit", "settlement", "filing", "news", "class", "action", "legal"}

def auto_match_themes(items):
    """Tag untagged items with a theme when the headline clearly matches one
    theme's keyword vocabulary (2+ distinct keyword words, and strictly more
    than any other theme). Manual tags are never touched."""
    themes = []
    try:
        data = json.loads(THEMES_PATH.read_text(encoding="utf-8"))
        for t in (data.get("themes") or []):
            if not t.get("slug") or t.get("active") is False:
                continue
            words = set()
            for kw in list(t.get("keywords") or []) + [t.get("display_name") or ""]:
                for w in re.findall(r"[a-z0-9]+", str(kw).lower()):
                    if len(w) > 3 and w not in _STOP:
                        words.add(w)
            if words:
                themes.append((t["slug"], words))
    except Exception:
        return 0
    if not themes:
        return 0
    tagged = 0
    for it in items:
        if it.get("theme_slug") or it.get("case_slug") or it.get("group_name"):
            continue
        hay = set(re.findall(r"[a-z0-9]+",
                             ((it.get("title") or "") + " " + (it.get("excerpt") or "")).lower()))
        scores = sorted(((slug, len(w & hay)) for slug, w in themes), key=lambda x: -x[1])
        if scores[0][1] >= 2 and (len(scores) == 1 or scores[0][1] > scores[1][1]):
            it["theme_slug"] = scores[0][0]
            it["auto_theme"] = True
            tagged += 1
    return tagged


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
                for k in ("title", "date", "published_at", "excerpt", "kind", "source", "source_id", "id"):
                    cur[k] = f[k]
            else:
                f["case_slug"] = None
                f["group_name"] = None
                f["theme_slug"] = None
                existing[f["url"]] = f
                added += 1
        print(f"  ✓ {label}: {len(fresh)} item(s) in feed")

    items = sorted(existing.values(), key=lambda i: i.get("date") or "", reverse=True)
    del items[MAX_STORED:]
    matched = auto_match_cases(items)
    if matched:
        print(f"  ✓ auto-matched {matched} item(s) to tracked cases")
    themed = auto_match_themes(items)
    if themed:
        print(f"  ✓ auto-tagged {themed} item(s) with themes")
    OUT.write_text(json.dumps({"items": items}, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"=== Feed scan done: +{added} new, {len(items)} stored ===")


if __name__ == "__main__":
    main()
