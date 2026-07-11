import { useState } from 'react'
import { useSentimentSources } from '../hooks/useSentimentSources'
import { CIOS_SOURCES, SENT_META } from '../api/sentimentSources'
import SourceTile from '../components/SourceTile'
import SentimentDetail from '../components/SentimentDetail'
import SentimentTrajectoryChart from '../components/SentimentTrajectoryChart'

/** Port of components/04-sentiment.html + its render logic in customer-os.js. */
export default function SentimentPage() {
  const { sources, loading } = useSentimentSources('b2c')
  const [selectedKey, setSelectedKey] = useState(null)

  const byKey = Object.fromEntries(sources.map((s) => [s.sourceKey, s]))
  const scores = sources.map((s) => s.overallSentiment).filter((v) => v != null)
  const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const overallColor = overall == null ? undefined : overall >= 70 ? '#1abc9c' : overall >= 50 ? '#C8A050' : '#e74c3c'
  const selectedSource = selectedKey ? byKey[selectedKey] : null

  return (
    <div className="sent-page visible">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div className="sent-hdr-t">Customer Sentiment Intelligence</div>
          <div className="sent-hdr-s">
            Aggregated voice-of-customer from 13 public platforms — pain points, praise, recurring complaints, and
            specific improvement signals. Sources marked{' '}
            <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, color: '#B45309', background: '#FEF3C7', borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle' }}>EST</span>{' '}
            have no live data connection yet — their score is estimated from other cached signals, not real platform
            content.
          </div>
        </div>
      </div>

      <SentimentTrajectoryChart />

      {overall != null && (
        <div className="sent-gauge" style={{ display: 'flex' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>Overall Sentiment Score</div>
            <div style={{ fontSize: 10, color: 'var(--t2)' }}>Weighted across all loaded sources</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="sent-gauge-bar"><div className="sent-gauge-fill" style={{ width: `${overall}%`, background: overallColor }} /></div>
            <div className="sent-gauge-labels"><span>Very Negative</span><span>Neutral</span><span>Very Positive</span></div>
          </div>
          <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--t1)' }}>{overall}</div>
            <div style={{ fontSize: 9, color: 'var(--t3)' }}>/100</div>
          </div>
        </div>
      )}

      <div className="sent-sources">
        {CIOS_SOURCES.map((key) => (
          <SourceTile
            key={key}
            sourceKey={key}
            meta={SENT_META[key]}
            score={byKey[key]?.overallSentiment ?? null}
            loading={loading}
            hasData={!!byKey[key]}
            active={selectedKey === key}
            onClick={() => setSelectedKey(key)}
          />
        ))}
      </div>

      <SentimentDetail source={selectedSource} />
    </div>
  )
}
