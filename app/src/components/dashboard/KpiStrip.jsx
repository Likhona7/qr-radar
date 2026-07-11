import { computeKpis, computeKpiTooltips } from '../../utils/kpiScorecard'

const TONE_VALUE_CLASS = { risk: 'vr', opp: 'vg', amber: 'va', neutral: 'vn' }
const TONE_DETAIL_CLASS = { risk: 'dn', opp: 'dg', amber: 'da', neutral: 'dt' }

const TOOLTIP_TITLES = ['Risk signals by domain', 'Top opportunities', 'Direct/B2C action levers', 'By time window', 'Domain coverage']

/** Port of the KPI strip (components/02-main-dashboard.html:61-87) + setKpi/updateExecutiveScorecard + updateKpiTooltips. */
export default function KpiStrip({ domData, domains, viewMode }) {
  const kpis = computeKpis(domData, domains, viewMode)
  const tooltips = computeKpiTooltips(domData, domains)
  const tooltipData = [tooltips.risks, tooltips.opportunities, tooltips.levers, tooltips.windows, tooltips.coverage]

  return (
    <div className="kpi-strip">
      {kpis.map((k, i) => (
        <div className="kpi" key={i}>
          <div className={`kpi-stale ${k.value === '0/14' ? '' : 'kpi-live'}`} />
          <div className={`kv ${TONE_VALUE_CLASS[k.tone]}`}>{k.value}</div>
          <div className="kl">{k.label}</div>
          <div className={`kd ${TONE_DETAIL_CLASS[k.tone]}`}>{k.detail}</div>
          <div className="kpi-tooltip">
            <div className="ktt-title">{TOOLTIP_TITLES[i]}</div>
            <TooltipBody kind={i} rows={tooltipData[i]} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TooltipBody({ kind, rows }) {
  if (!rows.length) return <div className="ktt-empty">Load domains first</div>

  if (kind === 3) {
    return rows.map((w, i) => (
      <div className="ktt-row" key={i}>
        <div className={`ktt-dot ktt-dot-${w.dot}`} />
        <div style={{ flex: 1 }}>
          <div className="ktt-domain-head">{w.label} · {w.count} signal{w.count > 1 ? 's' : ''}</div>
          <div className="ktt-leadership-note">{w.title}</div>
        </div>
      </div>
    ))
  }
  if (kind === 4) {
    return rows.map((c, i) => (
      <div className="ktt-row" key={i}>
        <div className={`ktt-dot ktt-dot-${c.loaded ? 'g' : 'a'}`} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff' }}>{c.label}</div>
          <div className="ktt-leadership-note">{c.count ? `${c.urgent} leadership-relevant of ${c.count} signals` : 'No data yet'}</div>
        </div>
        <div className="ktt-score">{c.count}</div>
      </div>
    ))
  }
  return rows.map((g, i) => (
    <div className="ktt-row" key={i}>
      <div className={`ktt-dot ktt-dot-${g.dot}`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ktt-domain-head">{g.domainLabel} · {g.metric}</div>
        <div style={{ color: '#fff', fontWeight: 500 }}>{g.title}</div>
        <div className="ktt-leadership-note">{g.snippet}</div>
        {g.source && <div className="ktt-source">{g.source}{g.sourceDate ? ` · ${g.sourceDate}` : ''}</div>}
      </div>
      <div className="ktt-score">{g.score}/10</div>
    </div>
  ))
}
