(function(){
  // Selected-state convention: light = black box + white text, dark = neon + black,
  // night = red + black.
  var selCss=document.createElement('style');
  selCss.id='tn-sel-vars';
  selCss.textContent=':root{--sel-bg:#0A0A0A;--sel-fg:#FFFFFF;}[data-theme="dark"]{--sel-bg:#D4FF00;--sel-fg:#0A0A0A;}[data-theme="night"]{--sel-bg:#FE0100;--sel-fg:#000000;}';
  (document.head||document.documentElement).appendChild(selCss);
  // ── Night mode — red-on-black, Apple Watch night-face style. Injected here
  // (not intel-chrome.css) so every page that loads theme.js gets it — including
  // the two legacy case shells that never adopted intel-chrome.css. Palette is
  // #000 + #FE0100 only: solid red for primary text/accents, dimmed red alphas
  // for hierarchy, black text on solid-red fills. No shadows anywhere.
  // :root[data-theme="night"] (0,2,0) outguns the :root token blocks pages
  // declare locally (index --canvas, manage --bg), so one block rules them all.
  var nightCss=document.createElement('style');
  nightCss.id='tn-night-vars';
  nightCss.textContent=
    ':root[data-theme="night"]{color-scheme:dark;'+
      '--bg:#000000;--surface:#000000;--paper-2:rgba(254,1,0,0.10);--canvas:#000000;'+
      '--ink:#FE0100;--ink-60:rgba(254,1,0,0.72);--ink-40:rgba(254,1,0,0.55);--ink-20:rgba(254,1,0,0.30);'+
      '--line:rgba(254,1,0,0.20);--line-strong:rgba(254,1,0,0.38);'+
      '--neon:#FE0100;--neon-block:#FE0100;--neon-on-block:#000000;'+
      '--ok:#FE0100;--warn:#FE0100;--danger:#FE0100;}'+
    // No drop shadows in night — kill every box/text shadow, incl. popover floats.
    // html[…] prefix: outguns the pages' own single-class !important shadows
    // (e.g. the mobile bottom-sheet rule) — both important, higher specificity wins.
    'html[data-theme="night"] *,html[data-theme="night"] *::before,html[data-theme="night"] *::after{box-shadow:none !important;text-shadow:none !important;}'+
    '[data-theme="night"],[data-theme="night"] body{background:#000;color:#FE0100;}'+
    '[data-theme="night"] ::selection{background:#FE0100;color:#000;}'+
    '[data-theme="night"] :focus-visible{outline-color:#FE0100;}'+
    '[data-theme="night"] ::-webkit-scrollbar{width:11px;height:11px;background:#000;}'+
    '[data-theme="night"] ::-webkit-scrollbar-thumb{background:rgba(254,1,0,0.38);border-radius:99px;}'+
    '[data-theme="night"] ::-webkit-scrollbar-thumb:hover{background:rgba(254,1,0,0.72);}'+
    '[data-theme="night"] input,[data-theme="night"] textarea,[data-theme="night"] select,[data-theme="night"] button{accent-color:#FE0100;}'+
    '[data-theme="night"] input::placeholder,[data-theme="night"] textarea::placeholder{color:rgba(254,1,0,0.55);}'+
    // Nav bar: black bar, red hairline, dim-red links, solid-red active.
    '[data-theme="night"] .tn{background:#000;border-bottom-color:rgba(254,1,0,0.38);}'+
    '[data-theme="night"] .tn-back{color:rgba(254,1,0,0.72);border-left-color:rgba(254,1,0,0.30);filter:none;}'+
    '[data-theme="night"] .tn-back:hover,[data-theme="night"] .tn-back.tn-on{color:#FE0100;}'+
    '[data-theme="night"] .tn-kbd-btn{color:rgba(254,1,0,0.72);}'+
    '[data-theme="night"] .tn-kbd-btn:hover{color:#FE0100;}'+
    '[data-theme="night"] .tn-hamburger{color:#FE0100;}'+
    '[data-theme="night"] .tn-menu.open{background:#000;border-bottom-color:rgba(254,1,0,0.38);}'+
    '[data-theme="night"] .tn-menu .tn-back{border-top-color:rgba(254,1,0,0.20);}'+
    '[data-theme="night"] .tn-gear.open .tn-gear-panel{border-bottom-color:rgba(254,1,0,0.38);}'+
    '[data-theme="night"] .tn-gear-panel a{border-top-color:rgba(254,1,0,0.20);}'+
    '[data-theme="night"] .tn-gear-theme,[data-theme="night"] .tn-gear-font{border-top-color:rgba(254,1,0,0.20);}'+
    // Color emoji: nav/gear icons → red monochrome via filter; the big
    // decorative h1 glyph can't be tinted convincingly at size, so night
    // drops it (watch-face minimalism — the title text carries the page).
    '[data-theme="night"] .tn-back .tn-ico,[data-theme="night"] .tn-gt-ico{filter:grayscale(1) sepia(1) saturate(12) hue-rotate(-50deg) brightness(1.05);}'+
    // :not([class]) — the generated case pages wrap their title emoji in a bare
    // <span>, but briefings.html's first span is the case-title PILL (classed).
    '[data-theme="night"] h1 .tn-emj,[data-theme="night"] .page-title h1>span:first-child:not([class]){display:none;}'+
    // Brand logo: use the (white) dark-mode asset, colorized to #FE0100.
    '[data-theme="night"] .tn-logo-light{display:none !important;}'+
    '[data-theme="night"] .tn-logo-dark{display:block;filter:brightness(0) saturate(100%) invert(13%) sepia(94%) saturate(7404%) hue-rotate(11deg) brightness(101%) contrast(115%);}'+
    // Everything raster (news favicons, uploaded images, charts) → red monochrome.
    '[data-theme="night"] :is(img,video,canvas):not(.tn-brand-logo){filter:grayscale(1) sepia(1) saturate(9) hue-rotate(-48deg) brightness(0.9);}'+
    // Popovers float without shadows now — a stronger red border does the lifting.
    '[data-theme="night"] :is(.tn-kbd-panel,.tn-gear-panel,.ud-th-menu,.ud-case-dd-panel,#ud-source-dd-panel,.ud-pal-box,.ud-note-box,.pr-box){border-color:rgba(254,1,0,0.55);}'+
    '[data-theme="night"] .ud-pal-overlay{background:rgba(0,0,0,0.62);}'+
    // Case-color pills: every case reads as the same dark-red chip (the per-case
    // palette is meaningless when the only ink is red).
    '[data-theme="night"] :is(.ud-pill,.mg-pill,.ih-pill,.uc-cal-chip)[style*="--pb"]{background:rgba(254,1,0,0.14);color:#FE0100;}'+
    // Case-tinted cards set colors inline (style="border-left-color:…;background:tint(…)").
    '[data-theme="night"] .uc-week-card,[data-theme="night"] .ih-row-coded,[data-theme="night"] .ih-wk-ev{background:rgba(254,1,0,0.10) !important;border-left-color:#FE0100 !important;}'+
    '[data-theme="night"] .ud-pill-theme,[data-theme="night"] .ih-pill-theme{color:#FE0100;border-color:#FE0100;background:transparent;}'+
    // Neon/status literals that dodge the token system.
    '[data-theme="night"] tr.is-new td{background:rgba(254,1,0,0.08);}'+
    '[data-theme="night"] .status-badge{background:rgba(254,1,0,0.14);}'+
    '[data-theme="night"] .tc-counter.active{background:rgba(254,1,0,0.14);color:#FE0100;}'+
    '[data-theme="night"] .new-pill{color:#000;}'+
    '[data-theme="night"] .pr-modal-status.err,[data-theme="night"] .pr-modal-status.okk{color:#FE0100;}'+
    '[data-theme="night"] .pr-copy.done{color:#FE0100;border-color:#FE0100;}'+
    // Row-action "on" states (note/vote/bookmark/snooze) — green/yellow/blue → red.
    '[data-theme="night"] :is(.ud-note-btn.ud-note-on,.ud-vote.ud-vote-up-on,.ud-vote.ud-vote-dn-on,.ud-bm-btn.ud-bm-on,.pr-ico.pr-vote-up-on,.pr-ico.pr-vote-dn-on,.pr-ico.pr-note-on,.pr-ico.pr-snz-on){color:#FE0100;}'+
    '[data-theme="night"] .ud-fm-sw.on{background:#FE0100;}'+
    '[data-theme="night"] .ud-fm-sw::after{background:#000;}'+
    '[data-theme="night"] .ud-table .ud-row-bondoro td{background:rgba(254,1,0,0.08);}'+
    '[data-theme="night"] .ih-code-filing,[data-theme="night"] .ih-code-news{border-left-color:#FE0100 !important;}'+
    // Briefings/manage stragglers: yellow th-toggle, blue snooze, crimson errors,
    // neon due/note highlights, manage banner tints, white-on-danger hover text.
    '[data-theme="night"] .ud-th-toggle.ud-th-on,[data-theme="night"] .ud-snz-btn.ud-snz-on{color:#FE0100;}'+
    '[data-theme="night"] .ud-due{background:rgba(254,1,0,0.30);}'+
    '[data-theme="night"] .bf-old-note{background:rgba(254,1,0,0.14);}'+
    '[data-theme="night"] .ub-mini.ub-mini-danger,[data-theme="night"] .ce-del{color:#FE0100;border-color:rgba(254,1,0,0.55);}'+
    '[data-theme="night"] .ce-err{color:#FE0100;background:rgba(254,1,0,0.08);border-color:rgba(254,1,0,0.38);}'+
    '[data-theme="night"] .mg-banner.err,[data-theme="night"] .mg-banner.ok,[data-theme="night"] .mg-banner.warn{background:rgba(254,1,0,0.08);}'+
    '[data-theme="night"] .mg-btn-danger:hover{color:#000;}'+
    // Footer logo (dark-mode invert rule never fires in night) → crisp red.
    '[data-theme="night"] #tn-site-footer .tf-logo img{filter:brightness(0) saturate(100%) invert(13%) sepia(94%) saturate(7404%) hue-rotate(11deg) brightness(101%) contrast(115%);}'+
    // Dashboard highlighter set (mirrors the dark-mode block in index.html).
    '[data-theme="night"] .stat-anchor,[data-theme="night"] .anchor-stat,[data-theme="night"] .stat-callout,[data-theme="night"] .lead-headline .accent,[data-theme="night"] h1 .accent,[data-theme="night"] .accent,[data-theme="night"] .card-stat-anchor,[data-theme="night"] .stat-anchor-value{background:#FE0100 !important;color:#000 !important;}'+
    '[data-theme="night"] .cal-day{background:linear-gradient(180deg,transparent 0 60%,#FE0100 60% 96%,transparent 96%) !important;color:#000 !important;}'+
    '[data-theme="night"] .tn-tabs-row:has(.tn-tab:hover) .tn-tab.active:not(:hover) .tn-pill.active{background:rgba(254,1,0,0.10) !important;color:rgba(254,1,0,0.55) !important;border:1px solid transparent !important;}'+
    // Dashboard bits with their own palette (sticky notes, calendar strip).
    '[data-theme="night"] .ih-note-card{background:rgba(254,1,0,0.10);border-top-color:#FE0100;}'+
    '[data-theme="night"] .ih-note-card .title,[data-theme="night"] .ih-note-card strong,[data-theme="night"] .ih-note-card .body{color:#FE0100;}'+
    '[data-theme="night"] .ih-note-nav:hover:not(:disabled){color:#FE0100;}'+
    '[data-theme="night"] .ih-wk-col.today .ih-wk-num{color:#FE0100;}'+
    // Layout tweaks light/dark both carry (night would otherwise fall to neither).
    '[data-theme="night"] .page-title{border-bottom:1px solid var(--line-strong);}'+
    '[data-theme="night"] .ud-day-row td{border-top:none;}'+
    '[data-theme="night"] .ud-table tbody tr:first-child td{padding-top:20px;}';
  (document.head||document.documentElement).appendChild(nightCss);
  // Critical hides, injected NOW (this script is parser-blocking in <head>)
  // rather than with the rest of the gear CSS at DOMContentLoaded: the gear
  // panel's links and the legacy theme toggle are in every page's markup, so
  // deferring these rules flashed "CasesThemesGroupsSourcesVoiceColors" and a
  // stray toggle button in the top-right on every navigation.
  var hideCss=document.createElement('style');
  hideCss.id='tn-critical-hide';
  hideCss.textContent='.tn-gear-panel{display:none;}.tn-kbd-panel{display:none;}#theme-toggle{display:none !important;}#tn-fs{display:none !important;}';
  (document.head||document.documentElement).appendChild(hideCss);
  var K='daily-briefing-theme';
  var ST=['system','dark','light','night'];
  var IC={dark:'\ud83c\udf19',light:'\u2600\ufe0f',system:'\ud83d\udda5\ufe0f',night:'\ud83d\udd34'};
  var LB={dark:'Dark',light:'Light',system:'System',night:'Night'};
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

  // ── Text size — resize the intel pages without the browser's Cmd +/- zoom.
  // Persisted per browser; applied as a body zoom, with the sticky-footer
  // 100vh min-height divided by the same factor so the page stays exactly one
  // viewport tall at any size. ────────────────────────────────────────────────
  var FK='ud-font-scale';
  function fontScale(){ var n=parseInt(localStorage.getItem(FK)||'100',10); return (n>=80&&n<=150)?n:100; }
  function applyFont(){
    if(!document.body)return;
    var z=fontScale()/100;
    // Zoom scales the type, and width = 100%/z pins the layout to exactly one
    // viewport wide at any size — text grows within the same visual layout
    // instead of widening the page or reflowing columns.
    // Touch devices are exempt: iOS mishandles CSS zoom on body (the first
    // paint crops to the zoomed layout — "no padding until I pinch out") and
    // phones already have OS-level text sizing.
    if(matchMedia('(pointer: coarse)').matches) z=1;
    document.body.style.zoom=(z===1?'':String(z));
    document.body.style.width=(z===1?'':'calc(100% / '+z+')');
    document.body.style.minHeight=(z===1?'':'calc(100vh / '+z+')');
    var lab=document.getElementById('tn-fs-label');
    if(lab)lab.textContent=fontScale()+'%';
    var glab=document.getElementById('tn-gf-label');
    if(glab)glab.textContent=fontScale()+'%';
  }
  window.stepFont=function(d){
    var s=Math.max(80,Math.min(150,fontScale()+d*10));
    localStorage.setItem(FK,String(s));applyFont();
  };
  function injectFontControl(){
    var tg=document.getElementById('theme-toggle');
    if(!tg||document.getElementById('tn-fs'))return;
    if(!document.getElementById('tn-fs-style')){
      var st=document.createElement('style');st.id='tn-fs-style';
      st.textContent=
        '#tn-fs{display:inline-flex;align-items:center;gap:4px;margin-right:8px;}'+
        '#tn-fs button{background:transparent;border:1px solid rgba(255,255,255,0.25);color:#fff;border-radius:99px;padding:2px 7px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:800;line-height:1;}'+
        '#tn-fs button:hover{border-color:var(--neon,#D4FF00);}'+
        '#tn-fs #tn-fs-label{font-size:10px;color:rgba(255,255,255,0.6);min-width:30px;text-align:center;font-variant-numeric:tabular-nums;}'+
        '[data-theme=light] #tn-fs button{border-color:rgba(10,10,10,0.14);color:#0A0A0A;}'+
        '[data-theme=light] #tn-fs #tn-fs-label{color:rgba(10,10,10,0.6);}';
      document.head.appendChild(st);
    }
    var fs=document.createElement('span');fs.id='tn-fs';
    fs.setAttribute('title','Text size (in-page — no browser zoom needed)');
    fs.innerHTML='<button type="button" id="tn-fs-dn" title="Smaller text" aria-label="Smaller text">A−</button>'+
      '<span id="tn-fs-label">100%</span>'+
      '<button type="button" id="tn-fs-up" title="Larger text" aria-label="Larger text">A+</button>';
    tg.parentNode.insertBefore(fs,tg);
    document.getElementById('tn-fs-dn').addEventListener('click',function(){window.stepFont(-1);});
    document.getElementById('tn-fs-up').addEventListener('click',function(){window.stepFont(1);});
  }
  // ── g-then-key section navigation (works on every intel page) ──────────
  // g+h Dashboard · g+d Docket · g+c Calendar · g+p Prospects · g+n Notes ·
  // g+w News · Registered in the CAPTURE phase so the second
  // key never leaks into a page's own single-key handlers (h=hide, n=note…).
  var GOTO={h:'index.html',d:'docket.html',c:'calendar.html',p:'prospects.html',n:'notes.html',w:'news.html'};
  var gAt=0;
  // d-then-m / l-then-m / s-then-m / n-then-m  →  set the theme (m = "mode").
  // Same capture-phase trick as the g-prefix: the first key still reaches a
  // page's own single-key handlers (d = Download on docket, n = Note), but 'm'
  // completing the sequence flips the theme instead of leaking through.
  var THEME_SEQ={d:'dark',l:'light',s:'system',n:'night'};
  var tAt=0,tMode=null;
  var markGearTheme=function(){};
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    var t=e.target||{},tag=(t.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea'||tag==='select'||t.isContentEditable)return;
    var k=(e.key||'').toLowerCase();
    var now=Date.now();
    if(k==='g'){gAt=now;tAt=0;e.stopPropagation();return;}
    if(gAt&&now-gAt<900&&GOTO[k]){
      e.preventDefault();e.stopPropagation();
      gAt=0;tAt=0;
      var prefix=location.pathname.indexOf('/cases/')!==-1?'../':'';
      location.href=prefix+GOTO[k];
      return;
    }
    gAt=0;
    if(tAt&&now-tAt<700&&k==='m'&&tMode){
      e.preventDefault();e.stopPropagation();
      localStorage.setItem(K,tMode);apply();markGearTheme();
      tAt=0;tMode=null;
      return;
    }
    if(THEME_SEQ[k]){tMode=THEME_SEQ[k];tAt=now;return;}
    tAt=0;tMode=null;
  },true);

  function wire(){
    apply();
    // Wrap a leading emoji in each h1 (e.g. "🏠 Dashboard") in a span so night
    // mode can hide/tint the glyph — CSS can't select bare text nodes. Case
    // pages already wrap theirs in a <span>; this covers the rest. Pages that
    // re-render their h1 after load (briefings.html swaps in the case pill)
    // get re-wrapped via the observer.
    function wrapH1Emoji(h){
      var n=h.firstChild;
      if(!n||n.nodeType!==3)return;
      var m=(n.nodeValue||'').match(/^\s*(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*)\s*/u);
      if(!m)return;
      var sp=document.createElement('span');
      sp.className='tn-emj';
      sp.textContent=m[1];
      n.nodeValue=n.nodeValue.slice(m[0].length);
      h.insertBefore(document.createTextNode(' '),n);
      h.insertBefore(sp,h.firstChild);
    }
    document.querySelectorAll('h1').forEach(function(h){
      wrapH1Emoji(h);
      new MutationObserver(function(){wrapH1Emoji(h);}).observe(h,{childList:true});
    });
    // Mark the current page's nav link (black bold + full-color emoji via CSS).
    // Normalize ".html" away on BOTH sides — Cloudflare Pages serves clean
    // URLs in production (/intel/docket) while links say "docket.html".
    function navKey(p){
      p=(p||'').split('#')[0].split('?')[0].replace('../','');
      p=p.split('/').pop()||'';
      if(p===''||p==='intel')p='index';
      return p.replace(/\.html$/,'');
    }
    var here=navKey(location.pathname);
    document.querySelectorAll('a.tn-back').forEach(function(a){
      if(navKey(a.getAttribute('href'))===here)a.classList.add('tn-on');
    });
    var b=document.getElementById('theme-toggle');
    if(b)b.addEventListener('click',window.cycleTheme);
    injectFontControl();
    applyFont();
    document.addEventListener('keydown',function(e){
      if(e.metaKey||e.ctrlKey||e.altKey)return;
      if(e.key!=='/')return;
      var t2=e.target||{},tag=(t2.tagName||'').toLowerCase();
      if(tag==='input'||tag==='textarea'||tag==='select'||t2.isContentEditable)return;
      var s=document.getElementById('ud-search');
      if(s){e.preventDefault();s.focus();if(s.select)s.select();}
    });
    var kw=document.getElementById('tn-kbd'),kb=document.getElementById('tn-kbd-btn');
    if(kw&&kb){
      kb.addEventListener('click',function(e){e.stopPropagation();kw.classList.toggle('open');});
      document.addEventListener('click',function(e){if(!kw.contains(e.target))kw.classList.remove('open');});
    }
    var kp=kw&&kw.querySelector('.tn-kbd-panel');
    if(kp&&!kp.querySelector('.tn-kbd-theme-row')){
      var trow=document.createElement('div');
      trow.className='tn-kbd-row tn-kbd-theme-row';
      trow.innerHTML='<span class="tn-key">D</span> · <span class="tn-key">L</span> · <span class="tn-key">S</span> · <span class="tn-key">N</span> then <span class="tn-key">M</span> Dark / Light / System / Night theme';
      kp.appendChild(trow);
    }
    wireGearMenu();
    wireColResize();
    wirePillFlip();
    wireMobileNav();
  }

  // ── Mobile nav — collapse the page links (Dashboard/Docket/Calendar/Notes/
  // News/Prospects) behind a hamburger under 720px (the breakpoint every
  // other mobile rule on the site already uses). Injected here, not in each
  // page's own HTML, so it fixes every page from one file — including the
  // dashboard, Prospects, Manage, and the 23 case pages, none of which had
  // ANY mobile nav handling before this (the page links rendered fully
  // off-screen with no way to reach them on a phone). Keyboard-shortcuts and
  // text-size controls are hidden at this width too — no keyboard to use
  // shortcuts with, and phones already have OS-level zoom. ───────────────────
  function wireMobileNav(){
    var left=document.querySelector('.tn-left');
    if(!left||document.getElementById('tn-hamburger'))return;
    var st=document.createElement('style');
    st.textContent=
      '.tn-hamburger{display:none;align-items:center;justify-content:center;background:transparent;border:none;color:#fff;padding:4px 6px;font-size:15px;line-height:1;opacity:0.7;cursor:pointer;flex:0 0 auto;}'+'.tn-hamburger:hover{opacity:1;}'+
      '.tn.tn-compact .tn-lbl{display:none;}'+
      '.tn-menu{display:none;}'+
      '.tn-back .tn-ico{font-size:1.2em;margin-right:3px;vertical-align:-1px;}'+
      '[data-theme="light"] .tn-hamburger{color:#0A0A0A;}'+
      '@media (max-width:720px){'+
        '.tn-kbd,#tn-fs{display:none !important;}'+
        '.tn-hamburger{display:inline-flex;}'+
        '.tn-left{flex-wrap:nowrap;}'+
        '.tn-back{display:none;}'+
        '.tn{padding:6px 0;}'+
        '.tn-row{justify-content:flex-start;flex-wrap:nowrap;}'+
        '.tn-brand-logo{height:26px;}'+
        '.tn-gear{margin-left:auto;}'+
        '.tn-menu.open{display:block;position:absolute;top:100%;left:0;right:0;background:var(--bg,#000);padding:2px 20px 12px;z-index:200;border-bottom:1px solid rgba(255,255,255,0.12);}'+
        '[data-theme="light"] .tn-menu.open{background:#fff;border-bottom-color:rgba(10,10,10,0.08);}'+
        '.tn-menu .tn-back{display:block;width:100%;padding:12px 0;border-left:none;border-top:1px solid rgba(255,255,255,0.12);font-size:14px;}'+
        '[data-theme="light"] .tn-menu .tn-back{border-top-color:rgba(10,10,10,0.08);}'+
      '}'+
      // Landscape phones: the bar has room for the links but not icon+label —
      // show icons only (short viewport, but wide enough the hamburger is off).
      '@media (max-height:520px) and (min-width:721px){'+
        '.tn-back .tn-lbl{display:none;}'+
        '.tn-back{padding:6px 5px;}'+
        '.tn-back .tn-ico{font-size:17px;}'+

      '}';
    document.head.appendChild(st);
    var row=document.querySelector('.tn-row');
    if(row)row.style.position='relative';
    // Split "🏠 Dashboard" into icon + label spans so landscape can drop the label.
    left.querySelectorAll('.tn-back').forEach(function(a){
      if(a.querySelector('.tn-lbl'))return;
      var txt=(a.textContent||'').trim(),sp=txt.indexOf(' ');
      if(sp<1)return;
      a.innerHTML='<span class="tn-ico">'+txt.slice(0,sp)+'</span> <span class="tn-lbl">'+txt.slice(sp+1)+'</span>';
    });
    // Icons-only when the full labels would wrap the row (desktop widths
    // narrower than the nav's natural width — before the 720px mobile menu).
    var navEl=document.querySelector('.tn');
    var rowEl=navEl&&navEl.querySelector('.tn-row');
    function navRowFits(){
      if(!rowEl||rowEl.children.length<2)return true;
      var t0=rowEl.children[0].offsetTop;
      for(var i=1;i<rowEl.children.length;i++){
        if(rowEl.children[i].offsetTop>t0+10)return false;
      }
      return true;
    }
    function fitNav(){
      if(!navEl)return;
      if(matchMedia('(max-width: 720px)').matches){navEl.classList.remove('tn-compact');return;}
      navEl.classList.remove('tn-compact');
      if(!navRowFits())navEl.classList.add('tn-compact');
    }
    var fitT=null;
    window.addEventListener('resize',function(){clearTimeout(fitT);fitT=setTimeout(fitNav,120);});
    fitNav();
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='tn-hamburger';
    btn.id='tn-hamburger';
    btn.title='Menu';
    btn.setAttribute('aria-haspopup','true');
    btn.setAttribute('aria-label','Menu');
    btn.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:block"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    // Append to the row (not tn-left) so on mobile it sits to the RIGHT of the
    // gear — logo … gear ☰ on one shorter row. Still toggles the tn-left menu.
    (row||left).appendChild(btn);
    // The dropdown is its own panel appended to the bar — the brand stays put
    // (making .tn-left itself the panel dragged the logo into the menu).
    var navBar=document.querySelector('.tn');
    var menu=document.getElementById('tn-menu');
    if(!menu&&navBar){
      menu=document.createElement('div');
      menu.className='tn-menu';
      menu.id='tn-menu';
      navBar.appendChild(menu);
    }
    function closeMenu(){if(menu)menu.classList.remove('open');}
    function fillMenu(){
      if(!menu)return;
      menu.innerHTML='';
      left.querySelectorAll('.tn-back').forEach(function(a){
        var c=a.cloneNode(true);
        c.addEventListener('click',closeMenu);
        menu.appendChild(c);
      });
    }
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      if(!menu)return;
      var open=menu.classList.contains('open');
      if(open){closeMenu();return;}
      var _g=document.getElementById('tn-gear');
      if(_g)_g.classList.remove('open');
      fillMenu();
      menu.classList.add('open');
    });
    document.addEventListener('click',function(e){
      if(menu&&menu.classList.contains('open')&&!menu.contains(e.target)&&e.target!==btn)closeMenu();
    });
  }

  // ── Case-color pills — flip background/text in dark mode ──────────────────
  // Pill markup sets only --pb/--pf (case bg/fg) inline; this rule maps them
  // to background/color normally, and swaps the mapping under [data-theme=dark].
  // Runs once per page load (idempotent — safe if called more than once).
  function wirePillFlip() {
    if (document.getElementById('tn-pill-flip')) return;
    var st = document.createElement('style');
    st.id = 'tn-pill-flip';
    var sel = ['.ud-pill', '.mg-pill', '.ih-pill', '.uc-cal-chip'].map(function (c) {
      return c + '[style*="--pb"]';
    });
    st.textContent =
      sel.join(',') + '{background:var(--pb);color:var(--pf);}' +
      sel.map(function (s) { return '[data-theme="dark"] ' + s; }).join(',') +
      '{background:var(--pf);color:var(--pb);}';
    document.head.appendChild(st);
  }

  // ── Settings nav item — gear icon only, hover/click dropdown to manage.html's
  // sub-tabs. CSS injected here (same trick as wireColResize below) so every
  // page gets it from this one shared script instead of duplicating a style
  // block per page. ──────────────────────────────────────────────────────────
  function wireGearMenu(){
    var gw=document.getElementById('tn-gear'),gb=document.getElementById('tn-gear-btn');
    if(!gw||!gb)return;
    var st=document.createElement('style');
    st.textContent=
      '.tn-gear{position:relative;display:inline-flex;align-items:center;}'+
      '.tn-gear-btn{font-size:15px;background:transparent;border:none;color:inherit;opacity:0.7;cursor:pointer;padding:4px 6px;line-height:1;}'+
      '.tn-gear-btn:hover{opacity:1;}'+
      '.tn-gear-panel{display:none;flex-direction:column;position:absolute;top:100%;right:0;z-index:250;background:var(--surface);border:1px solid var(--line-strong);padding:6px;min-width:150px;box-shadow:0 10px 30px rgba(0,0,0,0.14);}'+
      '.tn-gear-panel a{display:block;padding:8px 10px;font-size:12.5px;font-weight:700;color:var(--ink);text-decoration:none;white-space:nowrap;}'+
      '.tn-gear-panel a:hover{background:var(--paper-2);}'+
      '@media (hover:hover){.tn-gear:hover .tn-gear-panel{display:flex;}}'+
      '.tn-gear.open .tn-gear-panel{display:flex;}'+
      // Theme (System/Dark/Light) and text size live in the gear menu on every
      // viewport — the standalone toggle + A−/A+ strip are hidden for good.
      '.tn-gear-theme{display:flex;flex-direction:column;border-top:1px solid var(--line);margin-top:4px;padding-top:4px;}'+
      '.tn-gear-theme .tn-gt-lbl{font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-40);padding:4px 10px 3px;}'+
      '.tn-gear-theme button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:none;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--ink);cursor:pointer;padding:8px 10px;}'+
      '.tn-gear-theme button:hover{background:var(--paper-2);}'+
      '.tn-gear-theme button .tn-gt-check{margin-left:auto;color:var(--ink-60);visibility:hidden;}'+
      '.tn-gear-theme button.on .tn-gt-check{visibility:visible;}'+
      '.tn-gear-font{display:flex;flex-direction:column;border-top:1px solid var(--line);margin-top:4px;padding-top:4px;}'+
      '.tn-gf-row{display:flex;align-items:center;gap:8px;padding:6px 10px 8px;}'+
      '.tn-gf-row button{background:transparent;border:1px solid var(--line-strong);color:var(--ink);border-radius:99px;padding:3px 9px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:800;line-height:1;}'+
      '.tn-gf-row button:hover{border-color:var(--ink);}'+
      '#tn-gf-label{font-size:11px;color:var(--ink-60);min-width:36px;text-align:center;font-variant-numeric:tabular-nums;}'+
      '#theme-toggle{display:none !important;}'+
      '#tn-fs{display:none !important;}'+
      '@media (pointer: coarse){.tn-gear-font{display:none;}}'+
      // Mobile: drop the floating-card look — the gear panel becomes a
      // full-width sheet under the nav bar, exactly like the hamburger
      // menu (.tn-menu.open), and opens on tap only (no hover-open).
      '@media (max-width:720px){'+
        '.tn-row{position:static !important;}'+
        '.tn-gear{position:static;}'+
        '.tn-gear:hover .tn-gear-panel{display:none;}'+
        '.tn-gear.open .tn-gear-panel{display:flex;position:absolute;top:100%;left:0;right:0;min-width:0;background:var(--bg,#000);border:none;border-bottom:1px solid rgba(255,255,255,0.12);box-shadow:none;padding:2px 20px 12px;z-index:200;}'+
        '[data-theme="light"] .tn-gear.open .tn-gear-panel{background:#fff;border-bottom-color:rgba(10,10,10,0.08);}'+
        '.tn-gear-panel a{padding:12px 0;font-size:14px;border-top:1px solid rgba(255,255,255,0.12);}'+
        '[data-theme="light"] .tn-gear-panel a{border-top-color:rgba(10,10,10,0.08);}'+
        '.tn-gear-panel a:hover{background:transparent;}'+
        '.tn-gear-theme,.tn-gear-font{margin-top:0;padding-top:0;border-top-color:rgba(255,255,255,0.12);}'+
        '[data-theme="light"] .tn-gear-theme,[data-theme="light"] .tn-gear-font{border-top-color:rgba(10,10,10,0.08);}'+
        '.tn-gear-theme button{padding:12px 0;font-size:14px;}'+
        '.tn-gear-theme button:hover{background:transparent;}'+
        '.tn-gt-lbl{padding:10px 0 2px;}'+
        '.tn-gf-row{padding:6px 0 8px;}'+
      '}';
    document.head.appendChild(st);
    var panel=gw.querySelector('.tn-gear-panel');
    if(panel&&!panel.querySelector('[data-gear-briefings]')){
      var _bl=document.createElement('a');
      _bl.href='manage.html#briefing';_bl.textContent='Briefings';
      _bl.setAttribute('data-gear-briefings','1');
      panel.appendChild(_bl);
    }
    function markTheme(){
      if(!panel)return;
      var cur=localStorage.getItem(K)||'system';
      panel.querySelectorAll('.tn-gear-theme button').forEach(function(b){
        b.classList.toggle('on',b.getAttribute('data-theme-set')===cur);
      });
    }
    markGearTheme=markTheme;  // let the d/l/s-then-m keyboard shortcut refresh the checkmark
    if(panel&&!panel.querySelector('.tn-gear-theme')){
      var wrap=document.createElement('div');
      wrap.className='tn-gear-theme';
      wrap.innerHTML='<div class="tn-gt-lbl">Theme</div>'+ST.map(function(t){
        return '<button type="button" data-theme-set="'+t+'"><span class="tn-gt-ico">'+IC[t]+'</span> <span>'+LB[t]+'</span><span class="tn-gt-check">✓</span></button>';
      }).join('');
      panel.appendChild(wrap);
      wrap.addEventListener('click',function(e){
        var b=e.target.closest('[data-theme-set]');
        if(!b)return;
        localStorage.setItem(K,b.getAttribute('data-theme-set'));apply();markTheme();
      });
    }
    if(panel&&!panel.querySelector('.tn-gear-font')){
      var fwrap=document.createElement('div');
      fwrap.className='tn-gear-font';
      fwrap.innerHTML='<div class="tn-gt-lbl">Text size</div>'+
        '<div class="tn-gf-row"><button type="button" data-fs="-1" aria-label="Smaller text">A−</button>'+
        '<span id="tn-gf-label">100%</span>'+
        '<button type="button" data-fs="1" aria-label="Larger text">A+</button></div>';
      panel.appendChild(fwrap);
      fwrap.addEventListener('click',function(e){
        var b=e.target.closest('[data-fs]');
        if(!b)return;
        e.stopPropagation();
        window.stepFont(parseInt(b.getAttribute('data-fs'),10));
      });
      var glab=fwrap.querySelector('#tn-gf-label');
      if(glab)glab.textContent=fontScale()+'%';
    }
    gb.addEventListener('click',function(e){e.stopPropagation();gw.classList.toggle('open');if(gw.classList.contains('open')){var _m=document.getElementById('tn-menu');if(_m)_m.classList.remove('open');markTheme();}});
    document.addEventListener('click',function(e){if(!gw.contains(e.target))gw.classList.remove('open');});
  }

  // ── Draggable column widths on the data tables (docket/news/notes/…) ─────
  // Grab the right edge of any header cell and drag; widths persist per page.
  function wireColResize(){
    var ths=document.querySelectorAll('table.ud-table thead th');
    if(!ths.length)return;
    var st=document.createElement('style');
    st.textContent='table.ud-table thead th{position:relative;}'+
      '.tn-col-grip{position:absolute;top:0;right:-5px;width:10px;height:100%;cursor:col-resize;z-index:5;}'+
      '.tn-col-grip::after{content:"";position:absolute;top:0;bottom:0;left:4px;width:2px;background:transparent;}'+
      '.tn-col-grip:hover::after,.tn-col-grip.on::after{background:var(--neon,#D4FF00);}';
    document.head.appendChild(st);
    // Column widths persist for the SESSION only (sessionStorage): drags
    // survive reloads and page hops in this tab, then reset when it closes —
    // widths saved under old layouts can never haunt future visits (the
    // localStorage version froze the Entry column, shrank tables to the
    // column sum, and pinned a 600px Case column on Notes; old keys are
    // still purged). The flex column — the th with no baked-in inline
    // width — is never persisted: pinning it is what broke the layouts.
    var key='tn-colw-'+((location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'')||'index');
    try{localStorage.removeItem(key);}catch(e){}
    var saved={};
    try{saved=JSON.parse(sessionStorage.getItem(key)||'{}')||{};}catch(e){}
    ths.forEach(function(th,i){
      var id=th.id||('col'+i);
      var flex=!th.style.width;
      if(saved[id]&&!flex)th.style.width=saved[id]+'px';
      var g=document.createElement('span');
      g.className='tn-col-grip';
      g.title='Drag to resize column';
      th.appendChild(g);
      g.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});
      g.addEventListener('mousedown',function(e){
        e.preventDefault();e.stopPropagation();
        var x0=e.clientX,w0=th.getBoundingClientRect().width;
        g.classList.add('on');
        document.body.style.cursor='col-resize';
        function mv(ev){
          var w=Math.max(48,Math.round(w0+(ev.clientX-x0)));
          th.style.width=w+'px';
          if(!flex)saved[id]=w;
        }
        function up(){
          document.removeEventListener('mousemove',mv);
          document.removeEventListener('mouseup',up);
          g.classList.remove('on');
          document.body.style.cursor='';
          try{sessionStorage.setItem(key,JSON.stringify(saved));}catch(e2){}
        }
        document.addEventListener('mousemove',mv);
        document.addEventListener('mouseup',up);
      });
    });
  }
  apply();
  if(document.readyState!=='loading') wire();
  else document.addEventListener('DOMContentLoaded',wire);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);
})();
