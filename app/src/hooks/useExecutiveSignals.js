import { useEffect, useState } from 'react'
import { getDashboardDelta, getOpportunitySimulation, getRankingSignals } from '../api/endpoints'
import { normalizeRankingSignal, signalScore } from '../utils/execSignal'

/**
 * Port of fetchExecutiveBackendData (executive-os-roadmap.js:660-701) —
 * the 3 endpoints Executive Summary's "live" panels depend on. Deliberately
 * does NOT fall back to the un-migrated main dashboard's domain-signal
 * model (activeSignalsForExecutive's other branch) — per scope decision,
 * these 5 panels only render from this live fetch; if it returns nothing,
 * they show an honest empty state rather than reaching into localStorage
 * the main dashboard would have written.
 */
export function useExecutiveSignals(viewMode = 'b2c') {
  const [state, setState] = useState({ signals: [], delta: null, simulation: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))

    Promise.allSettled([
      getDashboardDelta(viewMode),
      getOpportunitySimulation(viewMode),
      getRankingSignals(viewMode),
    ]).then(([deltaR, simR, rankR]) => {
      if (cancelled) return
      const delta = deltaR.status === 'fulfilled' && deltaR.value?.ok ? deltaR.value.data : null
      const simulation = simR.status === 'fulfilled' && simR.value?.ok ? simR.value.data : null
      let signals = []
      if (rankR.status === 'fulfilled' && rankR.value?.ok && rankR.value.data) {
        const raw = rankR.value.data.signals || rankR.value.data.topSignals || []
        signals = (Array.isArray(raw) ? raw : []).map(normalizeRankingSignal).filter(Boolean)
      }
      signals.sort((a, b) => signalScore(b) - signalScore(a))
      setState({ signals, delta, simulation, loading: false, error: signals.length ? null : 'No live ranking signals returned yet.' })
    })

    return () => { cancelled = true }
  }, [viewMode])

  return state
}
