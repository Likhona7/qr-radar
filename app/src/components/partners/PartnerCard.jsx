/** Port of partnerCardHtml (radar-core.js:4040-4056). */
export default function PartnerCard({ id, meta, active, onClick }) {
  return (
    <button type="button" className={`partner-card partner-card-${meta.group || 'core'}${active ? ' on' : ''}`} onClick={onClick}>
      <div className="partner-card-top">
        <div>
          <div className="partner-code">{meta.code || id.toUpperCase()}</div>
          <div className="partner-meta">{meta.coverage || meta.hub || ''}</div>
        </div>
        <span className="partner-score">{meta.score || 0}/100</span>
      </div>
      <div className="partner-name">{meta.name || id}</div>
      <div className="partner-body">{meta.why || meta.value || ''}</div>
      <div className="partner-tags">
        {(meta.tags || []).map((tag, i) => <span key={i} className={i === 0 ? 'is-g' : i === 1 ? 'is-a' : ''}>{tag}</span>)}
      </div>
    </button>
  )
}
