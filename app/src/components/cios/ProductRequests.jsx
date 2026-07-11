import SignalListPanel from './SignalListPanel'

export default function ProductRequests({ items }) {
  return <SignalListPanel items={items.slice(0, 24)} emptyMessage="No product/action requests loaded from backend/cache." numbered />
}
