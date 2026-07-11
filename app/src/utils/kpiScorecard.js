// Port of updateExecutiveScorecard (radar-core.js:1365-1395) and the v9.1
// override of updateKpiTooltips (radar-core.js:6262-6310, which supersedes
// the original 2905-3008 version — confirmed during exploration this is
// the one actually wired up) — computes the 5 KPI strip values and their
// hover-tooltip breakdowns.

import {
  allLoadedSignals, isForwardSignal, isRiskSignal, isOpportunitySignal, isB2CSignal,
  getCommercialImpactScore, signalText, parseOpportunityValue,
} from './domainSignal'
import { DOM_LABELS_SHORT } from './domainMeta'

function formatMoney(amount) {
  if (!amount || amount <= 0) return 'TBD'
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(amount >= 10000000000 ? 0 : 1)}B`
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`
  return `$${Math.round(amount)}`
}

function normaliseOpportunityValue(amount, opportunityCount) {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return 0
  if (n > 0 && n < 1000 && opportunityCount > 0) return n * 1000000
  return n
}

/** Port of updateExecutiveScorecard's 5-KPI computation. */
export function computeKpis(domData, domains, viewMode) {
  const rows = allLoadedSignals(domData, domains).filter((row) => isForwardSignal(row.signal))
  const loaded = domains.filter((id) => domData[id]).length
  const risks = rows.filter((row) => isRiskSignal(row.signal))
  const opps = rows.filter((row) => isOpportunitySignal(row.signal))
  const b2cRows = rows.filter(isB2CSignal)
  const b2cRisks = b2cRows.filter((row) => isRiskSignal(row.signal))
  const b2cOpps = b2cRows.filter((row) => isOpportunitySignal(row.signal))
  const domainsWithRisk = new Set(risks.map((row) => row.domain)).size
  const directTerms = /direct|booking|conversion|app|web|ota|agent|loyalty|member|customer|ancillary|campaign|personal/
  const directLevers = b2cRows.filter((row) => directTerms.test(signalText(row.signal))).length
  const sourceValue = domains.reduce((sum, id) => sum + parseOpportunityValue(domData[id]?.opp?.value), 0)
  const estimateValue = opps.length * (viewMode === 'b2c' ? 1750000 : 2500000)
  const opportunityValue = normaliseOpportunityValue(sourceValue, opps.length) || estimateValue
  const forwardCount = rows.length

  if (viewMode === 'b2c') {
    return [
      { value: String(b2cRisks.length), label: 'Direct/B2C risks', detail: b2cRisks.length ? 'Needs leadership attention' : 'No active B2C risk loaded', tone: b2cRisks.length ? 'risk' : 'neutral' },
      { value: formatMoney(opportunityValue), label: 'B2C opportunity', detail: `${b2cOpps.length} forward opportunity signals`, tone: opportunityValue ? 'opp' : 'neutral' },
      { value: String(directLevers), label: 'Direct growth levers', detail: 'Conversion, loyalty, OTA, app/web themes', tone: directLevers ? 'amber' : 'neutral' },
      { value: String(forwardCount), label: 'Current/future signals', detail: 'Historic-only news filtered out', tone: forwardCount ? 'neutral' : 'amber' },
      { value: `${loaded}/14`, label: 'B2C coverage loaded', detail: loaded === 14 ? 'Complete executive view' : 'Resume to complete scorecard', tone: loaded === 14 ? 'opp' : 'amber' },
    ]
  }
  return [
    { value: String(risks.length), label: 'Active revenue risks', detail: risks.length ? `${domainsWithRisk} domains need attention` : 'No active risk loaded', tone: risks.length ? 'risk' : 'neutral' },
    { value: formatMoney(opportunityValue), label: 'Opportunity value', detail: `${opps.length} opportunity signals detected`, tone: opportunityValue ? 'opp' : 'neutral' },
    { value: String(domainsWithRisk), label: 'Risk domains', detail: 'Revenue, ops, geo, cyber and demand exposure', tone: domainsWithRisk ? 'amber' : 'neutral' },
    { value: String(forwardCount), label: 'Forward signals', detail: 'Today to next 180 days only', tone: forwardCount ? 'neutral' : 'amber' },
    { value: `${loaded}/14`, label: 'Enterprise coverage', detail: loaded === 14 ? 'Complete enterprise view' : 'Resume to complete scorecard', tone: loaded === 14 ? 'opp' : 'amber' },
  ]
}

// --- tooltip breakdowns (radar-core.js:6174-6232) ---

function rv91IsUrgent(s) {
  const text = signalText(s)
  return isRiskSignal(s) || /urgent|critical|immediate|today|now|leadership|revenue risk|conversion|ota|agent|direct|booking|loyalty|customer|disruption|pressure|threat/.test(text)
}

