import { computeLeadershipFocus, computeExecutiveNarrative, computePressure } from '../../utils/leadershipDeck'

/** Port of the Leadership Command Center section (components/02-main-dashboard.html:22-58). */
export default function LeadershipDeck({ domData, domains, onOpenDomain }) {
  const focus = computeLeadershipFocus(domData, domains)
  const narrative = computeExecutiveNarrative(domData, domains)
  const pressure = computePressure(domData, domains)

  return (
    <section className="leadership-deck">
      <div className="lead-card">
        <div className="lead-card-h">
          <div>
            <div className="lead-eyebrow">Leadership focus today</div>
            <div className="lead-title">Top Digital/B2C actions</div>
            <div className="lead-sub">{narrative.sub}</div>
          </div>
          <span className="vbadge">Backend/cache</span>
        </div>
        <div className="lead-actions">
          {focus.length ? focus.map((r, i) => (
            <article className={`lead-action ${r.type}`} key={i}>
              <div className="lead-rank">{i + 1}</div>
              <span className={`lead-tag ${r.type}`}>{r.tag}</span>
              <div className="lead-action-title">{r.title}</div>
              <div className="lead-action-body">{r.body}</div>
              <div className="lead-meta"><span className="lead-domain">{r.domainLabel}</span><span className="lead-score">{r.score}/10</span></div>
              <button type="button" onClick={() => onOpenDomain(r.domain)}>{r.button}</button>
            </article>
          )) : (
            <div className="lead-empty">Load or refresh domains to populate the top leadership actions. This area will show the three items VP/SVP should address first.</div>
          )}
        </div>
      </div>
      <div className="lead-side">
        <div className="lead-card lead-summary">
          <div className="lead-eyebrow">Executive narrative</div>
          <div className="lead-summary-main">{narrative.main}</div>
          <div className="lead-summary-text">{narrative.text}</div>
        </div>
        <div className="lead-card lead-summary">
          <div className="lead-eyebrow">Direct vs OTA pressure</div>
          <div className="lead-pressure-grid">
            <div className="pressure-pill"><div className="pressure-v">{pressure.ota}</div><div className="pressure-l">OTA / agent pressure</div></div>
            <div className="pressure-pill"><div className="pressure-v">{pressure.direct}</div><div className="pressure-l">Direct-channel strength</div></div>
          </div>
          <div className="pressure-note">{pressure.note}</div>
        </div>
      </div>
    </section>
  )
}
