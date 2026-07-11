import { useState } from 'react'
import { useCustomerIntelCache } from '../hooks/useCustomerIntelCache'
import { CI_SEGMENTS } from '../utils/customerIntelMeta'
import CustomerSegmentTile from '../components/customerIntel/CustomerSegmentTile'
import CustomerIntelDetailPanel from '../components/customerIntel/CustomerIntelDetailPanel'

/** Port of components/05-customer-intelligence.html:1-90 + selCI/loadCI/renderCI (read-only cache path). */
export default function CustomerIntelligencePage() {
  const { ciData, loading } = useCustomerIntelCache('b2c')
  const [selected, setSelected] = useState(null)

  return (
    <div className="ci-page visible">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="ci-hdr-t">Customer Intelligence <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--qg)', marginLeft: 8, verticalAlign: 'middle' }}>Decisioning Layer</span></div>
          <div className="ci-hdr-s" style={{ marginBottom: 8 }}>
            Traveller-centric orchestration intelligence across 7 segments. Structured as a decisioning asset aligned to Adobe CJA, RTCDP, Journey Optimizer, and loyalty activation.
            {loading ? ' Loading cached intelligence…' : ' Each analysis surfaces external signals, strategic segment lenses, and owner-ready action plans.'}
          </div>
          <div className="ci-header-pills">
            <span className="ci-header-pill">Identity confidence</span>
            <span className="ci-header-pill">Trip intent</span>
            <span className="ci-header-pill">Customer value</span>
            <span className="ci-header-pill">Premiumity</span>
            <span className="ci-header-pill warn">Service risk</span>
            <span className="ci-header-pill ok">Next-best action</span>
          </div>
        </div>
      </div>

      <div className="ci-segs">
        {CI_SEGMENTS.map((seg) => (
          <CustomerSegmentTile key={seg} seg={seg} data={ciData[seg]} active={selected === seg} onClick={() => setSelected(seg)} />
        ))}
      </div>

      <CustomerIntelDetailPanel seg={selected} data={selected ? ciData[selected] : null} />
    </div>
  )
}
