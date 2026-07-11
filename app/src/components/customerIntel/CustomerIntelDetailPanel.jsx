import { CI_META, CI_STRATEGIC_LENSES } from '../../utils/customerIntelMeta'

/**
 * Port of renderCI (customer-os.js:1380-1565), simplified: the confidence-
 * scoring panel (needs ciComputeConfidence, a pipeline this scope doesn't
 * port) and the "Open 30-day action plan" button (openCIActionPlan — live
 * /api/claude generation, out of scope like elsewhere in this migration)
 * are dropped. Everything else — KPIs, decision strip, next-best-action,
 * dimensions, strategic lenses, booking/loyalty/pain columns, external
 * signals, luxury personas, personalisation opportunities — is ported.
 */
export default function CustomerIntelDetailPanel({ seg, data }) {
  if (!seg) {
    return (
      <div style={{ padding: 36, textAlign: 'center', color: 'var(--t3)', background: 'var(--su)', border: '1px solid var(--bo)', borderRadius: 'var(--r3)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t2)', marginBottom: 6 }}>Select a customer segment to begin</div>
        <div style={{ fontSize: 11, maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
          Each analysis surfaces who this segment is, what drives their booking decisions, what they value in a loyalty programme, and specific personalisation opportunities.
        </div>
      </div>
    )
  }

  const meta = CI_META[seg]
  const sc = data?.opportunityScore
  const scColor = sc == null ? 'var(--t3)' : sc >= 80 ? '#1abc9c' : sc >= 60 ? '#C8A050' : '#e74c3c'
  const lensList = data?.strategicLenses?.length ? data.strategicLenses : (CI_STRATEGIC_LENSES[seg] || [])
  const luxuryPersonas = data?.luxuryPersonas?.length ? data.luxuryPersonas : (meta.luxuryPersonas || [])
  const riskClass = data?.serviceRiskLevel === 'Critical' || data?.serviceRiskLevel === 'High' ? 'ci-pill-risk-high' : data?.serviceRiskLevel === 'Medium' ? 'ci-pill-risk-med' : 'ci-pill-risk-low'

  if (!data || sc == null) {
    return (
      <div className="ci-det">
        <div className="ci-det-hdr">
          <div>
            <div className="ci-det-title">{meta.icon} {meta.name}</div>
            <div className="ci-det-sub">{meta.size}</div>
          </div>
        </div>
        <div style={{ padding: 28, textAlign: 'center', color: 'var(--t2)' }}>
          No cached intelligence loaded for this segment yet.
        </div>
      </div>
    )
  }

  return (
    <div className="ci-det">
      <div className="ci-det-hdr">
        <div>
          <div className="ci-det-title">{meta.icon} {data.segmentName || meta.name}</div>
          <div className="ci-det-sub">{data.size || meta.size} · {data.topInsight}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 26, fontWeight: 500, color: scColor }}>{sc}%</div>
          <div style={{ fontSize: 10, color: 'var(--t3)' }}>{data.opportunityLabel || 'Loaded'} opportunity</div>
        </div>
      </div>

      {data.kpis?.length > 0 && (
        <div className="ci-kpis">
          {data.kpis.map((k, i) => (
            <div className="ci-kpi" key={i}>
              <div className="ci-kpi-v" style={{ color: scColor }}>{k.qrCurrent || '-'}</div>
              <div className="ci-kpi-l">{k.metric || 'Metric'}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>Benchmark: {k.benchmark || '-'}</div>
              {k.gap && <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>Gap: {k.gap}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="ci-decision-strip">
        {data.identityConfidence && <span className="ci-pill ci-pill-id">Identity: {data.identityConfidence}</span>}
        {data.tripIntentState && <span className="ci-pill ci-pill-intent">Intent: {data.tripIntentState}</span>}
        {data.customerValuePotential && <span className="ci-pill ci-pill-value">Value: {data.customerValuePotential}</span>}
        {data.decisionReadiness && <span className="ci-pill ci-pill-readiness">Readiness: {data.decisionReadiness}</span>}
        {data.serviceRiskLevel && <span className={`ci-pill ${riskClass}`}>Service risk: {data.serviceRiskLevel}{data.serviceRiskReason ? ` · ${data.serviceRiskReason.slice(0, 48)}` : ''}</span>}
      </div>

      {data.nextBestAction?.action && (
        <div className="ci-nba">
          <div className="ci-nba-eyebrow">Next-best action{data.nextBestAction.timeline ? ` · ${data.nextBestAction.timeline}` : ''}</div>
          <div className="ci-nba-title">{data.nextBestAction.action}</div>
          <div className="ci-nba-meta">
            {data.nextBestAction.adobeProduct && <span>{data.nextBestAction.adobeProduct}</span>}
            {data.nextBestAction.owner && <span>Owner: {data.nextBestAction.owner}</span>}
          </div>
        </div>
      )}

      <div className="ci-dims">
        <Dim label="Trip mission" pills={data.tripMission} pillClass="ci-dim-mission" />
        <Dim label="Party type" pills={data.partyType} pillClass="ci-dim-party" />
        <div className="ci-dim">
          <div className="ci-dim-t">Digital behaviour</div>
          <div className="ci-dim-v">{data.digitalBehaviour?.channel ? <span className="ci-dim-pill ci-dim-digital">{data.digitalBehaviour.channel}</span> : <span className="ci-dim-empty">No data</span>}</div>
          {data.digitalBehaviour?.note && <div className="ci-dim-note">{data.digitalBehaviour.note}</div>}
        </div>
        <Dim label="Service risk tags" pills={data.serviceRiskTags?.map((t) => t.tag)} pillClass="ci-dim-risk" />
        <div className="ci-dim">
          <div className="ci-dim-t">Customer value potential</div>
          <div className="ci-dim-v">{data.customerValuePotential ? <span className="ci-dim-pill ci-dim-value">{data.customerValuePotential}</span> : <span className="ci-dim-empty">No data</span>}</div>
          {data.customerValueReason && <div className="ci-dim-note">{data.customerValueReason}</div>}
        </div>
        <div className="ci-dim">
          <div className="ci-dim-t">Decision readiness</div>
          <div className="ci-dim-v">{data.decisionReadiness ? <span className="ci-dim-pill ci-dim-readiness">{data.decisionReadiness}</span> : <span className="ci-dim-empty">No data</span>}</div>
          {data.decisionReadinessReason && <div className="ci-dim-note">{data.decisionReadinessReason}</div>}
        </div>
      </div>

      {lensList.length > 0 && (
        <div className="ci-lens-wrap">
          <div className="ci-lens-title">Strategic segment lenses</div>
          <div className="ci-lens-grid">
            {lensList.slice(0, 3).map((l, i) => {
              const pr = (l.priority || 'Medium').toLowerCase()
              const prClass = pr === 'high' ? 'ci-lens-pr-high' : pr === 'low' ? 'ci-lens-pr-low' : 'ci-lens-pr-med'
              return (
                <div className="ci-lens-card" key={i}>
                  <div className="ci-lens-row"><div className="ci-lens-name">{l.name || 'Segment lens'}</div><span className={`ci-lens-pr ${prClass}`}>{l.priority || 'Medium'}</span></div>
                  <div className="ci-lens-why">{l.why || ''}</div>
                  <div className="ci-lens-move">{l.move || l.action || 'Define a focused play and owner.'}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="ci-body">
        <div className="ci-col">
          <div className="ci-col-t" style={{ color: '#7BA7E8' }}>Booking Behaviour</div>
          {data.bookingBehaviour.map((b, i) => (
            <div className="ci-item" key={i}><div className="ci-dot" style={{ background: '#7BA7E8' }} /><div className="ci-item-b"><strong>{b.insight}</strong><br />{b.detail}<br /><span className="ci-item-tag ci-tag-b">{b.source || 'Source'}</span><div style={{ marginTop: 3, fontSize: 9, color: 'var(--qg)' }}>→ {b.implication}</div></div></div>
          ))}
        </div>
        <div className="ci-col">
          <div className="ci-col-t" style={{ color: '#1abc9c' }}>Loyalty Drivers</div>
          {data.loyaltyDrivers.map((l, i) => {
            const tagClass = l.strength === 'Strong' ? 'ci-tag-g' : l.strength === 'Medium' ? 'ci-tag-a' : 'ci-tag-r'
            return <div className="ci-item" key={i}><div className="ci-dot" style={{ background: '#1abc9c' }} /><div className="ci-item-b"><strong>{l.driver}</strong><br />{l.detail}<br /><span className={`ci-item-tag ${tagClass}`}>{l.strength || 'Medium'} for QR</span></div></div>
          })}
        </div>
        <div className="ci-col">
          <div className="ci-col-t" style={{ color: '#e74c3c' }}>Pain Points</div>
          {data.painPoints.map((p, i) => (
            <div className="ci-item" key={i}><div className="ci-dot" style={{ background: '#e74c3c' }} /><div className="ci-item-b"><strong>{p.pain}</strong><br />{p.detail}<br /><span className="ci-item-tag ci-tag-r">{p.competitorAdvantage}</span></div></div>
          ))}
        </div>
        <div className="ci-col">
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'JetBrains Mono,monospace', color: '#C8A050' }}>Routes &amp; Context</div>
          <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 10 }}>{meta.desc}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--qg)', marginBottom: 4 }}>KEY ROUTES</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'JetBrains Mono,monospace', lineHeight: 1.8 }}>
            {meta.routes.split(',').map((r, i) => <div key={i}>{r.trim()}</div>)}
          </div>
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(200,160,80,.08)', borderLeft: '2px solid var(--qg)', borderRadius: '0 4px 4px 0', fontSize: 10, color: 'var(--t2)', lineHeight: 1.5 }}>{meta.qrContext}</div>
        </div>
      </div>

      {data.externalSignals.length > 0 && (
        <div className="ci-external-wrap">
          <div className="ci-col-t" style={{ color: 'var(--grn)' }}>External Signals</div>
          {data.externalSignals.map((s, i) => (
            <div className="ci-item" key={i}>
              <div className="ci-dot" style={{ background: 'var(--grn)' }} />
              <div className="ci-item-b">
                <strong>{s.signal}</strong> <span style={{ fontSize: 10, color: 'var(--t3)' }}>{s.direction === 'rising' ? '↑' : s.direction === 'falling' ? '↓' : '—'}</span>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{s.source} · {s.implication}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {seg === 'luxury' && luxuryPersonas.length > 0 && (
        <div className="ci-luxury-wrap">
          <div className="ci-luxury-title">Premium Sub-Personas · Luxury Lens</div>
          <div className="ci-luxury-grid">
            {luxuryPersonas.map((p, i) => (
              <div className="ci-lux-card" key={i}>
                <div className="ci-lux-card-icon">{p.icon || '✨'}</div>
                <div className="ci-lux-card-name">{p.label}</div>
                <div className="ci-lux-h trg">Trigger signals</div><div className="ci-lux-t">{p.triggers}</div>
                <div className="ci-lux-h rsk">Service failure risks</div><div className="ci-lux-t">{p.serviceFailures}</div>
                <div className="ci-lux-h nba">Next-best action</div><div className="ci-lux-t">{p.nextBestAction}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bo)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'JetBrains Mono,monospace', color: '#C8A050' }}>
          UCP Personalisation Opportunities ({data.personalisationOpps.length})
        </div>
        <div className="ci-opps">
          {data.personalisationOpps.map((o, i) => {
            const effortClass = o.effort === 'Quick win' ? 'ci-tag-g' : o.effort === 'Medium' ? 'ci-tag-a' : 'ci-tag-b'
            return (
              <div className="ci-opp" key={i}>
                <div className="ci-opp-eyebrow">UCP: {o.ucpUseCase || 'Segment orchestration'}{o.adobeProduct && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(200,160,80,.1)', color: 'var(--qg)', marginLeft: 4 }}>{o.adobeProduct}</span>}</div>
                <div className="ci-opp-title">{o.title}</div>
                <div className="ci-opp-body">{o.detail}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="ci-opp-val">{o.value}</div>
                  <span className={`ci-item-tag ${effortClass}`}>{o.effort || 'Medium'}</span>
                  <span className="ci-item-tag ci-tag-b">{o.owner || 'Digital/B2C'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Dim({ label, pills, pillClass }) {
  return (
    <div className="ci-dim">
      <div className="ci-dim-t">{label}</div>
      <div className="ci-dim-v">
        {pills?.length ? pills.map((p, i) => <span className={`ci-dim-pill ${pillClass}`} key={i}>{p}</span>) : <span className="ci-dim-empty">No data</span>}
      </div>
    </div>
  )
}
