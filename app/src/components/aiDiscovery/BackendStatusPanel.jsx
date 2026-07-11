import { computeBackendStatusCards, computeRunProofRows } from '../../utils/aiDiscoveryStatus'

/** Port of renderAIDiscoveryBackendStatus + renderAIDiscoveryRunProof (radar-core.js:3746-3858). */
export default function BackendStatusPanel({ data, hasLive, loading }) {
  const cards = computeBackendStatusCards(data || {}, hasLive)
  const proofRows = hasLive ? computeRunProofRows(data || {}) : []
  const pillLabel = loading ? 'Checking backend' : hasLive ? 'Backend connected' : 'Backend API pending'

  return (
    <section className="ai-panel ai-wide ai-backend-panel">
      <div className="ai-panel-head">
        <div>
          <div className="ai-panel-title">Live discovery proof</div>
          <div className="ai-panel-copy">Shows the latest backend discovery run, source coverage, saved evidence, created signals and freshness proof.</div>
        </div>
        <span className={`ai-panel-pill ${hasLive ? 'ai-ok' : 'ai-warn'}`}>{pillLabel}</span>
      </div>
      <div className="ai-backend-grid">
        {cards.map((c, i) => (
          <div className="ai-backend-card" key={i}>
            <div className="ai-backend-label">{c.label}</div>
            <div className="ai-backend-value">{c.value}</div>
            <div className="ai-backend-detail">{c.detail}</div>
          </div>
        ))}
      </div>
      <div className="ai-run-proof">
        {!hasLive ? (
          <div className="ai-proof-empty">Connect the backend, then refresh this page to show latest source checks, saved items and created signals.</div>
        ) : !proofRows.length ? (
          <div className="ai-proof-empty">Backend is connected, but no source-level proof rows were returned yet. Run source discovery once, then refresh.</div>
        ) : (
          <>
            <div className="ai-proof-title">Latest source proof</div>
            <div className="ai-proof-list">
              {proofRows.map((row, i) => (
                <div className="ai-proof-row" key={i}>
                  <div><div className="ai-proof-name">{row.name}</div><div className="ai-proof-meta">{row.meta}</div></div>
                  <div className="ai-proof-value">{row.value}</div>
                  <span className="ai-proof-state">{row.state}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
