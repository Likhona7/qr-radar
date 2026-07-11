import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PMETA, partnerEntriesByGroup } from '../utils/partnerMeta'
import PartnerCard from '../components/partners/PartnerCard'
import PartnerDetailPanel from '../components/partners/PartnerDetailPanel'

/** Port of components/03-partners.html + renderPartnerPage (radar-core.js:4058-4160) — fully static data, no fetch. */
export default function PartnerNetworkPage() {
  const navigate = useNavigate()
  const entries = Object.entries(PMETA)
  const [selected, setSelected] = useState(entries[0]?.[0] || null)

  const coreCount = entries.filter(([, m]) => (m.group || 'core') === 'core').length
  const growthCount = entries.filter(([, m]) => (m.group || 'core') === 'growth').length
  const kpis = [
    { v: entries.length, l: 'Partner airlines', d: 'Useful network routes and connectivity opportunities' },
    { v: coreCount, l: 'Core network', d: 'High-value network partners and feed coverage' },
    { v: growthCount, l: 'Strategic growth', d: 'Corridor-specific partners with growth upside' },
    { v: 4, l: 'Opportunity themes', d: 'Connectivity, loyalty, premium flow and campaigns' },
  ]

  return (
    <div className="partner-page visible">
      <div className="partner-hero">
        <div className="partner-hero-copy">
          <div className="partner-eyebrow">Network leverage and connected demand</div>
          <h1>Partner Network</h1>
          <p>
            This tab treats Qatar Airways partners as opportunity channels, not threats. It focuses on connectivity,
            loyalty, premium flow, and route coverage so the business can see where partner relationships can
            strengthen demand, retention, and direct-booking conversion.
          </p>
          <div className="partner-chip-row">
            <span className="partner-chip">Connectivity</span>
            <span className="partner-chip">Loyalty</span>
            <span className="partner-chip">Premium flow</span>
            <span className="partner-chip">Joint campaigns</span>
          </div>
        </div>
        <div className="partner-hero-side">
          <div className="partner-side-card">
            <div className="partner-side-label">What Radar renders</div>
            <div className="partner-side-list">
              <span>Partner name and relationship type</span>
              <span>Route and market coverage</span>
              <span>Loyalty and Avios opportunity</span>
              <span>External news and connection signals</span>
              <span>Recommended action for Qatar Airways</span>
            </div>
          </div>
          <div className="partner-side-note">
            Excluded by design: raw schedules, revenue-share terms, seat inventory, and internal commercial agreements.
          </div>
        </div>
      </div>

      <div className="partner-kpis">
        {kpis.map((c, i) => (
          <div className="partner-kpi" key={i}>
            <div className="partner-kv">{c.v}</div>
            <div className="partner-kl">{c.l}</div>
            <div className="partner-kd">{c.d}</div>
          </div>
        ))}
      </div>

      <div className="partner-layout">
        <div className="partner-collections">
          <section className="partner-block">
            <div className="partner-block-head">
              <div>
                <div className="partner-block-title">Core network partners</div>
                <div className="partner-block-sub">High-value airlines that extend Doha reach, premium demand, and loyalty value.</div>
              </div>
              <span className="partner-block-pill">Core network</span>
            </div>
            <div className="partner-grid">
              {partnerEntriesByGroup('core').map(([id, meta]) => (
                <PartnerCard key={id} id={id} meta={meta} active={selected === id} onClick={() => setSelected(id)} />
              ))}
            </div>
          </section>

          <section className="partner-block">
            <div className="partner-block-head">
              <div>
                <div className="partner-block-title">Strategic growth partners</div>
                <div className="partner-block-sub">Partners that expand specific corridors, campaign reach, and joint-value opportunities.</div>
              </div>
              <span className="partner-block-pill partner-growth">Growth lanes</span>
            </div>
            <div className="partner-grid">
              {partnerEntriesByGroup('growth').map(([id, meta]) => (
                <PartnerCard key={id} id={id} meta={meta} active={selected === id} onClick={() => setSelected(id)} />
              ))}
            </div>
          </section>
        </div>

        <PartnerDetailPanel
          id={selected}
          meta={selected ? PMETA[selected] : null}
          onOpenExecSummary={() => navigate('/executive-summary')}
          onOpenCompetitors={() => navigate('/competitors')}
        />
      </div>
    </div>
  )
}
