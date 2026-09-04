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
LOGO_SRC = "../assets/turnpage-intel-logo.png"
LOGO_SRC_DARK = "../assets/turnpage-intel-logo-dark.png"  # relative: case pages live in cases/
# Relative so the link stays inside the /intel/ mount in production
HOME_HREF = "index.html"          # from root-level pages
HOME_HREF_SUBDIR = "../index.html" # from cases/ pages
BOX_START = "<!-- TRACKED-CASES START -->"
BOX_END = "<!-- TRACKED-CASES END -->"

# Theme cycler lives in an external file (theme.js): the /intel/* CSP stacks with
# the site-wide /* CSP (no unsafe-inline), so inline scripts are blocked in prod.
THEME_SCRIPT = '<script src="theme.js"></script>'          # root-level pages
THEME_SCRIPT_SUBDIR = '<script src="../theme.js"></script>' # cases/ pages

# Installable web app: Add to Home Screen opens /intel/ full-screen with no
# browser chrome. Shared by every generated page so the tags can't drift — and
# so a hand-edit to docket.html/news.html doesn't get wiped by the next sync.
#
# crossorigin=use-credentials is REQUIRED, not decorative: browsers fetch the
# manifest WITHOUT cookies by default, so functions/intel/_middleware.js would
# answer with the sign-in page instead of the JSON and the install would quietly
# degrade to a screenshot icon. Paths are absolute so cases/ pages resolve them.
# theme-color is not here — theme.js sets it at runtime from the light/dark/night
# choice, so there is exactly one source of truth for it.
PWA_HEAD = """<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<link rel="icon" type="image/png" href="/intel/assets/favicon-light-64.png" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/png" href="/intel/assets/favicon-dark-64.png" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/png" href="/intel/assets/favicon-light-64.png">
<link rel="manifest" href="/intel/manifest.webmanifest" crossorigin="use-credentials">
<link rel="apple-touch-icon" href="/intel/assets/apple-touch-icon-v2.png">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">"""

