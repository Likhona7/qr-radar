// Port of the shared signal/lane/scoring helpers from
// scripts/executive-os-roadmap.js (lines 32-137, 353-462, 703-712), used by
// both Executive Summary's live panels. Dead V1 code (renderSummaryCards,
// renderTopSignalsPanel, queueFromSignals — never called, superseded by the
// "V2" siblings) is intentionally not ported.

export function titleOf(s) { return s.title || s.headline || s.name || 'Backend/cache signal' }
export function bodyOf(s) { return s.captureStrategy || s.whyItMattersNow || s.body || s.summary || s.detail || 'No additional backend/cache detail available.' }
export function domainOf(s) { return (s.domain || s.source || 'Radar').toString().toUpperCase() }

function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Port of normalizeRankingSignal (executive-os-roadmap.js:74-91). */
export function normalizeRankingSignal(s) {
  if (!s) return null
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
    sourceDate: s.source_date || s.sourceDate || null,
  }
}

export function signalScore(s) {
  return Math.max(toNum(s.aiRankScore || s.ai_rank_score), toNum(s.rankScore || s.rank_score))
}

export function scoreBucket(score) {
  if (score >= 90) return { label: 'SEVERE', cls: 'sev-severe' }
  if (score >= 75) return { label: 'HIGH', cls: 'sev-high' }
  if (score >= 58) return { label: 'MEDIUM', cls: 'sev-medium' }
  return { label: 'WATCH', cls: 'sev-watch' }
}

