import { useState } from 'react'
import { severityClassName, severityLabel } from '../utils/severity'

/**
 * Replaces the raw innerHTML template rows in ciosAudience/ciosHeatmap flat
 * view/ciosProductRequests/ciosOpportunities (all hard-clipped text with no
 * expand affordance — the "truncates mid-sentence" bug from the UI review).
 *
 * reasonTag: set when this signal is intentionally re-surfaced from another
 * tab's lens (e.g. Executive Narrative summarizing a top item already shown
 * in Complaint Heatmap) — makes the duplication legible instead of silent.
 */
export default function SignalRow({ title, detail, source, severity, badge, clampLines = 2, reasonTag }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="cios-aud-row" style={{ alignItems: 'flex-start', cursor: 'default' }}>
      <div className="cios-aud-meta">
        <div className="cios-aud-nm">{title}</div>
        {detail && (
          <div
            className={`radar-signal-detail clamp-${clampLines}${expanded ? ' expanded' : ''}`}
            onClick={() => setExpanded((e) => !e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v)
            }}
          >
            {detail}
          </div>
        )}
        {detail && detail.length > 90 && (
          <div className="radar-signal-expand-hint">{expanded ? 'Show less' : 'Read more'}</div>
        )}
        {reasonTag && <div className="radar-signal-reason">{reasonTag}</div>}
        {source && <div className="cios-aud-dt">{source}</div>}
      </div>
      {(severity || badge) && (
        <div className={severity ? `radar-severity-label ${severityClassName(severity)}` : 'cios-aud-badge'}>
          {badge || severityLabel(severity)}
        </div>
      )}
    </div>
  )
}
