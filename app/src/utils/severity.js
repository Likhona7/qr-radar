// Replaces the legacy app's two overlapping, contradictory classifiers —
// ciosRiskClass (visual-fixes.js:253-259, used for chip color) and
// ciosScoreFromItem (visual-fixes.js:282-288, used for the fake "NN/100"
// score) — with one classifier whose output is always shown as a
// qualitative label, never a fabricated numeric rating.
//
// Bug context: ciosScoreFromItem's first regex branch (critical/delay/refund/
// negative/...) matches almost every airline app-store review, so nearly
// every "App Ratings" card collapsed to the same 88/100. This keeps the same
// bucket ordering (useful for sort/color) but stops presenting it as a score.

import { itemDetail, itemTitle } from './signal'

const SEVERITY_ORDER = ['informational', 'opportunity', 'monitor', 'critical']

export function severityFromItem(item) {
  const txt = `${item.impact || ''} ${itemTitle(item)} ${itemDetail(item)}`.toLowerCase()
  if (/opportun|positive|strength|praise|win|growth|lift|improve|conversion lift|brand halo|award|best airline/.test(txt)) {
    return 'opportunity'
  }
  if (/risk|critical|complaint|delay|refund|failure|negative|leakage|churn|abandon|friction|issue|poor|low|inadequate|wait|escalation|ato|fraud/.test(txt)) {
    return 'critical'
  }
  if (/monitor|mixed|medium|shift|pressure|watch|sentiment/.test(txt)) {
    return 'monitor'
  }
  return 'informational'
}

export function severityLabel(bucket) {
  switch (bucket) {
    case 'critical':
      return 'Needs attention'
    case 'monitor':
      return 'Monitor'
    case 'opportunity':
      return 'Opportunity'
    default:
      return 'Informational'
  }
}

/** Sort weight only — never displayed. Higher = more urgent. */
export function severityRank(bucket) {
  return SEVERITY_ORDER.indexOf(bucket)
}

export function severityClassName(bucket) {
  return `radar-severity-${bucket}`
}
