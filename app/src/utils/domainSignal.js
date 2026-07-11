// Port of the domain/signal processing pipeline from scripts/radar-core.js —
// this determines what actually shows on the main Intelligence dashboard.
// Consolidated into one module; original functions are cited by name so this
// stays traceable back to source.

export const DEFAULT_DOMAINS = ['rev', 'dig', 'loy', 'prd', 'cmp', 'geo', 'agt', 'sml', 'soc', 'spt', 'sec', 'reg', 'ops', 'rep']
export const B2C_DOMAINS = ['dig', 'agt', 'loy', 'prd', 'rev', 'sml', 'cmp', 'spt', 'rep', 'reg', 'geo', 'ops', 'sec', 'soc']

export const DOM_LABELS = {
  rev: 'Revenue & pricing', dig: 'Digital & direct', loy: 'Loyalty', prd: 'Product',
  cmp: 'Competitors', geo: 'Geopolitical', agt: 'Agents & OTA', sml: 'Social media',
  soc: 'Social & unrest', spt: 'Sport & events', sec: 'Cyber & security', reg: 'Regulatory & visa',
  ops: 'Operations & tech', rep: 'Brand & reputation',
}

export function getDomainOrder(viewMode) {
  return viewMode === 'b2c' ? [...B2C_DOMAINS] : [...DEFAULT_DOMAINS]
}

// --- text/date helpers (radar-core.js:1231-1234, 1771-1822, 1885-1887) ---

export function signalText(s) {
  return [s?.title, s?.body, s?.whyItMattersNow, s?.impactLabel, s?.source].filter(Boolean).join(' ').toLowerCase()
}

function hasAny(text, words) {
  return words.some((w) => text.includes(w))
}

function parseSignalDate(value) {
  if (!value || typeof value !== 'string') return null
  const cleaned = value.trim()
  if (!cleaned || cleaned.toLowerCase() === 'unknown') return null
  const d = new Date(cleaned)
  return Number.isNaN(d.getTime()) ? null : d
}

