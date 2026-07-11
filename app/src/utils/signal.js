// Generic accessors for the loosely-shaped signal objects that flow through
// CIOS (painPoints/strengths/improvements items all have different field
// names depending on source). Port of ciosItemTitle/ciosItemDetail/ciosItemSource
// (scripts/visual-fixes.js:239-251).

function cleanText(v) {
  return (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim()
}

export function itemTitle(i) {
  return cleanText(i.title || i.pain || i.issue || i.name || i.driver || i.insight || i.metric || i.topComplaint || i.topStrength || 'Customer signal')
}

export function itemDetail(i) {
  const s = i.signal || null
  const fromSignal = s && (s.captureStrategy || s.capture_strategy || s.whyItMattersNow || s.why_it_matters_now)
  return cleanText(fromSignal || i.detail || i.body || i.description || i.implication || i.competitorAdvantage || i.ucpUseCase || i.topComplaint || i.topStrength || '')
}

export function itemSource(i) {
  return cleanText(i.source || i.sourceName || i.platform || i.frequency || 'Backend cache')
}

export function itemImpactLabel(i, severityLabelFn) {
  const raw = cleanText(i.impact || i.value || i.strength || i.frequency || '')
  return raw || (severityLabelFn ? severityLabelFn(i) : '')
}

/** Stable key for cross-tab dedup — same item should hash the same regardless of which tab renders it. */
export function signalKey(i) {
  return `${itemSource(i)}::${itemTitle(i)}::${itemDetail(i)}`.toLowerCase()
}
