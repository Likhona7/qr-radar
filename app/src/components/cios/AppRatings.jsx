import { itemDetail, itemSource, itemTitle } from '../../utils/signal'
import { severityClassName, severityFromItem, severityLabel, severityRank } from '../../utils/severity'

/**
 * Fixes bug #1: legacy ciosAppRatings (visual-fixes.js:560-580) sorted by and
 * displayed ciosScoreFromItem's output as "NN/100" — a 4-bucket keyword
 * regex, not a real rating. Airline app reviews almost always hit the
 * negative-keyword bucket, so nearly every card showed the same "88/100".
 * This shows the qualitative label (from utils/severity.js) instead, and
 * still sorts by severityRank so the most urgent card leads.
 */
export default function AppRatings({ items }) {
  const limited = items.slice(0, 8)
  if (!limited.length) {
    return <div className="empty-d"><div className="et">No app rating intelligence loaded from backend/cache.</div></div>
  }

  const appleCount = limited.filter((i) => /apple|app store|ios|iphone/i.test(`${itemSource(i)} ${itemTitle(i)}`.toLowerCase())).length
  const googleCount = limited.filter((i) => /google|play store|google play|android/i.test(`${itemSource(i)} ${itemTitle(i)}`.toLowerCase())).length
  const sorted = [...limited].sort((a, b) => severityRank(severityFromItem(b)) - severityRank(severityFromItem(a)))
  const top = sorted[0]

  return (
    <div>
      <div className="cios-app-summary">
        <div>
          <div className="cios-app-summary-ey">App review intelligence</div>
          <div className="cios-app-summary-title">{itemTitle(top)}</div>
          <div className="cios-app-summary-copy">
            Backend/cache signals are grouped into app review streams and converted into product actions. This does
            not claim official star ratings — the backend has no numeric rating field for these sources yet.
          </div>
        </div>
        <div className="cios-app-summary-kpis">
          <div><strong>{limited.length}</strong><span>app signals</span></div>
          <div><strong>{appleCount}</strong><span>Apple lane</span></div>
          <div><strong>{googleCount}</strong><span>Google lane</span></div>
        </div>
      </div>
      <div className="cios-app-grid">
        {sorted.map((i, idx) => {
          const bucket = severityFromItem(i)
          const source = itemSource(i)
          const title = itemTitle(i)
          const stream = /apple|ios/i.test(`${source} ${title}`) ? 'iPhone review stream' : /google|android/i.test(`${source} ${title}`) ? 'Android review stream' : 'App review stream'
          const action = bucket === 'critical' ? 'Escalate product fixes and review response.' : bucket === 'monitor' ? 'Track rating movement and recurring complaint themes.' : 'Monitor the app rating trend weekly.'
          return (
            <div className="cios-app-card" key={`${source}-${idx}`}>
              <div className="cios-app-top">
                <div>
                  <div className="cios-app-stream">{stream}</div>
                  <div className="cios-app-title">{title}</div>
                  <div className="cios-app-sub">{source}</div>
                </div>
                <div className={`radar-severity-label ${severityClassName(bucket)}`}>{severityLabel(bucket)}</div>
              </div>
              <div className="cios-app-body">{itemDetail(i)}</div>
              <div className="cios-app-action"><span>Action</span>{action}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
