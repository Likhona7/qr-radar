import { featureEvidenceItems, qualityGuardrailItems, sourceItemText, sourceItemUrl, featureActionFor } from '../../utils/predictive'

/**
 * Port of renderPredictiveAppIntel (radar-core.js:5635-5677). The
 * "decisionCards" block (evidenceBackedInnovationFallbacks-derived) is
 * deliberately NOT ported — same honest-empty-state scope decision as
 * InnovationRadarTab.
 */
export default function CompetitorFeaturesTab({ appIntel, loading, onRefresh }) {
  const items = appIntel?.items || []
  const coverage = appIntel?.coverage || []

  if (loading && !appIntel) return <div className="exec-empty">Loading competitor feature evidence.</div>

  return (
    <div className="exec-panel">
      <div className="exec-panel-h">
        <div>
          <div className="exec-panel-t">Competitor feature intelligence</div>
          <div className="exec-panel-m">What rival apps, digital products and service experiences are doing right, and whether QR should deploy, test or watch</div>
        </div>
        <button className="exec-refresh" onClick={onRefresh}>Refresh feature evidence</button>
      </div>

      {!items.length && !coverage.length ? (
        <div className="exec-empty">No competitor feature evidence is available yet. Discovery should look for competitor app launches, award-winning experiences, loyalty features, premium service tools, partner app experiences and digital product moves.</div>
      ) : (
        <>
          <div className="predict-tabs-note"><strong>Decision rule:</strong> show what competitors and partners are doing well first. Use bad reviews only as guardrails for what QR should avoid.</div>
          {coverage.length > 0 && (
            <div className="roadmap-kpis" style={{ marginBottom: 14 }}>
              {coverage.slice(0, 4).map((c, i) => (
                <div className="roadmap-kpi" key={i}>
                  <div className="roadmap-kv">{c.count || c.items || 0}</div>
                  <div className="roadmap-kl">{c.source || c.sourceType || 'Source'}</div>
                  <div className="roadmap-kd">{c.latestAt ? `Latest ${new Date(c.latestAt).toLocaleDateString()}` : 'Freshness TBC'}</div>
                </div>
              ))}
            </div>
          )}
          <FeatureRows items={items} />
        </>
      )}
    </div>
  )
}

function FeatureRows({ items }) {
  const featureItems = featureEvidenceItems(items).slice(0, 8)
  const guardrails = qualityGuardrailItems(items)

  return (
    <>
      {featureItems.length > 0 ? (
        <div className="exec-panel" style={{ marginTop: 14 }}>
          <div className="exec-panel-h">
            <div>
              <div className="exec-panel-t">Feature source evidence</div>
              <div className="exec-panel-m">Positive or useful competitor and partner moves behind the recommendations</div>
            </div>
          </div>
          {featureItems.map((item, i) => {
            const text = sourceItemText(item)
            const url = sourceItemUrl(item)
            return (
              <div className="exec-signal" key={i}>
                <div className="exec-dot" />
                <div>
                  <div className="exec-sig-title">{item.title || item.source_name || item.source_type || 'Feature evidence item'}</div>
                  <div className="exec-sig-body">{(item.summary || item.body || text || 'Competitor or partner feature evidence').slice(0, 240)}</div>
                  <div className="exec-tags">
                    <span className="exec-tag">{item.source_type || 'source'}</span>
                    <span className="exec-tag">{item.source_name || 'feature evidence'}</span>
                    <span className="exec-tag">{featureActionFor(text)}</span>
                  </div>
                  {url && <div className="predict-source-row"><a className="predict-source-link" href={url} target="_blank" rel="noopener noreferrer">Open feature source</a></div>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="predict-empty-premium">
          <strong>No positive feature evidence yet</strong>
          <span>The current app evidence is mostly review or quality data. Run discovery with feature-benchmark prompts so Radar can find launches, awards, loyalty features, premium service improvements and partner-enabled product moves.</span>
        </div>
      )}
      {guardrails.length > 0 && (
        <div className="predict-empty-premium" style={{ marginTop: 14 }}>
          <strong>Quality guardrails, not headline ideas</strong>
          <span>{guardrails.length} review or complaint signals were detected. Radar keeps them as avoid/reliability checks so QR does not copy a weak rival pattern, but they no longer drive the feature recommendation view.</span>
        </div>
      )}
    </>
  )
}
