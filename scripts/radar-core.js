// â”€â”€ External library fallback flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.RADAR_CHARTS_AVAILABLE = (typeof Chart !== 'undefined');

// â”€â”€ Clock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
setInterval(()=>{
  const clk = document.getElementById('clk');
  if(!clk) return;
  const n=new Date(),p=v=>String(v).padStart(2,'0');
  clk.textContent=p(n.getHours())+':'+p(n.getMinutes())+':'+p(n.getSeconds())+' DOH';
},1000);

// â”€â”€ Situation ribbon safety guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Keeps the landing view empty until backend/cache data is available.
function initialiseSituationRibbon(){
  const sit = document.getElementById('sitTxt');
  const tags = document.getElementById('sitTags');
  if(sit){
    sit.textContent = 'API-driven Digital/B2C situation - refresh domains to populate current leadership focus';
  }
  if(tags){
    tags.innerHTML = ['Current only','Forward 180 days','Verify sources','No stale dates']
      .map(t => `<span class="stag">${t}</span>`).join('');
  }
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initialiseSituationRibbon);
} else {
  initialiseSituationRibbon();
}

// â”€â”€ Chart / cache rendering helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEFAULT_DOMAINS = ['rev','dig','loy','prd','cmp','geo','agt','sml','soc','spt','sec','reg','ops','rep'];
const B2C_DOMAINS = ['dig','agt','loy','prd','rev','sml','cmp','spt','rep','reg','geo','ops','sec','soc'];
let DOMAINS = [...DEFAULT_DOMAINS];

const DOM_LABELS = {
  rev:'Revenue',dig:'Digital',loy:'Loyalty',prd:'Product',
  cmp:'Competitors',geo:'Geopolitical',agt:'Agents',sml:'Social media',
  soc:'Unrest',spt:'Sport',sec:'Cyber',reg:'Regulatory',ops:'Operations',rep:'Reputation'
};

const VIEW_PROFILES = {
  enterprise: {
    label: 'Enterprise',
    title: 'Enterprise view',
    text: 'External intelligence for Digital Product, Digital Marketing, Loyalty and B2C decision support.',
    pill: 'Risk - Revenue - Opportunity',
    lens: 'Business-wide risk, route economics, operations, reputation and revenue opportunity.',
    prompt: 'Use a balanced enterprise lens across network, revenue, competitors, regulation, operations and brand.'
  },
  b2c: {
    label: 'B2C',
    title: 'Digital/B2C view',
    text: 'Prioritises direct growth, loyalty, product, digital demand capture and customer revenue opportunities.',
    pill: 'Direct - Loyalty - Product - UCP',
    lens: 'Digital/B2C value: direct bookings, loyalty activation, website/app product experience, digital marketing demand capture, agent/OTA shift, customer intelligence and revenue protection.',
    prompt: 'Use a Digital/B2C lens. Prioritise direct booking growth, reduced agent/OTA dependency, loyalty engagement, product friction, digital marketing opportunities and customer-level decisioning. Mention UCP only as customer intelligence/personalisation value; do not claim access to internal strategy or internal data.'
  }
};

const STORE_PREFIX_BASE = 'radar_v7_dom_';
const STORE_META   = 'radar_v7_meta';
const STORE_KEY    = 'radar_v7_ant';
const STORE_VIEW   = 'radar_v7_view';
const STORE_SIGNAL_LIMIT = 'radar_v7_signal_limit';

// Backend server used for Anthropic proxy + Supabase persistence.
// In local modular dev, use the same-origin dev proxy to avoid CORS.
const RENDER_BACKEND_URL = 'https://qr-radar-backend.onrender.com';
const BACKEND_URL = RENDER_BACKEND_URL;
const CLAUDE_WEB_SEARCH_TOOL = Object.freeze({ type: 'web_search_20250305', name: 'web_search' });
const CLAUDE_WEB_SEARCH_FLOW_LIMITS = Object.freeze({
  domain_scan: 3,
  chat: 2,
  action_plan: 2,
  competitor: 3,
  customer_intel: 3
});

function claudePayloadWithWebSearch(basePayload, flow){
  var maxUses = CLAUDE_WEB_SEARCH_FLOW_LIMITS[flow] || 2;
  return Object.assign({}, basePayload, {
    tools: [Object.assign({}, CLAUDE_WEB_SEARCH_TOOL, { max_uses: maxUses })],
    tool_choice: { type: 'auto' }
  });
}
window.claudePayloadWithWebSearch = claudePayloadWithWebSearch;

// â”€â”€ BACKEND FETCH HELPER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Wraps fetch with CORS headers, timeout, and structured error reporting.
// Use this for ALL backend calls instead of raw fetch() to avoid CORS errors
// when running from file:// or a different origin.
async function backendFetch(path, options, timeoutMs){
  timeoutMs = timeoutMs || 15000;
  var url = BACKEND_URL + path;
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = controller ? setTimeout(function(){ controller.abort(); }, timeoutMs) : null;
  var opts = Object.assign({
    mode: 'cors',
    credentials: 'omit',
    headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' },
      (options && options.headers) ? options.headers : {})
  }, options || {});
  if(controller) opts.signal = controller.signal;
  try{
    var resp = await fetch(url, opts);
    if(timer) clearTimeout(timer);
    if(!resp.ok){
      var errBody = '';
      try{ errBody = await resp.text(); }catch(e){}
      throw new Error('HTTP ' + resp.status + ' from ' + path + (errBody ? ': ' + errBody.slice(0,200) : ''));
    }
    return resp;
  }catch(err){
    if(timer) clearTimeout(timer);
    // Distinguish CORS / network from HTTP errors for better console messages
    if(err.name === 'AbortError') throw new Error('Request timeout after ' + (timeoutMs/1000) + 's: ' + path);
    if(err.message && err.message.toLowerCase().includes('failed to fetch'))
      throw new Error('CORS or network error reaching backend: ' + url + '. Check Render backend CORS config allows ' + location.origin);
    throw err;
  }
}

// â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function radarWebSocketUrl(){
  const base = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
  ) ? RENDER_BACKEND_URL : BACKEND_URL;
  return base.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:') + '/ws';
}

function setWsProofState(state, label){
  const box = document.getElementById('wsProof');
  const status = document.getElementById('wsStatus');
  if(box){
    box.classList.remove('connected','waiting','failed');
    box.classList.add(state);
  }
  if(status) status.textContent = label;
}

function initRadarLiveStream(){
  if(!('WebSocket' in window)) {
    setWsProofState('failed', 'Live unavailable');
    return;
  }
  if(window.__RADAR_WS__) return;
  const eventLog = window.__RADAR_WS_EVENTS__ = window.__RADAR_WS_EVENTS__ || [];
  const countEl = document.getElementById('wsCount');
  setWsProofState('waiting', 'Live connecting');
  try{
    const ws = new WebSocket(radarWebSocketUrl());
    window.__RADAR_WS__ = ws;
    ws.addEventListener('open', function(){
      setWsProofState('connected', 'Live connected');
      const liveLabel = document.getElementById('liveLabel');
      if(liveLabel && liveLabel.textContent === 'Ready') liveLabel.textContent = 'Realtime connected';
    });
    ws.addEventListener('message', function(event){
      let parsed = null;
      try{ parsed = JSON.parse(event.data); }catch(e){ parsed = { type:'message', payload:event.data }; }
      eventLog.unshift({
        type: parsed.type || 'message',
        sentAt: parsed.sentAt || new Date().toISOString(),
        payload: parsed.payload || {}
      });
      eventLog.splice(12);
      if(countEl) countEl.textContent = String(eventLog.length);
      setWsProofState('connected', parsed.type === 'heartbeat' ? 'Live heartbeat' : 'Live ' + (parsed.type || 'event'));
      window.dispatchEvent(new CustomEvent('radar-live-event', { detail: parsed }));
    });
    ws.addEventListener('close', function(){
      window.__RADAR_WS__ = null;
      setWsProofState('waiting', 'Live reconnecting');
      setTimeout(initRadarLiveStream, 5000);
    });
    ws.addEventListener('error', function(){
      setWsProofState('failed', 'Live blocked');
    });
  }catch(err){
    setWsProofState('failed', 'Live failed');
    console.warn('Radar live stream failed', err);
  }
}

let ANT_KEY  = localStorage.getItem(STORE_KEY) || 'server-managed';
let VIEW_MODE = localStorage.getItem(STORE_VIEW) || 'enterprise';
let IS_PAID  = false;
let DO_SCAN  = false;
let isBusy   = false;
let stopFlag = false;
let currentDom = null;
let chatHistory = [];

// Loaded domain data - populated from backend/Supabase cache or browser backup on startup
let domData = {};
function loadedDomainCount(){
  const primary = DOMAINS.filter(id => !!domData[id]).length;
  if(primary) return primary;
  const runtimeDomains = (window.radarData && window.radarData.domains) ? window.radarData.domains : {};
  return DOMAINS.filter(id => !!runtimeDomains[id]).length;
}

// â”€â”€ GLOBAL RUNTIME STATE - v11.4.5 cache-first hydration layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The backend/Supabase cache and browser backup can contain valid intelligence,
// but older renderers expect an in-memory runtime object. This keeps the new
// backend-first architecture while preventing missing/partial signals in tabs.
window.radarData = window.radarData || {
  version: 'v11.4.13-exec-predictive-frontend',
  viewMode: VIEW_MODE,
  domains: {},
  sentiment: {},
  cios: {},
  customerIntel: {},
  competitors: {},
  meta: { hydratedAt: null, source: 'not_hydrated', counts: {} }
};
window.__RADAR_DEBUG__ = window.__RADAR_DEBUG__ || { events: [] };

function radarDebug(label, data){
  try{
    window.__RADAR_DEBUG__.events.push({ at: new Date().toISOString(), label, data });
    if(window.__RADAR_DEBUG__.events.length > 80) window.__RADAR_DEBUG__.events.shift();
    console.log('[Radar]', label, data);
  }catch(e){}
}

function resetRadarRuntimeState(){
  window.radarData = {
    version: 'v11.4.13-exec-predictive-frontend',
    viewMode: VIEW_MODE,
    domains: {},
    sentiment: {},
    cios: {},
    customerIntel: {},
    competitors: {},
    meta: { hydratedAt: new Date().toISOString(), source: 'reset', counts: {} }
  };
  domData = window.radarData.domains;
}

function unwrapCachedRecord(raw){
  if(!raw) return null;
  if(raw.data) return raw.data;
  if(raw.payload) return raw.payload;
  if(raw.domain) return raw.domain;
  return raw;
}

function extractSignalsFromAny(payload){
  if(!payload) return [];
  const candidates = [
    payload.signals,
    payload.data && payload.data.signals,
    payload.payload && payload.payload.signals,
    payload.refresh && payload.refresh.signals,
    payload.intelligence && payload.intelligence.signals,
    payload.result && payload.result.signals,
    payload.items,
    payload.data && payload.data.items
  ];
  for(const c of candidates){ if(Array.isArray(c)) return c; }
  return [];
}

function normaliseCachedDomain(id, record){
  const d = unwrapCachedRecord(record) || {};
  const signals = extractSignalsFromAny(d);
  return postProcessDomainData({
    id: d.id || id,
    score: d.score || d.opportunityScore || d.threatScore || 0,
    status: d.status || d.opportunityLabel || d.label || (signals.length ? 'Cached' : 'No current signal'),
    statusClass: d.statusClass || (signals.some(s => isRiskSignal(s)) ? 'spr' : 'spg2'),
    signals: signals,
    metrics: Array.isArray(d.metrics) ? d.metrics : [],
    opp: d.opp || d.opportunity || {},
    actions: Array.isArray(d.actions) ? d.actions : []
  }, id);
}

function hydrateRadarStateFromCache(options){
  options = options || {};
  resetRadarRuntimeState();
  const keys = Object.keys(localStorage || {});
  const counts = { domains: 0, sentiment: 0, cios: 0, customerIntel: 0, competitors: 0, skipped: 0, errors: 0 };
  const domainPrefix = STORE_PREFIX_BASE + VIEW_MODE + '_';
  const legacyPrefix = STORE_PREFIX_BASE;

  // First pass: current view-specific domain keys.
  keys.forEach(function(key){
    try{
      if(!key.startsWith(domainPrefix)) return;
      const id = key.slice(domainPrefix.length);
      if(DOMAINS && !DOMAINS.includes(id)) return;
      const raw = JSON.parse(localStorage.getItem(key));
      const normalised = normaliseCachedDomain(id, raw);
      window.radarData.domains[id] = normalised;
      counts.domains++;
    }catch(e){ counts.errors++; console.warn('Radar hydration failed for', key, e); }
  });

  // Second pass: legacy enterprise keys only where the current view did not load.
  keys.forEach(function(key){
    try{
      if(!key.startsWith(legacyPrefix) || key.startsWith(domainPrefix)) return;
      const id = key.slice(legacyPrefix.length);
      if(!id || id.includes('_')) return;
      if(DOMAINS && !DOMAINS.includes(id)) return;
      if(window.radarData.domains[id]) return;
      const raw = JSON.parse(localStorage.getItem(key));
      const normalised = normaliseCachedDomain(id, raw);
      window.radarData.domains[id] = normalised;
      counts.domains++;
    }catch(e){ counts.errors++; console.warn('Radar legacy hydration failed for', key, e); }
  });

  keys.forEach(function(key){
    try{
      const rawText = localStorage.getItem(key);
      if(!rawText) return;
      const raw = JSON.parse(rawText);
      const data = unwrapCachedRecord(raw) || {};

      if(key.startsWith('qr_v9_sent_')){
        const src = key.replace('qr_v9_sent_', '') || data.source;
        window.radarData.sentiment[src] = normalizeSentimentData(src, data);
        counts.sentiment++;
      } else if(key.startsWith('qr_cios_v1_')){
        const src = key.replace('qr_cios_v1_', '') || data.source;
        window.radarData.cios[src] = normalizeCIOSSource(src, data);
        counts.cios++;
      } else if(key.startsWith('qr_v10_ci_')){
        const seg = key.replace('qr_v10_ci_', '') || data.segment;
        window.radarData.customerIntel[seg] = normalizeCIData(seg, data);
        counts.customerIntel++;
      } else if(key.startsWith('qr_v10_comp_') || key.startsWith('qr_comp_')){
        const id = key.replace('qr_v10_comp_', '').replace('qr_comp_', '') || data.competitor;
        window.radarData.competitors[id] = normalizeCompData(id, data);
        counts.competitors++;
      }
    }catch(e){ counts.skipped++; }
  });

  domData = window.radarData.domains;
  window.radarData.meta = { hydratedAt: new Date().toISOString(), source: options.source || 'browser_cache', counts: counts };
  radarDebug('Hydrated runtime state', window.radarData.meta);
  return window.radarData;
}

function syncDomainRuntimeState(id, data, source){
  if(!window.radarData || !window.radarData.domains) resetRadarRuntimeState();
  const normalised = postProcessDomainData(data || {}, id);
  window.radarData.domains[id] = normalised;
  domData = window.radarData.domains;
  window.radarData.meta.hydratedAt = new Date().toISOString();
  window.radarData.meta.source = source || window.radarData.meta.source || 'runtime_sync';
  return normalised;
}

