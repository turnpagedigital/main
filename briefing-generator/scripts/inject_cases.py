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
import re, sys, json
from pathlib import Path

from cases_common import load_cases, REPO_ROOT, CASES_DIR, DATA_DIR, TOPIC_META, pretty_date, html_escape

# Root-absolute paths: Cloudflare Pages serves this repo at the domain root (see DEPLOY.md
# "output dir /"), and _headers/auth both use /assets and /auth. Case pages live at
# /cases/<slug>.html, so a sibling link to a topic is ../<topic>/dashboard.html.
LOGO_SRC = "../assets/turnpage-logo.jpeg"  # relative: case pages live in cases/
# Relative so the link stays inside the /intel/ mount in production
HOME_HREF = "index.html"          # from root-level pages
HOME_HREF_SUBDIR = "../index.html" # from cases/ pages
BOX_START = "<!-- TRACKED-CASES START -->"
BOX_END = "<!-- TRACKED-CASES END -->"

# Theme cycler lives in an external file (theme.js): the /intel/* CSP stacks with
# the site-wide /* CSP (no unsafe-inline), so inline scripts are blocked in prod.
THEME_SCRIPT = '<script src="theme.js"></script>'          # root-level pages
THEME_SCRIPT_SUBDIR = '<script src="../theme.js"></script>' # cases/ pages

