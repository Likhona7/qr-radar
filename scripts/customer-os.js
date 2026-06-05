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
  consumer:   { name:'Consumer Affairs', icon:'&#128203;', color:'#e67e22', sources:'ConsumerAffairs, PissedConsumer, AirlineQuality', note:'Formal complaint platforms with highest severity issues.' },
  appstore:   { name:'Apple App Store', icon:'&#127822;', color:'#111827', sources:'iPhone airline ratings and reviews', note:'iOS app reviews reveal booking flow, crash, and boarding-pass friction.' },
  googleplay: { name:'Google Play', icon:'&#128241;', color:'#4285f4', sources:'Android airline ratings and reviews', note:'Android reviews reveal app stability, login, and checkout issues.' }
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
    consumer:['rep','ops','prd','reg'],
    appstore:['dig','prd','loy','rep'],
    googleplay:['dig','prd','loy','rep']
  };
  var sourceTerms = {
    twitter:/\bx\b|twitter|tweet|retweet|mention|social|viral|trend/i,
    reddit:/reddit|r\/|subreddit|thread|community|upvote/i,
    flyertalk:/flyertalk|frequent flyer|elite|tier|avios|miles|lounge|upgrade|status/i,
    trustpilot:/trustpilot|verified review|star rating|customer review/i,
    tripadvisor:/tripadvisor|traveler|traveller|holiday|family trip|cabin|food/i,
    skytrax:/skytrax|world airline awards|airline rating|premium cabin|five star|5-star/i,
    quora:/quora|question|answer|how to|why does|can i/i,
    consumer:/consumer affairs|consumeraffairs|pissedconsumer|airlinequality|formal complaint|case id|chargeback/i,
    appstore:/app store|ios|iphone|app rating|star rating|review|boarding pass|booking flow|crash/i,
    googleplay:/google play|android|app rating|star rating|review|login|checkout|crash/i
  };
  var themeTerms = {
    twitter:/social|viral|tweet|mention|trend|x\/twitter|realtime/i,
    reddit:/community|thread|discussion|subreddit|passenger discussion/i,
    flyertalk:/tier|status|avios|miles|upgrade|lounge|frequent flyer/i,
    trustpilot:/refund|compensation|baggage|support|review|rating/i,
    tripadvisor:/cabin|crew|food|seat|comfort|traveller review/i,
    skytrax:/award|premium|service quality|cabin crew|business class|first class/i,
    quora:/question|answer|how to|why|booking advice|loyalty advice/i,
    consumer:/complaint|case|refund|chargeback|escalation|compensation/i,
    appstore:/app|ios|iphone|booking flow|boarding pass|crash|login|checkout|rating/i,
    googleplay:/app|android|booking flow|boarding pass|crash|login|checkout|rating/i
  };
  var sentimentTerms = /customer|passenger|review|complaint|sentiment|refund|delay|app|website|loyalty|service|booking|baggage|cabin|social|brand|reputation/i;
  var personaTerms = {
    reddit:/ota|agent|fare|price|refund|delay|complaint|support|cancel|baggage|app|website|booking|churn|leakage|outage|friction/i,
    tripadvisor:/cabin|crew|seat|food|comfort|service|lounge|airport|check-?in|experience|holiday|family|destination/i,
    quora:/booking|policy|visa|avios|loyalty|upgrade|award|status|change|tips|guide|how to|why|can i/i,
    appstore:/app|ios|iphone|booking flow|crash|login|checkout|boarding pass|review/i,
    googleplay:/app|android|booking flow|crash|login|checkout|boarding pass|review/i
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
    signal: s,
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
      frequency: 'Medium',
      signal: i.signal
    }; })
    .filter(function(s){ return !painKeys[String(s.title || '').toLowerCase()]; });
  if(!strengths.length){
    strengths = ranked
      .filter(function(i){ return !negativeRegex.test(i.text); })
      .slice(0, 2)
      .map(function(i){ return {
        title: String((i.signal && (i.signal.title || i.signal.name)) || 'Neutral brand signal').slice(0, 90),
        detail: String((i.signal && (i.signal.body || i.signal.detail || i.signal.description)) || 'Backend/cache signal indicates a neutral or improving customer area.').slice(0, 170),
        frequency: 'Low',
        signal: i.signal
      }; });
  }
  var improvements = pain.slice(0, 3).map(function(p){
    return {
      title: 'Act on ' + p.title,
      detail: 'Use the loaded backend/cache signal to brief owner, verify source freshness, and define a customer-facing response.',
      effort: 'Medium',
      value: /refund|booking|loyalty|app|website|revenue|churn/i.test(p.title + ' ' + p.detail) ? 'Revenue protection' : 'Service recovery',
      owner: /app|website|booking|checkout/i.test(p.title + ' ' + p.detail) ? 'Digital Product' : 'Customer Experience',
      signal: p.signal
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
  var painH=(data.painPoints||[]).map(function(p){return '<div class="sent-item"><div class="sent-dot" style="background:#e74c3c"></div><div class="sent-item-b"><div class="sent-item-t">'+esc(p.title)+'</div><div class="sent-item-d">'+esc(p.detail)+'</div><div><span class="sent-item-freq '+(p.frequency==='High'?'sf-high':p.frequency==='Medium'?'sf-med':'sf-low')+'">'+esc(p.frequency)+' freq</span></div><div class="sent-item-src">Impact: '+esc(p.impact)+'</div>'+ciDateMetaOf(p.signal || p)+'</div></div>';}).join('');
  var strengthH=(data.strengths||[]).map(function(s){return '<div class="sent-item"><div class="sent-dot" style="background:#1abc9c"></div><div class="sent-item-b"><div class="sent-item-t">'+esc(s.title)+'</div><div class="sent-item-d">'+esc(s.detail)+'</div><div><span class="sent-item-freq '+(s.frequency==='High'?'sf-high':s.frequency==='Medium'?'sf-med':'sf-low')+'">'+esc(s.frequency)+' freq</span></div>'+ciDateMetaOf(s.signal || s)+'</div></div>';}).join('');
  var improveH=(data.improvements||[]).map(function(i){return '<div class="sent-item"><div class="sent-dot" style="background:#C8A050"></div><div class="sent-item-b"><div class="sent-item-t">'+esc(i.title)+'</div><div class="sent-item-d">'+esc(i.detail)+'</div><div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap"><span class="sent-item-freq '+(i.effort==='Quick win'?'sf-low':i.effort==='Medium'?'sf-med':'sf-high')+'">'+esc(i.effort)+'</span><span class="sent-item-freq sf-low">'+esc(i.value)+'</span></div><div class="sent-item-src">Owner: '+esc(i.owner)+'</div>'+ciDateMetaOf(i.signal || i)+'</div></div>';}).join('');
  var verbH=(data.verbatims||[]).map(function(v){return '<div style="padding:8px 10px;background:var(--bg2);border-left:2px solid '+(meta.color||'var(--qb)')+';border-radius:0 4px 4px 0;font-size:10px;color:var(--t2);font-style:italic;margin-bottom:6px">"'+esc(v)+'"</div>';}).join('');
  document.getElementById('sentDetail').innerHTML='<div class="sent-detail"><div class="sent-det-hdr"><div><div class="sent-det-title">'+meta.icon+' '+meta.name+' Sentiment Analysis</div><div class="sent-det-sub">'+data.totalMentions+' mentions analysed - Top complaint: '+data.topComplaint+'</div></div><div style="text-align:center"><div style="font-size:28px;font-weight:500;color:'+scColor+'">'+sc+'%</div><div style="font-size:10px;color:var(--t3)">'+data.sentimentLabel+'</div></div></div><div style="padding:14px 18px;background:var(--bg2);border-bottom:1px solid var(--bo)"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em">CUSTOMER VERBATIMS</div>'+verbH+'</div><div class="sent-body"><div class="sent-col"><div class="sent-col-t" style="color:#e74c3c">Pain Points ('+((data.painPoints||[]).length)+')</div>'+painH+'</div><div class="sent-col"><div class="sent-col-t" style="color:#1abc9c">Strengths ('+((data.strengths||[]).length)+')</div>'+strengthH+'</div><div class="sent-col"><div class="sent-col-t" style="color:#C8A050">Improvements ('+((data.improvements||[]).length)+')</div>'+improveH+'</div></div></div>';
  updateSentimentSourceFreshness(src);
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
    var meta=document.querySelector('.sent-tile[data-src="'+src+'"] .sent-freshness-meta'); if(meta) meta.remove();
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
      updateSentimentSourceFreshness(src);
    }
  });
  reorderSentimentSources();
  updateSentGauge();
  refreshSentimentSourceFreshness();
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
    updateSentimentSourceFreshness(src);
  });
  reorderSentimentSources();
  updateSentGauge();
  refreshSentimentSourceFreshness();
}