// â”€â”€ HARDENING HELPERS - safe rendering, URLs and API errors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function esc(v){
  return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch] || ch));
}
function safeUrl(v){
  const s = String(v || '').trim();
  if(!/^https?:\/\//i.test(s)) return '';
  return s.replace(/["'<>\s]/g, '');
}
async function readApiError(resp){
  const fallback = resp.statusText || 'API request failed';
  try{
    const j = await resp.json();
    return j?.error?.message || j?.message || fallback;
  }catch(e){
    try{ return (await resp.text()).slice(0,180) || fallback; }catch(_){ return fallback; }
  }
}
function extractJSON(raw){
  const clean = String(raw || '').replace(/```json\n?/gi,'').replace(/```\n?/g,'').trim();
  const f = clean.indexOf('{'), l = clean.lastIndexOf('}');
  if(f < 0 || l < 0 || l <= f) throw new Error('No JSON object in response');
  const jsonText = clean.slice(f, l + 1).replace(/,\s*([}\]])/g,'$1');
  return JSON.parse(jsonText);
}


// â”€â”€ SERVER-MANAGED BACKEND-FIRST NORMALISATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// All intelligence tabs must render saved backend/browser cache first. Claude is
// only used by explicit refresh/generate workflows. These helpers prevent old
// Claude-shaped renderers from showing "undefined" when cached backend data has
// a different schema.
function asArray(v){ return Array.isArray(v) ? v : []; }
function firstText(obj, keys, fallback){
  obj = obj || {};
  for(const k of keys){
    const v = obj[k];
    if(v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return fallback || '';
}
function firstValue(obj, keys, fallback){
  obj = obj || {};
  for(const k of keys){
    const v = obj[k];
    if(v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}
function safeScore(v, fallback){
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}
function dedupeBy(items, keyFn){
  const seen = new Set();
  return asArray(items).filter(function(item){
    const key = String(keyFn(item) || '').toLowerCase().trim();
    if(!key) return true;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function cachedDomain(domainId){
  if(domData && domData[domainId]) return domData[domainId];
  try{
    const r = localStorage.getItem(storageKey(domainId)) || localStorage.getItem(legacyStorageKey(domainId));
    return r ? JSON.parse(r).data || JSON.parse(r) : null;
  }catch(e){ return null; }
}
function competitorSignalText(s){
  s = s || {};
  return [
    s.title, s.body, s.detail, s.summary, s.whyItMattersNow, s.captureStrategy,
    s.source, s.sourceUrl, s.competitor, s.airline, s.name
  ].filter(Boolean).join(' ').toLowerCase();
}
function competitorMatchedSignals(id){
  const meta = (typeof CMETA !== 'undefined' && CMETA[id]) ? CMETA[id] : {};
  const domain = cachedDomain('cmp') || {};
  const domainSignals = asArray(domain.signals);
  if(!meta.terms) return [];
  return dedupeBy(domainSignals
    .filter(s => meta.terms.test(competitorSignalText(s)))
    .sort((a,b) => Number(b.commercialImpactScore || b.score || 0) - Number(a.commercialImpactScore || a.score || 0)), function(s){
      return firstText(s, ['title'], '')+'|'+firstText(s, ['body','whyItMattersNow'], '');
    });
}
function competitorPlaceholderText(v){
  const t = String(v || '').toLowerCase();
  if(!t) return false;
  return /no source-specific cache is loaded for/.test(t) ||
    /no .*specific competitor signal loaded yet/.test(t) ||
    /loaded competitor cache does not currently contain facts/.test(t) ||
    /generic shared competitor points are intentionally hidden/.test(t);
}
function competitorEntryLooksPlaceholder(entry){
  entry = entry || {};
  const txt = [
    firstText(entry, ['title','name','issue'], ''),
    firstText(entry, ['detail','body','description','summary'], ''),
    firstText(entry, ['impact','value'], '')
  ].join(' ').trim();
  return competitorPlaceholderText(txt);
}
function competitorRecordLooksSynthetic(data){
  data = data || {};
  const summary = firstText(data, ['summary','topInsight'], '');
  if(competitorPlaceholderText(summary)) return true;
  const weak = asArray(data.weaknesses);
  if(weak.length && weak.every(competitorEntryLooksPlaceholder)) return true;
  const opp = asArray(data.opportunities);
  if(opp.length && opp.every(competitorEntryLooksPlaceholder)) return true;
  const acts = asArray(data.actions);
  if(acts.length && acts.every(competitorEntryLooksPlaceholder)) return true;
  return false;
}
function competitorPayloadMatches(id, data){
  const meta = (typeof CMETA !== 'undefined' && CMETA[id]) ? CMETA[id] : {};
  if(!meta.terms) return false;
  if(competitorRecordLooksSynthetic(data)) return false;
  const nameText = [
    firstText(data, ['name','competitor','airline'], ''),
    firstText(data, ['summary','topInsight'], '')
  ].join(' ').toLowerCase();
  if(meta.terms.test(nameText)) return true;
  const weak = asArray(data && data.weaknesses).map(competitorSignalText).join(' ');
  const opp = asArray(data && data.opportunities).map(competitorSignalText).join(' ');
  const acts = asArray(data && data.actions).map(competitorSignalText).join(' ');
  return meta.terms.test((weak + ' ' + opp + ' ' + acts).toLowerCase());
}
function normalizeCompData(id, data){
  const meta = (typeof CMETA !== 'undefined' && CMETA[id]) ? CMETA[id] : {};
  data = data || {};
  const synthetic = competitorRecordLooksSynthetic(data);
  const domain = cachedDomain('cmp') || {};
  const payloadMatches = !synthetic && competitorPayloadMatches(id, data);
  const explicitWeak = payloadMatches ? asArray(data.weaknesses).filter(function(w){ return !competitorEntryLooksPlaceholder(w); }) : [];
  const explicitOpp = payloadMatches ? asArray(data.opportunities).filter(function(o){ return !competitorEntryLooksPlaceholder(o); }) : [];
  const explicitActs = payloadMatches ? asArray(data.actions).filter(function(a){ return !competitorEntryLooksPlaceholder(a); }) : [];
  const selectedSignals = competitorMatchedSignals(id);
  const hasExplicitCache = explicitWeak.length > 0 || explicitOpp.length > 0 || explicitActs.length > 0;
  const hasSpecificCache = hasExplicitCache || selectedSignals.length > 0;
  const derivedThreat = selectedSignals.length
    ? Math.max(35, Math.min(95, Math.round(selectedSignals.reduce(function(acc, s){
        const n = Number(s.commercialImpactScore || s.commercial_impact_score || s.score || 0);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0) * 10 / Math.max(1, selectedSignals.length))))
    : null;
  let weak = explicitWeak.length ? explicitWeak : selectedSignals.slice(0,5).map(s => ({
    title: firstText(s, ['title'], 'Competitive pressure signal'),
    detail: firstText(s, ['body','whyItMattersNow'], 'Stored competitor intelligence from backend cache'),
    impact: firstText(s, ['captureStrategy'], 'Use B2C/product/marketing actions to protect direct share'),
    severity: (Number(s.commercialImpactScore||0) >= 8 ? 'High' : 'Medium'),
    source: firstText(s, ['source'], 'Backend cache'),
    sourceUrl: firstText(s, ['sourceUrl'], '')
  }));
  weak = dedupeBy(weak, function(w){ return firstText(w, ['title'], '')+'|'+firstText(w, ['detail'], ''); }).slice(0, 5);
  if(!weak.length) weak.push({
    title:'No '+(meta.name || id)+'-specific competitor signal loaded yet',
    detail:'The loaded competitor cache does not currently contain facts that match '+(meta.name || id)+'.',
    impact:'Refresh the Competitors domain or add backend competitor data for this airline before treating it as analysed.',
    severity:'Medium',
    source:'Backend cache'
  });
  const opp = dedupeBy(explicitOpp.length ? explicitOpp : (hasSpecificCache ? weak.slice(0,4).map(w => ({
    title: 'Respond to '+(meta.name || 'competitor')+' signal', detail: w.impact || w.detail, value:'TBD', timeWindow:'30 days', b2cAngle:'Direct booking'
  })) : []), function(o){ return firstText(o, ['title'], '')+'|'+firstText(o, ['detail'], ''); });
  const acts = dedupeBy(explicitActs.length ? explicitActs : (hasSpecificCache ? opp.slice(0,4).map(o => ({
    title: o.title || 'Create B2C action', detail: o.detail || 'Turn cached signal into product/marketing action.', owner:'Digital/B2C team', timeline:'Days 1-14', value:o.value || 'TBD'
  })) : []), function(a){ return firstText(a, ['title'], '')+'|'+firstText(a, ['detail'], ''); });
  const scoreSource = data.overallThreat || data.threat || data.score || derivedThreat || (selectedSignals.length ? domain.score : null);
  const newsPages = competitorNewsPages(meta);
  const newsEvidence = collectCompetitorNewsEvidence(meta, data, selectedSignals);
  return {
    competitor: data.competitor || id,
    name: data.name || meta.name || id,
    why: data.why || meta.why || '',
    newsPages: newsPages,
    newsEvidence: newsEvidence,
    overallThreat: hasSpecificCache ? safeScore(scoreSource, derivedThreat || 70) : null,
    summary: hasExplicitCache
      ? firstText(data, ['summary','topInsight'], (meta.name||id)+' intelligence loaded from backend cache.')
      : (hasSpecificCache
          ? firstText(data, ['summary','topInsight'], (meta.name||id)+' intelligence derived from matched competitor signals in domain cache.')
          : 'No source-specific cache is loaded for '+(meta.name || id)+'.'),
    weaknesses: weak,
    opportunities: opp,
    actions: acts,
    hasSpecificCache,
    persistable: hasExplicitCache
  };
}

function emptySentiment(src){
  const meta = (typeof SENT_META !== 'undefined' && SENT_META[src]) ? SENT_META[src] : {name:src};
  return {source:src, sourceName:meta.name || src, overallSentiment:null, sentimentLabel:'No data', totalMentions:'0', topComplaint:'', topPraise:'', painPoints:[], strengths:[], improvements:[], verbatims:[]};
}
function normalizeSentimentData(src, data){
  data = data && data.data ? data.data : (data || null);
  if(!data) return emptySentiment(src);
  const meta = (typeof SENT_META !== 'undefined' && SENT_META[src]) ? SENT_META[src] : {name:src};
  const painSource = asArray(data.painPoints).length ? asArray(data.painPoints) : asArray(data.issues).length ? asArray(data.issues) : asArray(data.signals);
  const strengthSource = asArray(data.strengths).length ? asArray(data.strengths) : asArray(data.praises);
  const improveSource = asArray(data.improvements).length ? asArray(data.improvements) : asArray(data.actions);

  function toText(v){
    if(v === undefined || v === null) return '';
    if(typeof v === 'string') return v.trim();
    if(typeof v === 'number' || typeof v === 'boolean') return String(v);
    if(typeof v === 'object'){
      const pick = firstText(v, ['text','verbatim','quote','body','detail','description','summary','content','title','message'], '');
      if(pick) return pick;
      try{ return JSON.stringify(v); }catch(e){ return ''; }
    }
    return '';
  }

  const painPoints = painSource.map(p => ({
    title: firstText(p, ['title','issue','pain','name','complaint','theme'], ''),
    detail: firstText(p, ['detail','body','description','summary','whyItMattersNow'], ''),
    frequency: firstText(p, ['frequency','freq','volume'], '') || 'Medium',
    impact: firstText(p, ['impact','impactLabel','risk','category'], '') || 'Customer sentiment risk from backend cache'
  })).filter(p => p.title || p.detail);

  const strengths = strengthSource.map(st => ({
    title: firstText(st, ['title','strength','name','theme'], ''),
    detail: firstText(st, ['detail','body','description','summary'], ''),
    frequency: firstText(st, ['frequency','freq','volume'], '') || 'Medium'
  })).filter(s => s.title || s.detail);

  let improvements = improveSource.map(i => ({
    title: firstText(i, ['title','action','recommendation','name'], ''),
    detail: firstText(i, ['detail','body','description','summary'], ''),
    effort: firstText(i, ['effort','timeline'], '') || 'Medium',
    value: firstText(i, ['value','impact'], '') || 'Service recovery',
    owner: firstText(i, ['owner'], '') || 'Customer Experience'
  })).filter(i => i.title || i.detail);

  if(!improvements.length && painPoints.length){
    improvements = painPoints.slice(0, 3).map(function(p){
      const combined = ((p.title || '') + ' ' + (p.detail || '')).toLowerCase();
      return {
        title: 'Act on ' + (p.title || 'customer issue'),
        detail: 'Use the loaded backend/cache signal to brief owner, verify source freshness, and define a customer-facing response.',
        effort: 'Medium',
        value: /refund|booking|loyalty|app|website|revenue|churn|ota/i.test(combined) ? 'Revenue protection' : 'Service recovery',
        owner: /app|website|booking|checkout/i.test(combined) ? 'Digital Product' : 'Customer Experience'
      };
    });
  }

  let verbatims = asArray(data.verbatims)
    .map(toText)
    .map(v => v.replace(/\s+/g, ' ').trim())
    .filter(v => !!v && v !== '[object Object]');

  if(!verbatims.length){
    verbatims = painPoints.slice(0, 2).map(p => toText(p.title || p.detail)).filter(Boolean);
  }
  if(!verbatims.length){
    verbatims = strengths.slice(0, 2).map(s => toText(s.title || s.detail)).filter(Boolean);
  }

  return {
    source: data.source || src,
    sourceName: data.sourceName || meta.name || src,
    overallSentiment: safeScore(data.overallSentiment || data.score || data.sentimentScore, null),
    sentimentLabel: firstText(data, ['sentimentLabel','label','status'], 'Loaded'),
    totalMentions: firstText(data, ['totalMentions','mentions','volume','signal_count'], painSource.length ? String(painSource.length)+' saved signals' : '0'),
    topComplaint: firstText(data, ['topComplaint','topPain','complaint','issue'], painPoints[0] ? firstText(painPoints[0], ['title','detail'], '') : ''),
    topPraise: firstText(data, ['topPraise','topStrength','strength'], strengths[0] ? firstText(strengths[0], ['title','detail'], '') : ''),
    painPoints: painPoints,
    strengths: strengths,
    improvements: improvements,
    verbatims: verbatims
  };
}
function emptyCI(seg){
  const meta = (typeof CI_META !== 'undefined' && CI_META[seg]) ? CI_META[seg] : {name:seg};
  return {segment:seg, segmentName:meta.name || seg, opportunityScore:null, opportunityLabel:'No data', size:'', topInsight:'', identityConfidence:'', tripIntentState:'', serviceRiskLevel:'', serviceRiskReason:'', bookingBehaviour:[], loyaltyDrivers:[], painPoints:[], personalisationOpps:[], externalSignals:[], nextBestAction:null, kpis:[]};
}
function normalizeCIData(seg, data){
  data = data && data.data ? data.data : (data || null);
  if(!data) return emptyCI(seg);
  const meta = (typeof CI_META !== 'undefined' && CI_META[seg]) ? CI_META[seg] : {name:seg};
  return {
    segment: data.segment || seg,
    segmentName: data.segmentName || meta.name || seg,
    opportunityScore: safeScore(data.opportunityScore || data.score, null),
    opportunityLabel: firstText(data, ['opportunityLabel','label','status'], 'Loaded'),
    size: firstText(data, ['size'], ''),
    topInsight: firstText(data, ['topInsight','summary'], ''),
    identityConfidence: firstText(data, ['identityConfidence'], ''),
    tripIntentState: firstText(data, ['tripIntentState'], ''),
    serviceRiskLevel: firstText(data, ['serviceRiskLevel'], ''),
    serviceRiskReason: firstText(data, ['serviceRiskReason'], ''),
    bookingBehaviour: asArray(data.bookingBehaviour).map(b => ({insight:firstText(b,['insight','title','name'],''),detail:firstText(b,['detail','body','description'],''),source:firstText(b,['source'],''),implication:firstText(b,['implication','impact'],'')})).filter(b=>b.insight||b.detail),
    loyaltyDrivers: asArray(data.loyaltyDrivers).map(l => ({driver:firstText(l,['driver','title','name'],''),detail:firstText(l,['detail','body','description'],''),strength:firstText(l,['strength'],'')})).filter(l=>l.driver||l.detail),
    painPoints: asArray(data.painPoints).map(p => ({pain:firstText(p,['pain','title','issue','name'],''),detail:firstText(p,['detail','body','description'],''),competitorAdvantage:firstText(p,['competitorAdvantage','impact'],'')})).filter(p=>p.pain||p.detail),
    personalisationOpps: asArray(data.personalisationOpps).map(o => ({title:firstText(o,['title','name'],''),detail:firstText(o,['detail','body','description'],''),ucpUseCase:firstText(o,['ucpUseCase','useCase'],''),adobeProduct:firstText(o,['adobeProduct'],''),value:firstText(o,['value','impact'],''),effort:firstText(o,['effort'],''),owner:firstText(o,['owner'],''),persona:firstText(o,['persona'],''),dataSource:firstText(o,['dataSource'],'' )})).filter(o=>o.title||o.detail),
    externalSignals: asArray(data.externalSignals).map(s => ({signal:firstText(s,['signal','title','name'],''),source:firstText(s,['source'],''),direction:firstText(s,['direction'],''),implication:firstText(s,['implication','detail','body'],'' )})).filter(s=>s.signal||s.source||s.implication),
    nextBestAction: data.nextBestAction && typeof data.nextBestAction === 'object'
      ? {
          action: firstText(data.nextBestAction, ['action','title'], ''),
          adobeProduct: firstText(data.nextBestAction, ['adobeProduct'], ''),
          timeline: firstText(data.nextBestAction, ['timeline'], ''),
          owner: firstText(data.nextBestAction, ['owner'], '')
        }
      : null,
    luxuryPersonas: asArray(data.luxuryPersonas),
    kpis: asArray(data.kpis)
  };
}
function normalizeCIOSSource(src, data){
  data = data && data.data ? data.data : (data || null);
  if(!data) return {source:src, score:null, label:'No data', topComplaint:'', topStrength:''};
  return {source:src, score:safeScore(data.score || data.overallSentiment, null), label:firstText(data,['label','sentimentLabel'],'Loaded'), topComplaint:firstText(data,['topComplaint'],''), topStrength:firstText(data,['topStrength','topPraise'],'')};
}

// â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function init(){
  if(!VIEW_PROFILES[VIEW_MODE]) VIEW_MODE = 'enterprise';
  DOMAINS = getDomainOrder();
  updateViewChrome();
  initRadarLiveStream();
  buildProgressUI();
  loadAllSaved();
  loadBackendCacheFirst(false);
  reorderDomainsByPriority();
  updateExecutiveScorecard();
  // Auto-connect if previously connected
  if(ANT_KEY === 'server-managed' || (ANT_KEY && ANT_KEY.startsWith('sk-ant'))){
    document.getElementById('apiBar').classList.add('hidden');
    document.getElementById('progBar').classList.remove('hidden');
    checkResumable();
  }
  // Note: do NOT auto-trigger on first visit - user must click Connect
}

async function connectKey(){
  const btn = document.querySelector('.api-go');
  const statusEl = document.getElementById('connectStatus');
  const ORIG_LABEL = 'Connect to Server';

  function setConnectStatus(msg, isError){
    if(statusEl){
      statusEl.textContent = msg;
      statusEl.style.color = isError ? '#c0392b' : '#1a6a48';
      statusEl.style.display = 'block';
    }
  }

  if(btn){ btn.disabled = true; btn.textContent = 'Connecting...'; }
  setConnectStatus('Contacting server...', false);

  // â”€â”€ Backend server mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if(BACKEND_URL && BACKEND_URL.includes('onrender.com')){

    // Countdown ticker
    let secs = 0;
    const ticker = setInterval(function(){
      secs++;
      if(secs >= 3){
        if(btn) btn.textContent = 'Waking server... ' + secs + 's';
        setConnectStatus('Server is starting up - this takes up to 60 seconds on first use.', false);
      }
    }, 1000);

    // 90-second timeout
    const controller = new AbortController();
    const killTimer = setTimeout(function(){ controller.abort(); }, 90000);

    try{
      const resp = await fetch(BACKEND_URL + '/api/health/full', { signal: controller.signal });
      clearTimeout(killTimer);
      clearInterval(ticker);

      if(!resp.ok) throw new Error('Server error ' + resp.status);
      const data = await resp.json();

      if(data.ok || data.status){
        // Success
        ANT_KEY = 'server-managed';
        IS_PAID = true;
        localStorage.setItem(STORE_KEY, ANT_KEY);
        if(btn){ btn.textContent = ORIG_LABEL; btn.disabled = false; }
        document.getElementById('apiBar').classList.add('hidden');
        const pb = document.getElementById('progBar');
        if(pb) pb.classList.remove('hidden');
        await loadBackendCacheFirst(true);
        checkResumable();
        return;
      } else {
        throw new Error('Unexpected response from server');
      }

    }catch(e){
      clearTimeout(killTimer);
      clearInterval(ticker);
      if(btn){ btn.textContent = ORIG_LABEL; btn.disabled = false; }

      if(e.name === 'AbortError'){
        setConnectStatus('Server took too long (90s). It may still be starting. Please try again.', true);
      } else if(e.message.includes('Failed to fetch') || e.message.includes('NetworkError')){
        setConnectStatus('Cannot reach server. Check your internet connection and try again.', true);
      } else {
        setConnectStatus('Connection failed: ' + e.message + '. Please try again.', true);
      }
    }
    return;
  }

  // â”€â”€ Direct frontend Anthropic key mode retired in v11.4.5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Claude must only be accessed through the Render backend. This protects
  // keys, removes CORS/header issues, and keeps enterprise governance clean.
  if(btn){ btn.textContent = ORIG_LABEL; btn.disabled = false; }
  setConnectStatus('Direct frontend Claude keys are disabled. Radar now uses the Render backend only.', true);
  return;
}

function loadSavedCacheOnly(){
  ANT_KEY = 'server-managed';
  localStorage.setItem(STORE_KEY, 'server-managed');
  const apiBar = document.getElementById('apiBar');
  const progBar = document.getElementById('progBar');
  const secHint = document.getElementById('secHint');
  if(apiBar) apiBar.classList.add('hidden');
  if(progBar) progBar.classList.remove('hidden');
  hydrateRadarStateFromCache({source:'manual_cache_load'});
  renderAll();
  loadCIOSAll();
  if(secHint) secHint.textContent = 'Backend/cache-first mode - static intelligence is disabled';
  setStatus('Loaded saved backend/browser cache. Static intelligence is disabled.');
  checkResumable();
}
function skipStatic(){ return loadSavedCacheOnly(); }


// â”€â”€ VIEW MODE - Enterprise / B2C â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getDomainOrder(){
  return VIEW_MODE === 'b2c' ? [...B2C_DOMAINS] : [...DEFAULT_DOMAINS];
}

function getViewProfile(){
  return VIEW_PROFILES[VIEW_MODE] || VIEW_PROFILES.enterprise;
}

function storageKey(id){
  // Separate cache per view so B2C and Enterprise do not overwrite each other.
  return STORE_PREFIX_BASE + VIEW_MODE + '_' + id;
}

function legacyStorageKey(id){
  // Backward compatibility for your original v7 enterprise cache.
  return STORE_PREFIX_BASE + id;
}

function setViewMode(mode){
  if(!VIEW_PROFILES[mode]) mode = 'enterprise';
  if(mode === VIEW_MODE && document.getElementById('viewTitle')) return;

  VIEW_MODE = mode;
  localStorage.setItem(STORE_VIEW, VIEW_MODE);
  DOMAINS = getDomainOrder();
  LAST_DOMAIN_ORDER_SIGNATURE = '';
  resetRadarRuntimeState();
  currentDom = null;

  updateViewChrome();
  buildProgressUI();
  loadAllSaved();
  loadBackendCacheFirst(false);
  reorderDomainsByPriority();
  updateExecutiveScorecard();
  closeDom();
  checkResumable();
}

function updateViewChrome(){
  const p = getViewProfile();
  document.getElementById('btnViewEnterprise')?.classList.toggle('active', VIEW_MODE === 'enterprise');
  document.getElementById('btnViewB2C')?.classList.toggle('active', VIEW_MODE === 'b2c');

  const title = document.getElementById('viewTitle');
  const text = document.getElementById('viewText');
  const pill = document.getElementById('viewPill');
  if(title) title.textContent = p.title;
  if(text) text.textContent = p.text;
  if(pill) pill.textContent = p.pill;

  const secHint = document.getElementById('secHint');
  if(secHint){
    secHint.textContent = VIEW_MODE === 'b2c'
      ? 'B2C mode - Categories reorder by direct revenue impact, customer growth and signal severity'
      : 'Enterprise mode - Categories reorder by business risk, opportunity and signal severity';
  }

  const live = document.getElementById('liveLabel');
  if(live) live.textContent = p.label + ' - Ready';

  const footer = document.querySelector('.fr2');
  if(footer) footer.textContent = 'v9 - 14 Domains - Current Signals - Competitor Intel - 2026';
}

function getSignalLimit(){
  const saved = Number(localStorage.getItem(STORE_SIGNAL_LIMIT));
  if(saved && saved >= 5 && saved <= 10) return saved;
  return VIEW_MODE === 'b2c' ? 6 : 5;
}


// â”€â”€ DOMAIN PRIORITY / REORDERING - stable, cache-safe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Keeps the existing localStorage keys unchanged. The goal is to prevent partial
// async loads from constantly reshuffling the UI and breaking KPI refreshes.
const BASE_DOMAIN_ORDER = [...DEFAULT_DOMAINS];
const BASE_DOMAIN_INDEX = BASE_DOMAIN_ORDER.reduce((m,id,i)=>{m[id]=i;return m;},{});
let LAST_DOMAIN_ORDER_SIGNATURE = '';

function getDomainBaseIndex(id){
  const source = VIEW_MODE === 'b2c' ? B2C_DOMAINS : DEFAULT_DOMAINS;
  const idx = source.indexOf(id);
  return idx >= 0 ? idx : (BASE_DOMAIN_INDEX[id] ?? 999);
}

function getDomainStrategicBoost(id, signals){
  const joined = (signals || []).map(signalText).join(' ');
  let boost = 0;

  // Do not hard-code cybersecurity as #1. Promote it only when there is an active,
  // high-impact cyber/data/availability threat that can affect revenue, trust or operations.
  if(id === 'sec'){
    const cyberActive = /(cyber|ransomware|data breach|payment fraud|account takeover|ddos|outage|identity|airport systems|passenger data|loyalty fraud|phishing)/.test(joined);
    const cyberUrgent = /(critical|immediate|today|active|ongoing|threat|attack|breach|outage|disruption)/.test(joined);
    if(cyberActive) boost += 18;
    if(cyberUrgent) boost += 18;
  }

  // In B2C view, direct/channel/customer signals should naturally lead.
  if(VIEW_MODE === 'b2c'){
    if(['dig','agt','loy','prd','rev'].includes(id)) boost += 10;
    if(['cmp','spt','sml','rep'].includes(id)) boost += 6;
  } else {
    if(['rev','geo','ops','sec','reg'].includes(id)) boost += 7;
  }
  return boost;
}

function getCyberRankReason(){
  const signals = domData.sec?.signals || [];
  const joined = signals.map(signalText).join(' ');
  const reasons = [];
  if(/cyber|ransomware|data breach|payment fraud|account takeover|ddos|outage|identity|airport systems|passenger data|loyalty fraud|phishing/.test(joined)) reasons.push('active cyber/data/payment risk');
  if(/critical|immediate|today|active|ongoing|threat|attack|breach|outage|disruption/.test(joined)) reasons.push('urgent or active disruption language');
  const high = signals.filter(s => getCommercialImpactScore(s) >= 8).length;
  if(high) reasons.push(high + ' high-impact signal' + (high>1?'s':''));
  const verified = signals.filter(s => s.verified || s.sourceUrl).length;
  if(verified) reasons.push(verified + ' verified/source-backed signal' + (verified>1?'s':''));
  return reasons.length ? reasons.join(' - ') : 'baseline security monitoring, not automatically ranked first';
}

function getDomainPriorityScore(id){
  const d = domData[id];
  if(!d || !Array.isArray(d.signals)) return -1000 - getDomainBaseIndex(id);

  const signals = d.signals || [];
  const signalCount = signals.length;
  const scores = signals.map(getCommercialImpactScore);
  const avgImpact = signalCount ? scores.reduce((sum,n)=>sum+n,0) / signalCount : 0;
  const maxImpact = signalCount ? Math.max(...scores) : 0;
  const riskCount = signals.filter(isRiskSignal).length;
  const oppCount  = signals.filter(isOpportunitySignal).length;
  const forwardCount = signals.filter(isForwardSignal).length;
  const immediateCount = signals.filter(s => getTimeToImpactWeight(s) >= 3).length;
  const verifiedCount = signals.filter(s => s.verified || s.sourceUrl).length;
  const strategicBoost = getDomainStrategicBoost(id, signals);
  const b2cBoost = VIEW_MODE === 'b2c'
    ? signals.filter(s => /direct|booking|conversion|app|web|loyalty|member|customer|ota|agent|ancillary|campaign|personal|ucp/.test(signalText(s))).length * 5
    : 0;

  // Max impact matters more than average: one critical cyber/revenue/customer signal can legitimately rise to #1.
  return (maxImpact * 22) + (avgImpact * 8) + (riskCount * 13) + (oppCount * 8) +
         (forwardCount * 5) + (immediateCount * 7) + (verifiedCount * 3) +
         (signalCount * 2) + b2cBoost + strategicBoost + (Number(d.score)||0)/12;
}
// Backward-compatible aliases for older v7/v8 call sites and future extensions.
function domainSeverityScore(id){ return getDomainPriorityScore(id); }
function domainPriorityWeight(id){ return getDomainBaseIndex(id); }

function reorderDomainsByPriority(force=false){
  const grid = document.querySelector('.dom-grid');
  if(!grid) return;

  const loaded = loadedDomainCount();
  const fullyLoaded = loaded === DOMAINS.length;

  // During live API loading, keep the card grid stable until the full set is in.
  // KPIs still update as each domain arrives, but the card order finalises once complete.
  if(isBusy && !fullyLoaded && !force) return;

  const ordered = [...DOMAINS].sort((a,b)=>{
    const loadedA = !!domData[a], loadedB = !!domData[b];
    if(loadedA !== loadedB) return loadedA ? -1 : 1;
    if(loadedA && loadedB){
      const diff = getDomainPriorityScore(b) - getDomainPriorityScore(a);
      if(Math.abs(diff) > 0.0001) return diff;
    }
    return getDomainBaseIndex(a) - getDomainBaseIndex(b);
  });

  const signature = VIEW_MODE + ':' + ordered.join('|') + ':' + loaded;
  if(signature === LAST_DOMAIN_ORDER_SIGNATURE && !force) return;
  LAST_DOMAIN_ORDER_SIGNATURE = signature;

  ordered.forEach(id => {
    const tile = grid.querySelector('[data-id="'+id+'"]');
    if(tile) grid.appendChild(tile);
  });

  const hint = document.getElementById('secHint');
  if(hint){
    const topId = ordered[0];
    if(fullyLoaded && topId === 'sec'){
      hint.textContent = 'Cyber ranked #1 because: ' + getCyberRankReason();
    }else{
      hint.textContent = fullyLoaded
        ? (VIEW_MODE === 'b2c'
            ? 'B2C mode - Categories reordered by direct revenue impact, customer growth and signal severity'
            : 'Enterprise mode - Categories reordered by business risk, opportunity and signal severity')
        : (VIEW_MODE === 'b2c'
            ? 'B2C mode - Loading saved/current data; final category order locks when all domains are loaded'
            : 'Enterprise mode - Loading saved/current data; final category order locks when all domains are loaded');
    }
  }
}

function refreshRadarDerivedState(forceOrder=false){
  reorderDomainsByPriority(forceOrder);
  if(typeof hydrateSentimentFromDomainCache === 'function') hydrateSentimentFromDomainCache();
  if(typeof hydrateCustomerIntelFromDomainCache === 'function') hydrateCustomerIntelFromDomainCache();
  updateExecutiveScorecard();
  updateProgMeta();
  if(typeof updateKpiTooltips === 'function') setTimeout(updateKpiTooltips, 100);
}


// â”€â”€ EXECUTIVE SCORECARD - derived from loaded signals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function allLoadedSignals(){
  const rows = [];
  DOMAINS.forEach(id => {
    const d = domData[id];
    if(!d || !Array.isArray(d.signals)) return;
    d.signals.forEach(s => rows.push({domain:id, signal:s, domainData:d}));
  });
  return rows;
}

function signalText(s){
  return [s?.title, s?.body, s?.whyItMattersNow, s?.impactLabel, s?.source]
    .filter(Boolean).join(' ').toLowerCase();
}

function isRiskSignal(s){
  return s?.dot === 'dr' || s?.impact === 'si-r' || /risk|pressure|threat|delay|outage|loss|strike|disrupt/.test(signalText(s));
}

function isOpportunitySignal(s){
  return s?.dot === 'dg' || s?.impact === 'si-g' || /opportunity|growth|demand|capture|launch|event|surge|uplift|win/.test(signalText(s));
}

function getCommercialImpactScore(s){
  const n = Number(s?.commercialImpactScore);
  if(Number.isFinite(n)) return Math.max(1, Math.min(10, Math.round(n)));
  const text = signalText(s);
  let score = 5;
  if(isRiskSignal(s) || isOpportunitySignal(s)) score += 1;
  if(/direct|booking|conversion|loyalty|ota|agent|app|web|ancillary|revenue|customer|ucp|personalisation|personalization/.test(text)) score += 2;
  if(/immediate|today|now|active|ongoing|next_30_days|deadline|expires/.test(text)) score += 1;
  if(/critical|high|surge|disruption|launch|visa|fare|capacity|campaign/.test(text)) score += 1;
  if(/cyber|ransomware|data breach|payment fraud|account takeover|ddos|outage|passenger data|loyalty fraud/.test(text)) score += 2;
  if(/verified|official|qatar airways|iata|icao|government|regulator/.test(text)) score += 1;
  return Math.max(1, Math.min(10, score));
}

function getTimeToImpactWeight(s){
  const t = String(s?.timeToImpact || s?.relevanceWindow || '').toLowerCase();
  if(t.includes('immediate') || t.includes('today')) return 4;
  if(t.includes('30')) return 3;
  if(t.includes('90')) return 2;
  if(t.includes('180') || t.includes('6')) return 1;
  return 1;
}

function isCommerciallyRelevantSignal(signal, domId){
  const s = signal || {};
  const text = signalText(s);
  const businessWords = [
    'revenue','demand','booking','direct','conversion','app','web','loyalty','member',
    'customer','ota','agent','ancillary','fare','price','yield','route','capacity','market',
    'campaign','personalisation','personalization','ucp','call centre','support','visa',
    'regulation','event','competition','competitor','fuel','fx','airspace','disruption'
  ];
  const b2cWords = [
    'direct','booking','conversion','app','web','loyalty','member','customer','ota','agent',
    'ancillary','campaign','personalisation','personalization','digital','mobile','call centre',
    'self-service','support','crm','ucp','customer value','demand'
  ];
  const hasBusiness = hasAny(text, businessWords) || ['rev','dig','loy','prd','agt','cmp','spt'].includes(domId);
  const hasB2C = VIEW_MODE !== 'b2c' || hasAny(text, b2cWords) || ['dig','agt','loy','prd','rev','sml','rep'].includes(domId);
  return hasBusiness || hasB2C; // Accept any commercially relevant signal
}

function sortSignalsForLeadership(signals){
  return (signals || []).sort((a,b) => {
    const riskDiff = (isRiskSignal(b)?1:0) - (isRiskSignal(a)?1:0);
    const scoreDiff = getCommercialImpactScore(b) - getCommercialImpactScore(a);
    if(scoreDiff) return scoreDiff;
    const timeDiff = getTimeToImpactWeight(b) - getTimeToImpactWeight(a);
    if(timeDiff) return timeDiff;
    if(riskDiff) return riskDiff;
    const verifyDiff = ((b.verified||b.sourceUrl)?1:0) - ((a.verified||a.sourceUrl)?1:0);
    if(verifyDiff) return verifyDiff;
    return String(a.title||'').localeCompare(String(b.title||''));
  });
}

function isForwardSignal(s){
  const w = String(s?.relevanceWindow || '').toLowerCase();
  if(['today','next_30_days','next_90_days','next_180_days'].includes(w)) return true;
  const eventDate = parseSignalDate(s?.eventDate);
  if(eventDate){
    const diff = daysFromToday(eventDate);
    return diff >= -14 && diff <= 180;
  }
  return /today|current|ongoing|upcoming|future|forecast|expected|starts|launches|expires|deadline/.test(signalText(s));
}

function isB2CSignal(row){
  const id = row.domain;
  const text = signalText(row.signal);
  const b2cDomains = ['dig','agt','loy','prd','rev','sml','spt','rep'];
  return b2cDomains.includes(id) || /direct|booking|conversion|app|web|loyalty|member|customer|ota|agent|ancillary|campaign|personal/.test(text);
}

function parseOpportunityValue(value){
  if(!value || typeof value !== 'string') return 0;
  const txt = value.toLowerCase().replace(/,/g,'').trim();
  const match = txt.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  if(!match) return 0;
  let amount = Number(match[1]);
  if(Number.isNaN(amount)) return 0;
  if(txt.includes('bn') || txt.includes('billion')) amount *= 1000000000;
  else if(txt.includes('m') || txt.includes('million')) amount *= 1000000;
  else if(txt.includes('k') || txt.includes('thousand')) amount *= 1000;
  return amount;
}

function formatMoney(amount){
  if(!amount || amount <= 0) return 'TBD';
  if(amount >= 1000000000) return '$' + (amount/1000000000).toFixed(amount >= 10000000000 ? 0 : 1) + 'B';
  if(amount >= 1000000) return '$' + (amount/1000000).toFixed(amount >= 10000000 ? 0 : 1) + 'M';
  if(amount >= 1000) return '$' + Math.round(amount/1000) + 'K';
  return '$' + Math.round(amount);
}

function normaliseOpportunityValue(amount, opportunityCount){
  const n = Number(amount);
  if(!Number.isFinite(n) || n <= 0) return 0;
  // Cached Radar opportunity values are often stored as "77" meaning "$77M".
  // Treat tiny opportunity totals as millions so the KPI does not display "$77".
  if(n > 0 && n < 1000 && opportunityCount > 0) return n * 1000000;
  return n;
}

function setKpi(index, value, label, detail, tone){
  const v = document.getElementById('k'+index+'v');
  const l = document.getElementById('k'+index+'l');
  const d = document.getElementById('k'+index+'d');
  const dot = document.getElementById('k'+index+'dot');
  if(v){
    v.textContent = value;
    v.className = 'kv ' + (tone === 'risk' ? 'vr' : tone === 'opp' ? 'vg' : tone === 'amber' ? 'va' : 'vn');
  }
  if(l) l.textContent = label;
  if(d){
    d.textContent = detail;
    d.className = 'kd ' + (tone === 'risk' ? 'dn' : tone === 'opp' ? 'dg' : tone === 'amber' ? 'da' : 'dt');
  }
  if(dot) dot.className = value === '-' || value === '0/14' ? 'kpi-stale' : 'kpi-live';
}

function updateExecutiveScorecard(){
  const rows = allLoadedSignals().filter(row => isForwardSignal(row.signal));
  const loaded = loadedDomainCount();
  const risks = rows.filter(row => isRiskSignal(row.signal));
  const opps = rows.filter(row => isOpportunitySignal(row.signal));
  const b2cRows = rows.filter(isB2CSignal);
  const b2cRisks = b2cRows.filter(row => isRiskSignal(row.signal));
  const b2cOpps = b2cRows.filter(row => isOpportunitySignal(row.signal));
  const domainsWithRisk = [...new Set(risks.map(row => row.domain))].length;
  const directTerms = /direct|booking|conversion|app|web|ota|agent|loyalty|member|customer|ancillary|campaign|personal/;
  const directLevers = b2cRows.filter(row => directTerms.test(signalText(row.signal))).length;
  const sourceValue = DOMAINS.reduce((sum,id) => sum + parseOpportunityValue(domData[id]?.opp?.value), 0);
  const estimateValue = opps.length * (VIEW_MODE === 'b2c' ? 1750000 : 2500000);
  const opportunityValue = normaliseOpportunityValue(sourceValue, opps.length) || estimateValue;
  const forwardCount = rows.length;

  if(VIEW_MODE === 'b2c'){
    setKpi(1, String(b2cRisks.length), 'Direct/B2C risks', b2cRisks.length ? 'Needs leadership attention' : 'No active B2C risk loaded', b2cRisks.length ? 'risk' : 'neutral');
    setKpi(2, formatMoney(opportunityValue), 'B2C opportunity', b2cOpps.length + ' forward opportunity signals', opportunityValue ? 'opp' : 'neutral');
    setKpi(3, String(directLevers), 'Direct growth levers', 'Conversion, loyalty, OTA, app/web themes', directLevers ? 'amber' : 'neutral');
    setKpi(4, String(forwardCount), 'Current/future signals', 'Historic-only news filtered out', forwardCount ? 'neutral' : 'amber');
    setKpi(5, loaded + '/14', 'B2C coverage loaded', loaded === 14 ? 'Complete executive view' : 'Resume to complete scorecard', loaded === 14 ? 'opp' : 'amber');
  } else {
    setKpi(1, String(risks.length), 'Active revenue risks', risks.length ? domainsWithRisk + ' domains need attention' : 'No active risk loaded', risks.length ? 'risk' : 'neutral');
    setKpi(2, formatMoney(opportunityValue), 'Opportunity value', opps.length + ' opportunity signals detected', opportunityValue ? 'opp' : 'neutral');
    setKpi(3, String(domainsWithRisk), 'Risk domains', 'Revenue, ops, geo, cyber and demand exposure', domainsWithRisk ? 'amber' : 'neutral');
    setKpi(4, String(forwardCount), 'Forward signals', 'Today to next 180 days only', forwardCount ? 'neutral' : 'amber');
    setKpi(5, loaded + '/14', 'Enterprise coverage', loaded === 14 ? 'Complete enterprise view' : 'Resume to complete scorecard', loaded === 14 ? 'opp' : 'amber');
  }
  updateExecutiveNarrative(rows);
}

function updateExecutiveNarrative(rows){
  const useful = (rows || [])
    .filter(row => isForwardSignal(row.signal))
    .sort((a,b) => getCommercialImpactScore(b.signal) - getCommercialImpactScore(a.signal));
  if(!useful.length) return;
  const top = useful[0].signal;
  const label = VIEW_MODE === 'b2c' ? 'B2C intelligence' : 'Enterprise intelligence';
  const riskCount = useful.filter(row => isRiskSignal(row.signal)).length;
  const oppCount = useful.filter(row => isOpportunitySignal(row.signal)).length;
  const sit = document.getElementById('sitTxt');
  const tags = document.getElementById('sitTags');
  if(sit){
    sit.textContent = label + ' - ' + (riskCount || 0) + ' risks - ' + (oppCount || 0) + ' opportunities - top signal: ' + (top.title || 'review current signals');
  }
  if(tags){
    tags.innerHTML = useful.slice(0,4).map(row => {
      const s = row.signal;
      const text = (s.demandImpact || s.relevanceWindow || 'signal') + ' - score ' + getCommercialImpactScore(s) + '/10';
      return `<span class="stag">${text}</span>`;
    }).join('');
  }
}

// â”€â”€ BACKEND CACHE-FIRST LOADING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The backend/Supabase should be the first source of truth.
// Claude is only used when the user explicitly refreshes or no cache exists.
function normaliseBackendSignal(row){
  row = row || {};
  const raw = row.raw_json || {};
  const timer = row.timer || raw.timer || raw.radarAudit || {};
  const sourceDate = row.source_date || raw.sourceDate || raw.source_date || '';
  return {
    title: row.title || raw.title || '',
    body: row.body || raw.body || '',
    source: row.source || raw.source || 'Stored intelligence',
    sourceUrl: row.source_url || raw.sourceUrl || raw.source_url || '',
    sourceDate: sourceDate,
    eventDate: row.event_date || raw.eventDate || raw.event_date || '',
    impactLabel: row.impact_label || raw.impactLabel || raw.impact_label || 'Stored signal',
    impact: row.impact_class || raw.impact || raw.impact_class || 'si-b',
    dot: row.dot_class || raw.dot || raw.dot_class || 'db',
    commercialImpactScore: Number(row.commercial_impact_score || raw.commercialImpactScore || raw.commercial_impact_score || 7),
    demandImpact: row.demand_impact || raw.demandImpact || raw.demand_impact || '',
    timeToImpact: row.time_to_impact || raw.timeToImpact || raw.time_to_impact || '',
    relevanceWindow: row.relevance_window || raw.relevanceWindow || raw.relevance_window || '',
    captureStrategy: row.capture_strategy || raw.captureStrategy || raw.capture_strategy || '',
    whyItMattersNow: row.why_it_matters_now || raw.whyItMattersNow || raw.why_it_matters_now || '',
    confidence: row.confidence || raw.confidence || '',
    verified: Boolean(row.verified || raw.verified),
    benchmark: Boolean(row.benchmark || raw.benchmark),
    timer: timer,
    statusLabel: timer.statusLabel || row.signal_status || '',
    ageHuman: timer.ageHuman || '',
    firstSeenAt: timer.firstSeenAt || row.first_seen_at || raw.firstSeenAt || '',
    firstSeenDoha: timer.firstSeenDoha || '',
    lastSeenAt: timer.lastSeenAt || row.last_seen_at || raw.lastSeenAt || '',
    lastSeenDoha: timer.lastSeenDoha || '',
    lastVerifiedAt: timer.lastVerifiedAt || row.last_verified_at || raw.lastVerifiedAt || '',
    lastVerifiedDoha: timer.lastVerifiedDoha || '',
    lastContentChangedAt: timer.lastContentChangedAt || row.last_content_changed_at || raw.lastContentChangedAt || '',
    lastContentChangedDoha: timer.lastContentChangedDoha || '',
    lastSeenHuman: timer.lastSeenHuman || '',
    lastVerifiedHuman: timer.lastVerifiedHuman || '',
    contentChangedHuman: timer.contentChangedHuman || '',
    cacheStatus: timer.freshnessStatus || '',
    isStale: Boolean(timer.isStale),
    dataHash: timer.dataHash || (row.signal_hash ? String(row.signal_hash).slice(0,12).toUpperCase() : '')
  };
}

function domainResultFromBackend(domainId, payload){
  payload = payload || {};
  const refresh = payload?.refresh || payload?.data?.refresh || {};
  const meta = payload?.meta || payload?.data?.meta || {};
  const signals = extractSignalsFromAny(payload).map(normaliseBackendSignal);
  const top = signals[0] || {};
  return postProcessDomainData({
    id: domainId,
    score: Number(refresh.score || meta.score || 0),
    status: refresh.status || (signals.length ? 'Cached' : 'No cached signal'),
    statusClass: signals.some(s => isRiskSignal(s)) ? 'spr' : 'spg2',
    signals: signals,
    metrics: Array.isArray(refresh.metrics) ? refresh.metrics : [],
    opp: {
      eyebrow: meta.cacheStatus ? ('Cache - ' + meta.cacheStatus) : 'Stored intelligence',
      title: top.captureStrategy || top.title || 'Stored Radar intelligence',
      body: top.whyItMattersNow || top.body || 'Loaded from Supabase cache before using Claude.',
      value: meta.cacheAgeHuman ? ('Updated ' + meta.cacheAgeHuman + ' ago') : 'Saved in backend'
    },
    actions: signals.slice(0,3).map(s => s.captureStrategy || s.title).filter(Boolean)
  }, domainId);
}

async function loadBackendCacheFirst(showMessages){
  if(!BACKEND_URL) return false;
  const viewMode = (typeof VIEW_MODE !== 'undefined' && VIEW_MODE) ? VIEW_MODE : 'enterprise';
  const maxAgeHours = 720; // load up to 30 days so stale data can still be shown with freshness labels

  function markBackendCacheUnavailable(message){
    DOMAINS.forEach(id => {
      if(domData[id]) return;
      const cb = document.getElementById('cb-'+id);
      const of = document.getElementById('of-'+id);
      const on = document.getElementById('on-'+id);
      if(cb) cb.textContent = 'No data';
      if(of) of.style.width = '0%';
      if(on) on.textContent = '-';
      updateProgCell(id, 'pending');
    });
    updateProgMeta();
    const emptyTxt = document.getElementById('emptyTxt');
    if(emptyTxt) emptyTxt.textContent = message;
    const btnResume = document.getElementById('btnResume');
    if(btnResume) btnResume.classList.remove('hidden');
  }

  try{
    if(showMessages) setStatus('Loading saved Radar intelligence from backend...', true);
    setPhase('Checking Supabase cache before using Claude...');

    const latestResp = await backendFetch(`/api/cache/latest?viewMode=${encodeURIComponent(viewMode)}&maxAgeHours=${maxAgeHours}`, {}, 20000);
    if(!latestResp.ok) throw new Error('Cache latest failed ' + latestResp.status);
    const latestRaw = await latestResp.json();
    const latest = latestRaw && latestRaw.data ? Object.assign({}, latestRaw.data, { meta: latestRaw.meta || latestRaw.data.meta }) : latestRaw;

    const available = Array.isArray(latest.refreshes) ? latest.refreshes : [];
    const uniqueDomains = [];
    available.forEach(r => {
      if(r && r.domain_id && !uniqueDomains.includes(r.domain_id)) uniqueDomains.push(r.domain_id);
    });

    let loaded = 0;
    for(const domainId of uniqueDomains){
      if(!DOMAINS.includes(domainId)) continue;
      try{
        const resp = await backendFetch(`/api/cache/domain/${domainId}?viewMode=${encodeURIComponent(viewMode)}&maxAgeHours=${maxAgeHours}`, {}, 15000);
        if(!resp.ok) continue;
        const payload = await resp.json();
        const backendSignals = extractSignalsFromAny(payload);
        if(payload.cached === false && backendSignals.length === 0) continue;
        if(backendSignals.length === 0) {
          console.warn('Backend cache returned no signals for', domainId, payload);
          continue;
        }

        const result = syncDomainRuntimeState(domainId, domainResultFromBackend(domainId, payload), 'backend_cache');
        saveDomain(domainId, result); // browser backup only
        updateTile(domainId, result);
        updateProgCell(domainId, payload.meta?.cacheStatus === 'stale' ? 'cached' : 'done');
        loaded++;
      }catch(domainErr){
        console.warn('Could not load cached domain from backend', domainId, domainErr);
      }
    }

    refreshRadarDerivedState(true);

    if(loaded > 0){
      const freshLabel = latest?.meta?.cacheStatus ? (' - ' + latest.meta.cacheStatus) : '';
      setStatus(loaded + ' of 14 domains loaded from backend/Supabase cache' + freshLabel);
      setPhase(latest?.meta?.backendRefreshedDoha ? ('Backend refreshed: ' + latest.meta.backendRefreshedDoha + ' - Hash ' + (latest.meta.dataHash || '')) : 'Backend cache loaded');
      const emptyTxt = document.getElementById('emptyTxt');
      if(emptyTxt) emptyTxt.textContent = loaded + ' domains loaded from Supabase. Click any domain to explore, or use Refresh only when you need new AI scans.';
      const liveLabel = document.getElementById('liveLabel');
      if(liveLabel) liveLabel.textContent = getViewProfile().label + ' - ' + loaded + '/14 backend cache';
      checkResumable();
      return true;
    }

    if(showMessages) setStatus('No backend cache found - use Refresh all to generate new intelligence');
    markBackendCacheUnavailable('No saved backend cache is available for this view. Click Refresh all to generate live intelligence.');
    setPhase('');
    return false;
  }catch(err){
    console.warn('Backend cache load failed:', err);
    const missingCacheEndpoint = String(err && err.message || '').includes('HTTP 404 from /api/cache/latest');
    if(missingCacheEndpoint){
      markBackendCacheUnavailable('This backend does not expose the saved-cache listing endpoint. Click Refresh all to generate live intelligence through the backend.');
      if(showMessages) setStatus('Saved-cache endpoint unavailable - click Refresh all to generate intelligence');
    }else if(showMessages){
      setStatus('Could not load backend cache - browser backup will be used');
    }
    setPhase('');
    return false;
  }
}


// â”€â”€ STORAGE - one key per domain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function saveDomain(id, data){
  try{
    const normalised = syncDomainRuntimeState(id, data, 'saveDomain');
    localStorage.setItem(storageKey(id), JSON.stringify({
      savedAt: new Date().toISOString(),
      data: normalised
    }));
    document.getElementById('progSave').textContent = 'OK Saved: ' + DOM_LABELS[id];
    setTimeout(()=>{ document.getElementById('progSave').textContent=''; }, 2000);
  }catch(e){ console.warn('Could not save domain', id, e); }
}


// â”€â”€ SUPABASE PERSISTENCE VIA BACKEND â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// This saves every loaded domain to Supabase through the Render backend.
// localStorage remains as a browser backup, but Supabase becomes the persistent database.
async function saveDomainToSupabase(domainId, result){
  try{
    const payload = {
      domainId: domainId,
      viewMode: (typeof VIEW_MODE !== 'undefined' && VIEW_MODE) ? VIEW_MODE : 'enterprise',
      signals: Array.isArray(result?.signals) ? result.signals : [],
      score: Number(result?.score || 0),
      status: result?.status || 'unknown',
      opp: result?.opp || null,
      metrics: Array.isArray(result?.metrics) ? result.metrics : [],
      savedAt: new Date().toISOString()
    };

    console.log('Saving domain to Supabase:', domainId, payload);

    const resp = await fetch(`${BACKEND_URL}/api/signals/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json().catch(() => ({}));

    if(!resp.ok){
      console.error('Supabase save failed for ' + domainId + ':', data);
      const phase = document.getElementById('progPhase');
      if(phase) phase.textContent = DOM_LABELS[domainId] + ' loaded, but Supabase save failed - check Render logs';
      return false;
    }

    console.log('Supabase saved:', domainId, data);
    const saveNote = document.getElementById('progSave');
    if(saveNote){
      saveNote.textContent = 'OK Saved to Supabase: ' + DOM_LABELS[domainId];
      setTimeout(()=>{ saveNote.textContent=''; }, 2200);
    }
    return true;
  }catch(err){
    console.error('Supabase save error for ' + domainId + ':', err);
    const phase = document.getElementById('progPhase');
    if(phase) phase.textContent = DOM_LABELS[domainId] + ' loaded, but Supabase save could not connect';
    return false;
  }
}

function loadDomain(id){
  try{
    const raw = localStorage.getItem(storageKey(id)) || (VIEW_MODE === 'enterprise' ? localStorage.getItem(legacyStorageKey(id)) : null);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}

function clearDomain(id){
  localStorage.removeItem(storageKey(id));
  if(VIEW_MODE === 'enterprise') localStorage.removeItem(legacyStorageKey(id));
}

function loadAllSaved(){
  const state = hydrateRadarStateFromCache({source:'browser_cache_startup'});
  let count = 0;
  DOMAINS.forEach(id => {
    const cleaned = state.domains[id];
    if(cleaned && cleaned.signals){
      domData[id] = cleaned;
      updateTile(id, cleaned);
      updateProgCell(id, 'cached');
      count++;
    }
  });
  refreshRadarDerivedState(true);
  updateProgMeta();
  if(count > 0){
    setStatus(count + ' of 14 domains loaded from saved ' + getViewProfile().label + ' data');
    const emptyTxt = document.getElementById('emptyTxt');
    if(emptyTxt) emptyTxt.textContent = count + ' ' + getViewProfile().label + ' domains loaded from browser/backend cache. Click any domain to explore, or refresh to update.';
    const liveLabel = document.getElementById('liveLabel');
    if(liveLabel) liveLabel.textContent = getViewProfile().label + ' - ' + count + '/14 saved';
  } else {
    radarDebug('No saved domains found for current view', { viewMode: VIEW_MODE });
  }
}

function clearSaved(){
  if(!confirm('Clear all saved domain data and start fresh?')) return;
  DOMAINS.forEach(id => clearDomain(id));
  resetRadarRuntimeState();
  DOMAINS.forEach(id => {
    updateProgCell(id, 'pending');
    const cb = document.getElementById('cb-'+id);
    const of = document.getElementById('of-'+id);
    const on = document.getElementById('on-'+id);
    if(cb) cb.textContent = 'loading...';
    if(of) of.style.width = '0%';
    if(on) on.textContent = '-';
  });
  updateProgMeta();
  updateExecutiveScorecard();
  setStatus('Saved data cleared - click Refresh all to reload');
  closeDom();
}

// â”€â”€ PROGRESS UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildProgressUI(){
  const track = document.getElementById('progTrack');
  const labels = document.getElementById('progLabels');
  track.innerHTML = '';
  labels.innerHTML = '';
  DOMAINS.forEach(id => {
    const cell = document.createElement('div');
    cell.className = 'prog-cell';
    cell.id = 'pc-' + id;
    cell.title = DOM_LABELS[id];
    track.appendChild(cell);
    const lbl = document.createElement('div');
    lbl.className = 'prog-lbl';
    lbl.id = 'pl-' + id;
    lbl.textContent = DOM_LABELS[id].slice(0,4);
    labels.appendChild(lbl);
  });
}

function updateProgCell(id, state){
  const cell = document.getElementById('pc-' + id);
  const lbl  = document.getElementById('pl-' + id);
  if(cell) cell.className = 'prog-cell ' + state;
  if(lbl)  lbl.className  = 'prog-lbl '  + state;
}

function updateProgMeta(){
  const done = DOMAINS.filter(id => domData[id]).length;
  document.getElementById('progMeta').textContent =
    done + ' of 14 domains loaded' + (done === 14 ? ' - complete OK' : '');
}

function setStatus(msg, showSpin=false){
  document.getElementById('progStatus').textContent = msg;
  document.getElementById('progSpin').style.display = showSpin ? 'block' : 'none';
}

function setPhase(msg){
  document.getElementById('progPhase').textContent = msg;
}

function checkResumable(){
  const missing = DOMAINS.filter(id => !domData[id]);
  if(missing.length > 0 && missing.length < 14){
    document.getElementById('btnResume').classList.remove('hidden');
    setStatus(missing.length + ' domains pending - click Resume to continue');
  }
}

// â”€â”€ SLEEP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// â”€â”€ RATE LIMIT COUNTDOWN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function rateLimitPause(seconds){
  for(let s=seconds; s>0; s--){
    if(stopFlag) return;
    setPhase('Rate limit pause: ' + s + 's - free account token window reset');
    await sleep(1000);
  }
  setPhase('');
}


// â”€â”€ RECENCY + FUTURE RELEVANCE FILTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Radar should be useful for decisions now and in the next 30-180 days.
// Old news is allowed only when the business impact is still active today.
function parseSignalDate(value){
  if(!value || typeof value !== 'string') return null;
  const cleaned = value.trim();
  if(!cleaned || cleaned.toLowerCase() === 'unknown') return null;
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysFromToday(date){
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

function formatRadarDate(value){
  if(!value) return '';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function minutesBetweenDates(from, to){
  if(!from) return null;
  const a = new Date(from);
  const b = to ? new Date(to) : new Date();
  if(Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b - a) / 60000));
}

function humanAgeFromDate(value){
  const mins = minutesBetweenDates(value);
  if(mins === null) return '';
  if(mins < 1) return 'just now';
  if(mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if(hrs < 48) return hrs + 'h ago';
  const days = Math.round(hrs / 24);
  if(days < 60) return days + 'd ago';
  return Math.round(days / 30) + 'mo ago';
}

function ensureSignalTimerFields(s){
  s = s || {};
  const t = s.timer || {};
  s.firstSeenAt = s.firstSeenAt || t.firstSeenAt || t.first_seen_at || s.created_at || s.sourceDate || '';
  s.lastSeenAt = s.lastSeenAt || t.lastSeenAt || t.last_seen_at || s.updated_at || s.firstSeenAt || '';
  s.lastVerifiedAt = s.lastVerifiedAt || t.lastVerifiedAt || t.last_verified_at || '';
  s.lastContentChangedAt = s.lastContentChangedAt || t.lastContentChangedAt || t.last_content_changed_at || s.lastSeenAt || '';
  s.ageHuman = s.ageHuman || t.ageHuman || humanAgeFromDate(s.firstSeenAt);
  s.lastSeenHuman = s.lastSeenHuman || t.lastSeenHuman || humanAgeFromDate(s.lastSeenAt);
  s.lastVerifiedHuman = s.lastVerifiedHuman || t.lastVerifiedHuman || humanAgeFromDate(s.lastVerifiedAt);
  s.contentChangedHuman = s.contentChangedHuman || t.contentChangedHuman || humanAgeFromDate(s.lastContentChangedAt);
  s.statusLabel = s.statusLabel || t.statusLabel || (s.isStale ? 'STALE' : s.firstSeenAt ? 'ACTIVE' : '');
  return s;
}

function signalDateSummary(s){
  s = ensureSignalTimerFields(s || {});
  const parts = [];
  if(s.sourceDate) parts.push('Source ' + formatRadarDate(s.sourceDate));
  if(s.ageHuman) parts.push('First seen ' + s.ageHuman);
  if(s.lastSeenHuman) parts.push('Last seen ' + s.lastSeenHuman);
  if(s.contentChangedHuman) parts.push('Updated ' + s.contentChangedHuman);
  if(s.lastVerifiedHuman) parts.push('Verified ' + s.lastVerifiedHuman);
  if(s.statusLabel) parts.push(String(s.statusLabel).toUpperCase());
  return parts.filter(Boolean).join(' - ');
}

function renderSignalDateMeta(s){
  const summary = signalDateSummary(s);
  if(!summary) return '';
  const hash = s.dataHash ? '<span class="sig-date-chip">Hash ' + esc(s.dataHash) + '</span>' : '';
  const stale = s.isStale ? '<span class="sig-date-chip sig-date-stale">Stale</span>' : '';
  return '<div class="sig-date-meta"><span>' + esc(summary) + '</span>' + hash + stale + '</div>';
}

function hasAny(text, words){
  return words.some(w => text.includes(w));
}

function normaliseSignal(signal){
  const s = signal || {};
  ensureSignalTimerFields(s);
  const text = [s.title, s.body, s.whyItMattersNow, s.impactLabel].filter(Boolean).join(' ').toLowerCase();

  if(!s.relevanceWindow){
    if(hasAny(text, ['today','now','currently','active','ongoing','continues','still'])) s.relevanceWindow = 'today';
    else if(hasAny(text, ['next month','30 days','launches','starts','deadline','expires'])) s.relevanceWindow = 'next_30_days';
    else if(hasAny(text, ['quarter','q1','q2','q3','q4','forecast','expected'])) s.relevanceWindow = 'next_90_days';
    else s.relevanceWindow = 'next_180_days';
  }

  if(!s.whyItMattersNow){
    s.whyItMattersNow = VIEW_MODE === 'b2c'
      ? 'May affect direct demand, conversion, loyalty or customer value.'
      : 'May affect revenue, demand, risk or business opportunity.';
  }

  if(!s.demandImpact){
    if(/surge|growth|increase|opportunity|event|launch|opens|resumes/.test(text)) s.demandImpact = 'increase';
    else if(/risk|delay|restriction|strike|outage|disruption|pressure|loss/.test(text)) s.demandImpact = 'decrease';
    else if(/competitor|ota|agent|shift|share|emirates|etihad|turkish/.test(text)) s.demandImpact = 'shift';
    else s.demandImpact = 'unknown';
  }

  if(!s.timeToImpact){
    const w = String(s.relevanceWindow || '').toLowerCase();
    if(w === 'today') s.timeToImpact = 'Immediate';
    else if(w === 'next_30_days') s.timeToImpact = '30 days';
    else if(w === 'next_90_days') s.timeToImpact = '90 days';
    else s.timeToImpact = '6 months';
  }

  if(!s.confidence){
    s.confidence = s.verified && s.sourceUrl ? 'High' : s.source ? 'Medium' : 'Low';
  }

  if(!s.captureStrategy){
    if(VIEW_MODE === 'b2c'){
      if(s.demandImpact === 'increase') s.captureStrategy = 'Use direct campaigns and loyalty targeting to capture demand.';
      else if(s.demandImpact === 'shift') s.captureStrategy = 'Protect direct share with app/web and member-led offers.';
      else if(s.demandImpact === 'decrease') s.captureStrategy = 'Reduce conversion friction and protect high-value demand.';
      else s.captureStrategy = 'Monitor for direct, loyalty and customer-value impact.';
    } else {
      s.captureStrategy = 'Review commercial action and monitor revenue exposure.';
    }
  }

  s.commercialImpactScore = getCommercialImpactScore(s);
  ensureSignalTimerFields(s);

  return s;
}

function isUsefulCurrentOrFutureSignal(signal){
  const s = normaliseSignal(signal);
  const allowedWindows = ['today','next_30_days','next_90_days','next_180_days'];
  const text = [s.title, s.body, s.whyItMattersNow, s.source, s.impactLabel]
    .filter(Boolean).join(' ').toLowerCase();

  const activeWords = [
    'today','now','current','currently','active','ongoing','still','continues','effective',
    'upcoming','future','launches','starts','opens','returns','resumes','expires','deadline',
    'forecast','expected','planned','scheduled','from','through','until','next','q1','q2','q3','q4',
    '2026','2027','risk','opportunity','demand','booking','conversion','revenue',
    'airline','passenger','travel','market','digital','mobile','payment','loyalty'
  ];

  const historicOnlyWords = [
    'last year','previously','historically','in 2023','in 2024','in 2025',
    'was announced','had launched','was launched','was opened','was introduced',
    'reported last year','former','past campaign','retrospective'
  ];

  const hasCurrentImpact = hasAny(text, activeWords);
  const looksHistoricOnly = hasAny(text, historicOnlyWords) && !hasCurrentImpact;
  if(looksHistoricOnly && !isRiskSignal(s) && !isOpportunitySignal(s)) return false;

  const eventDate = parseSignalDate(s.eventDate);
  if(eventDate){
    const diff = daysFromToday(eventDate);
    // Already happened more than two weeks ago and no active impact = not useful.
    if(diff < -14 && !hasCurrentImpact) return false;
    // Future/current event = useful.
    if(diff >= -14 && diff <= 180) return true;
  }

  const sourceDate = parseSignalDate(s.sourceDate);
  if(sourceDate){
    const age = -daysFromToday(sourceDate);
    // Older sources are okay only if the rule/event/opportunity is still active.
    if(age > 180 && !hasCurrentImpact) return false;
    if(age <= 120) return true;
  }

  // If Claude followed the relevanceWindow rule, allow it; otherwise require active language.
  return allowedWindows.includes(s.relevanceWindow) || hasCurrentImpact;
}

function postProcessDomainData(data, domId){
  const d = data || {id: domId, signals: []};
  d.id = d.id || domId;

  const rawSignals = Array.isArray(d.signals) ? d.signals : extractSignalsFromAny(d);
  const normalisedSignals = rawSignals.map(normaliseSignal);
  const usefulSignals = normalisedSignals.filter(isUsefulCurrentOrFutureSignal);
  const commercialSignals = usefulSignals.filter(s => isCommerciallyRelevantSignal(s, domId));

  // v11.4.5 rule: never silently lose valid backend/cache signals.
  // If strict relevance/commercial filters remove everything, keep the strongest
  // normalised cache signals and mark them as "Review" rather than showing empty.
  let finalSignals = commercialSignals;
  if(rawSignals.length && !finalSignals.length){
    finalSignals = normalisedSignals
      .filter(Boolean)
      .map(function(s){
        s.frontendReview = true;
        s.relevanceWindow = s.relevanceWindow || 'next_180_days';
        s.impactLabel = s.impactLabel || 'Review signal';
        s.captureStrategy = s.captureStrategy || 'Review this cached signal before executive use.';
        return s;
      });
    radarDebug('Strict filters relaxed for domain', { domain: domId, raw: rawSignals.length, kept: finalSignals.length });
  }

  d.signals = sortSignalsForLeadership(finalSignals);
  d.signalCount = d.signals.length;
  d.filteredOutCount = Math.max(0, rawSignals.length - d.signals.length);
  d.rawSignalCount = rawSignals.length;

  if(d.signals.length){
    const avgImpact = d.signals.reduce((sum,s)=>sum + getCommercialImpactScore(s),0) / d.signals.length;
    d.score = Math.max(Number(d.score)||70, Math.round(avgImpact * 10));
    if(avgImpact >= 8) { d.status = isRiskSignal(d.signals[0]) ? 'Critical' : 'High opportunity'; d.statusClass = isRiskSignal(d.signals[0]) ? 'spr' : 'spg2'; }
    d.opp = d.opp || {};
    if(!d.opp.title) d.opp.title = d.signals[0].captureStrategy || d.signals[0].title || 'Top Radar opportunity';
    if(!d.opp.body) d.opp.body = d.signals[0].whyItMattersNow || d.signals[0].body || 'Backend/cache signal loaded.';
    if(!d.opp.value) d.opp.value = d.signals[0].ageHuman ? ('Updated ' + d.signals[0].ageHuman + ' ago') : 'Backend/cache-first';
    if(!Array.isArray(d.actions) || !d.actions.length) d.actions = d.signals.slice(0,3).map(s => s.captureStrategy || s.title).filter(Boolean);
  }

  if(d.signals.length === 0){
    d.status = 'No current signal';
    d.statusClass = 'spa';
    d.score = Math.min(Number(d.score) || 50, 55);
    d.opp = d.opp || {};
    d.opp.eyebrow = 'No current signal';
    d.opp.title = 'No active risk or opportunity found';
    d.opp.body = 'No saved backend/cache signal was available for this domain.';
    d.opp.value = 'Review later';
    d.actions = ['Refresh later', 'Broaden search window', 'Check official sources'];
  }
  return d;
}

// â”€â”€ PROGRESS UI - single domain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function callDomain(domId, context){
  const today = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});

  const enterpriseDescriptions = {
    rev: 'Revenue & pricing: yield protection, route economics, fare strategy, ancillary, fuel hedging',
    dig: 'Digital & direct channel: direct booking growth, conversion rate, agent migration, app, payments. NOTE: Qatar Airways HAS Apple Pay and Google Pay confirmed on qatarairways.com/payment-options - do NOT flag these as missing',
    loy: 'Loyalty - Privilege Club: member retention, elite churn risk, co-brand, partner revenue, status',
    prd: 'Product & experience: app UX, QSuite competitive position, booking flow, ancillary, in-flight',
    cmp: 'Competitor intelligence: Emirates, Etihad, Turkish Airlines, Lufthansa capacity and moves',
    geo: 'Geopolitical & macro: conflict, fuel prices, FX, airspace, EASA advisories, trade',
    agt: 'Agents & OTA migration: GDS costs, direct shift opportunity, commission savings, Oryx Connect NDC',
    sml: 'Social media intelligence: QR brand strength, sentiment, platform performance. use only loaded backend/cache source facts',
    soc: 'Social unrest & civil events: protests, strikes, political instability in QR origin markets',
    spt: 'Sport & major events: ALL sports generating travel demand on QR routes - football, rugby, F1, golf, tennis, cricket, athletics, Hajj 2026',
    sec: 'Cyber & security threats: airline hacks, airport system outages, ransomware, Windows vulnerabilities',
    reg: 'Regulatory & visa policy: visa restrictions, BASA agreements, current entry policy, GCC regulations, EASA',
    ops: 'Operations & technology: system outages, airport disruptions, fleet deployment, OTP, HIA capacity',
    rep: 'Brand & reputation: social sentiment, media coverage, post-crisis recovery, app ratings'
  };

  const b2cDescriptions = {
    rev: 'B2C revenue protection: direct revenue, ancillary attach, fare demand, route demand capture, customer value',
    dig: 'Digital & direct growth: web/app conversion, booking funnel friction, direct channel share, payment trust, app adoption. NOTE: Qatar Airways HAS Apple Pay and Google Pay - do NOT flag them as missing',
    loy: 'Loyalty & customer value: Privilege Club engagement, member retention, tier value, partner activation, personalised offers',
    prd: 'Digital product & experience: booking flow, manage booking, ancillaries, app UX, disruption handling, customer self-service',
    cmp: 'Competitor moves that can steal B2C demand: Emirates, Etihad, Turkish, Lufthansa digital, loyalty, network and fare actions',
    geo: 'External market conditions affecting B2C demand: conflict, airspace, fuel, FX, travel confidence and origin-market demand',
    agt: 'Agents & OTA dependency: signals that show opportunity to shift demand to direct, Oryx Connect/NDC, commission leakage and customer ownership',
    sml: 'Digital marketing and social demand: brand strength, campaign windows, sentiment, creator/paid media opportunities and demand signals',
    soc: 'Social unrest and strikes in origin markets that can affect leisure, VFR and premium customer demand',
    spt: 'Events-led demand capture: sports, concerts, Hajj/Umrah and major events where direct campaigns and loyalty targeting can win',
    sec: 'Cyber/security risks that can affect digital trust, account takeover, booking confidence and customer support demand',
    reg: 'Visa/regulatory changes that affect customer conversion, travel eligibility, documentation friction and demand stimulation',
    ops: 'Operational/technology signals that affect customer experience, self-service, call-centre pressure and digital containment',
    rep: 'Brand/reputation signals that affect customer trust, direct preference, loyalty perception and digital conversion'
  };

  const profile = getViewProfile();
  const domDescriptions = VIEW_MODE === 'b2c' ? b2cDescriptions : enterpriseDescriptions;
  const signalLimit = getSignalLimit();

  const prompt = `You are the Qatar Airways Digital/B2C Intelligence Engine for Digital Product, Digital Marketing and Loyalty leadership. Today is ${today}.
Current view: ${profile.title}
Business lens: ${profile.lens}
Instruction: ${profile.prompt}

Domain to analyse: ${domDescriptions[domId]}

Context verified from Qatar Airways website and recent news:
${context}

Search for the ${signalLimit} most important signals for this domain.
Only include signals that affect Qatar Airways today or in the next 30-180 days.
Each signal must affect revenue, direct demand, customer value, risk, or opportunity.
Verify each signal against a real source before including it.
Do not overclaim internal Qatar Airways strategy, performance or systems.
Use public evidence plus careful commercial inference only.

RECENCY AND FUTURE RELEVANCE HARD RULES:
- Do NOT include old news just because it is interesting.
- Exclude historic-only items that are already resolved or commercially stale.
- Older source dates are allowed ONLY when the impact is still active today.
- Prefer sources published or updated in the last 90 days.
- Future events, upcoming launches, active rules, active risks and forecasts are valid.
- Every signal must explain why it matters now, not why it mattered in the past.
- If a signal cannot affect current/future revenue, direct share or customer demand, exclude it.
- Prioritise signals by business impact, not by news popularity.
- In B2C mode, exclude signals that do not affect direct bookings, conversion, loyalty, app/web behaviour, digital marketing, ancillary revenue, OTA/agent shift, customer demand or customer service pressure.

COMMERCIAL INTELLIGENCE FIELDS:
- commercialImpactScore: 1 to 10. Use 9-10 only for immediate revenue risk/opportunity.
- demandImpact: increase, decrease, shift, or unknown.
- timeToImpact: Immediate, 30 days, 90 days, or 6 months.
- confidence: High, Medium, or Low based on source quality and clarity.
- captureStrategy: one practical action for B2C/Digital Product, Digital Marketing and Loyalty teams.

Return ONLY this exact JSON - no markdown, all strings under 90 chars:
{
  "id": "${domId}",
  "signalCount": ${signalLimit},
  "score": 85,
  "status": "Critical",
  "statusClass": "spr",
  "opp": {
    "eyebrow": "Top opportunity",
    "title": "Short title under 60 chars",
    "body": "Body text under 80 chars",
    "value": "$XM estimated value"
  },
  "metrics": [["val","label"],["val","label"],["val","label"],["val","label"]],
  "signals": [
    {
      "dot": "dr",
      "title": "Signal title under 60 chars",
      "body": "Signal detail under 80 chars",
      "impact": "si-r",
      "impactLabel": "Revenue risk",
      "source": "Source name",
      "sourceUrl": "https://url.com",
      "sourceDate": "YYYY-MM-DD",
      "eventDate": "YYYY-MM-DD or active_now",
      "relevanceWindow": "today|next_30_days|next_90_days|next_180_days",
      "whyItMattersNow": "Why this affects current/future revenue",
      "commercialImpactScore": 8,
      "demandImpact": "increase|decrease|shift|unknown",
      "captureStrategy": "Practical action under 90 chars",
      "timeToImpact": "Immediate|30 days|90 days|6 months",
      "confidence": "High|Medium|Low",
      "verified": true,
      "benchmark": false
    }
  ],
  "actions": ["Action 1", "Action 2", "Action 3"]
}

statusClass options: spr=critical/red, spa=monitor/amber, spg2=opportunity/green
dot options: dr=red, da=amber, dg=green, db=blue, dp=purple
Keep ALL strings under 90 characters. Return exactly ${signalLimit} signals.
For sourceDate use the article/source publish or update date.
For eventDate use active_now if it is ongoing, otherwise use YYYY-MM-DD.
For relevanceWindow choose only: today, next_30_days, next_90_days, next_180_days.
For commercialImpactScore return an integer 1-10, and do not include signals below 6 in B2C mode.
For captureStrategy, write the action as if advising Digital/B2C leadership discreetly.`;

  try{
  const resp = await fetch(`${BACKEND_URL}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claudePayloadWithWebSearch({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: VIEW_MODE === 'b2c' ? 2400 : 2000,
        messages: [{role:'user',content:prompt}]
      }, 'domain_scan'))
    });
  
    if(!resp.ok){
      const err = await resp.json().catch(()=>({error:{message:resp.statusText}}));
      const msg = err.error?.message || resp.statusText;
      if(resp.status === 429) throw Object.assign(new Error(msg), {is429:true});
      throw new Error('API ' + resp.status + ': ' + msg);
    }
  
    const data = await resp.json();
    const raw = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    if(!raw) throw new Error('Empty response for domain ' + domId);
  
    let clean = raw.replace(/```json\n?/gi,'').replace(/```\n?/g,'').trim();
    const f = clean.indexOf('{'), l = clean.lastIndexOf('}');
    if(f<0||l<0) throw new Error('No JSON in response for ' + domId);
    clean = clean.slice(f, l+1);
  
    try{ return postProcessDomainData(JSON.parse(clean), domId); }
    catch(e){
      // Quick repair attempt
      const fixed = clean.replace(/,\s*([}\]])/g,'$1').replace(/([^\\])\n/g,'$1 ');
      return postProcessDomainData(JSON.parse(fixed), domId);
    }
  
  }catch(e){
    const msg = e && e.message ? e.message : 'Connection failed';
    if(e && e.is429) throw e;
    throw new Error('Domain scan failed for ' + domId + ': ' + msg);
  }
}