# Shared stylesheet for the unified docket + unified calendar shells
UD_CSS = r"""  .page-title{max-width:1680px;}
  /* Main page area — no sidebar */
  .ud-page{max-width:1680px;margin:0 auto;padding:20px 32px 60px;}
  /* Controls bar */
  .ud-controls{background:var(--surface);border:1px solid var(--line-strong);padding:16px 20px;margin-bottom:16px;display:flex;flex-direction:column;gap:12px;}
  .ud-search-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .ud-search-wrap{flex:1;min-width:200px;position:relative;}
  .ud-search-input{width:100%;padding:8px 12px;font-size:15px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;box-sizing:border-box;}
  .ud-search-input:focus{border-color:var(--neon);}
  .ud-date-range{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .ud-date-label{font-size:12px;color:var(--ink-60);font-weight:700;letter-spacing:0.04em;white-space:nowrap;}
  .ud-date-input{padding:7px 10px;font-size:13px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;}
  .ud-date-input:focus{border-color:var(--neon);}
  .ud-date-sep{color:var(--ink-40);font-size:14px;}
  .ud-clear-btn{padding:7px 14px;font-size:13px;font-weight:700;font-family:inherit;background:transparent;border:1px solid var(--line-strong);color:var(--ink-60);cursor:pointer;white-space:nowrap;}
  .ud-clear-btn:hover{border-color:var(--ink-40);color:var(--ink);}
  /* Case dropdown + filters row */
  .ud-filter-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .ud-case-dd{position:relative;margin-right:auto;}
  .ud-case-dd-btn{display:inline-flex;align-items:center;gap:8px;font-weight:700;}
  .ud-dd-caret{font-size:11px;color:var(--ink-60);}
  .ud-case-dd-panel{position:absolute;top:calc(100% + 6px);left:0;z-index:900;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 6px 24px rgba(0,0,0,0.22);min-width:270px;padding:8px;}
  .ud-dd-head{display:flex;align-items:center;gap:10px;padding:2px 8px 8px;border-bottom:1px solid var(--line);margin-bottom:6px;}
  .ud-dd-quick{background:none;border:none;color:var(--ink-60);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:2px 4px;letter-spacing:0.03em;}
  .ud-dd-quick:hover{color:var(--ink);}
  .ud-dd-row{display:flex;align-items:center;gap:10px;padding:7px 8px;cursor:pointer;}
  .ud-dd-row:hover{background:var(--paper-2);}
  .ud-dd-row input{accent-color:var(--neon);cursor:pointer;flex-shrink:0;margin:0;}
  .ud-dd-spacer{flex:1;}
  .ud-dd-empty{padding:8px;font-size:13px;color:var(--ink-40);}
  .ud-dd-groups{border-top:1px solid var(--line);margin-top:6px;padding-top:6px;}
  .ud-dd-groups-title{font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-40);padding:2px 8px 4px;}
  .ud-dd-group-row{display:flex;align-items:center;gap:6px;padding:6px 8px;}
  .ud-dd-group-row:hover{background:var(--paper-2);}
  .ud-dd-group-name{flex:1;background:none;border:none;font-family:inherit;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer;text-align:left;padding:0;}
  .ud-dd-group-name:hover{color:var(--ink);text-decoration:underline;}
  .ud-dd-group-n{font-size:11px;color:var(--ink-40);font-weight:400;margin-left:4px;}
  .ud-dd-group-act{background:none;border:1px solid var(--line-strong);color:var(--ink-60);font-family:inherit;font-size:10px;font-weight:700;letter-spacing:0.04em;cursor:pointer;padding:2px 7px;text-transform:uppercase;}
  .ud-dd-group-act:hover{border-color:var(--ink-40);color:var(--ink);}
  .ud-dd-group-del{background:none;border:none;color:var(--ink-40);font-size:14px;cursor:pointer;padding:0 3px;line-height:1;}
  .ud-dd-group-del:hover{color:#C84141;}
  .ud-dd-save-row{display:flex;align-items:center;gap:6px;padding:8px 8px 4px;}
  .ud-dd-save-input{flex:1;min-width:0;padding:6px 8px;font-size:12px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;}
  .ud-dd-save-input:focus{border-color:var(--neon);}
  .ud-dd-save-btn{background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;padding:6px 10px;letter-spacing:0.03em;white-space:nowrap;}
  .ud-dd-save-btn:hover{border-color:var(--ink-40);}
  .ud-gear-btn{background:none;border:none;cursor:pointer;font-size:16px;padding:1px 5px;color:var(--ink-60);line-height:1;flex-shrink:0;opacity:0;transition:opacity 0.15s;}
  .ud-dd-row:hover .ud-gear-btn,.ud-gear-btn:focus{opacity:1;}
  .ud-gear-btn:hover{color:var(--ink);}
  .ud-filter-right{display:flex;align-items:center;gap:12px;flex-shrink:0;flex-wrap:wrap;}
  .ud-type-select{padding:7px 10px;font-size:14px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);cursor:pointer;outline:none;}
  .ud-type-select:focus{border-color:var(--neon);}
  .ud-new-label{display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;white-space:nowrap;color:var(--ink);}
  .ud-new-label input{accent-color:var(--neon);cursor:pointer;}
  /* Color popover */
  .ud-color-pop{position:absolute;z-index:1000;background:var(--surface);border:1px solid var(--line-strong);padding:16px;width:232px;box-shadow:0 6px 24px rgba(0,0,0,0.22);}
  .ud-pop-title{font-size:12px;font-weight:700;color:var(--ink);margin-bottom:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ud-pop-swatches{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:14px;}
  .ud-pop-swatch{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid transparent;padding:0;outline:none;}
  .ud-pop-swatch:hover{transform:scale(1.15);}
  .ud-pop-swatch.ud-swatch-active{border-color:var(--ink);}
  .ud-pop-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;gap:8px;font-size:14px;color:var(--ink-60);cursor:pointer;}
  .ud-pop-row input[type="color"]{width:40px;height:30px;padding:0;border:1px solid var(--line-strong);cursor:pointer;background:transparent;flex-shrink:0;}
  .ud-pop-row input[type="color"]::-webkit-color-swatch-wrapper{padding:0;}
  .ud-pop-row input[type="color"]::-webkit-color-swatch{border:none;}
  .ud-pop-reset{width:100%;padding:7px;font-size:12px;font-weight:700;font-family:inherit;background:none;border:1px solid var(--line-strong);color:var(--ink-60);cursor:pointer;margin-top:4px;}
  .ud-pop-reset:hover{border-color:var(--ink-40);color:var(--ink);}
  /* Toolbar */
  .ud-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
  #ud-count{font-size:14px;color:var(--ink-60);flex:1;}
  #ud-sort-btn{background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);font-size:14px;font-weight:700;padding:6px 14px;cursor:pointer;font-family:inherit;}
  #ud-sort-btn:hover{border-color:var(--ink-40);}
  /* Pills */
  .ud-pill{display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.03em;padding:2px 10px;white-space:nowrap;border-radius:99px;}
  /* Table */
  .ud-table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--line-strong);table-layout:fixed;}
  .ud-table th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-40);padding:11px 14px;border-bottom:1px solid var(--line-strong);font-weight:700;}
  .ud-table td{padding:12px 14px;font-size:15px;border-bottom:1px solid var(--line);vertical-align:top;}
  .ud-table tr:last-child td{border-bottom:none;}
  .ud-row-new td{font-weight:700;}
  .ud-row-article td{background:var(--paper-2);}
  .ud-mark-cell{text-align:center;white-space:nowrap;}
  .ud-bm-btn,.ud-note-btn{background:none;border:none;cursor:pointer;font-size:15px;padding:2px 4px;line-height:1;color:var(--ink-40);}
  .ud-bm-btn:hover,.ud-note-btn:hover{color:var(--ink);}
  .ud-bm-btn.ud-bm-on{color:#EAB308;}
  .ud-note-btn{filter:grayscale(1);opacity:0.45;}
  .ud-note-btn.ud-note-on{filter:none;opacity:1;}
  .ud-note-overlay{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:20px;}
  .ud-note-box{background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 10px 40px rgba(0,0,0,0.35);width:min(640px,100%);padding:22px;display:flex;flex-direction:column;gap:10px;}
  .ud-note-title{font-size:15px;font-weight:800;color:var(--ink);}
  .ud-note-meta{font-size:12px;color:var(--ink-60);line-height:1.5;border-bottom:1px solid var(--line);padding-bottom:10px;}
  .ud-note-text{width:100%;min-height:180px;resize:vertical;padding:10px 12px;font-family:inherit;font-size:14px;line-height:1.55;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;box-sizing:border-box;}
  .ud-note-text:focus{border-color:var(--neon);}
  .ud-note-actions{display:flex;align-items:center;gap:8px;}
  .ud-note-status{font-size:12px;color:var(--ink-40);}
  [data-theme="dark"] .ud-row-article td{background:rgba(229,231,235,0.05);}
  .ud-date{white-space:nowrap;color:var(--ink-60);font-variant-numeric:tabular-nums;}
  .ud-case{white-space:nowrap;overflow:hidden;}
  .ud-party{color:var(--ink-60);font-size:13px;overflow:hidden;}
  .ud-party-empty{color:var(--ink-40);}
  .ud-entry{word-break:break-word;}
  .ud-desc{color:var(--ink);}
  .ud-desc-empty{color:var(--ink-40);}
  .ud-doc{white-space:nowrap;text-align:right;overflow:hidden;}
  .ud-landmark{display:inline-block;font-size:10px;font-weight:700;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-strong);padding:1px 6px;margin-right:4px;vertical-align:middle;border-radius:3px;}
  .ud-news-tag{display:inline-block;font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink);background:transparent;border:1px solid var(--neon);padding:1px 7px;margin-right:5px;vertical-align:middle;}
  .ud-new-pill{display:inline-block;font-size:9px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#0A0A0A;background:var(--neon);padding:1px 7px;margin-left:6px;vertical-align:middle;}
  #ud-sync{margin-left:10px;font-size:12px;}
  .ud-sync-live{color:var(--ink-60);}
  .ud-sync-live::before{content:"\25CF";color:var(--neon);margin-right:5px;font-size:10px;}
  .ud-sync-static{color:var(--ink-40);}
  .ud-link{display:inline-block;font-size:13px;font-weight:700;color:var(--ink);text-decoration:none;border-bottom:1px solid var(--neon);padding-bottom:1px;}
  .ud-link-docket{border-bottom-color:var(--line-strong);}
  .ud-link-empty{color:var(--ink-40);font-size:13px;}
  .ud-empty{font-size:15px;color:var(--ink-60);font-style:italic;padding:28px 14px;text-align:center;}"""