# Shared stylesheet for the unified docket + unified calendar shells
UD_CSS = r"""
  /* Main page area — no sidebar */
  .ud-page{max-width:1680px;margin:0 auto;padding:20px 32px 60px;}
  /* Nav shares the content grid so left/right margins match the page */
  /* Controls bar */
  .ud-controls{background:transparent;border:none;padding:14px 0;margin-bottom:16px;display:flex;flex-direction:row;align-items:center;gap:12px;flex-wrap:wrap;}
  .ud-search-row,.ud-filter-row{display:contents;}
  .ud-search-wrap{flex:1 1 220px;min-width:180px;max-width:420px;position:relative;}
  .ud-search-input{width:100%;padding:8px 12px;font-size:15px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;box-sizing:border-box;}
  .ud-search-input:focus{border-color:var(--neon);}
  .ud-date-range{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .ud-date-label{font-size:12px;color:var(--ink-60);font-weight:700;letter-spacing:0.04em;white-space:nowrap;}
  .ud-date-input{padding:7px 8px;font-size:13px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;width:132px;}
  .ud-date-input:focus{border-color:var(--neon);}
  .ud-date-sep{color:var(--ink-40);font-size:14px;}
  /* Case dropdown + filters row */
  .ud-dd-spacer{flex:1;}
  .ud-dd-empty{padding:10px 12px;font-size:13px;color:var(--ink-60);}
  .ud-dd-groups{border-top:1px solid var(--line);margin-top:6px;padding-top:6px;}
  .ud-dd-group-row{display:flex;align-items:center;gap:6px;padding:6px 8px;}
  .ud-dd-group-row:hover{background:var(--paper-2);}
  .ud-dd-group-name{flex:1;background:none;border:none;font-family:inherit;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer;text-align:left;padding:0;}
  .ud-dd-group-name:hover{color:var(--ink);text-decoration:underline;}
  .ud-dd-group-n{font-size:11px;color:var(--ink-40);font-weight:400;margin-left:4px;}
  .ud-dd-group-del{background:none;border:none;color:var(--ink-40);font-size:14px;cursor:pointer;padding:0 3px;line-height:1;}
  .ud-dd-group-del:hover{color:#C84141;}
  .ud-dd-save-row{display:flex;align-items:center;gap:6px;padding:8px 8px 4px;}
  .ud-dd-save-input{flex:1;min-width:0;padding:6px 8px;font-size:12px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;}
  .ud-dd-save-input:focus{border-color:var(--neon);}
  .ud-dd-save-btn{background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;padding:6px 10px;letter-spacing:0.03em;white-space:nowrap;}
  .ud-dd-saveview{display:block;width:100%;margin-top:8px;padding:9px;background:var(--neon);border-color:var(--neon);color:#0A0A0A;}
  .ud-dd-save-btn:hover{border-color:var(--ink-40);}
  .ud-gear-btn{background:none;border:none;cursor:pointer;font-size:16px;padding:1px 5px;color:var(--ink-60);line-height:1;flex-shrink:0;opacity:0;transition:opacity 0.15s;}
  .ud-details-link{display:inline-flex;align-items:center;padding:1px 5px;color:var(--ink-40);line-height:1;flex-shrink:0;opacity:0;transition:opacity 0.15s;text-decoration:none;}
  .ud-dd-row:hover .ud-details-link,.ud-details-link:focus{opacity:1;}
  .ud-details-link:hover{color:var(--ink);}
  .ud-dd-sync-btn{display:inline-flex;align-items:center;padding:1px 5px;color:var(--ink-40);line-height:1;flex-shrink:0;opacity:0;transition:opacity 0.15s;background:none;border:none;cursor:pointer;}
  .ud-dd-row:hover .ud-dd-sync-btn,.ud-dd-sync-btn:focus{opacity:1;}
  .ud-dd-sync-btn:hover{color:var(--ink);}
  .ud-dd-sync-btn:disabled{opacity:1;cursor:default;color:var(--ink-60);}
  .ud-dd-sync-btn.ud-dd-sync-spin svg{animation:ud-dd-sync-spin 0.9s linear infinite;}
  @keyframes ud-dd-sync-spin{to{transform:rotate(360deg);}}
  .ud-dd-row:hover .ud-gear-btn,.ud-gear-btn:focus{opacity:1;}
  .ud-gear-btn:hover{color:var(--ink);}
  .ud-filter-right{display:flex;align-items:center;gap:12px;flex-shrink:0;flex-wrap:wrap;}
  .ud-type-select:focus{border-color:var(--neon);}
  /* Color popover */
  .ud-pill.ud-pill-sq{border-radius:0;}
  .ud-color-pop{position:absolute;z-index:1000;background:var(--surface);border:1px solid var(--line-strong);padding:16px;width:232px;box-shadow:0 6px 24px rgba(0,0,0,0.22);}
  .ud-pop-title{font-size:12px;font-weight:700;color:var(--ink);margin-bottom:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ud-pop-swatches{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:14px;}
  .ud-pop-swatches.ud-sw-editing{display:flex;flex-direction:column;gap:6px;max-height:290px;overflow-y:auto;}
  .ud-sw-row{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ink-60);}
  .ud-sw-row label{display:flex;align-items:center;gap:4px;}
  .ud-sw-row input[type="color"]{width:30px;height:22px;padding:0;border:1px solid var(--line-strong);background:none;cursor:pointer;}
  .ud-sw-preview{display:inline-block;width:34px;text-align:center;font-size:11px;font-weight:800;padding:2px 0;border-radius:99px;border:1px solid var(--line);}
  .ud-pop-swatch{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid transparent;padding:0;outline:none;}
  .ud-pop-swatch:hover{transform:scale(1.15);}
  .ud-pop-swatch.ud-swatch-active{border-color:var(--ink);}
  .ud-swatch-edit{width:28px;height:28px;padding:0;border:1px solid var(--line-strong);border-radius:50%;cursor:pointer;background:transparent;}
  .ud-swatch-edit::-webkit-color-swatch-wrapper{padding:0;}
  .ud-swatch-edit::-webkit-color-swatch{border:none;border-radius:50%;}
  .ud-pop-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;gap:8px;font-size:14px;color:var(--ink-60);cursor:pointer;}
  .ud-pop-row input[type="color"]{width:40px;height:30px;padding:0;border:1px solid var(--line-strong);cursor:pointer;background:transparent;flex-shrink:0;}
  .ud-pop-row input[type="color"]::-webkit-color-swatch-wrapper{padding:0;}
  .ud-pop-row input[type="color"]::-webkit-color-swatch{border:none;}
  .ud-pop-reset{width:100%;padding:7px;font-size:12px;font-weight:700;font-family:inherit;background:none;border:1px solid var(--line-strong);color:var(--ink-60);cursor:pointer;margin-top:4px;}
  .ud-pop-reset:hover{border-color:var(--ink-40);color:var(--ink);}
  /* Toolbar */
  .ud-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
  .ud-lookback-box{display:inline-flex;align-items:center;gap:8px;background:var(--paper-2);border:1px solid var(--line-strong);padding:3px 10px;margin-right:10px;white-space:nowrap;}
  .ud-lookback-box #ud-lookback-label{font-size:12px;font-weight:800;letter-spacing:0.03em;color:var(--ink);}
  .ud-lookback-box .ud-date-range{display:inline-flex;align-items:center;gap:6px;}
  .ud-lookback-box .ud-date-input{width:130px;padding:2px 6px;font-size:12px;font-family:inherit;background:var(--surface);border:1px solid var(--line-strong);color:var(--ink);}
  #ud-sort-btn{background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);font-size:14px;font-weight:700;padding:6px 14px;cursor:pointer;font-family:inherit;}
  #ud-sort-btn:hover{border-color:var(--ink-40);}
  /* Pills */
  /* Table */
  .ud-table{width:100%;border-collapse:collapse;background:transparent;border:none;table-layout:fixed;}
  /* Frame lives on the cells (not the table) so day-separator rows can sit
     outside the box: transparent, no vertical borders. */
  .ud-table thead th{background:var(--surface);border-top:1px solid var(--line-strong);}
  .ud-table thead th:first-child{border-left:1px solid var(--line-strong);}
  .ud-table thead th:last-child{border-right:1px solid var(--line-strong);}
  .ud-table tbody tr{background:var(--surface);}
  .ud-table tbody tr:not(.ud-day-row) td:first-child{border-left:1px solid var(--line-strong);}
  .ud-table tbody tr:not(.ud-day-row) td:last-child{border-right:1px solid var(--line-strong);}
  .ud-table tbody tr:last-child td{border-bottom:1px solid var(--line-strong);}
  [data-theme="dark"] .ud-table thead th:first-child{border-left-color:var(--bg);}
  [data-theme="dark"] .ud-table thead th:last-child{border-right-color:var(--bg);}
  [data-theme="dark"] .ud-table tbody tr:not(.ud-day-row) td:first-child{border-left-color:var(--bg);}
  [data-theme="dark"] .ud-table tbody tr:not(.ud-day-row) td:last-child{border-right-color:var(--bg);}
  [data-theme="dark"] .ud-table tbody tr:last-child td{border-bottom-color:var(--bg);}
  [data-theme="dark"] .ud-table td{border-bottom-color:var(--bg);}
  .ud-row-new .ud-entry{font-weight:700;}  /* highlight new rows via the entry text only — dates and parties stay regular */
  .ud-table tr.ud-day-row{background:transparent;}
  .ud-row-article td{background:var(--paper-2);}
  .ud-mark-cell{text-align:center;white-space:nowrap;padding-left:1px;padding-right:1px;}
  .ud-table thead th:last-child,.ud-table tbody tr:not(.ud-day-row) td:last-child{padding-right:14px;}
  .ud-th-icon{padding-left:1px;padding-right:1px;}
  .ud-mark-cell button{padding-left:2px;padding-right:2px;}
  .ud-table td.ud-mark-cell,.ud-table th.ud-th-icon{width:1%;}
  .ud-bm-btn,.ud-note-btn,.ud-soc-btn{background:none;border:none;cursor:pointer;font-size:15px;padding:2px 4px;line-height:1;color:var(--ink-40);}
  .ud-bm-btn:hover,.ud-note-btn:hover,.ud-soc-btn:hover{color:var(--ink);}
  .ud-bm-btn.ud-bm-on{color:#EAB308;}
  .ud-note-btn{color:var(--ink-40);}
  .ud-note-btn.ud-note-on{color:#3FA07A;}
  .ud-note-text{width:100%;min-height:180px;resize:vertical;padding:10px 12px;font-family:inherit;font-size:14px;line-height:1.55;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;box-sizing:border-box;}
  .ud-note-titlefield{width:100%;padding:9px 12px;font-family:inherit;font-size:14px;font-weight:700;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;box-sizing:border-box;}
  .ud-note-titlefield:focus{border-color:var(--neon);}
  .ud-upload-btn{background:none;border:none;cursor:pointer;padding:1px 2px;color:var(--ink-40);vertical-align:middle;margin-left:4px;}
  .ud-upload-btn:hover{color:var(--ink);}
  .ud-file-group{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
  .ud-file-btn{color:var(--ink);text-decoration:none;display:inline-flex;}
  .ud-file-dl{color:var(--ink);text-decoration:none;display:inline-flex;opacity:0.75;}
  .ud-file-dl:hover{opacity:1;}
  .ud-file-del{background:none;border:none;cursor:pointer;padding:0 2px;color:var(--ink-40);font-size:14px;line-height:1;}
  .ud-file-del:hover{color:var(--ink);}
  .ud-th-filter{cursor:pointer;user-select:none;}
  .ud-th-filter:hover,.ud-th-filter.ud-th-on{color:var(--ink);}
  .ud-th-toggle{cursor:pointer;user-select:none;}
  .ud-th-toggle:hover{color:var(--ink);}
  .ud-th-toggle.ud-th-on{color:#EAB308;}
  .ud-th-menu{position:absolute;z-index:950;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 6px 24px rgba(0,0,0,0.22);min-width:180px;padding:6px;}
  .ud-mi-sub{font-size:11px;color:var(--ink-60);font-weight:400;margin-top:2px;}
  .ud-th-menu-item.ud-th-menu-on::after{content:" \2713";color:var(--ink-60);}
  .ud-sep{color:var(--ink-40);padding:0 5px;}
  .ud-vote{background:none;border:none;cursor:pointer;font-size:11px;padding:2px 3px;line-height:1;color:var(--ink-40);vertical-align:middle;}
  .ud-vote:hover{color:var(--ink);}
  .ud-vote.ud-vote-up-on{color:#3FA07A;}
  .ud-vote.ud-vote-dn-on{color:#C84141;}
  .ud-table .ud-row-bondoro td{background:rgba(212,255,0,0.10);}
  [data-theme="dark"] .ud-table .ud-row-bondoro td{background:rgba(212,255,0,0.07);}
  .ud-pill-assign{border:1px dashed var(--ink-40);cursor:pointer;font-family:inherit;}
  .ud-pill-assign:hover{border-style:solid;}
  .ud-snz-btn{background:none;border:none;cursor:pointer;padding:2px 4px;line-height:1;color:var(--ink-40);}
  .ud-snz-btn:hover{color:var(--ink);}
  .ud-snz-btn.ud-snz-on{color:#3B78D8;}
  .ud-del-btn{background:none;border:none;cursor:pointer;padding:2px 4px;line-height:1;color:var(--ink-40);}
  .ud-table td .ud-bm-btn,.ud-table td .ud-note-btn,.ud-table td .ud-del-btn{margin:0 3px;}
  .ud-del-btn:hover{color:#C84141;}
  .ud-hide-btn{background:none;border:none;cursor:pointer;padding:2px 4px;line-height:1;color:var(--ink-40);}
  .ud-hide-btn:hover{color:var(--ink);}
  .ud-hide-btn.ud-hide-on{color:var(--ink);}
  .ud-table tbody tr.ud-row-cursor{outline:2px solid var(--neon);outline-offset:-2px;}
  .ud-fetch-spin{display:inline-block;width:15px;height:15px;border:2px solid var(--line-strong);border-top-color:var(--ink);border-radius:50%;animation:udspin 0.8s linear infinite;vertical-align:middle;}
  @keyframes udspin{to{transform:rotate(360deg);}}
  .ud-fetch-wrap{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
  .ud-fetch-label{font-size:11px;color:var(--ink-60);letter-spacing:0.01em;}
  .ud-fetch-err{font-size:11px;font-weight:700;color:#B3261E;white-space:nowrap;cursor:help;}
  .ud-pal-overlay{position:fixed;inset:0;background:rgba(10,10,10,0.35);z-index:300;display:flex;align-items:flex-start;justify-content:center;padding-top:14vh;}
  .ud-pal-box{background:var(--surface);border:1px solid var(--line-strong);width:min(520px,92vw);box-shadow:0 12px 40px rgba(0,0,0,0.18);}
  .ud-pal-input{width:100%;padding:13px 14px;font-size:15px;font-family:inherit;border:0;border-bottom:1px solid var(--line-strong);outline:none;background:transparent;color:var(--ink);box-sizing:border-box;}
  .ud-pal-list{list-style:none;margin:0;padding:4px 0;max-height:320px;overflow-y:auto;}
  .ud-pal-item{padding:9px 14px;font-size:13.5px;cursor:pointer;display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
  .ud-pal-cur,.ud-pal-cur:hover{background:var(--sel-bg,#0A0A0A);color:var(--sel-fg,#fff);}
  .ud-pal-cur .ud-pal-slug,.ud-pal-cur:hover .ud-pal-slug{color:inherit;opacity:0.65;}
  .ud-pal-empty{padding:12px 14px;font-size:13px;color:var(--ink-60);}
  .ud-pal-hint{padding:7px 14px;font-size:10.5px;color:var(--ink-60);border-top:1px solid var(--line-strong);letter-spacing:0.03em;}
  .ud-rename-input{width:100%;font-family:inherit;font-size:13px;padding:5px 7px;border:1.5px solid var(--neon);background:var(--surface);color:var(--ink);box-sizing:border-box;}
  .ud-due{background:transparent;padding:0;margin-bottom:14px;display:flex;flex-direction:column;gap:10px;}
  .ud-due-head{display:flex;align-items:center;justify-content:space-between;gap:12px;}
  .ud-due-head-label{font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);}
  /* Pager sits on the page background above the cards, not on any one card —
     up to DUE_PAGE_SIZE (4) reminders show at once; this only appears when
     there are more than that. */
  .ud-due-pager{display:flex;align-items:center;gap:8px;flex:0 0 auto;}
  .ud-due-pg-btn{background:none;border:none;cursor:pointer;font-size:14px;color:var(--ink-40);padding:2px 4px;line-height:1;}
  .ud-due-pg-btn:hover{color:var(--ink);}
  .ud-due-pg-count{font-size:11px;font-weight:700;color:var(--ink-40);white-space:nowrap;}
  /* Non-overlapping cards, as many per row as fit at >=240px each — 4 max
     since a page never holds more than DUE_PAGE_SIZE items. */
  .ud-due-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;}
  /* Each snoozed reminder is styled to match the dashboard Notes card exactly
     — same paper color, title + artifact + date-prefixed body — so a due
     reminder reads as the same kind of object as a note. */
  .ud-due-card{background:#EEFFA3;border-top:4px solid var(--cc, transparent);border-radius:15px;padding:14px 17px;box-shadow:0 6px 10px -7px rgba(10,10,10,0.4);}
  [data-theme="dark"] .ud-due-card{background:#2B2723;box-shadow:0 6px 14px -7px rgba(0,0,0,0.7);}
  .ud-due-title{font-size:15px;font-weight:800;color:#21201A;padding-bottom:7px;margin-bottom:10px;border-bottom:1px solid rgba(10,10,10,0.14);}
  .ud-due-artifact{display:flex;align-items:center;gap:6px;font-size:12px;font-style:italic;color:rgba(10,10,10,0.5);margin-bottom:10px;}
  .ud-due-artifact svg{flex:0 0 auto;opacity:0.8;}
  .ud-due-body{font-size:13px;line-height:1.55;color:#21201A;opacity:0.8;}
  .ud-due-body strong{opacity:1;}
  [data-theme="dark"] .ud-due-title{color:#EDE7DE;border-bottom-color:rgba(237,231,222,0.16);}
  [data-theme="dark"] .ud-due-artifact{color:rgba(237,231,222,0.55);}
  [data-theme="dark"] .ud-due-body{color:#EDE7DE;}
  /* Icon-only actions — the same snooze-clock / trash glyphs as the row
     actions in the table below, not text buttons. */
  .ud-due-foot{display:flex;gap:10px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid rgba(10,10,10,0.1);}
  [data-theme="dark"] .ud-due-foot{border-top-color:rgba(237,231,222,0.12);}
  .ud-due-resnooze,.ud-due-dismiss{background:none;border:none;cursor:pointer;padding:2px 4px;line-height:1;color:rgba(10,10,10,0.45);}
  [data-theme="dark"] .ud-due-resnooze,[data-theme="dark"] .ud-due-dismiss{color:rgba(237,231,222,0.5);}
  .ud-due-resnooze:hover{color:#21201A;}
  [data-theme="dark"] .ud-due-resnooze:hover{color:#EDE7DE;}
  .ud-due-dismiss:hover{color:#C84141;}
  .ud-case-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;}
  .ud-case-grid label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-60);}
  .ud-case-grid input,.ud-case-grid textarea{font-size:13.5px;}
  .ud-case-wide{grid-column:1 / -1;}
  .ud-case-lookup-row{display:flex;gap:6px;}
  .ud-case-lookup-row input{flex:1;}
  .ud-case-topics{display:flex;flex-wrap:wrap;gap:8px;}
  .ud-case-topics label{display:flex;flex-direction:row;align-items:center;gap:5px;font-weight:400;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink);cursor:pointer;}
  .ud-case-topics input{accent-color:var(--neon);}
  /* ── Mobile (≤720px): tables become stacked cards ─────────────────────── */
  @media (max-width: 720px) {
    body{overflow-x:hidden;}
    .ud-party-empty{display:none;}
    .ud-page{padding:12px 12px 48px;}
    .page-title{padding-left:14px;padding-right:14px;}
    .ud-controls{padding:12px 0;gap:8px;}
    .ud-search-wrap{flex:1 1 100%;max-width:none;}
    .ud-date-range{gap:6px;}
    .ud-toolbar{flex-wrap:wrap;gap:8px;}
    .ud-table, .ud-table tbody{display:block;width:100%;}
    .ud-table{border:1px solid var(--line-strong);background:var(--surface);}
    .ud-table tbody tr:not(.ud-day-row) td:first-child{border-left:none;}
    .ud-table tbody tr:not(.ud-day-row) td:last-child{border-right:none;}
    .ud-table thead{display:none;}
    .ud-table tr{display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 10px;padding:12px 10px;border-bottom:1px solid var(--line);}
    .ud-table td{display:inline-block;border-bottom:none;padding:0;width:auto !important;}
    .ud-date{order:1;font-size:12px;color:var(--ink-60);}
    .uc-rel-cell{order:2;}
    .ud-case{order:3;overflow:visible;}
    .ud-party{order:4;font-size:12px;color:var(--ink-60);}
    .ud-entry, .un-note-cell{order:5;flex-basis:100%;max-width:none;}
    .ud-doc{order:6;margin-left:auto;text-align:right;}
    .ud-mark-cell, .uc-curate-cell{order:7;}
    /* Zero-width on mobile already, but still a flex item — its leading gap
       shoved the first visible cell (date) right of the entry text below it. */
    .ud-table td.ud-more-cell{display:none;}
    .ud-mark-cell button{font-size:16px;padding:4px 6px;}
    .ud-day-row{padding:0;border-bottom:none;}
    .ud-day-row td{flex-basis:100%;padding:7px 10px;}
    .ud-row-article td, .ud-table .ud-row-bondoro td{background:transparent;}
    .ud-row-article{background:var(--paper-2);}
    .ud-table .ud-row-bondoro{background:rgba(212,255,0,0.10);}
    [data-theme="dark"] .ud-table .ud-row-bondoro{background:rgba(212,255,0,0.07);}
    [data-theme="dark"] .ud-table tr.ud-row-article td{background:transparent;}
    [data-theme="dark"] .ud-table tr.ud-row-article{background:rgba(229,231,235,0.05);}
    .ud-case-dd-panel{max-width:calc(100vw - 16px);min-width:240px;}
    .ud-th-menu{max-width:calc(100vw - 16px);}
    .ud-case-grid{grid-template-columns:1fr;}
    .ud-note-box{padding:16px;}
    .uc-merge-bar{flex-wrap:wrap;}
  }
  .uc-gcal{text-decoration:none;color:var(--ink-40);line-height:1;}
  .uc-gcal:hover{color:var(--ink);}
  .uc-gcal:hover{opacity:1;}
  .uc-curate-cell{text-align:center;white-space:nowrap;}
  .uc-sel{accent-color:var(--neon);cursor:pointer;margin:0 6px 0 0;vertical-align:middle;}
  .uc-x{background:none;border:none;color:var(--ink-40);font-size:15px;cursor:pointer;padding:0 3px;line-height:1;vertical-align:middle;}
  .uc-x:hover{color:#C84141;}
  .uc-merge-bar{position:sticky;bottom:14px;z-index:800;display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 6px 24px rgba(0,0,0,0.25);padding:10px 16px;margin-bottom:12px;font-size:13px;}
  .uc-merged-chip{display:inline-block;font-size:10px;font-weight:700;color:var(--ink-60);background:var(--paper-2);border:1px solid var(--line);padding:1px 6px;margin-left:6px;vertical-align:middle;}
  .uc-curation-info{font-size:12px;color:var(--ink-40);margin-right:12px;}
  .uc-curation-info button{background:none;border:none;color:var(--ink-60);font-family:inherit;font-size:12px;cursor:pointer;text-decoration:underline;padding:0;}
  [data-theme="dark"] .ud-row-article td{background:rgba(229,231,235,0.05);}
  .ud-date{white-space:nowrap;color:var(--ink-60);font-variant-numeric:tabular-nums;}
  .ud-case{white-space:nowrap;overflow:hidden;}
  .ud-party{color:var(--ink-60);font-size:13px;overflow:hidden;}
  .ud-party-empty{color:var(--ink-40);}
  .ud-entry{word-break:break-word;}
  .ud-desc{color:var(--ink);}
  .ud-desc-empty{color:var(--ink-40);}
  .ud-doc{white-space:nowrap;text-align:right;overflow:hidden;}
  .ud-landmark{display:inline-block;font-size:10px;font-weight:700;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-strong);padding:1px 6px;margin-right:4px;vertical-align:middle;border-radius:15px;}
  .ud-news-tag{display:inline-block;font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink);background:transparent;border:1px solid var(--ink);padding:1px 7px;margin-right:5px;vertical-align:middle;}
  .ud-new-pill{display:inline-block;font-size:9px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#0A0A0A;background:var(--neon);padding:1px 7px;margin-left:6px;vertical-align:middle;}
  #ud-sync{margin-left:10px;font-size:12px;}
  .ud-sync-live{color:var(--ink-60);}
  .ud-sync-live::before{content:"\25CF";color:var(--neon);margin-right:5px;font-size:10px;}
  .ud-sync-static{color:var(--ink-40);}
  .ud-link{color:var(--ink);font-weight:400;text-decoration:underline;}

  .ud-link-empty{color:var(--ink-60);font-size:inherit;}
  /* ── Shared restyle (ported from the docket): white light canvas, white rows
     with hover, ink header with a 2px rule, darker dividers + day lines,
     auto-fitting full-width table. Applies to every page on this chassis. ── */
  /* One opaque divider color on every row — translucent hairlines read darker
     over the gray article band than over white, which looked like mixed line
     weights. */
  [data-theme="light"] .ud-table tbody tr:not(.ud-day-row) td { border-bottom-color: #D4D5D9; }
  /* Action icons share one pitch across docket/news/notes: tight cell padding
     so the gap comes from the buttons, not the column share. */
  .ud-table td.ud-mark-cell, .ud-table th.ud-th-icon { padding-left: 3px; padding-right: 3px; width: 1%; }
  /* Breathing room between the filter controls and the first day divider. */
  .ud-toolbar { margin-bottom: 22px; }
  /* Mobile: no day dividers — each card shows its own date, like the
     calendar's list view. */
  @media (max-width: 720px) {
    .ud-table tbody tr.ud-day-row { display: none !important; }
    .ud-table td.ud-date[data-day]:not([data-day=""])::before { content: attr(data-day); margin-right: 7px; }
  }
  /* Header row: ink text (black in light, white in dark), no background bar —
     a thick ink rule under the row separates it from the entries, spanning the
     same width as the rows below. Active filters underline instead of recolor. */
  .ud-table thead th { background: transparent; border: none; border-bottom: 2px solid var(--ink); box-shadow: none; color: var(--ink); position: relative; z-index: 1; padding-top: 13px; padding-bottom: 13px; }
  /* The base chassis pins border-left/right on the end header cells with higher
     specificity than the border:none above — kill the vertical end ticks. */
  .ud-table thead th:first-child { border-left: none; }
  .ud-table thead th:last-child { border-right: none; }
  /* The table must always fill its container — saved column widths or engine
     quirks may otherwise shrink it to the sum of its columns. And auto layout
     (not the chassis's fixed) at every width: columns size to their content —
     the Dkt/agent/upload cell can never be clipped — and re-fit on resize,
     with ENTRY absorbing the remainder. */
  .ud-table { width: 100% !important; min-width: 100%; table-layout: auto; }
  .ud-th-menu-sep { border-top: 1px solid var(--line); margin: 4px 0; }
  @media (max-width: 720px) {
    .ud-table { background: transparent; border: none; }
    [data-theme="light"] .ud-table tbody tr { border-bottom-color: var(--line); }
    [data-theme="light"] .ud-table tbody tr.ud-day-row { border-bottom: 1px solid var(--line-strong); }
    [data-theme="light"] .ud-table tbody tr.ud-row-article { background: #E7E9EE; }
    [data-theme="dark"] .ud-table tbody tr { border-bottom-color: var(--bg); }
    #ud-count, #ud-hidden-info { display: none; }
    .ud-case-dd-panel, #ud-source-dd-panel, .ud-th-menu { position: fixed !important; top: auto !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; max-width: none !important; min-width: 0 !important; max-height: 72vh; overflow-y: auto; border-radius: 16px 16px 0 0 !important; box-shadow: 0 -10px 34px rgba(0,0,0,0.28) !important; padding-bottom: 20px !important; z-index: 1300 !important; }
  }
"""


