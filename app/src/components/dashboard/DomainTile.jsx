import { DOMAIN_META } from '../../utils/domainMeta'
import { DOM_LABELS } from '../../utils/domainSignal'

/** Port of the .dom tile markup (components/02-main-dashboard.html:96-109) + updateTile (radar-core.js:2383-2398). */
export default function DomainTile({ id, data, active, onClick }) {
  const meta = DOMAIN_META[id]
  const score = data ? Math.max(0, Math.min(100, Number(data.score) || (data.signalCount ? 70 : 45))) : 0
  const badge = data ? `${data.signalCount ?? data.signals?.length ?? 0} signals` : 'No data'

  return (
    <div className={`dom d-${id}${active ? ' on' : ''}`} onClick={onClick}>
      <div className="dom-ic">{meta.abbr}</div>
      <div className="dom-n">{DOM_LABELS[id]}</div>
      <div className="dom-b">{badge}</div>
      <div className="obar">
        <div className="otrk"><div className="ofil" style={{ width: `${score}%` }} /></div>
        <span className="onum">{data ? Math.round(score) : '—'}</span>
      </div>
    </div>
  )
}