# ── full case-page stylesheet (brand tokens; no f-string — CSS braces) ───────
PAGE_CSS = """<style>
  :root{color-scheme:light;--bg:#FFFFFF;--surface:#FFFFFF;--paper-2:#F4F5F7;--ink:#0A0A0A;--ink-60:rgba(10,10,10,0.6);--ink-40:rgba(10,10,10,0.4);--line:rgba(10,10,10,0.08);--line-strong:rgba(10,10,10,0.14);--neon:#D4FF00;}
  [data-theme="dark"]{color-scheme:dark;--bg:#16161B;--surface:#1F1F25;--paper-2:#1F1F25;--ink:#E5E7EB;--ink-60:rgba(229,231,235,0.62);--ink-40:rgba(229,231,235,0.42);--line:rgba(229,231,235,0.1);--line-strong:rgba(229,231,235,0.18);}
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
            if primary else f'<a class="tn-back" href="{HOME_HREF_SUBDIR}">← Daily Briefing</a>')
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
{THEME_SCRIPT_SUBDIR}
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
      <a class="tn-brand" href="{HOME_HREF_SUBDIR}"><img class="tn-brand-logo" alt="Turnpage" src="{LOGO_SRC}"></a>
      {back}
    </div>
    <button id="theme-toggle">🖥️</button>
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


# ── 3) unified docket page ────────────────────────────────────────────────────

# Distinct pill colors: (bg-light, fg-light, bg-dark, fg-dark)
_PILL_PALETTE = [
    ("#D4FF00", "#0A0A0A", "#5D7A00", "#FFFFFF"),
    ("#60A5FA", "#0A0A0A", "#1D4ED8", "#FFFFFF"),
    ("#FB923C", "#0A0A0A", "#C2410C", "#FFFFFF"),
    ("#C084FC", "#0A0A0A", "#7E22CE", "#FFFFFF"),
    ("#34D399", "#0A0A0A", "#065F46", "#FFFFFF"),
    ("#F87171", "#0A0A0A", "#B91C1C", "#FFFFFF"),
]


def _short_name(display_name):
    """'Bartz v. Anthropic' → 'Bartz'; 'BlockFills v. X' → 'BlockFills'."""
    parts = re.split(r'\s+v[s]?\.\s+', display_name, maxsplit=1)
    n = parts[0].strip()
    words = n.split()
    return " ".join(words[:2]) if len(words) > 2 else n


_CLASS_ACTION_TOPICS = {"llm-class-action", "billion-dollar-class-actions"}
_BANKRUPTCY_TOPICS   = {"bankruptcy-creditor-rights", "crypto-insolvency", "fraud-recovery"}

def _case_category(topics):
    ts = set(topics or [])
    if ts & _CLASS_ACTION_TOPICS:  return "class-action"
    if ts & _BANKRUPTCY_TOPICS:    return "bankruptcy"
    return "other"


def render_unified_docket(cases):
    """Generate briefing-generator/unified-docket.html (shell) + cases/data/_manifest.json."""
    live = [c for c in cases if c["data"] and not _docket(c["data"]).get("awaiting_sync")]
    # Manifest includes ALL cases that have a data file, so awaiting-sync cases
    # appear as chip options in the UI immediately after admin creates them.
    all_with_data = [c for c in cases if c["data"] is not None]

    # Write _manifest.json — lightweight case metadata consumed by JS at runtime.
    manifest = []
    for i, c in enumerate(all_with_data):
        d = _docket(c["data"])
        bl = _PILL_PALETTE[i % len(_PILL_PALETTE)][0]
        manifest.append({
            "slug": c["slug"],
            "display_name": c["config"]["display_name"],
            "short_name": _short_name(c["config"]["display_name"]),
            "docket_url": d.get("docket_url") or c["config"]["docket_source"].get("url") or "",
            "default_color": bl,
            "category": _case_category(c["config"].get("topics") or []),
        })

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = DATA_DIR / "_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ cases/data/_manifest.json: {len(manifest)} cases ({len(live)} live, {len(all_with_data)-len(live)} awaiting sync)")

    if not live:
        print("  · unified-docket.html: no live cases — writing empty shell")

    logo_src = "assets/turnpage-logo.jpeg"

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unified Docket — Turnpage Daily Briefing</title>
{THEME_SCRIPT}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
</style>
<!-- AUTH GATE START -->
<script src="/auth/config.js"></script>
<script type="module" src="/auth/auth.js"></script>
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo" alt="Turnpage" src="{logo_src}"></a>
      <a class="tn-back" href="{HOME_HREF}">← Daily Briefing</a>
      <a class="tn-back" href="unified-calendar.html">📅 Calendar</a>
      <a class="tn-back" href="unified-notes.html">🗒️ Notes</a>
    </div>
    <button id="theme-toggle">🖥️</button>
  </div>
</nav>

<div class="page-title">
  <div class="eyebrow">Intelligence · Live Docket Monitor</div>
  <h1>⚖️ Unified Docket</h1>
  <div class="case-meta">
    <span id="ud-meta">Loading…</span>
    <span id="ud-sync"></span>
  </div>
</div>

<!-- Color popover (shared, repositioned by JS) -->
<div id="ud-color-pop" class="ud-color-pop" style="display:none;">
  <div class="ud-pop-title" id="ud-pop-slug"></div>
  <div id="ud-pop-swatches" class="ud-pop-swatches"></div>
  <label class="ud-pop-row">
    <span>Background</span>
    <input type="color" id="ud-pop-bg" value="#888888">
  </label>
  <label class="ud-pop-row">
    <span>Text</span>
    <input type="color" id="ud-pop-fg" value="#ffffff">
  </label>
  <button id="ud-pop-reset" class="ud-pop-reset">Reset to default</button>
</div>

<!-- Note modal -->
<div id="ud-note-overlay" class="ud-note-overlay" style="display:none;">
  <div class="ud-note-box">
    <div class="ud-note-title" id="ud-note-title"></div>
    <div class="ud-note-meta" id="ud-note-meta"></div>
    <textarea id="ud-note-text" class="ud-note-text" placeholder="Notes for this entry…"></textarea>
    <div class="ud-note-actions">
      <button type="button" id="ud-note-delete" class="ud-clear-btn">Delete note</button>
      <span style="flex:1"></span>
      <span id="ud-note-status" class="ud-note-status"></span>
      <button type="button" id="ud-note-cancel" class="ud-clear-btn">Cancel</button>
      <button type="button" id="ud-note-save" class="ud-dd-save-btn">Save note</button>
    </div>
  </div>
</div>

<div class="ud-page">

  <div class="ud-controls">
    <div class="ud-search-row">
      <div class="ud-search-wrap">
        <input type="text" id="ud-search" class="ud-search-input" placeholder="Search entries, parties, dates…">
      </div>
      <div class="ud-date-range">
        <span class="ud-date-label">From</span>
        <input type="date" id="ud-date-from" class="ud-date-input">
        <span class="ud-date-sep">–</span>
        <span class="ud-date-label">To</span>
        <input type="date" id="ud-date-to" class="ud-date-input">
        <button id="ud-clear-search" class="ud-clear-btn">× Clear</button>
      </div>
    </div>
    <div class="ud-filter-row">
      <div class="ud-case-dd" id="ud-case-dd">
        <button type="button" id="ud-case-dd-btn" class="ud-type-select ud-case-dd-btn">Cases <span class="ud-dd-caret">▾</span></button>
        <div id="ud-case-dd-panel" class="ud-case-dd-panel" style="display:none;"></div>
      </div>
      <div class="ud-filter-right">
        <select id="ud-entry-type" class="ud-type-select">
          <option value="all">All entries</option>
          <option value="substantive">Substantive only</option>
          <option value="orders">Orders only</option>
          <option value="transfers">Transfers only</option>
        </select>
        <select id="ud-marked" class="ud-type-select">
          <option value="all">All rows</option>
          <option value="bookmarked">★ Bookmarked</option>
          <option value="noted">📝 With notes</option>
          <option value="either">★ or 📝</option>
        </select>
        <label class="ud-new-label">
          <input type="checkbox" id="ud-articles" checked> Articles
        </label>
        <label class="ud-new-label">
          <input type="checkbox" id="ud-new-only"> New only (24h)
        </label>
      </div>
    </div>
  </div>

  <div class="ud-toolbar">
    <span id="ud-count"></span>
    <button id="ud-sort-btn">Date ↓</button>
  </div>

  <table class="ud-table">
    <thead><tr>
      <th style="width:116px">Date</th>
      <th style="width:130px">Case</th>
      <th style="width:150px">Party</th>
      <th>Entry</th>
      <th style="width:100px;text-align:right">Dkt.</th>
      <th style="width:40px;text-align:center" title="Bookmarked">★</th>
      <th style="width:44px;text-align:center" title="Notes">📝</th>
    </tr></thead>
    <tbody id="ud-tbody">
      <tr><td colspan="7" class="ud-empty">Loading…</td></tr>
    </tbody>
  </table>

</div>

<script src="unified-docket.js"></script>

</body>
</html>
"""

    out = REPO_ROOT / "unified-docket.html"
    out.write_text(page, encoding="utf-8")
    print(f"  ✓ unified-docket.html: shell written ({len(live)} live cases in manifest)")