# ── full case-page stylesheet (brand tokens; no f-string — CSS braces) ───────
PAGE_CSS = """<style>
  @media(min-width:920px){.wrap{grid-template-columns:1.9fr 1fr;align-items:start;}}
  @media(max-width:760px){.cards{grid-template-columns:1fr;}}
  @media(max-width:720px){table{table-layout:fixed;}td,th{overflow-wrap:break-word;word-break:break-word;}}
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

    # Theme tags are plain text now (theme dashboards are retired — briefings
    # are per-case; the nav's Briefings link covers navigation).
    topics = [t for t in cfg.get("topics", []) if t in TOPIC_META]
    also = ""
    if topics:
        # Admin toggle (themes.json show_emojis) governs baked theme labels too.
        try:
            _show_emj = json.loads((REPO_ROOT / "themes.json").read_text(
                encoding="utf-8")).get("show_emojis", True) is not False
        except Exception:
            _show_emj = True
        labels = ", ".join(
            (f'{TOPIC_META[t]["emoji"]} ' if _show_emj else "")
            + html_escape(TOPIC_META[t]["display"])
            for t in topics)
        also = f'<div class="also">Themes: {labels}</div>'

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

    _dstype = cfg["docket_source"]["type"]
    src_label = ("via CourtListener" if _dstype == "courtlistener"
                 else "web coverage only" if _dstype == "watch"
                 else "manual entry")
    rows = render_docket_rows(d.get("entries") or [])
    docket_foot = ""
    if d.get("docket_url") or cfg["docket_source"].get("url"):
        href = d.get("docket_url") or cfg["docket_source"]["url"]
        docket_foot = (f'<div class="panel-foot"><a href="{href}" target="_blank" rel="noopener">'
                       'View full docket on CourtListener →</a></div>')

    # A watch case has no docket by definition; an empty Docket table reads as a
    # broken sync rather than a deliberate choice.
    watch_only = _dstype == "watch" and not (d.get("entries") or [])
    docket_panel = (
        '<div class="panel">'
        '<div class="panel-head"><h2>Docket</h2>'
        f'<div class="meta">{counter_pill(data)}<span class="src">{src_label}</span></div></div>'
        '<table><thead><tr><th style="width:54px;">Dkt.</th><th style="width:104px;">Filed</th>'
        '<th>Entry</th></tr></thead><tbody>\n' + rows + '\n</tbody></table>'
        + docket_foot + '</div>'
    )
    if watch_only:
        docket_panel = (
            '<div class="panel">'
            '<div class="panel-head"><h2>Coverage-tracked</h2>'
            f'<div class="meta"><span class="src">{src_label}</span></div></div>'
            '<div class="empty">Followed by the news scan rather than a docket \u2014 '
            'updates come from published coverage.</div></div>'
        )

    coverage_html = render_coverage((data or {}).get("coverage") or [])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
{PWA_HEAD}
<title>{name} — Case Docket | Turnpage Intelligence</title>
{THEME_SCRIPT_SUBDIR}
<link rel="stylesheet" href="../intel-chrome.css">
<link rel="stylesheet" href="../intel-base.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<!-- AUTH GATE START -->
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF_SUBDIR}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{LOGO_SRC}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{LOGO_SRC_DARK}"></a>
      <a class="tn-back" href="{HOME_HREF_SUBDIR}">🏠 Dashboard</a>
      <a class="tn-back" href="../docket.html">⚖️ Docket</a>
      <a class="tn-back" href="../calendar.html">📅 Calendar</a>
      <a class="tn-back" href="../notes.html">🗒️ Notes</a>
      <a class="tn-back" href="../news.html">📡 News</a>
      <a class="tn-back" href="../prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌘</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">W</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><div class="tn-gear" id="tn-gear"><button type="button" class="tn-gear-btn" id="tn-gear-btn" title="Settings" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button><div class="tn-gear-panel"><a href="manage.html#cases">Cases</a><a href="manage.html#themes">Themes</a><a href="manage.html#groups">Groups</a><a href="manage.html#sources">Sources</a><a href="manage.html#voice">Voice</a><a href="manage.html#colors">Colors</a></div></div><button id="theme-toggle">🖥️</button>
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

<footer id="tn-site-footer"></footer>
<script src="../intel-footer.js"></script>
</body>
</html>
"""


