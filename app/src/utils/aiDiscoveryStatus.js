// Port of the AI_DISCOVERY_BACKEND computation helpers (radar-core.js:3699-3858).

function bestNumber(values, fallback) {
  for (const v of values) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function dateLabel(value) {
  if (!value) return ''
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return String(value)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function summaryOf(data) {
  const run = data.latestDiscoveryRun || {}
  return data.latestDiscoverySummary || run.metadata || {}
}

function sourceResultsOf(data) {
  const summary = summaryOf(data)
  return Array.isArray(summary.sourceResults) ? summary.sourceResults : []
}

function runStatusOf(data) {
  const run = data.latestDiscoveryRun || {}
  const summary = summaryOf(data)
  return summary.status || run.status || (summary.completedAt || run.completed_at ? 'completed' : 'not confirmed')
}

/** Port of the 6 backend-status cards (radar-core.js:3820-3853). */
export function computeBackendStatusCards(data, hasLive) {
  const summary = summaryOf(data)
  const run = data.latestDiscoveryRun || {}
  const latestContent = data.latestContentRefresh || {}
  const sourceResults = sourceResultsOf(data)
  const completedAt = summary.completedAt || run.completed_at || run.run_at || latestContent.refreshed_at || data.lastCheckedAt
  const sourcesChecked = bestNumber([summary.sourcesChecked, run.sources_checked, sourceResults.length, data.sourceCount], 0)
  const itemsSaved = bestNumber([summary.sourceItemsSaved, run.source_items_saved, summary.itemsSeen, run.signals_checked], 0)
  const signalsSaved = bestNumber([summary.signalsSaved, summary.newSignalsFound, run.signals_created, run.critical_signals], 0)
  const ledgerCount = bestNumber([data.sourceCount, (data.sourceLedger || []).length], 0)
  const staleCount = bestNumber([data.staleSourceCount], 0)
  const contentStatus = data.contentStatus || latestContent.status || 'not confirmed'

  return [
    { label: 'Latest run', value: hasLive ? runStatusOf(data) : 'Backend pending', detail: hasLive ? (completedAt ? `Completed ${dateLabel(completedAt)}` : 'Backend connected; waiting for first run timestamp.') : 'Backend should return source proof, freshness and confidence.' },
    { label: 'Sources checked', value: hasLive ? String(sourcesChecked) : 'Awaiting run', detail: 'Source groups checked in the latest discovery cycle.' },
    { label: 'Items saved', value: hasLive ? String(itemsSaved) : 'Awaiting run', detail: 'Evidence items captured before scoring and dedupe.' },
    { label: 'Signals created', value: hasLive ? String(signalsSaved) : 'Awaiting run', detail: 'New signals saved into Radar from the latest source cycle.' },
    { label: 'Source ledger', value: hasLive ? `${ledgerCount} tracked` : 'Awaiting ledger', detail: staleCount ? `${staleCount} source(s) need refresh.` : 'Source freshness ledger is clean or not yet stale.' },
    { label: 'Content freshness', value: hasLive ? contentStatus : 'Not confirmed', detail: latestContent.domain_id ? `Latest domain: ${String(latestContent.domain_id).toUpperCase()}` : 'Waiting for latest refresh proof.' },
  ]
}

/** Port of renderAIDiscoveryRunProof's row-building (radar-core.js:3746-3787). */
export function computeRunProofRows(data) {
  const sourceRows = sourceResultsOf(data).slice(0, 6)
  const ledgerRows = (Array.isArray(data.sourceLedger) ? data.sourceLedger : []).slice(0, 6)
  if (sourceRows.length) {
    return sourceRows.map((row) => ({ name: row.sourceName || row.sourceId || 'Source', meta: row.sourceId || 'Discovery source', value: `${bestNumber([row.itemsFound], 0)} items`, state: row.status || 'checked' }))
  }
  return ledgerRows.map((row) => ({ name: row.source_name || row.source_id || row.source_type || 'Tracked source', meta: row.source_type || 'Ledger source', value: `${bestNumber([row.items_saved, row.items_seen, row.item_count], 0)} saved`, state: row.freshness_state || row.status || 'tracked' }))
}

/** Port of the live-vs-fallback 5-KPI grid (radar-core.js:4175-4201). */
export function computeKpiCards(data, hasLive) {
  const summary = summaryOf(data)
  const run = data.latestDiscoveryRun || {}
  const latestContent = data.latestContentRefresh || {}
  if (!hasLive) return AIDISCOVERY_KPI_FALLBACK

  return [
    { v: bestNumber([summary.sourcesChecked, run.sources_checked, sourceResultsOf(data).length, data.sourceCount], 0), l: 'sources checked', d: 'Latest backend discovery cycle' },
    { v: bestNumber([summary.sourceItemsSaved, summary.itemsSeen, run.signals_checked], 0), l: 'items saved', d: 'Source items captured for scoring' },
    { v: bestNumber([summary.signalsSaved, summary.newSignalsFound, run.signals_created, run.critical_signals], 0), l: 'signals created', d: 'New Radar signals from source discovery' },
    { v: bestNumber([data.sourceCount, (data.sourceLedger || []).length], 0), l: 'ledger sources', d: 'Source freshness ledger coverage' },
    { v: data.contentStatus || latestContent.status || 'live', l: 'content status', d: latestContent.refreshed_at ? `Latest refresh ${dateLabel(latestContent.refreshed_at)}` : 'Waiting for refresh timestamp' },
  ]
}

const AIDISCOVERY_KPI_FALLBACK = [
  { v: 5, l: 'trackable signal families', d: 'Referral sources, crawler visibility, citations, query gaps and conversion.' },
  { v: 3, l: 'core data sources', d: 'Server logs, Adobe Analytics and citation monitoring.' },
  { v: 4, l: 'answer sources to compare', d: 'Major answer platforms.' },
  { v: 7, l: 'query families', d: 'Premium, business, family, route, app and loyalty questions.' },
  { v: 1, l: 'weekly audit loop', d: 'Repeat the same query set to see movement and gaps.' },
]
