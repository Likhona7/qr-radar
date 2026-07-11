import { useCallback, useEffect, useState } from 'react'
import { getAppRatingsIntelligence, getPartnerCompetitorProof, getDiscoveryStatus } from '../api/endpoints'

/** Port of fetchPredictiveAux (radar-core.js:5318-5347) — 3 parallel fetches for the Competitor Features, Partner Opportunities, and Discovery Status tabs. */
export function usePredictiveAux(viewMode = 'b2c') {
  const [state, setState] = useState({ appIntel: null, partnerProof: null, discovery: null, loading: true, error: null })

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    let cancelled = false

    Promise.allSettled([
      getAppRatingsIntelligence(viewMode),
      getPartnerCompetitorProof(viewMode),
      getDiscoveryStatus(viewMode),
    ]).then(([appR, partnerR, discR]) => {
      if (cancelled) return
      const appIntel = appR.status === 'fulfilled' && appR.value?.ok ? appR.value.data : null
      const partnerProof = partnerR.status === 'fulfilled' && partnerR.value?.ok ? partnerR.value.data : null
      const discovery = discR.status === 'fulfilled' && discR.value?.ok ? discR.value.data : null
      const allFailed = !appIntel && !partnerProof && !discovery
      setState({ appIntel, partnerProof, discovery, loading: false, error: allFailed ? 'Predictive support evidence failed' : null })
    })

    return () => { cancelled = true }
  }, [viewMode])

  useEffect(() => load(), [load])

  return { ...state, reload: load }
}
