import { useState } from 'react'
import TabNav from '../components/TabNav'
import { usePredictiveInnovation } from '../hooks/usePredictiveInnovation'
import { usePredictiveAux } from '../hooks/usePredictiveAux'
import InnovationRadarTab from '../components/predictive/InnovationRadarTab'
import CompetitorFeaturesTab from '../components/predictive/CompetitorFeaturesTab'
import PartnerOpportunitiesTab from '../components/predictive/PartnerOpportunitiesTab'
import DiscoveryStatusTab from '../components/predictive/DiscoveryStatusTab'

const TABS = [
  { key: 'innovation', label: 'Innovation Radar' },
  { key: 'appintel', label: 'Competitor Features' },
  { key: 'partners', label: 'Partner Opportunities' },
  { key: 'discovery', label: 'Discovery Status' },
]

/**
 * Port of the 4 self-sufficient Predictive Intelligence tabs — each has its
 * own independent backend fetch, unlike the 5th "Predictive Intelligence"
 * inner tab (predictiveCategories/predictiveSignals/simulationConcepts),
 * which depends on the un-migrated main dashboard's domain model and is
 * deliberately not built here (same scope boundary as Executive Summary's
 * skipped panels).
 */
export default function PredictiveIntelligencePage() {
  const [activeTab, setActiveTab] = useState('innovation')
  const innovation = usePredictiveInnovation('b2c')
  const aux = usePredictiveAux('b2c')

  const backendStatusText = innovation.loading && !innovation.data
    ? <><strong>Feature intelligence:</strong> loading competitor and partner feature decisions from <code>/api/innovation-radar</code>.</>
    : innovation.error && !innovation.data
      ? <><strong>Backend attention:</strong> live innovation endpoint is not available yet. {innovation.error}</>
      : innovation.data
        ? (innovation.data.ideas?.length
          ? <><strong>Feature intelligence live:</strong> {innovation.data.ideas.length} feature decisions loaded. {innovation.data.summary?.sourceItemsChecked || 0} competitor/partner/source items checked; {innovation.data.summary?.buildNow || 0} marked deploy or pilot now.</>
          : <><strong>Backend connected:</strong> Innovation Radar responded, but no qualified feature decisions were returned yet.</>)
        : <><strong>Feature intelligence:</strong> ready to load competitor and partner feature evidence from <code>/api/innovation-radar</code>.</>

  return (
    <div className="predict-page visible">
      <div className="predict-hero">
        <div className="exec-eyebrow">Future market anticipation</div>
        <div className="predict-title">Predictive Intelligence &amp; Innovation Radar</div>
        <div className="predict-sub">
          A feature-decision workspace for Qatar Airways: what competitors and partners are doing well, which ideas
          QR should copy, adapt, partner on or watch, and what each move could do for conversion, loyalty, premium
          yield and service cost.
        </div>
      </div>

      <div className="predict-tabs-note">{backendStatusText}</div>

      <TabNav level="secondary" items={TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'innovation' && (
        <InnovationRadarTab innovation={innovation.data} aux={aux} loading={innovation.loading} onRefresh={() => { innovation.reload(); aux.reload() }} />
      )}
      {activeTab === 'appintel' && (
        <CompetitorFeaturesTab appIntel={aux.appIntel} loading={aux.loading} onRefresh={aux.reload} />
      )}
      {activeTab === 'partners' && (
        <PartnerOpportunitiesTab partnerProof={aux.partnerProof} loading={aux.loading} onRefresh={aux.reload} />
      )}
      {activeTab === 'discovery' && (
        <DiscoveryStatusTab discovery={aux.discovery} loading={aux.loading} onRefresh={aux.reload} />
      )}
    </div>
  )
}
