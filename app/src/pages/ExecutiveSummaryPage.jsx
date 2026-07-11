import { useState } from 'react'
import { useExecutiveSignals } from '../hooks/useExecutiveSignals'
import { queueFromSignals, simulationRowsFromPayload } from '../utils/execSignal'
import ExecSummaryKpis from '../components/exec/ExecSummaryKpis'
import ExecTopSignals from '../components/exec/ExecTopSignals'
import ExecActionQueue from '../components/exec/ExecActionQueue'
import ExecOpportunityHeatmap from '../components/exec/ExecOpportunityHeatmap'
import ExecActionLayerSummary from '../components/exec/ExecActionLayerSummary'
import ExecDetailDrawer from '../components/exec/ExecDetailDrawer'

/**
 * Port of Executive Summary's 5 self-sufficient "live" panels (KPI strip,
 * Top Signals, Top Actions, Opportunity heatmap, Action readiness) — the
 * ones with their own independent backend fetch (/api/ranking/signals,
 * /api/opportunity-simulation, /api/dashboard/delta), per
 * renderExecAddOnsV2 (executive-os-roadmap.js:821-859).
 *
 * Deliberately NOT ported here: the command headline/status verdict,
 * pressure breakdown, leadership themes, and trust/coverage matrix — these
 * read from window.radarData.domains, populated only by the main 14-domain
 * Intelligence dashboard (not yet migrated to React) via localStorage. They
 * would render empty in this app today; scoped out rather than shipping an
 * always-empty section. See the plan's Phase 2+ roadmap.
 */
export default function ExecutiveSummaryPage() {
  const { signals, delta, simulation, loading, error } = useExecutiveSignals('b2c')
  const [drawer, setDrawer] = useState(null)

  const queue = queueFromSignals(signals)
  const opportunityRows = simulationRowsFromPayload(simulation, signals)

  return (
    <div className="exec-command-main">
      <div className="exec-command-top">
        <div>
          <div className="exec-eyebrow-v2">Executive Intelligence Overview</div>
          <h1>Live Signal View</h1>
          <p>
            Showing the panels driven by their own live backend fetch (ranking signals, opportunity simulation,
            dashboard delta). Command headline, pressure breakdown, and leadership themes require the main
            Intelligence dashboard (14-domain model), which isn't migrated to this app yet — open it from the
            <strong> Intelligence</strong> tab for that view.
          </p>
        </div>
      </div>

      {loading && <div className="exec-empty">Loading live executive signals…</div>}
      {!loading && error && signals.length === 0 && <div className="exec-empty">{error}</div>}

      <ExecSummaryKpis signals={signals} delta={delta} simulation={simulation} />

      <ExecActionLayerSummary signals={signals} queue={queue} onOpenDrawer={setDrawer} />

      {/*
        Legacy puts Top Signals and Top Actions side-by-side in a 2-column
        .exec-focus-grid (components/06-executive-pages-footer.html:68-90).
        Confirmed live that this squeezes .exec-action-row's 5-column dense
        layout (main/owner/due/proof/controls) into ~half the page width,
        causing the Owner/Due/Proof labels to overlap the title text — a
        pre-existing legacy layout flaw (same CSS, same structure), not
        something this port introduced. Stacking both full-width here avoids
        it, since Action Queue genuinely needs more horizontal room than
        Top Signals does.
      */}
      <div className="exec-panel-v2 exec-focus-panel" style={{ marginBottom: 16 }}>
        <div className="exec-panel-head-v2">
          <div>
            <div className="exec-panel-label-v2">Top 3 Signals</div>
            <div className="exec-panel-copy-v2">Prioritized by urgency and commercial impact</div>
          </div>
        </div>
        <ExecTopSignals signals={signals} onOpenDrawer={setDrawer} />
      </div>

      <div className="exec-panel-v2 exec-focus-panel" style={{ marginBottom: 16 }}>
        <div className="exec-panel-head-v2">
          <div>
            <div className="exec-panel-label-v2">Top 3 Actions</div>
            <div className="exec-panel-copy-v2">Signal to owner, due date, evidence and outcome status</div>
          </div>
        </div>
        <ExecActionQueue signals={signals} onOpenDrawer={setDrawer} />
      </div>

      <div className="exec-panel-v2 exec-focus-panel">
        <div className="exec-panel-head-v2">
          <div>
            <div className="exec-panel-label-v2">Opportunity Action Lanes</div>
            <div className="exec-panel-copy-v2">Expected upside, best timing, owner, and next move</div>
          </div>
        </div>
        <ExecOpportunityHeatmap rows={opportunityRows} />
      </div>

      <ExecDetailDrawer drawer={drawer} onClose={() => setDrawer(null)} />
    </div>
  )
}