def render_unified_calendar(cases):
    """Generate briefing-generator/unified-calendar.html — hearings & deadlines
    parsed client-side (unified-calendar.js) from the same case data the
    unified docket uses. Shares UD_CSS, theme.js, colors, and saved groups."""
    logo_src = "assets/turnpage-logo.jpeg"

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unified Calendar — Turnpage Daily Briefing</title>
{THEME_SCRIPT}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
  .uc-rel-cell{{white-space:nowrap;}}
  .uc-rel{{font-size:12px;font-weight:700;color:var(--ink-60);}}
  .uc-kind{{display:inline-block;font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-strong);padding:2px 8px;margin-right:6px;vertical-align:middle;white-space:nowrap;}}
  .uc-snippet{{color:var(--ink-60);font-size:13px;}}
</style>
<!-- AUTH GATE START -->
<script src="/auth/config.js"></script>
<script type="module" src="/auth/auth.js"></script>
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo" alt="Turnpage" src="{logo_src}"></a>
      <a class="tn-back" href="{HOME_HREF}">← Daily Briefing</a>
      <a class="tn-back" href="unified-docket.html">⚖️ Docket</a>
      <a class="tn-back" href="unified-notes.html">🗒️ Notes</a>
    </div>
    <button id="theme-toggle">🖥️</button>
  </div>
