#!/usr/bin/env python3
"""
inject_cases.py — render tracked-case docket pages and inject their summary boxes.

Two jobs, both idempotent (run at the end of generate.py, after inject_dashboard.py):

  1. Build cases/<slug>.html — a Turnpage-branded docket page for each live case
     (docket-table mirror + optional claims-administrator panel + coverage cards),
     rendered from cases/data/<slug>.json. Awaiting-sync cases get no page.

  2. Inject a "Tracked Cases" box into every tagged topic's dashboard.html — the most
     recent 3 filings + a 72h new-filings counter per case — between the sentinels
     <!-- TRACKED-CASES START --> / <!-- TRACKED-CASES END -->. The block (markup + its
     scoped CSS) is replaced wholesale each run; a topic with no tagged cases has the
     block removed cleanly.

The case pages live at cases/<slug>.html — the same directory depth as <topic>/dashboard.html
— so they reuse identical relative asset paths (../daily-briefing/assets/...) and brand chrome.
Stdlib only.
"""
import re, sys
from pathlib import Path

from cases_common import load_cases, REPO_ROOT, CASES_DIR, TOPIC_META, pretty_date, html_escape

# Root-absolute paths: Cloudflare Pages serves this repo at the domain root (see DEPLOY.md
# "output dir /"), and _headers/auth both use /assets and /auth. Case pages live at
# /cases/<slug>.html, so a sibling link to a topic is ../<topic>/dashboard.html.
LOGO_SRC = "/assets/turnpage-logo.jpeg"
HOME_HREF = "/index.html"
BOX_START = "<!-- TRACKED-CASES START -->"
BOX_END = "<!-- TRACKED-CASES END -->"

# Verbatim theme cycler from the topic dashboards (shared localStorage key → theme pref
# carries across the whole site). Raw string so the \u escapes stay literal.
THEME_SCRIPT = r"""<script>
(function(){
  var K='daily-briefing-theme';
  var ST=['system','dark','light'];
  var IC={dark:'🌙',light:'☀️',system:'🖥️'};
  var LB={dark:'Dark',light:'Light',system:'System'};
  function eff(t){return t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;}
  function apply(){
    var t=localStorage.getItem(K)||'system';
    document.documentElement.setAttribute('data-theme',eff(t));
    document.documentElement.setAttribute('data-theme-pref',t);
    var b=document.getElementById('theme-toggle');
    if(b){b.textContent=IC[t];b.title='Theme: '+LB[t]+' (click to cycle)';}
  }
  window.cycleTheme=function(){
    var c=localStorage.getItem(K)||'system';
    var n=ST[(ST.indexOf(c)+1)%ST.length];
    localStorage.setItem(K,n);apply();
  };
  apply();
  if(document.readyState!=='loading') apply();
  else document.addEventListener('DOMContentLoaded',apply);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);
})();
</script>"""