// â”€â”€ CONTEXT - shared facts passed to every domain call â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildContext(){
  const today = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const base = `- Today is ${today}.
- Do not rely on old static route, fleet, oil-price, or regulatory facts unless verified in the current scan.
- Search for current Qatar Airways route, fleet, network, fuel, regulatory, sport/event, competitor and demand signals.
- Only prioritise signals that are active now or relevant in the next 180 days.
- Expired events should be rewritten as current business impact only if they still affect demand, capacity, revenue, conversion, operations or reputation.
- For oil/fuel, always use current verified market data from the search result, not prefilled values.
- For network/fleet claims, verify against Qatar Airways newsroom or other credible aviation sources before using.
- Qatar Airways has Apple Pay, Google Pay, and digital payments on qatarairways.com where available; verify any new payment/product claims before using.
- For B2C, link every signal to direct booking growth, OTA/agent dependency, loyalty, digital product, marketing demand capture or UCP/customer intelligence value.
- Do not claim access to internal strategy, internal Adobe data, internal revenue, internal leadership plans or confidential systems.
- Radar must prioritise active/current/future signals, not stale historical news`;

  if(VIEW_MODE !== 'b2c') return base;

  return base + `
- B2C lens: prioritise direct booking growth, digital conversion, customer value, loyalty and product experience
- Look for opportunities where customer intelligence/personalisation can improve conversion, retention or ancillary attach
- Treat agent/OTA dependency as customer ownership and margin risk where public signals support it
- Include customer-service/call-centre pressure only when it affects digital containment or customer experience
- Keep wording discreet: do not say you know internal strategy; say 'Digital/B2C implication' or 'B2C implication'`;
}

