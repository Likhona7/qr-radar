import { actionEvidenceCount, actionOutcomeStatus } from '../../utils/execSignal'

/** Port of renderActionLayerSummaryV2 (executive-os-roadmap.js:464-501). */
export default function ExecActionLayerSummary({ signals, queue, onOpenDrawer }) {
  const actions = queue || []
  const ownerReady = actions.filter((a) => !!a.owner).length
  const dueSoon = actions.filter((a) => /Act now|Assign this week/.test(a.status?.label || '')).length
  const evidence = actions.reduce((acc, a) => acc + actionEvidenceCount(a.signal), 0)
  const outcomeMissing = actions.filter((a) => actionOutcomeStatus(a.signal) === 'Outcome not recorded').length
  const headline = signals.length
    ? `Action readiness: ${ownerReady}/${actions.length} priority actions have owner roles.`
    : 'Action readiness will appear once backend/cache signals are loaded.'

  return (
    <div className="exec-action-layer">
      <div className="exec-action-layer-copy">
        <div className="exec-panel-label-v2">Action Operating Layer</div>
        <div className="exec-panel-copy-v2">{headline}</div>
      </div>
      <div className="exec-action-layer-metrics">
        <span><strong>{ownerReady}/{actions.length}</strong> owner-ready</span>
        <span><strong>{dueSoon}</strong> urgent this week</span>
        <span><strong>{evidence}</strong> evidence points</span>
        <span><strong>{outcomeMissing}</strong> outcomes open</span>
        <button
          type="button"
          className="exec-action-ai-btn"
          onClick={() => onOpenDrawer({
            type: 'Radar AI Brief Prompt',
            title: 'Ask Radar about the action layer',
            body: 'Suggested question: Summarise the top priority signal, what changed, the owner-ready action, evidence strength, and what outcome should be recorded after execution.',
            meta: ['Context loaded', `${actions.length} actions`, `${signals.length} signals`],
          })}
        >
          Ask Radar for brief
        </button>
      </div>
    </div>
  )
}
