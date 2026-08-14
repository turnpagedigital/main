#!/usr/bin/env python3
"""
scan_feeds.py — pull general news-source feeds into the docket/news feed.

Sources are managed on the intel site (Manage → Sources → feed-sources.json):
each has a name, a URL, a tag label (Alert / Summary / News / anything), a
type — "rss" (default) or "search" (no feed: Claude + web_search sweeps the
outlet for fresh items) — a `show` target (docket / news / both), and an
enabled flag. RSS URLs are forgiving: paste a site or article-listing page
and the scanner autodiscovers the real feed (<link rel=alternate> tag, then
the WordPress /feed/ convention) — this is what un-broke the Aug 2026 outage
where page URLs replaced feed URLs and every source silently froze.

Items merge into bondoro.json (the general feed-item store — name kept for
continuity) by URL; existing entries keep their fields, in particular the
case_slug assignment made on the docket page.

Runs from .github/workflows/news-scan.yml (twice daily). Stdlib for RSS;
"search" sources additionally need the anthropic package + ANTHROPIC_API_KEY
(both already present for scan_news.py) and degrade to a skip without them.
"""
import json, os, re, sys
import datetime as dt
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCES = REPO_ROOT / "feed-sources.json"
OUT = REPO_ROOT / "bondoro.json"

UA = "turnpage-daily-briefing/1.0 (+https://turnpagedigital.com)"
MAX_STORED = 300     # legacy — superseded by time-based retention below
SAFETY_CAP = 6000    # hard ceiling so a misbehaving feed can't grow bondoro.json unbounded

MODEL = "claude-sonnet-4-6"   # search-type sources; matches scan_news.py
SEARCH_LOOKBACK_DAYS = 3

ATOM = "{http://www.w3.org/2005/Atom}"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


# ── Feed resolution: accept page URLs, find the real feed ──────────────────

def _looks_like_feed(text):
    head = text.lstrip()[:400].lower()
    return head.startswith("<?xml") or "<rss" in head or "<feed" in head


def _discover_feed_urls(html_text, base_url):
    """Candidate feed URLs for an HTML page: <link rel=alternate> tags first,
    then the WordPress conventions (dailydac.com pages advertise no link tag
    at all — page-path + /feed/ is the only way in)."""
    urls = []
    for m in re.finditer(r"<link\b[^>]*>", html_text[:80000], re.I):
        tag = m.group(0)
        if not re.search(r"type=[\"']application/(?:rss|atom)\+xml[\"']", tag, re.I):
            continue
        href = re.search(r"href=[\"']([^\"']+)[\"']", tag, re.I)
        if href:
            urls.append(urllib.parse.urljoin(base_url, href.group(1)))
    page = base_url if base_url.endswith("/") else base_url + "/"
    urls += [page + "feed/", page + "rss/", urllib.parse.urljoin(base_url, "/feed/")]
    seen, out = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def resolve_feed(url):
    """Fetch url; if it's a feed, done. If it's HTML, autodiscover the feed.
    Returns (xml_text, feed_url). Raises when nothing feed-shaped is found."""
    text = fetch(url)
    if _looks_like_feed(text):
        return text, url
    for cand in _discover_feed_urls(text, url):
        try:
            t = fetch(cand)
        except Exception:
            continue
        if _looks_like_feed(t):
            print(f"    · autodiscovered feed: {cand}")
            return t, cand
    raise ValueError("no RSS/Atom feed at this URL (autodiscovery found none)")


# ── Parsing: strict XML first, then progressively more forgiving ───────────

_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
_BARE_AMP_RE = re.compile(r"&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]{1,31};)")


def _parse_items_loose(xml_text):
    """Last resort for a malformed feed: salvage every individually
    well-formed <item> block and drop the broken ones."""
    root = ET.Element("channel")
    for m in re.finditer(r"<item[\s>].*?</item>", xml_text, re.S | re.I):
        try:
            root.append(ET.fromstring(m.group(0)))
        except ET.ParseError:
            continue
    return root


def _feed_root(xml_text):
    try:
        return ET.fromstring(xml_text)
    except ET.ParseError:
        cleaned = _BARE_AMP_RE.sub("&amp;", _CTRL_RE.sub("", xml_text))
        try:
            return ET.fromstring(cleaned)
        except ET.ParseError:
            return _parse_items_loose(cleaned)


def _rfc_date(pub):
    date = ""
    published_at = ""
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
    return date, published_at


def _iso_date(pub):
    try:
        pdt = dt.datetime.fromisoformat((pub or "").replace("Z", "+00:00"))
        return pdt.date().isoformat(), pdt.isoformat()
    except Exception:
        return "", ""


def _mk_item(source, title, url, desc, date, published_at):
    kind = (source.get("kind") or "News").lower()
    # Title-based reclassification: sale notices get their own tag
    if re.search(r"ucc\s+article\s*9\s+sale|notice\s+of\s+public\s+sale|public\s+notice\s+of\s+.{0,20}?sale", title, re.I):
        kind = "Asset Sale"
    return {
        "id": url.rstrip("/").rsplit("/", 1)[-1][:80],
        "kind": kind,
        "source": source.get("name") or "",
        "source_id": source.get("id") or "",
        "show": _coerce_show(source.get("show")),
        "title": title,
        "url": url,
        "date": date,
        "published_at": published_at,
        "excerpt": desc[:300],
    }