function daysFromToday(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

function formatRadarDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function minutesBetweenDates(from, to) {
  if (!from) return null
  const a = new Date(from)
  const b = to ? new Date(to) : new Date()
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  return Math.max(0, Math.round((b - a) / 60000))
}

function humanAgeFromDate(value) {
  const mins = minutesBetweenDates(value)
  if (mins === null) return ''
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remM = mins % 60
  if (hrs < 24) return `${hrs}h${remM ? ` ${remM}m` : ''}`
  const days = Math.floor(hrs / 24)
  const remH = hrs % 24
  if (days < 60) return `${days}d${remH ? ` ${remH}h` : ''}`
  const months = Math.floor(days / 30)
  const remD = days % 30
  return `${months}mo${remD ? ` ${remD}d` : ''}`
}

/** Port of ensureSignalTimerFields (radar-core.js:1823-1842). */
function ensureSignalTimerFields(s) {
  s = s || {}
  const t = s.timer || {}
  s.sourceDate = s.sourceDate || t.sourceDate || s.publishedAt || s.createdAt || ''
  s.firstSeenAt = s.firstSeenAt || t.firstSeenAt || s.createdAt || s.sourceDate || ''
  s.lastSeenAt = s.lastSeenAt || t.lastSeenAt || s.updatedAt || s.firstSeenAt || ''
  s.lastVerifiedAt = s.lastVerifiedAt || t.lastVerifiedAt || s.verifiedAt || s.updatedAt || s.lastSeenAt || ''
  s.lastContentChangedAt = s.lastContentChangedAt || t.lastContentChangedAt || s.updatedAt || s.lastSeenAt || ''
  s.ageHuman = s.ageHuman || t.ageHuman || humanAgeFromDate(s.firstSeenAt)
  s.lastSeenHuman = s.lastSeenHuman || t.lastSeenHuman || humanAgeFromDate(s.lastSeenAt)
  s.lastVerifiedHuman = s.lastVerifiedHuman || t.lastVerifiedHuman || humanAgeFromDate(s.lastVerifiedAt)
  s.contentChangedHuman = s.contentChangedHuman || t.contentChangedHuman || humanAgeFromDate(s.lastContentChangedAt)
  if (!s.statusLabel && !t.statusLabel) {
    const firstSeenMinutes = minutesBetweenDates(s.firstSeenAt)
    s.statusLabel = s.isStale ? 'STALE' : firstSeenMinutes !== null && firstSeenMinutes <= 14 * 24 * 60 ? 'NEW' : s.firstSeenAt ? 'ACTIVE' : ''
  } else {
    s.statusLabel = s.statusLabel || t.statusLabel
  }
  return s
}

/** Port of signalDateSummary (radar-core.js:1844-1854) — feeds the SignalRow "freshness" line. */
export function signalDateSummary(s) {
  s = ensureSignalTimerFields(s || {})
  const parts = []
  if (s.sourceDate) parts.push(`Source ${formatRadarDate(s.sourceDate)}`)
  if (s.ageHuman) parts.push(`First seen ${s.ageHuman}`)
  if (s.lastSeenHuman) parts.push(`Last seen ${s.lastSeenHuman}`)
  if (s.contentChangedHuman) parts.push(`Updated ${s.contentChangedHuman}`)
  if (s.lastVerifiedHuman) parts.push(`Verified ${s.lastVerifiedHuman}`)
  if (s.statusLabel) parts.push(String(s.statusLabel).toUpperCase())
  return parts.filter(Boolean).join(' · ')
}

// --- classification (radar-core.js:1236-1316) ---

export function isRiskSignal(s) {
  return s?.dot === 'dr' || s?.impact === 'si-r' || /risk|pressure|threat|delay|outage|loss|strike|disrupt/.test(signalText(s))
}

export function isOpportunitySignal(s) {
  return s?.dot === 'dg' || s?.impact === 'si-g' || /opportunity|growth|demand|capture|launch|event|surge|uplift|win/.test(signalText(s))
}

export function getCommercialImpactScore(s) {
  const n = Number(s?.commercialImpactScore)
  if (Number.isFinite(n)) return Math.max(1, Math.min(10, Math.round(n)))
  const text = signalText(s)
  let score = 5
  if (isRiskSignal(s) || isOpportunitySignal(s)) score += 1
  if (/direct|booking|conversion|loyalty|ota|agent|app|web|ancillary|revenue|customer|ucp|personalisation|personalization/.test(text)) score += 2
  if (/immediate|today|now|active|ongoing|next_30_days|deadline|expires/.test(text)) score += 1
  if (/critical|high|surge|disruption|launch|visa|fare|capacity|campaign/.test(text)) score += 1
  if (/cyber|ransomware|data breach|payment fraud|account takeover|ddos|outage|passenger data|loyalty fraud/.test(text)) score += 2
  if (/verified|official|qatar airways|iata|icao|government|regulator/.test(text)) score += 1
  return Math.max(1, Math.min(10, score))
}

function getTimeToImpactWeight(s) {
  const t = String(s?.timeToImpact || s?.relevanceWindow || '').toLowerCase()
  if (t.includes('immediate') || t.includes('today')) return 4
  if (t.includes('30')) return 3
  if (t.includes('90')) return 2
  if (t.includes('180') || t.includes('6')) return 1
  return 1
}

function isCommerciallyRelevantSignal(signal, domId, viewMode) {
  const text = signalText(signal)
  const businessWords = ['revenue', 'demand', 'booking', 'direct', 'conversion', 'app', 'web', 'loyalty', 'member', 'customer', 'ota', 'agent', 'ancillary', 'fare', 'price', 'yield', 'route', 'capacity', 'market', 'campaign', 'personalisation', 'personalization', 'ucp', 'call centre', 'support', 'visa', 'regulation', 'event', 'competition', 'competitor', 'fuel', 'fx', 'airspace', 'disruption']
  const b2cWords = ['direct', 'booking', 'conversion', 'app', 'web', 'loyalty', 'member', 'customer', 'ota', 'agent', 'ancillary', 'campaign', 'personalisation', 'personalization', 'digital', 'mobile', 'call centre', 'self-service', 'support', 'crm', 'ucp', 'customer value', 'demand']
  const hasBusiness = hasAny(text, businessWords) || ['rev', 'dig', 'loy', 'prd', 'agt', 'cmp', 'spt'].includes(domId)
  const hasB2C = viewMode !== 'b2c' || hasAny(text, b2cWords) || ['dig', 'agt', 'loy', 'prd', 'rev', 'sml', 'rep'].includes(domId)
  return hasBusiness || hasB2C
}

export function sortSignalsForLeadership(signals) {
  return (signals || []).sort((a, b) => {
    const scoreDiff = getCommercialImpactScore(b) - getCommercialImpactScore(a)
    if (scoreDiff) return scoreDiff
    const timeDiff = getTimeToImpactWeight(b) - getTimeToImpactWeight(a)
    if (timeDiff) return timeDiff
    const riskDiff = (isRiskSignal(b) ? 1 : 0) - (isRiskSignal(a) ? 1 : 0)
    if (riskDiff) return riskDiff
    const verifyDiff = ((b.verified || b.sourceUrl) ? 1 : 0) - ((a.verified || a.sourceUrl) ? 1 : 0)
    if (verifyDiff) return verifyDiff
    return String(a.title || '').localeCompare(String(b.title || ''))
  })
}

export function isForwardSignal(s) {
  const w = String(s?.relevanceWindow || '').toLowerCase()
  if (['today', 'next_30_days', 'next_90_days', 'next_180_days'].includes(w)) return true
  const eventDate = parseSignalDate(s?.eventDate)
  if (eventDate) {
    const diff = daysFromToday(eventDate)
    return diff >= -14 && diff <= 180
  }
  return /today|current|ongoing|upcoming|future|forecast|expected|starts|launches|expires|deadline/.test(signalText(s))
}

export function isB2CSignal(row) {
  const b2cDomains = ['dig', 'agt', 'loy', 'prd', 'rev', 'sml', 'spt', 'rep']
  return b2cDomains.includes(row.domain) || /direct|booking|conversion|app|web|loyalty|member|customer|ota|agent|ancillary|campaign|personal/.test(signalText(row.signal))
}

/** Port of normaliseSignal (radar-core.js:1889-1941) — fills in defaults for a signal missing derived fields. */
function normaliseSignal(signal, viewMode) {
  const s = signal || {}
  ensureSignalTimerFields(s)
  const text = [s.title, s.body, s.whyItMattersNow, s.impactLabel].filter(Boolean).join(' ').toLowerCase()

  if (!s.relevanceWindow) {
    if (hasAny(text, ['today', 'now', 'currently', 'active', 'ongoing', 'continues', 'still'])) s.relevanceWindow = 'today'
    else if (hasAny(text, ['next month', '30 days', 'launches', 'starts', 'deadline', 'expires'])) s.relevanceWindow = 'next_30_days'
    else if (hasAny(text, ['quarter', 'q1', 'q2', 'q3', 'q4', 'forecast', 'expected'])) s.relevanceWindow = 'next_90_days'
    else s.relevanceWindow = 'next_180_days'
  }
  if (!s.whyItMattersNow) {
    s.whyItMattersNow = viewMode === 'b2c' ? 'May affect direct demand, conversion, loyalty or customer value.' : 'May affect revenue, demand, risk or business opportunity.'
  }
  if (!s.demandImpact) {
    if (/surge|growth|increase|opportunity|event|launch|opens|resumes/.test(text)) s.demandImpact = 'increase'
    else if (/risk|delay|restriction|strike|outage|disruption|pressure|loss/.test(text)) s.demandImpact = 'decrease'
    else if (/competitor|ota|agent|shift|share|emirates|etihad|turkish/.test(text)) s.demandImpact = 'shift'
    else s.demandImpact = 'unknown'
  }
  if (!s.timeToImpact) {
    const w = String(s.relevanceWindow || '').toLowerCase()
    s.timeToImpact = w === 'today' ? 'Immediate' : w === 'next_30_days' ? '30 days' : w === 'next_90_days' ? '90 days' : '6 months'
  }
  if (!s.confidence) s.confidence = s.verified && s.sourceUrl ? 'High' : s.source ? 'Medium' : 'Low'
  if (!s.captureStrategy) {
    if (viewMode === 'b2c') {
      s.captureStrategy = s.demandImpact === 'increase' ? 'Use direct campaigns and loyalty targeting to capture demand.'
        : s.demandImpact === 'shift' ? 'Protect direct share with app/web and member-led offers.'
          : s.demandImpact === 'decrease' ? 'Reduce conversion friction and protect high-value demand.'
            : 'Monitor for direct, loyalty and customer-value impact.'
    } else {
      s.captureStrategy = 'Review commercial action and monitor revenue exposure.'
    }
  }
  s.commercialImpactScore = getCommercialImpactScore(s)
  ensureSignalTimerFields(s)
  return s
}

/** Port of isUsefulCurrentOrFutureSignal (radar-core.js:1943-1986). */
function isUsefulCurrentOrFutureSignal(signal, viewMode) {
  const s = normaliseSignal(signal, viewMode)
  const allowedWindows = ['today', 'next_30_days', 'next_90_days', 'next_180_days']
  const text = [s.title, s.body, s.whyItMattersNow, s.source, s.impactLabel].filter(Boolean).join(' ').toLowerCase()

  const activeWords = ['today', 'now', 'current', 'currently', 'active', 'ongoing', 'still', 'continues', 'effective', 'upcoming', 'future', 'launches', 'starts', 'opens', 'returns', 'resumes', 'expires', 'deadline', 'forecast', 'expected', 'planned', 'scheduled', 'from', 'through', 'until', 'next', 'q1', 'q2', 'q3', 'q4', '2026', '2027', 'risk', 'opportunity', 'demand', 'booking', 'conversion', 'revenue', 'airline', 'passenger', 'travel', 'market', 'digital', 'mobile', 'payment', 'loyalty']
  const historicOnlyWords = ['last year', 'previously', 'historically', 'in 2023', 'in 2024', 'in 2025', 'was announced', 'had launched', 'was launched', 'was opened', 'was introduced', 'reported last year', 'former', 'past campaign', 'retrospective']

  const hasCurrentImpact = hasAny(text, activeWords)
  const looksHistoricOnly = hasAny(text, historicOnlyWords) && !hasCurrentImpact
  if (looksHistoricOnly && !isRiskSignal(s) && !isOpportunitySignal(s)) return false

  const eventDate = parseSignalDate(s.eventDate)
  if (eventDate) {
    const diff = daysFromToday(eventDate)
    if (diff < -14 && !hasCurrentImpact) return false
    if (diff >= -14 && diff <= 180) return true
  }

  const sourceDate = parseSignalDate(s.sourceDate)
  if (sourceDate) {
    const age = -daysFromToday(sourceDate)
    if (age > 180 && !hasCurrentImpact) return false
    if (age <= 120) return true
  }

  return allowedWindows.includes(s.relevanceWindow) || hasCurrentImpact
}

/** Port of normaliseBackendSignal (radar-core.js:1423-1465) — Supabase row -> view-model signal. */
export function normaliseBackendSignal(row) {
  row = row || {}
  const raw = row.raw_json || {}
  const timer = row.timer || raw.timer || raw.radarAudit || {}
  return {
    title: row.title || raw.title || '',
    body: row.body || raw.body || '',
    source: row.source || raw.source || 'Stored intelligence',
    sourceUrl: row.source_url || raw.sourceUrl || '',
    sourceDate: row.source_date || raw.sourceDate || '',
    eventDate: row.event_date || raw.eventDate || '',
    impactLabel: row.impact_label || raw.impactLabel || 'Stored signal',
    impact: row.impact_class || raw.impact || 'si-b',
    dot: row.dot_class || raw.dot || 'db',
    commercialImpactScore: Number(row.commercial_impact_score || raw.commercialImpactScore || 7),
    demandImpact: row.demand_impact || raw.demandImpact || '',
    timeToImpact: row.time_to_impact || raw.timeToImpact || '',
    relevanceWindow: row.relevance_window || raw.relevanceWindow || '',
    captureStrategy: row.capture_strategy || raw.captureStrategy || '',
    whyItMattersNow: row.why_it_matters_now || raw.whyItMattersNow || '',
    confidence: row.confidence || raw.confidence || '',
    verified: Boolean(row.verified || raw.verified),
    benchmark: Boolean(row.benchmark || raw.benchmark),
    statusLabel: timer.statusLabel || row.signal_status || '',
    ageHuman: timer.ageHuman || '',
    firstSeenAt: timer.firstSeenAt || row.first_seen_at || '',
    lastSeenAt: timer.lastSeenAt || row.last_seen_at || '',
    lastVerifiedAt: timer.lastVerifiedAt || row.last_verified_at || '',
    lastContentChangedAt: timer.lastContentChangedAt || row.last_content_changed_at || '',
    lastSeenHuman: timer.lastSeenHuman || '',
    lastVerifiedHuman: timer.lastVerifiedHuman || '',
    contentChangedHuman: timer.contentChangedHuman || '',
    cacheStatus: timer.freshnessStatus || '',
    isStale: Boolean(timer.isStale),
    dataHash: timer.dataHash || (row.signal_hash ? String(row.signal_hash).slice(0, 12).toUpperCase() : ''),
  }
}

export function extractSignalsFromAny(payload) {
  if (!payload) return []
  const ds = payload.data || payload
  const candidates = [payload.signals, ds.signals, payload.payload?.signals, payload.refresh?.signals, payload.items, ds.items]
  return candidates.find(Array.isArray) || []
}

/**
 * Port of postProcessDomainData (radar-core.js:1988-2042) — applies the
 * usefulness/relevance filters and leadership sort, with the "never lose
 * valid cache signals" fallback (marks items frontendReview instead of
 * hiding them when strict filters would empty the domain).
 */
export function postProcessDomainData(data, domId, viewMode) {
  const d = data || { id: domId, signals: [] }
  d.id = d.id || domId
  const rawSignals = Array.isArray(d.signals) ? d.signals : extractSignalsFromAny(d)
  const normalisedSignals = rawSignals.map((s) => normaliseSignal(s, viewMode))
  const usefulSignals = normalisedSignals.filter((s) => isUsefulCurrentOrFutureSignal(s, viewMode))
  const commercialSignals = usefulSignals.filter((s) => isCommerciallyRelevantSignal(s, domId, viewMode))

  let finalSignals = commercialSignals
  if (rawSignals.length && !finalSignals.length) {
    finalSignals = normalisedSignals.filter(Boolean).map((s) => ({
      ...s,
      frontendReview: true,
      relevanceWindow: s.relevanceWindow || 'next_180_days',
      impactLabel: s.impactLabel || 'Review signal',
      captureStrategy: s.captureStrategy || 'Review this cached signal before executive use.',
    }))
  }

  d.signals = sortSignalsForLeadership(finalSignals)
  d.signalCount = d.signals.length
  d.rawSignalCount = rawSignals.length

  if (d.signals.length) {
    const avgImpact = d.signals.reduce((sum, s) => sum + getCommercialImpactScore(s), 0) / d.signals.length
    d.score = Math.max(Number(d.score) || 70, Math.round(avgImpact * 10))
    if (avgImpact >= 8) { d.status = isRiskSignal(d.signals[0]) ? 'Critical' : 'High opportunity'; d.statusClass = isRiskSignal(d.signals[0]) ? 'spr' : 'spg2' }
    d.opp = d.opp || {}
    if (!d.opp.title) d.opp.title = d.signals[0].captureStrategy || d.signals[0].title || 'Top Radar opportunity'
    if (!d.opp.body) d.opp.body = d.signals[0].whyItMattersNow || d.signals[0].body || 'Backend/cache signal loaded.'
    if (!d.opp.value) d.opp.value = d.signals[0].ageHuman ? `Updated ${d.signals[0].ageHuman} ago` : 'Backend/cache-first'
    if (!Array.isArray(d.actions) || !d.actions.length) d.actions = d.signals.slice(0, 3).map((s) => s.captureStrategy || s.title).filter(Boolean)
  } else {
    d.status = 'No current signal'
    d.statusClass = 'spa'
    d.score = Math.min(Number(d.score) || 50, 55)
    d.opp = { eyebrow: 'No current signal', title: 'No active risk or opportunity found', body: 'No saved backend/cache signal was available for this domain.', value: 'Review later' }
    d.actions = ['Refresh later', 'Broaden search window', 'Check official sources']
  }
  return d
}

/** Port of domainResultFromBackend (radar-core.js:1467-1488). */
export function domainResultFromBackend(domainId, payload, viewMode) {
  payload = payload || {}
  const refresh = payload?.refresh || payload?.data?.refresh || {}
  const meta = payload?.meta || payload?.data?.meta || {}
  const signals = extractSignalsFromAny(payload).map(normaliseBackendSignal)
  const top = signals[0] || {}
  return postProcessDomainData({
    id: domainId,
    score: Number(refresh.score || meta.score || 0),
    status: refresh.status || (signals.length ? 'Cached' : 'No cached signal'),
    statusClass: signals.some((s) => isRiskSignal(s)) ? 'spr' : 'spg2',
    signals,
    metrics: Array.isArray(refresh.metrics) ? refresh.metrics : [],
    opp: {
      eyebrow: meta.cacheStatus ? `Cache - ${meta.cacheStatus}` : 'Stored intelligence',
      title: top.captureStrategy || top.title || 'Stored Radar intelligence',
      body: top.whyItMattersNow || top.body || 'Loaded from Supabase cache before refresh.',
      value: meta.cacheAgeHuman ? `Updated ${meta.cacheAgeHuman} ago` : 'Saved in backend',
    },
    actions: signals.slice(0, 3).map((s) => s.captureStrategy || s.title).filter(Boolean),
  }, domainId, viewMode)
}

// --- domain ordering (radar-core.js:1093-1158) ---

function getDomainBaseIndex(id, viewMode) {
  const source = viewMode === 'b2c' ? B2C_DOMAINS : DEFAULT_DOMAINS
  const idx = source.indexOf(id)
  return idx >= 0 ? idx : 999
}

function getDomainStrategicBoost(id, signals, viewMode) {
  const joined = (signals || []).map(signalText).join(' ')
  let boost = 0
  if (id === 'sec') {
    if (/(cyber|ransomware|data breach|payment fraud|account takeover|ddos|outage|identity|airport systems|passenger data|loyalty fraud|phishing)/.test(joined)) boost += 18
    if (/(critical|immediate|today|active|ongoing|threat|attack|breach|outage|disruption)/.test(joined)) boost += 18
  }
  if (viewMode === 'b2c') {
    if (['dig', 'agt', 'loy', 'prd', 'rev'].includes(id)) boost += 10
    if (['cmp', 'spt', 'sml', 'rep'].includes(id)) boost += 6
  } else if (['rev', 'geo', 'ops', 'sec', 'reg'].includes(id)) {
    boost += 7
  }
  return boost
}

/** Port of getDomainPriorityScore (radar-core.js:1135-1158) — drives tile reordering. */
export function getDomainPriorityScore(id, domainData, viewMode) {
  const d = domainData
  if (!d || !Array.isArray(d.signals)) return -1000 - getDomainBaseIndex(id, viewMode)
  const signals = d.signals
  const signalCount = signals.length
  const scores = signals.map(getCommercialImpactScore)
  const avgImpact = signalCount ? scores.reduce((sum, n) => sum + n, 0) / signalCount : 0
  const maxImpact = signalCount ? Math.max(...scores) : 0
  const riskCount = signals.filter(isRiskSignal).length
  const oppCount = signals.filter(isOpportunitySignal).length
  const forwardCount = signals.filter(isForwardSignal).length
  const immediateCount = signals.filter((s) => getTimeToImpactWeight(s) >= 3).length
  const verifiedCount = signals.filter((s) => s.verified || s.sourceUrl).length
  const strategicBoost = getDomainStrategicBoost(id, signals, viewMode)
  const b2cBoost = viewMode === 'b2c' ? signals.filter((s) => /direct|booking|conversion|app|web|loyalty|member|customer|ota|agent|ancillary|campaign|personal|ucp/.test(signalText(s))).length * 5 : 0
  return maxImpact * 22 + avgImpact * 8 + riskCount * 13 + oppCount * 8 + forwardCount * 5 + immediateCount * 7 + verifiedCount * 3 + signalCount * 2 + b2cBoost + strategicBoost + (Number(d.score) || 0) / 12
}

export function allLoadedSignals(domData, domains) {
  const rows = []
  domains.forEach((id) => {
    const d = domData[id]
    if (!d || !Array.isArray(d.signals)) return
    d.signals.forEach((s) => rows.push({ domain: id, signal: s, domainData: d }))
  })
  return rows
}

export function parseOpportunityValue(value) {
  if (!value || typeof value !== 'string') return 0
  const txt = value.toLowerCase().replace(/,/g, '').trim()
  const match = txt.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/)
  if (!match) return 0
  let amount = Number(match[1])
  if (Number.isNaN(amount)) return 0
  if (txt.includes('bn') || txt.includes('billion')) amount *= 1000000000
  else if (txt.includes('m') || txt.includes('million')) amount *= 1000000
  else if (txt.includes('k') || txt.includes('thousand')) amount *= 1000
  return amount
}
