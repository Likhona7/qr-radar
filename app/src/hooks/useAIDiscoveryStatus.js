import { useCallback, useEffect, useState } from 'react'
import { getDiscoveryStatus } from '../api/endpoints'

/** Port of loadAIDiscoveryBackend (radar-core.js:3861-3891), reusing the same /api/discovery/status endpoint already wired for Predictive Intelligence's Discovery Status tab. */
export function useAIDiscoveryStatus(viewMode = 'b2c') {
  const [state, setState] = useState({ status: 'pending', data: null, loading: true, error: null })

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    let cancelled = false
    getDiscoveryStatus(viewMode)
      .then((json) => {
        if (cancelled) return
        if (json?.ok && json.data) setState({ status: 'connected', data: json.data, loading: false, error: null })
        else setState({ status: 'error', data: null, loading: false, error: json?.error?.message || 'Backend route did not return Discovery Monitor data.' })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ status: 'error', data: null, loading: false, error: err.message || 'Discovery Monitor backend route unavailable.' })
      })
    return () => { cancelled = true }
  }, [viewMode])

  useEffect(() => load(), [load])

  return { ...state, reload: load, hasLive: state.status === 'connected' }
}