</nav>

<div class="page-title">
  <div class="eyebrow">Intelligence · Hearings &amp; Deadlines</div>
  <h1>📅 Unified Calendar</h1>
  <div class="case-meta">
    <span id="ud-meta">Loading…</span>
    <span id="ud-sync"></span>
  </div>
</div>

<!-- Color popover (shared, repositioned by JS) -->
<div id="ud-color-pop" class="ud-color-pop" style="display:none;">
  <div class="ud-pop-title" id="ud-pop-slug"></div>
  <div id="ud-pop-swatches" class="ud-pop-swatches"></div>
  <label class="ud-pop-row">
    <span>Background</span>
    <input type="color" id="ud-pop-bg" value="#888888">
  </label>
  <label class="ud-pop-row">
    <span>Text</span>
    <input type="color" id="ud-pop-fg" value="#ffffff">
  </label>
  <button id="ud-pop-reset" class="ud-pop-reset">Reset to default</button>
</div>

<div class="ud-page">

  <div class="ud-controls">
    <div class="ud-search-row">
      <div class="ud-search-wrap">
        <input type="text" id="ud-search" class="ud-search-input" placeholder="Search events, cases, dates…">
      </div>
      <button id="ud-clear-search" class="ud-clear-btn">× Clear</button>
    </div>
    <div class="ud-filter-row">
      <div class="ud-case-dd" id="ud-case-dd">
        <button type="button" id="ud-case-dd-btn" class="ud-type-select ud-case-dd-btn">Cases <span class="ud-dd-caret">▾</span></button>
        <div id="ud-case-dd-panel" class="ud-case-dd-panel" style="display:none;"></div>
      </div>
      <div class="ud-filter-right">
        <select id="uc-scope" class="ud-type-select">
          <option value="upcoming">Upcoming only</option>
          <option value="all">All dates</option>
          <option value="past">Past only</option>
        </select>
      </div>
    </div>
  </div>

  <div class="ud-toolbar">
    <span id="ud-count"></span>
    <button id="ud-sort-btn">Date ↑</button>
  </div>

  <table class="ud-table">
    <thead><tr>
      <th style="width:150px">Date</th>
      <th style="width:100px">When</th>
      <th style="width:130px">Case</th>
      <th>Event</th>
      <th style="width:100px;text-align:right">Source</th>
    </tr></thead>
    <tbody id="uc-tbody">
      <tr><td colspan="5" class="ud-empty">Loading…</td></tr>
    </tbody>
  </table>