# Docket-only light-mode restyle: dashboard-style gray canvas, white entry rows,
# gray news rows, and a floating neumorphic header. Every rule is
# [data-theme="light"]-scoped so dark mode is untouched. Mirror of the same
# <style> block in docket.html — keep the two in sync.
DOCKET_LIGHT_CSS = """<style>
  #ud-filter-btn { display: none; align-items: center; gap: 7px; font-family: inherit; font-size: 14px; font-weight: 700; padding: 9px 16px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 999px; color: var(--ink); cursor: pointer; }
  #ud-filter-btn.on { border-color: var(--ink); }
  #ud-filter-btn .ud-fb-badge { background: var(--ink); color: var(--bg); border-radius: 999px; font-size: 11px; font-weight: 800; padding: 1px 7px; }
  .ud-clear-filters { display: none; background: none; border: none; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--ink-60); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; padding: 4px 2px; }
  .ud-clear-filters:hover { color: var(--ink); }
  .ud-fm-overlay { position: fixed; inset: 0; z-index: 1200; background: rgba(10,10,10,0.42); display: flex; align-items: flex-end; }
  .ud-fm-sheet { background: var(--surface); width: 100%; max-height: 88vh; overflow-y: auto; border-radius: 18px 18px 0 0; box-shadow: 0 -12px 40px rgba(0,0,0,0.3); }
  .ud-fm-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; position: sticky; top: 0; background: var(--surface); border-bottom: 1px solid var(--line); }
  .ud-fm-head h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--ink); }
  .ud-fm-x { background: none; border: none; font-size: 24px; line-height: 1; color: var(--ink-60); cursor: pointer; padding: 2px 6px; }
  .ud-fm-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 15px 18px; background: none; border: none; border-bottom: 1px solid var(--line); font-family: inherit; font-size: 15px; color: var(--ink); cursor: pointer; text-align: left; }
  .ud-fm-row .ud-fm-label { font-weight: 700; }
  .ud-fm-row .ud-fm-val { margin-left: auto; color: var(--ink-60); font-size: 14px; display: flex; align-items: center; gap: 6px; }
  .ud-fm-row .ud-fm-val.on { color: var(--ink); font-weight: 700; }
  .ud-fm-chev { color: var(--ink-40); }
  .ud-fm-toggle { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
  .ud-fm-toggle .ud-fm-label { font-weight: 700; margin-right: auto; color: var(--ink); }
  .ud-fm-sw { width: 44px; height: 26px; border-radius: 999px; background: var(--line-strong); position: relative; transition: background .15s; flex: 0 0 auto; cursor: pointer; }
  .ud-fm-sw.on { background: #3FA07A; }
  .ud-fm-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .15s; }
  .ud-fm-sw.on::after { left: 21px; }
  .ud-fm-foot { display: flex; gap: 10px; padding: 16px 18px 22px; }
  .ud-fm-foot button { flex: 1; font-family: inherit; font-size: 15px; font-weight: 700; padding: 13px; border-radius: 12px; cursor: pointer; }
  .ud-fm-reset { background: var(--surface); border: 1px solid var(--line-strong); color: var(--ink); }
  .ud-fm-done { background: var(--ink); border: 1px solid var(--ink); color: var(--bg); }
  @media (max-width: 720px) {
    #ud-filter-btn { display: inline-flex; }
    .ud-clear-filters { display: block; margin: 4px 2px 0; }
  }
  /* Row-action icons (bookmark/snooze/hide/delete/note) collapse into one ⋮
     menu per row on narrow table layouts (721–1080px); full icons elsewhere,
     mobile cards untouched. td.ud-more-cell carries extra specificity so the
     mobile ".ud-table td{display:inline-block}" rule can't unhide it. */
  /* Outside the narrow band the ⋮ column must not exist visually — but under
     table-layout:fixed a display:none column STILL takes an auto share of the
     table width (it swallowed ~500px of dead space on desktop). Zero-width it
     instead, so ENTRY is the only flexible column. */
  .ud-table td.ud-more-cell, .ud-table th.ud-th-more { width: 0 !important; max-width: 0; padding: 0 !important; border: none !important; overflow: hidden; text-align: center; white-space: nowrap; }
  .ud-table td.ud-more-cell .ud-more-btn { display: none; }
  .ud-more-btn { background: none; border: none; color: var(--ink-60); font-size: 17px; font-weight: 700; cursor: pointer; padding: 2px 8px; line-height: 1; }
  .ud-more-btn:hover { color: var(--ink); }
  .ud-more-menu { position: fixed; z-index: 1400; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); padding: 4px; min-width: 170px; display: none; }
  .ud-more-menu button { display: flex; align-items: center; gap: 9px; width: 100%; background: none; border: none; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--ink); cursor: pointer; padding: 8px 10px; text-align: left; border-radius: 15px; }
  .ud-more-menu button:hover { background: var(--paper-2); }
  @media (min-width: 721px) and (max-width: 1080px) {
    /* auto layout: with the icon columns display:none they truly collapse —
       under the base table-layout:fixed the hidden columns still ate width. */
    .ud-table { table-layout: auto; }
    .ud-table td.ud-mark-cell, .ud-table th.ud-th-icon { display: none; }
    .ud-table td.ud-more-cell, .ud-table th.ud-th-more { width: 36px !important; max-width: none; padding: 8px 6px !important; overflow: visible; }
    .ud-table th.ud-th-more { border-bottom: 2px solid var(--ink) !important; }
    .ud-table td.ud-more-cell { border-bottom: 1px solid var(--line) !important; }
    .ud-table td.ud-more-cell .ud-more-btn { display: inline-block; }
    /* Slim the fixed columns so ENTRY stays readable (!important beats the
       inline base widths + drag-to-resize prefs). */
    .ud-table th#ud-th-time { width: 64px !important; }
    .ud-table th#ud-th-case { width: 118px !important; }
    .ud-table th#ud-th-source { width: 110px !important; }
    .ud-table th#ud-th-doc { width: 118px !important; }
    .ud-table td.ud-doc { white-space: normal; }
  }
  /* Landscape phones (wide enough for the table, too tight for every column):
     drop AUTHOR (usually em-dash) and slim the fixed widths so ENTRY can breathe. */
  @media (min-width: 721px) and (max-height: 520px) {
    .ud-table th#ud-th-source, .ud-table td.ud-party { display: none; }
    /* !important: the th widths are inline (base HTML + drag-to-resize prefs) */
    .ud-table th#ud-th-time { width: 64px !important; }
    .ud-table th#ud-th-case { width: 110px !important; }
    .ud-table th#ud-th-doc { width: 110px !important; }
    .ud-table td.ud-doc { white-space: normal; }
  }
</style>"""


