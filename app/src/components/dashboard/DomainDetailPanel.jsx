import { DOMAIN_META, domainPublicSourceFit } from '../../utils/domainMeta'
import { getCommercialImpactScore, signalDateSummary } from '../../utils/domainSignal'

/**
 * Port of openDom's detail-panel render (radar-core.js:2540-2645), minus:
 * the AI chat panel (#aiPanel — live /api/claude, out of scope) and the
 * "Plan →" per-signal action buttons (openAP/generateAP — also live
 * generation, out of scope). Everything else (signal list, severity/
 * freshness badges, opp card, metrics, source-fit panel) is read-only
 * cache-derived data.
 */
export default function DomainDetailPanel({ id, data, onClose }) {
  if (!id) {
    return (
      <div className="det empty-d">
        <div className="er">i</div>
        <div className="et">Select any domain — each loads independently from backend/Supabase cache.</div>
      </div>
    )
  }

  const meta = DOMAIN_META[id]
  const fit = domainPublicSourceFit(id)
  const signals = data?.signals || []

  return (
    <div className="det">
      <div className="det-hdr">
        <div className="det-hl">
          <div className={`det-hic d-${id}`}>{meta.abbr}</div>
          <div>
            <div className="det-ti">{meta.title}</div>
            <div className="det-su2">{meta.subtitle}</div>
          </div>
        </div>
        <div className="det-hr">
          <span className={`spill ${data?.statusClass || 'spa'}`}>{data?.status || 'No cached signal'}</span>
          <button className="cx" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="det-body">
        <div className="det-l">
          <div className="sgs-hdr">Active signals — from backend/Supabase cache</div>
          {signals.length ? signals.map((s, i) => <SignalDetailRow key={i} s={s} />) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
              No cached signals for this domain yet.
            </div>
          )}
        </div>
        <div className="det-r">
          {fit.sources.length > 0 && (
            <div className="domain-source-panel">
              <div className="domain-source-ey">Public API fit</div>
              <div className="domain-source-why">{fit.why}</div>
              <div className="domain-source-grid">
                {fit.sources.map(([name, desc], i) => (
                  <div className="domain-source-chip" key={i}><strong>{name}</strong><span>{desc}</span></div>
                ))}
              </div>
            </div>
          )}
          {data ? (
            <div className={`opp-card d-${id}`}>
              <div className="opp-ey">{data.opp?.eyebrow || 'Top opportunity'}</div>
              <div className="opp-t">{data.opp?.title || 'Loading…'}</div>
              <div className="opp-b">{data.opp?.body || ''}</div>
              <div className="opp-v">{data.opp?.value || ''}</div>
            </div>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--t3)', fontSize: 12, background: 'var(--bg2)', borderRadius: 'var(--r2)', marginBottom: 14 }}>
              No cached opportunity data for this domain yet.
            </div>
          )}
          {data?.metrics?.length > 0 && (
            <div className="minis">
              {data.metrics.map((mk, i) => <div className="mini" key={i}><div className="mv">{mk[0]}</div><div className="ml">{mk[1]}</div></div>)}
            </div>
          )}
          {data?.actions?.length > 0 && (
            <div className="acts">
              {data.actions.map((a, i) => <div className={`abt${i === 0 ? ' abt-p' : ''}`} key={i} style={{ cursor: 'default' }}>{a}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SignalDetailRow({ s }) {
  const verifiedBadge = s.verified
    ? <span className="vbadge">✓ Verified</span>
    : s.benchmark ? <span className="bmbadge">Benchmark</span> : null
  const dateSummary = signalDateSummary(s)

  return (
    <div className="sig">
      <div className={`sdot ${s.dot || 'db'}`} />
      <div style={{ flex: 1 }}>
        <div className="sig-t">{s.title}</div>
        <div className="sig-b">{s.body}</div>
        {s.whyItMattersNow && <div className="sig-b" style={{ marginTop: 4, color: 'var(--qb)' }}><strong>Why now:</strong> {s.whyItMattersNow}</div>}
        {s.captureStrategy && <div className="sig-b" style={{ marginTop: 4, color: 'var(--grn)' }}><strong>Capture strategy:</strong> {s.captureStrategy}</div>}
        {s.source && (
          <div className="sig-src">
            Source: {s.source}{s.sourceDate ? ` · Source date: ${s.sourceDate}` : ''}{s.eventDate ? ` · Event: ${s.eventDate}` : ''}
          </div>
        )}
        {dateSummary && <div className="sig-date-meta"><span>{dateSummary}</span>{s.dataHash && <span className="sig-date-chip">Hash {s.dataHash}</span>}{s.isStale && <span className="sig-date-chip sig-date-stale">Stale</span>}</div>}
        <div className="sig-row">
          <span className={`sig-imp ${s.impact || 'si-b'}`}>{s.impactLabel}</span>
          <span className="bmbadge">Impact {getCommercialImpactScore(s)}/10</span>
          {s.demandImpact && <span className="bmbadge">Demand: {s.demandImpact}</span>}
          {s.timeToImpact && <span className="bmbadge">Impact: {s.timeToImpact}</span>}
          {s.confidence && <span className="bmbadge">{s.confidence} confidence</span>}
          {verifiedBadge}
          {s.relevanceWindow && <span className="bmbadge">{String(s.relevanceWindow).replaceAll('_', ' ')}</span>}
          {s.sourceUrl
            ? <a className="vlink" href={s.sourceUrl} target="_blank" rel="noopener noreferrer">Verify →</a>
            : <a className="vlink" href={`https://www.google.com/search?q=${encodeURIComponent(`${s.title} Qatar Airways 2026`)}`} target="_blank" rel="noopener noreferrer">Research →</a>}
        </div>
      </div>
    </div>
  )
}
