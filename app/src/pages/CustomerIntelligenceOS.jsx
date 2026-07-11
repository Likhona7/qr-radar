import { useState } from 'react'
import TabNav from '../components/TabNav'
import SourceBreakdown from '../components/SourceBreakdown'
import { useSentimentSources } from '../hooks/useSentimentSources'
import { useCIOSSignals } from '../hooks/useCIOSSignals'
import ComplaintHeatmap from '../components/cios/ComplaintHeatmap'
import AudienceIntel from '../components/cios/AudienceIntel'
import Keywords from '../components/cios/Keywords'
import GrowingConversations from '../components/cios/GrowingConversations'
import CompetitorPerception from '../components/cios/CompetitorPerception'
import ProductRequests from '../components/cios/ProductRequests'
import AppRatings from '../components/cios/AppRatings'
import OtaLeakageRisk from '../components/cios/OtaLeakageRisk'
import Opportunities from '../components/cios/Opportunities'
import ExecutiveNarrative from '../components/cios/ExecutiveNarrative'

const TABS = [
  { key: 'heatmap', label: 'Complaint heatmap', countKey: 'heatmap' },
  { key: 'audience', label: 'Audience intel', countKey: 'audience' },
  { key: 'keywords', label: 'Keywords', countKey: 'keywords' },
  { key: 'growing', label: 'Growing conversations' },
  { key: 'competitor', label: 'Competitor perception' },
  { key: 'requests', label: 'Product requests', countKey: 'requests' },
  { key: 'appratings', label: 'App ratings', countKey: 'appratings' },
  { key: 'ota', label: 'OTA leakage risk' },
  { key: 'opps', label: 'Opportunities' },
  { key: 'narrative', label: 'Executive narrative' },
]

export default function CustomerIntelligenceOS() {
  const { sources, loading } = useSentimentSources('b2c')
  const cios = useCIOSSignals(sources)
  const [activeTab, setActiveTab] = useState('heatmap')

  const scores = sources.map((s) => s.overallSentiment).filter((v) => v != null)
  const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const criticalCount = cios.issues.filter((i) => `${i.impact || ''}`.toLowerCase().match(/critical|risk|refund/)).length

  const tabItems = TABS.map((t) => ({ ...t, badge: t.countKey != null ? cios.counts[t.countKey] : undefined }))

  return (
    <div className="cios-page visible">
      <div className="cios-mast">
        <div className="cios-mast-top">
          <div>
            <div className="cios-eyebrow">Qatar Airways · Intelligence OS · External Only</div>
            <div className="cios-title">Customer Intelligence<br />Operating System</div>
            <div className="cios-sub">
              Voice-of-customer from 13 live public platforms — no NPS or internal data required. Every insight
              derived from what passengers say publicly, classified and ranked for commercial action.
            </div>
          </div>
          <div className="cios-live-pill"><div className="cios-live-dot" /><span className="cios-live-txt">Live · 13 sources</span></div>
        </div>
        <div className="cios-score-strip">
          <div className="cios-ss-cell">
            <div className="cios-big-n">{overall ?? '-'}</div>
            <div className="cios-big-l">Overall · /100</div>
          </div>
          <div className="cios-bar-wrap">
            <div className="cios-bar-track"><div className="cios-bar-fill" style={{ width: `${overall || 0}%` }} /></div>
            <div className="cios-bar-labels"><span>Very negative</span><span>Neutral</span><span>Very positive</span></div>
          </div>
          <div className="cios-stat"><div className="cios-stat-n" style={{ color: 'var(--red)' }}>{criticalCount || '-'}</div><div className="cios-big-l">Critical</div></div>
          <div className="cios-stat"><div className="cios-stat-n">{cios.allSignals.length || '-'}</div><div className="cios-big-l">Signals</div></div>
          <div className="cios-stat"><div className="cios-stat-n">{sources.length}/13</div><div className="cios-big-l">Sources</div></div>
        </div>
      </div>

      <SourceBreakdown sources={sources} loading={loading} updatedLabel="Updated 06:00 DOH daily" />

      <TabNav level="secondary" items={tabItems} activeKey={activeTab} onChange={setActiveTab} />

      <div className="cios-body">
        {activeTab === 'heatmap' && <ComplaintHeatmap items={cios.heatmap} />}
        {activeTab === 'audience' && <AudienceIntel items={cios.audience} />}
        {activeTab === 'keywords' && <Keywords keywordCounts={cios.keywordCounts} />}
        {activeTab === 'growing' && <GrowingConversations items={cios.growing} />}
        {activeTab === 'competitor' && <CompetitorPerception items={cios.competitor} />}
        {activeTab === 'requests' && <ProductRequests items={cios.requests} />}
        {activeTab === 'appratings' && <AppRatings items={cios.appRatings} />}
        {activeTab === 'ota' && <OtaLeakageRisk items={cios.ota} />}
        {activeTab === 'opps' && <Opportunities items={cios.opportunities} />}
        {activeTab === 'narrative' && (
          <ExecutiveNarrative sources={sources} issues={cios.issues} improvements={cios.improvements} strengths={cios.strengths} />
        )}
      </div>
    </div>
  )
}
