#!/usr/bin/env python3
"""Fetch live ticker data via yfinance, render brand-styled HTML blocks, and inject
into the per-topic dashboards (right column, above Storylines) and the landing
page (horizontal ribbon below the calendar strip).

Parses `daily-briefing/tickers.md` for the per-tab ticker list. Idempotent via
sentinel blocks.

Run from the daily-briefing morning workflow:
    python3 daily-briefing/scripts/fetch_tickers.py

If yfinance can't reach Yahoo (sandbox / firewall), each ticker row falls back to
"—" placeholders so the layout still renders. Failures are logged to
`daily-briefing/YYYY-MM-DD/ticker-failures.md`.
"""
import re, sys, datetime as _dt
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# --- Configurable paths ---------------------------------------------------
ROOT = Path("/Users/waquoitcapital/Library/CloudStorage/Dropbox/Career/Current Roles/Turnpage/Development")
# Bash sandbox alias for local testing
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
TICKERS_MD = DAILY_BRIEFING / "tickers.md"
LANDING = DAILY_BRIEFING / "index.html"

# Tab slug → project directory
TAB_TO_SLUG = {
    "Tariffs / Trade": "rewind-tariffs",
    "LLM / Copyright": "llm-class-action",
    "Crypto Insolvency": "crypto-insolvency",
    "Ponzi / Fraud Recovery": "fraud-recovery",
    "Tech Mass Arbitration": "tech-mass-arbitration",
    "$1B+ Class Actions": "billion-dollar-class-actions",
    "Bankruptcy Creditor Rights": "bankruptcy-creditor-rights",
}

MARKET_WATCH_START = "<!-- MARKET WATCH START -->"
MARKET_WATCH_END = "<!-- MARKET WATCH END -->"
TICKER_RIBBON_START = "<!-- TICKER RIBBON START -->"
TICKER_RIBBON_END = "<!-- TICKER RIBBON END -->"
CSS_START = "/* TICKER STYLES START */"
CSS_END = "/* TICKER STYLES END */"

MAX_TICKERS_PER_TOPIC = 5
RIBBON_TICKERS_PER_TOPIC = 2

# --- Parse tickers.md -----------------------------------------------------

def parse_tickers_md(p: Path) -> Dict[str, List[Tuple[str, str, str]]]:
    """Return {tab_display: [(symbol, name, note)]}. Stops at the first '## Notes'
    or end-of-file."""
    out: Dict[str, List[Tuple[str, str, str]]] = {}
    if not p.exists():
        print(f"  ! tickers.md not found at {p}", file=sys.stderr)
        return out
    current = None
    with open(p, encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip()
            # Tab heading: ## Tariffs / Trade — `rewind-tariffs`
            m = re.match(r"^##\s+(.+?)\s+[—-]\s+`", line)
            if m:
                tab = m.group(1).strip()
                # Skip top-level helper sections
                if tab.lower().startswith(("how it works", "notes on editing")):
                    current = None
                    continue
                current = tab
                out[current] = []
                continue
            # Standalone "## Notes" or similar — end of ticker section
            if line.startswith("## ") and current is not None and "—" not in line:
                current = None
                continue
            if current is None: continue
            # Ticker line: - SYMBOL — Company Name (optional note)
            #   "- WMT — Walmart (largest U.S. importer)"
            if line.startswith("#"): continue
            m2 = re.match(r"^-\s+([A-Z][A-Z0-9.\-]{0,7})\s+[—-]\s+(.+?)(?:\s*\(([^)]+)\))?$", line)
            if m2:
                sym = m2.group(1).strip()
                name = m2.group(2).strip()
                note = (m2.group(3) or "").strip()
                # Defensive: ignore placeholder dashes ("- — placeholder")
                if not sym or not re.match(r"^[A-Z]", sym): continue
                out[current].append((sym, name, note))
    return out

# --- Fetch yfinance data --------------------------------------------------

def fetch_quotes(symbols: List[str]) -> Dict[str, dict]:
    """Return {symbol: {'last','prev','change_pct','spark':[...30 closes...],'name','currency'}}.
    On any per-symbol failure, the dict for that symbol is None."""
    quotes: Dict[str, Optional[dict]] = {s: None for s in symbols}
    try:
        import yfinance as yf
    except ImportError:
        print("  ! yfinance not installed; installing...", file=sys.stderr)
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "yfinance",
                        "--break-system-packages", "--quiet"], check=False)
        try:
            import yfinance as yf
        except ImportError:
            print("  ! yfinance install failed", file=sys.stderr)
            return quotes

    for sym in symbols:
        try:
            t = yf.Ticker(sym)
            hist = t.history(period="1mo", interval="1d")
            if hist.empty or "Close" not in hist:
                continue
            closes = [round(float(c), 2) for c in hist["Close"].tolist()]
            last = closes[-1]
            prev = closes[-2] if len(closes) >= 2 else last
            change_pct = round(((last - prev) / prev) * 100, 2) if prev else 0.0
            try:
                name = (t.info or {}).get("shortName") or (t.info or {}).get("longName") or sym
            except Exception:
                name = sym
            try:
                currency = (t.info or {}).get("currency") or "USD"
            except Exception:
                currency = "USD"
            quotes[sym] = {
                "last": last, "prev": prev, "change_pct": change_pct,
                "spark": closes, "name": name, "currency": currency,
            }
        except Exception as e:
            print(f"  ! fetch failed {sym}: {e}", file=sys.stderr)
    return quotes