function rv91SignalRows(domData, domains) {
  const rows = allLoadedSignals(domData, domains).map((row) => ({ ...row, score: getCommercialImpactScore(row.signal) }))
  const filtered = rows.filter((row) => isForwardSignal(row.signal))
  return (filtered.length ? filtered : rows).sort((a, b) => {
    const urgentDiff = (rv91IsUrgent(b.signal) ? 1 : 0) - (rv91IsUrgent(a.signal) ? 1 : 0)
    if (urgentDiff) return urgentDiff
    return (b.score || 0) - (a.score || 0)
  })
}

function rv91LeadershipRows(domData, domains) {
  const leadershipTerms = /revenue|direct|booking|conversion|ota|agent|loyalty|customer|app|web|ancillary|market|route|capacity|demand|fare|price|yield|disruption|regulation|visa|fuel|competitor|campaign|call centre|support|ucp|personal/i
  return rv91SignalRows(domData, domains)
    .filter((row) => leadershipTerms.test(signalText(row.signal)) || getCommercialImpactScore(row.signal) >= 7 || isRiskSignal(row.signal))
    .slice(0, 30)
}

function rv91GroupByDomain(rows) {
  const map = {}
  rows.forEach((row) => {
    const id = row.domain
    if (!map[id]) map[id] = { id, label: DOM_LABELS_SHORT[id] || id, rows: [], risk: 0, opp: 0, maxScore: 0 }
    map[id].rows.push(row)
    map[id].maxScore = Math.max(map[id].maxScore, row.score || getCommercialImpactScore(row.signal))
    if (isRiskSignal(row.signal)) map[id].risk++
    if (isOpportunitySignal(row.signal)) map[id].opp++
  })
  return Object.values(map).sort((a, b) => {
    const riskDiff = b.risk - a.risk
    if (riskDiff) return riskDiff
    const scoreDiff = b.maxScore - a.maxScore
    if (scoreDiff) return scoreDiff
    return b.rows.length - a.rows.length
  })
}

function rv91SignalSnippet(row, max = 66) {
  const s = row.signal || {}
  return String(s.whyItMattersNow || s.body || s.captureStrategy || s.title || 'Review loaded signal').slice(0, max)
}

/** One tooltip row's data (rendering happens in the component). */
function tooltipRowModel(group) {
  const top = [...group.rows].sort((a, b) => (b.score || 0) - (a.score || 0))[0] || { signal: {} }
  const s = top.signal || {}
  const dot = group.risk ? 'r' : group.opp ? 'g' : 'a'
  const metric = group.risk ? `${group.risk} risk${group.risk > 1 ? 's' : ''}` : group.opp ? `${group.opp} opportunity` : `${group.rows.length} signal${group.rows.length > 1 ? 's' : ''}`
  return { dot, domainLabel: group.label, metric, title: String(s.title || 'Review category').slice(0, 58), snippet: rv91SignalSnippet(top), source: s.source, sourceDate: s.sourceDate, score: group.maxScore || getCommercialImpactScore(s) }
}

/** Port of updateKpiTooltips (radar-core.js:6262-6310) — the 5 hover-breakdown bodies. */
export function computeKpiTooltips(domData, domains) {
  const rows = rv91LeadershipRows(domData, domains)
  const risks = rv91GroupByDomain(rows.filter((r) => isRiskSignal(r.signal)))
  const opps = rv91GroupByDomain(rows.filter((r) => isOpportunitySignal(r.signal)))
  const directRegex = /direct|booking|conversion|app|web|ota|agent|loyalty|member|customer|ancillary|campaign|personal|ucp|call centre|support/i
  const levers = rv91GroupByDomain(rows.filter((r) => directRegex.test(signalText(r.signal))))

  const windows = {}
  rows.forEach((r) => {
    const w = r.signal.relevanceWindow || r.signal.timeToImpact || 'active_now'
    ;(windows[w] ||= []).push(r)
  })
  const windowRows = Object.entries(windows).slice(0, 6).map(([w, list]) => {
    const top = [...list].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
    return { label: String(w).replace(/_/g, ' '), count: list.length, title: (top?.signal?.title || '').slice(0, 72), dot: /today|immediate|active/i.test(w) ? 'r' : /30/i.test(w) ? 'a' : 'g' }
  })

  const coverageRows = domains.map((id) => {
    const d = domData[id]
    const count = d?.signals?.length || d?.signalCount || 0
    const urgent = d?.signals?.filter(rv91IsUrgent).length || 0
    return { id, label: DOM_LABELS_SHORT[id] || id, loaded: !!d, count, urgent }
  })

  return {
    risks: risks.slice(0, 6).map(tooltipRowModel),
    opportunities: opps.slice(0, 6).map(tooltipRowModel),
    levers: levers.slice(0, 6).map(tooltipRowModel),
    windows: windowRows,
    coverage: coverageRows,
  }
}
