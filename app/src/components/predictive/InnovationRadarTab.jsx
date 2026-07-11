import { featureEvidenceItems, qualityGuardrailItems } from '../../utils/predictive'
import PredictiveIdeaCard from './PredictiveIdeaCard'

/**
 * Port of renderPredictiveInnovationStats + renderPredictiveInnovationIdeas
 * (radar-core.js:5566-5630). Honest-empty-state variant: shows real live
 * ideas from /api/innovation-radar only — no fabricated fallback cards when
 * the feed returns zero (see utils/predictive.js header for why).
 */
export default function InnovationRadarTab({ innovation, aux, loading, onRefresh }) {
  const ideas = innovation?.ideas || []
  const summary = innovation?.summary || {}
  const partnerIdeas = ideas.filter((i) => i.category === 'partner_growth' || (i.evidenceSummary?.partnerMatches || 0) > 0)
  const appItems = aux?.appIntel?.items || []
  const appCount = aux?.appIntel?.count || summary.sourceItemsChecked || 0
  const featureCount = featureEvidenceItems(appItems).length
  const guardrails = qualityGuardrailItems(appItems).length

  const cards = [
    { v: summary.buildNow || ideas.filter((i) => i.priority === 'build_or_pilot_now').length, l: 'Deploy or pilot now', d: 'Feature bets strong enough for owner review' },
    { v: summary.validateNext || ideas.filter((i) => i.priority === 'validate_next').length, l: 'Evaluate next', d: 'Needs sizing, prototype or proof before investment' },
    { v: partnerIdeas.length, l: 'Partner plays', d: 'Opportunities QR can accelerate through network partners' },
    { v: featureCount || appCount, l: 'Evidence reviewed', d: 'Competitor, app, partner and source items used for feature decisions' },
    { v: guardrails, l: 'Quality guardrails', d: 'Bad reviews kept as avoid/reliability signals, not headline ideas' },
  ]

  return (
    <div>
      <div className="roadmap-kpis">
        {cards.map((c, i) => (
          <div className="roadmap-kpi" key={i}>
            <div className="roadmap-kv">{c.v}</div>
            <div className="roadmap-kl">{c.l}</div>
            <div className="roadmap-kd">{c.d}</div>
          </div>
        ))}
      </div>
      <div className="exec-panel" style={{ marginBottom: 18 }}>
        <div className="exec-panel-h">
          <div>
            <div className="exec-panel-t">Feature decision radar</div>
            <div className="exec-panel-m">Competitor and partner moves translated into QR build, partner, test or watch decisions</div>
          </div>
          <button className="exec-refresh" onClick={onRefresh}>Refresh evidence</button>
        </div>
        {loading && !ideas.length && <div className="exec-empty">Loading innovation ideas from Radar backend.</div>}
        {!loading && !ideas.length && (
          <div className="predict-empty-premium">
            <strong>No live innovation ideas yet</strong>
            <span>The backend hasn't returned any qualified feature decisions from /api/innovation-radar yet. Refresh evidence or run Discovery Monitor, then check back.</span>
          </div>
        )}
        {ideas.length > 0 && (
          <div className="predict-operating-grid">
            {ideas.slice(0, 8).map((idea, i) => <PredictiveIdeaCard idea={idea} key={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