# --- Render --------------------------------------------------------------

def fmt_price(p: Optional[float], currency: str = "USD") -> str:
    if p is None: return "—"
    sign = "$" if currency == "USD" else ""
    return f"{sign}{p:,.2f}"

def fmt_change(pct: Optional[float]) -> str:
    if pct is None: return "—"
    arrow = "▲" if pct >= 0 else "▼"
    return f"{arrow} {abs(pct):.2f}%"

def change_class(pct: Optional[float]) -> str:
    if pct is None: return "tk-flat"
    return "tk-up" if pct >= 0 else "tk-down"

def render_sparkline(closes: List[float], width: int = 80, height: int = 24) -> str:
    if not closes or len(closes) < 2: return ""
    lo, hi = min(closes), max(closes)
    if hi == lo: hi = lo + 1
    pts = []
    for i, c in enumerate(closes):
        x = (i / (len(closes) - 1)) * (width - 2) + 1
        y = height - 2 - ((c - lo) / (hi - lo)) * (height - 4)
        pts.append(f"{x:.1f},{y:.1f}")
    color = "var(--tk-up-color)" if closes[-1] >= closes[0] else "var(--tk-down-color)"
    d = "M " + " L ".join(pts)
    return (f'<svg class="tk-spark" viewBox="0 0 {width} {height}" '
            f'preserveAspectRatio="none" aria-hidden="true">'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.4" '
            f'stroke-linecap="round" stroke-linejoin="round"/></svg>')

def render_market_watch(tab_name: str, tickers: List[Tuple[str, str, str]],
                        quotes: Dict[str, dict]) -> str:
    """Right-column box, max 5 tickers."""
    rows = []
    for sym, name, _note in tickers[:MAX_TICKERS_PER_TOPIC]:
        q = quotes.get(sym)
        if q is None:
            last_s, change_s, change_c, spark = "—", "—", "tk-flat", ""
            disp_name = name
        else:
            last_s = fmt_price(q["last"], q.get("currency", "USD"))
            change_s = fmt_change(q["change_pct"])
            change_c = change_class(q["change_pct"])
            spark = render_sparkline(q["spark"])
            disp_name = q.get("name", name)
            if len(disp_name) > 26: disp_name = disp_name[:24] + "…"
        rows.append(
            f'<a class="tk-row" href="https://www.google.com/finance/quote/{sym}:NASDAQ" '
            f'target="_blank" rel="noopener">'
            f'<span class="tk-left"><span class="tk-sym">{sym}</span>'
            f'<span class="tk-name">{disp_name}</span></span>'
            f'<span class="tk-mid">{spark}</span>'
            f'<span class="tk-right"><span class="tk-price">{last_s}</span>'
            f'<span class="tk-change {change_c}">{change_s}</span></span></a>'
        )
    if not rows: rows = ['<div class="tk-empty">No tickers configured for this tab. Edit <code>daily-briefing/tickers.md</code> to add.</div>']
    now = _dt.datetime.now().strftime("%-I:%M %p ET").upper()
    return (
        f'{MARKET_WATCH_START}\n'
        f'<section class="box market-watch">\n'
        f'  <h2>Market Watch</h2>\n'
        f'  <div class="tk-list">\n  ' + "\n  ".join(rows) + '\n  </div>\n'
        f'  <div class="tk-asof">As of {now} · click symbol → Google Finance</div>\n'
        f'</section>\n{MARKET_WATCH_END}'
    )