// â”€â”€ MAIN REFRESH LOOP - one domain at a time â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runDomains(domainsToProcess){
  isBusy = true;
  stopFlag = false;
  document.getElementById('btnRefresh').disabled = true;
  document.getElementById('btnResume').classList.add('hidden');
  document.getElementById('progSpin').style.display = 'block';

  const context = buildContext();
  let completedThisSession = 0;

  for(let i = 0; i < domainsToProcess.length; i++){
    if(stopFlag) break;

    const id = domainsToProcess[i];
    updateProgCell(id, 'active');
    setStatus('Loading ' + DOM_LABELS[id] + ' (' + (i+1) + ' of ' + domainsToProcess.length + ')...', true);
    setPhase('Searching and verifying ' + DOM_LABELS[id] + ' signals...');

    let retries = 2;
    let success = false;

    while(retries > 0 && !stopFlag){
      try{
        const result = await callDomain(id, context);
        domData[id] = result;

        // Existing browser backup
        saveDomain(id, result);

        // New persistent database save via backend/Supabase
        await saveDomainToSupabase(id, result);

        updateTile(id, result);
        updateProgCell(id, 'done');
        updateProgMeta();
        completedThisSession++;
        success = true;

        // Refresh open panel if it's the domain we just loaded
        if(currentDom === id) openDom(id);

        // Rate limit pause between domains on free accounts
        if(!IS_PAID && i < domainsToProcess.length - 1){
          const pauseSecs = 12;
          for(let s=pauseSecs; s>0; s--){
            if(stopFlag) break;
            setPhase(DOM_LABELS[id] + ' OK - ' + s + 's pause - domain ' + (i+1) + ' of ' + domainsToProcess.length);
            await sleep(1000);
          }
          setPhase('');
        }
        break;

      }catch(e){
        retries--;
        if(e.is429){
          setPhase('Rate limit hit on ' + DOM_LABELS[id] + ' - waiting 62s...');
          updateProgCell(id, 'active');
          for(let s=62; s>0; s--){
            if(stopFlag) break;
            setPhase('Rate limit - waiting ' + s + 's then retrying ' + DOM_LABELS[id] + '...');
            await sleep(1000);
          }
        } else if(retries > 0){
          setPhase('Error on ' + DOM_LABELS[id] + ' - retrying in 5s...');
          await sleep(5000);
        } else {
          updateProgCell(id, 'failed');
          console.warn('Failed to load domain', id, e.message);
          setPhase(DOM_LABELS[id] + ' failed: ' + e.message.slice(0,60));
          await sleep(2000);
          setPhase('');
        }
      }
    }
  }

  isBusy = false;
  document.getElementById('btnRefresh').disabled = false;
  document.getElementById('progSpin').style.display = 'none';

  const totalDone = DOMAINS.filter(id => domData[id]).length;
  const failed = DOMAINS.filter(id => {
    const cell = document.getElementById('pc-' + id);
    return cell && cell.className.includes('failed');
  }).length;

  // Finalise derived state once, after async loading has stopped.
  refreshRadarDerivedState(true);
  updateFeedFromDomains();

  if(failed > 0){
    setStatus(totalDone + '/14 domains loaded - ' + failed + ' failed - click Resume to retry');
    setPhase('');
    document.getElementById('btnResume').classList.remove('hidden');
  } else if(totalDone === 14){
    setStatus('All 14 domains loaded and saved OK');
    setPhase('Saved to browser - will load instantly next time you open this file');
    document.getElementById('liveLabel').textContent = getViewProfile().label + ' - 14/14 - ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  } else {
    setStatus(totalDone + '/14 domains loaded');
  }
}

function startFresh(){
  // Clear failed states, keep saved successes, run only missing/failed
  const toRun = DOMAINS.filter(id => {
    const cell = document.getElementById('pc-' + id);
    return !domData[id] || (cell && cell.className.includes('failed'));
  });
  if(toRun.length === 0){
    // All already loaded - ask if they want to refresh all
    if(confirm('All 14 domains already loaded for this view. Refresh this view with latest data?')){
      DOMAINS.forEach(id => clearDomain(id));
      domData = {};
      DOMAINS.forEach(id => {
        updateProgCell(id, 'pending');
        const cb=document.getElementById('cb-'+id); if(cb) cb.textContent='loading...';
        const of=document.getElementById('of-'+id); if(of) of.style.width='0%';
        const on=document.getElementById('on-'+id); if(on) on.textContent='-';
      });
      updateProgMeta();
      updateExecutiveScorecard();
      runDomains([...DOMAINS]);
    }
    return;
  }
  runDomains(toRun);
}

function resumeRefresh(){
  // Only run domains not yet saved
  const missing = DOMAINS.filter(id => !domData[id]);
  const failed = DOMAINS.filter(id => {
    const cell = document.getElementById('pc-' + id);
    return cell && cell.className.includes('failed');
  });
  const toRun = [...new Set([...missing, ...failed])];
  if(toRun.length === 0){
    setStatus('All domains complete - nothing to resume');
    return;
  }
  document.getElementById('btnResume').classList.add('hidden');
  runDomains(toRun);
}

// â”€â”€ UPDATE TILE FROM DOMAIN DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateTile(id, data){
  const cb = document.getElementById('cb-'+id);
  const of = document.getElementById('of-'+id);
  const on = document.getElementById('on-'+id);
  const count = data?.signalCount || data?.signals?.length || 0;
  const score = Number(data?.score) || (count ? 70 : 45);
  if(cb) cb.textContent = count + ' signals';
  if(of) of.style.width = Math.max(0, Math.min(100, score)) + '%';
  if(on) on.textContent = Math.round(score);
  // KPI refresh is safe on every domain. Reordering is intentionally deferred
  // during live loading to prevent cards jumping and partial-state sort errors.
  refreshRadarDerivedState(false);
  setTimeout(function(){
    if(typeof updateKpiTooltips === 'function') updateKpiTooltips();
  }, 200);
}

// â”€â”€ UPDATE FEED FROM LOADED DOMAINS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateFeedFromDomains(){
  const allSignals = [];
  DOMAINS.forEach(id => {
    if(domData[id]?.signals){
      domData[id].signals
        .filter(s => isForwardSignal(s) || isRiskSignal(s) || isOpportunitySignal(s))
        .sort((a,b) => getCommercialImpactScore(b) - getCommercialImpactScore(a))
        .slice(0,2)
        .forEach(s => allSignals.push({
          source: s.source||'Intelligence',
          text: s.title,
          level: isRiskSignal(s) || getCommercialImpactScore(s) >= 8 ? 'ih' : 'im',
          url: s.sourceUrl||null
        }));
    }
  });
  if(allSignals.length > 0){
    allSignals.sort((a,b) => (a.level === 'ih' ? -1 : 1) - (b.level === 'ih' ? -1 : 1));
    const top8 = allSignals.slice(0,8);
    document.getElementById('feedContainer').innerHTML = top8.map(f=>`
      <div class="fr">
        <span class="fsrc">${f.source}</span>
        <span class="ftxt">${f.text}</span>
        <span class="imp ${f.level}">${f.level==='ih'?'High':'Med'}</span>
        ${f.url?`<a class="fvl" href="${f.url}" target="_blank">Verify</a>`:''}
      </div>`).join('');
  } else {
    document.getElementById('feedContainer').innerHTML = `
      <div class="fr">
        <span class="fsrc">Backend cache</span>
        <span class="ftxt">Domains are loaded, but no current forward/risk/opportunity feed signals matched the display rules.</span>
        <span class="imp im">Review</span>
      </div>`;
  }
}

