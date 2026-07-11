import SignalListPanel from './SignalListPanel'

export default function ComplaintHeatmap({ items }) {
  return <SignalListPanel items={items.slice(0, 24)} emptyMessage="No complaint/risk signals loaded from backend/cache." />
}