def render_ribbon(tickers_by_tab: Dict[str, List[Tuple[str, str, str]]],
                  quotes: Dict[str, dict]) -> str:
    """Horizontal ticker ribbon for the landing page."""
    items = []
    seen = set()
    for tab, lst in tickers_by_tab.items():
        for sym, name, _ in lst[:RIBBON_TICKERS_PER_TOPIC]:
            if sym in seen: continue
            seen.add(sym)
            q = quotes.get(sym)
            if q is None:
                last_s, change_s, change_c = "—", "—", "tk-flat"
            else:
                last_s = fmt_price(q["last"], q.get("currency", "USD"))
                change_s = fmt_change(q["change_pct"])
                change_c = change_class(q["change_pct"])
            items.append(
                f'<a class="tkr-item" href="https://www.google.com/finance/quote/{sym}:NASDAQ" '
                f'target="_blank" rel="noopener">'
                f'<span class="tkr-sym">{sym}</span>'
                f'<span class="tkr-price">{last_s}</span>'
                f'<span class="tkr-change {change_c}">{change_s}</span></a>'
            )
    if not items: return ""
    return (
        f'{TICKER_RIBBON_START}\n'
        f'<div class="ticker-ribbon">\n'
        f'  <div class="tkr-eyebrow">Market Watch</div>\n'
        f'  <div class="tkr-scroll">\n  ' + "\n  ".join(items) + '\n  </div>\n'
        f'</div>\n{TICKER_RIBBON_END}'
    )

# --- CSS injected once into every dashboard + landing --------------------

CSS_BLOCK = f"""{CSS_START}
:root {{
  --tk-up-color: #2D8E47;
  --tk-down-color: #C84141;
  --tk-flat-color: var(--ink-60, #6B7280);
}}
[data-theme="dark"] {{
  --tk-up-color: #54C277;
  --tk-down-color: #E07474;
}}
/* Right-column Market Watch box */
.market-watch .tk-list {{ display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }}
.market-watch .tk-row {{ display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center;
  padding: 8px 6px; border-bottom: 1px solid var(--line, rgba(10,10,10,0.06));
  text-decoration: none; color: inherit; font-size: 12.5px; }}
.market-watch .tk-row:last-child {{ border-bottom: none; }}
.market-watch .tk-row:hover {{ background: var(--paper-2, #F4F5F7); }}
.market-watch .tk-left {{ display: flex; flex-direction: column; min-width: 0; }}
.market-watch .tk-sym {{ font-weight: 800; letter-spacing: 0.02em; font-size: 12.5px; }}
.market-watch .tk-name {{ color: var(--ink-60); font-size: 10.5px; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; max-width: 130px; }}
.market-watch .tk-spark {{ width: 56px; height: 18px; opacity: 0.9; }}
.market-watch .tk-right {{ text-align: right; display: flex; flex-direction: column; gap: 1px; min-width: 64px; }}
.market-watch .tk-price {{ font-weight: 700; font-variant-numeric: tabular-nums; font-size: 12.5px; }}
.market-watch .tk-change {{ font-size: 10.5px; font-variant-numeric: tabular-nums; }}
.tk-up {{ color: var(--tk-up-color); }}
.tk-down {{ color: var(--tk-down-color); }}
.tk-flat {{ color: var(--tk-flat-color); }}
.market-watch .tk-asof {{ font-size: 9.5px; color: var(--ink-60); margin-top: 8px;
  letter-spacing: 0.04em; text-transform: uppercase; }}
.market-watch .tk-empty {{ font-size: 12px; color: var(--ink-60); padding: 8px 4px; }}

/* Landing-page horizontal ribbon */
.ticker-ribbon {{ max-width: 1440px; margin: 0 auto; padding: 14px 32px;
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
  background: var(--surface); display: flex; align-items: center; gap: 22px; }}
.tkr-eyebrow {{ font-size: 0.72rem; font-weight: 700; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-60); flex-shrink: 0; }}
.tkr-scroll {{ display: flex; gap: 22px; overflow-x: auto; flex: 1; scrollbar-width: thin; }}
.tkr-item {{ display: flex; align-items: baseline; gap: 8px; text-decoration: none; color: inherit;
  white-space: nowrap; padding: 4px 0; }}
.tkr-sym {{ font-weight: 800; font-size: 13px; letter-spacing: 0.02em; }}
.tkr-price {{ font-weight: 600; font-variant-numeric: tabular-nums; font-size: 13px; color: var(--ink-60); }}
.tkr-change {{ font-size: 11.5px; font-variant-numeric: tabular-nums; font-weight: 600; }}
.tkr-item:hover {{ text-decoration: none; }}
.tkr-item:hover .tkr-sym {{ color: var(--neon-block, #D4FF00); }}
{CSS_END}"""

