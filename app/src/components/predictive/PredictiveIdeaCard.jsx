/** Port of renderPredictiveIdeaCard (radar-core.js:5587-5616). */
export default function PredictiveIdeaCard({ idea }) {
  const ev = idea.evidenceSummary || {}
  const actions = Array.isArray(idea.actionPlan) ? idea.actionPlan : []
  const kpis = Array.isArray(idea.kpis) ? idea.kpis : []
  const tags = [
    idea.decision || idea.opportunityLabel || 'Decision TBC',
    String(idea.priority || 'validate_next').replace(/_/g, ' '),
    String(idea.lens || idea.category || 'innovation').replace(/_/g, ' '),
    idea.owner || 'Owner TBD',
    `${idea.confidenceScore ? `${idea.confidenceScore}% ` : ''}${idea.confidence || 'medium'} confidence`,
  ].filter(Boolean)

  return (
    <div className="predict-idea-card">
      <div className="predict-idea-top">
        <div>
          <div className="predict-idea-ey">{idea.lens || idea.category || 'Innovation'}</div>
          <div className="predict-idea-title">{idea.title || 'Innovation idea'}</div>
        </div>
        <div className="predict-idea-value"><span className="predict-idea-label">Value range</span>{idea.revenueEstimate || 'Value TBC'}</div>
      </div>
      <div className="predict-idea-body">{idea.description || idea.expectedImpact || 'Review innovation idea.'}</div>
      <div className="predict-idea-grid">
        <div className="predict-idea-proof"><strong>Recommended decision</strong>{idea.decision || idea.opportunityLabel || 'Evaluate before roadmap commitment.'}</div>
        <div className="predict-idea-proof"><strong>QR opportunity</strong>{idea.gap || idea.expectedImpact || 'Compare against QR current capability.'}</div>
        <div className="predict-idea-proof"><strong>First move</strong>{idea.firstStep || 'Assign owner and validate impact.'}</div>
        <div className="predict-idea-proof"><strong>Commercial logic</strong>{idea.valueAssumption || 'Directional estimate based on evidence strength and implementation feasibility.'}</div>
        <div className="predict-idea-proof"><strong>Evidence base</strong>{ev.internalMatches || 0} internal, {ev.externalAppOrInnovationItems || 0} external, {ev.competitorMatches || 0} competitor, {ev.partnerMatches || 0} partner.</div>
      </div>
      <div className="predict-idea-body">
        <strong>Working note:</strong>
        {actions.length ? (
          <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
            {actions.slice(0, 4).map((a, i) => <li key={i}>{a.step || 'Action'} <span style={{ color: '#7B7282' }}>({a.timeline || 'TBC'})</span></li>)}
          </ol>
        ) : ' Assign owner, validate impact and create an experiment brief.'}
      </div>
      {kpis.length > 0 && <div className="predict-idea-body"><strong>KPIs:</strong> {kpis.slice(0, 4).join(' | ')}</div>}
      <div className="predict-idea-tags">{tags.map((t, i) => <span key={i}>{t}</span>)}</div>
    </div>
  )
}
