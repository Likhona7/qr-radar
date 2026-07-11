import { CMETA } from '../../utils/competitorMeta'

/** Port of the .comp-tile markup (components/03-competitors.html:19-71). */
export default function CompetitorTile({ id, data, active, onClick }) {
  const meta = CMETA[id]
  const hasData = data?.hasSpecificCache
  const score = data?.overallThreat

  return (
    <div className={`comp-tile c-${id}${active ? ' on' : ''}`} onClick={onClick}>
      <div className="comp-th">
        <span className="comp-flag">{meta.flag}</span>
        <div>
          <div className="comp-tname">{meta.name}</div>
          <div className="comp-thub">{meta.hub}</div>
        </div>
      </div>
      <div className="comp-tb">
        <div className="comp-tlbl">Backend cache status</div>
        <div className="comp-tstat">{hasData ? `${data.weaknesses.length + data.opportunities.length + data.actions.length} cached items` : 'No competitor-specific cache loaded.'}</div>
        <div className="comp-tprog">
          <div className="comp-tpbar"><div className="comp-tpfill" style={{ width: `${score || 0}%` }} /></div>
          <span className={`comp-tscore ${hasData ? '' : 'pending'}`}>{hasData ? `${score}%` : 'No data'}</span>
        </div>
      </div>
    </div>
  )
}