# --- Inject helpers ------------------------------------------------------

def inject_css(html: str) -> str:
    html = re.sub(re.escape(CSS_START) + r".*?" + re.escape(CSS_END), "", html, flags=re.DOTALL)
    if "</style>" in html:
        html = html.replace("</style>", CSS_BLOCK + "\n</style>", 1)
    return html

def inject_market_watch(html: str, block: str) -> str:
    # Remove any prior block
    html = re.sub(re.escape(MARKET_WATCH_START) + r".*?" + re.escape(MARKET_WATCH_END),
                  "", html, flags=re.DOTALL)
    # Insert before the first Storylines box. Look for h2 "Storylines".
    m = re.search(r'<section[^>]*class="[^"]*box[^"]*"[^>]*>\s*<h2[^>]*>\s*Storylines', html, re.IGNORECASE)
    if m:
        idx = m.start()
        return html[:idx] + block + "\n      " + html[idx:]
    # Fallback: append before </aside class="col-right">
    m2 = re.search(r'(</aside>\s*</main>)', html)
    if m2:
        return html[:m2.start()] + block + "\n    " + html[m2.start():]
    return html  # no place found; skip

def inject_ribbon(html: str, ribbon: str) -> str:
    if not ribbon: return html
    html = re.sub(re.escape(TICKER_RIBBON_START) + r".*?" + re.escape(TICKER_RIBBON_END),
                  "", html, flags=re.DOTALL)
    # Insert AFTER the unified calendar strip. Look for the calendar section's </section>.
    # Heuristic: after the first occurrence of "CALENDAR" or after the .page-title section.
    m = re.search(r'(<section[^>]*class="[^"]*calendar-strip[^"]*"[^>]*>.*?</section>)', html, re.DOTALL)
    if m:
        return html[:m.end()] + "\n" + ribbon + "\n" + html[m.end():]
    # Fallback: insert after the page-title section
    m2 = re.search(r'(</div>\s*</header>|</section>\s*<main)', html, re.DOTALL)
    if m2:
        return html[:m2.start()] + "\n" + ribbon + "\n" + html[m2.start():]
    return html

# --- Failure log ---------------------------------------------------------

def log_failures(quotes: Dict[str, dict], symbols: List[str]) -> None:
    today = _dt.date.today().isoformat()
    out_dir = DAILY_BRIEFING / today
    out_dir.mkdir(parents=True, exist_ok=True)
    failed = [s for s in symbols if quotes.get(s) is None]
    if not failed: return
    with open(out_dir / "ticker-failures.md", "w", encoding="utf-8") as f:
        f.write(f"# Ticker fetch failures — {today}\n\n")
        f.write("These symbols failed to fetch via yfinance. Possible causes: delisted, halted,\n")
        f.write("network/proxy issue, ticker mismatch. Consider pruning from `tickers.md`.\n\n")
        for s in failed: f.write(f"- {s}\n")

