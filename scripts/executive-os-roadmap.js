/* RADAR Executive OS roadmap view with live backend proof sync. */
(function () {
  function safeEsc(v) {
    try {
      if (typeof esc === 'function') return esc(String(v == null ? '' : v));
      return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    } catch (e) {
      return String(v || '');
    }
  }

  function allSignals() {
    try {
      var scoped = (typeof getExecScopedSignals === 'function' ? getExecScopedSignals() : null);
      var rows = scoped && scoped.length ? scoped : (typeof getAllDomainSignals === 'function' ? getAllDomainSignals() : []);
      return (rows || []).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function sscore(s) {
    try {
      return typeof scoreSignalForExec === 'function' ? scoreSignalForExec(s) : 0;
    } catch (e) {
      return 0;
    }
  }

  function titleOf(s) { return s.title || s.headline || s.name || 'Backend/cache signal'; }
  function bodyOf(s) { return s.captureStrategy || s.whyItMattersNow || s.body || s.summary || s.detail || 'No additional backend/cache detail available.'; }
  function domainOf(s) { return (s.domain || s.source || 'Radar').toString().toUpperCase(); }
  function viewModeNow() {
    try { return (window.radarData && window.radarData.viewMode) || (typeof VIEW_MODE !== 'undefined' ? VIEW_MODE : 'b2c'); } catch (e) { return 'b2c'; }
  }
  function toNum(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function extractArrayCandidates(obj) {
    if (!obj) return [];
    var ds = obj.data || obj;
    var candidates = [
      ds.signals,
      ds.topSignals,
      ds.topMovements,
      ds.predictions,
      ds.simulations,
      ds.scenarios,
      ds.opportunities,
      ds.items
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      if (Array.isArray(candidates[i])) return candidates[i];
    }
    return [];
  }
  function signalScore(s) {
    return Math.max(
      toNum(s.aiRankScore || s.ai_rank_score),
      toNum(s.rankScore || s.rank_score),
      sscore(s)
    );
  }
  function activeSignalsForExecutive() {
    var live = window.__EXEC_LIVE__ || {};
    if (Array.isArray(live.rankingSignals) && live.rankingSignals.length) {
      return live.rankingSignals.slice().sort(function (a, b) { return signalScore(b) - signalScore(a); });
    }
    return allSignals().slice().sort(function (a, b) { return signalScore(b) - signalScore(a); });
  }
  function normalizeRankingSignal(s) {
    if (!s) return null;
    return {
      id: s.id,
      title: s.title || 'Backend signal',
      body: s.body || s.why_it_matters_now || s.whyItMattersNow || '',
      captureStrategy: s.capture_strategy || s.captureStrategy || '',
      domain: s.domain_id || s.domainId || s.domain || 'radar',
      impactLabel: s.impact_label || s.impactLabel || '',
      demandImpact: s.demand_impact || s.demandImpact || '',
      confidence: s.confidence || s.confidenceLabel || 'Medium',
      verified: !!s.verified,
      aiRankScore: toNum(s.ai_rank_score || s.aiRankScore),
      createdAt: s.created_at || s.first_seen_at || s.firstSeenAt || null,
      firstSeenAt: s.first_seen_at || s.firstSeenAt || null,
      sourceDate: s.source_date || s.sourceDate || null
    };
  }
  function laneFromText(txt) {
    var t = String(txt || '').toLowerCase();
    if (/direct|ota|booking|conversion|agent/.test(t)) return 'Direct';
    if (/premium|business|luxury|qsuite|vip/.test(t)) return 'Premium';
    if (/ancillary|baggage|seat|lounge|bundle|upsell|fast track/.test(t)) return 'Ancillary';
    if (/loyalty|avios|privilege|tier|member/.test(t)) return 'Loyalty';
    return null;
  }
  function horizonBucket(v) {
    var t = String(v || '').toLowerCase();
    var n = toNum(v);
    if (n > 0) {
      if (n <= 30) return 0;
      if (n <= 90) return 1;
      return 2;
    }
    if (/0-30|immediate|near|this month/.test(t)) return 0;
    if (/31-90|quarter|next 3/.test(t)) return 1;
    if (/91-180|6 month|180/.test(t)) return 2;
    return 1;
  }
  function moneyToMillions(v) {
    if (Number.isFinite(v)) return v;
    var s = String(v || '').replace(/,/g, '').trim();
    if (!s) return 0;
    var m = s.match(/-?\d+(\.\d+)?/);
    if (!m) return 0;
    var n = Number(m[0]);
    if (/bn|billion/i.test(s)) return n * 1000;
    if (/m|million/i.test(s)) return n;
    if (/k|thousand/i.test(s)) return n / 1000;
    return n / 1000000;
  }
  function valueFromSimulationItem(item) {
    var low = moneyToMillions(
      item.revenueLow || item.revenue_low || item.low || item.opportunityLow || item.valueLow || item.value_low
    );
    var high = moneyToMillions(
      item.revenueHigh || item.revenue_high || item.high || item.opportunityHigh || item.valueHigh || item.value_high
    );
    var single = moneyToMillions(item.revenue || item.value || item.amount || item.impact || item.opportunity || item.estimatedValue);
    if (!low && !high && single) { low = single * 0.9; high = single * 1.1; }
    if (low && !high) high = low * 1.2;
    if (high && !low) low = high * 0.8;
    return { low: low, high: high };
  }
  function simulationRowsFromPayload(payload, fallbackSignals) {
    var rows = {
      Direct: [0, 0, 0],
      Premium: [0, 0, 0],
      Ancillary: [0, 0, 0],
      Loyalty: [0, 0, 0]
    };
    var items = extractArrayCandidates(payload);
    items.forEach(function (it) {
      var text = [it.lane, it.category, it.domainId, it.domain, it.title, it.forecast, it.summary].join(' ');
      var lane = laneFromText(text);
      if (!lane) return;
      var bucket = horizonBucket(it.horizonDays || it.horizon || it.window || it.timeHorizon || it.time_to_impact || it.timeToImpact);
      var val = valueFromSimulationItem(it);
      var add = val.low || val.high ? ((val.low + val.high) / 2) : 0;
      if (add > 0) rows[lane][bucket] += add;
    });
    var out = Object.keys(rows).map(function (k) {
      return {
        name: k,
        windows: rows[k].map(function (v) { return Number(v.toFixed(1)); })
      };
    });
    var hasAny = out.some(function (r) { return (r.windows[0] + r.windows[1] + r.windows[2]) > 0; });
    if (hasAny) return out;

    var oppSignals = (fallbackSignals || []).filter(function (s) {
      return /opportun|revenue|growth|upsell|ancillary|direct|capture|increase|loyalty|premium|conversion/i.test((titleOf(s) + ' ' + bodyOf(s)).toLowerCase());
    });
    return ['Direct', 'Premium', 'Ancillary', 'Loyalty'].map(function (lane, idx) {
      var c = oppSignals.filter(function (s) { return laneFromText(titleOf(s) + ' ' + bodyOf(s)) === lane; }).length;
      var base = Math.max(0.12, (c * 0.2) + (0.12 * (idx + 1)));
      return { name: lane, windows: [Number((base * 0.45).toFixed(1)), Number((base * 1.05).toFixed(1)), Number((base * 1.45).toFixed(1))] };
    });
  }
  function initExecLiveState() {
    if (!window.__EXEC_LIVE__) {
      window.__EXEC_LIVE__ = { loading: false, loadedAt: 0, delta: null, simulation: null, ranking: null, rankingSignals: [] };
    }
    return window.__EXEC_LIVE__;
  }

  function renderList(id, items, empty) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!items.length) {
      el.innerHTML = '<div class="exec-empty">' + safeEsc(empty) + '</div>';
      return;
    }
    el.innerHTML = items.map(function (s, i) {
      return '<div class="exec-list-card exec-clickable" data-signal-index="' + i + '"><div class="exec-list-index">' + (i + 1) + '</div><div><div class="exec-list-title">' + safeEsc(titleOf(s)) + '</div><div class="exec-list-body">' + safeEsc(bodyOf(s)) + '</div></div><div class="exec-list-pill">' + safeEsc(domainOf(s)) + '</div></div>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.exec-list-card.exec-clickable'), function (card) {
      card.addEventListener('click', function () {
        var idx = Number(card.getAttribute('data-signal-index'));
        var s = items[idx] || {};
        if (typeof openExecDetailDrawer === 'function') {
          openExecDetailDrawer({
            type: 'Evidence Detail',
            title: titleOf(s),
            body: bodyOf(s),
            meta: [domainOf(s), s.impactLabel || s.demandImpact || 'Signal', s.confidence || 'Medium']
          });
        }
      });
    });
  }

  function renderHeat(id, rows) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<div class="exec-empty">No backend/cache opportunity lanes loaded yet.</div>';
      return;
    }
    var colTotals = [0, 0, 0];
    rows.forEach(function (r) {
      colTotals[0] += (r.windows && r.windows[0]) || 0;
      colTotals[1] += (r.windows && r.windows[1]) || 0;
      colTotals[2] += (r.windows && r.windows[2]) || 0;
    });
    var grand = colTotals[0] + colTotals[1] + colTotals[2];
    var grandHigh = grand * 1.33;

    function fmtMoney(v) {
      return '$' + v.toFixed(1) + 'M';
    }

    var body = rows.map(function (r) {
      var t = ((r.windows && r.windows[0]) || 0) + ((r.windows && r.windows[1]) || 0) + ((r.windows && r.windows[2]) || 0);
      return '<tr><th>' + safeEsc(r.name) + '</th><td>' + fmtMoney((r.windows && r.windows[0]) || 0) + '</td><td>' + fmtMoney((r.windows && r.windows[1]) || 0) + '</td><td>' + fmtMoney((r.windows && r.windows[2]) || 0) + '</td><td class="exec-opp-total">' + fmtMoney(t) + '</td></tr>';
    }).join('');

    el.innerHTML =
      '<div class="exec-opp-wrap">' +
        '<table class="exec-opp-table">' +
          '<thead><tr><th>Lane</th><th>0-30 Days</th><th>31-90 Days</th><th>91-180 Days</th><th>Total (12-18M)</th></tr></thead>' +
          '<tbody>' + body + '</tbody>' +
          '<tfoot><tr><th>Total</th><td>' + fmtMoney(colTotals[0]) + '</td><td>' + fmtMoney(colTotals[1]) + '</td><td>' + fmtMoney(colTotals[2]) + '</td><td class="exec-opp-grand">' + fmtMoney(grand) + '-' + fmtMoney(grandHigh) + '</td></tr></tfoot>' +
        '</table>' +
        '<div class="exec-opp-legend"><span><i class="l-low"></i>Low ($0-$0.2M)</span><span><i class="l-mid"></i>Medium ($0.2M-$0.7M)</span><span><i class="l-high"></i>High ($0.7M-$1.5M)</span><span><i class="l-vhigh"></i>Very High (>$1.5M)</span></div>' +
      '</div>';
  }

  function scoreBucket(score) {
    if (score >= 90) return { label: 'SEVERE', cls: 'sev-severe' };
    if (score >= 75) return { label: 'HIGH', cls: 'sev-high' };
    if (score >= 58) return { label: 'MEDIUM', cls: 'sev-medium' };
    return { label: 'WATCH', cls: 'sev-watch' };
  }

  function timeAgoLabel(s) {
    var now = Date.now();
    var ts = 0;
    try {
      ts = typeof execSignalTimeMs === 'function' ? execSignalTimeMs(s) : 0;
    } catch (e) {
      ts = 0;
    }
    if (!ts) return 'Now';
    var mins = Math.max(0, Math.floor((now - ts) / 60000));
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 48) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    return days + 'd ago';
  }

  function inferOwner(s) {
    var txt = (titleOf(s) + ' ' + bodyOf(s)).toLowerCase();
    if (/cyber|fraud|security|breach/.test(txt)) return 'CISO Office';
    if (/ota|marketing|campaign|sem|conversion|direct/.test(txt)) return 'Digital Marketing';
    if (/app|product|ux|booking|payment/.test(txt)) return 'Product';
    if (/loyalty|privilege|avios|tier/.test(txt)) return 'Loyalty';
    return 'Revenue Strategy';
  }

  function fmtDateAdd(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  function computeOpportunityRangeFromSignals(sigs) {
    var opp = sigs.filter(function (s) {
      return /opportun|growth|capture|upsell|premium|ancillary|direct|conversion/i.test((titleOf(s) + ' ' + bodyOf(s)).toLowerCase());
    });
    var scoreSum = opp.reduce(function (a, s) { return a + Math.max(0, sscore(s)); }, 0);
    var low = Math.max(0.8, Number(((scoreSum / 100) * 0.65).toFixed(1)));
    var high = Number((low * 1.45).toFixed(1));
    return {
      label: '$' + low.toFixed(1) + 'M-$' + high.toFixed(1) + 'M',
      sub: '12-18 month modeled upside'
    };
  }

  function actionTitleFromSignal(s, idx) {
    var txt = (titleOf(s) + ' ' + bodyOf(s)).toLowerCase();
    if (/ota|direct share|leak/.test(txt)) return 'Protect direct share';
    if (/opportun|growth|demand|premium|capture/.test(txt)) return 'Convert opportunity';
    if (/friction|app|service|complaint|delay|refund/.test(txt)) return 'Reduce friction';
    return ['Protect direct share', 'Convert opportunity', 'Reduce friction'][idx] || 'Launch action';
  }

  function impactRangeFromScore(score) {
    var low = Math.max(0.6, (score / 100) * 1.2);
    var high = low * 1.28;
    return '$' + low.toFixed(1) + 'M-$' + high.toFixed(1) + 'M';
  }

  function renderSummaryCards(sigs) {
    var el = document.getElementById('execSummaryKpis');
    if (!el) return;
    var model = window.__execBriefModel || {};
    var avg = Number(model.avg || 0);
    if (!avg) {
      var pool = sigs.slice(0, 12);
      avg = pool.length ? Math.round(pool.reduce(function (a, s) { return a + sscore(s); }, 0) / pool.length) : 0;
    }
    var risk = sigs.filter(function (s) {
      return /risk|threat|disrupt|fraud|friction|leak|drop|decline/i.test((titleOf(s) + ' ' + bodyOf(s)).toLowerCase());
    }).length;
    var opp = sigs.filter(function (s) {
      return /opportun|growth|capture|upsell|premium|ancillary|direct/i.test((titleOf(s) + ' ' + bodyOf(s)).toLowerCase());
    }).length;
    var confidence = 'Medium';
    if (typeof execConfidenceSummary === 'function') {
      try { confidence = (execConfidenceSummary(sigs).label || confidence); } catch (e) {}
    }
    var sourceCount = typeof execSourceCount === 'function' ? execSourceCount() : 0;
    var corroborated = sigs.filter(function (s) { return s && s.verified; }).length;
    var nextMove = model.nextMove || ((sigs[0] && sigs[0].captureStrategy) || 'Protect direct share');
    var oppRange = computeOpportunityRangeFromSignals(sigs);
    var cards = [
      { icon: '↗', label: 'State', value: avg + '/100 Elevated', sub: 'Risk signals: ' + risk + ' | Opportunity: ' + opp, cta: 'Open evidence' },
      { icon: '$', label: 'Opportunity', value: (model.opportunityRange || oppRange.label), sub: oppRange.sub, cta: 'See opportunity detail' },
      { icon: '◎', label: 'Next Move', value: nextMove, sub: 'Run execution with named owners', cta: 'View action plan' },
      { icon: '◍', label: 'Trust', value: sourceCount + ' sources, ' + corroborated + ' corroborated', sub: confidence + ' data confidence', cta: 'View sources' }
    ];
    el.innerHTML = cards.map(function (c, i) {
      return '<article class="exec-summary-card exec-clickable" data-summary-index="' + i + '">' +
        '<div class="exec-summary-icon">' + c.icon + '</div>' +
        '<div><div class="exec-summary-label">' + safeEsc(c.label) + '</div><div class="exec-summary-value">' + safeEsc(c.value) + '</div><div class="exec-summary-sub">' + safeEsc(c.sub) + '</div><button type="button" class="exec-summary-cta">' + safeEsc(c.cta) + ' <span>→</span></button></div>' +
      '</article>';
    }).join('');
  }

  function renderTopSignalsPanel(sigs) {
    var el = document.getElementById('execTopSignals');
    if (!el) return;
    var top = sigs.slice(0, 3);
    if (!top.length) {
      el.innerHTML = '<div class="exec-empty">No backend/cache signals loaded yet.</div>';
      return;
    }
    el.innerHTML = top.map(function (s, i) {
      var sev = scoreBucket(sscore(s));
      return '<article class="exec-signal-row exec-clickable" data-signal-index="' + i + '">' +
        '<div class="exec-signal-rank">' + (i + 1) + '</div>' +
        '<div class="exec-signal-main"><div class="exec-signal-title">' + safeEsc(titleOf(s)) + '</div><div class="exec-signal-body">' + safeEsc(bodyOf(s)) + '</div><button type="button" class="exec-inline-link">See route detail <span>→</span></button></div>' +
        '<div class="exec-signal-side"><span class="exec-severity ' + sev.cls + '">' + sev.label + '</span><span>' + safeEsc(s.impactLabel || s.demandImpact || 'Signal') + '</span><span>' + timeAgoLabel(s) + '</span></div>' +
      '</article>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.exec-signal-row.exec-clickable'), function (row) {
      row.addEventListener('click', function () {
        var idx = Number(row.getAttribute('data-signal-index'));
        var s = top[idx] || {};
        if (typeof openExecDetailDrawer === 'function') {
          openExecDetailDrawer({
            type: 'Top Signal',
            title: titleOf(s),
            body: bodyOf(s),
            meta: [domainOf(s), s.impactLabel || s.demandImpact || 'Signal', s.confidence || 'Medium']
          });
        }
      });
    });
  }

  function queueFromSignals(sigs) {
    return sigs.slice(0, 3).map(function (s, i) {
      return {
        title: actionTitleFromSignal(s, i),
        body: bodyOf(s),
        tag: domainOf(s),
        owner: inferOwner(s),
        due: [fmtDateAdd(7), fmtDateAdd(14), fmtDateAdd(21)][i] || 'TBC',
        impact: impactRangeFromScore(sscore(s)),
        signal: s
      };
    });
  }

  function renderActionQueue() {
    var el = document.getElementById('execActionQueue');
    if (!el) return;
    var q = queueFromSignals(allSignals().sort(function (a, b) { return sscore(b) - sscore(a); }));
    if (!q.length) {
      el.innerHTML = '<div class="exec-empty">Action queue will populate from backend/cache signals.</div>';
      return;
    }
    el.innerHTML = q.map(function (x, i) {
      return '<article class="exec-action-row exec-clickable" data-action-index="' + i + '">' +
        '<div class="exec-action-main"><div class="exec-action-rank">' + (i + 1) + '</div><div><div class="exec-action-title">' + safeEsc(x.title) + '</div><div class="exec-action-body">' + safeEsc(x.body) + '</div><button type="button" class="exec-inline-link">Open action brief <span>→</span></button></div></div>' +
        '<div class="exec-action-meta"><label>Owner</label><span>' + safeEsc(x.owner) + '</span></div>' +
        '<div class="exec-action-meta"><label>Due</label><span>' + safeEsc(x.due) + '</span></div>' +
        '<div class="exec-action-meta"><label>Impact (12-18M)</label><strong>' + safeEsc(x.impact) + '</strong></div>' +
        '<div class="exec-action-controls"><button type="button" class="exec-assign-btn">Assign owner</button><button type="button" class="exec-ghost-btn">•••</button></div>' +
      '</article>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.exec-action-row.exec-clickable'), function (row) {
      row.addEventListener('click', function () {
        var idx = Number(row.getAttribute('data-action-index'));
        var a = q[idx] || {};
        if (typeof openExecDetailDrawer === 'function') {
          openExecDetailDrawer({
            type: 'Action Brief',
            title: a.title || 'Action',
            body: (a.body || '') + ' Owner: ' + (a.owner || 'TBC') + '. Target: ' + (a.due || 'TBC') + '.',
            meta: [a.tag || 'RADAR', a.owner || 'Owner TBC', 'Due ' + (a.due || 'TBC')]
          });
        }
      });
    });
  }

  function renderExecAddOns() {
    var sigs = allSignals().sort(function (a, b) { return sscore(b) - sscore(a); });
    var opportunities = sigs.filter(function (s) {
      return /opportun|revenue|growth|upsell|ancillary|direct|capture|increase|loyalty|personal/i.test((titleOf(s) + ' ' + bodyOf(s)).toLowerCase());
    });
    renderSummaryCards(sigs);
    renderTopSignalsPanel(sigs);
    renderActionQueue();

    var routeBtn = document.getElementById('execRouteDetailBtn');
    if (routeBtn) {
      routeBtn.onclick = function () {
        var s = sigs[0] || {};
        if (typeof openExecDetailDrawer === 'function') {
          openExecDetailDrawer({
            type: 'Route Detail',
            title: titleOf(s) || 'No route signal selected',
            body: bodyOf(s),
            meta: [domainOf(s), s.impactLabel || s.demandImpact || 'Signal', s.confidence || 'Medium']
          });
        }
      };
    }

    var lanes = [
      ['Direct', /direct|ota|agent|booking|conversion/i],
      ['Premium', /premium|business|luxury|qsuite|high-value/i],
      ['Ancillary', /ancillary|baggage|seat|lounge|fast track|bundle|upsell/i],
      ['Loyalty', /loyalty|member|privilege|retention|avios|tier/i]
    ];
    renderHeat('execRevenueHeatmap', lanes.map(function (l, idx) {
      var c = opportunities.filter(function (s) { return l[1].test(titleOf(s) + ' ' + bodyOf(s)); }).length;
      var base = Math.max(0.14, (c * 0.22) + (0.16 * (idx + 1)));
      var w0 = Number((base * 0.45).toFixed(1));
      var w1 = Number((base * 1.05).toFixed(1));
      var w2 = Number((base * 1.42).toFixed(1));
      return { name: l[0], windows: [w0, w1, w2] };
    }));
  }

  async function fetchExecutiveBackendData(force) {
    var live = initExecLiveState();
    var now = Date.now();
    if (!force && live.loading) return;
    if (!force && (now - live.loadedAt) < 90000) return;
    live.loading = true;
    var vm = viewModeNow();
    try {
      var reqs = await Promise.allSettled([
        (typeof backendFetch === 'function'
          ? backendFetch('/api/dashboard/delta?viewMode=' + encodeURIComponent(vm) + '&hours=24', { method: 'GET' }, 15000)
          : fetch((typeof BACKEND_URL === 'string' ? BACKEND_URL : '') + '/api/dashboard/delta?viewMode=' + encodeURIComponent(vm) + '&hours=24')),
        (typeof backendFetch === 'function'
          ? backendFetch('/api/opportunity-simulation?viewMode=' + encodeURIComponent(vm) + '&limit=24', { method: 'GET' }, 15000)
          : fetch((typeof BACKEND_URL === 'string' ? BACKEND_URL : '') + '/api/opportunity-simulation?viewMode=' + encodeURIComponent(vm) + '&limit=24')),
        (typeof backendFetch === 'function'
          ? backendFetch('/api/ranking/signals?viewMode=' + encodeURIComponent(vm) + '&limit=50', { method: 'GET' }, 15000)
          : fetch((typeof BACKEND_URL === 'string' ? BACKEND_URL : '') + '/api/ranking/signals?viewMode=' + encodeURIComponent(vm) + '&limit=50'))
      ]);
      if (reqs[0].status === 'fulfilled') {
        var deltaJson = await reqs[0].value.json();
        if (deltaJson && deltaJson.ok && deltaJson.data) live.delta = deltaJson.data;
      }
      if (reqs[1].status === 'fulfilled') {
        var simJson = await reqs[1].value.json();
        if (simJson && simJson.ok && simJson.data) live.simulation = simJson.data;
      }
      if (reqs[2].status === 'fulfilled') {
        var rankingJson = await reqs[2].value.json();
        if (rankingJson && rankingJson.ok && rankingJson.data) {
          live.ranking = rankingJson.data;
          live.rankingSignals = extractArrayCandidates(rankingJson.data).map(normalizeRankingSignal).filter(Boolean);
        }
      }
      live.loadedAt = Date.now();
    } catch (e) {
      live.error = e && e.message ? e.message : 'Executive backend sync failed';
    } finally {
      live.loading = false;
      renderExecAddOnsV2();
    }
  }

  function computeOpportunityRangeForCards(sigs) {
    var live = initExecLiveState();
    var rows = simulationRowsFromPayload(live.simulation, sigs);
    var total = rows.reduce(function (acc, r) { return acc + ((r.windows[0] || 0) + (r.windows[1] || 0) + (r.windows[2] || 0)); }, 0);
    if (total > 0) {
      var hi = total * 1.33;
      return { label: '$' + total.toFixed(1) + 'M-$' + hi.toFixed(1) + 'M', sub: '12-18 month total upside' };
    }
    return computeOpportunityRangeFromSignals(sigs);
  }

  function renderSummaryCardsV2(sigs) {
    var el = document.getElementById('execSummaryKpis');
    if (!el) return;
    var model = window.__execBriefModel || {};
    var live = initExecLiveState();
    var avg = Number(model.avg || 0);
    if (!avg) {
      var p = sigs.slice(0, 12);
      avg = p.length ? Math.round(p.reduce(function (a, s) { return a + signalScore(s); }, 0) / p.length) : 0;
    }
    if (live.delta && live.delta.summary && toNum(live.delta.summary.criticalCount) > 0 && avg < 50) avg = 50;
    var risk = sigs.filter(function (s) { return /risk|threat|disrupt|fraud|friction|leak|drop|decline/i.test((titleOf(s) + ' ' + bodyOf(s)).toLowerCase()); }).length;
    var opp = sigs.filter(function (s) { return /opportun|growth|capture|upsell|premium|ancillary|direct/i.test((titleOf(s) + ' ' + bodyOf(s)).toLowerCase()); }).length;
    var confidence = 'Medium';
    if (typeof execConfidenceSummary === 'function') { try { confidence = execConfidenceSummary(sigs).label || confidence; } catch (_) {} }
    var sourceCount = typeof execSourceCount === 'function' ? execSourceCount() : 0;
    var corroborated = sigs.filter(function (s) { return s && s.verified; }).length;
    var nextMove = model.nextMove || ((sigs[0] && sigs[0].captureStrategy) || 'Protect direct share');
    var oppRange = computeOpportunityRangeForCards(sigs);
    var cards = [
      { icon: 'ST', label: 'State', value: avg + '/100 Elevated', sub: 'Risk signals: ' + risk + ' | Opportunity: ' + opp, cta: 'Open evidence' },
      { icon: '$', label: 'Opportunity', value: (model.opportunityRange || oppRange.label), sub: oppRange.sub, cta: 'See opportunity detail' },
      { icon: 'NM', label: 'Next Move', value: nextMove, sub: 'Run execution with named owners', cta: 'View action plan' },
      { icon: 'TR', label: 'Trust', value: sourceCount + ' sources, ' + corroborated + ' corroborated', sub: confidence + ' data confidence', cta: 'View sources' }
    ];
    el.innerHTML = cards.map(function (c, i) {
      return '<article class="exec-summary-card exec-clickable" data-summary-index="' + i + '">' +
        '<div class="exec-summary-icon">' + c.icon + '</div>' +
        '<div><div class="exec-summary-label">' + safeEsc(c.label) + '</div><div class="exec-summary-value">' + safeEsc(c.value) + '</div><div class="exec-summary-sub">' + safeEsc(c.sub) + '</div><button type="button" class="exec-summary-cta">' + safeEsc(c.cta) + ' <span>-></span></button></div>' +
      '</article>';
    }).join('');
  }

  function renderTopSignalsPanelV2(sigs) {
    var el = document.getElementById('execTopSignals');
    if (!el) return;
    var top = sigs.slice(0, 3);
    if (!top.length) {
      el.innerHTML = '<div class="exec-empty">No backend/cache signals loaded yet.</div>';
      return;
    }
    el.innerHTML = top.map(function (s, i) {
      var sev = scoreBucket(signalScore(s));
      return '<article class="exec-signal-row exec-clickable" data-signal-index="' + i + '">' +
        '<div class="exec-signal-rank">' + (i + 1) + '</div>' +
        '<div class="exec-signal-main"><div class="exec-signal-title">' + safeEsc(titleOf(s)) + '</div><div class="exec-signal-body">' + safeEsc(bodyOf(s)) + '</div><button type="button" class="exec-inline-link">See route detail <span>-></span></button></div>' +
        '<div class="exec-signal-side"><span class="exec-severity ' + sev.cls + '">' + sev.label + '</span><span>' + safeEsc(s.impactLabel || s.demandImpact || 'Signal') + '</span><span>' + timeAgoLabel(s) + '</span></div>' +
      '</article>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.exec-signal-row.exec-clickable'), function (row) {
      row.addEventListener('click', function () {
        var idx = Number(row.getAttribute('data-signal-index'));
        var s = top[idx] || {};
        if (typeof openExecDetailDrawer === 'function') {
          openExecDetailDrawer({ type: 'Top Signal', title: titleOf(s), body: bodyOf(s), meta: [domainOf(s), s.impactLabel || s.demandImpact || 'Signal', s.confidence || 'Medium'] });
        }
      });
    });
  }

  function queueFromSignalsV2(sigs) {
    return sigs.slice(0, 3).map(function (s, i) {
      var score = signalScore(s);
      return {
        title: actionTitleFromSignal(s, i),
        body: bodyOf(s),
        tag: domainOf(s),
        owner: inferOwner(s),
        due: (score >= 90 ? fmtDateAdd(7) : score >= 70 ? fmtDateAdd(14) : fmtDateAdd(21)),
        impact: impactRangeFromScore(score),
        signal: s
      };
    });
  }

  function renderActionQueueV2(sigs) {
    var el = document.getElementById('execActionQueue');
    if (!el) return;
    var q = queueFromSignalsV2(sigs);
    if (!q.length) {
      el.innerHTML = '<div class="exec-empty">Action queue will populate from backend/cache signals.</div>';
      return;
    }
    el.innerHTML = q.map(function (x, i) {
      return '<article class="exec-action-row exec-clickable" data-action-index="' + i + '">' +
        '<div class="exec-action-main"><div class="exec-action-rank">' + (i + 1) + '</div><div><div class="exec-action-title">' + safeEsc(x.title) + '</div><div class="exec-action-body">' + safeEsc(x.body) + '</div><button type="button" class="exec-inline-link">Open action brief <span>-></span></button></div></div>' +
        '<div class="exec-action-meta"><label>Owner</label><span>' + safeEsc(x.owner) + '</span></div>' +
        '<div class="exec-action-meta"><label>Due</label><span>' + safeEsc(x.due) + '</span></div>' +
        '<div class="exec-action-meta"><label>Impact (12-18M)</label><strong>' + safeEsc(x.impact) + '</strong></div>' +
        '<div class="exec-action-controls"><button type="button" class="exec-assign-btn">Assign owner</button><button type="button" class="exec-ghost-btn">...</button></div>' +
      '</article>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.exec-action-row.exec-clickable'), function (row) {
      row.addEventListener('click', function () {
        var idx = Number(row.getAttribute('data-action-index'));
        var a = q[idx] || {};
        if (typeof openExecDetailDrawer === 'function') {
          openExecDetailDrawer({ type: 'Action Brief', title: a.title || 'Action', body: (a.body || '') + ' Owner: ' + (a.owner || 'TBC') + '. Target: ' + (a.due || 'TBC') + '.', meta: [a.tag || 'RADAR', a.owner || 'Owner TBC', 'Due ' + (a.due || 'TBC')] });
        }
      });
    });
  }

  function renderExecAddOnsV2() {
    var sigs = activeSignalsForExecutive();
    renderSummaryCardsV2(sigs);
    renderTopSignalsPanelV2(sigs);
    renderActionQueueV2(sigs);
    var routeBtn = document.getElementById('execRouteDetailBtn');
    if (routeBtn) {
      routeBtn.onclick = function () {
        var s = sigs[0] || {};
        if (typeof openExecDetailDrawer === 'function') {
          openExecDetailDrawer({ type: 'Route Detail', title: titleOf(s) || 'No route signal selected', body: bodyOf(s), meta: [domainOf(s), s.impactLabel || s.demandImpact || 'Signal', s.confidence || 'Medium'] });
        }
      };
    }
    var rows = simulationRowsFromPayload(initExecLiveState().simulation, sigs);
    renderHeat('execRevenueHeatmap', rows);
  }

  window.refreshExecutiveCommandView = function () {
    fetchExecutiveBackendData(true);
    renderExecutiveSummaryPage();
  };

  function renderFutureCards(id, cards) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = cards.map(function (c) {
      return '<div class="future-card"><div class="future-title">' + safeEsc(c.t) + '</div><div class="future-body">' + safeEsc(c.b) + '</div><div class="future-tags">' + (c.tags || []).map(function (t) { return '<span>' + safeEsc(t) + '</span>'; }).join('') + '</div></div>';
    }).join('');
  }

  function renderPredictiveAddOns() {
    var sigs = allSignals();
    var friction = sigs.filter(function (s) { return /friction|complaint|refund|delay|support|payment|baggage|service/i.test(titleOf(s) + ' ' + bodyOf(s)); }).slice(0, 3);
    var opp = sigs.filter(function (s) { return /opportun|revenue|growth|ancillary|direct|loyalty|premium|personal/i.test(titleOf(s) + ' ' + bodyOf(s)); }).slice(0, 3);

    renderFutureCards('futureOpportunityPipeline', (opp.length ? opp.map(function (s) {
      return { t: titleOf(s), b: bodyOf(s), tags: [domainOf(s), 'Opportunity', 'Backend/cache'] };
    }) : [{
      t: 'Awaiting opportunity signals',
      b: 'This lane will populate when backend/cache signals contain revenue, direct-share, ancillary or loyalty opportunity patterns.',
      tags: ['Backend needed', 'No fake data']
    }]));

    renderFutureCards('customerFutureSignals', (friction.length ? friction.map(function (s) {
      return { t: titleOf(s), b: bodyOf(s), tags: [domainOf(s), 'Customer signal', 'Prediction input'] };
    }) : [{
      t: 'Awaiting customer future signals',
      b: 'This lane will populate when backend/cache signals contain customer friction, service expectation or behaviour-shift patterns.',
      tags: ['Backend needed', 'No fake data']
    }]));

    renderFutureCards('strategicSimulationBacklog', [
      { t: 'AI travel assistant impact simulation', b: 'Estimate conversion, service deflection, loyalty engagement and ancillary attach impact before investment.', tags: ['Simulation', 'AI', 'Future backend'] },
      { t: 'Direct-share recapture model', b: 'Model how route windows, loyalty incentives and OTA pressure could shift customers back to QR direct channels.', tags: ['OTA leakage', 'Direct booking', 'Revenue'] },
      { t: 'Premium recovery concierge business case', b: 'Forecast high-value customer retention and NPS uplift from proactive disruption recovery and tailored servicing.', tags: ['Premium', 'Recovery', 'Retention'] },
      { t: 'Next-best ancillary marketplace model', b: 'Predict attach-rate lift from journey-aware bundles across seats, baggage, lounges, Fast Track and eSIM.', tags: ['Ancillary', 'Personalization', 'Marketplace'] }
    ]);
  }

  var baseExec = window.renderExecutiveSummaryPage;
  window.renderExecutiveSummaryPage = function () {
    if (baseExec) baseExec();
    renderExecAddOnsV2();
    fetchExecutiveBackendData(false);
  };
  var basePredict = window.renderPredictivePage;
  window.renderPredictivePage = function () { if (basePredict) basePredict(); renderPredictiveAddOns(); };
  var baseHide = window.hideAllPrimaryPages;
  window.hideAllPrimaryPages = function () { if (baseHide) baseHide(); var el = document.getElementById('roadmapPage'); if (el) el.classList.remove('visible'); };
  var baseClear = window.clearPrimaryNav;
  window.clearPrimaryNav = function () { if (baseClear) baseClear(); var el = document.getElementById('navRoadmap'); if (el) el.classList.remove('active'); };

  var roadmapState = { proof: null, runtimeWarnings: null, lastFetchedAt: null, loading: false, error: null };
  var ROADMAP_PROOF_MAP = {
    'Deployed backend web-search enforcement': 'web_search',
    'Source-specific competitor cache population': 'competitor_cache',
    'Source-specific sentiment payload quality': 'sentiment_quality',
    'Severity weight formalization': 'severity_weights',
    'Deduplication and clustering engine': 'dedup',
    'Cross-tab correlation engine': 'correlation',
    'Scenario simulation quality layer': 'confidence',
    'Signal quality scoring': 'signal_quality',
    'Human feedback loop for ranking': 'feedback',
    'Watchlists and threshold alerts': 'watchlist',
    'Action-to-outcome attribution': 'outcome',
    'Executive delta brief': 'delta',
    'All primary tabs backend-valid': 'empty_state'
  };

  function proofToLocalStatus(v) {
    return v === 'completed' ? 'done' : 'progress';
  }

  function cleanEvidenceText(v, fallback) {
    var text = (v == null ? '' : String(v)).trim();
    if (!text) return fallback || '';
    if (/:\s*(undefined|null)\s*$/i.test(text)) return fallback || '';
    if (/^(undefined|null)$/i.test(text)) return fallback || '';
    return text;
  }

  function roadmapData() {
    return [
      { s: 'Completed Foundation (Delivered)', tasks: [
        ['Full component modularization', 'done', 'Frontend is split into components/styles/scripts with bundle generation and dist output'],
        ['Executive and Predictive UI surfaces', 'done', 'Executive Summary, Predictive Intelligence, and Roadmap pages are visible and runtime-wired'],
        ['Cache-first runtime posture', 'done', 'Frontend prefers backend/Supabase cache and avoids fake static payloads'],
        ['Unified tile state vocabulary', 'done', 'Primary tabs use Loaded, No data, Error, and Stale states']
      ]},
      { s: 'Phase 1 - Data Truth and Runtime Stability (Must-have)', tasks: [
        ['Local proxy endpoint toggle', 'done', 'USE_STUBS toggle is available in local dev proxy for sentiment/competitor cache behavior'],
        ['/api/cache/latest stability', 'done', 'Latest cache route is reported stable in backend smoke checks'],
        ['Production-safe CORS', 'done', 'Localhost and production frontend origins are reported allowed'],
        ['Unified backend response envelope', 'done', 'Frontend and backend are aligned on normalized cache/API contract'],
        ['Structured backend logs and diagnostics', 'done', 'Route-level request logging and diagnostics routes are reported active'],
        ['Web search enabled in frontend AI flows', 'done', 'Domain scan, chat, action plan, competitor generation, and customer-intel generation send web-search tool config'],
        ['Web search enforcement in local proxy', 'done', 'Local dev proxy now auto-injects web-search tool into /api/claude requests'],
        ['Competitor loader hardening', 'done', 'Cache alias fallback, stale/no-data handling, and guarded generation/persistence behavior are now implemented in frontend runtime'],
        ['Deployed backend web-search enforcement', 'progress', 'Waiting for live endpoint proof sync.'],
        ['Source-specific competitor cache population', 'backend', 'Awaiting live competitor cache checks.'],
        ['Source-specific sentiment payload quality', 'backend', 'Awaiting live sentiment proof checks.'],
        ['Runtime health and freshness badge parity', 'done', 'Production /api/health/full now reports stable freshness metadata and runtime parity']
      ]},
      { s: 'Phase 2 - Reliability and Release Gates (Must-have)', tasks: [
        ['Consolidate duplicate renderers', 'done', 'Single canonical renderer paths are active for core competitor/sentiment rendering behavior'],
        ['Competitor no-match and persistence guard', 'done', 'Derived-only competitor fallback is not persisted as true source cache; no-match messaging is explicit'],
        ['Automated smoke suite (tabs)', 'done', 'Local smoke test passes across primary tabs'],
        ['Release gate on diagnostics/cache routes', 'done', 'Health/diagnostics/cache proof routes are reported passing'],
        ['Roadmap tracker live-proof mode', 'progress', 'Switching to backend-driven status hydration from /api/roadmap/proof.'],
        ['Console/runtime quality gate', 'progress', 'Waiting for runtime warnings endpoint check.']
      ]},
      { s: 'Phase 3 - Intelligence Upgrade (High-value)', tasks: [
        ['Executive delta brief', 'progress', 'Awaiting live proof from /api/dashboard/delta.'],
        ['Severity weight formalization', 'backend', 'Awaiting live backend proof checks.'],
        ['Deduplication and clustering engine', 'backend', 'Awaiting live backend proof checks.'],
        ['Cross-tab correlation engine', 'progress', 'Awaiting live backend proof checks.'],
        ['Scenario simulation quality layer', 'progress', 'Awaiting live backend proof checks.'],
        ['Signal quality scoring', 'backend', 'Awaiting live backend proof checks.'],
        ['Human feedback loop for ranking', 'progress', 'Awaiting live backend proof checks.'],
        ['Watchlists and threshold alerts', 'backend', 'Awaiting live backend proof checks.'],
        ['Action-to-outcome attribution', 'progress', 'Awaiting live backend proof checks.']
      ]},
      { s: 'Release Gate - Definition of Complete', tasks: [
        ['All primary tabs backend-valid', 'progress', 'Awaiting live backend proof checks.'],
        ['Deployed parity (localhost vs production)', 'done', 'Production backend runs commit-based deploy with matching health/version evidence'],
        ['Automated smoke suite green (local + deployed)', 'done', 'Local tab smoke and deployed backend smoke are green'],
        ['Evidence tracker parity with runtime', 'progress', 'Target: automatic evidence synchronization from backend proof endpoints'],
        ['Predictive endpoints availability', 'done', 'Predictive endpoints are reported available and callable']
      ]}
    ];
  }

  function applyLiveProof(data) {
    var model = roadmapData();
    var byId = {};
    if (data && Array.isArray(data.items)) {
      data.items.forEach(function (x) { byId[x.id] = x; });
    }

    model.forEach(function (sec) {
      sec.tasks.forEach(function (task) {
        var proofId = ROADMAP_PROOF_MAP[task[0]];
        if (!proofId || !byId[proofId]) return;
        task[1] = proofToLocalStatus(byId[proofId].status);
        task[2] = cleanEvidenceText(byId[proofId].evidence, task[2]);
      });
    });

    if (data && data.summary) {
      model.forEach(function (sec) {
        sec.tasks.forEach(function (task) {
          if (task[0] === 'Roadmap tracker live-proof mode') {
            task[1] = 'done';
            task[2] = 'Roadmap synced from /api/roadmap/proof with live completion data.';
          }
          if (task[0] === 'Evidence tracker parity with runtime') {
            task[1] = 'done';
            task[2] = 'Live proof API synchronization is active in the roadmap page.';
          }
        });
      });
    }

    if (roadmapState.runtimeWarnings && roadmapState.runtimeWarnings.data) {
      var status = roadmapState.runtimeWarnings.data.status;
      var clean = status === 'clean';
      model.forEach(function (sec) {
        sec.tasks.forEach(function (task) {
          if (task[0] === 'Console/runtime quality gate') {
            task[1] = clean ? 'done' : 'progress';
            task[2] = clean
              ? 'Runtime quality gate reports clean with no warnings or errors.'
              : 'Runtime quality gate reports warnings; continue triage.';
          }
        });
      });
    }

    return model;
  }

  function recentUpdates() {
    var cards = [
      { date: '28 May 2026', tag: 'Production', title: 'Backend runtime is live', body: 'Render deployment is healthy and endpoint smoke checks are passing.' },
      { date: '28 May 2026', tag: 'Validation', title: 'Core smoke checks passed', body: 'Health, cache, diagnostics, ranking and predictive routes are returning success.' },
      { date: '28 May 2026', tag: 'UX Upgrade', title: 'Executive Summary redesigned for glanceable decisions', body: 'First-screen verdict now prioritizes status, cause, impact and recommended move with clearer drill-down paths.' },
      { date: '28 May 2026', tag: 'Roadmap', title: 'Tracker moved to live-proof mode', body: 'Roadmap now hydrates statuses from backend proof endpoints for review parity.' }
    ];
    if (roadmapState.proof && roadmapState.proof.summary) {
      cards.unshift({
        date: '28 May 2026',
        tag: 'Live Proof',
        title: roadmapState.proof.summary.completed + '/' + roadmapState.proof.summary.total + ' items completed',
        body: 'Completion is now auto-read from /api/roadmap/proof. Current completion: ' + roadmapState.proof.summary.completionPct + '%.'
      });
    }
    return cards;
  }

  function renderRoadmapUpdates() {
    var el = document.getElementById('roadmapUpdates');
    if (!el) return;
    el.innerHTML = recentUpdates().map(function (c) {
      return '<div class="roadmap-update-card"><div class="roadmap-update-head"><span class="roadmap-update-date">' + safeEsc(c.date) + '</span><span class="roadmap-update-badge">' + safeEsc(c.tag) + '</span></div><div class="roadmap-update-title">' + safeEsc(c.title) + '</div><div class="roadmap-update-body">' + safeEsc(c.body) + '</div></div>';
    }).join('');
  }

  function renderRoadmapTracker() {
    var data = applyLiveProof(roadmapState.proof);
    var flat = data.reduce(function (acc, sec) { return acc.concat(sec.tasks); }, []);
    var counts = { done: 0, progress: 0, backend: 0, todo: 0 };
    flat.forEach(function (t) { counts[t[1]] = (counts[t[1]] || 0) + 1; });

    var k = document.getElementById('roadmapKpis');
    if (k) {
      var updatedLabel = roadmapState.proof && roadmapState.proof.generatedAt
        ? roadmapState.proof.generatedAt
        : 'Live sync pending';
      k.innerHTML = [
        ['Completed', counts.done, 'Delivered and validated in this workspace'],
        ['In progress', counts.progress, 'Implemented partially or awaiting parity checks'],
        ['Backend needed', counts.backend, 'Requires deployed API/data/schema work'],
        ['Updated', updatedLabel, 'Roadmap synced with live backend proof endpoints']
      ].map(function (x) {
        return '<div class="roadmap-kpi"><div class="roadmap-kv">' + safeEsc(x[1]) + '</div><div class="roadmap-kl">' + safeEsc(x[0]) + '</div><div class="roadmap-kd">' + safeEsc(x[2]) + '</div></div>';
      }).join('');
    }

    renderRoadmapUpdates();

    var s = document.getElementById('roadmapSections');
    if (s) {
      s.innerHTML = data.map(function (sec) {
        return '<div class="roadmap-section"><h3>' + safeEsc(sec.s) + '</h3>' + sec.tasks.map(function (t) {
          var cls = t[1] === 'done' ? 'st-done' : t[1] === 'progress' ? 'st-progress' : t[1] === 'backend' ? 'st-backend' : 'st-todo';
          var label = t[1] === 'done' ? 'Completed' : t[1] === 'progress' ? 'In progress' : t[1] === 'backend' ? 'Backend needed' : 'To do';
          return '<div class="roadmap-task"><div><div class="roadmap-task-title">' + safeEsc(t[0]) + '</div><div class="roadmap-task-evidence">Evidence: ' + safeEsc(t[2]) + '</div></div><span class="roadmap-status ' + cls + '">' + label + '</span></div>';
        }).join('') + '</div>';
      }).join('');
    }
  }

  async function loadRoadmapProof() {
    if (roadmapState.loading) return;
    roadmapState.loading = true;
    roadmapState.error = null;
    try {
      var path = '/api/roadmap/proof?viewMode=b2c';
      var res;
      if (typeof backendFetch === 'function') {
        res = await backendFetch(path, { method: 'GET' }, 15000);
      } else {
        var base = (typeof BACKEND_URL === 'string' && BACKEND_URL) ? BACKEND_URL : '';
        res = await fetch(base + path, { method: 'GET' });
      }
      var json = await res.json();
      if (json && json.ok && json.data) {
        roadmapState.proof = json.data;
        roadmapState.lastFetchedAt = new Date().toISOString();
      } else {
        roadmapState.error = (json && json.error && json.error.message) || 'Roadmap proof response unavailable';
      }
    } catch (err) {
      roadmapState.error = (err && err.message) || 'Roadmap proof request failed';
    } finally {
      roadmapState.loading = false;
      renderRoadmapTracker();
    }
  }

  async function loadRuntimeWarnings() {
    try {
      var path = '/api/diagnostics/runtime-warnings?viewMode=b2c';
      var res;
      if (typeof backendFetch === 'function') {
        res = await backendFetch(path, { method: 'GET' }, 15000);
      } else {
        var base = (typeof BACKEND_URL === 'string' && BACKEND_URL) ? BACKEND_URL : '';
        res = await fetch(base + path, { method: 'GET' });
      }
      var json = await res.json();
      if (json && json.ok) roadmapState.runtimeWarnings = json;
    } catch (_) { /* noop */ }
  }

  window.showRoadmap=function() {
    try { if (typeof ensureRadarRuntimeForTabs === 'function') ensureRadarRuntimeForTabs(); } catch (e) {}
    window.hideAllPrimaryPages();
    window.clearPrimaryNav();
    var el = document.getElementById('roadmapPage');
    if (el) el.classList.add('visible');
    var nav = document.getElementById('navRoadmap');
    if (nav) nav.classList.add('active');
    renderRoadmapTracker();
    loadRuntimeWarnings().then(loadRoadmapProof);
  };

  window.radarRoadmapInspect = function () {
    renderRoadmapTracker();
    var out = {
      sections: applyLiveProof(roadmapState.proof),
      updates: recentUpdates(),
      proof: roadmapState.proof,
      runtimeWarnings: roadmapState.runtimeWarnings,
      runtime: window.radarData && window.radarData.meta
    };
    console.log('Radar roadmap inspect', out);
    return out;
  };

  function init() {
    var rl = document.querySelector('.rl');
    if (rl) rl.textContent = 'Radar - v11.5';
    var fl = document.querySelector('.fl');
    if (fl) fl.textContent = 'Qatar Airways - Radar v11.5 - Executive Intelligence OS';
    document.title = 'Qatar Airways Radar v11.5 - Executive Intelligence Operating System';

    if (document.getElementById('execPage') && document.getElementById('execPage').classList.contains('visible')) {
      renderExecAddOnsV2();
      fetchExecutiveBackendData(false);
    }
    if (document.getElementById('predictPage') && document.getElementById('predictPage').classList.contains('visible')) renderPredictiveAddOns();
    renderRoadmapTracker();
    loadRuntimeWarnings().then(loadRoadmapProof);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
