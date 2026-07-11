import { useRadarWebSocket } from '../hooks/useRadarWebSocket'

/** Port of the topbar's ws-proof indicator (components/01-top-shell.html:43-47). */
export default function TopBar() {
  const { status, statusLabel, events } = useRadarWebSocket()

  return (
    <div className="topbar">
      <div className="tb-l">
        <div className="bk">
          <span className="bn">Qatar Airways</span>
          <span className="bs">Digital Intelligence</span>
        </div>
        <span className="rl">Radar · React (Phase 1)</span>
      </div>
      <div className="tb-r">
        <div className={`ws-proof ${status}`} title="Realtime backend event stream">
          <span className="ws-dot" />
          <span>{statusLabel}</span>
          <span className="ws-count">{events.length}</span>
        </div>
      </div>
    </div>
  )
}
