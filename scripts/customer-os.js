/* =========================================================
   Radar v9.3 - Leadership Command Center implementation
   Fixes: Leadership Focus Today, Executive Narrative, Direct vs OTA Pressure
   No localStorage key changes. Uses current API/saved domain data only.
   ========================================================= */
(function(){
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const hasFn = (name)=> typeof window[name] === 'function';
  const domLabel = (id)=> (window.DOM_LABELS && window.DOM_LABELS[id]) || id || 'Unknown domain';
  const rows = ()=>{
    try{
      const raw = hasFn('allLoadedSignals') ? window.allLoadedSignals() : [];
      const filtered = raw.filter(r => r && r.signal && (!hasFn('isForwardSignal') || window.isForwardSignal(r.signal)));
      return filtered.length ? filtered : raw.filter(r => r && r.signal);
    }catch(e){ return []; }
  };
  const textOf = (s)=>{
    try{ if(hasFn('signalText')) return window.signalText(s); }catch(e){}
    return [s?.title,s?.body,s?.whyItMattersNow,s?.captureStrategy,s?.impactLabel,s?.source,s?.relevanceWindow,s?.timeToImpact]
      .filter(Boolean).join(' ').toLowerCase();
  };
  const isRisk = (s)=>{
    try{ if(hasFn('isRiskSignal') && window.isRiskSignal(s)) return true; }catch(e){}
    return /risk|threat|pressure|loss|decline|drop|disrupt|delay|strike|outage|negative|weak|warning|concern/i.test(textOf(s));
  };
  const isOpp = (s)=>{
    try{ if(hasFn('isOpportunitySignal') && window.isOpportunitySignal(s)) return true; }catch(e){}
    return /opportunity|growth|gain|capture|increase|recover|surge|uplift|launch|expansion|strong|win/i.test(textOf(s));
  };
  const score = (r)=>{
    const s = r?.signal || {};
    let val = 5;
    try{ if(hasFn('getCommercialImpactScore')) val = Number(window.getCommercialImpactScore(s)) || val; }catch(e){}
    const t = textOf(s);
    if(/revenue|margin|yield|fare|price|pricing|conversion|booking|ota|agent|direct|loyalty|premium|ancillary|customer|app|web/i.test(t)) val += 2;
    if(isRisk(s)) val += 1.5;
    if(/today|immediate|urgent|now|active|next_30_days|30 days/i.test(String(s.relevanceWindow || s.timeToImpact || t))) val += 1;
    if(['rev','dig','agt','loy','cmp','prd','rep'].includes(r?.domain)) val += 1;
    return Math.max(1, Math.min(10, Math.round(val)));
  };
  const typeOf = (r)=> isRisk(r.signal) ? 'risk' : isOpp(r.signal) ? 'opp' : 'lever';
  const snippet = (s)=> s?.whyItMattersNow || s?.captureStrategy || s?.body || s?.impactLabel || 'Review this signal and agree the next leadership action.';
  const sortedRows = ()=> rows().map(r=>({...r, lScore: score(r), lType: typeOf(r)})).sort((a,b)=>{
    const sd = b.lScore-a.lScore; if(sd) return sd;
    return (b.lType==='risk'?1:0) - (a.lType==='risk'?1:0);
  });
  const topRows = ()=>{
    const seen = new Set();
    const out = [];
    for(const r of sortedRows()){
      const key = r.domain + '|' + String(r.signal?.title || '').slice(0,40);
      if(seen.has(key)) continue;
      seen.add(key); out.push(r);
      if(out.length >= 3) break;
    }
    return out;
  };
  const openRow = (idx)=>{
    const r = topRows()[idx];
    if(!r) return;
    try{ if(hasFn('openDom')) window.openDom(r.domain); }catch(e){}
    setTimeout(()=>document.getElementById('detPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  };
  window.rv93OpenLeadRow = openRow;

  function renderFocus(){
    const holder = document.getElementById('leadActionCards');
    if(!holder) return;
    const top = topRows();
    if(!top.length){
      holder.innerHTML = '<div class="lead-empty">Load or refresh domains to populate the top leadership actions. This area will show the three items VP/SVP should address first.</div>';
      return;
    }
    holder.innerHTML = top.map((r,i)=>{
      const s = r.signal || {};
      const type = r.lType;
      const tag = type === 'risk' ? 'Revenue risk' : type === 'opp' ? 'Growth opportunity' : 'Direct lever';
      const btn = type === 'risk' ? 'Address now' : type === 'opp' ? 'Build plan' : 'Review lever';
      return `<article class="lead-action ${esc(type)}">
        <div class="lead-rank">${i+1}</div>
        <span class="lead-tag ${esc(type)}">${esc(tag)}</span>
        <div class="lead-action-title">${esc(s.title || 'Review Digital/B2C signal')}</div>
        <div class="lead-action-body">${esc(String(snippet(s)).slice(0,155))}</div>
        <div class="lead-meta"><span class="lead-domain">${esc(domLabel(r.domain))}</span><span class="lead-score">${r.lScore}/10</span></div>
        <button type="button" onclick="rv93OpenLeadRow(${i})">${esc(btn)}</button>
      </article>`;
    }).join('');
  }

  function renderNarrative(){
    const main = document.getElementById('leadNarrativeMain');
    const txt = document.getElementById('leadNarrativeText');
    const sub = document.getElementById('leadDeckSub');
    const data = sortedRows();
    const loaded = (window.DOMAINS && window.domData) ? window.DOMAINS.filter(id => !!window.domData[id]).length : 0;
    if(!data.length){
      if(main) main.textContent = 'Digital/B2C scan is ready.';
      if(txt) txt.textContent = 'Connect the API or load saved domains to generate an executive summary for Digital Product VP and SVP review.';
      if(sub) sub.textContent = 'Prioritised by website/app impact, direct-booking growth, loyalty, OTA pressure and urgency.';
      return;
    }
    const risks = data.filter(r=>r.lType==='risk');
    const opps = data.filter(r=>r.lType==='opp');
    const top = data[0];
    const topDomain = domLabel(top.domain);
    const topTitle = top.signal?.title || 'top Digital/B2C signal';
    if(main) main.textContent = `${topDomain} is the highest priority leadership focus.`;
    if(txt) txt.textContent = `${risks.length} risk signals and ${opps.length} opportunity signals are loaded across ${loaded}/14 domains. The leading item is '${topTitle}'. Use this to steer discussion toward direct booking growth, OTA pressure, conversion risk, loyalty and immediate B2C actions.`;
    if(sub) sub.textContent = `${loaded}/14 domains loaded - ${risks.length} risks - ${opps.length} opportunities - ranked by impact and urgency.`;
  }

  function renderPressure(){
    const data = sortedRows();
    const otaRe = /ota|agent|agency|metasearch|google flights|skyscanner|kayak|expedia|booking\.com|distribution|gds|fare comparison|price comparison|third.party/i;
    const directRe = /direct|booking|conversion|app|web|loyalty|member|customer|ucp|personalisation|personalization|ancillary|owned channel|qatarairways\.com|mobile/i;
    const ota = data.filter(r => otaRe.test(textOf(r.signal)) || r.domain === 'agt');
    const direct = data.filter(r => directRe.test(textOf(r.signal)) || ['dig','loy','prd','rev'].includes(r.domain));
    const avg = (arr)=> arr.length ? arr.reduce((a,r)=>a+r.lScore,0)/arr.length : 0;
    const otaScore = Math.min(100, Math.round(avg(ota)*10 + Math.min(15, ota.length)));
    const directScore = Math.min(100, Math.round(avg(direct)*10 + Math.min(15, direct.length)));
    const ov = document.getElementById('otaPressureV');
    const dv = document.getElementById('directStrengthV');
    const note = document.getElementById('pressureNote');
    if(ov) ov.textContent = data.length ? `${otaScore}%` : '-';
    if(dv) dv.textContent = data.length ? `${directScore}%` : '-';
    if(note){
      if(!data.length) note.textContent = 'Uses external signals only. Treat as estimated market pressure, not internal booking share.';
      else if(otaScore > directScore) note.textContent = `OTA/agent pressure is stronger than direct-channel strength in the current external scan. Focus on price visibility, direct offers, mobile conversion and loyalty capture.`;
      else note.textContent = `Direct-channel strength is currently stronger than OTA pressure. Use this momentum to protect direct booking share and convert high-intent demand.`;
    }
  }

  function renderSituation(){
    const sit = document.getElementById('sitTxt');
    const tags = document.getElementById('sitTags');
    if(!sit && !tags) return;
    const data = sortedRows();
    const loaded = (window.DOMAINS && window.domData) ? window.DOMAINS.filter(id => !!window.domData[id]).length : 0;
    if(!data.length){
      if(sit) sit.textContent = 'API-driven Digital/B2C situation - refresh domains to populate current leadership focus';
      if(tags) tags.innerHTML = ['API driven','Leadership focus','Revenue risk','Direct growth'].map(t=>`<span class="stag">${t}</span>`).join('');
      return;
    }
    const risks = data.filter(r=>r.lType==='risk').length;
    const opps = data.filter(r=>r.lType==='opp').length;
    const top = data[0];
    if(sit) sit.textContent = `${window.VIEW_MODE === 'b2c' ? 'B2C' : 'Enterprise'} Digital/B2C scan - ${risks} risks - ${opps} opportunities - top focus: ${domLabel(top.domain)} - ${(top.signal?.title || 'review current signal').slice(0,70)}`;
    if(tags){
      const group = {};
      data.slice(0,20).forEach(r=>{ (group[r.domain] ||= {max:0,count:0}).max=Math.max(group[r.domain].max,r.lScore); group[r.domain].count++; });
      tags.innerHTML = Object.entries(group).sort((a,b)=>b[1].max-a[1].max).slice(0,4).map(([id,g])=>`<span class="stag">${esc(domLabel(id))} - ${g.count} signal${g.count>1?'s':''} - ${g.max}/10</span>`).join('') + `<span class="stag">${loaded}/14 loaded</span>`;
    }
  }

  function renderAll(){
    try{ renderFocus(); renderNarrative(); renderPressure(); renderSituation(); }
    catch(e){ console.warn('Leadership command center render failed', e); }
  }
  window.renderLeadershipCommandCenter = renderAll;

  // Patch existing refresh points without changing storage keys or API flow.
  const wrap = (name)=>{
    const original = window[name];
    if(typeof original !== 'function' || original.__rv93Wrapped) return;
    const wrapped = function(){
      const result = original.apply(this, arguments);
      setTimeout(renderAll, 80);
      return result;
    };
    wrapped.__rv93Wrapped = true;
    window[name] = wrapped;
  };
  ['refreshRadarDerivedState','updateExecutiveScorecard','saveDomain','loadSaved','switchView','clearDomain','loadAll','loadDom'].forEach(wrap);

  document.addEventListener('DOMContentLoaded', ()=>setTimeout(renderAll, 150));
  setTimeout(renderAll, 300);
  setTimeout(renderAll, 1200);
})();

/* Legacy presentation class remains disabled. */
document.addEventListener('DOMContentLoaded', function(){
  try { document.body.classList.remove('presentation-mode'); } catch(e) {}
});


async function testSupabaseSaves(){console.log('Testing...');try{const r=await fetch(BACKEND_URL+'/api/actionplans/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'Test',domainId:'test',domainTitle:'Test',viewMode:'b2c',plan:{title:'T',summary:'T',totalValue:'$1M',confidence:'High',steps:[]}})});const d=await r.json();console.log('AP:',d.success?'OK':'ERROR '+d.error);}catch(e){console.error('AP:ERROR',e.message);}try{const r=await fetch(BACKEND_URL+'/api/competitors/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({competitorId:'test_d',data:{name:'T',overallThreat:50,summary:'T',weaknesses:[],opportunities:[],actions:[]}})});const d=await r.json();console.log('Comp:',d.success?'OK':'ERROR '+d.error);}catch(e){console.error('Comp:ERROR',e.message);}}
window.testSupabaseSaves=testSupabaseSaves;


// â”€â”€ CUSTOMER SENTIMENT INTELLIGENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var SENT_DATA = {};
var SENT_STORE = 'qr_v10_sent_';
var SENT_LOADED = false;
var ACTIVE_SENT = null;

var SENT_META = {
  reddit:     { name:'Reddit', icon:'&#128992;', color:'#FF4500', sources:'r/QatarAirways, r/flights, r/awardtravel, r/TravelHacks', note:'Unfiltered passenger community with highest volume of operational complaints.' },
  flyertalk:  { name:'FlyerTalk', icon:'&#9992;', color:'#1a3a8a', sources:'FlyerTalk Qatar Airways forum', note:'Frequent flyer community. High-value passengers. Elite tier complaints carry highest churn risk.' },
  trustpilot: { name:'Trustpilot', icon:'&#11088;', color:'#00b67a', sources:'Trustpilot qatarairways.com reviews', note:'Verified customers. Refund failures, baggage loss, and compensation delays dominate.' },
  tripadvisor:{ name:'TripAdvisor', icon:'&#127807;', color:'#34e0a1', sources:'TripAdvisor airline reviews', note:'Mixed leisure and business travellers. Cabin experience and food quality dominant themes.' },
  skytrax:    { name:'Skytrax', icon:'&#127942;', color:'#1a1a6a', sources:'Skytrax verified reviews', note:'Industry benchmark reviews. Premium experience focus.' },
  quora:      { name:'Quora', icon:'&#128172;', color:'#b92b27', sources:'Quora Qatar Airways questions', note:'Long-form passenger experience sharing. Good for booking and loyalty pain points.' },
  twitter:    { name:'X/Twitter', icon:'X', color:'#1da1f2', sources:'X/Twitter @qatarairways mentions', note:'Real-time complaints and viral service failures.' },
  consumer:   { name:'Consumer Affairs', icon:'&#128203;', color:'#e67e22', sources:'ConsumerAffairs, PissedConsumer, AirlineQuality', note:'Formal complaint platforms with highest severity issues.' }
};


function sentimentPriorityScore(src, data){
  // Lower sentiment and high-impact complaints should rise first.
  let score = 0;
  const sc = Number(data?.overallSentiment);
  if(Number.isFinite(sc)) score += (100 - sc) * 1.2;
  const pain = data?.painPoints || [];
  const improvements = data?.improvements || [];
  score += pain.filter(p => /revenue|loyalty|brand|ops|operational|refund|baggage|delay|missed|connection|compensation/i.test([p.impact,p.title,p.detail].join(' '))).length * 12;
  score += improvements.filter(i => /quick win|revenue|loyalty|retention|conversion|app|web|refund|baggage/i.test([i.effort,i.title,i.detail,i.value].join(' '))).length * 6;
  const base = {twitter:10, reddit:9, flyertalk:9, trustpilot:8, skytrax:7, tripadvisor:6, consumer:6, quora:4};
  return score + (base[src] || 0);
}
function reorderSentimentSources(){
  const wrap = document.querySelector('.sent-sources');
  if(!wrap) return;
  Array.from(wrap.querySelectorAll('.sent-tile')).sort((a,b)=>{
    const as=a.getAttribute('data-src'), bs=b.getAttribute('data-src');
    const diff = sentimentPriorityScore(bs, SENT_DATA[bs]) - sentimentPriorityScore(as, SENT_DATA[as]);
    if(diff) return diff;
    return String(SENT_META[as]?.name||as).localeCompare(String(SENT_META[bs]?.name||bs));
  }).forEach(t=>wrap.appendChild(t));
}

function loadSentFromStorage(src){try{var r=localStorage.getItem(SENT_STORE+src);return r?JSON.parse(r):null;}catch(e){return null;}}
function saveSentToStorage(src,data){try{localStorage.setItem(SENT_STORE+src,JSON.stringify({savedAt:new Date().toISOString(),data:data}));}catch(e){}}

function sentimentTextFromSignal(signal){
  return [
    signal && (signal.title || signal.name || signal.headline),
    signal && (signal.body || signal.detail || signal.description || signal.summary),
    signal && (signal.whyItMattersNow || signal.why_it_matters_now),
    signal && (signal.captureStrategy || signal.capture_strategy),
    signal && (signal.impactLabel || signal.impact_label),
    signal && (signal.source || signal.sourceName || signal.platform)
  ].filter(Boolean).join(' ');
}

function domainCacheSignalsForSentiment(src){
  var domainMap = {
    twitter:['sml','rep','ops','prd'],
    reddit:['sml','rep','prd','ops','loy'],
    flyertalk:['loy','prd','ops','rep'],
    trustpilot:['rep','ops','prd'],
    tripadvisor:['prd','rep','loy'],
    skytrax:['prd','rep','loy'],
    quora:['agt','dig','loy','prd'],
    consumer:['rep','ops','prd','reg']
  };
  var sourceTerms = {
    twitter:/\bx\b|twitter|tweet|retweet|mention|social|viral|trend/i,
    reddit:/reddit|r\/|subreddit|thread|community|upvote/i,
    flyertalk:/flyertalk|frequent flyer|elite|tier|avios|miles|lounge|upgrade|status/i,
    trustpilot:/trustpilot|verified review|star rating|customer review/i,
    tripadvisor:/tripadvisor|traveler|traveller|holiday|family trip|cabin|food/i,
    skytrax:/skytrax|world airline awards|airline rating|premium cabin|five star|5-star/i,
    quora:/quora|question|answer|how to|why does|can i/i,
    consumer:/consumer affairs|consumeraffairs|pissedconsumer|airlinequality|formal complaint|case id|chargeback/i
  };
  var themeTerms = {
    twitter:/social|viral|tweet|mention|trend|x\/twitter|realtime/i,
    reddit:/community|thread|discussion|subreddit|passenger discussion/i,
    flyertalk:/tier|status|avios|miles|upgrade|lounge|frequent flyer/i,
    trustpilot:/refund|compensation|baggage|support|review|rating/i,
    tripadvisor:/cabin|crew|food|seat|comfort|traveller review/i,
    skytrax:/award|premium|service quality|cabin crew|business class|first class/i,
    quora:/question|answer|how to|why|booking advice|loyalty advice/i,
    consumer:/complaint|case|refund|chargeback|escalation|compensation/i
  };
  var sentimentTerms = /customer|passenger|review|complaint|sentiment|refund|delay|app|website|loyalty|service|booking|baggage|cabin|social|brand|reputation/i;
  var personaTerms = {
    reddit:/ota|agent|fare|price|refund|delay|complaint|support|cancel|baggage|app|website|booking|churn|leakage|outage|friction/i,
    tripadvisor:/cabin|crew|seat|food|comfort|service|lounge|airport|check-?in|experience|holiday|family|destination/i,
    quora:/booking|policy|visa|avios|loyalty|upgrade|award|status|change|tips|guide|how to|why|can i/i
  };
  var domains = (domainMap[src] || ['sml','rep','prd','ops'])
    .map(function(id){
      var d = (window.radarData && window.radarData.domains && window.radarData.domains[id]) || (typeof domData !== 'undefined' && domData && domData[id]);
      return d ? { id:id, data:d } : null;
    })
    .filter(Boolean);

  var candidates = [];
  domains.forEach(function(entry){
    (entry.data.signals || []).forEach(function(signal){
      var text = sentimentTextFromSignal(signal);
      var metaText = [
        signal && signal.source, signal && signal.sourceName, signal && signal.platform,
        signal && signal.channel, signal && signal.origin
      ].filter(Boolean).join(' ');
      var sourceMatch = sourceTerms[src] ? (sourceTerms[src].test(text) || sourceTerms[src].test(metaText)) : false;
      var themeMatch = themeTerms[src] ? themeTerms[src].test(text) : false;
      var sentimentMatch = sentimentTerms.test(text);
      if(!sourceMatch && !themeMatch) return;
      if(!sentimentMatch) return;
      var impact = Number(signal.ai_rank_score || signal.commercial_impact_score || signal.commercialImpactScore || 0);
      var relevance = (sourceMatch ? 4 : 0) + (themeMatch ? 2 : 0) + Math.min(2, Math.round(impact / 50));
      candidates.push({ signal: signal, text: text, relevance: relevance, domainId: entry.id });
    });
  });

  // If source matching is too sparse, use a controlled source-persona fallback from mapped domains.
  if(candidates.length < 2){
    var fallback = [];
    domains.forEach(function(entry){
      (entry.data.signals || []).forEach(function(signal){
        var text = sentimentTextFromSignal(signal);
        if(!sentimentTerms.test(text)) return;
        var personaHit = personaTerms[src] ? personaTerms[src].test(text) : false;
        var impact = Number(signal.ai_rank_score || signal.commercial_impact_score || signal.commercialImpactScore || 0);
        var relevance = (personaHit ? 3 : 1) + Math.min(2, Math.round(impact / 50));
        fallback.push({ signal: signal, text: text, relevance: relevance, domainId: entry.id });
      });
    });
    fallback.sort(function(a,b){
      var as = Number(a.signal.ai_rank_score || a.signal.commercial_impact_score || a.signal.commercialImpactScore || 0);
      var bs = Number(b.signal.ai_rank_score || b.signal.commercial_impact_score || b.signal.commercialImpactScore || 0);
      return (b.relevance * 100 + bs) - (a.relevance * 100 + as);
    });
    candidates = fallback.slice(0, 10);
  }

  var seen = {};
  var unique = [];
  candidates
    .sort(function(a,b){
      var as = Number(a.signal.ai_rank_score || a.signal.commercial_impact_score || a.signal.commercialImpactScore || 0);
      var bs = Number(b.signal.ai_rank_score || b.signal.commercial_impact_score || b.signal.commercialImpactScore || 0);
      return (b.relevance * 100 + bs) - (a.relevance * 100 + as);
    })
    .forEach(function(item){
      var key = String((item.signal && (item.signal.title || item.signal.name || item.signal.body || '')) || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      if(!key || seen[key]) return;
      seen[key] = true;
      unique.push(item);
    });
  return unique.slice(0, 8);
}

function sentimentIssueFromSignal(item, fallbackImpact){
  var s = item.signal || {};
  var title = s.title || s.name || 'Customer signal';
  var detail = s.body || s.detail || s.description || s.whyItMattersNow || s.why_it_matters_now || 'Backend/cache signal linked to customer sentiment.';
  var score = Number(s.ai_rank_score || s.commercial_impact_score || s.commercialImpactScore || 0);
  return {
    title: String(title).slice(0, 90),
    detail: String(detail).slice(0, 180),
    frequency: score >= 80 ? 'High' : score >= 55 ? 'Medium' : 'Low',
    impact: fallbackImpact || s.impact_label || s.impactLabel || (score >= 70 ? 'High business impact' : 'Monitor for customer impact')
  };
}

function sentimentFromDomainCache(src){
  var items = domainCacheSignalsForSentiment(src);
  if(!items.length) return null;
  var sourceSeed = {twitter:0, reddit:3, flyertalk:5, trustpilot:1, tripadvisor:2, skytrax:4, quora:6, consumer:7}[src] || 0;
  var offset = items.length ? (sourceSeed % items.length) : 0;
  var ranked = items.slice(offset).concat(items.slice(0, offset));
  var joined = items.map(function(i){ return i.text; }).join(' ').toLowerCase();
  var negativeRegex = /complaint|delay|refund|failure|issue|friction|negative|poor|missed|baggage|cancellation|compensation|wait|risk|churn|leakage|outage|bug|disruption|spike|lock.?in/i;
  var positiveRegex = /award|best|positive|praise|premium|improve|opportunity|growth|strong|loyalty gain|service recovery|win|satisfaction|on.?time|upgrade/i;
  var negativeTerms = (joined.match(new RegExp(negativeRegex.source, 'g')) || []).length;
  var positiveTerms = (joined.match(new RegExp(positiveRegex.source, 'g')) || []).length;
  var sourceBias = {twitter:-7, reddit:-4, flyertalk:-2, trustpilot:-5, tripadvisor:2, skytrax:5, quora:0, consumer:-8}[src] || 0;
  var score = Math.max(34, Math.min(86, Math.round(64 + sourceBias + positiveTerms * 1.5 - negativeTerms * 2.1 + Math.min(items.length, 5))));
  var label = score >= 68 ? 'Positive but watchlisted' : score >= 52 ? 'Mixed customer pressure' : 'Negative customer pressure';
  var occupiedTitles = {};
  try{
    Object.keys(SENT_DATA || {}).forEach(function(other){
      if(other === src) return;
      var d = SENT_DATA[other] || {};
      (d.painPoints || []).forEach(function(p){
        var t = String((p && (p.title || p.issue || p.pain || '')) || '').toLowerCase().trim();
        if(t) occupiedTitles[t] = true;
      });
    });
  }catch(e){}

  var rawPain = ranked
    .filter(function(i){ return negativeRegex.test(i.text); })
    .map(function(i){ return sentimentIssueFromSignal(i, 'Customer/revenue risk from backend cache'); });
  var pain = rawPain
    .filter(function(p){ return !occupiedTitles[String(p.title || '').toLowerCase().trim()]; })
    .slice(0, 4);
  if(pain.length < 2) pain = rawPain.slice(0, 4);
  if(!pain.length) pain = ranked.slice(0, 2).map(function(i){ return sentimentIssueFromSignal(i, 'Customer sentiment watch item'); });
  var painKeys = {};
  pain.forEach(function(p){ painKeys[String(p.title || '').toLowerCase()] = true; });
  var strengths = ranked
    .filter(function(i){ return positiveRegex.test(i.text) && !negativeRegex.test(i.text); })
    .slice(0, 3)
    .map(function(i){ return {
      title: String((i.signal && (i.signal.title || i.signal.name)) || 'Positive signal').slice(0, 90),
      detail: String((i.signal && (i.signal.body || i.signal.detail || i.signal.description)) || 'Backend/cache signal indicates brand or product strength.').slice(0, 170),
      frequency: 'Medium'
    }; })
    .filter(function(s){ return !painKeys[String(s.title || '').toLowerCase()]; });
  if(!strengths.length){
    strengths = ranked
      .filter(function(i){ return !negativeRegex.test(i.text); })
      .slice(0, 2)
      .map(function(i){ return {
        title: String((i.signal && (i.signal.title || i.signal.name)) || 'Neutral brand signal').slice(0, 90),
        detail: String((i.signal && (i.signal.body || i.signal.detail || i.signal.description)) || 'Backend/cache signal indicates a neutral or improving customer area.').slice(0, 170),
        frequency: 'Low'
      }; });
  }
  var improvements = pain.slice(0, 3).map(function(p){
    return {
      title: 'Act on ' + p.title,
      detail: 'Use the loaded backend/cache signal to brief owner, verify source freshness, and define a customer-facing response.',
      effort: 'Medium',
      value: /refund|booking|loyalty|app|website|revenue|churn/i.test(p.title + ' ' + p.detail) ? 'Revenue protection' : 'Service recovery',
      owner: /app|website|booking|checkout/i.test(p.title + ' ' + p.detail) ? 'Digital Product' : 'Customer Experience'
    };
  });
  return {
    source: src,
    sourceName: (SENT_META[src] && SENT_META[src].name) || src,
    overallSentiment: score,
    sentimentLabel: label + ' - derived from backend cache',
    totalMentions: String(items.length) + ' cache signals',
    topComplaint: pain[0] ? pain[0].title : 'No complaint theme detected',
    topPraise: strengths[0] ? strengths[0].title : 'Brand strength under monitoring',
    painPoints: pain,
    strengths: strengths,
    improvements: improvements,
    verbatims: ranked.slice(0, 4).map(function(i){ return String((i.signal && (i.signal.title || i.signal.body || i.signal.detail)) || i.text).slice(0, 160); })
  };
}

function renderSent(src,data){
  data = normalizeSentimentData(src, data);
  var meta=SENT_META[src]||{};
  var sc=data.overallSentiment||60;
  var scColor=sc>=70?'#1abc9c':sc>=50?'#C8A050':'#e74c3c';
  var painH=(data.painPoints||[]).map(function(p){return '<div class="sent-item"><div class="sent-dot" style="background:#e74c3c"></div><div class="sent-item-b"><div class="sent-item-t">'+esc(p.title)+'</div><div class="sent-item-d">'+esc(p.detail)+'</div><div><span class="sent-item-freq '+(p.frequency==='High'?'sf-high':p.frequency==='Medium'?'sf-med':'sf-low')+'">'+esc(p.frequency)+' freq</span></div><div class="sent-item-src">Impact: '+esc(p.impact)+'</div></div></div>';}).join('');
  var strengthH=(data.strengths||[]).map(function(s){return '<div class="sent-item"><div class="sent-dot" style="background:#1abc9c"></div><div class="sent-item-b"><div class="sent-item-t">'+esc(s.title)+'</div><div class="sent-item-d">'+esc(s.detail)+'</div><div><span class="sent-item-freq '+(s.frequency==='High'?'sf-high':s.frequency==='Medium'?'sf-med':'sf-low')+'">'+esc(s.frequency)+' freq</span></div></div></div>';}).join('');
  var improveH=(data.improvements||[]).map(function(i){return '<div class="sent-item"><div class="sent-dot" style="background:#C8A050"></div><div class="sent-item-b"><div class="sent-item-t">'+esc(i.title)+'</div><div class="sent-item-d">'+esc(i.detail)+'</div><div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap"><span class="sent-item-freq '+(i.effort==='Quick win'?'sf-low':i.effort==='Medium'?'sf-med':'sf-high')+'">'+esc(i.effort)+'</span><span class="sent-item-freq sf-low">'+esc(i.value)+'</span></div><div class="sent-item-src">Owner: '+esc(i.owner)+'</div></div></div>';}).join('');
  var verbH=(data.verbatims||[]).map(function(v){return '<div style="padding:8px 10px;background:var(--bg2);border-left:2px solid '+(meta.color||'var(--qb)')+';border-radius:0 4px 4px 0;font-size:10px;color:var(--t2);font-style:italic;margin-bottom:6px">"'+esc(v)+'"</div>';}).join('');
  document.getElementById('sentDetail').innerHTML='<div class="sent-detail"><div class="sent-det-hdr"><div><div class="sent-det-title">'+meta.icon+' '+meta.name+' Sentiment Analysis</div><div class="sent-det-sub">'+data.totalMentions+' mentions analysed - Top complaint: '+data.topComplaint+'</div></div><div style="text-align:center"><div style="font-size:28px;font-weight:500;color:'+scColor+'">'+sc+'%</div><div style="font-size:10px;color:var(--t3)">'+data.sentimentLabel+'</div></div></div><div style="padding:14px 18px;background:var(--bg2);border-bottom:1px solid var(--bo)"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em">CUSTOMER VERBATIMS</div>'+verbH+'</div><div class="sent-body"><div class="sent-col"><div class="sent-col-t" style="color:#e74c3c">Pain Points ('+((data.painPoints||[]).length)+')</div>'+painH+'</div><div class="sent-col"><div class="sent-col-t" style="color:#1abc9c">Strengths ('+((data.strengths||[]).length)+')</div>'+strengthH+'</div><div class="sent-col"><div class="sent-col-t" style="color:#C8A050">Improvements ('+((data.improvements||[]).length)+')</div>'+improveH+'</div></div></div>';
  reorderSentimentSources();
}

function updateSentGauge(){
  var scores=Object.values(SENT_DATA).filter(function(d){return d&&d.overallSentiment;}).map(function(d){return d.overallSentiment;});
  if(!scores.length) return;
  var avg=Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length);
  var g=document.getElementById('sentGauge'); if(g) g.style.display='flex';
  var fill=document.getElementById('sentGaugeFill'); if(fill){fill.style.width=avg+'%';fill.style.background=avg>=70?'#1abc9c':avg>=50?'#C8A050':'#e74c3c';}
  var num=document.getElementById('sentGaugeNum'); if(num) num.textContent=avg;
}

async function loadAllSentiment(){
  for(const src of Object.keys(SENT_META)){
    await loadSent(src);
  }
}

function clearSentCache(){
  if(!confirm('Clear all saved sentiment analyses?')) return;
  Object.keys(SENT_META).forEach(function(src){
    try{localStorage.removeItem(SENT_STORE+src);}catch(e){}
    var bar=document.getElementById('sbar-'+src); if(bar) bar.style.width='0%';
    var score=document.getElementById('sscore-'+src); if(score) score.textContent='-';
    var btn=document.getElementById('sbtn-'+src); if(btn){btn.textContent='No data';btn.classList.remove('loaded');btn.disabled=false;}
  });
  document.querySelectorAll('.sent-tile').forEach(function(t){t.classList.remove('on');});
  reorderSentimentSources();
  document.getElementById('sentDetail').innerHTML='<div style="padding:32px;text-align:center;color:var(--t3);background:var(--su);border:1px solid var(--bo);border-radius:var(--r3)"><div style="font-size:36px;margin-bottom:10px">&#128172;</div><div style="font-size:13px;color:var(--t2);font-weight:500">All sentiment caches cleared</div></div>';
  var g=document.getElementById('sentGauge'); if(g) g.style.display='none';
  Object.keys(SENT_DATA).forEach(function(k){delete SENT_DATA[k];});
  SENT_LOADED=false;
}

// Restore saved tiles on load
setTimeout(function(){
  Object.keys(SENT_META).forEach(function(src){
    var saved=loadSentFromStorage(src);
    var normalised = saved ? normalizeSentimentData(src, saved.data) : (typeof sentimentFromDomainCache === 'function' ? sentimentFromDomainCache(src) : null);
    if(normalised && ((normalised.painPoints||[]).length || (normalised.improvements||[]).length || (normalised.strengths||[]).length)){
      SENT_DATA[src]=normalised;
      if(window.radarData && window.radarData.sentiment) window.radarData.sentiment[src]=normalised;
      var sc=normalised&&normalised.overallSentiment||60;
      var bar=document.getElementById('sbar-'+src); if(bar){bar.style.width=sc+'%';bar.style.background=sc>=70?'#1abc9c':sc>=50?'#C8A050':'#e74c3c';}
      var score=document.getElementById('sscore-'+src); if(score) score.textContent=sc+'%';
      var btn=document.getElementById('sbtn-'+src); if(btn){btn.textContent=saved?'Loaded':'Stale';btn.classList.add('loaded');}
    }
  });
  reorderSentimentSources();
  updateSentGauge();
},1200);

function hydrateSentimentFromDomainCache(){
  Object.keys(SENT_META).forEach(function(src){
    if(SENT_DATA[src]) return;
    var data = typeof sentimentFromDomainCache === 'function' ? sentimentFromDomainCache(src) : null;
    if(!data || !((data.painPoints||[]).length || (data.improvements||[]).length || (data.strengths||[]).length)) return;
    SENT_DATA[src]=data;
    if(window.radarData && window.radarData.sentiment) window.radarData.sentiment[src]=data;
    var sc=data.overallSentiment||60;
    var bar=document.getElementById('sbar-'+src); if(bar){bar.style.width=sc+'%';bar.style.background=sc>=70?'#1abc9c':sc>=50?'#C8A050':'#e74c3c';}
    var score=document.getElementById('sscore-'+src); if(score) score.textContent=sc+'%';
    var btn=document.getElementById('sbtn-'+src); if(btn){btn.textContent='Stale';btn.classList.add('loaded');}
  });
  reorderSentimentSources();
  updateSentGauge();
}

// â”€â”€ CUSTOMER INTELLIGENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var CI_DATA = {};
var CI_STORE = 'qr_v10_ci_';
var ACTIVE_CI = null;

var CI_META = {
  diaspora:{
    name:'Diaspora Traveller', icon:'&#127758;', color:'#C8A050',
    desc:'South Asian, Filipino, and Arab diaspora travelling between GCC and home countries. High-frequency, price-aware, family-oriented.',
    routes:'DOH-CMB, DOH-MNL, DOH-KHI, DOH-DAC, DOH-CCU, DOH-COK, DOH-TRV',
    size:'~18M passengers/year on diaspora routes',
    qrContext:'Diaspora routes are high-load, high-frequency segments. QR dominates GCC-South Asia but faces pressure from IndiGo, Air Arabia, and flydubai on price.'
  },
  business:{
    name:'Business Traveller', icon:'&#128188;', color:'#7BA7E8',
    desc:'Premium yield segment. Corporate, government, and SME travellers on QR\'s business hub routes. Highest LTV per passenger.',
    routes:'DOH-LHR, DOH-JFK, DOH-FRA, DOH-CDG, DOH-SIN, DOH-DXB, DOH-BOM',
    size:'~8.5M business passengers/year',
    qrContext:'Business Traveller is QR\'s premium yield engine. Wi-Fi reliability, lounge access, and upgrade availability are the primary satisfaction drivers.'
  },
  leisure:{
    name:'Leisure Traveller', icon:'&#127774;', color:'#1abc9c',
    desc:'Holiday, VFR, and tour group travellers. Volume and conversion segment with medium LTV but high growth potential.',
    routes:'DOH-BKK, DOH-DPS, DOH-MLE, DOH-LCA, DOH-BCN, DOH-FCO, DOH-IST',
    size:'~16M leisure passengers/year',
    qrContext:'Leisure segment is volume-driven. QR competes on Hamad connectivity and Doha stopover value. Price sensitivity is high; ancillary upsell opportunity is significant.'
  },
  loyalty:{
    name:'Privilege Club Member', icon:'&#127942;', color:'#e74c3c',
    desc:'Tier-holding Privilege Club members. Retention priority. High churn risk if tier benefits or upgrade success rates decline.',
    routes:'DOH-LHR, DOH-JFK, DOH-SYD, DOH-NRT, DOH-JNB, DOH-GRU, DOH-LAX',
    size:'~21M members across tiers',
    qrContext:'Privilege Club is the retention backbone. Gold and Platinum members have 3.4x higher LTV. Miles expiry and upgrade availability are the leading churn triggers.'
  },
  transit:{
    name:'Transit Passenger', icon:'&#128740;', color:'#9B59B6',
    desc:'Hub transit passengers using DOH as a connection point. Key to QR\'s hub model. Conversion opportunity for Doha stopover packages.',
    routes:'DOH (hub), Africa-Europe, Asia-Americas, Australia-Middle East corridors',
    size:'~60% of total QR passengers transit via DOH',
    qrContext:'Transit passengers represent 38% of DOH throughput. Doha Stopover conversion and lounge satisfaction are the primary commercial levers for this segment.'
  },
  luxury:{
    name:'Luxury & Premium Traveller', icon:'&#10024;', color:'#C8A050',
    desc:'Ultra-high-value travellers choosing QR for Qsuite privacy, premium amenities, luxury stopovers, and curated experiences. Behavioural signals matter more than spend alone.',
    routes:'DOH-LHR, DOH-JFK, DOH-CDG, DOH-SYD, DOH-SIN',
    size:'~2-3M ultra-premium passengers, est. 40%+ of revenue influence',
    qrContext:'Luxury demand is splitting across prestige, privacy, and curated access. QR has strong Qsuite equity but must orchestrate experiences across lounge, loyalty and stopover moments.',
    luxuryPersonas:[
      {id:'privacy',label:'Privacy Seeker',icon:'&#129396;',triggers:'Qsuite booking, quiet-preference signals, premium cabin service customisation',serviceFailures:'Recognition failure, unnecessary friction, poor handoff across touchpoints',nextBestAction:'Silent service profile and pre-flight personal preference confirmation'},
      {id:'curator',label:'Experience Curator',icon:'&#127859;',triggers:'Stopover browsing, premium dining interest, lifestyle itinerary intent',serviceFailures:'Generic offers, missed city and lounge upsell moments',nextBestAction:'Pre-arrival curated stopover bundle with premium partner offers'},
      {id:'status',label:'Status Maximiser',icon:'&#127881;',triggers:'Tier tracking, Avios acceleration, partner redemption behaviour',serviceFailures:'Tier-credit friction, unclear progression, benefit inconsistency',nextBestAction:'Tier-progress nudges and high-value loyalty fast-track campaign'}
    ]
  }
};


function ciPriorityScore(seg, data){
  let score = Number(data?.opportunityScore) || 0;
  const joined = JSON.stringify(data || {}).toLowerCase();
  score += (data?.personalisationOpps || []).filter(o => /quick win|revenue|conversion|loyalty|retention|app|web|ucp|personalisation|personalization|ancillary/.test(JSON.stringify(o).toLowerCase())).length * 8;
  score += (data?.painPoints || []).filter(p => /competitor|emirates|turkish|air india|ethiopian|churn|loyalty|price|refund|app|web|direct/.test(JSON.stringify(p).toLowerCase())).length * 6;
  if(/highest ltv|premium yield|retention|conversion|loyalty|direct booking/.test(joined)) score += 12;
  const base = {diaspora:14, luxury:15, loyalty:13, business:12, transit:9, leisure:8};
  score += (base[seg] || 0);
  return Math.max(0, Math.min(100, score));
}
function reorderCustomerSegments(){
  const wrap = document.querySelector('.ci-segs');
  if(!wrap) return;
  Array.from(wrap.querySelectorAll('.ci-seg')).sort((a,b)=>{
    const as=a.getAttribute('data-seg'), bs=b.getAttribute('data-seg');
    const diff = ciPriorityScore(bs, CI_DATA[bs]) - ciPriorityScore(as, CI_DATA[as]);
    if(diff) return diff;
    return String(CI_META[as]?.name||as).localeCompare(String(CI_META[bs]?.name||bs));
  }).forEach(t=>wrap.appendChild(t));
}

function loadCIFromStorage(seg){try{var r=localStorage.getItem(CI_STORE+seg);return r?JSON.parse(r):null;}catch(e){return null;}}
function saveCIToStorage(seg,data){try{localStorage.setItem(CI_STORE+seg,JSON.stringify({savedAt:new Date().toISOString(),data:data}));}catch(e){}}

function customerIntelFromDomainCache(seg){
  var domainMap = {
    diaspora:['geo','rev','dig','loy'],
    business:['dig','prd','loy','rev'],
    leisure:['spt','geo','sml','rev'],
    loyalty:['loy','dig','prd','rev'],
    transit:['ops','geo','spt','dig'],
    luxury:['prd','loy','rep','spt','cmp']
  };
  var ids = domainMap[seg] || ['dig','loy','rev'];
  var rows = [];
  ids.forEach(function(id){
    var d = null;
    try{ d = typeof cachedDomain === 'function' ? cachedDomain(id) : null; }catch(e){}
    (d && Array.isArray(d.signals) ? d.signals : []).forEach(function(s){ rows.push({domain:id, signal:s, data:d}); });
  });
  if(!rows.length) return null;
  var meta = CI_META[seg] || {};
  var avg = Math.round(rows.reduce(function(a,r){ return a + (Number(r.signal.commercialImpactScore || 6) * 10); },0) / rows.length);
  avg = Math.max(45, Math.min(95, avg));
  var risks = rows.filter(function(r){return /risk|friction|delay|complaint|drop|pressure|refund|issue|disrupt/i.test((r.signal.title||'')+' '+(r.signal.body||'')+' '+(r.signal.impactLabel||''));});
  var opps = rows.filter(function(r){return /opportun|growth|direct|loyalty|conversion|premium|ancillary|capture|personal/i.test((r.signal.title||'')+' '+(r.signal.body||'')+' '+(r.signal.captureStrategy||''));});
  var riskLevel = risks.length >= 5 ? 'Critical' : risks.length >= 3 ? 'High' : risks.length ? 'Medium' : 'Low';
  var topSignal = rows[0] && rows[0].signal ? rows[0].signal : {};
  var intentBySeg = { diaspora:'shopping', business:'in-trip', leisure:'inspiration', loyalty:'post-trip', transit:'day-of', luxury:'pre-trip' };
  var extSignals = rows.slice(0, 3).map(function(r){
    var title = r.signal.title || r.signal.body || 'Customer signal';
    return {
      signal: title.slice(0, 60),
      source: (r.signal.source || r.domain || 'cache').toString(),
      direction: /rise|surge|increase|growth|up/i.test((r.signal.body || '') + ' ' + (r.signal.impactLabel || '')) ? 'rising' : 'stable',
      implication: (r.signal.captureStrategy || r.signal.whyItMattersNow || r.signal.impactLabel || '').toString().slice(0, 80)
    };
  });
  var genericNba = {
    action: (topSignal.captureStrategy || topSignal.title || 'Run targeted segment intervention').toString().slice(0, 80),
    adobeProduct: 'RTCDP',
    timeline: 'This quarter',
    owner: 'Digital/B2C'
  };
  if(seg === 'luxury'){
    extSignals = [
      { signal:'Premium cabin comfort and privacy sentiment', source:'FlyerTalk', direction:'rising', implication:'Privacy-first service tailoring can lift direct premium conversion.' },
      { signal:'Business class review quality and consistency', source:'Skytrax', direction:'stable', implication:'Consistency across ground and cabin service protects premium preference.' },
      { signal:'Experience-led luxury itinerary demand', source:'Reddit / travel communities', direction:'rising', implication:'Curated stopover bundles can raise ancillary and loyalty value.' }
    ];
    genericNba = {
      action:'Launch privacy and curated-stopover luxury journeys for Qsuite travellers',
      adobeProduct:'Journey Optimizer',
      timeline:'This quarter',
      owner:'Digital Product + Loyalty'
    };
  }
  return normalizeCIData(seg, {
    segment: seg,
    segmentName: meta.name || seg,
    opportunityScore: avg,
    opportunityLabel: 'Derived from domain cache',
    size: meta.size || 'Backend/cache derived segment',
    topInsight: rows[0].signal.title || rows[0].signal.body || 'Domain cache signals available for this segment.',
    identityConfidence: 'Medium',
    tripIntentState: intentBySeg[seg] || 'shopping',
    serviceRiskLevel: riskLevel,
    serviceRiskReason: risks[0] ? (risks[0].signal.title || 'Customer friction trend detected').slice(0, 80) : 'No dominant risk signal',
    bookingBehaviour: rows.slice(0,4).map(function(r){return {insight:r.signal.title||'Behaviour signal', detail:r.signal.body||r.signal.whyItMattersNow||'', source:(r.domain||'').toUpperCase(), implication:r.signal.captureStrategy||r.signal.impactLabel||''};}),
    loyaltyDrivers: opps.slice(0,4).map(function(r){return {driver:r.signal.title||'Value driver', detail:r.signal.whyItMattersNow||r.signal.body||'', strength:r.signal.confidence||'Medium'};}),
    painPoints: risks.slice(0,4).map(function(r){return {pain:r.signal.title||'Customer pain point', detail:r.signal.body||r.signal.whyItMattersNow||'', competitorAdvantage:r.signal.impactLabel||r.signal.demandImpact||''};}),
    personalisationOpps: rows.slice(0,5).map(function(r){return {title:r.signal.captureStrategy||r.signal.title||'Personalisation opportunity', detail:r.signal.whyItMattersNow||r.signal.body||'', ucpUseCase:'Use customer context to prioritise this signal', adobeProduct: seg === 'luxury' ? 'Journey Optimizer' : 'RTCDP', value:r.signal.impactLabel||'B2C value', effort:r.signal.timeToImpact||'30 days', owner:'Digital/B2C', persona: seg === 'luxury' ? 'all' : '', dataSource:'both'};}),
    externalSignals: extSignals,
    nextBestAction: genericNba,
    luxuryPersonas: meta.luxuryPersonas || [],
    kpis:[
      {metric:'Signals', qrCurrent:String(rows.length), benchmark:'Domain cache'},
      {metric:'Risks', qrCurrent:String(risks.length), benchmark:'Monitor'},
      {metric:'Opportunities', qrCurrent:String(opps.length), benchmark:'Capture'}
    ]
  });
}

function selCI(seg){
  document.querySelectorAll('.ci-seg').forEach(function(t){t.classList.remove('active');});
  var tile=document.querySelector('[data-seg="'+seg+'"]');
  if(tile) tile.classList.add('active');
  ACTIVE_CI=seg;
  var saved=loadCIFromStorage(seg);
  if(saved){CI_DATA[seg]=saved.data;renderCI(seg,saved.data);}
  else{
    var meta=CI_META[seg]||{};
    document.getElementById('ciDetail').innerHTML='<div style="padding:28px;text-align:center;background:var(--su);border:1px solid var(--bo);border-radius:var(--r3)"><div style="font-size:28px;margin-bottom:8px">'+meta.icon+'</div><div style="font-size:13px;color:var(--t2);font-weight:500">Select this segment to inspect cache-backed intelligence for '+meta.name+'</div><div style="font-size:11px;color:var(--t3);margin-top:6px;max-width:400px;margin-left:auto;margin-right:auto">'+meta.desc+'</div></div>';
  }
}

async function loadCI(seg){
  var btn=document.getElementById('cibtn-'+seg);
  var bar=document.getElementById('cibar-'+seg);
  var score=document.getElementById('ciscore-'+seg);

  function setBtn(label, loaded){
    if(btn){ btn.disabled=!!loaded; btn.textContent=label; }
    if(loaded) btn && btn.classList.add('loaded');
    else btn && btn.classList.remove('loaded');
  }
  function applyScore(sc){
    if(bar){ bar.style.width=sc+'%'; bar.style.background=sc>=80?'#1abc9c':sc>=60?'#C8A050':'#e74c3c'; }
    if(score) score.textContent=sc+'%';
  }

  setBtn('Fetching...', false);
  selCI(seg);

  // 1 - Try backend first
  if(typeof BACKEND_URL !== 'undefined' && BACKEND_URL){
    try{
      setBtn('Checking backend...', false);
      var viewMode = (typeof VIEW_MODE !== 'undefined' && VIEW_MODE) ? VIEW_MODE : 'enterprise';
      var resp = await fetch(
        BACKEND_URL+'/api/cache/customer-intel/'+encodeURIComponent(seg)+'?viewMode='+encodeURIComponent(viewMode),
        { signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined }
      );
      if(resp.ok){
        var payload = await resp.json();
        var backendData = (payload && payload.data) ? payload.data : payload;
        if(backendData && (backendData.segmentName || backendData.bookingBehaviour || backendData.painPoints)){
          var result = normalizeCIData(seg, backendData);
          CI_DATA[seg] = result;
          saveCIToStorage(seg, result);
          applyScore(result.opportunityScore || 70);
          setBtn('Loaded', true);
          renderCI(seg, result);
          console.log('[Radar] CI loaded from backend for', seg);
          return;
        }
      }
    }catch(backendErr){
      console.warn('[Radar] CI backend fetch failed for '+seg+':', backendErr.message||backendErr);
    }
  }

  // 2 - Fall back to localStorage cache
  var saved = loadCIFromStorage(seg);
  if(saved && saved.data){
    setBtn('Stale', true);
    var result = normalizeCIData(seg, saved.data);
    CI_DATA[seg] = result;
    applyScore(result.opportunityScore || 70);
    setBtn('Loaded', true);
    renderCI(seg, result);
    console.log('[Radar] CI loaded from localStorage for', seg);
    return;
  }

  var domainResult = customerIntelFromDomainCache(seg);
  if(domainResult && ((domainResult.bookingBehaviour||[]).length || (domainResult.personalisationOpps||[]).length || (domainResult.painPoints||[]).length)){
    CI_DATA[seg] = domainResult;
    saveCIToStorage(seg, domainResult);
    if(window.radarData && window.radarData.customerIntel) window.radarData.customerIntel[seg]=domainResult;
    applyScore(domainResult.opportunityScore || 70);
    setBtn('Stale', true);
    renderCI(seg, domainResult);
    console.log('[Radar] CI derived from domain cache for', seg);
    return;
  }

  // 3 - Nothing available - request Claude via backend
  if(typeof BACKEND_URL !== 'undefined' && BACKEND_URL && typeof ANT_KEY !== 'undefined' && ANT_KEY){
    try{
      setBtn('Generating...', false);
      var meta = (typeof CI_META !== 'undefined' && CI_META[seg]) ? CI_META[seg] : {};
      var today = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
      var isLuxury = seg === 'luxury';
      var luxuryExtra = isLuxury
        ? ' This is a LUXURY segment analysis. Use the VML Future 100 2026 luxury lens: Monumental luxury (visible prestige), Wellbeing Status (privacy/sanctuary), and Shared Luxury (access/ethics). For luxury, include three sub-personas: privacy, curator, status.'
        : '';
      var ciPrompt = 'You are the Qatar Airways Customer Intelligence AI. Today is '+today+'. Segment: '+meta.name+'. Description: '+meta.desc+'. Key routes: '+(meta.routes||'')+'. Segment size: '+(meta.size||'')+'. QR context: '+meta.qrContext+luxuryExtra+
        '. Use web search signals and return ONLY valid JSON with: '+
        '{"segment":"'+seg+'","segmentName":"'+(meta.name||seg)+'","opportunityScore":75,"opportunityLabel":"High","size":"'+(meta.size||'')+'","topInsight":"string",'+
        '"identityConfidence":"High|Medium|Low","tripIntentState":"inspiration|shopping|pre-trip|day-of|in-trip|disruption|post-trip","serviceRiskLevel":"Critical|High|Medium|Low","serviceRiskReason":"string",'+
        '"bookingBehaviour":[{"insight":"string","detail":"string","source":"string","implication":"string"}],'+
        '"loyaltyDrivers":[{"driver":"string","detail":"string","strength":"Strong|Medium|Weak"}],'+
        '"painPoints":[{"pain":"string","detail":"string","competitorAdvantage":"string"}],'+
        '"personalisationOpps":[{"title":"string","detail":"string","ucpUseCase":"string","adobeProduct":"CJA|RTCDP|Journey Optimizer|Brand Concierge|Journey Optimizer Loyalty","value":"string","effort":"Quick win|Medium|Strategic","owner":"string","persona":"all|privacy|curator|status","dataSource":"external|internal|both"}],'+
        '"kpis":[{"metric":"string","qrCurrent":"string","benchmark":"string","gap":"string"}],'+
        '"externalSignals":[{"signal":"string","source":"string","direction":"rising|falling|stable","implication":"string"}],'+
        '"nextBestAction":{"action":"string","adobeProduct":"string","timeline":"This week|This quarter|6 months","owner":"string"}}';
      var claudeBody = {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2200,
        messages:[{role:'user', content:ciPrompt}]
      };
      if(typeof window.claudePayloadWithWebSearch === 'function'){
        claudeBody = window.claudePayloadWithWebSearch(claudeBody, 'customer_intel');
      }
      var claudeResp = await fetch(BACKEND_URL+'/api/claude', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(claudeBody)
      });
      if(claudeResp.ok){
        var cd = await claudeResp.json();
        var raw = Array.isArray(cd.content)
          ? cd.content.filter(function(b){ return b && b.type === 'text'; }).map(function(b){ return b.text; }).join('')
          : (cd.content || cd.text || cd.result || '');
        var clean = String(raw || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        var f = clean.indexOf('{');
        var l = clean.lastIndexOf('}');
        if(f >= 0 && l > f){
          var parsed = JSON.parse(clean.slice(f, l + 1));
          var result = normalizeCIData(seg, parsed);
          CI_DATA[seg] = result;
          saveCIToStorage(seg, result);
          applyScore(result.opportunityScore || 70);
          setBtn('Loaded', true);
          renderCI(seg, result);
          console.log('[Radar] CI generated via Claude for', seg);
          return;
        }
      }
    }catch(claudeErr){
      console.warn('[Radar] CI Claude generation failed for '+seg+':', claudeErr.message||claudeErr);
    }
  }

  // 4 - All sources failed - show clear error state
  setBtn('Error', false);
  if(bar){ bar.style.width='0%'; }
  if(score) score.textContent='-';
  var det = document.getElementById('ciDetail');
  if(det) det.innerHTML = '<div style="padding:28px;text-align:center;background:var(--su);border:1px solid var(--rb);border-radius:var(--r3)">' +
    '<div style="font-size:24px;margin-bottom:8px">&#128683;</div>' +
    '<div style="font-size:13px;color:var(--red);font-weight:500">Could not load segment intelligence</div>' +
    '<div style="font-size:11px;color:var(--t3);margin-top:6px">Backend may be offline or no data cached yet. ' +
    'Ensure the Render backend is running and try connecting first.</div>' +
    '<button onclick="loadCI(\''+seg+'\')" style="margin-top:12px;padding:6px 16px;background:var(--qb);color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px">Retry</button>' +
    '</div>';
}

async function loadAllCustomerSegments(){
  for(const seg of Object.keys(CI_META)){
    await loadCI(seg);
  }
}

function hydrateCustomerIntelFromDomainCache(){
  Object.keys(CI_META).forEach(function(seg){
    if(CI_DATA[seg]) return;
    var saved = loadCIFromStorage(seg);
    var result = saved && saved.data ? normalizeCIData(seg, saved.data) : customerIntelFromDomainCache(seg);
    if(!result || !((result.bookingBehaviour||[]).length || (result.personalisationOpps||[]).length || (result.painPoints||[]).length)) return;
    CI_DATA[seg]=result;
    if(window.radarData && window.radarData.customerIntel) window.radarData.customerIntel[seg]=result;
    var sc = result.opportunityScore || 70;
    var bar=document.getElementById('cibar-'+seg); if(bar){bar.style.width=sc+'%';bar.style.background=sc>=80?'#1abc9c':sc>=60?'#C8A050':'#e74c3c';}
    var score=document.getElementById('ciscore-'+seg); if(score) score.textContent=sc+'%';
    var btn=document.getElementById('cibtn-'+seg); if(btn){btn.textContent=saved?'Loaded':'Stale';btn.classList.add('loaded');}
  });
  reorderCustomerSegments();
}

function renderCI(seg,data){
  data = normalizeCIData(seg, data);
  var meta=CI_META[seg]||{};
  var sc=data.opportunityScore||70;
  var scColor=sc>=80?'#1abc9c':sc>=60?'#C8A050':'#e74c3c';

  var kpiH=(data.kpis||[]).map(function(k){
    var gap = k && k.gap ? '<div style="font-size:9px;color:var(--t3);margin-top:2px">Gap: '+esc(k.gap)+'</div>' : '';
    return '<div class="ci-kpi"><div class="ci-kpi-v" style="color:'+scColor+'">'+esc(k.qrCurrent || '-')+'</div><div class="ci-kpi-l">'+esc(k.metric || 'Metric')+'</div><div style="font-size:9px;color:var(--t3);margin-top:2px">Benchmark: '+esc(k.benchmark || '-')+'</div>'+gap+'</div>';
  }).join('');

  var bookH=(data.bookingBehaviour||[]).map(function(b){
    return '<div class="ci-item"><div class="ci-dot" style="background:#7BA7E8"></div><div class="ci-item-b"><strong>'+esc(b.insight || '')+'</strong><br>'+esc(b.detail || '')+'<br><span class="ci-item-tag ci-tag-b">'+esc(b.source || 'Source')+'</span><div style="margin-top:3px;font-size:9px;color:var(--qg)">&#8594; '+esc(b.implication || '')+'</div></div></div>';
  }).join('');

  var loyH=(data.loyaltyDrivers||[]).map(function(l){
    var tagClass=l.strength==='Strong'?'ci-tag-g':l.strength==='Medium'?'ci-tag-a':'ci-tag-r';
    return '<div class="ci-item"><div class="ci-dot" style="background:#1abc9c"></div><div class="ci-item-b"><strong>'+esc(l.driver || '')+'</strong><br>'+esc(l.detail || '')+'<br><span class="ci-item-tag '+tagClass+'">'+esc(l.strength || 'Medium')+' for QR</span></div></div>';
  }).join('');

  var painH=(data.painPoints||[]).map(function(p){
    return '<div class="ci-item"><div class="ci-dot" style="background:#e74c3c"></div><div class="ci-item-b"><strong>'+esc(p.pain || '')+'</strong><br>'+esc(p.detail || '')+'<br><span class="ci-item-tag ci-tag-r">'+esc(p.competitorAdvantage || '')+'</span></div></div>';
  }).join('');

  var oppH=(data.personalisationOpps||[]).map(function(o){
    var effortClass=o.effort==='Quick win'?'ci-tag-g':o.effort==='Medium'?'ci-tag-a':'ci-tag-b';
    var adobeTag = o.adobeProduct ? '<span style="font-size:9px;font-weight:600;padding:1px 5px;border-radius:3px;background:rgba(200,160,80,.1);color:var(--qg);margin-left:4px">'+esc(o.adobeProduct)+'</span>' : '';
    var dsTag = o.dataSource ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--bg2);color:var(--t3)">'+esc(o.dataSource)+'</span>' : '';
    var personaTag = (o.persona && o.persona !== 'all') ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(26,106,72,.08);color:var(--grn)">'+esc(o.persona)+'</span>' : '';
    return '<div class="ci-opp"><div class="ci-opp-eyebrow">UCP: '+esc(o.ucpUseCase || 'Segment orchestration')+adobeTag+'</div><div class="ci-opp-title">'+esc(o.title || '')+'</div><div class="ci-opp-body">'+esc(o.detail || '')+'</div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><div class="ci-opp-val">'+esc(o.value || '')+'</div><span class="ci-item-tag '+effortClass+'">'+esc(o.effort || 'Medium')+'</span><span class="ci-item-tag ci-tag-b">'+esc(o.owner || 'Digital/B2C')+'</span>'+dsTag+personaTag+'</div></div>';
  }).join('');

  var riskClass = 'ci-pill-risk-low';
  if(data.serviceRiskLevel === 'Critical' || data.serviceRiskLevel === 'High') riskClass = 'ci-pill-risk-high';
  else if(data.serviceRiskLevel === 'Medium') riskClass = 'ci-pill-risk-med';
  var decisionStrip = '<div class="ci-decision-strip">';
  if(data.identityConfidence) decisionStrip += '<span class="ci-pill ci-pill-id">Identity: '+esc(data.identityConfidence)+'</span>';
  if(data.tripIntentState) decisionStrip += '<span class="ci-pill ci-pill-intent">Intent: '+esc(data.tripIntentState)+'</span>';
  if(data.serviceRiskLevel){
    decisionStrip += '<span class="ci-pill '+riskClass+'">Service risk: '+esc(data.serviceRiskLevel)+(data.serviceRiskReason ? ' - '+esc(String(data.serviceRiskReason).slice(0, 48)) : '')+'</span>';
  }
  decisionStrip += '</div>';

  var nbaH = '';
  if(data.nextBestAction && data.nextBestAction.action){
    nbaH = '<div class="ci-nba"><div class="ci-nba-eyebrow">Next-best action'+(data.nextBestAction.timeline ? ' - '+esc(data.nextBestAction.timeline) : '')+'</div><div class="ci-nba-title">'+esc(data.nextBestAction.action)+'</div><div class="ci-nba-meta">'+
      (data.nextBestAction.adobeProduct ? '<span>'+esc(data.nextBestAction.adobeProduct)+'</span>' : '')+
      (data.nextBestAction.owner ? '<span>Owner: '+esc(data.nextBestAction.owner)+'</span>' : '')+
      '</div></div>';
  }

  var externalRows = (data.externalSignals||[]).map(function(s){
    var glyph = s.direction === 'rising' ? '&#8593;' : s.direction === 'falling' ? '&#8595;' : '&#8212;';
    return '<div class="ci-item"><div class="ci-dot" style="background:var(--grn)"></div><div class="ci-item-b"><strong>'+esc(s.signal || '')+'</strong> <span style="font-size:10px;color:var(--t3)">'+glyph+'</span><div style="font-size:10px;color:var(--t3)">'+esc(s.source || '')+' - '+esc(s.implication || '')+'</div></div></div>';
  }).join('');
  var externalSection = externalRows ? '<div class="ci-external-wrap"><div class="ci-col-t" style="color:var(--grn)">External Signals</div>'+externalRows+'</div>' : '';

  var luxuryPersonas = (data.luxuryPersonas && data.luxuryPersonas.length) ? data.luxuryPersonas : (meta.luxuryPersonas || []);
  var luxuryPanel = '';
  if(seg === 'luxury' && luxuryPersonas.length){
    luxuryPanel = '<div class="ci-luxury-wrap"><div class="ci-luxury-title">Premium Sub-Personas - Luxury Lens</div><div class="ci-luxury-grid">'+
      luxuryPersonas.map(function(p){
        return '<div class="ci-lux-card"><div class="ci-lux-card-icon">'+(p.icon || '&#10024;')+'</div><div class="ci-lux-card-name">'+esc(p.label || '')+'</div><div class="ci-lux-h trg">Trigger signals</div><div class="ci-lux-t">'+esc(p.triggers || '')+'</div><div class="ci-lux-h rsk">Service failure risks</div><div class="ci-lux-t">'+esc(p.serviceFailures || '')+'</div><div class="ci-lux-h nba">Next-best action</div><div class="ci-lux-t">'+esc(p.nextBestAction || '')+'</div></div>';
      }).join('')+
      '</div></div>';
  }

  document.getElementById('ciDetail').innerHTML=
    '<div class="ci-det">'+
      '<div class="ci-det-hdr">'+
        '<div>'+
          '<div class="ci-det-title">'+meta.icon+' '+esc(data.segmentName || meta.name || seg)+'</div>'+
          '<div class="ci-det-sub">'+esc(data.size || meta.size || '')+' &middot; '+esc(data.topInsight || '')+'</div>'+
        '</div>'+
        '<div style="text-align:center;min-width:80px">'+
          '<div style="font-size:26px;font-weight:500;color:'+scColor+'">'+esc(sc)+'%</div>'+
          '<div style="font-size:10px;color:var(--t3)">'+esc(data.opportunityLabel || 'Loaded')+' opportunity</div>'+
        '</div>'+
      '</div>'+
      decisionStrip+
      nbaH+
      '<div class="ci-kpis">'+kpiH+'</div>'+
      '<div class="ci-body">'+
        '<div class="ci-col"><div class="ci-col-t" style="color:#7BA7E8">Booking Behaviour</div>'+bookH+'</div>'+
        '<div class="ci-col"><div class="ci-col-t" style="color:#1abc9c">Loyalty Drivers</div>'+loyH+'</div>'+
        '<div class="ci-col"><div class="ci-col-t" style="color:#e74c3c">Pain Points</div>'+painH+'</div>'+
        '<div class="ci-col"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;font-family:JetBrains Mono,monospace;color:#C8A050">Routes &amp; Context</div>'+
          '<div style="font-size:10px;color:var(--t2);line-height:1.6;margin-bottom:10px">'+esc(meta.desc || '')+'</div>'+
          '<div style="font-size:9px;font-weight:600;color:var(--qg);margin-bottom:4px">KEY ROUTES</div>'+
          '<div style="font-size:10px;color:var(--t3);font-family:JetBrains Mono,monospace;line-height:1.8">'+(meta.routes ? esc(meta.routes).split(',').map(function(r){return r.trim();}).join('<br>') : '<em style="color:var(--t3)">No routes configured</em>')+'</div>'+
          '<div style="margin-top:10px;padding:8px 10px;background:rgba(200,160,80,.08);border-left:2px solid var(--qg);border-radius:0 4px 4px 0;font-size:10px;color:var(--t2);line-height:1.5">'+esc(meta.qrContext || '')+'</div>'+
        '</div>'+
      '</div>'+
      externalSection+
      luxuryPanel+
      '<div style="padding:12px 16px;border-top:1px solid var(--bo)"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;font-family:JetBrains Mono,monospace;color:#C8A050">UCP PERSONALISATION OPPORTUNITIES ('+((data.personalisationOpps||[]).length)+')</div><div class="ci-opps">'+oppH+'</div></div>'+
    '</div>';
  reorderCustomerSegments();
}

function clearCICache(){
  if(!confirm('Clear all saved customer intelligence analyses?')) return;
  Object.keys(CI_META).forEach(function(seg){
    try{localStorage.removeItem(CI_STORE+seg);}catch(e){}
    var bar=document.getElementById('cibar-'+seg); if(bar) bar.style.width='0%';
    var score=document.getElementById('ciscore-'+seg); if(score) score.textContent='-';
    var btn=document.getElementById('cibtn-'+seg); if(btn){btn.textContent='No data';btn.classList.remove('loaded');btn.disabled=false;}
  });
  document.querySelectorAll('.ci-seg').forEach(function(t){t.classList.remove('active');});
  reorderCustomerSegments();
  document.getElementById('ciDetail').innerHTML='<div style="padding:36px;text-align:center;color:var(--t3);background:var(--su);border:1px solid var(--bo);border-radius:var(--r3)"><div style="font-size:40px;margin-bottom:12px">&#128101;</div><div style="font-size:13px;color:var(--t2);font-weight:500">All customer intelligence caches cleared</div></div>';
  Object.keys(CI_DATA).forEach(function(k){delete CI_DATA[k];});
}

// Restore on load
setTimeout(function(){
  Object.keys(CI_META).forEach(function(seg){
    var saved=loadCIFromStorage(seg);
    if(saved){
      var normalised = normalizeCIData(seg, saved.data);
      CI_DATA[seg]=normalised;
      if(window.radarData && window.radarData.customerIntel) window.radarData.customerIntel[seg]=normalised;
      var sc=normalised&&normalised.opportunityScore||70;
      var bar=document.getElementById('cibar-'+seg); if(bar){bar.style.width=sc+'%';bar.style.background=sc>=80?'#1abc9c':sc>=60?'#C8A050':'#e74c3c';}
      var score=document.getElementById('ciscore-'+seg); if(score) score.textContent=sc+'%';
      var btn=document.getElementById('cibtn-'+seg); if(btn){btn.textContent='Loaded';btn.classList.add('loaded');}
    } else {
      var btn2=document.getElementById('cibtn-'+seg); if(btn2){btn2.textContent='No data';btn2.classList.remove('loaded');btn2.disabled=false;}
    }
  });
  reorderCustomerSegments();
},1500);



// SENTIMENT_TAB_REPAIR_2026_05_27
(function(){
  var SENT_CACHE_ALIASES = {
    twitter: ['twitter', 'x'],
    reddit: ['reddit'],
    flyertalk: ['flyertalk', 'flyer_talk'],
    trustpilot: ['trustpilot'],
    tripadvisor: ['tripadvisor', 'trip_advisor'],
    skytrax: ['skytrax'],
    quora: ['quora'],
    consumer: ['consumer', 'consumer_affairs', 'consumeraffairs']
  };

  function metaName(src){
    return (window.SENT_META && SENT_META[src] && SENT_META[src].name) || src;
  }

  function setSentimentScoreUI(src, score){
    var bar = document.getElementById('sbar-' + src);
    var scoreEl = document.getElementById('sscore-' + src);
    var n = Number(score);
    if(!Number.isFinite(n) || n <= 0){
      if(bar) bar.style.width = '0%';
      if(scoreEl) scoreEl.textContent = '-';
      return;
    }
    n = Math.max(1, Math.min(100, Math.round(n)));
    if(bar){
      bar.style.width = n + '%';
      bar.style.background = n >= 70 ? '#1abc9c' : n >= 50 ? '#C8A050' : '#e74c3c';
    }
    if(scoreEl) scoreEl.textContent = n + '%';
  }

  function setSentimentTileState(src, state){
    var btn = document.getElementById('sbtn-' + src);
    if(!btn) return;
    btn.classList.remove('loaded');
    btn.disabled = false;
    if(state === 'Loaded'){
      btn.textContent = 'Loaded';
      btn.classList.add('loaded');
      return;
    }
    if(state === 'Stale'){
      btn.textContent = 'Stale';
      btn.classList.add('loaded');
      return;
    }
    if(state === 'Error'){
      btn.textContent = 'Error';
      return;
    }
    btn.textContent = 'No data';
  }

  function resetSentimentTile(src, label){
    setSentimentScoreUI(src, null);
    setSentimentTileState(src, label || 'No data');
  }

  function emptySentimentDetail(src, title, detail){
    var el = document.getElementById('sentDetail');
    if(!el) return;
    el.innerHTML =
      '<div style="padding:32px;text-align:center;color:var(--t3);background:var(--su);border:1px solid var(--bo);border-radius:var(--r3)">'+
        '<div style="font-size:36px;margin-bottom:10px">&#128172;</div>'+
        '<div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:6px">'+esc(title || ('No source-specific sentiment loaded for ' + metaName(src)))+'</div>'+
        '<div style="font-size:11px;max-width:560px;margin:0 auto;line-height:1.6">'+esc(detail || 'This tab no longer uses the shared domain-cache score, so it will stay blank until a real per-source sentiment backend payload exists.')+'</div>'+
      '</div>';
  }

  function hasSentimentContent(data){
    if(!data || typeof data !== 'object') return false;
    var score = Number(data.overallSentiment || data.score || data.sentimentScore);
    if(Number.isFinite(score) && score > 0) return true;
    if(Array.isArray(data.painPoints) && data.painPoints.length) return true;
    if(Array.isArray(data.strengths) && data.strengths.length) return true;
    if(Array.isArray(data.improvements) && data.improvements.length) return true;
    if(Array.isArray(data.verbatims) && data.verbatims.length) return true;
    return false;
  }

  function toPlainText(v){
    if(v === undefined || v === null) return '';
    if(typeof v === 'string') return v;
    if(typeof v === 'number' || typeof v === 'boolean') return String(v);
    if(typeof v === 'object'){
      var picked = '';
      try{ picked = firstText(v, ['text','verbatim','quote','title','body','detail','description','summary','content','message'], ''); }catch(e){ picked = ''; }
      if(picked) return picked;
      try{ return JSON.stringify(v); }catch(err){ return ''; }
    }
    return '';
  }

  function sourceAliasTokens(src){
    var aliases = SENT_CACHE_ALIASES[src] || [src];
    return aliases.map(function(a){ return String(a || '').toLowerCase(); }).filter(Boolean);
  }

  function sentimentPayloadMatchesSource(src, payload){
    if(!payload || typeof payload !== 'object') return false;
    var tokens = sourceAliasTokens(src);
    if(!tokens.length) return true;
    var explicit = String([
      payload.source, payload.sourceName, payload.provider, payload.platform, payload.channel, payload.origin
    ].filter(Boolean).join(' ')).toLowerCase();

    if(explicit){
      var explicitHit = tokens.some(function(t){ return explicit.indexOf(t) !== -1; });
      if(explicitHit) return true;
    }

    var sourceRules = {
      twitter:/\bx\b|twitter|tweet|retweet|mention|viral|hashtag/i,
      reddit:/reddit|subreddit|r\/|thread|upvote/i,
      flyertalk:/flyertalk|frequent flyer|tier|avios|upgrade|status/i,
      trustpilot:/trustpilot|verified review|star rating/i,
      tripadvisor:/tripadvisor|traveler review|traveller review|trip advisor/i,
      skytrax:/skytrax|airline awards|world.?best airline/i,
      quora:/quora|question|answer/i,
      consumer:/consumer affairs|consumeraffairs|pissedconsumer|airlinequality|formal complaint/i
    };
    var rule = sourceRules[src];
    if(!rule) return false;

    var joined = '';
    joined += ' ' + toPlainText(payload.topComplaint);
    joined += ' ' + toPlainText(payload.topPraise);
    joined += ' ' + toPlainText(payload.sentimentLabel);
    asArray(payload.verbatims).slice(0, 5).forEach(function(v){ joined += ' ' + toPlainText(v); });
    asArray(payload.painPoints).slice(0, 5).forEach(function(p){
      joined += ' ' + toPlainText(p && (p.title || p.issue || p.pain || p.theme));
      joined += ' ' + toPlainText(p && (p.detail || p.body || p.description));
    });
    asArray(payload.signals).slice(0, 5).forEach(function(s){
      joined += ' ' + toPlainText(s && (s.source || s.sourceName || s.platform));
      joined += ' ' + toPlainText(s && (s.title || s.body || s.detail));
    });
    return rule.test(joined);
  }

  function parseSentimentCacheEnvelope(payload){
    payload = payload || {};
    var meta = (payload.meta && typeof payload.meta === 'object') ? payload.meta : {};
    var emptyReason = payload.emptyReason || payload.reason || payload.message ||
      (payload.error && (payload.error.message || payload.error)) || '';
    if(payload.cached === false && (payload.data == null)){
      return { ok:false, data:null, meta:meta, emptyReason: emptyReason || 'No source-specific sentiment cache is available yet.' };
    }
    var data = payload.data;
    if(data == null && payload.payload != null) data = payload.payload;
    if(data == null && payload.result != null) data = payload.result;
    if(data == null && !('cached' in payload) && !('ok' in payload)) data = payload;
    return {
      ok: payload.ok !== false,
      data: data,
      meta: meta,
      emptyReason: emptyReason
    };
  }

  function saveSentToStorage(src, data){
    try{
      localStorage.setItem(SENT_STORE + src, JSON.stringify({ savedAt: new Date().toISOString(), data: data }));
    }catch(e){}
  }

  function safeLoadSentFromStorage(src){
    try{
      var r = localStorage.getItem(SENT_STORE + src);
      if(!r) return null;
      var parsed = JSON.parse(r);
      var data = parsed && (parsed.data || parsed);
      if(data && data.sentimentLabel === 'Derived from domain cache'){
        localStorage.removeItem(SENT_STORE + src);
        return null;
      }
      if(data && Number(data.overallSentiment) === 85 && /domain cache|render cache/i.test(String(data.sentimentLabel || data.label || ''))){
        localStorage.removeItem(SENT_STORE + src);
        return null;
      }
      if(data && !sentimentPayloadMatchesSource(src, data)){
        localStorage.removeItem(SENT_STORE + src);
        return null;
      }
      return parsed;
    }catch(e){ return null; }
  }

  function applySentimentData(src, normalised, state){
    SENT_DATA[src] = normalised;
    if(window.radarData && window.radarData.sentiment) window.radarData.sentiment[src] = normalised;
    renderSent(src, normalised);
    setSentimentScoreUI(src, normalised.overallSentiment);
    setSentimentTileState(src, state || 'Loaded');
    updateSentGauge();
  }

  async function fetchSentimentFromBackend(src){
    if(typeof BACKEND_URL === 'undefined' || !BACKEND_URL){
      return { status:'unavailable' };
    }
    var viewMode = (typeof VIEW_MODE !== 'undefined' && VIEW_MODE) ? VIEW_MODE : 'enterprise';
    var aliases = SENT_CACHE_ALIASES[src] || [src];
    var lastError = null;
    for(var i=0;i<aliases.length;i++){
      var alias = aliases[i];
      try{
        var url = BACKEND_URL + '/api/cache/sentiment/' + encodeURIComponent(alias) + '?viewMode=' + encodeURIComponent(viewMode);
        var resp = await fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined });
        if(resp.status === 404) continue;
        if(!resp.ok){
          lastError = new Error('HTTP ' + resp.status + ' from /api/cache/sentiment/' + alias);
          continue;
        }
        var raw = null;
        try{ raw = await resp.json(); }catch(parseErr){ raw = null; }
        var parsed = parseSentimentCacheEnvelope(raw || {});
        if(!parsed.ok && !parsed.data){
          return { status:'no_data', emptyReason: parsed.emptyReason || 'No source-specific sentiment cache is available yet.' };
        }
        if(parsed.data == null){
          return { status:'no_data', emptyReason: parsed.emptyReason || 'No source-specific sentiment cache is available yet.' };
        }
        if(!sentimentPayloadMatchesSource(src, parsed.data)){
          continue;
        }
        var normalised = normalizeSentimentData(src, parsed.data);
        if(!hasSentimentContent(normalised)){
          return { status:'no_data', emptyReason: parsed.emptyReason || 'No source-specific sentiment cache is available yet.' };
        }
        var cacheStatus = String((parsed.meta && parsed.meta.cacheStatus) || '').toLowerCase();
        return { status: cacheStatus === 'stale' ? 'stale' : 'loaded', data: normalised };
      }catch(err){
        lastError = err;
      }
    }
    if(lastError) return { status:'error', error:lastError };
    return { status:'no_data', emptyReason:'No source-specific sentiment cache is available yet.' };
  }

  async function resolveSentimentForSource(src){
    var backend = await fetchSentimentFromBackend(src);
    if(backend.status === 'loaded' || backend.status === 'stale'){
      if(backend.status === 'loaded') saveSentToStorage(src, backend.data);
      return backend;
    }
    var saved = safeLoadSentFromStorage(src);
    if(saved && saved.data){
      return { status:'loaded', data: normalizeSentimentData(src, saved.data) };
    }
    var derived = typeof sentimentFromDomainCache === 'function' ? sentimentFromDomainCache(src) : null;
    if(derived){
      return { status:'stale', data: derived };
    }
    return backend;
  }

  window.loadSentFromStorage = loadSentFromStorage = safeLoadSentFromStorage;

  window.selSent = selSent = function(src){
    document.querySelectorAll('.sent-tile').forEach(function(t){ t.classList.remove('on'); });
    var tile = document.querySelector('[data-src="'+src+'"]');
    if(tile) tile.classList.add('on');
    window.ACTIVE_SENT = ACTIVE_SENT = src;
    var existing = SENT_DATA[src];
    if(existing && hasSentimentContent(existing)){
      renderSent(src, existing);
      setSentimentScoreUI(src, existing.overallSentiment);
      setSentimentTileState(src, 'Loaded');
      updateSentGauge();
      return;
    }
    var saved = safeLoadSentFromStorage(src);
    if(saved && saved.data){
      applySentimentData(src, normalizeSentimentData(src, saved.data), 'Loaded');
      return;
    }
    resetSentimentTile(src, 'No data');
    emptySentimentDetail(src, 'No data for ' + metaName(src) + ' yet', 'No source-specific sentiment cache is available yet. Load this source to fetch backend cache first.');
  };

  window.loadSent = loadSent = async function(src){
    document.querySelectorAll('.sent-tile').forEach(function(t){ t.classList.remove('on'); });
    var tile = document.querySelector('[data-src="'+src+'"]');
    if(tile) tile.classList.add('on');
    setSentimentTileState(src, 'No data');
    var btn = document.getElementById('sbtn-' + src);
    if(btn){ btn.textContent = 'Loading...'; btn.disabled = true; }
    var result = await resolveSentimentForSource(src);
    if(result.status === 'loaded'){
      applySentimentData(src, result.data, 'Loaded');
      return;
    }
    if(result.status === 'stale'){
      applySentimentData(src, result.data, 'Stale');
      return;
    }
    if(result.status === 'error'){
      setSentimentTileState(src, 'Error');
      emptySentimentDetail(src, 'Could not load ' + metaName(src) + ' sentiment', 'Backend request failed for this source. Check backend availability, then retry.');
      return;
    }
    resetSentimentTile(src, 'No data');
    emptySentimentDetail(src, 'No data for ' + metaName(src) + ' yet', result.emptyReason || 'No source-specific sentiment cache is available yet. Add backend cache data for this source to populate this tile.');
  };

  window.loadAllSentiment = loadAllSentiment = async function(){
    var loaded = 0;
    var stale = 0;
    var errors = 0;
    var firstRendered = false;
    var keys = Object.keys(SENT_META || {});
    for(var i=0;i<keys.length;i++){
      var src = keys[i];
      setSentimentTileState(src, 'No data');
      var result = await resolveSentimentForSource(src);
      if(result.status === 'loaded'){
        loaded++;
        applySentimentData(src, result.data, 'Loaded');
        if(!firstRendered){ renderSent(src, result.data); firstRendered = true; }
        continue;
      }
      if(result.status === 'stale'){
        stale++;
        applySentimentData(src, result.data, 'Stale');
        if(!firstRendered){ renderSent(src, result.data); firstRendered = true; }
        continue;
      }
      if(result.status === 'error'){
        errors++;
        setSentimentTileState(src, 'Error');
      }else{
        setSentimentTileState(src, 'No data');
      }
      setSentimentScoreUI(src, null);
    }
    reorderSentimentSources();
    updateSentGauge();
    if(loaded || stale){
      if(!firstRendered){
        var first = Object.keys(SENT_DATA || {})[0];
        if(first) renderSent(first, SENT_DATA[first]);
      }
    } else {
      var summary = errors ? 'Some sources failed to load from backend and no cache fallback was found.' : 'All source tiles are ready, but no source-specific sentiment payloads were found yet.';
      emptySentimentDetail('all', 'No source-specific sentiment payloads loaded', summary);
    }
  };

  window.clearSentCache = clearSentCache = function(){
    Object.keys(SENT_META || {}).forEach(function(src){
      try{ localStorage.removeItem(SENT_STORE + src); }catch(e){}
      try{ localStorage.removeItem('qr_v9_sent_' + src); }catch(e){}
      resetSentimentTile(src);
    });
    Object.keys(SENT_DATA || {}).forEach(function(k){ delete SENT_DATA[k]; });
    document.querySelectorAll('.sent-tile').forEach(function(t){ t.classList.remove('on'); });
    var g = document.getElementById('sentGauge'); if(g) g.style.display = 'none';
    emptySentimentDetail('all', 'All sentiment caches cleared', 'The shared fallback scores are removed. Real per-source sentiment can be added later through backend payloads.');
  };

  setTimeout(function(){
    Object.keys(SENT_META || {}).forEach(function(src){
      var data = safeLoadSentFromStorage(src);
      if(!data) resetSentimentTile(src);
    });
  }, 300);
})();
