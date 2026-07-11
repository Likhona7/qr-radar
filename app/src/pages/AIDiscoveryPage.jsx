import { useNavigate } from 'react-router-dom'
import { useAIDiscoveryStatus } from '../hooks/useAIDiscoveryStatus'
import { computeKpiCards } from '../utils/aiDiscoveryStatus'
import { AIDISCOVERY } from '../utils/aiDiscoveryContent'
import BackendStatusPanel from '../components/aiDiscovery/BackendStatusPanel'

const OPERATING_STEPS = [
  { num: '01', title: 'Detect citation gaps', copy: 'Find where competitors are cited and QR is missing, weak, or ranked lower.' },
  { num: '02', title: 'Connect to business impact', copy: 'Map each gap to routes, premium demand, app conversion, loyalty or stopover revenue.' },
  { num: '03', title: 'Create an owner note', copy: 'Record the content, Adobe, SEO, route, app or campaign follow-up with a named owner.' },
  { num: '04', title: 'Audit movement weekly', copy: 'Repeat the same queries and show whether QR citation share, position and conversion improved.' },
]

/** Port of components/06-ai-discovery.html + renderAIDiscoveryPage (radar-core.js:4162-4236). */
export default function AIDiscoveryPage() {
  const navigate = useNavigate()
  const { data, hasLive, loading, reload } = useAIDiscoveryStatus('b2c')
  const kpis = computeKpiCards(data || {}, hasLive)

  return (
    <div className="ai-page visible">
      <div className="ai-hero">
        <div className="ai-hero-copy">
          <div className="ai-eyebrow">Search visibility and referral intelligence</div>
          <h1>Discovery Monitor</h1>
          <p>
            This page keeps the useful parts only: Referral traffic, crawler visibility, citation share, query gaps,
            and conversion quality. It excludes training-data claims, exact Google answer-mode traffic, and hype
            metrics that Radar cannot verify reliably.
          </p>
          <div className="ai-chip-row">
            <span className="ai-chip">Referral sources</span>
            <span className="ai-chip">Crawler logs</span>
            <span className="ai-chip">Citation share</span>
            <span className="ai-chip">Query gaps</span>
            <span className="ai-chip">Conversion</span>
          </div>
        </div>
        <div className="ai-hero-side">
          <button type="button" className="ai-primary-btn" onClick={reload}>Refresh backend</button>
          <button type="button" className="ai-secondary-btn" onClick={() => navigate('/executive-summary')}>Open executive view</button>
        </div>
      </div>

      <BackendStatusPanel data={data} hasLive={hasLive} loading={loading} />

      <section className="ai-panel ai-wide ai-operating-panel">
        <div className="ai-panel-head">
          <div>
            <div className="ai-panel-title">How I will use this</div>
            <div className="ai-panel-copy">This only matters when it becomes a ranking, gap, action and weekly movement check.</div>
          </div>
          <span className="ai-panel-pill ai-ok">Action loop</span>
        </div>
        <div className="ai-operating-grid">
          {OPERATING_STEPS.map((s) => (
            <div className="ai-operating-step" key={s.num}>
              <div className="ai-operating-num">{s.num}</div>
              <div className="ai-operating-title">{s.title}</div>
              <div className="ai-operating-copy">{s.copy}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="ai-kpi-grid">
        {kpis.map((c, i) => (
          <div className="ai-kpi" key={i}>
            <div className="ai-kpi-v">{c.v}</div>
            <div className="ai-kpi-l">{c.l}</div>
            <div className="ai-kpi-d">{c.d}</div>
          </div>
        ))}
      </div>

      <div className="ai-split-grid">
        <section className="ai-panel">
          <div className="ai-panel-head">
            <div>
              <div className="ai-panel-title">What is useful to Radar</div>
              <div className="ai-panel-copy">Signals that can be measured, compared, and turned into working notes.</div>
            </div>
            <span className="ai-panel-pill ai-ok">Ready to wire</span>
          </div>
          <div className="ai-stack">
            {AIDISCOVERY.useful.map((item, i) => (
              <div className="ai-item" key={i}>
                <div className="ai-item-head"><div className="ai-item-title">{item.title}</div><span className={`ai-item-pill ${item.tone}`}>{item.pill}</span></div>
                <div className="ai-item-body">{item.body}</div>
                <div className="ai-item-sub">{item.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ai-panel">
          <div className="ai-panel-head">
            <div>
              <div className="ai-panel-title">What to leave out</div>
              <div className="ai-panel-copy">Metrics that look interesting but are not dependable or actionable.</div>
            </div>
            <span className="ai-panel-pill ai-warn">Exclude</span>
          </div>
          <div className="ai-stack">
            {AIDISCOVERY.exclude.map((item, i) => (
              <div className="ai-item" key={i}>
                <div className="ai-item-head"><div className="ai-item-title">{item.title}</div><span className={`ai-item-pill ${item.tone}`}>Exclude</span></div>
                <div className="ai-item-body">{item.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="ai-panel ai-wide">
        <div className="ai-panel-head">
          <div>
            <div className="ai-panel-title">Measurement blueprint</div>
            <div className="ai-panel-copy">Three practical sources that can power this tab now.</div>
          </div>
          <span className="ai-panel-pill">Server logs + Adobe + monitor</span>
        </div>
        <div className="ai-source-grid">
          {AIDISCOVERY.sources.map((item, i) => (
            <div className="ai-source" key={i}>
              <div className="ai-source-top"><div className="ai-source-name">{item.name}</div><span className="ai-source-status">{item.status}</span></div>
              <div className="ai-source-body">{item.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="ai-panel ai-wide">
        <div className="ai-panel-head">
          <div>
            <div className="ai-panel-title">Example query monitor</div>
            <div className="ai-panel-copy">A small weekly query set to track citation gaps and route opportunities.</div>
          </div>
          <span className="ai-panel-pill ai-ok">Weekly audit</span>
        </div>
        <div className="ai-query-table">
          {AIDISCOVERY.queries.map((row, i) => (
            <div className="ai-query-row" key={i}>
              <div><div className="ai-query-q">{row.q}</div><div className="ai-query-meta">{row.meta}</div></div>
              <div className="ai-query-engine">{row.engine}</div>
              <div><span className="ai-query-gap ai-gap-miss">{row.gap}</span></div>
              <div className="ai-query-gain">Track whether QR is cited and in what position.</div>
            </div>
          ))}
        </div>
      </section>

      <section className="ai-panel ai-wide">
        <div className="ai-panel-head">
          <div>
            <div className="ai-panel-title">Radar working outputs</div>
            <div className="ai-panel-copy">What this tab should feed into the business review.</div>
          </div>
          <span className="ai-panel-pill">Business note</span>
        </div>
        <div className="ai-action-grid">
          {AIDISCOVERY.actions.map((item, i) => (
            <div className="ai-action" key={i}>
              <div className="ai-action-title">{item.title}</div>
              <div className="ai-action-body">{item.body}</div>
              <div className="ai-action-tags">{item.tags.map((tag, j) => <span key={j}>{tag}</span>)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
