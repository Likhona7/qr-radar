console.log('RADAR_V11_5_CIOS_V12_LAYER_2026_05_28 loaded');

// CUSTOMER INTELLIGENCE OS - backend/cache only
var CIOS_STORE = 'qr_cios_v1_';
var CIOS_DATA = {};
var CIOS_ACTIVE_TAB = 'heatmap';
var CIOS_SOURCES_LOADED = 0;
var CIOS_SOURCES = ['reddit','flyertalk','trustpilot','skytrax','tripadvisor','quora','twitter','youtube','bluesky','mastodon','consumer','appstore','googleplay'];

function cacheOnlyNotice(title){
  return '<div class="empty-d"><div class="er"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg></div><div class="et"><strong>'+esc(title || 'No backend/cache data loaded')+'</strong><br>Connect to the backend server and click <strong>Refresh all</strong> to populate this section with live intelligence. Data is fetched from the Render backend and cached in Supabase.</div></div>';
}

function switchCIOSTab(tab, el) {
  CIOS_ACTIVE_TAB = tab;
  document.querySelectorAll('.cios-tab').forEach(function(t){ t.classList.remove('on'); });
  if(el) el.classList.add('on');
  var panels = ['heatmap','audience','keywords','growing','competitor','requests','appratings','ota','opps','narrative'];
  panels.forEach(function(p){
    var panel = document.getElementById('ctab-' + p);
    if(panel) panel.style.display = (p === tab) ? 'block' : 'none';
  });
  renderCIOSPanels();
  if(tab === 'heatmap'){
    setTimeout(function(){ ciosAutoExpandFirstCluster(); }, 120);
  }
}

function toggleCluster(id) {
  var body = document.getElementById(id + '-body');
  var arr = document.getElementById(id + '-arr');
  if(!body) return;
  var open = body.classList.toggle('open');
  if(arr){
    if(open) arr.classList.add('open');
    else arr.classList.remove('open');
  }
}

function ciosAutoExpandFirstCluster(){
  var first = document.querySelector('.cios-cluster');
  if(!first) return;
  var id = first.id;
  if(!id) return;
  var body = document.getElementById(id + '-body');
  var arr = document.getElementById(id + '-arr');
  if(body && !body.classList.contains('open')){
    body.classList.add('open');
    if(arr) arr.classList.add('open');
  }
}

function toggleHMView(btn) {
  var cluster = document.getElementById('hmClusterView');
  var flat = document.getElementById('hmFlatView');
  if(!cluster || !flat || !btn) return;
  var showFlat = btn.getAttribute('data-mode') !== 'flat';
  cluster.style.display = showFlat ? 'none' : 'block';
  flat.style.display = showFlat ? 'block' : 'none';
  btn.setAttribute('data-mode', showFlat ? 'flat' : 'cluster');
  btn.textContent = showFlat ? 'Cluster view' : 'Flat view';
}

window.toggleCluster = toggleCluster;
window.toggleHMView = toggleHMView;

function saveCIOSData(key, data) {
  if(!data || data.score == null) return;
  try { localStorage.setItem(CIOS_STORE + key, JSON.stringify({ at: new Date().toISOString(), data: data })); } catch(e) {}
}

