/* RADAR v11.4.11 backend/cache-only UI cleanup. No static intelligence injection. */
(function(){
  function q(sel){return document.querySelector(sel)}
  function scrubUndefined(){
    document.querySelectorAll('.cios-src-pct,.cios-src-sub,.onum,.dom-b').forEach(function(el){
      if(!el) return;
      var t=(el.textContent||'').trim();
      if(/undefined|null|NaN/i.test(t)) el.textContent = el.classList.contains('cios-src-sub') ? 'No data' : '-';
    });
  }
  function setVersionLabels(){
    var rl=q('.rl'); if(rl) rl.textContent='Radar - v11.4.14';
    var fl=q('.fl'); if(fl) fl.textContent='Qatar Airways - Radar v11.4.14 - Executive Intelligence OS';
    document.title='Qatar Airways Radar v11.4.14 - Executive Intelligence Operating System';
  }
  function removeLegacyStaticNodes(){
    ['execVizShell','v11CommandDeck','v11ActionBoard'].forEach(function(id){ var n=document.getElementById(id); if(n) n.remove(); });
  }
  function init(){ setVersionLabels(); removeLegacyStaticNodes(); scrubUndefined(); try{new MutationObserver(function(){removeLegacyStaticNodes();scrubUndefined();}).observe(document.body,{childList:true,subtree:true,characterData:true});}catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

