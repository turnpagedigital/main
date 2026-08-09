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
    var here=(location.pathname.split('/').pop()||'index.html');
    if(here==='intel'||here==='')here='index.html';   // /intel and /intel/ are the dashboard
    document.querySelectorAll('a.tn-back').forEach(function(a){
      var h=(a.getAttribute('href')||'').split('#')[0].split('?')[0].replace('../','');
      if(h===here)a.classList.add('tn-on');
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
  }
  apply();
  if(document.readyState!=='loading') wire();
  else document.addEventListener('DOMContentLoaded',wire);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);
})();
