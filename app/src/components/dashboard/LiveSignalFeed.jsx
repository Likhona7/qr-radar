import { isForwardSignal, isRiskSignal, isOpportunitySignal, getCommercialImpactScore } from '../../utils/domainSignal'

/** Port of updateFeedFromDomains (radar-core.js:2400-2435). */
export default function LiveSignalFeed({ domData, domains }) {
  const allSignals = []
  domains.forEach((id) => {
    const signals = domData[id]?.signals
    if (!signals) return
    signals
      .filter((s) => isForwardSignal(s) || isRiskSignal(s) || isOpportunitySignal(s))
      .sort((a, b) => getCommercialImpactScore(b) - getCommercialImpactScore(a))
      .slice(0, 2)
      .forEach((s) => allSignals.push({
        source: s.source || 'Intelligence',
        text: s.title,
        level: isRiskSignal(s) || getCommercialImpactScore(s) >= 8 ? 'ih' : 'im',
        url: s.sourceUrl || null,
      }))
  })
  allSignals.sort((a, b) => (a.level === 'ih' ? -1 : 1) - (b.level === 'ih' ? -1 : 1))
  const top8 = allSignals.slice(0, 8)

  return (
    <div className="bcard">
      <div className="bct"><span className="ld" style={{ flexShrink: 0 }} />Live signal feed — 14 domains · verified</div>
      <div>
        {top8.length ? top8.map((f, i) => (
          <div className="fr" key={i}>
            <span className="fsrc">{f.source}</span>
            <span className="ftxt">{f.text}</span>
            <span className={`imp ${f.level}`}>{f.level === 'ih' ? 'High' : 'Med'}</span>
            {f.url && <a className="fvl" href={f.url} target="_blank" rel="noopener noreferrer">Verify</a>}
          </div>
        )) : (
          <div className="fr">
            <span className="fsrc">Backend cache</span>
            <span className="ftxt">{domains.some((id) => domData[id]) ? 'Domains are loaded, but no current forward/risk/opportunity feed signals matched the display rules.' : 'No static signals are displayed. This feed populates only from backend/Supabase cache after domains are loaded.'}</span>
            <span className="imp io">{domains.some((id) => domData[id]) ? 'Review' : 'Cache-first'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
