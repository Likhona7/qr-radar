import SignalRow from '../SignalRow'
import { itemDetail, itemSource, itemTitle } from '../../utils/signal'
import { severityFromItem } from '../../utils/severity'

/**
 * Shared list-rendering building block for the CIOS sub-tab panels that are
 * "a list of signals" (Heatmap/Audience/Growing/Competitor/Requests/
 * AppRatings/OTA/Opportunities) — Keywords and Executive Narrative have
 * their own distinct layouts and don't use this.
 */
export default function SignalListPanel({ items, emptyMessage, numbered = false }) {
  if (!items.length) {
    return <div className="empty-d"><div className="et">{emptyMessage}</div></div>
  }
  return (
    <div className="cios-card">
      {items.map((item, idx) => (
        <SignalRow
          key={`${itemSource(item)}-${idx}`}
          title={numbered ? `${String(idx + 1).padStart(2, '0')}. ${itemTitle(item)}` : itemTitle(item)}
          detail={itemDetail(item)}
          source={itemSource(item)}
          severity={severityFromItem(item)}
        />
      ))}
    </div>
  )
}