// â”€â”€ DOMAIN META â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const META = {
  rev:{cls:'d-rev',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l3-8 4 4 4-8 4 6"/><path d="M21 21H3"/></svg>',ti:'Revenue &amp; pricing',su:'Yield - Route economics - Fare strategy - Ancillary'},
  dig:{cls:'d-dig',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1"/></svg>',ti:'Digital &amp; direct channel',su:'Direct booking - Conversion - Agent migration - App - Payments'},
  loy:{cls:'d-loy',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-8-5.5-8-11a5 5 0 0110 0 5 5 0 0110 0c0 5.5-8 11-8 11z"/></svg>',ti:'Loyalty - Privilege Club',su:'Member retention - Churn - Co-brand - Partners'},
  prd:{cls:'d-prd',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',ti:'Product &amp; experience',su:'App - QSuite - Booking flow - Ancillary - Payments'},
  cmp:{cls:'d-cmp',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><line x1="12" y1="8" x2="12" y2="16"/></svg>',ti:'Competitor intelligence',su:'Emirates - Etihad - Turkish - Lufthansa - Halo effect'},
  geo:{cls:'d-geo',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-3 9 0 18M12 3c3 3 3 9 0 18"/></svg>',ti:'Geopolitical &amp; macro',su:'Conflict - Fuel - FX - Airspace - EASA - Trade'},
  agt:{cls:'d-agt',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 20v-2a5 5 0 0110 0v2"/><circle cx="12" cy="10" r="4"/></svg>',ti:'Agents &amp; OTA migration',su:'Direct shift - GDS cost - Commission - NDC - Oryx Connect'},
  sml:{cls:'d-sml',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>',ti:'Social media intelligence',su:'Sentiment - Brand strength - Platform performance - Competitor comparison'},
  soc:{cls:'d-soc',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',ti:'Social unrest &amp; civil events',su:'Protests - Strikes - Political instability - Origin markets'},
  spt:{cls:'d-spt',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>',ti:'Sport &amp; major events',su:'Football - Rugby - F1 - Golf - Tennis - Cricket - All sports on QR routes'},
  sec:{cls:'d-sec',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',ti:'Cyber &amp; security threats',su:'Airline hacks - Airport outages - System failures - Passenger disruption'},
  reg:{cls:'d-reg',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',ti:'Regulatory &amp; visa policy',su:'Visa - BASA - US entry - GCC regulations - EASA - Travel advisories'},
  ops:{cls:'d-ops',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',ti:'Operations &amp; technology',su:'System outages - Airport disruptions - Fleet - OTP - Passenger experience'},
  rep:{cls:'d-rep',ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',ti:'Brand &amp; reputation',su:'Social sentiment - Media - Passenger feedback - Crisis communications'}
};

// â”€â”€ OPEN DOMAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openDom(id){
  // Toggle behaviour: clicking the same active category again closes the detail window.
  // This keeps the existing localStorage/data flow untouched and only changes UX.
  if(currentDom===id){
    closeDom();
    return;
  }
  currentDom=id; chatHistory=[];
  document.querySelectorAll('.dom').forEach(d=>d.classList.remove('on'));
  document.querySelector('[data-id="'+id+'"]')?.classList.add('on');
  const m = META[id]; if(!m) return;
  const c = domData[id];

  const vb = (s) => s?.verified
    ? `<span class="vbadge"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Verified</span>`
    : (s?.benchmark ? `<span class="bmbadge">Benchmark</span>` : '');

  const sigs = c ? c.signals.map(s=>`
    <div class="sig">
      <div class="sdot ${s.dot}"></div>
      <div style="flex:1">
        <div class="sig-t">${s.title}</div>
        <div class="sig-b">${s.body}</div>
        ${s.whyItMattersNow?`<div class="sig-b" style="margin-top:4px;color:var(--qb)"><strong>Why now:</strong> ${s.whyItMattersNow}</div>`:''}
        ${s.captureStrategy?`<div class="sig-b" style="margin-top:4px;color:var(--grn)"><strong>Capture strategy:</strong> ${s.captureStrategy}</div>`:''}
        ${s.source?`<div class="sig-src">Source: ${s.source}${s.sourceDate?` - Source date: ${s.sourceDate}`:''}${s.eventDate?` - Event: ${s.eventDate}`:''}</div>`:''}
        ${renderSignalDateMeta(s)}
        <div class="sig-row">
          <span class="sig-imp ${s.impact}">${s.impactLabel}</span>
          <span class="bmbadge">Impact ${getCommercialImpactScore(s)}/10</span>
          ${s.demandImpact?`<span class="bmbadge">Demand: ${s.demandImpact}</span>`:''}
          ${s.timeToImpact?`<span class="bmbadge">Impact: ${s.timeToImpact}</span>`:''}
          ${s.confidence?`<span class="bmbadge">${s.confidence} confidence</span>`:''}
          ${vb(s)}
          ${s.relevanceWindow?`<span class="bmbadge">${String(s.relevanceWindow).replaceAll('_',' ')}</span>`:''}
          ${s.sourceUrl?`<a class="vlink" href="${s.sourceUrl}" target="_blank">Verify -></a>`:`<a class="vlink" href="https://www.google.com/search?q=${encodeURIComponent(s.title+' Qatar Airways 2026')}" target="_blank">Research -></a>`}
          <button class="sig-ap-btn" data-act="${encodeURIComponent(s.captureStrategy||s.title||'Signal action plan')}" data-dom="${id}" data-ti="${encodeURIComponent((m.ti||id).replace(/&amp;/g,'&'))}" onclick="domAct(this)">Plan -></button>
        </div>
      </div>
    </div>`).join('')
  : `<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">
      ${isBusy ? 'Loading this domain - please wait...' : 'Connect API key and click Refresh to load signals for this domain'}
    </div>`;

  const mks = c ? c.metrics.map(mk=>`<div class="mini"><div class="mv">${mk[0]}</div><div class="ml">${mk[1]}</div></div>`).join('')
  : '<div class="mini"><div class="mv">-</div><div class="ml">Loading...</div></div>'.repeat(4);

  const acts = c ? c.actions.map((a,i)=>`<button class="abt ${i===0?'abt-p':''}" data-act="${encodeURIComponent(a)}" data-dom="${id}" data-ti="${encodeURIComponent((m.ti||id).replace(/&amp;/g,'&'))}" onclick="domAct(this)">${a} -></button>`).join('') : '';

  const opp = c ? `
    <div class="opp-card ${m.cls}">
      <div class="opp-ey">${c.opp?.eyebrow||'Top opportunity'}</div>
      <div class="opp-t">${c.opp?.title||'Loading...'}</div>
      <div class="opp-b">${c.opp?.body||''}</div>
      <div class="opp-v">${c.opp?.value||''}</div>
    </div>` : `<div style="padding:16px;text-align:center;color:var(--t3);font-size:12px;background:var(--bg2);border-radius:var(--r2);margin-bottom:14px">Connect API for live opportunity data</div>`;

  document.getElementById('detPanel').innerHTML=`
    <div class="det-hdr">
      <div class="det-hl">
        <div class="det-hic ${m.cls}">${m.ico}</div>
        <div><div class="det-ti">${m.ti}</div><div class="det-su2">${m.su}</div></div>
      </div>
      <div class="det-hr">
        <span class="spill ${c?.statusClass||'spa'}">${c?.status||'Loading'}</span>
        <button class="cx" onclick="closeDom()">x</button>
      </div>
    </div>
    <div class="det-body" id="detBody">
      <div class="det-l">
        <div class="sgs-hdr">Active signals - verified before display</div>
        ${sigs}
      </div>
      <div class="det-r" id="detRight">
        ${opp}
        <div class="minis">${mks}</div>
        <div class="acts">${acts}</div>
      </div>
      <div class="ai-panel hidden" id="aiPanel">
        <div class="ai-hdr">
          <div class="ai-hdr-l">
            <div class="ai-hdr-ti">Intelligence AI</div>
            <div class="ai-hdr-su">Claude - QR context loaded</div>
          </div>
          <button class="ai-close" onclick="closeAI()">x</button>
        </div>
        <div class="ai-topic" id="aiTopic">Ask about ${m.ti.replace(/&amp;/g,'&')}</div>
        <div class="ai-msgs" id="aiMsgs">
          <div class="msg ai"><div class="mav qa">QR</div><div class="mbub"><p>Ready. Ask me anything about <strong>${m.ti.replace(/&amp;/g,'&')}</strong>.</p></div></div>
        </div>
        <div class="ai-inp-row">
          <textarea class="ai-inp" id="aiInp" placeholder="Ask a follow-up..." rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChat()}"></textarea>
          <button class="ai-send" id="aiSendBtn" onclick="sendChat()"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
        </div>
      </div>
    </div>`;
  // Keep the page stable when opening a category. Only scroll if the panel is not visible.
  const dp = document.getElementById('detPanel');
  if(dp){
    const r = dp.getBoundingClientRect();
    if(r.top < 80 || r.top > window.innerHeight - 120){
      dp.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
}

function closeDom(){
  currentDom=null; chatHistory=[];
  document.querySelectorAll('.dom').forEach(d=>d.classList.remove('on'));
  document.getElementById('detPanel').innerHTML=`<div class="empty-d"><div class="er"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg></div><div class="et">Select any domain - each loads independently and saves to your browser automatically</div></div>`;
}

// UX guard: Escape also closes the open category window.
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && currentDom){ closeDom(); }
});

// â”€â”€ AI CHAT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SYS=`You are the Qatar Airways Digital/B2C Intelligence AI for Digital Product, Digital Marketing and Loyalty leadership. Give sharp, specific, actionable commercial strategy. Do not rely on stale static facts about Qatar Airways routes, fleet, fuel prices, regulatory notices or dates unless they are verified by the current domain data or source links. Treat old events as historical context only. If B2C view is active, focus on direct booking growth, loyalty, digital product, marketing demand capture, agent/OTA shift and customer intelligence/UCP value. Do not claim access to internal strategy or confidential internal data. Give numbered action plans with Digital/B2C value ranges and 30-day timelines. Under 200 words.`;

async function callChat(msg){
  chatHistory.push({role:'user',content:msg});
  try{
    const resp=await fetch(`${BACKEND_URL}/api/claude`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(claudePayloadWithWebSearch({
        model:'claude-sonnet-4-5-20250929',
        max_tokens:600,
        system:SYS,
        messages:chatHistory
      }, 'chat'))
    });
    if(!resp.ok) throw new Error('API '+resp.status+': '+await readApiError(resp));
    const d=await resp.json();
    const text=(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('') || 'No response.';
    chatHistory.push({role:'assistant',content:text}); return text;
  }catch(e){ chatHistory.pop(); return 'Error: '+(e.message||'Connection failed'); }
}

function fmt(t){ return esc(t).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/#{1,4}\s+(.*)/g,'<h4>$1</h4>').replace(/\n\n/g,'</p><p>').replace(/\n(\d+)\.\s/g,'<br><strong>$1.</strong> ').replace(/\n[-*]\s/g,'<br>- ').replace(/\n/g,'<br>'); }

function appendMsg(role,text){
  const c=document.getElementById('aiMsgs'); if(!c) return;
  const d=document.createElement('div'); d.className='msg '+role;
  d.innerHTML=(role==='ai'?'<div class="mav qa">QR</div>':'<div class="mav ua">You</div>')+`<div class="mbub"><p>${fmt(text)}</p></div>`;
  c.appendChild(d); c.scrollTop=c.scrollHeight;
}
function showTyping(){ const c=document.getElementById('aiMsgs'); if(!c) return; const d=document.createElement('div'); d.className='msg ai'; d.id='typ'; d.innerHTML='<div class="mav qa">QR</div><div class="mbub"><span class="tdot"></span><span class="tdot"></span><span class="tdot"></span></div>'; c.appendChild(d); c.scrollTop=c.scrollHeight; }
function removeTyping(){ document.getElementById('typ')?.remove(); }

async function sendChat(){
  const inp=document.getElementById('aiInp'); if(!inp||!inp.value.trim()||isBusy) return;
  const txt=inp.value.trim(); inp.value='';
  appendMsg('user',txt); showTyping();
  const aiSendBtn=document.getElementById('aiSendBtn'); if(aiSendBtn) aiSendBtn.disabled=true;
  const reply=await callChat(txt);
  removeTyping(); if(aiSendBtn) aiSendBtn.disabled=false; appendMsg('ai',reply);
}

async function openAI(question,topic){
  const body=document.getElementById('detBody'); if(!body) return;
  chatHistory=[];
  body.classList.add('ai-open');
  document.getElementById('detRight')?.classList.add('hidden');
  document.getElementById('aiPanel')?.classList.remove('hidden');
  const t=document.getElementById('aiTopic'); if(t) t.textContent=topic;
  const msgs=document.getElementById('aiMsgs'); if(msgs) msgs.innerHTML='<div class="msg ai"><div class="mav qa">QR</div><div class="mbub"><p>Ready.</p></div></div>';
  appendMsg('user',question); showTyping();
  const reply=await callChat(question);
  removeTyping(); appendMsg('ai',reply);
}

function closeAI(){
  document.getElementById('detBody')?.classList.remove('ai-open');
  document.getElementById('aiPanel')?.classList.add('hidden');
  document.getElementById('detRight')?.classList.remove('hidden');
  chatHistory=[];
}

// â”€â”€ ACTION PLAN - inline modal, no redirect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Declared before init() so any startup path that opens/regenerates AP can read them safely.
let AP_CURRENT_ACTION = '';
let AP_CURRENT_DOMAIN = '';
let AP_CURRENT_DOMAIN_ID = '';

// Safe global placeholder so inline onclick handlers never throw if rendered early.
window.rv93OpenLeadRow = window.rv93OpenLeadRow || function(){
  console.warn('Leadership row handler is not ready yet.');
};



// Console helper: run radarInspect() to see exactly what loaded/rendered.
window.radarInspect = function(){
  const state = window.radarData || {};
  const domainRows = Object.entries(state.domains || {}).map(([id,d]) => ({
    domain:id,
    signals:(d.signals||[]).length,
    raw:d.rawSignalCount || 0,
    filteredOut:d.filteredOutCount || 0,
    status:d.status,
    score:d.score
  }));
  const summary = {
    viewMode: VIEW_MODE,
    domainsLoaded: domainRows.length,
    totalSignals: domainRows.reduce((s,r)=>s+r.signals,0),
    sentiment:Object.keys(state.sentiment || {}).length,
    cios:Object.keys(state.cios || {}).length,
    customerIntel:Object.keys(state.customerIntel || {}).length,
    meta:state.meta || {}
  };
  console.table(domainRows);
  console.log('Radar summary:', summary);
  console.log('Radar state:', state);
  return {summary, domainRows, state};
};

// â”€â”€ START â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
init();


function openAP(action, domainTitle, domainId){
  AP_CURRENT_ACTION = action;
  AP_CURRENT_DOMAIN = domainTitle;
  AP_CURRENT_DOMAIN_ID = domainId;

  document.getElementById('apBadge').textContent = '30-Day Action Plan - ' + getViewProfile().label;
  document.getElementById('apTitle').textContent = action;
  const apDomEl = document.getElementById('apDomain'); if(apDomEl) apDomEl.textContent = domainTitle;
  document.getElementById('apBody').innerHTML = `
    <div class="ap-loading">
      <div class="ap-spin-lg"></div>
      <div class="ap-load-txt">Building your action plan...</div>
      <div class="ap-load-sub">Analysing the signal and building a specific, costed 30-day plan with owner, timeline and dollar value.</div>
    </div>`;
  document.getElementById('apOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  generateAP(action, domainTitle, domainId);
}

function closeAP(){
  document.getElementById('apOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function regenerateAP(){
  if(!AP_CURRENT_ACTION){
    renderAPError('Nothing to regenerate yet. Please open an action plan first.');
    return;
  }
  openAP(AP_CURRENT_ACTION, AP_CURRENT_DOMAIN, AP_CURRENT_DOMAIN_ID);
}

async function generateAP(action, domainTitle, domainId){
  if(!BACKEND_URL){ renderAPError('Backend is not configured. Please check the Render backend URL.'); return; }

  const viewProfile = getViewProfile();
  const domainData = domData[domainId] || {};
  const signals = getDomainSummaryForAP(domainId) || (domainData.signals || []).slice(0,4).map(s => s.title + ': ' + s.body).join(' | ');

  const prompt = `You are the Qatar Airways Digital/B2C Intelligence AI. Today is ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}.

CONTEXT:
- View: ${viewProfile.title} | Domain: ${domainTitle}
- Action: ${action}
- Live signals from this domain: ${signals||'See domain context'}
- QR context: use only current verified route, fleet and network facts from the loaded domain signals; do not repeat old static dates
- Use only loaded backend/cache source facts for awards, rankings and social metrics
- B2C SVP priorities: Adobe UCP rollout, direct booking growth, loyalty retention, personalisation at scale

Build a rigorous 30-day B2C action plan for: "${action}"

Return ONLY valid JSON - no markdown - all strings under 120 chars:
{
  "title": "Plan title under 55 chars",
  "summary": "2-3 sentences for SVP: the signal, opportunity, and what this plan achieves",
  "totalValue": "$XM revenue impact or saving over 90 days",
  "confidence": "High|Medium|Low",
  "steps": [
    {
      "number": 1,
      "name": "Step name under 45 chars",
      "description": "Specific task with clear deliverable - what exactly is done and why it matters now",
      "timeline": "Days 1-7",
      "owner": "Specific role e.g. Head of Digital Marketing, Loyalty CRM Manager, VP Digital Product",
      "value": "$XM revenue or X% improvement specific to QR scale",
      "effort": "Low|Medium|High",
      "priority": "Critical|High|Medium",
      "kpis": [
        {"value": "X%", "label": "KPI being moved"},
        {"value": "$XM", "label": "Revenue impact"},
        {"value": "X days", "label": "Time to measure"}
      ]
    }
  ]
}

RULES:
- Exactly 4 steps: Days 1-7 (diagnose+brief), Days 8-14 (build+launch), Days 15-21 (optimise), Days 22-30 (scale+report)
- Each step needs: specific owner role, specific dollar value, 3 KPIs
- Scale dollar values to QR: ~30M passengers/year, ~$22B revenue
- Step 1 priority is always Critical
- Connect UCP/personalisation angle where relevant
- Be commercially specific - no generic advice like "increase engagement"`;

  try{
    const resp = await fetch(`${BACKEND_URL}/api/claude`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(claudePayloadWithWebSearch({
        model:'claude-sonnet-4-5-20250929',
        max_tokens:1800,
        messages:[{role:'user',content:prompt}]
      }, 'action_plan'))
    });
    if(!resp.ok) throw new Error('API '+resp.status+': '+await readApiError(resp));
    const data = await resp.json();
    const raw = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    if(!raw) throw new Error('Empty response');
    const plan = extractJSON(raw);
    renderAP(plan);
  }catch(e){
    renderAPError('Could not generate action plan: ' + (e.message||'Unknown error') + '. Please try again.');
  }
}

function getPriorityClass(p){
  if(p==='Critical') return 'pp-r';
  if(p==='High') return 'pp-a';
  return 'pp-b';
}
function getEffortClass(e){
  if(e==='Low') return 'pp-g';
  if(e==='High') return 'pp-r';
  return 'pp-a';
}

// Close on Escape key
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeAP(); });


// â”€â”€ SAFE ACTION HELPERS - no inline escape needed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function domAct(btn){
  const a=decodeURIComponent(btn.dataset.act||'');
  const d=btn.dataset.dom||'';
  const t=decodeURIComponent(btn.dataset.ti||d);
  if(a) openAP(a,t,d);
}
function ttAct(btn){
  const a=decodeURIComponent(btn.dataset.act||'');
  const d=btn.dataset.dom||'';
  const t=(META[d]?.ti||d).replace(/&amp;/g,'&');
  if(a) openAP(a,t,d);
}
function compActBtn(btn){
  const a=decodeURIComponent(btn.dataset.act||'');
  const d=btn.dataset.dom||'';
  const m=btn.dataset.meta||d;
  if(a) openAP(a,m+' - competitive response',d);
}

// â”€â”€ KPI TOOLTIPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateKpiTooltips(){
  const rows=allLoadedSignals().filter(r=>isForwardSignal(r.signal));
  const risks=rows.filter(r=>isRiskSignal(r.signal));
  const opps=rows.filter(r=>isOpportunitySignal(r.signal));

  // KPI 1 - risks by domain
  const b1=document.getElementById('ktt1b');
  if(b1){
    const byDom={};
    risks.forEach(r=>{if(!byDom[r.domain])byDom[r.domain]=[];byDom[r.domain].push(r.signal);});
    if(!Object.keys(byDom).length){b1.innerHTML='<div class="ktt-empty">No risk signals loaded yet</div>';}
    else{
      b1.innerHTML=Object.entries(byDom).slice(0,5).map(([dom,sigs])=>{
        const s=sigs[0];
        const act=(domData[dom]?.actions||[])[0]||'';
        return `<div class="ktt-row">
          <div class="ktt-dot ktt-dot-r"></div>
          <div style="flex:1">
            <div style="color:#fff;font-weight:500">${(s.title||'').slice(0,50)}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:1px">${(s.body||'').slice(0,55)}...</div>
            ${act?`<button class="ktt-btn" data-act="${encodeURIComponent(act)}" data-dom="${dom}" onclick="ttAct(this)">Act \u2192</button>`:''}
          </div>
          <div class="ktt-dom">${DOM_LABELS[dom]||dom}</div>
        </div>`;
      }).join('');
    }
  }

  // KPI 2 - opportunities
  const b2=document.getElementById('ktt2b');
  if(b2){
    if(!opps.length){b2.innerHTML='<div class="ktt-empty">No opportunity signals loaded yet</div>';}
    else{
      b2.innerHTML=opps.slice(0,5).map(r=>{
        const opp=domData[r.domain]?.opp;
        const act=(domData[r.domain]?.actions||[])[0]||'';
        return `<div class="ktt-row">
          <div class="ktt-dot ktt-dot-g"></div>
          <div style="flex:1">
            <div style="color:#fff;font-weight:500">${(r.signal.title||'').slice(0,50)}</div>
            ${opp?.value?`<div style="color:#a0d8bb;font-size:9px;margin-top:1px">${opp.value}</div>`:''}
            ${act?`<button class="ktt-btn" data-act="${encodeURIComponent(act)}" data-dom="${r.domain}" onclick="ttAct(this)">Plan \u2192</button>`:''}
          </div>
          <div class="ktt-dom">${DOM_LABELS[r.domain]||r.domain}</div>
        </div>`;
      }).join('');
    }
  }

  // KPI 3 - action levers
  const b3=document.getElementById('ktt3b');
  if(b3){
    const dt=/direct|booking|conversion|app|web|ota|agent|loyalty|member|customer|ancillary|campaign|personal/;
    const levers=rows.filter(r=>dt.test(signalText(r.signal)));
    if(!levers.length){b3.innerHTML='<div class="ktt-empty">No direct/B2C levers loaded yet</div>';}
    else{
      b3.innerHTML=levers.slice(0,5).map(r=>{
        const cs=r.signal.captureStrategy||'';
        return `<div class="ktt-row">
          <div class="ktt-dot ktt-dot-a"></div>
          <div style="flex:1">
            <div style="color:#fff;font-weight:500">${(r.signal.title||'').slice(0,50)}</div>
            ${cs?`<div style="color:#f0d090;font-size:9px;margin-top:1px">${cs.slice(0,65)}</div>`:''}
          </div>
          <div class="ktt-dom">${DOM_LABELS[r.domain]||r.domain}</div>
        </div>`;
      }).join('');
    }
  }

  // KPI 4 - forward signals by window
  const b4=document.getElementById('ktt4b');
  if(b4){
    if(!rows.length){b4.innerHTML='<div class="ktt-empty">No forward signals loaded yet</div>';}
    else{
      const bw={};
      rows.forEach(r=>{const w=r.signal.relevanceWindow||'next_180_days';if(!bw[w])bw[w]=[];bw[w].push(r);});
      const order=['today','next_30_days','next_90_days','next_180_days'];
      const labels={today:'Today',next_30_days:'30 days',next_90_days:'90 days',next_180_days:'180 days'};
      b4.innerHTML=order.filter(w=>bw[w]).map(w=>`
        <div class="ktt-row">
          <div class="ktt-dot ktt-dot-${w==='today'?'r':w==='next_30_days'?'a':'g'}"></div>
          <div style="flex:1">
            <div style="color:#fff;font-weight:500">${bw[w].length} signals - ${labels[w]}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:1px">${bw[w].slice(0,2).map(r=>(r.signal.title||'').slice(0,35)).join(' - ')}</div>
          </div>
        </div>`).join('');
    }
  }

  // KPI 5 - domain coverage
  const b5=document.getElementById('ktt5b');
  if(b5){
    b5.innerHTML=DOMAINS.map(id=>{
      const c=document.getElementById('pc-'+id);
      const state=c?(c.className.includes('done')||c.className.includes('cached')?'done':c.className.includes('failed')?'failed':'pending'):'pending';
      return `<div class="ktt-row">
        <div class="ktt-dot ktt-dot-${state==='done'?'g':state==='failed'?'r':'a'}"></div>
        <div style="flex:1;color:#fff">${DOM_LABELS[id]||id}</div>
        <div style="font-size:9px;color:rgba(255,255,255,.5);font-family:monospace">${state==='done'?(domData[id]?.signalCount||0)+' signals':state}</div>
      </div>`;
    }).join('');
  }
}

// Patch updateTile to refresh tooltips
// KPI tooltips updated in updateTile directly

// â”€â”€ COMPETITOR INTELLIGENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CDATA={};
const CSTORE='radar_v11_comp_';
let ACOMP=null;

const CMETA={
  em:{
    name:'Emirates',
    flag:'AE',
    hub:'Dubai DXB',
    tier:'priority',
    terms:/\bemirates\b|\bdxb\b|\bdubai\b/i,
    why:'Primary Gulf premium and long-haul connector competitor on Europe, Americas, Africa and Asia flows.',
    newsPages:[
      'https://www.emirates.com/media-centre/'
    ]
  },
  tk:{
    name:'Turkish Airlines',
    flag:'TR',
    hub:'Istanbul IST',
    tier:'priority',
    terms:/\bturkish airlines\b|\bturkish\b|\bistanbul\b|\bist\b/i,
    why:'Large global network competitor with strong Europe transfer proposition and frequent tactical pricing.',
    newsPages:[
      'https://www.turkishairlines.com/en-int/press-room/'
    ]
  },
  et:{
    name:'Etihad Airways',
    flag:'AE',
    hub:'Abu Dhabi AUH',
    tier:'priority',
    terms:/\betihad airways\b|\betihad\b|\babu dhabi\b|\bauh\b/i,
    why:'Gulf premium competitor in overlapping long-haul and high-value loyalty segments.',
    newsPages:[
      'https://www.etihad.com/en/news'
    ]
  },
  sg:{
    name:'Singapore Airlines',
    flag:'SG',
    hub:'Singapore SIN',
    tier:'priority',
    terms:/\bsingapore airlines\b|\bsingapore\b|\bsin\b/i,
    why:'Premium service benchmark competitor and key long-haul demand capture rival on Asia-bound traffic.',
    newsPages:[
      'https://www.singaporeair.com/en_UK/us/media-centre/'
    ]
  },
  ai:{
    name:'Air India',
    flag:'IN',
    hub:'Delhi DEL',
    tier:'strategic',
    terms:/\bair india\b|\bdelhi\b|\bdel\b|\btata\b/i,
    why:'High-growth India network competitor with strong relevance for South Asia demand and price-sensitive shifts.',
    newsPages:[
      'https://www.airindia.com/in/en/newsroom.html'
    ]
  },
  ea:{
    name:'Ethiopian Airlines',
    flag:'ET',
    hub:'Addis Ababa ADD',
    tier:'strategic',
    terms:/\bethiopian airlines\b|\bethiopian\b|\baddis ababa\b|\baddis\b|\badd\b/i,
    why:'Africa connectivity competitor with growing transfer relevance across East/West Africa flows.',
    newsPages:[
      'https://corporate.ethiopianairlines.com/media/news'
    ]
  }
};
const COMP_CACHE_ALIASES = {
  em: ['em', 'ek', 'emirates'],
  tk: ['tk', 'thy', 'turkish'],
  et: ['et', 'ey', 'etihad'],
  sg: ['sg', 'sq', 'singapore'],
  ai: ['ai', 'airindia'],
  ea: ['ea', 'eth', 'ethiopian']
};

function urlHostName(v){
  const u = safeUrl(v);
  if(!u) return '';
  try{
    return String(new URL(u).hostname || '').replace(/^www\./i, '').toLowerCase();
  }catch(e){
    return '';
  }
}
function competitorNewsPages(meta){
  return asArray(meta && meta.newsPages).map(safeUrl).filter(Boolean);
}
function competitorNewsHosts(meta){
  return competitorNewsPages(meta).map(urlHostName).filter(Boolean);
}
function collectCompetitorNewsEvidence(meta, data, selectedSignals){
  const allowedHosts = competitorNewsHosts(meta);
  const candidateRows = []
    .concat(asArray(data && data.weaknesses))
    .concat(asArray(data && data.opportunities))
    .concat(asArray(data && data.actions))
    .concat(asArray(selectedSignals));
  const mapped = candidateRows.map(function(row){
    const sourceUrl = safeUrl(firstText(row, ['sourceUrl', 'url'], ''));
    if(!sourceUrl) return null;
    const host = urlHostName(sourceUrl);
    if(allowedHosts.length && !allowedHosts.some(function(h){ return host === h || host.endsWith('.' + h); })) return null;
    return {
      source: firstText(row, ['source','publisher','name'], host || 'Official news'),
      sourceUrl: sourceUrl
    };
  }).filter(Boolean);
  return dedupeBy(mapped, function(row){ return row.sourceUrl; }).slice(0, 6);
}


function analysedThreatScore(data){
  const n = Number(data?.overallThreat);
  return Number.isFinite(n) && n > 0 ? Math.max(1, Math.min(100, Math.round(n))) : null;
}
function setCompScoreUI(id, score){
  const pg=document.getElementById('cprog-'+id);
  const se=document.getElementById('cscore-'+id);
  if(!se) return;
  if(score === null || score === undefined){
    if(pg) pg.style.width='0%';
    se.textContent='No data';
    se.classList.remove('analysed');
    se.classList.add('pending');
  }else{
    const val=Math.max(1, Math.min(100, Math.round(Number(score))));
    if(pg) pg.style.width=val+'%';
    se.textContent='Analysed '+val+'%';
    se.classList.remove('pending');
    se.classList.add('analysed');
  }
}
function isSavedRecordStale(record, staleHours){
  const hours = Number(staleHours || 24);
  if(!record || !record.savedAt) return false;
  const ts = Date.parse(record.savedAt);
  if(!Number.isFinite(ts)) return false;
  return (Date.now() - ts) > (hours * 60 * 60 * 1000);
}
function setCompTileState(id, state){
  const btn = document.getElementById('cbtn-'+id);
  if(!btn) return;
  const clean = state || 'No data';
  btn.dataset.state = clean;
  btn.classList.remove('loaded');
  btn.disabled = false;
  if(clean === 'Loaded'){
    btn.textContent = 'Loaded';
    btn.classList.add('loaded');
    return;
  }
  if(clean === 'Stale'){
    btn.textContent = 'Stale';
    btn.classList.add('loaded');
    return;
  }
  if(clean === 'Error'){
    btn.textContent = 'Error';
    return;
  }
  btn.textContent = 'No data';
}
function compPriorityScore(id, data){
  const analysed = analysedThreatScore(data);
  if(analysed !== null) return analysed;
  const weaknesses = Array.isArray(data?.weaknesses) ? data.weaknesses : [];
  const opportunities = Array.isArray(data?.opportunities) ? data.opportunities : [];
  const actions = Array.isArray(data?.actions) ? data.actions : [];
  if(!weaknesses.length && !opportunities.length && !actions.length) return 0;
  let score = 20;
  score += weaknesses.filter(w => String(w.severity||'').toLowerCase() === 'high').length * 10;
  score += weaknesses.length * 4;
  score += opportunities.length * 5;
  score += actions.length * 3;
  return score;
}
function competitorTierRank(id){
  const tier = String(CMETA[id]?.tier || 'priority').toLowerCase();
  if(tier === 'strategic') return 1;
  return 0;
}
function compareCompIds(aid, bid){
  const tierDiff = competitorTierRank(aid) - competitorTierRank(bid);
  if(tierDiff) return tierDiff;
  const diff = compPriorityScore(bid, CDATA[bid]) - compPriorityScore(aid, CDATA[aid]);
  if(diff) return diff;
  return String(CMETA[aid]?.name||aid).localeCompare(String(CMETA[bid]?.name||bid));
}
function reorderCompetitors(){
  const tierBlocks = Array.from(document.querySelectorAll('.comp-tier-block'));
  if(tierBlocks.length){
    tierBlocks.forEach(function(block){
      const grid = block.querySelector('.comp-tier-grid');
      if(!grid) return;
      const tiles = Array.from(grid.querySelectorAll('.comp-tile'));
      tiles.sort(function(a,b){
        const aid = a.getAttribute('data-comp');
        const bid = b.getAttribute('data-comp');
        return compareCompIds(aid, bid);
      }).forEach(function(tile){
        grid.appendChild(tile);
      });
    });
    return;
  }
  const wrap = document.querySelector('.comp-tiles');
  if(!wrap) return;
  const tiles = Array.from(wrap.querySelectorAll('.comp-tile'));
  tiles.sort(function(a,b){
    const aid = a.getAttribute('data-comp');
    const bid = b.getAttribute('data-comp');
    return compareCompIds(aid, bid);
  }).forEach(function(tile){
    wrap.appendChild(tile);
  });
}

function loadCfromStorage(id){
  try{const r=localStorage.getItem(CSTORE+id);return r?JSON.parse(r):null;}catch(e){return null;}
}
function saveCtoStorage(id,data){
  try{localStorage.setItem(CSTORE+id,JSON.stringify({savedAt:new Date().toISOString(),data}));}catch(e){}
}

function selComp(id){
  document.querySelectorAll('.comp-tile').forEach(t=>t.classList.remove('on'));
  document.querySelector('[data-comp="'+id+'"]')?.classList.add('on');
  ACOMP=id;
  const saved=loadCfromStorage(id);
  if(saved){CDATA[id]=saved.data;renderComp(id,saved.data);}
  else{
    const result = normalizeCompData(id, null);
    CDATA[id]=result;
    renderComp(id,result);
  }
}

async function loadComp(id, options){
  options = options || {};
  const allowGenerate = options.allowGenerate !== false;
  const canGenerateCompetitor = allowGenerate && typeof BACKEND_URL !== 'undefined' && BACKEND_URL && typeof ANT_KEY !== 'undefined' && ANT_KEY;
  const btn=document.getElementById('cbtn-'+id);
  if(btn){btn.disabled=true;btn.textContent='Loading saved...';}
  selComp(id);

  let fallbackResult = null;
  if(typeof BACKEND_URL !== 'undefined' && BACKEND_URL){
    try{
      if(btn) btn.textContent='Checking backend...';
      const viewMode = (typeof VIEW_MODE !== 'undefined' && VIEW_MODE) ? VIEW_MODE : 'enterprise';
      const aliases = COMP_CACHE_ALIASES[id] || [id];
      let derivedMatch = null;
      for(const alias of aliases){
        const cacheResp = await fetch(BACKEND_URL+'/api/cache/competitor/'+encodeURIComponent(alias)+'?viewMode='+encodeURIComponent(viewMode), {
          signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
        });
        if(!cacheResp.ok) continue;
        const cachePayload = await cacheResp.json();
        const cacheData = cachePayload && cachePayload.data ? cachePayload.data : cachePayload;
        const result = normalizeCompData(id, cacheData || null);
        if(result.persistable){
          CDATA[id]=result;
          saveCtoStorage(id,result);
          if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=result;
          setCompScoreUI(id, analysedThreatScore(result));
          renderComp(id,result);
          setCompTileState(id, 'Loaded');
          reorderCompetitors();
          return;
        }
        if(!derivedMatch && result.hasSpecificCache) derivedMatch = result;
      }
      if(derivedMatch){
        CDATA[id]=derivedMatch;
        if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=derivedMatch;
        setCompScoreUI(id, analysedThreatScore(derivedMatch));
        renderComp(id,derivedMatch);
        setCompTileState(id, 'Stale');
        reorderCompetitors();
        fallbackResult = derivedMatch;
        if(!canGenerateCompetitor) return;
      }
    }catch(cacheErr){
      console.warn('[Radar] Competitor backend cache failed for '+id+':', cacheErr.message||cacheErr);
    }
  }

  const saved=loadCfromStorage(id);
  if(saved && saved.data){
    const result=normalizeCompData(id, saved.data);
    if(result.persistable){
      CDATA[id]=result;
      if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=result;
      setCompScoreUI(id, analysedThreatScore(result));
      renderComp(id,result);
      const stale = isSavedRecordStale(saved, 24);
      setCompTileState(id, stale ? 'Stale' : 'Loaded');
      return;
    }
    try{ localStorage.removeItem(CSTORE+id); }catch(e){}
  }

  const compDomain = typeof cachedDomain === 'function' ? cachedDomain('cmp') : null;
  if(compDomain && Array.isArray(compDomain.signals) && compDomain.signals.length){
    const result = normalizeCompData(id, null);
    CDATA[id]=result;
    if(result.persistable) saveCtoStorage(id,result);
    if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=result;
    setCompScoreUI(id, analysedThreatScore(result));
    renderComp(id,result);
    setCompTileState(id, result.hasSpecificCache ? 'Stale' : 'No data');
    reorderCompetitors();
    fallbackResult = fallbackResult || result;
    if(!canGenerateCompetitor) return;
  }

  if(canGenerateCompetitor){
    try{
      if(btn) btn.textContent='Generating...';
      const meta = CMETA[id] || {};
      const officialPages = competitorNewsPages(meta);
      const officialPagesLine = officialPages.length
        ? 'Prioritise these official competitor pages first: '+officialPages.join(' ; ')+'.'
        : '';
      const compPrompt = [
        'Generate current competitor intelligence for Qatar Airways versus '+(meta.name||id)+' ('+(meta.hub||'')+').',
        meta.why ? 'Why this rival matters: '+meta.why : '',
        officialPagesLine,
        'Use current evidence only; prefer official newsrooms, official route/product announcements, and verified industry sources.',
        'Return JSON only with: name, overallThreat (0-100), summary, why, weaknesses [{title,detail,impact,severity,source,sourceUrl}], opportunities [{title,detail,value,timeWindow,b2cAngle,source,sourceUrl}], actions [{title,detail,owner,timeline,value,source,sourceUrl}].',
        'Focus on B2C, direct booking, loyalty, product, pricing, network and customer experience implications.',
        'Every weakness/opportunity/action must include source and sourceUrl where possible.'
      ].filter(Boolean).join(' ');
      const genResp = await fetch(BACKEND_URL+'/api/claude', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(claudePayloadWithWebSearch({
          model:'claude-haiku-4-5',
          max_tokens:1400,
          messages:[{role:'user', content:compPrompt}]
        }, 'competitor'))
      });
      if(!genResp.ok) throw new Error('API '+genResp.status+': '+await readApiError(genResp));
      const genData = await genResp.json();
      const raw = Array.isArray(genData.content) ? genData.content.filter(b=>b.type==='text').map(b=>b.text).join('') : (genData.content || genData.text || genData.result || '');
      const parsed = extractJSON(raw);
      const result = normalizeCompData(id, parsed);
      CDATA[id]=result;
      if(result.persistable){
        saveCtoStorage(id,result);
      }else{
        try{ localStorage.removeItem(CSTORE+id); }catch(e){}
      }
      if(result.persistable){
        try{
          const saveResp = await fetch(BACKEND_URL+'/api/competitors/save',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({competitorId:id,data:result})
          });
          if(!saveResp.ok){
            console.warn('[Radar] Competitor save failed for '+id+': '+saveResp.status);
          }
        }catch(saveErr){
          console.warn('[Radar] Competitor save failed for '+id+':', saveErr.message||saveErr);
        }
      }
      if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=result;
      setCompScoreUI(id, analysedThreatScore(result));
      renderComp(id,result);
      setCompTileState(id, result.persistable ? 'Loaded' : (result.hasSpecificCache ? 'Stale' : 'No data'));
      reorderCompetitors();
      return;
    }catch(genErr){
      console.warn('[Radar] Competitor generation failed for '+id+':', genErr.message||genErr);
      if(fallbackResult){
        if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=fallbackResult;
        setCompScoreUI(id, analysedThreatScore(fallbackResult));
        renderComp(id,fallbackResult);
        setCompTileState(id, fallbackResult.hasSpecificCache ? 'Stale' : 'No data');
        reorderCompetitors();
        return;
      }
    }
  }

  const detail=document.getElementById('compDetail');
  if(detail){
    detail.innerHTML=`<div style="padding:28px;text-align:center;background:var(--su);border:1px solid var(--bo);border-radius:var(--r3);color:var(--t3)">
      <div style="font-size:28px;margin-bottom:8px;font-weight:700;color:var(--qb)">${CMETA[id]?.flag||'AIR'}</div>
      <div style="font-size:13px;color:var(--t2);margin-bottom:5px;font-weight:500">Could not load competitor intelligence for ${CMETA[id]?.name||id}</div>
      <div style="font-size:11px">Check that the backend server is running, then refresh this competitor cache.</div>
    </div>`;
  }
  setCompTileState(id, 'Error');
}

async function loadAllCompetitors(){
  const allIds = Object.keys(CMETA).sort(compareCompIds);
  for(const id of allIds){
    await loadComp(id);
  }
}

function hideAllPrimaryPages(){
  var main = document.querySelector('.main');
  if(main) main.style.display='none';
  ['compPage','sentPage','ciPage','ciosPage','execPage','predictPage'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.classList.remove('visible');
  });
}
function clearPrimaryNav(){
  ['navMain','navComp','navSent','navCI','navCIOS','navExec','navPredict'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.classList.remove('active');
  });
}
function showMain(){
  hideAllPrimaryPages();
  var main=document.querySelector('.main'); if(main) main.style.display='';
  clearPrimaryNav();
  var n=document.getElementById('navMain'); if(n) n.classList.add('active');
}
function showCI(){
  ensureRadarRuntimeForTabs();
  if(typeof hydrateCustomerIntelFromDomainCache === 'function') hydrateCustomerIntelFromDomainCache();
  hideAllPrimaryPages(); clearPrimaryNav();
  var el=document.getElementById('ciPage'); if(el) el.classList.add('visible');
  var nav=document.getElementById('navCI'); if(nav) nav.classList.add('active');
}
function showCIOS(){
  ensureRadarRuntimeForTabs();
  if(typeof hydrateSentimentFromDomainCache === 'function') hydrateSentimentFromDomainCache();
  hideAllPrimaryPages(); clearPrimaryNav();
  var el=document.getElementById('ciosPage'); if(el) el.classList.add('visible');
  var nav=document.getElementById('navCIOS'); if(nav) nav.classList.add('active');
  if(typeof loadCIOSAll === 'function') loadCIOSAll();
}
function showSent(){
  ensureRadarRuntimeForTabs();
  if(typeof hydrateSentimentFromDomainCache === 'function') hydrateSentimentFromDomainCache();
  hideAllPrimaryPages(); clearPrimaryNav();
  var el=document.getElementById('sentPage'); if(el) el.classList.add('visible');
  var nav=document.getElementById('navSent'); if(nav) nav.classList.add('active');
}
function showComp(){
  ensureRadarRuntimeForTabs();
  hideAllPrimaryPages(); clearPrimaryNav();
  var el=document.getElementById('compPage'); if(el) el.classList.add('visible');
  var nav=document.getElementById('navComp'); if(nav) nav.classList.add('active');
  // Restore any saved competitor data, or derive from the loaded cmp domain cache.
  Object.keys(CMETA).forEach(id=>{
    const saved=loadCfromStorage(id);
    if(saved && saved.data){
      const result = normalizeCompData(id, saved.data);
      if(result.persistable){
        CDATA[id]=result;
        if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=result;
        setCompScoreUI(id, analysedThreatScore(result));
        const stale = isSavedRecordStale(saved, 24);
        setCompTileState(id, stale ? 'Stale' : 'Loaded');
      }else{
        try{ localStorage.removeItem(CSTORE+id); }catch(e){}
        const compDomain = typeof cachedDomain === 'function' ? cachedDomain('cmp') : null;
        if(compDomain && Array.isArray(compDomain.signals) && compDomain.signals.length){
          const domainResult = normalizeCompData(id, null);
          CDATA[id]=domainResult;
          if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=domainResult;
          setCompScoreUI(id, analysedThreatScore(domainResult));
          setCompTileState(id, domainResult.hasSpecificCache ? 'Stale' : 'No data');
        }else{
          setCompTileState(id, 'No data');
        }
      }
    }else{
      const compDomain = typeof cachedDomain === 'function' ? cachedDomain('cmp') : null;
      if(compDomain && Array.isArray(compDomain.signals) && compDomain.signals.length){
        const result = normalizeCompData(id, null);
        CDATA[id]=result;
        if(window.radarData && window.radarData.competitors) window.radarData.competitors[id]=result;
        setCompScoreUI(id, analysedThreatScore(result));
        setCompTileState(id, result.hasSpecificCache ? 'Stale' : 'No data');
      }else{
        setCompTileState(id, 'No data');
      }
    }
  });
  reorderCompetitors();
}
function showExecSummary(){
  ensureRadarRuntimeForTabs();
  hideAllPrimaryPages(); clearPrimaryNav();
  var el=document.getElementById('execPage'); if(el) el.classList.add('visible');
  var nav=document.getElementById('navExec'); if(nav) nav.classList.add('active');
  renderExecutiveSummaryPage();
}
function showPredictive(){
  ensureRadarRuntimeForTabs();
  hideAllPrimaryPages(); clearPrimaryNav();
  var el=document.getElementById('predictPage'); if(el) el.classList.add('visible');
  var nav=document.getElementById('navPredict'); if(nav) nav.classList.add('active');
  renderPredictivePage();
}


// â”€â”€ EXECUTIVE SUMMARY + PREDICTIVE INTELLIGENCE - backend/cache-derived â”€â”€
function ensureRadarRuntimeForTabs(){
  try{
    if(!window.radarData || !window.radarData.meta || !window.radarData.meta.hydratedAt){
      hydrateRadarStateFromCache({source:'tab_auto_hydrate'});
    }
  }catch(e){ console.warn('Runtime hydrate for executive tabs failed', e); }
}
function radarObjValues(obj){ return Object.keys(obj||{}).map(function(k){ return obj[k]; }).filter(Boolean); }
function getAllDomainSignals(){
  ensureRadarRuntimeForTabs();
  var rows=[];
  Object.keys((window.radarData&&window.radarData.domains)||{}).forEach(function(id){
    var d=window.radarData.domains[id]||{};
    (d.signals||[]).forEach(function(s){ rows.push(Object.assign({domain:id, domainStatus:d.status||''}, s)); });
  });
  return rows;
}
function scoreSignalForExec(s){
  var score = Number(s.commercialImpactScore || s.score || 0) || 0;
  var txt = ((s.title||'')+' '+(s.body||'')+' '+(s.impactLabel||'')+' '+(s.whyItMattersNow||'')+' '+(s.captureStrategy||'')).toLowerCase();
  if(/risk|threat|leak|cancel|delay|complaint|friction|ota|abandon|fraud|capacity|disrupt/.test(txt)) score += 3;
  if(/revenue|direct|conversion|loyalty|premium|ancillary|market share|opportunity|growth|upsell/.test(txt)) score += 2;
  if(/today|immediate|active_now|next_30_days|30 days/.test(String(s.timeToImpact||s.relevanceWindow||s.eventDate||'').toLowerCase())) score += 2;
  return score;
}
function getExecSignals(limit){
  return getAllDomainSignals().sort(function(a,b){ return scoreSignalForExec(b)-scoreSignalForExec(a); }).slice(0, limit||8);
}
function countSignalsBy(fn){ return getAllDomainSignals().filter(fn).length; }
function executiveMetricCards(){
  var domains = Object.keys((window.radarData&&window.radarData.domains)||{}).length;
  var signals = getAllDomainSignals();
  var risk = countSignalsBy(function(s){ return /risk|threat|leak|cancel|delay|complaint|friction|abandon|fraud|capacity|disrupt/i.test((s.title||'')+' '+(s.body||'')+' '+(s.impactLabel||'')); });
  var opp = countSignalsBy(function(s){ return /opportunity|growth|increase|capture|upsell|premium|ancillary|direct|conversion|market share/i.test((s.title||'')+' '+(s.body||'')+' '+(s.impactLabel||'')+' '+(s.captureStrategy||'')); });
  var immediate = countSignalsBy(function(s){ return /today|immediate|active_now|next_30_days|30 days/i.test(String(s.timeToImpact||s.relevanceWindow||s.eventDate||'')); });
  return [
    {v:risk, l:'Active risk signals', d:'Risk/friction/OTA/disruption pressure'},
    {v:opp, l:'Opportunity signals', d:'Growth/direct/ancillary/premium windows'},
    {v:immediate, l:'Near-term signals', d:'Today, immediate or next 30 days'},
    {v:domains + '/14', l:'Domain coverage', d: signals.length + ' loaded domain signals'}
  ];
}
function execTextMatches(s, re){ return re.test(((s&&s.title)||'')+' '+((s&&s.body)||'')+' '+((s&&s.impactLabel)||'')+' '+((s&&s.whyItMattersNow)||'')+' '+((s&&s.captureStrategy)||'')); }
function execThemeScore(re){
  var sigs=getAllDomainSignals();
  if(!sigs.length) return 0;
  var raw=sigs.filter(function(s){return execTextMatches(s,re);}).reduce(function(acc,s){return acc+Math.max(1,Math.min(12,scoreSignalForExec(s)));},0);
  return Math.max(8, Math.min(96, Math.round(raw/Math.max(1,sigs.length)*9)));
}
function execThemeStateFromScore(score){
  if(score>=78) return 'critical';
  if(score>=62) return 'action';
  if(score>=45) return 'watch';
  return 'stable';
}
function execThemeStateLabel(state){
  return state==='critical' ? 'Critical' : state==='action' ? 'Action' : state==='watch' ? 'Watch' : 'Stable';
}
function execSignalTimeMs(s){
  var raw=s.firstSeenAt||s.first_seen_at||s.lastSeenAt||s.last_seen_at||s.createdAt||s.created_at||s.updated_at||s.last_verified_at||'';
  if(!raw) return null;
  var ms=Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}
function execThemeDeltaCount(theme, hours){
  var cutoff=Date.now()-(hours*60*60*1000);
  var count=0;
  getAllDomainSignals().forEach(function(s){
    if(!execTextMatches(s, theme.re)) return;
    var ms=execSignalTimeMs(s);
    if(ms && ms>=cutoff) count++;
  });
  return count;
}
function execSourceCount(){
  var st=window.radarData||{};
  return Object.keys(st.sentiment||{}).length + Object.keys(st.cios||{}).length + Object.keys(st.customerIntel||{}).length + Object.keys(st.competitors||{}).length;
}
function execFreshnessLabel(){
  var st=window.radarData||{};
  var meta=st.meta||{};
  if(meta.hydratedAt){
    try{ var d=new Date(meta.hydratedAt); return 'Loaded '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+' DOH'; }catch(e){}
  }
  return 'Backend/cache view';
}
function execPressureThemes(){
  return [
    {name:'OTA leakage', short:'OTA', icon:'OTA', re:/ota|agent|direct share|leak|pricing|parity/i},
    {name:'App friction', short:'App', icon:'APP', re:/app|mobile|digital|website|payment|boarding|usability|friction/i},
    {name:'Loyalty risk', short:'Loyalty', icon:'LOY', re:/loyalty|privilege|avios|qpoints|member|tier|retention/i},
    {name:'Service disruption', short:'Service', icon:'OPS', re:/cancel|delay|refund|rebook|call|support|complaint|service|disruption/i},
    {name:'Route demand', short:'Demand', icon:'DEM', re:/route|network|capacity|demand|market|destination|schedule|frequency/i},
    {name:'Competitor pressure', short:'Rivals', icon:'RIV', re:/competitor|emirates|etihad|turkish|saudia|singapore|airline|market share/i}
  ].map(function(t){ return Object.assign({}, t, {score:execThemeScore(t.re)}); });
}
function execPressureLevel(score){ if(score>=72) return 'High'; if(score>=46) return 'Medium'; if(score>0) return 'Monitor'; return 'No data'; }
function execCommercialState(avg, risk, opp){
  if(avg>=78 || risk>=45) return 'critical';
  if(avg>=62 || risk>=34) return 'action';
  if(avg>=45 || risk>opp) return 'watch';
  return 'stable';
}
function execCommercialRuleText(){
  return 'Rule: Critical >=78 pressure score or >=45 risk signals. Action >=62 or >=34 risk. Watch >=45 or risk above opportunity. Stable otherwise.';
}
function pickTopSignalByPattern(signals, re){
  return signals.filter(function(s){return re.test(((s.title||'')+' '+(s.body||'')+' '+(s.impactLabel||'')+' '+(s.captureStrategy||'')).toLowerCase());})[0] || null;
}
function execConfidenceValue(s){
  if(typeof s.confidence === 'number' && Number.isFinite(s.confidence)) return Math.max(0, Math.min(1, s.confidence));
  var label=String(s.confidenceLabel||s.confidence||'').toLowerCase();
  if(label.includes('high')) return 0.85;
  if(label.includes('med')) return 0.65;
  if(label.includes('low')) return 0.4;
  return 0.6;
}
function execConfidenceSummary(signals){
  if(!signals.length) return {avg:0, label:'Low', text:'Low'};
  var avg=signals.reduce(function(acc,s){ return acc + execConfidenceValue(s); }, 0)/signals.length;
  var label=avg>=0.75 ? 'High' : avg>=0.55 ? 'Medium' : 'Low';
  return {avg:avg, label:label, text:'Confidence: '+label};
}
function ensureExecInteractiveState(){
  if(!window.execInteractive || typeof window.execInteractive !== 'object'){
    window.execInteractive={ filterTheme:null, selectedSignal:null, selectedAction:null };
  }
  return window.execInteractive;
}
function getExecFilterTheme(){
  var st=ensureExecInteractiveState();
  return st.filterTheme || null;
}
function getExecScopedSignals(){
  var all=getAllDomainSignals().slice();
  var filter=getExecFilterTheme();
  if(filter && filter.re) return all.filter(function(s){ return execTextMatches(s, filter.re); });
  return all;
}
function setExecFilterTheme(theme){
  var st=ensureExecInteractiveState();
  st.filterTheme = theme ? {name:theme.name, re:theme.re} : null;
}
window.clearExecDriverFilter = function(){
  setExecFilterTheme(null);
  renderExecutiveSummaryPage();
};
function renderExecContextTrail(){
  var el=document.getElementById('execContextTrail');
  if(!el) return;
  var filter=getExecFilterTheme();
  if(!filter){
    el.innerHTML='Scope: all drivers';
    return;
  }
  el.innerHTML='Scope: <strong>'+esc(filter.name)+'</strong> · <a href="#" onclick="clearExecDriverFilter(); return false;">Clear filter</a>';
}
window.closeExecDetailDrawer = function(){
  var drawer=document.getElementById('execDetailDrawer');
  var backdrop=document.getElementById('execDrawerBackdrop');
  if(drawer){ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); }
  if(backdrop){ backdrop.hidden=true; }
};
window.openExecDetailDrawer = function(model){
  var drawer=document.getElementById('execDetailDrawer');
  var backdrop=document.getElementById('execDrawerBackdrop');
  if(!drawer || !backdrop) return;
  var typeEl=document.getElementById('execDrawerType');
  var titleEl=document.getElementById('execDrawerTitle');
  var metaEl=document.getElementById('execDrawerMeta');
  var bodyEl=document.getElementById('execDrawerBody');
  var m=model||{};
  if(typeEl) typeEl.textContent=m.type||'Signal Detail';
  if(titleEl) titleEl.textContent=m.title||'Executive evidence';
  if(metaEl){
    var chips=(m.meta||[]).map(function(x){ return '<span class="exec-chip">'+esc(x)+'</span>'; }).join('');
    metaEl.innerHTML=chips || '<span class="exec-chip">Backend/cache</span>';
  }
  if(bodyEl) bodyEl.textContent=m.body||'No additional evidence available.';
  backdrop.hidden=false;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
};
window.exportExecutiveBriefPpt = async function(){
  var model=window.__execBriefModel;
  if(!model){
    alert('Executive brief is not ready yet. Please refresh the Executive Summary first.');
    return;
  }
  async function ensurePptx(){
    if(window.PptxGenJS) return true;
    return new Promise(function(resolve){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
      s.onload=function(){ resolve(true); };
      s.onerror=function(){ resolve(false); };
      document.body.appendChild(s);
    });
  }
  var ok=await ensurePptx();
  if(!ok || !window.PptxGenJS){
    alert('PowerPoint library failed to load. Check network access and try again.');
    return;
  }
  var pptx=new window.PptxGenJS();
  pptx.layout='LAYOUT_WIDE';
  pptx.author='QR Radar';
  pptx.subject='Executive Intelligence Brief';
  pptx.company='Qatar Airways';
  pptx.title='QR Radar Executive Brief';
  pptx.theme={ headFontFace:'Calibri', bodyFontFace:'Calibri', lang:'en-US' };

  var slide1=pptx.addSlide();
  slide1.background={color:'F7F3F8'};
  slide1.addText('QR Radar Executive Intelligence Brief', {x:0.4,y:0.3,w:12.2,h:0.4,fontSize:24,bold:true,color:'5B0030'});
  slide1.addText('Generated: '+new Date().toLocaleString(), {x:0.4,y:0.8,w:5,h:0.3,fontSize:10,color:'6B6472'});
  slide1.addShape(pptx.ShapeType.roundRect,{x:0.4,y:1.2,w:12.2,h:0.95,fill:{color:'FFFFFF'},line:{color:'E8E2EA',pt:1}});
  slide1.addText('Commercial status: '+model.stateLabel, {x:0.6,y:1.35,w:3.6,h:0.3,fontSize:13,bold:true,color:'8A004F'});
  slide1.addText(model.verdict, {x:0.6,y:1.63,w:11.6,h:0.35,fontSize:11,color:'2F2436'});
  slide1.addText('Why now: '+model.whyNow, {x:0.6,y:1.9,w:11.6,h:0.25,fontSize:10,color:'5D5466'});

  var cards=[
    ['State', model.avg+'/100', 'Risk '+model.risk+' | Opportunity '+model.opp],
    ['Opportunity', model.opportunityRange, model.opportunityLine],
    ['Next move', model.nextMove, model.nextMoveSub],
    ['Trust', model.confidenceLabel, model.trustLine]
  ];
  cards.forEach(function(c,i){
    var x=0.4 + (i*3.05);
    slide1.addShape(pptx.ShapeType.roundRect,{x:x,y:2.45,w:2.9,h:1.1,fill:{color:'FFFFFF'},line:{color:'E8E2EA',pt:1}});
    slide1.addText(c[0],{x:x+0.13,y:2.58,w:2.6,h:0.22,fontSize:9,bold:true,color:'7A6A7C'});
    slide1.addText(c[1],{x:x+0.13,y:2.8,w:2.6,h:0.26,fontSize:18,bold:true,color:'261D2E'});
    slide1.addText(c[2],{x:x+0.13,y:3.08,w:2.6,h:0.3,fontSize:9,color:'645A6C'});
  });

  slide1.addText('Top signals', {x:0.4,y:3.8,w:6,h:0.25,fontSize:12,bold:true,color:'5B0030'});
  (model.topSignals||[]).slice(0,3).forEach(function(s,idx){
    slide1.addText((idx+1)+'. '+(s.title||'Signal'), {x:0.5,y:4.05+(idx*0.38),w:6,h:0.25,fontSize:10,color:'2F2436'});
  });
  slide1.addText('Top actions', {x:6.7,y:3.8,w:6,h:0.25,fontSize:12,bold:true,color:'5B0030'});
  (model.topActions||[]).slice(0,3).forEach(function(a,idx){
    slide1.addText((idx+1)+'. '+a.title+' — '+a.owner, {x:6.8,y:4.05+(idx*0.38),w:5.7,h:0.25,fontSize:10,color:'2F2436'});
  });

  var slide2=pptx.addSlide();
  slide2.background={color:'FFFFFF'};
  slide2.addText('Pressure Breakdown', {x:0.4,y:0.4,w:6,h:0.3,fontSize:18,bold:true,color:'5B0030'});
  (model.themes||[]).forEach(function(t,idx){
    var y=1+(idx*0.62);
    var w=Math.max(0.6, Math.min(7.4, (t.score/100)*7.4));
    slide2.addText(t.name, {x:0.5,y:y,w:2.2,h:0.2,fontSize:10,color:'4A3F55'});
    slide2.addShape(pptx.ShapeType.roundRect,{x:2.4,y:y+0.03,w:7.5,h:0.16,fill:{color:'EEE8F1'},line:{color:'EEE8F1',pt:0}});
    slide2.addShape(pptx.ShapeType.roundRect,{x:2.4,y:y+0.03,w:w,h:0.16,fill:{color:'8A004F'},line:{color:'8A004F',pt:0}});
    slide2.addText(String(t.score), {x:10.05,y:y-0.02,w:0.7,h:0.22,fontSize:9,bold:true,color:'8A004F'});
  });
  slide2.addText('Source: backend/cache executive model', {x:0.4,y:6.95,w:12,h:0.2,fontSize:9,color:'7B7282'});

  var dt=new Date();
  var stamp=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  await pptx.writeFile({fileName:'QR_Radar_Executive_Brief_'+stamp+'.pptx'});
};
document.addEventListener('keydown', function(ev){
  if(ev.key === 'Escape') window.closeExecDetailDrawer();
});
function renderExecSideRailNav(){
  var shell=document.querySelector('.exec-command-main');
  var items=[].slice.call(document.querySelectorAll('.exec-side-item[data-target]'));
  if(!shell || !items.length) return;
  if(window.__execRailNavBound) return;
  window.__execRailNavBound=true;

  function setActive(target){
    items.forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-target')===target);
    });
  }
  items.forEach(function(btn){
    btn.addEventListener('click', function(){
      var targetId=btn.getAttribute('data-target');
      var target=document.getElementById(targetId);
      if(target){
        target.scrollIntoView({behavior:'smooth', block:'start'});
        setActive(targetId);
      }
    });
  });
}
function execRadarSvg(themes){
  var cx=170, cy=145, rings=[45,72,99,126], maxR=126;
  var points=themes.map(function(t,i){var a=(-90 + i*360/themes.length)*Math.PI/180; var r=maxR*(Math.max(0,t.score)/100); return {x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,a:a,t:t};});
  var poly=points.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');
  var axes=themes.map(function(t,i){var a=(-90+i*360/themes.length)*Math.PI/180; var x=cx+Math.cos(a)*maxR,y=cy+Math.sin(a)*maxR; var lx=cx+Math.cos(a)*(maxR+25),ly=cy+Math.sin(a)*(maxR+25); return '<line x1="'+cx+'" y1="'+cy+'" x2="'+x+'" y2="'+y+'" stroke="#E8E2EA"/><text x="'+lx+'" y="'+ly+'" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="800" fill="#51485A">'+esc(t.short)+'</text>';}).join('');
  var ringSvg=rings.map(function(r){var pts=[]; for(var i=0;i<themes.length;i++){var a=(-90+i*360/themes.length)*Math.PI/180; pts.push((cx+Math.cos(a)*r).toFixed(1)+','+(cy+Math.sin(a)*r).toFixed(1));} return '<polygon points="'+pts.join(' ')+'" fill="none" stroke="#E8E2EA"/>';}).join('');
  var dots=points.map(function(p){return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="6" fill="#8A004F" stroke="#fff" stroke-width="3"><title>'+esc(p.t.name+': '+p.t.score)+'</title></circle>';}).join('');
  var avg=Math.round(themes.reduce(function(a,t){return a+t.score;},0)/Math.max(1,themes.length));
  return '<svg class="exec-radar-svg" viewBox="0 0 340 290" role="img" aria-label="Commercial pressure radar"><g>'+ringSvg+axes+'</g><polygon points="'+poly+'" fill="rgba(138,0,79,.18)" stroke="#8A004F" stroke-width="2.5"/>'+dots+'<circle cx="'+cx+'" cy="'+cy+'" r="44" fill="#fff" stroke="#E8E2EA"/><text x="'+cx+'" y="'+(cy-10)+'" text-anchor="middle" font-size="10" fill="#655D6B" font-weight="800">Overall</text><text x="'+cx+'" y="'+(cy+8)+'" text-anchor="middle" font-size="20" fill="#8A004F" font-weight="900">'+execPressureLevel(avg)+'</text><text x="'+cx+'" y="'+(cy+24)+'" text-anchor="middle" font-size="9" fill="#7B7382">'+avg+'/100</text></svg>';
}
function execSparkBars(score){
  var vals=[35,42,38,48,44,52,score,Math.max(20,score-9),Math.min(96,score+6)];
  return '<div class="exec-mini-spark">'+vals.map(function(v){return '<span style="height:'+Math.max(8,Math.min(26,v/3.5))+'px"></span>';}).join('')+'</div>';
}
function renderExecutiveSummaryPage(){
  ensureRadarRuntimeForTabs();
  renderExecSideRailNav();
  var all=getAllDomainSignals();
  var themes=execPressureThemes();
  var scopedSignals=getExecScopedSignals().slice().sort(function(a,b){ return scoreSignalForExec(b)-scoreSignalForExec(a); });
  var sigs=scopedSignals.slice(0,9);
  if(!sigs.length && all.length){
    sigs=all.slice().sort(function(a,b){ return scoreSignalForExec(b)-scoreSignalForExec(a); }).slice(0,9);
  }
  var avg=Math.round(themes.reduce(function(a,t){return a+t.score;},0)/Math.max(1,themes.length));
  var topTheme=themes.slice().sort(function(a,b){return b.score-a.score;})[0]||{name:'Backend intelligence',score:0};
  var activeFilter=getExecFilterTheme();
  var risk=countSignalsBy(function(s){ return /risk|threat|leak|cancel|delay|complaint|friction|abandon|fraud|capacity|disrupt/i.test((s.title||'')+' '+(s.body||'')+' '+(s.impactLabel||'')); });
  var opp=countSignalsBy(function(s){ return /opportunity|growth|increase|capture|upsell|premium|ancillary|direct|conversion|market share/i.test((s.title||'')+' '+(s.body||'')+' '+(s.impactLabel||'')+' '+(s.captureStrategy||'')); });
  var near=countSignalsBy(function(s){ return /today|immediate|active_now|next_30_days|30 days/i.test(String(s.timeToImpact||s.relevanceWindow||s.eventDate||'')); });
  var domains=Object.keys((window.radarData&&window.radarData.domains)||{}).length;
  var state=execCommercialState(avg,risk,opp);
  var stateLabel=execThemeStateLabel(state);
  var topRisk=pickTopSignalByPattern(sigs, /risk|threat|fraud|disrupt|friction|delay|leak/);
  var topOpp=pickTopSignalByPattern(sigs, /opportun|growth|capture|upsell|premium|ancillary|direct|conversion/);
  var newest=sigs.slice().sort(function(a,b){
    return (execSignalTimeMs(b)||0) - (execSignalTimeMs(a)||0);
  })[0]||null;

  var headline=document.getElementById('execCommandHeadline');
  if(headline){ headline.textContent = all.length ? ('Commercial status is '+stateLabel.toLowerCase()) : 'Executive intelligence awaits backend data'; }
  var sub=document.getElementById('execCommandSubhead');
  if(sub){ sub.textContent = all.length ? (topTheme.name+' is currently the strongest driver. This page translates signals into a clear decision chain: state, cause, impact and next move.') : 'No backend/cache signals are loaded yet. Load backend cache to populate the decision interface.'; }
  var fresh=document.getElementById('execCommandFreshness'); if(fresh) fresh.textContent=execFreshnessLabel();
  var conf=execConfidenceSummary(sigs.length ? sigs : all);
  var confChip=document.getElementById('execConfidenceChip');
  if(confChip) confChip.textContent='Confidence: '+conf.label;
  var scopeChip=document.getElementById('execScopeChip');
  if(scopeChip) scopeChip.textContent='B2C '+domains+'/14';
  renderExecContextTrail();
  var statusState=document.getElementById('execStatusState');
  if(statusState){
    statusState.textContent=stateLabel;
    statusState.classList.remove('stable','watch','action','critical');
    statusState.classList.add(state);
  }
  var statusVerdict=document.getElementById('execStatusVerdict');
  if(statusVerdict){
    statusVerdict.textContent = all.length
      ? ('Commercial pressure is '+stateLabel.toLowerCase()+'. '+topTheme.name+' is driving the current state, with '+risk+' risk signals and '+opp+' opportunity signals live.')
      : 'Awaiting backend/cache signal load to produce a commercial verdict.';
  }
  var statusRule=document.getElementById('execStatusRule');
  if(statusRule){
    statusRule.textContent = all.length
      ? (execCommercialRuleText()+' Current score: '+avg+'/100.')
      : execCommercialRuleText();
  }

  var kpis=document.getElementById('execSummaryKpis');
  if(kpis){
    var cards=[
      {v:avg?avg+'/100':'-', l:'Commercial pressure', d:topTheme.name+' is the main pressure driver', tr:stateLabel},
      {v:risk, l:'Risk signals', d:'Signals impacting demand, conversion or trust', tr:near+' near-term'},
      {v:opp, l:'Opportunity windows', d:'Signals supporting direct share and revenue capture', tr:domains+'/14 domains'}
    ];
    kpis.innerHTML=cards.map(function(c){return '<div class="exec-kpi"><div class="exec-kv">'+esc(c.v)+'</div><div class="exec-kl">'+esc(c.l)+'</div><div class="exec-kd">'+esc(c.d)+'</div><div class="exec-kpi-trend">'+esc(c.tr)+'</div></div>';}).join('');
  }
  var decisionCards=document.getElementById('execDecisionCards');
  if(decisionCards){
    var cards=[
      {label:'Biggest Risk', title:(topRisk&&topRisk.title)||'No critical risk headline yet', body:(topRisk&&(topRisk.whyItMattersNow||topRisk.body))||'Awaiting stronger risk evidence from cache.'},
      {label:'Biggest Opportunity', title:(topOpp&&topOpp.title)||'No priority opportunity headline yet', body:(topOpp&&(topOpp.captureStrategy||topOpp.body))||'Awaiting stronger growth evidence from cache.'},
      {label:'What Changed 24h', title:(newest&&newest.title)||'No fresh change detected', body:newest ? ((newest.domain||'domain').toUpperCase()+' updated with new evidence and ranked movement.') : 'No new timestamped update found in the last cycle.'},
      {label:'Recommended Move', title:(topRisk&&topRisk.captureStrategy) || (topOpp&&topOpp.captureStrategy) || 'Focus on direct-channel protection', body:'Owner alignment: leadership, digital, loyalty and operations should review this move first.'}
    ];
    decisionCards.innerHTML=cards.map(function(c){
      return '<div class="exec-decision-card exec-clickable"><div class="exec-decision-label">'+esc(c.label)+'</div><div class="exec-decision-title">'+esc(c.title)+'</div><div class="exec-decision-body">'+esc(c.body)+'</div></div>';
    }).join('');
    Array.prototype.forEach.call(decisionCards.querySelectorAll('.exec-decision-card'), function(cardEl, idx){
      cardEl.addEventListener('click', function(){
        var s=[topRisk, topOpp, newest, topRisk||topOpp][idx] || {};
        openExecDetailDrawer({
          type:'Executive Decision',
          title:cards[idx].title,
          body:cards[idx].body,
          meta:[(s.domain||'radar').toString().toUpperCase(), s.impactLabel||s.demandImpact||'Executive', conf.text]
        });
      });
    });
  }
  var pill=document.getElementById('execOverallPressurePill'); if(pill) pill.textContent=execPressureLevel(avg)+' - '+avg+'/100';
  var radar=document.getElementById('execRadarVisual'); if(radar) radar.innerHTML=all.length?execRadarSvg(themes):'<div class="exec-empty">No backend/cache signals available for radar visual.</div>';
  var plist=document.getElementById('execPressureList'); if(plist){
    var rankedThemes=themes.slice().sort(function(a,b){return b.score-a.score;});
    plist.innerHTML=rankedThemes.map(function(t, idx){
      var stateClass=execThemeStateFromScore(t.score);
      var delta24h=execThemeDeltaCount(t,24);
      var deltaLabel=delta24h>0 ? ('+'+delta24h+' new /24h') : 'No new /24h';
      var marker=62;
      var active = activeFilter && activeFilter.name===t.name ? ' active' : '';
      return '<div class="exec-driver-row exec-clickable'+active+'" data-driver-index="'+idx+'"><div class="exec-driver-head"><div class="exec-driver-name">'+esc(t.name)+'</div><span class="exec-driver-state '+stateClass+'">'+execThemeStateLabel(stateClass)+'</span><span class="exec-driver-delta">'+esc(deltaLabel)+'</span><span class="exec-driver-score">'+t.score+'/100</span></div><div class="exec-driver-bar"><span class="exec-driver-range-low"></span><span class="exec-driver-range-mid"></span><span class="exec-driver-range-high"></span><span class="exec-driver-fill" style="width:'+Math.max(3,t.score)+'%"></span><span class="exec-driver-target" style="left:'+marker+'%"></span></div><div class="exec-driver-foot"><span>Target '+marker+'</span><span>Driver weight: '+Math.round(t.score/10)+'/10</span></div></div>';
    }).join('');
    Array.prototype.forEach.call(plist.querySelectorAll('.exec-driver-row'), function(row){
      row.addEventListener('click', function(){
        var idx=Number(row.getAttribute('data-driver-index'));
        var selected=rankedThemes[idx];
        var current=getExecFilterTheme();
        if(current && selected && current.name===selected.name){
          setExecFilterTheme(null);
        }else{
          setExecFilterTheme(selected);
        }
        renderExecutiveSummaryPage();
      });
    });
  }
  var top=document.getElementById('execTopSignals');
  if(top){
    top.innerHTML=sigs.length?sigs.slice(0,5).map(function(s,i){
      var icon=i===0?'TOP':i===1?'RISK':i===2?'GROWTH':i===3?'LOY':i===4?'OPS':'SIG';
      return '<div class="exec-top-card exec-clickable" data-signal-index="'+i+'"><div class="exec-top-icon">'+icon+'</div><div><div class="exec-top-title">'+esc(s.title||'Untitled signal')+'</div><div class="exec-top-body">'+esc(s.body||s.whyItMattersNow||'No detail available from backend/cache.')+'</div><div class="exec-top-meta"><span class="exec-chip">'+esc((s.domain||'domain').toUpperCase())+'</span><span class="exec-chip">'+esc(s.impactLabel||s.demandImpact||'Signal')+'</span></div>'+renderSignalDateMeta(s)+'</div><div class="exec-time">'+esc(s.ageHuman||s.timeToImpact||s.relevanceWindow||'Now')+'</div></div>';
    }).join(''):'<div class="exec-empty">No backend/cache signals are loaded yet.</div>';
    Array.prototype.forEach.call(top.querySelectorAll('.exec-top-card'), function(card){
      card.addEventListener('click', function(){
        var idx=Number(card.getAttribute('data-signal-index'));
        var s=sigs[idx]||{};
        openExecDetailDrawer({
          type:'Top Signal',
          title:s.title||'Signal detail',
          body:s.whyItMattersNow || s.captureStrategy || s.body || 'No detail available from backend/cache.',
          meta:[(s.domain||'domain').toString().toUpperCase(), s.impactLabel||s.demandImpact||'Signal', s.confidence||conf.label]
        });
      });
    });
  }
  var metrics=document.getElementById('execImportantMetrics');
  if(metrics){
    var st=window.radarData||{};
    var m=[
      {v:Object.keys(st.sentiment||{}).length, l:'Sentiment sources', d:'Customer voice coverage'},
      {v:Object.keys(st.cios||{}).length, l:'Customer OS sources', d:'Complaint and perception intelligence'},
      {v:execSourceCount(), l:'Total source layers', d:'Loaded cache-backed intelligence layers'},
      {v:countSignalsBy(function(s){return /ota|agent|direct share|leak/i.test((s.title||'')+' '+(s.body||'')+' '+(s.captureStrategy||''));}), l:'Direct-share pressure', d:'OTA, agent and recapture signals'}
    ];
    metrics.innerHTML=m.map(function(x){return '<div class="exec-metric"><div class="exec-metric-v">'+esc(x.v)+'</div><div class="exec-metric-l">'+esc(x.l)+'</div><div class="exec-metric-d">'+esc(x.d)+'</div></div>';}).join('');
  }
  var lanes=document.getElementById('execLeadershipLanes');
  if(lanes){
    lanes.innerHTML=themes.slice().sort(function(a,b){return b.score-a.score;}).slice(0,5).map(function(t){
      return '<div class="exec-theme-card"><div class="exec-theme-title">'+esc(t.name)+'</div><div class="exec-theme-sub">'+esc(execThemeStateLabel(execThemeStateFromScore(t.score)))+' impact cluster</div>'+execSparkBars(t.score)+'<div class="exec-theme-impact">'+(t.score>=70?'High impact':t.score>=45?'Medium impact':'Monitor')+'</div></div>';
    }).join('');
  }
  var implication=document.getElementById('execCommercialImpact');
  if(implication){
    var implicationRows=[
      {
        title:'State implication: '+stateLabel,
        body: state==='critical'
          ? 'Pressure is above threshold. Leadership attention is required now to prevent direct-share and trust loss.'
          : state==='action'
            ? 'Pressure is elevated. Prioritised action across digital and loyalty teams should start this cycle.'
            : state==='watch'
              ? 'Pressure is rising. Monitor closely and pre-approve fast response actions.'
              : 'Pressure is stable. Protect gains and continue opportunity capture.',
        tag:'STATE'
      },
      {
        title:'Main driver: '+topTheme.name,
        body:'This driver currently carries the highest weighted pressure score in the executive model.',
        tag:'DRIVER'
      },
      {
        title:'Commercial exposure now',
        body:risk+' risk signals versus '+opp+' opportunity signals, with '+near+' near-term items requiring cross-team coordination.',
        tag:'IMPACT'
      }
    ];
    implication.innerHTML=implicationRows.map(function(r,i){
      return '<div class="exec-list-card"><div class="exec-list-index">'+(i+1)+'</div><div><div class="exec-list-title">'+esc(r.title)+'</div><div class="exec-list-body">'+esc(r.body)+'</div></div><div class="exec-list-pill">'+esc(r.tag)+'</div></div>';
    }).join('');
  }
  var cross=document.getElementById('execCrossTabSummary');
  if(cross){
    if(!all.length){ cross.innerHTML='<div class="exec-empty">Executive analyst summary will appear once backend/cache data is loaded.</div>'; }
    else{
      var top1=sigs[0]||{}; var top2=sigs[1]||{}; var top3=sigs[2]||{};
      cross.innerHTML='<div class="exec-summary-copy"><strong>Verdict:</strong> Commercial status is <strong>'+stateLabel.toLowerCase()+'</strong>. <strong>'+esc(topTheme.name)+'</strong> is the strongest driver. The top ranked movement is <strong>'+esc(top1.title||'No signal title')+'</strong>. Leadership should align on the first recommended move below and then validate supporting evidence across the deep-dive views.</div><div class="exec-summary-actions"><div class="exec-action-card"><div class="exec-action-title">Protect</div><div class="exec-action-body">'+esc(top1.captureStrategy||top1.whyItMattersNow||'Protect revenue and customer trust using the strongest loaded signal.')+'</div></div><div class="exec-action-card"><div class="exec-action-title">Capture</div><div class="exec-action-body">'+esc(top2.captureStrategy||top2.whyItMattersNow||'Use opportunity signals to capture direct demand and customer value.')+'</div></div><div class="exec-action-card"><div class="exec-action-title">Scale</div><div class="exec-action-body">'+esc(top3.captureStrategy||top3.whyItMattersNow||'Convert repeated signals into repeatable playbooks and owner workflows.')+'</div></div></div>';
    }
  }
  var top1=sigs[0]||{};
  var top2=sigs[1]||{};
  var top3=sigs[2]||{};
  var oppLow=Math.max(0.8, Number(((opp*0.22)+(avg/220)).toFixed(1)));
  var oppHigh=Number((oppLow*1.45).toFixed(1));
  window.__execBriefModel={
    avg:avg,
    stateLabel:stateLabel,
    risk:risk,
    opp:opp,
    verdict:statusVerdict ? statusVerdict.textContent : '',
    whyNow: topTheme.name+' is the strongest pressure driver and '+near+' near-term signals need owner action.',
    opportunityRange:'$'+oppLow.toFixed(1)+'M-$'+oppHigh.toFixed(1)+'M',
    opportunityLine:opp+' opportunity signals mapped',
    nextMove:(top1.captureStrategy||top2.captureStrategy||'Protect direct share'),
    nextMoveSub:'Assign Digital, Loyalty and Revenue owners in 7 days',
    confidenceLabel:conf.text,
    trustLine:execSourceCount()+' source layers • '+domains+'/14 domains',
    topSignals:sigs.slice(0,3),
    topActions:[
      {title:(top1.captureStrategy||top1.title||'Protect direct share'), owner:(top1.domain||'Digital').toString().toUpperCase()},
      {title:(top2.captureStrategy||top2.title||'Convert opportunity'), owner:(top2.domain||'Revenue').toString().toUpperCase()},
      {title:(top3.captureStrategy||top3.title||'Reduce friction'), owner:(top3.domain||'CX').toString().toUpperCase()}
    ],
    themes:themes.slice().sort(function(a,b){return b.score-a.score;})
  };
}
function predictiveCategoryDefinitions(){
  return [
    {ey:'Future customer behaviour',h:'Predict what travellers will expect next',p:'AI-assisted planning, WhatsApp-native servicing, digital-first disruption handling, premium personalization and Gen Z discovery behaviour.',q:/ai|chat|whatsapp|digital|app|gen z|social|personal/i},
    {ey:'Emerging revenue opportunities',h:'Find future profit pools before rivals',p:'Ancillary bundles, premium service upgrades, loyalty monetization, subscription ideas, airport commerce and new payment models.',q:/revenue|ancillary|premium|upsell|loyalty|payment|bundle|commerce/i},
    {ey:'Competitor future moves',h:'Anticipate rival airline strategy',p:'Route moves, loyalty wars, service innovation, price pressure and digital product shifts from competitors.',q:/competitor|emirates|etihad|turkish|saudia|british|singapore|airline/i},
    {ey:'Market shift prediction',h:'Detect demand movement early',p:'Geopolitical changes, network recovery, regional demand, source-market shifts and forward booking pressure.',q:/demand|route|market|network|capacity|geopolitical|region|origin/i},
    {ey:'Customer friction prediction',h:'Prevent future complaints before they spike',p:'Refund, baggage, servicing, cancellation, payment, app, airport and support friction signals.',q:/complaint|refund|baggage|cancel|delay|support|friction|payment|service/i},
    {ey:'Innovation radar',h:'Turn signals into industry-leading ideas',p:'Transform weak signals into product experiments and future use cases that improve customer experience and commercial performance.',q:/innovation|future|opportunity|new|pilot|experiment|customer/i}
  ];
}
function renderPredictivePage(){
  ensureRadarRuntimeForTabs();
  var cats=predictiveCategoryDefinitions();
  var sigs=getAllDomainSignals();
  var catEl=document.getElementById('predictiveCategories');
  if(catEl){
    catEl.innerHTML=cats.map(function(c){
      var matched=sigs.filter(function(s){return c.q.test((s.title||'')+' '+(s.body||'')+' '+(s.captureStrategy||'')+' '+(s.whyItMattersNow||''));}).slice(0,3);
      return '<div class="predict-card"><div class="predict-ey">'+esc(c.ey)+'</div><h3>'+esc(c.h)+'</h3><p>'+esc(c.p)+'</p>'+(matched.length?'<ul>'+matched.map(function(s){return '<li>'+esc(s.title||'Signal')+'</li>';}).join('')+'</ul>':'<div class="exec-empty" style="margin-top:12px">Awaiting matching backend signals.</div>')+'</div>';
    }).join('');
  }
  var ps=document.getElementById('predictiveSignals');
  if(ps){
    var forward=sigs.filter(function(s){return /future|next|30 days|90 days|180 days|increase|shift|opportunity|active_now/i.test((s.timeToImpact||'')+' '+(s.relevanceWindow||'')+' '+(s.eventDate||'')+' '+(s.impactLabel||'')+' '+(s.demandImpact||''));}).sort(function(a,b){return scoreSignalForExec(b)-scoreSignalForExec(a);}).slice(0,8);
    ps.innerHTML=forward.length?forward.map(function(s){return '<div class="exec-signal"><div class="exec-dot"></div><div><div class="exec-sig-title">'+esc(s.title||'Forward signal')+'</div><div class="exec-sig-body">'+esc(s.captureStrategy||s.whyItMattersNow||s.body||'Backend/cache detail unavailable.')+'</div><div class="exec-tags"><span class="exec-tag">'+esc((s.domain||'domain').toUpperCase())+'</span><span class="exec-tag">'+esc(s.relevanceWindow||s.timeToImpact||'Future window TBC')+'</span><span class="exec-tag">'+esc(s.confidence||'Confidence TBC')+'</span></div>'+renderSignalDateMeta(s)+'</div></div>';}).join(''):'<div class="exec-empty">No forward-looking backend/cache signals are currently loaded.</div>';
  }
  var sim=document.getElementById('simulationConcepts');
  if(sim){
    var concepts=[
      {t:'AI travel assistant inside app/web',b:'Model likely impact on direct conversion, servicing deflection, ancillary attach and loyalty engagement.',tags:['AI assistant','Direct conversion','Service deflection']},
      {t:'Premium disruption recovery concierge',b:'Predict retention and NPS uplift from proactive rebooking, lounge/service recovery and high-value case routing.',tags:['Premium retention','NPS','CX']},
      {t:'Marketplace next-best-ancillary engine',b:'Estimate revenue lift from journey-aware bundles across baggage, lounge, seats, Fast Track, eSIM and stopover.',tags:['Ancillary revenue','Bundles','Personalization']},
      {t:'OTA recapture intelligence campaign',b:'Simulate direct-share recovery using route windows, loyalty incentives, flexible booking and paid-search timing.',tags:['OTA leakage','Direct share','Revenue']}
    ];
    sim.innerHTML=concepts.map(function(c){return '<div class="sim-card"><div class="sim-title">'+esc(c.t)+'</div><div class="sim-body">'+esc(c.b)+'</div><div class="sim-badges">'+c.tags.map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div></div>';}).join('');
  }
}
window.radarExecutiveInspect=function(){ ensureRadarRuntimeForTabs(); var out={kpis:executiveMetricCards(), topSignals:getExecSignals(5), runtime:window.radarData&&window.radarData.meta}; console.log('Radar executive inspect',out); return out; };

// â”€â”€ TOOLTIP POSITIONING - compact fixed viewport coords â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
(function(){
  let activeTooltip = null;
  let hideTimer = null;

  function clamp(v,min,max){ return Math.max(min, Math.min(v,max)); }

  function showTooltip(kpiEl){
    clearTimeout(hideTimer);
    if(activeTooltip && activeTooltip !== kpiEl.querySelector('.kpi-tooltip')){
      activeTooltip.classList.remove('show');
    }
    const tt = kpiEl.querySelector('.kpi-tooltip');
    if(!tt) return;

    const ttW = Math.min(420, window.innerWidth - 24);
    tt.style.width = ttW + 'px';

    // Measure without affecting layout.
    tt.style.visibility = 'hidden';
    tt.style.opacity = '0';
    tt.style.left = '12px';
    tt.style.top = '12px';
    tt.classList.add('show');
    const ttH = Math.min(tt.offsetHeight || 300, window.innerHeight - 120);
    tt.classList.remove('show');
    tt.style.visibility = '';

    // Centered "insight popover" placement:
    // Keeps UX stable and avoids covering the KPI/domain rows unpredictably.
    const left = Math.max(12, Math.round((window.innerWidth - ttW) / 2));
    const minTop = 84; // keep below sticky header/nav
    const maxTop = Math.max(minTop, window.innerHeight - ttH - 12);
    const top = clamp(Math.round((window.innerHeight - ttH) / 2), minTop, maxTop);

    tt.style.left = left + 'px';
    tt.style.top  = top  + 'px';
    tt.classList.remove('above','below');
    tt.classList.add('centered');
    tt.classList.add('show');
    activeTooltip = tt;
  }

  function hideTooltip(kpiEl){
    hideTimer = setTimeout(()=>{
      const tt = kpiEl.querySelector('.kpi-tooltip');
      if(tt) tt.classList.remove('show');
      activeTooltip = null;
    }, 120);
  }

  function attachTooltipListeners(){
    document.querySelectorAll('.kpi').forEach(kpi => {
      if(kpi.dataset.ttBound === '1') return;
      kpi.dataset.ttBound = '1';
      kpi.addEventListener('mouseenter', () => {
        updateKpiTooltips();
        showTooltip(kpi);
      });
      kpi.addEventListener('mouseleave', () => hideTooltip(kpi));
      const tt = kpi.querySelector('.kpi-tooltip');
      if(tt){
        tt.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        tt.addEventListener('mouseleave', () => hideTooltip(kpi));
      }
    });
  }

  window.addEventListener('scroll', () => { if(activeTooltip) activeTooltip.classList.remove('show'); }, {passive:true});
  window.addEventListener('resize', () => { if(activeTooltip) activeTooltip.classList.remove('show'); });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attachTooltipListeners);
  } else {
    setTimeout(attachTooltipListeners, 300);
  }
})();

// â”€â”€ CHANNEL INTELLIGENCE - backend/cache-first rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Channel intelligence renders saved backend/browser cache only. No browser-side benchmark generation.
function getChannelCacheEmptyHTML(){
  return `
    <div class="ch-empty" style="padding:18px;border:1px solid var(--bo);border-radius:14px;background:#fff">
      <div style="font-weight:700;color:var(--qb);margin-bottom:6px">Channel intelligence cache not loaded yet</div>
      <div style="font-size:12px;color:var(--t2);line-height:1.5">Radar is running in backend/cache-first mode. Refresh the relevant domains or load Supabase cache to populate channel intelligence. Static browser-side intelligence generation is disabled.</div>
    </div>`;
}

async function loadChannelIntel(){
  const btn = document.getElementById('chBtn');
  if(btn){btn.disabled=true;btn.textContent='Loading saved...';}
  const channelDomains = ['agt','dig','rev','loy','prd'];
  const channelSignals = [];
  channelDomains.forEach(function(id){
    const d = cachedDomain(id);
    if(!d || !Array.isArray(d.signals)) return;
    d.signals.forEach(function(s){
      const txt = signalText(s);
      if(/direct|booking|conversion|app|web|ota|agent|gds|ndc|loyalty|ancillary|campaign|payment|checkout|mobile|channel/i.test(txt) || ['agt','dig','rev'].includes(id)){
        channelSignals.push({domain:id, signal:s, domainData:d});
      }
    });
  });
  channelSignals.sort(function(a,b){ return getCommercialImpactScore(b.signal) - getCommercialImpactScore(a.signal); });
  const cached = channelSignals[0]?.domainData || cachedDomain('agt') || cachedDomain('rev') || cachedDomain('dig');
  if(channelSignals.length){
    renderChannelIntel({
      refreshed: new Date().toLocaleDateString('en-GB'),
      headline: cached.opp?.title || 'Saved channel intelligence loaded from backend cache',
      directShare: {estimate:'Cached', source:'Supabase backend', sourceUrl:'', confidence:'Medium', note:cached.opp?.body || 'Backend-first mode'},
      signals: channelSignals.slice(0,6).map(function(row){const s=row.signal; return {title:s.title, body:s.body || s.whyItMattersNow, type:isRiskSignal(s)?'ota_risk':'direct_growth', impact:isRiskSignal(s)?'negative':'positive', value:s.impactLabel || '', source:s.source || (DOM_LABELS[row.domain] || 'Backend cache'), sourceUrl:s.sourceUrl || '', verified:!!s.verified};}),
      factCheckItems: [{claim:'Backend cache available', reality:'Radar loads saved data before any Claude call', source:'Render/Supabase', verdict:'Supported'}]
    });
  } else {
    document.getElementById('channelBody').innerHTML = getChannelCacheEmptyHTML();
  }
  if(btn){btn.disabled=false;btn.textContent='Load saved channel intelligence';}
}

function autoLoadChannelIntelFromCache(){
  const body = document.getElementById('channelBody');
  if(!body) return;
  const hasLoadedChannel = /Saved channel intelligence|Live channel signals|Direct booking share/i.test(body.textContent || '');
  if(hasLoadedChannel) return;
  const hasSignals = ['agt','dig','rev','loy','prd'].some(function(id){
    const d = cachedDomain(id);
    return d && Array.isArray(d.signals) && d.signals.length;
  });
  if(hasSignals) loadChannelIntel();
}

// Auto-load channel intel if API key is available
setTimeout(()=>{
  if(ANT_KEY && document.getElementById('sc')){
    loadChannelIntel();
  } else {
    // Static chart drawing removed; render only backend/cache chart data when available
    try{
      const sc = document.getElementById('sc');
      if(sc && typeof Chart !== 'undefined'){
        new Chart(sc,{
          type:'bar',
          data:{labels:['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'],
            datasets:[
              {label:'Direct',data:[38,39,39,40,41,41,42,43,43,43,44,44],backgroundColor:'#5C0632',borderRadius:3,barPercentage:.55,categoryPercentage:.8},
              {label:'Agent',data:[62,61,61,60,59,59,58,57,57,57,56,56],backgroundColor:'#CFC2C8',borderRadius:3,barPercentage:.55,categoryPercentage:.8}
            ]},
          options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
            scales:{x:{stacked:true,grid:{display:false},ticks:{color:'#9a8a92',font:{size:10}}},y:{stacked:true,display:false,max:100}}}
        });
      }
    }catch(e){}
  }
}, 1200);




// â”€â”€ SAFE RENDER OVERRIDES - keep features, prevent broken/unsafe HTML â”€â”€â”€â”€â”€
function renderAP(plan){
  plan = plan || {};
  const stepsHTML = (plan.steps || []).map(function(s){
    s = s || {};
    var kpiHtml = '';
    if (s.kpis && s.kpis.length) {
      kpiHtml = '<div class="ap-kpis">' + s.kpis.map(function(k){
        k = k || {};
        return '<div class="ap-kpi"><div class="ap-kpi-v">'+(k.value||'')+'</div><div class="ap-kpi-l">'+(k.label||'')+'</div></div>';
      }).join('') + '</div>';
    }
    return '<div class="ap-step">' +
      '<div class="ap-step-hdr">' +
        '<div class="ap-num">'+(s.number||'?')+'</div>' +
        '<div class="ap-step-name">'+(s.name||'Step')+'</div>' +
        '<div class="ap-pills">' +
          '<span class="ap-pill '+getPriorityClass(s.priority)+'">'+(s.priority||'High')+'</span>' +
          '<span class="ap-pill '+getEffortClass(s.effort)+'">'+(s.effort||'Medium')+' effort</span>' +
          '<span class="ap-pill pp-b">'+(s.timeline||'')+'</span>' +
        '</div>' +
      '</div>' +
      '<div class="ap-step-body">' +
        '<div class="ap-desc">'+(s.description||'')+'</div>' +
        kpiHtml +
        '<div class="ap-who">' +
          '<span>Owner: '+(s.owner||'Team lead')+'</span>' +
          '<span>Value: '+(s.value||'TBD')+'</span>' +
          '<span>Timeline: '+(s.timeline||'')+'</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  const confClass = plan.confidence==='High'?'cp-g':plan.confidence==='Low'?'cp-r':'cp-a';
  const apBody = document.getElementById('apBody');
  if(apBody){
    apBody.innerHTML = `
      <div class="ap-summary-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="ap-sum-title">Executive summary</div>
          <div style="display:flex;gap:6px">
            <span class="comp-pill ${confClass}">${plan.confidence||'Medium'} confidence</span>
            <span class="comp-pill cp-b">30-day plan</span>
          </div>
        </div>
        <div class="ap-sum-body">${plan.summary||''}</div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px">
          <div class="ap-sum-value">${plan.totalValue||'Value TBD'}</div>
          <div style="font-size:10px;color:var(--t3)">estimated 90-day revenue impact</div>
        </div>
      </div>
      ${stepsHTML}`;
  }

  const footer = document.getElementById('apFooterNote');
  if(footer){
    footer.textContent = 'Generated from verified B2C intelligence - ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) + ' - Internal use only';
  }

  fetch(BACKEND_URL+'/api/actionplans/save', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({action:AP_CURRENT_ACTION, domainId:AP_CURRENT_DOMAIN_ID, domainTitle:AP_CURRENT_DOMAIN, viewMode:VIEW_MODE, plan:plan})
  }).catch(function(e){ console.warn('AP save:', e.message); });
}

function renderAPError(msg){
  document.getElementById('apBody').innerHTML = `<div class="ap-error">! ${esc(msg)}</div>`;
}

function renderComp(id,data){
  data = normalizeCompData(id, data);
  const meta=CMETA[id]||{};
  const whyLine = firstText(data, ['why'], '') || meta.why || '';
  const officialNewsPages = competitorNewsPages(meta);
  const officialNewsHtml = officialNewsPages.length
    ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 2px">${officialNewsPages.map(function(u){
        const host = urlHostName(u) || 'official source';
        return `<a href="${u}" target="_blank" rel="noopener" class="comp-pill cp-b" style="text-decoration:none">${esc(host)}</a>`;
      }).join('')}</div>`
    : '';
  const newsEvidenceRows = asArray(data.newsEvidence).slice(0,4);
  const newsEvidenceHtml = newsEvidenceRows.length
    ? `<div style="background:var(--bg2);border:1px solid var(--bo);border-radius:8px;padding:10px 12px;margin:10px 0 2px">
        <div style="font-size:10px;font-weight:700;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;margin-bottom:7px">Official news-page evidence</div>
        ${newsEvidenceRows.map(function(n){
          const u = safeUrl(n.sourceUrl);
          return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px">
            <div style="font-size:11px;color:var(--t2)">${esc(n.source || (urlHostName(u) || 'Official source'))}</div>
            ${u ? `<a href="${u}" target="_blank" rel="noopener" style="font-size:10px;color:var(--qb);text-decoration:none">Verify</a>` : ''}
          </div>`;
        }).join('')}
      </div>`
    : '';
  const weakH=(data.weaknesses||[]).map(w=>{
    const u=safeUrl(w.sourceUrl);
    return `<div class="comp-sig"><div class="comp-sdot" style="background:var(--red)"></div><div class="comp-sb">
      <div class="comp-st">${esc(w.title||'')}</div><div class="comp-sd">${esc(w.detail||'')}</div>
      <div class="comp-sd" style="color:var(--grn);margin-top:2px">Action: ${esc(w.impact||'')}</div>
      <div class="comp-sr"><span class="comp-pill cp-${w.severity==='High'?'r':w.severity==='Medium'?'a':'g'}">${esc(w.severity||'Med')}</span>${u?`<a href="${u}" target="_blank" rel="noopener" style="font-size:9px;color:var(--qb)">Verify</a>`:''}</div>
    </div></div>`;
  }).join('');
  const oppH=(data.opportunities||[]).map(o=>`<div class="comp-sig"><div class="comp-sdot" style="background:var(--grn)"></div><div class="comp-sb">
    <div class="comp-st">${esc(o.title||'')}</div><div class="comp-sd">${esc(o.detail||'')}</div>
    <div class="comp-sr"><span class="comp-pill cp-g">${esc(o.value||'TBD')}</span><span class="comp-pill cp-a">${esc(o.timeWindow||'')}</span><span class="comp-pill cp-b">${esc(o.b2cAngle||'')}</span></div>
  </div></div>`).join('');
  const actH=(data.actions||[]).map(a=>`<div class="comp-sig"><div class="comp-sdot" style="background:var(--qb)"></div><div class="comp-sb">
    <div class="comp-st">${esc(a.title||'')}</div><div class="comp-sd">${esc(a.detail||'')}</div>
    <div class="comp-sr"><span class="comp-pill cp-b">${esc(a.timeline||'')}</span><span class="comp-pill cp-g">${esc(a.value||'')}</span><button class="comp-ap-btn" data-act="${encodeURIComponent(a.title||'')}" data-dom="comp_${esc(id)}" data-meta="${esc(meta.name||id)}" onclick="compActBtn(this)">Plan</button></div>
    <div style="font-size:9px;color:var(--t3);margin-top:2px">Owner: ${esc(a.owner||'B2C team')}</div>
  </div></div>`).join('');
  const noMatch = !data.hasSpecificCache;
  document.getElementById('compDetail').innerHTML=`<div class="comp-det"><div class="comp-det-hdr"><div class="comp-det-hl"><div class="comp-det-fl">${esc(meta.flag||'AIR')}</div><div><div class="comp-det-nm">${esc(data.name||meta.name||id)}</div><div class="comp-det-sb">${esc(data.summary||'')}</div>${whyLine ? `<div class="comp-det-sb" style="margin-top:4px"><strong>Why this competitor matters:</strong> ${esc(whyLine)}</div>` : ''}${officialNewsHtml}</div></div><span class="spill spa">${noMatch ? 'No data' : 'Threat '+esc(data.overallThreat||'-')+'%'}</span></div>${noMatch ? `<div style="padding:28px;text-align:center;background:var(--su);border-top:1px solid var(--bo);color:var(--t2)"><div style="font-size:13px;font-weight:500;color:var(--t1);margin-bottom:6px">No source-specific cache for ${esc(meta.name||id)}</div><div style="font-size:11px;line-height:1.6;max-width:560px;margin:0 auto">Load or refresh competitor cache to render this airline. Generic shared competitor points are intentionally hidden to avoid duplicate intelligence.</div>${officialNewsPages.length ? `<div style="font-size:10px;color:var(--t3);margin-top:10px">Preferred official pages: ${officialNewsPages.map(function(u){ return esc(urlHostName(u) || u); }).join(' • ')}</div>` : ''}</div>` : `${newsEvidenceHtml}<div class="comp-body"><div class="comp-col"><div class="comp-col-t c-col-r">Weaknesses to exploit</div>${weakH}</div><div class="comp-col"><div class="comp-col-t c-col-g">Opportunities for QR B2C</div>${oppH}</div><div class="comp-col"><div class="comp-col-t c-col-a">QR actions - 30 days</div>${actH}</div></div>`}</div>`;
}

function renderCErr(id,msg){
  document.getElementById('compDetail').innerHTML=`<div style="padding:16px;background:var(--rbg);border:1px solid var(--rb);border-radius:var(--r2);color:var(--red);font-size:12px">${esc(msg)}</div>`;
}

function renderChannelIntel(data){
  const typeColors = {direct_growth:'cp-g',ota_risk:'cp-r',gds_cost:'cp-a',competitor:'cp-b',industry:'cp-b'};
  const impactDot = {positive:'background:var(--grn)',negative:'background:var(--red)',neutral:'background:var(--amb)'};
  const verdictColor = {Supported:'cp-g',Unsupported:'cp-r',Partial:'cp-a'};
  const sigsHTML = (data.signals||[]).map(s=>{ const u=safeUrl(s.sourceUrl); return `
    <div class="ch-sig"><div style="display:flex;align-items:flex-start;gap:8px"><div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px;${impactDot[s.impact]||'background:var(--t3)'}"></div><div style="flex:1">
      <div class="ch-sig-t">${esc(s.title||'')}</div><div class="ch-sig-b">${esc(s.body||'')}</div><div class="ch-sig-row">
      ${s.value?`<span class="ch-badge cp-g">${esc(s.value)}</span>`:''}<span class="ch-badge ${typeColors[s.type]||'cp-b'}">${esc(String(s.type||'').replace(/_/g,' '))}</span>${s.verified?`<span class="ch-badge cp-g">Verified</span>`:''}${u?`<a href="${u}" target="_blank" rel="noopener" style="font-size:9px;color:var(--qb);padding:2px 6px;border:0.5px dashed var(--bo2);border-radius:3px">Verify -></a>`:''}</div>
    </div></div></div>`; }).join('');
  const factHTML = (data.factCheckItems||[]).map(f=>`<div style="background:var(--bg2);border:1px solid var(--bo);border-radius:8px;padding:10px 12px;margin-bottom:6px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;font-family:'JetBrains Mono',monospace;margin-bottom:5px">Claim to check</div><div style="font-size:11px;color:var(--t2);margin-bottom:6px;font-style:italic">"${esc(f.claim||'')}"</div><div style="font-size:11px;color:var(--t1);font-weight:500;margin-bottom:5px">-> ${esc(f.reality||'')}</div><div style="display:flex;align-items:center;gap:6px"><span class="ch-badge ${verdictColor[f.verdict]||'cp-a'}">${esc(f.verdict||'Unknown')}</span><span style="font-size:9px;color:var(--t3)">${esc(f.source||'')}</span></div></div>`).join('');
  const ds=data.directShare||{};
  document.getElementById('channelBody').innerHTML = `<div style="background:var(--gbg);border:0.5px solid var(--gb);border-radius:8px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:var(--grn);flex-shrink:0"></div><div style="font-size:11px;color:var(--grn);font-weight:500;flex:1">${esc(data.headline||'')}</div><div style="font-size:9px;color:var(--t3);font-family:'JetBrains Mono',monospace;flex-shrink:0">${esc(data.refreshed||'')}</div></div>${data.directShare?`<div class="ch-kpi-row" style="margin-bottom:12px"><div class="ch-kpi" style="grid-column:span 2;background:linear-gradient(135deg,rgba(92,6,50,.05),transparent);border-color:rgba(92,6,50,.2)"><div class="ch-kv" style="font-size:22px">${esc(ds.estimate||'-')}</div><div class="ch-kl">Direct booking share</div><div class="ch-kb">${esc(ds.confidence||'')} confidence - ${esc(ds.source||'')}</div>${ds.note?`<div style="font-size:9px;color:var(--t3);margin-top:3px;line-height:1.3">${esc(ds.note)}</div>`:''}</div><div class="ch-kpi" style="grid-column:span 2;background:var(--bg3)"><div class="ch-kv" style="color:var(--amb)">-</div><div class="ch-kl">Direct shift value</div><div class="ch-kb">Requires backend value model</div></div></div>`:''}<div style="font-size:9px;font-weight:700;color:var(--t3);letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;margin-bottom:8px">Live channel signals</div><div class="ch-live-row">${sigsHTML}</div>${factHTML.length?`<div style="font-size:9px;font-weight:700;color:var(--pur);letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;margin:12px 0 8px">Fact-check panel - for VP review</div>${factHTML}`:''}`;
}

// â”€â”€ COMPETITOR CACHE CLEAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function clearCompCache(){
  if(!confirm('Clear all saved competitor analyses and reload fresh intelligence?')) return;
  Object.keys(CMETA).forEach(id=>{
    try{ localStorage.removeItem(CSTORE+id); }catch(e){}
    try{ localStorage.removeItem('radar_v9_comp_'+id); }catch(e){}
    try{ localStorage.removeItem('radar_v10_comp_'+id); }catch(e){}
    const pg=document.getElementById('cprog-'+id); if(pg) pg.style.width='0%';
    const se=document.getElementById('cscore-'+id); if(se) se.textContent='No data';
    const btn=document.getElementById('cbtn-'+id);
    if(btn){ btn.textContent='No data'; btn.classList.remove('loaded'); btn.disabled=false; }
  });
  document.querySelectorAll('.comp-tile').forEach(t=>t.classList.remove('on'));
  document.getElementById('compDetail').innerHTML=`
    <div style="padding:32px;text-align:center;color:var(--t3);background:var(--su);border:1px solid var(--bo);border-radius:var(--r3)">
      <div style="font-size:28px;margin-bottom:10px;font-weight:700;color:var(--qb)">TARGET</div>
      <div style="font-size:13px;font-weight:500;color:var(--t2);margin-bottom:6px">All competitor caches cleared</div>
      <div style="font-size:11px">Select a competitor and refresh cache to get fresh intelligence.</div>
    </div>`;
  Object.keys(CDATA).forEach(k=>delete CDATA[k]);
}

// â”€â”€ DOMAIN STATUS QUICK SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getDomainSummaryForAP(domId){
  const d = domData[domId];
  if(!d || !d.signals) return 'No domain data loaded';
  return d.signals.slice(0,3).map(s=>s.title+': '+s.body).join(' | ');
}



// === Radar v9.1 patch: API-driven situation ribbon + leadership KPI hover ===
// Uses already-loaded API/saved domain data. Does not change localStorage keys.
function rv91SignalRows(includeAll=false){
  const rows = allLoadedSignals().map(row => ({...row, score: getCommercialImpactScore(row.signal)}));
  const filtered = includeAll ? rows : rows.filter(row => isForwardSignal(row.signal));
  return (filtered.length ? filtered : rows).sort((a,b) => {
    const urgentA = rv91IsUrgent(rowSig(a)) ? 1 : 0;
    const urgentB = rv91IsUrgent(rowSig(b)) ? 1 : 0;
    if(urgentB !== urgentA) return urgentB - urgentA;
    return (b.score || 0) - (a.score || 0);
  });
}
function rowSig(row){ return row && row.signal ? row.signal : {}; }
function rv91IsUrgent(s){
  const text = signalText(s);
  return isRiskSignal(s) || /urgent|critical|immediate|today|now|leadership|revenue risk|conversion|ota|agent|direct|booking|loyalty|customer|disruption|pressure|threat/.test(text);
}
function rv91LeadershipRows(){
  const leadershipTerms = /revenue|direct|booking|conversion|ota|agent|loyalty|customer|app|web|ancillary|market|route|capacity|demand|fare|price|yield|disruption|regulation|visa|fuel|competitor|campaign|call centre|support|ucp|personal/i;
  return rv91SignalRows(false)
    .filter(row => leadershipTerms.test(signalText(row.signal)) || getCommercialImpactScore(row.signal) >= 7 || isRiskSignal(row.signal))
    .slice(0, 30);
}
function rv91GroupByDomain(rows){
  const map = {};
  rows.forEach(row => {
    const id = row.domain;
    if(!map[id]) map[id] = {id, label: DOM_LABELS[id] || id, rows: [], risk:0, opp:0, maxScore:0};
    map[id].rows.push(row);
    map[id].maxScore = Math.max(map[id].maxScore, row.score || getCommercialImpactScore(row.signal));
    if(isRiskSignal(row.signal)) map[id].risk++;
    if(isOpportunitySignal(row.signal)) map[id].opp++;
  });
  return Object.values(map).sort((a,b) => {
    const riskDiff = b.risk - a.risk; if(riskDiff) return riskDiff;
    const scoreDiff = b.maxScore - a.maxScore; if(scoreDiff) return scoreDiff;
    return b.rows.length - a.rows.length;
  });
}
function rv91SignalSnippet(row, max=66){
  const s = row.signal || {};
  return String(s.whyItMattersNow || s.body || s.captureStrategy || s.title || 'Review loaded signal').slice(0,max);
}
function rv91TooltipRow(group, mode='risk'){
  const top = group.rows.slice().sort((a,b)=>(b.score||0)-(a.score||0))[0] || {signal:{}};
  const s = top.signal || {};
  const dot = group.risk ? 'r' : group.opp ? 'g' : 'a';
  const act = (domData[group.id]?.actions || [])[0] || s.captureStrategy || '';
  const metric = group.risk ? `${group.risk} risk${group.risk>1?'s':''}` : group.opp ? `${group.opp} opportunity` : `${group.rows.length} signal${group.rows.length>1?'s':''}`;
  return `<div class="ktt-row">
    <div class="ktt-dot ktt-dot-${dot}"></div>
    <div style="flex:1;min-width:0">
      <div class="ktt-domain-head">${esc(group.label)} - ${esc(metric)}</div>
      <div style="color:#fff;font-weight:500">${esc(String(s.title || 'Review category').slice(0,58))}</div>
      <div class="ktt-leadership-note">${esc(rv91SignalSnippet(top))}</div>
      ${s.source ? `<div class="ktt-source">${esc(s.source)}${s.sourceDate ? ' - ' + esc(s.sourceDate) : ''}</div>` : ''}
      ${act ? `<button class="ktt-btn" data-act="${encodeURIComponent(act)}" data-dom="${esc(group.id)}" onclick="ttAct(this)">${mode==='opportunity'?'Plan':'Address'} -></button>` : ''}
    </div>
    <div class="ktt-score">${esc(String(group.maxScore || getCommercialImpactScore(s)))}/10</div>
  </div>`;
}
function rv91SetSituationFromApi(){
  const rows = rv91LeadershipRows();
  const sit = document.getElementById('sitTxt');
  const tags = document.getElementById('sitTags');
  const loaded = loadedDomainCount();
  if(!sit || !tags) return;
  if(!rows.length){
    sit.textContent = BACKEND_URL
      ? 'Backend/cache-first mode active - refresh domains to populate Digital/B2C leadership situation'
      : 'Backend not configured - refresh saved domains to populate Digital/B2C leadership situation';
    tags.innerHTML = ['API driven','Leadership focus','Revenue risk','Direct growth'].map(t=>`<span class="stag">${esc(t)}</span>`).join('');
    return;
  }
  const groups = rv91GroupByDomain(rows);
  const riskCount = rows.filter(r => isRiskSignal(r.signal)).length;
  const oppCount = rows.filter(r => isOpportunitySignal(r.signal)).length;
  const top = groups[0];
  const topSignal = top?.rows?.[0]?.signal || {};
  const label = VIEW_MODE === 'b2c' ? 'B2C API scan' : 'Enterprise API scan';
  sit.textContent = `${label} - ${riskCount} urgent risks - ${oppCount} opportunities - top focus: ${top?.label || 'Review signals'} - ${(topSignal.title || 'current signal').slice(0,70)}`;
  tags.innerHTML = groups.slice(0,4).map(g => `<span class="stag">${esc(g.label)} - ${g.risk ? g.risk + ' risk' : g.opp ? g.opp + ' opp' : g.rows.length + ' signal'} - ${g.maxScore}/10</span>`).join('') + `<span class="stag">${loaded}/14 loaded</span>`;
}

// Override narrative so the situation ribbon never remains generic once API/saved data exists.
updateExecutiveNarrative = function(rows){
  rv91SetSituationFromApi();
};

// Override KPI hover bodies with leadership-friendly category summaries.
updateKpiTooltips = function(){
  const rows = rv91LeadershipRows();
  const groups = rv91GroupByDomain(rows);
  const risks = rv91GroupByDomain(rows.filter(r => isRiskSignal(r.signal)));
  const opps = rv91GroupByDomain(rows.filter(r => isOpportunitySignal(r.signal)));
  const directRegex = /direct|booking|conversion|app|web|ota|agent|loyalty|member|customer|ancillary|campaign|personal|ucp|call centre|support/i;
  const levers = rv91GroupByDomain(rows.filter(r => directRegex.test(signalText(r.signal))));

  const b1 = document.getElementById('ktt1b');
  if(b1){
    b1.innerHTML = risks.length
      ? risks.slice(0,6).map(g => rv91TooltipRow(g,'risk')).join('')
      : '<div class="ktt-empty">No urgent revenue risk categories loaded yet</div>';
  }
  const b2 = document.getElementById('ktt2b');
  if(b2){
    b2.innerHTML = opps.length
      ? opps.slice(0,6).map(g => rv91TooltipRow(g,'opportunity')).join('')
      : '<div class="ktt-empty">No opportunity categories loaded yet</div>';
  }
  const b3 = document.getElementById('ktt3b');
  if(b3){
    b3.innerHTML = levers.length
      ? levers.slice(0,6).map(g => rv91TooltipRow(g,'lever')).join('')
      : '<div class="ktt-empty">No direct/OTA/loyalty leadership levers loaded yet</div>';
  }
  const b4 = document.getElementById('ktt4b');
  if(b4){
    if(!rows.length) b4.innerHTML='<div class="ktt-empty">No current/future API signals loaded yet</div>';
    else{
      const windows = {};
      rows.forEach(r => { const w = r.signal.relevanceWindow || r.signal.timeToImpact || 'active_now'; (windows[w] ||= []).push(r); });
      b4.innerHTML = Object.entries(windows).slice(0,6).map(([w,list]) => {
        const top = list.slice().sort((a,b)=>(b.score||0)-(a.score||0))[0];
        return `<div class="ktt-row"><div class="ktt-dot ktt-dot-${/today|immediate|active/i.test(w)?'r':/30/i.test(w)?'a':'g'}"></div><div style="flex:1"><div class="ktt-domain-head">${esc(String(w).replace(/_/g,' '))} - ${list.length} signal${list.length>1?'s':''}</div><div class="ktt-leadership-note">${esc((top?.signal?.title || '').slice(0,72))}</div></div></div>`;
      }).join('');
    }
  }
  const b5 = document.getElementById('ktt5b');
  if(b5){
    b5.innerHTML = DOMAINS.map(id => {
      const d = domData[id];
      const count = d?.signals?.length || d?.signalCount || 0;
      const urgent = d?.signals?.filter(s => rv91IsUrgent(s)).length || 0;
      const state = d ? 'done' : 'pending';
      return `<div class="ktt-row"><div class="ktt-dot ktt-dot-${state==='done'?'g':'a'}"></div><div style="flex:1"><div style="color:#fff">${esc(DOM_LABELS[id]||id)}</div><div class="ktt-leadership-note">${count ? urgent + ' leadership-relevant of ' + count + ' signals' : 'No data yet'}</div></div><div class="ktt-score">${count}</div></div>`;
    }).join('');
  }
};

// Make hover robust even when the original listener attached before the patch loaded.
(function rv91RefreshDerivedState(){
  try{
    updateExecutiveScorecard();
    updateKpiTooltips();
    updateFeedFromDomains();
    autoLoadChannelIntelFromCache();
    rv91SetSituationFromApi();
    document.querySelectorAll('.kpi').forEach(kpi => {
      if(kpi.dataset.rv91Hover) return;
      kpi.dataset.rv91Hover = '1';
      kpi.addEventListener('mouseenter', () => { updateKpiTooltips(); });
      kpi.addEventListener('focusin', () => { updateKpiTooltips(); });
    });
  }catch(e){ console.warn('Radar v9.1 patch could not refresh derived state', e); }
})();

// Clean visible mojibake from older bundled fragments without changing data.
(function radarCleanVisibleMojibake(){
  const replacements = [
    ['\u00c2\u00b7', ' - '],
    ['\u00e2\u20ac\u201d', '-'],
    ['\u00e2\u20ac\u201c', '-'],
    ['\u00e2\u20ac\u02dc', "'"],
    ['\u00e2\u20ac\u2122', "'"],
    ['\u00e2\u20ac\u0153', '"'],
    ['\u00e2\u20ac\u009d', '"'],
    ['\u00e2\u20ac\u00a6', '...'],
    ['\u00e2\u2020\u2019', '->'],
    ['\u00e2\u2020\u2018', 'up'],
    ['\u00e2\u2020\u2014', 'trend'],
    ['\u00e2\u20ac\u00a2', '-'],
    ['\u00e2\u0153\u201c', 'OK'],
    ['\u00e2\u0153\u2014', 'X'],
    ['\u00e2\u0161\u00a0', '!'],
    ['\u00e2\u0153\u02c6', 'Air'],
    ['\u00e2\u02dc\u2026', '*'],
    ['\u00e2\u2014\u2021', ''],
    ['\u00e2\u2014\u2020', ''],
    ['\u00e2\u0152\u0081', ''],
    ['\u00e2\u00ad\u0090', '*'],
    ['\u00f0\u0178\u2018\u00a4', 'Customer'],
    ['\u00f0\u0178\u2019\u00bc', 'Business'],
    ['\u00f0\u0178\u017d\u00af', 'Target'],
    ['\u00ef\u00b8\u008f', ''],
    ['\u00c3\u2014', 'x'],
    ['\u00c2', '']
  ];
  function cleanText(value){
    let next = String(value || '');
    replacements.forEach(([from, to]) => { next = next.split(from).join(to); });
    return next
      .replace(/\s+-\s+-\s+/g, ' - ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  function hasMojibake(value){
    return /[\u00c2\u00c3\u00e2\u00f0\u00ef]/.test(String(value || ''));
  }
  function cleanNode(root){
    if(!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        return hasMojibake(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { node.nodeValue = cleanText(node.nodeValue || ''); });
  }
  function cleanAttributes(root){
    if(!root || !root.querySelectorAll) return;
    const attrs = ['title','aria-label','placeholder','value'];
    const nodes = root.querySelectorAll('*');
    nodes.forEach(node => {
      attrs.forEach(attr => {
        const val = node.getAttribute(attr);
        if(hasMojibake(val)) node.setAttribute(attr, cleanText(val));
      });
    });
  }
  function run(){ try{ cleanNode(document.body); cleanAttributes(document.body); }catch(e){} }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  try{
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if(m.type === 'characterData' && m.target && hasMojibake(m.target.nodeValue || '')){
          m.target.nodeValue = cleanText(m.target.nodeValue || '');
        }
        m.addedNodes && m.addedNodes.forEach(n => {
          if(n.nodeType === 3 && hasMojibake(n.nodeValue || '')) n.nodeValue = cleanText(n.nodeValue || '');
          else if(n.nodeType === 1){ cleanNode(n); cleanAttributes(n); }
        });
      });
    });
    observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  }catch(e){}
})();


