import { fmtMoney, laneOwner, laneAction, laneStatus } from '../../utils/execSignal'

const WINDOW_LABELS = ['0-30 Days', '31-90 Days', '91-180 Days']

/** Port of renderHeat (executive-os-roadmap.js:214-299). */
export default function ExecOpportunityHeatmap({ rows }) {
  if (!rows.length) return <div className="exec-empty">No backend/cache opportunity lanes loaded yet.</div>

  const colTotals = [0, 0, 0]
  rows.forEach((r) => { colTotals[0] += r.windows[0] || 0; colTotals[1] += r.windows[1] || 0; colTotals[2] += r.windows[2] || 0 })
  const grand = colTotals[0] + colTotals[1] + colTotals[2]
  const grandHigh = grand * 1.33
  const laneTotals = rows.map((r) => (r.windows[0] || 0) + (r.windows[1] || 0) + (r.windows[2] || 0))
  const dominantLaneIdx = laneTotals.length ? laneTotals.indexOf(Math.max(...laneTotals)) : -1
  const dominantLane = dominantLaneIdx >= 0 ? rows[dominantLaneIdx] : null
  const dominantWindowIdx = colTotals.indexOf(Math.max(...colTotals))
  const strongestWindow = WINDOW_LABELS[dominantWindowIdx] || WINDOW_LABELS[0]
  const maxLaneTotal = Math.max(...laneTotals, 1)

  return (
    <div className="exec-opp-action-view">
      <div className="exec-opp-verdict">
        <div><span>Best commercial lane</span><strong>{(dominantLane && dominantLane.name) || 'Direct'} - {fmtMoney(dominantLaneIdx >= 0 ? laneTotals[dominantLaneIdx] : 0)}</strong></div>
        <div><span>Best timing window</span><strong>{strongestWindow} - {fmtMoney(colTotals[dominantWindowIdx] || 0)}</strong></div>
        <div><span>Total upside</span><strong>{fmtMoney(grand)}-{fmtMoney(grandHigh)}</strong></div>
      </div>
      <div className="exec-opp-lane-list">
        {rows.map((r, idx) => {
          const windows = r.windows || [0, 0, 0]
          const total = laneTotals[idx] || 0
          const bestIdx = windows.indexOf(Math.max(...windows, 0))
          const bestWindow = WINDOW_LABELS[bestIdx] || strongestWindow
          const status = laneStatus(total)
          const totalPct = Math.max(4, Math.min(100, Math.round((total / maxLaneTotal) * 100)))
          return (
            <article className="exec-opp-lane-card" key={r.name}>
              <div className="exec-opp-lane-head">
                <div>
                  <div className="exec-opp-lane-title">{r.name || 'Opportunity lane'}</div>
                  <div className="exec-opp-lane-sub">{laneOwner(r.name)} - strongest in {bestWindow}</div>
                </div>
                <div className="exec-opp-lane-value"><strong>{fmtMoney(total)}</strong><span className={`exec-opp-state ${status.cls}`}>{status.label}</span></div>
              </div>
              <div className="exec-opp-total-track"><span style={{ width: `${totalPct}%` }} /></div>
              <div className="exec-opp-windows">
                {windows.map((v, i) => {
                  const pct = total ? Math.max(4, Math.round((v / total) * 100)) : 4
                  return (
                    <div className="exec-opp-window" key={i}>
                      <div className="exec-opp-window-label"><span>{WINDOW_LABELS[i]}</span><strong>{fmtMoney(v)}</strong></div>
                      <div className="exec-opp-mini-track"><span style={{ width: `${pct}%` }} /></div>
                    </div>
                  )
                })}
              </div>
              <div className="exec-opp-next"><strong>Next move:</strong> {laneAction(r.name)}</div>
            </article>
          )
        })}
      </div>
      <div className="exec-opp-summary-note">Source: live backend/cache opportunity rows. Values are directional until linked to internal booking and conversion data.</div>
    </div>
  )
}