function loadCIOSData(key) {
  try { var r = localStorage.getItem(CIOS_STORE + key); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}

function withCIOSMeta(data, meta){
  return Object.assign({}, data || {}, meta || {});
}

function getSentimentSource(src){
  if(window.radarData && window.radarData.sentiment && window.radarData.sentiment[src]){
    return withCIOSMeta(window.radarData.sentiment[src], { _cacheLoadedAt: new Date().toISOString(), _sourceKey: src });
  }
  if(typeof sentimentFromDomainCache === 'function'){
    var derived = sentimentFromDomainCache(src);
    if(derived){
      if(window.radarData && window.radarData.sentiment) window.radarData.sentiment[src] = derived;
      return withCIOSMeta(derived, { _cacheLoadedAt: new Date().toISOString(), _sourceKey: src });
    }
  }
  try{
    var raw = localStorage.getItem('qr_v9_sent_'+src) || localStorage.getItem(CIOS_STORE+src);
    if(!raw) return null;
    var parsed = JSON.parse(raw);
    var data = parsed.data || parsed;
    var normalised = normalizeSentimentData(src, data);
    return withCIOSMeta(normalised, { _cacheLoadedAt: parsed.at || new Date().toISOString(), _sourceKey: src });
  }catch(e){ return null; }
}

function getAllSentimentSources(){
  return CIOS_SOURCES.map(getSentimentSource).filter(function(d){
    return d && (
      d.overallSentiment != null ||
      (d.painPoints || []).length ||
      (d.improvements || []).length ||
      d.topComplaint
    );
  });
}

function ciosParseNumber(v){
  if(typeof v === 'number' && Number.isFinite(v)) return v;
  if(typeof v === 'string'){
    var m = v.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    if(m) return Number(m[0]);
  }
  return null;
}

function ciosPostCountMeta(data){
  var direct = ciosParseNumber(data && data.totalMentions);
  if(Number.isFinite(direct) && direct >= 0) return { value: Math.round(direct), estimated: false };
  var pain = (data && data.painPoints ? data.painPoints.length : 0);
  var strengths = (data && data.strengths ? data.strengths.length : 0);
  var improvements = (data && data.improvements ? data.improvements.length : 0);
  var estimated = (pain * 26) + (strengths * 18) + (improvements * 22);
  return { value: Math.max(0, estimated), estimated: true };
}

function ciosEstimatePostCount(data){
  return ciosPostCountMeta(data).value;
}

function ciosConfidenceMeta(data){
  var direct = ciosParseNumber(data && (data.confidencePct || data.confidence || data.confidenceScore));
  if(Number.isFinite(direct)) return { value: Math.max(0, Math.min(100, Math.round(direct))), estimated: false };
  var signals = (data && data.painPoints ? data.painPoints.length : 0) +
    (data && data.strengths ? data.strengths.length : 0) +
    (data && data.improvements ? data.improvements.length : 0) +
    (data && data.verbatims ? data.verbatims.length : 0);
  var hasTop = (data && (data.topComplaint || data.topPraise)) ? 1 : 0;
  var score = 52 + Math.min(40, (signals * 2) + (hasTop * 6));
  return { value: Math.max(45, Math.min(94, Math.round(score))), estimated: true };
}

function ciosEstimateConfidence(data){
  return ciosConfidenceMeta(data).value;
}

function ciosFreshnessLabel(data){
  if(!data || !data._cacheLoadedAt) return 'cache';
  var ts = Date.parse(data._cacheLoadedAt);
  if(!Number.isFinite(ts)) return 'cache';
  var ageHours = (Date.now() - ts) / (1000 * 60 * 60);
  if(ageHours < 24) return 'today';
  if(ageHours < 48) return '1 day';
  return Math.round(ageHours / 24) + ' days';
}

function ciosSourceMetaMarkup(postCount, confidencePct, freshness, postEstimated, confidenceEstimated){
  var freshCls = freshness === 'today' ? 'cios-src-time' : 'cios-src-time stale';
  return '<div class="cios-src-conf">' +
    '<span class="cios-src-conf-num">' + (postCount ? Number(postCount).toLocaleString() : '-') + '</span>' +
    '<span class="cios-src-fresh">' + (postEstimated ? 'est. mentions' : 'mentions') + '</span>' +
    '<span style="color:var(--bo)">|</span>' +
    '<span class="cios-src-conf-num">' + (confidencePct ? confidencePct + '%' : '-') + '</span>' +
    '<span class="cios-src-fresh">' + (confidenceEstimated ? 'est. confidence' : 'confidence') + '</span>' +
    '<span class="' + freshCls + '">' + esc(freshness || 'cache') + '</span>' +
  '</div>';
}

function updateCIOSSourceTile(src, data) {
  var score = data && (data.score != null ? data.score : data.overallSentiment);
  var bar = document.getElementById('cbar-' + src);
  var scoreEl = document.getElementById('cscore-' + src);
  var subEl = document.getElementById('csub-' + src);
  if(score == null){
    if(bar) bar.style.width = '0%';
    if(scoreEl) scoreEl.textContent = '-';
    if(subEl) subEl.innerHTML = ciosSourceMetaMarkup(0, 0, 'cache', true, true);
    return false;
  }
  var color = score >= 65 ? 'var(--grn)' : score >= 45 ? 'var(--amb)' : 'var(--red)';
  if(bar) bar.style.width = score + '%';
  if(scoreEl) { scoreEl.textContent = score + '%'; scoreEl.style.color = color; }
  if(subEl){
    var postMeta = ciosPostCountMeta(data);
    var confidenceMeta = ciosConfidenceMeta(data);
    subEl.innerHTML = ciosSourceMetaMarkup(
      postMeta.value,
      confidenceMeta.value,
      ciosFreshnessLabel(data),
      postMeta.estimated,
      confidenceMeta.estimated
    );
  }
  return true;
}

function updateCIOSOverall() {
  var data = getAllSentimentSources();
  var scores = data.map(function(d){ return d.overallSentiment; }).filter(function(v){ return v != null; });
  var scoreEl = document.getElementById('ciosOverallScore');
  var barEl = document.getElementById('ciosBarFill');
  var critEl = document.getElementById('ciosCritCount');
  var sigEl = document.getElementById('ciosSigCount');
  var srcEl = document.getElementById('ciosSrcCount');
  if(!scores.length){
    if(scoreEl) scoreEl.textContent = '-';
    if(barEl) barEl.style.width = '0%';
  } else {
    var avg = Math.round(scores.reduce(function(a,b){ return a+b; }, 0) / scores.length);
    if(scoreEl) scoreEl.textContent = avg;
    if(barEl){
      barEl.style.width = avg + '%';
      barEl.style.background = avg >= 65 ? 'rgba(26,106,72,.75)' : avg >= 45 ? 'rgba(176,112,32,.75)' : 'rgba(192,57,43,.75)';
    }
  }
  var issues = data.flatMap(function(d){ return d.painPoints || []; });
  if(critEl) critEl.textContent = issues.filter(function(p){
    return /risk|critical|delay|refund|complaint|failure|negative|fraud|abandon|leakage/i.test((p.impact || '') + ' ' + (p.title || '') + ' ' + (p.detail || ''));
  }).length || '-';
  if(sigEl) sigEl.textContent = issues.length || '-';
  if(srcEl) srcEl.textContent = data.length + '/' + CIOS_SOURCES.length;
}

async function loadCIOSSource(src) {
  var data = getSentimentSource(src);
  if(data){ CIOS_DATA[src] = data; updateCIOSSourceTile(src, data); }
  else updateCIOSSourceTile(src, null);
  updateCIOSOverall();
  renderCIOSPanels();
}

async function generateCIOSNarrative() {
  renderCIOSPanels();
}

async function loadCIOSAll() {
  var genStrip = document.getElementById('ciosGenStrip');
  if(genStrip) genStrip.style.display = 'none';
  CIOS_SOURCES_LOADED = 0;
  CIOS_SOURCES.forEach(function(src){ loadCIOSSource(src); });
}

function ciosCleanText(v){
  return (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
}

function ciosItemTitle(i){
  return ciosCleanText(i.title || i.pain || i.issue || i.name || i.driver || i.insight || i.metric || i.topComplaint || i.topStrength || 'Customer signal');
}

function ciosItemDetail(i){
  var s = i.signal || null;
  var fromSignal = s && (s.captureStrategy || s.capture_strategy || s.whyItMattersNow || s.why_it_matters_now);
  return ciosCleanText(fromSignal || i.detail || i.body || i.description || i.implication || i.competitorAdvantage || i.ucpUseCase || i.topComplaint || i.topStrength || '');
}

function ciosItemSource(i){
  return ciosCleanText(i.source || i.sourceName || i.platform || i.frequency || 'Backend cache');
}

function ciosRiskClass(i){
  var txt = ((i.impact || '') + ' ' + ciosItemTitle(i) + ' ' + ciosItemDetail(i)).toLowerCase();
  if(/opportun|positive|strength|praise|win|growth|lift|improve|conversion lift|brand halo|award|best airline/.test(txt)) return 'positive';
  if(/risk|critical|complaint|delay|refund|failure|negative|leakage|churn|abandon|friction|issue|poor|low|inadequate|wait|escalation|ato|fraud/.test(txt)) return 'high';
  if(/monitor|mixed|medium|shift|pressure|watch|sentiment/.test(txt)) return 'medium';
  return 'info';
}

function ciosChipClass(i){
  var cls = ciosRiskClass(i);
  if(cls === 'high') return 'cc-crit';
  if(cls === 'medium') return 'cc-high';
  if(cls === 'positive') return 'cc-low';
  return 'cc-stable';
}

function ciosSeverityLabel(i){
  var cls = ciosRiskClass(i);
  if(cls === 'high') return 'Critical';
  if(cls === 'medium') return 'High';
  if(cls === 'positive') return 'Opportunity';
  return 'Insight';
}

function ciosImpactLabel(i){
  var raw = ciosCleanText(i.impact || i.value || i.strength || i.frequency || '');
  return raw || ciosSeverityLabel(i);
}

function ciosScoreFromItem(i){
  var txt = ((i.impact || '') + ' ' + ciosItemTitle(i) + ' ' + ciosItemDetail(i)).toLowerCase();
  if(/critical|very high|surge|spike|failure|churn|leakage|risk|refund|delay|negative|fraud|ato|wait/.test(txt)) return 88;
  if(/high|medium|monitor|mixed|pressure|shift|complaint|sentiment/.test(txt)) return 72;
  if(/opportunity|positive|growth|lift|win|strength|award|best airline/.test(txt)) return 68;
  return 55;
}

function ciosDomainLoadStatus(){
  var domains = (typeof DOMAINS !== 'undefined' && DOMAINS) || [];
  var loaded = domains.filter(function(id){ return typeof domData !== 'undefined' && domData && domData[id]; });
  return { total: domains.length, loaded: loaded.length };
}

function ciosEmpty(title){
  var status = ciosDomainLoadStatus();
  var hint = (status.total > 0 && status.loaded === 0)
    ? 'No domain data loaded yet - use "Load domain data" above to generate real signals for this section.'
    : (status.total > 0 && status.loaded < status.total)
      ? 'Only ' + status.loaded + ' of ' + status.total + ' domains loaded so far - load more above for fuller coverage.'
      : '';
  return '<div class="cios-card"><div class="cios-card-hdr"><div class="cios-card-ht">Backend/cache only</div></div><div class="empty-d"><div class="et">'+esc(title || 'No backend/cache data loaded for this view')+'</div>' + (hint ? '<div class="et" style="margin-top:6px;font-size:11px;opacity:.75">' + esc(hint) + '</div>' : '') + '</div></div>';
}

function updateCIOSDomainBanner(){
  var el = document.getElementById('ciosGenStrip');
  if(!el) return;
  var status = ciosDomainLoadStatus();
  if(status.total > 0 && status.loaded < status.total){
    el.innerHTML = '<div class="cios-gen-info"><strong>' + status.loaded + ' of ' + status.total + ' domains loaded.</strong> Intelligence OS is generated from the same domain signals shown in the main Intelligence tab - load the remaining domains first to see real, differentiated action plans here instead of empty or generic sections. This calls live backend/AI generation and can take a few minutes.</div>' +
      '<button class="cios-gen-btn" onclick="if(typeof resumeRefresh===\'function\')resumeRefresh();">' +
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polygon points="5,3 14,8 5,13"/></svg>' +
        'Load domain data (' + (status.total - status.loaded) + ' remaining)' +
      '</button>';
  } else {
    el.innerHTML = '<div class="cios-gen-info"><strong>Backend/cache-first analysis.</strong> This view loads only backend/Supabase cache or saved browser cache. Customer intelligence loads only from backend/cache data.</div>' +
      '<button class="cios-gen-btn" onclick="loadCIOSAll()">' +
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polygon points="5,3 14,8 5,13"/></svg>' +
        'Run full analysis' +
      '</button>';
  }
}

function ciosLimit(items, n){ return (items || []).filter(Boolean).slice(0, n || 18); }

function ciosSourceSummary(items){
  var src = {};
  (items || []).forEach(function(i){ var s = ciosItemSource(i); if(s) src[s] = true; });
  return Object.keys(src).length + ' sources';
}

function ciosThemeKey(i){
  var t = (ciosItemTitle(i) + ' ' + ciosItemDetail(i)).toLowerCase();
  if(/app store|google play|play store|app rating|ratings|review score|ios|android/.test(t)) return 'apprating';
  if(/app|digital|booking|checkout|payment|website|boarding pass|session/.test(t)) return 'app';
  if(/refund|compensation|chargeback|claim|backlog/.test(t)) return 'refund';
  if(/ancillary|baggage|seat|lounge|upgrade|fast track|pricing/.test(t)) return 'ancillary';
  if(/loyalty|avios|privilege|tier|member|gold|silver|redemption/.test(t)) return 'loyalty';
  if(/airspace|disruption|delay|operations|call centre|rebook/.test(t)) return 'ops';
  if(/service|crew|cabin|airport|support|staff/.test(t)) return 'service';
  return 'other';
}

function ciosThemeLabel(key){
  var map = {
    apprating: 'App store ratings and review friction',
    app: 'App and digital booking friction',
    refund: 'Refund delays and compensation backlog',
    ancillary: 'Ancillary pricing and pre-purchase gaps',
    loyalty: 'Loyalty and privilege club friction',
    ops: 'Airspace and operations disruption',
    service: 'Service quality and support handling',
    other: 'Cross-cutting customer pressure themes'
  };
  return map[key] || map.other;
}

function ciosAudienceSegment(i){
  var txt = (ciosItemTitle(i) + ' ' + ciosItemDetail(i)).toLowerCase();
  if(/business|elite|gold|platinum|corporate|premium/.test(txt)) return { label: 'Business', cls: 'sp-biz' };
  if(/family|leisure|holiday|tourist/.test(txt)) return { label: 'Leisure', cls: 'sp-leis' };
  if(/loyalty|privilege|avios|member/.test(txt)) return { label: 'FFP', cls: 'sp-ffp' };
  return { label: 'Passengers', cls: 'sp-pass' };
}

function ciosTrendMeta(i){
  var txt = (ciosItemTitle(i) + ' ' + ciosItemDetail(i)).toLowerCase();
  if(/surge|spike|increase|rising|growth|accelerat|viral/.test(txt)) return { label: 'up', cls: 'kw-vel-up', glyph: '\u2191' };
  if(/drop|decline|fall|improving|recovery/.test(txt)) return { label: 'down', cls: 'kw-vel-dn', glyph: '\u2193' };
  return { label: 'flat', cls: 'kw-vel-flat', glyph: '\u2014' };
}

function ciosVelocityFromCount(n){
  if(n >= 4) return { text: 'up ' + Math.min(60, (n * 8)) + '%', cls: 'kw-vel-up', glyph: '\u2191' };
  if(n <= 1) return { text: 'flat', cls: 'kw-vel-flat', glyph: '\u2014' };
  return { text: 'up ' + (n * 5) + '%', cls: 'kw-vel-up', glyph: '\u2191' };
}

function ciosGroupIssuesByTheme(items){
  var groups = {};
  items.forEach(function(i){
    var key = ciosThemeKey(i);
    if(!groups[key]) groups[key] = { key:key, label:ciosThemeLabel(key), items:[], sourceMap:{} };
    groups[key].items.push(i);
    groups[key].sourceMap[ciosItemSource(i)] = true;
  });
  var list = Object.keys(groups).map(function(k){
    var g = groups[k];
    g.sources = Object.keys(g.sourceMap);
    g.maxScore = g.items.reduce(function(mx, x){ return Math.max(mx, ciosScoreFromItem(x)); }, 0);
    g.critCount = g.items.filter(function(x){ return ciosRiskClass(x) === 'high'; }).length;
    return g;
  });
  list.sort(function(a, b){
    if(b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
    return b.items.length - a.items.length;
  });
  return list;
}

function ciosClusterBadgeClass(sourceCount){
  if(sourceCount >= 4) return 'xsrc-badge-4';
  if(sourceCount === 3) return 'xsrc-badge-3';
  if(sourceCount === 2) return 'xsrc-badge-2';
  return 'xsrc-badge-1';
}

function ciosClusterSeverityChip(cluster){
  var critical = cluster.maxScore >= 80;
  var high = cluster.maxScore >= 70;
  if(critical) return '<span class="cios-chip cc-crit" style="flex-shrink:0">Critical</span>';
  if(high) return '<span class="cios-chip cc-high" style="flex-shrink:0">High</span>';
  return '<span class="cios-chip cc-med" style="flex-shrink:0">Medium</span>';
}

function ciosHeatmap(items){
  items = ciosLimit(items, 24);
  if(!items.length) return ciosEmpty('No complaint/risk signals loaded from backend/cache.');

  var clusters = ciosGroupIssuesByTheme(items);
  var clusterHtml = clusters.map(function(cluster, idx){
    var id = 'hmc-' + idx;
    var sourceCount = cluster.sources.length;
    var badgeClass = ciosClusterBadgeClass(sourceCount);
    var representative = cluster.items[0] || {};
    var seg = ciosAudienceSegment(representative);
    var vel = ciosVelocityFromCount(cluster.items.length);
    var isOpen = idx === 0;
    var bodyRows = cluster.items.slice(0, 6).map(function(i){
      return '<div class="cios-cluster-signal"><span class="cios-cluster-signal-src">' + esc(ciosItemSource(i)) + '</span><span>' + esc(ciosItemTitle(i) + ' - ' + ciosItemDetail(i)) + '</span></div>';
    }).join('');

    return '<div class="cios-cluster" id="' + id + '">' +
      '<div class="cios-cluster-hdr" onclick="toggleCluster(\'' + id + '\')">' +
        ciosClusterSeverityChip(cluster) +
        '<span class="cios-cluster-title">' + esc(cluster.label) + '</span>' +
        '<span class="xsrc-badge ' + badgeClass + '">\u2713 ' + sourceCount + ' sources</span>' +
        '<span class="cios-cluster-count">' + cluster.items.length + ' signals</span>' +
        '<span class="seg-pill ' + seg.cls + '">' + esc(seg.label) + '</span>' +
        '<span class="kw-vel ' + vel.cls + '">' + vel.glyph + ' ' + esc(vel.text) + '</span>' +
        '<span class="cios-cluster-expand' + (isOpen ? ' open' : '') + '" id="' + id + '-arr">\u2304</span>' +
      '</div>' +
      '<div class="cios-cluster-body' + (isOpen ? ' open' : '') + '" id="' + id + '-body">' + bodyRows + '</div>' +
    '</div>';
  }).join('');

  var flatRows = items.map(function(i){
    var chip = ciosChipClass(i);
    var severity = ciosSeverityLabel(i);
    var seg = ciosAudienceSegment(i);
    var revenue = ciosRiskClass(i) === 'positive' ? 'Opportunity' : ciosScoreFromItem(i) >= 80 ? 'Very high' : 'High';
    var trend = ciosTrendMeta(i);
    return '<tr><td>' + esc(ciosItemTitle(i)) + '</td><td><span class="cios-chip ' + chip + '">' + esc(severity) + '</span></td><td><span class="seg-pill ' + seg.cls + '">' + esc(seg.label) + '</span></td><td><span class="cios-chip ' + chip + '">' + esc(revenue) + '</span></td><td><span class="kw-vel ' + trend.cls + '">' + trend.glyph + ' ' + esc(trend.label) + '</span></td></tr>';
  }).join('');

  return '<div class="hm-cluster-shell">' +
      '<div class="cios-hmap-leg">' +
        '<div class="cios-hl-i"><div class="cios-hl-d" style="background:var(--rbg);border:0.5px solid var(--red)"></div>Critical</div>' +
        '<div class="cios-hl-i"><div class="cios-hl-d" style="background:var(--abg);border:0.5px solid var(--amb)"></div>High</div>' +
        '<div class="cios-hl-i"><div class="cios-hl-d" style="background:var(--gbg);border:0.5px solid var(--grn)"></div>Opportunity</div>' +
        '<div class="cios-hl-i" style="margin-left:auto">' + esc(ciosSourceSummary(items)) + '</div>' +
        '<button class="hm-view-toggle" data-mode="cluster" onclick="toggleHMView(this)">Flat view</button>' +
      '</div>' +
      '<div id="hmClusterView" class="hm-cluster-view">' + clusterHtml + '</div>' +
      '<div id="hmFlatView" class="hm-flat-view"><div class="cios-hmap"><table class="cios-hm"><thead><tr><th>Theme</th><th>Severity</th><th>Audience</th><th>Revenue risk</th><th>Trend</th></tr></thead><tbody>' + flatRows + '</tbody></table></div></div>' +
    '</div>';
}

function ciosAudience(items){
  items = ciosLimit(items, 18);
  if(!items.length) return ciosEmpty('No audience intelligence loaded from backend/cache.');
  var rows = items.map(function(i){
    var title = ciosItemTitle(i);
    var detail = ciosItemDetail(i);
    var badge = ciosSeverityLabel(i);
    var cls = ciosChipClass(i);
    var seg = ciosAudienceSegment(i);
    return '<div class="cios-aud-row"><div class="cios-aud-ic" style="background:var(--pbg)">' + esc(seg.label.substring(0,2)) + '</div><div class="cios-aud-meta"><div class="cios-aud-nm">' + esc(title) + '</div><div class="cios-aud-dt">' + esc(detail || ciosItemSource(i)) + '</div></div><span class="seg-pill ' + seg.cls + '">' + esc(seg.label) + '</span><span class="cios-aud-badge ' + cls + '">' + esc(badge) + '</span></div>';
  }).join('');
  return '<div class="cios-2col"><div class="cios-card"><div class="cios-card-hdr"><div class="cios-card-ht">Audience pressure</div></div>' + rows + '</div><div class="cios-card"><div class="cios-card-hdr"><div class="cios-card-ht">Commercial interpretation</div></div>' + items.slice(0,8).map(function(i){ return '<div class="cios-aud-row"><div class="cios-aud-meta"><div class="cios-aud-nm">' + esc(ciosItemSource(i)) + '</div><div class="cios-aud-dt">' + esc(ciosImpactLabel(i)) + '</div></div><span class="cios-aud-badge ' + ciosChipClass(i) + '">' + ciosScoreFromItem(i) + '</span></div>'; }).join('') + '</div></div>';
}

function ciosKeywords(items){
  items = ciosLimit(items, 30);
  if(!items.length) return ciosEmpty('No keyword intelligence loaded from backend/cache.');
  var counts = {};
  var stop = {the:1,and:1,for:1,with:1,from:1,this:1,that:1,into:1,only:1,have:1,has:1,not:1,are:1,was:1,were:1,customer:1,customers:1,qatar:1,airways:1,backend:1,cache:1,signal:1};
  items.forEach(function(i){
    (ciosItemTitle(i) + ' ' + ciosItemDetail(i)).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).forEach(function(w){
      if(w.length > 3 && !stop[w]) counts[w] = (counts[w] || 0) + 1;
    });
  });
  var words = Object.keys(counts).sort(function(a,b){ return counts[b] - counts[a]; }).slice(0, 18);
  var rows = words.map(function(w){
    var vel = ciosVelocityFromCount(counts[w]);
    return '<tr><td><strong>' + esc(w) + '</strong></td><td><span class="cios-kw-mini">' + counts[w] + '</span></td><td><span class="kw-vel ' + vel.cls + '">' + vel.glyph + ' ' + esc(vel.text) + '</span></td></tr>';
  }).join('');
  return '<div class="cios-2col"><div class="cios-card"><div class="cios-card-hdr"><div class="cios-card-ht">Keyword clusters and velocity</div></div><table class="cios-kw"><tbody>' + rows + '</tbody></table></div><div class="cios-card"><div class="cios-card-hdr"><div class="cios-card-ht">Signals behind keywords</div></div>' + items.slice(0,8).map(function(i){ return '<div class="cios-aud-row"><div class="cios-aud-meta"><div class="cios-aud-nm">' + esc(ciosItemTitle(i)) + '</div><div class="cios-aud-dt">' + esc(ciosItemDetail(i)) + '</div></div><span class="cios-aud-badge ' + ciosChipClass(i) + '">' + esc(ciosItemSource(i)) + '</span></div>'; }).join('') + '</div></div>';
}

function ciosGrowing(items){
  items = ciosLimit(items, 18);
  if(!items.length) return ciosEmpty('No growing conversation signals loaded from backend/cache.');
  var rows = items.map(function(i){
    var score = ciosScoreFromItem(i);
    var trend = ciosTrendMeta(i);
    return '<div class="cios-grow-row"><div class="cios-grow-nm">' + esc(ciosItemTitle(i)) + '</div><div class="cios-grow-bar"><div class="cios-grow-bf" style="width:' + score + '%;background:' + (trend.cls === 'kw-vel-up' ? 'var(--red)' : trend.cls === 'kw-vel-dn' ? 'var(--grn)' : 'var(--qb)') + '"></div></div><span class="kw-vel ' + trend.cls + '">' + trend.glyph + ' ' + esc(trend.label) + '</span></div>';
  }).join('');
  return '<div class="cios-card"><div class="cios-card-hdr"><div class="cios-card-ht">Conversation velocity</div></div>' + rows + '</div>';
}

function ciosCompetitor(items){
  items = ciosLimit(items, 16);
  if(!items.length) return ciosEmpty('No competitor perception signals loaded from backend/cache.');
  var rows = items.map(function(i){
    return '<tr><td>' + esc(ciosItemTitle(i)) + '</td><td class="qrc"><span class="cios-chip ' + ciosChipClass(i) + '">' + esc(ciosImpactLabel(i)) + '</span></td><td>' + esc(ciosItemSource(i)) + '</td><td>' + esc(ciosItemDetail(i)) + '</td></tr>';
  }).join('');
  return '<div class="cios-cmx"><table class="cios-cmt"><thead><tr><th>Perception signal</th><th>QR impact</th><th>Source</th><th>Detail</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function ciosProductRequests(items){
  items = ciosLimit(items, 24);
  if(!items.length) return ciosEmpty('No product/action requests loaded from backend/cache.');
  var rows = items.map(function(i, idx){
    var score = ciosScoreFromItem(i);
    return '<div class="cios-pr-row"><div class="cios-pr-n">' + String(idx + 1).padStart(2, '0') + '</div><div class="cios-pr-body"><div class="cios-pr-title">' + esc(ciosItemTitle(i)) + '</div><div class="cios-pr-desc">' + esc(ciosItemDetail(i)) + '</div><div class="cios-pr-tags"><span class="cios-chip ' + ciosChipClass(i) + '">' + esc(ciosItemSource(i)) + '</span><span class="cios-chip cc-stable">' + esc(ciosImpactLabel(i)) + '</span></div><div class="cios-pr-prog"><div class="cios-pr-pf" style="width:' + score + '%"></div></div></div></div>';
  }).join('');
  return '<div class="cios-pr-list">' + rows + '</div>';
}

function ciosOta(items){
  items = ciosLimit(items, 18);
  if(!items.length) return ciosEmpty('No OTA/direct booking risk signals loaded from backend/cache.');
  var rows = items.map(function(i){
    return '<tr><td>' + esc(ciosItemTitle(i)) + '</td><td><span class="cios-chip ' + ciosChipClass(i) + '">' + esc(ciosImpactLabel(i)) + '</span></td><td>' + esc(ciosItemSource(i)) + '</td><td>' + esc(ciosItemDetail(i)) + '</td></tr>';
  }).join('');
  return '<div class="cios-cmx"><table class="cios-cmt"><thead><tr><th>Leakage signal</th><th>Risk</th><th>Source</th><th>Commercial implication</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function ciosOpportunities(items){
  items = ciosLimit(items, 18);
  if(!items.length) return ciosEmpty('No opportunities loaded from backend/cache.');
  var cards = items.map(function(i){
    var score = ciosScoreFromItem(i);
    var confClass = score >= 80 ? 'opp-conf-high' : score >= 65 ? 'opp-conf-med' : 'opp-conf-low';
    return '<div class="cios-opp"><div class="cios-opp-ey">' + esc(ciosItemSource(i)) + '</div><div class="cios-opp-t">' + esc(ciosItemTitle(i)) + '</div><div class="cios-opp-d">' + esc(ciosItemDetail(i)) + '</div><div class="cios-opp-val">' + esc(ciosImpactLabel(i)) + '</div><div class="opp-conf ' + confClass + '">Confidence band: ' + score + '/100</div></div>';
  }).join('');
  return '<div class="cios-opp-grid">' + cards + '</div>';
}

function ciosNarrative(sources, issues, improvements, strengths){
  if(!sources.length) return ciosEmpty('No executive narrative loaded from backend/cache.');
  var topRisk = issues[0] ? ciosItemTitle(issues[0]) : 'No dominant risk signal loaded';
  var topAction = improvements[0] ? ciosItemTitle(improvements[0]) : 'No action item loaded';
  var topStrength = strengths[0] ? ciosItemTitle(strengths[0]) : 'No strength signal loaded';
  return '<div class="cios-narr"><div class="cios-narr-ey">Executive narrative - backend/cache only</div><div class="cios-narr-txt">Customer intelligence currently shows <strong>' + esc(topRisk) + '</strong> as the most visible risk signal. The strongest recommended action is <strong>' + esc(topAction) + '</strong>, while <strong>' + esc(topStrength) + '</strong> should be used to balance the leadership narrative with verified signs of brand strength.</div><div class="cios-narr-rec"><strong>Coverage:</strong> ' + sources.length + ' sources loaded - ' + issues.length + ' risk signals - ' + improvements.length + ' action requests - ' + strengths.length + ' strength signals.</div></div>';
}

function ciosAppRatings(items){
  items = ciosLimit(items, 8);
  if(!items.length) return ciosEmpty('No app rating intelligence loaded from backend/cache.');
  var appleCount = items.filter(function(i){ return /apple|app store|ios|iphone/i.test((ciosItemSource(i) + ' ' + ciosItemTitle(i)).toLowerCase()); }).length;
  var googleCount = items.filter(function(i){ return /google|play store|google play|android/i.test((ciosItemSource(i) + ' ' + ciosItemTitle(i)).toLowerCase()); }).length;
  var top = items.slice().sort(function(a,b){ return ciosScoreFromItem(b) - ciosScoreFromItem(a); })[0];
  var topAction = top ? ciosItemTitle(top) : 'No dominant app action loaded';
  var summary = '<div class="cios-app-summary"><div><div class="cios-app-summary-ey">App review intelligence</div><div class="cios-app-summary-title">' + esc(topAction) + '</div><div class="cios-app-summary-copy">Backend/cache signals are grouped into app review streams and converted into product actions. This does not claim official star ratings unless the backend supplies them.</div></div><div class="cios-app-summary-kpis"><div><strong>' + esc(String(items.length)) + '</strong><span>app signals</span></div><div><strong>' + esc(String(appleCount)) + '</strong><span>Apple lane</span></div><div><strong>' + esc(String(googleCount)) + '</strong><span>Google lane</span></div></div></div>';
  var cards = items.map(function(i){
    var score = ciosScoreFromItem(i);
    var title = ciosItemTitle(i);
    var detail = ciosItemDetail(i);
    var source = ciosItemSource(i);
    var impact = ciosImpactLabel(i);
    var volume = ciosEstimatePostCount(i);
    var topCallout = /apple|ios/i.test(source + ' ' + title) ? 'iPhone review stream' : /google|android/i.test(source + ' ' + title) ? 'Android review stream' : 'App review stream';
    var action = score >= 75 ? 'Escalate product fixes and review response.' : score >= 60 ? 'Track rating movement and recurring complaint themes.' : 'Monitor the app rating trend weekly.';
    return '<div class="cios-app-card"><div class="cios-app-top"><div><div class="cios-app-stream">' + esc(topCallout) + '</div><div class="cios-app-title">' + esc(title) + '</div><div class="cios-app-sub">' + esc(source) + '</div></div><div class="cios-app-score"><strong>' + score + '</strong><span>/100</span></div></div><div class="cios-app-body">' + esc(detail) + '</div><div class="cios-app-tags"><span class="cios-chip ' + ciosChipClass(i) + '">' + esc(impact) + '</span><span class="cios-chip cc-stable">' + (volume ? esc(volume) + ' reviews' : 'backend signal') + '</span></div><div class="cios-app-action"><span>Action</span>' + esc(action) + '</div></div>';
  }).join('');
  return summary + '<div class="cios-app-grid">' + cards + '</div>';
}

function updateCIOSTabBadges(ctx){
  function setCount(id, n){
    var el = document.getElementById(id);
    if(el) el.textContent = String(Math.max(0, n || 0));
  }
  setCount('ciosTabCount-heatmap', (ctx.issues || []).length);
  setCount('ciosTabCount-audience', (ctx.audience || []).length);
  setCount('ciosTabCount-keywords', Math.min(24, (ctx.keywords || 0)));
  setCount('ciosTabCount-requests', (ctx.improvements || []).length);
  setCount('ciosTabCount-appratings', (ctx.appRatings || []).length);
}

function renderCIOSPanels(){
  updateCIOSDomainBanner();
  var sources = getAllSentimentSources();
  var issues = sources.flatMap(function(d){ return (d.painPoints || []).map(function(p){ return Object.assign({ source:d.sourceName || d.source }, p); }); });
  var strengths = sources.flatMap(function(d){ return (d.strengths || []).map(function(p){ return Object.assign({ source:d.sourceName || d.source }, p); }); });
  var improvements = sources.flatMap(function(d){ return (d.improvements || []).map(function(p){ return Object.assign({ source:d.sourceName || d.source }, p); }); });
  var allSignals = issues.concat(strengths).concat(improvements);
  var audience = issues.filter(function(x){ return /business|family|loyal|leisure|premium|transit|customer|passenger|elite|member|traveller|traveler|audience/i.test((x.title || '') + ' ' + (x.detail || '')); });
  if(!audience.length) audience = issues;
  var growing = issues.filter(function(x){ return /increase|rising|spike|growth|surge|accelerat|active|volume|trend|emerging|ongoing/i.test((x.title || '') + ' ' + (x.detail || '')); });
  if(!growing.length) growing = issues.slice(0, 8);
  var competitor = issues.concat(improvements).filter(function(x){ return /emirates|etihad|turkish|singapore|ota|competitor|oneworld|skyteam|lufthansa|air france|delta|british|review|rating|award/i.test((x.title || '') + ' ' + (x.detail || '')); });
  if(!competitor.length) competitor = allSignals.slice(0, 8);
  var ota = issues.concat(improvements).filter(function(x){ return /ota|direct|booking|agent|rebook|search|conversion|website|app|digital|checkout|abandon|refund/i.test((x.title || '') + ' ' + (x.detail || '')); });
  if(!ota.length) ota = issues.slice(0, 8);
  var appRatings = allSignals.filter(function(x){ return /app store|google play|play store|app rating|ratings|review score|ios|android/i.test((x.title || '') + ' ' + (x.detail || '') + ' ' + (x.source || '')); });
  if(!appRatings.length) appRatings = (window.radarData && window.radarData.sentiment) ? CIOS_SOURCES.map(getSentimentSource).filter(function(d){ return d && /appstore|googleplay/i.test(String(d.source || '')); }) : [];

  var keywordCounts = {};
  allSignals.forEach(function(i){
    (ciosItemTitle(i) + ' ' + ciosItemDetail(i)).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).forEach(function(w){
      if(w.length > 3) keywordCounts[w] = (keywordCounts[w] || 0) + 1;
    });
  });
  var keywordTotal = Object.keys(keywordCounts).length;

  var set = function(id, html){ var el = document.getElementById(id); if(el) el.innerHTML = html; };
  set('ciosPanel-heatmap', ciosHeatmap(issues));
  set('ciosPanel-audience', ciosAudience(audience));
  set('ciosPanel-keywords', ciosKeywords(allSignals));
  set('ciosPanel-growing', ciosGrowing(growing));
  set('ciosPanel-competitor', ciosCompetitor(competitor));
  set('ciosPanel-requests', ciosProductRequests(improvements));
  set('ciosPanel-appratings', ciosAppRatings(appRatings));
  set('ciosPanel-ota', ciosOta(ota));
  set('ciosPanel-opps', ciosOpportunities(improvements.concat(strengths)));
  set('ciosPanel-narrative', ciosNarrative(sources, issues, improvements, strengths));

  updateCIOSTabBadges({
    issues: issues,
    audience: audience,
    keywords: keywordTotal,
    improvements: improvements,
    appRatings: appRatings
  });

  if(CIOS_ACTIVE_TAB === 'heatmap'){
    ciosAutoExpandFirstCluster();
  }
}

setTimeout(function(){
  CIOS_SOURCES.forEach(function(src){ loadCIOSSource(src); });
  renderCIOSPanels();
}, 800);
