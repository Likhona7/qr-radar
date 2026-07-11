import { itemTitle } from '../../utils/signal'

/** Port of ciosNarrative (visual-fixes.js:552-558). */
export default function ExecutiveNarrative({ sources, issues, improvements, strengths }) {
  if (!sources.length) {
    return <div className="empty-d"><div className="et">No executive narrative loaded from backend/cache.</div></div>
  }
  const topRisk = issues[0] ? itemTitle(issues[0]) : 'No dominant risk signal loaded'
  const topAction = improvements[0] ? itemTitle(improvements[0]) : 'No action item loaded'
  const topStrength = strengths[0] ? itemTitle(strengths[0]) : 'No strength signal loaded'
  return (
    <div className="cios-narr">
      <div className="cios-narr-ey">Executive narrative — backend/cache only</div>
      <div className="cios-narr-txt">
        Customer intelligence currently shows <strong>{topRisk}</strong> as the most visible risk signal. The
        strongest recommended action is <strong>{topAction}</strong>, while <strong>{topStrength}</strong> should be
        used to balance the leadership narrative with verified signs of brand strength.
      </div>
      <div className="cios-narr-rec">
        <strong>Coverage:</strong> {sources.length} sources loaded · {issues.length} risk signals · {improvements.length} action requests · {strengths.length} strength signals.
      </div>
    </div>
  )
}
