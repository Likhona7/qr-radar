/**
 * level="primary": top-level app section nav (heavier filled-pill active state).
 * level="secondary": within-page sub-tabs (lighter underline active state).
 * Giving these two distinct visual treatments is the fix for the "two
 * identical-looking tab rows" confusion identified in the UI review — the
 * legacy app has the same two-level nav architecture, it just never gave the
 * levels different weight.
 */
export default function TabNav({ level = 'primary', items, activeKey, onChange }) {
  return (
    <nav className={`radar-tabnav radar-tabnav-${level}`}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`radar-tab-btn${item.key === activeKey ? ' active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
          {item.badge != null && item.badge !== '' && (
            <span style={{ marginLeft: 6, opacity: 0.7 }}>{item.badge}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
