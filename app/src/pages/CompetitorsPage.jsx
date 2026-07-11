import { useState } from 'react'
import { useCompetitorCache } from '../hooks/useCompetitorCache'
import { PRIORITY_COMPETITORS, STRATEGIC_COMPETITORS } from '../utils/competitorMeta'
import CompetitorTile from '../components/competitors/CompetitorTile'
import CompetitorDetailPanel from '../components/competitors/CompetitorDetailPanel'

/** Port of components/03-competitors.html + selComp/loadComp/renderComp (read-only cache path — see hooks/useCompetitorCache.js for scope). */
export default function CompetitorsPage() {
  const { compData, loading } = useCompetitorCache('b2c')
  const [selected, setSelected] = useState(null)

  return (
    <div className="comp-page visible">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="comp-hdr-t">Competitor Intelligence</div>
          <div className="comp-hdr-s">
            Weaknesses to exploit · Opportunities their moves create for QR · Specific B2C actions to take.
            {loading ? ' Loading cached intelligence…' : ' Each loads independently from backend/cache evidence.'}
          </div>
        </div>
      </div>

      <div className="comp-tiles">
        <div className="comp-tier-block">
          <div className="comp-tier-head">
            <div className="comp-tier-title">Priority Competitive Set</div>
            <div className="comp-tier-sub">Direct demand-share and premium-product rivals that most strongly affect near-term QR B2C performance.</div>
          </div>
          <div className="comp-tier-grid">
            {PRIORITY_COMPETITORS.map((id) => (
              <CompetitorTile key={id} id={id} data={compData[id]} active={selected === id} onClick={() => setSelected(id)} />
            ))}
          </div>
        </div>

        <div className="comp-tier-block">
          <div className="comp-tier-head">
            <div className="comp-tier-title">Strategic Watchlist Set</div>
            <div className="comp-tier-sub">Growth and regional-network competitors that still need continuous tracking for spillover and route-share shifts.</div>
          </div>
          <div className="comp-tier-grid">
            {STRATEGIC_COMPETITORS.map((id) => (
              <CompetitorTile key={id} id={id} data={compData[id]} active={selected === id} onClick={() => setSelected(id)} />
            ))}
          </div>
        </div>
      </div>

      <CompetitorDetailPanel id={selected} data={selected ? compData[selected] : null} />
    </div>
  )
}
