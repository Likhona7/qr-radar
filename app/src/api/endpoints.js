// Thin wrappers for endpoints the migrated pages actually touch.
// getAppRatingsIntelligence and getDashboardDelta are deliberately NOT here
// yet — traced usage shows those belong to Predictive Intelligence
// (radar-core.js:5330) and Executive Summary (executive-os-roadmap.js:670),
// neither of which is migrated yet.

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
