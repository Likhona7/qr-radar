/* Radar Team Actions - signal to owner to outcome workspace. */
(function () {
  var STORE_KEY = 'qr_radar_team_actions_v1';
  var state = {
    selectedId: null,
    filter: 'all'
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveStore(store) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store || {})); } catch (e) {}
  }

  function titleOf(s) {
    return s && (s.title || s.headline || s.name) || 'Backend/cache signal';
  }

  function bodyOf(s) {
    return s && (s.captureStrategy || s.whyItMattersNow || s.body || s.summary || s.detail) || 'No additional backend/cache detail available.';
  }

  function domainOf(s) {
    return String((s && (s.domain || s.domainId || s.domain_id || s.source)) || 'radar').toUpperCase();
  }

  function scoreOf(s) {
    try {
      if (typeof scoreSignalForExec === 'function') return Number(scoreSignalForExec(s)) || 0;
    } catch (e) {}
    return Number((s && (s.ai_rank_score || s.aiRankScore || s.score || s.commercialImpactScore)) || 0) || 0;
  }

  function dateMetaOf(s) {
    try {
      return typeof renderSignalDateMeta === 'function' ? renderSignalDateMeta(s || {}) : '';
    } catch (e) {
      return '';
    }
  }

  function allSignalsForActions() {
    try {
      if (typeof ensureRadarRuntimeForTabs === 'function') ensureRadarRuntimeForTabs();
      if (typeof getAllDomainSignals === 'function') {
        return (getAllDomainSignals() || []).filter(Boolean);
      }
    } catch (e) {}
    return [];
  }

  function hashId(text) {
    var h = 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i += 1) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return 'ta_' + Math.abs(h);
  }

  function evidenceCount(s) {
    var n = 0;
    ['sourceUrl', 'source', 'sourceDate', 'createdAt', 'firstSeenAt', 'confidence', 'verified', 'aiRankScore', 'impactLabel', 'demandImpact', 'captureStrategy', 'whyItMattersNow'].forEach(function (k) {
      if (s && s[k] != null && s[k] !== '') n += 1;
    });
    if (s && Array.isArray(s.sources)) n += s.sources.length;
    if (s && Array.isArray(s.evidence)) n += s.evidence.length;
    return Math.max(1, n);
  }

  function ownerFor(s) {
    var txt = (titleOf(s) + ' ' + bodyOf(s) + ' ' + domainOf(s)).toLowerCase();
    if (/app|web|digital|ux|booking|mobile|boarding/.test(txt)) return 'Digital Product';
    if (/ota|search|sem|campaign|brand|paid|conversion|direct/.test(txt)) return 'Digital Marketing';
    if (/loyal|privilege|avios|member|tier|retention/.test(txt)) return 'Loyalty & CRM';
    if (/route|demand|capacity|pricing|fare|revenue|fifa|world cup/.test(txt)) return 'Revenue Management';
    if (/disrupt|delay|airport|service|baggage|misconnect|operation/.test(txt)) return 'Operations';
    if (/competitor|emirates|turkish|etihad|singapore|air india/.test(txt)) return 'Strategy';
    return 'Digital/B2C Owner';
  }

  function actionTitle(s, idx) {
    var txt = (titleOf(s) + ' ' + bodyOf(s)).toLowerCase();
    if (/ota|direct|conversion|booking/.test(txt)) return 'Protect direct share';
    if (/app|web|ux|friction|boarding/.test(txt)) return 'Reduce digital friction';
    if (/loyal|member|avios|tier/.test(txt)) return 'Activate loyalty recovery';
    if (/route|demand|fifa|capacity|fare|pricing/.test(txt)) return 'Capture demand window';
    if (/competitor|launch|fleet|network/.test(txt)) return 'Counter competitor move';
    return ['Convert opportunity', 'Reduce risk', 'Launch response'][idx % 3];
  }

  function actionStatus(score) {
    if (score >= 75) return { label: 'Act now', cls: 'urgent' };
    if (score >= 55) return { label: 'This week', cls: 'week' };
    return { label: 'Monitor', cls: 'monitor' };
  }

  function impactRange(score) {
    if (score >= 90) return '$1.2M-$1.8M';
    if (score >= 70) return '$0.7M-$1.2M';
    if (score >= 50) return '$0.3M-$0.7M';
    return 'Value TBC';
  }

  function dueDate(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function deriveActions() {
    var store = loadStore();
    var signals = allSignalsForActions()
      .slice()
      .sort(function (a, b) { return scoreOf(b) - scoreOf(a); })
      .slice(0, 12);
    return signals.map(function (s, idx) {
      var score = scoreOf(s);
      var id = hashId([domainOf(s), titleOf(s), idx].join('|'));
      var saved = store[id] || {};
      var status = saved.status || (score >= 75 ? 'open' : 'monitor');
      var due = saved.due || dueDate(score >= 75 ? 7 : score >= 55 ? 14 : 21);
      return {
        id: id,
        rank: idx + 1,
        signal: s,
        title: actionTitle(s, idx),
        body: bodyOf(s),
        signalTitle: titleOf(s),
        domain: domainOf(s),
        score: score,
        status: status,
        decision: actionStatus(score),
        owner: saved.owner || ownerFor(s),
        due: due,
        impact: impactRange(score),
        evidenceCount: evidenceCount(s),
        outcome: saved.outcome || '',
        comments: Array.isArray(saved.comments) ? saved.comments : []
      };
    });
  }

  function actionStateLabel(status) {
    return { open: 'Open', progress: 'In progress', review: 'Review', done: 'Done', monitor: 'Monitor' }[status] || 'Open';
  }

  function statusClass(status) {
    return { open: 'open', progress: 'progress', review: 'review', done: 'done', monitor: 'monitor' }[status] || 'open';
  }

  function filteredActions(actions) {
    var q = String((document.getElementById('taSearch') || {}).value || '').toLowerCase().trim();
    return actions.filter(function (a) {
      var hay = [a.title, a.signalTitle, a.owner, a.domain, a.body].join(' ').toLowerCase();
      if (q && hay.indexOf(q) === -1) return false;
      if (state.filter === 'urgent') return a.decision.cls === 'urgent';
      if (state.filter === 'open') return a.status !== 'done';
      if (state.filter === 'done') return a.status === 'done';
      return true;
    });
  }

  function saveActionPatch(id, patch) {
    var store = loadStore();
    store[id] = Object.assign({}, store[id] || {}, patch || {});
    saveStore(store);
  }

  function updateBadge(actions) {
    var badge = document.getElementById('teamActionsBadge');
    if (!badge) return;
    var open = actions.filter(function (a) { return a.status !== 'done'; }).length;
    badge.textContent = open + ' open';
  }

  function renderSummary(actions) {
    var el = document.getElementById('taSummary');
    if (!el) return;
    if (!actions.length) {
      el.innerHTML = '<div class="ta-empty">Load or refresh Radar signals first. Team Actions will then create owner-ready work from the highest-priority signals.</div>';
      return;
    }
    var open = actions.filter(function (a) { return a.status !== 'done'; }).length;
    var urgent = actions.filter(function (a) { return a.decision.cls === 'urgent'; }).length;
    var outcomes = actions.filter(function (a) { return a.outcome || a.status === 'done'; }).length;
    var evidence = actions.reduce(function (sum, a) { return sum + a.evidenceCount; }, 0);
    el.innerHTML = [
      ['Owner-ready actions', actions.length, 'Signals converted into accountable work'],
      ['Open actions', open, 'Needs owner follow-through'],
      ['Urgent this week', urgent, 'Requires leadership attention'],
      ['Outcomes recorded', outcomes, 'Closed-loop proof'],
      ['Evidence points', evidence, 'Source-backed context']
    ].map(function (m) {
      return '<div class="ta-summary-card"><div class="ta-summary-value">' + esc(m[1]) + '</div><div class="ta-summary-label">' + esc(m[0]) + '</div><div class="ta-summary-copy">' + esc(m[2]) + '</div></div>';
    }).join('');
  }

  function renderQueue(actions) {
    var list = document.getElementById('taActionList');
    var count = document.getElementById('taQueueCount');
    if (!list) return;
    var rows = filteredActions(actions);
    if (count) count.textContent = rows.length + ' action' + (rows.length === 1 ? '' : 's') + ' visible';
    if (!rows.length) {
      list.innerHTML = '<div class="ta-empty">No actions match this view.</div>';
      return;
    }
    if (!state.selectedId || !actions.some(function (a) { return a.id === state.selectedId; })) state.selectedId = rows[0].id;
    list.innerHTML = rows.map(function (a) {
      var active = a.id === state.selectedId ? ' active' : '';
      return '<button type="button" class="ta-action-item' + active + '" onclick="selectTeamAction(\'' + esc(a.id) + '\')">' +
        '<span class="ta-action-rank">' + a.rank + '</span>' +
        '<span class="ta-action-copy"><strong>' + esc(a.title) + '</strong><em>' + esc(a.signalTitle) + '</em><small>' + esc(a.owner) + ' · Due ' + esc(a.due) + '</small>' + dateMetaOf(a.signal) + '</span>' +
        '<span class="ta-chip ta-chip-' + statusClass(a.status) + '">' + esc(actionStateLabel(a.status)) + '</span>' +
      '</button>';
    }).join('');
  }

  function renderDetail(actions) {
    var a = actions.find(function (x) { return x.id === state.selectedId; });
    var head = document.getElementById('taDetailHead');
    var body = document.getElementById('taDetailBody');
    var commentBox = document.getElementById('taCommentBox');
    if (!head || !body) return;
    if (!a) {
      head.innerHTML = '<div class="ta-empty">Select an action from the queue.</div>';
      body.innerHTML = '';
      if (commentBox) commentBox.hidden = true;
      return;
    }
    if (commentBox) commentBox.hidden = false;
    head.innerHTML =
      '<div><div class="ta-detail-eyebrow">' + esc(a.domain) + ' · ' + esc(a.decision.label) + '</div>' +
      '<h2>' + esc(a.title) + '</h2><p>' + esc(a.signalTitle) + '</p></div>' +
      '<div class="ta-detail-score"><strong>' + esc(Math.round(a.score)) + '</strong><span>priority score</span></div>';
    body.innerHTML =
      '<div class="ta-brief-grid">' +
        '<div><label>Owner</label><select onchange="updateTeamAction(\'' + esc(a.id) + '\', { owner: this.value })">' + ownerOptions(a.owner) + '</select></div>' +
        '<div><label>Status</label><select onchange="updateTeamAction(\'' + esc(a.id) + '\', { status: this.value })">' + statusOptions(a.status) + '</select></div>' +
        '<div><label>Due date</label><input type="date" value="' + esc(a.due) + '" onchange="updateTeamAction(\'' + esc(a.id) + '\', { due: this.value })"></div>' +
        '<div><label>Expected impact</label><strong>' + esc(a.impact) + '</strong></div>' +
      '</div>' +
      '<div class="ta-evidence-box"><div><strong>Why this matters</strong><p>' + esc(a.body) + '</p>' + dateMetaOf(a.signal) + '</div><div class="ta-evidence-count">' + esc(a.evidenceCount) + '<span>evidence points</span></div></div>' +
      '<div class="ta-next-step"><strong>Next step</strong><span>Confirm evidence, execute the owner action, then record whether the signal improved, stayed stable, or worsened.</span><button type="button" class="ta-primary-btn" onclick="recordTeamActionOutcome(\'' + esc(a.id) + '\')">Record outcome</button></div>' +
      '<div class="ta-thread"><div class="ta-thread-title">Action notes</div>' + renderComments(a) + '</div>';
  }

  function ownerOptions(selected) {
    var owners = ['Digital Product', 'Digital Marketing', 'Revenue Management', 'Loyalty & CRM', 'Operations', 'Strategy', 'Digital/B2C Owner'];
    return owners.map(function (o) { return '<option value="' + esc(o) + '"' + (o === selected ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('');
  }

  function statusOptions(selected) {
    var opts = [
      ['open', 'Open'],
      ['progress', 'In progress'],
      ['review', 'Review'],
      ['monitor', 'Monitor'],
      ['done', 'Done']
    ];
    return opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === selected ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
  }

  function renderComments(a) {
    var rows = (a.comments || []).slice(-5);
    var outcome = a.outcome ? '<div class="ta-note ta-note-outcome"><strong>Outcome</strong><span>' + esc(a.outcome) + '</span></div>' : '';
    if (!rows.length && !outcome) return '<div class="ta-empty small">No notes yet. Add one below when the owner has an update.</div>';
    return outcome + rows.map(function (c) {
      return '<div class="ta-note"><strong>' + esc(c.author || 'Radar user') + ' · ' + esc(c.when || 'now') + '</strong><span>' + esc(c.text) + '</span></div>';
    }).join('');
  }

  function renderLeadership(actions) {
    var el = document.getElementById('taLeadership');
    if (!el) return;
    if (!actions.length) {
      el.innerHTML = '<div class="ta-empty">No action ownership yet.</div>';
      return;
    }
    var owners = {};
    actions.forEach(function (a) {
      if (!owners[a.owner]) owners[a.owner] = [];
      owners[a.owner].push(a);
    });
    var ownerHtml = Object.keys(owners).sort().map(function (owner) {
      var rows = owners[owner];
      var open = rows.filter(function (a) { return a.status !== 'done'; }).length;
      return '<div class="ta-owner-row"><div class="ta-owner-avatar">' + esc(owner.split(/\s|&/).filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2)) + '</div>' +
        '<div><strong>' + esc(owner) + '</strong><span>' + open + ' open · ' + rows.length + ' total</span>' +
        rows.slice(0, 2).map(function (a) { return '<button type="button" onclick="selectTeamAction(\'' + esc(a.id) + '\')">' + esc(a.title) + '</button>'; }).join('') +
        '</div></div>';
    }).join('');
    var blockers = actions.filter(function (a) {
      return (a.comments || []).some(function (c) { return /block|stuck|delay|risk/i.test(c.text || ''); });
    }).length;
    el.innerHTML = ownerHtml + '<div class="ta-leadership-metrics"><div><strong>' + blockers + '</strong><span>blocker notes</span></div><div><strong>' + actions.filter(function (a) { return a.status === 'review'; }).length + '</strong><span>in review</span></div></div>';
  }

  window.renderTeamActionsPage = function () {
    var actions = deriveActions();
    updateBadge(actions);
    renderSummary(actions);
    renderQueue(actions);
    renderDetail(actions);
    renderLeadership(actions);
    var fresh = document.getElementById('taFreshness');
    if (fresh) fresh.textContent = actions.length ? actions.length + ' actions from loaded Radar signals' : 'Load Radar signals to populate';
  };

  window.refreshTeamActions = function () {
    try { if (typeof ensureRadarRuntimeForTabs === 'function') ensureRadarRuntimeForTabs(); } catch (e) {}
    window.renderTeamActionsPage();
  };

  window.selectTeamAction = function (id) {
    state.selectedId = id;
    window.renderTeamActionsPage();
  };

  window.updateTeamAction = function (id, patch) {
    saveActionPatch(id, patch || {});
    window.renderTeamActionsPage();
  };

  window.addTeamActionQuickNote = function (text) {
    var input = document.getElementById('taCommentInput');
    if (!input) return;
    input.value = text || '';
    input.focus();
  };

  window.addTeamActionComment = function () {
    if (!state.selectedId) return;
    var input = document.getElementById('taCommentInput');
    var text = String((input && input.value) || '').trim();
    if (!text) return;
    var store = loadStore();
    var saved = store[state.selectedId] || {};
    var comments = Array.isArray(saved.comments) ? saved.comments : [];
    comments.push({ author: 'You', when: 'now', text: text });
    saved.comments = comments;
    store[state.selectedId] = saved;
    saveStore(store);
    if (input) input.value = '';
    window.renderTeamActionsPage();
  };

  window.recordTeamActionOutcome = function (id) {
    var text = prompt('What outcome happened after this action?');
    if (!text || !text.trim()) return;
    saveActionPatch(id, { outcome: text.trim(), status: 'done' });
    window.renderTeamActionsPage();
  };

  window.showTeamActions = function () {
    try { if (typeof ensureRadarRuntimeForTabs === 'function') ensureRadarRuntimeForTabs(); } catch (e) {}
    if (typeof hideAllPrimaryPages === 'function') hideAllPrimaryPages();
    if (typeof clearPrimaryNav === 'function') clearPrimaryNav();
    var page = document.getElementById('teamActionsPage');
    if (page) page.classList.add('visible');
    var nav = document.getElementById('navTeamActions');
    if (nav) nav.classList.add('active');
    window.renderTeamActionsPage();
  };

  document.addEventListener('click', function (event) {
    var btn = event.target && event.target.closest ? event.target.closest('.ta-filter') : null;
    if (!btn) return;
    state.filter = btn.getAttribute('data-ta-filter') || 'all';
    Array.prototype.forEach.call(document.querySelectorAll('.ta-filter'), function (x) { x.classList.remove('active'); });
    btn.classList.add('active');
    window.renderTeamActionsPage();
  });
})();
