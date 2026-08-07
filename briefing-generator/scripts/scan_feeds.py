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
MAX_STORED = 300     # legacy — superseded by time-based retention below
SAFETY_CAP = 6000    # hard ceiling so a misbehaving feed can't grow bondoro.json unbounded


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


_CORP_SUFFIX = {"inc", "llc", "ltd", "co", "corp", "corporation", "lp", "llp",
                "plc", "pte", "pllc", "holdings", "trust", "sa", "nv", "gmbh",
                "group", "the"}
_LEGAL_PREFIX = re.compile(r"(?i)^(in re:?|in the matter of)\s+")
# Boilerplate that must never become a match token even if a display/short
# name still carries it (e.g. a not-yet-renamed "In re" short_name → 'in re',
# which would otherwise hit 'in revenue', 'in recent', …).
_STOP_TOKENS = {"in re", "in the", "in the matter", "matter of", "in", "re",
                "matter", "et al", "of"}


def _case_tokens(display_name, short_name):
    """Distinctive match tokens for a case — a multi-word party phrase (e.g.
    'sleep number', 'power block coin') and/or a single distinctive lead word
    or acronym ('ftx', 'bartz', 'rndc'). Legal prefixes ('In re') and bare
    corporate suffixes are dropped, so a case never matches on boilerplate."""
    toks = set()
    for raw in (display_name, short_name):
        s = _LEGAL_PREFIX.sub("", (raw or "").strip())
        # keep only the party segment (before 'v.', an em-dash, colon, comma, paren, d/b/a)
        s = re.split(r"\s+vs?\.\s+|\s*[\u2014\u2013:,(]|\bd/b/a\b", s, maxsplit=1)[0]
        words = [re.sub(r"[.]", "", w) for w in s.split() if w.strip()]
        sig = [w for w in words if w.lower() not in _CORP_SUFFIX and len(w) >= 2]
        if not sig:
            continue
        if len(sig) >= 2:
            toks.add(" ".join(sig[:3]).lower())          # distinctive phrase
        lead = sig[0]
        if len(sig) == 1 or lead.isupper():              # single name or acronym
            if len(lead) >= 3:
                toks.add(lead.lower())
    return {t for t in toks if len(t) >= 3 and t not in _STOP_TOKENS}


def load_case_names():
    """[(slug, [compiled word-boundary token patterns])] from the manifest."""
    try:
        manifest = json.loads((SOURCES.parent / "cases" / "data" / "_manifest.json")
                              .read_text(encoding="utf-8"))
    except Exception:
        return []
    out = []
    for m in manifest:
        toks = _case_tokens(m.get("display_name"), m.get("short_name"))
        if m.get("slug") and toks:
            pats = [re.compile(r"(?<![a-z0-9])" + re.escape(t) + r"(?![a-z0-9])") for t in toks]
            out.append((m["slug"], pats))
    return out


def auto_match_cases(items):
    """Assign case_slug to unassigned items whose text names exactly ONE
    tracked case — matched on distinctive tokens with word boundaries, so
    'in re' never hits 'in revenue'. Manual assignments are never touched."""
    cases = load_case_names()
    if not cases:
        return 0
    matched = 0
    for it in items:
        if it.get("case_slug") or it.get("group_name"):
            continue
        hay = ((it.get("title") or "") + " " + (it.get("excerpt") or "")).lower()
        hits = [slug for slug, pats in cases if any(p.search(hay) for p in pats)]
        if len(hits) == 1:
            it["case_slug"] = hits[0]
            it["auto_matched"] = True
            matched += 1
    return matched





ARCHIVE_AFTER_DAYS = 30   # hidden from the default news view, kept for search
DELETE_AFTER_DAYS = 90    # removed from the store entirely
NOTES_PATH = REPO_ROOT / "intel-notes.json"
UPLOADS_PATH = REPO_ROOT / "uploads.json"


def _protected_index():
    """Build a {(slug, date): [desc-prefix, …]} index of items a reader has
    acted on — starred, snoozed, noted, or attached a file to. News.js keys
    these as '<case_slug>|d<date>|<title+summary>[:60]'; we index the (slug,
    date) pair plus the description remainder so retention can match an item
    tolerantly (title prefix), never deleting something the reader kept."""
    idx = {}
    def add(key):
        m = re.match(r"^(.*?)\|d(\d{4}-\d{2}-\d{2})\|(.*)$", key or "")
        if m:
            idx.setdefault((m.group(1), m.group(2)), []).append(m.group(3))
    try:
        notes = (json.loads(NOTES_PATH.read_text(encoding="utf-8")) or {}).get("entries", {})
        for k, rec in notes.items():
            if not isinstance(rec, dict):
                continue
            if rec.get("bookmarked") or (rec.get("note") or "").strip() or rec.get("snooze_until"):
                add(k)
    except Exception:
        pass
    try:
        docs = (json.loads(UPLOADS_PATH.read_text(encoding="utf-8")) or {}).get("docs", {})
        for k, lst in docs.items():
            if lst:
                add(k)  # any attached file protects
    except Exception:
        pass
    return idx


def _item_protected(item, idx):
    # Tagged to a specific case (or case group) — protected outright.
    cs, gn = item.get("case_slug"), item.get("group_name")
    if (cs and cs != "None") or (gn and gn != "None"):
        return True
    slug = "" if cs in (None, "None") else cs
    date = item.get("date") or ""
    rems = idx.get((slug, date))
    if not rems:
        return False
    title = (item.get("title") or "").strip()
    excerpt = (item.get("excerpt") or "").strip()
    dfull = (title + (" — " + excerpt if excerpt else ""))[:60]
    tprefix = title[:30]
    for r in rems:
        if r == dfull or (tprefix and r.startswith(tprefix)) or (r and dfull.startswith(r[:30])):
            return True
    return False


def apply_retention(items):
    """Archive unprotected items after 30 days (kept for search), delete after
    90. Protected items — starred / snoozed / noted / file-attached / case-
    tagged — are retained indefinitely and never archived."""
    idx = _protected_index()
    today = dt.date.today()
    kept, archived, deleted = [], 0, 0
    for it in items:
        try:
            age = (today - dt.date.fromisoformat((it.get("date") or "")[:10])).days
        except Exception:
            age = 0  # undated → treat as fresh, keep visible
        if _item_protected(it, idx):
            it.pop("archived", None)
            kept.append(it)
            continue
        if age > DELETE_AFTER_DAYS:
            deleted += 1
            continue
        if age > ARCHIVE_AFTER_DAYS:
            if not it.get("archived"):
                archived += 1
            it["archived"] = True
        else:
            it.pop("archived", None)
        kept.append(it)
    print(f"  ✓ retention: {archived} newly archived (>30d), {deleted} deleted (>90d), {len(kept)} kept")
    return kept


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
    # Retention (archive >30d, delete >90d) replaces the blunt count cap;
    # protected items are exempt, so a high safety ceiling only guards against
    # runaway growth from a bad feed.
    items = apply_retention(items)
    del items[SAFETY_CAP:]
    matched = auto_match_cases(items)
    if matched:
        print(f"  ✓ auto-matched {matched} item(s) to tracked cases")
    OUT.write_text(json.dumps({"items": items}, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"=== Feed scan done: +{added} new, {len(items)} stored ===")


if __name__ == "__main__":
    main()
