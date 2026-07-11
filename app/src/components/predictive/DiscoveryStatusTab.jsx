/** Port of renderPredictiveDiscoveryStatus (radar-core.js:5703-5729). */
export default function DiscoveryStatusTab({ discovery, loading, onRefresh }) {
  if (loading && !discovery) return <div className="exec-empty">Loading discovery status.</div>
  const d = discovery || {}
  if (!Object.keys(d).length) {
    return <div className="exec-empty">Discovery status is not available yet. The backend endpoint is expected at <code>/api/discovery/status</code>.</div>
  }

  const s = d.latestDiscoverySummary || {}
  const cards = [
    { v: d.enabled ? 'On' : 'Off', l: 'source discovery', d: d.enabled ? 'Backend discovery is enabled' : 'Enable backend discovery in server settings' },
    { v: s.sourcesChecked ?? 0, l: 'Sources checked', d: 'Latest source discovery run' },
    { v: s.sourceItemsSaved ?? 0, l: 'Items saved', d: 'External evidence added to source items' },
    { v: d.sourceCount || 0, l: 'Tracked sources', d: 'Source freshness ledger rows' },
    { v: d.staleSourceCount || 0, l: 'Stale sources', d: 'Need refresh before leadership proof' },
  ]
  const sources = d.sourceLedger || []

  return (
    <div className="exec-panel">
      <div className="exec-panel-h">
        <div>
          <div className="exec-panel-t">Discovery status</div>
          <div className="exec-panel-m">External source freshness and evidence base for Innovation Radar</div>
        </div>
        <button className="exec-refresh" onClick={onRefresh}>Refresh status</button>
      </div>
      <div className="roadmap-kpis" style={{ marginBottom: 14 }}>
        {cards.map((c, i) => (
          <div className="roadmap-kpi" key={i}>
            <div className="roadmap-kv">{c.v}</div>
            <div className="roadmap-kl">{c.l}</div>
            <div className="roadmap-kd">{c.d}</div>
          </div>
        ))}
      </div>
      <div className="predict-tabs-note">
        <strong>Discovery proof:</strong> {(s.providerChain || []).join(' -> ') || 'Not recorded'}. Source search: {s.claudeWebSearchRan ? 'ran' : 'not recorded'}. Signal scoring: {s.openaiRan ? 'ran' : 'not recorded'}.
      </div>
      {sources.length > 0 ? (
        sources.slice(0, 8).map((row, i) => {
          const name = row.source_name || row.source_id || row.source_type || 'Source'
          const latest = row.updated_at || row.last_seen_at || row.last_item_at || row.created_at
          return (
            <div className="exec-signal" key={i}>
              <div className="exec-dot" />
              <div>
                <div className="exec-sig-title">{name}</div>
                <div className="exec-sig-body">{row.source_type || 'Source ledger row'}</div>
                <div className="exec-tags">
                  <span className="exec-tag">{latest ? new Date(latest).toLocaleString() : 'No timestamp'}</span>
                  <span className="exec-tag">{row.freshness_state || row.status || 'freshness TBC'}</span>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <div className="exec-empty">No source ledger rows returned yet.</div>
      )}
    </div>
  )
}
