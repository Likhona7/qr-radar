import { partnerFeatureIdeas, safeUrl } from '../../utils/predictive'

/** Port of renderPredictivePartnerIdeas (radar-core.js:5690-5702). */
export default function PartnerOpportunitiesTab({ partnerProof, loading, onRefresh }) {
  const partnerNetwork = partnerProof?.partnerNetwork || {}
  const liveOpps = partnerNetwork.topOpportunities || []
  const ideas = partnerFeatureIdeas()

  if (loading && !partnerProof) return <div className="exec-empty">Loading partner feature evidence.</div>

  return (
    <div className="exec-panel">
      <div className="exec-panel-h">
        <div>
          <div className="exec-panel-t">Partner-enabled innovation</div>
          <div className="exec-panel-m">Useful features QR can build faster by using partner network, loyalty and journey data</div>
        </div>
        <button className="exec-refresh" onClick={onRefresh}>Refresh partner proof</button>
      </div>

      <div className="predict-tabs-note">
        <strong>Partner data used:</strong> Radar partner catalogue plus live partner proof where available. {partnerNetwork.opportunityCount || 0} partner-linked live opportunities currently detected.
      </div>

      <div className="predict-operating-grid">
        {ideas.map((i, idx) => (
          <div className="future-card" key={idx}>
            <div className="future-title">{i.t}</div>
            <div className="future-body">{i.b}</div>
            <div className="future-body"><strong>Recommended decision:</strong> {i.decision || 'Evaluate partner pilot'}</div>
            <div className="future-body"><strong>Business value:</strong> {i.impact}</div>
            <div className="future-body"><strong>Useful partners:</strong> {i.partners || 'Partner network'}</div>
            <div className="future-tags"><span>{i.owner}</span><span>{i.decision || 'Partner-enabled'}</span><span>Business-case ready</span></div>
          </div>
        ))}
      </div>

      {liveOpps.length > 0 && (
        <div className="exec-panel" style={{ marginTop: 14 }}>
          <div className="exec-panel-h">
            <div>
              <div className="exec-panel-t">Live partner proof</div>
              <div className="exec-panel-m">Signals from /api/partner-competitor/proof</div>
            </div>
          </div>
          {liveOpps.slice(0, 5).map((o, i) => {
            const url = safeUrl(o.sourceUrl || o.url || '')
            return (
              <div className="exec-signal" key={i}>
                <div className="exec-dot" />
                <div>
                  <div className="exec-sig-title">{o.title || 'Partner opportunity'}</div>
                  <div className="exec-sig-body">{o.action || o.expectedImpact || o.evidence || 'Review partner signal.'}</div>
                  <div className="exec-tags">
                    <span className="exec-tag">{o.domainId || 'partner'}</span>
                    <span className="exec-tag">{o.sourceFreshness || 'freshness TBC'}</span>
                  </div>
                  {url && <div className="predict-source-row"><a className="predict-source-link" href={url} target="_blank" rel="noopener noreferrer">Open partner proof</a></div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
