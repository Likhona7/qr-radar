import { CI_META } from '../../utils/customerIntelMeta'

/** Port of the .ci-seg tile markup (components/05-customer-intelligence.html:23-79). */
export default function CustomerSegmentTile({ seg, data, active, onClick }) {
  const meta = CI_META[seg]
  const score = data?.opportunityScore
  const hasData = score != null
  const color = hasData ? (score >= 80 ? '#1abc9c' : score >= 60 ? '#C8A050' : '#e74c3c') : undefined

  return (
    <div className={`ci-seg${seg === 'luxury' ? ' ci-seg-luxury' : ''}${active ? ' active' : ''}`} onClick={onClick}>
      {seg === 'luxury' && <div className="ci-seg-new">New</div>}
      <div className="ci-seg-icon">{meta.icon}</div>
      <div className="ci-seg-name">{meta.name}</div>
      <div className="ci-seg-sub">{meta.desc.split('.')[0]}</div>
      <div className="ci-seg-bar"><div className="ci-seg-fill" style={{ width: `${score || 0}%`, background: color }} /></div>
      <div className="ci-seg-row"><span>Opportunity</span><span>{hasData ? `${score}%` : '-'}</span></div>
    </div>
  )
}