# ── full case-page stylesheet (brand tokens; no f-string — CSS braces) ───────
PAGE_CSS = """<style>
  :root{--bg:#FFFFFF;--surface:#FFFFFF;--paper-2:#F4F5F7;--ink:#0A0A0A;--ink-60:rgba(10,10,10,0.6);--ink-40:rgba(10,10,10,0.4);--line:rgba(10,10,10,0.08);--line-strong:rgba(10,10,10,0.14);--neon:#D4FF00;}
  [data-theme="dark"]{--bg:#16161B;--surface:#1F1F25;--paper-2:#1F1F25;--ink:#E5E7EB;--ink-60:rgba(229,231,235,0.62);--ink-40:rgba(229,231,235,0.42);--line:rgba(229,231,235,0.1);--line-strong:rgba(229,231,235,0.18);}
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:'Archivo',Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;}
  a{color:var(--ink);}
  .tn{background:#000;border-bottom:1px solid rgba(255,255,255,0.12);padding:10px 20px;position:sticky;top:0;z-index:100;}
  .tn-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;max-width:1180px;margin:0 auto;}
  .tn-left{display:flex;align-items:center;gap:16px;}
  .tn-brand{display:inline-flex;align-items:center;padding:4px 0;text-decoration:none;}
  .tn-brand-logo{height:26px;width:auto;filter:invert(1);}
  [data-theme="light"] .tn-brand-logo{filter:none;}
  .tn-back{color:rgba(255,255,255,0.72);font-size:12px;text-decoration:none;border-left:1px solid rgba(255,255,255,0.18);padding-left:16px;}
  .tn-back:hover{color:#fff;}
  [data-theme="light"] .tn{background:#fff;border-bottom-color:rgba(10,10,10,0.08);}
  [data-theme="light"] .tn-back{color:rgba(10,10,10,0.6);border-left-color:rgba(10,10,10,0.14);}
  #theme-toggle{background:transparent;border:1px solid rgba(255,255,255,0.25);border-radius:99px;padding:2px 8px;cursor:pointer;font-size:13px;font-family:inherit;line-height:1;color:#fff;}
  [data-theme="light"] #theme-toggle{border-color:rgba(10,10,10,0.14);color:#0A0A0A;}
  .page-title{max-width:1180px;margin:0 auto;padding:26px 32px 16px;border-bottom:2px solid var(--ink);}
  .page-title .eyebrow{font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-60);font-weight:700;}
  .page-title h1{font-size:clamp(1.5rem,2.6vw,2.1rem);font-weight:800;letter-spacing:-0.02em;margin:8px 0 12px;display:flex;align-items:center;gap:10px;}
  .case-meta{display:flex;gap:22px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-60);}
  .case-meta strong{color:var(--ink);font-weight:700;}
  .status-badge{display:inline-block;margin-top:13px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:rgba(212,255,0,0.16);color:var(--ink);border:1px solid var(--neon);padding:3px 10px;}
  .also{margin-top:13px;font-size:11.5px;color:var(--ink-60);}
  .also a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--neon);}
  .seed-note{max-width:1180px;margin:16px auto 0;padding:0 32px;}
  .seed-note .inner{border:1px dashed var(--line-strong);padding:9px 13px;font-size:11.5px;color:var(--ink-60);}
  .seed-note strong{color:var(--ink);}
  .wrap{max-width:1180px;margin:0 auto;padding:22px 32px 12px;display:grid;gap:24px;grid-template-columns:1fr;}
  @media(min-width:920px){.wrap{grid-template-columns:1.9fr 1fr;align-items:start;}}
  .panel{background:var(--surface);border:1px solid var(--line-strong);}
  .panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line-strong);}
  .panel-head h2{margin:0;font-size:0.72rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;padding-left:1.4em;position:relative;color:var(--ink);}
  .panel-head h2::before{content:"";position:absolute;left:0;top:0.36em;width:1.1em;height:0.18em;background:var(--neon);}
  .panel-head .meta{display:flex;align-items:center;gap:12px;}
  .panel-head .src{font-size:11px;color:var(--ink-60);}
  .tc-counter{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap;}
  .tc-counter.active{background:rgba(239,68,68,0.14);color:#ef4444;}
  .tc-counter.quiet{background:var(--paper-2);color:var(--ink-60);}
  .tc-pip{width:7px;height:7px;border-radius:50%;background:currentColor;}
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-40);padding:10px 18px;border-bottom:1px solid var(--line-strong);font-weight:700;}
  td{padding:12px 18px;font-size:13px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--ink);}
  tr:last-child td{border-bottom:none;}
  tr.is-new td{background:rgba(212,255,0,0.06);}
  .dkt{font-variant-numeric:tabular-nums;color:var(--ink-60);white-space:nowrap;}
  .date{white-space:nowrap;color:var(--ink-60);font-variant-numeric:tabular-nums;}
  .new-pill{display:inline-block;font-size:9px;font-weight:700;letter-spacing:0.04em;color:#0A0A0A;background:var(--neon);padding:1px 6px;margin-left:8px;vertical-align:middle;}
  .landmark{display:inline-block;font-size:9px;font-weight:700;letter-spacing:0.04em;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-strong);padding:1px 6px;margin-left:8px;vertical-align:middle;}
  .panel-foot{padding:12px 18px;border-top:1px solid var(--line-strong);font-size:12px;}
  .panel-foot a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--neon);}
  .empty{font-size:12.5px;color:var(--ink-60);font-style:italic;padding:14px 18px;}
  .stat{padding:16px 18px;border-bottom:1px solid var(--line-strong);}
  .stat .big{font-size:30px;font-weight:800;line-height:1;color:var(--ink);}
  .stat .big .accent{box-shadow:inset 0 -0.34em 0 var(--neon);}
  [data-theme="dark"] .stat .big .accent{box-shadow:inset 0 -0.34em 0 #5D7A00;}
  .stat .sub{font-size:12px;color:var(--ink-60);margin-top:7px;}
  .dates{list-style:none;margin:0;padding:6px 18px;}
  .dates li{padding:11px 0 11px 22px;border-bottom:1px solid var(--line);position:relative;font-size:12.5px;}
  .dates li:last-child{border-bottom:none;}
  .dates li::before{content:"";position:absolute;left:2px;top:15px;width:9px;height:9px;border-radius:50%;background:var(--line-strong);}
  .dates li.done::before{background:var(--neon);}
  .dates .d-date{font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums;}
  .dates .d-label{color:var(--ink-60);display:block;}
  .section-label{max-width:1180px;margin:14px auto 0;padding:0 32px;font-size:0.74rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-60);}
  .cards{max-width:1180px;margin:14px auto 0;padding:0 32px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
  @media(max-width:760px){.cards{grid-template-columns:1fr;}}
  .news-card{background:var(--surface);border:1px solid var(--line-strong);padding:14px;text-decoration:none;display:block;}
  .news-card:hover{border-color:var(--ink-40);}
  .news-card .src-line{font-size:10.5px;color:var(--ink-40);display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;}
  .news-card .h{font-size:13px;font-weight:600;color:var(--ink);line-height:1.4;}
  .foot{max-width:1180px;margin:28px auto 0;padding:24px 32px 50px;border-top:2px solid var(--ink);font-size:11px;color:var(--ink-60);line-height:1.7;}
</style>"""

