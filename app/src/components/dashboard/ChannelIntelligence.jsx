import { useMemo, useState } from 'react'
import { isRiskSignal, getCommercialImpactScore } from '../../utils/domainSignal'
import { DOM_LABELS_SHORT } from '../../utils/domainMeta'

const CHANNEL_DOMAINS = ['agt', 'dig', 'rev', 'loy', 'prd']
const CHANNEL_RE = /direct|booking|conversion|app|web|ota|agent|gds|ndc|loyalty|ancillary|campaign|payment|checkout|mobile|channel/i

/** Port of loadChannelIntel + renderChannelIntel (radar-core.js:5868-6139). */
export default function ChannelIntelligence({ domData }) {
  const [refreshedAt, setRefreshedAt] = useState(() => new Date().toLocaleDateString('en-GB'))

  const channelSignals = useMemo(() => {
    const rows = []
    CHANNEL_DOMAINS.forEach((id) => {
      const d = domData[id]
      if (!d?.signals) return
      d.signals.forEach((s) => {
        const txt = `${s.title || ''} ${s.body || ''} ${s.whyItMattersNow || ''}`.toLowerCase()
        if (CHANNEL_RE.test(txt) || ['agt', 'dig', 'rev'].includes(id)) rows.push({ domain: id, signal: s, domainData: d })
      })
    })
    return rows.sort((a, b) => getCommercialImpactScore(b.signal) - getCommercialImpactScore(a.signal))
  }, [domData])

  const cached = channelSignals[0]?.domainData || domData.agt || domData.rev || domData.dig

  return (
    <div className="bcard">
      <div className="bct">
        <span className="ld" style={{ flexShrink: 0 }} />
        Channel intelligence — live verified data
        <button onClick={() => setRefreshedAt(new Date().toLocaleDateString('en-GB'))} style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '4px 12px', background: 'var(--qb)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>
      {channelSignals.length ? (
        <ChannelBody
          headline={cached?.opp?.title || 'Saved channel intelligence loaded from backend cache'}
          refreshed={refreshedAt}
          directShare={{ estimate: 'Cached', source: 'Supabase backend', confidence: 'Medium', note: cached?.opp?.body || 'Backend-first mode' }}
          signals={channelSignals.slice(0, 6).map((row) => {
            const s = row.signal
            return {
              title: s.title, body: s.body || s.whyItMattersNow,
              type: isRiskSignal(s) ? 'ota_risk' : 'direct_growth',
              impact: isRiskSignal(s) ? 'negative' : 'positive',
              value: s.impactLabel || '', source: s.source || DOM_LABELS_SHORT[row.domain] || 'Backend cache',
              sourceUrl: s.sourceUrl || '', verified: !!s.verified,
            }
          })}
        />
      ) : (
        <div className="ch-empty" style={{ padding: 18, border: '1px solid var(--bo)', borderRadius: 14, background: '#fff' }}>
          <div style={{ fontWeight: 700, color: 'var(--qb)', marginBottom: 6 }}>Channel intelligence cache not loaded yet</div>
          <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
            Radar is running in backend/cache-first mode. Refresh the relevant domains or load Supabase cache to populate channel intelligence.
          </div>
        </div>
      )}
    </div>
  )
}

const TYPE_COLORS = { direct_growth: 'cp-g', ota_risk: 'cp-r', gds_cost: 'cp-a', competitor: 'cp-b', industry: 'cp-b' }
const IMPACT_COLOR = { positive: 'var(--grn)', negative: 'var(--red)', neutral: 'var(--amb)' }

function ChannelBody({ headline, refreshed, directShare, signals }) {
  return (
    <div>
      <div style={{ background: 'var(--gbg)', border: '0.5px solid var(--gb)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--grn)', flexShrink: 0 }} />
        <div style={{ fontSize: 11, color: 'var(--grn)', fontWeight: 500, flex: 1 }}>{headline}</div>
        <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{refreshed}</div>
      </div>
      <div className="ch-kpi-row" style={{ marginBottom: 12 }}>
        <div className="ch-kpi" style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg,rgba(92,6,50,.05),transparent)', borderColor: 'rgba(92,6,50,.2)' }}>
          <div className="ch-kv" style={{ fontSize: 22 }}>{directShare.estimate}</div>
          <div className="ch-kl">Direct booking share</div>
          <div className="ch-kb">{directShare.confidence} confidence · {directShare.source}</div>
          {directShare.note && <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 3, lineHeight: 1.3 }}>{directShare.note}</div>}
        </div>
        <div className="ch-kpi" style={{ gridColumn: 'span 2', background: 'var(--bg3)' }}>
          <div className="ch-kv" style={{ color: 'var(--amb)' }}>-</div>
          <div className="ch-kl">Direct shift value</div>
          <div className="ch-kb">Requires backend value model</div>
        </div>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>Live channel signals</div>
      <div className="ch-live-row">
        {signals.map((s, i) => (
          <div className="ch-sig" key={i}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: IMPACT_COLOR[s.impact] || 'var(--t3)' }} />
              <div style={{ flex: 1 }}>
                <div className="ch-sig-t">{s.title}</div>
                <div className="ch-sig-b">{s.body}</div>
                <div className="ch-sig-row">
                  {s.value && <span className="ch-badge cp-g">{s.value}</span>}
                  <span className={`ch-badge ${TYPE_COLORS[s.type] || 'cp-b'}`}>{String(s.type || '').replace(/_/g, ' ')}</span>
                  {s.verified && <span className="ch-badge cp-g">Verified</span>}
                  {s.sourceUrl && <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: 'var(--qb)', padding: '2px 6px', border: '0.5px dashed var(--bo2)', borderRadius: 3 }}>Verify →</a>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