# ── 3) unified docket page ────────────────────────────────────────────────────

# Distinct pill colors: (bg-light, fg-light, bg-dark, fg-dark)
_PILL_PALETTE = [
    ("#D4FF00", "#0A0A0A", "#D4FF00", "#0A0A0A"),
    ("#94C6F8", "#0A0A0A", "#3B78D8", "#FFFFFF"),
    ("#B3A8F0", "#0A0A0A", "#4A3DE0", "#FFFFFF"),
    ("#7EF4C2", "#0A0A0A", "#3FA07A", "#FFFFFF"),
    ("#F2AAEC", "#0A0A0A", "#CC33CC", "#FFFFFF"),
    ("#1B3A4B", "#FFFFFF", "#1B3A4B", "#FFFFFF"),
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
    """Generate briefing-generator/docket.html (shell) + cases/data/_manifest.json."""
    live = [c for c in cases if c["data"] and not _docket(c["data"]).get("awaiting_sync")]
    # Manifest includes ALL cases that have a data file, so awaiting-sync cases
    # appear as chip options in the UI immediately after admin creates them.
    all_with_data = [c for c in cases if c["data"] is not None]

    # Write _manifest.json — lightweight case metadata consumed by JS at runtime.
    # Existing default_color values are preserved (they're editable from the
    # docket page's color popover) — the palette only seeds new cases.
    prior_colors = {}
    manifest_path_prev = DATA_DIR / "_manifest.json"
    if manifest_path_prev.exists():
        try:
            for entry in json.loads(manifest_path_prev.read_text(encoding="utf-8")):
                if entry.get("slug") and entry.get("default_color"):
                    prior_colors[entry["slug"]] = entry["default_color"]
        except Exception:
            pass
    manifest = []
    for i, c in enumerate(all_with_data):
        d = _docket(c["data"])
        bl = prior_colors.get(c["slug"]) or _PILL_PALETTE[i % len(_PILL_PALETTE)][0]
        manifest.append({
            "slug": c["slug"],
            "added": c["config"].get("added") or "",
            "display_name": c["config"]["display_name"],
            "short_name": (c["config"].get("short_name") or "").strip() or c["config"]["display_name"],
            "docket_url": d.get("docket_url") or c["config"]["docket_source"].get("url") or "",
            "default_color": bl,
            "category": _case_category(c["config"].get("topics") or []),
            "topics": c["config"].get("topics") or [],
            "court": (c["config"].get("case") or {}).get("court") or "",
            "sync": c["config"].get("sync", "active"),
            "docket_history": c["config"].get("docket_history", "full"),
        })

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = DATA_DIR / "_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ cases/data/_manifest.json: {len(manifest)} cases ({len(live)} live, {len(all_with_data)-len(live)} awaiting sync)")

    if not live:
        print("  · docket.html: no live cases — writing empty shell")

    logo_src = "assets/turnpage-intel-logo.png"
    logo_src_dark = "assets/turnpage-intel-logo-dark.png"

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
{PWA_HEAD}
<title>Docket — Turnpage Intelligence</title>
{THEME_SCRIPT}
<link rel="stylesheet" href="intel-chrome.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
</style>
{DOCKET_LIGHT_CSS}
<!-- AUTH GATE START -->
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{logo_src}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{logo_src_dark}"></a>
      <a class="tn-back" href="{HOME_HREF}">🏠 Dashboard</a>
      <a class="tn-back" href="docket.html">⚖️ Docket</a>
      <a class="tn-back" href="calendar.html">📅 Calendar</a>
      <a class="tn-back" href="notes.html">🗒️ Notes</a>
      <a class="tn-back" href="news.html">📡 News</a>
      <a class="tn-back" href="prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌘</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">W</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><div class="tn-gear" id="tn-gear"><button type="button" class="tn-gear-btn" id="tn-gear-btn" title="Settings" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button><div class="tn-gear-panel"><a href="manage.html#cases">Cases</a><a href="manage.html#themes">Themes</a><a href="manage.html#groups">Groups</a><a href="manage.html#sources">Sources</a><a href="manage.html#voice">Voice</a><a href="manage.html#colors">Colors</a></div></div><button id="theme-toggle">🖥️</button>
  </div>
</nav>

<div class="page-title">
  <h1>⚖️ Docket</h1>
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
  <button id="ud-pop-default" class="ud-pop-reset" style="margin-top:8px;">Set as default color</button>
  <button id="ud-pop-palette" class="ud-pop-reset" style="margin-top:8px;">Edit palette…</button>
  <button id="ud-pop-edit" class="ud-pop-reset" style="margin-top:8px;">Edit case details…</button>
</div>

<!-- Note modal -->
<div id="ud-note-overlay" class="ud-note-overlay" style="display:none;">
  <div class="ud-note-box">
    <div class="ud-note-title" id="ud-note-title"></div>
    <div class="ud-note-meta" id="ud-note-meta"></div>
    <input type="text" id="ud-note-titlefield" class="ud-note-titlefield" placeholder="Title (optional — defaults to the note's first few words)" maxlength="200">
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

<!-- Case editor modal -->
<div id="ud-case-overlay" class="ud-note-overlay" style="display:none;">
  <div class="ud-note-box" style="width:min(720px,100%);">
    <div class="ud-note-title" id="ud-case-title">Add a case</div>
    <div class="ud-case-grid">
      <label>Display name<input type="text" id="cf-name" class="ud-dd-save-input" placeholder="e.g. Terraform Labs"></label>
      <label>CourtListener docket ID
        <span class="ud-case-lookup-row">
          <input type="text" id="cf-docket-id" class="ud-dd-save-input" placeholder="e.g. 68180454">
          <button type="button" id="cf-lookup" class="ud-dd-save-btn">Look up</button>
        </span>
      </label>
      <label>Parties<input type="text" id="cf-parties" class="ud-dd-save-input"></label>
      <label>Court<input type="text" id="cf-court" class="ud-dd-save-input"></label>
      <label>Case number<input type="text" id="cf-number" class="ud-dd-save-input"></label>
      <label>Judge<input type="text" id="cf-judge" class="ud-dd-save-input"></label>
      <label class="ud-case-wide">Claims agent URL (optional)<input type="text" id="cf-claims" class="ud-dd-save-input" placeholder="https://cases.omniagentsolutions.com/…"></label>
      <label class="ud-case-wide">Themes<span id="cf-topics" class="ud-case-topics"></span></label>
      <label class="ud-case-wide">Scan guidance (optional)<textarea id="cf-guidance" class="ud-note-text" style="min-height:64px;" placeholder="What should the news scan and briefings focus on?"></textarea></label>
    </div>
    <div class="ud-note-actions">
      <span id="cf-status" class="ud-note-status"></span>
      <span style="flex:1"></span>
      <button type="button" id="cf-cancel" class="ud-clear-btn">Cancel</button>
      <button type="button" id="cf-save" class="ud-dd-save-btn">Save case</button>
    </div>
  </div>
</div>

<!-- Entry-type header menu (positioned under the Entry column header) -->
<div id="ud-th-menu" class="ud-th-menu" style="display:none;">
  <button type="button" class="ud-th-menu-item" data-val="all">All entries</button>
  <button type="button" class="ud-th-menu-item" data-val="substantive">Substantive only</button>
  <button type="button" class="ud-th-menu-item" data-val="orders">Orders only</button>
  <button type="button" class="ud-th-menu-item" data-val="transfers">Transfers only</button>
</div>

<div id="ud-th-docmenu" class="ud-th-menu" style="display:none;">
  <button type="button" class="ud-th-menu-item" data-val="all">All</button>
  <button type="button" class="ud-th-menu-item" data-val="with">Doc only</button>
  <button type="button" class="ud-th-menu-item" data-val="without">No doc only</button>
</div>

<div id="ud-th-timemenu" class="ud-th-menu" style="display:none;">
  <button type="button" class="ud-th-menu-item" data-val="24h">Last 24 hours</button>
  <button type="button" class="ud-th-menu-item" data-val="7d">Last 7 days</button>
  <button type="button" class="ud-th-menu-item" data-val="30d">Last 30 days</button>
  <button type="button" class="ud-th-menu-item" data-val="90d">Last 90 days</button>
  <button type="button" class="ud-th-menu-item" data-val="custom">Set custom date range…</button>
  <div class="ud-th-menu-sep"></div>
  <button type="button" class="ud-th-menu-item" data-sort="desc">Sort — newest first</button>
  <button type="button" class="ud-th-menu-item" data-sort="asc">Sort — oldest first</button>
</div>