# ── scoped CSS for the injected dashboard box (travels with the sentinel block) ─
BOX_CSS = """<style>
  .tracked-cases .tc-case{padding:12px 0;border-bottom:1px solid var(--line);}
  .tracked-cases .tc-case:first-of-type{padding-top:2px;}
  .tracked-cases .tc-case:last-of-type{border-bottom:none;padding-bottom:0;}
  .tracked-cases .tc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
  .tracked-cases .tc-name{font-size:13.5px;font-weight:700;color:var(--ink);text-decoration:none;line-height:1.25;}
  .tracked-cases a.tc-name:hover{box-shadow:inset 0 -0.32em 0 var(--neon);}
  .tracked-cases .tc-counter{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;flex-shrink:0;}
  .tracked-cases .tc-counter.active{background:rgba(239,68,68,0.14);color:#ef4444;}
  .tracked-cases .tc-counter.quiet{background:var(--paper-2);color:var(--ink-60);}
  .tracked-cases .tc-pip{width:6px;height:6px;border-radius:50%;background:currentColor;}
  .tracked-cases .tc-sub{font-size:11px;color:var(--ink-60);margin:3px 0 8px;font-variant-numeric:tabular-nums;}
  .tracked-cases ul.tc-filings{list-style:none;margin:0;padding:0;}
  .tracked-cases .tc-filings li{padding:5px 0;border-bottom:none;display:flex;gap:8px;font-size:11.5px;line-height:1.45;}
  .tracked-cases .tc-fdate{color:var(--ink-60);white-space:nowrap;font-variant-numeric:tabular-nums;min-width:46px;flex-shrink:0;}
  .tracked-cases .tc-fdesc{color:var(--ink);}
  .tracked-cases .tc-new{display:inline-block;font-size:8px;font-weight:700;letter-spacing:0.04em;color:#0A0A0A;background:var(--neon);padding:0 4px;margin-left:4px;vertical-align:middle;}
  .tracked-cases .tc-empty{font-size:11px;color:var(--ink-60);font-style:italic;padding:4px 0 0;}
  .tracked-cases .tc-open{display:inline-block;margin-top:9px;font-size:10.5px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:var(--ink);text-decoration:none;border-bottom:2px solid var(--neon);padding-bottom:1px;}
  .tracked-cases .tc-open.disabled{color:var(--ink-40);border-bottom-color:var(--line-strong);pointer-events:none;}
  .tracked-cases .tc-note{font-size:10px;color:var(--ink-40);margin-top:7px;line-height:1.4;}
</style>"""


def _docket(data):
    return (data or {}).get("docket") or {}


