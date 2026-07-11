// Port of ciosParseNumber/ciosEstimatePostCount/ciosEstimateConfidence/
// ciosFreshnessLabel (scripts/visual-fixes.js:112-151). Kept behaviorally
// identical to the legacy app for parity — note these post-count/confidence
// numbers are themselves a heuristic estimate synthesized from signal counts
// when the backend doesn't supply real totals, not a measured value. That's
// an existing legacy characteristic, not something Phase 1 changes; flagging
// here so it isn't mistaken for a precise metric during a later pass.

function parseNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const m = v.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
    if (m) return Number(m[0])
  }
  return null
}

export function estimatePostCount(data) {
  const direct = parseNumber(data && data.totalMentions)
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct)
  const pain = data && data.painPoints ? data.painPoints.length : 0
  const strengths = data && data.strengths ? data.strengths.length : 0
  const improvements = data && data.improvements ? data.improvements.length : 0
  return Math.max(0, pain * 26 + strengths * 18 + improvements * 22)
}

export function estimateConfidence(data) {
  const direct = parseNumber(data && (data.confidencePct || data.confidence || data.confidenceScore))
  if (Number.isFinite(direct)) return Math.max(0, Math.min(100, Math.round(direct)))
  const signals =
    (data && data.painPoints ? data.painPoints.length : 0) +
    (data && data.strengths ? data.strengths.length : 0) +
    (data && data.improvements ? data.improvements.length : 0) +
    (data && data.verbatims ? data.verbatims.length : 0)
  const hasTop = data && (data.topComplaint || data.topPraise) ? 1 : 0
  const score = 52 + Math.min(40, signals * 2 + hasTop * 6)
  return Math.max(45, Math.min(94, Math.round(score)))
}

export function freshnessLabel(data) {
  if (!data || !data._cacheLoadedAt) return 'cache'
  const ts = Date.parse(data._cacheLoadedAt)
  if (!Number.isFinite(ts)) return 'cache'
  const ageHours = (Date.now() - ts) / (1000 * 60 * 60)
  if (ageHours < 24) return 'today'
  if (ageHours < 48) return '1 day'
  return `${Math.round(ageHours / 24)} days`
}
