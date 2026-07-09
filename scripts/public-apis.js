(function(){
  var publicApisState = { sources: [], filter: 'all', loaded: false, error: null };
  var expectedPublicApiIds = ['opensky','aviationweather','openmeteo','ourairports','openaq','worldbank','nominatim','wikidata','youtube','itunes','reddit','mastodon','gdelt','bluesky','mediawiki','commoncrawl'];

  function apiEsc(value){
    if (typeof esc === 'function') return esc(value);
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  function backendBase(){
    if (window.RADAR_API_BASE) return String(window.RADAR_API_BASE).replace(/\/+$/, '');
    if (typeof BACKEND_URL === 'string' && BACKEND_URL) return String(BACKEND_URL).replace(/\/+$/, '');
    return '';
  }

  async function publicApiFetch(path, timeoutMs){
    if (typeof backendFetch === 'function') {
      var backendResponse = await backendFetch(path, { method: 'GET' }, timeoutMs || 15000);
      return backendResponse.json();
    }
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, timeoutMs || 15000) : null;
    try {
      var response = await fetch(backendBase() + path, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) throw new Error('Registry request failed: HTTP ' + response.status);
      return response.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function publicApiStatus(source){
    if (source.configured) return 'configured';
    if (source.requiresServerSideKey) return 'needs_key';
    return 'configured';
  }

  function statusLabel(source){
    var status = publicApiStatus(source);
    if (status === 'needs_key') return 'Needs server key';
    if (source.liveProxySupported) return 'Configured + proxy-ready';
    return 'Configured catalogue source';
  }

  function sourceMatchesFilter(source){
    if (publicApisState.filter === 'configured') return publicApiStatus(source) === 'configured';
    if (publicApisState.filter === 'needs_key') return publicApiStatus(source) === 'needs_key';
    if (publicApisState.filter === 'proxy') return !!source.liveProxySupported;
    return true;
  }

  function updateText(id, text){
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updatePublicApiSummary(){
    var sources = publicApisState.sources || [];
    var configured = sources.filter(function(s){ return publicApiStatus(s) === 'configured'; }).length;
    var proxyReady = sources.filter(function(s){ return !!s.liveProxySupported; }).length;
    var allExpected = expectedPublicApiIds.every(function(id){ return sources.some(function(s){ return s.id === id; }); });
    updateText('publicApisTotal', sources.length ? sources.length + ' sources' : '-- sources');
    updateText('publicApisStatus', publicApisState.error ? 'Backend registry unavailable' : (allExpected ? 'All requested sources present' : 'Registry loaded with missing expected sources'));
    updateText('publicApisConfigured', configured + ' configured');
    updateText('publicApisProxy', proxyReady + ' proxy-ready');
    updateText('publicApisGovernance', 'server-side only');
    var badge = document.getElementById('publicApisNavBadge');
    if (badge) badge.textContent = sources.length ? sources.length + ' sources' : 'registry';
  }

  function renderPublicApis(){
    var host = document.getElementById('publicApisGrid');
    if (!host) return;
    updatePublicApiSummary();
    if (publicApisState.error) {
      host.innerHTML = '<div class="public-api-empty"><strong>Backend registry could not be loaded.</strong><span>' + apiEsc(publicApisState.error) + '</span></div>';
      return;
    }
    var visible = (publicApisState.sources || []).filter(sourceMatchesFilter);
    if (!visible.length) {
      host.innerHTML = '<div class="public-api-empty">No sources match this filter.</div>';
      return;
    }
    host.innerHTML = visible.map(function(source, index){
      var needsKey = publicApiStatus(source) === 'needs_key';
      var requestUrl = backendBase() + '/api/public-sources/' + encodeURIComponent(source.id) + '/request?q=Qatar%20Airways&term=Qatar%20Airways&query=Qatar%20Airways&search=Qatar%20Airways&limit=3';
      return '<article class="public-api-card ' + (needsKey ? 'needs-key' : 'configured') + '">' +
        '<div class="public-api-top"><span>' + String(index + 1).padStart(2, '0') + '</span><em>' + apiEsc(source.category || 'Public source') + '</em></div>' +
        '<h2>' + apiEsc(source.name || source.id) + '</h2>' +
        '<p>' + apiEsc(source.radarUse || 'Public source available to the Radar evidence layer.') + '</p>' +
        '<div class="public-api-pills">' +
          '<span class="' + (needsKey ? 'warn' : 'ok') + '">' + apiEsc(statusLabel(source)) + '</span>' +
          '<span>' + (source.liveProxySupported ? 'Live proxy' : 'Catalogue/batch') + '</span>' +
        '</div>' +
        '<div class="public-api-row"><b>Access</b><span>' + apiEsc(source.access || 'Public API') + '</span></div>' +
        '<div class="public-api-row"><b>Owner</b><span>' + apiEsc(source.defaultOwner || 'Radar owner pending') + '</span></div>' +
        '<div class="public-api-row"><b>Key</b><span>' + apiEsc(source.requiresServerSideKey ? (source.envVar || 'Server key required') : 'No key required') + '</span></div>' +
        '<div class="public-api-row"><b>Tabs</b><span>' + apiEsc((source.radarTabFit && source.radarTabFit.tabs ? source.radarTabFit.tabs.map(function(tab){ return tab.label; }).join(', ') : (source.radarTabs || []).join(', ')) || 'Radar routing pending') + '</span></div>' +
        '<div class="public-api-fit">' + apiEsc((source.radarTabFit && source.radarTabFit.why) || 'Radar will route this source to the most relevant tab based on source evidence.') + '</div>' +
        '<div class="public-api-governance">' + apiEsc(source.governance || 'Use server-side, cached and attributed ingestion.') + '</div>' +
        '<div class="public-api-links">' +
          '<a href="' + apiEsc(source.docsUrl || source.baseUrl || '#') + '" target="_blank" rel="noopener">Docs</a>' +
          '<a href="' + apiEsc(requestUrl) + '" target="_blank" rel="noopener">Request preview</a>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  async function loadPublicApis(){
    if (publicApisState.loaded) {
      renderPublicApis();
      return;
    }
    var host = document.getElementById('publicApisGrid');
    if (host) host.innerHTML = '<div class="public-api-empty">Loading public API registry...</div>';
    try {
      var payload = await publicApiFetch('/api/public-sources', 15000);
      var sources = (payload && payload.data && payload.data.sources) || [];
      publicApisState.sources = sources.slice().sort(function(a, b){
        return expectedPublicApiIds.indexOf(a.id) - expectedPublicApiIds.indexOf(b.id);
      });
      publicApisState.loaded = true;
      publicApisState.error = null;
    } catch (err) {
      publicApisState.error = err && err.message ? err.message : 'Unknown registry error';
    }
    renderPublicApis();
  }

  function filterPublicApis(filter){
    publicApisState.filter = filter || 'all';
    Array.prototype.forEach.call(document.querySelectorAll('.public-api-filter'), function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-filter') === publicApisState.filter);
    });
    renderPublicApis();
  }

  function showPublicApis(){
    if (typeof ensureRadarRuntimeForTabs === 'function') ensureRadarRuntimeForTabs();
    if (typeof hideAllPrimaryPages === 'function') hideAllPrimaryPages();
    if (typeof clearPrimaryNav === 'function') clearPrimaryNav();
    var el = document.getElementById('publicApisPage');
    if (el) el.classList.add('visible');
    var nav = document.getElementById('navPublicApis');
    if (nav) nav.classList.add('active');
    loadPublicApis();
  }

  window.loadPublicApis = loadPublicApis;
  window.renderPublicApis = renderPublicApis;
  window.filterPublicApis = filterPublicApis;
  window.showPublicApis = showPublicApis;
})();