def counter_pill(data):
    d = _docket(data)
    if d.get("awaiting_sync"):
        return '<span class="tc-counter quiet"><span class="tc-pip"></span>awaiting sync</span>'
    n = int(d.get("new_in_72h") or 0)
    cls = "active" if n > 0 else "quiet"
    return f'<span class="tc-counter {cls}"><span class="tc-pip"></span>{n} new · 72h</span>'


def filing_date_short(entry):
    """Short date for the dashboard box ('May 14'); falls back to date_display."""
    iso = entry.get("date_filed") or ""
    disp = entry.get("date_display") or ""
    pretty = pretty_date(iso, fallback="")
    if pretty:
        return ", ".join(pretty.split(", ")[:1])  # drop the year for the compact box
    return disp


# ── 1) dashboard summary box ─────────────────────────────────────────────────
def case_box_fragment(case):
    cfg, data = case["config"], case["data"]
    d = _docket(data)
    awaiting = bool(d.get("awaiting_sync"))
    slug = case["slug"]
    name = html_escape(cfg["display_name"])
    court = cfg["case"]["court"]
    num = cfg["case"]["case_number"]
    sub = html_escape(" · ".join(x for x in [court, num] if x))

    name_html = (f'<span class="tc-name">{name}</span>' if awaiting
                 else f'<a class="tc-name" href="../cases/{slug}.html">{name}</a>')

    rows = []
    recent = (d.get("recent") or [])[:3]
    for e in recent:
        newp = '<span class="tc-new">NEW</span>' if e.get("is_new") else ""
        raw_desc = (e.get("description") or "").strip()
        fdesc = html_escape(raw_desc) if raw_desc else '<span style="color:var(--ink-40)">—</span>'
        rows.append(
            f'<li><span class="tc-fdate">{html_escape(filing_date_short(e))}</span>'
            f'<span class="tc-fdesc">{fdesc}{newp}</span></li>'
        )
    filings = ("<ul class=\"tc-filings\">" + "".join(rows) + "</ul>") if rows else \
              '<div class="tc-empty">No filings on record yet.</div>'

    if awaiting:
        tail = ('<div class="tc-empty">No new filings in the last 72h. Full history + the live '
                'counter populate on first sync.</div>'
                '<span class="tc-open disabled">Awaiting docket sync</span>'
                '<div class="tc-note">Tagged to this topic — pulls live once a CourtListener '
                'docket id + token are added.</div>')
    else:
        tail = f'<a class="tc-open" href="../cases/{slug}.html">Open case docket →</a>'

    return (f'<div class="tc-case">'
            f'<div class="tc-top">{name_html}{counter_pill(data)}</div>'
            f'<div class="tc-sub">{sub}</div>'
            f'{filings}{tail}</div>')


def render_box(cases_for_topic):
    frags = "\n".join(case_box_fragment(c) for c in cases_for_topic)
    inner = (BOX_CSS + '\n<section class="box tracked-cases">\n'
             '  <h2>Tracked Cases</h2>\n' + frags + '\n</section>')
    return BOX_START + "\n" + inner + "\n" + BOX_END


def inject_into_dashboard(topic_slug, block):
    """Insert/replace the tracked-cases block at the top of col-left. block=None removes it."""
    dash = REPO_ROOT / topic_slug / "dashboard.html"
    if not dash.exists():
        print(f"  ! {topic_slug}: dashboard.html not found")
        return
    html = dash.read_text(encoding="utf-8")

    # Always strip any existing block first (idempotent).
    html = re.sub(re.escape(BOX_START) + r".*?" + re.escape(BOX_END) + r"\s*",
                  "", html, flags=re.DOTALL)

    if block:
        m = re.search(r'(<aside class="col-left">\s*\n)', html)
        if not m:
            print(f"  ! {topic_slug}: <aside class=\"col-left\"> anchor not found")
            return
        insert = m.group(1) + "    " + block + "\n"
        html = html[:m.start()] + insert + html[m.end():]
        tc_count = block.count('class="tc-case"')
        action = f"box with {tc_count} case(s)"
    else:
        action = "removed (no tagged cases)"

    dash.write_text(html, encoding="utf-8")
    print(f"  ✓ {topic_slug}: {action}")


