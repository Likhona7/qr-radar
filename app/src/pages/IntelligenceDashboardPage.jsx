import { useState } from 'react'
import { useDomainCache } from '../hooks/useDomainCache'
import DomainTile from '../components/dashboard/DomainTile'
import DomainDetailPanel from '../components/dashboard/DomainDetailPanel'
import KpiStrip from '../components/dashboard/KpiStrip'
import LeadershipDeck from '../components/dashboard/LeadershipDeck'
import LiveSignalFeed from '../components/dashboard/LiveSignalFeed'
import ChannelIntelligence from '../components/dashboard/ChannelIntelligence'

const VIEW_PROFILES = {
  enterprise: { label: 'Enterprise view', text: 'External intelligence for Digital Product, Digital Marketing, Loyalty and B2C decision support.', pill: 'Risk · Revenue · Opportunity' },
  b2c: { label: 'Digital/B2C view', text: 'Prioritises direct growth, loyalty, product, digital demand capture and customer revenue opportunities.', pill: 'Direct · Loyalty · Product · UCP' },
}

/**
 * Port of the main 14-domain Intelligence dashboard — the read-only cache
 * path only (tiles, detail panel, KPI strip, leadership deck, live feed,
 * channel intelligence, view-mode toggle). Deliberately excludes Refresh-
 * all/Resume (live Claude domain-scan generation), the "Plan →" per-signal
 * action-plan modal, and inline chat — all separate, costlier live-AI
 * features scoped out after confirming with the user. See useDomainCache
 * and utils/domainSignal.js for the traced source lines.
 */
export default function IntelligenceDashboardPage() {
  const [viewMode, setViewMode] = useState('b2c')
  const { domData, domains, loading, loadedCount, status } = useDomainCache(viewMode)
  const [selectedDomain, setSelectedDomain] = useState(null)

  const profile = VIEW_PROFILES[viewMode]

  function selectDomain(id) {
    setSelectedDomain((current) => (current === id ? null : id))
  }

  return (
    <div>
      <div className="view-notice">
        <div className="vn-left">
          <div className="vn-dot" />
          <div>
            <div className="vn-title">{profile.label}</div>
            <div className="vn-text">{profile.text}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="view-btn" onClick={() => setViewMode('enterprise')} style={{ fontWeight: viewMode === 'enterprise' ? 700 : 400 }}>🏢 Enterprise</button>
          <button className="view-btn" onClick={() => setViewMode('b2c')} style={{ fontWeight: viewMode === 'b2c' ? 700 : 400 }}>⚡ B2C</button>
          <span className="vn-pill">{profile.pill}</span>
        </div>
      </div>

      <div className="bm-notice">
        <div className="bm-txt">
          <strong>Backend/cache-first data transparency:</strong> {status}
        </div>
      </div>

      <LeadershipDeck domData={domData} domains={domains} onOpenDomain={selectDomain} />

      <KpiStrip domData={domData} domains={domains} viewMode={viewMode} />

      <div className="sec-row">
        <span className="sec-lbl">14 intelligence domains</span>
        <span className="sec-hint">{loading ? 'Loading saved intelligence…' : `${loadedCount}/14 domains loaded from backend cache`}</span>
      </div>

      <div className="dom-grid">
        {domains.map((id) => (
          <DomainTile key={id} id={id} data={domData[id]} active={selectedDomain === id} onClick={() => selectDomain(id)} />
        ))}
      </div>

      <DomainDetailPanel id={selectedDomain} data={selectedDomain ? domData[selectedDomain] : null} onClose={() => setSelectedDomain(null)} />

      <div className="bot">
        <LiveSignalFeed domData={domData} domains={domains} />
        <ChannelIntelligence domData={domData} />
      </div>
    </div>
  )
}
