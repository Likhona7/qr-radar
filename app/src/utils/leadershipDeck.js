// Port of the Leadership Command Center IIFE (scripts/customer-os.js:1-153).
// All derived from already-loaded domData — no fetch. The situation-ribbon
// piece (renderSituation) is intentionally not ported: it's superseded by a
// competing "last-writer-wins" implementation in radar-core.js
// (rv91SetSituationFromApi) per the exploration pass, and duplicates text
// already shown elsewhere — not a clean single feature worth porting twice.

import { allLoadedSignals, isForwardSignal, isRiskSignal, isOpportunitySignal, getCommercialImpactScore, signalText } from './domainSignal'
import { DOM_LABELS_SHORT } from './domainMeta'

function rows(domData, domains) {
  const raw = allLoadedSignals(domData, domains)
  const filtered = raw.filter((r) => r?.signal && isForwardSignal(r.signal))
  return filtered.length ? filtered : raw.filter((r) => r?.signal)
}

function score(r) {
  const s = r?.signal || {}
  let val = Number(getCommercialImpactScore(s)) || 5
  const t = signalText(s)
  if (/revenue|margin|yield|fare|price|pricing|conversion|booking|ota|agent|direct|loyalty|premium|ancillary|customer|app|web/i.test(t)) val += 2
  if (isRiskSignal(s)) val += 1.5
  if (/today|immediate|urgent|now|active|next_30_days|30 days/i.test(String(s.relevanceWindow || s.timeToImpact || t))) val += 1
  if (['rev', 'dig', 'agt', 'loy', 'cmp', 'prd', 'rep'].includes(r?.domain)) val += 1
  return Math.max(1, Math.min(10, Math.round(val)))
}

function typeOf(r) {
  return isRiskSignal(r.signal) ? 'risk' : isOpportunitySignal(r.signal) ? 'opp' : 'lever'
}

function snippet(s) {
  return s?.whyItMattersNow || s?.captureStrategy || s?.body || s?.impactLabel || 'Review this signal and agree the next leadership action.'
}

function sortedRows(domData, domains) {
  return rows(domData, domains)
    .map((r) => ({ ...r, lScore: score(r), lType: typeOf(r) }))
    .sort((a, b) => (b.lScore - a.lScore) || ((b.lType === 'risk' ? 1 : 0) - (a.lType === 'risk' ? 1 : 0)))
}

/** Port of topRows (customer-os.js:47-57) — top 3, deduped by domain+title prefix. */
function topRows(domData, domains) {
  const seen = new Set()
  const out = []
  for (const r of sortedRows(domData, domains)) {
    const key = `${r.domain}|${String(r.signal?.title || '').slice(0, 40)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
    if (out.length >= 3) break
  }
  return out
}

/** Port of renderFocus's data (customer-os.js:66-88). */
export function computeLeadershipFocus(domData, domains) {
  return topRows(domData, domains).map((r) => {
    const s = r.signal || {}
    const type = r.lType
    return {
      domain: r.domain,
      type,
      tag: type === 'risk' ? 'Revenue risk' : type === 'opp' ? 'Growth opportunity' : 'Direct lever',
      button: type === 'risk' ? 'Address now' : type === 'opp' ? 'Build plan' : 'Review lever',
      title: s.title || 'Review Digital/B2C signal',
      body: String(snippet(s)).slice(0, 155),
      domainLabel: DOM_LABELS_SHORT[r.domain] || r.domain,
      score: r.lScore,
    }
  })
}

/** Port of renderNarrative (customer-os.js:90-110). */
export function computeExecutiveNarrative(domData, domains) {
  const data = sortedRows(domData, domains)
  const loaded = domains.filter((id) => domData[id]).length
  if (!data.length) {
    return {
      main: 'Digital/B2C scan is ready.',
      text: 'Connect the API or load saved domains to generate an executive summary for Digital Product VP and SVP review.',
      sub: 'Prioritised by website/app impact, direct-booking growth, loyalty, OTA pressure and urgency.',
    }
  }
  const risks = data.filter((r) => r.lType === 'risk')
  const opps = data.filter((r) => r.lType === 'opp')
  const top = data[0]
  const topDomain = DOM_LABELS_SHORT[top.domain] || top.domain
  const topTitle = top.signal?.title || 'top Digital/B2C signal'
  return {
    main: `${topDomain} is the highest priority leadership focus.`,
    text: `${risks.length} risk signals and ${opps.length} opportunity signals are loaded across ${loaded}/14 domains. The leading item is '${topTitle}'. Use this to steer discussion toward direct booking growth, OTA pressure, conversion risk, loyalty and immediate B2C actions.`,
    sub: `${loaded}/14 domains loaded · ${risks.length} risks · ${opps.length} opportunities · ranked by impact and urgency.`,
  }
}

/** Port of renderPressure (customer-os.js:112-131). */
export function computePressure(domData, domains) {
  const data = sortedRows(domData, domains)
  const otaRe = /ota|agent|agency|metasearch|google flights|skyscanner|kayak|expedia|booking\.com|distribution|gds|fare comparison|price comparison|third.party/i
  const directRe = /direct|booking|conversion|app|web|loyalty|member|customer|ucp|personalisation|personalization|ancillary|owned channel|qatarairways\.com|mobile/i
  const ota = data.filter((r) => otaRe.test(signalText(r.signal)) || r.domain === 'agt')
  const direct = data.filter((r) => directRe.test(signalText(r.signal)) || ['dig', 'loy', 'prd', 'rev'].includes(r.domain))
  const avg = (arr) => (arr.length ? arr.reduce((a, r) => a + r.lScore, 0) / arr.length : 0)
  const otaScore = Math.min(100, Math.round(avg(ota) * 10 + Math.min(15, ota.length)))
  const directScore = Math.min(100, Math.round(avg(direct) * 10 + Math.min(15, direct.length)))

  if (!data.length) {
    return { ota: '-', direct: '-', note: 'Uses external signals only. Treat as estimated market pressure, not internal booking share.' }
  }
  return {
    ota: `${otaScore}%`,
    direct: `${directScore}%`,
    note: otaScore > directScore
      ? 'OTA/agent pressure is stronger than direct-channel strength in the current external scan. Focus on price visibility, direct offers, mobile conversion and loyalty capture.'
      : 'Direct-channel strength is currently stronger than OTA pressure. Use this momentum to protect direct booking share and convert high-intent demand.',
  }
}