def parse_feed(xml_text, source):
    items = []
    root = _feed_root(xml_text)

    for item in root.iter("item"):                     # RSS 2.0
        def text(tag):
            el = item.find(tag)
            return (el.text or "").strip() if el is not None and el.text else ""
        url = text("link")
        title = text("title")
        if not url or not title:
            continue
        desc = re.sub(r"<[^>]+>", " ", text("description"))
        desc = " ".join(desc.split())
        date, published_at = _rfc_date(text("pubDate"))
        items.append(_mk_item(source, title, url, desc, date, published_at))

    if not items:                                      # Atom (autodiscovered feeds)
        for entry in root.iter(ATOM + "entry"):
            tel = entry.find(ATOM + "title")
            title = (tel.text or "").strip() if tel is not None and tel.text else ""
            url = ""
            for link in entry.findall(ATOM + "link"):
                if link.get("rel") in (None, "alternate") and link.get("href"):
                    url = link.get("href").strip()
                    break
            if not url or not title:
                continue
            sel = entry.find(ATOM + "summary")
            if sel is None:
                sel = entry.find(ATOM + "content")
            desc = re.sub(r"<[^>]+>", " ", (sel.text or "")) if sel is not None and sel.text else ""
            desc = " ".join(desc.split())
            pel = entry.find(ATOM + "published")
            if pel is None:
                pel = entry.find(ATOM + "updated")
            date, published_at = _iso_date(pel.text if pel is not None else "")
            items.append(_mk_item(source, title, url, desc, date, published_at))

    return items


# ── "search" sources: no feed — Claude + web_search sweeps the outlet ──────

def search_source_items(source):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set — web-search source skipped")
    from anthropic import Anthropic  # deferred: RSS-only runs stay stdlib

    raw = source.get("url") or ""
    host = urllib.parse.urlparse(raw).netloc or raw
    host = host.replace("www.", "")
    today = dt.date.today().isoformat()
    prompt = (
        f"You collect feed items for a distressed-debt / litigation intelligence desk.\n"
        f"Source outlet: {source.get('name')} ({host}). Today is {today}.\n"
        f"Use web_search (queries like site:{host} plus topic words) to find articles or notices "
        f"PUBLISHED ON THIS OUTLET in the last {SEARCH_LOOKBACK_DAYS} days. Relevant topics: bankruptcy, "
        f"restructuring, insolvency, litigation, class actions, fraud, receiverships, claims, distressed credit.\n"
        f"Respond with ONLY a JSON array (no prose, no code fence). Each element: "
        f'{{"title": "...", "url": "https://...", "date": "YYYY-MM-DD", "excerpt": "<=40 words"}}. '
        f"Every url must be a page on {host} you actually saw in web_search results this run — never invent, "
        f"guess, or reconstruct one. Nothing found → []."
    )
    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL,
        max_tokens=2500,
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 4}],
        messages=[{"role": "user", "content": prompt}],
    )
    text = " ".join(b.text for b in response.content if getattr(b, "type", "") == "text")
    m = re.search(r"\[[\s\S]*\]", text)
    if not m:
        return []
    items = []
    for it in json.loads(m.group(0)):
        if not isinstance(it, dict):
            continue
        url = str(it.get("url") or "").strip()
        title = str(it.get("title") or "").strip()
        if not title or not url.startswith("http"):
            continue
        date = str(it.get("date") or "")[:10]
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            date = today
        items.append(_mk_item(source, title, url,
                              " ".join(str(it.get("excerpt") or "").split()), date, ""))
    return items


def _coerce_show(v):
    return v if v in ("docket", "news") else "both"


def load_blocked():
    """Outlets deleted in Manage → Sources — their items never enter the store."""
    try:
        raw = json.loads(SOURCES.read_text(encoding="utf-8")) if SOURCES.exists() else {}
        return {b.strip().lower() for b in (raw.get("blocked") or [])
                if isinstance(b, str) and b.strip()}
    except Exception:
        return set()


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
        s = re.split(r"\s+vs?\.\s+|\s*[—–:,(]|\bd/b/a\b", s, maxsplit=1)[0]
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
    blocked = load_blocked()
    if blocked:
        before = len(existing)
        existing = {u: i for u, i in existing.items()
                    if (i.get("source") or "").strip().lower() not in blocked}
        if len(existing) != before:
            print(f"  ✓ dropped {before - len(existing)} stored item(s) from deleted outlet(s)")

    added = 0
    for source in load_sources():
        label = f"{source.get('name', '?')} ({source.get('kind', 'News')})"
        try:
            if (source.get("type") or "rss") == "search":
                fresh = search_source_items(source)
            else:
                xml_text, _feed_url = resolve_feed(source["url"])
                fresh = parse_feed(xml_text, source)
        except Exception as ex:
            print(f"  ! {label}: feed failed ({ex}) — keeping stored items", file=sys.stderr)
            continue
        for f in fresh:
            if (f.get("source") or "").strip().lower() in blocked:
                continue                  # outlet deleted in Manage → Sources
            cur = existing.get(f["url"])
            if cur:
                for k in ("title", "date", "published_at", "excerpt", "kind",
                          "source", "source_id", "show", "id"):
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