# --- Main ----------------------------------------------------------------

def main():
    print(f"=== fetch_tickers — {_dt.datetime.now().isoformat(timespec='seconds')} ===")
    tickers_by_tab = parse_tickers_md(TICKERS_MD)
    if not tickers_by_tab:
        print("  ! No ticker tabs parsed. Check tickers.md format."); return

    # Dedupe symbol list
    all_symbols = []
    seen = set()
    for lst in tickers_by_tab.values():
        for sym, _, _ in lst:
            if sym not in seen:
                seen.add(sym); all_symbols.append(sym)
    print(f"  Loaded {len(tickers_by_tab)} tabs, {len(all_symbols)} unique symbols")

    print("  Fetching quotes…")
    quotes = fetch_quotes(all_symbols)
    ok = sum(1 for v in quotes.values() if v is not None)
    print(f"  Fetched {ok}/{len(all_symbols)} successfully")
    log_failures(quotes, all_symbols)

    # If NO fetches succeeded, this is almost certainly a network/firewall failure
    # (sandbox proxy, offline). Strip any prior Market Watch / ribbon blocks so the
    # user doesn't see a wall of "—" placeholders, then exit.
    if ok == 0:
        print("  ! All fetches failed (network/proxy?). Removing any stale Market Watch blocks.")
        for tab_name in tickers_by_tab:
            slug = TAB_TO_SLUG.get(tab_name)
            if not slug: continue
            d = ROOT / slug / "dashboard.html"
            if not d.exists(): continue
            with open(d, encoding="utf-8") as f: html = f.read()
            html2 = re.sub(re.escape(MARKET_WATCH_START) + r".*?" + re.escape(MARKET_WATCH_END),
                           "", html, flags=re.DOTALL)
            if html2 != html:
                with open(d, "w", encoding="utf-8") as f: f.write(html2)
                print(f"  · {slug}: removed stale Market Watch block")
        if LANDING.exists():
            with open(LANDING, encoding="utf-8") as f: html = f.read()
            html2 = re.sub(re.escape(TICKER_RIBBON_START) + r".*?" + re.escape(TICKER_RIBBON_END),
                           "", html, flags=re.DOTALL)
            if html2 != html:
                with open(LANDING, "w", encoding="utf-8") as f: f.write(html2)
                print(f"  · landing: removed stale ribbon")
        print("Skipped injection — no live data available.")
        return

    # Inject Market Watch into each per-topic dashboard
    for tab_name, tickers in tickers_by_tab.items():
        slug = TAB_TO_SLUG.get(tab_name)
        if not slug:
            print(f"  ! no slug mapping for tab '{tab_name}'"); continue
        d = ROOT / slug / "dashboard.html"
        if not d.exists():
            print(f"  ! missing dashboard: {d}"); continue
        with open(d, encoding="utf-8") as f: html = f.read()
        html2 = inject_css(html)
        block = render_market_watch(tab_name, tickers, quotes)
        html2 = inject_market_watch(html2, block)
        if html2 != html:
            with open(d, "w", encoding="utf-8") as f: f.write(html2)
            print(f"  ✓ {slug}: Market Watch ({len(tickers[:MAX_TICKERS_PER_TOPIC])} tickers)")

    # Inject ribbon into landing
    if LANDING.exists():
        with open(LANDING, encoding="utf-8") as f: html = f.read()
        html2 = inject_css(html)
        ribbon = render_ribbon(tickers_by_tab, quotes)
        html2 = inject_ribbon(html2, ribbon)
        if html2 != html:
            with open(LANDING, "w", encoding="utf-8") as f: f.write(html2)
            print(f"  ✓ landing: ribbon injected")

    print("Done.")

if __name__ == "__main__":
    main()
