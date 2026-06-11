#!/usr/bin/env python3
"""
Shared helpers for the tracked-cases feature.

A "case" = one court matter defined by cases/<slug>.md (front-matter config + notes),
mirrored into cases/data/<slug>.json (docket + seeded claims/coverage), and rendered to
cases/<slug>.html. Cases are tagged to one or more topic dirs via their `topics:` list and
surface as a summary box on each tagged topic's dashboard.html.

This module only parses the small, known-shape front-matter we write — it is NOT a general
YAML parser. Both fetch_dockets.py and inject_cases.py import from here.
"""
import re, json
import datetime as dt
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CASES_DIR = REPO_ROOT / "cases"
DATA_DIR = CASES_DIR / "data"

# Topic dir slug -> display + emoji (mirrors TOPICS in generate.py). Used for backlinks
# and the box's topic context. A case may tag any subset of these.
TOPIC_META = {
    "rewind-tariffs":               {"display": "Tariffs / Trade",               "emoji": "⚖️"},
    "llm-class-action":             {"display": "LLM / Copyright",               "emoji": "🤖"},
    "crypto-insolvency":            {"display": "Crypto Insolvency",             "emoji": "🪙"},
    "fraud-recovery":               {"display": "Ponzi / Fraud Recovery",        "emoji": "🕵️"},
    "billion-dollar-class-actions": {"display": "$1B+ Class Actions & Mass Arb", "emoji": "💰"},
    "bankruptcy-creditor-rights":   {"display": "Bankruptcy Creditor Rights",    "emoji": "📜"},
}


# ── front-matter parsing (targeted to our known schema) ──────────────────────
def _front_matter_block(text):
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n', text, re.DOTALL)
    return m.group(1) if m else ""

def _subblock(block, parent):
    """Indented block under `parent:` up to the next column-0 key.
    Tolerates a trailing inline comment on the parent line (e.g. `topics:   # note`)."""
    m = re.search(r'(?m)^' + re.escape(parent) + r':[ \t]*(?:#.*)?\n((?:[ \t]+.*\n?)*)', block)
    return m.group(1) if m else ""

def _scalar(block, key):
    """`key: value` (quotes optional). Returns None if absent or empty-string."""
    m = re.search(r'(?m)^[ \t]*' + re.escape(key) + r':[ \t]*"?([^"\n#]+?)"?[ \t]*(?:#.*)?$', block)
    return m.group(1).strip() if m else None

def _list(block, parent):
    sub = _subblock(block, parent)
    return [ln.strip()[1:].strip() for ln in sub.splitlines() if ln.strip().startswith('-')]

def _truthy(v):
    return str(v).strip().lower() in ("true", "yes", "1", "on") if v is not None else False


def parse_case_config(text):
    """Parse a cases/<slug>.md front-matter into the fields the scripts use."""
    fm = _front_matter_block(text)
    case_sub = _subblock(fm, "case")
    ds_sub = _subblock(fm, "docket_source")
    ca_sub = _subblock(fm, "claims_administrator")
    return {
        "slug": _scalar(fm, "slug"),
        "display_name": _scalar(fm, "display_name"),
        "type": _scalar(fm, "type"),
        "emoji": _scalar(fm, "emoji") or "⚖️",
        "status": _scalar(fm, "status") or "",
        "topics": _list(fm, "topics"),
        "case": {
            "parties": _scalar(case_sub, "parties") or "",
            "court": _scalar(case_sub, "court") or "",
            "court_id": _scalar(case_sub, "court_id") or "",
            "case_number": _scalar(case_sub, "case_number") or "",
            "judge": _scalar(case_sub, "judge") or "",
        },
        "docket_source": {
            "type": _scalar(ds_sub, "type") or "manual",
            "docket_id": _scalar(ds_sub, "docket_id"),
            "url": _scalar(ds_sub, "url") or "",
            "awaiting_sync": _truthy(_scalar(ds_sub, "awaiting_sync")),
        },
        "claims_administrator": {
            "name": _scalar(ca_sub, "name") or "",
            "url": _scalar(ca_sub, "url") or "",
            "key_dates_url": _scalar(ca_sub, "key_dates_url") or "",
        } if ca_sub.strip() else None,
    }


def load_cases():
    """Discover cases/*.md (skip *_disabled.md and README.md). Returns list of
    {slug, config, data, data_path, config_path}. `data` is the parsed data JSON or None."""
    out = []
    if not CASES_DIR.exists():
        return out
    for md in sorted(CASES_DIR.glob("*.md")):
        if md.name.lower() == "readme.md" or md.stem.endswith("_disabled"):
            continue
        cfg = parse_case_config(md.read_text(encoding="utf-8"))
        if not cfg.get("slug"):
            cfg["slug"] = md.stem
        data_path = DATA_DIR / f"{cfg['slug']}.json"
        data = None
        if data_path.exists():
            try:
                data = json.loads(data_path.read_text(encoding="utf-8"))
            except Exception:
                data = None
        out.append({"slug": cfg["slug"], "config": cfg, "data": data,
                    "data_path": data_path, "config_path": md})
    return out


# ── shared formatting ────────────────────────────────────────────────────────
def pretty_date(iso, fallback=""):
    """'2026-05-14' -> 'May 14, 2026'. Non-ISO input returns the fallback (or input)."""
    if not iso:
        return fallback
    try:
        d = dt.datetime.strptime(iso[:10], "%Y-%m-%d").date()
        return d.strftime("%b %-d, %Y")
    except Exception:
        return fallback or iso

def html_escape(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))
