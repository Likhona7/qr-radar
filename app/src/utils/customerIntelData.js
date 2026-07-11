// Port of normalizeCIData (radar-core.js:826-887). Verified against the real
// /api/cache/customer-intel/:seg response (direct API call) — unlike
// competitors, this endpoint's shape matches the flat camelCase structure
// this normalizer expects, so no rewrite was needed here.

import { CI_META } from './customerIntelMeta'

function firstText(obj, keys, fallback = '') {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v)
  }
  return fallback
}

function asArray(v) {
  return Array.isArray(v) ? v : []
}

function safeScore(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback
}

export function normalizeCIData(seg, data) {
  data = data?.data ? data.data : data || null
  const meta = CI_META[seg] || { name: seg }
  if (!data) {
    return { segment: seg, segmentName: meta.name || seg, opportunityScore: null, size: '', topInsight: '', bookingBehaviour: [], loyaltyDrivers: [], painPoints: [], personalisationOpps: [], externalSignals: [], strategicLenses: [], kpis: [] }
  }

  return {
    segment: data.segment || seg,
    segmentName: data.segmentName || meta.name || seg,
    opportunityScore: safeScore(data.opportunityScore || data.score, null),
    opportunityLabel: firstText(data, ['opportunityLabel', 'label', 'status'], 'Loaded'),
    size: firstText(data, ['size'], ''),
    topInsight: firstText(data, ['topInsight', 'summary'], ''),
    identityConfidence: firstText(data, ['identityConfidence'], ''),
    tripIntentState: firstText(data, ['tripIntentState'], ''),
    customerValuePotential: firstText(data, ['customerValuePotential'], ''),
    customerValueReason: firstText(data, ['customerValueReason'], ''),
    decisionReadiness: firstText(data, ['decisionReadiness'], ''),
    decisionReadinessReason: firstText(data, ['decisionReadinessReason'], ''),
    tripMission: asArray(data.tripMission).map((v) => String(v || '').trim()).filter(Boolean),
    partyType: asArray(data.partyType).map((v) => String(v || '').trim()).filter(Boolean),
    digitalBehaviour: { channel: firstText(data.digitalBehaviour, ['channel'], ''), note: firstText(data.digitalBehaviour, ['note'], '') },
    serviceRiskLevel: firstText(data, ['serviceRiskLevel'], ''),
    serviceRiskReason: firstText(data, ['serviceRiskReason'], ''),
    serviceRiskTags: asArray(data.serviceRiskTags).map((t) => ({ tag: firstText(t, ['tag']), note: firstText(t, ['note']) })).filter((t) => t.tag || t.note),
    bookingBehaviour: asArray(data.bookingBehaviour).map((b) => ({ insight: firstText(b, ['insight', 'title', 'name']), detail: firstText(b, ['detail', 'body', 'description']), source: firstText(b, ['source']), implication: firstText(b, ['implication', 'impact']) })).filter((b) => b.insight || b.detail),
    loyaltyDrivers: asArray(data.loyaltyDrivers).map((l) => ({ driver: firstText(l, ['driver', 'title', 'name']), detail: firstText(l, ['detail', 'body', 'description']), strength: firstText(l, ['strength']) })).filter((l) => l.driver || l.detail),
    painPoints: asArray(data.painPoints).map((p) => ({ pain: firstText(p, ['pain', 'title', 'issue', 'name']), detail: firstText(p, ['detail', 'body', 'description']), competitorAdvantage: firstText(p, ['competitorAdvantage', 'impact']) })).filter((p) => p.pain || p.detail),
    personalisationOpps: asArray(data.personalisationOpps).map((o) => ({ title: firstText(o, ['title', 'name']), detail: firstText(o, ['detail', 'body', 'description']), ucpUseCase: firstText(o, ['ucpUseCase', 'useCase']), adobeProduct: firstText(o, ['adobeProduct']), value: firstText(o, ['value', 'impact']), effort: firstText(o, ['effort']), owner: firstText(o, ['owner']), persona: firstText(o, ['persona']), dataSource: firstText(o, ['dataSource']) })).filter((o) => o.title || o.detail),
    externalSignals: asArray(data.externalSignals).map((s) => ({ signal: firstText(s, ['signal', 'title', 'name']), source: firstText(s, ['source']), direction: firstText(s, ['direction']), implication: firstText(s, ['implication', 'detail', 'body']) })).filter((s) => s.signal || s.source || s.implication),
    nextBestAction: data.nextBestAction && typeof data.nextBestAction === 'object'
      ? { action: firstText(data.nextBestAction, ['action', 'title']), adobeProduct: firstText(data.nextBestAction, ['adobeProduct']), timeline: firstText(data.nextBestAction, ['timeline']), owner: firstText(data.nextBestAction, ['owner']) }
      : null,
    strategicLenses: asArray(data.strategicLenses).map((l) => ({ name: firstText(l, ['name', 'title']), priority: firstText(l, ['priority']), why: firstText(l, ['why', 'reason', 'detail']), move: firstText(l, ['move', 'action']) })).filter((l) => l.name || l.why || l.move),
    luxuryPersonas: asArray(data.luxuryPersonas),
    kpis: asArray(data.kpis),
  }
}
