/** Port of renderSent (scripts/customer-os.js:471-480). */
export default function SentimentDetail({ source }) {
  if (!source) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)', background: 'var(--su)', border: '1px solid var(--bo)', borderRadius: 'var(--r3)' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)', marginBottom: 6 }}>Select a source to view cache-backed sentiment</div>
        <div style={{ fontSize: 11, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          The system uses backend/cache payloads for source-specific sentiment and shows explicit no-data states when
          a source payload is missing.
        </div>
      </div>
    )
  }

  const sc = source.overallSentiment || 60
  const scColor = sc >= 70 ? '#1abc9c' : sc >= 50 ? '#C8A050' : '#e74c3c'
  const freqClass = (f) => (f === 'High' ? 'sf-high' : f === 'Medium' ? 'sf-med' : 'sf-low')

  return (
    <div className="sent-detail">
      <div className="sent-det-hdr">
        <div>
          <div className="sent-det-title">{source.meta?.name || source.sourceName} Sentiment Analysis</div>
          <div className="sent-det-sub">{source.totalMentions} mentions analysed — Top complaint: {source.topComplaint}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: scColor }}>{sc}%</div>
          <div style={{ fontSize: 10, color: 'var(--t3)' }}>{source.sentimentLabel}</div>
        </div>
      </div>

      {(source.verbatims || []).length > 0 && (
        <div style={{ padding: '14px 18px', background: 'var(--bg2)', borderBottom: '1px solid var(--bo)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Customer verbatims
          </div>
          {source.verbatims.map((v, idx) => (
            <div key={idx} style={{ padding: '8px 10px', background: 'var(--bg2)', borderLeft: `2px solid ${source.meta?.color || 'var(--qb)'}`, borderRadius: '0 4px 4px 0', fontSize: 10, color: 'var(--t2)', fontStyle: 'italic', marginBottom: 6 }}>
              "{v}"
            </div>
          ))}
        </div>
      )}

      <div className="sent-body">
        <div className="sent-col">
          <div className="sent-col-t" style={{ color: '#e74c3c' }}>Pain Points ({(source.painPoints || []).length})</div>
          {(source.painPoints || []).map((p, idx) => (
            <div className="sent-item" key={idx}>
              <div className="sent-dot" style={{ background: '#e74c3c' }} />
              <div className="sent-item-b">
                <div className="sent-item-t">{p.title}</div>
                <div className="sent-item-d">{p.detail}</div>
                <div><span className={`sent-item-freq ${freqClass(p.frequency)}`}>{p.frequency} freq</span></div>
                <div className="sent-item-src">Impact: {p.impact}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="sent-col">
          <div className="sent-col-t" style={{ color: '#1abc9c' }}>Strengths ({(source.strengths || []).length})</div>
          {(source.strengths || []).map((s, idx) => (
            <div className="sent-item" key={idx}>
              <div className="sent-dot" style={{ background: '#1abc9c' }} />
              <div className="sent-item-b">
                <div className="sent-item-t">{s.title}</div>
                <div className="sent-item-d">{s.detail}</div>
                <div><span className={`sent-item-freq ${freqClass(s.frequency)}`}>{s.frequency} freq</span></div>
              </div>
            </div>
          ))}
        </div>
        <div className="sent-col">
          <div className="sent-col-t" style={{ color: '#C8A050' }}>Improvements ({(source.improvements || []).length})</div>
          {(source.improvements || []).map((i, idx) => (
            <div className="sent-item" key={idx}>
              <div className="sent-dot" style={{ background: '#C8A050' }} />
              <div className="sent-item-b">
                <div className="sent-item-t">{i.title}</div>
                <div className="sent-item-d">{i.detail}</div>
                <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                  <span className={`sent-item-freq ${i.effort === 'Quick win' ? 'sf-low' : i.effort === 'Medium' ? 'sf-med' : 'sf-high'}`}>{i.effort}</span>
                  <span className="sent-item-freq sf-low">{i.value}</span>
                </div>
                <div className="sent-item-src">Owner: {i.owner}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
