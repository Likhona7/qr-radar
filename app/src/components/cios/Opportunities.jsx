import SignalListPanel from './SignalListPanel'

export default function Opportunities({ items }) {
  return <SignalListPanel items={items.slice(0, 18)} emptyMessage="No opportunities loaded from backend/cache." />
}
