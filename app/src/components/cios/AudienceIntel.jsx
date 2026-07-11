import SignalListPanel from './SignalListPanel'

export default function AudienceIntel({ items }) {
  return <SignalListPanel items={items} emptyMessage="No audience intelligence loaded from backend/cache." />
}
