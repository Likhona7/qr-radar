// Thin wrappers for endpoints Phase 1 actually touches. getAppRatingsIntelligence
// and getDashboardDelta are deliberately NOT here yet — traced usage shows those
// belong to Predictive Intelligence (radar-core.js:5330) and Executive Summary
// (executive-os-roadmap.js:670), neither of which is in scope until Phase 2.

import { backendFetch } from './backend'

export async function getHealthFull() {
  const resp = await backendFetch('/api/health/full', {}, 10000)
  return resp.json()
}
