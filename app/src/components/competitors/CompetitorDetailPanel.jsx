import { CMETA } from '../../utils/competitorMeta'

/**
 * Port of renderComp (radar-core.js:6053-6120), simplified: the confidence-
 * band/source-count breakdown and official-newsroom-link panels are skipped
 * (they need the fuller confidence-scoring pipeline this scope trims) — the
 * core value (weaknesses/opportunities/actions) is unaffected.
 */
export default function CompetitorDetailPanel({ id, data }) {
  if (!id) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)', background: 'var(--su)', border: '1px solid var(--bo)', borderRadius: 'var(--r3)' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)', marginBottom: 6 }}>Select a competitor above to view cache-backed intelligence</div>
        <div style={{ fontSize: 11, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
          Each analysis shows weaknesses to exploit, opportunities their moves create for QR, and specific actions for the B2C team.
        </div>
      </div>
    )
  }

  const meta = CMETA[id]
  const noMatch = !data?.hasSpecificCache

  return (
    <div className="comp-det">
      <div className="comp-det-hdr">
        <div className="comp-det-hl">
          <div className="comp-det-fl">{meta.flag}</div>
          <div>
            <div className="comp-det-nm">{data?.name || meta.name}</div>
            <div className="comp-det-sb">{data?.summary}</div>
            {data?.why && <div className="comp-det-sb" style={{ marginTop: 4 }}><strong>Why this competitor matters:</strong> {data.why}</div>}
          </div>
        </div>
        <span className="spill spa">{noMatch ? 'No data' : `Threat ${data.overallThreat ?? '-'}%`}</span>
      </div>
      {noMatch ? (
        <div style={{ padding: 28, textAlign: 'center', background: 'var(--su)', borderTop: '1px solid var(--bo)', color: 'var(--t2)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', marginBottom: 6 }}>No source-specific cache for {meta.name}</div>
          <div style={{ fontSize: 11, lineHeight: 1.6, maxWidth: 560, margin: '0 auto' }}>
            No competitor-specific backend cache is loaded for this airline yet. Generic shared competitor points are intentionally hidden to avoid duplicate intelligence.
          </div>
        </div>
      ) : (
        <div className="comp-body">
          {/* Real backend payload returns weaknesses/opportunities/actions as
              plain sentence strings, not {title,detail,severity,...} objects
              — confirmed via direct API calls, differs from what the legacy
              generation-flow JSON shape would have had. Rendered as-is. */}
          <CompColumn title="Weaknesses to exploit" titleClass="c-col-r" dotColor="var(--red)" items={data.weaknesses} render={(w) => <div className="comp-sd">{w}</div>} />
          <CompColumn title="Opportunities for QR B2C" titleClass="c-col-g" dotColor="var(--grn)" items={data.opportunities} render={(o) => <div className="comp-sd">{o}</div>} />
          <CompColumn title="QR actions · 30 days" titleClass="c-col-a" dotColor="var(--qb)" items={data.actions} render={(a) => <div className="comp-sd">{a}</div>} />
        </div>
      )}
    </div>
  )
}

function CompColumn({ title, titleClass, dotColor, items, render }) {
  return (
    <div className="comp-col">
      <div className={`comp-col-t ${titleClass}`}>{title}</div>
      {items.map((item, i) => (
        <div className="comp-sig" key={i}>
          <div className="comp-sdot" style={{ background: dotColor }} />
          <div className="comp-sb">{render(item)}</div>
        </div>
      ))}
    </div>
  )
}
