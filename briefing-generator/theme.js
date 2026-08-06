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
  function wire(){
    apply();
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
