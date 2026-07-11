import SignalListPanel from './SignalListPanel'

export default function GrowingConversations({ items }) {
  return <SignalListPanel items={items} emptyMessage="No growing-conversation signals loaded from backend/cache." />
}
