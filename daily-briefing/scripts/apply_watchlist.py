#!/usr/bin/env python3
"""
Inject a compact "Watchlist" section into each topic dashboard.

A Watchlist item is a *pre-filing / pre-event* leading indicator: a situation
developing toward potential ripeness but not yet a filed case / charged action /
adjudicated event. By design it is distinct from the right-column Storylines
accordion (which covers already-filed / already-ripe matters).

Layout: a `<section class="watchlist-box">` sits inside `advisory-body` in the
center column, immediately under "Story of the Day" and before the close of the
article — so it flows directly under the day's story rather than parallel to it.

Item source: each tab's YAML frontmatter at `daily-briefing/tabs/NN-<slug>.md`
under a `watchlist:` block with `items: [ {name, signal}, ... ]`. The daily run
edits those tab configs; this script just renders them.

Idempotent: re-running cleanly replaces any prior watchlist block anywhere in
the dashboard before re-inserting in the canonical location.
"""

from __future__ import annotations
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML required. Install with: pip3 install pyyaml --break-system-packages", file=sys.stderr)
    sys.exit(1)


# --- root resolution (mirrors fetch_tickers.py) ---
ROOT = Path("/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development")
if not ROOT.exists():
    import glob as _glob
    _alts = [Path(p) for p in _glob.glob("/sessions/*/mnt/Development")]
    for alt in [Path("/sessions/upbeat-lucid-brahmagupta/mnt/Development"),
                Path("/sessions/friendly-youthful-galileo/mnt/Development"),
                Path("/sessions/intelligent-magical-wright/mnt/Development")] + _alts:
        try:
            if alt.exists():
                ROOT = alt
                break
        except PermissionError:
            continue

DAILY_BRIEFING = ROOT / "daily-briefing"
TABS_DIR = DAILY_BRIEFING / "tabs"

# --- tab slug → dashboard path. Slug here is the tab config slug field. ---
DASHBOARD_BY_SLUG = {
    "tariffs-trade": ROOT / "rewind-tariffs" / "dashboard.html",
    "llm-copyright": ROOT / "llm-class-action" / "dashboard.html",
    "crypto-insolvency": ROOT / "crypto-insolvency" / "dashboard.html",
    "ponzi-fraud-recovery": ROOT / "fraud-recovery" / "dashboard.html",
    "billion-dollar-class-actions": ROOT / "billion-dollar-class-actions" / "dashboard.html",
    "bankruptcy-creditor-rights": ROOT / "bankruptcy-creditor-rights" / "dashboard.html",
}

# --- CSS to inject once into each dashboard ---
CSS = """
/* ---- Watchlist (pre-filing / pre-event pipeline) ---- */
.watchlist-box{margin-top:18px;padding:14px 16px;background:var(--surface,#faf8f3);border:1px solid var(--line,rgba(0,0,0,0.08));border-radius:3px;}
.watchlist-box > h2{font-family:Archivo,sans-serif;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 2px;color:var(--ink,#0A0A0A);}
.watchlist-sub{font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-muted,#666);margin:0 0 10px;opacity:0.7;}
.watchlist-list{list-style:none;padding:0;margin:0;}
.watchlist-item{padding:7px 0;border-top:1px solid var(--line,rgba(0,0,0,0.07));font-size:12px;line-height:1.42;}
.watchlist-item:first-child{border-top:none;padding-top:2px;}
.watchlist-name{font-weight:700;color:var(--ink,#0A0A0A);display:block;}
.watchlist-signal{color:var(--ink-muted,#555);display:block;margin-top:1px;font-size:11.5px;}
"""

CSS_MARKER = "/* ---- Watchlist (pre-filing"


def load_tab_configs() -> dict[str, list[dict]]:
    """Read every tabs/NN-*.md (skipping _disabled), parse YAML frontmatter, return
    {slug: [items]} where items is a list of {name, signal} dicts pulled from
    the watchlist.items block. Tabs missing a watchlist block are skipped."""
    out: dict[str, list[dict]] = {}
    if not TABS_DIR.exists():
        raise RuntimeError(f"tabs directory not found: {TABS_DIR}")
    for path in sorted(TABS_DIR.glob("[0-9][0-9]-*.md")):
        if path.stem.endswith("_disabled"):
            continue
        text = path.read_text(encoding="utf-8")
        m = re.match(r'^---\n(.*?)\n---\n', text, re.DOTALL)
        if not m:
            print(f"  ! no frontmatter: {path.name}")
            continue
        try:
            fm = yaml.safe_load(m.group(1))
        except yaml.YAMLError as e:
            print(f"  ! YAML parse error in {path.name}: {e}")
            continue
        slug = fm.get("slug")
        wl = (fm.get("watchlist") or {}).get("items") or []
        if slug and wl:
            out[slug] = wl
    return out


def build_html(items: list[dict]) -> str:
    lis = "\n".join(
        f'        <li class="watchlist-item">'
        f'<span class="watchlist-name">{item["name"]}</span>'
        f'<span class="watchlist-signal">{item["signal"]}</span></li>'
        for item in items
    )
    return (
        '\n      <section class="watchlist-box">\n'
        '        <h2>Watchlist</h2>\n'
        '        <p class="watchlist-sub">Pre-filing &middot; developing &middot; not yet ripe</p>\n'
        '        <ul class="watchlist-list">\n'
        f'{lis}\n'
        '        </ul>\n'
        '      </section>\n'
    )


def inject_css(html: str) -> str:
    if CSS_MARKER in html:
        return html  # already injected
    # Append CSS inside the closing </style> of the first <style> block
    return re.sub(r'(</style>)', CSS + r'\1', html, count=1)


def inject_watchlist(html: str, items: list[dict]) -> str:
    # Strip any prior watchlist-box first (anywhere in the document) — idempotent.
    html = re.sub(
        r'\n\s*<section class="watchlist-box">.*?</section>\s*\n',
        '\n',
        html,
        count=0,
        flags=re.DOTALL,
    )
    block = build_html(items)
    # Insert immediately under Story of the Day — i.e., before the </div>
    # that closes advisory-body in col-center. Anchor on the unique sequence
    # of </div> (advisory-body) + </div> (briefing-body) + </article> (col-center).
    new_html, n = re.subn(
        r'(\n\s*</div>\s*\n\s*</div>\s*\n\s*</article>)',
        block + r'\1',
        html,
        count=1,
    )
    if n == 0:
        raise RuntimeError("Failed to locate advisory-body/briefing-body/article close anchor")
    return new_html


def patch(slug: str, items: list[dict]) -> None:
    path = DASHBOARD_BY_SLUG.get(slug)
    if path is None:
        print(f"  ! no dashboard mapping for slug: {slug}")
        return
    if not path.exists():
        print(f"  ! missing: {path}")
        return
    html = path.read_text(encoding="utf-8")
    html = inject_css(html)
    html = inject_watchlist(html, items)
    path.write_text(html, encoding="utf-8")
    print(f"  ✓ {slug}: {len(items)} watchlist items")


def main() -> None:
    print(f"ROOT: {ROOT}")
    print(f"TABS: {TABS_DIR}")
    print()
    configs = load_tab_configs()
    if not configs:
        print("No watchlist blocks found in any tab config.")
        return
    for slug, items in configs.items():
        patch(slug, items)


if __name__ == "__main__":
    main()
