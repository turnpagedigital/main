#!/usr/bin/env python3
"""queue_site_drafts.py — bridge the daily briefing pipeline into the
turnpagedigital.com briefings QUEUE.

For each site-relevant topic, take today's generated advisory
(<topic>/public/advisory-YYYY-MM-DD.md) and queue it as a DRAFT post in
the site's briefings library (public/briefings/index.json + markdown),
exactly the shape the admin Briefings tab reviews and publishes.

Idempotent: a slug that already exists in index.json is skipped, so
re-running the pipeline never duplicates queue entries.

Usage:
  python queue_site_drafts.py --source <briefing-generator dir> \
                              --target <site repo checkout dir> \
                              [--date YYYY-MM-DD]
"""

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

# All six briefing topics → queue entry conventions
TOPICS = [
    {
        "folder": "llm-class-action",
        "slug_suffix": "advisory",
        "title_prefix": "LLM / Copyright Advisory",
        "tags": ["LLM", "Copyright", "Advisory"],
    },
    {
        "folder": "crypto-insolvency",
        "slug_suffix": "crypto-advisory",
        "title_prefix": "Crypto Insolvency Advisory",
        "tags": ["Crypto", "Insolvency", "Advisory"],
    },
    {
        "folder": "rewind-tariffs",
        "slug_suffix": "tariff-advisory",
        "title_prefix": "Tariffs / Trade Advisory",
        "tags": ["Tariffs", "IEEPA", "Advisory"],
    },
    {
        "folder": "fraud-recovery",
        "slug_suffix": "fraud-advisory",
        "title_prefix": "Fraud Recovery Advisory",
        "tags": ["Fraud", "Recovery", "Advisory"],
    },
    {
        "folder": "billion-dollar-class-actions",
        "slug_suffix": "class-actions-advisory",
        "title_prefix": "$1B+ Class Actions Advisory",
        "tags": ["Class Actions", "Settlements", "Advisory"],
    },
    {
        "folder": "bankruptcy-creditor-rights",
        "slug_suffix": "bankruptcy-advisory",
        "title_prefix": "Bankruptcy Creditor Rights Advisory",
        "tags": ["Bankruptcy", "Creditor Rights", "Advisory"],
    },
]

MD_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
MD_EMPH = re.compile(r"(\*\*|__|\*|_)")


def long_date(date_str):
    d = dt.date.fromisoformat(date_str)
    return d.strftime("%B ") + str(d.day) + d.strftime(", %Y")


def clean_inline_md(text):
    text = MD_LINK.sub(r"\1", text)
    text = MD_EMPH.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def strip_preamble(md):
    """Drop any conversational preamble ahead of the advisory's first H1
    ("I'll run targeted searches...# 📜 ..."), even when it's fused onto the
    heading line with no newline between."""
    if md.startswith("#"):
        return md
    h1 = md.find("# ")
    return md[h1:] if h1 != -1 else md


def extract_summary(md):
    """Prefer the 'Today's principal deltas' lead; fall back to the first
    body paragraph. Trim to ~300 chars at a sentence boundary."""
    paras = [p.strip() for p in md.split("\n\n") if p.strip()]
    lead = None
    for p in paras:
        if "principal deltas" in p.lower():
            lead = re.sub(r"^\*\*[^*]+\*\*:?\s*", "", p)
            break
    if lead is None:
        for p in paras:
            if p.startswith("#") or p.startswith("---"):
                continue
            if "Turnpage Digital Markets" in p:  # letterhead block, not a lede
                continue
            lead = p
            break
    if lead is None:
        return ""
    lead = clean_inline_md(lead)
    if len(lead) <= 300:
        return lead
    cut = lead[:300]
    last_period = cut.rfind(". ")
    return (cut[: last_period + 1] if last_period > 120 else cut.rstrip() + "…")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="briefing-generator directory")
    ap.add_argument("--target", required=True, help="site repo checkout (contains public/briefings)")
    ap.add_argument("--date", default=dt.date.today().isoformat())
    args = ap.parse_args()

    source = Path(args.source)
    briefings_dir = Path(args.target) / "public" / "briefings"
    index_path = briefings_dir / "index.json"
    if not index_path.exists():
        print(f"ERROR: {index_path} not found", file=sys.stderr)
        return 1

    index = json.loads(index_path.read_text(encoding="utf-8"))
    items = index.get("items", [])
    existing_slugs = {it.get("slug") for it in items}

    queued = []
    for topic in TOPICS:
        advisory = source / topic["folder"] / "public" / f"advisory-{args.date}.md"
        if not advisory.exists():
            print(f"skip {topic['folder']}: no advisory for {args.date}")
            continue
        slug = f"{args.date}-{topic['slug_suffix']}"
        md = strip_preamble(advisory.read_text(encoding="utf-8"))
        if slug in existing_slugs:
            # Already queued — refresh the markdown body (the pipeline may
            # have regenerated today's advisory) but leave the index entry.
            (briefings_dir / f"{slug}.md").write_text(md, encoding="utf-8")
            print(f"refreshed content for {slug} (already in index)")
            continue
        item = {
            "slug": slug,
            "date": args.date,
            "type": "briefing",
            "author": "Turnpage Intelligence",
            "title": f"{topic['title_prefix']} — {long_date(args.date)}",
            "summary": extract_summary(md),
            "tags": topic["tags"],
            "active": False,
        }
        (briefings_dir / f"{slug}.md").write_text(md, encoding="utf-8")
        items.insert(0, item)
        existing_slugs.add(slug)
        queued.append(slug)
        print(f"queued {slug}: {item['title']}")

    if queued:
        index["items"] = items
        index_path.write_text(
            json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(f"updated {index_path} (+{len(queued)} drafts)")
    else:
        print("nothing new to queue")
    return 0


if __name__ == "__main__":
    sys.exit(main())
