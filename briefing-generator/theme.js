(function(){
  var K='daily-briefing-theme';
  var ST=['system','dark','light'];
  var IC={dark:'\ud83c\udf19',light:'\u2600\ufe0f',system:'\ud83d\udda5\ufe0f'};
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
  // ── g-then-key section navigation (works on every intel page) ──────────
  // g+h Dashboard · g+d Docket · g+c Calendar · g+p Prospects · g+n Notes ·
  // g+r News · Registered in the CAPTURE phase so the second
  // key never leaks into a page's own single-key handlers (h=hide, n=note…).
  var GOTO={h:'index.html',d:'docket.html',c:'calendar.html',p:'prospects.html',n:'notes.html',r:'news.html'};
  var gAt=0;
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    var t=e.target||{},tag=(t.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea'||tag==='select'||t.isContentEditable)return;
    var k=(e.key||'').toLowerCase();
    var now=Date.now();
    if(k==='g'){gAt=now;e.stopPropagation();return;}
    if(gAt&&now-gAt<900&&GOTO[k]){
      e.preventDefault();e.stopPropagation();
      gAt=0;
      var prefix=location.pathname.indexOf('/cases/')!==-1?'../':'';
      location.href=prefix+GOTO[k];
      return;
    }
    gAt=0;
  },true);

  function wire(){
    apply();
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
    wireColResize();
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
    var key='tn-colw-'+((location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'')||'index');
    var saved={};
    try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){}
    ths.forEach(function(th,i){
      var id=th.id||('col'+i);
      if(saved[id])th.style.width=saved[id]+'px';
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
          saved[id]=w;
        }
        function up(){
          document.removeEventListener('mousemove',mv);
          document.removeEventListener('mouseup',up);
          g.classList.remove('on');
          document.body.style.cursor='';
          try{localStorage.setItem(key,JSON.stringify(saved));}catch(e2){}
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
