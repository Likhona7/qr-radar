import { useCallback, useEffect, useState } from 'react'
import { getInnovationRadar } from '../api/endpoints'

/** Port of fetchPredictiveInnovation (radar-core.js:5252-5298), minus the client-side fallback-idea generator (see utils/predictive.js header). */
export function usePredictiveInnovation(viewMode = 'b2c') {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    let cancelled = false
    getInnovationRadar(viewMode)
      .then(({ data }) => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch((err) => { if (!cancelled) setState({ data: null, loading: false, error: err.message }) })
    return () => { cancelled = true }
  }, [viewMode])

  useEffect(() => load(), [load])

  return { ...state, reload: load }
}
