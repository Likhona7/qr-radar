// Port of the feature/guardrail classifiers and static partner-idea copy
// from scripts/radar-core.js (lines 367-371, 3155-3552 partial, 5391-5423,
// 5631-5634, 5678-5689). The fabricated-idea fallback generator
// (evidenceBackedInnovationFallbacks, radar-core.js:5424-5549) is
// deliberately NOT ported — per scope decision, this app shows an honest
// empty state instead of 4 hardcoded canned ideas when the live feed
// returns nothing.

export function safeUrl(v) {
  const s = String(v || '').trim()
  if (!/^https?:\/\//i.test(s)) return ''
  return s.replace(/["'<>\s]/g, '')
}

export function sourceItemText(item) {
  const raw = item?.raw_json || {}
  return [item.title, item.body, item.summary, item.source_name, item.source_type, raw.title, raw.summary, raw.body, raw.feature, raw.featureName, raw.product, raw.partner, raw.competitor, raw.review, raw.url].filter(Boolean).join(' ')
}

export function sourceItemUrl(item) {
  const raw = item?.raw_json || {}
  return safeUrl(item?.source_url || item?.url || raw.url || raw.sourceUrl || raw.link || raw.reviewUrl || '')
}

function sourceItemLooksLikeFeature(item) {
  const text = sourceItemText(item)
  const positive = /award|best|feature|launch|new|innov|loyalty|premium|personal|assistant|marketplace|upgrade|bundle|seamless|smooth|recognition|notification|concierge|codeshare|partner|earn|redeem/i.test(text)
  const guardrail = /complaint|refund|delay|baggage|support|poor|issue|problem|failure|failed|bug|friction|crash|slow|not working|cancel/i.test(text)
  return positive || (!guardrail && /digital|mobile|app|journey|booking|trip|service/i.test(text))
}

function sourceItemLooksLikeGuardrail(item) {
  return /complaint|refund|delay|baggage|support|poor|issue|problem|failure|failed|bug|friction|crash|slow|not working|cancel/i.test(sourceItemText(item))
}

export function featureEvidenceItems(items) {
  items = Array.isArray(items) ? items : []
  const featureItems = items.filter(sourceItemLooksLikeFeature)
  return featureItems.length ? featureItems : items.filter((item) => !sourceItemLooksLikeGuardrail(item))
}

export function qualityGuardrailItems(items) {
  return (Array.isArray(items) ? items : []).filter(sourceItemLooksLikeGuardrail)
}

export function featureActionFor(text) {
  if (/award|best/i.test(text)) return 'Benchmark why this experience is winning and decide whether QR should adapt it.'
  if (/loyalty|earn|redeem|tier|privilege/i.test(text)) return 'Evaluate for Privilege Club and partner recognition moments.'
  if (/premium|upgrade|lounge|concierge/i.test(text)) return 'Evaluate for premium yield, recognition and service differentiation.'
  if (/partner|codeshare|alliance|oneworld/i.test(text)) return 'Assess whether QR can launch faster through partner data or partner journeys.'
  return 'Assess as a competitor feature candidate, then choose deploy, test or watch.'
}

// Compact subset of PMETA (radar-core.js:3155-3552) — only the fields
// partnerFeatureIdeas() actually reads (name/group/score), not the full
// per-partner profile (hub/coverage/signals/actions/etc.) which nothing in
// this scope renders.
const PMETA_SUMMARY = [
  { name: 'American Airlines', group: 'core', score: 96 },
  { name: 'British Airways', group: 'core', score: 95 },
  { name: 'Qantas', group: 'core', score: 92 },
  { name: 'Cathay Pacific', group: 'core', score: 92 },
  { name: 'Japan Airlines', group: 'core', score: 90 },
  { name: 'Iberia', group: 'core', score: 90 },
  { name: 'Finnair', group: 'core', score: 88 },
  { name: 'Malaysia Airlines', group: 'core', score: 88 },
  { name: 'Oman Air', group: 'core', score: 87 },
  { name: 'Royal Jordanian', group: 'core', score: 86 },
  { name: 'Royal Air Maroc', group: 'core', score: 84 },
  { name: 'SriLankan Airlines', group: 'core', score: 84 },
  { name: 'Fiji Airways', group: 'core', score: 83 },
  { name: 'Hawaiian Airlines', group: 'core', score: 82 },
  { name: 'Alaska Airlines', group: 'core', score: 82 },
  { name: 'Aer Lingus', group: 'growth', score: 86 },
  { name: 'Virgin Australia', group: 'growth', score: 86 },
  { name: 'Xiamen Airlines', group: 'growth', score: 84 },
]

/** Port of partnerFeatureIdeas (radar-core.js:5678-5689). */
export function partnerFeatureIdeas() {
  const entries = [...PMETA_SUMMARY].sort((a, b) => (b.score || 0) - (a.score || 0))
  const topCore = entries.filter((p) => p.group === 'core').slice(0, 5).map((p) => p.name).join(', ')
  const topGrowth = entries.filter((p) => p.group === 'growth').slice(0, 3).map((p) => p.name).join(', ')
  return [
    { t: 'Partner journey marketplace', decision: 'Partner pilot', b: 'Bundle partner offers into the trip timeline: lounge, hotel, ground transport, stopover, partner earn/redeem and codeshare support.', impact: 'New partner revenue and stronger end-to-end journey ownership.', owner: 'Partnerships + Digital Product', partners: topCore || 'Core network partners' },
    { t: 'Codeshare confidence layer', decision: 'Deploy on partner itineraries', b: 'Show partner-operated segment clarity, through-check baggage cues, connection confidence and disruption next steps before purchase and day-of-travel.', impact: 'Higher trust on partner-connected itineraries and fewer service contacts.', owner: 'Digital Product + Airport Experience', partners: 'British Airways, Qantas, Cathay Pacific, Japan Airlines' },
    { t: 'Privilege Club partner micro-moments', decision: 'Test in loyalty journeys', b: 'Trigger earn/redeem prompts, tier progress nudges and partner recognition moments at booking, check-in and post-trip.', impact: 'Higher loyalty engagement and partner monetization without a large loyalty relaunch.', owner: 'Privilege Club + Customer Intelligence', partners: 'American Airlines, British Airways, Iberia, Finnair' },
    { t: 'Premium partner corridor campaigns', decision: 'Commercial pilot', b: 'Use partner-connected premium journeys for UK, North America, Japan, Australia and China demand windows where QR direct inventory or reach is constrained.', impact: 'Defend premium demand and reduce leakage to rival hubs.', owner: 'Revenue + Marketing + Partnerships', partners: topCore && topGrowth ? `${topCore}; growth: ${topGrowth}` : topCore || topGrowth },
    { t: 'Partner-assisted disruption recovery', decision: 'Service pilot', b: 'When QR disruption affects a journey, surface partner reroute options, lounge access instructions and loyalty reassurance in app and outbound messaging.', impact: 'Protect high-value customers and reduce call-centre pressure during operational stress.', owner: 'Customer Care + Network Operations', partners: 'Core network partners with route overlap' },
  ]
}