# ── 2) standalone case docket page ───────────────────────────────────────────
def render_docket_rows(entries):
    rows = []
    for e in entries:
        dkt = e.get("entry_number")
        dkt = str(dkt) if dkt not in (None, "") else "—"
        date = html_escape(e.get("date_display") or pretty_date(e.get("date_filed",""), "—"))
        raw_desc = (e.get("description") or "").strip()
        desc = html_escape(raw_desc) if raw_desc else '<span style="color:var(--ink-40)">—</span>'
        if e.get("is_new"):
            desc += '<span class="new-pill">NEW</span>'
        if e.get("landmark"):
            desc += f'<span class="landmark">{html_escape(e["landmark"])}</span>'
        cls = ' class="is-new"' if e.get("is_new") else ""
        rows.append(f'<tr{cls}><td class="dkt">{html_escape(dkt)}</td>'
                    f'<td class="date">{date}</td><td>{desc}</td></tr>')
    return "\n".join(rows)


def render_claims_panel(data):
    ca = (data or {}).get("claims_administrator")
    if not ca:
        return ('<div class="panel">'
                '<div class="panel-head"><h2>Claims Administrator</h2></div>'
                '<div class="empty">No claims administrator — active litigation docket. '
                'This panel populates for settlements and bankruptcy estates.</div></div>')
    dates = []
    for d in (ca.get("dates") or []):
        done = " done" if d.get("done") else ""
        dates.append(f'<li class="{done.strip()}"><span class="d-date">{html_escape(d.get("date",""))}</span>'
                     f'<span class="d-label">{html_escape(d.get("label",""))}</span></li>')
    dates_html = ("<ul class=\"dates\">" + "".join(dates) + "</ul>") if dates else ""
    big = html_escape(ca.get("stat_big", ""))
    sub = html_escape(ca.get("stat_sub", ""))
    stat_html = (f'<div class="stat"><div class="big"><span class="accent">{big}</span></div>'
                 f'<div class="sub">{sub}</div></div>') if big else ""
    foot = ""
    if ca.get("key_dates_url") or ca.get("url"):
        href = ca.get("key_dates_url") or ca.get("url")
        label = re.sub(r"^https?://(www\.)?", "", href).rstrip("/")
        foot = f'<div class="panel-foot"><a href="{href}" target="_blank" rel="noopener">{html_escape(label)} →</a></div>'
    return (f'<div class="panel"><div class="panel-head"><h2>Claims Administrator</h2>'
            f'<span class="src">settlement site</span></div>{stat_html}{dates_html}{foot}</div>')


def render_coverage(coverage):
    if not coverage:
        return ""
    cards = []
    for c in coverage:
        href = c.get("url", "#")
        cards.append(f'<a class="news-card" href="{href}" target="_blank" rel="noopener">'
                     f'<div class="src-line"><span>{html_escape(c.get("source",""))}</span>'
                     f'<span>{html_escape(c.get("date",""))}</span></div>'
                     f'<div class="h">{html_escape(c.get("headline",""))}</div></a>')
    return ('<div class="section-label">Coverage &amp; Commentary</div>\n'
            '<div class="cards">\n' + "\n".join(cards) + "\n</div>")


