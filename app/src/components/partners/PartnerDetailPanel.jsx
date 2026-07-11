/** Port of renderPartnerDetail (radar-core.js:4084-4143). */
export default function PartnerDetailPanel({ id, meta, onOpenExecSummary, onOpenCompetitors }) {
  if (!id || !meta) {
    return (
      <aside className="partner-detail">
        <div className="partner-empty">
          <div className="partner-detail-mark">P</div>
          <div className="partner-detail-title">Select a partner</div>
          <div className="partner-detail-copy">
            Choose any partner airline to see why it matters to Qatar Airways, what Radar should render, and which action is most useful for the business.
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="partner-detail">
      <div className="partner-detail-head">
        <div>
          <div className="partner-detail-badge">{meta.relationship || meta.group || 'partner network'}</div>
          <h3>{meta.name || id}</h3>
          <div className="partner-detail-sub">{meta.hub} · {meta.coverage}</div>
        </div>
        <span className="partner-score">{meta.score || 0}/100</span>
      </div>
      <div className="partner-detail-sub">{meta.why}</div>
      <div className="partner-detail-note">
        <strong>Why it matters:</strong> {meta.value}
        <div style={{ marginTop: 6 }}>This page deliberately excludes raw schedules, revenue-share terms, seat inventory, and internal commercial agreements.</div>
      </div>
      <div className="partner-chip-row" style={{ marginTop: 12 }}>
        {(meta.tags || []).map((tag, i) => <span className="partner-chip" key={i}>{tag}</span>)}
      </div>
      <div className="partner-detail-grid">
        <div className="partner-detail-box">
          <div className="partner-detail-box-title">Useful company fields</div>
          <ul>
            <li>Partner airline name</li><li>Relationship type</li><li>Coverage and hub</li>
            <li>Opportunity score</li><li>Loyalty / Avios leverage</li><li>Recommended action</li>
          </ul>
        </div>
        <div className="partner-detail-box">
          <div className="partner-detail-box-title">Signals to watch</div>
          <ul>{(meta.signals || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div className="partner-detail-box">
          <div className="partner-detail-box-title">Recommended actions</div>
          <ul>{(meta.actions || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
        <div className="partner-detail-box">
          <div className="partner-detail-box-title">Radar rendering focus</div>
          <ul>
            <li>Partner name and relationship</li><li>Route and market coverage</li>
            <li>Loyalty / Avios value</li><li>External news and connection signals</li>
            <li>Useful follow-up for Qatar Airways</li>
          </ul>
        </div>
      </div>
      <div className="partner-detail-actions">
        <button type="button" className="partner-action" onClick={onOpenExecSummary}>Open executive view</button>
        <button type="button" className="partner-action" onClick={onOpenCompetitors}>Compare competitors</button>
      </div>
    </aside>
  )
}