// â”€â”€ CUSTOMER INTELLIGENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var CI_DATA = {};
var CI_STORE = 'qr_v10_ci_';
var ACTIVE_CI = null;
var CI_BACKEND_SEGMENT_ENDPOINT_AVAILABLE = true;

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
  digitalNomad:{
    name:'Digital Nomad', icon:'&#128187;', color:'#2E86DE',
    desc:'Remote and hybrid workers taking longer-stay, multi-city journeys. They combine work utility with lifestyle and are highly digital in planning and servicing.',
    routes:'DOH-LIS, DOH-BKK, DOH-DPS, DOH-BCN, DOH-CPT, DOH-MLE',
    size:'~3-5M high-flex travellers in relevant long-stay corridors',
    qrContext:'Digital nomads influence premium economy, ancillary mix, and repeat direct bookings when work-friendly products and stay partnerships are clear.'
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

function syncCustomerIntelSegmentBadge(){
  var badge = document.getElementById('ciSegmentsBadge');
  if(!badge) return;
  var count = Object.keys(CI_META || {}).length;
  badge.textContent = count + ' segments';
}
setTimeout(syncCustomerIntelSegmentBadge, 80);

var CI_ACTION_DOMAIN_MAP = {
  diaspora:'rev',
  business:'dig',
  leisure:'rev',
  loyalty:'loy',
  transit:'ops',
  digitalNomad:'dig',
  luxury:'prd'
};

var CI_STRATEGIC_LENSES = {
  diaspora:[
    {name:'Family Multi-Pax Planner', priority:'High', why:'Higher basket size and seat-together pressure. This lens protects conversion where one failure can lose multiple passengers.', move:'Bundle family-seat + baggage certainty and proactive disruption support.'},
    {name:'Student & Young Professional', priority:'Medium', why:'Early loyalty capture on long-haul corridors compounds lifetime value over multiple years.', move:'Launch first-job/student starter fares with loyalty acceleration and app onboarding.'},
    {name:'Disruption-Recovery Customers', priority:'High', why:'Service recovery quality in this segment directly impacts repeat purchase and referral trust.', move:'Trigger instant re-accommodation + compensation journeys when disruption signals appear.'}
  ],
  business:[
    {name:'SME / Self-Employed Business Traveler', priority:'High', why:'Frequent trips without managed contracts create direct-share upside if we simplify repeat booking and servicing.', move:'Offer SME direct bundles with flexible changes, loyalty bonuses and fast service lanes.'},
    {name:'Disruption-Recovery Customers', priority:'High', why:'Business retention drops quickly after poor disruption handling.', move:'Activate executive service recovery workflow with owner accountability in 24 hours.'}
  ],
  leisure:[
    {name:'Direct-Recovery from OTA Shoppers', priority:'High', why:'Users discover via OTA/metasearch but can still convert direct with timing, pricing clarity and loyalty hooks.', move:'Run OTA-exposed retargeting play: direct perks, app-only benefits and limited-time conversion nudges.'},
    {name:'Family Multi-Pax Planner', priority:'High', why:'Group leisure trips drive ancillary value but are very sensitive to baggage and seating friction.', move:'Push family trip bundles with transparent total-trip pricing and seat assurance.'},
    {name:'Student & Young Professional', priority:'Medium', why:'Price-sensitive now, high lifetime value later when captured into owned channels.', move:'Deploy youth fare + loyalty onboarding + referral mechanics across app and social journeys.'}
  ],
  loyalty:[
    {name:'Direct-Recovery from OTA Shoppers', priority:'High', why:'Members who begin off-channel are at risk of value leakage unless pulled back to direct journeys.', move:'Use member-level offer recovery flows tied to tier progress and redemption nudges.'},
    {name:'Disruption-Recovery Customers', priority:'High', why:'Tier members penalize inconsistency faster than non-members.', move:'Guarantee priority recovery path for disrupted loyalty members within 2 hours.'}
  ],
  transit:[
    {name:'Family Multi-Pax Planner', priority:'High', why:'Multi-leg family transit creates outsized risk around misconnects, baggage and visa clarity.', move:'Publish transfer-safe family itineraries with baggage continuity and clear visa guidance.'},
    {name:'Disruption-Recovery Customers', priority:'High', why:'Transit disruption amplifies support load and social visibility.', move:'Auto-trigger transit rescue playbook with proactive comms and rebooking pathways.'}
  ],
  digitalNomad:[
    {name:'Direct-Recovery from OTA Shoppers', priority:'High', why:'Nomads often start in comparison channels and need a direct reason to complete with QR.', move:'Retarget flexible-fare researchers with direct-only work-travel bundles and loyalty boosts.'},
    {name:'Student & Young Professional', priority:'Medium', why:'Emerging professionals overlap with remote-work segments and can become high-frequency future value.', move:'Create entry-tier growth journey with wallet setup, points education and app habit loops.'},
    {name:'Disruption-Recovery Customers', priority:'High', why:'Long-stay remote travelers face outsized trust loss when schedules break work continuity.', move:'Deploy proactive disruption playbooks with fast rebooking and transparent service recovery updates.'}
  ],
  luxury:[
    {name:'Disruption-Recovery Customers', priority:'High', why:'Premium travelers judge brand value on recovery precision during irregular operations.', move:'Enable concierge recovery triggers with premium service restoration and loyalty reinforcement.'}
  ]
};

function ciParseDateValue(v){
  if(!v) return null;
  var direct = Date.parse(v);
  if(Number.isFinite(direct)) return direct;
  var txt = String(v).trim();
  var iso = txt.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if(iso){
    var d1 = Date.parse(iso[0] + 'T00:00:00Z');
    if(Number.isFinite(d1)) return d1;
  }
  var dmy = txt.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if(dmy){
    var d2 = Date.parse(dmy[1] + ' ' + dmy[2] + ' ' + dmy[3]);
    if(Number.isFinite(d2)) return d2;
  }
  return null;
}
function ciSignalTimestamp(signal){
  if(!signal || typeof signal !== 'object') return null;
  var candidates = [
    signal.sourceDate, signal.source_date,
    signal.eventDate, signal.event_date,
    signal.lastVerifiedAt, signal.last_verified_at,
    signal.lastSeenAt, signal.last_seen_at,
    signal.createdAt, signal.created_at,
    signal.firstSeenAt, signal.first_seen_at,
    signal.refreshed_at
  ];
  for(var i=0;i<candidates.length;i++){
    var ts = ciParseDateValue(candidates[i]);
    if(Number.isFinite(ts)) return ts;
  }
  return null;
}
function ciDateMetaOf(signal){
  try{
    if(!signal || typeof signal !== 'object') return '';
    return typeof renderSignalDateMeta === 'function' ? renderSignalDateMeta(signal || {}) : '';
  }catch(e){
    return '';
  }
}
function ciCompactDateMetaOf(signal){
  try{
    if(!signal || typeof signal !== 'object') return '';
    return typeof renderSignalDateCompactMeta === 'function' ? renderSignalDateCompactMeta(signal || {}) : '';
  }catch(e){
    return '';
  }
}
function latestSignalFromSentimentData(data){
  var rows = []
    .concat((data && data.painPoints) || [])
    .concat((data && data.strengths) || [])
    .concat((data && data.improvements) || []);
  var best = null;
  var bestTs = null;
  rows.forEach(function(row){
    var signal = row && row.signal ? row.signal : row;
    var ts = ciSignalTimestamp(signal);
    if(Number.isFinite(ts) && (!bestTs || ts > bestTs)){
      bestTs = ts;
      best = signal;
    }
  });
  return best;
}
function latestSignalForSentimentSource(src){
  var fromData = latestSignalFromSentimentData(SENT_DATA[src]);
  if(fromData) return fromData;
  var items = typeof domainCacheSignalsForSentiment === 'function' ? domainCacheSignalsForSentiment(src) : [];
  var best = null;
  var bestTs = null;
  items.forEach(function(item){
    var signal = item && item.signal ? item.signal : item;
    var ts = ciSignalTimestamp(signal);
    if(Number.isFinite(ts) && (!bestTs || ts > bestTs)){
      bestTs = ts;
      best = signal;
    }
  });
  return best;
}
function sentimentSourceFreshnessMeta(src){
  return ciCompactDateMetaOf(latestSignalForSentimentSource(src));
}
function updateSentimentSourceFreshness(src){
  var tile = document.querySelector('.sent-tile[data-src="' + String(src).replace(/"/g, '') + '"]');
  if(!tile) return;
  var existing = tile.querySelector('.sent-freshness-meta');
  var html = sentimentSourceFreshnessMeta(src);
  if(!html){
    if(existing) existing.remove();
    return;
  }
  if(!existing){
    existing = document.createElement('div');
    existing.className = 'sent-freshness-meta';
    tile.appendChild(existing);
  }
  existing.innerHTML = html;
}
function refreshSentimentSourceFreshness(){
  Object.keys(SENT_META || {}).forEach(updateSentimentSourceFreshness);
}
function ciSourceReliabilityPoints(source){
  var t = String(source || '').toLowerCase();
  if(!t) return 14;
  if(/qatar airways|official|newsroom|press release|regulator|civil aviation|airport|iata|icao|government|app store|apple|google play/.test(t)) return 29;
  if(/reuters|bloomberg|ft|financial times|wsj|cnn|bbc|forbes|skift|aerotime|gulf times|qatar tribune|industry/.test(t)) return 23;
  if(/flyertalk|trustpilot|tripadvisor|skytrax|review/.test(t)) return 19;
  if(/reddit|twitter|x\/|x |quora|consumer/.test(t)) return 14;
  return 16;
}
function ciConfidenceBand(score){
  if(score >= 85) return 'High';
  if(score >= 70) return 'Medium-High';
  if(score >= 55) return 'Medium';
  return 'Low';
}
function ciComputeConfidence(seg, data){
  data = data || {};
  var evidence = [];
  var pushEvidence = function(source, title, detail){
    evidence.push({
      source: String(source || '').trim(),
      title: String(title || '').trim(),
      detail: String(detail || '').trim()
    });
  };
  (data.bookingBehaviour || []).forEach(function(row){
    pushEvidence(row.source, row.insight, row.detail + ' ' + (row.implication || ''));
  });
  (data.painPoints || []).forEach(function(row){
    pushEvidence(row.competitorAdvantage || 'pain signal', row.pain, row.detail);
  });
  (data.loyaltyDrivers || []).forEach(function(row){
    pushEvidence(row.strength || 'loyalty signal', row.driver, row.detail);
  });
  (data.externalSignals || []).forEach(function(row){
    pushEvidence(row.source, row.signal, row.implication);
  });
  if(!evidence.length){
    pushEvidence('segment-intel', data.segmentName || seg, data.topInsight || '');
  }

  var srcCounts = {};
  evidence.forEach(function(item){
    var key = item.source || 'unknown';
    srcCounts[key] = (srcCounts[key] || 0) + 1;
  });
  var uniqueSources = Object.keys(srcCounts).length;
  var reliabilityTotal = 0;
  Object.keys(srcCounts).forEach(function(src){
    reliabilityTotal += ciSourceReliabilityPoints(src);
  });
  var sourceReliability = uniqueSources ? Math.round(reliabilityTotal / uniqueSources) : 10;

  var corroboration = 0;
  if(uniqueSources >= 4) corroboration = 25;
  else if(uniqueSources === 3) corroboration = 22;
  else if(uniqueSources === 2) corroboration = 16;
  else if(uniqueSources === 1) corroboration = 10;

  var now = Date.now();
  var ts = ciParseDateValue(data.latestEvidenceAt);
  var ageDays = null;
  if(Number.isFinite(ts)){
    ageDays = Math.max(0, (now - ts) / 86400000);
  }
  var recency = 10;
  var freshnessState = 'Aging';
  if(ageDays === null){
    recency = 10;
    freshnessState = 'Unknown';
  } else if(ageDays <= 3){
    recency = 20;
    freshnessState = 'Fresh';
  } else if(ageDays <= 7){
    recency = 17;
    freshnessState = 'Fresh';
  } else if(ageDays <= 30){
    recency = 13;
    freshnessState = 'Aging';
  } else {
    recency = 7;
    freshnessState = 'Stale';
  }

  var specificityHits = 0;
  evidence.forEach(function(item){
    var txt = (item.title + ' ' + item.detail).toLowerCase();
    if(/\d/.test(txt) || /\$|qar|usd|%|bn|million|m\b/.test(txt) || /\b\d{4}-\d{2}-\d{2}\b/.test(txt) || /https?:\/\//.test(txt)){
      specificityHits++;
    }
  });
  var specificityRatio = evidence.length ? (specificityHits / evidence.length) : 0;
  var specificity = specificityRatio >= 0.65 ? 14 : specificityRatio >= 0.35 ? 10 : specificityRatio > 0 ? 7 : 4;
  if((data.topInsight || '').length > 55) specificity = Math.min(15, specificity + 1);

  var bizText = [
    data.topInsight,
    data.serviceRiskReason,
    data.customerValueReason,
    data.decisionReadinessReason,
    data.nextBestAction && data.nextBestAction.action
  ].filter(Boolean).join(' ').toLowerCase();
  var businessHitCount = (bizText.match(/booking|conversion|revenue|yield|loyalty|retention|direct|ota|app|web|premium|ancillary|churn|disruption|service|trust/g) || []).length;
  var businessRelevance = Math.max(3, Math.min(10, 3 + businessHitCount));

  var penalties = 0;
  if(uniqueSources <= 1) penalties -= 6;
  var dominantShare = 0;
  Object.keys(srcCounts).forEach(function(src){
    dominantShare = Math.max(dominantShare, srcCounts[src] / Math.max(1, evidence.length));
  });
  if(dominantShare >= 0.7 && evidence.length >= 4) penalties -= 4;
  if(freshnessState === 'Stale') penalties -= 4;

  var score = Math.max(0, Math.min(100, sourceReliability + corroboration + recency + specificity + businessRelevance + penalties));
  var band = ciConfidenceBand(score);
  var caveat = '';
  if(uniqueSources <= 1) caveat = 'Single-source heavy; treat as directional until corroborated.';
  else if(freshnessState === 'Stale') caveat = 'Evidence is aging; re-verify before executive escalation.';
  else if(freshnessState === 'Unknown') caveat = 'Missing explicit timestamps; keep a verification checkpoint.';

  return {
    score: score,
    band: band,
    sourceCount: uniqueSources,
    corroborationCount: Math.min(uniqueSources, 3),
    freshnessState: freshnessState,
    breakdown: [
      {label:'Source reliability', score:sourceReliability, max:30},
      {label:'Corroboration', score:corroboration, max:25},
      {label:'Recency', score:recency, max:20},
      {label:'Evidence specificity', score:specificity, max:15},
      {label:'Business relevance', score:businessRelevance, max:10}
    ],
    caveat: caveat
  };
}

function ciActionDomain(seg){
  return CI_ACTION_DOMAIN_MAP[seg] || 'dig';
}
function ciActionTitle(seg, data){
  var action = (data && data.nextBestAction && data.nextBestAction.action) ? data.nextBestAction.action : '';
  if(!action && data && Array.isArray(data.personalisationOpps) && data.personalisationOpps[0]){
    action = data.personalisationOpps[0].title || '';
  }
  if(!action && data && data.topInsight){
    action = 'Convert segment signal into action: ' + data.topInsight;
  }
  if(!action){
    var fallbackName = (data && data.segmentName) || ((CI_META[seg] && CI_META[seg].name) ? CI_META[seg].name : seg);
    action = 'Activate ' + fallbackName + ' growth and retention play';
  }
  var tags = [];
  if(data && data.customerValuePotential) tags.push('Value ' + data.customerValuePotential);
  if(data && data.decisionReadiness) tags.push('Readiness ' + data.decisionReadiness);
  if(data && data.serviceRiskLevel) tags.push('Risk ' + data.serviceRiskLevel);
  var withTags = tags.length ? (action + ' | ' + tags.join(' | ')) : action;
  return String(withTags).slice(0, 180);
}
function ciActionDomainLabel(domainId){
  if(typeof DOM_LABELS !== 'undefined' && DOM_LABELS && DOM_LABELS[domainId]) return DOM_LABELS[domainId];
  var map = {dig:'Digital & direct', rev:'Revenue & pricing', loy:'Loyalty', ops:'Operations', prd:'Product & experience'};
  return map[domainId] || domainId;
}
function openCIActionPlan(seg){
  var data = normalizeCIData(seg, CI_DATA[seg] || emptyCI(seg));
  var domainId = ciActionDomain(seg);
  var segName = (data && data.segmentName) ? data.segmentName : ((CI_META[seg] && CI_META[seg].name) ? CI_META[seg].name : seg);
  var domainTitle = 'Customer Intelligence - ' + segName + ' (' + ciActionDomainLabel(domainId) + ')';
  var action = ciActionTitle(seg, data);
  if(typeof window.openAP === 'function'){
    window.openAP(action, domainTitle, domainId);
    return;
  }
  console.warn('[Radar] Action-plan overlay is not available yet.');
}
window.openCIActionPlan = openCIActionPlan;


function ciPriorityScore(seg, data){
  let score = Number(data?.opportunityScore) || 0;
  const joined = JSON.stringify(data || {}).toLowerCase();
  score += (data?.personalisationOpps || []).filter(o => /quick win|revenue|conversion|loyalty|retention|app|web|ucp|personalisation|personalization|ancillary/.test(JSON.stringify(o).toLowerCase())).length * 8;
  score += (data?.painPoints || []).filter(p => /competitor|emirates|turkish|air india|ethiopian|churn|loyalty|price|refund|app|web|direct/.test(JSON.stringify(p).toLowerCase())).length * 6;
  if(/highest ltv|premium yield|retention|conversion|loyalty|direct booking/.test(joined)) score += 12;
  const base = {diaspora:14, luxury:15, loyalty:13, business:12, digitalNomad:11, transit:9, leisure:8};
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
    digitalNomad:['dig','agt','rev','geo','sml'],
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
  var sourceKeys = {};
  var latestEvidenceTs = null;
  rows.forEach(function(r){
    var srcKey = String((r.signal && (r.signal.source || r.signal.sourceName)) || r.domain || 'cache').trim().toLowerCase();
    if(srcKey) sourceKeys[srcKey] = true;
    var ts = ciSignalTimestamp(r.signal);
    if(Number.isFinite(ts) && (!latestEvidenceTs || ts > latestEvidenceTs)) latestEvidenceTs = ts;
  });
  var sourceCount = Object.keys(sourceKeys).length;
  var latestEvidenceAt = latestEvidenceTs ? new Date(latestEvidenceTs).toISOString() : '';
  var meta = CI_META[seg] || {};
  var avg = Math.round(rows.reduce(function(a,r){ return a + (Number(r.signal.commercialImpactScore || 6) * 10); },0) / rows.length);
  avg = Math.max(45, Math.min(95, avg));
  var risks = rows.filter(function(r){return /risk|friction|delay|complaint|drop|pressure|refund|issue|disrupt/i.test((r.signal.title||'')+' '+(r.signal.body||'')+' '+(r.signal.impactLabel||''));});
  var opps = rows.filter(function(r){return /opportun|growth|direct|loyalty|conversion|premium|ancillary|capture|personal/i.test((r.signal.title||'')+' '+(r.signal.body||'')+' '+(r.signal.captureStrategy||''));});
  var riskLevel = risks.length >= 5 ? 'Critical' : risks.length >= 3 ? 'High' : risks.length ? 'Medium' : 'Low';
  var topSignal = rows[0] && rows[0].signal ? rows[0].signal : {};
  var intentBySeg = {
    diaspora:'shopping',
    business:'in-trip',
    leisure:'inspiration',
    loyalty:'post-trip',
    transit:'day-of',
    digitalNomad:'shopping',
    luxury:'pre-trip'
  };
  var missionBySeg = {
    diaspora:['VFR','Leisure'],
    business:['Business'],
    leisure:['Leisure','Event'],
    loyalty:['Business','Leisure'],
    transit:['Business','Leisure','VFR'],
    digitalNomad:['Business','Leisure'],
    luxury:['Leisure','Business']
  };
  var partyTypeBySeg = {
    diaspora:['Family','Solo','Group'],
    business:['Solo','Couple'],
    leisure:['Couple','Family','Group'],
    loyalty:['Solo','Couple'],
    transit:['Solo','Couple','Family'],
    digitalNomad:['Solo','Couple'],
    luxury:['Couple','Solo','Family']
  };
  var digitalBehaviourBySeg = {
    diaspora:{channel:'Web-first', note:'Long itinerary and baggage complexity drive desktop-first comparison and planning.'},
    business:{channel:'App-first', note:'Frequent schedules, check-in, and disruption handling prioritize mobile speed.'},
    leisure:{channel:'OTA-influenced', note:'Metasearch and OTA discovery shape early fare and destination consideration.'},
    loyalty:{channel:'App-first', note:'Members react to tier, wallet, and redemption nudges in owned app flows.'},
    transit:{channel:'Web-first', note:'Connection and visa checks often begin on larger-screen planning journeys.'},
    digitalNomad:{channel:'OTA-influenced', note:'Nomads often start with open-ended search tools before moving to direct booking.'},
    luxury:{channel:'App-first', note:'High-value travelers engage with concierge-like mobile servicing and upgrade flows.'}
  };
  var valuePotentialBySeg = {
    diaspora:{level:'High', reason:'High frequency travel and family-size itineraries sustain repeat direct value.'},
    business:{level:'High', reason:'Yield and loyalty lift are strongest when disruption friction stays low.'},
    leisure:{level:'Medium', reason:'Volume is large, but conversion and margin vary by campaign seasonality.'},
    loyalty:{level:'High', reason:'Retention and share-of-wallet leverage remain outsized in this segment.'},
    transit:{level:'Medium', reason:'Hub scale is large, but value depends on stopover and ancillary conversion.'},
    digitalNomad:{level:'High', reason:'Longer-stay patterns and repeat bookings can compound lifetime value.'},
    luxury:{level:'High', reason:'Premium service and loyalty pathways influence disproportionate revenue share.'}
  };
  var readinessBySeg = {
    diaspora:{stage:'Comparing options', reason:'Price, baggage and family flexibility checks dominate final decision loops.'},
    business:{stage:'Ready to book', reason:'Clear schedules and low-friction servicing accelerate confirmation.'},
    leisure:{stage:'Researching', reason:'Destination inspiration and campaign timing drive longer consideration windows.'},
    loyalty:{stage:'Ready to book', reason:'Tier and redemption triggers reduce friction at checkout.'},
    transit:{stage:'Researching', reason:'Connection confidence and visa certainty are prerequisites before purchase.'},
    digitalNomad:{stage:'Comparing options', reason:'They compare stay-work value, flexibility and total trip economics.'},
    luxury:{stage:'Ready to buy now', reason:'When prestige, privacy and curated benefits align, conversion is fast.'}
  };
  var riskTagBySeg = {
    diaspora:[
      {tag:'MISCONNECT', note:'Tight multi-leg itineraries increase disruption sensitivity.'},
      {tag:'VISA', note:'Visa policy shifts can break planning and create support spikes.'},
      {tag:'BAGGAGE', note:'Family travel and long stays drive higher baggage complexity.'},
      {tag:'DISRUPTION', note:'Schedule changes quickly cascade into support and loyalty risk.'}
    ],
    business:[
      {tag:'MISCONNECT', note:'Missed connections create outsized trust and productivity impact.'},
      {tag:'VISA', note:'Documentation friction can collapse short-window business travel.'},
      {tag:'BAGGAGE', note:'Lower primary risk versus schedule and servicing certainty.'},
      {tag:'DISRUPTION', note:'Delay and rebooking quality directly affect corporate preference.'}
    ],
    leisure:[
      {tag:'MISCONNECT', note:'Connection anxiety rises around peak season itineraries.'},
      {tag:'VISA', note:'Entry rule confusion depresses conversion for first-time routes.'},
      {tag:'BAGGAGE', note:'Family and event travel increase baggage issue visibility.'},
      {tag:'DISRUPTION', note:'Holiday disruptions trigger high social and review amplification.'}
    ],
    loyalty:[
      {tag:'MISCONNECT', note:'Service recovery quality determines retention under disruption.'},
      {tag:'VISA', note:'Policy friction can weaken confidence in premium trip planning.'},
      {tag:'BAGGAGE', note:'Priority handling failures damage tier-value perception.'},
      {tag:'DISRUPTION', note:'Benefit inconsistency during disruption is a core churn trigger.'}
    ],
    transit:[
      {tag:'MISCONNECT', note:'Hub transfer reliability is the top conversion determinant.'},
      {tag:'VISA', note:'Transit and stopover visa clarity is essential for confidence.'},
      {tag:'BAGGAGE', note:'Through-check issues can break onward journey trust.'},
      {tag:'DISRUPTION', note:'Irregular operations rapidly increase call-center pressure.'}
    ],
    digitalNomad:[
      {tag:'MISCONNECT', note:'Multi-city planning needs resilient rebooking options.'},
      {tag:'VISA', note:'Long-stay documentation and eligibility shifts drive hesitation.'},
      {tag:'BAGGAGE', note:'Remote-work gear increases baggage sensitivity and cost concerns.'},
      {tag:'DISRUPTION', note:'Schedule instability directly impacts work continuity.'}
    ],
    luxury:[
      {tag:'MISCONNECT', note:'Premium travelers expect seamless handoffs at every touchpoint.'},
      {tag:'VISA', note:'High-value itineraries need concierge-grade documentation guidance.'},
      {tag:'BAGGAGE', note:'Premium expectations make handling failures highly damaging.'},
      {tag:'DISRUPTION', note:'Service-recovery quality can make or break loyalty economics.'}
    ]
  };
  var extSignals = rows.slice(0, 3).map(function(r){
    var title = r.signal.title || r.signal.body || 'Customer signal';
    return {
      signal: title.slice(0, 60),
      source: (r.signal.source || r.domain || 'cache').toString(),
      direction: /rise|surge|increase|growth|up/i.test((r.signal.body || '') + ' ' + (r.signal.impactLabel || '')) ? 'rising' : 'stable',
      implication: (r.signal.captureStrategy || r.signal.whyItMattersNow || r.signal.impactLabel || '').toString().slice(0, 80),
      signalData: r.signal
    };
  });
  var genericNba = {
    action: (topSignal.captureStrategy || topSignal.title || 'Run targeted segment intervention').toString().slice(0, 80),
    adobeProduct: 'RTCDP',
    timeline: 'This quarter',
    owner: 'Digital/B2C'
  };
  if(seg === 'digitalNomad'){
    extSignals = [
      { signal:'Flexible fare and long-stay demand discussion rising', source:'Travel communities', direction:'rising', implication:'Highlight flexibility, productivity and stopover value in direct messaging.' },
      { signal:'Remote-work trip planning starts on metasearch', source:'Search and OTA patterns', direction:'rising', implication:'Strengthen direct retargeting from comparison journeys.' },
      { signal:'Work-friendly cabin and Wi-Fi quality drive review impact', source:'App and social reviews', direction:'stable', implication:'Tie product reliability signals to conversion messaging and loyalty value.' }
    ];
    genericNba = {
      action:'Launch a nomad journey: flexible fare + stopover + loyalty accelerator bundle',
      adobeProduct:'Journey Optimizer',
      timeline:'This quarter',
      owner:'Digital Marketing + Product'
    };
  }
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
  var valuePotential = valuePotentialBySeg[seg] || {level:'Medium', reason:'Value profile needs more direct segment evidence.'};
  var readiness = readinessBySeg[seg] || {stage:'Researching', reason:'Readiness defaults to research without clearer intent signals.'};
  var strategicLenses = CI_STRATEGIC_LENSES[seg] || [];
  return normalizeCIData(seg, {
    segment: seg,
    segmentName: meta.name || seg,
    opportunityScore: avg,
    opportunityLabel: 'Derived from domain cache',
    size: meta.size || 'Backend/cache derived segment',
    topInsight: rows[0].signal.title || rows[0].signal.body || 'Domain cache signals available for this segment.',
    identityConfidence: 'Medium',
    tripIntentState: intentBySeg[seg] || 'shopping',
    customerValuePotential: valuePotential.level,
    customerValueReason: valuePotential.reason,
    decisionReadiness: readiness.stage,
    decisionReadinessReason: readiness.reason,
    tripMission: missionBySeg[seg] || ['Leisure'],
    partyType: partyTypeBySeg[seg] || ['Solo'],
    digitalBehaviour: digitalBehaviourBySeg[seg] || {channel:'Web-first', note:'Default digital behavior profile.'},
    serviceRiskLevel: riskLevel,
    serviceRiskReason: risks[0] ? (risks[0].signal.title || 'Customer friction trend detected').slice(0, 80) : 'No dominant risk signal',
    serviceRiskTags: riskTagBySeg[seg] || [],
    bookingBehaviour: rows.slice(0,4).map(function(r){return {insight:r.signal.title||'Behaviour signal', detail:r.signal.body||r.signal.whyItMattersNow||'', source:(r.domain||'').toUpperCase(), implication:r.signal.captureStrategy||r.signal.impactLabel||'', signal:r.signal};}),
    loyaltyDrivers: opps.slice(0,4).map(function(r){return {driver:r.signal.title||'Value driver', detail:r.signal.whyItMattersNow||r.signal.body||'', strength:r.signal.confidence||'Medium', signal:r.signal};}),
    painPoints: risks.slice(0,4).map(function(r){return {pain:r.signal.title||'Customer pain point', detail:r.signal.body||r.signal.whyItMattersNow||'', competitorAdvantage:r.signal.impactLabel||r.signal.demandImpact||'', signal:r.signal};}),
    personalisationOpps: rows.slice(0,5).map(function(r){return {title:r.signal.captureStrategy||r.signal.title||'Personalisation opportunity', detail:r.signal.whyItMattersNow||r.signal.body||'', ucpUseCase:'Use customer context to prioritise this signal', adobeProduct: seg === 'luxury' ? 'Journey Optimizer' : 'RTCDP', value:r.signal.impactLabel||'B2C value', effort:r.signal.timeToImpact||'30 days', owner:'Digital/B2C', persona: seg === 'luxury' ? 'all' : '', dataSource:'both', signal:r.signal};}),
    externalSignals: extSignals,
    nextBestAction: genericNba,
    strategicLenses: strategicLenses,
    luxuryPersonas: meta.luxuryPersonas || [],
    sourceCount: sourceCount,
    corroborationCount: Math.min(sourceCount, 3),
    latestEvidenceAt: latestEvidenceAt,
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
  if(typeof BACKEND_URL !== 'undefined' && BACKEND_URL && CI_BACKEND_SEGMENT_ENDPOINT_AVAILABLE){
    try{
      setBtn('Checking backend...', false);
      var viewMode = (typeof VIEW_MODE !== 'undefined' && VIEW_MODE) ? VIEW_MODE : 'enterprise';
      var resp = await fetch(
        BACKEND_URL+'/api/cache/customer-intel/'+encodeURIComponent(seg)+'?viewMode='+encodeURIComponent(viewMode),
        { signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined }
      );
      if(resp.status === 404){
        CI_BACKEND_SEGMENT_ENDPOINT_AVAILABLE = false;
      }
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
  setBtn('Using cache...', false);
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
        '"customerValuePotential":"High|Medium|Low","customerValueReason":"string","decisionReadiness":"Researching|Comparing options|Ready to book|Ready to buy now|Post-booking support","decisionReadinessReason":"string",'+
        '"tripMission":["Leisure|VFR|Business|Religious|Event"],"partyType":["Solo|Couple|Family|Group"],"digitalBehaviour":{"channel":"App-first|Web-first|OTA-influenced","note":"string"},"serviceRiskTags":[{"tag":"MISCONNECT|VISA|BAGGAGE|DISRUPTION","note":"string"}],'+
        '"bookingBehaviour":[{"insight":"string","detail":"string","source":"string","implication":"string"}],'+
        '"loyaltyDrivers":[{"driver":"string","detail":"string","strength":"Strong|Medium|Weak"}],'+
        '"painPoints":[{"pain":"string","detail":"string","competitorAdvantage":"string"}],'+
        '"personalisationOpps":[{"title":"string","detail":"string","ucpUseCase":"string","adobeProduct":"CJA|RTCDP|Journey Optimizer|Brand Concierge|Journey Optimizer Loyalty","value":"string","effort":"Quick win|Medium|Strategic","owner":"string","persona":"all|privacy|curator|status","dataSource":"external|internal|both"}],'+
        '"kpis":[{"metric":"string","qrCurrent":"string","benchmark":"string","gap":"string"}],'+
        '"externalSignals":[{"signal":"string","source":"string","direction":"rising|falling|stable","implication":"string"}],'+
        '"nextBestAction":{"action":"string","adobeProduct":"string","timeline":"This week|This quarter|6 months","owner":"string"},'+
        '"strategicLenses":[{"name":"string","priority":"High|Medium|Low","why":"string","move":"string"}]}';
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
  var computedConfidence = ciComputeConfidence(seg, data);
  var confScore = Number(data.confidenceScore);
  if(!Number.isFinite(confScore)) confScore = computedConfidence.score;
  var confBand = data.confidenceBand || computedConfidence.band;
  var confBreakdown = (Array.isArray(data.confidenceBreakdown) && data.confidenceBreakdown.length)
    ? data.confidenceBreakdown
    : computedConfidence.breakdown;
  var confSourceCount = Number.isFinite(Number(data.sourceCount)) ? Number(data.sourceCount) : computedConfidence.sourceCount;
  var confCorroborationCount = Number.isFinite(Number(data.corroborationCount)) ? Number(data.corroborationCount) : computedConfidence.corroborationCount;
  var confCaveat = data.confidenceCaveat || computedConfidence.caveat;
  var confFreshness = computedConfidence.freshnessState;
  var confClass = confScore >= 85 ? 'ci-conf-high' : confScore >= 70 ? 'ci-conf-medh' : confScore >= 55 ? 'ci-conf-med' : 'ci-conf-low';

  var kpiH=(data.kpis||[]).map(function(k){
    var gap = k && k.gap ? '<div style="font-size:9px;color:var(--t3);margin-top:2px">Gap: '+esc(k.gap)+'</div>' : '';
    return '<div class="ci-kpi"><div class="ci-kpi-v" style="color:'+scColor+'">'+esc(k.qrCurrent || '-')+'</div><div class="ci-kpi-l">'+esc(k.metric || 'Metric')+'</div><div style="font-size:9px;color:var(--t3);margin-top:2px">Benchmark: '+esc(k.benchmark || '-')+'</div>'+gap+'</div>';
  }).join('');

  var bookH=(data.bookingBehaviour||[]).map(function(b){
    return '<div class="ci-item"><div class="ci-dot" style="background:#7BA7E8"></div><div class="ci-item-b"><strong>'+esc(b.insight || '')+'</strong><br>'+esc(b.detail || '')+'<br><span class="ci-item-tag ci-tag-b">'+esc(b.source || 'Source')+'</span><div style="margin-top:3px;font-size:9px;color:var(--qg)">&#8594; '+esc(b.implication || '')+'</div>'+ciDateMetaOf(b.signal || b)+'</div></div>';
  }).join('');

  var loyH=(data.loyaltyDrivers||[]).map(function(l){
    var tagClass=l.strength==='Strong'?'ci-tag-g':l.strength==='Medium'?'ci-tag-a':'ci-tag-r';
    return '<div class="ci-item"><div class="ci-dot" style="background:#1abc9c"></div><div class="ci-item-b"><strong>'+esc(l.driver || '')+'</strong><br>'+esc(l.detail || '')+'<br><span class="ci-item-tag '+tagClass+'">'+esc(l.strength || 'Medium')+' for QR</span>'+ciDateMetaOf(l.signal || l)+'</div></div>';
  }).join('');

  var painH=(data.painPoints||[]).map(function(p){
    return '<div class="ci-item"><div class="ci-dot" style="background:#e74c3c"></div><div class="ci-item-b"><strong>'+esc(p.pain || '')+'</strong><br>'+esc(p.detail || '')+'<br><span class="ci-item-tag ci-tag-r">'+esc(p.competitorAdvantage || '')+'</span>'+ciDateMetaOf(p.signal || p)+'</div></div>';
  }).join('');

  var oppH=(data.personalisationOpps||[]).map(function(o){
    var effortClass=o.effort==='Quick win'?'ci-tag-g':o.effort==='Medium'?'ci-tag-a':'ci-tag-b';
    var adobeTag = o.adobeProduct ? '<span style="font-size:9px;font-weight:600;padding:1px 5px;border-radius:3px;background:rgba(200,160,80,.1);color:var(--qg);margin-left:4px">'+esc(o.adobeProduct)+'</span>' : '';
    var dsTag = o.dataSource ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--bg2);color:var(--t3)">'+esc(o.dataSource)+'</span>' : '';
    var personaTag = (o.persona && o.persona !== 'all') ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(26,106,72,.08);color:var(--grn)">'+esc(o.persona)+'</span>' : '';
    return '<div class="ci-opp"><div class="ci-opp-eyebrow">UCP: '+esc(o.ucpUseCase || 'Segment orchestration')+adobeTag+'</div><div class="ci-opp-title">'+esc(o.title || '')+'</div><div class="ci-opp-body">'+esc(o.detail || '')+'</div>'+ciDateMetaOf(o.signal || o)+'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><div class="ci-opp-val">'+esc(o.value || '')+'</div><span class="ci-item-tag '+effortClass+'">'+esc(o.effort || 'Medium')+'</span><span class="ci-item-tag ci-tag-b">'+esc(o.owner || 'Digital/B2C')+'</span>'+dsTag+personaTag+'</div></div>';
  }).join('');

  var riskClass = 'ci-pill-risk-low';
  if(data.serviceRiskLevel === 'Critical' || data.serviceRiskLevel === 'High') riskClass = 'ci-pill-risk-high';
  else if(data.serviceRiskLevel === 'Medium') riskClass = 'ci-pill-risk-med';
  var decisionStrip = '<div class="ci-decision-strip">';
  if(data.identityConfidence) decisionStrip += '<span class="ci-pill ci-pill-id">Identity: '+esc(data.identityConfidence)+'</span>';
  if(data.tripIntentState) decisionStrip += '<span class="ci-pill ci-pill-intent">Intent: '+esc(data.tripIntentState)+'</span>';
  if(data.customerValuePotential){
    decisionStrip += '<span class="ci-pill ci-pill-value">Value: '+esc(data.customerValuePotential)+'</span>';
  }
  if(data.decisionReadiness){
    decisionStrip += '<span class="ci-pill ci-pill-readiness">Readiness: '+esc(data.decisionReadiness)+'</span>';
  }
  if(data.serviceRiskLevel){
    decisionStrip += '<span class="ci-pill '+riskClass+'">Service risk: '+esc(data.serviceRiskLevel)+(data.serviceRiskReason ? ' - '+esc(String(data.serviceRiskReason).slice(0, 48)) : '')+'</span>';
  }
  decisionStrip += '</div>';
  var confBreakHtml = (confBreakdown || []).map(function(row){
    var score = Number(row && row.score);
    var max = Number(row && row.max);
    var text = (Number.isFinite(score) && Number.isFinite(max) && max > 0) ? (score + '/' + max) : 'n/a';
    return '<span class="ci-conf-chip">'+esc((row && row.label) || 'Confidence')+': '+esc(text)+'</span>';
  }).join('');
  var confidencePanel = '<div class="ci-confidence '+confClass+'">'+
    '<div class="ci-conf-top">'+
      '<div class="ci-conf-score">Evidence confidence '+esc(confBand)+' ('+esc(confScore)+'/100)</div>'+
      '<div class="ci-conf-meta">'+esc(confSourceCount)+' sources • '+esc(confCorroborationCount)+' corroborated • '+esc(confFreshness)+'</div>'+
    '</div>'+
    '<div class="ci-conf-break">'+confBreakHtml+'</div>'+
    (confCaveat ? '<div class="ci-conf-caveat">'+esc(confCaveat)+'</div>' : '')+
  '</div>';

  var nbaH = '';
  if(data.nextBestAction && data.nextBestAction.action){
    nbaH = '<div class="ci-nba"><div class="ci-nba-eyebrow">Next-best action'+(data.nextBestAction.timeline ? ' - '+esc(data.nextBestAction.timeline) : '')+'</div><div class="ci-nba-title">'+esc(data.nextBestAction.action)+'</div><div class="ci-nba-meta">'+
      (data.nextBestAction.adobeProduct ? '<span>'+esc(data.nextBestAction.adobeProduct)+'</span>' : '')+
      (data.nextBestAction.owner ? '<span>Owner: '+esc(data.nextBestAction.owner)+'</span>' : '')+
      '</div></div>';
  }
  var planActionSummary = ciActionTitle(seg, data);
  var planOwner = (data.nextBestAction && data.nextBestAction.owner) ? data.nextBestAction.owner : 'Digital/B2C owner';
  var planTimeline = (data.nextBestAction && data.nextBestAction.timeline) ? data.nextBestAction.timeline : '30-day execution';
  var actionPlanBlock = '<div class="ci-plan">'+
    '<div class="ci-plan-h">Action plan</div>'+
    '<div class="ci-plan-t">'+esc(planActionSummary)+'</div>'+
    '<div class="ci-plan-meta"><span>Owner: '+esc(planOwner)+'</span><span>'+esc(planTimeline)+'</span></div>'+
    '<button type="button" class="ci-plan-btn" onclick="openCIActionPlan(\''+seg+'\')">Open 30-day action plan</button>'+
  '</div>';

  var externalRows = (data.externalSignals||[]).map(function(s){
    var glyph = s.direction === 'rising' ? '&#8593;' : s.direction === 'falling' ? '&#8595;' : '&#8212;';
    return '<div class="ci-item"><div class="ci-dot" style="background:var(--grn)"></div><div class="ci-item-b"><strong>'+esc(s.signal || '')+'</strong> <span style="font-size:10px;color:var(--t3)">'+glyph+'</span><div style="font-size:10px;color:var(--t3)">'+esc(s.source || '')+' - '+esc(s.implication || '')+'</div>'+ciDateMetaOf(s.signalData || s.signal || s)+'</div></div>';
  }).join('');
  var externalSection = externalRows ? '<div class="ci-external-wrap"><div class="ci-col-t" style="color:var(--grn)">External Signals</div>'+externalRows+'</div>' : '';

  var missionTags = (Array.isArray(data.tripMission) ? data.tripMission : []).map(function(m){
    return '<span class="ci-dim-pill ci-dim-mission">'+esc(m)+'</span>';
  }).join('');
  var partyTags = (Array.isArray(data.partyType) ? data.partyType : []).map(function(p){
    return '<span class="ci-dim-pill ci-dim-party">'+esc(p)+'</span>';
  }).join('');
  var riskTags = (Array.isArray(data.serviceRiskTags) ? data.serviceRiskTags : []).map(function(r){
    var tag = (r && r.tag) ? r.tag : '';
    var note = (r && r.note) ? r.note : '';
    return '<span class="ci-dim-pill ci-dim-risk" title="'+esc(note)+'">'+esc(tag)+'</span>';
  }).join('');
  var digitalBehaviourLabel = (data.digitalBehaviour && data.digitalBehaviour.channel) ? data.digitalBehaviour.channel : '';
  var digitalBehaviourNote = (data.digitalBehaviour && data.digitalBehaviour.note) ? data.digitalBehaviour.note : '';
  var customerValueReason = data.customerValueReason ? '<div class="ci-dim-note">'+esc(data.customerValueReason)+'</div>' : '';
  var readinessReason = data.decisionReadinessReason ? '<div class="ci-dim-note">'+esc(data.decisionReadinessReason)+'</div>' : '';
  var dimensionSection = '<div class="ci-dims">'+
    '<div class="ci-dim"><div class="ci-dim-t">Trip mission</div><div class="ci-dim-v">'+(missionTags || '<span class="ci-dim-empty">No data</span>')+'</div></div>'+
    '<div class="ci-dim"><div class="ci-dim-t">Party type</div><div class="ci-dim-v">'+(partyTags || '<span class="ci-dim-empty">No data</span>')+'</div></div>'+
    '<div class="ci-dim"><div class="ci-dim-t">Digital behaviour</div><div class="ci-dim-v">'+(digitalBehaviourLabel ? '<span class="ci-dim-pill ci-dim-digital">'+esc(digitalBehaviourLabel)+'</span>' : '<span class="ci-dim-empty">No data</span>')+'</div>'+(digitalBehaviourNote ? '<div class="ci-dim-note">'+esc(digitalBehaviourNote)+'</div>' : '')+'</div>'+
    '<div class="ci-dim"><div class="ci-dim-t">Service risk tags</div><div class="ci-dim-v">'+(riskTags || '<span class="ci-dim-empty">No data</span>')+'</div></div>'+
    '<div class="ci-dim"><div class="ci-dim-t">Customer value potential</div><div class="ci-dim-v">'+(data.customerValuePotential ? '<span class="ci-dim-pill ci-dim-value">'+esc(data.customerValuePotential)+'</span>' : '<span class="ci-dim-empty">No data</span>')+'</div>'+customerValueReason+'</div>'+
    '<div class="ci-dim"><div class="ci-dim-t">Decision readiness</div><div class="ci-dim-v">'+(data.decisionReadiness ? '<span class="ci-dim-pill ci-dim-readiness">'+esc(data.decisionReadiness)+'</span>' : '<span class="ci-dim-empty">No data</span>')+'</div>'+readinessReason+'</div>'+
  '</div>';

  var lensList = (Array.isArray(data.strategicLenses) && data.strategicLenses.length)
    ? data.strategicLenses
    : (CI_STRATEGIC_LENSES[seg] || []);
  var lensSection = '';
  if(lensList.length){
    lensSection = '<div class="ci-lens-wrap"><div class="ci-lens-title">Strategic segment lenses</div><div class="ci-lens-grid">'+
      lensList.slice(0, 3).map(function(l){
        var pr = (l.priority || 'Medium').toLowerCase();
        var prClass = pr === 'high' ? 'ci-lens-pr-high' : pr === 'low' ? 'ci-lens-pr-low' : 'ci-lens-pr-med';
        var lensAction = l.move || l.action || 'Define a focused play and owner.';
        return '<div class="ci-lens-card">'+
          '<div class="ci-lens-row"><div class="ci-lens-name">'+esc(l.name || 'Segment lens')+'</div><span class="ci-lens-pr '+prClass+'">'+esc(l.priority || 'Medium')+'</span></div>'+
          '<div class="ci-lens-why">'+esc(l.why || '')+'</div>'+
          '<div class="ci-lens-move">'+esc(lensAction)+'</div>'+
        '</div>';
      }).join('')+
      '</div></div>';
  }

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
      '<div class="ci-kpis">'+kpiH+'</div>'+
      decisionStrip+
      confidencePanel+
      nbaH+
      actionPlanBlock+
      dimensionSection+
      lensSection+
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
  syncCustomerIntelSegmentBadge();
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
    consumer: ['consumer', 'consumer_affairs', 'consumeraffairs'],
    appstore: ['appstore', 'app_store', 'apple_app_store', 'ios'],
    googleplay: ['googleplay', 'google_play', 'play_store', 'android']
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
    var meta = document.querySelector('.sent-tile[data-src="'+src+'"] .sent-freshness-meta');
    if(meta) meta.remove();
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
      consumer:/consumer affairs|consumeraffairs|pissedconsumer|airlinequality|formal complaint/i,
      appstore:/app store|apple|ios|iphone|booking flow|boarding pass|rating|review/i,
      googleplay:/google play|android|booking flow|boarding pass|rating|review/i
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