export function timeAgoLabel(s) {
  const ts = Date.parse(s.createdAt || s.firstSeenAt || s.sourceDate || '') || 0
  if (!ts) return 'Now'
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function inferOwner(s) {
  const txt = `${titleOf(s)} ${bodyOf(s)}`.toLowerCase()
  if (/cyber|fraud|security|breach/.test(txt)) return 'CISO Office'
  if (/ota|marketing|campaign|sem|conversion|direct/.test(txt)) return 'Digital Marketing'
  if (/app|product|ux|booking|payment/.test(txt)) return 'Product'
  if (/loyalty|privilege|avios|tier/.test(txt)) return 'Loyalty'
  return 'Revenue Strategy'
}

export function fmtDateAdd(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

export function impactRangeFromScore(score) {
  const low = Math.max(0.6, (score / 100) * 1.2)
  const high = low * 1.28
  return `$${low.toFixed(1)}M-$${high.toFixed(1)}M`
}

export function actionTitleFromSignal(s, idx) {
  const txt = `${titleOf(s)} ${bodyOf(s)}`.toLowerCase()
  if (/ota|direct share|leak/.test(txt)) return 'Protect direct share'
  if (/opportun|growth|demand|premium|capture/.test(txt)) return 'Convert opportunity'
  if (/friction|app|service|complaint|delay|refund/.test(txt)) return 'Reduce friction'
  return ['Protect direct share', 'Convert opportunity', 'Reduce friction'][idx] || 'Launch action'
}

export function actionEvidenceCount(s) {
  if (!s) return 0
  let count = 0
  ;['sourceUrl', 'source_url', 'url', 'source', 'sourceDate', 'source_date', 'firstSeenAt', 'first_seen_at', 'createdAt', 'created_at'].forEach((key) => {
    if (s[key]) count += 1
  })
  if (s.verified) count += 1
  if (s.confidence || s.confidenceLabel) count += 1
  if (Array.isArray(s.evidenceIds)) count += s.evidenceIds.length
  return Math.max(1, Math.min(9, count))
}

export function actionDecisionStatus(score) {
  if (score >= 90) return { label: 'Act now', cls: 'act-now' }
  if (score >= 70) return { label: 'Assign this week', cls: 'assign-week' }
  return { label: 'Monitor with owner', cls: 'monitor-owner' }
}

export function actionOutcomeStatus(s) {
  const txt = String(s?.outcomeStatus || s?.outcome_status || s?.status || '').toLowerCase()
  if (/done|complete|resolved|improved/.test(txt)) return 'Outcome recorded'
  if (/progress|review|assigned/.test(txt)) return 'In progress'
  return 'Outcome not recorded'
}

export function actionBriefText(a) {
  const evidence = actionEvidenceCount(a.signal)
  return [
    `Action: ${a.title || 'Recommended action'}`,
    '',
    'Why this matters:',
    a.body || 'No additional backend/cache detail available.',
    '',
    `Owner role: ${a.owner || 'Owner TBC'}`,
    `Due: ${a.due || 'Due TBC'}`,
    `Expected impact: ${a.impact || 'Impact TBC'}`,
    `Evidence loaded: ${evidence} supporting signal field${evidence === 1 ? '' : 's'}`,
    `Outcome status: ${actionOutcomeStatus(a.signal)}`,
    '',
    'Next step:',
    'Assign a named business owner, confirm the evidence, execute the action, then record the outcome so Radar can learn whether the signal improved, stayed stable, or worsened.',
  ].join('\n')
}

/** Port of queueFromSignalsV2 (executive-os-roadmap.js:774-790). */
export function queueFromSignals(sigs) {
  return sigs.slice(0, 3).map((s, i) => {
    const score = signalScore(s)
    return {
      title: actionTitleFromSignal(s, i),
      body: bodyOf(s),
      tag: domainOf(s),
      owner: inferOwner(s),
      due: score >= 90 ? fmtDateAdd(7) : score >= 70 ? fmtDateAdd(14) : fmtDateAdd(21),
      impact: impactRangeFromScore(score),
      status: actionDecisionStatus(score),
      evidenceCount: actionEvidenceCount(s),
      outcomeStatus: actionOutcomeStatus(s),
      signal: s,
    }
  })
}

/** Port of computeOpportunityRangeFromSignals (executive-os-roadmap.js:392-403). */
export function computeOpportunityRangeFromSignals(sigs) {
  const opp = sigs.filter((s) => /opportun|growth|capture|upsell|premium|ancillary|direct|conversion/i.test(`${titleOf(s)} ${bodyOf(s)}`.toLowerCase()))
  const scoreSum = opp.reduce((a, s) => a + Math.max(0, signalScore(s)), 0)
  const low = Math.max(0.8, Number(((scoreSum / 100) * 0.65).toFixed(1)))
  const high = Number((low * 1.45).toFixed(1))
  return { label: `$${low.toFixed(1)}M-$${high.toFixed(1)}M`, sub: '12-18 month modeled upside' }
}

// --- Opportunity lane heatmap (executive-os-roadmap.js:92-172, 301-351) ---

function laneFromText(txt) {
  const t = String(txt || '').toLowerCase()
  if (/direct|ota|booking|conversion|agent/.test(t)) return 'Direct'
  if (/premium|business|luxury|qsuite|vip/.test(t)) return 'Premium'
  if (/ancillary|baggage|seat|lounge|bundle|upsell|fast track/.test(t)) return 'Ancillary'
  if (/loyalty|avios|privilege|tier|member/.test(t)) return 'Loyalty'
  return null
}

function horizonBucket(v) {
  const t = String(v || '').toLowerCase()
  const n = toNum(v)
  if (n > 0) {
    if (n <= 30) return 0
    if (n <= 90) return 1
    return 2
  }
  if (/0-30|immediate|near|this month/.test(t)) return 0
  if (/31-90|quarter|next 3/.test(t)) return 1
  if (/91-180|6 month|180/.test(t)) return 2
  return 1
}

function moneyToMillions(v) {
  if (Number.isFinite(v)) return v
  const s = String(v || '').replace(/,/g, '').trim()
  if (!s) return 0
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return 0
  const n = Number(m[0])
  if (/bn|billion/i.test(s)) return n * 1000
  if (/m|million/i.test(s)) return n
  if (/k|thousand/i.test(s)) return n / 1000
  return n / 1000000
}

function valueFromSimulationItem(item) {
  let low = moneyToMillions(item.revenueLow || item.revenue_low || item.low || item.opportunityLow || item.valueLow || item.value_low)
  let high = moneyToMillions(item.revenueHigh || item.revenue_high || item.high || item.opportunityHigh || item.valueHigh || item.value_high)
  const single = moneyToMillions(item.revenue || item.value || item.amount || item.impact || item.opportunity || item.estimatedValue)
  if (!low && !high && single) { low = single * 0.9; high = single * 1.1 }
  if (low && !high) high = low * 1.2
  if (high && !low) low = high * 0.8
  return { low, high }
}

function extractArrayCandidates(obj) {
  if (!obj) return []
  const ds = obj.data || obj
  const candidates = [ds.signals, ds.topSignals, ds.topMovements, ds.predictions, ds.simulations, ds.scenarios, ds.opportunities, ds.items]
  return candidates.find(Array.isArray) || []
}

/** Port of simulationRowsFromPayload (executive-os-roadmap.js:138-172). */
export function simulationRowsFromPayload(payload, fallbackSignals) {
  const rows = { Direct: [0, 0, 0], Premium: [0, 0, 0], Ancillary: [0, 0, 0], Loyalty: [0, 0, 0] }
  extractArrayCandidates(payload).forEach((it) => {
    const text = [it.lane, it.category, it.domainId, it.domain, it.title, it.forecast, it.summary].join(' ')
    const lane = laneFromText(text)
    if (!lane) return
    const bucket = horizonBucket(it.horizonDays || it.horizon || it.window || it.timeHorizon || it.time_to_impact || it.timeToImpact)
    const val = valueFromSimulationItem(it)
    const add = val.low || val.high ? (val.low + val.high) / 2 : 0
    if (add > 0) rows[lane][bucket] += add
  })
  const out = Object.keys(rows).map((k) => ({ name: k, windows: rows[k].map((v) => Number(v.toFixed(1))) }))
  const hasAny = out.some((r) => r.windows[0] + r.windows[1] + r.windows[2] > 0)
  if (hasAny) return out

  const oppSignals = (fallbackSignals || []).filter((s) => /opportun|revenue|growth|upsell|ancillary|direct|capture|increase|loyalty|premium|conversion/i.test(`${titleOf(s)} ${bodyOf(s)}`.toLowerCase()))
  return ['Direct', 'Premium', 'Ancillary', 'Loyalty'].map((lane, idx) => {
    const c = oppSignals.filter((s) => laneFromText(`${titleOf(s)} ${bodyOf(s)}`) === lane).length
    const base = Math.max(0.12, c * 0.2 + 0.12 * (idx + 1))
    return { name: lane, windows: [Number((base * 0.45).toFixed(1)), Number((base * 1.05).toFixed(1)), Number((base * 1.45).toFixed(1))] }
  })
}

/** Port of computeOpportunityRangeForCards (executive-os-roadmap.js:703-712). */
export function computeOpportunityRangeForCards(sigs, simulationPayload) {
  const rows = simulationRowsFromPayload(simulationPayload, sigs)
  const total = rows.reduce((acc, r) => acc + (r.windows[0] || 0) + (r.windows[1] || 0) + (r.windows[2] || 0), 0)
  if (total > 0) {
    const hi = total * 1.33
    return { label: `$${total.toFixed(1)}M-$${hi.toFixed(1)}M`, sub: '12-18 month total upside' }
  }
  return computeOpportunityRangeFromSignals(sigs)
}

export function laneOwner(name) {
  const n = String(name || '').toLowerCase()
  if (/direct/.test(n)) return 'Digital Marketing'
  if (/premium/.test(n)) return 'Revenue + Loyalty'
  if (/ancillary/.test(n)) return 'Product'
  if (/loyalty/.test(n)) return 'Privilege Club'
  return 'Revenue Strategy'
}

export function laneAction(name) {
  const n = String(name || '').toLowerCase()
  if (/direct/.test(n)) return 'Protect direct share with route offers, SEM, and loyalty nudges.'
  if (/premium/.test(n)) return 'Package premium demand with lounge, Qsuite, stopover, and upgrade messaging.'
  if (/ancillary/.test(n)) return 'Bundle seats, bags, lounge, and fast-track where purchase intent is highest.'
  if (/loyalty/.test(n)) return 'Convert the demand into Avios earn, tier progress, and member-only offers.'
  return 'Create an owner-ready commercial playbook for this lane.'
}

export function laneStatus(total) {
  if (total >= 4) return { label: 'Priority', cls: 'priority' }
  if (total >= 1.5) return { label: 'Build', cls: 'build' }
  return { label: 'Monitor', cls: 'monitor' }
}

export function fmtMoney(v) {
  return `$${Number(v || 0).toFixed(1)}M`
}
