import { useEffect } from 'react'

/**
 * Port of openExecDetailDrawer/closeExecDetailDrawer (radar-core.js:4718-4743).
 * Confirmed simple during exploration: a plain {type, title, body, meta[]}
 * object drives 4 fixed regions, no fetch, no state machine.
 */
export default function ExecDetailDrawer({ drawer, onClose }) {
  useEffect(() => {
    if (!drawer) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer, onClose])

  return (
    <>
      {drawer && <div className="exec-drawer-backdrop" onClick={onClose} />}
      <aside className={`exec-detail-drawer${drawer ? ' open' : ''}`} aria-hidden={!drawer}>
        <div className="exec-detail-head">
          <div>
            <div className="exec-detail-eyebrow">{drawer?.type || 'Signal Detail'}</div>
            <h3>{drawer?.title || 'Executive evidence'}</h3>
          </div>
          <button type="button" className="exec-detail-close" onClick={onClose}>Close</button>
        </div>
        <div className="exec-detail-meta">{(drawer?.meta || []).join(' · ')}</div>
        <div className="exec-detail-body" style={{ whiteSpace: 'pre-line' }}>{drawer?.body || ''}</div>
      </aside>
    </>
  )
}
