// Thin wrappers for endpoints the migrated pages actually touch.

import { backendFetch } from './backend'

export async function getHealthFull() {
  const resp = await backendFetch('/api/health/full', {}, 10000)
  return resp.json()
}

/** Port of loadSentimentTrajectory's fetch (customer-os.js:1880-1939). */
export async function getSentimentTrajectory(topic, days = 30) {
  const resp = await backendFetch(`/api/sentiment/trajectory?topic=${encodeURIComponent(topic)}&days=${days}`, {}, 15000)
  return resp.json()
}

/** Port of fetchExecutiveBackendData's 3 parallel calls (executive-os-roadmap.js:660-701). */
export async function getDashboardDelta(viewMode = 'b2c') {
  const resp = await backendFetch(`/api/dashboard/delta?viewMode=${encodeURIComponent(viewMode)}&hours=24`, {}, 15000)
  return resp.json()
}

export async function getOpportunitySimulation(viewMode = 'b2c') {
  const resp = await backendFetch(`/api/opportunity-simulation?viewMode=${encodeURIComponent(viewMode)}&limit=24`, {}, 15000)
  return resp.json()
}

export async function getRankingSignals(viewMode = 'b2c') {
  const resp = await backendFetch(`/api/ranking/signals?viewMode=${encodeURIComponent(viewMode)}&limit=50`, {}, 15000)
  return resp.json()
}

/**
 * Port of fetchPredictiveInnovation's fallback chain (radar-core.js:5252-5298)
 * — tries 3 paths in order until one succeeds.
 */
export async function getInnovationRadar(viewMode = 'b2c') {
  const paths = [
    `/api/innovation-radar?viewMode=${encodeURIComponent(viewMode)}&days=60&limit=100`,
    `/api/predictive-intel/innovation?viewMode=${encodeURIComponent(viewMode)}&days=60&limit=100`,
    `/api/predictive-intel?viewMode=${encodeURIComponent(viewMode)}&days=60&limit=100&includeInnovation=true`,
  ]
  let lastErr = null
  for (const path of paths) {
    try {
      const resp = await backendFetch(path, {}, 18000)
      const json = await resp.json()
      if (!json?.ok) throw new Error(json?.error || 'Innovation endpoint returned no data')
      return { data: json.data?.innovation || json.data || null, route: path.split('?')[0] }
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error('Innovation Radar returned no data')
}

/** Port of fetchPredictiveAux's 3 parallel calls (radar-core.js:5318-5347). */
export async function getAppRatingsIntelligence(viewMode = 'b2c') {
  const resp = await backendFetch(`/api/app-ratings/intelligence?viewMode=${encodeURIComponent(viewMode)}&days=60&limit=100`, {}, 18000)
  return resp.json()
}

export async function getPartnerCompetitorProof(viewMode = 'b2c') {
  const resp = await backendFetch(`/api/partner-competitor/proof?viewMode=${encodeURIComponent(viewMode)}&days=60`, {}, 18000)
  return resp.json()
}

export async function getDiscoveryStatus(viewMode = 'b2c') {
  const resp = await backendFetch(`/api/discovery/status?viewMode=${encodeURIComponent(viewMode)}&limit=20`, {}, 18000)
  return resp.json()
}

/** Port of loadBackendCacheFirst's 2 calls (radar-core.js:1490-1582) — read-only cache path, no AI generation. */
export async function getCacheLatest(viewMode = 'b2c', maxAgeHours = 720) {
  const resp = await backendFetch(`/api/cache/latest?viewMode=${encodeURIComponent(viewMode)}&maxAgeHours=${maxAgeHours}`, {}, 20000)
  return resp.json()
}

export async function getCacheDomain(domainId, viewMode = 'b2c', maxAgeHours = 720) {
  const resp = await backendFetch(`/api/cache/domain/${domainId}?viewMode=${encodeURIComponent(viewMode)}&maxAgeHours=${maxAgeHours}`, {}, 15000)
  return resp.json()
}

/** Port of loadComp's cache-check fetch (radar-core.js:4267-4279), one alias at a time until one succeeds. */
export async function getCacheCompetitor(alias, viewMode = 'b2c') {
  const resp = await backendFetch(`/api/cache/competitor/${encodeURIComponent(alias)}?viewMode=${encodeURIComponent(viewMode)}`, {}, 12000)
  return resp.json()
}
