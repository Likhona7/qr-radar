import { useState } from 'react'
import { estimateConfidence, estimatePostCount, freshnessLabel } from '../utils/sourceMeta'

/**
 * Collapsed-by-default summary strip that expands into the full source grid.
 * Fixes the "13-source grid eats ~40% of vertical space on every tab" bug —
 * in the legacy app #ciosSrcGrid is one persistent instance that never
 * collapses (confirmed, not duplicated 12 times); this makes that same
 * single instance collapsible.
 */
export default function SourceBreakdown({ sources, loading, updatedLabel }) {
  const [expanded, setExpanded] = useState(false)

  const critical = sources.filter((s) => s.overallSentiment != null && s.overallSentiment < 45).length

  return (
    <div className="radar-source-breakdown">
      <div className="radar-source-breakdown-summary" onClick={() => setExpanded((e) => !e)}>
        <span>
          {loading
            ? 'Loading sources…'
            : `${sources.length} sources loaded${critical ? ` · ${critical} critical` : ''} · ${expanded ? 'tap to collapse' : 'tap to expand'}`}
        </span>
        {updatedLabel && <span style={{ opacity: 0.6, fontWeight: 400 }}>{updatedLabel}</span>}
      </div>
      {expanded && (
        <div className="radar-source-breakdown-grid cios-src-grid">
          {sources.map((s) => {
            const score = s.overallSentiment
            const color = score == null ? undefined : score >= 65 ? 'var(--grn)' : score >= 45 ? 'var(--amb)' : 'var(--red)'
            return (
              <div className="cios-src-tile" key={s.sourceKey}>
                <div className="cios-src-name">{s.meta?.name || s.sourceName}</div>
                <div className="cios-src-score" style={{ color }}>{score != null ? `${score}%` : '-'}</div>
                <div className="cios-src-bar">
                  <div className="cios-src-bar-fill" style={{ width: `${score || 0}%`, background: color }} />
                </div>
                <div className="cios-src-conf">
                  <span>{estimatePostCount(s)} posts</span>
                  <span className="cios-src-fresh">confidence</span>
                  <span>{estimateConfidence(s)}%</span>
                  <span className={freshnessLabel(s) === 'today' ? 'cios-src-time' : 'cios-src-time stale'}>{freshnessLabel(s)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
