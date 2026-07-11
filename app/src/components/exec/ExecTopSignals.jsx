import { titleOf, bodyOf, domainOf, signalScore, scoreBucket, timeAgoLabel } from '../../utils/execSignal'

/** Port of renderTopSignalsPanelV2 (executive-os-roadmap.js:747-772). */
export default function ExecTopSignals({ signals, onOpenDrawer }) {
  const top = signals.slice(0, 3)
  if (!top.length) return <div className="exec-empty">No backend/cache signals loaded yet.</div>

  return (
    <div>
      {top.map((s, i) => {
        const sev = scoreBucket(signalScore(s))
        return (
          <article
            className="exec-signal-row exec-clickable"
            key={i}
            onClick={() => onOpenDrawer({ type: 'Top Signal', title: titleOf(s), body: bodyOf(s), meta: [domainOf(s), s.impactLabel || s.demandImpact || 'Signal', s.confidence || 'Medium'] })}
          >
            <div className="exec-signal-rank">{i + 1}</div>
            <div className="exec-signal-main">
              <div className="exec-signal-title">{titleOf(s)}</div>
              <div className="exec-signal-body">{bodyOf(s)}</div>
              <button type="button" className="exec-inline-link">See route detail <span>→</span></button>
            </div>
            <div className="exec-signal-side">
              <span className={`exec-severity ${sev.cls}`}>{sev.label}</span>
              <span>{s.impactLabel || s.demandImpact || 'Signal'}</span>
              <span>{timeAgoLabel(s)}</span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
