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

# Shared stylesheet for the unified docket + unified calendar shells
UD_CSS = r"""
  .tn-kbd{position:relative;display:inline-flex;align-items:center;margin-left:auto;margin-right:10px;}
  .tn-kbd-btn{font-family:inherit;font-size:11.5px;font-weight:800;letter-spacing:0.04em;background:transparent;border:1px solid var(--line-strong);color:var(--ink-60);cursor:pointer;padding:5px 10px;line-height:1;white-space:nowrap;}
  .tn-kbd-btn:hover{color:var(--ink);}
  .tn-kbd-panel{display:none;position:absolute;top:100%;right:0;z-index:250;background:var(--surface);border:1px solid var(--line-strong);padding:12px 14px;min-width:290px;box-shadow:0 10px 30px rgba(0,0,0,0.14);text-align:left;}
  @media (hover:hover){.tn-kbd:hover .tn-kbd-panel{display:block;}}
  .tn-kbd.open .tn-kbd-panel{display:block;}
  .tn-kbd-title{font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-40);margin-bottom:7px;}
  .tn-kbd-row{font-size:12.5px;color:var(--ink-60);margin:6px 0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
  .tn-kbd-row em{font-style:normal;color:var(--ink-40);font-size:10.5px;margin-left:auto;padding-left:10px;}
  .tn-key{display:inline-block;font-size:10.5px;font-weight:800;border:1px solid var(--line-strong);padding:1px 6px;background:var(--paper-2);color:var(--ink);min-width:13px;text-align:center;}
  .page-title{max-width:1680px;}
  /* Main page area — no sidebar */
  .ud-page{max-width:1680px;margin:0 auto;padding:20px 32px 60px;}
  /* Nav shares the content grid so left/right margins match the page */
  .tn{padding:10px 0;}
  .tn-row{max-width:1680px;padding:0 32px;}
  /* Controls bar */
  .ud-controls{background:var(--surface);border:1px solid var(--line-strong);padding:14px 20px;margin-bottom:16px;display:flex;flex-direction:row;align-items:center;gap:12px;flex-wrap:wrap;}
  .ud-search-row,.ud-filter-row{display:contents;}
  .ud-search-wrap{flex:1 1 220px;min-width:180px;max-width:420px;position:relative;}
  .ud-search-input{width:100%;padding:8px 12px;font-size:15px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;box-sizing:border-box;}
  .ud-search-input:focus{border-color:var(--neon);}
  .ud-date-range{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .ud-date-label{font-size:12px;color:var(--ink-60);font-weight:700;letter-spacing:0.04em;white-space:nowrap;}
  .ud-date-input{padding:7px 8px;font-size:13px;font-family:inherit;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;width:132px;}
  .ud-date-input:focus{border-color:var(--neon);}
  .ud-date-sep{color:var(--ink-40);font-size:14px;}
  .ud-clear-btn{padding:7px 14px;font-size:13px;font-weight:700;font-family:inherit;background:transparent;border:1px solid var(--line-strong);color:var(--ink-60);cursor:pointer;white-space:nowrap;}
  .ud-clear-btn:hover{border-color:var(--ink-40);color:var(--ink);}
  /* Case dropdown + filters row */
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
  .ud-dd-saveview{display:block;width:100%;margin-top:8px;padding:9px;background:var(--neon);border-color:var(--neon);color:#0A0A0A;}
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
  #ud-count{font-size:14px;color:var(--ink-60);flex:1;}
  .ud-lookback-box{display:inline-flex;align-items:center;gap:8px;background:var(--paper-2);border:1px solid var(--line-strong);padding:3px 10px;margin-right:10px;white-space:nowrap;}
  .ud-lookback-box #ud-lookback-label{font-size:12px;font-weight:800;letter-spacing:0.03em;color:var(--ink);}
  .ud-lookback-box .ud-date-range{display:inline-flex;align-items:center;gap:6px;}
  .ud-lookback-box .ud-date-input{width:130px;padding:2px 6px;font-size:12px;font-family:inherit;background:var(--surface);border:1px solid var(--line-strong);color:var(--ink);}
  #ud-sort-btn{background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);font-size:14px;font-weight:700;padding:6px 14px;cursor:pointer;font-family:inherit;}
  #ud-sort-btn:hover{border-color:var(--ink-40);}
  /* Pills */
  .ud-pill{display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.03em;padding:2px 10px;white-space:nowrap;border-radius:99px;}
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
  .ud-table th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-40);padding:11px 14px;border-bottom:1px solid var(--line-strong);font-weight:700;}
  .ud-table td{padding:12px 14px;font-size:13.5px;border-bottom:1px solid var(--line);vertical-align:top;}
  .ud-table tr:last-child td{border-bottom:none;}
  .ud-row-new .ud-entry{font-weight:700;}  /* highlight new rows via the entry text only — dates and parties stay regular */
  .ud-table tr.ud-day-row{background:transparent;}
  .ud-day-row td{background:transparent;border-left:none;border-right:none;border-top:2px solid var(--line-strong);border-bottom:1px solid var(--line-strong);font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-60);padding:7px 14px;}
  .ud-row-article td{background:var(--paper-2);}
  .ud-mark-cell{text-align:center;white-space:nowrap;padding-left:1px;padding-right:1px;}
  .ud-table thead th:last-child,.ud-table tbody tr:not(.ud-day-row) td:last-child{padding-right:14px;}
  .ud-th-icon{padding-left:1px;padding-right:1px;}
  .ud-mark-cell button{padding-left:2px;padding-right:2px;}
  .ud-bm-btn,.ud-note-btn{background:none;border:none;cursor:pointer;font-size:15px;padding:2px 4px;line-height:1;color:var(--ink-40);}
  .ud-bm-btn:hover,.ud-note-btn:hover{color:var(--ink);}
  .ud-bm-btn.ud-bm-on{color:#EAB308;}
  .ud-note-btn{color:var(--ink-40);}
  .ud-note-btn.ud-note-on{color:#3FA07A;}
  .ud-note-overlay{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:20px;}
  .ud-note-box{background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 10px 40px rgba(0,0,0,0.35);width:min(640px,100%);padding:22px;display:flex;flex-direction:column;gap:10px;}
  .ud-note-title{font-size:15px;font-weight:800;color:var(--ink);}
  .ud-note-meta{font-size:12px;color:var(--ink-60);line-height:1.5;border-bottom:1px solid var(--line);padding-bottom:10px;}
  .ud-note-text{width:100%;min-height:180px;resize:vertical;padding:10px 12px;font-family:inherit;font-size:14px;line-height:1.55;background:var(--paper-2);border:1px solid var(--line-strong);color:var(--ink);outline:none;box-sizing:border-box;}
  .ud-note-text:focus{border-color:var(--neon);}
  .ud-note-actions{display:flex;align-items:center;gap:8px;}
  .ud-note-status{font-size:12px;color:var(--ink-40);}
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
  .ud-th-caret{font-size:9px;}
  .ud-th-toggle{cursor:pointer;user-select:none;}
  .ud-th-toggle:hover{color:var(--ink);}
  .ud-th-toggle.ud-th-on{color:#EAB308;}
  .ud-th-menu{position:absolute;z-index:950;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 6px 24px rgba(0,0,0,0.22);min-width:180px;padding:6px;}
  .ud-th-menu-item{display:block;width:100%;text-align:left;background:none;border:none;font-family:inherit;font-size:13px;color:var(--ink);cursor:pointer;padding:8px 10px;}
  .ud-th-menu-item:hover{background:var(--paper-2);}
  .ud-mi-sub{font-size:11px;color:var(--ink-60);font-weight:400;margin-top:2px;}
  .ud-th-menu-item.ud-th-menu-on{font-weight:800;}
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
  .ud-pal-item .ud-pal-slug{color:var(--ink-60);font-size:11px;font-family:monospace;}
  .ud-pal-item:hover{background:var(--paper-2);}
  .ud-pal-cur,.ud-pal-cur:hover{background:var(--neon);color:var(--ink);}
  .ud-pal-empty{padding:12px 14px;font-size:13px;color:var(--ink-60);}
  .ud-pal-hint{padding:7px 14px;font-size:10.5px;color:var(--ink-60);border-top:1px solid var(--line-strong);letter-spacing:0.03em;}
  .ud-rename-input{width:100%;font-family:inherit;font-size:13px;padding:5px 7px;border:1.5px solid var(--neon);background:var(--surface);color:var(--ink);box-sizing:border-box;}
  .ud-due{background:rgba(212,255,0,0.5);border:1px solid var(--line-strong);padding:14px 18px;margin-bottom:14px;display:flex;flex-direction:column;gap:10px;}
  [data-theme="dark"] .ud-due{background:rgba(212,255,0,0.22);color:#F4F5F7;}
  .ud-due-head{font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);}
  .ud-due-card{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-top:1px solid var(--line);}
  .ud-due-card:first-of-type{border-top:none;}
  .ud-due-body{flex:1;font-size:13.5px;line-height:1.5;}
  .ud-due-meta{font-size:12px;color:var(--ink-60);margin-bottom:3px;}
  .ud-due-actions{display:flex;gap:8px;flex-shrink:0;align-items:center;}
  .ud-case-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;}
  .ud-case-grid label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-60);}
  .ud-case-grid input,.ud-case-grid textarea{font-size:13.5px;}
  .ud-case-wide{grid-column:1 / -1;}
  .ud-case-lookup-row{display:flex;gap:6px;}
  .ud-case-lookup-row input{flex:1;}
  .ud-case-topics{display:flex;flex-wrap:wrap;gap:8px;}
  .ud-case-topics label{display:flex;flex-direction:row;align-items:center;gap:5px;font-weight:400;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink);cursor:pointer;}
  .ud-case-topics input{accent-color:var(--neon);}
  .ud-src-list{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;}
  .ud-src-row{display:flex;align-items:center;gap:10px;padding:7px 8px;background:var(--paper-2);border:1px solid var(--line);}
  .ud-src-row input[type="checkbox"]{accent-color:var(--neon);margin:0;flex-shrink:0;}
  .ud-src-name{font-weight:700;flex:0 0 120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ud-src-url{flex:1;font-size:12px;color:var(--ink-60);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ud-src-kind{font-size:10px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;border:1px solid var(--ink);padding:1px 7px;flex-shrink:0;}
  .ud-src-del{background:none;border:none;color:var(--ink-40);font-size:14px;cursor:pointer;padding:0 3px;}
  .ud-src-del:hover{color:#C84141;}
  .ud-src-add{display:flex;gap:6px;align-items:center;border-top:1px solid var(--line);padding-top:10px;}
  .ud-src-mode{font-family:inherit;font-size:11.5px;padding:3px 4px;background:var(--surface);color:var(--ink);border:1px solid var(--line-strong);}
  /* ── Mobile (≤720px): tables become stacked cards ─────────────────────── */
  @media (max-width: 720px) {
    .tn-left{flex-wrap:wrap;gap:8px 14px;}
    .tn{padding:8px 0;}
    .tn-row{padding:0 12px;}
    body{overflow-x:hidden;}
    .ud-party-empty{display:none;}
    .ud-page{padding:12px 12px 48px;}
    .page-title{padding-left:14px;padding-right:14px;}
    .ud-controls{padding:12px;gap:8px;}
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
    .ud-doc{order:6;text-align:left;}
    .ud-mark-cell, .uc-curate-cell{order:7;margin-left:auto;}
    .ud-mark-cell button{font-size:16px;padding:4px 6px;}
    .ud-day-row{padding:0;border-bottom:none;}
    .ud-day-row td{flex-basis:100%;padding:7px 10px;}
    .ud-row-article td, .ud-table .ud-row-bondoro td{background:transparent;}
    .ud-row-article{background:var(--paper-2);}
    .ud-table .ud-row-bondoro{background:rgba(212,255,0,0.10);}
    [data-theme="dark"] .ud-table .ud-row-bondoro{background:rgba(212,255,0,0.07);}
    .ud-case-dd-panel{max-width:calc(100vw - 16px);min-width:240px;}
    .ud-th-menu{max-width:calc(100vw - 16px);}
    .ud-case-grid{grid-template-columns:1fr;}
    .ud-src-add{flex-wrap:wrap;}
    .ud-src-add input{flex:1 1 100% !important;}
    .ud-due{padding:12px;}
    .ud-due-card{flex-direction:column;gap:8px;}
    .ud-note-box{padding:16px;}
    .uc-merge-bar{flex-wrap:wrap;}
  }
  .uc-gcal{font-size:16px;text-decoration:none;opacity:0.55;}
  .uc-gcal:hover{opacity:1;}
  .uc-curate-cell{text-align:center;white-space:nowrap;}
  .uc-sel{accent-color:var(--neon);cursor:pointer;margin-right:6px;}
  .uc-x{background:none;border:none;color:var(--ink-40);font-size:15px;cursor:pointer;padding:0 3px;line-height:1;}
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
  .ud-landmark{display:inline-block;font-size:10px;font-weight:700;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-strong);padding:1px 6px;margin-right:4px;vertical-align:middle;border-radius:3px;}
  .ud-news-tag{display:inline-block;font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink);background:transparent;border:1px solid var(--ink);padding:1px 7px;margin-right:5px;vertical-align:middle;}
  .ud-new-pill{display:inline-block;font-size:9px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#0A0A0A;background:var(--neon);padding:1px 7px;margin-left:6px;vertical-align:middle;}
  #ud-sync{margin-left:10px;font-size:12px;}
  .ud-sync-live{color:var(--ink-60);}
  .ud-sync-live::before{content:"\25CF";color:var(--neon);margin-right:5px;font-size:10px;}
  .ud-sync-static{color:var(--ink-40);}
  .ud-link{color:var(--ink);font-weight:400;text-decoration:underline;}

  .ud-link-empty{color:var(--ink-40);font-size:inherit;}
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
  .tn-brand-logo{height:34px;width:auto;}
  .tn-logo-dark{display:none;}
  [data-theme="dark"] .tn-logo-light{display:none;}
  [data-theme="dark"] .tn-logo-dark{display:block;}
  .tn-back{color:rgba(255,255,255,0.72);font-size:12px;text-decoration:none;border-left:1px solid rgba(255,255,255,0.18);padding-left:16px;filter:grayscale(1);}
  .tn-back:hover,.tn-back.tn-on{color:#fff;font-weight:700;filter:none;}
  [data-theme="light"] .tn{background:#fff;border-bottom-color:rgba(10,10,10,0.08);}
  [data-theme="light"] .tn-back{color:rgba(10,10,10,0.6);border-left-color:rgba(10,10,10,0.14);}
  [data-theme="light"] .tn-back:hover,[data-theme="light"] .tn-back.tn-on{color:#0A0A0A;}
  #theme-toggle{background:transparent;border:1px solid rgba(255,255,255,0.25);border-radius:99px;padding:2px 8px;cursor:pointer;font-size:13px;font-family:inherit;line-height:1;color:#fff;}
  [data-theme="light"] #theme-toggle{border-color:rgba(10,10,10,0.14);color:#0A0A0A;}
  .page-title{max-width:1180px;margin:0 auto;padding:26px 32px 16px;border-bottom:2px solid var(--ink);}
  .page-title .eyebrow{font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-60);font-weight:700;}
  .page-title h1{font-size:clamp(1.5rem,2.6vw,2.1rem);font-weight:800;letter-spacing:-0.02em;margin:8px 0 12px;display:flex;align-items:center;gap:10px;}
  .case-meta{display:flex;gap:22px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-60);}
  .case-meta strong{color:var(--ink);font-weight:700;}
  .tn-kbd{position:relative;display:inline-flex;align-items:center;margin-left:auto;margin-right:10px;}
  .tn-kbd-btn{font-family:inherit;font-size:11.5px;font-weight:800;letter-spacing:0.04em;background:transparent;border:1px solid var(--line-strong);color:var(--ink-60);cursor:pointer;padding:5px 10px;line-height:1;white-space:nowrap;}
  .tn-kbd-btn:hover{color:var(--ink);}
  .tn-kbd-panel{display:none;position:absolute;top:100%;right:0;z-index:250;background:var(--surface);border:1px solid var(--line-strong);padding:12px 14px;min-width:290px;box-shadow:0 10px 30px rgba(0,0,0,0.14);text-align:left;}
  @media (hover:hover){.tn-kbd:hover .tn-kbd-panel{display:block;}}
  .tn-kbd.open .tn-kbd-panel{display:block;}
  .tn-kbd-title{font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-40);margin-bottom:7px;}
  .tn-kbd-row{font-size:12.5px;color:var(--ink-60);margin:6px 0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
  .tn-kbd-row em{font-style:normal;color:var(--ink-40);font-size:10.5px;margin-left:auto;padding-left:10px;}
  .tn-key{display:inline-block;font-size:10.5px;font-weight:800;border:1px solid var(--line-strong);padding:1px 6px;background:var(--paper-2);color:var(--ink);min-width:13px;text-align:center;}
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

    # Theme tags are plain text now (theme dashboards are retired — briefings
    # are per-case; the nav's Briefings link covers navigation).
    topics = [t for t in cfg.get("topics", []) if t in TOPIC_META]
    also = ""
    if topics:
        labels = ", ".join(f'{TOPIC_META[t]["emoji"]} {html_escape(TOPIC_META[t]["display"])}'
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
<link rel="icon" type="image/png" href="/intel/assets/intel-favicon.png">
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
      <a class="tn-brand" href="{HOME_HREF_SUBDIR}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{LOGO_SRC}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{LOGO_SRC_DARK}"></a>
      <a class="tn-back" href="{HOME_HREF_SUBDIR}">🏠 Dashboard</a>
      <a class="tn-back" href="../docket.html">⚖️ Docket</a>
      <a class="tn-back" href="../calendar.html">📅 Calendar</a>
      <a class="tn-back" href="../notes.html">🗒️ Notes</a>
      <a class="tn-back" href="../news.html">📡 News</a>
      <a class="tn-back" href="../prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌨ Shortcuts</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">R</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><button id="theme-toggle">🖥️</button>
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


# ── 3) unified docket page ────────────────────────────────────────────────────

# Distinct pill colors: (bg-light, fg-light, bg-dark, fg-dark)
_PILL_PALETTE = [
    ("#D4FF00", "#0A0A0A", "#5D7A00", "#FFFFFF"),
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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" href="/intel/assets/intel-favicon.png">
<title>Docket — Turnpage Daily Briefing</title>
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
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{logo_src}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{logo_src_dark}"></a>
      <a class="tn-back" href="{HOME_HREF}">🏠 Dashboard</a>
      <a class="tn-back" href="docket.html">⚖️ Docket</a>
      <a class="tn-back" href="calendar.html">📅 Calendar</a>
      <a class="tn-back" href="notes.html">🗒️ Notes</a>
      <a class="tn-back" href="news.html">📡 News</a>
      <a class="tn-back" href="prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌨ Shortcuts</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">R</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><button id="theme-toggle">🖥️</button>
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

<!-- Feed sources modal -->
<div id="ud-src-overlay" class="ud-note-overlay" style="display:none;">
  <div class="ud-note-box" style="width:min(680px,100%);">
    <div class="ud-note-title">News feed sources</div>
    <div class="ud-note-meta">Each source's RSS feed is pulled once a day. “All entries” puts every item on the docket (unassigned until tied to a case). “Case matches only” shows a feed's items solely when they match a tracked case — matching runs automatically on each pull, and you can still assign by hand.</div>
    <div id="ud-src-list" class="ud-src-list"></div>
    <div class="ud-src-add">
      <input type="text" id="ud-src-name" class="ud-dd-save-input" placeholder="Name (e.g. PETITION)" style="flex:0 0 140px;">
      <input type="text" id="ud-src-url" class="ud-dd-save-input" placeholder="RSS feed URL (https://…/rss)" style="flex:1;">
      <input type="text" id="ud-src-kind" class="ud-dd-save-input" placeholder="Tag (News)" style="flex:0 0 90px;">
      <button type="button" id="ud-src-add-btn" class="ud-dd-save-btn">Add</button>
    </div>
    <div class="ud-note-actions">
      <span id="ud-src-status" class="ud-note-status"></span>
      <span style="flex:1"></span>
      <button type="button" id="ud-src-close" class="ud-clear-btn">Close</button>
      <button type="button" id="ud-src-save" class="ud-dd-save-btn">Save sources</button>
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
        <button type="button" id="ud-case-add" class="ud-type-select" title="Add a tracked case">＋ Case</button>
        <button type="button" id="ud-sources-btn" class="ud-type-select" title="Manage news feed sources">Sources</button>
        <div id="ud-case-dd-panel" class="ud-case-dd-panel" style="display:none;"></div>
      </div>
      <div class="ud-filter-right">
        <select id="ud-rowkind" class="ud-type-select" title="What to show">
          <option value="both">Filings + Articles</option>
          <option value="filings">Court filings only</option>
          <option value="articles">Articles only</option>
        </select>
        <label class="ud-new-label">
          <input type="checkbox" id="ud-new-only"> New only (24h)
        </label>
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
    <button id="ud-sort-btn">Date ↓</button>
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
    </tr></thead>
    <tbody id="ud-tbody">
      <tr><td colspan="10" class="ud-empty">Loading…</td></tr>
    </tbody>
  </table>

</div>

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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" href="/intel/assets/intel-favicon.png">
<title>News — Turnpage Daily Briefing</title>
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
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{logo_src}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{logo_src_dark}"></a>
      <a class="tn-back" href="{HOME_HREF}">🏠 Dashboard</a>
      <a class="tn-back" href="docket.html">⚖️ Docket</a>
      <a class="tn-back" href="calendar.html">📅 Calendar</a>
      <a class="tn-back" href="notes.html">🗒️ Notes</a>
      <a class="tn-back" href="news.html">📡 News</a>
      <a class="tn-back" href="prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌨ Shortcuts</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">R</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><button id="theme-toggle">🖥️</button>
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

<!-- Feed sources modal -->
<div id="ud-src-overlay" class="ud-note-overlay" style="display:none;">
  <div class="ud-note-box" style="width:min(680px,100%);">
    <div class="ud-note-title">News feed sources</div>
    <div class="ud-note-meta">Each source's RSS feed is pulled once a day. “All entries” puts every item on the docket (unassigned until tied to a case). “Case matches only” shows a feed's items solely when they match a tracked case — matching runs automatically on each pull, and you can still assign by hand.</div>
    <div id="ud-src-list" class="ud-src-list"></div>
    <div class="ud-src-add">
      <input type="text" id="ud-src-name" class="ud-dd-save-input" placeholder="Name (e.g. PETITION)" style="flex:0 0 140px;">
      <input type="text" id="ud-src-url" class="ud-dd-save-input" placeholder="RSS feed URL (https://…/rss)" style="flex:1;">
      <input type="text" id="ud-src-kind" class="ud-dd-save-input" placeholder="Tag (News)" style="flex:0 0 90px;">
      <button type="button" id="ud-src-add-btn" class="ud-dd-save-btn">Add</button>
    </div>
    <div class="ud-note-actions">
      <span id="ud-src-status" class="ud-note-status"></span>
      <span style="flex:1"></span>
      <button type="button" id="ud-src-close" class="ud-clear-btn">Close</button>
      <button type="button" id="ud-src-save" class="ud-dd-save-btn">Save sources</button>
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

<div class="ud-page">

  <div id="ud-due" class="ud-due" style="display:none;"></div>

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
        <button type="button" id="ud-case-add" class="ud-type-select" title="Add a tracked case">＋ Case</button>
        <button type="button" id="ud-sources-btn" class="ud-type-select" title="Manage news feed sources">Sources</button>
        <div id="ud-case-dd-panel" class="ud-case-dd-panel" style="display:none;"></div>
      </div>
      <div class="ud-filter-right">
        <select id="ud-related" class="ud-type-select" title="Show every scanned headline, or only those tagged to a case or theme">
          <option value="all">All news</option>
          <option value="related">Cases &amp; themes only</option>
        </select>
        <label class="ud-new-label">
          <input type="checkbox" id="ud-new-only"> New only (24h)
        </label>
      </div>
    </div>
  </div>

  <div class="ud-toolbar">
    <span id="ud-count"></span>
    <span id="ud-hidden-info" class="uc-curation-info"></span>
    <button id="ud-sort-btn">Date ↓</button>
  </div>

  <table class="ud-table">
    <thead><tr>
      <th style="width:82px">Time</th>
      <th id="ud-th-case" class="ud-th-filter" style="width:150px" title="Select cases"><span class="ud-th-label">Case</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-source" class="ud-th-filter" style="width:150px" title="Show or hide news sources"><span class="ud-th-label">Author</span> <span class="ud-th-caret">▾</span></th>
      <th id="ud-th-entry" class="ud-th-filter" title="Filter by story type"><span class="ud-th-label">Entry</span> <span class="ud-th-caret">▾</span></th>
      <th style="width:132px;text-align:right">Dkt.</th>
      <th id="ud-th-bm" class="ud-th-toggle ud-th-icon" style="width:26px;text-align:center" title="Show bookmarked only">★</th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Snoozed reminders"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Hide rows (H)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></th>
      <th class="ud-th-icon" style="width:26px;text-align:center" title="Delete rows (X)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></th>
      <th id="ud-th-note" class="ud-th-toggle ud-th-icon" style="width:44px;text-align:center" title="Show entries with notes only"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></th>
    </tr></thead>
    <tbody id="ud-tbody">
      <tr><td colspan="10" class="ud-empty">Loading…</td></tr>
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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" href="/intel/assets/intel-favicon.png">
<title>Calendar — Turnpage Daily Briefing</title>
{THEME_SCRIPT}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
  .uc-rel-cell{{white-space:nowrap;}}
  .uc-rel{{font-size:12px;font-weight:700;color:var(--ink-60);}}
  .uc-kind{{display:inline-block;font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-strong);padding:2px 8px;margin-right:6px;vertical-align:middle;white-space:nowrap;}}
  .uc-snippet{{color:var(--ink-60);font-size:inherit;}}
  .uc-mode{{display:inline-flex;border:1px solid var(--line-strong);margin-right:8px;}}
  .uc-mode button{{font-family:inherit;font-size:12px;font-weight:700;padding:7px 14px;background:transparent;border:0;border-right:1px solid var(--line-strong);color:var(--ink-60);cursor:pointer;}}
  .uc-mode button:last-child{{border-right:0;}}
  .uc-mode button.uc-mode-on{{background:var(--ink);color:var(--surface);}}
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
  .uc-week-card{{border:1px solid var(--line-strong);border-left-width:3px;padding:6px 7px;margin-bottom:6px;background:var(--surface);cursor:pointer;}}
  .uc-week-card .ud-pill{{font-size:10px;}}
  .uc-week-kind{{font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;margin-top:4px;}}
  .uc-week-snip{{font-size:11px;color:var(--ink-60);line-height:1.4;margin-top:3px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}}
  .uc-week-links{{font-size:11.5px;margin-top:5px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;}}
  @media (max-width:900px){{.uc-week-grid{{grid-template-columns:1fr;}}.uc-week-col{{min-height:0;}}}}
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
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{logo_src}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{logo_src_dark}"></a>
      <a class="tn-back" href="{HOME_HREF}">🏠 Dashboard</a>
      <a class="tn-back" href="docket.html">⚖️ Docket</a>
      <a class="tn-back" href="calendar.html">📅 Calendar</a>
      <a class="tn-back" href="notes.html">🗒️ Notes</a>
      <a class="tn-back" href="news.html">📡 News</a>
      <a class="tn-back" href="prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌨ Shortcuts</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">R</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><button id="theme-toggle">🖥️</button>
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
    <span id="uc-curation-info" class="uc-curation-info"></span>
    <button id="ud-sort-btn">Date ↑</button>
  </div>

  <div id="uc-merge-bar" class="uc-merge-bar" style="display:none;">
    <span id="uc-merge-count"></span>
    <button type="button" id="uc-merge-btn" class="ud-dd-save-btn">Merge into one event</button>
    <button type="button" id="uc-dismiss-btn" class="ud-clear-btn">Dismiss selected</button>
    <button type="button" id="uc-clear-sel" class="ud-clear-btn">Clear</button>
  </div>

  <table class="ud-table">
    <thead><tr>
      <th style="width:150px">Date</th>
      <th style="width:100px">When</th>
      <th style="width:130px">Case</th>
      <th>Event</th>
      <th style="width:100px;text-align:right">Source</th>
      <th style="width:52px;text-align:center" title="Add to Google Calendar">📆</th>
      <th style="width:66px;text-align:center" title="Select all / deselect all visible"><input type="checkbox" id="uc-sel-all" class="uc-sel" style="margin:0;"></th>
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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" href="/intel/assets/intel-favicon.png">
<title>Notes — Turnpage Daily Briefing</title>
{THEME_SCRIPT}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
{PAGE_CSS}
<style>
{UD_CSS}
  .uc-snippet{{color:var(--ink-60);font-size:inherit;}}
  .un-note-cell{{max-width:420px;}}
  .un-note-text{{white-space:pre-wrap;font-size:inherit;line-height:1.5;}}
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
      <a class="tn-brand" href="{HOME_HREF}"><img class="tn-brand-logo tn-logo-light" alt="Turnpage Intelligence" src="{logo_src}"><img class="tn-brand-logo tn-logo-dark" alt="Turnpage Intelligence" src="{logo_src_dark}"></a>
      <a class="tn-back" href="{HOME_HREF}">🏠 Dashboard</a>
      <a class="tn-back" href="docket.html">⚖️ Docket</a>
      <a class="tn-back" href="calendar.html">📅 Calendar</a>
      <a class="tn-back" href="notes.html">🗒️ Notes</a>
      <a class="tn-back" href="news.html">📡 News</a>
      <a class="tn-back" href="prospects.html">🔭 Prospects</a>
    </div>
    <div class="tn-kbd" id="tn-kbd"><button type="button" class="tn-kbd-btn" id="tn-kbd-btn" title="Keyboard shortcuts" aria-haspopup="true">⌨ Shortcuts</button><div class="tn-kbd-panel"><div class="tn-kbd-title">Keyboard shortcuts</div><div class="tn-kbd-row"><span class="tn-key">G</span> then <span class="tn-key">H</span> Home · <span class="tn-key">D</span> Docket · <span class="tn-key">C</span> Calendar · <span class="tn-key">P</span> Prospects · <span class="tn-key">N</span> Notes · <span class="tn-key">R</span> News</div><div class="tn-kbd-row"><span class="tn-key">⌘K</span> Filter to a case <em>Docket · News · Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">/</span> Focus search</div><div class="tn-kbd-row"><span class="tn-key">T</span> Today <em>Calendar · Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">S</span> then <span class="tn-key">A</span> Show all cases</div><div class="tn-kbd-row"><span class="tn-key">L</span> <span class="tn-key">M</span> <span class="tn-key">W</span> List / Month / Week <em>Calendar</em></div><div class="tn-kbd-row"><span class="tn-key">↑</span> <span class="tn-key">↓</span> Move through rows <em>Docket · News</em></div><div class="tn-kbd-row"><span class="tn-key">R</span> Read / open the row’s document</div><div class="tn-kbd-row"><span class="tn-key">N</span> Note · <span class="tn-key">H</span> Hide · <span class="tn-key">X</span> Delete</div><div class="tn-kbd-row"><span class="tn-key">Z</span> Snooze · <span class="tn-key">U</span> Upload · <span class="tn-key">D</span> Download</div></div></div><button id="theme-toggle">🖥️</button>
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
      <th style="width:76px;text-align:center">★ <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></th>
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