<div class="ud-page">

  <div id="ud-due" class="ud-due" style="display:none;"></div>

  <div class="ud-controls">
    <div class="ud-search-row">
      <div class="ud-search-wrap">
        <input type="text" id="ud-search" class="ud-search-input" placeholder="Search entries, parties, dates…">
      </div>
      <button id="ud-clear-search" class="ud-clear-btn">× Clear</button>
    </div>
    <div class="ud-filter-row">
      <div class="ud-case-dd" id="ud-case-dd">
        <div id="ud-case-dd-panel" class="ud-case-dd-panel" style="display:none;"></div>
      </div>
      <div class="ud-filter-right">
        <select id="ud-rowkind" class="ud-type-select" title="What to show">
          <option value="both">Filings + news</option>
          <option value="filings">Filings only</option>
        </select>
      </div>
    </div>
  </div>

  <div class="ud-toolbar">
    <span class="ud-lookback-box">
      <span id="ud-lookback-label">Last 90 days</span>
      <span class="ud-date-range" id="ud-date-range" style="display:none;">
        <span class="ud-date-sep">·</span>
        <input type="date" id="ud-date-from" class="ud-date-input" aria-label="From date">
        <span class="ud-date-sep">–</span>
        <input type="date" id="ud-date-to" class="ud-date-input" aria-label="To date">
      </span>
    </span>
    <span id="ud-count"></span>
    <span id="ud-hidden-info" class="uc-curation-info"></span>
  </div>

  <table class="ud-table">
    <thead><tr>
      <th id="ud-th-time" class="ud-th-filter" style="width:82px" title="Change the lookback window"><span class="ud-th-label">Time</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-case" class="ud-th-filter" style="width:150px" title="Select cases"><span class="ud-th-label">Case</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-source" class="ud-th-filter" style="width:150px" title="Show or hide news sources"><span class="ud-th-label">Author</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-entry" class="ud-th-filter" title="Filter by entry type"><span class="ud-th-label">Entry</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-doc" class="ud-th-filter" style="width:132px;text-align:right" title="Filter by attached document"><span class="ud-th-label">Dkt.</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-bm" class="ud-th-toggle ud-th-icon" style="width:26px;text-align:center" title="Show bookmarked only">★</th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Snoozed reminders"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Hide rows (H)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Delete rows (X)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></th>
      <th id="ud-th-note" class="ud-th-toggle ud-th-icon" style="width:44px;text-align:center" title="Show entries with notes only"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></th>
      <th id="ud-th-more" class="ud-th-more" style="width:36px;text-align:center" title="Row actions"></th>
    </tr></thead>
    <tbody id="ud-tbody">
      <tr><td colspan="11" class="ud-empty">Loading…</td></tr>
    </tbody>
  </table>

</div>

<script src="intel-sync.js"></script>
<script src="docket.js"></script>

<footer id="tn-site-footer"></footer>
<script src="intel-footer.js"></script>
</body>
</html>
"""

    out = REPO_ROOT / "docket.html"
    out.write_text(page, encoding="utf-8")
    print(f"  ✓ docket.html: shell written ({len(live)} live cases in manifest)")


def render_news_page(cases):
    """Generate briefing-generator/docket.html (shell) + cases/data/_manifest.json."""
    live = [c for c in cases if c["data"] and not _docket(c["data"]).get("awaiting_sync")]
    # Manifest includes ALL cases that have a data file, so awaiting-sync cases
    # appear as chip options in the UI immediately after admin creates them.
    all_with_data = [c for c in cases if c["data"] is not None]

    # Write _manifest.json — lightweight case metadata consumed by JS at runtime.
    # Existing default_color values are preserved (they're editable from the
    # docket page's color popover) — the palette only seeds new cases.
    prior_colors = {}
    manifest_path_prev = DATA_DIR / "_manifest.json"
    if manifest_path_prev.exists():
        try:
            for entry in json.loads(manifest_path_prev.read_text(encoding="utf-8")):
                if entry.get("slug") and entry.get("default_color"):
                    prior_colors[entry["slug"]] = entry["default_color"]
        except Exception:
            pass
    manifest = []
    for i, c in enumerate(all_with_data):
        d = _docket(c["data"])
        bl = prior_colors.get(c["slug"]) or _PILL_PALETTE[i % len(_PILL_PALETTE)][0]
        manifest.append({
            "slug": c["slug"],
            "added": c["config"].get("added") or "",
            "display_name": c["config"]["display_name"],
            "short_name": (c["config"].get("short_name") or "").strip() or c["config"]["display_name"],
            "docket_url": d.get("docket_url") or c["config"]["docket_source"].get("url") or "",
            "default_color": bl,
            "category": _case_category(c["config"].get("topics") or []),
            "topics": c["config"].get("topics") or [],
            "court": (c["config"].get("case") or {}).get("court") or "",
            "sync": c["config"].get("sync", "active"),
            "docket_history": c["config"].get("docket_history", "full"),
        })

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = DATA_DIR / "_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ cases/data/_manifest.json: {len(manifest)} cases ({len(live)} live, {len(all_with_data)-len(live)} awaiting sync)")

    if not live:
        print("  · docket.html: no live cases — writing empty shell")

    logo_src = "assets/turnpage-intel-logo.png"
    logo_src_dark = "assets/turnpage-intel-logo-dark.png"

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
{PWA_HEAD}
<title>News — Turnpage Intelligence</title>
{THEME_SCRIPT}
<link rel="stylesheet" href="intel-chrome.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
/* News page: every row IS an article, so the gray "article band" carries no
   signal here — plain surface in light mode, dark gray retained in dark.
   The docket keeps the band to separate articles from filings. */
[data-theme="light"] .ud-table tbody tr.ud-row-article td,
[data-theme="light"] .ud-table tbody tr.ud-row-article {{ background: var(--surface); }}
[data-theme="light"] .ud-table tbody tr.ud-row-article:hover td {{ background: linear-gradient(rgba(10,10,10,0.03), rgba(10,10,10,0.03)), var(--surface); }}
</style>
<!-- AUTH GATE START -->
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{logo_src}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{logo_src_dark}"></a>
      <a class="tn-back" href="{HOME_HREF}">🏠 Dashboard</a>
      <a class="tn-back" href="docket.html">⚖️ Docket</a>
      <a class="tn-back" href="calendar.html">📅 Calendar</a>
      <a class="tn-back" href="notes.html">🗒️ Notes</a>
      <a class="tn-back" href="news.html">📡 News</a>
      <a class="tn-back" href="prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌘</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">W</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><div class="tn-gear" id="tn-gear"><button type="button" class="tn-gear-btn" id="tn-gear-btn" title="Settings" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button><div class="tn-gear-panel"><a href="manage.html#cases">Cases</a><a href="manage.html#themes">Themes</a><a href="manage.html#groups">Groups</a><a href="manage.html#sources">Sources</a><a href="manage.html#voice">Voice</a><a href="manage.html#colors">Colors</a></div></div><button id="theme-toggle">🖥️</button>
  </div>
</nav>

<div class="page-title">
  <h1>📡 News</h1>
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
  <button id="ud-pop-default" class="ud-pop-reset" style="margin-top:8px;">Set as default color</button>
  <button id="ud-pop-palette" class="ud-pop-reset" style="margin-top:8px;">Edit palette…</button>
  <button id="ud-pop-edit" class="ud-pop-reset" style="margin-top:8px;">Edit case details…</button>
</div>

<!-- Note modal -->
<div id="ud-note-overlay" class="ud-note-overlay" style="display:none;">
  <div class="ud-note-box">
    <div class="ud-note-title" id="ud-note-title"></div>
    <div class="ud-note-meta" id="ud-note-meta"></div>
    <input type="text" id="ud-note-titlefield" class="ud-note-titlefield" placeholder="Title (optional — defaults to the note's first few words)" maxlength="200">
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

<!-- Case editor modal -->
<div id="ud-case-overlay" class="ud-note-overlay" style="display:none;">
  <div class="ud-note-box" style="width:min(720px,100%);">
    <div class="ud-note-title" id="ud-case-title">Add a case</div>
    <div class="ud-case-grid">
      <label>Display name<input type="text" id="cf-name" class="ud-dd-save-input" placeholder="e.g. Terraform Labs"></label>
      <label>CourtListener docket ID
        <span class="ud-case-lookup-row">
          <input type="text" id="cf-docket-id" class="ud-dd-save-input" placeholder="e.g. 68180454">
          <button type="button" id="cf-lookup" class="ud-dd-save-btn">Look up</button>
        </span>
      </label>
      <label>Parties<input type="text" id="cf-parties" class="ud-dd-save-input"></label>
      <label>Court<input type="text" id="cf-court" class="ud-dd-save-input"></label>
      <label>Case number<input type="text" id="cf-number" class="ud-dd-save-input"></label>
      <label>Judge<input type="text" id="cf-judge" class="ud-dd-save-input"></label>
      <label class="ud-case-wide">Claims agent URL (optional)<input type="text" id="cf-claims" class="ud-dd-save-input" placeholder="https://cases.omniagentsolutions.com/…"></label>
      <label class="ud-case-wide">Themes<span id="cf-topics" class="ud-case-topics"></span></label>
      <label class="ud-case-wide">Scan guidance (optional)<textarea id="cf-guidance" class="ud-note-text" style="min-height:64px;" placeholder="What should the news scan and briefings focus on?"></textarea></label>
    </div>
    <div class="ud-note-actions">
      <span id="cf-status" class="ud-note-status"></span>
      <span style="flex:1"></span>
      <button type="button" id="cf-cancel" class="ud-clear-btn">Cancel</button>
      <button type="button" id="cf-save" class="ud-dd-save-btn">Save case</button>
    </div>
  </div>
</div>

<!-- Entry-type header menu (positioned under the Entry column header) -->
<div id="ud-th-menu" class="ud-th-menu" style="display:none;">
  <button type="button" class="ud-th-menu-item" data-val="all">All entries</button>
  <button type="button" class="ud-th-menu-item" data-val="substantive">Substantive only</button>
  <button type="button" class="ud-th-menu-item" data-val="orders">Orders only</button>
  <button type="button" class="ud-th-menu-item" data-val="transfers">Transfers only</button>
</div>

<div id="ud-th-timemenu" class="ud-th-menu" style="display:none;">
  <button type="button" class="ud-th-menu-item" data-val="all">All time</button>
  <button type="button" class="ud-th-menu-item" data-val="24h">Last 24 hours</button>
  <button type="button" class="ud-th-menu-item" data-val="7d">Last 7 days</button>
  <button type="button" class="ud-th-menu-item" data-val="30d">Last 30 days</button>
  <button type="button" class="ud-th-menu-item" data-val="90d">Last 90 days</button>
  <button type="button" class="ud-th-menu-item" data-val="custom">Set custom date range…</button>
  <div class="ud-th-menu-sep"></div>
  <button type="button" class="ud-th-menu-item" data-sort="desc">Sort — newest first</button>
  <button type="button" class="ud-th-menu-item" data-sort="asc">Sort — oldest first</button>
</div>

<div class="ud-page">

  <div id="ud-due" class="ud-due" style="display:none;"></div>

  <div class="ud-controls">
    <div class="ud-search-row">
      <div class="ud-search-wrap">
        <input type="text" id="ud-search" class="ud-search-input" placeholder="Search entries, parties, dates…">
      </div>
      <button id="ud-clear-search" class="ud-clear-btn">× Clear</button>
    </div>
    <div class="ud-filter-row">
      <div class="ud-case-dd" id="ud-case-dd">
        <div id="ud-case-dd-panel" class="ud-case-dd-panel" style="display:none;"></div>
      </div>
      <div class="ud-filter-right">
        <select id="ud-related" class="ud-type-select" title="Show every scanned headline, or only those tagged to a case or theme">
          <option value="all">All news</option>
          <option value="related">Cases &amp; themes only</option>
        </select>
      </div>
    </div>
  </div>

  <div class="ud-toolbar">
    <span class="ud-lookback-box">
      <span id="ud-lookback-label">All time</span>
      <span class="ud-date-range" id="ud-date-range" style="display:none;">
        <span class="ud-date-sep">·</span>
        <input type="date" id="ud-date-from" class="ud-date-input" aria-label="From date">
        <span class="ud-date-sep">–</span>
        <input type="date" id="ud-date-to" class="ud-date-input" aria-label="To date">
      </span>
    </span>
    <span id="ud-count"></span>
    <span id="ud-hidden-info" class="uc-curation-info"></span>
  </div>

  <table class="ud-table">
    <thead><tr>
      <th id="ud-th-time" class="ud-th-filter" style="width:82px" title="Change the lookback window"><span class="ud-th-label">Time</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-case" class="ud-th-filter" style="width:150px" title="Select cases"><span class="ud-th-label">Case</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-source" class="ud-th-filter" style="width:150px" title="Show or hide news sources"><span class="ud-th-label">Author</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-entry" class="ud-th-filter" title="Filter by story type"><span class="ud-th-label">Entry</span> <span class="ud-th-caret">▾</span></th>
      <th style="width:132px;text-align:right">Dkt.</th>
      <th id="ud-th-bm" class="ud-th-toggle ud-th-icon" style="width:26px;text-align:center" title="Show bookmarked only">★</th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Snoozed reminders"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Hide rows (H)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Delete rows (X)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></th>
      <th id="ud-th-note" class="ud-th-toggle ud-th-icon" style="width:44px;text-align:center" title="Show entries with notes only"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></th>
      <th class="ud-th-icon" style="width:30px;text-align:center" title="Draft social post"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></th>
    </tr></thead>
    <tbody id="ud-tbody">
      <tr><td colspan="11" class="ud-empty">Loading…</td></tr>
    </tbody>
  </table>

</div>

<script src="news.js"></script>

<footer id="tn-site-footer"></footer>
<script src="intel-footer.js"></script>
</body>
</html>
"""

    out = REPO_ROOT / "news.html"
    out.write_text(page, encoding="utf-8")
    print(f"  ✓ news.html: shell written")




