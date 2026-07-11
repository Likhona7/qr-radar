import SignalListPanel from './SignalListPanel'

export default function CompetitorPerception({ items }) {
  return <SignalListPanel items={items} emptyMessage="No competitor perception signals loaded from backend/cache." />
}
