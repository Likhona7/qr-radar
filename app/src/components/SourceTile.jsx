// UI-only metadata (subtitle text, EST badge) — kept separate from
// api/sentimentSources.js's SENT_META since that file is about network
// normalization, not display copy. Ported verbatim from
// components/04-sentiment.html:34-46.
const SUBTITLES = {
  reddit: 'r/QatarAirways r/flights r/awardtravel',
  flyertalk: 'Qatar Airways forum frequent flyers',
  trustpilot: '6,084 verified customer reviews',
  tripadvisor: 'Airline reviews passenger ratings',
  skytrax: 'Industry ratings verified travellers',
  quora: 'Q&A passenger experiences shared',
  twitter: 'Real-time complaints viral moments',
  consumer: 'PissedConsumer AirlineQuality',
  appstore: 'iPhone airline ratings and reviews',
  googleplay: 'Android airline ratings and reviews',
  youtube: 'Travel creator videos and comments',
  bluesky: 'Public travel and brand posts',
  mastodon: 'Public Fediverse travel posts',
}

// Sources with no live data connector yet — score is estimated from other
// cached signals, not real platform content (ported from the same file).
const ESTIMATED_SOURCES = new Set(['flyertalk', 'trustpilot', 'tripadvisor', 'skytrax', 'quora', 'twitter', 'consumer'])

export default function SourceTile({ sourceKey, meta, score, loading, hasData, active, onClick }) {
  const color = meta?.color || 'var(--qb)'
  const barColor = score == null ? undefined : score >= 70 ? '#1abc9c' : score >= 50 ? '#C8A050' : '#e74c3c'

  return (
    <div
      className={`sent-tile${active ? ' on' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="sent-tile-hdr">
        <div>
          <div className="sent-tile-name">
            {meta?.name || sourceKey}
            {ESTIMATED_SOURCES.has(sourceKey) && (
              <span
                title={`No live data source connected — score estimated from other cached signals, not real ${meta?.name || sourceKey} content.`}
                style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, color: '#B45309', background: '#FEF3C7', borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle', marginLeft: 5 }}
              >
                EST
              </span>
            )}
          </div>
          <div className="sent-tile-sub">{SUBTITLES[sourceKey] || ''}</div>
        </div>
      </div>
      <div className="sent-score-bar">
        <div className="sent-score-fill" style={{ width: `${score || 0}%`, background: color }} />
      </div>
      <div className="sent-score-row">
        <span>Sentiment</span>
        <span>{score != null ? `${score}%` : '-'}</span>
      </div>
      <button className="sent-load-btn" disabled>
        {loading ? 'Loading…' : hasData ? 'Loaded' : 'No data'}
      </button>
    </div>
  )
}