def render_unified_calendar(cases):
    """Generate briefing-generator/unified-calendar.html — hearings & deadlines
    parsed client-side (unified-calendar.js) from the same case data the
    unified docket uses. Shares UD_CSS, theme.js, colors, and saved groups."""
    logo_src = "assets/turnpage-intel-logo.png"
    logo_src_dark = "assets/turnpage-intel-logo-dark.png"

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
{PWA_HEAD}
<title>Calendar — Turnpage Intelligence</title>
{THEME_SCRIPT}
<link rel="stylesheet" href="intel-chrome.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
  .uc-rel-cell{{white-space:nowrap;}}
  .uc-rel{{font-size:12px;font-weight:700;color:var(--ink-60);}}
  .uc-kind{{display:inline-block;font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-strong);padding:2px 8px;margin-right:6px;vertical-align:middle;white-space:nowrap;}}
  .uc-snippet{{color:var(--ink-60);font-size:inherit;}}
  .uc-mode{{display:inline-flex;gap:8px;margin-right:8px;}}
  .uc-mode button{{font-family:inherit;font-size:12px;font-weight:700;padding:7px 14px;background:transparent;border:1px solid var(--line-strong);color:var(--ink-60);cursor:pointer;transition:background .15s,color .15s,border-color .15s;}}
  .uc-mode button:hover{{background:var(--paper-2);color:var(--ink);}}
  .uc-mode button.uc-mode-on{{background:var(--sel-bg,#0A0A0A);border-color:var(--sel-bg,#0A0A0A);color:var(--sel-fg,#fff);}}
  .uc-cal-head{{display:flex;align-items:center;gap:8px;margin:14px 0 10px;}}
  .uc-cal-label{{font-size:16px;font-weight:800;letter-spacing:-0.01em;}}
  .uc-cal-nav{{font-family:inherit;font-size:13px;font-weight:700;padding:4px 10px;background:transparent;border:1px solid var(--line-strong);color:var(--ink);cursor:pointer;}}
  .uc-cal-nav:hover{{background:var(--paper-2);}}
  .uc-cal-note{{font-size:11px;color:var(--ink-40);margin-left:auto;letter-spacing:0.03em;}}
  .uc-cal-grid{{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid var(--line-strong);border-top:1px solid var(--line-strong);}}
  .uc-cal-dow{{border:0;}}
  .uc-cal-dow div{{font-size:11px;font-weight:800;letter-spacing:0.05em;color:var(--ink-40);padding:4px 8px;border:0;}}
  .uc-cal-cell{{min-height:86px;padding:5px 6px;border-right:1px solid var(--line-strong);border-bottom:1px solid var(--line-strong);overflow:hidden;}}
  .uc-cal-out{{background:var(--paper-2);}}
  .uc-cal-today-cell{{outline:2px solid var(--neon);outline-offset:-2px;}}
  .uc-cal-daynum{{display:block;text-align:right;font-size:11.5px;font-weight:800;color:var(--ink-60);cursor:pointer;}}
  .uc-cal-daynum:hover{{color:var(--ink);}}
  .uc-cal-out .uc-cal-daynum{{color:var(--ink-40);cursor:default;}}
  .uc-cal-chip{{display:block;font-size:10.5px;font-weight:700;padding:2px 6px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;}}
  .uc-cal-more{{display:block;font-size:10.5px;font-weight:700;color:var(--ink-60);margin-top:3px;cursor:pointer;}}
  .uc-cal-more:hover{{color:var(--ink);}}
  .uc-week-grid{{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid var(--line-strong);border-top:1px solid var(--line-strong);}}
  .uc-week-col{{min-height:200px;padding:6px;border-right:1px solid var(--line-strong);border-bottom:1px solid var(--line-strong);}}
  .uc-week-dow{{font-size:11px;font-weight:800;letter-spacing:0.05em;color:var(--ink-60);margin-bottom:6px;}}
  .uc-week-card{{border:none;border-left:3px solid var(--line-strong);padding:6px 7px;margin-bottom:6px;background:var(--surface);cursor:pointer;}}
  .uc-week-card .ud-pill{{font-size:10px;}}
  .uc-selall-btn{{background:none;border:none;cursor:pointer;padding:2px 4px;line-height:1;color:var(--ink-40);vertical-align:middle;}}
  .uc-selall-btn:hover{{color:var(--ink);}}
  .uc-selall-btn.uc-selall-on{{color:var(--ink);}}
  .uc-selall-btn.uc-selall-some{{color:var(--ink-60);}}
  .uc-week-kind{{font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;margin-top:4px;}}
  .uc-week-snip{{font-size:11px;color:var(--ink-60);line-height:1.4;margin-top:3px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}}
  .uc-week-links{{font-size:11.5px;margin-top:5px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;}}
  @media (max-width:900px){{.uc-week-grid{{grid-template-columns:1fr;}}.uc-week-col{{min-height:0;}}}}
</style>
<!-- AUTH GATE START -->
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{logo_src}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{logo_src_dark}"></a>
      <a class="tn-back" href="{HOME_HREF}">🏠 Dashboard</a>
      <a class="tn-back" href="docket.html">⚖️ Docket</a>
      <a class="tn-back" href="calendar.html">📅 Calendar</a>
      <a class="tn-back" href="notes.html">🗒️ Notes</a>
      <a class="tn-back" href="news.html">📡 News</a>
      <a class="tn-back" href="prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌘</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">W</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><div class="tn-gear" id="tn-gear"><button type="button" class="tn-gear-btn" id="tn-gear-btn" title="Settings" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button><div class="tn-gear-panel"><a href="manage.html#cases">Cases</a><a href="manage.html#themes">Themes</a><a href="manage.html#groups">Groups</a><a href="manage.html#sources">Sources</a><a href="manage.html#voice">Voice</a><a href="manage.html#colors">Colors</a></div></div><button id="theme-toggle">🖥️</button>
  </div>
</nav>

<div class="page-title">
  <h1>📅 Calendar</h1>
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
      <div class="ud-filter-right"></div>
    </div>
  </div>

  <div class="ud-toolbar">
    <span class="ud-lookback-box">
      <span id="ud-lookback-label">Upcoming</span>
      <span class="ud-date-range" id="ud-daterange" style="display:none;">
        <span class="ud-date-sep">·</span>
        <input type="date" id="ud-date-from" class="ud-date-input" aria-label="From date">
        <span class="ud-date-sep">–</span>
        <input type="date" id="ud-date-to" class="ud-date-input" aria-label="To date">
      </span>
    </span>
    <span id="ud-count"></span>
    <span id="uc-curation-info" class="uc-curation-info"></span>
  </div>

  <div id="uc-merge-bar" class="uc-merge-bar" style="display:none;">
    <span id="uc-merge-count"></span>
    <button type="button" id="uc-merge-btn" class="ud-dd-save-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px"><path d="M5 2.6 10 7.4" stroke-width="2.6" stroke-dasharray="2.4 2.1"/><path d="M19 2.6 14 7.4" stroke-width="2.6" stroke-dasharray="2.4 2.1"/><circle cx="12" cy="10.6" r="2.9" fill="currentColor" stroke="none"/><path d="M9.3 11h5.4l-.9 4.4h-3.6z" fill="currentColor" stroke="none"/><rect x="11" y="12.1" width="2" height="1.8" rx="0.5" fill="var(--surface,#fff)" stroke="none"/><path d="M12 17.2v5.4" stroke-width="4.2" stroke-dasharray="1.7 1.6" stroke-linecap="butt"/></svg>Merge into one event</button>
    <button type="button" id="uc-dismiss-btn" class="ud-clear-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>Dismiss selected</button>
    <button type="button" id="uc-clear-sel" class="ud-clear-btn">Clear</button>
  </div>

<div id="ud-th-timemenu" class="ud-th-menu" style="display:none;">
  <button type="button" class="ud-th-menu-item" data-scope="upcoming" data-val="7d">Next 7 days</button>
  <button type="button" class="ud-th-menu-item" data-scope="upcoming" data-val="30d">Next 30 days</button>
  <button type="button" class="ud-th-menu-item" data-scope="upcoming" data-val="90d">Next 90 days</button>
  <button type="button" class="ud-th-menu-item" data-scope="upcoming" data-val="all">All upcoming</button>
  <button type="button" class="ud-th-menu-item" data-scope="past" data-val="all">Past only</button>
  <button type="button" class="ud-th-menu-item" data-scope="all" data-val="all">All dates</button>
  <button type="button" class="ud-th-menu-item" data-scope="all" data-val="custom">Set custom date range…</button>
  <div class="ud-th-menu-sep"></div>
  <button type="button" class="ud-th-menu-item" data-sort="asc">Sort — soonest first</button>
  <button type="button" class="ud-th-menu-item" data-sort="desc">Sort — latest first</button>
</div>

  <table class="ud-table">
    <thead><tr>
      <th id="ud-th-time" class="ud-th-filter" style="width:150px" title="Filter and sort by date"><span class="ud-th-label">Date</span> <span class="ud-th-caret">▾</span></th>
      <th style="width:100px">When</th>
      <th id="uc-th-case" class="ud-th-filter" style="width:130px" title="Filter by case"><span class="ud-th-label">Case</span> <span class="ud-th-caret">▾</span></th>
      <th>Event</th>
      <th style="width:100px;text-align:right">Source</th>
      <th style="width:52px;text-align:center" title="Add to Google Calendar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M12 14v4"/><path d="M10 16h4"/></svg></th>
      <th style="width:92px;text-align:center;white-space:nowrap" title="Select all / deselect all visible"><button type="button" id="uc-sel-all" class="uc-selall-btn" title="Select all / deselect all visible for merge" aria-label="Select all / deselect all visible for merge"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M5 2.6 10 7.4" stroke-width="2.6" stroke-dasharray="2.4 2.1"/><path d="M19 2.6 14 7.4" stroke-width="2.6" stroke-dasharray="2.4 2.1"/><circle cx="12" cy="10.6" r="2.9" fill="currentColor" stroke="none"/><path d="M9.3 11h5.4l-.9 4.4h-3.6z" fill="currentColor" stroke="none"/><rect x="11" y="12.1" width="2" height="1.8" rx="0.5" fill="var(--surface,#fff)" stroke="none"/><path d="M12 17.2v5.4" stroke-width="4.2" stroke-dasharray="1.7 1.6" stroke-linecap="butt"/></svg></button><button type="button" id="uc-dismiss-all" class="uc-selall-btn" style="margin-left:7px" title="Dismiss selected events" aria-label="Dismiss selected events"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button></th>
    </tr></thead>
    <tbody id="uc-tbody">
      <tr><td colspan="7" class="ud-empty">Loading…</td></tr>
    </tbody>
  </table>

</div>

<script src="calendar.js"></script>

<footer id="tn-site-footer"></footer>
<script src="intel-footer.js"></script>
</body>
</html>
"""

    out = REPO_ROOT / "calendar.html"
    out.write_text(page, encoding="utf-8")
    print("  \u2713 calendar.html: shell written")


def render_unified_notes(cases):
    """Generate briefing-generator/unified-notes.html — all bookmarks + notes,
    sorted by last edit, exportable. Same shell family as docket/calendar."""
    logo_src = "assets/turnpage-intel-logo.png"
    logo_src_dark = "assets/turnpage-intel-logo-dark.png"

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
{PWA_HEAD}
<title>Notes — Turnpage Intelligence</title>
{THEME_SCRIPT}
<link rel="stylesheet" href="intel-chrome.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
  .uc-snippet{{color:var(--ink-60);font-size:inherit;}}
  .un-note-cell{{max-width:420px;}}
  /* CASE hugs its pills — leftover width flows to the flexible note column
     (auto layout; !important beats the th's inline width). */
  .ud-table th:nth-child(2){{width:1% !important;}}
  .ud-table td.ud-case{{width:1%;}}
  .ud-table td.ud-case .ud-pill{{max-width:200px;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;}}
  #ud-sort-btn.ud-sort-on, #ud-sort-entry-btn.ud-sort-on{{background:var(--ink);border-color:var(--ink);color:var(--bg);}}
  .un-note-text{{white-space:pre-wrap;font-size:inherit;line-height:1.5;}}
  .un-export{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}}
</style>
<!-- AUTH GATE START -->
<!-- AUTH GATE END -->
</head>
<body>

<nav class="tn">
  <div class="tn-row">
    <div class="tn-left">
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{logo_src}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{logo_src_dark}"></a>
      <a class="tn-back" href="{HOME_HREF}">🏠 Dashboard</a>
      <a class="tn-back" href="docket.html">⚖️ Docket</a>
      <a class="tn-back" href="calendar.html">📅 Calendar</a>
      <a class="tn-back" href="notes.html">🗒️ Notes</a>
      <a class="tn-back" href="news.html">📡 News</a>
      <a class="tn-back" href="prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌘</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">W</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><div class="tn-gear" id="tn-gear"><button type="button" class="tn-gear-btn" id="tn-gear-btn" title="Settings" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button><div class="tn-gear-panel"><a href="manage.html#cases">Cases</a><a href="manage.html#themes">Themes</a><a href="manage.html#groups">Groups</a><a href="manage.html#sources">Sources</a><a href="manage.html#voice">Voice</a><a href="manage.html#colors">Colors</a></div></div><button id="theme-toggle">🖥️</button>
  </div>
</nav>

<div class="page-title">
  <h1>🗒️ Notes</h1>
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
    <input type="text" id="ud-note-titlefield" class="ud-note-titlefield" placeholder="Title (optional — defaults to the note's first few words)" maxlength="200">
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
      <button id="ud-clear-search" class="ud-clear-btn">× Clear</button>
    </div>
    <div class="ud-filter-row">
      <div class="ud-case-dd" id="ud-case-dd">
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
    <span class="ud-lookback-box">
      <span id="ud-lookback-label">All time</span>
      <span class="ud-date-range" id="ud-daterange" style="display:none;">
        <span class="ud-date-sep">·</span>
        <input type="date" id="ud-date-from" class="ud-date-input" aria-label="From date">
        <span class="ud-date-sep">–</span>
        <input type="date" id="ud-date-to" class="ud-date-input" aria-label="To date">
      </span>
    </span>
    <span id="ud-count"></span>
  </div>

<div id="un-th-timemenu" class="ud-th-menu" style="display:none;">
  <button type="button" class="ud-th-menu-item" data-val="24h">Last 24 hours</button>
  <button type="button" class="ud-th-menu-item" data-val="7d">Last 7 days</button>
  <button type="button" class="ud-th-menu-item" data-val="30d">Last 30 days</button>
  <button type="button" class="ud-th-menu-item" data-val="90d">Last 90 days</button>
  <button type="button" class="ud-th-menu-item" data-val="all">All time</button>
  <button type="button" class="ud-th-menu-item" data-val="custom">Set custom date range…</button>
  <div class="ud-th-menu-sep"></div>
  <button type="button" class="ud-th-menu-item" data-sort="edited-desc">Edited — newest first</button>
  <button type="button" class="ud-th-menu-item" data-sort="edited-asc">Edited — oldest first</button>
</div>

  <table class="ud-table">
    <thead><tr>
      <th id="un-th-time" class="ud-th-filter" style="width:170px" title="Sort by edited or entry date"><span class="ud-th-label">Last edited</span> <span class="ud-th-caret">▾</span></th>
      <th id="un-th-case" class="ud-th-filter" style="width:130px" title="Filter by case"><span class="ud-th-label">Case</span> <span class="ud-th-caret">▾</span></th>
      <th>Entry</th>
      <th style="width:240px">Note</th>
      <th style="width:90px;text-align:right">Source</th>
      <th style="width:96px;text-align:center;white-space:nowrap">★ <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:7px"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:7px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3-3h8a1 1 0 0 1 1 1v2H7V4a1 1 0 0 1 1-1z"/></svg></th>
    </tr></thead>
    <tbody id="un-tbody">
      <tr><td colspan="6" class="ud-empty">Loading…</td></tr>
    </tbody>
  </table>

</div>

<script src="notes.js"></script>

<footer id="tn-site-footer"></footer>
<script src="intel-footer.js"></script>
</body>
</html>
"""

    out = REPO_ROOT / "notes.html"
    out.write_text(page, encoding="utf-8")
    print("  \u2713 notes.html: shell written")


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

    # 2) tracked-cases boxes retired from dashboards (2026-07-30) — cases live
    #    in the docket view now; this pass only strips any legacy block.
    print("=== Ensuring dashboards carry no Tracked Cases boxes ===")
    for topic_slug in TOPIC_META:
        inject_into_dashboard(topic_slug, None)

    # 3) unified docket page
    print("=== Rendering unified docket page ===")
    render_unified_docket(cases)
    render_news_page(cases)

    # 4) unified calendar page
    print("=== Rendering unified calendar page ===")
    render_unified_calendar(cases)

    # 5) unified notes page
    print("=== Rendering unified notes page ===")
    render_unified_notes(cases)

    # 6) briefings.html is a static per-case page now (cases-not-themes,
    #    Aug 2026) — no longer regenerated here.

    print("=== Cases injection done. ===")


if __name__ == "__main__":
    main()
