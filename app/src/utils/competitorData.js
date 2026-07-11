// Port of the competitor cache normalization (radar-core.js:632-702),
// REWRITTEN after live verification found the legacy normalizeCompData
// doesn't actually match the real /api/cache/competitor/:id response shape.
//
// Confirmed via direct API calls: the real payload is
//   { data: { cached, requestedId, competitorId, competitor: {id,name,...},
//             analysis: { overall_threat, summary, weaknesses: string[],
//                         opportunities: string[], actions: string[],
//                         strengths: string[] } } }
// — nested under competitor/analysis, snake_case field names, and
// weaknesses/opportunities/actions are plain STRING arrays, not objects with
// title/detail/severity. The legacy normalizeCompData expects a flat,
// camelCase, object-array shape (data.weaknesses[].title etc.) — it reads
// fields that don't exist at this response's top level, so competitorPayload
// Matches (which checks data.name/data.summary) always fails against real
// data, and the legacy Competitors page would show "No data" for every
// competitor too, not just this port. This is a pre-existing backend/
// frontend contract mismatch, not something introduced here — fixed rather
// than faithfully reproduced, same principle as the App Ratings regex fix
// and the mojibake CSS fix earlier in this migration.

import { CMETA } from './competitorMeta'

function safeScore(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback
}

/** Normalizes the real /api/cache/competitor/:id response into the view model. */
export function normalizeCompData(id, payload) {
  const meta = CMETA[id] || {}
  const analysis = payload?.analysis || {}
  const competitor = payload?.competitor || {}
  const weaknesses = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : []
  const opportunities = Array.isArray(analysis.opportunities) ? analysis.opportunities : []
  const actions = Array.isArray(analysis.actions) ? analysis.actions : []
  const hasSpecificCache = payload?.cached === true && (weaknesses.length > 0 || opportunities.length > 0 || actions.length > 0)

  return {
    name: competitor.name || meta.name || id,
    why: meta.why || '',
    overallThreat: hasSpecificCache ? safeScore(analysis.overall_threat, 70) : null,
    summary: hasSpecificCache ? (analysis.summary || `${meta.name || id} intelligence loaded from backend cache.`) : `No source-specific cache is loaded for ${meta.name || id}.`,
    weaknesses,
    opportunities,
    actions,
    hasSpecificCache,
  }
}
