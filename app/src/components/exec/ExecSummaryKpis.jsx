import { computeOpportunityRangeForCards, signalScore, titleOf, bodyOf } from '../../utils/execSignal'

/** Port of renderSummaryCardsV2 (executive-os-roadmap.js:714-745). */
export default function ExecSummaryKpis({ signals, delta, simulation }) {
  const pool = signals.slice(0, 12)
  let avg = pool.length ? Math.round(pool.reduce((a, s) => a + signalScore(s), 0) / pool.length) : 0
  if (delta?.summary && Number(delta.summary.criticalCount) > 0 && avg < 50) avg = 50

  const risk = signals.filter((s) => /risk|threat|disrupt|fraud|friction|leak|drop|decline/i.test(`${titleOf(s)} ${bodyOf(s)}`.toLowerCase())).length
  const opp = signals.filter((s) => /opportun|growth|capture|upsell|premium|ancillary|direct/i.test(`${titleOf(s)} ${bodyOf(s)}`.toLowerCase())).length
  const corroborated = signals.filter((s) => s.verified).length
  const nextMove = (signals[0] && signals[0].captureStrategy) || 'Protect direct share'
  const oppRange = computeOpportunityRangeForCards(signals, simulation)

  const cards = [
    { icon: 'ST', label: 'State', value: `${avg}/100 Elevated`, sub: `Risk signals: ${risk} | Opportunity: ${opp}`, cta: 'Open evidence' },
    { icon: '$', label: 'Opportunity', value: oppRange.label, sub: oppRange.sub, cta: 'See opportunity detail' },
    { icon: 'NM', label: 'Next Move', value: nextMove, sub: 'Run execution with named owners', cta: 'View action plan' },
    { icon: 'TR', label: 'Trust', value: `${signals.length} signals, ${corroborated} corroborated`, sub: 'Live ranking confidence', cta: 'View sources' },
  ]

  return (
    <div className="exec-kpi-row exec-summary-row">
      {cards.map((c, i) => (
        <article className="exec-summary-card" key={i}>
          <div className="exec-summary-icon">{c.icon}</div>
          <div>
            <div className="exec-summary-label">{c.label}</div>
            <div className={`exec-summary-value${c.value.length > 28 ? ' long' : ''}`}>{c.value}</div>
            <div className="exec-summary-sub">{c.sub}</div>
            <button type="button" className="exec-summary-cta">{c.cta} <span>→</span></button>
          </div>
        </article>
      ))}
    </div>
  )
}
