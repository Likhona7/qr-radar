import { useEffect, useRef, useState } from 'react'
import { radarWebSocketUrl } from '../api/backend'

/**
 * Port of initRadarLiveStream (scripts/radar-core.js:145-187) as a hook.
 * status mirrors the legacy 'connected'|'waiting'|'failed' wsProof states;
 * events is the same rolling 12-entry log (radarWebSocketUrl handles the
 * localhost-forces-Render-URL logic, so this works unchanged in dev and prod).
 */
export function useRadarWebSocket() {
  const [status, setStatus] = useState('waiting')
  const [statusLabel, setStatusLabel] = useState('Live connecting')
  const [events, setEvents] = useState([])
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)

  useEffect(() => {
    let stopped = false

    function connect() {
      if (stopped || !('WebSocket' in window)) {
        setStatus('failed')
        setStatusLabel('Live unavailable')
        return
      }
      setStatus('waiting')
      setStatusLabel('Live connecting')
      try {
        const ws = new WebSocket(radarWebSocketUrl())
        wsRef.current = ws

        ws.addEventListener('open', () => {
          setStatus('connected')
          setStatusLabel('Live connected')
        })

        ws.addEventListener('message', (event) => {
          let parsed
          try {
            parsed = JSON.parse(event.data)
          } catch {
            parsed = { type: 'message', payload: event.data }
          }
          setEvents((prev) => [{ type: parsed.type || 'message', sentAt: parsed.sentAt || new Date().toISOString(), payload: parsed.payload || {} }, ...prev].slice(0, 12))
          setStatus('connected')
          setStatusLabel(parsed.type === 'heartbeat' ? 'Live heartbeat' : `Live ${parsed.type || 'event'}`)
        })

        ws.addEventListener('close', () => {
          wsRef.current = null
          if (stopped) return
          setStatus('waiting')
          setStatusLabel('Live reconnecting')
          reconnectTimerRef.current = setTimeout(connect, 5000)
        })

        ws.addEventListener('error', () => {
          setStatus('failed')
          setStatusLabel('Live blocked')
        })
      } catch (err) {
        setStatus('failed')
        setStatusLabel('Live failed')
        console.warn('Radar live stream failed', err)
      }
    }

    connect()
    return () => {
      stopped = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return { status, statusLabel, events }
}
