import { queueFromSignals, actionBriefText } from '../../utils/execSignal'

/** Port of renderActionQueueV2 (executive-os-roadmap.js:792-819). */
export default function ExecActionQueue({ signals, onOpenDrawer }) {
  const q = queueFromSignals(signals)
  if (!q.length) return <div className="exec-empty">Action queue will populate from backend/cache signals.</div>

  return (
    <div>
      {q.map((x, i) => (
        <article
          className="exec-action-row exec-clickable"
          key={i}
          onClick={() => onOpenDrawer({ type: 'Action Brief', title: x.title || 'Action', body: actionBriefText(x), meta: [x.tag || 'RADAR', x.owner || 'Owner TBC', `Due ${x.due || 'TBC'}`, x.outcomeStatus || 'Outcome pending'] })}
        >
          <div className="exec-action-main">
            <img className="exec-action-avatar" src="/assets/exec-owner-photo.jpg" alt="Executive owner portrait" loading="eager" decoding="async" />
            <div className="exec-action-rank">{i + 1}</div>
            <div>
              <div className="exec-action-title">{x.title}</div>
              <div className="exec-action-body">{x.body}</div>
              <div className="exec-action-mini-tags">
                <span className={x.status.cls}>{x.status.label}</span>
                <span>{x.impact}</span>
              </div>
              <button type="button" className="exec-inline-link">Open action brief <span>→</span></button>
            </div>
          </div>
          <div className="exec-action-meta"><label>Owner</label><span>{x.owner}</span></div>
          <div className="exec-action-meta"><label>Due</label><span>{x.due}</span></div>
          <div className="exec-action-meta"><label>Proof</label><span>{x.evidenceCount} evidence point{x.evidenceCount === 1 ? '' : 's'}</span><em>{x.outcomeStatus}</em></div>
          <div className="exec-action-controls">
            <button type="button" className="exec-assign-btn" onClick={(e) => e.stopPropagation()}>Open brief</button>
          </div>
        </article>
      ))}
    </div>
  )
}