def render_case_page(case):
    cfg, data = case["config"], case["data"]
    d = _docket(data)
    slug = case["slug"]
    name = html_escape(cfg["display_name"])
    emoji = cfg.get("emoji", "⚖️")

    # primary topic backlink + "also tracked in" chips
    topics = [t for t in cfg.get("topics", []) if t in TOPIC_META]
    primary = topics[0] if topics else None
    back = (f'<a class="tn-back" href="../{primary}/dashboard.html">← '
            f'{TOPIC_META[primary]["emoji"]} {html_escape(TOPIC_META[primary]["display"])} briefing</a>'
            if primary else f'<a class="tn-back" href="{HOME_HREF}">← Daily Briefing</a>')
    also = ""
    if len(topics) > 1:
        links = ", ".join(f'<a href="../{t}/dashboard.html">{html_escape(TOPIC_META[t]["display"])}</a>'
                          for t in topics[1:])
        also = f'<div class="also">Also tracked in: {links}</div>'

    meta_bits = []
    if cfg["case"]["court"]:
        meta_bits.append(f'<span><strong>Court:</strong> {html_escape(cfg["case"]["court"])}</span>')
    if cfg["case"]["case_number"]:
        meta_bits.append(f'<span><strong>No.:</strong> {html_escape(cfg["case"]["case_number"])}</span>')
    if cfg["case"]["judge"]:
        meta_bits.append(f'<span><strong>Judge:</strong> {html_escape(cfg["case"]["judge"])}</span>')
    meta_html = "\n        ".join(meta_bits)

    status_html = (f'<span class="status-badge">{html_escape(cfg["status"])}</span>'
                   if cfg.get("status") else "")

    seed_html = ""
    if str(d.get("source", "")).startswith("seed"):
        as_of = html_escape(d.get("as_of", ""))
        seed_html = ('<div class="seed-note"><div class="inner">'
                     f'<strong>Seeded preview{(" · as of " + as_of) if as_of else ""}.</strong> '
                     'Docket entries are research-seeded and switch to live CourtListener data the '
                     'moment a free <code>COURTLISTENER_TOKEN</code> is added.</div></div>')

    src_label = "via CourtListener" if cfg["docket_source"]["type"] == "courtlistener" else "manual entry"
    rows = render_docket_rows(d.get("entries") or [])
    docket_foot = ""
    if d.get("docket_url") or cfg["docket_source"].get("url"):
        href = d.get("docket_url") or cfg["docket_source"]["url"]
        docket_foot = (f'<div class="panel-foot"><a href="{href}" target="_blank" rel="noopener">'
                       'View full docket on CourtListener →</a></div>')

    docket_panel = (
        '<div class="panel">'
        '<div class="panel-head"><h2>Docket</h2>'
        f'<div class="meta">{counter_pill(data)}<span class="src">{src_label}</span></div></div>'
        '<table><thead><tr><th style="width:54px;">Dkt.</th><th style="width:104px;">Filed</th>'
        '<th>Entry</th></tr></thead><tbody>\n' + rows + '\n</tbody></table>'
        + docket_foot + '</div>'
    )

    coverage_html = render_coverage((data or {}).get("coverage") or [])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name} — Case Docket | Turnpage Daily Briefing</title>
{THEME_SCRIPT}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<!-- AUTH GATE START -->
<script src="/auth/config.js"></script>
<script type="module" src="/auth/auth.js"></script>
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo" alt="Turnpage" src="{LOGO_SRC}"></a>
      {back}
    </div>
    <button id="theme-toggle" onclick="cycleTheme()">🖥️</button>
  </div>
</nav>

<div class="page-title">
  <div class="eyebrow">Tracked Case · Docket Mirror</div>
  <h1><span>{emoji}</span>{name}</h1>
  <div class="case-meta">
        {meta_html}
  </div>
  {status_html}
  {also}
</div>

{seed_html}

<main class="wrap">
  {docket_panel}
  {render_claims_panel(data)}
</main>

{coverage_html}

<footer class="foot">
  Docket data via CourtListener (Free Law Project){' · claim status via the settlement administrator' if (data or {}).get('claims_administrator') else ''} · coverage per the case's source tiers.<br>
  Provided for informational purposes only and does not constitute legal advice.
</footer>

</body>
</html>
"""


# ── main ─────────────────────────────────────────────────────────────────────
def main():
    cases = load_cases()
    if not cases:
        print("No cases found in cases/*.md — nothing to inject.")
        return

    # 1) render standalone pages for live (non-awaiting) cases with data
    print("=== Rendering case docket pages ===")
    for c in cases:
        d = _docket(c["data"])
        if d.get("awaiting_sync") or c["data"] is None:
            print(f"  · {c['slug']}: awaiting sync / no data — no standalone page")
            continue
        page = render_case_page(c)
        out = CASES_DIR / f"{c['slug']}.html"
        out.write_text(page, encoding="utf-8")
        print(f"  ✓ {c['slug']}: wrote cases/{c['slug']}.html ({len(page)} chars)")

    # 2) inject summary boxes into every topic dashboard (tagged → box; untagged → clean)
    print("=== Injecting Tracked Cases boxes into dashboards ===")
    for topic_slug in TOPIC_META:
        tagged = [c for c in cases if topic_slug in c["config"].get("topics", []) and c["data"]]
        block = render_box(tagged) if tagged else None
        inject_into_dashboard(topic_slug, block)

    print("=== Cases injection done. ===")


if __name__ == "__main__":
    main()