</div>

<script src="unified-calendar.js"></script>

</body>
</html>
"""

    out = REPO_ROOT / "unified-calendar.html"
    out.write_text(page, encoding="utf-8")
    print("  \u2713 unified-calendar.html: shell written")


def render_unified_notes(cases):
    """Generate briefing-generator/unified-notes.html — all bookmarks + notes,
    sorted by last edit, exportable. Same shell family as docket/calendar."""
    logo_src = "assets/turnpage-logo.jpeg"

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unified Notes — Turnpage Daily Briefing</title>
{THEME_SCRIPT}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
  .uc-snippet{{color:var(--ink-60);font-size:13px;}}
  .un-note-cell{{max-width:420px;}}
  .un-note-text{{white-space:pre-wrap;font-size:14px;line-height:1.5;}}
  .un-export{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}}
</style>
<!-- AUTH GATE START -->
<script src="/auth/config.js"></script>
<script type="module" src="/auth/auth.js"></script>
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo" alt="Turnpage" src="{logo_src}"></a>
      <a class="tn-back" href="{HOME_HREF}">← Daily Briefing</a>
      <a class="tn-back" href="unified-docket.html">⚖️ Docket</a>
      <a class="tn-back" href="unified-calendar.html">📅 Calendar</a>
    </div>
    <button id="theme-toggle">🖥️</button>
  </div>
</nav>

<div class="page-title">
  <div class="eyebrow">Intelligence · Docket Notes</div>
  <h1>🗒️ Unified Notes</h1>
  <div class="case-meta">
    <span id="ud-meta">Loading…</span>
    <span id="ud-sync"></span>
  </div>
</div>

<!-- Color popover (shared, repositioned by JS) -->
<div id="ud-color-pop" class="ud-color-pop" style="display:none;">
  <div class="ud-pop-title" id="ud-pop-slug"></div>
  <div id="ud-pop-swatches" class="ud-pop-swatches"></div>
  <label class="ud-pop-row">
    <span>Background</span>
    <input type="color" id="ud-pop-bg" value="#888888">
  </label>
  <label class="ud-pop-row">
    <span>Text</span>
    <input type="color" id="ud-pop-fg" value="#ffffff">
  </label>
  <button id="ud-pop-reset" class="ud-pop-reset">Reset to default</button>
</div>

<!-- Note modal -->
<div id="ud-note-overlay" class="ud-note-overlay" style="display:none;">
  <div class="ud-note-box">
    <div class="ud-note-title" id="ud-note-title"></div>
    <div class="ud-note-meta" id="ud-note-meta"></div>
    <textarea id="ud-note-text" class="ud-note-text" placeholder="Notes for this entry…"></textarea>
    <div class="ud-note-actions">
      <button type="button" id="ud-note-delete" class="ud-clear-btn">Delete note</button>
      <span style="flex:1"></span>
      <span id="ud-note-status" class="ud-note-status"></span>
      <button type="button" id="ud-note-cancel" class="ud-clear-btn">Cancel</button>
      <button type="button" id="ud-note-save" class="ud-dd-save-btn">Save note</button>
    </div>
  </div>
</div>

<div class="ud-page">

  <div class="ud-controls">
    <div class="ud-search-row">
      <div class="ud-search-wrap">
        <input type="text" id="ud-search" class="ud-search-input" placeholder="Search notes, entries, cases…">
      </div>
      <div class="ud-date-range">
        <span class="ud-date-label">Edited from</span>
        <input type="date" id="ud-date-from" class="ud-date-input">
        <span class="ud-date-sep">–</span>
        <span class="ud-date-label">to</span>
        <input type="date" id="ud-date-to" class="ud-date-input">
        <button id="ud-clear-search" class="ud-clear-btn">× Clear</button>
      </div>
    </div>
    <div class="ud-filter-row">
      <div class="ud-case-dd" id="ud-case-dd">
        <button type="button" id="ud-case-dd-btn" class="ud-type-select ud-case-dd-btn">Cases <span class="ud-dd-caret">▾</span></button>
        <div id="ud-case-dd-panel" class="ud-case-dd-panel" style="display:none;"></div>
      </div>
      <div class="ud-filter-right un-export">
        <button type="button" id="un-copy-md" class="ud-clear-btn" title="Copy all visible notes as formatted text">Copy for Docs</button>
        <button type="button" id="un-export-md" class="ud-clear-btn">Download .md</button>
        <button type="button" id="un-export-csv" class="ud-clear-btn">Download .csv</button>
      </div>
    </div>
  </div>

  <div class="ud-toolbar">
    <span id="ud-count"></span>
    <button id="ud-sort-btn">Edited ↓</button>
  </div>

  <table class="ud-table">
    <thead><tr>
      <th style="width:170px">Last edited</th>
      <th style="width:130px">Case</th>
      <th style="width:260px">Entry</th>
      <th>Note</th>
      <th style="width:90px;text-align:right">Source</th>
      <th style="width:76px;text-align:center">★ 📝</th>
    </tr></thead>
    <tbody id="un-tbody">
      <tr><td colspan="6" class="ud-empty">Loading…</td></tr>
    </tbody>
  </table>

</div>

<script src="unified-notes.js"></script>

</body>
</html>
"""

    out = REPO_ROOT / "unified-notes.html"
    out.write_text(page, encoding="utf-8")
    print("  \u2713 unified-notes.html: shell written")


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

    # 3) unified docket page
    print("=== Rendering unified docket page ===")
    render_unified_docket(cases)

    # 4) unified calendar page
    print("=== Rendering unified calendar page ===")
    render_unified_calendar(cases)

    # 5) unified notes page
    print("=== Rendering unified notes page ===")
    render_unified_notes(cases)

    print("=== Cases injection done. ===")


if __name__ == "__main__":
    main()
