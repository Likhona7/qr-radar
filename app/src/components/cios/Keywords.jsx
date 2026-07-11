/** Port of ciosKeywords (visual-fixes.js:484+) — word-frequency table, not a signal list. */
export default function Keywords({ keywordCounts }) {
  const entries = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 30)
  if (!entries.length) {
    return <div className="empty-d"><div className="et">No keyword intelligence loaded from backend/cache.</div></div>
  }
  const max = entries[0][1]
  return (
    <div className="cios-card">
      {entries.map(([word, count]) => (
        <div className="cios-aud-row" key={word}>
          <div className="cios-aud-meta">
            <div className="cios-aud-nm">{word}</div>
            <div style={{ height: 4, background: 'var(--bo)', borderRadius: 999, marginTop: 4, width: 160, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((count / max) * 100)}%`, background: 'var(--grn, #0ea5a3)' }} />
            </div>
          </div>
          <div className="cios-aud-badge">{count}</div>
        </div>
      ))}
    </div>
  )
}
