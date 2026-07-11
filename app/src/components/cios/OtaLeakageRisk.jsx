import SignalListPanel from './SignalListPanel'

export default function OtaLeakageRisk({ items }) {
  return <SignalListPanel items={items} emptyMessage="No OTA leakage risk signals loaded from backend/cache." />
}
